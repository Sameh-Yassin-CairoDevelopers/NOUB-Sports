/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/teamCtrl.js
 * Version: Noub Sports_beta 0.0.1 (MASTER COMPREHENSIVE)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW (نظرة معمارية):
 * -----------------------------------------------------------------------------
 * This controller acts as the central logic unit for the "Community Module".
 * It bridges the gap between the UI (View) and the Data Layer (TeamService).
 * 
 * CORE RESPONSIBILITIES (المسؤوليات الأساسية):
 * 1. State Resolution: 
 *    - Detects if the user is a "Free Agent" (No Team).
 *    - Detects if the user is a "Member" or "Captain".
 * 
 * 2. View Rendering:
 *    - Renders "Creation Form" for free agents.
 *    - Renders "Team Dashboard" for members.
 *    - Renders "Roster List" with dynamic roles.
 * 
 * 3. Administrative Actions (Captain Only):
 *    - Promote Member to Vice Captain.
 *    - Kick Member from Team.
 *    - Generate Invite Links.
 * 
 * 4. Deep Linking:
 *    - Parses URL parameters to handle "Join via Link" scenarios.
 * -----------------------------------------------------------------------------
 */

import { TeamService } from '../services/teamService.js';
import { state } from '../core/state.js'; // Singleton State Store
import { AvatarEngine } from '../utils/avatarEngine.js'; // For rendering member visuals

export class TeamController {
    
    /**
     * Constructor: Initializes dependencies and binds the view container.
     * Also triggers the deep-link check immediately upon instantiation.
     */
    constructor() {
        // 1. Initialize Service Layer
        this.teamService = new TeamService();
        
        // 2. Bind View Container (DOM Element)
        this.viewContainer = document.getElementById('view-team');
        
        // 3. Internal UI State for Management Mode (Toggle)
        this.isManageMode = false; 
        
        // 4. Check for Deep Links (Invites)
        this.checkInviteParam();
    }

    /**
     * Main Initialization Logic.
     * Called by AppClass every time the 'Team' tab is clicked.
     * Ensures fresh data is loaded from the server (Supabase).
     */
    async init() {
        console.log("🛡️ TeamController: Initializing & Refreshing Data...");
        
        // 1. Auth Guard: Ensure user is logged in via Singleton State
        const currentUser = state.getUser();
        
        if (!currentUser) {
            console.warn("⚠️ TeamCtrl: User session missing.");
            this.renderLoginRequired();
            return;
        }

        // 2. Show Loading State to User
        this.setLoading(true);

        try {
            // 3. Fetch Team Data from Service
            // This returns null if user has no team, or the Team Object if they do.
            const myTeam = await this.teamService.getMyTeam(currentUser.id);

            if (myTeam) {
                // Scenario A: User IS a member of a team
                console.log(`✅ User is Member of: ${myTeam.name} (Role: ${myTeam.my_role})`);
                
                // Reset management mode on fresh load
                this.isManageMode = false; 
                
                // Render the Dashboard UI
                this.renderTeamDashboard(myTeam);
                
                // Load roster list asynchronously (to speed up initial render)
                this.loadRoster(myTeam.id);
                
            } else {
                // Scenario B: User is a FREE AGENT
                console.log("ℹ️ User is Free Agent -> Show Create Form");
                this.renderFreeAgentView();
            }

        } catch (err) {
            console.error("TeamCtrl Init Error:", err);
            this.renderErrorState();
        }
    }

    /* =========================================================================
       SECTION 1: FREE AGENT VIEW (CREATION)
       ========================================================================= */

