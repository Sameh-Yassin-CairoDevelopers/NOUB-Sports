/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/scoutCtrl.js
 * Version: Noub Sports_beta 3.0.0 (FULL VISUAL RENDER)
 * Status: Production Ready
 * 
 * ARCHITECTURAL OVERVIEW:
 * Handles the logic for the Marketplace (Scout).
 * 
 * VISUAL UPGRADE:
 * Implements the "Miniature Identity" logic. Instead of simple icons, 
 * it renders the full Avatar Engine output scaled down via CSS.
 * 
 * FEATURES:
 * 1. Rarity Engine: Auto-calculates card border class (Common/Silver/Gold) based on stats.
 * 2. Smart Rendering: Injects the complex Avatar HTML into the Scaled Wrapper.
 * 3. Deep Linking: Encodes full player objects for Modal hydration.
 */

import { MarketService } from '../services/marketService.js';
import { SocialService } from '../services/socialService.js';
import { TeamService } from '../services/teamService.js';
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';
import { AvatarEngine } from '../utils/avatarEngine.js'; // Critical for rendering visual DNA
import { Helpers } from '../utils/helpers.js';

export class ScoutController {
    
    /**
     * Constructor: Initializes Core Services.
     */
    constructor() {
        this.marketService = new MarketService();
        this.socialService = new SocialService();
        this.teamService = new TeamService();
        
        this.viewContainer = document.getElementById('view-scout');
        
        // Cache state for filtering
        this.cachedData = []; 
        this.currentFilter = 'PLAYER'; // Default View
        this.isGlobal = false;         // Default Scope (Local)
    }

