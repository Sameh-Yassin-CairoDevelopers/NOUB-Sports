/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/operationsCtrl.js
 * Version: 1.1.0 (STABILITY FIX)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * This controller manages the dedicated "Operations Room" View (view-operations).
 * 
 * [CRITICAL FIX v1.1.0]:
 * - Implemented "Defensive Rendering" in loadFeed().
 * - Solved the crash occurring when accessing via Deep Links (Side Menu).
 * - Ensures DOM elements exist before attempting manipulation.
 * -----------------------------------------------------------------------------
 */

import { EmergencyService } from '../services/emergencyService.js';
import { TeamService } from '../services/teamService.js';
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';
import { Helpers } from '../utils/helpers.js';

export class OperationsController {
    
    /**
     * Constructor: Initializes Services and State.
     * Sets up the global event listener for cross-module communication.
     */
    constructor() {
        this.emergencyService = new EmergencyService();
        this.teamService = new TeamService(); // Needed to check Captaincy
        
        this.viewContainer = document.getElementById('view-operations');
        this.currentFilter = 'ALL'; // Default filter state
        
        // BIND DEEP LINK LISTENER
        // Allows Side Menu to trigger actions.
        window.addEventListener('trigger-post-request', (e) => {
            const { type } = e.detail;
            console.log(`🚨 Ops: Deep Link Triggered for ${type}`);
            
            // [FIX]: Ensure layout exists before opening modal visually
            this.ensureLayoutRendered();
            
            this.openPostModal(type);
        });
        
        console.log("🚨 Operations Controller: Online.");
    }

    /**
     * Main Initialization Logic.
     * Called manually or by Router.
     */
    async init() {
        const user = state.getUser();
        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول للوصول لغرفة العمليات.</div>`;
            return;
        }

        // 1. Render Skeleton Layout
        this.renderLayout();

        // 2. Load Data (Feed)
        await this.loadFeed(user.zoneId);
    }

    /**
     * [HELPER]: Ensures the static layout exists in the DOM.
     * Prevents null pointer errors when accessing via Deep Links.
     */
    ensureLayoutRendered() {
        // Check if the feed container exists. If not, render the whole layout.
        if (!document.getElementById('ops-feed-container')) {
            console.log("🚨 Ops: Layout missing, forcing render...");
            this.renderLayout();
            // Optionally fetch background data silently
            const user = state.getUser();
            if(user) this.loadFeed(user.zoneId);
        }
    }

    /**
     * Renders the Static Skeleton of the Operations Room.
     * Includes Header, Filter Chips, and Feed Container.
     */
    renderLayout() {
        this.viewContainer.innerHTML = `
            <div class="ops-container fade-in" style="padding: 20px 15px; padding-bottom: 100px;">
                
                <!-- A. Header Section -->
                <div class="ops-header" style="margin-bottom: 25px; text-align: center;">
                    <h2 class="text-gold" style="font-family: var(--font-sport); font-size: 1.8rem; margin-bottom: 5px;">
                        <i class="fa-solid fa-tower-broadcast"></i> غرفة العمليات
                    </h2>
                    <p class="text-muted" style="font-size: 0.85rem;">سوق الانتقالات الفوري للمباريات</p>
                </div>

                <!-- B. Filter Chips (Tabs) -->
                <div class="ops-filters" style="display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 5px;">
                    <button class="filter-chip active" data-filter="ALL" style="flex:1; background: var(--gold-main); color: #000; border: none; padding: 10px; border-radius: 12px; font-weight: bold;">الكل</button>
                    <button class="filter-chip" data-filter="WANTED_JOKER" style="flex:1; background: #222; color: #aaa; border: 1px solid #333; padding: 10px; border-radius: 12px;">جوكر</button>
                    <button class="filter-chip" data-filter="WANTED_REF" style="flex:1; background: #222; color: #aaa; border: 1px solid #333; padding: 10px; border-radius: 12px;">حكم</button>
                </div>

                <!-- C. The Feed Container -->
                <div id="ops-feed-container" style="display: flex; flex-direction: column; gap: 15px; min-height: 300px;">
                    <div class="loader-bar" style="margin: 20px auto;"></div>
                </div>

                <!-- D. Floating Action Button (FAB) for Manual Posting -->
                <button id="btn-fab-post" style="
                    position: fixed; bottom: 95px; left: 20px;
                    width: 55px; height: 55px; border-radius: 50%;
                    background: var(--danger); color: #fff; border: none;
                    box-shadow: 0 5px 20px rgba(239, 68, 68, 0.4);
                    font-size: 1.5rem; display: flex; justify-content: center; align-items: center;
                    z-index: 100;">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        `;

        // Bind Events
        this.bindEvents();
    }

