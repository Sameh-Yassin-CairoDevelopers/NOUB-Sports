/*
 * Filename: js/controllers/homeCtrl.js
 * Version: 3.2.0 (FINAL MASTER)
 * Description: Controls the Home View (Locker Room).
 * Responsibilities:
 *  1. Update Global Header (Name, Balance, Zone).
 *  2. Render the Digital Player Card (Visuals + Stats).
 *  3. Inject and Manage the Notification System (Bell & Modal).
 *  4. Handle Notification Actions (Accept/Reject Mint & Matches).
 */

import { NotificationService } from '../services/notificationService.js';
import { State } from '../core/state.js';

export class HomeController {
    constructor() {
        this.notifService = new NotificationService();
        this.state = new State();
        this.viewContainer = document.getElementById('view-home');
        
        console.log("🏠 Home Controller: Ready & Listening.");
    }

    /**
     * Main Render Entry Point.
     * Called by AppClass after successful login.
     * @param {User} user - The authenticated User Model.
     */
    render(user) {
        if (!user) return;

        // 1. Update the Top Navigation Header
        this.updateHeaderUI(user);

        // 2. Render the 3D Player Card
        this.renderPlayerCard(user);

        // 3. Initialize Notification System (Bell & Logic)
        this.initNotificationSystem(user.id);
    }

