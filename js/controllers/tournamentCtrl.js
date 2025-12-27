/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/tournamentCtrl.js
 * Version: Noub Sports_beta 5.1.0 (FUNCTIONAL LOGIC)
 * Status: Production Ready
 * 
 * ARCHITECTURE OVERVIEW:
 * 1. Service Layer: Handles DB communication (Create, Fetch List, Fetch Details).
 * 2. Controller Layer:
 *    - FAB Injection: Manages the floating menu.
 *    - View Rendering: Builds the Tournament Hub.
 *    - Modal System: Handles the "Create Tournament" form dynamically.
 *    - Data Binding: Fetches real data and renders tournament cards.
 */

import { supabase } from '../core/supabaseClient.js';
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';
import { Helpers } from '../utils/helpers.js';

// ==========================================
// 1. SERVICE LAYER (DATABASE LOGIC)
// ==========================================
class TournamentService {
    
    /**
     * Creates a new Tournament in the DB.
     * @param {string} organizerId - The User ID creating the tournament.
     * @param {Object} formData - { name, type, teamsCount, entryFee }
     */
    async createTournament(organizerId, formData) {
        // Construct the config JSON
        const config = {
            type: formData.type, // 'LEAGUE' or 'GROUPS'
            max_teams: formData.teamsCount,
            entry_fee: formData.entryFee || 0
        };

        const { data, error } = await supabase
            .from('tournaments')
            .insert([{
                organizer_id: organizerId,
                name: formData.name,
                status: 'OPEN', // Starts as OPEN for registration
                config: config,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    /**
     * Fetches Tournaments relevant to the user's zone.
     * Filters: Can be 'MY_TOURNAMENTS' (Organizer) or 'ZONE' (Public).
     */
    async getTournaments(filter, userId, zoneId) {
        let query = supabase
            .from('tournaments')
            .select(`
                *,
                organizer:users!organizer_id (username)
            `)
            .order('created_at', { ascending: false });

        if (filter === 'MY') {
            query = query.eq('organizer_id', userId);
        } else {
            // For public, we might filter by Zone logic if tables allow, 
            // for MVP we fetch all OPEN/ACTIVE tournaments.
            query = query.neq('status', 'ARCHIVED'); 
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }
}

// ==========================================
// 2. CONTROLLER LAYER (UI LOGIC)
// ==========================================
export class TournamentController {
    
    constructor() {
        this.service = new TournamentService();
        // We target the dedicated container we created in index.html
        this.containerId = 'tourn-content'; 
        
        // Internal State
        this.currentFilter = 'MY'; // 'MY' or 'ALL'

        // Start the FAB Injection immediately
        this.injectFloatingMenu();
    }

    /* ----------------------------------------------------
       PART A: FAB MENU LOGIC (The Entry Point)
       ---------------------------------------------------- */
    injectFloatingMenu() {
        const fab = document.getElementById('nav-action');
        if(!fab) return;

        // Clone to remove old listeners (Safety measure)
        const newFab = fab.cloneNode(true);
        fab.parentNode.replaceChild(newFab, fab);

        // Inject HTML for the Menu Overlay if missing
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
            this.bindFabEvents();
        }

        // Trigger Open
        newFab.addEventListener('click', () => {
            SoundManager.play('click');
            const overlay = document.getElementById('fab-menu-overlay');
            overlay.classList.remove('hidden');
            // Timeout to allow CSS transition to catch the display:flex
            setTimeout(() => overlay.classList.add('active'), 10);
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

    handleRoute(action) {
        if (action === 'TOURNAMENT') {
            this.initTournamentView();
        } else if (action === 'JOKER' || action === 'REF') {
            window.router('view-operations');
            setTimeout(() => window.dispatchEvent(new CustomEvent('trigger-post-request', { detail: { type: action === 'JOKER' ? 'WANTED_JOKER' : 'WANTED_REF' } })), 100);
        } else if (action === 'AVAILABLE') {
            window.router('view-operations');
            // Trigger availability logic via Ops Controller (future expansion)
        }
    }

    /* ----------------------------------------------------
       PART B: TOURNAMENT HUB RENDERING
       ---------------------------------------------------- */
    async initTournamentView() {
        // 1. Switch View
        window.router('view-tournaments'); 
        
        const container = document.getElementById(this.containerId);
        if(!container) return;

        // 2. Render Skeleton
        container.innerHTML = `
            <div class="tournament-hub fade-in">
                <!-- Hero Section -->
                <div class="t-hero-banner">
                    <div class="ramadan-deco"><i class="fa-solid fa-moon"></i></div>
                    <h2>الدورات الرمضانية</h2>
                    <p>نظم دورتك .. كأنك في دوري الأبطال</p>
                    <button id="btn-create-tourn" class="btn-primary-gold">
                        <i class="fa-solid fa-plus"></i> إنشاء دورة جديدة
                    </button>
                </div>

                <!-- Tabs -->
                <div class="t-tabs">
                    <button class="t-tab active" data-filter="MY">دوراتي</button>
                    <button class="t-tab" data-filter="ALL">بطولات المنطقة</button>
                </div>

                <!-- List Container -->
                <div id="tourn-list" class="t-list">
                    <div class="loader-bar" style="margin: 20px auto;"></div>
                </div>
            </div>
        `;

        // 3. Bind Internal Events (Create & Tabs)
        this.bindHubEvents();

        // 4. Load Initial Data
        this.loadTournamentsList();
    }

    bindHubEvents() {
        // Create Button
        document.getElementById('btn-create-tourn').onclick = () => {
            this.openCreateModal();
        };

        // Tabs
        const tabs = document.querySelectorAll('.t-tab');
        tabs.forEach(tab => {
            tab.onclick = (e) => {
                SoundManager.play('click');
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                this.currentFilter = e.target.dataset.filter;
                this.loadTournamentsList();
            };
        });
    }

    /* ----------------------------------------------------
       PART C: DATA LOADING & LISTING
       ---------------------------------------------------- */
    async loadTournamentsList() {
        const listContainer = document.getElementById('tourn-list');
        listContainer.innerHTML = '<div class="loader-bar" style="margin: 20px auto;"></div>';

        try {
            const user = state.getUser();
            const tournaments = await this.service.getTournaments(this.currentFilter, user.id, user.zoneId);

            if (tournaments.length === 0) {
                listContainer.innerHTML = `
                    <div class="empty-state" style="text-align:center; padding:30px; opacity:0.7;">
                        <i class="fa-solid fa-trophy" style="font-size:3rem; margin-bottom:10px; color:#555;"></i>
                        <p class="text-muted">لا توجد دورات حالياً.</p>
                        ${this.currentFilter === 'MY' ? '<small>أنشئ دورتك الأولى الآن!</small>' : ''}
                    </div>`;
                return;
            }

            listContainer.innerHTML = tournaments.map(t => this.renderTournamentCard(t)).join('');

        } catch (err) {
            console.error(err);
            listContainer.innerHTML = '<p class="error-text">فشل تحميل القائمة.</p>';
        }
    }

    renderTournamentCard(t) {
        // Badge Logic
        let statusClass = '';
        let statusText = '';
        if (t.status === 'OPEN') { statusClass = 'status-open'; statusText = 'مفتوحة للتسجيل'; }
        else if (t.status === 'ACTIVE') { statusClass = 'status-active'; statusText = 'جارية الآن'; }
        else { statusClass = 'status-ended'; statusText = 'منتهية'; }

        return `
            <div class="tourn-card">
                <div class="status-badge ${t.status === 'ACTIVE' ? 'active' : ''}" style="
                    background: ${t.status === 'OPEN' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(16, 185, 129, 0.15)'};
                    color: ${t.status === 'OPEN' ? '#fbbf24' : '#10b981'};">
                    ${statusText}
                </div>
                <h3>${t.name}</h3>
                <div class="t-meta">
                    <span><i class="fa-solid fa-users"></i> ${t.config?.max_teams || 16} فريق</span>
                    <span><i class="fa-solid fa-sitemap"></i> ${t.config?.type === 'GROUPS' ? 'مجموعات' : 'دوري'}</span>
                </div>
                <button class="btn-view-tourn" onclick="alert('تفاصيل الدورة (قريباً)')">
                    <i class="fa-solid fa-eye"></i> عرض التفاصيل
                </button>
            </div>
        `;
    }

    /* ----------------------------------------------------
       PART D: CREATE MODAL LOGIC
       ---------------------------------------------------- */
    openCreateModal() {
        SoundManager.play('click');
        const modalId = 'modal-create-tourn';

        // Lazy Load DOM
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header">
                            <h3>تنظيم دورة جديدة</h3>
                            <button class="close-btn" id="btn-close-tm">&times;</button>
                        </div>
                        <form id="form-create-tourn">
                            <div class="form-group">
                                <label>اسم الدورة</label>
                                <input type="text" id="inp-t-name" placeholder="مثال: دورة الفسطاط الرمضانية" required>
                            </div>
                            <div class="form-group">
                                <label>نظام البطولة</label>
                                <select id="inp-t-type">
                                    <option value="GROUPS">مجموعات + خروج مغلوب (دوري أبطال)</option>
                                    <option value="LEAGUE">دوري (تجميع نقاط)</option>
                                    <option value="KNOCKOUT">خروج مغلوب مباشر (كأس)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>عدد الفرق</label>
                                <select id="inp-t-count">
                                    <option value="8">8 فرق</option>
                                    <option value="16" selected>16 فريق</option>
                                    <option value="32">32 فريق</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>رسم الاشتراك (للفريق) - اختياري</label>
                                <input type="number" id="inp-t-fee" placeholder="0" min="0">
                            </div>
                            <button type="submit" class="btn-primary">إنشاء وإطلاق</button>
                        </form>
                    </div>
                </div>
            `);

            // Close Logic
            document.getElementById('btn-close-tm').onclick = () => {
                document.getElementById(modalId).classList.add('hidden');
            };

            // Submit Logic
            document.getElementById('form-create-tourn').onsubmit = (e) => this.handleCreateSubmit(e, modalId);
        }

        document.getElementById(modalId).classList.remove('hidden');
    }

    async handleCreateSubmit(e, modalId) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        
        btn.disabled = true;
        btn.textContent = "جاري الإنشاء...";

        const formData = {
            name: document.getElementById('inp-t-name').value,
            type: document.getElementById('inp-t-type').value,
            teamsCount: parseInt(document.getElementById('inp-t-count').value),
            entryFee: parseInt(document.getElementById('inp-t-fee').value || 0)
        };

        try {
            const user = state.getUser();
            await this.service.createTournament(user.id, formData);
            
            SoundManager.play('success');
            alert("تم إنشاء الدورة بنجاح! يمكنك الآن دعوة الفرق.");
            
            document.getElementById(modalId).classList.add('hidden');
            // Refresh List
            this.currentFilter = 'MY';
            // Update Tab UI manually to match filter
            document.querySelectorAll('.t-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('.t-tab[data-filter="MY"]').classList.add('active');
            
            this.loadTournamentsList();

        } catch (err) {
            SoundManager.play('error');
            alert("حدث خطأ: " + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}
