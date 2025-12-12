/*
 * Filename: js/controllers/scoutCtrl.js
 * Version: 3.0.0
 * Description: Controller for Scout/Market View.
 * Renders player grid, handles filtering, and social mint buttons.
 */

import { MarketService } from '../services/marketService.js';
import { SocialService } from '../services/socialService.js';
import { State } from '../core/state.js';
import { AvatarEngine } from '../utils/avatarEngine.js'; // For rendering avatars

export class ScoutController {
    constructor() {
        this.marketService = new MarketService();
        this.socialService = new SocialService();
        this.state = new State();
        this.viewContainer = document.getElementById('view-scout');
        
        // No auto-init here, App calls it when tab is clicked
    }

    async init() {
        console.log("🔍 ScoutController: Initializing...");
        const user = this.state.getUser();
        if (!user) return;

        this.setLoading(true);

        try {
            // Fetch Data
            const [players, trending] = await Promise.all([
                this.marketService.getPlayersInZone(user.zoneId, user.id),
                this.marketService.getTrendingPlayers(user.zoneId)
            ]);

            this.renderView(players, trending);
            this.bindSearchEvents(players); // Client-side filtering for MVP

        } catch (err) {
            this.viewContainer.innerHTML = `<div class="error-state">${err.message}</div>`;
        }
    }

    renderView(players, trending) {
        // Construct HTML
        this.viewContainer.innerHTML = `
            <div class="scout-container fade-in">
                
                <!-- Search Bar -->
                <div class="search-bar-wrapper">
                    <i class="fa-solid fa-search"></i>
                    <input type="text" id="inp-search" placeholder="ابحث عن لاعب أو مركز...">
                </div>

                <!-- Trending Section -->
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
                    <h4>لاعبين في منطقتك</h4>
                    <div id="market-grid" class="market-grid">
                        ${players.length ? players.map(p => this.renderPlayerCard(p)).join('') : '<p class="text-muted">لا يوجد لاعبين مسجلين بعد.</p>'}
                    </div>
                </div>
            </div>
        `;

        // Bind Social Buttons
        document.querySelectorAll('.btn-social-mint').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleRequest(e.target.dataset.id));
        });
    }

    renderPlayerCard(p) {
        // Uses visual_dna to show colors (Simplified for list)
        const skinColor = this.getHexColor('skin', p.visual_dna?.skin);
        
        return `
            <div class="scout-card" data-name="${p.display_name}" data-pos="${p.position}">
                <div class="scout-card-top">
                    <span class="scout-pos">${p.position}</span>
                    <span class="scout-rating text-gold">${p.stats?.rating || 60}</span>
                </div>
                <div class="scout-avatar">
                    <i class="fa-solid fa-user" style="color: ${skinColor};"></i>
                </div>
                <div class="scout-info">
                    <h5>${p.display_name}</h5>
                    <div class="scout-tags">
                        <span>${p.activity_type === 'FAN' ? 'مشجع' : 'لاعب'}</span>
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
                <div class="mini-avatar"><i class="fa-solid fa-fire text-gold"></i></div>
                <span>${p.display_name}</span>
            </div>
        `;
    }

    getHexColor(type, id) {
        // Simple mapping (Same as AvatarEngine)
        if(type === 'skin') return ['#F5C6A5', '#C68642', '#8D5524'][id-1] || '#ccc';
        return '#fff';
    }

    bindSearchEvents(allPlayers) {
        const input = document.getElementById('inp-search');
        const grid = document.getElementById('market-grid');

        if(input) {
            input.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allPlayers.filter(p => 
                    p.display_name.toLowerCase().includes(term) || 
                    p.position.toLowerCase().includes(term)
                );
                
                grid.innerHTML = filtered.length ? 
                    filtered.map(p => this.renderPlayerCard(p)).join('') : 
                    '<p class="text-muted">لا توجد نتائج.</p>';
            });
        }
    }

    async handleRequest(targetId) {
        if(!confirm("هل تريد إرسال طلب للحصول على نسخة موقعة من هذا اللاعب؟")) return;
        
        try {
            await this.socialService.requestMint(this.state.getUser().id, targetId);
            alert("تم إرسال الطلب! انتظر موافقة الكابتن.");
        } catch (e) {
            alert(e.message);
        }
    }

    setLoading(bool) {
        this.viewContainer.innerHTML = bool ? '<div class="loader-center"><div class="loader-bar"></div></div>' : '';
    }
}
