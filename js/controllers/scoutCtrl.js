/*
 * Filename: js/controllers/scoutCtrl.js
 * Version: 4.2.0 (Diamond Release - Fixed)
 * Description: Controller for the Scouting/Market View.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Data Fetching: Queries MarketService for players in the same zone.
 * 2. Trending Logic: Displays 'Talk of the Town' (High Mint Count players).
 * 3. Search/Filter: Client-side filtering logic.
 * 4. Social Interaction: Handlers for 'Request Mint' buttons.
 * 
 * FIX NOTES:
 * - Updated to use singleton 'state' instead of 'State' class.
 */

import { MarketService } from '../services/marketService.js';
import { SocialService } from '../services/socialService.js';
import { state } from '../core/state.js'; // <--- التصحيح: استيراد النسخة الموحدة
import { AvatarEngine } from '../utils/avatarEngine.js'; // For visuals

export class ScoutController {
    
    /**
     * Constructor
     */
    constructor() {
        this.marketService = new MarketService();
        this.socialService = new SocialService();
        this.viewContainer = document.getElementById('view-scout');
        
        // No auto-init here. It is triggered by AppClass when tab is clicked.
    }

    /**
     * Main Init Logic
     * Fetches fresh data every time the tab is opened.
     */
    async init() {
        console.log("🔍 ScoutController: Initializing...");
        
        // 1. Get User from Singleton State
        const user = state.getUser();
        
        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        // 2. Show Loading
        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // 3. Parallel Data Fetching
            const [players, trending] = await Promise.all([
                this.marketService.getPlayersInZone(user.zoneId, user.id),
                this.marketService.getTrendingPlayers(user.zoneId)
            ]);

            // 4. Render View
            this.renderView(players, trending);
            
            // 5. Bind Interactive Events (Search & Buttons)
            this.bindSearchEvents(players);
            this.bindSocialEvents();

        } catch (err) {
            console.error("Scout Init Error:", err);
            this.viewContainer.innerHTML = `<div class="error-state">حدث خطأ: ${err.message}</div>`;
        }
    }

    /**
     * Renders the Full Scout UI
     * @param {Array} players - List of players in zone
     * @param {Array} trending - List of trending players
     */
    renderView(players, trending) {
        this.viewContainer.innerHTML = `
            <div class="scout-container fade-in">
                
                <!-- Search Component -->
                <div class="search-bar-wrapper">
                    <i class="fa-solid fa-search"></i>
                    <input type="text" id="inp-search" placeholder="ابحث عن لاعب أو مركز...">
                </div>

                <!-- Trending Section (Horizontal Scroll) -->
                ${trending.length > 0 ? `
                    <div class="trending-section">
                        <h4>🔥 حديث المنطقة</h4>
                        <div class="trending-scroll">
                            ${trending.map(p => this.renderMiniCard(p)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Main Grid Section -->
                <div class="market-grid-section">
                    <h4>لاعبين في منطقتك (${players.length})</h4>
                    <div id="market-grid" class="market-grid">
                        ${players.length ? players.map(p => this.renderPlayerCard(p)).join('') : '<p class="text-muted">لا يوجد لاعبين مسجلين بعد.</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generates HTML for a Single Player Card (Scout Version)
     */
    renderPlayerCard(p) {
        // Resolve Visual DNA Colors
        let visual = p.visual_dna || { skin: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        
        const skinColors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        const skinHex = skinColors[visual.skin - 1] || skinColors[0];
        
        return `
            <div class="scout-card" data-name="${p.display_name}" data-pos="${p.position}">
                <div class="scout-card-top">
                    <span class="scout-pos">${p.position || 'FAN'}</span>
                    <span class="scout-rating text-gold">${p.stats?.rating || 60}</span>
                </div>
                
                <div class="scout-avatar">
                    <i class="fa-solid fa-user" style="color: ${skinHex};"></i>
                </div>
                
                <div class="scout-info">
                    <h5>${p.display_name}</h5>
                    <div class="scout-tags">
                        <span>${p.activity_type === 'FAN' ? 'مشجع' : 'لاعب'}</span>
                    </div>
                    
                    <!-- Social Mint Action -->
                    <button class="btn-social-mint" data-id="${p.owner_id}">
                        <i class="fa-solid fa-signature"></i> طلب نسخة
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generates HTML for Mini Trending Card
     */
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
     * Binds Search Input to Filter Logic
     */
    bindSearchEvents(allPlayers) {
        const input = document.getElementById('inp-search');
        const grid = document.getElementById('market-grid');

        if(input) {
            input.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                
                const filtered = allPlayers.filter(p => 
                    (p.display_name && p.display_name.toLowerCase().includes(term)) || 
                    (p.position && p.position.toLowerCase().includes(term))
                );
                
                grid.innerHTML = filtered.length ? 
                    filtered.map(p => this.renderPlayerCard(p)).join('') : 
                    '<p class="text-muted text-center">لا توجد نتائج مطابقة.</p>';
            });
        }
    }

    /**
     * Binds "Request Mint" Buttons
     */
    bindSocialEvents() {
        document.querySelectorAll('.btn-social-mint').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Prevent bubbling if card is clickable later
                e.stopPropagation(); 
                this.handleRequest(e.target.closest('button').dataset.id);
            });
        });
    }

    /**
     * LOGIC: Send Mint Request
     */
    async handleRequest(targetId) {
        const currentUser = state.getUser();
        if (targetId === currentUser.id) {
            alert("لا يمكنك طلب نسخة من نفسك!");
            return;
        }

        if(!confirm("هل تريد إرسال طلب للحصول على نسخة موقعة من هذا اللاعب؟")) return;
        
        try {
            await this.socialService.requestMint(currentUser.id, targetId);
            alert("تم إرسال الطلب بنجاح! ستصلك النسخة عند موافقة الكابتن.");
        } catch (e) {
            console.error(e);
            alert("خطأ: " + e.message);
        }
    }
}
