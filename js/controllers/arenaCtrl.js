/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/arenaCtrl.js
 * Version: Noub Sports_beta 4.5.0 (GOLDEN MASTER)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * The "Arena" is the heart of the competitive experience. This controller manages
 * the live match feed, the press headlines engine, and the captain's match submission interface.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Feed Management: Fetches live matches and renders them with AI-generated headlines.
 * 2. Captain's Tools: Provides the interface for creating matches, selecting lineups, 
 *    and recording scores (Write Access).
 * 3. Emergency Link: Acts as the gateway to the "Operations Room" (SOS) via a 
 *    dedicated deep-link button.
 * 
 * DESIGN PATTERN:
 * - Tabbed Interface: Swaps between "Feed" (Read) and "Create" (Write) views.
 * - Role-Based Rendering: Only Captains see the "Create" tab.
 * -----------------------------------------------------------------------------
 */

import { MatchService } from '../services/matchService.js';
import { TeamService } from '../services/teamService.js';
import { state } from '../core/state.js';
import { Helpers } from '../utils/helpers.js';
import { SoundManager } from '../utils/soundManager.js';

export class ArenaController {
    
    /**
     * Constructor: Initializes services and internal state.
     * Caches the main view container for performance.
     */
    constructor() {
        // Data Services
        this.matchService = new MatchService();
        this.teamService = new TeamService();
        
        // DOM Reference
        this.viewContainer = document.getElementById('view-arena');
        
        // State Cache
        this.myTeamData = null; // Stores team info if user is a Captain
        this.roster = [];       // Stores team players for lineup selection
        
        console.log("🏟️ ArenaController: Initialized & Ready.");
    }

    /**
     * Main Initialization Logic.
     * Triggered by the App Router when accessing the Arena Tab.
     */
    async init() {
        const currentUser = state.getUser();
        
        // 1. Auth Guard
        if (!currentUser) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول للوصول للساحة.</div>`;
            return;
        }

        // 2. Loading State
        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // 3. Fetch Role & Team Data
            // We need to know if the user is a Captain to show the "Create" tab.
            const myTeam = await this.teamService.getMyTeam(currentUser.id);
            const isCaptain = myTeam?.my_role === 'CAPTAIN';

            if (isCaptain) {
                this.myTeamData = myTeam;
                // Pre-fetch roster for the creation form
                this.roster = await this.teamService.getTeamRoster(myTeam.id);
            }

            // 4. Render Layout & Load Feed
            this.renderLayout(isCaptain);
            await this.loadLiveFeed(currentUser.zoneId);

        } catch (err) {
            console.error("Arena Init Error:", err);
            this.viewContainer.innerHTML = `<div class="error-state">حدث خطأ في تحميل بيانات الساحة.</div>`;
        }
    }

    /**
     * Renders the Static Layout (Tabs + Header).
     * [CRITICAL UPDATE]: The SOS Button now redirects to 'view-operations' instead of opening a modal.
     * 
     * @param {boolean} isCaptain - Determines visibility of the "Create" tab.
     */
    renderLayout(isCaptain) {
        this.viewContainer.innerHTML = `
            <div class="arena-container fade-in">
                
                <!-- HEADER ROW: Tabs + SOS Action -->
                <div style="display:flex; gap:10px; margin-bottom:15px; align-items:center;">
                    
                    <!-- Tabs Navigation -->
                    <div class="arena-tabs" style="flex:1; margin-bottom:0;">
                        <button class="tab-btn active" data-tab="feed">
                            <i class="fa-solid fa-newspaper"></i> الأخبار
                        </button>
                        ${isCaptain ? `
                            <button class="tab-btn" data-tab="create">
                                <i class="fa-solid fa-pen-to-square"></i> تسجيل
                            </button>
                        ` : ''}
                    </div>
                    
                    <!-- SOS BUTTON (Gateway to Operations Room) -->
                    <button id="btn-sos" style="
                        background: rgba(239, 68, 68, 0.15); 
                        border: 1px solid #ef4444; 
                        color: #ef4444; 
                        border-radius: 12px; 
                        width: 50px; height: 45px;
                        display:flex; justify-content:center; align-items:center;
                        font-size: 1.2rem; cursor: pointer;
                        animation: pulse-red 2s infinite;"
                        title="غرفة العمليات">
                        <i class="fa-solid fa-tower-broadcast"></i>
                    </button>
                </div>

                <!-- DYNAMIC CONTENT CONTAINER -->
                <div id="arena-content"></div>
            </div>
        `;

        // Bind Tab Switching Events
        this.viewContainer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                
                // UI Toggle
                this.viewContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Logic Dispatch
                if (e.target.dataset.tab === 'feed') {
                    this.loadLiveFeed(state.getUser().zoneId);
                } else if (e.target.dataset.tab === 'create') {
                    this.renderCreateForm();
                }
            });
        });

        // [FIXED] Bind SOS Button to Router
        document.getElementById('btn-sos').onclick = () => {
            SoundManager.play('notify');
            // Navigate to the dedicated Operations View
            window.router('view-operations');
        };
    }

    /* =========================================================================
       SECTION 1: THE MATCH FEED (PRESS ENGINE)
       ========================================================================= */

    /**
     * Loads the live match feed for the user's zone.
     * Renders match cards with AI-generated headlines from 'match_data'.
     * 
     * @param {number} zoneId - The Zone ID to filter matches.
     */
    async loadLiveFeed(zoneId) {
        const container = document.getElementById('arena-content');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';
        
        try {
            const matches = await this.matchService.getLiveFeed(zoneId);
            
            // Empty State
            if (!matches.length) { 
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-wind" style="font-size:3rem; margin-bottom:10px; color:#555;"></i>
                        <p>لا توجد مباريات (أو أخبار) حالياً في منطقتك.</p>
                    </div>`; 
                return; 
            }

