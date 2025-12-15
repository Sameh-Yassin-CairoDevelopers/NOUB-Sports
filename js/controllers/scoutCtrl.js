/*
 * Filename: js/controllers/scoutCtrl.js
 * Version: 5.0.0 (UI Filters Added)
 * Description: Controller for Scout/Market View.
 * 
 * UPDATES:
 * - Added Filter Tabs (Players vs Fans).
 * - Live Search logic.
 * - Social Minting integration.
 */

import { MarketService } from '../services/marketService.js';
import { SocialService } from '../services/socialService.js';
import { state } from '../core/state.js'; 

export class ScoutController {
    constructor() {
        this.marketService = new MarketService();
        this.socialService = new SocialService();
        this.viewContainer = document.getElementById('view-scout');
        
        // Cache data to avoid refetching on simple filters
        this.cachedPlayers = [];
        this.currentFilter = 'PLAYER'; // Default: Show Players
    }

    /**
     * Main Init
     */
    async init() {
        console.log("🔍 ScoutController: Loading...");
        const user = state.getUser();
        if (!user) return;

        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // 1. Fetch Trending (Always same)
            const trending = await this.marketService.getTrendingPlayers(user.zoneId);
            
            // 2. Initial Render (Structure)
            this.renderLayout(trending);
            
            // 3. Load Default List (Players Only)
            await this.loadList(user.zoneId, 'PLAYER');

        } catch (err) {
            this.viewContainer.innerHTML = `<div class="error-state">${err.message}</div>`;
        }
    }

    /**
     * Renders the static parts (Search, Filter Tabs, Trending)
     */
    renderLayout(trending) {
        this.viewContainer.innerHTML = `
            <div class="scout-container fade-in">
                
                <!-- 1. Search & Filter Bar -->
                <div class="scout-header">
                    <div class="search-bar-wrapper">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="inp-search" placeholder="ابحث بالاسم...">
                    </div>
                    
                    <!-- Filter Toggles -->
                    <div class="filter-pills">
                        <button class="pill active" data-filter="PLAYER">لاعبين</button>
                        <button class="pill" data-filter="FAN">مشجعين</button>
                        <button class="pill" data-filter="ALL">الكل</button>
                    </div>
                </div>

                <!-- 2. Trending Section -->
                ${trending.length > 0 ? `
                    <div class="trending-section">
                        <h4>🔥 حديث المنطقة</h4>
                        <div class="trending-scroll">
                            ${trending.map(p => this.renderMiniCard(p)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 3. Main Grid -->
                <div class="market-grid-section">
                    <h4 id="grid-title">لاعبي المنطقة</h4>
                    <div id="market-grid" class="market-grid">
                        <div class="loader-bar"></div>
                    </div>
                </div>
            </div>
        `;

        // Bind Events
        this.bindEvents();
    }

    /**
     * Fetches and renders the grid list based on filter
     */
    async loadList(zoneId, filterType) {
        const grid = document.getElementById('market-grid');
        grid.innerHTML = '<div class="loader-bar"></div>'; // Local loading
        
        try {
            const players = await this.marketService.getPlayersInZone(zoneId, state.getUser().id, filterType);
            this.cachedPlayers = players; // Cache for search
            this.renderGrid(players);
        } catch (e) {
            grid.innerHTML = '<p class="text-muted">حدث خطأ في التحميل.</p>';
        }
    }

    /**
     * Renders the Card Grid from array
     */
    renderGrid(players) {
        const grid = document.getElementById('market-grid');
        if (!players.length) {
            grid.innerHTML = '<p class="text-muted text-center" style="grid-column: span 2;">لا توجد نتائج لهذا التصنيف.</p>';
            return;
        }
        grid.innerHTML = players.map(p => this.renderPlayerCard(p)).join('');
        
        // Re-bind social buttons
        document.querySelectorAll('.btn-social-mint').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleRequest(e.target.dataset.id));
        });
    }

    /**
     * HTML Generator for Scout Card
     */
    renderPlayerCard(p) {
        let visual = p.visual_dna || { skin: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        const skinColors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        const skinHex = skinColors[visual.skin - 1] || skinColors[0];
        
        const isFan = p.activity_type === 'FAN';

        return `
            <div class="scout-card">
                <div class="scout-card-top">
                    <span class="scout-pos">${isFan ? 'مشجع' : p.position}</span>
                    ${!isFan ? `<span class="scout-rating text-gold">${p.stats?.rating || 60}</span>` : ''}
                </div>
                
                <div class="scout-avatar">
                    <i class="fa-solid fa-user" style="color: ${skinHex};"></i>
                </div>
                
                <div class="scout-info">
                    <h5>${p.display_name}</h5>
                    <div class="scout-tags">
                        <span>${isFan ? 'مدرج الدرجة الأولى' : 'لاعب نشط'}</span>
                    </div>
                    
                    <button class="btn-social-mint" data-id="${p.owner_id}">
                        <i class="fa-solid fa-signature"></i> طلب نسخة
                    </button>
                </div>
            </div>
        `;
    }

    renderMiniCard(p) {
        return `
            <div class="mini-trend-card">
                <div class="mini-avatar">
                    <i class="fa-solid fa-fire text-gold"></i>
                </div>
                <span>${p.display_name}</span>
            </div>
        `;
    }

    /**
     * Logic: Event Binding
     */
    bindEvents() {
        // Search Input
        document.getElementById('inp-search')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = this.cachedPlayers.filter(p => p.display_name.toLowerCase().includes(term));
            this.renderGrid(filtered);
        });

        // Filter Pills
        document.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update UI
                document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update Data
                const filter = e.target.dataset.filter;
                this.loadList(state.getUser().zoneId, filter);
            });
        });
    }

    async handleRequest(targetId) {
        if(!confirm("إرسال طلب توقيع؟")) return;
        try { 
            await this.socialService.requestMint(state.getUser().id, targetId);
            alert("تم إرسال الطلب!");
        } catch (e) { alert(e.message); }
    }
}
