/*
 * Filename: js/controllers/onboardingCtrl.js
 * Version: 5.2.0 (MERGED MASTER)
 * Description: Controls Onboarding, Auth Tabs, Live Preview, and Registration.
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        // References for Live Preview
        this.previewContainer = document.getElementById('auth-avatar-display');
        this.nameInput = document.getElementById('inp-name');
        
        this.init();
    }

    init() {
        console.log("🎮 Onboarding Controller Active");
        this.bindEvents();
        // Initial Visual Render
        this.updateLivePreview();
    }

    bindEvents() {
        // --- 1. Avatar Controls (Original Logic + Live Update) ---
        const bindControl = (id, type, dir) => {
            document.getElementById(id)?.addEventListener('click', (e) => {
                e.preventDefault();
                SoundManager.play('click');
                this.avatarEngine.change(type, dir);
                this.updateLivePreview(); // Trigger visual update
            });
        };

        bindControl('btn-skin-next', 'skin', 1);
        bindControl('btn-skin-prev', 'skin', -1);
        bindControl('btn-kit-next', 'kit', 1);
        bindControl('btn-kit-prev', 'kit', -1);

        // --- 2. Live Name Typing (New) ---
        if (this.nameInput) {
            this.nameInput.addEventListener('input', () => this.updateLivePreview());
        }

        // --- 3. Activity Type Logic (Original Logic) ---
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

        // --- 4. Tab Switching (New) ---
        const tabTg = document.getElementById('tab-tg');
        const tabEmail = document.getElementById('tab-email');

        if (tabTg && tabEmail) {
            tabTg.addEventListener('click', (e) => this.switchTab(e, 'panel-tg'));
            tabEmail.addEventListener('click', (e) => this.switchTab(e, 'panel-email'));
        }

        // --- 5. Submit Handlers ---
        document.getElementById('form-register')?.addEventListener('submit', (e) => this.handleTelegramMint(e));
        document.getElementById('btn-login')?.addEventListener('click', (e) => this.handleEmailLogin(e));
        document.getElementById('btn-signup')?.addEventListener('click', (e) => this.handleEmailSignup(e));
    }

    /**
     * Helper: Updates the Avatar Preview with Layers & Name
     */
    updateLivePreview() {
        if (!this.previewContainer) return;
        const currentConfig = JSON.parse(this.avatarEngine.getConfig());
        const name = this.nameInput?.value || 'NOUB';
        
        // Use static generator for consistency
        const html = AvatarEngine.generateAvatarHTML(currentConfig, name);
        
        // Inject into DOM
        this.previewContainer.parentElement.innerHTML = html;
        // Re-assign reference as innerHTML wiped it
        this.previewContainer = document.querySelector('.avatar-comp'); 
    }

    /**
     * UX: Switch Tabs
     */
    switchTab(e, targetPanelId) {
        e.preventDefault();
        SoundManager.play('click');
        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        document.getElementById('panel-tg').classList.add('hidden');
        document.getElementById('panel-email').classList.add('hidden');
        document.getElementById(targetPanelId).classList.remove('hidden');
    }

    /**
     * Logic: Telegram Minting
     */
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
            console.error(err);
            alert("خطأ: " + err.message);
            this.setLoadingState(btn, false, "صك الهوية");
        }
    }

    /**
     * Logic: Email Login
     */
    async handleEmailLogin(e) {
        e?.preventDefault();
        const btn = document.getElementById('btn-login');
        const email = document.getElementById('inp-email').value;
        const pass = document.getElementById('inp-pass').value;

        if (!email || !pass) return alert("أدخل البيانات");
        this.setLoadingState(btn, true);

        try {
            await this.authService.loginEmail(email, pass);
            window.location.reload();
        } catch (err) {
            alert("فشل الدخول: " + err.message);
            this.setLoadingState(btn, false, "دخول");
        }
    }

    /**
     * Logic: Email Signup
     */
    async handleEmailSignup(e) {
        e?.preventDefault();
        const btn = document.getElementById('btn-signup');
        const email = document.getElementById('inp-email').value;
        const pass = document.getElementById('inp-pass').value;
        const name = document.getElementById('inp-email-name').value;

        if (!email || !pass || !name) return alert("أدخل البيانات");
        this.setLoadingState(btn, true);

        try {
            await this.authService.registerUserEmail(email, pass, {
                username: name,
                zoneId: 1, // Default Zone
                activityType: 'PLAYER_FREE',
                position: 'FWD',
                visualDna: { skin: 1, kit: 1 }
            });
            alert("تم التسجيل! يمكنك الدخول.");
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
