/*
 * Filename: js/controllers/teamCtrl.js
 * Version: 5.5.0 (MASTER FULL)
 * Description: Controller for the Team Management Module.
 * 
 * RESPONSIBILITIES:
 * 1. State Resolution: Determines if user is Captain, Member, or Free Agent.
 * 2. View Rendering: Renders Dashboard (for members) or Creation Form (for free agents).
 * 3. Roster Management: Fetches and displays the team list with roles.
 * 4. Deep Linking: Handles 'Join via Link' logic on initialization.
 */

import { TeamService } from '../services/teamService.js';
import { state } from '../core/state.js'; // Singleton State
import { AvatarEngine } from '../utils/avatarEngine.js'; // For rendering member visuals

export class TeamController {
    
    /**
     * Constructor: Initializes dependencies and binds the view container.
     */
    constructor() {
        this.teamService = new TeamService();
        this.viewContainer = document.getElementById('view-team');
        
        // Check for invite links immediately upon load
        this.checkInviteParam();
    }

    /**
     * Main Init Logic: Called when tab is clicked.
     * Determines which view to show based on user's team status.
     */
    async init() {
        console.log("🛡️ TeamController: Refreshing View...");
        
        const currentUser = state.getUser();
        if (!currentUser) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول للوصول إلى الفريق.</div>`;
            return;
        }

        this.setLoading(true);

        try {
            // 1. Fetch Team Data from Service
            const myTeam = await this.teamService.getMyTeam(currentUser.id);

            if (myTeam) {
                // Scenario A: User HAS a team -> Render Dashboard
                console.log(`✅ Member of Team: ${myTeam.name}`);
                this.renderTeamDashboard(myTeam);
                // Load roster asynchronously
                this.loadRoster(myTeam.id);
            } else {
                // Scenario B: User is FREE -> Render Create/Join View
                console.log("ℹ️ User is Free Agent -> Show Create Form");
                this.renderFreeAgentView();
            }

        } catch (err) {
            console.error("TeamCtrl Init Error:", err);
            this.viewContainer.innerHTML = `<div class="error-state">حدث خطأ في تحميل بيانات الفريق.</div>`;
        }
    }

    /**
     * VIEW 1: Free Agent View (Create New Team)
     * Displays form to create a team AND button to go to Scout.
     */
    renderFreeAgentView() {
        this.viewContainer.innerHTML = `
            <div class="team-creation-box fade-in">
                <div class="empty-state-icon">
                    <i class="fa-solid fa-flag-checkered"></i>
                </div>
                <h3>التحق بكيان رياضي</h3>
                <p>يمكنك تأسيس فريقك الخاص وقيادته، أو البحث عن فريق للانضمام إليه.</p>

                <!-- Create Form -->
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
                
                <button class="btn-action-secondary" style="width:100%; justify-content:center;" onclick="window.router('view-scout')">
                    <i class="fa-solid fa-search"></i> البحث عن فرق في الكشاف
                </button>
            </div>
        `;

        // Bind Submit Event
        document.getElementById('form-create-team').addEventListener('submit', (e) => this.handleCreate(e));
    }

    /**
     * VIEW 2: Team Dashboard (For Members/Captains)
     * Shows Team Header, Stats, Actions, and Roster Placeholder.
     */
    renderTeamDashboard(team) {
        const isDraft = team.status === 'DRAFT';
        const isCaptain = team.my_role === 'CAPTAIN';

        this.viewContainer.innerHTML = `
            <div class="team-dashboard fade-in">
                
                <!-- Team Header Card -->
                <div class="team-header-card" style="background: linear-gradient(135deg, ${team.logo_dna.primary}, ${team.logo_dna.secondary});">
                    <div class="team-logo-circle">
                        <i class="fa-solid fa-shield-cat"></i>
                    </div>
                    <h2>${team.name}</h2>
                    <span class="status-badge ${isDraft ? 'warning' : 'success'}">
                        ${isDraft ? 'تحت التأسيس (DRAFT)' : 'فريق جاهز (ACTIVE)'}
                    </span>
                </div>

                <!-- Stats Summary -->
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

                <!-- Action Buttons -->
                <div class="team-actions-grid">
                    ${isCaptain ? `
                        <button class="action-card" id="btn-invite">
                            <i class="fa-solid fa-link text-gold"></i>
                            <span>نسخ رابط الدعوة</span>
                        </button>
                        <button class="action-card" onclick="alert('لوحة الإدارة: قريباً')">
                            <i class="fa-solid fa-cog"></i>
                            <span>إدارة الفريق</span>
                        </button>
                    ` : `
                        <button class="action-card danger" id="btn-leave">
                            <i class="fa-solid fa-door-open"></i>
                            <span>مغادرة الفريق</span>
                        </button>
                    `}
                </div>

                <!-- Roster List Container -->
                <div class="roster-section">
                    <h4>قائمة اللاعبين</h4>
                    <div id="roster-list-container">
                        <div class="loader-bar" style="margin:20px auto;"></div>
                    </div>
                </div>
            </div>
        `;

        // Bind Dynamic Buttons
        if (isCaptain) {
            document.getElementById('btn-invite').addEventListener('click', () => this.copyInviteLink(team.id));
        } else {
            document.getElementById('btn-leave').addEventListener('click', () => this.handleLeave(team.id));
        }
    }

    /**
     * LOGIC: Handle Team Creation Form Submission
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
            
            // 1. Validate Name
            const exists = await this.teamService.checkNameAvailability(name, user.zoneId);
            if (exists) throw new Error("عذراً، هذا الاسم مستخدم بالفعل.");

            // 2. Create
            const logoDna = { primary: c1, secondary: c2 };
            await this.teamService.createTeam(user.id, name, user.zoneId, logoDna);

            alert("تم تأسيس الفريق بنجاح!");
            
            // 3. Refresh View
            this.init(); 

        } catch (err) {
            alert("خطأ: " + err.message);
            btn.disabled = false;
            btn.textContent = "إنشاء الكيان";
        }
    }

    /**
     * LOGIC: Fetch & Render Roster List
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
                            ${m.role === 'CAPTAIN' ? '<i class="fa-solid fa-crown text-gold" title="كابتن"></i>' : ''}
                            ${m.role === 'GK' ? '<i class="fa-solid fa-hands-holding-circle" title="حارس"></i>' : ''}
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
     * LOGIC: Leave Team
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

    /**
     * LOGIC: Deep Link Handler (Join via URL)
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
     * Helper: Toggle Loading Spinner
     */
    setLoading(isLoading) {
        if (isLoading) {
            this.viewContainer.innerHTML = '<div style="text-align:center; padding:50px;"><div class="loader-bar"></div></div>';
        }
    }

    /**
     * Helper: Skin Color Mapper
     */
    getSkinColor(id) {
        const colors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        return colors[id] || '#ccc';
    }
}
