/*
 * Filename: js/controllers/onboardingCtrl.js
 * Version: 2.2.0
 * Description: Controls the Onboarding View interactions.
 * Handles Avatar customization, Form inputs, and Minting submission.
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

    /**
     * Initialize the controller logic
     */
    init() {
        console.log("🎮 Onboarding Controller Initialized");
        this.bindEvents();
    }

    /**
     * Bind all DOM events for this view
     */
    bindEvents() {
        // 1. Avatar Control Buttons (Skin & Kit)
        const btnSkinNext = document.getElementById('btn-skin-next');
        const btnSkinPrev = document.getElementById('btn-skin-prev');
        const btnKitNext = document.getElementById('btn-kit-next');
        const btnKitPrev = document.getElementById('btn-kit-prev');

        if (btnSkinNext) btnSkinNext.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('skin', 1); });
        if (btnSkinPrev) btnSkinPrev.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('skin', -1); });
        if (btnKitNext) btnKitNext.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('kit', 1); });
        if (btnKitPrev) btnKitPrev.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('kit', -1); });

        // 2. Activity Type Logic (Player vs Fan)
        const activitySelect = document.getElementById('inp-activity');
        const posGroup = document.getElementById('group-position');
        
        if (activitySelect) {
            activitySelect.addEventListener('change', (e) => {
                const val = e.target.value;
                const hiddenRoles = ['FAN', 'INACTIVE'];
                
                if (hiddenRoles.includes(val) || val === '') {
                    posGroup.classList.add('hidden');
                } else {
                    posGroup.classList.remove('hidden');
                }
            });
        }

        // 3. Form Submission (Minting)
        const form = document.getElementById('form-register');
        if (form) {
            form.addEventListener('submit', (e) => this.handleMint(e));
        }
    }

    /**
     * Handles the Minting Process
     * @param {Event} e - Submit Event
     */
    async handleMint(e) {
        e.preventDefault();
        
        // UI Feedback
        const btn = document.getElementById('btn-mint');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "جاري الاتصال بالخورا...";

        // Collect Data
        const name = document.getElementById('inp-name').value;
        const zone = document.getElementById('inp-zone').value;
        
        // Handle Position Radio Buttons
        const posElement = document.querySelector('input[name="pos"]:checked');
        const pos = posElement ? posElement.value : 'FAN';

        // Check for Telegram ID (Real or needs generation)
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = tgUser ? tgUser.id.toString() : null;

        try {
            // Step A: Register the User in DB
            const newUser = await this.authService.registerUser({
                username: name,
                zoneId: parseInt(zone),
                telegramId: telegramId // Service handles generation if null
            });

            // Step B: Mint the Player Card
            await this.mintingService.mintCard({
                ownerId: newUser.id,
                name: name,
                position: pos,
                visualDna: this.avatarEngine.getConfig()
            });

            // Success
            alert("تم صك الهوية بنجاح! جاري الدخول...");
            
            // Reload to trigger the main App Auth Check
            window.location.reload();

        } catch (err) {
            console.error("Minting Failed:", err);
            alert("حدث خطأ أثناء التسجيل: " + err.message);
            
            // Reset Button
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}
