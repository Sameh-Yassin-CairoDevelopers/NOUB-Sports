/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/homeCtrl.js
 * Version: 6.5.0 (MASTER CONTROLLER - INTERACTIVE)
 * Status: Production Ready
 * 
 * ARCHITECTURAL RESPONSIBILITIES:
 * 1. Dashboard Logic: Manages the 'Home' view, switching between Identity and Album.
 * 2. Visual Rendering: Renders the High-Fidelity Interactive Card (Shield/Rect).
 * 3. Interaction Handling: Manages Card Clicks (Toggle Overlay), and Button Actions.
 * 4. System Integration: Injects Notification Bell and Settings Trigger.
 */

import { NotificationService } from '../services/notificationService.js';
import { ProfileController } from './profileCtrl.js';
import { state } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { AvatarEngine } from '../utils/avatarEngine.js';
import { SoundManager } from '../utils/soundManager.js';

export class HomeController {
    
    constructor() {
        // Initialize Dependencies
        this.notifService = new NotificationService();
        this.profileCtrl = new ProfileController();
        
        this.viewContainer = document.getElementById('view-home');
        this.currentUser = null;
        
        console.log("🏠 Home Controller: Ready.");
    }

    /**
     * Main Render Entry Point.
     * @param {Object} user - The authenticated User Model.
     */
    render(user) {
        if (!user) return;
        this.currentUser = user;

        // 1. Update Global Header Info
        this.updateHeaderUI(user);

        // 2. Initialize System Components (Bell & Settings)
        this.initNotificationSystem(user.id);
        this.initSettingsButton();

        // 3. Render Layout Structure (Tabs)
        this.renderLayout();
        
        // 4. Default View: Identity Card
        this.renderInteractiveCard(user);
    }

