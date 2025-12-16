/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/arenaCtrl.js
 * Version: Noub Sports_beta 0.0.1 (MASTER ARENA)
 * Status: Production Ready
 * 
 * ARCHITECTURAL RESPONSIBILITIES:
 * 1. Role Verification: Interacts with TeamService to verify 'CAPTAIN' status explicitly.
 * 2. View Management: Toggles between Live Feed and Match Registration Form.
 * 3. Data Aggregation: Fetches Opponents and Venues dynamically for the form.
 * 4. Submission Logic: Validates lineup (5 players) and sends payload to MatchService.
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
        
        // Internal Cache
        this.myTeamData = null;
        this.roster = [];
    }

    /**
     * Main Initialization.
     * Called by AppClass when 'Arena' tab is clicked.
     */
    async init() {
        console.log("🏟️ ArenaController: Initializing & Checking Role...");
        
        const currentUser = state.getUser();
        if (!currentUser) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        // 1. Show Loader
        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // 2. Fetch User's Team Role (CRITICAL STEP)
            const myTeam = await this.teamService.getMyTeam(currentUser.id);
            
            // 3. Determine Eligibility
            // Check if user has a team AND is the CAPTAIN
            const isCaptain = myTeam && myTeam.my_role === 'CAPTAIN';

            // 4. Cache Data for Form Use
            if (isCaptain) {
                console.log("✅ User is Captain. Enabling Registration.");
                this.myTeamData = myTeam;
                this.roster = await this.teamService.getTeamRoster(myTeam.id);
            }

            // 5. Render Layout (Pass captain status to show/hide button)
            this.renderLayout(isCaptain);
            
            // 6. Load Default Feed
            await this.loadLiveFeed(currentUser.zoneId);

        } catch (err) {
            console.error("Arena Init Error:", err);
            this.viewContainer.innerHTML = `<div class="error-state">حدث خطأ في تحميل الساحة.</div>`;
        }
    }

    /**
     * Renders the Tab Navigation.
     * @param {boolean} isCaptain - Logic to show/hide 'Register' tab.
     */
    renderLayout(isCaptain) {
        this.viewContainer.innerHTML = `
            <div class="arena-container fade-in">
                <!-- Tabs -->
                <div class="arena-tabs">
                    <button class="tab-btn active" data-tab="feed">
                        <i class="fa-solid fa-tower-broadcast"></i> مباشر
                    </button>
                    
                    <!-- Only show if Captain -->
                    ${isCaptain ? `
                        <button class="tab-btn" data-tab="create">
                            <i class="fa-solid fa-plus-circle"></i> تسجيل مباراة
                        </button>
                    ` : ''}
                </div>

                <!-- Dynamic Content -->
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
                if (tab === 'feed') this.loadLiveFeed(state.getUser().zoneId);
                if (tab === 'create') this.renderCreateForm();
            });
        });
    }

    /**
     * TAB 1: Live Matches Feed
     */
    async loadLiveFeed(zoneId) {
        const container = document.getElementById('arena-content');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';
        
        try {
            const matches = await this.matchService.getLiveFeed(zoneId);
            
            if (!matches || matches.length === 0) { 
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-wind" style="font-size:3rem; margin-bottom:10px; color:#555;"></i>
                        <h3>لا مباريات</h3>
                        <p class="text-muted">الساحة هادئة في منطقتك الآن.</p>
                    </div>`; 
                return; 
            }

            container.innerHTML = matches.map(m => `
                <div class="match-card">
                    <div class="match-meta">
                        <span>${Helpers.formatDate(new Date(m.played_at))}</span>
                        <span><i class="fa-solid fa-location-dot"></i> ${m.venue?.name || 'ملعب'}</span>
                    </div>
                    <div class="scoreboard">
                        <div class="sb-team">
                            <div class="sb-logo" style="background:${m.team_a?.logo_dna?.primary || '#333'}"></div>
                            <span>${m.team_a?.name}</span>
                        </div>
                        <div class="sb-score">
                            ${m.score_a} - ${m.score_b}
                        </div>
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

        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="error-text">فشل تحميل المباريات.</p>';
        }
    }

    /**
     * TAB 2: Create Match Form (Captains Only)
     */
    async renderCreateForm() {
        const container = document.getElementById('arena-content');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';
        
        try {
            const user = state.getUser();
            
            // Parallel Fetch: Get Valid Opponents & Venues
            const [opponents, venues] = await Promise.all([
                this.matchService.getOpponents(user.zoneId, this.myTeamData.id),
                this.matchService.getVenues(user.zoneId)
            ]);

            container.innerHTML = `
                <div class="match-form-box fade-in">
                    <h3 style="color:var(--gold-main); text-align:center; margin-bottom:20px;">تسجيل مباراة جديدة</h3>
                    
                    <form id="form-match">
                        <!-- 1. Select Opponent -->
                        <div class="form-group">
                            <label>الفريق الخصم</label>
                            <select id="inp-opp" required>
                                <option value="" disabled selected>اختر الفريق...</option>
                                ${opponents.length 
                                    ? opponents.map(o => `<option value="${o.id}">${o.name}</option>`).join('') 
                                    : `<option disabled>لا يوجد خصوم نشطين (5 لاعبين+) في منطقتك</option>`}
                            </select>
                        </div>

                        <!-- 2. Select Venue -->
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
                            <label>التشكيلة (من شارك في المباراة؟)</label>
                            <p class="text-muted" style="font-size:0.8rem; margin-bottom:5px;">حدد اللاعبين ليحصلوا على نقاط الخبرة</p>
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
            
            document.getElementById('form-match').addEventListener('submit', (e) => this.handleSubmit(e));

        } catch (e) {
            container.innerHTML = `<p class="error-text">حدث خطأ: ${e.message}</p>`;
        }
    }

    /**
     * LOGIC: Submit the Match Payload
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        const btn = document.getElementById('btn-submit-match');
        btn.disabled = true; 
        btn.textContent = "جاري الإرسال...";
        
        // Construct Payload
        const payload = {
            creatorId: state.getUser().id,
            myTeamId: this.myTeamData.id,
            oppTeamId: document.getElementById('inp-opp').value,
            venueId: parseInt(document.getElementById('inp-venue').value),
            myScore: parseInt(document.getElementById('inp-score-my').value),
            oppScore: parseInt(document.getElementById('inp-score-opp').value),
            lineup: Array.from(document.querySelectorAll('input[name="lineup"]:checked')).map(cb => cb.value),
            scorers: [] 
        };

        // Validation
        if (payload.lineup.length < 5) {
            if(!confirm("عدد اللاعبين المختارين أقل من 5. هل أنت متأكد من المتابعة؟")) {
                btn.disabled = false;
                btn.textContent = "إرسال للتوثيق";
                return;
            }
        }

        try {
            // Call Service
            await this.matchService.validateMatchConstraints(payload.myTeamId);
            await this.matchService.submitMatch(payload);
            
            alert("تم تسجيل المباراة بنجاح! بانتظار موافقة الكابتن الخصم.");
            
            // Return to Feed
            this.loadLiveFeed(state.getUser().zoneId);
            
            // Update Tab UI
            this.viewContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.viewContainer.querySelector('[data-tab="feed"]').classList.add('active');

        } catch (err) {
            alert("خطأ: " + err.message);
            btn.disabled = false;
            btn.textContent = "إرسال للتوثيق";
        }
    }
}
