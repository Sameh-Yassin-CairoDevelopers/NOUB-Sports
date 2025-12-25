/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/operationsCtrl.js
 * Version: 2.0.0 (MY MISSIONS UPDATE)
 * Status: Production Ready
 * 
 * UPDATES:
 * 1. Added "My Missions" Section (Requests I accepted OR My requests accepted by others).
 * 2. Fixed Initialization Logic to work with Red Button navigation.
 * 3. Improved Error Handling.
 */

import { EmergencyService } from '../services/emergencyService.js';
import { TeamService } from '../services/teamService.js';
import { state } from '../core/state.js';
import { SoundManager } from '../utils/soundManager.js';
import { Helpers } from '../utils/helpers.js';

export class OperationsController {
    
    constructor() {
        this.emergencyService = new EmergencyService();
        this.teamService = new TeamService();
        this.viewContainer = document.getElementById('view-operations');
        this.currentFilter = 'ALL';
        
        // Listener for Deep Links (Menu)
        window.addEventListener('trigger-post-request', (e) => {
            this.ensureLayoutRendered();
            this.openPostModal(e.detail.type);
        });

        // Listener for Direct Navigation (Red Button)
        window.addEventListener('init-ops-view', () => {
            console.log("🚨 Ops: Awake command received.");
            this.init();
        });
        
        console.log("🚨 Operations Controller: Online.");
    }

    async init() {
        const user = state.getUser();
        if (!user) {
            this.viewContainer.innerHTML = `<div class="error-state">يجب تسجيل الدخول.</div>`;
            return;
        }

        // Always ensure layout is there
        this.renderLayout();

        // Load Data (Parallel: Missions + Market Feed)
        await Promise.all([
            this.loadMyMissions(user.id),
            this.loadFeed(user.zoneId)
        ]);
    }

    ensureLayoutRendered() {
        if (!document.getElementById('ops-feed-container')) {
            this.renderLayout();
            const user = state.getUser();
            if(user) {
                this.loadMyMissions(user.id);
                this.loadFeed(user.zoneId);
            }
        }
    }

    renderLayout() {
        this.viewContainer.innerHTML = `
            <div class="ops-container fade-in" style="padding: 20px 15px; padding-bottom: 100px;">
                
                <div class="ops-header" style="margin-bottom: 20px; text-align: center;">
                    <h2 class="text-gold" style="font-family: var(--font-sport); font-size: 1.8rem; margin-bottom: 5px;">
                        <i class="fa-solid fa-tower-broadcast"></i> غرفة العمليات
                    </h2>
                </div>

                <!-- SECTION 1: MY ACTIVE MISSIONS (NEW) -->
                <div id="my-missions-container" class="hidden" style="margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
                    <h4 style="color:var(--success); margin-bottom:10px; font-size:0.9rem;">
                        <i class="fa-solid fa-bolt"></i> مهام قيد التنفيذ
                    </h4>
                    <div id="my-missions-list" style="display:flex; flex-direction:column; gap:10px;"></div>
                </div>

                <!-- SECTION 2: MARKETPLACE -->
                <div class="ops-filters" style="display: flex; gap: 10px; margin-bottom: 15px; overflow-x: auto; padding-bottom: 5px;">
                    <button class="filter-chip active" data-filter="ALL" style="flex:1; background: var(--gold-main); color: #000; border: none; padding: 8px; border-radius: 12px; font-weight: bold;">الكل</button>
                    <button class="filter-chip" data-filter="WANTED_JOKER" style="flex:1; background: #222; color: #aaa; border: 1px solid #333; padding: 8px; border-radius: 12px;">جوكر</button>
                    <button class="filter-chip" data-filter="WANTED_REF" style="flex:1; background: #222; color: #aaa; border: 1px solid #333; padding: 8px; border-radius: 12px;">حكم</button>
                </div>

                <div id="ops-feed-container" style="display: flex; flex-direction: column; gap: 15px; min-height: 200px;">
                    <div class="loader-bar" style="margin: 20px auto;"></div>
                </div>

                <button id="btn-fab-post" style="position: fixed; bottom: 95px; left: 20px; width: 55px; height: 55px; border-radius: 50%; background: var(--danger); color: #fff; border: none; box-shadow: 0 5px 20px rgba(239, 68, 68, 0.4); font-size: 1.5rem; display: flex; justify-content: center; align-items: center; z-index: 100;">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        `;
        this.bindEvents();
    }

