/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/tournamentCtrl.js
 * Version: Noub Sports_beta 6.0.0 (FULL SUITE: DRAW + REFEREE + NOTIFICATIONS)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ACADEMIC MODULE DESCRIPTION:
 * -----------------------------------------------------------------------------
 * This module orchestrates the full lifecycle of a Tournament.
 * 
 * CORE ALGORITHMS:
 * 1. Fisher-Yates Shuffle: For randomizing the draw (Groups A, B, C, D).
 * 2. Round Robin Scheduling: For generating "All-play-All" fixtures within groups.
 * 
 * INTEGRATIONS:
 * - NewsEngine: Dynamically generates headlines for tournament matches.
 * - NotificationService: Triggers alerts for captains/organizers on match results.
 * 
 * DATA FLOW:
 * Create -> Join -> Draw & Schedule -> [NEW: Referee Console & Score Submission] -> Active Mode (Standings/Fixtures).
 * -----------------------------------------------------------------------------
 */

import { supabase } from '../core/supabaseClient.js';
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';
import { Helpers } from '../utils/helpers.js';
import { TeamService } from '../services/teamService.js'; 
import { NewsEngine } from '../utils/newsEngine.js';             // [NEW] لإنشاء المانشيتات
import { NotificationService } from '../services/notificationService.js'; // [NEW] لإرسال الإشعارات

// =============================================================================
// 1. SERVICE LAYER (DATABASE & LOGIC)
// =============================================================================
class TournamentService {
    
    constructor() {
        this.teamService = new TeamService();
        this.notificationService = new NotificationService(); // [NEW]
    }

    /* --- CREATION & FETCHING --- */

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

