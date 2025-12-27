/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/tournamentCtrl.js
 * Version: Noub Sports_beta 5.5.0 (TOURNAMENT LOBBY & DRAW ENGINE)
 * Status: Production Ready
 * 
 * ARCHITECTURE OVERVIEW:
 * 1. Service Layer:
 *    - manage registration (Join).
 *    - execute the "Random Draw" algorithm.
 *    - fetch detailed standings and fixtures.
 * 2. Controller Layer:
 *    - Renders the "Detail View" (Lobby).
 *    - Context-Aware UI: Shows "Join" for Captains, "Start" for Organizers.
 *    - Renders Group Tables (Standings) when tournament is Active.
 */

import { supabase } from '../core/supabaseClient.js';
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';
import { Helpers } from '../utils/helpers.js';
import { TeamService } from '../services/teamService.js'; // Needed for Join check

// ==========================================
// 1. SERVICE LAYER (DATABASE LOGIC)
// ==========================================
class TournamentService {
    
    constructor() {
        this.teamService = new TeamService();
    }

    /**
     * Create Tournament (Registration Phase)
     */
    async createTournament(organizerId, formData) {
        const config = {
            type: formData.type, 
            max_teams: formData.teamsCount,
            entry_fee: formData.entryFee || 0
        };

        const { data, error } = await supabase
            .from('tournaments')
            .insert([{
                organizer_id: organizerId,
                name: formData.name,
                status: 'OPEN',
                config: config,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    /**
     * Fetch List of Tournaments (Filtered)
     */
    async getTournaments(filter, userId, zoneId) {
        let query = supabase
            .from('tournaments')
            .select('*, organizer:users!organizer_id(username)')
            .order('created_at', { ascending: false });

        if (filter === 'MY') {
            query = query.eq('organizer_id', userId);
        } else {
            query = query.neq('status', 'ARCHIVED'); 
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    /**
     * Fetch Full Details (Lobby Data)
     * Retrieves Tournament Metadata + List of Participants.
     */
    async getTournamentData(tournamentId) {
        // Parallel Fetch for efficiency
        const [tRes, teamsRes] = await Promise.all([
            supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
            supabase.from('tournament_teams')
                .select('*, teams(name, logo_dna)')
                .eq('tournament_id', tournamentId)
                .order('points', { ascending: false }) // Pre-sort for standings
        ]);

        if (tRes.error) throw tRes.error;

        return {
            info: tRes.data,
            participants: teamsRes.data || []
        };
    }

    /**
     * ACTION: Join Tournament
     * Checks if team is valid, tournament not full, and not already joined.
     */
    async joinTournament(tournamentId, userId) {
        // 1. Get User's Team
        const myTeam = await this.teamService.getMyTeam(userId);
        if (!myTeam || myTeam.my_role !== 'CAPTAIN') {
            throw new Error("يجب أن تكون كابتن فريق لتتمكن من الانضمام.");
        }

        // 2. Check Integrity (Is already joined?)
        const { data: existing } = await supabase
            .from('tournament_teams')
            .select('id')
            .eq('tournament_id', tournamentId)
            .eq('team_id', myTeam.id)
            .maybeSingle();

        if (existing) throw new Error("فريقك مسجل بالفعل في هذه البطولة.");

        // 3. Check Capacity
        const { count } = await supabase
            .from('tournament_teams')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournamentId);
        
        // Fetch tournament config to check limit
        const { data: tourn } = await supabase.from('tournaments').select('config').eq('id', tournamentId).single();
        if (count >= (tourn.config.max_teams || 16)) throw new Error("البطولة مكتملة العدد.");

        // 4. Insert Record
        const { error } = await supabase
            .from('tournament_teams')
            .insert([{
                tournament_id: tournamentId,
                team_id: myTeam.id,
                group_name: null, // Assigned later by Draw
                points: 0
            }]);

        if (error) throw error;
        return true;
    }

    /**
     * ACTION: The Draw (القرعة الآلية)
     * Shuffles teams and assigns Groups (A, B, C, D).
     * Updates Tournament Status to 'ACTIVE'.
     */
    async startTournament(tournamentId) {
        // 1. Fetch all teams
        const { data: teams } = await supabase
            .from('tournament_teams')
            .select('id')
            .eq('tournament_id', tournamentId);

        if (teams.length < 4) throw new Error("العدد غير كافٍ لبدء القرعة (مطلوب 4 على الأقل).");

        // 2. Fisher-Yates Shuffle Algorithm (Randomization)
        for (let i = teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teams[i], teams[j]] = [teams[j], teams[i]];
        }

        // 3. Distribute to Groups
        const groupNames = ['A', 'B', 'C', 'D'];
        for (let i = 0; i < teams.length; i++) {
            // Modulo arithmetic to cycle through A, B, C, D
            const gName = groupNames[i % 4]; 
            await supabase
                .from('tournament_teams')
                .update({ group_name: gName })
                .eq('id', teams[i].id);
        }

        // 4. Update Status
        await supabase
            .from('tournaments')
            .update({ status: 'ACTIVE' })
            .eq('id', tournamentId);

        return true;
    }
}

// ==========================================
// 2. CONTROLLER LAYER (UI ORCHESTRATION)
// ==========================================
export class TournamentController {
    
    constructor() {
        this.service = new TournamentService();
        this.containerId = 'tourn-content'; 
        this.currentFilter = 'MY'; 
        this.injectFloatingMenu();
    }

    /* --- FAB MENU (Already Implemented) --- */
    injectFloatingMenu() {
        const fab = document.getElementById('nav-action');
        if(!fab) return;
        const newFab = fab.cloneNode(true);
        fab.parentNode.replaceChild(newFab, fab);

        if (!document.getElementById('fab-menu-overlay')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="fab-menu-overlay" class="fab-overlay hidden">
                    <div class="fab-actions">
                        <button class="fab-item" data-action="TOURNAMENT"><span class="label">الدورات الرمضانية</span><div class="icon-circle gold"><i class="fa-solid fa-trophy"></i></div></button>
                        <button class="fab-item" data-action="JOKER"><span class="label">اطلب "جوكر"</span><div class="icon-circle red"><i class="fa-solid fa-person-running"></i></div></button>
                        <button class="fab-item" data-action="REF"><span class="label">اطلب "حكم"</span><div class="icon-circle yellow"><i class="fa-solid fa-whistle"></i></div></button>
                        <button class="fab-item" data-action="AVAILABLE"><span class="label">أنا متوفر للعب</span><div class="icon-circle green"><i class="fa-solid fa-hand-point-up"></i></div></button>
                    </div>
                    <button id="btn-close-fab" class="fab-close"><i class="fa-solid fa-xmark"></i></button>
                </div>`);
            this.bindFabEvents();
        }
        newFab.addEventListener('click', () => {
            SoundManager.play('click');
            const overlay = document.getElementById('fab-menu-overlay');
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.add('active'), 10);
        });
    }

    bindFabEvents() {
        const overlay = document.getElementById('fab-menu-overlay');
        const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.classList.add('hidden'), 300); };
        document.getElementById('btn-close-fab').onclick = close;
        overlay.onclick = (e) => { if(e.target === overlay) close(); };
        overlay.querySelectorAll('.fab-item').forEach(btn => {
            btn.onclick = () => {
                const action = btn.dataset.action; SoundManager.play('click'); close(); this.handleRoute(action);
            };
        });
    }

    handleRoute(action) {
        if (action === 'TOURNAMENT') this.initTournamentView();
        else if (action === 'JOKER' || action === 'REF') {
            window.router('view-operations');
            setTimeout(() => window.dispatchEvent(new CustomEvent('trigger-post-request', { detail: { type: action === 'JOKER' ? 'WANTED_JOKER' : 'WANTED_REF' } })), 100);
        }
    }

    /* --- TOURNAMENT MAIN VIEW (LIST) --- */
    async initTournamentView() {
        window.router('view-tournaments'); 
        const container = document.getElementById(this.containerId);
        container.innerHTML = `
            <div class="tournament-hub fade-in">
                <div class="t-hero-banner">
                    <div class="ramadan-deco"><i class="fa-solid fa-moon"></i></div>
                    <h2>الدورات الرمضانية</h2>
                    <p>نظم دورتك .. كأنك في دوري الأبطال</p>
                    <button id="btn-create-tourn" class="btn-primary-gold"><i class="fa-solid fa-plus"></i> إنشاء دورة جديدة</button>
                </div>
                <div class="t-tabs">
                    <button class="t-tab active" data-filter="MY">دوراتي</button>
                    <button class="t-tab" data-filter="ALL">بطولات المنطقة</button>
                </div>
                <div id="tourn-list" class="t-list"><div class="loader-bar"></div></div>
            </div>`;
        
        this.bindHubEvents();
        this.loadTournamentsList();
    }

    bindHubEvents() {
        document.getElementById('btn-create-tourn').onclick = () => this.openCreateModal();
        document.querySelectorAll('.t-tab').forEach(tab => {
            tab.onclick = (e) => {
                SoundManager.play('click');
                document.querySelectorAll('.t-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.loadTournamentsList();
            };
        });
    }

    async loadTournamentsList() {
        const listContainer = document.getElementById('tourn-list');
        listContainer.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';
        try {
            const user = state.getUser();
            const tournaments = await this.service.getTournaments(this.currentFilter, user.id, user.zoneId);
            if (tournaments.length === 0) {
                listContainer.innerHTML = `<div class="empty-state" style="text-align:center; padding:30px; opacity:0.7;"><i class="fa-solid fa-trophy" style="font-size:3rem; margin-bottom:10px; color:#555;"></i><p>لا توجد دورات حالياً.</p></div>`;
                return;
            }
            listContainer.innerHTML = tournaments.map(t => this.renderTournamentCard(t)).join('');
            
            // Bind Card Clicks to Detail View
            listContainer.querySelectorAll('.btn-view-tourn').forEach(btn => {
                btn.onclick = () => this.openTournamentDetails(btn.dataset.id);
            });
        } catch (err) { console.error(err); listContainer.innerHTML = '<p class="error-text">فشل التحميل.</p>'; }
    }

    renderTournamentCard(t) {
        let statusText = t.status === 'OPEN' ? 'مفتوحة للتسجيل' : (t.status === 'ACTIVE' ? 'جارية الآن' : 'منتهية');
        return `
            <div class="tourn-card">
                <div class="status-badge ${t.status === 'ACTIVE' ? 'active' : ''}">${statusText}</div>
                <h3>${t.name}</h3>
                <div class="t-meta">
                    <span><i class="fa-solid fa-users"></i> ${t.config?.max_teams || 16} فريق</span>
                    <span><i class="fa-solid fa-sitemap"></i> ${t.config?.type === 'GROUPS' ? 'مجموعات' : 'دوري'}</span>
                </div>
                <button class="btn-view-tourn" data-id="${t.id}"><i class="fa-solid fa-eye"></i> دخول الدورة</button>
            </div>`;
    }

    /* --- TOURNAMENT DETAIL VIEW (LOBBY) --- */
    async openTournamentDetails(tournamentId) {
        const container = document.getElementById(this.containerId);
        container.innerHTML = '<div class="loader-center"><div class="loader-bar"></div></div>';
        
        try {
            const user = state.getUser();
            const data = await this.service.getTournamentData(tournamentId);
            const { info, participants } = data;
            const isOrganizer = info.organizer_id === user.id;
            const isOpen = info.status === 'OPEN';
            
            // Render Structure
            container.innerHTML = `
                <div class="t-detail-view fade-in">
                    <!-- Header -->
                    <div class="t-detail-header">
                        <button id="btn-back-tourn" class="back-btn"><i class="fa-solid fa-arrow-right"></i></button>
                        <div>
                            <h2>${info.name}</h2>
                            <span class="t-status-pill">${isOpen ? 'فترة التسجيل' : 'المنافسة جارية'}</span>
                        </div>
                    </div>

                    <!-- Action Area -->
                    <div class="t-action-area">
                        ${this.renderActionArea(info, isOrganizer, participants.length)}
                    </div>

                    <!-- Content (Switch based on Status) -->
                    <div class="t-content-body">
                        ${isOpen 
                            ? this.renderParticipantsList(participants, info.config.max_teams) 
                            : this.renderStandings(participants)
                        }
                    </div>
                </div>
            `;

            // Bind Back Button
            document.getElementById('btn-back-tourn').onclick = () => this.initTournamentView();

            // Bind Action Button (Join or Start)
            const actionBtn = document.getElementById('btn-action-main');
            if (actionBtn) {
                actionBtn.onclick = () => {
                    if (isOrganizer && isOpen) this.handleStartDraw(tournamentId);
                    else if (isOpen) this.handleJoin(tournamentId);
                };
            }

        } catch (e) {
            console.error(e);
            container.innerHTML = `<p class="error-text">حدث خطأ: ${e.message}</p><button onclick="window.location.reload()">تحديث</button>`;
        }
    }

    /**
     * Logic to decide which button to show (Join, Start, or Locked).
     */
    renderActionArea(info, isOrganizer, count) {
        const max = info.config.max_teams;
        
        if (info.status === 'OPEN') {
            if (isOrganizer) {
                // Organizer View
                const ready = count >= 4; // Min 4 teams to start
                return `
                    <div class="organizer-controls">
                        <div class="counter-box">
                            <span class="num">${count}/${max}</span>
                            <span class="lbl">الفرق المسجلة</span>
                        </div>
                        <button id="btn-action-main" class="btn-primary-gold" ${!ready ? 'disabled' : ''} style="${!ready ? 'opacity:0.5' : ''}">
                            <i class="fa-solid fa-shuffle"></i> إجراء القرعة وبدء الدورة
                        </button>
                        ${!ready ? '<p class="hint-text">مطلوب 4 فرق على الأقل للبدء</p>' : ''}
                    </div>`;
            } else {
                // Participant View
                return `
                    <button id="btn-action-main" class="btn-primary-gold">
                        <i class="fa-solid fa-user-plus"></i> تسجيل فريقي في البطولة
                    </button>`;
            }
        } else {
            return `<div class="active-banner"><i class="fa-solid fa-fire"></i> البطولة مشتعلة الآن!</div>`;
        }
    }

    renderParticipantsList(teams, max) {
        if (teams.length === 0) return `<div class="empty-state"><p>لم ينضم أحد بعد. كن الأول!</p></div>`;
        return `
            <h4 class="section-title">الفرق المشاركة</h4>
            <div class="teams-grid">
                ${teams.map(t => `
                    <div class="team-mini-card">
                        <div class="team-icon" style="background:${t.teams.logo_dna?.primary || '#333'}">
                            <i class="fa-solid fa-shield-cat"></i>
                        </div>
                        <span>${t.teams.name}</span>
                    </div>
                `).join('')}
            </div>`;
    }

    renderStandings(teams) {
        // Group by group_name
        const groups = { A: [], B: [], C: [], D: [] };
        teams.forEach(t => { if(groups[t.group_name]) groups[t.group_name].push(t); });

        let html = '';
        ['A', 'B', 'C', 'D'].forEach(gName => {
            const groupTeams = groups[gName];
            if (groupTeams.length > 0) {
                html += `
                    <div class="group-container">
                        <h4 class="group-title">المجموعة ${gName}</h4>
                        <table class="standings-table">
                            <thead><tr><th>الفريق</th><th>لعب</th><th>+/-</th><th>نقاط</th></tr></thead>
                            <tbody>
                                ${groupTeams.map((t, idx) => `
                                    <tr class="${idx < 2 ? 'qualified' : ''}">
                                        <td class="team-cell">
                                            <span class="rank">${idx + 1}</span>
                                            ${t.teams.name}
                                        </td>
                                        <td>${t.played}</td>
                                        <td>${t.goal_diff}</td>
                                        <td class="pts">${t.points}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>`;
            }
        });
        return html;
    }

    /* --- ACTIONS HANDLERS --- */
    async handleJoin(tournamentId) {
        if(!confirm("هل تريد تسجيل فريقك في هذه الدورة؟")) return;
        try {
            await this.service.joinTournament(tournamentId, state.getUser().id);
            SoundManager.play('success');
            alert("تم تسجيل فريقك بنجاح!");
            this.openTournamentDetails(tournamentId); // Refresh
        } catch (e) { alert(e.message); }
    }

    async handleStartDraw(tournamentId) {
        if(!confirm("هل أنت متأكد؟ سيتم إغلاق التسجيل وتوزيع الفرق وبدء المباريات.")) return;
        try {
            await this.service.startTournament(tournamentId);
            SoundManager.play('whistle'); // Fun Effect
            alert("تمت القرعة! البطولة بدأت رسمياً.");
            this.openTournamentDetails(tournamentId); // Refresh to show Standings
        } catch (e) { alert(e.message); }
    }

    /* --- CREATE MODAL (Standard) --- */
    openCreateModal() {
        const modalId = 'modal-create-tourn';
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header"><h3>تنظيم دورة جديدة</h3><button class="close-btn" id="btn-close-tm">&times;</button></div>
                        <form id="form-create-tourn">
                            <div class="form-group"><label>اسم الدورة</label><input type="text" id="inp-t-name" required></div>
                            <div class="form-group"><label>نظام البطولة</label><select id="inp-t-type"><option value="GROUPS">مجموعات</option><option value="LEAGUE">دوري</option></select></div>
                            <div class="form-group"><label>عدد الفرق</label><select id="inp-t-count"><option value="8">8</option><option value="16" selected>16</option></select></div>
                            <button type="submit" class="btn-primary">إنشاء وإطلاق</button>
                        </form>
                    </div>
                </div>`);
            document.getElementById('btn-close-tm').onclick = () => document.getElementById(modalId).classList.add('hidden');
            document.getElementById('form-create-tourn').onsubmit = (e) => this.handleCreateSubmit(e, modalId);
        }
        document.getElementById(modalId).classList.remove('hidden');
    }

    async handleCreateSubmit(e, modalId) {
        e.preventDefault();
        const btn = e.target.querySelector('button'); btn.disabled = true;
        const formData = {
            name: document.getElementById('inp-t-name').value,
            type: document.getElementById('inp-t-type').value,
            teamsCount: parseInt(document.getElementById('inp-t-count').value)
        };
        try {
            await this.service.createTournament(state.getUser().id, formData);
            SoundManager.play('success');
            document.getElementById(modalId).classList.add('hidden');
            this.loadTournamentsList();
        } catch (err) { alert(err.message); } finally { btn.disabled = false; }
    }
}
