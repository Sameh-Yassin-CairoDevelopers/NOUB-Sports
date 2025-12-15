/*
 * Filename: js/controllers/homeCtrl.js
 * Version: 5.2.0 (MASTER - Identity & Album)
 * Description: Controls the Home View (Locker Room).
 * 
 * FEATURES:
 * 1. Dual View: Switch between 'My Card' (Identity) and 'My Album' (Collection).
 * 2. Visuals: Renders the high-fidelity Shield Card using AvatarEngine.
 * 3. System: Manages the Notification Bell and Actions Modal.
 */

import { NotificationService } from '../services/notificationService.js';
import { state } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { AvatarEngine } from '../utils/avatarEngine.js';

export class HomeController {
    
    constructor() {
        this.notifService = new NotificationService();
        this.viewContainer = document.getElementById('view-home');
        this.currentUser = null;
        console.log("🏠 Home Controller: Ready.");
    }

    /**
     * Main Entry Point
     */
    render(user) {
        if (!user) return;
        this.currentUser = user;

        // 1. Update Top Bar
        this.updateHeaderUI(user);

        // 2. Setup Notification System
        this.initNotificationSystem(user.id);

        // 3. Render Layout (Tabs + Content Area)
        this.renderLayout();
        
        // 4. Default: Show Identity Card
        this.renderIdentity(user);
    }

    /**
     * Updates Global Header
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
            3: 'حلوان / التبين'
        };
        if (zoneEl) {
            zoneEl.textContent = zoneNames[user.zoneId] || 'منطقة غير محددة';
        }
    }

    /**
     * Renders the internal Tabs (Identity vs Album)
     */
    renderLayout() {
        this.viewContainer.innerHTML = `
            <div class="home-wrapper fade-in">
                <!-- Internal Tabs -->
                <div class="home-tabs">
                    <button class="htab active" id="tab-id">بطاقتي</button>
                    <button class="htab" id="tab-album">ألبومي</button>
                </div>

                <!-- Content Container -->
                <div id="home-dynamic-content"></div>
            </div>

            <style>
                .home-wrapper { display: flex; flex-direction: column; align-items: center; padding-bottom: 100px; }
                .home-tabs { 
                    display: flex; gap: 20px; margin-bottom: 20px; margin-top: 10px;
                    border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; width: 80%; justify-content: center;
                }
                .htab { 
                    background: none; border: none; color: #888; font-family: 'Cairo'; font-weight: bold; cursor: pointer; font-size: 1rem; position: relative;
                }
                .htab.active { color: #D4AF37; }
                .htab.active::after {
                    content: ''; position: absolute; bottom: -11px; left: 0; width: 100%; height: 2px; background: #D4AF37;
                }
                #home-dynamic-content { width: 100%; display: flex; justify-content: center; }
            </style>
        `;

        // Bind Tab Events
        document.getElementById('tab-id').addEventListener('click', (e) => {
            this.switchTab(e.target);
            this.renderIdentity(this.currentUser);
        });
        document.getElementById('tab-album').addEventListener('click', (e) => {
            this.switchTab(e.target);
            this.renderAlbum(this.currentUser.id);
        });
    }

