/*
 * Filename: js/controllers/homeCtrl.js
 * Version: 2.0.0
 * Description: Controls the Home View (Locker Room).
 * Updates the header and main display with User data.
 */

export class HomeController {
    constructor() {
        console.log("🏠 Home Controller Initialized");
    }

    /**
     * Renders user data into the UI
     * @param {User} user - The User Model
     */
    render(user) {
        // 1. Update Header Elements
        const nameEl = document.getElementById('header-name');
        const balanceEl = document.getElementById('header-balance');
        const zoneEl = document.getElementById('header-club'); // Reusing ID for Zone display

        if (nameEl) nameEl.textContent = user.username;
        if (balanceEl) balanceEl.textContent = user.balance;
        
        // Map Zone ID to Name
        const zoneNames = {
            1: 'الفسطاط / المعادي',
            2: 'مصر القديمة / المنيل',
            3: 'حلوان / التبين'
        };
        
        if (zoneEl) {
            zoneEl.textContent = zoneNames[user.zoneId] || 'منطقة غير محددة';
        }

        // 2. Future: Render Player Card (3D)
        // This will be implemented when we fetch the card data in the next phase.
    }
}
