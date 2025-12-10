/*
 * Filename: js/core/telegram.js
 * Version: 2.0.0
 * Description: Wrapper for the Telegram Web App SDK.
 * Handles theming, haptic feedback, and user data retrieval.
 */

export class TelegramService {
    constructor() {
        this.tg = window.Telegram?.WebApp;
    }

    init() {
        if (this.tg) {
            this.tg.ready();
            this.tg.expand(); // Fullscreen
            
            // Set Header Color to match design
            try {
                this.tg.setHeaderColor('#1c1e24'); // matches --bg-surface
                this.tg.setBackgroundColor('#0f1014'); // matches --bg-primary
            } catch (e) {
                console.warn("Telegram theming not supported on this version.");
            }
            
            console.log("✅ Telegram SDK Initialized");
        } else {
            console.warn("⚠️ Telegram SDK not found (Browser Mode)");
        }
    }

    getUser() {
        return this.tg?.initDataUnsafe?.user || null;
    }

    triggerHaptic(style = 'light') {
        if (this.tg?.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred(style);
        }
    }
}
