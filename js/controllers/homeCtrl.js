/*
 * Filename: js/controllers/homeCtrl.js
 * Version: 4.2.2 (FULL CODE)
 * Description: Controls the Home View (Locker Room).
 * Responsibilities:
 *  1. Update Global Header.
 *  2. Render Player Card.
 *  3. Full Notification System (Bell, Badge, Modal, Actions).
 */

import { NotificationService } from '../services/notificationService.js';
import { state } from '../core/state.js'; // Correct Singleton Import
import { AvatarEngine } from '../utils/avatarEngine.js';

export class HomeController {
    constructor() {
        this.notifService = new NotificationService();
        this.viewContainer = document.getElementById('view-home');
        console.log("🏠 Home Controller: Ready.");
    }

    /**
     * Main Entry: Renders the view based on user data.
     * @param {Object} user - User Model
     */
    render(user) {
        if (!user) return;

        // 1. Update Header
        this.updateHeaderUI(user);

        // 2. Render Card
        this.renderPlayerCard(user);

        // 3. Initialize Notifications
        this.initNotificationSystem(user.id);
    }

    /**
     * Updates the top bar info
     */
    updateHeaderUI(user) {
        const nameEl = document.getElementById('header-name');
        const balanceEl = document.getElementById('header-balance');
        const zoneEl = document.getElementById('header-zone');

        if (nameEl) nameEl.textContent = user.username;
        if (balanceEl) balanceEl.textContent = user.balance;

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
     * Renders the Visual Card
     */
/**
     * Renders the Visual Card (FIFA-Style Shield with Layered Avatar).
     * Uses AvatarEngine to compose the character layers and print name on shirt.
     * @param {Object} user - The User Model containing visualDna and stats.
     */
    renderPlayerCard(user) {
        // 1. Setup Stats (Fallback logic for new users)
        // In the future, these will come directly from 'user.stats' JSONB from DB
        const stats = {
            rating: user.stats?.rating || 60,
            pac: 65, 
            sho: 55, 
            pas: 60,
            dri: 58, 
            def: 50, 
            phy: 62,
            pos: user.position || 'FAN'
        };

        // 2. Generate the Dynamic Avatar HTML
        // This calls the static method we created in Batch (A)
        // It creates: Shirt Layer + Head Layer + Text Layer (Name on Shirt)
        const avatarHtml = AvatarEngine.generateAvatarHTML(user.visualDna, user.username);

        // 3. Inject HTML into View Container
        // Note: The structure matches css/components/cards.css (Shield Layout)
        this.viewContainer.innerHTML = `
            <div class="card-container fade-in">
                
                <!-- THE DIGITAL ASSET (SHIELD CARD) -->
                <div class="player-card rarity-common">
                    
                    <!-- A. Top Info (Rating & Position) -->
                    <div class="card-top">
                        <div class="card-rating text-gold">${stats.rating}</div>
                        <div class="card-pos">${stats.pos}</div>
                        <div class="card-flag">
                            <i class="fa-solid fa-location-dot"></i>
                        </div>
                    </div>
                    
                    <!-- B. Avatar Visualization (The Engine Output) -->
                    <div class="card-image-area">
                        ${avatarHtml}
                    </div>

                    <!-- C. Bottom Info (Name & Stats) -->
                    <div class="card-info">
                        <h2 class="player-name">${user.username}</h2>
                        
                        <div class="separator-line"></div>

                        <!-- Stats Matrix (English Labels as requested) -->
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

                <!-- D. Quick Actions (Below Card) -->
                <div class="home-actions">
                    <button class="btn-action-secondary" onclick="alert('خدمة التعديل: قريباً')">
                        <i class="fa-solid fa-pen-nib"></i> تعديل المظهر
                    </button>
                    <button class="btn-action-secondary" onclick="alert('خدمة المشاركة: قريباً')">
                        <i class="fa-solid fa-share-nodes"></i> مشاركة
                    </button>
                </div>
            </div>`;
    }
    /**
     * Injects Bell Icon & Logic
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
        
        this.checkUnreadMessages(userId);
    }

    /**
     * Checks for unread items to show red dot
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
     * Builds and Opens the Modal
     */
    async openNotificationModal(userId) {
        const modalId = 'modal-notifications';
        
        // 1. Create Modal DOM if missing
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

        // 2. Show Modal
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        
        const container = document.getElementById('notif-list-container');
        container.innerHTML = '<div class="loader-bar" style="margin: 20px auto;"></div>';

        // 3. Fetch Data
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

            // 4. Render List
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

            // 5. Bind Actions
            this.bindNotificationActions(userId);

        } catch (e) { 
            container.innerHTML = `<p class="error-text">فشل تحميل الإشعارات: ${e.message}</p>`; 
        }
    }

    /**
     * Binds Click Events inside Modal
     */
    bindNotificationActions(userId) {
        const modal = document.getElementById('modal-notifications');
        
        // Helper Handler
        const handleAction = async (btn, actionType) => {
            const { type, id } = btn.dataset;
            const confirmMsg = actionType === 'ACCEPT' ? "تأكيد الموافقة؟" : "تأكيد الرفض؟";
            
            if(!confirm(confirmMsg)) return;
            
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

        // Bind Buttons
        document.querySelectorAll('.btn-accept').forEach(btn => {
            btn.addEventListener('click', (e) => handleAction(e.target, 'ACCEPT'));
        });
        
        document.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', (e) => handleAction(e.target, 'REJECT'));
        });
    }
}

