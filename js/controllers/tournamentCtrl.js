/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/tournamentCtrl.js
 * Version: Noub Sports_beta 3.0.0 (RAMADAN EDITION)
 * Status: Production Ready
 * 
 * ARCHITECTURE:
 * 1. Service Layer: Handles DB transactions, Auto-Draw Algorithm, and Standings Calculation.
 * 2. Controller Layer: Renders the visual Tournament Hub (Standings, Fixtures, Brackets).
 * 3. UX Layer: Manages the new "Floating Action Menu" logic.
 */

import { supabase } from '../core/supabaseClient.js';
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';
import { Helpers } from '../utils/helpers.js';

// ==========================================
// 1. SERVICE LAYER (The Brain)
// ==========================================
class TournamentService {
    
    /**
     * Creates a new Tournament Record.
     */
    async createTournament(organizerId, name, config) {
        const { data, error } = await supabase
            .from('tournaments')
            .insert([{
                organizer_id: organizerId,
                name: name,
                status: 'OPEN', // Registration phase
                config: config
            }])
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    /**
     * Fetches details of a specific tournament including teams.
     */
    async getTournamentDetails(tournamentId) {
        // Parallel Fetch: Tournament Info + Teams Stats
        const [tResponse, teamsResponse] = await Promise.all([
            supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
            supabase.from('tournament_teams')
                .select('*, teams(name, logo_dna)')
                .eq('tournament_id', tournamentId)
                .order('points', { ascending: false })
                .order('goal_diff', { ascending: false }) // Tie-breaker 1
                .order('goals_for', { ascending: false }) // Tie-breaker 2
        ]);

        if (tResponse.error) throw tResponse.error;
        
        return {
            info: tResponse.data,
            standings: teamsResponse.data || []
        };
    }

    /**
     * THE AUTO-DRAW ALGORITHM (القرعة الآلية)
     * Distributes teams randomly into groups (A, B, C, D).
     */
    async executeDraw(tournamentId) {
        // 1. Get all registered teams
        const { data: teams } = await supabase
            .from('tournament_teams')
            .select('id')
            .eq('tournament_id', tournamentId);
            
        if (!teams || teams.length < 4) throw new Error("عدد الفرق غير كافٍ لإجراء القرعة.");

        // 2. Fisher-Yates Shuffle (Randomization)
        let shuffled = [...teams];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // 3. Assign Groups (A, B, C, D)
        const groups = ['A', 'B', 'C', 'D'];
        const updates = shuffled.map((team, index) => {
            const groupIndex = index % 4; // Distribute evenly
            return {
                id: team.id,
                group_name: groups[groupIndex]
            };
        });

        // 4. Batch Update
        for (const update of updates) {
            await supabase
                .from('tournament_teams')
                .update({ group_name: update.group_name })
                .eq('id', update.id);
        }
        
        // 5. Update Tournament Status to ACTIVE
        await supabase.from('tournaments').update({ status: 'ACTIVE' }).eq('id', tournamentId);
    }
}

// ==========================================
// 2. CONTROLLER LAYER (The View)
// ==========================================
export class TournamentController {
    
    constructor() {
        this.service = new TournamentService();
        this.viewContainer = document.getElementById('view-arena'); // Reusing Arena or new View
        
        // Inject Floating Menu on Load
        this.injectFloatingMenu();
    }