    /**
     * Updates header texts (Name, Balance, Zone).
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
     * Renders the Tab Navigation Container.
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
        `;

        // Bind Tab Click Events
        document.getElementById('tab-id').addEventListener('click', (e) => {
            this.switchTab(e.target);
            this.renderInteractiveCard(this.currentUser);
        });
        
        document.getElementById('tab-album').addEventListener('click', (e) => {
            this.switchTab(e.target);
            this.renderAlbum(this.currentUser.id);
        });
    }

    switchTab(btn) {
        document.querySelectorAll('.htab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SoundManager.play('click');
    }

    /**
     * Renders the Interactive 3D Card (Identity).
     */
    renderInteractiveCard(user) {
        const container = document.getElementById('home-dynamic-content');
        
        // 1. Stats Setup
        const stats = { 
            rating: user.stats?.rating || 60, 
            pac: 65, sho: 55, pas: 60, 
            dri: 58, def: 50, phy: 62, 
            pos: user.position || 'FAN' 
        };
        
        // 2. Avatar Logic
        let visual = user.visualDna || { skin: 1, kit: 1, hair: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        
        const avatarHtml = AvatarEngine.generateAvatarHTML(visual, user.username);
        const bgUrl = "assets/images/backgrounds/street-bg.webp";

        // 3. Construct HTML (Matches cards.css v6.5.0)
        container.innerHTML = `
            <div class="card-container fade-in">
                
                <!-- THE ARTIFACT (Clickable Card) -->
                <div class="player-card rarity-common" id="my-player-card" style="background-image: url('${bgUrl}');">
                    
                    <!-- A. THE OVERLAY MENU (Hidden by default) -->
                    <div class="card-actions-overlay" id="card-overlay">
                        
                        <button class="action-btn-large" id="btn-edit-look">
                            <i class="fa-solid fa-shirt"></i> غرفة الملابس
                        </button>
                        
                        <button class="action-btn-large" id="btn-open-album">
                            <i class="fa-solid fa-images"></i> ألبومي
                        </button>
                        
                        <button class="action-btn-large" onclick="alert('مشاركة: قريباً')">
                            <i class="fa-solid fa-share-nodes"></i> مشاركة
                        </button>

                        <span class="close-hint">اضغط في أي مكان للعودة</span>
                    </div>

                    <!-- B. CARD CONTENT -->
                    <div class="card-top">
                        <div class="card-rating text-gold">${stats.rating}</div>
                        <div class="card-pos">${stats.pos}</div>
                        <div class="card-flag"><i class="fa-solid fa-location-dot"></i></div>
                    </div>
                    
                    <div class="card-image-area">
                        ${avatarHtml}
                    </div>

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
            </div>`;

        // 4. Bind Interactions
        const card = document.getElementById('my-player-card');

        // Toggle Overlay on Click
        card.addEventListener('click', (e) => {
            // Prevent toggling if clicking a button inside overlay
            if (e.target.closest('button')) return;
            
            card.classList.toggle('active-mode');
            SoundManager.play('click');
        });

        // Bind Overlay Buttons
        document.getElementById('btn-edit-look').onclick = () => {
            this.profileCtrl.openEditModal();
        };

        // Shortcut to Album Tab
        document.getElementById('btn-open-album').onclick = () => {
            document.getElementById('tab-album').click(); // Simulate tab click
        };
    }

    /**
     * TAB 2: Render Album (Collected Cards).
     */
    async renderAlbum(userId) {
        const container = document.getElementById('home-dynamic-content');
        container.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';

        try {
            // Fetch GIFT cards
            const { data: cards, error } = await supabase
                .from('cards')
                .select('*')
                .eq('owner_id', userId)
                .eq('type', 'GIFT')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!cards || cards.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="text-align:center; margin-top:30px;">
                        <i class="fa-solid fa-box-open" style="font-size:3rem; margin-bottom:15px; color:#555;"></i>
                        <p class="text-muted">الألبوم فارغ.</p>
                        <small style="color:#666;">اطلب توقيعات من اللاعبين في الكشاف.</small>
                    </div>`;
                return;
            }

            // Render Grid
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
     * Helper: Mini Card for Album
     */
    renderMiniCard(card) {
        let visual = card.visual_dna;
        if(typeof visual === 'string') visual = JSON.parse(visual);
        
        // Simple avatar for mini card
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
                    <div class="scout-tags"><span style="color:var(--gold-main);">GIFT</span></div>
                </div>
            </div>`;
    }

    /**
     * Header & Notification Logic
     */
    initSettingsButton() {
        const header = document.getElementById('global-header');
        if (document.getElementById('btn-settings')) return;

        header.insertAdjacentHTML('afterbegin', `
            <button id="btn-settings" style="background:none; border:none; color:var(--text-muted); font-size:1.1rem; margin-right:10px; cursor:pointer; transition: color 0.2s;">
                <i class="fa-solid fa-gear"></i>
            </button>
        `);

        document.getElementById('btn-settings').addEventListener('click', () => {
            this.profileCtrl.openEditModal(); // Use Profile Editor as Settings for now
        });
    }

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

    async checkUnreadMessages(userId) {
        try {
            const actions = await this.notifService.getPendingActions(userId);
            const badge = document.getElementById('notif-badge');
            if (actions.length > 0 && badge) badge.style.display = 'block';
        } catch (e) { console.warn("Silent Notif Check Failed"); }
    }

    async openNotificationModal(userId) {
        const modalId = 'modal-notifications';
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header"><h3>مركز الإجراءات</h3><button class="close-btn" id="btn-close-notif">&times;</button></div>
                        <div id="notif-list-container" class="notif-list"><div class="loader-bar" style="margin: 20px auto;"></div></div>
                    </div>
                </div>`);
            document.getElementById('btn-close-notif').addEventListener('click', () => document.getElementById(modalId).classList.add('hidden'));
        }

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        
        const container = document.getElementById('notif-list-container');
        container.innerHTML = '<div class="loader-bar" style="margin: 20px auto;"></div>';

        try {
            const actions = await this.notifService.getPendingActions(userId);
            if (actions.length === 0) {
                container.innerHTML = `<div class="empty-notif"><i class="fa-regular fa-bell-slash" style="font-size:2rem; margin-bottom:10px;"></i><p>لا توجد إشعارات جديدة</p></div>`;
                return;
            }

            container.innerHTML = actions.map(act => `
                <div class="notif-card">
                    <div class="notif-info">
                        <div class="notif-icon"><i class="fa-solid ${act.type === 'MINT_REQUEST' ? 'fa-pen-fancy' : 'fa-handshake'}"></i></div>
                        <div class="notif-text"><h4>${act.title}</h4><p>${act.desc}</p><small class="text-muted">${new Date(act.time).toLocaleDateString('ar-EG')}</small></div>
                    </div>
                    <div class="notif-actions">
                        <button class="btn-accept" data-type="${act.type}" data-id="${act.id}">موافقة</button>
                        <button class="btn-reject" data-type="${act.type}" data-id="${act.id}">رفض</button>
                    </div>
                </div>`).join('');

            this.bindNotificationActions(userId, modal);
        } catch (e) { container.innerHTML = `<p class="error-text">فشل التحميل: ${e.message}</p>`; }
    }

    bindNotificationActions(userId, modal) {
        const handleAction = async (btn, actionType) => {
            const { type, id } = btn.dataset;
            if(!confirm(actionType === 'ACCEPT' ? "تأكيد الموافقة؟" : "تأكيد الرفض؟")) return;
            btn.disabled = true; btn.textContent = "...";
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
                this.checkUnreadMessages(userId);
            } catch (err) {
                alert("خطأ: " + err.message);
                btn.disabled = false;
            }
        };

        modal.querySelectorAll('.btn-accept').forEach(b => b.addEventListener('click', (e) => handleAction(e.target, 'ACCEPT')));
        modal.querySelectorAll('.btn-reject').forEach(b => b.addEventListener('click', (e) => handleAction(e.target, 'REJECT')));
    }
}