    /**
     * Renders the "Free Agent" interface.
     * Options: Create a new Team OR Go to Scout to find one.
     */
    renderFreeAgentView() {
        this.viewContainer.innerHTML = `
            <div class="team-creation-box fade-in">
                <div class="empty-state-icon">
                    <i class="fa-solid fa-flag-checkered"></i>
                </div>
                <h3>التحق بكيان رياضي</h3>
                <p>يمكنك تأسيس فريقك الخاص وقيادته، أو البحث عن فريق للانضمام إليه.</p>

                <!-- Creation Form -->
                <form id="form-create-team" style="margin-top:20px;">
                    <div class="form-group">
                        <label>اسم الفريق الجديد</label>
                        <input type="text" id="inp-team-name" placeholder="مثال: صقور الفسطاط" required minlength="3" maxlength="20">
                    </div>

                    <div class="form-group">
                        <label>ألوان الفريق (الشعار)</label>
                        <div class="color-picker-row">
                            <input type="color" id="inp-team-color1" value="#D4AF37" title="اللون الأساسي">
                            <input type="color" id="inp-team-color2" value="#000000" title="اللون الثانوي">
                        </div>
                    </div>

                    <button type="submit" class="btn-primary" id="btn-create-team">
                        <i class="fa-solid fa-plus-circle"></i> تأسيس فريق
                    </button>
                </form>

                <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:20px 0;">
                
                <!-- Scout Link -->
                <button class="btn-action-secondary" style="width:100%; justify-content:center;" onclick="window.router('view-scout')">
                    <i class="fa-solid fa-search"></i> البحث عن فرق في الكشاف
                </button>
            </div>
        `;

        // Bind Submit Event
        document.getElementById('form-create-team').addEventListener('submit', (e) => this.handleCreate(e));
    }