    switchTab(btn) {
        document.querySelectorAll('.htab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    /**
     * TAB 1: Render Identity Card (The Shield)
     */
    renderIdentity(user) {
        const container = document.getElementById('home-dynamic-content');
        
        // Stats Logic
        const stats = { 
            rating: user.stats?.rating || 60, 
            pac: 65, sho: 55, pas: 60, 
            dri: 58, def: 50, phy: 62, 
            pos: user.position || 'FAN' 
        };

        // Avatar Logic
        let visual = user.visualDna || { skin: 1, kit: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        
        // Generate Avatar HTML
        const avatarHtml = AvatarEngine.generateAvatarHTML(visual, user.username);
        
        // Determine Background (Local Asset)
        const bgUrl = "assets/images/backgrounds/street-bg.webp";

        container.innerHTML = `
            <div class="card-container fade-in">
                <!-- THE SHIELD CARD -->
                <div class="player-card rarity-common" style="background-image: url('${bgUrl}');">
                    <!-- Top -->
                    <div class="card-top">
                        <div class="card-rating text-gold">${stats.rating}</div>
                        <div class="card-pos">${stats.pos}</div>
                        <div class="card-flag"><i class="fa-solid fa-location-dot"></i></div>
                    </div>
                    
                    <!-- Avatar -->
                    <div class="card-image-area">
                        ${avatarHtml}
                    </div>

                    <!-- Bottom -->
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

                <!-- Actions -->
                <div class="home-actions">
                    <button class="btn-action-secondary" onclick="alert('قريباً: تعديل المظهر')">
                        <i class="fa-solid fa-pen-nib"></i> تعديل
                    </button>
                    <button class="btn-action-secondary" onclick="alert('قريباً: مشاركة')">
                        <i class="fa-solid fa-share-nodes"></i> مشاركة
                    </button>
                </div>
            </div>`;
    }

    /**
     * TAB 2: Render Album (Gifted Cards)
     */
    async renderAlbum(userId) {
        const container = document.getElementById('home-dynamic-content');
        container.innerHTML = '<div class="loader-bar"></div>';

        try {
            // Fetch collected cards
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

            // Render Grid
            container.innerHTML = `
                <div class="market-grid" style="width:100%; padding:0 20px;">
                    ${cards.map(c => this.renderMiniCard(c)).join('')}
                </div>
            `;

        } catch (e) {
            container.innerHTML = '<p class="error-text">فشل تحميل الألبوم.</p>';
        }
    }

    /**
     * Helper: Render Mini Card for Album
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
     * Notification System Setup
     */
    initNotificationSystem(userId) {
        const header = document.getElementById('global-header');
        if (document.getElementById('btn-notif')) return;

        header.insertAdjacentHTML('afterbegin', `
            <button id="btn-notif" style="background:none; border:none; color:#fff; font-size:1.2rem; margin-left:15px; position:relative; cursor:pointer;">
                <i class="fa-solid fa-bell"></i>
                <span id="notif-badge" style="display:none; position:absolute; top:-2px; right:-2px; width:9px; height:9px; background:var(--danger); border-radius:50%; border:1px solid var(--bg-surface);"></span>
            </button>
        `);

        document.getElementById('btn-notif').addEventListener('click', () => { this.openNotificationModal(userId); });
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
        // Check if modal DOM exists
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header"><h3>الإشعارات</h3><button class="close-btn" id="btn-close-notif">&times;</button></div>
                        <div id="notif-list-container" class="notif-list"><div class="loader-bar"></div></div>
                    </div>
                </div>`);
            document.getElementById('btn-close-notif').addEventListener('click', () => document.getElementById(modalId).classList.add('hidden'));
        }

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        
        const container = document.getElementById('notif-list-container');
        try {
            const actions = await this.notifService.getPendingActions(userId);
            if (actions.length === 0) {
                container.innerHTML = `<div class="empty-notif"><p>لا توجد إشعارات.</p></div>`;
                return;
            }
            container.innerHTML = actions.map(act => `
                <div class="notif-card">
                    <div class="notif-info">
                        <div class="notif-icon"><i class="fa-solid fa-bell"></i></div>
                        <div class="notif-text"><h4>${act.title}</h4><p>${act.desc}</p></div>
                    </div>
                    <div class="notif-actions">
                        <button class="btn-accept" data-type="${act.type}" data-id="${act.id}">موافقة</button>
                        <button class="btn-reject" data-type="${act.type}" data-id="${act.id}">رفض</button>
                    </div>
                </div>`).join('');
            
            this.bindNotifActions(userId, modal);

        } catch (e) { container.innerHTML = '<p class="error-text">خطأ في التحميل.</p>'; }
    }

    bindNotifActions(userId, modal) {
        const handle = async (btn, action) => {
            if(!confirm("تأكيد؟")) return;
            try {
                const { type, id } = btn.dataset;
                if (type === 'MINT_REQUEST') {
                    action === 'ACCEPT' ? await this.notifService.approveMint(id, userId) : await this.notifService.rejectMint(id);
                }
                alert("تم!");
                modal.classList.add('hidden');
            } catch (e) { alert(e.message); }
        };

        document.querySelectorAll('.btn-accept').forEach(b => b.onclick = (e) => handle(e.target, 'ACCEPT'));
        document.querySelectorAll('.btn-reject').forEach(b => b.onclick = (e) => handle(e.target, 'REJECT'));
    }
}
