/*
 * Filename: js/controllers/scoutCtrl.js
 * Version: 5.1.0 (Interactive Details)
 * Description: Scout Controller.
 * Updates:
 * - Click event on cards to open 'Player Details Modal'.
 * - Social Minting logic moved inside the modal.
 * - Sound effects integrated.
 */

import { MarketService } from '../services/marketService.js';
import { SocialService } from '../services/socialService.js';
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';

export class ScoutController {
    constructor() {
        this.marketService = new MarketService();
        this.socialService = new SocialService();
        this.viewContainer = document.getElementById('view-scout');
        this.cachedPlayers = [];
    }

    async init() {
        console.log("🔍 ScoutCtrl: Init");
        const user = state.getUser();
        if (!user) return;

        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            const [players, trending] = await Promise.all([
                this.marketService.getPlayersInZone(user.zoneId, user.id),
                this.marketService.getTrendingPlayers(user.zoneId)
            ]);
            this.cachedPlayers = players;
            this.renderView(players, trending);
            this.bindEvents();
        } catch (e) {
            this.viewContainer.innerHTML = `<div class="error-state">${e.message}</div>`;
        }
    }

    renderView(players, trending) {
        this.viewContainer.innerHTML = `
            <div class="scout-container fade-in">
                <div class="scout-header">
                    <div class="search-bar-wrapper">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="inp-search" placeholder="ابحث بالاسم...">
                    </div>
                    <div class="filter-pills">
                        <button class="pill active" data-filter="PLAYER">لاعبين</button>
                        <button class="pill" data-filter="FAN">مشجعين</button>
                    </div>
                </div>

                ${trending.length ? `<div class="trending-section"><h4>🔥 حديث المنطقة</h4><div class="trending-scroll">${trending.map(p => this.renderMiniCard(p)).join('')}</div></div>` : ''}

                <div class="market-grid-section">
                    <h4 id="grid-title">لاعبي المنطقة</h4>
                    <div id="market-grid" class="market-grid">
                        ${players.length ? players.map(p => this.renderPlayerCard(p)).join('') : '<p class="text-muted">لا يوجد لاعبين.</p>'}
                    </div>
                </div>
            </div>`;
        
        // Note: Bind buttons happens in bindEvents now
    }

    renderPlayerCard(p) {
        // We render the card as a clickable unit
        let visual = p.visual_dna || { skin: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        const skinColors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        
        // We store JSON data in dataset for quick access (Optimization)
        const playerDataSafe = encodeURIComponent(JSON.stringify(p));

        return `
            <div class="scout-card" data-player="${playerDataSafe}">
                <div class="scout-card-top">
                    <span class="scout-pos">${p.position || 'FAN'}</span>
                    ${p.activity_type !== 'FAN' ? `<span class="scout-rating text-gold">${p.stats?.rating || 60}</span>` : ''}
                </div>
                <div class="scout-avatar">
                    <i class="fa-solid fa-user" style="color: ${skinColors[visual.skin - 1] || '#ccc'};"></i>
                </div>
                <div class="scout-info">
                    <h5>${p.display_name}</h5>
                    <div class="scout-tags"><span>${p.activity_type === 'FAN' ? 'مشجع' : 'لاعب'}</span></div>
                </div>
            </div>`;
    }

    renderMiniCard(p) { 
        return `<div class="mini-trend-card"><div class="mini-avatar"><i class="fa-solid fa-fire text-gold"></i></div><span>${p.display_name}</span></div>`; 
    }

    bindEvents() {
        // 1. Search & Filter (Same as before)
        document.getElementById('inp-search')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = this.cachedPlayers.filter(p => p.display_name.toLowerCase().includes(term));
            document.getElementById('market-grid').innerHTML = filtered.length ? filtered.map(p => this.renderPlayerCard(p)).join('') : '<p>لا توجد نتائج.</p>';
            this.bindCardClicks(); // Re-bind after search
        });

        document.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadList(state.getUser().zoneId, e.target.dataset.filter);
            });
        });

        // 2. Initial Bind for Card Clicks
        this.bindCardClicks();
    }

    async loadList(zoneId, filter) {
        const grid = document.getElementById('market-grid');
        grid.innerHTML = '<div class="loader-bar"></div>';
        try {
            const players = await this.marketService.getPlayersInZone(zoneId, state.getUser().id, filter);
            this.cachedPlayers = players;
            grid.innerHTML = players.length ? players.map(p => this.renderPlayerCard(p)).join('') : '<p class="text-muted">لا توجد نتائج.</p>';
            this.bindCardClicks();
        } catch (e) { grid.innerHTML = '<p class="error-text">خطأ.</p>'; }
    }

    /**
     * Binds Click on ANY Scout Card to open the Detail Modal
     */
    bindCardClicks() {
        document.querySelectorAll('.scout-card').forEach(card => {
            card.addEventListener('click', () => {
                const pData = JSON.parse(decodeURIComponent(card.dataset.player));
                this.openPlayerDetailModal(pData);
            });
        });
    }

    /**
     * Opens the Player Detail Modal (The Deep Dive)
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
        const visual = typeof player.visual_dna === 'string' ? JSON.parse(player.visual_dna) : player.visual_dna;
        const skinColor = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'][visual.skin - 1] || '#ccc';

        content.innerHTML = `
            <div class="player-detail-header">
                <div class="detail-avatar-large">
                    <i class="fa-solid fa-user" style="color: ${skinColor}"></i>
                </div>
                <h2 class="text-gold">${player.display_name}</h2>
                <span class="status-badge">${player.position || 'FAN'}</span>
            </div>

            <!-- Stats (Only for Players) -->
            ${player.activity_type !== 'FAN' ? `
                <div class="detail-stats-row">
                    <div class="ds-item"><span class="ds-val">${player.stats?.goals || 0}</span><span class="ds-lbl">أهداف</span></div>
                    <div class="ds-item"><span class="ds-val">${player.stats?.matches || 0}</span><span class="ds-lbl">مباريات</span></div>
                    <div class="ds-item"><span class="ds-val text-gold">${player.stats?.rating || 60}</span><span class="ds-lbl">تقييم</span></div>
                </div>
            ` : ''}

            <!-- History (Mocked for MVP, can be fetched) -->
            <div class="history-section">
                <h4>آخر المباريات</h4>
                <div class="history-list">
                    <div class="history-card">
                        <span>ضد نجوم المستقبل</span>
                        <span class="result-badge res-win">فوز 5-3</span>
                    </div>
                    <div class="history-card">
                        <span>ضد المدفعجية</span>
                        <span class="result-badge res-loss">خسارة 2-1</span>
                    </div>
                </div>
            </div>

            <!-- Social Action -->
            <button id="btn-modal-mint" class="btn-primary" style="margin-top:20px;">
                <i class="fa-solid fa-signature"></i> طلب نسخة موقعة
            </button>
        `;

        // 3. Show Modal
        document.getElementById(modalId).classList.remove('hidden');

        // 4. Bind Mint Button
        document.getElementById('btn-modal-mint').onclick = () => {
            this.handleRequest(player.owner_id);
            document.getElementById(modalId).classList.add('hidden');
        };
    }

    async handleRequest(targetId) {
        if(!confirm("إرسال طلب توقيع؟")) return;
        try { 
            await this.socialService.requestMint(state.getUser().id, targetId);
            SoundManager.play('success');
            alert("تم إرسال الطلب!");
        } catch (e) { 
            SoundManager.play('error');
            alert(e.message); 
        }
    }
}
