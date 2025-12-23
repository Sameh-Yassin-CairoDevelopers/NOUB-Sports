/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/homeCtrl.js
 * Version: Noub Sports_beta 3.1.0 (MASTER VISUAL FIX)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * The Master Controller for the "Locker Room" (User Dashboard).
 * Responsible for rendering the User Identity, Global Header updates, 
 * Notification System, and the Digital Album.
 * 
 * [UPDATED IN V3.1.0]:
 * - Synchronized 'Album View' rendering logic with 'Scout View'.
 * - Implemented 'Avatar Scaling' to display full-body players on small cards.
 * - Added comprehensive JSDoc comments for academic standards.
 * -----------------------------------------------------------------------------
 */

import { NotificationService } from '../services/notificationService.js';
import { ProfileController } from './profileCtrl.js';
import { state } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { AvatarEngine } from '../utils/avatarEngine.js';
import { SoundManager } from '../utils/soundManager.js';
import { Helpers } from '../utils/helpers.js';

export class HomeController {
    
    /**
     * Constructor: Initializes dependencies and DOM references.
     * Establishes connection with Sub-Controllers (Profile) and Services.
     */
    constructor() {
        // Services & Sub-Controllers
        this.notifService = new NotificationService();
        this.profileCtrl = new ProfileController();
        
        // Main View Container
        this.viewContainer = document.getElementById('view-home');
        
        // Internal State
        this.currentUser = null;
        
        console.log("🏠 Home Controller: Initialized & Ready.");
    }

    /**
     * Main Entry Point: Renders the Dashboard based on User State.
     * Called by AppClass upon successful authentication.
     * 
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

        // 3. Render Identity Card DIRECTLY (No Layout/Tabs Wrapper)
        this.renderInteractiveCard(user);
    }

    /**
     * Updates the persistent Global Header with dynamic data.
     * Maps numeric Zone IDs to readable string names.
     * 
     * @param {Object} user - User data object.
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

    /* =========================================================================
       SECTION 1: THE IDENTITY CARD (HERO SECTION)
       ========================================================================= */

