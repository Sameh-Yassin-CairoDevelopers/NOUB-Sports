/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/arenaCtrl.js
 * Version: Noub Sports_beta 4.0.0 (EMERGENCY ROOM INTEGRATION)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * The Arena Controller manages the "Live Event" aspects of the platform.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Match Feed: Displays live scores and AI-generated press headlines.
 * 2. Match Creation: Handles the submission of match results by Captains.
 * 3. [NEW] Operations Room: Manages the SOS interface for finding Jokers (Tayyar) 
 *    and Referees via the EmergencyService.
 * 
 * INTEGRATIONS:
 * - MatchService: For standard match data.
 * - EmergencyService: For the SOS marketplace.
 * - TeamService: To determine user role (Captain check).
 * -----------------------------------------------------------------------------
 */

import { MatchService } from '../services/matchService.js';
import { TeamService } from '../services/teamService.js';
import { EmergencyService } from '../services/emergencyService.js'; // [NEW IMPORT]
import { state } from '../core/state.js';
import { Helpers } from '../utils/helpers.js';
import { SoundManager } from '../utils/soundManager.js';

export class ArenaController {
    
    /**
     * Constructor: Initializes all required services.
     */
    constructor() {
        // Standard Services
        this.matchService = new MatchService();
        this.teamService = new TeamService();
        
        // [NEW] Emergency Service for SOS features
        this.emergencyService = new EmergencyService();
        
        this.viewContainer = document.getElementById('view-arena');
        
        // Internal Cache
        this.myTeamData = null;
        this.roster = [];
    }

    /**
     * Main Initialization Logic.
     * Triggered by Router when accessing the Arena Tab.
     */
    async init() {
        console.log("🏟️ ArenaController: Initializing (Press + SOS)...");
        
        const currentUser = state.getUser();
        if (!currentUser) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        // Render Initial Loading State
        this.viewContainer.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';

        try {
            // Fetch Role & Team Data (Parallel Fetching is possible but keeping it serial for logic safety)
            const myTeam = await this.teamService.getMyTeam(currentUser.id);
            const isCaptain = myTeam?.my_role === 'CAPTAIN';

            if (isCaptain) {
                this.myTeamData = myTeam;
                this.roster = await this.teamService.getTeamRoster(myTeam.id);
            }

            // Render the Full Layout (Tabs + SOS Button)
            this.renderLayout(isCaptain);
            
            // Load Default View (Match Feed)
            await this.loadLiveFeed(currentUser.zoneId);

        } catch (err) {
            console.error("Arena Error:", err);
            this.viewContainer.innerHTML = `<div class="error-state">حدث خطأ في تحميل البيانات.</div>`;
        }
    }

