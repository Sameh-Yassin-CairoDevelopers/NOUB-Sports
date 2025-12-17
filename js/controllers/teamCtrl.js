/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/teamCtrl.js
 * Version: Noub Sports_beta 0.0.1 (MANAGEMENT FIX)
 * Status: Production Ready
 * 
 * RESPONSIBILITIES:
 * 1. Team Lifecycle: Create, Dashboard, Roster.
 * 2. Management Logic: Toggles 'Edit Mode' for Captains to Kick/Promote.
 * 3. Invites: Generates Deep Links for viral growth.
 */

import { TeamService } from '../services/teamService.js';
import { state } from '../core/state.js';
import { AvatarEngine } from '../utils/avatarEngine.js'; // For visuals

export class TeamController {
    
    constructor() {
        this.teamService = new TeamService();
        this.viewContainer = document.getElementById('view-team');
        
        // Internal State: Toggle for Captain's Management UI
        this.isManageMode = false;
        
        // Listen for invite links
        this.checkInviteParam();
    }

    /**
     * Main Init
     */
    async init() {
        console.log("🛡️ TeamController: Init...");
        
        const user = state.getUser();
        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        this.setLoading(true);

        try {
            // Fetch Team Data
            const myTeam = await this.teamService.getMyTeam(user.id);

            if (myTeam) {
                // User has Team -> Show Dashboard
                // Reset manage mode on fresh load
                this.isManageMode = false; 
                this.renderTeamDashboard(myTeam);
                this.loadRoster(myTeam.id);
            } else {
                // User is Free -> Show Create
                this.renderFreeAgentView();
            }

        } catch (err) {
            console.error(err);
            this.viewContainer.innerHTML = `<div class="error-state">خطأ في الاتصال.</div>`;
        }
    }

    /**
     * VIEW 1: Free Agent (Create)
     */
    renderFreeAgentView() {
        this.viewContainer.innerHTML = `
            <div class="team-creation-box fade-in">
                <div class="empty-state-icon">
                    <i class="fa-solid fa-flag-checkered"></i>
                </div>
                <h3>التحق بكيان رياضي</h3>
                <p>أسس فريقك الخاص، أو ابحث عن فريق للانضمام إليه.</p>

                <form id="form-create-team" style="margin-top:20px;">
                    <div class="form-group">
                        <label>اسم الفريق</label>
                        <input type="text" id="inp-team-name" placeholder="مثال: صقور الفسطاط" required maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>ألوان الشعار</label>
                        <div class="color-picker-row">
                            <input type="color" id="inp-team-color1" value="#D4AF37">
                            <input type="color" id="inp-team-color2" value="#000000">
                        </div>
                    </div>
                    <button type="submit" class="btn-primary" id="btn-create-team">
                        تأسيس فريق
                    </button>
                </form>

                <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:20px 0;">
                
                <button class="btn-action-secondary" style="width:100%; justify-content:center;" onclick="window.router('view-scout')">
                    <i class="fa-solid fa-search"></i> البحث عن فرق
                </button>
            </div>
        `;

        document.getElementById('form-create-team').addEventListener('submit', (e) => this.handleCreate(e));
    }

    /**
     * Logic: Create Team
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
            const exists = await this.teamService.checkNameAvailability(name, user.zoneId);
            if (exists) throw new Error("الاسم مستخدم بالفعل.");
            
            await this.teamService.createTeam(user.id, name, user.zoneId, { primary: c1, secondary: c2 });
            alert("تم التأسيس!");
            this.init(); // Refresh

        } catch (err) {
            alert("خطأ: " + err.message);
            btn.disabled = false;
            btn.textContent = "تأسيس فريق";
        }
    }

    /**
     * VIEW 2: Dashboard
     */
    renderTeamDashboard(team) {
        const isDraft = team.status === 'DRAFT';
        const isCap = team.my_role === 'CAPTAIN';

        this.viewContainer.innerHTML = `
            <div class="team-dashboard fade-in">
                <!-- Header -->
                <div class="team-header-card" style="background: linear-gradient(135deg, ${team.logo_dna.primary}, ${team.logo_dna.secondary});">
                    <div class="team-logo-circle"><i class="fa-solid fa-shield-cat"></i></div>
                    <h2>${team.name}</h2>
                    <span class="status-badge ${isDraft ? 'warning' : 'success'}">${isDraft ? 'DRAFT' : 'ACTIVE'}</span>
                </div>

                <!-- Stats -->
                <div class="team-stats-row">
                    <div class="t-stat"><span class="val">${team.total_matches || 0}</span><span class="lbl">مباريات</span></div>
                    <div class="t-stat"><span class="val">--</span><span class="lbl">فوز</span></div>
                </div>

                <!-- Actions -->
                <div class="team-actions-grid">
                    ${isCap ? `
                        <button class="action-card" id="btn-invite">
                            <i class="fa-solid fa-link text-gold"></i><span>نسخ الرابط</span>
                        </button>
                        <button class="action-card" id="btn-manage" style="${this.isManageMode ? 'border-color:var(--danger); color:var(--danger);' : ''}">
                            <i class="fa-solid fa-users-gear"></i>
                            <span>${this.isManageMode ? 'إنهاء الإدارة' : 'إدارة الأعضاء'}</span>
                        </button>
                    ` : `
                        <button class="action-card danger" id="btn-leave">
                            <i class="fa-solid fa-door-open"></i><span>مغادرة</span>
                        </button>
                    `}
                </div>

                <!-- Roster -->
                <div class="roster-section">
                    <h4 style="display:flex; justify-content:space-between;">
                        قائمة اللاعبين
                        ${this.isManageMode ? '<span style="color:var(--danger); font-size:0.7rem;">وضع التعديل</span>' : ''}
                    </h4>
                    <div id="roster-list-container"><div class="loader-bar"></div></div>
                </div>
            </div>
        `;

        // Bind Buttons
        if (isCap) {
            document.getElementById('btn-invite').onclick = () => this.copyInviteLink(team.id);
            document.getElementById('btn-manage').onclick = () => {
                this.isManageMode = !this.isManageMode; // Toggle
                this.renderTeamDashboard(team); // Refresh buttons
                this.loadRoster(team.id);       // Refresh list (show icons)
            };
        } else {
            document.getElementById('btn-leave').onclick = () => this.handleLeave(team.id);
        }
    }