    async getTournaments(filter, userId) { // Removed zoneId, as it's part of user's context or implied
        let query = supabase
            .from('tournaments')
            .select('*, organizer:users!organizer_id(username)')
            .order('created_at', { ascending: false });

        if (filter === 'MY') {
            query = query.eq('organizer_id', userId);
        } else {
            // For ALL tournaments, we can add zone_id filtering based on organizer's zone or a tournament zone field.
            // For now, fetch all non-archived tournaments.
            query = query.neq('status', 'ARCHIVED'); 
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async getTournamentData(tournamentId) {
        const [tRes, teamsRes, matchesRes] = await Promise.all([
            supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
            
            supabase.from('tournament_teams')
                .select('*, teams(name, logo_dna)')
                .eq('tournament_id', tournamentId)
                .order('points', { ascending: false })
                .order('goal_diff', { ascending: false })
                .order('goals_for', { ascending: false }),

            supabase.from('matches')
                .select('*, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)')
                .eq('tournament_id', tournamentId)
                .order('match_data->>round', { ascending: true }) 
                .order('played_at', { ascending: true }) // Ensure consistent match order
        ]);

        if (tRes.error) throw tRes.error;

        return {
            info: tRes.data,
            participants: teamsRes.data || [],
            fixtures: matchesRes.data || []
        };
    }

    async joinTournament(tournamentId, userId) {
        const myTeam = await this.teamService.getMyTeam(userId);
        if (!myTeam || myTeam.my_role !== 'CAPTAIN') {
            throw new Error("يجب أن تكون كابتن فريق لتتمكن من الانضمام.");
        }

        const { data: existing } = await supabase.from('tournament_teams')
            .select('id').eq('tournament_id', tournamentId).eq('team_id', myTeam.id).maybeSingle();
        if (existing) throw new Error("فريقك مسجل بالفعل في هذه البطولة.");

        const { count } = await supabase.from('tournament_teams')
            .select('*', { count: 'exact', head: true }).eq('tournament_id', tournamentId);
        
        const { data: tourn } = await supabase.from('tournaments').select('config').eq('id', tournamentId).single();
        if (count >= (tourn.config.max_teams || 16)) throw new Error("البطولة مكتملة العدد.");

        const { error } = await supabase.from('tournament_teams')
            .insert([{ tournament_id: tournamentId, team_id: myTeam.id, points: 0 }]);

        if (error) throw error;
        return true;
    }

    /* --- ENGINE: DRAW & SCHEDULING --- */

/* --- FIXED ENGINE: DRAW & SCHEDULING --- */
    async startTournament(tournamentId) {
        // 1. Fetch Teams
        const { data: teams } = await supabase
            .from('tournament_teams').select('id, team_id').eq('tournament_id', tournamentId);

        if (teams.length < 4) throw new Error("العدد غير كافٍ (4 على الأقل).");

        // 2. Shuffle
        for (let i = teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teams[i], teams[j]] = [teams[j], teams[i]];
        }

        // 3. Assign Groups
        const groups = { A: [], B: [], C: [], D: [] };
        const groupKeys = ['A', 'B', 'C', 'D'];
        
        for (let i = 0; i < teams.length; i++) {
            const gName = groupKeys[i % 4];
            groups[gName].push(teams[i].team_id);
            await supabase.from('tournament_teams').update({ group_name: gName }).eq('id', teams[i].id);
        }

        // 4. GENERATE FIXTURES (Explicit Logic - No Undefined)
        const matchesToInsert = [];
        
        Object.keys(groups).forEach(gName => {
            const gt = groups[gName];
            // If group has 2 teams (Minimal)
            if (gt.length === 2) {
                matchesToInsert.push(this._createMatchObj(tournamentId, gt[0], gt[1], 1, gName));
            }
            // If group has 3 teams
            else if (gt.length === 3) {
                matchesToInsert.push(this._createMatchObj(tournamentId, gt[0], gt[1], 1, gName)); // 1 vs 2
                matchesToInsert.push(this._createMatchObj(tournamentId, gt[1], gt[2], 2, gName)); // 2 vs 3
                matchesToInsert.push(this._createMatchObj(tournamentId, gt[2], gt[0], 3, gName)); // 3 vs 1
            }
            // If group has 4 teams (Standard)
            else if (gt.length === 4) {
                // Round 1
                matchesToInsert.push(this._createMatchObj(tournamentId, gt[0], gt[1], 1, gName));
                matchesToInsert.push(this._createMatchObj(tournamentId, gt[2], gt[3], 1, gName));
                // Round 2
                matchesToInsert.push(this._createMatchObj(tournamentId, gt[0], gt[2], 2, gName));
                matchesToInsert.push(this._createMatchObj(tournamentId, gt[1], gt[3], 2, gName));
                // Round 3
                matchesToInsert.push(this._createMatchObj(tournamentId, gt[0], gt[3], 3, gName));
                matchesToInsert.push(this._createMatchObj(tournamentId, gt[1], gt[2], 3, gName));
            }
        });

        // 5. Insert & Activate
        const validMatches = matchesToInsert.filter(m => m.team_a_id && m.team_b_id);
        if (validMatches.length > 0) await supabase.from('matches').insert(validMatches);

        await supabase.from('tournaments').update({ status: 'ACTIVE' }).eq('id', tournamentId);
        return true;
    }

    _createMatchObj(tournId, tA, tB, round, group) {
        return {
            tournament_id: tournId,
            team_a_id: tA,
            team_b_id: tB,
            status: 'SCHEDULED',
            score_a: 0,
            score_b: 0,
            match_data: { round: round, group: group, headline: `مباراة المجموعة ${group}` }, // Generic headline initially
            played_at: new Date(Date.now() + (round * 86400000)).toISOString() // Placeholder future date
        };
    }

    /* --- [NEW] ENGINE: RESULTS & POINTS --- */

    /**
     * Updates Match Result, Recalculates Standings, and Generates Dynamic News.
     */
    async submitMatchResult(matchId, scoreA, scoreB) {
        // A. Fetch Match Meta + Team Names for News Engine
        const { data: match } = await supabase
            .from('matches')
            .select(`
                tournament_id, team_a_id, team_b_id,
                team_a:teams!team_a_id(name),
                team_b:teams!team_b_id(name)
            `)
            .eq('id', matchId).single();

        if (!match) throw new Error("المباراة غير موجودة.");

        // [NEW] Generate Dynamic Headline & Body
        const news = NewsEngine.generateReport(match.team_a.name, match.team_b.name, scoreA, scoreB);
        
        // B. Update Match Record
        const { error: matchErr } = await supabase
            .from('matches')
            .update({
                score_a: scoreA,
                score_b: scoreB,
                status: 'FINISHED',
                match_data: { ...match.match_data, headline: news.headline, body: news.body }, // Update with dynamic news
                played_at: new Date().toISOString()
            })
            .eq('id', matchId);

        if (matchErr) throw matchErr;

        // C. Update Standings
        await this._updateTeamStats(match.tournament_id, match.team_a_id, scoreA, scoreB);
        await this._updateTeamStats(match.tournament_id, match.team_b_id, scoreB, scoreA);

        // [NEW] Send Notifications
        await this._sendTournamentResultNotification(match, scoreA, scoreB, news.headline);

        return true;
    }

    /**
     * Internal Helper: Update Team Stats in Standings Table.
     */
    async _updateTeamStats(tournId, teamId, goalsFor, goalsAgainst) {
        let points = 0, won = 0, drawn = 0, lost = 0;

        if (goalsFor > goalsAgainst) { points = 3; won = 1; }
        else if (goalsFor === goalsAgainst) { points = 1; drawn = 1; }
        else { lost = 1; }

        const { data: current } = await supabase
            .from('tournament_teams')
            .select('*')
            .eq('tournament_id', tournId).eq('team_id', teamId).single();

        const updateData = {
            played: (current.played || 0) + 1,
            won: (current.won || 0) + won,
            drawn: (current.drawn || 0) + drawn,
            lost: (current.lost || 0) + lost,
            points: (current.points || 0) + points,
            goals_for: (current.goals_for || 0) + goalsFor,
            goals_against: (current.goals_against || 0) + goalsAgainst,
            goal_diff: ((current.goals_for || 0) + goalsFor) - ((current.goals_against || 0) + goalsAgainst)
        };

        await supabase.from('tournament_teams').update(updateData).eq('id', current.id);
    }

    /**
     * [NEW] NOTIFICATION HELPER
     * Sends a result notification to both teams' captains AND the tournament organizer.
     */
    async _sendTournamentResultNotification(matchData, scoreA, scoreB, headline) {
        try {
            // 1. Get Organizer ID
            const { data: tourn } = await supabase
                .from('tournaments')
                .select('organizer_id')
                .eq('id', matchData.tournament_id)
                .single();
            const organizerId = tourn.organizer_id;

            // 2. Get Captains IDs
            const { data: captains } = await supabase
                .from('team_members')
                .select('user_id')
                .in('team_id', [matchData.team_a_id, matchData.team_b_id])
                .eq('role', 'CAPTAIN');
            
            const notifiedUsers = new Set(); // Prevent duplicate notifications
            
            // Add Organizer
            if (organizerId) notifiedUsers.add(organizerId);
            // Add Captains
            if (captains) captains.forEach(c => notifiedUsers.add(c.user_id));

            const notificationsToInsert = Array.from(notifiedUsers).map(userId => ({
                user_id: userId,
                type: 'TOURNAMENT_RESULT',
                title: '🏆 نتيجة دورة رمضانية',
                message: `${headline} ( ${matchData.team_a.name} ${scoreA} - ${scoreB} ${matchData.team_b.name} )`,
                is_read: false,
                created_at: new Date().toISOString()
            }));

            if (notificationsToInsert.length > 0) {
                await supabase.from('notifications').insert(notificationsToInsert);
                console.log(`🔔 Tournament Result Notification sent to ${notificationsToInsert.length} users.`);
            }

        } catch (e) {
            console.warn("Tournament Result Notification Failed:", e);
        }
    }
}

// =============================================================================
// 2. CONTROLLER LAYER (UI & INTERACTION)
// =============================================================================
export class TournamentController {
    
