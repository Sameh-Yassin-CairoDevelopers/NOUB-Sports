/*
 * Filename: js/controllers/scoutCtrl.js
 * Version: 5.6.0 (FULL REPAIR)
 * Description: Controller for Scout/Market View.
 * Contains ALL logic for Players, Fans, and Teams discovery.
 */

import { MarketService } from '../services/marketService.js';
import { SocialService } from '../services/socialService.js';
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';
import { AvatarEngine } from '../utils/avatarEngine.js';
import { Helpers } from '../utils/helpers.js';

export class ScoutController {
    
    constructor() {
        this.marketService = new MarketService();
        this.socialService = new SocialService();
        this.viewContainer = document.getElementById('view-scout');
        
        // State
        this.cachedData = []; 
        this.currentFilter = 'PLAYER'; 
        this.isGlobal = false;
    }

    /**
     * Init: Called by Router
     */
    async init() {
        console.log("🔍 ScoutCtrl: Initializing...");
        
        const user = state.getUser();
        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        // Loader
        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // 1. Fetch Trending
            const trending = await this.marketService.getTrendingPlayers(user.zoneId);
            
            // 2. Render Static Layout
            this.renderLayout(trending);
            
            // 3. Load Default List
            await this.loadList(user.zoneId, 'PLAYER', false);

        } catch (err) {
            console.error(err);
            this.viewContainer.innerHTML = `<div class="error-state">${err.message}</div>`;
        }
    }

    /**
     * Render the Header, Search, Filters, and Trending rail
     */
    renderLayout(trending) {
        this.viewContainer.innerHTML = `
            <div class="scout-container fade-in">
                <div class="scout-header">
                    <!-- Scope Switch -->
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
                        <input type="text" id="inp-search" placeholder="ابحث...">
                    </div>
                    
                    <!-- Filters -->
                    <div class="filter-pills">
                        <button class="pill active" data-filter="PLAYER">لاعبين</button>
                        <button class="pill" data-filter="FAN">مشجعين</button>
                        <button class="pill" data-filter="TEAM">فرق</button>
                    </div>
                </div>

                <!-- Trending -->
                ${trending.length > 0 ? `
                    <div class="trending-section">
                        <h4>🔥 حديث المنطقة</h4>
                        <div class="trending-scroll">
                            ${trending.map(p => this.renderMiniCard(p)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Main Grid -->
                <div class="market-grid-section">
                    <h4 id="grid-title">النتائج</h4>
                    <div id="market-grid" class="market-grid">
                        <div class="loader-bar"></div>
                    </div>
                </div>
            </div>

            <!-- Styles for Scope Buttons -->
            <style>
                .scope-btn { flex:1; background:transparent; border:1px solid #333; color:#888; padding:8px; cursor:pointer; }
                .scope-btn.active { background:var(--gold-main); color:#000; border-color:var(--gold-main); font-weight:bold; }
                .scope-btn:first-child { border-radius:10px 0 0 10px; border-right:none; }
                .scope-btn:last-child { border-radius:0 10px 10px 0; }
            </style>
        `;

        this.bindEvents();
    }

    /**
     * Load Data based on selection
     */
    async loadList(zoneId, filterType, isGlobal) {
        const grid = document.getElementById('market-grid');
        grid.innerHTML = '<div class="loader-bar"></div>';
        this.currentFilter = filterType;

        try {
            let data = [];

            if (filterType === 'TEAM') {
                // Fetch Teams via Service
                data = await this.marketService.getTeamsInZone(zoneId, isGlobal);
            } else {
                // Fetch Players/Fans
                data = await this.marketService.getPlayersInZone(zoneId, state.getUser().id, filterType, isGlobal);
            }

            this.cachedData = data;
            this.renderGrid(data);

        } catch (e) {
            console.error(e);
            grid.innerHTML = '<p class="error-text">حدث خطأ في تحميل البيانات.</p>';
        }
    }

    /**
     * Render the Grid
     */
    renderGrid(items) {
        const grid = document.getElementById('market-grid');
        
        if (!items || items.length === 0) {
            grid.innerHTML = '<p class="text-muted text-center" style="grid-column: span 2;">لا توجد نتائج.</p>';
            return;
        }

        if (this.currentFilter === 'TEAM') {
            grid.innerHTML = items.map(t => this.renderTeamCard(t)).join('');
        } else {
            grid.innerHTML = items.map(p => this.renderPlayerCard(p)).join('');
            this.bindGridEvents(); // Click logic for players
        }
    }

    // HTML: Player Card
    renderPlayerCard(p) {
        let visual = p.visual_dna || { skin: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        const skinColors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        const skinHex = skinColors[visual.skin - 1] || '#ccc';
        const isFan = p.activity_type === 'FAN';
        
        const pDataSafe = encodeURIComponent(JSON.stringify(p));

        return `
            <div class="scout-card player-mode" data-player="${pDataSafe}" style="cursor:pointer;">
                <div class="scout-card-top">
                    <span class="scout-pos">${p.position || 'FAN'}</span>
                    ${!isFan ? `<span class="scout-rating text-gold">${p.stats?.rating || 60}</span>` : ''}
                </div>
                <div class="scout-avatar">
                    <i class="fa-solid fa-user" style="color: ${skinHex};"></i>
                </div>
                <div class="scout-info">
                    <h5>${p.display_name}</h5>
                    <div class="scout-tags"><span>${isFan ? 'مشجع' : 'لاعب'}</span></div>
                </div>
            </div>`;
    }

    // HTML: Team Card
    renderTeamCard(t) {
        let colors = { primary: '#333', secondary: '#000' };
        if (t.logo_dna) {
             colors = typeof t.logo_dna === 'string' ? JSON.parse(t.logo_dna) : t.logo_dna;
        }

        return `
            <div class="scout-card team-mode" style="border-left: 4px solid ${colors.primary}">
                <div class="scout-card-top">
                    <span class="scout-pos" style="background:${colors.primary}; color:#fff;">فريق</span>
                    <span class="scout-rating text-gold">${t.total_matches || 0}م</span>
                </div>
                <div class="scout-avatar team-logo" style="background: linear-gradient(45deg, ${colors.primary}, ${colors.secondary}); color: #fff; border-radius: 50%; display:flex; justify-content:center; align-items:center; font-size: 1.5rem; border: 2px solid #fff;">
                    <i class="fa-solid fa-shield-cat"></i>
                </div>
                <div class="scout-info">
                    <h5>${t.name}</h5>
                    <div class="scout-tags"><span style="color:var(--success);">ACTIVE</span></div>
                </div>
            </div>`;
    }

    // HTML: Mini Card
    renderMiniCard(p) {
        return `
            <div class="mini-trend-card">
                <div class="mini-avatar"><i class="fa-solid fa-fire text-gold"></i></div>
                <span>${p.display_name}</span>
            </div>`;
    }

    /**
     * Events Binding
     */
    bindEvents() {
        // Scope
        document.getElementById('btn-scope-local').onclick = (e) => { this.isGlobal = false; this.updateScopeUI(e.target); };
        document.getElementById('btn-scope-global').onclick = (e) => { this.isGlobal = true; this.updateScopeUI(e.target); };

        // Filters
        document.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.currentFilter = e.target.dataset.filter;
                this.loadList(state.getUser().zoneId, this.currentFilter, this.isGlobal);
            });
        });

        // Search
        document.getElementById('inp-search')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = this.cachedData.filter(item => {
                const name = item.display_name || item.name || '';
                return name.toLowerCase().includes(term);
            });
            this.renderGrid(filtered);
        });
    }

    updateScopeUI(targetBtn) {
        document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        this.loadList(state.getUser().zoneId, this.currentFilter, this.isGlobal);
    }

    bindGridEvents() {
        document.querySelectorAll('.scout-card.player-mode').forEach(card => {
            card.addEventListener('click', () => {
                const pData = JSON.parse(decodeURIComponent(card.dataset.player));
                this.openPlayerDetailModal(pData);
            });
        });
    }

    /**
     * Modal: Deep Dive
     */
    openPlayerDetailModal(player) {
        SoundManager.play('click');
        const modalId = 'modal-player-detail';
        
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header"><h3>ملف اللاعب</h3><button class="close-btn" onclick="document.getElementById('${modalId}').classList.add('hidden')">&times;</button></div>
                        <div id="player-detail-content"></div>
                    </div>
                </div>`);
        }

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        
        const content = document.getElementById('player-detail-content');
        
        // Visual
        const avatarHtml = AvatarEngine.generateAvatarHTML(player.visual_dna, player.display_name);
        const marketVal = ((player.stats?.rating || 60) * 1000) + ((player.mint_count || 1) * 500);

        content.innerHTML = `
            <div class="player-detail-header">
                <div style="height:150px; margin-bottom:10px;">${avatarHtml}</div>
                <h2 class="text-gold">${player.display_name}</h2>
                <div style="color:var(--success); font-weight:bold; margin-top:10px;">القيمة: ${Helpers.formatCurrency(marketVal)}</div>
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

        document.getElementById('btn-modal-mint').onclick = () => {
            this.handleRequest(player.owner_id);
            modal.classList.add('hidden');
        };
    }

    async handleRequest(targetId) {
        if(targetId === state.getUser().id) return alert("لا يمكنك طلب كارت من نفسك.");
        if(!confirm("تأكيد إرسال الطلب؟")) return;
        
        try { 
            await this.socialService.requestMint(state.getUser().id, targetId);
            SoundManager.play('success');
            alert("تم الإرسال!");
        } catch (e) { 
            SoundManager.play('error');
            alert(e.message); 
        }
    }
}
