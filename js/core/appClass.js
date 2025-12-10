/*
 * Filename: js/core/appClass.js
 * Version: 2.1.0 (Fix: Controller Activation + Splash Removal)
 */

import { Router } from './router.js';
import { TelegramService } from './telegram.js';
import { State } from './state.js';
// هام: استيراد المتحكم
import { OnboardingController } from '../controllers/onboardingCtrl.js';

export class App {
    constructor() {
        this.router = new Router();
        this.telegram = new TelegramService();
        this.state = new State();
        // تفعيل المتحكم فوراً
        this.onboardingCtrl = new OnboardingController();
    }

    async init() {
        console.log("🚀 NOUB SPORTS System Init...");

        // 1. Setup Telegram
        this.telegram.init();

        // 2. Simulate Loading
        await this.simulateSystemCheck();

        // 3. Routing & Splash Removal
        this.handleRouting();
    }

    simulateSystemCheck() {
        return new Promise(resolve => setTimeout(resolve, 1500));
    }

    handleRouting() {
        const splash = document.getElementById('screen-splash');
        
        // أ. إزالة شاشة التحميل تماماً (لأنها كانت تغطي الأزرار وتمنع الضغط)
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none'; // إخفاء نهائي
                splash.classList.remove('active');
            }, 500);
        }

        // ب. الذهاب لشاشة التسجيل
        this.router.navigate('view-onboarding');
        
        // ج. إعادة تهيئة المتحكم للتأكد من ربط الأزرار
        this.onboardingCtrl.init();
    }
}