            // Map Data to HTML
            container.innerHTML = matches.map(m => {
                // Extract Press Data (Headline & Body)
                const headline = m.match_data?.headline || "مباراة قوية في المنطقة";
                const isConfirmed = m.status === 'CONFIRMED';
                const date = Helpers.formatDate(new Date(m.played_at));
                
                // Encode object for Modal interaction
                const matchSafe = encodeURIComponent(JSON.stringify(m));

                return `
                <div class="match-card" onclick="window.openMatchDetails('${matchSafe}')" style="cursor:pointer;">
                    
                    <!-- Press Headline Banner -->
                    <div class="match-headline" style="padding-bottom:10px; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <span style="font-size:0.85rem; color:var(--gold-main); font-weight:bold; line-height:1.4; display:block;">
                            ${isConfirmed ? headline : '🔴 مباراة جارية الآن...'}
                        </span>
                        <div style="font-size:0.65rem; color:var(--text-muted); display:flex; justify-content:space-between; margin-top:5px;">
                            <span>${date}</span>
                            <span>${m.venue?.name || 'ملعب محلي'}</span>
                        </div>
                    </div>

                    <!-- Scoreboard -->
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
                    
                    ${isConfirmed ? 
                        `<div class="match-status status-confirmed">خبر رسمي</div>` : 
                        `<div class="match-status status-pending">في انتظار التوثيق</div>`
                    }
                </div>`;
            }).join('');

