/*
 * Filename: js/controllers/arenaCtrl.js
 * Version: 3.2.0
 * Description: Controls Arena View (Feed & Match Logger).
 * Handles: Tabs, Fetching Opponents, Lineup Selection, Submission.
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
        this.init();
    }

    async init() {
        console.log("🏟️ Arena Controller Init...");
        const user = this.state.getUser();
        if (!user) return; // Auth check done by App

        // 1. Get User Role (Captain?)
        const myTeam = await this.teamService.getMyTeam(user.id);
        const isCaptain = myTeam?.my_role === 'CAPTAIN';
        
        // 2. Render Tabs
        this.renderLayout(isCaptain);
        
        // 3. Load Feed
        this.loadFeed(user.zoneId);

        // 4. Pre-load Data for Captains
        if (isCaptain) {
            this.myTeamData = myTeam;
            this.roster = await this.teamService.getTeamRoster(myTeam.id);
        }
    }

    renderLayout(isCaptain) {
        this.viewContainer.innerHTML = `
            <div class="arena-container fade-in">
                <div class="arena-tabs">
                    <button class="tab-btn active" data-tab="feed"><i class="fa-solid fa-tower-broadcast"></i> مباشر</button>
                    ${isCaptain ? `<button class="tab-btn" data-tab="create"><i class="fa-solid fa-plus-circle"></i> تسجيل</button>` : ''}
                </div>
                <div id="arena-content"></div>
            </div>
        `;

        this.viewContainer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                if (e.target.dataset.tab === 'feed') this.loadFeed(this.state.getUser().zoneId);
                if (e.target.dataset.tab === 'create') this.renderCreateForm();
            });
        });
    }

    async loadFeed(zoneId) {
        const container = document.getElementById('arena-content');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';
        
        const matches = await this.matchService.getLiveFeed(zoneId);
        
        if (!matches.length) {
            container.innerHTML = '<div class="empty-state"><h3>لا مباريات</h3><p>الساحة هادئة الآن.</p></div>';
            return;
        }

        container.innerHTML = matches.map(m => `
            <div class="match-card">
                <div class="match-meta">
                    <span>${Helpers.formatDate(new Date(m.played_at))}</span>
                    <span>${m.venue?.name || 'ملعب'}</span>
                </div>
                <div class="scoreboard">
                    <div class="sb-team">
                        <div class="sb-logo" style="background:${m.team_a?.logo_dna?.primary || '#333'}"></div>
                        <span>${m.team_a?.name}</span>
                    </div>
                    <div class="sb-score">${m.score_a} - ${m.score_b}</div>
                    <div class="sb-team">
                        <div class="sb-logo" style="background:${m.team_b?.logo_dna?.primary || '#333'}"></div>
                        <span>${m.team_b?.name}</span>
                    </div>
                </div>
                <div class="match-status status-${m.status.toLowerCase()}">
                    ${m.status === 'CONFIRMED' ? 'نتيجة معتمدة' : 'في انتظار التوثيق'}
                </div>
            </div>
        `).join('');
    }

    async renderCreateForm() {
        const container = document.getElementById('arena-content');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';

        // Load Opponents & Venues
        const user = this.state.getUser();
        const [opponents, venues] = await Promise.all([
            this.matchService.getOpponents(user.zoneId, this.myTeamData.id),
            this.matchService.getVenues(user.zoneId)
        ]);

        container.innerHTML = `
            <div class="match-form-box">
                <h3>تسجيل مباراة</h3>
                <form id="form-match">
                    <!-- 1. Opponent -->
                    <div class="form-group">
                        <label>الخصم</label>
                        <select id="inp-opp" required>
                            <option value="" disabled selected>اختر الفريق...</option>
                            ${opponents.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
                        </select>
                    </div>

                    <!-- 2. Venue -->
                    <div class="form-group">
                        <label>الملعب</label>
                        <select id="inp-venue" required>
                            <option value="" disabled selected>أين لعبتم؟</option>
                            ${venues.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
                        </select>
                    </div>

                    <!-- 3. Score -->
                    <div class="score-inputs">
                        <div class="si-box">
                            <label>نحن</label>
                            <input type="number" id="inp-score-my" value="0" min="0">
                        </div>
                        <div class="si-box">
                            <label>هم</label>
                            <input type="number" id="inp-score-opp" value="0" min="0">
                        </div>
                    </div>

                    <!-- 4. Lineup (Who Played?) -->
                    <div class="form-group">
                        <label>التشكيلة (من لعب؟)</label>
                        <div class="roster-grid">
                            ${this.roster.map(p => `
                                <label class="player-chk">
                                    <input type="checkbox" name="lineup" value="${p.userId}">
                                    <span class="chk-box">${p.name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <button type="submit" class="btn-primary" id="btn-submit-match">إرسال للتوثيق</button>
                </form>
            </div>
        `;

        document.getElementById('form-match').addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-match');
        btn.disabled = true;
        btn.textContent = "جاري الإرسال...";

        // Gather Data
        const payload = {
            creatorId: this.state.getUser().id,
            myTeamId: this.myTeamData.id,
            oppTeamId: document.getElementById('inp-opp').value,
            venueId: parseInt(document.getElementById('inp-venue').value),
            myScore: parseInt(document.getElementById('inp-score-my').value),
            oppScore: parseInt(document.getElementById('inp-score-opp').value),
            lineup: Array.from(document.querySelectorAll('input[name="lineup"]:checked')).map(cb => cb.value),
            scorers: [] // Future: Add Scorer Selector Logic
        };

        try {
            await this.matchService.validateConstraints(payload.myTeamId);
            await this.matchService.submitMatch(payload);
            alert("تم تسجيل المباراة! بانتظار موافقة الكابتن الخصم.");
            this.loadFeed(this.state.getUser().zoneId);
        } catch (err) {
            alert("خطأ: " + err.message);
            btn.disabled = false;
            btn.textContent = "إرسال للتوثيق";
        }
    }
}
