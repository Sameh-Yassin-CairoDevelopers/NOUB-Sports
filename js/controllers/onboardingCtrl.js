/*
 * Filename: js/controllers/onboardingCtrl.js
 * Version: 6.0.0 (CLEAN UI & LOGIC)
 * Description: Controls Auth View. 
 * FIX: Separated Login/Signup flows completely.
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        this.init();
        this.authMode = 'LOGIN'; // 'LOGIN' or 'SIGNUP'
    }

    init() {
        this.bindEvents();
        // Default View: Telegram Tab active, Login Mode
        this.updateAuthModeUI();
    }

    bindEvents() {
        // 1. Avatar Controls
        const bind = (id, type, dir) => {
            document.getElementById(id)?.addEventListener('click', (e) => {
                e.preventDefault();
                this.avatarEngine.change(type, dir);
            });
        };
        bind('btn-skin-next', 'skin', 1); bind('btn-skin-prev', 'skin', -1);
        bind('btn-kit-next', 'kit', 1); bind('btn-kit-prev', 'kit', -1);

        // 2. Activity Type
        document.getElementById('inp-activity')?.addEventListener('change', (e) => {
            const val = e.target.value;
            const group = document.getElementById('group-position');
            if (val === 'FAN' || val === 'INACTIVE') group.classList.add('hidden');
            else group.classList.remove('hidden');
        });

        // 3. Tab Switching (TG vs Email)
        document.getElementById('tab-tg').onclick = (e) => this.switchTab(e, 'panel-tg');
        document.getElementById('tab-email').onclick = (e) => this.switchTab(e, 'panel-email');

        // 4. Email Auth Toggles (New UI Logic)
        document.getElementById('link-to-signup').onclick = (e) => {
            e.preventDefault();
            this.authMode = 'SIGNUP';
            this.updateAuthModeUI();
        };
        document.getElementById('link-to-login').onclick = (e) => {
            e.preventDefault();
            this.authMode = 'LOGIN';
            this.updateAuthModeUI();
        };

        // 5. Submissions
        document.getElementById('form-register').onsubmit = (e) => this.handleTelegramMint(e);
        document.getElementById('form-email-auth').onsubmit = (e) => this.handleEmailSubmit(e);
    }

    switchTab(e, panelId) {
        e.preventDefault();
        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        document.getElementById('panel-tg').classList.add('hidden');
        document.getElementById('panel-email').classList.add('hidden');
        document.getElementById(panelId).classList.remove('hidden');
    }

    updateAuthModeUI() {
        const title = document.getElementById('email-auth-title');
        const nameGroup = document.getElementById('group-email-name');
        const btn = document.getElementById('btn-email-action');
        const footerLogin = document.getElementById('footer-login');
        const footerSignup = document.getElementById('footer-signup');

        if (this.authMode === 'LOGIN') {
            title.textContent = "تسجيل الدخول";
            nameGroup.classList.add('hidden');
            btn.textContent = "دخول";
            footerLogin.classList.add('hidden');
            footerSignup.classList.remove('hidden');
        } else {
            title.textContent = "إنشاء حساب جديد";
            nameGroup.classList.remove('hidden');
            btn.textContent = "تسجيل";
            footerLogin.classList.remove('hidden');
            footerSignup.classList.add('hidden');
        }
    }

    // --- Handlers ---

    async handleEmailSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('inp-email').value;
        const pass = document.getElementById('inp-pass').value;
        const btn = document.getElementById('btn-email-action');
        
        if (!email || !pass) return alert("أدخل البيانات");
        
        btn.disabled = true;
        btn.textContent = "جاري التحميل...";

        try {
            if (this.authMode === 'LOGIN') {
                await this.authService.loginEmail(email, pass);
            } else {
                const name = document.getElementById('inp-email-name').value;
                if (!name) throw new Error("الاسم مطلوب");
                
                // For signup, we register then mint card
                await this.authService.registerUserEmail(email, pass, {
                    username: name,
                    zoneId: 1,
                    activityType: 'PLAYER_FREE',
                    position: 'FWD',
                    visualDna: {skin: 1, kit: 1}
                });
            }
            window.location.reload();
        } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.textContent = this.authMode === 'LOGIN' ? "دخول" : "تسجيل";
        }
    }

    async handleTelegramMint(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-mint');
        btn.disabled = true; btn.textContent = "...";
        
        // Collect Data
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
                telegramId: null, username: name, zoneId: parseInt(zone),
                activityType: activity, position: pos, visualDna: this.avatarEngine.getConfig()
            });
            window.location.reload();
        } catch (err) {
            alert(err.message);
            btn.disabled = false; btn.textContent = "صك الهوية";
        }
    }
}