            // Global Handler for opening details
            // Defined on window to be accessible from innerHTML onclick
            window.openMatchDetails = (dataStr) => {
                const match = JSON.parse(decodeURIComponent(dataStr));
                this.showMatchReportModal(match);
            };

        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="error-text">فشل تحميل الأخبار.</p>';
        }
    }

    /**
     * Shows the "Match Report" Modal (The Press Article).
     * Displays the full narrative body text generated by NewsEngine.
     */
    showMatchReportModal(match) {
        SoundManager.play('click');
        const modalId = 'modal-match-report';
        
        // Lazy Load Modal DOM
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header">
                            <h3>تقرير المباراة</h3>
                            <button class="close-btn" onclick="document.getElementById('${modalId}').classList.add('hidden')">&times;</button>
                        </div>
                        <div id="match-report-content"></div>
                    </div>
                </div>`);
        }

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        const content = document.getElementById('match-report-content');

        const bodyText = match.match_data?.body || "لا توجد تفاصيل إضافية.";

        content.innerHTML = `
            <div style="text-align:center; margin-bottom:20px;">
                <h2 style="color:var(--gold-main); font-family:var(--font-sport); margin-bottom:10px;">
                    ${match.score_a} - ${match.score_b}
                </h2>
                <div style="font-size:0.9rem; line-height:1.6; color:#fff; background:var(--bg-input); padding:15px; border-radius:12px; border:1px solid #333;">
                    "${bodyText}"
                </div>
            </div>
            
            <div style="text-align:center; font-size:0.8rem; color:var(--text-muted);">
                تم التوثيق رسمياً في سجلات المنطقة.
            </div>
        `;
    }

    /* =========================================================================
       SECTION 2: CREATE MATCH FORM (CAPTAIN ONLY)
       ========================================================================= */

    /**
     * Renders the Match Creation Form.
     * Fetches Opponents and Venues dynamically.
     */
    async renderCreateForm() {
        const container = document.getElementById('arena-content');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';
        
        try {
            const user = state.getUser();
            
            // Parallel Fetch for efficiency
            const [opponents, venues] = await Promise.all([
                this.matchService.getOpponents(user.zoneId, this.myTeamData.id),
                this.matchService.getVenues(user.zoneId)
            ]);

            container.innerHTML = `
                <div class="match-form-box fade-in">
                    <h3 style="color:var(--gold-main); text-align:center;">تسجيل صافرة النهاية</h3>
                    <form id="form-match">
                        
                        <!-- Opponent Selection -->
                        <div class="form-group">
                            <label>الفريق الخصم</label>
                            <select id="inp-opp" required>
                                <option value="" disabled selected>اختر الفريق...</option>
                                ${opponents.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Venue Selection -->
                        <div class="form-group">
                            <label>الملعب</label>
                            <select id="inp-venue" required>
                                <option value="" disabled selected>المكان...</option>
                                ${venues.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Score Input -->
                        <div class="score-inputs">
                            <div class="si-box"><label>نحن</label><input type="number" id="inp-score-my" value="0" min="0"></div>
                            <div class="si-box"><label>هم</label><input type="number" id="inp-score-opp" value="0" min="0"></div>
                        </div>

                        <!-- Lineup Selector (Checkboxes) -->
                        <div class="form-group">
                            <label>التشكيلة الأساسية</label>
                            <div class="roster-grid">
                                ${this.roster.map(p => `
                                    <label class="player-chk">
                                        <input type="checkbox" name="lineup" value="${p.userId}">
                                        <span class="chk-box">${p.name}</span>
                                    </label>`).join('')}
                            </div>
                        </div>

                        <button type="submit" class="btn-primary" id="btn-submit-match">إرسال النتيجة</button>
                    </form>
                </div>`;
            
            // Bind Submit Logic
            document.getElementById('form-match').addEventListener('submit', (e) => this.handleSubmit(e));

        } catch (e) { 
            console.error(e);
            container.innerHTML = `<p class="error-text">فشل تحميل بيانات الفرق. ${e.message}</p>`; 
        }
    }

    /**
     * Logic: Handle Match Submission.
     * Validates input, constructs payload, and calls Service.
     */
    async handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-match');
        btn.disabled = true; 
        btn.textContent = "جاري صياغة الخبر...";
        
        // 1. Get Selected Opponent Name (Needed for News Engine text generation)
        const oppSelect = document.getElementById('inp-opp');
        const oppName = oppSelect.options[oppSelect.selectedIndex].text;

        // 2. Construct Payload
        const payload = {
            creatorId: state.getUser().id,
            myTeamId: this.myTeamData.id,
            myTeamName: this.myTeamData.name, // Passed for news gen
            oppTeamId: oppSelect.value,
            oppTeamName: oppName,             // Passed for news gen
            venueId: parseInt(document.getElementById('inp-venue').value),
            myScore: parseInt(document.getElementById('inp-score-my').value),
            oppScore: parseInt(document.getElementById('inp-score-opp').value),
            lineup: Array.from(document.querySelectorAll('input[name="lineup"]:checked')).map(cb => cb.value),
            scorers: [] // Future: Add scorers selection logic
        };

        // 3. Validation: Minimum 5 players
        if (payload.lineup.length < 5) {
            if(!confirm("لقد اخترت أقل من 5 لاعبين في التشكيلة. هل تريد المتابعة؟")) {
                btn.disabled = false; 
                btn.textContent = "إرسال النتيجة";
                return;
            }
        }

        try {
            // 4. Validate Constraints (Weekly cap, Time buffer)
            await this.matchService.validateMatchConstraints(payload.myTeamId);
            
            // 5. Submit Transaction
            await this.matchService.submitMatch(payload);
            
            SoundManager.play('success');
            alert("تم تسجيل النتيجة! الخبر الآن قيد المراجعة لدى الكابتن الخصم.");
            
            // 6. Refresh Feed & Switch Tab
            this.loadLiveFeed(state.getUser().zoneId);
            this.viewContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.viewContainer.querySelector('[data-tab="feed"]').classList.add('active');

        } catch (err) {
            SoundManager.play('error');
            alert("خطأ: " + err.message);
            btn.disabled = false;
            btn.textContent = "إرسال النتيجة";
        }
    }
}
