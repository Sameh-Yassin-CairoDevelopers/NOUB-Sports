/*
 * Filename: js/controllers/homeCtrl.js
 * Version: 6.0.0 (PLATINUM EDITION)
 * Description: The Master Controller for the User Dashboard (Locker Room).
 * 
 * ARCHITECTURE & RESPONSIBILITIES:
 * 1. View Orchestration: Manages the internal router for 'Identity Card' vs 'Album'.
 * 2. Visual Rendering: Uses AvatarEngine to render the complex Layered Shield Card.
 * 3. System Integration: 
 *    - Connects to NotificationService for the Bell/Inbox.
 *    - Connects to ProfileController for the 'Edit Look' Modal.
 *    - Connects to Supabase to fetch the Gift Collection (Album).
 */

import { NotificationService } from '../services/notificationService.js';
import { ProfileController } from './profileCtrl.js'; // For Edit Modal
import { state } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { AvatarEngine } from '../utils/avatarEngine.js';

export class HomeController {
    
    constructor() {
        // Initialize Sub-Controllers & Services
        this.notifService = new NotificationService();
        this.profileCtrl = new ProfileController();
        
        // DOM Reference
        this.viewContainer = document.getElementById('view-home');
        this.currentUser = null;
        
        console.log("🏠 Home Controller: Fully Initialized.");
    }

    /**
     * Main Entry Point: Renders the Dashboard based on User State.
     * @param {Object} user - The authenticated User Model.
     */
    render(user) {
        if (!user) return;
        this.currentUser = user;

        // 1. Update Global Header (Name, Balance, Zone)
        this.updateHeaderUI(user);

        // 2. Initialize System Components (Bell & Settings)
        this.initNotificationSystem(user.id);
        this.initSettingsButton();

        // 3. Render the Main Layout (Tabs Container)
        this.renderLayout();
        
        // 4. Load Default Tab (Identity Card)
        this.renderIdentity(user);
    }

    /**
     * Updates the persistent Global Header with dynamic data.
     */
    updateHeaderUI(user) {
        const nameEl = document.getElementById('header-name');
        const balanceEl = document.getElementById('header-balance');
        const zoneEl = document.getElementById('header-zone');

        if (nameEl) nameEl.textContent = user.username;
        if (balanceEl) balanceEl.textContent = user.balance;

        // Zone Mapping (Enum to String)
        const zoneNames = {
            1: 'الفسطاط / المعادي',
            2: 'مصر القديمة / المنيل',
            3: 'حلوان / التبين',
            4: 'القاهرة الكبرى'
        };
        if (zoneEl) {
            zoneEl.textContent = zoneNames[user.zoneId] || 'منطقة غير محددة';
        }
    }

    /**
     * Renders the Internal Tabs System (Identity vs Album).
     */
    renderLayout() {
        this.viewContainer.innerHTML = `
            <div class="home-wrapper fade-in">
                <!-- Navigation Tabs -->
                <div class="home-tabs">
                    <button class="htab active" id="tab-id">بطاقتي</button>
                    <button class="htab" id="tab-album">ألبومي</button>
                </div>

                <!-- Dynamic Content Container -->
                <div id="home-dynamic-content"></div>
            </div>

            <!-- Scoped Styles for Tabs -->
            <style>
                .home-wrapper { display: flex; flex-direction: column; align-items: center; padding-bottom: 100px; }
                .home-tabs { 
                    display: flex; gap: 20px; margin-bottom: 20px; margin-top: 10px;
                    border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; width: 80%; justify-content: center;
                }
                .htab { 
                    background: none; border: none; color: #888; font-family: 'Cairo'; 
                    font-weight: bold; cursor: pointer; font-size: 1rem; position: relative;
                    padding-bottom: 5px; transition: color 0.3s;
                }
                .htab.active { color: #D4AF37; }
                .htab.active::after {
                    content: ''; position: absolute; bottom: -11px; left: 0; width: 100%; height: 2px; background: #D4AF37;
                }
                #home-dynamic-content { width: 100%; display: flex; justify-content: center; }
            </style>
        `;

        // Bind Tab Click Events
        document.getElementById('tab-id').addEventListener('click', (e) => {
            this.switchTab(e.target);
            this.renderIdentity(this.currentUser);
        });
        
        document.getElementById('tab-album').addEventListener('click', (e) => {
            this.switchTab(e.target);
            this.renderAlbum(this.currentUser.id);
        });
    }

