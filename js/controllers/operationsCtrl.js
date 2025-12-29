/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/operationsCtrl.js
 * Version: Noub Sports_beta 5.0.0 (GOLDEN MASTER - FULL OPERATIONS)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * This controller manages the "Operations Room" (View Operations).
 * It acts as a real-time marketplace for match resources (Jokers & Referees).
 * 
 * CORE FEATURES & FIXES:
 * 1. Feed Management: Fetches and filters open requests ('WANTED' ads).
 * 2. My Missions Dashboard: Displays active/locked tasks involved with the user
 *    (closing the loop so users know where to go after accepting).
 * 3. Deep Linking: Handles external triggers from the Side Menu and Arena SOS button.
 * 4. Stability: Implements defensive rendering to prevent null pointer errors.
 * -----------------------------------------------------------------------------
 */

import { EmergencyService } from '../services/emergencyService.js';
import { TeamService } from '../services/teamService.js';
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';
import { Helpers } from '../utils/helpers.js';

export class OperationsController {
    
    /**
     * Constructor: Initializes services and internal state.
     * Sets up GLOBAL event listeners for cross-module communication.
     */
    constructor() {
        // 1. Initialize Services
        this.emergencyService = new EmergencyService();
        this.teamService = new TeamService(); // Needed for Captain checks
        
        // 2. Cache View Container
        this.viewContainer = document.getElementById('view-operations');
        
        // 3. State Defaults
        this.currentFilter = 'ALL'; 
        
        // ---------------------------------------------------------
        // GLOBAL EVENT LISTENERS (DEEP LINKING LOGIC)
        // ---------------------------------------------------------
        
        // A. Listener for Side Menu (Request Joker/Ref)
        window.addEventListener('trigger-post-request', (e) => {
            const { type } = e.detail;
            console.log(`🚨 Ops: Deep Link Triggered for ${type}`);
            this.ensureLayoutRendered(); // Prevent crash if view wasn't loaded
            this.openPostModal(type);
        });

        // B. Listener for Arena Red Button (SOS)
        // Fixes the issue where the view opened but data didn't load
        window.addEventListener('init-ops-view', () => {
            console.log("🚨 Ops: Awake command received.");
            this.init();
        });
        
        console.log("🚨 Operations Controller: Online & Listening.");
    }

    /**
     * Main Initialization Logic.
     * Loads the Layout, My Missions, and the Market Feed.
     */
    async init() {
        const user = state.getUser();
        
        // Auth Guard
        if (!user) {
            this.viewContainer.innerHTML = `
                <div class="error-state">
                    <i class="fa-solid fa-lock"></i> يجب تسجيل الدخول.
                </div>`;
            return;
        }

        // 1. Ensure Skeleton Exists
        this.renderLayout();

        // 2. Load Data (Parallel Execution for Speed)
        await Promise.all([
            this.loadMyMissions(user.id),
            this.loadFeed(user.zoneId)
        ]);
    }

    /**
     * HELPER: Defensive Rendering.
     * Ensures the DOM structure exists before attempting to manipulate it.
     * Used when deep linking directly without passing through init().
     */
    ensureLayoutRendered() {
        if (!document.getElementById('ops-feed-container')) {
            console.log("🚨 Ops: Layout missing, forcing render...");
            this.renderLayout();
            // Silently load background data
            const user = state.getUser();
            if(user) {
                this.loadMyMissions(user.id);
                this.loadFeed(user.zoneId);
            }
        }
    }

