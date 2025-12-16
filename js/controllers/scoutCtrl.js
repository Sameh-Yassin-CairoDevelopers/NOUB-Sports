/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/scoutCtrl.js
 * Version: Noub Sports_beta 0.0.1 (MASTER COMPREHENSIVE)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW (نظرة معمارية):
 * -----------------------------------------------------------------------------
 * This controller manages the "Marketplace" and "Discovery" features.
 * It is responsible for rendering the grid of available entities (Players, Fans, Teams).
 * 
 * CORE RESPONSIBILITIES (المسؤوليات):
 * 1. Data Aggregation: Fetches Trending data + Filtered Lists (Parallel Requests).
 * 2. Polymorphic Rendering: Renders different Card UIs based on entity type (Player vs Team).
 * 3. Search Engine: Implements client-side filtering for rapid response.
 * 4. Deep Dive: Opens detailed Modals for players/teams with actionable buttons.
 * 5. Scope Management: Toggles between "Local Zone" and "Global" views.
 * -----------------------------------------------------------------------------
 */

import { MarketService } from '../services/marketService.js';
import { SocialService } from '../services/socialService.js';
import { state } from '../core/state.js'; // Singleton State Store
import { SoundManager } from '../utils/soundManager.js';
import { AvatarEngine } from '../utils/avatarEngine.js';
import { Helpers } from '../utils/helpers.js';
import { supabase } from '../core/supabaseClient.js'; // Required for direct Team queries

export class ScoutController {
    
    /**
     * Constructor: Initializes dependencies and sets initial state.
     */
    constructor() {
        // 1. Services
        this.marketService = new MarketService();
        this.socialService = new SocialService();
        
        // 2. View Reference
        this.viewContainer = document.getElementById('view-scout');
        
        // 3. Internal State
        this.cachedData = [];          // Stores fetched data for instant searching
        this.currentFilter = 'PLAYER'; // Default Mode (PLAYER | FAN | TEAM)
        this.isGlobal = false;         // Default Scope (Local Zone)
    }

