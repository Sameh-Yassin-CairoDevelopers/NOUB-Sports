/*
 * Filename: js/controllers/arenaCtrl.js
 * Version: 5.5.0 (MASTER CONTROLLER)
 * Description: Controller for the Arena/Matchmaking Module.
 * 
 * RESPONSIBILITIES:
 * 1. Role Logic: Determines if the user is a Captain to unlock 'Create Match' tab.
 * 2. Feed Rendering: Displays live/recent matches with real-time status.
 * 3. Match Logging Form: A complex form that aggregates:
 *    - Opponent Selection (Filtered by Zone).
 *    - Venue Selection (GPS verified locations).
 *    - Score Input.
 *    - Lineup Selection (Who played?).
 * 4. Submission Logic: Validates and sends payload to MatchService.
 */

import { MatchService } from '../services/matchService.js';
import { TeamService } from '../services/teamService.js';
import { state } from '../core/state.js'; // Singleton State
import { Helpers } from '../utils/helpers.js';

export class ArenaController {
    
    /**
     * Constructor: Initializes dependencies and view container.
     */
    constructor() {
        this.matchService = new MatchService();
        this.teamService = new TeamService();
        this.viewContainer = document.getElementById('view-arena');
        
        // Internal Cache for Captain Data
        this.myTeamData = null;
        this.roster = [];
    }

