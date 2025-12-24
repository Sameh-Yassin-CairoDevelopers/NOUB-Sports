/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/homeCtrl.js
 * Version: Noub Sports_beta 4.2.0 (GOLDEN MASTER)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * The Master Controller for the "Locker Room" (User Dashboard).
 * It acts as the primary interface for the Authenticated User.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Identity Rendering: Displays the interactive Player Card with real-time stats.
 * 2. Header Management: Updates the Global Header (Name, Zone) and binds the 
 *    Notification Bell events without duplicating DOM elements.
 * 3. Album Management: Fetches and renders the "Gifted Cards" collection using 
 *    the new visual scaling engine to match the Scout view.
 * 4. Notification System: Manages the Modal logic for accepting/rejecting requests.
 * 
 * DEPENDENCIES:
 * - NotificationService: For fetching alerts.
 * - ProfileController: For the "Edit Look" modal.
 * - AvatarEngine: For generating the visual representation of players.
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
     * Establishes connection with Sub-Controllers and Services.
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
     * Called by AppClass upon successful authentication or navigation.
     * 
     * @param {Object} user - The authenticated User Model.
     */
    render(user) {
        if (!user) return;
        this.currentUser = user;

        // 1. Update Global Header UI (Text & Zone)
        this.updateHeaderUI(user);

        // 2. Bind Header Events (Notification Bell)
        // Note: We do not inject HTML here anymore to avoid conflicts with index.html
        this.bindHeaderEvents(user.id);

        // 3. Render Identity Card (The Hero Section)
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
        const zoneEl = document.getElementById('header-zone');

        if (nameEl) nameEl.textContent = user.username;

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
     * Binds events to the Static Header Buttons defined in index.html.
     * Uses node cloning to strip previous event listeners (preventing duplication).
     * 
     * @param {string} userId - Current User ID.
     */
    bindHeaderEvents(userId) {
        // A. Bind Notification Bell
        const btnNotif = document.getElementById('btn-header-notif');
        
        if (btnNotif) {
            // Clone and replace to clear old listeners from previous renders
            const newBtn = btnNotif.cloneNode(true);
            btnNotif.parentNode.replaceChild(newBtn, btnNotif);
            
            // Attach new listener
            newBtn.addEventListener('click', () => {
                SoundManager.play('click');
                this.openNotificationModal(userId);
            });
            
            // Initial Check for Unread Messages (Red Dot Logic)
            this.checkUnreadMessages(userId);
        }
        
        // Note: The Hamburger Menu is handled globally by MenuController.
    }

    /**
     * Checks DB for pending actions and toggles the red badge.
     * 
     * @param {string} userId - Current User ID.
     */
    async checkUnreadMessages(userId) {
        try {
            const actions = await this.notifService.getPendingActions(userId);
            const badge = document.getElementById('header-notif-badge');
            
            if (actions.length > 0 && badge) {
                badge.classList.remove('hidden'); // Show Red Dot
            } else if (badge) {
                badge.classList.add('hidden');    // Hide Red Dot
            }
        } catch (e) { 
            console.warn("Silent Notif Check Failed"); 
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
                    
                    <!-- Native Scale for Main Card -->
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
     * [VISUAL UPDATE]: Uses 'market-grid' layout and 'renderFullAlbumCard'
     * to match the visual fidelity of the Scout Marketplace.
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
     * Uses AvatarEngine to generate full HTML and CSS scaling (.scout-avatar-wrapper) 
     * to fit the grid perfectly while showing the full body.
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
        let rarityClass = this.calculateRarityClass(matches);

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
       SECTION 3: UTILITIES (RARITY & MARKET VALUE)
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

    /* =========================================================================
       SECTION 4: NOTIFICATION SYSTEM
       ========================================================================= */

    /**
     * Builds and opens the Notification Modal.
     * Dynamically loads content from NotificationService.
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

        // 2. Show Modal & Load Data
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        
        const container = document.getElementById('notif-list-container');
        container.innerHTML = '<div class="loader-bar" style="margin: 20px auto;"></div>';

        try {
            const actions = await this.notifService.getPendingActions(userId);
            
            // Empty State
            if (actions.length === 0) {
                container.innerHTML = `
                    <div class="empty-notif" style="text-align:center; padding:20px;">
                        <i class="fa-regular fa-bell-slash" style="font-size:2rem; margin-bottom:10px; color:#555;"></i>
                        <p class="text-muted">لا توجد إشعارات جديدة</p>
                    </div>`;
                return;
            }

            // Render Cards
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
     * Uses the NotificationService to execute the logic.
     */
    bindNotificationActions(userId, modal) {
        const handleAction = async (btn, actionType) => {
            const { type, id } = btn.dataset;
            
            // Safety Check
            if(!confirm(actionType === 'ACCEPT' ? "تأكيد الموافقة؟" : "تأكيد الرفض؟")) return;
            
            // Optimistic UI
            btn.disabled = true;
            btn.textContent = "...";
            
            try {
                // Execute Service Call based on Type
                if (type === 'MINT_REQUEST') {
                    if(actionType === 'ACCEPT') await this.notifService.approveMint(id, userId);
                    else await this.notifService.rejectMint(id);
                } else if (type === 'MATCH_VERIFY') {
                    if(actionType === 'ACCEPT') await this.notifService.confirmMatch(id);
                    else await this.notifService.rejectMatch(id);
                } else if (type === 'OPS_UPDATE') {
                    // Just clear notification for info updates
                    // (Assuming a markAsRead service exists, handled implicitly via reload for now)
                }
                
                SoundManager.play('success');
                alert("تمت العملية بنجاح!");
                modal.classList.add('hidden');
                
                // Refresh Badge
                this.checkUnreadMessages(userId); 
                
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
