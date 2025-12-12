/*
 * Filename: js/controllers/onboardingCtrl.js
 * Version: 3.3.0 (HOTFIX)
 * Description: Controls Onboarding View.
 * FIX: Calls 'registerUserTelegram' instead of 'registerUser'.
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { MintingService } from '../services/mintingService.js';

export class OnboardingController {
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        this.mintingService = new MintingService();
        this.init();
    }

    init() {
        console.log("🎮 Onboarding Controller Active");
        this.bindEvents();
    }

    bindEvents() {
        // 1. Avatar Controls
        document.getElementById('btn-skin-next')?.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('skin', 1); });
        document.getElementById('btn-skin-prev')?.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('skin', -1); });
        document.getElementById('btn-kit-next')?.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('kit', 1); });
        document.getElementById('btn-kit-prev')?.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('kit', -1); });

        // 2. Activity Type Logic
        const activitySelect = document.getElementById('inp-activity');
        const posGroup = document.getElementById('group-position');
        
        if (activitySelect) {
            activitySelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'FAN' || val === '' || val === 'INACTIVE') {
                    posGroup.classList.add('hidden');
                } else {
                    posGroup.classList.remove('hidden');
                }
            });
        }

        // 3. Tab Switching
        const tabTg = document.getElementById('tab-tg');
        const tabEmail = document.getElementById('tab-email');
        if (tabTg && tabEmail) {
            tabTg.addEventListener('click', (e) => this.switchTab(e, 'panel-tg'));
            tabEmail.addEventListener('click', (e) => this.switchTab(e, 'panel-email'));
        }

        // 4. Form Submissions
        // Main Form (Default is Telegram Mint)
        document.getElementById('form-register')?.addEventListener('submit', (e) => this.handleTelegramMint(e));
        
        // Email Buttons (If present in HTML)
        document.getElementById('btn-login')?.addEventListener('click', () => this.handleEmailLogin());
        document.getElementById('btn-signup')?.addEventListener('click', () => this.handleEmailSignup());
    }

    switchTab(e, panelId) {
        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        // Logic to switch panels (Requires panel-tg and panel-email divs in HTML)
        // For MVP Day 4, we might default to TG form.
    }

    /**
     * HANDLER: Telegram Minting (The Fix)
     */
    async handleTelegramMint(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-mint');
        btn.disabled = true;
        btn.textContent = "جاري الاتصال بالخورا...";

        // Collect Data
        const name = document.getElementById('inp-name').value;
        const zone = document.getElementById('inp-zone').value;
        const activity = document.getElementById('inp-activity').value;
        
        // Position Logic
        let pos = 'FAN';
        if (!document.getElementById('group-position').classList.contains('hidden')) {
            const posEl = document.querySelector('input[name="pos"]:checked');
            pos = posEl ? posEl.value : 'FWD';
        }

        try {
            // FIX: Using registerUserTelegram instead of registerUser
            // Because AuthService V3.2.0 split the logic.
            const newUser = await this.authService.registerUserTelegram({
                telegramId: null, // Service handles generation
                username: name,
                zoneId: parseInt(zone),
                activityType: activity,
                position: pos,
                visualDna: this.avatarEngine.getConfig()
            });

            // Note: registerUserTelegram inside AuthService ALREADY calls _mintGenesisCard internally.
            // So we don't need to call mintingService manually here to avoid duplicates.
            // But if we want to be safe, we rely on AuthService return.

            alert("تم صك الهوية بنجاح! جاري الدخول...");
            window.location.reload();

        } catch (err) {
            console.error("Minting Error:", err);
            alert("حدث خطأ: " + err.message);
            btn.disabled = false;
            btn.textContent = "صك الهوية";
        }
    }

    // Email Handlers (Optional for now)
    async handleEmailLogin() { /* ... code from previous batch if needed ... */ }
    async handleEmailSignup() { /* ... code from previous batch if needed ... */ }
}
