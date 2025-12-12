/*
 * Filename: js/controllers/arenaCtrl.js
 * Version: 3.0.0 (Day 4 - Arena Interface)
 * Description: Controls the Arena View.
 * Responsibilities:
 *  1. Render Live Matches (Feed).
 *  2. Render 'Create Match' Form (Captains only).
 *  3. Render 'Actions' Tab (Pending verifications).
 */

import { MatchService } from '../services/matchService.js';
import { TeamService } from '../services/teamService.js';
import { State } from '../core/state.js';
import { Helpers } from '../utils/helpers.js';

export class ArenaController {
    constructor() {
        this.matchService = new MatchService();
        this.teamService = new TeamService();
        this.state = new State();
        this.viewContainer = document.getElementById('view-arena');
        
        // Auto Init not forced here, called by Router
    }

    async init() {
        console.log("🏟️ Arena Controller: Initializing...");
        const user = this.state.getUser();
        if (!user) return;

        // Determine User Role (Captain?)
        const myTeam = await this.teamService.getMyTeam(user.id);
        const isCaptain = myTeam?.my_role === 'CAPTAIN';

        // Render Basic Layout (Tabs)
        this.renderLayout(isCaptain);
        
        // Load Default Tab (Live)
        this.loadLiveMatches(user.zoneId);
    }

    renderLayout(isCaptain) {
        this.viewContainer.innerHTML = `
            <div class="arena-container fade-in">
                
                <!-- Arena Tabs -->
                <div class="arena-tabs">
                    <button class="tab-btn active" data-tab="live">
                        <i class="fa-solid fa-satellite-dish"></i> مباشر
                    </button>
                    ${isCaptain ? `
                        <button class="tab-btn" data-tab="new">
                            <i class="fa-solid fa-pen-to-square"></i> تسجيل
                        </button>
                        <button class="tab-btn" data-tab="actions">
                            <i class="fa-solid fa-gavel"></i> إجراءات
                        </button>
                    ` : ''}
                </div>

                <!-- Dynamic Content Area -->
                <div id="arena-content" class="arena-content">
                    <div class="loader-center"><div class="loader-bar"></div></div>
                </div>
            </div>
        `;

        // Bind Tab Events
        this.viewContainer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e, btn.dataset.tab, isCaptain));
        });
    }

    async switchTab(e, tabName, isCaptain) {
        // Update UI
        this.viewContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const content = document.getElementById('arena-content');
        content.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        const user = this.state.getUser();

        if (tabName === 'live') {
            await this.loadLiveMatches(user.zoneId);
        } else if (tabName === 'new' && isCaptain) {
            this.renderCreateMatchForm();
        } else if (tabName === 'actions' && isCaptain) {
            this.renderPendingActions();
        }
    }

    /**
     * TAB 1: Live Matches
     */
    async loadLiveMatches(zoneId) {
        try {
            const matches = await this.matchService.getMatchesInZone(zoneId);
            const container = document.getElementById('arena-content');

            if (matches.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-wind"></i>
                        <p>لا توجد مباريات جارية في منطقتك حالياً.</p>
                    </div>`;
                return;
            }

            container.innerHTML = matches.map(m => `
                <div class="match-card">
                    <div class="match-header">
                        <span class="match-time">${Helpers.formatDate(new Date(m.played_at))}</span>
                        <span class="match-venue"><i class="fa-solid fa-location-dot"></i> ${m.venue?.name || 'ملعب'}</span>
                    </div>
                    <div class="scoreboard">
                        <div class="team-side">
                            <div class="team-logo small" style="background:${m.team_a?.logo_dna?.primary || '#333'}"></div>
                            <span class="team-name">${m.team_a?.name}</span>
                        </div>
                        <div class="score-display">
                            <span class="score">${m.score_a}</span>
                            <span class="divider">:</span>
                            <span class="score">${m.score_b}</span>
                        </div>
                        <div class="team-side">
                            <div class="team-logo small" style="background:${m.team_b?.logo_dna?.primary || '#333'}"></div>
                            <span class="team-name">${m.team_b?.name}</span>
                        </div>
                    </div>
                    <div class="match-status">${m.status === 'CONFIRMED' ? 'انتهت' : 'جارية'}</div>
                </div>
            `).join('');

        } catch (e) {
            console.error(e);
            document.getElementById('arena-content').innerHTML = `<p class="error-text">فشل تحميل المباريات.</p>`;
        }
    }

    /**
     * TAB 2: Create Match Form (Captains)
     */
    renderCreateMatchForm() {
        const container = document.getElementById('arena-content');
        container.innerHTML = `
            <div class="create-match-box">
                <h3>تسجيل نتيجة</h3>
                <form id="form-create-match">
                    <div class="form-group">
                        <label>الفريق الخصم</label>
                        <!-- Future: Dropdown from API -->
                        <select id="inp-opponent" required>
                            <option value="" disabled selected>اختر الخصم...</option>
                            <!-- سيتم ملؤها ديناميكياً لاحقاً -->
                        </select>
                    </div>
                    
                    <div class="score-input-row">
                        <div class="score-input">
                            <label>فريقنا</label>
                            <input type="number" id="inp-score-a" value="0" min="0">
                        </div>
                        <div class="score-input">
                            <label>الخصم</label>
                            <input type="number" id="inp-score-b" value="0" min="0">
                        </div>
                    </div>

                    <button type="button" class="btn-primary" onclick="alert('سيتم تفعيل التسجيل في الخطوة التالية')">
                        تأكيد وإرسال
                    </button>
                </form>
                <p class="hint-text text-center">سيصل إشعار للكابتن الخصم للموافقة.</p>
            </div>
        `;
        
        // Future: Fetch teams and populate dropdown
    }

    /**
     * TAB 3: Pending Actions
     */
    renderPendingActions() {
        const container = document.getElementById('arena-content');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-check-double"></i>
                <p>لا توجد مباريات معلقة للموافقة.</p>
            </div>
        `;
    }
}