    /**
     * Initialization Routine.
     * Triggered by the Router when the user enters the Scout Tab.
     */
    async init() {
        console.log("🔍 ScoutController: Initializing Visual Engine...");
        
        // 1. Auth Guard
        const user = state.getUser();
        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        // 2. Render Loading State
        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // 3. Parallel Fetching (Trending + Initial List)
            // Fetching trending players first to populate the rail
            const trending = await this.marketService.getTrendingPlayers(user.zoneId);
            
            // 4. Render the Static Layout
            this.renderLayout(trending);
            
            // 5. Load the Main Grid (Players by default)
            await this.loadList(user.zoneId, 'PLAYER', false);

        } catch (err) {
            console.error("Scout Init Error:", err);
            this.viewContainer.innerHTML = `<div class="error-state">${err.message}</div>`;
        }
    }

    /**
     * Renders the Base Skeleton (Header, Search, Trending Rail).
     * @param {Array} trending - List of trending player objects.
     */
    renderLayout(trending) {
        this.viewContainer.innerHTML = `
            <div class="scout-container fade-in">
                
                <!-- A. HEADER & CONTROLS -->
                <div class="scout-header">
                    <!-- Scope Switch (Local vs Global) -->
                    <div class="scope-wrapper">
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
                        <input type="text" id="inp-search" placeholder="ابحث عن لاعب أو فريق...">
                    </div>
                    
                    <!-- Filter Pills -->
                    <div class="filter-pills">
                        <button class="pill active" data-filter="PLAYER">لاعبين</button>
                        <button class="pill" data-filter="FAN">مشجعين</button>
                        <button class="pill" data-filter="TEAM">فرق</button>
                    </div>
                </div>

                <!-- B. TRENDING RAIL (Hot Players) -->
                ${trending.length > 0 ? `
                    <div class="trending-section">
                        <h4>🔥 حديث المنطقة</h4>
                        <div class="trending-scroll">
                            ${trending.map(p => this.renderMiniTrendingCard(p)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- C. MAIN GRID CONTAINER -->
                <div class="market-grid-section">
                    <h4 id="grid-title">النتائج</h4>
                    <div id="market-grid" class="market-grid">
                        <div class="loader-bar"></div>
                    </div>
                </div>
            </div>
        `;

        // Bind Static Event Listeners
        this.bindLayoutEvents();
    }

    /**
     * Data Fetching & State Management.
     * Decides whether to fetch Players or Teams based on filter.
     */
    async loadList(zoneId, filterType, isGlobal) {
        const grid = document.getElementById('market-grid');
        grid.innerHTML = '<div class="loader-bar"></div>'; // Loading Spinner
        this.currentFilter = filterType;

        try {
            let data = [];

            if (filterType === 'TEAM') {
                data = await this.marketService.getTeamsInZone(zoneId, isGlobal);
            } else {
                data = await this.marketService.getPlayersInZone(zoneId, state.getUser().id, filterType, isGlobal);
            }

            this.cachedData = data; // Cache for client-side search
            this.renderGrid(data);

        } catch (e) {
            console.error(e);
            grid.innerHTML = '<p class="error-text">حدث خطأ في تحميل البيانات.</p>';
        }
    }

    /**
     * Main Grid Renderer.
     * Iterates through data and selects the correct Card Component.
     */
    renderGrid(items) {
        const grid = document.getElementById('market-grid');
        
        if (!items || items.length === 0) {
            grid.innerHTML = '<p class="text-muted text-center" style="grid-column: span 2;">لا توجد نتائج مطابقة.</p>';
            return;
        }

        // Render based on Type
        if (this.currentFilter === 'TEAM') {
            grid.innerHTML = items.map(t => this.renderTeamCard(t)).join('');
            this.bindTeamClicks(); 
        } else {
            // This is where the visual upgrade happens for Players/Fans
            grid.innerHTML = items.map(p => this.renderPlayerCard(p)).join('');
            this.bindPlayerClicks(); 
        }
    }

    /* =========================================================================
       COMPONENT GENERATORS (The Visual Logic)
       ========================================================================= */

    /**
     * Generates the High-Fidelity Mini Player Card.
     * Uses CSS Scaling to fit the full Avatar Engine output into the grid.
     */
    renderPlayerCard(p) {
        // 1. Prepare Visual DNA
        let visual = p.visual_dna || { skin: 1, kit: 1, hair: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        
        // 2. Generate Full Avatar HTML (Head + Body + Accessories)
        // We pass the name to appear on the shirt inside the generator
        const avatarHtml = AvatarEngine.generateAvatarHTML(visual, p.display_name);

        // 3. Calculate Rarity for Border Styling
        const rarityClass = this.calculateRarityClass(p.stats);
        const isFan = p.activity_type === 'FAN';
        
        // 4. Encode Data for Modal Interaction
        const pDataSafe = encodeURIComponent(JSON.stringify(p));

        return `
            <div class="scout-card player-mode ${rarityClass}" data-player="${pDataSafe}">
                
                <!-- Top Info -->
                <div class="scout-card-top">
                    <span class="scout-pos">${p.position || 'FAN'}</span>
                    ${!isFan ? `<span class="scout-rating">${p.stats?.rating || 60}</span>` : ''}
                </div>
                
                <!-- The Scaled Avatar Container -->
                <!-- The CSS class .scout-avatar-wrapper handles the shrink transform -->
                <div class="scout-avatar-wrapper">
                    ${avatarHtml}
                </div>

                <!-- Bottom Info -->
                <div class="scout-info">
                    <h5>${p.display_name}</h5>
                    <div class="scout-tags">
                        <span>${isFan ? 'مشجع' : 'لاعب حر'}</span>
                    </div>
                </div>
            </div>`;
    }

    /**
     * Generates Team Card.
     */
    renderTeamCard(t) {
        let colors = { primary: '#333', secondary: '#000' };
        if (t.logo_dna) {
             colors = typeof t.logo_dna === 'string' ? JSON.parse(t.logo_dna) : t.logo_dna;
        }
        
        const tDataSafe = encodeURIComponent(JSON.stringify(t));

        return `
            <div class="scout-card team-mode" data-team="${tDataSafe}" style="border-left: 4px solid ${colors.primary}">
                <div class="scout-card-top">
                    <span class="scout-pos" style="background:${colors.primary};">TEAM</span>
                    <span class="scout-rating text-gold">${t.total_matches || 0}</span>
                </div>
                
                <!-- Team Logo Scaler -->
                <div class="team-logo-scaler" style="background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});">
                    <i class="fa-solid fa-shield-cat"></i>
                </div>
                
                <div class="scout-info">
                    <h5>${t.name}</h5>
                    <div class="scout-tags">
                        <span style="color:var(--success); font-weight:bold;">${t.status}</span>
                    </div>
                </div>
            </div>`;
    }

    /**
     * Generates Mini Card for Trending Rail.
     */
    renderMiniTrendingCard(p) {
        return `
            <div class="mini-trend-card">
                <div class="mini-avatar"><i class="fa-solid fa-fire text-gold"></i></div>
                <span>${p.display_name}</span>
            </div>`;
    }

    /**
     * Helper: Determines Rarity Class based on Experience.
     */
    calculateRarityClass(stats) {
        const matches = stats?.matches || 0;
        if (matches >= 100) return 'rarity-diamond';
        if (matches >= 50) return 'rarity-gold';
        if (matches >= 20) return 'rarity-silver';
        return 'rarity-common';
    }

    /* =========================================================================
       EVENT HANDLERS & BINDINGS
       ========================================================================= */

    bindLayoutEvents() {
        // Scope Toggles
        const setScope = (isGlobal, btnId) => {
            this.isGlobal = isGlobal;
            document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(btnId).classList.add('active');
            this.loadList(state.getUser().zoneId, this.currentFilter, this.isGlobal);
        };

        document.getElementById('btn-scope-local').onclick = () => setScope(false, 'btn-scope-local');
        document.getElementById('btn-scope-global').onclick = () => setScope(true, 'btn-scope-global');

        // Filter Pills
        document.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadList(state.getUser().zoneId, e.target.dataset.filter, this.isGlobal);
            });
        });

        // Live Search Input
        document.getElementById('inp-search')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = this.cachedData.filter(item => {
                const name = item.display_name || item.name || '';
                return name.toLowerCase().includes(term);
            });
            this.renderGrid(filtered);
        });
    }

    bindPlayerClicks() {
        document.querySelectorAll('.scout-card.player-mode').forEach(card => {
            card.addEventListener('click', () => {
                const pData = JSON.parse(decodeURIComponent(card.dataset.player));
                this.openPlayerDetailModal(pData);
            });
        });
    }

    bindTeamClicks() {
        document.querySelectorAll('.scout-card.team-mode').forEach(card => {
            card.addEventListener('click', () => {
                const tData = JSON.parse(decodeURIComponent(card.dataset.team));
                this.openTeamDetailModal(tData);
            });
        });
    }

    /* =========================================================================
       MODAL LOGIC
       ========================================================================= */

    /**
     * Opens Player Detail Modal (The Full Profile).
     */
    openPlayerDetailModal(player) {
        SoundManager.play('click');
        const modalId = 'modal-player-detail';
        
        // Lazy Load Modal DOM
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header">
                            <h3>ملف اللاعب</h3>
                            <button class="close-btn" id="btn-close-pdetail">&times;</button>
                        </div>
                        <div id="player-detail-content"></div>
                    </div>
                </div>`);
            
            document.getElementById('btn-close-pdetail').onclick = () => 
                document.getElementById(modalId).classList.add('hidden');
        }

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        const content = document.getElementById('player-detail-content');
        
        // Full Size Avatar for Modal
        const avatarHtml = AvatarEngine.generateAvatarHTML(player.visual_dna, player.display_name);
        const marketVal = this.marketService ? 
            ((player.stats?.rating || 60) * 1000) : 0; // Simplified calculation

        content.innerHTML = `
            <div class="player-detail-header">
                <!-- Large Avatar Container -->
                <div style="height:220px; position:relative; margin-bottom:10px; border-bottom:1px solid #333;">
                    ${avatarHtml}
                </div>
                
                <h2 class="text-gold" style="text-transform:uppercase; letter-spacing:2px;">${player.display_name}</h2>
                <div style="color:var(--success); font-weight:bold; margin-top:5px;">
                    <i class="fa-solid fa-money-bill-wave"></i> القيمة: ${Helpers.formatCurrency(marketVal)}
                </div>
            </div>

            ${player.activity_type !== 'FAN' ? `
                <div class="detail-stats-row">
                    <div class="ds-item"><span class="ds-val">${player.stats?.goals || 0}</span><span class="ds-lbl">أهداف</span></div>
                    <div class="ds-item"><span class="ds-val">${player.stats?.matches || 0}</span><span class="ds-lbl">مباريات</span></div>
                    <div class="ds-item"><span class="ds-val text-gold">${player.stats?.rating || 60}</span><span class="ds-lbl">تقييم</span></div>
                </div>
            ` : '<p class="text-center text-muted" style="margin:20px 0;">بيانات المشجعين محدودة.</p>'}

            <button id="btn-modal-mint" class="btn-primary" style="margin-top:20px;">
                <i class="fa-solid fa-signature"></i> طلب نسخة موقعة (Autograph)
            </button>
        `;

        document.getElementById('btn-modal-mint').onclick = () => {
            this.handleMintRequest(player.owner_id);
            modal.classList.add('hidden');
        };
    }

    openTeamDetailModal(team) {
        SoundManager.play('click');
        const modalId = 'modal-team-detail';
        
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header"><h3>ملف الفريق</h3><button class="close-btn" id="btn-close-tdetail">&times;</button></div>
                        <div id="team-detail-content"></div>
                    </div>
                </div>`);
            
            document.getElementById('btn-close-tdetail').onclick = () => 
                document.getElementById(modalId).classList.add('hidden');
        }

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        const content = document.getElementById('team-detail-content');
        
        let colors = { primary: '#333', secondary: '#000' };
        if (team.logo_dna) colors = typeof team.logo_dna === 'string' ? JSON.parse(team.logo_dna) : team.logo_dna;

        content.innerHTML = `
            <div class="player-detail-header">
                <div class="team-logo-circle" style="background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}); width:120px; height:120px; border-radius:50%; margin:0 auto 15px auto; display:flex; justify-content:center; align-items:center; border:4px solid #fff; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                    <i class="fa-solid fa-shield-cat" style="font-size:3.5rem; color:#fff;"></i>
                </div>
                <h2 class="text-gold">${team.name}</h2>
                <div class="team-stats-row" style="margin-top:20px;">
                    <div class="t-stat"><span class="val">${team.total_matches}</span><span class="lbl">مباريات</span></div>
                    <div class="t-stat"><span class="val">${team.status}</span><span class="lbl">الحالة</span></div>
                </div>
            </div>
            
            <button id="btn-join-req" class="btn-primary" style="margin-top:20px;">
                <i class="fa-solid fa-user-plus"></i> طلب انضمام للفريق
            </button>
        `;

        document.getElementById('btn-join-req').onclick = () => {
            this.handleJoinRequest(team.id);
            modal.classList.add('hidden');
        };
    }

    async handleMintRequest(targetId) {
        if(targetId === state.getUser().id) return alert("لا يمكنك طلب كارت من نفسك.");
        if(!confirm("تأكيد إرسال الطلب؟")) return;
        
        try { 
            await this.socialService.requestMint(state.getUser().id, targetId);
            SoundManager.play('success');
            alert("تم إرسال طلب التوقيع!");
        } catch (e) { 
            SoundManager.play('error');
            alert(e.message); 
        }
    }

    async handleJoinRequest(teamId) {
        if(!confirm("إرسال طلب انضمام لهذا الفريق؟")) return;

        try {
            await this.teamService.joinTeam(state.getUser().id, teamId);
            SoundManager.play('success');
            alert("تم الانضمام بنجاح!");
            window.location.reload(); 
        } catch (e) {
            SoundManager.play('error');
            alert(e.message);
        }
    }
}