    /**
     * Binds click events for Filters and Actions.
     */
    bindEvents() {
        // Filter Logic
        this.viewContainer.querySelectorAll('.filter-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                // UI Toggle
                this.viewContainer.querySelectorAll('.filter-chip').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#222';
                    b.style.color = '#aaa';
                });
                e.target.classList.add('active');
                e.target.style.background = 'var(--gold-main)';
                e.target.style.color = '#000';

                // Data Reload
                this.currentFilter = e.target.dataset.filter;
                this.loadFeed(state.getUser().zoneId);
            });
        });

        // FAB Button Logic
        const fab = document.getElementById('btn-fab-post');
        if (fab) {
            fab.onclick = () => this.showPostOptions();
        }
    }

    /**
     * CORE: Data Fetching & Rendering.
     * [FIXED]: Includes safety check for DOM container.
     */
    async loadFeed(zoneId) {
        // SAFETY CHECK: Ensure layout exists before selecting container
        this.ensureLayoutRendered();

        const container = document.getElementById('ops-feed-container');
        
        // Double check to prevent race condition crashes
        if (!container) return; 

        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';

        try {
            // 1. Fetch from Service
            const allRequests = await this.emergencyService.getActiveRequests(zoneId);
            
            // 2. Filter Client-Side
            let filtered = allRequests;
            if (this.currentFilter !== 'ALL') {
                filtered = allRequests.filter(r => r.type === this.currentFilter);
            }

            // 3. Render
            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-radar" style="font-size:3rem; color:#333; margin-bottom:10px;"></i>
                        <p class="text-muted">المنطقة هادئة. لا توجد طلبات نشطة.</p>
                    </div>`;
                return;
            }

            container.innerHTML = filtered.map(req => this.renderMissionCard(req)).join('');

            // 4. Bind Accept Buttons
            this.bindCardActions();

        } catch (err) {
            console.error(err);
            if (container) container.innerHTML = `<p class="error-text">فشل الاتصال بغرفة العمليات.</p>`;
        }
    }

    /**
     * COMPONENT: Generates HTML for a Single Request Card.
     */
    renderMissionCard(req) {
        const isJoker = req.type === 'WANTED_JOKER';
        const isRef = req.type === 'WANTED_REF';
        const isAvailable = req.type === 'I_AM_AVAILABLE';
        
        // Theme Config
        const theme = {
            icon: isJoker ? 'fa-person-running' : (isRef ? 'fa-scale-balanced' : 'fa-hand-point-up'),
            color: isJoker ? '#ef4444' : (isRef ? '#fbbf24' : '#10b981'),
            title: isJoker ? 'مهمة: لاعب جوكر' : (isRef ? 'مهمة: حكم ساحة' : 'عرض توفر'),
            btnText: isAvailable ? 'استدعاء للكابتن' : 'قبول المهمة'
        };

        // Time Formatting
        const timeStr = new Date(req.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
        const isMine = req.requester.username === state.getUser().username; 

        return `
            <div class="ops-card" style="
                background: linear-gradient(145deg, rgba(255,255,255,0.03), rgba(0,0,0,0.4));
                border-right: 4px solid ${theme.color};
                border-radius: 12px; padding: 15px; position: relative;">
                
                <!-- Header -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <div style="width:35px; height:35px; background:${theme.color}20; color:${theme.color}; border-radius:50%; display:flex; justify-content:center; align-items:center;">
                            <i class="fa-solid ${theme.icon}"></i>
                        </div>
                        <div>
                            <h4 style="color:#fff; font-size:0.95rem; margin:0;">${theme.title}</h4>
                            <span class="text-muted" style="font-size:0.7rem;">${req.requester.username} • ${timeStr}</span>
                        </div>
                    </div>
                </div>

                <!-- Body Details -->
                <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:10px;">
                    ${!isAvailable ? `
                        <div style="display:flex; gap:15px; font-size:0.85rem; color:#ccc;">
                            <span><i class="fa-solid fa-clock text-gold"></i> ${new Date(req.match_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span> 
                            <span><i class="fa-solid fa-location-dot text-gold"></i> ${req.venue_name}</span>
                        </div>
                        <div style="margin-top:8px; font-size:0.9rem; color:#fff; font-weight:bold;">
                            ${req.details.teams}
                        </div>
                    ` : `
                        <p style="color:#fff; margin:0;">
                            أنا متاح للعب اليوم في مركز: <span style="color:${theme.color}; font-weight:bold;">${req.details.position}</span>
                        </p>
                    `}
                </div>

                <!-- Action Button -->
                ${!isMine ? `
                    <button class="btn-accept-req" data-id="${req.id}" style="
                        width:100%; padding:10px; border:none; border-radius:8px;
                        background: ${theme.color}; color: #000; font-weight:bold; cursor:pointer;
                        display:flex; justify-content:center; align-items:center; gap:8px;">
                        ${isAvailable ? '<i class="fa-solid fa-phone"></i> استدعاء' : '<i class="fa-solid fa-check"></i> قبول المهمة'}
                    </button>
                ` : `<div style="text-align:center; font-size:0.75rem; color:#666;">(طلبك الخاص)</div>`}
            </div>
        `;
    }

    /**
     * Bind Accept Buttons inside the feed.
     */
    bindCardActions() {
        this.viewContainer.querySelectorAll('.btn-accept-req').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reqId = e.target.closest('button').dataset.id;
                this.handleAccept(reqId);
            });
        });
    }

    /* =========================================================================
       SECTION 2: POSTING WORKFLOW (MODALS)
       ========================================================================= */

    /**
     * Shows a selection menu (Action Sheet) for the FAB.
     */
    showPostOptions() {
        const modalId = 'modal-post-select';
        
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden" style="align-items:flex-end;">
                    <div class="modal-box" style="border-radius:20px 20px 0 0; padding-bottom:40px;">
                        <h3 style="text-align:center; color:#fff; margin-bottom:20px;">ماذا تريد أن تنشر؟</h3>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <button class="action-btn-large" id="btn-sel-joker" style="justify-content:center; border-color:#ef4444; color:#ef4444;">
                                <i class="fa-solid fa-person-running"></i> اطلب لاعب "جوكر"
                            </button>
                            <button class="action-btn-large" id="btn-sel-ref" style="justify-content:center; border-color:#fbbf24; color:#fbbf24;">
                                <i class="fa-solid fa-whistle"></i> اطلب "حكم ساحة"
                            </button>
                            <button class="action-btn-large" id="btn-sel-ready" style="justify-content:center; border-color:#10b981; color:#10b981;">
                                <i class="fa-solid fa-hand-point-up"></i> أنا متاح للعب
                            </button>
                        </div>
                    </div>
                </div>
            `);

            document.getElementById(modalId).addEventListener('click', (e) => {
                if(e.target.id === modalId) document.getElementById(modalId).classList.add('hidden');
            });

            document.getElementById('btn-sel-joker').onclick = () => { document.getElementById(modalId).classList.add('hidden'); this.openPostModal('WANTED_JOKER'); };
            document.getElementById('btn-sel-ref').onclick = () => { document.getElementById(modalId).classList.add('hidden'); this.openPostModal('WANTED_REF'); };
            document.getElementById('btn-sel-ready').onclick = () => { document.getElementById(modalId).classList.add('hidden'); this.postAvailabilityFlow(); };
        }

        document.getElementById(modalId).classList.remove('hidden');
    }

    /**
     * Opens the Input Modal to Create a Request.
     */
    openPostModal(type) {
        const modalId = 'modal-ops-post';
        const title = type === 'WANTED_JOKER' ? 'طلب لاعب جوكر' : 'طلب حكم ساحة';

        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header">
                            <h3>${title}</h3>
                            <button class="close-btn" id="btn-close-ops-post">&times;</button>
                        </div>
                        <form id="form-ops-post">
                            <div class="form-group">
                                <label>اسم الملعب</label>
                                <input type="text" id="inp-ops-venue" required placeholder="مركز شباب...">
                            </div>
                            <div class="form-group">
                                <label>موعد المباراة</label>
                                <input type="datetime-local" id="inp-ops-time" required style="direction:ltr;">
                            </div>
                            <div class="form-group">
                                <label>الفريقين (اختياري)</label>
                                <input type="text" id="inp-ops-teams" placeholder="نحن vs الخصم">
                            </div>
                            <div class="form-group" id="group-ops-pos">
                                <label>المركز المطلوب</label>
                                <select id="inp-ops-pos">
                                    <option value="GK">حارس مرمى</option>
                                    <option value="DEF">دفاع</option>
                                    <option value="MID">وسط</option>
                                    <option value="FWD">هجوم</option>
                                    <option value="ANY" selected>أي مركز</option>
                                </select>
                            </div>
                            <button type="submit" class="btn-primary">نشر الطلب</button>
                        </form>
                    </div>
                </div>
            `);

            document.getElementById('btn-close-ops-post').onclick = () => {
                document.getElementById(modalId).classList.add('hidden');
                document.getElementById(modalId).remove(); 
            };
        }

        const posGroup = document.getElementById('group-ops-pos');
        if (type === 'WANTED_REF') posGroup.style.display = 'none';

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        document.getElementById('form-ops-post').onsubmit = (e) => {
            e.preventDefault();
            this.handlePostSubmit(type, modalId);
        };
    }

    /**
     * Logic: Submitting the Post Form.
     */
    async handlePostSubmit(type, modalId) {
        const venue = document.getElementById('inp-ops-venue').value;
        const time = document.getElementById('inp-ops-time').value;
        const teams = document.getElementById('inp-ops-teams').value || 'مباراة ودية';
        const pos = type === 'WANTED_JOKER' ? document.getElementById('inp-ops-pos').value : 'REF';

        if (!venue || !time) return alert("البيانات ناقصة.");

        const reqData = {
            venue: venue,
            time: new Date(time).toISOString(),
            teams: teams,
            position: pos,
            note: ''
        };

        try {
            await this.emergencyService.postRequest(state.getUser().id, state.getUser().zoneId, type, reqData);
            
            SoundManager.play('success');
            alert("تم النشر! سيصلك إشعار عند قبول الطلب.");
            
            document.getElementById(modalId).classList.add('hidden');
            document.getElementById(modalId).remove();
            
            // Safe Reload
            this.loadFeed(state.getUser().zoneId);

        } catch (err) {
            SoundManager.play('error');
            alert(err.message);
        }
    }

    /**
     * Logic: Player Availability Flow.
     */
    async postAvailabilityFlow() {
        const pos = prompt("ما هو مركزك المفضل؟");
        if(!pos) return;
        
        try {
            await this.emergencyService.postAvailability(state.getUser().id, state.getUser().zoneId, pos);
            SoundManager.play('success');
            alert("تم تسجيل حالتك! ستظهر الآن للكباتن.");
            this.loadFeed(state.getUser().zoneId);
        } catch(e) { 
            SoundManager.play('error');
            alert(e.message); 
        }
    }

    /* =========================================================================
       ACTION WORKFLOWS
       ========================================================================= */

    /**
     * Logic: Accept a Request.
     */
    async handleAccept(reqId) {
        if (!confirm("هل أنت متأكد من قبول هذه المهمة؟")) return;

        try {
            await this.emergencyService.acceptRequest(reqId, state.getUser().id);
            SoundManager.play('success');
            
            // Optimistic UI Update: Remove the card immediately
            const container = document.getElementById('ops-feed-container');
            const cardBtn = container.querySelector(`button[data-id="${reqId}"]`);
            if(cardBtn) {
                const card = cardBtn.closest('.ops-card');
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 300);
            }
            
            alert("تم قبول المهمة! تواصل مع الكابتن الآن.");
            
            // Safe refresh
            setTimeout(() => this.loadFeed(state.getUser().zoneId), 500);

        } catch (e) {
            SoundManager.play('error');
            alert(e.message);
        }
    }
}
