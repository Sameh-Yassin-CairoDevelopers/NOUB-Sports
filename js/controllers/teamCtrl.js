/*
 * Filename: js/controllers/teamCtrl.js
 * Version: 3.1.0
 * Description: Controls Team View (Dashboard, Roster, Invites).
 * Updated to include Roster Rendering & Invite Logic.
 */

import { TeamService } from '../services/teamService.js';
import { State } from '../core/state.js';
import { AvatarEngine } from '../utils/avatarEngine.js';

export class TeamController {
    constructor() {
        this.teamService = new TeamService();
        this.state = new State();
        this.viewContainer = document.getElementById('view-team');
        
        // Helper to check for Invite Params on load
        this.checkInviteParam();
        
        this.init();
    }

    async init() {
        console.log("🛡️ TeamController: Refreshing...");
        const currentUser = this.state.getUser();
        if (!currentUser) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        this.setLoading(true);

        try {
            const myTeam = await this.teamService.getMyTeam(currentUser.id);

            if (myTeam) {
                // 1. Render Dashboard
                this.renderTeamDashboard(myTeam);
                // 2. Fetch & Render Roster (Async)
                this.loadRoster(myTeam.id);
            } else {
                this.renderCreateForm();
            }

        } catch (err) {
            console.error(err);
            this.viewContainer.innerHTML = `<div class="error-state">خطأ في الاتصال.</div>`;
        } finally {
            // Remove full page loader (Roster has its own loader)
        }
    }

    /**
     * Checks if user opened app via Invite Link (t.me/bot?start=join_TEAMID)
     */
    async checkInviteParam() {
        // Get start param from Telegram or URL
        const tgParams = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        // Format: join_TEAMUUID
        if (tgParams && tgParams.startsWith('join_')) {
            const teamId = tgParams.split('_')[1];
            const currentUser = this.state.getUser();
            
            if (currentUser && confirm("هل تريد الانضمام لهذا الفريق؟")) {
                try {
                    await this.teamService.joinTeam(currentUser.id, teamId);
                    alert("تم الانضمام بنجاح!");
                    window.location.reload(); // Refresh to update view
                } catch (e) {
                    alert("فشل الانضمام: " + e.message);
                }
            }
        }
    }

    /**
     * Copy Invite Link to Clipboard
     */
    copyInviteLink(teamId) {
        // Construct deep link
        const botUsername = 'NoubSportsBot'; // Replace with real bot name
        const link = `https://t.me/${botUsername}?start=join_${teamId}`;
        
        navigator.clipboard.writeText(link).then(() => {
            alert("تم نسخ رابط الدعوة! أرسله لأصدقائك.");
        });
    }

