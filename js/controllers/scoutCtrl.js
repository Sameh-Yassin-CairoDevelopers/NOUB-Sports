/*
 * Filename: js/controllers/scoutCtrl.js
 * Version: 5.2.0 (MASTER FULL)
 * Description: Controller for the Scout/Market Module.
 * 
 * CAPABILITIES:
 * 1. Multi-Entity Discovery: Search for Players, Fans, AND Teams.
 * 2. Smart Filtering: Toggle between categories dynamically.
 * 3. Deep Dive Modal: detailed view with History, Market Value, and Stats.
 * 4. Social Minting: Direct integration with Notification System.
 * 5. Audio Feedback: Integrated SoundManager for all interactions.
 */

import { MarketService } from '../services/marketService.js';
import { SocialService } from '../services/socialService.js';
import { state } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js'; // Needed for direct Team fetch
import { SoundManager } from '../utils/soundManager.js';
import { Helpers } from '../utils/helpers.js';

export class ScoutController {
    
    constructor() {
        this.marketService = new MarketService();
        this.socialService = new SocialService();
        this.viewContainer = document.getElementById('view-scout');
        
        // Internal Cache
        this.cachedData = []; 
        this.currentFilter = 'PLAYER'; // Default Mode
    }

    /**
     * Main Initialization (Triggered by Tab Click)
     */
    async init() {
        console.log("🔍 ScoutCtrl: Initializing...");
        SoundManager.play('click');
        
        const user = state.getUser();
        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        // Show Loader
        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // 1. Fetch Trending (Always visible)
            const trending = await this.marketService.getTrendingPlayers(user.zoneId);
            
            // 2. Render Layout
            this.renderLayout(trending);
            
            // 3. Load Default List (Players)
            await this.loadList(user.zoneId, 'PLAYER');

        } catch (err) {
            console.error(err);
            this.viewContainer.innerHTML = `<div class="error-state">${err.message}</div>`;
        }
    }

    /**
     * Renders the Static Layout (Header, Search, Trending)
     */
    renderLayout(trending) {
        this.viewContainer.innerHTML = `
            <div class="scout-container fade-in">
                
                <!-- A. Header & Search -->
                <div class="scout-header">
                    <div class="search-bar-wrapper">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="inp-search" placeholder="ابحث عن لاعب أو فريق...">
                    </div>
                    
                    <!-- Filter Pills (Added TEAMS) -->
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

                <!-- B. Trending Section (Talk of the Town) -->
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
            </div>`;

        // Bind Search & Filter Events
        this.bindLayoutEvents();
    }

    /**
     * Loads Data based on selected Filter
     */
    async loadList(zoneId, filterType) {
        const grid = document.getElementById('market-grid');
        grid.innerHTML = '<div class="loader-bar"></div>';
        this.currentFilter = filterType;

        try {
            let data = [];
            
            if (filterType === 'TEAM') {
                // Fetch Teams Logic (Inline for now to avoid altering Service file if not needed)
                const { data: teams } = await supabase
                    .from('teams')
                    .select('*')
                    .eq('zone_id', zoneId)
                    .eq('status', 'ACTIVE'); // Only active teams
                data = teams || [];
            
            } else {
                // Fetch Players/Fans via MarketService
                data = await this.marketService.getPlayersInZone(zoneId, state.getUser().id, filterType);
            }

            this.cachedData = data; // Cache for local search
            this.renderGrid(data);

        } catch (e) {
            grid.innerHTML = '<p class="error-text">حدث خطأ في تحميل البيانات.</p>';
        }
    }

    /**
     * Renders the Grid Items based on type
     */
    renderGrid(items) {
        const grid = document.getElementById('market-grid');
        
        if (!items.length) {
            grid.innerHTML = '<p class="text-muted text-center" style="grid-column: span 2;">لا توجد نتائج متاحة.</p>';
            return;
        }

        // Decide which render function to use
        if (this.currentFilter === 'TEAM') {
            grid.innerHTML = items.map(t => this.renderTeamCard(t)).join('');
        } else {
            grid.innerHTML = items.map(p => this.renderPlayerCard(p)).join('');
        }
        
        // Re-bind Clicks
        this.bindGridEvents();
    }

    /**
     * HTML: Player Card (Scout Version)
     */
    renderPlayerCard(p) {
        let visual = p.visual_dna || { skin: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        const skinColors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        
        // Prepare Data for Modal
        const pDataSafe = encodeURIComponent(JSON.stringify(p));

        return `
            <div class="scout-card player-mode" data-type="PLAYER" data-payload="${pDataSafe}">
                <div class="scout-card-top">
                    <span class="scout-pos">${p.position || 'FAN'}</span>
                    ${p.activity_type !== 'FAN' ? `<span class="scout-rating text-gold">${p.stats?.rating || 60}</span>` : ''}
                </div>
                <div class="scout-avatar">
                    <i class="fa-solid fa-user" style="color: ${skinColors[visual.skin - 1] || '#ccc'};"></i>
                </div>
                <div class="scout-info">
                    <h5>${p.display_name}</h5>
                    <button class="btn-social-action">
                        <i class="fa-solid fa-eye"></i> تفاصيل
                    </button>
                </div>
            </div>`;
    }

    /**
     * HTML: Team Card (New Feature)
     */
    renderTeamCard(t) {
        // Logo colors
        const c1 = t.logo_dna?.primary || '#333';
        const c2 = t.logo_dna?.secondary || '#000';

        return `
            <div class="scout-card team-mode" style="border-left: 4px solid ${c1}">
                <div class="scout-card-top">
                    <span class="scout-pos">فريق</span>
                    <span class="scout-rating text-gold">${t.total_matches || 0}م</span>
                </div>
                <div class="scout-avatar team-logo" style="background: linear-gradient(45deg, ${c1}, ${c2}); color: #fff; border-radius: 50%;">
                    <i class="fa-solid fa-shield-cat"></i>
                </div>
                <div class="scout-info">
                    <h5>${t.name}</h5>
                    <div class="scout-tags"><span>${t.status}</span></div>
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
     * Event Binding (Search & Filters)
     */
    bindLayoutEvents() {
        // Filter Pills
        document.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                // UI Toggle
                document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Logic
                const filter = e.currentTarget.dataset.filter;
                this.loadList(state.getUser().zoneId, filter);
            });
        });

        // Live Search
        const input = document.getElementById('inp-search');
        if (input) {
            input.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = this.cachedData.filter(item => {
                    const name = item.display_name || item.name || '';
                    return name.toLowerCase().includes(term);
                });
                this.renderGrid(filtered);
            });
        }
    }

    /**
     * Event Binding (Grid Clicks)
     */
    bindGridEvents() {
        document.querySelectorAll('.scout-card.player-mode').forEach(card => {
            card.addEventListener('click', () => {
                const pData = JSON.parse(decodeURIComponent(card.dataset.payload));
                this.openPlayerDetailModal(pData);
            });
        });
        // Future: Bind Team Click to show Team Details
    }

    /**
     * THE DEEP DIVE MODAL
     * Shows: History, Market Value, Stats, Social Mint.
     */
    openPlayerDetailModal(player) {
        SoundManager.play('click');
        const modalId = 'modal-player-detail';

        // 1. Calculate Fake Market Value (Viral Feature)
        const rating = player.stats?.rating || 60;
        const value = (rating * 1000) + (player.mint_count * 500); // 60,000 + popularity
        const formattedValue = Helpers.formatCurrency(value);

        // 2. Create Modal DOM
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

        // 3. Render Content
        const content = document.getElementById('player-detail-content');
        
        // Colors
        let visual = player.visual_dna || {skin:1};
        if (typeof visual === 'string') visual = JSON.parse(visual);
        const skinColor = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'][visual.skin - 1] || '#ccc';

        content.innerHTML = `
            <div class="player-detail-header">
                <div class="detail-avatar-large">
                    <i class="fa-solid fa-user" style="color: ${skinColor}"></i>
                </div>
                <h2 class="text-gold">${player.display_name}</h2>
                <span class="status-badge">${player.position || 'FAN'}</span>
                
                <div class="market-value-badge" style="margin-top:10px; font-size:0.9rem; color:var(--success);">
                    <i class="fa-solid fa-chart-line"></i> القيمة: ${formattedValue} عملة
                </div>
            </div>

            ${player.activity_type !== 'FAN' ? `
                <div class="detail-stats-row">
                    <div class="ds-item"><span class="ds-val">${player.stats?.goals || 0}</span><span class="ds-lbl">أهداف</span></div>
                    <div class="ds-item"><span class="ds-val">${player.stats?.matches || 0}</span><span class="ds-lbl">مباريات</span></div>
                    <div class="ds-item"><span class="ds-val text-gold">${player.stats?.rating || 60}</span><span class="ds-lbl">تقييم</span></div>
                </div>
            ` : '<p class="text-center text-muted">هذا المستخدم مشجع وفقط.</p>'}

            <!-- Mocked History (Placeholder for now) -->
            <div class="history-section">
                <h4>آخر النشاطات</h4>
                <div class="history-list">
                    <div class="history-card">
                        <span>انضم إلى المجتمع</span>
                        <span class="result-badge res-draw">${new Date(player.created_at).toLocaleDateString('ar-EG')}</span>
                    </div>
                </div>
            </div>

            <!-- Social Action -->
            <button id="btn-modal-mint" class="btn-primary" style="margin-top:20px;">
                <i class="fa-solid fa-signature"></i> طلب كارت موقع
            </button>
        `;

        // 4. Show & Bind
        document.getElementById(modalId).classList.remove('hidden');
        
        document.getElementById('btn-modal-mint').onclick = () => {
            this.handleRequest(player.owner_id);
            document.getElementById(modalId).classList.add('hidden');
        };
    }

    async handleRequest(targetId) {
        if (targetId === state.getUser().id) return alert("لا يمكن طلب كارت من نفسك.");
        if (!confirm("تأكيد إرسال الطلب؟")) return;

        try {
            await this.socialService.requestMint(state.getUser().id, targetId);
            SoundManager.play('success');
            alert("تم إرسال الطلب بنجاح!");
        } catch (e) {
            SoundManager.play('error');
            alert(e.message);
        }
    }
}