    /**
     * LOGIC: Load Roster & Management Icons
     */
    async loadRoster(teamId) {
        const container = document.getElementById('roster-list-container');
        try {
            const members = await this.teamService.getTeamRoster(teamId);
            if (!members.length) { container.innerHTML = '<p class="text-muted">فارغة.</p>'; return; }
            
            container.innerHTML = members.map(m => {
                // Determine if we show icons
                const isMe = m.userId === state.getUser().id;
                const isTargetCap = m.role === 'CAPTAIN';
                const showActions = this.isManageMode && !isMe && !isTargetCap;

                return `
                <div class="member-card">
                    <div class="member-avatar">
                        <i class="fa-solid fa-user" style="color:${this.getSkinColor(m.visual?.skin)}"></i>
                    </div>
                    <div class="member-info">
                        <div class="member-name">
                            ${m.name} 
                            ${m.role === 'CAPTAIN' ? '<i class="fa-solid fa-crown text-gold"></i>' : ''}
                            ${m.role === 'VICE' ? '<i class="fa-solid fa-star text-gold"></i>' : ''}
                        </div>
                        <div class="member-pos">${m.position}</div>
                    </div>
                    
                    ${showActions ? `
                        <div class="manage-actions">
                            ${m.role !== 'VICE' ? `
                            <button class="btn-icon promote" data-id="${m.userId}" title="ترقية">
                                <i class="fa-solid fa-arrow-up text-gold"></i>
                            </button>` : ''}
                            <button class="btn-icon kick" data-id="${m.userId}" title="طرد">
                                <i class="fa-solid fa-user-xmark text-danger"></i>
                            </button>
                        </div>
                    ` : `<div class="member-rep">${m.reputation}%</div>`}
                </div>`;
            }).join('');

            // Bind Action Icons
            if (this.isManageMode) {
                container.querySelectorAll('.promote').forEach(b => b.onclick = () => this.handlePromote(teamId, b.dataset.id));
                container.querySelectorAll('.kick').forEach(b => b.onclick = () => this.handleKick(teamId, b.dataset.id));
            }

        } catch (e) { container.innerHTML = 'Error'; }
    }

    // --- Actions ---
    async handleKick(tid, uid) {
        if(!confirm("طرد اللاعب؟")) return;
        try { await this.teamService.kickMember(state.getUser().id, tid, uid); this.loadRoster(tid); }
        catch(e) { alert(e.message); }
    }

    async handlePromote(tid, uid) {
        if(!confirm("ترقية لنائب؟")) return;
        try { await this.teamService.promoteMember(state.getUser().id, tid, uid); this.loadRoster(tid); }
        catch(e) { alert(e.message); }
    }

    async handleLeave(tid) {
        if(!confirm("مغادرة؟")) return;
        try { await this.teamService.leaveTeam(state.getUser().id, tid); window.location.reload(); }
        catch(e) { alert(e.message); }
    }

    // --- Helpers ---
    async checkInviteParam() {
        const p = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        if(p && p.startsWith('join_')) {
            const tid = p.split('_')[1];
            const u = state.getUser();
            if(u && confirm("انضمام للفريق؟")) {
                try { await this.teamService.joinTeam(u.id, tid); alert("تم!"); window.location.reload(); }
                catch(e) { alert(e.message); }
            }
        }
    }

    copyInviteLink(tid) {
        const l = `https://t.me/NoubSportsBot?start=join_${tid}`;
        navigator.clipboard.writeText(l).then(()=>alert("تم النسخ!")).catch(()=>prompt("الرابط:", l));
    }

    setLoading(b) { if(b) this.viewContainer.innerHTML = '<div style="text-align:center; padding:50px;"><div class="loader-bar"></div></div>'; }
    getSkinColor(id) { const c = ['#ccc', '#F5C6A5', '#C68642', '#8D5524']; return c[id] || '#ccc'; }
}