    bindEvents() {
        this.viewContainer.querySelectorAll('.filter-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundManager.play('click');
                this.viewContainer.querySelectorAll('.filter-chip').forEach(b => {
                    b.classList.remove('active'); b.style.background = '#222'; b.style.color = '#aaa';
                });
                e.target.classList.add('active'); e.target.style.background = 'var(--gold-main)'; e.target.style.color = '#000';
                this.currentFilter = e.target.dataset.filter;
                this.loadFeed(state.getUser().zoneId);
            });
        });
        const fab = document.getElementById('btn-fab-post');
        if (fab) fab.onclick = () => this.showPostOptions();
    }

    // --- MY MISSIONS LOGIC ---
    async loadMyMissions(userId) {
        const container = document.getElementById('my-missions-container');
        const list = document.getElementById('my-missions-list');
        
        try {
            const missions = await this.emergencyService.getMyActiveMissions(userId);
            
            if (missions.length > 0) {
                container.classList.remove('hidden');
                list.innerHTML = missions.map(m => {
                    const isMeRequester = m.requester_id === userId;
                    // Logic: If I asked, show who accepted. If I accepted, show who asked.
                    const otherPartyName = isMeRequester ? m.responder?.username : m.requester?.username;
                    const roleText = isMeRequester ? 'قبل طلبك' : 'طلبك للمهمة';
                    const time = new Date(m.match_time).toLocaleString('ar-EG');

                    return `
                        <div style="background:linear-gradient(90deg, #10b981 0%, #064e3b 100%); padding:12px; border-radius:10px; color:#fff; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <div style="font-weight:bold; font-size:0.9rem;">
                                    <i class="fa-solid fa-handshake"></i> ${otherPartyName} ${roleText}
                                </div>
                                <div style="font-size:0.75rem; opacity:0.9; margin-top:4px;">
                                    ${m.venue_name} • ${time}
                                </div>
                            </div>
                            <button onclick="alert('تفاصيل الاتصال: قريباً')" style="background:rgba(255,255,255,0.2); border:none; color:#fff; padding:5px 10px; border-radius:6px; font-size:0.8rem;">
                                <i class="fa-solid fa-phone"></i>
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                container.classList.add('hidden');
            }
        } catch (e) { console.error("Missions Load Error", e); }
    }

    // --- MARKET FEED LOGIC ---
    async loadFeed(zoneId) {
        const container = document.getElementById('ops-feed-container');
        if (!container) return;
        
        try {
            const allRequests = await this.emergencyService.getActiveRequests(zoneId);
            let filtered = allRequests;
            if (this.currentFilter !== 'ALL') filtered = allRequests.filter(r => r.type === this.currentFilter);

            if (filtered.length === 0) {
                container.innerHTML = `<div class="empty-state" style="text-align:center; padding:30px;"><p class="text-muted">لا توجد طلبات نشطة.</p></div>`;
                return;
            }

            container.innerHTML = filtered.map(req => this.renderMissionCard(req)).join('');
            this.bindCardActions();

        } catch (err) {
            container.innerHTML = `<p class="error-text">فشل الاتصال.</p>`;
        }
    }

    renderMissionCard(req) {
        const isJoker = req.type === 'WANTED_JOKER';
        const isRef = req.type === 'WANTED_REF';
        const isAvailable = req.type === 'I_AM_AVAILABLE';
        
        const theme = {
            icon: isJoker ? 'fa-person-running' : (isRef ? 'fa-scale-balanced' : 'fa-hand-point-up'),
            color: isJoker ? '#ef4444' : (isRef ? '#fbbf24' : '#10b981'),
            title: isJoker ? 'مطلوب جوكر' : (isRef ? 'مطلوب حكم' : 'عرض توفر'),
            btnText: isAvailable ? 'استدعاء' : 'قبول المهمة'
        };

        const timeStr = new Date(req.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
        const isMine = req.requester.username === state.getUser().username; 

        return `
            <div class="ops-card" style="background: linear-gradient(145deg, rgba(255,255,255,0.03), rgba(0,0,0,0.4)); border-right: 4px solid ${theme.color}; border-radius: 12px; padding: 15px;">
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
                ` : `<p style="color:#fff;">متاح للعب في مركز: ${req.details.position}</p>`}

                ${!isMine ? `
                    <button class="btn-accept-req" data-id="${req.id}" style="width:100%; padding:10px; border:none; border-radius:8px; background: ${theme.color}; color: #000; font-weight:bold; cursor:pointer;">
                        ${theme.btnText}
                    </button>
                ` : `<div style="text-align:center; font-size:0.75rem; color:#666;">(طلبك)</div>`}
            </div>
        `;
    }

    bindCardActions() {
        this.viewContainer.querySelectorAll('.btn-accept-req').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reqId = e.target.dataset.id;
                this.handleAccept(reqId);
            });
        });
    }

    // ... (Keep showPostOptions, openPostModal, handlePostSubmit, postAvailabilityFlow as provided before) ...
    // Note: Re-include them exactly as they were in previous version to complete the file.
    // Included here for completeness:

    showPostOptions() { /* ... Same as previous ... */ 
        const modalId = 'modal-post-select';
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden" style="align-items:flex-end;">
                    <div class="modal-box" style="border-radius:20px 20px 0 0; padding-bottom:40px;">
                        <h3 style="text-align:center; color:#fff; margin-bottom:20px;">نشر طلب جديد</h3>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <button class="action-btn-large" id="btn-sel-joker" style="justify-content:center; border-color:#ef4444; color:#ef4444;">طلب لاعب (جوكر)</button>
                            <button class="action-btn-large" id="btn-sel-ref" style="justify-content:center; border-color:#fbbf24; color:#fbbf24;">طلب حكم</button>
                            <button class="action-btn-large" id="btn-sel-ready" style="justify-content:center; border-color:#10b981; color:#10b981;">أنا متاح للعب</button>
                        </div>
                    </div>
                </div>`);
            document.getElementById(modalId).onclick = (e) => { if(e.target.id===modalId) document.getElementById(modalId).classList.add('hidden'); };
            document.getElementById('btn-sel-joker').onclick = () => { document.getElementById(modalId).classList.add('hidden'); this.openPostModal('WANTED_JOKER'); };
            document.getElementById('btn-sel-ref').onclick = () => { document.getElementById(modalId).classList.add('hidden'); this.openPostModal('WANTED_REF'); };
            document.getElementById('btn-sel-ready').onclick = () => { document.getElementById(modalId).classList.add('hidden'); this.postAvailabilityFlow(); };
        }
        document.getElementById(modalId).classList.remove('hidden');
    }

    openPostModal(type) {
        const modalId = 'modal-ops-post';
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header"><h3>بيانات الطلب</h3><button class="close-btn" id="btn-close-ops">&times;</button></div>
                        <form id="form-ops-post">
                            <input type="text" id="inp-ops-venue" placeholder="اسم الملعب" required style="width:100%; padding:10px; margin-bottom:10px; background:#222; border:1px solid #333; color:#fff; border-radius:8px;">
                            <input type="datetime-local" id="inp-ops-time" required style="width:100%; padding:10px; margin-bottom:10px; background:#222; border:1px solid #333; color:#fff; border-radius:8px;">
                            <input type="text" id="inp-ops-teams" placeholder="الفريقين" style="width:100%; padding:10px; margin-bottom:10px; background:#222; border:1px solid #333; color:#fff; border-radius:8px;">
                            <select id="inp-ops-pos" style="width:100%; padding:10px; margin-bottom:20px; background:#222; border:1px solid #333; color:#fff; border-radius:8px;">
                                <option value="ANY">أي مركز</option><option value="GK">حارس</option><option value="DEF">دفاع</option><option value="FWD">هجوم</option>
                            </select>
                            <button type="submit" class="btn-primary">نشر</button>
                        </form>
                    </div>
                </div>`);
            document.getElementById('btn-close-ops').onclick = () => document.getElementById(modalId).classList.add('hidden');
        }
        
        if (type === 'WANTED_REF') document.getElementById('inp-ops-pos').style.display = 'none';
        else document.getElementById('inp-ops-pos').style.display = 'block';

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        document.getElementById('form-ops-post').onsubmit = (e) => { e.preventDefault(); this.handlePostSubmit(type, modalId); };
    }

    async handlePostSubmit(type, modalId) {
        const venue = document.getElementById('inp-ops-venue').value;
        const time = document.getElementById('inp-ops-time').value;
        const teams = document.getElementById('inp-ops-teams').value;
        const pos = document.getElementById('inp-ops-pos').value;
        
        try {
            await this.emergencyService.postRequest(state.getUser().id, state.getUser().zoneId, type, { venue, time: new Date(time).toISOString(), teams, position: pos });
            SoundManager.play('success');
            document.getElementById(modalId).classList.add('hidden');
            this.init(); // Refresh All
        } catch(e) { alert(e.message); }
    }

    async postAvailabilityFlow() {
        const pos = prompt("مركزك؟");
        if(pos) {
            try { await this.emergencyService.postAvailability(state.getUser().id, state.getUser().zoneId, pos); this.init(); }
            catch(e) { alert(e.message); }
        }
    }

    async handleAccept(reqId) {
        if(!confirm("تأكيد القبول؟")) return;
        try {
            await this.emergencyService.acceptRequest(reqId, state.getUser().id);
            SoundManager.play('success');
            alert("تم القبول!");
            this.init(); // Refresh Layout to show My Missions and update Feed
        } catch(e) { alert(e.message); }
    }
}
