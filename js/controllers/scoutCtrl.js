/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/scoutCtrl.js
 * Version: Noub Sports_beta 0.0.1 (MASTER SCOUT)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * This controller acts as the primary interface for the "Marketplace".
 * It handles the discovery of both Players (for Social Minting) and Teams (for Joining).
 * 
 * CORE RESPONSIBILITIES:
 * 1. Data Fetching: Orchestrates parallel fetching of Trending Data & Grid Data.
 * 2. Layout Rendering: Manages the Search Bar, Filter Pills, and Grid Container.
 * 3. Event Delegation: Binds click events for Cards (Players/Teams) and Filters.
 * 4. Modal Management: Dynamically builds and opens details modals for deep interaction.
 * -----------------------------------------------------------------------------
 */

import { MarketService } from '../services/marketService.js';
import { SocialService } from '../services/socialService.js';
import { TeamService } from '../services/teamService.js'; // Added for 'Join Team' logic
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';
import { AvatarEngine } from '../utils/avatarEngine.js';
import { Helpers } from '../utils/helpers.js';

export class ScoutController {
    
    /**
     * Constructor: Initializes Services and State.
     */
    constructor() {
        this.marketService = new MarketService();
        this.socialService = new SocialService();
        this.teamService = new TeamService();
        
        this.viewContainer = document.getElementById('view-scout');
        
        // Caching for Client-Side Search
        this.cachedData = []; 
        this.currentFilter = 'PLAYER'; // Default View
        this.isGlobal = false;         // Default Scope (Local)
    }

