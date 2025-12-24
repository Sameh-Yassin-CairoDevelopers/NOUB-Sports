/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/ALL'; 
        
        // Bind Global Listeners immediately (for Menu deep links)
        this.setupGlobalListeners();
        
        console.log("🚨 Operations Controller: Online.");
    }

    /**
     controllers/operationsCtrl.js
 * Version: 1.0.0 (THE OPERATIONS HEADQUARTERS)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * This controller manages the dedicated "Operations Room" View (view-operations).
 * It* Global Event Listeners Setup.
     * Allows other controllers (like Menu) to trigger actions here.
     */
    setupGlobal serves as the central marketplace for urgent match resources (Jokers & Refs).
 * 
 * CORE RESPONSIBILITIES:
 * 1.Listeners() {
        window.addEventListener('trigger-post-request', (e) => {
            // Ensure we are on Feed Management: Fetches, filters, and renders active 'WANTED' requests.
 * 2. Transaction Handling the view first (Router handles this, but safety check)
            if (!this.viewContainer.classList.contains('hidden')) {
                const { type } = e.detail;
                this.openPostModal(type);
            }
        });: Manages the "Post" and "Accept" workflows using Atomic locks.
 * 3. Deep Linking Receiver
    }

    /**
     * Main Initialization Logic.
     * Called by the Router when the user navig: Listens for 'trigger-post-request' events dispatched
 *    by the MenuController to open specific modals immediatelyates to this view.
     */
    async init() {
        const user = state.getUser();
 upon navigation.
 * 4. UI/UX: Implements a tabbed filtering interface and dynamic modal forms.
 * --------------------------------        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول للوصول لغرفة العمليات.</div>`;
            return;
        }

        ---------------------------------------------
 */

import { EmergencyService } from '../services/emergencyService.js';
import { TeamService } from '../services/teamService.js';
import { state } from '../core/state.js';// 1. Render Skeleton Layout
        this.renderLayout();

        // 2. Load Data (Feed
import { SoundManager } from '../utils/soundManager.js';
import { Helpers } from '../utils/)
        await this.loadFeed(user.zoneId);
    }

    /**
     * Renders the Static Layouthelpers.js';

export class OperationsController {
    
    /**
     * Constructor: Initializes Services and State (Header, Tabs, Feed Container).
     */
    renderLayout() {
        this.viewContainer.innerHTML = `
            <div.
     * Sets up the global event listener for cross-module communication.
     */
    constructor() {
        this.emergencyService = class="operations-container fade-in">
                
                <!-- A. Header Section -->
                <div class="ops-header">
                    <div class="ops-title">
                        <i class="fa-solid new EmergencyService();
        this.teamService = new TeamService(); // Needed to check Captaincy
        
        this.viewContainer fa-tower-broadcast text-danger pulse-icon"></i>
                        <h2>غرفة العمليات</h2>
                    </div>
                    <p class="ops = document.getElementById('view-operations');
        this.currentFilter = 'ALL'; // Default filter state
        
        // BIND DEEP LINK LISTENER
        // This allows the Side Menu to trigger actions inside this controller
        window.addEventListener('trigger-post-request', (e) => {
            const { type } = e.detail;
            console.log(`🚨 Ops: Deep Link Triggered for ${type}`);
            this.openPostModal(type);
        });-subtitle">ساحة الطلبات الفورية للمباريات في منطقتك</p>
                </div>

                <!-- B. Filter Tabs
    }

    /**
     * Main Initialization Logic.
     * Called by the Router when the user navigates to ' -->
                <div class="ops-tabs">
                    <button class="ops-tab active" data-filter="ALL">الكل</button>
                    <button class="ops-tab" data-filter="WANTED_JOKER">مطلوب جوكر</button>
                    <button class="ops-tab" data-filter="WANTED_REF">مطلوب حكم</button>
                </div>

                <!-- C. Dynamic Feed -->
                <div id="ops-feed-container" class="view-operations'.
     */
    async init() {
        console.log("🚨 OperationsController: Initialops-feed">
                    <div class="loader-bar"></div>
                </div>

                <!-- D. Floatingizing HQ...");
        
        const user = state.getUser();
        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return; Action Button (FAB) for Manual Posting -->
                <button id="btn-ops-fab" class="ops-fab">
                    <i class="fa-solid fa-plus"></i>
                </button>
            
        }

        // Render Base Layout
        this.renderLayout();
        
        // Fetch Initial Data
        await this.loadFeed</div>
        `;

        // Bind Events
        this.bindLayoutEvents();
    }

    /**
     * Binds click(user.zoneId);
    }

    /**
     * Renders the Static Skeleton of the Operations Room.
     * Includes Header, Filter Chips, and Feed Container.
     */
    renderLayout() {
 events for Tabs and FAB.
     */
    bindLayoutEvents() {
        // Tab Switching
        this.viewContainer.querySelectorAll        this.viewContainer.innerHTML = `
            <div class="ops-container fade-in" style="padding: 20px('.ops-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                // UI Toggle
                this.viewContainer.querySelectorAll('.ops-tab').forEach( 15px; padding-bottom: 100px;">
                
                <!-- A. Header Section -->
                <divb => b.classList.remove('active'));
                e.target.classList.add('active');
                 class="ops-header" style="margin-bottom: 25px; text-align: center;">
                    <h2 class="text
                // Logic
                this.currentFilter = e.target.dataset.filter;
                this.loadFeed(state.getUser-gold" style="font-family: var(--font-sport); font-size: 1.8rem; margin-bottom: 5px;">
                        <i class="fa-solid fa-tower-broadcast">().zoneId);
            });
        });

        // FAB Click -> Open General Menu
        document.getElementById('btn-ops-fab').onclick = () => {
            this.showPostOptions();
        };
    }