    /**
     * Main Initialization Logic.
     * Called by AppClass when 'Scout' tab is clicked.
     */
    async init() {
        console.log("🔍 ScoutController: Initializing & Loading Data...");
        
        // 1. Auth Guard
        const user = state.getUser();
        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول للوصول إلى الكشاف.</div>`;
            return;
        }

        // 2. Show Loader
        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // 3. Parallel Data Fetching (Optimization)
            // We fetch Trending players AND the default list (Players) simultaneously.
            const [trending, initialList] = await Promise.all([
                this.marketService.getTrendingPlayers(user.zoneId),
                this.marketService.getPlayersInZone(user.zoneId, user.id, 'PLAYER', false)
            ]);
            
            // 4. Cache Initial Data
            this.cachedData = initialList;

            // 5. Render Full Layout
            this.renderLayout(trending);
            
            // 6. Render Initial Grid
            this.renderGrid(initialList);

        } catch (err) {
            console.error("Scout Init Error:", err);
            this.viewContainer.innerHTML = `<div class="error-state">حدث خطأ في تحميل السوق: ${err.message}</div>`;
        }
    }

    /**
     * Renders the Static Layout Frame (Header, Filters, Trending Rail).
     * @param {Array} trending - List of trending players.
     */
    renderLayout(trending) {
        this.viewContainer.innerHTML = `
            <div class="scout-container fade-in">
                
                <!-- A. HEADER SECTION -->
                <div class="scout-header">
                    
                    <!-- Scope Switch (Local vs Global) -->
                    <div style="display:flex; justify-content:center; margin-bottom:15px;">
                        <button class="scope-btn active" id="btn-scope-local">
                            <i class="fa-solid fa-location-dot"></i> منطقتي
                        </button>
                        <button class="scope-btn" id="btn-scope-global">
                            <i class="fa-solid fa-globe"></i> كل مصر
                        </button>
                    </div>

                    <!-- Search Input -->
                    <div class="search-bar-wrapper">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="inp-search" placeholder="ابحث عن لاعب، مركز، أو فريق...">
                    </div>
                    
                    <!-- Filter Tabs (Pills) -->
                    <div class="filter-pills">
                        <button class="pill active" data-filter="PLAYER">
                            <i class="fa-solid fa-person-running"></i> لاعبين
                        </button>
                        <button class="pill" data-filter="FAN">
                            <i class="fa-solid fa-users"></i> مشجعين
                        </button>
                        <button class="pill" data-filter="TEAM">
                            <i class="fa-solid fa-shield-halved"></i> فرق
                        </button>
                    </div>
                </div>

                <!-- B. TRENDING RAIL (Talk of the Town) -->
                ${trending && trending.length > 0 ? `
                    <div class="trending-section">
                        <h4>🔥 حديث المنطقة</h4>
                        <div class="trending-scroll">
                            ${trending.map(p => this.renderMiniCard(p)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- C. MAIN GRID CONTAINER -->
                <div class="market-grid-section">
                    <h4 id="grid-title">النتائج المتاحة</h4>
                    <div id="market-grid" class="market-grid">
                        <!-- Content injected by renderGrid() -->
                    </div>
                </div>
            </div>
            
            <!-- Scoped CSS for Toggle Buttons -->
            <style>
                .scope-btn { flex:1; background:transparent; border:1px solid #333; color:#888; padding:8px; cursor:pointer; font-family:inherit; transition:0.2s; }
                .scope-btn.active { background:var(--gold-main); color:#000; border-color:var(--gold-main); font-weight:bold; }
                .scope-btn:first-child { border-radius:10px 0 0 10px; border-right:none; }
                .scope-btn:last-child { border-radius:0 10px 10px 0; }
            </style>
        `;

        // Bind interactive events immediately after rendering HTML
        this.bindEvents();
    }

    /**
     * Logic: Fetches data based on the selected Filter Type.
     * @param {number} zoneId - Zone ID.
     * @param {string} filterType - 'PLAYER', 'FAN', 'TEAM'.
     * @param {boolean} isGlobal - Scope.
     */
    async loadList(zoneId, filterType, isGlobal) {
        const grid = document.getElementById('market-grid');
        grid.innerHTML = '<div class="loader-bar"></div>';
        
        // Update State
        this.currentFilter = filterType;

        try {
            let data = [];

            if (filterType === 'TEAM') {
                // --- TEAM FETCH LOGIC (Explicit Separation) ---
                console.log("🔍 ScoutCtrl: Fetching Active Teams...");
                data = await this.marketService.getTeamsInZone(zoneId, isGlobal);
            
            } else {
                // --- PLAYER/FAN FETCH LOGIC ---
                console.log(`🔍 ScoutCtrl: Fetching ${filterType}...`);
                const userId = state.getUser().id;
                data = await this.marketService.getPlayersInZone(zoneId, userId, filterType, isGlobal);
            }

            // Update Cache & Render
            this.cachedData = data;
            this.renderGrid(data);

        } catch (e) {
            console.error(e);
            grid.innerHTML = '<p class="error-text">حدث خطأ في جلب البيانات.</p>';
        }
    }

    /**
     * Logic: Renders the Grid Items based on Data Type.
     * Handles the polymorphism between Player Cards and Team Cards.
     */
    renderGrid(items) {
        const grid = document.getElementById('market-grid');
        
        if (!items || items.length === 0) {
            grid.innerHTML = '<p class="text-muted text-center" style="grid-column: span 2;">لا توجد نتائج مطابقة لبحثك.</p>';
            return;
        }

        // Branching Logic
        if (this.currentFilter === 'TEAM') {
            grid.innerHTML = items.map(t => this.renderTeamCard(t)).join('');
            // Note: Team click logic can be added here later
        } else {
            grid.innerHTML = items.map(p => this.renderPlayerCard(p)).join('');
            // Bind Clicks for Players (Deep Dive Modal)
            this.bindGridEvents();
        }
    }

    /* =========================================================================
       HTML GENERATORS (TEMPLATE LITERALS)
       ========================================================================= */

    /**
     * Generates HTML for a Player/Fan Card.
     */
    renderPlayerCard(p) {
        // Resolve Visual DNA
        let visual = p.visual_dna || { skin: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        
        const skinColors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        const skinHex = skinColors[(visual.skin - 1)] || '#ccc';
        
        // Encode data for Modal
        const pDataSafe = encodeURIComponent(JSON.stringify(p));
        const isFan = p.activity_type === 'FAN';

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
                    <div class="scout-tags">
                        <span>${isFan ? 'مشجع' : 'لاعب'}</span>
                        <span style="font-size:0.6rem; color:var(--gold-main);">عرض</span>
                    </div>
                </div>
            </div>`;
    }

    /**
     * Generates HTML for a Team Card (Distinct Design).
     */
    renderTeamCard(t) {
        // Parse Logo DNA
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
                
                <div class="scout-avatar team-logo" style="
                    background: linear-gradient(45deg, ${colors.primary}, ${colors.secondary}); 
                    color: #fff; border-radius: 50%; 
                    display:flex; justify-content:center; align-items:center;
                    font-size: 1.5rem; border: 2px solid #fff;">
                    <i class="fa-solid fa-shield-cat"></i>
                </div>
                
                <div class="scout-info">
                    <h5>${t.name}</h5>
                    <div class="scout-tags">
                        <span style="color:var(--success);">ACTIVE</span>
                        <span style="font-size:0.7rem;">${t.zone_id === 1 ? 'الفسطاط' : 'أخرى'}</span>
                    </div>
                </div>
            </div>`;
    }

    /**
     * Generates HTML for Mini Trending Card.
     */
    renderMiniCard(p) {
        return `
            <div class="mini-trend-card">
                <div class="mini-avatar"><i class="fa-solid fa-fire text-gold"></i></div>
                <span>${p.display_name}</span>
            </div>`;
    }

    /* =========================================================================
       EVENT BINDING & INTERACTION LOGIC
       ========================================================================= */

    /**
     * Binds general layout events (Search, Filter Pills, Scope Toggles).
     */
    bindEvents() {
        // 1. Scope Toggles
        document.getElementById('btn-scope-local').onclick = (e) => { 
            this.isGlobal = false; this.updateScopeUI(e.target); 
        };
        document.getElementById('btn-scope-global').onclick = (e) => { 
            this.isGlobal = true; this.updateScopeUI(e.target); 
        };

        // 2. Filter Pills
        document.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                // UI Update
                document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Logic Update
                const filter = e.currentTarget.dataset.filter;
                this.loadList(state.getUser().zoneId, filter, this.isGlobal);
            });
        });

        // 3. Search Input (Live Filtering)
        document.getElementById('inp-search')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            
            // Filter the currently cached data
            const filtered = this.cachedData.filter(item => {
                const name = item.display_name || item.name || '';
                const pos = item.position || '';
                return name.toLowerCase().includes(term) || pos.toLowerCase().includes(term);
            });
            
            this.renderGrid(filtered);
        });
    }

    /**
     * Updates Scope UI Button State.
     */
    updateScopeUI(targetBtn) {
        document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        // Reload data with new scope
        this.loadList(state.getUser().zoneId, this.currentFilter, this.isGlobal);
    }

    /**
     * Binds Click Events to Player Cards (Opens Modal).
     */
    bindGridEvents() {
        document.querySelectorAll('.scout-card.player-mode').forEach(card => {
            card.addEventListener('click', () => {
                const pData = JSON.parse(decodeURIComponent(card.dataset.player));
                this.openPlayerDetailModal(pData);
            });
        });
    }

    /* =========================================================================
       DEEP DIVE MODAL SYSTEM
       ========================================================================= */

    /**
     * Opens the Player Detail Modal.
     * Displays stats, value, and actions.
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

        // 2. Show Modal
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        
        // 3. Populate Content
        const content = document.getElementById('player-detail-content');
        
        // Visual Processing
        const visualHtml = AvatarEngine.generateAvatarHTML(player.visual_dna, player.display_name);
        const marketVal = ((player.stats?.rating || 60) * 1000) + ((player.mint_count || 1) * 500);

        content.innerHTML = `
            <div class="player-detail-header">
                <div style="height:160px; margin-bottom:10px;">
                    ${visualHtml}
                </div>
                
                <h2 class="text-gold" style="margin-top:10px;">${player.display_name}</h2>
                <span class="status-badge">${player.position || 'FAN'}</span>
                
                <div style="color:var(--success); font-weight:bold; margin-top:10px; font-family:var(--font-orbitron); background:rgba(16, 185, 129, 0.1); padding:5px 15px; border-radius:12px; display:inline-block;">
                    <i class="fa-solid fa-chart-line"></i> القيمة: ${Helpers.formatCurrency(marketVal)}
                </div>
            </div>

            ${player.activity_type !== 'FAN' ? `
                <div class="detail-stats-row">
                    <div class="ds-item"><span class="ds-val">${player.stats?.goals || 0}</span><span class="ds-lbl">أهداف</span></div>
                    <div class="ds-item"><span class="ds-val">${player.stats?.matches || 0}</span><span class="ds-lbl">مباريات</span></div>
                    <div class="ds-item"><span class="ds-val text-gold">${player.stats?.rating || 60}</span><span class="ds-lbl">تقييم</span></div>
                </div>
            ` : '<p class="text-center text-muted" style="margin:20px 0;">هذا المستخدم مشجع وفقط.</p>'}

            <div class="history-section">
                <h4>الإجراءات</h4>
                <button id="btn-modal-mint" class="btn-primary" style="margin-top:0;">
                    <i class="fa-solid fa-signature"></i> طلب نسخة موقعة
                </button>
            </div>
        `;

        // 4. Bind Action
        document.getElementById('btn-modal-mint').onclick = () => {
            this.handleRequest(player.owner_id);
            modal.classList.add('hidden');
        };
    }

    /**
     * Logic: Send Social Mint Request.
     */
    async handleRequest(targetId) {
        if (targetId === state.getUser().id) {
            SoundManager.play('error');
            alert("لا يمكنك طلب كارت من نفسك.");
            return;
        }

        if(!confirm("هل أنت متأكد من إرسال طلب توقيع؟")) return;

        try {
            await this.socialService.requestMint(state.getUser().id, targetId);
            SoundManager.play('success');
            alert("تم إرسال الطلب بنجاح! ستصلك النسخة عند الموافقة.");
        } catch (e) {
            SoundManager.play('error');
            alert(e.message);
        }
    }
}