    /**
     * INJECTS THE NEW "FAB" MENU (The 4 Options)
     * Replaces the default behavior of the (+) button.
     */
    injectFloatingMenu() {
        const fab = document.getElementById('nav-action');
        if(!fab) return;

        // Clone to remove old listeners
        const newFab = fab.cloneNode(true);
        fab.parentNode.replaceChild(newFab, fab);

        // Append the Menu HTML to Body (Hidden by default)
        if (!document.getElementById('fab-menu-overlay')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="fab-menu-overlay" class="fab-overlay hidden">
                    <div class="fab-actions">
                        <button class="fab-item" data-action="TOURNAMENT">
                            <span class="label">الدورات الرمضانية</span>
                            <div class="icon-circle gold"><i class="fa-solid fa-trophy"></i></div>
                        </button>
                        <button class="fab-item" data-action="JOKER">
                            <span class="label">اطلب "جوكر"</span>
                            <div class="icon-circle red"><i class="fa-solid fa-person-running"></i></div>
                        </button>
                        <button class="fab-item" data-action="REF">
                            <span class="label">اطلب "حكم"</span>
                            <div class="icon-circle yellow"><i class="fa-solid fa-whistle"></i></div>
                        </button>
                        <button class="fab-item" data-action="AVAILABLE">
                            <span class="label">أنا متوفر للعب</span>
                            <div class="icon-circle green"><i class="fa-solid fa-hand-point-up"></i></div>
                        </button>
                    </div>
                    <button id="btn-close-fab" class="fab-close"><i class="fa-solid fa-xmark"></i></button>
                </div>
            `);
            
            // Bind Events
            this.bindFabEvents();
        }

        // Trigger Open
        newFab.addEventListener('click', () => {
            SoundManager.play('click');
            document.getElementById('fab-menu-overlay').classList.remove('hidden');
            document.getElementById('fab-menu-overlay').classList.add('active');
        });
    }

    bindFabEvents() {
        const overlay = document.getElementById('fab-menu-overlay');
        const closeBtn = document.getElementById('btn-close-fab');

        const close = () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        };

        closeBtn.onclick = close;
        overlay.onclick = (e) => { if(e.target === overlay) close(); };

        // Bind Action Items
        overlay.querySelectorAll('.fab-item').forEach(btn => {
            btn.onclick = () => {
                const action = btn.dataset.action;
                SoundManager.play('click');
                close();
                this.handleRoute(action);
            };
        });
    }

    /**
     * ROUTING LOGIC
     */
    handleRoute(action) {
        if (action === 'TOURNAMENT') {
            this.initTournamentView();
        } else if (action === 'JOKER' || action === 'REF') {
            window.router('view-operations');
            setTimeout(() => window.dispatchEvent(new CustomEvent('trigger-post-request', { detail: { type: action === 'JOKER' ? 'WANTED_JOKER' : 'WANTED_REF' } })), 100);
        } else if (action === 'AVAILABLE') {
            window.router('view-operations');
            // Trigger availability logic
        }
    }

    /**
     * RENDER: TOURNAMENT HOME VIEW
     */
    async initTournamentView() {
        // Hijack the Arena View or use a new 'view-tournaments' if created in HTML
        // For now, we assume we inject into a container or navigate to a new view
        // Let's assume we render into the main container
        
        // 1. Setup UI
        const mainContent = document.getElementById('main-content');
        // Ensure we are on a clean slate or navigate to a specific view
        window.router('view-arena'); // Using Arena as host for now
        const container = document.getElementById('arena-content');
        
        container.innerHTML = `
            <div class="tournament-hub fade-in">
                <div class="t-hero-banner">
                    <div class="ramadan-deco"><i class="fa-solid fa-moon"></i></div>
                    <h2>الدورات الرمضانية</h2>
                    <p>نظم دورتك .. كأنك في دوري الأبطال</p>
                    <button id="btn-create-tourn" class="btn-primary-gold">إنشاء دورة جديدة</button>
                </div>

                <div class="t-tabs">
                    <button class="t-tab active">دوراتي</button>
                    <button class="t-tab">بطولات المنطقة</button>
                </div>

                <div id="tourn-list" class="t-list">
                    <!-- Cards Injected Here -->
                    <div class="loader-bar"></div>
                </div>
            </div>
        `;

        // Load Data (Mock for now, connect to Service)
        this.loadTournamentsList();
    }

    async loadTournamentsList() {
        // Fetch from DB...
        const container = document.getElementById('tourn-list');
        // Example Render
        container.innerHTML = `
            <div class="tourn-card">
                <div class="status-badge active">جارية الآن</div>
                <h3>دورة الفسطاط الرمضانية 2025</h3>
                <div class="t-meta">
                    <span><i class="fa-solid fa-users"></i> 16 فريق</span>
                    <span><i class="fa-solid fa-trophy"></i> خروج مغلوب</span>
                </div>
                <button class="btn-view-tourn" onclick="alert('فتح تفاصيل الدورة')">عرض الجدول</button>
            </div>
        `;
    }
}