    /**
     * Updates the persistent top header with user info.
     */
    updateHeaderUI(user) {
        const nameEl = document.getElementById('header-name');
        const balanceEl = document.getElementById('header-balance');
        const zoneEl = document.getElementById('header-zone'); // Reused ID for Zone

        if (nameEl) nameEl.textContent = user.username;
        if (balanceEl) balanceEl.textContent = user.balance;

        // Map Zone ID to readable Name
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
     * Renders the visual representation of the Player Card.
     * Uses Visual DNA to style the avatar dynamically.
     */
    renderPlayerCard(user) {
        // Fallback stats for new users (if not fetched yet)
        const stats = {
            rating: 60,
            pac: 65, sho: 55, pas: 60, dri: 58, def: 50, phy: 62,
            pos: 'FWD' // Should come from DB
        };

        // Parse Visual DNA (stored as JSON in DB)
        // Default: {skin: 1, kit: 1}
        let visual = { skin: 1, kit: 1 };
        if (user.visualDna) {
            // Handle if it's already an object or a string
            visual = typeof user.visualDna === 'string' ? JSON.parse(user.visualDna) : user.visualDna;
        }

        // Determine Colors based on Visual DNA
        const skinColors = ['#F5C6A5', '#C68642', '#8D5524']; // Light, Tan, Dark
        const kitColors  = ['#EF4444', '#10B981', '#3B82F6']; // Red, Green, Blue
        
        const finalSkin = skinColors[(visual.skin || 1) - 1] || skinColors[0];
        const finalKit  = kitColors[(visual.kit || 1) - 1] || kitColors[0];

        // Generate HTML
        this.viewContainer.innerHTML = `
            <div class="card-container fade-in">
                
                <!-- THE DIGITAL ASSET (CARD) -->
                <div class="player-card rarity-common">
                    <!-- 1. Top Section -->
                    <div class="card-top">
                        <div class="card-rating text-gold">${stats.rating}</div>
                        <div class="card-pos">${stats.pos}</div>
                        <div class="card-flag">
                            <i class="fa-solid fa-location-dot"></i>
                        </div>
                    </div>
                    
                    <!-- 2. Avatar Visualization -->
                    <div class="card-image-area">
                        <div class="avatar-display-large" style="color: ${finalSkin}; filter: drop-shadow(0 0 5px ${finalKit});">
                            <i class="fa-solid fa-user-astronaut"></i>
                        </div>
                    </div>

                    <!-- 3. Info & Stats -->
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

                <!-- 4. Quick Actions -->
                <div class="home-actions">
                    <button class="btn-action-secondary" onclick="alert('خدمة التعديل: قريباً')">
                        <i class="fa-solid fa-pen-nib"></i> تعديل المظهر
                    </button>
                    <button class="btn-action-secondary" onclick="alert('خدمة المشاركة: قريباً')">
                        <i class="fa-solid fa-share-nodes"></i> مشاركة
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Injects the Bell Icon and sets up the Notification Modal.
     */
    initNotificationSystem(userId) {
        const header = document.getElementById('global-header');
        
        // Prevent duplicate injection
        if (document.getElementById('btn-notif')) return;

        // A. Inject Button HTML
        const bellHtml = `
            <button id="btn-notif" style="background:none; border:none; color:#fff; font-size:1.2rem; margin-left:15px; position:relative; cursor:pointer; transition:transform 0.2s;">
                <i class="fa-solid fa-bell"></i>
                <span id="notif-badge" style="display:none; position:absolute; top:-2px; right:-2px; width:9px; height:9px; background:var(--danger); border-radius:50%; border:1px solid var(--bg-surface);"></span>
            </button>
        `;
        header.insertAdjacentHTML('afterbegin', bellHtml);

        // B. Bind Click Event
        document.getElementById('btn-notif').addEventListener('click', () => {
            this.openNotificationModal(userId);
        });

        // C. Check for Unread Messages
        this.checkUnreadMessages(userId);
    }

    /**
     * Polls for unread notifications to show the red dot.
     */
    async checkUnreadMessages(userId) {
        try {
            const actions = await this.notifService.getPendingActions(userId);
            const badge = document.getElementById('notif-badge');
            if (actions.length > 0 && badge) {
                badge.style.display = 'block';
            }
        } catch (e) {
            console.warn("Silent Notif Check Failed");
        }
    }

    /**
     * Opens the Notification Modal and renders the list.
     */
    async openNotificationModal(userId) {
        const modalId = 'modal-notifications';
        
        // A. Create Modal DOM if not exists
        if (!document.getElementById(modalId)) {
            const modalHtml = `
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
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Bind Close Button
            document.getElementById('btn-close-notif').addEventListener('click', () => {
                document.getElementById(modalId).classList.add('hidden');
            });
        }

        // B. Show Modal
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        // C. Fetch & Render Data
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

            // Render Items
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
                </div>
            `).join('');

            // D. Bind Action Buttons (Dynamic Binding)
            this.bindNotificationActions(userId);

        } catch (e) {
            container.innerHTML = `<p class="error-text">فشل تحميل الإشعارات: ${e.message}</p>`;
        }
    }

    /**
     * Binds click events to the dynamic buttons inside the modal.
     */
    bindNotificationActions(userId) {
        const modal = document.getElementById('modal-notifications');
        
        // Accept Buttons
        document.querySelectorAll('.btn-accept').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const { type, id } = e.target.dataset;
                if(!confirm("هل أنت متأكد من الموافقة؟")) return;
                
                e.target.disabled = true;
                e.target.textContent = "...";

                try {
                    if (type === 'MINT_REQUEST') {
                        await this.notifService.approveMint(id, userId);
                    } else if (type === 'MATCH_VERIFY') {
                        await this.notifService.confirmMatch(id);
                    }
                    alert("تمت العملية بنجاح!");
                    modal.classList.add('hidden');
                    this.checkUnreadMessages(userId); // Update badge
                } catch (err) {
                    alert("خطأ: " + err.message);
                    e.target.disabled = false;
                }
            });
        });

        // Reject Buttons
        document.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const { type, id } = e.target.dataset;
                if(!confirm("رفض الطلب؟")) return;

                try {
                    if (type === 'MINT_REQUEST') await this.notifService.rejectMint(id);
                    else if (type === 'MATCH_VERIFY') await this.notifService.rejectMatch(id);
                    
                    alert("تم الرفض.");
                    modal.classList.add('hidden');
                } catch (err) {
                    alert("خطأ: " + err.message);
                }
            });
        });
    }
}