    /**
     * Renders the Layout Skeleton.
     * [UPDATE]: Adds the pulsing SOS Button to the header.
     * 
     * @param {boolean} isCaptain - Determines if 'Create Match' tab is shown.
     */
    renderLayout(isCaptain) {
        this.viewContainer.innerHTML = `
            <div class="arena-container fade-in">
                
                <!-- HEADER CONTROLS ROW -->
                <div style="display:flex; gap:10px; margin-bottom:15px; align-items:center;">
                    
                    <!-- Main Tabs -->
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
                    
                    <!-- [NEW] SOS BUTTON (Operations Room Trigger) -->
                    <!-- Styled with a red pulse to indicate urgency -->
                    <button id="btn-sos" style="
                        background: rgba(239, 68, 68, 0.15); 
                        border: 1px solid #ef4444; 
                        color: #ef4444; 
                        border-radius: 12px; 
                        width: 50px; height: 45px;
                        display:flex; justify-content:center; align-items:center;
                        font-size: 1.2rem;
                        cursor: pointer;
                        animation: pulse-red 2s infinite;">
                        <i class="fa-solid fa-tower-broadcast"></i>
                    </button>
                </div>

                <!-- Dynamic Content Area -->
                <div id="arena-content"></div>
            </div>
        `;

        // Bind Tab Switching Logic
        this.viewContainer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                this.viewContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                const tab = e.target.dataset.tab;
                if (tab === 'feed') this.loadLiveFeed(state.getUser().zoneId);
                if (tab === 'create') this.renderCreateForm();
            });
        });

        // Bind SOS Button to Modal
        document.getElementById('btn-sos').onclick = () => {
            SoundManager.play('notify'); // Alert sound
            this.openEmergencyModal();
        };
    }

    /* =========================================================================
       SECTION 1: THE OPERATIONS ROOM (NEW FEATURES)
       ========================================================================= */

    /**
     * Opens the Emergency Room Modal.
     * Handles layout injection and event binding for the SOS marketplace.
     */
    async openEmergencyModal() {
        const modalId = 'modal-emergency';
        const user = state.getUser();

        // 1. Lazy Load Modal DOM
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box" style="background:#1a1c23; border-top:3px solid #ef4444;">
                        
                        <!-- Header -->
                        <div class="modal-header">
                            <h3 style="color:#ef4444; font-family:var(--font-sport);">
                                <i class="fa-solid fa-tower-broadcast"></i> غرفة العمليات
                            </h3>
                            <button class="close-btn" id="btn-close-sos">&times;</button>
                        </div>
                        
                        <!-- Filter Chips -->
                        <div style="display:flex; gap:10px; margin-bottom:20px; overflow-x:auto;">
                            <button class="filter-chip active" style="background:#ef4444; color:#fff; border:none; padding:5px 15px; border-radius:20px; font-size:0.8rem;">الكل</button>
                            <button class="filter-chip" style="background:#333; color:#aaa; border:1px solid #444; padding:5px 15px; border-radius:20px; font-size:0.8rem;">مطلوب طيار</button>
                        </div>

                        <!-- FEED CONTAINER -->
                        <div id="sos-feed" style="min-height:250px; max-height:450px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
                            <div class="loader-bar"></div>
                        </div>

                        <!-- ACTIONS FOOTER -->
                        <div style="margin-top:20px; border-top:1px solid #333; padding-top:15px; display:flex; flex-direction:column; gap:10px;">
                            <div style="display:flex; gap:10px;">
                                <button id="btn-req-joker" class="btn-action-secondary" style="flex:1; border-color:#ef4444; color:#ef4444; justify-content:center;">
                                    <i class="fa-solid fa-user-plus"></i> اطلب "طيار"
                                </button>
                                <button id="btn-req-ref" class="btn-action-secondary" style="flex:1; border-color:#fbbf24; color:#fbbf24; justify-content:center;">
                                    <i class="fa-solid fa-whistle"></i> اطلب حكم
                                </button>
                            </div>
                            <button id="btn-iam-ready" class="btn-primary" style="margin-top:0; background:#222; border:1px solid #444; font-size:0.9rem;">
                                <i class="fa-solid fa-hand-point-up"></i> أنا متاح للعب (طيار)
                            </button>
                        </div>
                    </div>
                </div>
            `);
            
            // Bind Close Event
            document.getElementById('btn-close-sos').onclick = () => {
                document.getElementById(modalId).classList.add('hidden');
            };
            
            // Bind Action Buttons
            document.getElementById('btn-req-joker').onclick = () => this.postRequestFlow('WANTED_JOKER');
            document.getElementById('btn-req-ref').onclick = () => this.postRequestFlow('WANTED_REF');
            document.getElementById('btn-iam-ready').onclick = () => this.postAvailabilityFlow();
        }

        // 2. Show Modal & Load Data
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        this.loadEmergencyFeed(user.zoneId);
    }

    /**
     * Fetches and Renders the Active Requests in the SOS Modal.
     */
    async loadEmergencyFeed(zoneId) {
        const container = document.getElementById('sos-feed');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';

        try {
            const reqs = await this.emergencyService.getActiveRequests(zoneId);
            
            if (reqs.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:30px; color:#666;">
                        <i class="fa-regular fa-circle-check" style="font-size:2rem; margin-bottom:10px;"></i>
                        <p>لا توجد طلبات نشطة حالياً. الأمور هادئة.</p>
                    </div>`;
                return;
            }

            container.innerHTML = reqs.map(r => {
                // Formatting Logic
                const isJoker = r.type === 'WANTED_JOKER';
                const isRef = r.type === 'WANTED_REF';
                const isAvailable = r.type === 'I_AM_AVAILABLE';
                
                let icon = isJoker ? 'fa-jet-fighter' : (isRef ? 'fa-scale-balanced' : 'fa-hand');
                let color = isJoker ? '#ef4444' : (isRef ? '#fbbf24' : '#10b981');
                let title = isJoker ? 'مطلوب طيار فوراً' : (isRef ? 'مطلوب حكم ساحة' : 'كابتن متاح للعب');
                
                // Timestamp
                const time = new Date(r.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'});

                return `
                <div class="notif-card" style="border-right:4px solid ${color}; background:rgba(255,255,255,0.02);">
                    <div class="notif-info">
                        <div class="notif-icon" style="color:${color}; background:rgba(255,255,255,0.05);">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                        <div class="notif-text">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <h4 style="color:#fff; font-size:0.9rem;">${title}</h4>
                                <span class="text-muted" style="font-size:0.65rem;">${time}</span>
                            </div>
                            
                            ${!isAvailable ? `
                                <p style="font-size:0.8rem; color:#aaa; margin-top:5px;">
                                    <i class="fa-solid fa-clock"></i> ${new Date(r.match_time).toLocaleString('ar-EG')} <br>
                                    <i class="fa-solid fa-location-dot"></i> ${r.venue_name}
                                </p>
                                <div style="font-size:0.8rem; color:#fff; margin-top:5px; background:rgba(0,0,0,0.3); padding:5px; border-radius:5px;">
                                    <i class="fa-solid fa-users"></i> ${r.details.teams}
                                </div>
                            ` : `
                                <p style="font-size:0.9rem; margin-top:5px;">
                                    الكابتن <span style="color:${color}; font-weight:bold;">${r.requester.username}</span> 
                                    متاح في مركز (${r.details.position})
                                </p>
                            `}
                        </div>
                    </div>
                    
                    <!-- Action Button -->
                    ${state.getUser().id !== r.requester.id ? `
                        <button class="btn-accept" onclick="window.acceptSOS('${r.id}')" style="width:100%; margin-top:10px; background:${color}; color:#000; font-weight:bold;">
                            ${isAvailable ? 'استدعاء للكابتن' : 'أنا جاهز للمهمة'}
                        </button>
                    ` : '<div style="text-align:center; font-size:0.7rem; color:#666; margin-top:5px;">هذا طلبك</div>'}
                </div>`;
            }).join('');

            // Global Handler Binding (For dynamic elements)
            window.acceptSOS = async (reqId) => {
                if(!confirm("هل أنت متأكد من القبول؟ هذا التزام أخلاقي بالحضور.")) return;
                try {
                    await this.emergencyService.acceptRequest(reqId, state.getUser().id);
                    SoundManager.play('success');
                    alert("تم قبول المهمة بنجاح! تم إغلاق الطلب وتعيينك.");
                    this.loadEmergencyFeed(zoneId); // Refresh list
                } catch(e) { 
                    SoundManager.play('error');
                    alert(e.message); 
                }
            };

        } catch (e) {
            console.error(e);
            container.innerHTML = `<p class="error-text">فشل تحميل البيانات.</p>`;
        }
    }

    /**
     * Logic: Handling the "Post Request" Flow.
     * Prompts user for details and calls Service.
     */
    async postRequestFlow(type) {
        // Simple prompt-based input for MVP speed (Can be upgraded to Modal Form later)
        const venue = prompt("اسم الملعب؟");
        if(!venue) return;
        
        const timeInput = prompt("موعد المباراة؟ (مثال: 9:00 مساءً)");
        if(!timeInput) return;

        const teams = prompt("أطراف المباراة؟ (مثال: الصقور vs النجوم)");
        
        // Construct Request Object
        // Note: Using current date + input time is a simplification. 
        // In full prod, use a datetime picker. Here we assume generic ISO for validation.
        const reqData = {
            venue: venue,
            time: new Date().toISOString(), 
            teams: teams || "مباراة قوية",
            position: type === 'WANTED_JOKER' ? prompt("المركز المطلوب؟ (حارس، دفاع..)") : 'REF',
            note: `${timeInput}` // Store raw time string in notes for display
        };
        
        try {
            await this.emergencyService.postRequest(state.getUser().id, state.getUser().zoneId, type, reqData);
            SoundManager.play('success');
            alert("تم نشر الطلب في غرفة العمليات!");
            this.loadEmergencyFeed(state.getUser().zoneId);
        } catch(e) { 
            SoundManager.play('error');
            alert(e.message); 
        }
    }

    /**
     * Logic: Handling "I am Available" Flow.
     */
    async postAvailabilityFlow() {
        const pos = prompt("ما هو مركزك المفضل؟");
        if(!pos) return;
        
        try {
            await this.emergencyService.postAvailability(state.getUser().id, state.getUser().zoneId, pos);
            SoundManager.play('success');
            alert("تم تسجيل حالتك! ستظهر الآن للكباتن.");
            this.loadEmergencyFeed(state.getUser().zoneId);
        } catch(e) { 
            SoundManager.play('error');
            alert(e.message); 
        }
    }

    /* =========================================================================
       SECTION 2: STANDARD MATCH FEED (PRESS ENGINE)
       ========================================================================= */

    /**
     * Loads the standard Match Feed (Arena Tab).
     * Renders Match Cards with AI-Generated Headlines.
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
                        <p>لا توجد مباريات (أو أخبار) حالياً.</p>
                    </div>`; 
                return; 
            }

            container.innerHTML = matches.map(m => {
                // Extract Press Data from JSONB
                const headline = m.match_data?.headline || "مباراة قوية في المنطقة";
                const isConfirmed = m.status === 'CONFIRMED';
                const date = Helpers.formatDate(new Date(m.played_at));
                
                // Encoding for Modal
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

            // Global Details Handler
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
     * Renders the "Match Report" Modal (The Press Article).
     */
    showMatchReportModal(match) {
        SoundManager.play('click');
        const modalId = 'modal-match-report';
        
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header"><h3>تقرير المباراة</h3><button class="close-btn" onclick="document.getElementById('${modalId}').classList.add('hidden')">&times;</button></div>
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
       SECTION 3: CREATE MATCH FORM (CAPTAIN ONLY)
       ========================================================================= */

    async renderCreateForm() {
        const container = document.getElementById('arena-content');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';
        
        try {
            const user = state.getUser();
            const [opponents, venues] = await Promise.all([
                this.matchService.getOpponents(user.zoneId, this.myTeamData.id),
                this.matchService.getVenues(user.zoneId)
            ]);

            container.innerHTML = `
                <div class="match-form-box fade-in">
                    <h3 style="color:var(--gold-main); text-align:center;">تسجيل صافرة النهاية</h3>
                    <form id="form-match">
                        <div class="form-group">
                            <label>الفريق الخصم</label>
                            <select id="inp-opp" required>
                                <option value="" disabled selected>اختر...</option>
                                ${opponents.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>الملعب</label>
                            <select id="inp-venue" required>
                                <option value="" disabled selected>المكان...</option>
                                ${venues.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="score-inputs">
                            <div class="si-box"><label>نحن</label><input type="number" id="inp-score-my" value="0" min="0"></div>
                            <div class="si-box"><label>هم</label><input type="number" id="inp-score-opp" value="0" min="0"></div>
                        </div>
                        <div class="form-group">
                            <label>التشكيلة الأساسية</label>
                            <div class="roster-grid">
                                ${this.roster.map(p => `<label class="player-chk"><input type="checkbox" name="lineup" value="${p.userId}"><span class="chk-box">${p.name}</span></label>`).join('')}
                            </div>
                        </div>
                        <button type="submit" class="btn-primary" id="btn-submit-match">إرسال النتيجة</button>
                    </form>
                </div>`;
            
            document.getElementById('form-match').addEventListener('submit', (e) => this.handleSubmit(e));
        } catch (e) { container.innerHTML = `<p class="error-text">${e.message}</p>`; }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-match');
        btn.disabled = true; btn.textContent = "جاري صياغة الخبر...";
        
        const oppSelect = document.getElementById('inp-opp');
        const oppName = oppSelect.options[oppSelect.selectedIndex].text;

        const payload = {
            creatorId: state.getUser().id,
            myTeamId: this.myTeamData.id,
            myTeamName: this.myTeamData.name,
            oppTeamId: oppSelect.value,
            oppTeamName: oppName,
            venueId: parseInt(document.getElementById('inp-venue').value),
            myScore: parseInt(document.getElementById('inp-score-my').value),
            oppScore: parseInt(document.getElementById('inp-score-opp').value),
            lineup: Array.from(document.querySelectorAll('input[name="lineup"]:checked')).map(cb => cb.value),
            scorers: []
        };

        if (payload.lineup.length < 5) {
            if(!confirm("أقل من 5 لاعبين. متابعة؟")) { btn.disabled = false; return; }
        }

        try {
            await this.matchService.validateMatchConstraints(payload.myTeamId);
            await this.matchService.submitMatch(payload);
            
            SoundManager.play('success');
            alert("تم تسجيل النتيجة! الخبر الآن قيد المراجعة.");
            this.loadLiveFeed(state.getUser().zoneId);
            
            // Reset Tab
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