    /**
     * Renders the Static Skeleton (Header, Missions Area, Filters, Feed).
     */
    renderLayout() {
        this.viewContainer.innerHTML = `
            <div class="ops-container fade-in" style="padding: 20px 15px; padding-bottom: 100px;">
                
                <!-- A. Header -->
                <div class="ops-header" style="margin-bottom: 20px; text-align: center;">
                    <h2 class="text-gold" style="font-family: var(--font-sport); font-size: 1.8rem; margin-bottom: 5px;">
                        <i class="fa-solid fa-tower-broadcast"></i> غرفة العمليات
                    </h2>
                    <p class="text-muted" style="font-size: 0.8rem;">سوق الانتقالات الفوري للمباريات</p>
                </div>

                <!-- B. SECTION: MY ACTIVE MISSIONS (New) -->
                <!-- Hidden by default, shown if data exists -->
                <div id="my-missions-container" class="hidden" style="margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
                    <h4 style="color:var(--success); margin-bottom:10px; font-size:0.9rem;">
                        <i class="fa-solid fa-bolt"></i> مهام قيد التنفيذ
                    </h4>
                    <div id="my-missions-list" style="display:flex; flex-direction:column; gap:10px;"></div>
                </div>

                <!-- C. SECTION: MARKETPLACE FILTERS -->
                <div class="ops-filters" style="display: flex; gap: 10px; margin-bottom: 15px; overflow-x: auto; padding-bottom: 5px;">
                    <button class="filter-chip active" data-filter="ALL" style="flex:1; background: var(--gold-main); color: #000; border: none; padding: 8px; border-radius: 12px; font-weight: bold;">الكل</button>
                    <button class="filter-chip" data-filter="WANTED_JOKER" style="flex:1; background: #222; color: #aaa; border: 1px solid #333; padding: 8px; border-radius: 12px;">جوكر</button>
                    <button class="filter-chip" data-filter="WANTED_REF" style="flex:1; background: #222; color: #aaa; border: 1px solid #333; padding: 8px; border-radius: 12px;">حكم</button>
                </div>

                <!-- D. FEED CONTAINER -->
                <div id="ops-feed-container" style="display: flex; flex-direction: column; gap: 15px; min-height: 200px;">
                    <div class="loader-bar" style="margin: 20px auto;"></div>
                </div>

                <!-- E. FAB (Floating Action Button) -->
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

        this.bindEvents();
    }

    /**
     * Binds UI Events (Filters, FAB).
     */
    bindEvents() {
        // Filter Chips Logic
        this.viewContainer.querySelectorAll('.filter-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                // UI Toggle
                this.viewContainer.querySelectorAll('.filter-chip').forEach(b => {
                    b.classList.remove('active'); b.style.background = '#222'; b.style.color = '#aaa';
                });
                e.target.classList.add('active'); 
                e.target.style.background = 'var(--gold-main)'; 
                e.target.style.color = '#000';
                
                // Reload Feed
                this.currentFilter = e.target.dataset.filter;
                this.loadFeed(state.getUser().zoneId);
            });
        });

        // FAB Click
        const fab = document.getElementById('btn-fab-post');
        if (fab) fab.onclick = () => this.showPostOptions();
    }

    /* =========================================================================
       SECTION 1: MY MISSIONS (ACTIVE TASKS)
       ========================================================================= */

    /**
     * Fetches requests where the user is involved (Requester or Responder).
     * Displays them at the top of the screen.
     */
    async loadMyMissions(userId) {
        const container = document.getElementById('my-missions-container');
        const list = document.getElementById('my-missions-list');
        
        try {
            const missions = await this.emergencyService.getMyActiveMissions(userId);
            
            if (missions && missions.length > 0) {
                container.classList.remove('hidden');
                list.innerHTML = missions.map(m => {
                    const isMeRequester = m.requester_id === userId;
                    
                    // Display Logic: Show the OTHER party's name
                    const otherPartyName = isMeRequester 
                        ? (m.responder?.username || 'لاعب') 
                        : (m.requester?.username || 'كابتن');
                    
                    const roleText = isMeRequester 
                        ? 'قبل طلبك (في انتظار المباراة)' 
                        : 'طلبك للمهمة (أنت ملزم بالحضور)';
                    
                    const time = new Date(m.match_time).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

                    return `
                        <div style="background:linear-gradient(90deg, #10b981 0%, #064e3b 100%); padding:12px; border-radius:10px; color:#fff; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                            <div>
                                <div style="font-weight:bold; font-size:0.9rem; display:flex; align-items:center; gap:5px;">
                                    <i class="fa-solid fa-handshake"></i> ${otherPartyName}
                                </div>
                                <div style="font-size:0.75rem; opacity:0.9; margin-top:4px;">
                                    ${roleText} <br>
                                    <i class="fa-solid fa-clock" style="font-size:0.7rem;"></i> ${time} • ${m.venue_name || 'ملعب'}
                                </div>
                            </div>
                            <button onclick="alert('خدمة الاتصال المباشر: قريباً')" style="background:rgba(255,255,255,0.2); border:none; color:#fff; width:35px; height:35px; border-radius:50%; font-size:0.9rem; cursor:pointer;">
                                <i class="fa-solid fa-phone"></i>
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                container.classList.add('hidden');
            }
        } catch (e) { 
            console.error("Missions Load Error", e); 
        }
    }

    /* =========================================================================
       SECTION 2: MARKET FEED (OPEN REQUESTS)
       ========================================================================= */

    /**
     * Fetches Open Requests from the Zone.
     * Applies Client-Side Filtering.
     */
    async loadFeed(zoneId) {
        const container = document.getElementById('ops-feed-container');
        if (!container) return; // Safety check
        
        try {
            const allRequests = await this.emergencyService.getActiveRequests(zoneId);
            
            // Filter
            let filtered = allRequests;
            if (this.currentFilter !== 'ALL') {
                filtered = allRequests.filter(r => r.type === this.currentFilter);
            }

            // Empty State
            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="text-align:center; padding:30px; opacity:0.7;">
                        <i class="fa-solid fa-radar" style="font-size:3rem; margin-bottom:10px;"></i>
                        <p class="text-muted">المنطقة هادئة. لا توجد طلبات نشطة.</p>
                    </div>`;
                return;
            }

            // Render Cards
            container.innerHTML = filtered.map(req => this.renderMissionCard(req)).join('');
            
            // Bind Accept Actions
            this.bindCardActions();

        } catch (err) {
            container.innerHTML = `<p class="error-text">فشل تحميل البيانات. تأكد من الإنترنت.</p>`;
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
            color: isJoker ? '#D4AF37' : (isRef ? '#fbbf24' : '#10b981'),
            title: isJoker ? 'مطلوب جوكر' : (isRef ? 'مطلوب حكم' : 'عرض توفر'),
            btnText: isAvailable ? 'استدعاء' : 'قبول المهمة'
        };

        const timeStr = new Date(req.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
        const isMine = req.requester.username === state.getUser().username; 

        return `
            <div class="ops-card" style="
                background: linear-gradient(145deg, rgba(255,255,255,0.03), rgba(0,0,0,0.4));
                border-right: 4px solid ${theme.color};
                border-radius: 12px; padding: 15px; position: relative; margin-bottom: 10px;">
                
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
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
                
                ${!isAvailable ? `
                    <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:10px;">
                        <div style="font-size:0.85rem; color:#ccc; margin-bottom:5px;">
                            <i class="fa-solid fa-clock text-gold"></i> ${new Date(req.match_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            <span style="margin:0 8px;">|</span>
                            <i class="fa-solid fa-location-dot text-gold"></i> ${req.venue_name}
                        </div>
                        <div style="color:#fff; font-size:0.9rem;">${req.details.teams}</div>
                        ${req.details.position !== 'REF' ? `<div style="color:${theme.color}; font-size:0.8rem; margin-top:5px;">مطلوب: ${req.details.position}</div>` : ''}
                    </div>
                ` : `<p style="color:#fff; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">متاح للعب في مركز: <strong>${req.details.position}</strong></p>`}

                ${!isMine ? `
                    <button class="btn-accept-req" data-id="${req.id}" style="width:100%; padding:10px; border:none; border-radius:8px; background: ${theme.color}; color: #000; font-weight:bold; cursor:pointer;">
                        ${theme.btnText}
                    </button>
                ` : `<div style="text-align:center; font-size:0.75rem; color:#666;">(طلبك الخاص)</div>`}
            </div>
        `;
    }

    /**
     * Bind Accept Actions.
     */
    bindCardActions() {
        this.viewContainer.querySelectorAll('.btn-accept-req').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reqId = e.target.dataset.id;
                this.handleAccept(reqId);
            });
        });
    }

    /* =========================================================================
       SECTION 3: POSTING FLOW & MODALS
       ========================================================================= */

    /**
     * Action Sheet for FAB.
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
                </div>`);
            
            document.getElementById(modalId).onclick = (e) => { if(e.target.id === modalId) document.getElementById(modalId).classList.add('hidden'); };
            
            document.getElementById('btn-sel-joker').onclick = () => { 
                document.getElementById(modalId).classList.add('hidden'); 
                this.openPostModal('WANTED_JOKER'); 
            };
            document.getElementById('btn-sel-ref').onclick = () => { 
                document.getElementById(modalId).classList.add('hidden'); 
                this.openPostModal('WANTED_REF'); 
            };
            document.getElementById('btn-sel-ready').onclick = () => { 
                document.getElementById(modalId).classList.add('hidden'); 
                this.postAvailabilityFlow(); 
            };
        }
        document.getElementById(modalId).classList.remove('hidden');
    }

    /**
     * Post Creation Modal.
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
                                <input type="text" id="inp-ops-venue" required placeholder="مركز شباب..." style="width:100%; padding:10px; margin-bottom:10px; background:#222; border:1px solid #333; color:#fff; border-radius:8px;">
                            </div>
                            <div class="form-group">
                                <label>موعد المباراة</label>
                                <input type="datetime-local" id="inp-ops-time" required style="width:100%; padding:10px; margin-bottom:10px; background:#222; border:1px solid #333; color:#fff; border-radius:8px; direction:ltr;">
                            </div>
                            <div class="form-group">
                                <label>الفريقين (اختياري)</label>
                                <input type="text" id="inp-ops-teams" placeholder="نحن vs الخصم" style="width:100%; padding:10px; margin-bottom:10px; background:#222; border:1px solid #333; color:#fff; border-radius:8px;">
                            </div>
                            <div class="form-group" id="group-ops-pos">
                                <label>المركز المطلوب</label>
                                <select id="inp-ops-pos" style="width:100%; padding:10px; margin-bottom:20px; background:#222; border:1px solid #333; color:#fff; border-radius:8px;">
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
                document.getElementById(modalId).remove(); // Cleanup to prevent state issues
            };
        }

        // Toggle Position Input based on Type
        const posGroup = document.getElementById('group-ops-pos');
        if (type === 'WANTED_REF') posGroup.style.display = 'none';
        else posGroup.style.display = 'block';

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        document.getElementById('form-ops-post').onsubmit = (e) => {
            e.preventDefault();
            this.handlePostSubmit(type, modalId);
        };
    }

    /**
     * Post Submission Logic.
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
            
            this.init(); // Refresh All

        } catch (err) {
            SoundManager.play('error');
            alert(err.message);
        }
    }

    /**
     * Availability Flow Logic.
     */
    async postAvailabilityFlow() {
        const pos = prompt("ما هو مركزك المفضل؟");
        if(!pos) return;
        
        try {
            await this.emergencyService.postAvailability(state.getUser().id, state.getUser().zoneId, pos);
            SoundManager.play('success');
            alert("تم نشر حالتك! انتظر اتصالاً.");
            this.init(); // Refresh All
        } catch(e) { 
            SoundManager.play('error');
            alert(e.message); 
        }
    }

    /**
     * Accept Request Logic.
     */
    async handleAccept(reqId) {
        if (!confirm("هل أنت متأكد من قبول هذه المهمة؟")) return;

        try {
            await this.emergencyService.acceptRequest(reqId, state.getUser().id);
            SoundManager.play('success');
            alert("تم قبول المهمة! تواصل مع الكابتن الآن.");
            
            this.init(); // Full Refresh to show updated My Missions

        } catch (e) {
            SoundManager.play('error');
            alert(e.message);
        }
    }
}
