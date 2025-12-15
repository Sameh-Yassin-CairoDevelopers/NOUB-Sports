/*
 * Filename: js/controllers/onboardingCtrl.js
 * Version: 5.0.0 (Live Preview Edition)
 * Description: Controls Onboarding & Auth.
 * UPDATES: 
 * - Integrated AvatarEngine for Live Visual Preview.
 * - Live Name Typing on Shirt.
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        // Bind local preview elements
        this.previewContainer = document.getElementById('auth-avatar-display');
        this.nameInput = document.getElementById('inp-name');
        
        this.init();
    }

    init() {
        console.log("🎮 Onboarding Controller Active");
        this.bindEvents();
        // Initial Render of default avatar
        this.updateLivePreview();
    }

    bindEvents() {
        // 1. Avatar Controls
        // Using arrow functions to preserve 'this' context and trigger update
        const bindControl = (id, type, dir) => {
            document.getElementById(id)?.addEventListener('click', (e) => {
                e.preventDefault();
                SoundManager.play('click');
                this.avatarEngine.change(type, dir);
                this.updateLivePreview(); // Refresh visual
            });
        };

        bindControl('btn-skin-next', 'skin', 1);
        bindControl('btn-skin-prev', 'skin', -1);
        bindControl('btn-kit-next', 'kit', 1);
        bindControl('btn-kit-prev', 'kit', -1);

        // 2. Live Name Preview (Type name -> Show on Shirt)
        if (this.nameInput) {
            this.nameInput.addEventListener('input', () => {
                this.updateLivePreview();
            });
        }

        // 3. Activity Type Logic
        const activitySelect = document.getElementById('inp-activity');
        const posGroup = document.getElementById('group-position');
        
        if (activitySelect) {
            activitySelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'FAN' || val === 'INACTIVE' || val === '') {
                    posGroup.classList.add('hidden');
                } else {
                    posGroup.classList.remove('hidden');
                }
            });
        }

        // 4. Tabs & Submit (Standard Logic)
        const tabTg = document.getElementById('tab-tg');
        const tabEmail = document.getElementById('tab-email');
        if (tabTg && tabEmail) {
            tabTg.addEventListener('click', (e) => this.switchTab(e, 'panel-tg'));
            tabEmail.addEventListener('click', (e) => this.switchTab(e, 'panel-email'));
        }

        document.getElementById('form-register')?.addEventListener('submit', (e) => this.handleTelegramMint(e));
        document.getElementById('btn-login')?.addEventListener('click', (e) => this.handleEmailLogin(e));
        document.getElementById('btn-signup')?.addEventListener('click', (e) => this.handleEmailSignup(e));
    }

    /**
     * Updates the preview box using the shared AvatarEngine logic.
     * This ensures what they see is exactly what they get on the card.
     */
    updateLivePreview() {
        if (!this.previewContainer) return;
        
        // Get current config state from engine
        const currentConfig = JSON.parse(this.avatarEngine.getConfig());
        
        // Get name (or default placeholder)
        const name = this.nameInput?.value || 'NOUB';

        // Generate HTML
        const html = AvatarEngine.generateAvatarHTML(currentConfig, name);
        
        // Inject (Replace the placeholder icon)
        // We set parent's innerHTML to clear previous content
        this.previewContainer.parentElement.innerHTML = html;
        
        // Re-assign container reference after innerHTML wipe
        // (Not strictly needed if we target parent, but good practice)
        // Note: The parent is .avatar-preview
    }

    switchTab(e, targetPanelId) {
        e.preventDefault();
        SoundManager.play('click');
        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById('panel-tg').classList.add('hidden');
        document.getElementById('panel-email').classList.add('hidden');
        document.getElementById(targetPanelId).classList.remove('hidden');
    }

    // --- Auth Handlers (Same as previous stable version) ---
    // Copied fully to ensure file completeness

    async handleTelegramMint(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-mint');
        this.setLoadingState(btn, true);

        const name = document.getElementById('inp-name').value;
        const zone = document.getElementById('inp-zone').value;
        const activity = document.getElementById('inp-activity').value;
        
        let pos = 'FAN';
        if (!document.getElementById('group-position').classList.contains('hidden')) {
            const posEl = document.querySelector('input[name="pos"]:checked');
            pos = posEl ? posEl.value : 'FWD';
        }

        try {
            await this.authService.registerUserTelegram({
                telegramId: null, 
                username: name,
                zoneId: parseInt(zone),
                activityType: activity,
                position: pos,
                visualDna: this.avatarEngine.getConfig()
            });

            SoundManager.play('success');
            alert("تم صك الهوية بنجاح! جاري الدخول...");
            window.location.reload();

        } catch (err) {
            console.error("Mint Error:", err);
            alert("خطأ: " + err.message);
            this.setLoadingState(btn, false, "صك الهوية");
        }
    }

    async handleEmailLogin(e) {
        if(e) e.preventDefault();
        const btn = document.getElementById('btn-login');
        const email = document.getElementById('inp-email').value;
        const pass = document.getElementById('inp-pass').value;

        if (!email || !pass) return alert("البيانات ناقصة");
        this.setLoadingState(btn, true);

        try {
            await this.authService.loginEmail(email, pass);
            window.location.reload();
        } catch (err) {
            alert("فشل الدخول: " + err.message);
            this.setLoadingState(btn, false, "دخول");
        }
    }

    async handleEmailSignup(e) {
        if(e) e.preventDefault();
        const btn = document.getElementById('btn-signup');
        const email = document.getElementById('inp-email').value;
        const pass = document.getElementById('inp-pass').value;
        const name = document.getElementById('inp-email-name').value;

        if (!email || !pass || !name) return alert("البيانات ناقصة");
        this.setLoadingState(btn, true);

        try {
            await this.authService.registerUserEmail(email, pass, {
                username: name,
                zoneId: 1, // Default
                activityType: 'PLAYER_FREE',
                position: 'FWD',
                visualDna: { skin: 1, kit: 1 }
            });
            alert("تم التسجيل!");
            window.location.reload();
        } catch (err) {
            alert("فشل التسجيل: " + err.message);
            this.setLoadingState(btn, false, "تسجيل جديد");
        }
    }

    setLoadingState(btn, isLoading, originalText = "") {
        if (isLoading) {
            btn.disabled = true;
            if(!originalText) originalText = btn.textContent;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        } else {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}