    constructor() {
        this.service = new TournamentService();
        this.containerId = 'tourn-content'; 
        this.currentFilter = 'MY'; 
        this.injectFloatingMenu();
        this.activeDetailTab = 'STANDINGS'; 
    }

    /* --- FAB MENU (UNCHANGED) --- */
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

    /* --- TOURNAMENT LIST VIEW --- */
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
            const { info, participants, fixtures } = data;
            const isOrganizer = info.organizer_id === user.id;
            const isOpen = info.status === 'OPEN';
            
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
                    ${isOpen ? `<div class="t-action-area">${this.renderActionArea(info, isOrganizer, participants.length)}</div>` : ''}

                    <!-- Tabs -->
                    ${!isOpen ? `
                        <div class="t-tabs" style="margin-bottom:15px;">
                            <button class="t-tab ${this.activeDetailTab==='STANDINGS'?'active':''}" id="tab-standings">المجموعات</button>
                            <button class="t-tab ${this.activeDetailTab==='FIXTURES'?'active':''}" id="tab-fixtures">المباريات</button>
                        </div>
                    ` : ''}

                    <!-- Content -->
                    <div class="t-content-body">
                        ${isOpen 
                            ? this.renderParticipantsList(participants) 
                            : (this.activeDetailTab === 'STANDINGS' 
                                ? this.renderStandings(participants) 
                                : this.renderFixtures(fixtures, isOrganizer)) 
                        }
                    </div>
                </div>
            `;

            // Bind Events
            document.getElementById('btn-back-tourn').onclick = () => this.initTournamentView();

            if (isOpen) {
                const actionBtn = document.getElementById('btn-action-main');
                if (actionBtn) {
                    actionBtn.onclick = () => {
                        if (isOrganizer) this.handleStartDraw(tournamentId);
                        else this.handleJoin(tournamentId);
                    };
                }
            } else {
                document.getElementById('tab-standings').onclick = () => { this.activeDetailTab = 'STANDINGS'; this.openTournamentDetails(tournamentId); };
                document.getElementById('tab-fixtures').onclick = () => { this.activeDetailTab = 'FIXTURES'; this.openTournamentDetails(tournamentId); };
            }

            if (!isOpen && this.activeDetailTab === 'FIXTURES' && isOrganizer) {
                container.querySelectorAll('.btn-referee').forEach(btn => {
                    btn.onclick = () => this.openRefereeModal(btn.dataset.id, btn.dataset.ta, btn.dataset.tb, info.id);
                });
            }

        } catch (e) {
            console.error(e);
            container.innerHTML = `<p class="error-text">خطأ: ${e.message}</p><button onclick="window.location.reload()">تحديث</button>`;
        }
    }

    renderActionArea(info, isOrganizer, count) {
        const max = info.config.max_teams;
        const ready = count >= 4; 
        if (isOrganizer) {
            return `
                <div class="organizer-controls">
                    <div class="counter-box"><span class="num">${count}/${max}</span> فرق</div>
                    <button id="btn-action-main" class="btn-primary-gold" ${!ready?'disabled':''} style="${!ready?'opacity:0.5':''}">
                        <i class="fa-solid fa-shuffle"></i> إجراء القرعة وبدء الدورة
                    </button>
                    ${!ready ? '<p class="hint-text">مطلوب 4 فرق على الأقل للبدء</p>' : ''}
                </div>`;
        }
        return `<button id="btn-action-main" class="btn-primary-gold"><i class="fa-solid fa-user-plus"></i> تسجيل فريقي</button>`;
    }

    renderParticipantsList(teams) {
        if (teams.length === 0) return `<div class="empty-state"><p>لم ينضم أحد بعد.</p></div>`;
        return `
            <div class="teams-grid">
                ${teams.map(t => `
                    <div class="team-mini-card">
                        <div class="team-icon" style="background:${t.teams.logo_dna?.primary || '#333'}"><i class="fa-solid fa-shield-cat"></i></div>
                        <span>${t.teams.name}</span>
                    </div>`).join('')}
            </div>`;
    }

    renderStandings(teams) {
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
                            <thead><tr><th>الفريق</th><th>لعب</th><th>+/-</th><th>ن</th></tr></thead>
                            <tbody>
                                ${groupTeams.map((t, idx) => `
                                    <tr class="${idx < 2 ? 'qualified' : ''}">
                                        <td class="team-cell"><span class="rank">${idx + 1}</span> ${t.teams.name}</td>
                                        <td>${t.played}</td><td>${t.goal_diff}</td><td class="pts">${t.points}</td>
                                    </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>`;
            }
        });
        return html || '<p>جاري تحديث الجداول...</p>';
    }

    renderFixtures(matches, isOrganizer) {
        if (!matches || matches.length === 0) return '<div class="empty-state"><p>جاري جدولة المباريات...</p></div>';
        
        const rounds = {};
        matches.forEach(m => {
            const r = m.match_data.round;
            if(!rounds[r]) rounds[r] = [];
            rounds[r].push(m);
        });

        let html = '<div class="fixtures-container">';
        Object.keys(rounds).forEach(r => {
            html += `<h4 class="round-title">الجولة ${r}</h4>`;
            rounds[r].forEach(m => {
                const isFinished = m.status === 'FINISHED';
                html += `
                    <div class="fixture-card">
                        <div class="fix-team"><span>${m.team_a.name}</span></div>
                        <div class="fix-score ${isFinished ? 'final' : ''}">
                            ${isFinished ? `${m.score_a} - ${m.score_b}` : 'VS'}
                        </div>
                        <div class="fix-team"><span>${m.team_b.name}</span></div>
                        
