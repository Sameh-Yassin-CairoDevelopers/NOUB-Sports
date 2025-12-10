/*
 * Filename: js/core/appClass.js
 * Version: 2.0.0
 * Description: The main Application Controller. Orchestrates services,
 * manages global state, and handles the initial loading sequence.
 */

import { Router } from './router.js';
import { TelegramService } from './telegram.js';
import { State } from './state.js';
// ملاحظة: سيتم استيراد الخدمات (Services) في الجزء الثالث
// import { AuthServices } from '../services/authService.js'; 

export class App {
    constructor() {
        this.router = new Router();
        this.telegram = new TelegramService();
        this.state = new State();
        // this.auth = new AuthServices(); // سنفعلها في الجزء القادم
    }

    /**
     * Main Initialization Loop
     */
    async init() {
        console.log("🚀 NOUB SPORTS System Init...");

        // 1. Setup Telegram Environment
        this.telegram.init();

        // 2. Simulate Loading / Database Connection Check
        // (سيتم استبدال هذا بفحص حقيقي في الجزء القادم)
        await this.simulateSystemCheck();

        // 3. Routing Decision (Logic)
        this.handleRouting();
    }

    /**
     * Temporary simulation for splash screen delay
     */
    simulateSystemCheck() {
        return new Promise(resolve => setTimeout(resolve, 1500));
    }

    /**
     * Determines which screen to show based on user state
     */
    handleRouting() {
        const splash = document.getElementById('screen-splash');
        
        // Hide Splash
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.classList.remove('active'), 500);
        }

        // Logic: If Logged In -> Home, Else -> Onboarding
        // حالياً نذهب للتسجيل مباشرة لأننا لم نكتب خدمة الـ Auth بعد
        this.router.navigate('view-onboarding');
    }
}