/*
 * Filename: js/controllers/homeCtrl.js
 * Version: 3.2.0 (FINAL MASTER)
 * Description: Controls the Home View (Locker Room).
 */

import { NotificationService } from '../services/notificationService.js';
import { State } from '../core/state.js';

export class HomeController {
    constructor() {
        this.notifService = new NotificationService();
        this.state = new State();
        this.viewContainer = document.getElementById('view-home');
        console.log("🏠 Home Controller: Ready.");
    }

    render(user) {
        if (!user) return;
        this.updateHeaderUI(user);
        this.renderPlayerCard(user);
        this.initNotificationSystem(user.id);
    }

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
        if (zoneEl) zoneEl.textContent = zoneNames[user.zoneId] || 'منطقة غير محددة';
    }

    renderPlayerCard(user) {
        const stats = { rating: 60, pac: 65, sho: 55, pas: 60, dri: 58, def: 50, phy: 62, pos: 'FWD' };
        
        let visual = { skin: 1, kit: 1 };
        if (user.visualDna) {
            visual = typeof user.visualDna === 'string' ? JSON.parse(user.visualDna) : user.visualDna;
        }

        const skinColors = ['#F5C6A5', '#C68642', '#8D5524'];
        const kitColors  = ['#EF4444', '#10B981', '#3B82F6'];
        
        const finalSkin = skinColors[(visual.skin || 1) - 1] || skinColors[0];
        const finalKit  = kitColors[(visual.kit || 1) - 1] || kitColors[0];

        this.viewContainer.innerHTML = `
            <div class="card-container fade-in">
                <div class="player-card rarity-common">
                    <div class="card-top">
                        <div class="card-rating text-gold">${stats.rating}</div>
                        <div class="card-pos">${stats.pos}</div>
                        <div class="card-flag"><i class="fa-solid fa-location-dot"></i></div>
                    </div>
                    <div class="card-image-area">
                        <div class="avatar-display-large" style="color: ${finalSkin}; filter: drop-shadow(0 0 5px ${finalKit});">
                            <i class="fa-solid fa-user-astronaut"></i>
                        </div>
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
                <div class="home-actions">
                    <button class="btn-action-secondary" onclick="alert('خدمة التعديل: قريباً')"><i class="fa-solid fa-pen-nib"></i> تعديل المظهر</button>
                    <button class="btn-action-secondary" onclick="alert('خدمة المشاركة: قريباً')"><i class="fa-solid fa-share-nodes"></i> مشاركة</button>
                </div>
            </div>`;
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
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header"><h3>مركز الإجراءات</h3><button class="close-btn" id="btn-close-notif">&times;</button></div>
                        <div id="notif-list-container" class="notif-list"><div class="loader-bar" style="margin: 20px auto;"></div></div>
                    </div>
                </div>`);
            document.getElementById('btn-close-notif').addEventListener('click', () => { document.getElementById(modalId).classList.add('hidden'); });
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

            this.bindNotificationActions(userId);
        } catch (e) { container.innerHTML = `<p class="error-text">فشل تحميل الإشعارات: ${e.message}</p>`; }
    }

    bindNotificationActions(userId) {
        const modal = document.getElementById('modal-notifications');
        document.querySelectorAll('.btn-accept').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const { type, id } = e.target.dataset;
                if(!confirm("هل أنت متأكد من الموافقة؟")) return;
                e.target.disabled = true; e.target.textContent = "...";
                try {
                    if (type === 'MINT_REQUEST') await this.notifService.approveMint(id, userId);
                    else if (type === 'MATCH_VERIFY') await this.notifService.confirmMatch(id);
                    alert("تمت العملية بنجاح!"); modal.classList.add('hidden'); this.checkUnreadMessages(userId);
                } catch (err) { alert("خطأ: " + err.message); e.target.disabled = false; }
            });
        });
        document.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const { type, id } = e.target.dataset;
                if(!confirm("رفض الطلب؟")) return;
                try {
                    if (type === 'MINT_REQUEST') await this.notifService.rejectMint(id);
                    else if (type === 'MATCH_VERIFY') await this.notifService.rejectMatch(id);
                    alert("تم الرفض."); modal.classList.add('hidden');
                } catch (err) { alert("خطأ: " + err.message); }
            });
        });
    }
}