    /**
     * LOGIC: Handles Team Creation Transaction.
     * Validates name uniqueness before creating.
     */
    async handleCreate(e) {
        e.preventDefault();
        
        const btn = document.getElementById('btn-create-team');
        const nameInput = document.getElementById('inp-team-name');
        const c1Input = document.getElementById('inp-team-color1');
        const c2Input = document.getElementById('inp-team-color2');
        
        const name = nameInput.value.trim();
        const logoDna = { primary: c1Input.value, secondary: c2Input.value };
        
        // UI Feedback: Lock button
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> جاري التوثيق...';

        try {
            const user = state.getUser();
            
            // 1. Check Name Uniqueness
            const exists = await this.teamService.checkNameAvailability(name, user.zoneId);
            if (exists) throw new Error("عذراً، هذا الاسم مستخدم بالفعل في منطقتك.");

            // 2. Execute Creation Service
            await this.teamService.createTeam(user.id, name, user.zoneId, logoDna);

            alert("تم تأسيس الفريق بنجاح!");
            
            // 3. Reload to show Dashboard
            this.init(); 

        } catch (err) {
            alert("خطأ: " + err.message);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    /* =========================================================================
       SECTION 2: DASHBOARD VIEW (MEMBERS)
       ========================================================================= */

    /**
     * Renders the Team Dashboard.
     * Adapts based on Role (Captain vs Member) and Status (Draft vs Active).
     */
    renderTeamDashboard(team) {
        const isDraft = team.status === 'DRAFT';
        const isCaptain = team.my_role === 'CAPTAIN';
        const isManageActive = this.isManageMode;

        this.viewContainer.innerHTML = `
            <div class="team-dashboard fade-in">
                
                <!-- A. Team Header Card -->
                <div class="team-header-card" style="background: linear-gradient(135deg, ${team.logo_dna.primary}, ${team.logo_dna.secondary});">
                    <div class="team-logo-circle">
                        <i class="fa-solid fa-shield-cat"></i>
                    </div>
                    <h2>${team.name}</h2>
                    <span class="status-badge ${isDraft ? 'warning' : 'success'}">
                        ${isDraft ? 'تحت التأسيس (DRAFT)' : 'فريق جاهز (ACTIVE)'}
                    </span>
                </div>

                <!-- B. Stats Summary -->
                <div class="team-stats-row">
                    <div class="t-stat">
                        <span class="val">${team.total_matches || 0}</span>
                        <span class="lbl">مباريات</span>
                    </div>
                    <div class="t-stat">
                        <span class="val">--</span>
                        <span class="lbl">فوز</span>
                    </div>
                    <div class="t-stat">
                        <span class="val">#--</span>
                        <span class="lbl">ترتيب</span>
                    </div>
                </div>

                <!-- C. Action Buttons (Role Based) -->
                <div class="team-actions-grid">
                    ${isCaptain ? `
                        <!-- CAPTAIN CONTROLS -->
                        <button class="action-card" id="btn-invite">
                            <i class="fa-solid fa-link text-gold"></i>
                            <span>نسخ رابط الدعوة</span>
                        </button>
                        
                        <button class="action-card" id="btn-manage" style="${isManageActive ? 'border-color:var(--danger); color:var(--danger);' : ''}">
                            <i class="fa-solid fa-users-gear"></i>
                            <span>${isManageActive ? 'إنهاء الإدارة' : 'إدارة الأعضاء'}</span>
                        </button>
                    ` : `
                        <!-- MEMBER CONTROLS -->
                        <button class="action-card danger" id="btn-leave">
                            <i class="fa-solid fa-door-open"></i>
                            <span>مغادرة الفريق</span>
                        </button>
                    `}
                </div>

                <!-- D. Roster List Container -->
                <div class="roster-section">
                    <h4 style="display:flex; justify-content:space-between; align-items:center;">
                        قائمة اللاعبين
                        ${isManageActive ? '<span style="font-size:0.7rem; color:var(--danger);">وضع الإدارة نشط</span>' : ''}
                    </h4>
                    <div id="roster-list-container">
                        <div class="loader-bar" style="margin:20px auto;"></div>
                    </div>
                </div>
            </div>
        `;

        // Bind Dynamic Events
        if (isCaptain) {
            document.getElementById('btn-invite').addEventListener('click', () => this.copyInviteLink(team.id));
            
            document.getElementById('btn-manage').addEventListener('click', () => {
                // Toggle Management Mode State
                this.isManageMode = !this.isManageMode;
                // Re-render Dashboard to update button style
                this.renderTeamDashboard(team);
                // Reload Roster to show/hide action icons
                this.loadRoster(team.id);
            });
        } else {
            document.getElementById('btn-leave').addEventListener('click', () => this.handleLeave(team.id));
        }
    }

    /* =========================================================================
       SECTION 3: ROSTER LOGIC & MANAGEMENT
       ========================================================================= */

    /**
     * Fetches and Renders the Roster List.
     * Includes logic for "Management Mode" (Kick/Promote buttons) if active.
     */
    async loadRoster(teamId) {
        const container = document.getElementById('roster-list-container');
        if (!container) return;

        try {
            const members = await this.teamService.getTeamRoster(teamId);
            
            if (members.length === 0) {
                container.innerHTML = '<p class="text-muted text-center">القائمة فارغة.</p>';
                return;
            }

            container.innerHTML = members.map(m => {
                // Permissions Logic: Can I edit this member?
                const isMe = m.userId === state.getUser().id;
                const isTargetCaptain = m.role === 'CAPTAIN';
                const showActions = this.isManageMode && !isMe && !isTargetCaptain;

                return `
                    <div class="member-card">
                        <!-- Avatar -->
                        <div class="member-avatar">
                            <i class="fa-solid fa-user" style="color:${this.getSkinColor(m.visual?.skin)}"></i>
                        </div>
                        
                        <!-- Info -->
                        <div class="member-info">
                            <div class="member-name">
                                ${m.name} 
                                ${m.role === 'CAPTAIN' ? '<i class="fa-solid fa-crown text-gold" title="كابتن"></i>' : ''}
                                ${m.role === 'VICE' ? '<i class="fa-solid fa-star text-gold" title="نائب"></i>' : ''}
                                ${m.role === 'GK' ? '<i class="fa-solid fa-hands-holding-circle" title="حارس"></i>' : ''}
                            </div>
                            <div class="member-pos">${m.position} | ${m.rating}</div>
                        </div>
                        
                        <!-- Management Actions (Conditional) -->
                        ${showActions ? `
                            <div class="manage-actions" style="display:flex; gap:10px;">
                                ${m.role !== 'VICE' ? `
                                <button class="btn-icon promote" data-id="${m.userId}" title="ترقية لنائب" style="background:none; border:none; cursor:pointer;">
                                    <i class="fa-solid fa-arrow-up text-gold"></i>
                                </button>` : ''}
                                
                                <button class="btn-icon kick" data-id="${m.userId}" title="طرد" style="background:none; border:none; cursor:pointer;">
                                    <i class="fa-solid fa-user-xmark text-danger"></i>
                                </button>
                            </div>
                        ` : `
                            <div class="member-rep">
                                ${m.reputation}% <i class="fa-solid fa-star text-gold"></i>
                            </div>
                        `}
                    </div>
                `;
            }).join('');

            // Bind Management Buttons (if mode is active)
            if (this.isManageMode) {
                container.querySelectorAll('.promote').forEach(btn => {
                    btn.addEventListener('click', () => this.handlePromote(teamId, btn.dataset.id));
                });
                container.querySelectorAll('.kick').forEach(btn => {
                    btn.addEventListener('click', () => this.handleKick(teamId, btn.dataset.id));
                });
            }

        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="error-text">فشل تحميل القائمة.</p>';
        }
    }

    /**
     * ACTION: Promote Member to Vice Captain
     */
    async handlePromote(teamId, memberId) {
        if(!confirm("هل أنت متأكد من ترقية هذا اللاعب ليكون نائباً للكابتن؟")) return;
        
        try {
            await this.teamService.promoteMember(state.getUser().id, teamId, memberId);
            alert("تمت الترقية بنجاح.");
            this.loadRoster(teamId); // Refresh List Only
        } catch (e) {
            alert(e.message);
        }
    }

    /**
     * ACTION: Kick Member
     */
    async handleKick(teamId, memberId) {
        if(!confirm("تحذير: هل تريد طرد هذا اللاعب من الفريق؟")) return;

        try {
            await this.teamService.kickMember(state.getUser().id, teamId, memberId);
            alert("تم طرد اللاعب.");
            this.loadRoster(teamId); // Refresh List Only
        } catch (e) {
            alert(e.message);
        }
    }

    /**
     * ACTION: Leave Team (Self)
     */
    async handleLeave(teamId) {
        if (!confirm("هل أنت متأكد من مغادرة الفريق؟ ستفقد تاريخك.")) return;
        
        try {
            await this.teamService.leaveTeam(state.getUser().id, teamId);
            alert("تمت المغادرة.");
            window.location.reload();
        } catch (e) {
            alert(e.message);
        }
    }

    /* =========================================================================
       SECTION 4: HELPERS & UTILS
       ========================================================================= */

    /**
     * LOGIC: Check for Invite Link on Startup
     * Handles ?start=join_TEAMID
     */
    async checkInviteParam() {
        const tgParams = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        
        if (tgParams && tgParams.startsWith('join_')) {
            const teamId = tgParams.split('_')[1];
            const currentUser = state.getUser();
            
            if (currentUser) {
                if (confirm("لقد تمت دعوتك للانضمام لهذا الفريق. هل تقبل؟")) {
                    try {
                        await this.teamService.joinTeam(currentUser.id, teamId);
                        alert("تم الانضمام بنجاح!");
                        window.location.reload();
                    } catch (e) {
                        alert("فشل الانضمام: " + e.message);
                    }
                }
            }
        }
    }

    /**
     * Helper: Copy Invite Link to Clipboard
     */
    copyInviteLink(teamId) {
        const botName = 'NoubSportsBot'; // Replace with your Bot Username
        const link = `https://t.me/${botName}?start=join_${teamId}`;
        
        navigator.clipboard.writeText(link).then(() => {
            alert("تم نسخ رابط الدعوة! أرسله لأصدقائك.");
        }).catch(() => {
            alert("فشل النسخ. الرابط هو: " + link);
        });
    }

    /**
     * Helper: Toggle Loading Spinner in View
     */
    setLoading(isLoading) {
        if (isLoading) {
            this.viewContainer.innerHTML = '<div style="text-align:center; padding:50px;"><div class="loader-bar"></div></div>';
        }
    }

    /**
     * Helper: Render Error State
     */
    renderLoginRequired() {
        this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول للوصول إلى الفريق.</div>`;
    }

    renderErrorState() {
        this.viewContainer.innerHTML = `<div class="error-state">حدث خطأ في تحميل البيانات.</div>`;
    }

    /**
     * Helper: Map Skin ID to Color
     */
    getSkinColor(id) {
        const colors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        return colors[id] || '#ccc';
    }
}