                        ${(isOrganizer && !isFinished) ? `
                            <button class="btn-referee" data-id="${m.id}" data-ta="${m.team_a.name}" data-tb="${m.team_b.name}">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        ` : ''}
                        
                        <div class="fix-meta group-pill">${m.match_data.group}</div>
                    </div>`;
            });
        });
        html += '</div>';
        return html;
    }

    openRefereeModal(matchId, teamA, teamB, tournamentId) {
        const modalId = 'modal-referee';
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box match-console">
                        <div class="modal-header"><h3><i class="fa-solid fa-whistle"></i> تحكيم</h3><button class="close-btn" id="btn-close-ref">&times;</button></div>
                        <div style="text-align:center; margin-bottom:20px;">
                            <p class="text-muted">أدخل النتيجة النهائية</p>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                                <div style="flex:1;"><strong id="ref-team-a"></strong></div>
                                <div style="width:20px;">-</div>
                                <div style="flex:1;"><strong id="ref-team-b"></strong></div>
                            </div>
                            <div style="display:flex; gap:10px; margin-top:10px;">
                                <input type="number" id="ref-score-a" class="score-inp" value="0">
                                <input type="number" id="ref-score-b" class="score-inp" value="0">
                            </div>
                        </div>
                        <button id="btn-confirm-score" class="btn-primary">اعتماد وتحديث الجدول</button>
                    </div>
                </div>`);
            document.getElementById('btn-close-ref').onclick = () => document.getElementById(modalId).classList.add('hidden');
        }

        document.getElementById('ref-team-a').textContent = teamA;
        document.getElementById('ref-team-b').textContent = teamB;
        document.getElementById('ref-score-a').value = 0;
        document.getElementById('ref-score-b').value = 0;

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        const oldBtn = document.getElementById('btn-confirm-score');
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);

        newBtn.onclick = async () => {
            const btn = document.getElementById('btn-confirm-score');
            const sa = parseInt(document.getElementById('ref-score-a').value);
            const sb = parseInt(document.getElementById('ref-score-b').value);
            
            if(!confirm(`تأكيد النتيجة: ${teamA} (${sa}) - (${sb}) ${teamB} ؟`)) return;

            btn.disabled = true; btn.textContent = "جاري الحساب...";
            try {
                await this.service.submitMatchResult(matchId, sa, sb);
                SoundManager.play('whistle');
                alert("تم التحديث! النقاط أضيفت للجدول.");
                modal.classList.add('hidden');
                // Auto Refresh to show changes
                this.openTournamentDetails(tournamentId); 
            } catch(e) {
                alert("خطأ: " + e.message);
                btn.disabled = false; btn.textContent = "اعتماد";
            }
        };
    }

    /* --- HANDLERS --- */
    async handleJoin(tournamentId) {
        if(!confirm("تسجيل الفريق؟")) return;
        try { await this.service.joinTournament(tournamentId, state.getUser().id); SoundManager.play('success'); this.openTournamentDetails(tournamentId); }
        catch (e) { alert(e.message); }
    }

    async handleStartDraw(tournamentId) {
        if(!confirm("بدء القرعة والمباريات؟")) return;
        try { await this.service.startTournament(tournamentId); SoundManager.play('whistle'); alert("تمت الجدولة!"); this.openTournamentDetails(tournamentId); }
        catch (e) { alert(e.message); }
    }

    /* --- CREATE MODAL --- */
    openCreateModal() {
        const modalId = 'modal-create-tourn';
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header"><h3>دورة جديدة</h3><button class="close-btn" id="btn-close-tm">&times;</button></div>
                        <form id="form-create-tourn">
                            <div class="form-group"><label>الاسم</label><input type="text" id="inp-t-name" required></div>
                            <div class="form-group"><label>النظام</label><select id="inp-t-type"><option value="GROUPS">مجموعات</option></select></div>
                            <div class="form-group"><label>عدد الفرق</label><select id="inp-t-count"><option value="8">8</option><option value="16" selected>16</option></select></div>
                            <button type="submit" class="btn-primary">إنشاء</button>
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
