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
     * Renders the Player Card (Official Rectangular Design).
     * Features: 
     * - 3D Parallax Structure.
     * - Layered Avatar (Body < Shirt < Name).
     * - Local Background Image.
     */
    renderPlayerCard(user) {
        // 1. Setup Stats (Default Fallback for MVP)
        const stats = { 
            rating: user.stats?.rating || 60, 
            pac: 65, sho: 55, pas: 60, 
            dri: 58, def: 50, phy: 62, 
            pos: user.position || 'FAN' 
        };
        
        // 2. Parse Visual DNA
        let visual = { skin: 1, kit: 1 };
        if (user.visualDna) {
            visual = typeof user.visualDna === 'string' ? JSON.parse(user.visualDna) : user.visualDna;
        }

        // 3. Resolve Colors
        const skinColors = ['#F5C6A5', '#C68642', '#8D5524']; // Light, Tan, Dark
        const kitColors  = ['#EF4444', '#10B981', '#3B82F6']; // Red, Green, Blue
        
        const finalSkin = skinColors[(visual.skin || 1) - 1] || skinColors[0];
        const finalKit  = kitColors[(visual.kit || 1) - 1] || kitColors[0];

        // 4. Define Background Image (Local Asset)
        // Ensure you have the image at: assets/images/backgrounds/street-bg.webp
        // If not found, CSS gradient will take over automatically.
        const bgUrl = "assets/images/backgrounds/street-bg.webp";

        // 5. Construct HTML
        this.viewContainer.innerHTML = `
            <div class="card-container fade-in">
                
                <!-- THE CARD (Rectangular Shield) -->
                <div class="player-card rarity-common" style="background-image: url('${bgUrl}');">
                    
                    <!-- A. Top Info -->
                    <div class="card-top">
                        <div class="card-rating text-gold">${stats.rating}</div>
                        <div class="card-pos">${stats.pos}</div>
                        <div class="card-flag">
                            <i class="fa-solid fa-location-dot"></i>
                        </div>
                    </div>
                    
                    <!-- B. Avatar Layers (Fixed Z-Index) -->
                    <div class="card-image-area">
                        <div class="avatar-comp" style="position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
                            
                            <!-- Layer 1: Body (Skin) - Behind -->
                            <i class="fa-solid fa-user" style="
                                font-size: 110px; 
                                color: ${finalSkin}; 
                                position: absolute; 
                                bottom: 45px; /* Moved up slightly */
                                z-index: 1;
                                filter: drop-shadow(0 5px 5px rgba(0,0,0,0.5));
                            "></i>

                            <!-- Layer 2: Shirt (Kit) - Front -->
                            <i class="fa-solid fa-shirt" style="
                                font-size: 130px; 
                                color: ${finalKit}; 
                                position: absolute; 
                                bottom: -20px;
                                z-index: 2;
                                filter: drop-shadow(0 0 5px rgba(0,0,0,0.8));
                            "></i>

                            <!-- Layer 3: Name on Shirt - Overlay -->
                            <div class="shirt-text" style="
                                position: absolute; 
                                bottom: 35px; /* Centered on chest */
                                z-index: 3;
                                color: rgba(255,255,255,0.9); 
                                font-family: 'Orbitron'; 
                                font-size: 13px; 
                                font-weight: bold;
                                text-transform: uppercase;
                                text-shadow: 0 1px 2px #000;
                                letter-spacing: 1px;
                            ">
                                ${user.username || 'NOUB'}
                            </div>
                        </div>
                    </div>

                    <!-- C. Bottom Info (Stats) -->
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

                <!-- D. Action Buttons (Clean & Separated) -->
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