    /**
     * Main Entry Point.
     * Triggered by Router when tab is accessed.
     */
    async init() {
        console.log("🔍 ScoutController: Initializing...");
        
        // 1. Auth Guard
        const user = state.getUser();
        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        // 2. Loading State
        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // 3. Fetch Trending Data (Always Local Zone)
            const trending = await this.marketService.getTrendingPlayers(user.zoneId);
            
            // 4. Render Base Layout
            this.renderLayout(trending);
            
            // 5. Load Initial List (Players)
            await this.loadList(user.zoneId, 'PLAYER', false);

        } catch (err) {
            console.error("Scout Init Error:", err);
            this.viewContainer.innerHTML = `<div class="error-state">${err.message}</div>`;
        }
    }

    /**
     * Renders the Static Frame (Header, Filters, Trending Rail).
     * @param {Array} trending - List of trending players.
     */
    renderLayout(trending) {
        this.viewContainer.innerHTML = `
            <div class="scout-container fade-in">
                
                <!-- A. Header Controls -->
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
                        <input type="text" id="inp-search" placeholder="ابحث عن لاعب أو فريق...">
                    </div>
                    
                    <!-- Filter Pills -->
                    <div class="filter-pills">
                        <button class="pill active" data-filter="PLAYER">لاعبين</button>
                        <button class="pill" data-filter="FAN">مشجعين</button>
                        <button class="pill" data-filter="TEAM">فرق</button>
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

                <!-- C. Dynamic Grid -->
                <div class="market-grid-section">
                    <h4 id="grid-title">النتائج</h4>
                    <div id="market-grid" class="market-grid">
                        <div class="loader-bar"></div>
                    </div>
                </div>
            </div>
        `;

        // Bind Static Events
        this.bindLayoutEvents();
    }

    /**
     * Data Fetching Logic.
     * Switches between MarketService (Players) and TeamService/Market (Teams).
     */
    async loadList(zoneId, filterType, isGlobal) {
        const grid = document.getElementById('market-grid');
        grid.innerHTML = '<div class="loader-bar"></div>';
        this.currentFilter = filterType;

        try {
            let data = [];

            if (filterType === 'TEAM') {
                // Fetch Teams
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
     * Grid Renderer.
     * Decides which Card Component to use (PlayerCard vs TeamCard).
     */
    renderGrid(items) {
        const grid = document.getElementById('market-grid');
        
        if (!items || items.length === 0) {
            grid.innerHTML = '<p class="text-muted text-center" style="grid-column: span 2;">لا توجد نتائج.</p>';
            return;
        }

        // Render based on Filter Type
        if (this.currentFilter === 'TEAM') {
            grid.innerHTML = items.map(t => this.renderTeamCard(t)).join('');
            this.bindTeamClicks(); // Specific binding for Teams
        } else {
            grid.innerHTML = items.map(p => this.renderPlayerCard(p)).join('');
            this.bindPlayerClicks(); // Specific binding for Players
        }
    }

    /* =========================================================================
       HTML COMPONENT GENERATORS
       ========================================================================= */

    renderPlayerCard(p) {
        let visual = p.visual_dna || { skin: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        
        const skinColors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        const skinHex = skinColors[(visual.skin - 1)] || '#ccc';
        const isFan = p.activity_type === 'FAN';
        
        const pDataSafe = encodeURIComponent(JSON.stringify(p));

        return `
            <div class="scout-card player-mode" data-player="${pDataSafe}">
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

    renderTeamCard(t) {
        let colors = { primary: '#333', secondary: '#000' };
        if (t.logo_dna) {
             colors = typeof t.logo_dna === 'string' ? JSON.parse(t.logo_dna) : t.logo_dna;
        }
        
        const tDataSafe = encodeURIComponent(JSON.stringify(t));

        return `
            <div class="scout-card team-mode" data-team="${tDataSafe}" style="border-left: 4px solid ${colors.primary}">
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

    renderMiniCard(p) {
        return `
            <div class="mini-trend-card">
                <div class="mini-avatar"><i class="fa-solid fa-fire text-gold"></i></div>
                <span>${p.display_name}</span>
            </div>`;
    }

    /* =========================================================================
       EVENT BINDING & INTERACTIONS
       ========================================================================= */

    bindLayoutEvents() {
        // Scope Toggles
        document.getElementById('btn-scope-local').onclick = (e) => { 
            this.isGlobal = false; this.updateScopeUI(e.target); 
        };
        document.getElementById('btn-scope-global').onclick = (e) => { 
            this.isGlobal = true; this.updateScopeUI(e.target); 
        };

        // Filter Pills
        document.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.loadList(state.getUser().zoneId, e.target.dataset.filter, this.isGlobal);
            });
        });

        // Live Search
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

    /**
     * Binds Click Events specifically for Player Cards
     */
    bindPlayerClicks() {
        document.querySelectorAll('.scout-card.player-mode').forEach(card => {
            card.addEventListener('click', () => {
                const pData = JSON.parse(decodeURIComponent(card.dataset.player));
                this.openPlayerDetailModal(pData);
            });
        });
    }

    /**
     * Binds Click Events specifically for Team Cards
     */
    bindTeamClicks() {
        document.querySelectorAll('.scout-card.team-mode').forEach(card => {
            card.addEventListener('click', () => {
                const tData = JSON.parse(decodeURIComponent(card.dataset.team));
                this.openTeamDetailModal(tData);
            });
        });
    }

    /* =========================================================================
       MODALS LOGIC
       ========================================================================= */

    /**
     * Modal: Player Detail (Deep Dive)
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
        
        // Generate Visuals
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
                <button id="btn-modal-mint" class="btn-primary" style="margin-top:20px;">
                    <i class="fa-solid fa-signature"></i> طلب نسخة موقعة
                </button>
            </div>
        `;

        document.getElementById('btn-modal-mint').onclick = () => {
            this.handleMintRequest(player.owner_id);
            modal.classList.add('hidden');
        };
    }

    /**
     * Modal: Team Detail (Deep Dive + Join)
     */
    openTeamDetailModal(team) {
        SoundManager.play('click');
        const modalId = 'modal-team-detail';
        
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header"><h3>ملف الفريق</h3><button class="close-btn" onclick="document.getElementById('${modalId}').classList.add('hidden')">&times;</button></div>
                        <div id="team-detail-content"></div>
                    </div>
                </div>`);
        }

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        const content = document.getElementById('team-detail-content');
        
        let colors = { primary: '#333', secondary: '#000' };
        if (team.logo_dna) colors = typeof team.logo_dna === 'string' ? JSON.parse(team.logo_dna) : team.logo_dna;

        content.innerHTML = `
            <div class="player-detail-header">
                <div class="team-logo-circle" style="background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}); width:100px; height:100px; border-radius:50%; margin:0 auto 10px auto; display:flex; justify-content:center; align-items:center; border:4px solid #fff;">
                    <i class="fa-solid fa-shield-cat" style="font-size:3rem; color:#fff;"></i>
                </div>
                <h2 class="text-gold">${team.name}</h2>
                <div class="team-stats-row" style="margin-top:20px;">
                    <div class="t-stat"><span class="val">${team.total_matches}</span><span class="lbl">مباريات</span></div>
                    <div class="t-stat"><span class="val">${team.status}</span><span class="lbl">الحالة</span></div>
                </div>
            </div>
            
            <button id="btn-join-req" class="btn-primary" style="margin-top:20px;">
                <i class="fa-solid fa-user-plus"></i> طلب انضمام
            </button>
        `;

        document.getElementById('btn-join-req').onclick = () => {
            this.handleJoinRequest(team.id);
            modal.classList.add('hidden');
        };
    }

    /**
     * Action: Request Card Mint
     */
    async handleMintRequest(targetId) {
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

    /**
     * Action: Request Team Join
     */
    async handleJoinRequest(teamId) {
        if(!confirm("إرسال طلب انضمام لهذا الفريق؟")) return;

        try {
            await this.teamService.joinTeam(state.getUser().id, teamId);
            SoundManager.play('success');
            alert("تم الانضمام بنجاح!");
            window.location.reload(); // Refresh to update My Team status
        } catch (e) {
            SoundManager.play('error');
            alert(e.message);
        }
    }
}
