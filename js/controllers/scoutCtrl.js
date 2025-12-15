/*
 * Filename: js/controllers/scoutCtrl.js
 * Version: 5.2.0 (MASTER CONTROLLER)
 * Description: Controls the Scout/Market View.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Layout: Renders Search, Filters (Role/Scope), and Trending rail.
 * 2. Data Fetching: Orchestrates MarketService queries based on user selection.
 * 3. Interaction: Handles Card Clicks -> Detail Modal -> Social Action.
 * 4. UX: Sound feedback and loading states.
 */

import { MarketService } from '../services/marketService.js';
import { SocialService } from '../services/socialService.js';
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';
import { AvatarEngine } from '../utils/avatarEngine.js';
import { Helpers } from '../utils/helpers.js';

export class ScoutController {
    
    constructor() {
        // Initialize Services
        this.marketService = new MarketService();
        this.socialService = new SocialService();
        
        // DOM Targets
        this.viewContainer = document.getElementById('view-scout');
        
        // Internal State
        this.cachedPlayers = [];
        this.currentFilter = 'PLAYER'; // Default: Show Players
        this.isGlobal = false;         // Default: Local Zone Only
    }

    /**
     * Main Initialization (Triggered by Router)
     */
    async init() {
        console.log("🔍 ScoutCtrl: Initializing...");
        
        const user = state.getUser();
        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        // Show Loading
        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // 1. Fetch Trending Data (Always Local)
            const trending = await this.marketService.getTrendingPlayers(user.zoneId);
            
            // 2. Render Static Layout
            this.renderLayout(trending);
            
            // 3. Load Default List
            await this.loadList(user.zoneId, this.currentFilter, this.isGlobal);

        } catch (err) {
            console.error(err);
            this.viewContainer.innerHTML = `<div class="error-state">${err.message}</div>`;
        }
    }

    /**
     * Renders the Frame (Header, Filters, Trending)
     */
    renderLayout(trending) {
        this.viewContainer.innerHTML = `
            <div class="scout-container fade-in">
                
                <!-- A. Header & Controls -->
                <div class="scout-header">
                    
                    <!-- Scope Toggles (Local vs Global) -->
                    <div style="display:flex; justify-content:center; margin-bottom:15px;">
                        <button class="scope-btn active" id="btn-scope-local">
                            <i class="fa-solid fa-location-dot"></i> منطقتي
                        </button>
                        <button class="scope-btn" id="btn-scope-global">
                            <i class="fa-solid fa-globe"></i> كل مصر
                        </button>
                    </div>

                    <!-- Search Bar -->
                    <div class="search-bar-wrapper">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="inp-search" placeholder="ابحث بالاسم أو المركز...">
                    </div>
                    
                    <!-- Filter Pills -->
                    <div class="filter-pills">
                        <button class="pill active" data-filter="PLAYER">
                            <i class="fa-solid fa-running"></i> لاعبين
                        </button>
                        <button class="pill" data-filter="FAN">
                            <i class="fa-solid fa-users"></i> مشجعين
                        </button>
                        <button class="pill" data-filter="TEAM">
                            <i class="fa-solid fa-shield-halved"></i> فرق
                        </button>
                    </div>
                </div>

                <!-- B. Trending Section -->
                ${trending.length > 0 ? `
                    <div class="trending-section">
                        <h4>🔥 حديث المنطقة</h4>
                        <div class="trending-scroll">
                            ${trending.map(p => this.renderMiniCard(p)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- C. Main Grid -->
                <div class="market-grid-section">
                    <h4 id="grid-title">النتائج</h4>
                    <div id="market-grid" class="market-grid">
                        <div class="loader-bar"></div>
                    </div>
                </div>
            </div>
            
            <!-- Inline Scope Styles (Specific to this view) -->
            <style>
                .scope-btn { 
                    flex: 1; background:transparent; border:1px solid #333; color:#888; 
                    padding:8px 15px; cursor:pointer; font-family:inherit; font-size:0.85rem; transition:0.2s;
                }
                .scope-btn:first-child { border-radius: 10px 0 0 10px; border-right:none; }
                .scope-btn:last-child { border-radius: 0 10px 10px 0; }
                .scope-btn.active { background:var(--gold-main); color:#000; font-weight:bold; border-color:var(--gold-main); }
            </style>
        `;

        // Bind Events immediately after rendering
        this.bindEvents();
    }

    /**
     * Fetches Data and Refreshes the Grid
     */
    async loadList(zoneId, filterType, isGlobal) {
        const grid = document.getElementById('market-grid');
        grid.innerHTML = '<div class="loader-bar"></div>';
        
        try {
            // Fetch via Service
            const data = await this.marketService.getPlayersInZone(zoneId, state.getUser().id, filterType, isGlobal);
            
            this.cachedData = data; // Save for local search
            this.renderGrid(data);

        } catch (e) {
            grid.innerHTML = '<p class="error-text">حدث خطأ في الاتصال.</p>';
        }
    }

    /**
     * Renders Card Grid
     */
    renderGrid(items) {
        const grid = document.getElementById('market-grid');
        
        if (!items || items.length === 0) {
            grid.innerHTML = '<p class="text-muted text-center" style="grid-column: span 2;">لا توجد نتائج مطابقة.</p>';
            return;
        }

        grid.innerHTML = items.map(p => this.renderPlayerCard(p)).join('');
        
        // CRITICAL: Bind Clicks to Cards after HTML injection
        this.bindGridEvents();
    }

    /**
     * HTML Generator: Scout Card
     */
    renderPlayerCard(p) {
        // 1. Resolve Colors
        let visual = p.visual_dna || { skin: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        const skinColors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        const skinHex = skinColors[(visual.skin || 1) - 1] || '#ccc';
        
        // 2. Identify Role
        const isFan = p.activity_type === 'FAN';
        
        // 3. Encode Payload for Modal
        const pDataSafe = encodeURIComponent(JSON.stringify(p));

        return `
            <div class="scout-card" data-player="${pDataSafe}" style="cursor:pointer;">
                <div class="scout-card-top">
                    <span class="scout-pos">${p.position || 'FAN'}</span>
                    ${!isFan ? `<span class="scout-rating text-gold">${p.stats?.rating || 60}</span>` : ''}
                </div>
                
                <div class="scout-avatar">
                    <i class="fa-solid fa-user" style="color: ${skinHex};"></i>
                </div>
                
                <div class="scout-info">
                    <h5>${p.display_name}</h5>
                    <div class="scout-tags">
                        <span>${isFan ? 'مشجع' : 'لاعب'}</span>
                        <span style="font-size:0.6rem; color:var(--gold-main);">عرض</span>
                    </div>
                </div>
            </div>`;
    }

    renderMiniCard(p) {
        return `
            <div class="mini-trend-card">
                <div class="mini-avatar"><i class="fa-solid fa-fire text-gold"></i></div>
                <span>${p.display_name}</span>
            </div>`;
    }

    /**
     * Event Binding: Search, Filters, Scope
     */
    bindEvents() {
        // 1. Scope Buttons (Local / Global)
        document.getElementById('btn-scope-local').onclick = (e) => {
            SoundManager.play('click');
            this.isGlobal = false;
            this.updateScopeUI(e.target);
        };
        document.getElementById('btn-scope-global').onclick = (e) => {
            SoundManager.play('click');
            this.isGlobal = true;
            this.updateScopeUI(e.target);
        };

        // 2. Filter Pills (Player / Fan)
        document.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.currentFilter = e.target.dataset.filter;
                this.loadList(state.getUser().zoneId, this.currentFilter, this.isGlobal);
            });
        });

        // 3. Search Input (Live Filter)
        document.getElementById('inp-search')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = this.cachedData.filter(p => p.display_name.toLowerCase().includes(term));
            this.renderGrid(filtered);
        });
    }

    updateScopeUI(targetBtn) {
        document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        this.loadList(state.getUser().zoneId, this.currentFilter, this.isGlobal);
    }

    /**
     * Binds Click Events for Grid Items
     */
    bindGridEvents() {
        document.querySelectorAll('.scout-card').forEach(card => {
            card.addEventListener('click', () => {
                const pData = JSON.parse(decodeURIComponent(card.dataset.player));
                this.openPlayerDetailModal(pData);
            });
        });
    }

    /**
     * THE DEEP DIVE MODAL
     * Opens a detailed view of the player with 'Social Mint' action.
     */
    openPlayerDetailModal(player) {
        SoundManager.play('click');
        const modalId = 'modal-player-detail';

        // 1. Create Modal DOM if missing
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header">
                            <h3>ملف اللاعب</h3>
                            <button class="close-btn" onclick="document.getElementById('${modalId}').classList.add('hidden')">&times;</button>
                        </div>
                        <div id="player-detail-content"></div>
                    </div>
                </div>`);
        }

        // 2. Render Content
        const content = document.getElementById('player-detail-content');
        
        // Generate Full Avatar using Engine
        const avatarHtml = AvatarEngine.generateAvatarHTML(player.visual_dna, player.display_name);

        // Fake Market Value Calc
        const marketVal = ((player.stats?.rating || 60) * 1000) + ((player.mint_count || 1) * 500);

        content.innerHTML = `
            <div class="player-detail-header">
                <!-- Large Avatar -->
                <div style="height:150px; margin-bottom:10px;">
                    ${avatarHtml}
                </div>
                
                <h2 class="text-gold" style="margin-top:10px;">${player.display_name}</h2>
                <span class="status-badge">${player.position || 'FAN'}</span>
                
                <div style="color:var(--success); font-weight:bold; margin-top:10px; font-family:var(--font-orbitron);">
                    <i class="fa-solid fa-chart-line"></i> القيمة: ${Helpers.formatCurrency(marketVal)}
                </div>
            </div>

            ${player.activity_type !== 'FAN' ? `
                <div class="detail-stats-row">
                    <div class="ds-item"><span class="ds-val">${player.stats?.goals || 0}</span><span class="ds-lbl">أهداف</span></div>
                    <div class="ds-item"><span class="ds-val">${player.stats?.matches || 0}</span><span class="ds-lbl">مباريات</span></div>
                    <div class="ds-item"><span class="ds-val text-gold">${player.stats?.rating || 60}</span><span class="ds-lbl">تقييم</span></div>
                </div>
            ` : '<p class="text-center text-muted">بيانات المشجعين محدودة.</p>'}

            <div class="history-section">
                <h4>الإجراءات</h4>
                <button id="btn-modal-mint" class="btn-primary" style="margin-top:0;">
                    <i class="fa-solid fa-signature"></i> طلب نسخة موقعة
                </button>
            </div>
        `;

        // 3. Show & Bind
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        document.getElementById('btn-modal-mint').onclick = () => {
            this.handleRequest(player.owner_id);
            modal.classList.add('hidden');
        };
    }

    /**
     * Logic: Send Mint Request
     */
    async handleRequest(targetId) {
        const myId = state.getUser().id;
        
        if (targetId === myId) {
            SoundManager.play('error');
            alert("لا يمكنك طلب نسخة من نفسك.");
            return;
        }

        if(!confirm("هل أنت متأكد من إرسال طلب توقيع؟")) return;

        try {
            await this.socialService.requestMint(myId, targetId);
            SoundManager.play('success');
            alert("تم إرسال الطلب بنجاح! ستصلك النسخة عند الموافقة.");
        } catch (e) {
            SoundManager.play('error');
            alert(e.message);
        }
    }
}
