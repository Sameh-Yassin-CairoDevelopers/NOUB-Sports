/*
 * Filename: js/controllers/teamCtrl.js
 * Version: 4.2.0 (Diamond Release)
 * Description: Controller for the Team Management Module.
 * 
 * CORE RESPONSIBILITIES:
 * 1. State Resolution: Determines if the user is a Free Agent or a Team Member.
 * 2. View Rendering: Swaps between "Create Team Form" and "Team Dashboard".
 * 3. Roster Management: Fetches and displays team members asynchronously.
 * 4. Deep Linking: Handles incoming invite links (start_param) to join teams.
 */

import { TeamService } from '../services/teamService.js';
import { state } from '../core/state.js'; // Singleton State Import (CRITICAL FIX)
import { AvatarEngine } from '../utils/avatarEngine.js'; // For rendering member visuals

export class TeamController {
    
    /**
     * Constructor: Initializes dependencies and view references.
     * Starts checking for invite links immediately.
     */
    constructor() {
        this.teamService = new TeamService();
        this.viewContainer = document.getElementById('view-team');
        
        // Auto-check for invite links on load
        this.checkInviteParam();
    }

    /**
     * Main Initialization Logic.
     * Called by AppClass when the Team tab is clicked.
     */
    async init() {
        console.log("🛡️ TeamController: Refreshing View...");
        
        // 1. Get User from Global State (Singleton)
        const currentUser = state.getUser();
        
        if (!currentUser) {
            console.warn("⚠️ TeamCtrl: User session invalid.");
            this.viewContainer.innerHTML = `<div class="error-state">جلسة المستخدم غير صالحة. يرجى إعادة التحميل.</div>`;
            return;
        }

        // 2. Show Loading State
        this.setLoading(true);

        try {
            // 3. Fetch Team Status from DB
            const myTeam = await this.teamService.getMyTeam(currentUser.id);

            if (myTeam) {
                // Scenario A: User is in a team -> Render Dashboard
                console.log(`✅ Member of Team: ${myTeam.name}`);
                this.renderTeamDashboard(myTeam);
                this.loadRoster(myTeam.id);
            } else {
                // Scenario B: User is free -> Render Create Form
                console.log("ℹ️ Free Agent -> Create Mode");
                this.renderCreateForm();
            }

        } catch (err) {
            console.error("TeamCtrl Error:", err);
            this.viewContainer.innerHTML = `<div class="error-state">خطأ في الاتصال بالسيرفر. حاول لاحقاً.</div>`;
        }
    }

    /**
     * VIEW: Renders the "Create Team" Form.
     */
    renderCreateForm() {
        this.viewContainer.innerHTML = `
            <div class="team-creation-box fade-in">
                <div class="empty-state-icon">
                    <i class="fa-solid fa-flag-checkered"></i>
                </div>
                <h3>أسس فريقك الخاص</h3>
                <p>كن الكابتن، واجمع 5 لاعبين، وابدأ المنافسة في منطقتك.</p>

                <form id="form-create-team">
                    <div class="form-group">
                        <label>اسم الفريق</label>
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
                        <i class="fa-solid fa-plus-circle"></i> إنشاء الكيان
                    </button>
                </form>
            </div>
        `;

        // Bind Submit
        document.getElementById('form-create-team').addEventListener('submit', (e) => this.handleCreate(e));
    }

    /**
     * LOGIC: Handles Team Creation
     */
    async handleCreate(e) {
        e.preventDefault();
        
        const btn = document.getElementById('btn-create-team');
        const name = document.getElementById('inp-team-name').value.trim();
        const c1 = document.getElementById('inp-team-color1').value;
        const c2 = document.getElementById('inp-team-color2').value;
        
        btn.disabled = true;
        btn.textContent = "جاري التوثيق...";

        try {
            const user = state.getUser();
            
            // 1. Validate Name Uniqueness in Zone
            const exists = await this.teamService.checkNameAvailability(name, user.zoneId);
            if (exists) {
                throw new Error("عذراً، هذا الاسم مستخدم بالفعل في منطقتك.");
            }
            
            // 2. Execute Creation
            await this.teamService.createTeam(user.id, name, user.zoneId, { primary: c1, secondary: c2 });
            
            alert("تم إنشاء الفريق بنجاح!");
            
            // 3. Refresh View
            this.init(); 

        } catch (err) {
            alert("خطأ: " + err.message);
            btn.disabled = false;
            btn.textContent = "إنشاء الكيان";
        }
    }