    /**
     * Renders the Interactive Player Card.
     * Features: Layered Avatar, Stats, Market Value, Rarity Border, and Action Overlay.
     * 
     * @param {Object} user - User data object.
     */
    renderInteractiveCard(user) {
        // Clear container first to ensure no duplicate views
        this.viewContainer.innerHTML = '';
        
        // 1. Setup Stats (Fallback logic for new users)
        const stats = { 
            rating: user.stats?.rating || 60, 
            matches: user.stats?.matches || 0,
            goals: user.stats?.goals || 0,
            pac: 65, sho: 55, pas: 60, 
            dri: 58, def: 50, phy: 62, 
            pos: user.position || 'FAN' 
        };

        // 2. Calculate Derived Metrics
        const rarityClass = this.calculateRarityClass(stats.matches);
        const marketValue = this.calculateMarketValue(stats, user.reputation || 100);

        // 3. Generate Avatar HTML using the Engine (Full Size)
        let visual = user.visualDna || { skin: 1, kit: 1, hair: 1 };
        if (typeof visual === 'string') visual = JSON.parse(visual);
        const avatarHtml = AvatarEngine.generateAvatarHTML(visual, user.username);
        
        // 4. Background Asset
        const bgUrl = "assets/images/backgrounds/street-bg.webp";

        // 5. Construct HTML Structure
        this.viewContainer.innerHTML = `
            <div class="card-container fade-in" style="height: 100%; justify-content: center;">
                
                <!-- Market Value Badge -->
                <div style="
                    background: rgba(0,0,0,0.6); border: 1px solid var(--success); 
                    color: var(--success); padding: 5px 15px; border-radius: 20px; 
                    font-family: 'Orbitron'; font-weight: bold; font-size: 0.9rem;
                    display: flex; align-items: center; gap: 8px; margin-bottom: -10px; z-index: 50;">
                    <i class="fa-solid fa-chart-line"></i>
                    ${Helpers.formatCurrency(marketValue)}
                </div>

                <!-- THE CARD ARTIFACT -->
                <div class="player-card ${rarityClass}" id="my-player-card" style="background-image: url('${bgUrl}');">
                    
                    <!-- A. OVERLAY MENU (Hidden by default) -->
                    <div class="card-actions-overlay" id="card-overlay">
                        <button class="action-btn-large" id="btn-edit-look">
                            <i class="fa-solid fa-shirt"></i> غرفة الملابس
                        </button>
                        
                        <button class="action-btn-large" id="btn-open-album">
                            <i class="fa-solid fa-images"></i> ألبومي
                        </button>
                        
                        <button class="action-btn-large" onclick="alert('خدمة المشاركة: قريباً')">
                            <i class="fa-solid fa-share-nodes"></i> مشاركة
                        </button>

                        <span class="close-hint">اضغط للعودة</span>
                    </div>

                    <!-- B. VISIBLE CONTENT -->
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
        
        // 6. Bind Interactions
        const card = document.getElementById('my-player-card');
        
        // Toggle Overlay on Card Click
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

        document.getElementById('btn-open-album').onclick = () => {
            // Navigate to Album View
            this.renderAlbum(this.currentUser.id);
        };
    }

    /* =========================================================================
       SECTION 2: THE DIGITAL ALBUM (UPDATED V3.1)
       ========================================================================= */

    /**
     * Renders the Album View.
     * Replaces the Card View temporarily. Includes a "Back" button.
     * 
     * [UPDATE]: Now uses the 'market-grid' layout to match Scout view.
     * 
     * @param {string} userId - ID of the current user.
     */
    async renderAlbum(userId) {
        // Show Loading State
        this.viewContainer.innerHTML = '<div class="loader-bar" style="margin:20px auto"></div>';

        try {
            // Fetch collected cards (Type = GIFT)
            const { data: cards, error } = await supabase
                .from('cards')
                .select('*')
                .eq('owner_id', userId)
                .eq('type', 'GIFT')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Header Construction with Back Button
            let html = `
                <div class="scout-header" style="width:90%; margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
                    <button id="btn-back-home" style="background:none; border:none; color:var(--gold-main); font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:5px;">
                        <i class="fa-solid fa-arrow-right"></i> عودة للكارت
                    </button>
                    <h3 style="text-align:center; color:#fff; margin:0;">ألبوم الهدايا (${cards?.length || 0})</h3>
                </div>
            `;

            // Empty State Logic
            if (!cards || cards.length === 0) {
                html += `
                    <div class="empty-state" style="text-align:center; margin-top:30px;">
                        <i class="fa-solid fa-box-open" style="font-size:3rem; margin-bottom:15px; color:#555;"></i>
                        <p class="text-muted">الألبوم فارغ.</p>
                        <small style="color:#666;">اطلب توقيعات من اللاعبين في الكشاف لتظهر هنا.</small>
                    </div>`;
            } else {
                // [UPDATE]: Using Grid Layout for Cards
                html += `
                    <div class="market-grid" style="width:100%; padding:0 20px; margin-top:20px; display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                        ${cards.map(c => this.renderFullAlbumCard(c)).join('')}
                    </div>
                `;
            }

            this.viewContainer.innerHTML = html;

            // Bind Back Button
            document.getElementById('btn-back-home').onclick = () => {
                this.renderInteractiveCard(this.currentUser);
            };

        } catch (e) {
            console.error(e);
            this.viewContainer.innerHTML = '<p class="error-text">فشل تحميل الألبوم.</p>';
        }
    }

    /**
     * [NEW METHOD V3.1]: Generates a High-Fidelity Album Card.
     * Replaces the old 'renderMiniCard'.
     * Uses AvatarEngine to generate full HTML and CSS scaling to fit the grid.
     * 
     * @param {Object} card - The card data object.
     * @returns {string} HTML string of the card component.
     */
    renderFullAlbumCard(card) {
        // 1. Prepare Visual DNA
        let visual = card.visual_dna;
        if(typeof visual === 'string') visual = JSON.parse(visual);
        
        // 2. Generate Full Avatar HTML (Head + Body + Accessories)
        // We pass the name to appear on the shirt inside the generator
        const avatarHtml = AvatarEngine.generateAvatarHTML(visual, card.display_name);
        
        // 3. Calculate Rarity based on stored stats
        const matches = card.stats?.matches || 0;
        let rarityClass = 'rarity-common';
        if (matches >= 100) rarityClass = 'rarity-diamond';
        else if (matches >= 30) rarityClass = 'rarity-gold';
        else if (matches >= 10) rarityClass = 'rarity-silver';

        // 4. Render using the EXACT structure as ScoutController
        return `
            <div class="scout-card player-mode ${rarityClass}" style="height: 260px;">
                <!-- Top Info -->
                <div class="scout-card-top">
                    <span class="scout-pos">#${card.serial_number || 1}</span>
                    <span class="scout-rating text-gold">${card.stats?.rating || 60}</span>
                </div>
                
                <!-- The Scaled Avatar Container -->
                <!-- Utilizes .scout-avatar-wrapper class for CSS transform scale -->
                <div class="scout-avatar-wrapper">
                    ${avatarHtml}
                </div>

                <!-- Bottom Info -->
                <div class="scout-info">
                    <h5>${card.display_name}</h5>
                    <div class="scout-tags">
                        <span style="color:var(--gold-main); font-size:0.6rem;">
                            <i class="fa-solid fa-gift"></i> نسخة موقعة
                        </span>
                    </div>
                </div>
            </div>`;
    }

    /* =========================================================================
       SECTION 3: UTILITIES & SYSTEM
       ========================================================================= */

    /**
     * Logic: Determine Card Rarity based on Experience (Matches played).
     */
    calculateRarityClass(matches) {
        if (matches >= 100) return 'rarity-diamond';
        if (matches >= 30) return 'rarity-gold';
        if (matches >= 10) return 'rarity-silver';
        return 'rarity-common';
    }

    /**
     * Logic: Calculate Market Value based on composite stats.
     */
    calculateMarketValue(stats, reputation) {
        const rating = stats.rating || 60;
        const matches = stats.matches || 0;
        const goals = stats.goals || 0;
        return (rating * 1000) + (matches * 500) + (goals * 1000) + (reputation * 10);
    }

    /**
     * SYSTEM: Init Settings Icon (Gear) in Global Header.
     * Prevents duplication if button already exists.
     */
    initSettingsButton() {
        const header = document.getElementById('global-header');
        if (document.getElementById('btn-settings')) return;

        header.insertAdjacentHTML('afterbegin', `
            <button id="btn-settings" style="background:none; border:none; color:var(--text-muted); font-size:1.1rem; margin-right:10px; cursor:pointer; transition: color 0.2s;">
                <i class="fa-solid fa-gear"></i>
            </button>
        `);

        // Bind to Profile Editor (Acts as Settings menu)
        document.getElementById('btn-settings').addEventListener('click', () => {
            this.profileCtrl.openEditModal();
        });
    }

    /**
     * SYSTEM: Init Notification Bell & Modal logic.
     * Checks for unread messages on load.
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
     * Checks DB for pending actions and toggles the red badge.
     */
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
     * Builds and opens the Notification Modal.
     * Dynamically loads content from NotificationService.
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
                    <div class="empty-notif" style="text-align:center; padding:20px;">
                        <i class="fa-regular fa-bell-slash" style="font-size:2rem; margin-bottom:10px; color:#555;"></i>
                        <p class="text-muted">لا توجد إشعارات جديدة</p>
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
                            <h4 style="font-size:0.9rem; margin-bottom:5px;">${act.title}</h4>
                            <p style="font-size:0.8rem; color:#aaa;">${act.desc}</p>
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
                
                SoundManager.play('success');
                alert("تمت العملية بنجاح!");
                modal.classList.add('hidden');
                this.checkUnreadMessages(userId); // Refresh Badge
                
            } catch (err) {
                SoundManager.play('error');
                alert("خطأ: " + err.message);
                btn.disabled = false;
                btn.textContent = actionType === 'ACCEPT' ? "موافقة" : "رفض";
            }
        };

        modal.querySelectorAll('.btn-accept').forEach(b => b.addEventListener('click', (e) => handleAction(e.target, 'ACCEPT')));
        modal.querySelectorAll('.btn-reject').forEach(b => b.addEventListener('click', (e) => handleAction(e.target, 'REJECT')));
    }
}