    async loadRoster(teamId) {
        const rosterContainer = document.getElementById('roster-list-container');
        if (!rosterContainer) return;

        try {
            const members = await this.teamService.getTeamRoster(teamId);
            
            if (members.length === 0) {
                rosterContainer.innerHTML = '<p class="text-muted text-center">القائمة فارغة.</p>';
                return;
            }

            // Render List
            rosterContainer.innerHTML = members.map(m => `
                <div class="member-card">
                    <div class="member-avatar">
                        <!-- Simplified Visual (Skin Color only for list) -->
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
            rosterContainer.innerHTML = '<p class="error-text">فشل تحميل القائمة.</p>';
        }
    }

    getSkinColor(id) {
        const colors = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'];
        return colors[id] || '#ccc';
    }

    /**
     * Creation Form & Dashboard Renderers (Same as previous batch)
     * (Included fully for completeness)
     */
    renderCreateForm() {
        this.viewContainer.innerHTML = `
            <div class="team-creation-box fade-in">
                <div class="empty-state-icon"><i class="fa-solid fa-flag-checkered"></i></div>
                <h3>أسس فريقك الخاص</h3>
                <p>كن الكابتن وابدأ المنافسة.</p>
                <form id="form-create-team">
                    <div class="form-group">
                        <label>اسم الفريق</label>
                        <input type="text" id="inp-team-name" placeholder="صقور الفسطاط" required maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>ألوان الفريق</label>
                        <div class="color-picker-row">
                            <input type="color" id="inp-team-color1" value="#D4AF37">
                            <input type="color" id="inp-team-color2" value="#000000">
                        </div>
                    </div>
                    <button type="submit" class="btn-primary" id="btn-create-team">إنشاء الكيان</button>
                </form>
            </div>
        `;
        document.getElementById('form-create-team').addEventListener('submit', (e) => this.handleCreate(e));
    }

    async handleCreate(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-create-team');
        const name = document.getElementById('inp-team-name').value;
        const c1 = document.getElementById('inp-team-color1').value;
        const c2 = document.getElementById('inp-team-color2').value;
        
        btn.disabled = true;
        btn.textContent = "جاري التوثيق...";
        
        try {
            const user = this.state.getUser();
            if (await this.teamService.checkNameAvailability(name, user.zoneId)) {
                throw new Error("الاسم مستخدم بالفعل.");
            }
            await this.teamService.createTeam(user.id, name, user.zoneId, { primary: c1, secondary: c2 });
            alert("تم الإنشاء!");
            this.init();
        } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.textContent = "إنشاء الكيان";
        }
    }

    renderTeamDashboard(team) {
        const isDraft = team.status === 'DRAFT';
        this.viewContainer.innerHTML = `
            <div class="team-dashboard fade-in">
                <div class="team-header-card" style="background: linear-gradient(135deg, ${team.logo_dna.primary}, ${team.logo_dna.secondary});">
                    <div class="team-logo-circle"><i class="fa-solid fa-shield-cat"></i></div>
                    <h2>${team.name}</h2>
                    <span class="status-badge ${isDraft ? 'warning' : 'success'}">${isDraft ? 'DRAFT' : 'ACTIVE'}</span>
                </div>
                
                <div class="team-stats-row">
                    <div class="t-stat"><span class="val">${team.total_matches}</span><span class="lbl">مباريات</span></div>
                    <div class="t-stat"><span class="val">--</span><span class="lbl">فوز</span></div>
                </div>

                <div class="team-actions-grid">
                    ${team.my_role === 'CAPTAIN' ? `
                        <button class="action-card" id="btn-invite">
                            <i class="fa-solid fa-user-plus text-gold"></i><span>دعوة لاعب</span>
                        </button>
                        <button class="action-card" onclick="alert('الإدارة قريباً')">
                            <i class="fa-solid fa-cog"></i><span>إدارة</span>
                        </button>
                    ` : `
                        <button class="action-card danger" id="btn-leave">
                            <i class="fa-solid fa-door-open"></i><span>مغادرة</span>
                        </button>
                    `}
                </div>

                <div class="roster-section">
                    <h4>قائمة اللاعبين</h4>
                    <div id="roster-list-container">
                        <div class="loader-bar" style="margin:20px auto;"></div>
                    </div>
                </div>
            </div>
        `;

        // Bind Action Buttons
        if (team.my_role === 'CAPTAIN') {
            document.getElementById('btn-invite').addEventListener('click', () => this.copyInviteLink(team.id));
        } else {
            document.getElementById('btn-leave').addEventListener('click', () => this.handleLeave(team.id));
        }
    }

    async handleLeave(teamId) {
        if (!confirm("هل أنت متأكد من مغادرة الفريق؟ ستفقد تاريخك معه.")) return;
        try {
            await this.teamService.leaveTeam(this.state.getUser().id, teamId);
            window.location.reload();
        } catch (e) { alert(e.message); }
    }

    setLoading(isLoading) {
        if (isLoading) this.viewContainer.innerHTML = '<div style="text-align:center; padding:50px;"><div class="loader-bar"></div></div>';
    }
}