    /**
     * VIEW: Renders the Team Dashboard (Header + Stats + Actions).
     * @param {Object} team - Team Data Object
     */
    renderTeamDashboard(team) {
        const isDraft = team.status === 'DRAFT';
        
        this.viewContainer.innerHTML = `
            <div class="team-dashboard fade-in">
                
                <!-- Header Card -->
                <div class="team-header-card" style="background: linear-gradient(135deg, ${team.logo_dna.primary}, ${team.logo_dna.secondary});">
                    <div class="team-logo-circle">
                        <i class="fa-solid fa-shield-cat"></i>
                    </div>
                    <h2>${team.name}</h2>
                    <span class="status-badge ${isDraft ? 'warning' : 'success'}">
                        ${isDraft ? 'تحت التأسيس (DRAFT)' : 'فريق جاهز (ACTIVE)'}
                    </span>
                </div>
                
                <!-- Stats Row -->
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

                <!-- Action Buttons (Role Based) -->
                <div class="team-actions-grid">
                    ${team.my_role === 'CAPTAIN' ? `
                        <button class="action-card" id="btn-invite">
                            <i class="fa-solid fa-user-plus text-gold"></i>
                            <span>دعوة لاعب</span>
                        </button>
                        <button class="action-card" onclick="alert('لوحة الإدارة: قريباً')">
                            <i class="fa-solid fa-cog"></i>
                            <span>إدارة</span>
                        </button>
                    ` : `
                        <button class="action-card danger" id="btn-leave">
                            <i class="fa-solid fa-door-open"></i>
                            <span>مغادرة</span>
                        </button>
                    `}
                </div>

                <!-- Roster Section -->
                <div class="roster-section">
                    <h4>قائمة اللاعبين</h4>
                    <div id="roster-list-container">
                        <div class="loader-bar" style="margin:20px auto;"></div>
                    </div>
                </div>
            </div>
        `;

        // Bind Actions
        if (team.my_role === 'CAPTAIN') {
            document.getElementById('btn-invite').addEventListener('click', () => this.copyInviteLink(team.id));
        } else {
            document.getElementById('btn-leave').addEventListener('click', () => this.handleLeave(team.id));
        }
    }

    /**
     * LOGIC: Fetches and Renders the Roster List
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

            container.innerHTML = members.map(m => `
                <div class="member-card">
                    <div class="member-avatar">
                        <i class="fa-solid fa-user" style="color:${this.getSkinColor(m.visual?.skin)}"></i>
                    </div>
                    <div class="member-info">
                        <div class="member-name">
                            ${m.name} 
                            ${m.role === 'CAPTAIN' ? '<i class="fa-solid fa-crown text-gold"></i>' : ''}
                            ${m.role === 'GK' ? '<i class="fa-solid fa-hands-holding-circle"></i>' : ''}
                        </div>
                        <div class="member-pos">${m.position} | ${m.rating}</div>
                    </div>
                    <div class="member-rep">
                        ${m.reputation}% <i class="fa-solid fa-star text-gold"></i>
                    </div>
                </div>
            `).join('');

        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="error-text">فشل تحميل القائمة.</p>';
        }
    }

    /**
     * Helper: Maps Skin ID to Hex Color (Visual consistency)
     */
    getSkinColor(id) {
        const colors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        return colors[id] || '#ccc';
    }

    /**
     * LOGIC: Leave Team
     */
    async handleLeave(teamId) {
        if (!confirm("هل أنت متأكد من مغادرة الفريق؟ ستفقد تاريخك معه.")) return;
        
        try {
            await this.teamService.leaveTeam(state.getUser().id, teamId);
            alert("تمت المغادرة بنجاح.");
            window.location.reload();
        } catch (e) {
            alert(e.message);
        }
    }

    /**
     * LOGIC: Handle Deep Linking (Join via URL)
     */
    async checkInviteParam() {
        const tgParams = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        
        if (tgParams && tgParams.startsWith('join_')) {
            const teamId = tgParams.split('_')[1];
            const currentUser = state.getUser();
            
            // Only join if user exists and confirms
            if (currentUser && confirm("لقد تمت دعوتك للانضمام لهذا الفريق. هل تقبل؟")) {
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

    /**
     * LOGIC: Copy Invite Link
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
     * Helper: Toggle Loading Spinner
     */
    setLoading(isLoading) {
        if (isLoading) {
            this.viewContainer.innerHTML = '<div style="text-align:center; padding:50px;"><div class="loader-bar"></div></div>';
        }
    }
}