</i> غرفة العمليات
                    </h2>
                    <p class="text-muted" style="font-size: 0.85rem;">سوق الانتقالات الفوري للمباريات</p>
                </div>

                <!-- B. Filter Chips (    /**
     * CORE: Data Fetching & Rendering.
     * @param {number} zoneId - UserTabs) -->
                <div class="ops-filters" style="display: flex; gap: 10's geographic zone.
     */
    async loadFeed(zoneId) {
        const container = documentpx; margin-bottom: 20px; overflow-x: auto; padding-bottom: 5px;">
                    <button class=".getElementById('ops-feed-container');
        container.innerHTML = '<div class="loader-bar" stylefilter-chip active" data-filter="ALL" style="flex:1; background: var(--gold-main="margin:20px auto"></div>';

        try {
            // 1. Fetch from Service
            const allRequests = await); color: #000; border: none; padding: 10px; border-radius: 12px; font-weight: bold;">الكل</button>
                    <button class="filter-chip this.emergencyService.getActiveRequests(zoneId);
            
            // 2. Filter Client-Side
            let filtered = allRequests;
            if (this.currentFilter !== 'ALL') {
                filtered = all" data-filter="WANTED_JOKER" style="flex:1; background: #222; color: #aaa; border: 1px solid #333; padding: 10px; border-radius: Requests.filter(r => r.type === this.currentFilter);
            }

            // 3. Render
            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="12px;">جوكر</button>
                    <button class="filter-chip" data-filter="WANTED_REF" styleempty-state">
                        <i class="fa-solid fa-radar" style="font-size:3="flex:1; background: #222; color: #aaa; border: 1px solid #333; padding: 10px; border-radius: 12px;">حكم</buttonrem; color:#333; margin-bottom:10px;"></i>
                        <p class="text-muted">المن>
                </div>

                <!-- C. The Feed Container -->
                <div id="ops-feed-container" style="display: flex; flex-direction: column; gap: 15px; min-height: 3طقة هادئة. لا توجد طلبات نشطة.</p>
                    </div>`;
                return;
            }

00px;">
                    <div class="loader-bar" style="margin: 20px auto;"></div>
                </div>

                            container.innerHTML = filtered.map(req => this.renderMissionCard(req)).join('');

            // 4. Bind Accept Buttons
            this.bindCardActions();

        } catch (err) {
            console.error(err);
            container.innerHTML =<!-- D. Floating Action Button (FAB) for Manual Posting -->
                <button id="btn-fab-post `<p class="error-text">فشل الاتصال بغرفة العمليات.</p>`;
        }
    }

    " style="
                    position: fixed; bottom: 95px; left: 20px;
                    width: 55px; height: 55px; border-radius: 50%;
                    background: var(--danger/**
     * COMPONENT: Generates HTML for a Single Request Card.
     * Uses different styles for Jok); color: #fff; border: none;
                    box-shadow: 0 5px 20px rgba(2ers vs Refs.
     */
    renderMissionCard(req) {
        const isJoker = req.type === 'WANTED_JOKER';
        const isRef = req.type === 'WANTED39, 68, 68, 0.4);
                    font-size: 1.5_REF';
        const isAvailable = req.type === 'I_AM_AVAILABLE';
        
        rem; display: flex; justify-content: center; align-items: center;
                    z-index: 100;">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        // Theme Config
        const theme = {
            icon: isJoker ? 'fa-person-running' : (isRef ? 'fa-scale-balanced' : 'fa-hand-point-up'),
            color: isJoker ? '#ef4444' : (isRef ? '#fbbf24' : '#10b981'),`;

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
 // Red, Yellow, Green
            title: isJoker ? 'مهمة: لاعب جوكر' : (isRef ?                SoundManager.play('click');
                // UI Toggle
                this.viewContainer.querySelectorAll('.filter-chip').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#222';
 'مهمة: حكم ساحة' : 'عرض توفر'),
            btnText: isAvailable ? 'است                    b.style.color = '#aaa';
                });
                e.target.classList.add('activeدعاء للكابتن' : 'قبول المهمة'
        };

        // Time Formatting
        const time');
                e.target.style.background = 'var(--gold-main)';
                e.target.style.color = '#000';

                // Data Reload
                this.currentFilter = e.target.dataset.filter;
                this.loadFeed(state.getUser().zoneId);
            });
        Str = new Date(req.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
        
        // Determine Ownership (Is this MY request?)
        const isMine = req.requester.});

        // FAB Button Logic (Opens Selection Sheet)
        document.getElementById('btn-fab-post').onclick = () => {
            this.openPostTypeSelection();
        };
    }

    /**
     * Data Fetching Logic.
     * Gets requests from Service and filters them client-side.
     */
    async loadFeed(zoneId)username === state.getUser().username; // Better check IDs in prod

        return `
            <div class="mission-card" style="border {
        const container = document.getElementById('ops-feed-container');
        container.innerHTML = '<div-right: 4px solid ${theme.color};">
                <div class="mission-header">
 class="loader-bar" style="margin:20px auto"></div>';

        try {
            const all                    <span class="mission-type" style="color:${theme.color}">
                        <i class="fa-solid ${theme.icon}"></i> ${theme.title}
                    </span>
                    <span class="mission-timeRequests = await this.emergencyService.getActiveRequests(zoneId);
            
            // Client-Side Filter
            const filtered = this">${timeStr}</span>
                </div>
                
                <div class="mission-body">
                    ${!.currentFilter === 'ALL' 
                ? allRequests 
                : allRequests.filter(r => r.type === this.currentFilter);

            if (filtered.length === 0) {
                containerisAvailable ? `
                        <h4 class="mission-venue">
                            <i class="fa-solid fa-location-dot text.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#666-muted"></i> ${req.venue_name || 'ملعب غير محدد'}
                        </h4>
                        <div class="mission-details">;">
                        <i class="fa-solid fa-wind" style="font-size:3rem; margin-bottom:15px;"></i>
                        <p>لا توجد طلبات نشطة في هذا القسم.</p>
                    </div>`;
                
                            <span><i class="fa-regular fa-clock"></i> ${new Date(req.match_time).return;
            }

            // Render Cards
            container.innerHTML = filtered.map(req => this.createtoLocaleString('ar-EG')}</span>
                            <span><i class="fa-solid fa-users"></i> ${req.details.teams}</span>
                        </div>
                        <div class="mission-req-pos">
                            مطلوب: <strong>${req.details.position}</strong>
                        </div>
                    ` : `
                        <div class="missionRequestCard(req)).join('');

            // Bind Accept Buttons
            container.querySelectorAll('.btn-accept-req').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.handleAccept(-player-info">
                            <h4 style="color:#fff;">${req.requester.username}</h4>
                            <p classbtn.dataset.id);
                });
            });

        } catch (e) {
            console.error(e);
            container.innerHTML = `<p class="error-text">فشل تحديث البيانات.</p>`;
        }
    }

    /**
     * GENERATOR: Creates the HTML for a single Request Card.
     * Uses color="text-muted">متاح للعب في مركز: <strong>${req.details.position}</strong></p>
                            <span class="badge-rep"><i class="fa-solid fa-star"></i> ${req.requester.reputation_score || 1 coding for different types.
     */
    createRequestCard(req) {
        const isJoker = req.type ===00}</span>
                        </div>
                    `}
                </div>

                <div class="mission-footer">
                    ${!isMine ? `
                        <button class="btn-mission-action action-accept" data-id="${req.id}" style="background:${theme.color}; color:#000;">
                            ${theme.btnText}
                        </button>
                    ` : `
                        <span class="my-request-label">طلبك ق 'WANTED_JOKER';
        const isRef = req.type === 'WANTED_REF';يد الانتظار...</span>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * Bind
        const isAvailable = req.type === 'I_AM_AVAILABLE';

        // Styling Config
        const theme = isJoker ? { color: '#ef4444', icon: 'fa-user-ninja', title: 'مطلوب جوكر' } :
                      isRef   ? { color: '#fbbf24', icon: 'fa-scale-balanced', title: 'مطلوب حكم' } :
                                { color: '#10b9 Accept Buttons inside the feed.
     */
    bindCardActions() {
        this.viewContainer.querySelectorAll('.action-81', icon: 'fa-hand-holding-hand', title: 'عرض توفر' };

        const timeaccept').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                constStr = new Date(req.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', reqId = e.target.dataset.id;
                if(!confirm("هل أنت متأكد من القبول؟ هذا التزام منك بالحضور.")) return;

                // Optimistic UI: Disable button immediately
                e.target minute:'2-digit'});
        const isMe = req.requester.username === state.getUser().username.disabled = true;
                e.target.textContent = "جاري التأكيد...";

                try {
                    await this.emergencyService.acceptRequest(reqId, state.getUser().id);
                    SoundManager.play; // Simple check (ID is better but requester obj has username)

        return `
            <div class="ops-card" style="
                background: linear-gradient(145deg, rgba(255,255('success');
                    alert("✅ تم تأكيد المهمة! تم إرسال إشعار للكابتن.");
                    
                    //,255,0.03), rgba(0,0,0,0.4));
                border-right:  Reload Feed to remove the item
                    this.loadFeed(state.getUser().zoneId);
                } catch (err) {
4px solid ${theme.color};
                border-radius: 12px; padding: 15px; position                    SoundManager.play('error');
                    alert("خطأ: " + err.message);
                    e: relative;">
                
                <!-- Header -->
                <div style="display:flex; justify-content:space.target.disabled = false;
                    e.target.textContent = "قبول المهمة";
                }
-between; align-items:flex-start; margin-bottom:10px;">
                    <div style            });
        });
    }

    /* =========================================================================
       SECTION 2: POSTING WORK="display:flex; gap:10px; align-items:center;">
                        <div style="width:35px; heightFLOW (MODALS)
       ========================================================================= */

    /**
     * Shows a selection menu (Action:35px; background:${theme.color}20; color:${theme.color}; border-radius:50%; display:flex; justify-content:center; align-items:center;">
                            <i class="fa-solid ${theme. Sheet) for the FAB.
     */
    showPostOptions() {
        // Simple native choice for MVP,icon}"></i>
                        </div>
                        <div>
                            <h4 style="color:#fff; font-size:0.95rem; margin:0;">${theme.title}</h4>
                            <span class="text-muted" style="font can be custom modal
        // Using confirm flow to direct user
        this.openPostModal('WANTED_JOK-size:0.7rem;">${req.requester.username} • ${timeStr}</span>
                        </div>
                    </div>
                </div>

                <!-- Body Details -->
                <div style="background:rgba(0,0,0,0.2ER'); // Default action
    }

    /**
     * Opens the Input Modal to Create a Request.
     * Handles); padding:10px; border-radius:8px; margin-bottom:10px;">
                     both 'WANTED_JOKER' and 'WANTED_REF'.
     */
    openPostModal${!isAvailable ? `
                        <div style="display:flex; gap:15px; font-size:0.85(type) {
        const modalId = 'modal-ops-post';
        const title = type === 'WANTED_rem; color:#ccc;">
                            <span><i class="fa-solid fa-clock text-gold"></i> ${JOKER' ? 'طلب لاعب جوكر' : 'طلب حكم ساحة';

        // 1. Build Modal if missing
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend',new Date(req.match_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span> `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal
                            <span><i class="fa-solid fa-location-dot text-gold"></i> ${req.venue_name}</span>
                        </div>
                        <div style="margin-top:8px; font-size:-box">
                        <div class="modal-header">
                            <h3>${title}</h3>
                            <button0.9rem; color:#fff; font-weight:bold;">
                            ${req.details.teams}
                         class="close-btn" id="btn-close-ops-post">&times;</button>
                        </div>
                        <form id="form-ops-post">
                            <div class="form-group">
                                <label>اسم الملعب</label</div>
                    ` : `
                        <p style="color:#fff; margin:0;">
                            أنا متاح للعب اليوم في مركز: <span style="color:${theme.color}; font-weight:bold;">${req.details.>
                                <input type="text" id="inp-ops-venue" required placeholder="مركز شباب...">
                            </div>
                            <div classposition}</span>
                        </p>
                    `}
                </div>

                <!-- Action Button -->
                ${!="form-group">
                                <label>موعد المباراة</label>
                                <input type="datetime-local" idisMe ? `
                    <button class="btn-accept-req" data-id="${req.id}" style="
                        width:100%; padding:10px; border:none; border-radius:8px;
="inp-ops-time" required style="direction:ltr;">
                            </div>
                            <div class="form-group">
                                <label>الفريقين (اختياري)</label>
                                <input type="text" id="inp                        background: ${theme.color}; color: #000; font-weight:bold; cursor:pointer;
                        display-ops-teams" placeholder="نحن vs الخصم">
                            </div>
                            <div class="form:flex; justify-content:center; align-items:center; gap:8px;">
                        ${is-group" id="group-ops-pos">
                                <label>المركز المطلوب</label>
                                <select id="inp-Available ? '<i class="fa-solid fa-phone"></i> استدعاء' : '<i class="fa-solid faops-pos">
                                    <option value="GK">حارس مرمى</option>
                                    <-check"></i> قبول المهمة'}
                    </button>
                ` : `<div style="text-align:center; font-option value="DEF">دفاع</option>
                                    <option value="MID">وسط</option>
size:0.75rem; color:#666;">(طلبك الخاص)</div>`}
            </div>
                                            <option value="FWD">هجوم</option>
                                    <option value="ANY" selected>أي مركز</option>
`;
    }

    /* =========================================================================
       ACTION WORKFLOWS
       ================================================================                                </select>
                            </div>
                            <button type="submit" class="btn-primary">نشر الطلب</button>
                        </form>
                    </div>
                </div>
            `);

            // Close Logic
            document.getElementById('btn-========= */

    /**
     * Logic: Accept a Request.
     * Calls Service -> Updates UI -> Trclose-ops-post').onclick = () => {
                document.getElementById(modalId).classList.add('iggers Notification (Server side logic assumed).
     */
    async handleAccept(reqId) {
        if (!hidden');
                document.getElementById(modalId).remove(); // Cleanup DOM to reset state next time
            };
        }

confirm("هل أنت متأكد من قبول هذه المهمة؟")) return;

        try {
            await this.emergencyService.acceptRequest(reqId, state.getUser().id);
            SoundManager.play('success');
        // 2. Adjust UI based on Type
        const posGroup = document.getElementById('group-ops-pos');
        if (            
            // Optimistic UI Update: Remove the card immediately
            const container = document.getElementById('ops-feed-container');
type === 'WANTED_REF') {
            posGroup.style.display = 'none'; // Refs don't have positions
        }

        // 3. Show Modal
        const modal = document.getElementById(modalId);            const cardBtn = container.querySelector(`button[data-id="${reqId}"]`);
            if(cardBtn) {
                const card
        modal.classList.remove('hidden');

        // 4. Bind Submit
        document.getElementById(' = cardBtn.closest('.ops-card');
                card.style.opacity = '0';
                setTimeoutform-ops-post').onsubmit = (e) => {
            e.preventDefault();
            this.(() => card.remove(), 300);
            }
            
            alert("تم قبول المهمة! تhandlePostSubmit(type, modalId);
        };
    }

    /**
     * Logic: Subواصل مع الكابتن الآن.");
            
            // Full Refresh to be safe
            setTimeout(() => this.loadFeed(statemitting the Post Form.
     */
    async handlePostSubmit(type, modalId) {
        const venue = document.getUser().zoneId), 500);

        } catch (e) {
            SoundManager..getElementById('inp-ops-venue').value;
        const time = document.getElementById('inp-ops-play('error');
            alert(e.message);
        }
    }

    /**
     *time').value;
        const teams = document.getElementById('inp-ops-teams').value || 'مباراة ود UI: Opens a Bottom Sheet to choose post type (Joker/Ref/Available).
     */
    openPostية';
        const pos = type === 'WANTED_JOKER' ? document.getElementById('inp-ops-pos').value : 'REF';

        // Validation
        if (!venue || !time) return alert("البيانات ناقصة.");TypeSelection() {
        const modalId = 'modal-post-select';
        if (!document.getElementById(modalId))

        const reqData = {
            venue: venue,
            time: new Date(time).toISOString(),
 {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden            teams: teams,
            position: pos,
            note: ''
        };

        try {
" style="align-items:flex-end;">
                    <div class="modal-box" style="border-radius:2            await this.emergencyService.postRequest(state.getUser().id, state.getUser().zoneId, type0px 20px 0 0; padding-bottom:40px;">
                        <h3, reqData);
            
            SoundManager.play('success');
            alert("تم النشر! سيصلك إ style="text-align:center; color:#fff; margin-bottom:20px;">ماذا تريد أن تنشر؟</h3>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <button classشعار عند قبول الطلب.");
            
            // Close & Refresh
            document.getElementById(modalId).classList.add('hidden');
            document.getElementById(modalId).remove();
            this.loadFeed(state.getUser().zoneId);="action-btn-large" id="btn-sel-joker" style="justify-content:center;

        } catch (err) {
            SoundManager.play('error');
            alert(err.message);
        }
 border-color:#ef4444; color:#ef4444;">
                                <i class="fa-    }
}