    /**
     * Main Initialization Logic.
     * Called when 'Arena' tab is clicked.
     */
    async init() {
        console.log("🏟️ ArenaController: Initializing...");
        
        const currentUser = state.getUser();
        if (!currentUser) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        // 1. Show Loading
        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // 2. Fetch User's Team Role
            const myTeam = await this.teamService.getMyTeam(currentUser.id);
            const isCaptain = myTeam?.my_role === 'CAPTAIN';

            // 3. Pre-load Captain Data (if applicable)
            if (isCaptain) {
                this.myTeamData = myTeam;
                // Fetch roster to populate the Lineup Selector later
                this.roster = await this.teamService.getTeamRoster(myTeam.id);
            }

            // 4. Render Layout (Tabs)
            this.renderLayout(isCaptain);
            
            // 5. Load Default Feed
            await this.loadLiveFeed(currentUser.zoneId);

        } catch (err) {
            console.error("Arena Init Error:", err);
            this.viewContainer.innerHTML = `<div class="error-state">حدث خطأ في تحميل الساحة.</div>`;
        }
    }

    /**
     * Renders the Tab Navigation.
     */
    renderLayout(isCaptain) {
        this.viewContainer.innerHTML = `
            <div class="arena-container fade-in">
                <!-- Navigation Tabs -->
                <div class="arena-tabs">
                    <button class="tab-btn active" data-tab="feed">
                        <i class="fa-solid fa-tower-broadcast"></i> مباشر
                    </button>
                    ${isCaptain ? `
                        <button class="tab-btn" data-tab="create">
                            <i class="fa-solid fa-plus-circle"></i> تسجيل
                        </button>
                    ` : ''}
                </div>

                <!-- Dynamic Content Area -->
                <div id="arena-content"></div>
            </div>
        `;

        // Bind Tab Events
        this.viewContainer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // UI Toggle
                this.viewContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Logic Switch
                const tab = e.target.dataset.tab;
                const user = state.getUser();
                
                if (tab === 'feed') this.loadLiveFeed(user.zoneId);
                if (tab === 'create') this.renderCreateForm();
            });
        });
    }

    /**
     * TAB 1: Loads the Match Feed.
     */
    async loadLiveFeed(zoneId) {
        const container = document.getElementById('arena-content');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';
        
        try {
            const matches = await this.matchService.getLiveFeed(zoneId);
            
            if (!matches.length) { 
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-wind" style="font-size:3rem; margin-bottom:10px; color:#555;"></i>
                        <h3>لا مباريات</h3>
                        <p class="text-muted">الساحة هادئة في منطقتك الآن.</p>
                    </div>`; 
                return; 
            }

            // Render Match Cards
            container.innerHTML = matches.map(m => `
                <div class="match-card">
                    <!-- Header -->
                    <div class="match-meta">
                        <span>${Helpers.formatDate(new Date(m.played_at))}</span>
                        <span><i class="fa-solid fa-location-dot"></i> ${m.venue?.name || 'ملعب'}</span>
                    </div>
                    
                    <!-- Scoreboard -->
                    <div class="scoreboard">
                        <!-- Team A -->
                        <div class="sb-team">
                            <div class="sb-logo" style="background:${m.team_a?.logo_dna?.primary || '#333'}"></div>
                            <span>${m.team_a?.name}</span>
                        </div>
                        
                        <!-- Score -->
                        <div class="sb-score">
                            ${m.score_a} - ${m.score_b}
                        </div>
                        
                        <!-- Team B -->
                        <div class="sb-team">
                            <div class="sb-logo" style="background:${m.team_b?.logo_dna?.primary || '#333'}"></div>
                            <span>${m.team_b?.name}</span>
                        </div>
                    </div>
                    
                    <!-- Status -->
                    <div class="match-status status-${m.status.toLowerCase()}">
                        ${m.status === 'CONFIRMED' ? 'نتيجة معتمدة' : 'في انتظار التوثيق'}
                    </div>
                </div>
            `).join('');

        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="error-text">فشل تحميل المباريات.</p>';
        }
    }

    /**
     * TAB 2: Renders the Create Match Form.
     * Fetches Opponents and Venues on load.
     */
    async renderCreateForm() {
        const container = document.getElementById('arena-content');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';
        
        try {
            const user = state.getUser();
            
            // Parallel Fetch: Opponents & Venues
            const [opponents, venues] = await Promise.all([
                this.matchService.getOpponents(user.zoneId, this.myTeamData.id),
                this.matchService.getVenues(user.zoneId)
            ]);

            container.innerHTML = `
                <div class="match-form-box fade-in">
                    <h3>تسجيل مباراة جديدة</h3>
                    
                    <form id="form-match">
                        <!-- 1. Opponent -->
                        <div class="form-group">
                            <label>الفريق الخصم</label>
                            <select id="inp-opp" required>
                                <option value="" disabled selected>اختر الفريق...</option>
                                ${opponents.length 
                                    ? opponents.map(o => `<option value="${o.id}">${o.name}</option>`).join('') 
                                    : `<option disabled>لا يوجد خصوم نشطين</option>`}
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

                        <!-- 3. Scores -->
                        <div class="score-inputs">
                            <div class="si-box">
                                <label>نحن (${this.myTeamData.name})</label>
                                <input type="number" id="inp-score-my" value="0" min="0">
                            </div>
                            <div class="si-box">
                                <label>هم (الخصم)</label>
                                <input type="number" id="inp-score-opp" value="0" min="0">
                            </div>
                        </div>

                        <!-- 4. Lineup Selector -->
                        <div class="form-group">
                            <label>التشكيلة (اختر من نزل الملعب)</label>
                            <p class="text-muted text-small">حدد اللاعبين لتسجيل نقاط المشاركة</p>
                            <div class="roster-grid">
                                ${this.roster.map(p => `
                                    <label class="player-chk">
                                        <input type="checkbox" name="lineup" value="${p.userId}">
                                        <span class="chk-box">${p.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <button type="submit" class="btn-primary" id="btn-submit-match">
                            <i class="fa-solid fa-paper-plane"></i> إرسال للتوثيق
                        </button>
                    </form>
                </div>`;
            
            // Bind Submit
            document.getElementById('form-match').addEventListener('submit', (e) => this.handleSubmit(e));

        } catch (e) {
            container.innerHTML = `<p class="error-text">حدث خطأ: ${e.message}</p>`;
        }
    }

    /**
     * LOGIC: Submit the Match
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        const btn = document.getElementById('btn-submit-match');
        btn.disabled = true; 
        btn.textContent = "جاري الإرسال...";
        
        // 1. Collect Payload
        const payload = {
            creatorId: state.getUser().id,
            myTeamId: this.myTeamData.id,
            oppTeamId: document.getElementById('inp-opp').value,
            venueId: parseInt(document.getElementById('inp-venue').value),
            myScore: parseInt(document.getElementById('inp-score-my').value),
            oppScore: parseInt(document.getElementById('inp-score-opp').value),
            // Map selected checkboxes to array
            lineup: Array.from(document.querySelectorAll('input[name="lineup"]:checked')).map(cb => cb.value),
            scorers: [] // Reserved for future
        };

        // 2. Validate Lineup
        if (payload.lineup.length < 5) {
            if(!confirm("عدد اللاعبين المختارين أقل من 5. هل أنت متأكد؟")) {
                btn.disabled = false;
                btn.textContent = "إرسال للتوثيق";
                return;
            }
        }

        try {
            // 3. Check Constraints
            await this.matchService.validateMatchConstraints(payload.myTeamId);
            
            // 4. Execute Transaction
            await this.matchService.submitMatch(payload);
            
            alert("تم تسجيل المباراة بنجاح! بانتظار موافقة الكابتن الخصم.");
            
            // 5. Reload Feed
            this.loadLiveFeed(state.getUser().zoneId);
            
            // Reset Tabs UI
            this.viewContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.viewContainer.querySelector('[data-tab="feed"]').classList.add('active');

        } catch (err) {
            alert("خطأ: " + err.message);
            btn.disabled = false;
            btn.textContent = "إرسال للتوثيق";
        }
    }
}
