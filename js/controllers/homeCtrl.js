/*
 * Filename: js/controllers/homeCtrl.js
 * Version: 2.2.0
 * Description: Controls the Home View (Locker Room).
 * Responsible for rendering the Player Card dynamically based on User Data.
 */

export class HomeController {
    constructor() {
        console.log("🏠 Home Controller Initialized");
    }

    /**
     * Main Render Function
     * @param {User} user - The logged-in User Object
     */
    render(user) {
        // 1. Update Global Header
        this.updateHeader(user);

        // 2. Render Player Card in Main View
        this.renderCard(user);
    }

    updateHeader(user) {
        const nameEl = document.getElementById('header-name');
        const balanceEl = document.getElementById('header-balance');
        const zoneEl = document.getElementById('header-zone');

        if (nameEl) nameEl.textContent = user.username;
        if (balanceEl) balanceEl.textContent = user.balance;

        // Zone Mapping
        const zoneNames = {
            1: 'الفسطاط / المعادي',
            2: 'مصر القديمة / المنيل',
            3: 'حلوان / التبين'
        };
        if (zoneEl) {
            zoneEl.textContent = zoneNames[user.zoneId] || 'غير محدد';
        }
    }

    renderCard(user) {
        const homeView = document.getElementById('view-home');
        if (!homeView) return;

        // Default Stats (Simulation for MVP)
        // In Day 3, we will fetch real stats from 'cards' table
        const stats = {
            rating: 60,
            pac: 65, sho: 55, pas: 60, dri: 58, def: 50, phy: 62,
            pos: 'FWD' // This should come from DB
        };

        // Constructing the Card HTML (Neo-Pharaonic Design)
        homeView.innerHTML = `
            <div class="card-container fade-in">
                
                <!-- THE CARD -->
                <div class="player-card rarity-common">
                    <!-- Top Info -->
                    <div class="card-top">
                        <div class="card-rating text-gold">${stats.rating}</div>
                        <div class="card-pos">${stats.pos}</div>
                        <div class="card-flag">
                            <i class="fa-solid fa-location-dot"></i>
                        </div>
                    </div>
                    
                    <!-- Avatar Image Area -->
                    <div class="card-image-area">
                        <div class="avatar-display-large">
                            <i class="fa-solid fa-user-astronaut"></i>
                        </div>
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

                <!-- ACTION BUTTONS -->
                <div class="home-actions">
                    <button class="btn-action-secondary" onclick="alert('قريباً: تعديل')">
                        <i class="fa-solid fa-pen"></i> تعديل
                    </button>
                    <button class="btn-action-secondary" onclick="alert('قريباً: مشاركة')">
                        <i class="fa-solid fa-share-nodes"></i> مشاركة
                    </button>
                </div>

            </div>
        `;
    }
}