    /**
     * UX Helper: Toggles active class on tabs.
     */
    switchTab(btn) {
        document.querySelectorAll('.htab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    /**
     * TAB 1: Render Identity Card (The Shield).
     * Uses the advanced HTML structure compatible with 'cards.css' v5.2.
     */
    renderIdentity(user) {
        const container = document.getElementById('home-dynamic-content');
        
        // A. Setup Stats (Fallback logic)
        const stats = { 
            rating: user.stats?.rating || 60, 
            pac: 65, sho: 55, pas: 60, 
            dri: 58, def: 50, phy: 62, 
            pos: user.position || 'FAN' 
        };

        // B. Generate Avatar HTML
        let visual = user.visualDna || { skin: 1, kit: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        const avatarHtml = AvatarEngine.generateAvatarHTML(visual, user.username);
        
        // C. Local Background Asset
        const bgUrl = "assets/images/backgrounds/street-bg.webp";

        // D. Construct HTML
        container.innerHTML = `
            <div class="card-container fade-in">
                
                <!-- THE SHIELD CARD BODY -->
                <div class="player-card rarity-common" style="background-image: url('${bgUrl}');">
                    
                    <!-- Top Info -->
                    <div class="card-top">
                        <div class="card-rating text-gold">${stats.rating}</div>
                        <div class="card-pos">${stats.pos}</div>
                        <div class="card-flag"><i class="fa-solid fa-location-dot"></i></div>
                    </div>
                    
                    <!-- Layered Avatar -->
                    <div class="card-image-area">
                        ${avatarHtml}
                    </div>

                    <!-- Bottom Info -->
                    <div class="card-info">
                        <h2 class="player-name">${user.username}</h2>
                        <div class="separator-line"></div>
                        <div class="card-stats-grid">
                            <div class="stat-box"><span>${stats.pac}</span> PAC</div>
                            <div class="stat-box"><span>${stats.dri}</span> DRI</div>
                            <div class="stat-box"><span>${stats.sho}</span> SHO</div>
                            <div class="stat-box"><span>${stats.def}</span> DEF</div>
                            <div class="stat-box"><span>${stats.pas}</span> PAS</div>
                            <div class="stat-box"><span>${stats.phy}</span> PHY</div>
                        </div>
                    </div>
                </div>

                <!-- ACTIONS (Edit & Share) -->
                <div class="home-actions">
                    <button class="btn-action-secondary" id="btn-edit-look">
                        <i class="fa-solid fa-pen-nib"></i> تعديل المظهر
                    </button>
                    <button class="btn-action-secondary" onclick="alert('خدمة المشاركة: قريباً')">
                        <i class="fa-solid fa-share-nodes"></i> مشاركة
                    </button>
                </div>
            </div>`;
        
        // Bind Edit Button to Profile Controller
        document.getElementById('btn-edit-look').addEventListener('click', () => {
            this.profileCtrl.openEditModal();
        });
    }

    /**
     * TAB 2: Render Album (Gifted Cards Collection).
     * Fetches cards from Supabase where 'type' is 'GIFT'.
     */
    async renderAlbum(userId) {
        const container = document.getElementById('home-dynamic-content');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';

        try {
            const { data: cards, error } = await supabase
                .from('cards')
                .select('*')
                .eq('owner_id', userId)
                .eq('type', 'GIFT')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!cards || cards.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-box-open" style="font-size:3rem; margin-bottom:15px; color:#555;"></i>
                        <p class="text-muted">الألبوم فارغ.</p>
                        <small>اطلب توقيعات من اللاعبين في الساحة.</small>
                    </div>`;
                return;
            }

            // Render Grid of Mini Cards
            container.innerHTML = `
                <div class="market-grid" style="width:100%; padding:0 20px;">
                    ${cards.map(c => this.renderMiniCard(c)).join('')}
                </div>
            `;

        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="error-text">فشل تحميل الألبوم.</p>';
        }
    }

    /**
     * Helper: Renders a simplified card for the Album Grid.
     */
    renderMiniCard(card) {
        let visual = card.visual_dna;
        if(typeof visual === 'string') visual = JSON.parse(visual);
        const skinColor = ['#ccc', '#F5C6A5', '#C68642', '#8D5524'][visual.skin - 1] || '#ccc';

        return `
            <div class="scout-card">
                <div class="scout-card-top">
                    <span class="scout-pos">#${card.serial_number}</span>
                </div>
                <div class="scout-avatar">
                    <i class="fa-solid fa-user" style="color:${skinColor}"></i>
                </div>
                <div class="scout-info">
                    <h5>${card.display_name}</h5>
                    <div class="scout-tags"><span style="color:gold;">هدية موقعة</span></div>
                </div>
            </div>`;
    }

    /**
     * NEW: Init Settings Icon (Gear) in Global Header.
     * Allows access to Edit/Logout even if not on Home tab.
     */
    initSettingsButton() {
        const header = document.getElementById('global-header');
        if (document.getElementById('btn-settings')) return;

        header.insertAdjacentHTML('afterbegin', `
            <button id="btn-settings" style="background:none; border:none; color:var(--text-muted); font-size:1.1rem; margin-right:10px; cursor:pointer; transition: color 0.2s;">
                <i class="fa-solid fa-gear"></i>
            </button>
        `);

        // Bind to Profile Editor (Acts as Settings menu for now)
        document.getElementById('btn-settings').addEventListener('click', () => {
            this.profileCtrl.openEditModal();
        });
    }

    /**
     * SYSTEM: Init Notification Bell & Modal logic.
     */
    initNotificationSystem(userId) {
        const header = document.getElementById('global-header');
        if (document.getElementById('btn-notif')) return;

        header.insertAdjacentHTML('afterbegin', `
            <button id="btn-notif" style="background:none; border:none; color:#fff; font-size:1.2rem; margin-left:15px; position:relative; cursor:pointer; transition:transform 0.2s;">
                <i class="fa-solid fa-bell"></i>
                <span id="notif-badge" style="display:none; position:absolute; top:-2px; right:-2px; width:9px; height:9px; background:var(--danger); border-radius:50%; border:1px solid var(--bg-surface);"></span>
            </button>
        `);

        document.getElementById('btn-notif').addEventListener('click', () => { 
            this.openNotificationModal(userId); 
        });
        
        // Poll for unread items
        this.checkUnreadMessages(userId);
    }

    async checkUnreadMessages(userId) {
        try {
            const actions = await this.notifService.getPendingActions(userId);
            const badge = document.getElementById('notif-badge');
            if (actions.length > 0 && badge) badge.style.display = 'block';
        } catch (e) { 
            console.warn("Silent Notif Check Failed"); 
        }
    }

    /**
     * Builds and Opens the Notification Modal.
     */
    async openNotificationModal(userId) {
        const modalId = 'modal-notifications';
        
        // Create Modal DOM if missing
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header">
                            <h3>مركز الإجراءات</h3>
                            <button class="close-btn" id="btn-close-notif">&times;</button>
                        </div>
                        <div id="notif-list-container" class="notif-list">
                            <div class="loader-bar" style="margin: 20px auto;"></div>
                        </div>
                    </div>
                </div>`);
            
            document.getElementById('btn-close-notif').addEventListener('click', () => {
                document.getElementById(modalId).classList.add('hidden');
            });
        }

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        
        const container = document.getElementById('notif-list-container');
        container.innerHTML = '<div class="loader-bar" style="margin: 20px auto;"></div>';

        try {
            const actions = await this.notifService.getPendingActions(userId);
            
            if (actions.length === 0) {
                container.innerHTML = `
                    <div class="empty-notif">
                        <i class="fa-regular fa-bell-slash" style="font-size:2rem; margin-bottom:10px;"></i>
                        <p>لا توجد إشعارات جديدة</p>
                    </div>`;
                return;
            }

            // Render Notification Cards
            container.innerHTML = actions.map(act => `
                <div class="notif-card">
                    <div class="notif-info">
                        <div class="notif-icon">
                            <i class="fa-solid ${act.type === 'MINT_REQUEST' ? 'fa-pen-fancy' : 'fa-handshake'}"></i>
                        </div>
                        <div class="notif-text">
                            <h4>${act.title}</h4>
                            <p>${act.desc}</p>
                            <small class="text-muted">${new Date(act.time).toLocaleDateString('ar-EG')}</small>
                        </div>
                    </div>
                    <div class="notif-actions">
                        <button class="btn-accept" data-type="${act.type}" data-id="${act.id}">موافقة</button>
                        <button class="btn-reject" data-type="${act.type}" data-id="${act.id}">رفض</button>
                    </div>
                </div>`).join('');

            // Bind Actions
            this.bindNotificationActions(userId, modal);

        } catch (e) { 
            container.innerHTML = `<p class="error-text">فشل تحميل الإشعارات: ${e.message}</p>`; 
        }
    }

    /**
     * Binds Accept/Reject buttons inside the Notification Modal.
     */
    bindNotificationActions(userId, modal) {
        const handleAction = async (btn, actionType) => {
            const { type, id } = btn.dataset;
            if(!confirm(actionType === 'ACCEPT' ? "تأكيد الموافقة؟" : "تأكيد الرفض؟")) return;
            
            btn.disabled = true;
            btn.textContent = "...";
            
            try {
                if (type === 'MINT_REQUEST') {
                    if(actionType === 'ACCEPT') await this.notifService.approveMint(id, userId);
                    else await this.notifService.rejectMint(id);
                } else if (type === 'MATCH_VERIFY') {
                    if(actionType === 'ACCEPT') await this.notifService.confirmMatch(id);
                    else await this.notifService.rejectMatch(id);
                }
                
                alert("تمت العملية بنجاح!");
                modal.classList.add('hidden');
                this.checkUnreadMessages(userId); // Refresh Badge
                
            } catch (err) {
                alert("خطأ: " + err.message);
                btn.disabled = false;
                btn.textContent = actionType === 'ACCEPT' ? "موافقة" : "رفض";
            }
        };

        // Attach Listeners
        modal.querySelectorAll('.btn-accept').forEach(b => b.addEventListener('click', (e) => handleAction(e.target, 'ACCEPT')));
        modal.querySelectorAll('.btn-reject').forEach(b => b.addEventListener('click', (e) => handleAction(e.target, 'REJECT')));
    }
}
