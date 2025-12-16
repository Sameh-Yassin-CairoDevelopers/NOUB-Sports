/*
 * Filename: js/controllers/onboardingCtrl.js
 * Version: 5.3.0 (HTML MATCHED)
 * Description: Controller wired specifically for the HTML you provided.
 * 
 * BINDINGS:
 * - Tabs: 'tab-tg', 'tab-email' -> Toggle 'panel-tg', 'panel-email'.
 * - Auth: 'btn-login', 'btn-signup' -> Call AuthService.
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        // References from your HTML
        this.dom = {
            tabTg: document.getElementById('tab-tg'),
            tabEmail: document.getElementById('tab-email'),
            panelTg: document.getElementById('panel-tg'),
            panelEmail: document.getElementById('panel-email'),
            btnLogin: document.getElementById('btn-login'),
            btnSignup: document.getElementById('btn-signup'),
            formEmail: document.getElementById('form-email-auth')
        };

        this.init();
    }

    init() {
        console.log("🎮 Onboarding: Connecting to HTML...");
        this.bindEvents();
        // Force update visual preview on load
        this.updatePreview();
    }

    bindEvents() {
        // 1. Tab Switching (The Logic you are missing)
        if (this.dom.tabTg && this.dom.tabEmail) {
            this.dom.tabTg.addEventListener('click', (e) => this.switchTab(e, 'panel-tg'));
            this.dom.tabEmail.addEventListener('click', (e) => this.switchTab(e, 'panel-email'));
        }

        // 2. Email Auth Actions
        if (this.dom.btnLogin) {
            this.dom.btnLogin.addEventListener('click', (e) => this.handleEmailAuth(e, 'LOGIN'));
        }
        if (this.dom.btnSignup) {
            this.dom.btnSignup.addEventListener('click', (e) => this.handleEmailAuth(e, 'SIGNUP'));
        }

        // 3. Telegram Mint Action
        const mintBtn = document.getElementById('btn-mint');
        if (mintBtn) {
            mintBtn.addEventListener('click', (e) => this.handleTelegramMint(e));
        }

        // 4. Avatar Controls
        this.bindAvatarControls();
    }

    /**
     * Logic to Switch Tabs (Fixes "Buttons not responding")
     */
    switchTab(e, activePanelId) {
        e.preventDefault();
        SoundManager.play('click');

        // Update Buttons Visual
        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Toggle Panels
        // Ensure we remove 'hidden' from target and add to others
        if (this.dom.panelTg) this.dom.panelTg.classList.add('hidden');
        if (this.dom.panelEmail) this.dom.panelEmail.classList.add('hidden');
        
        document.getElementById(activePanelId)?.classList.remove('hidden');
    }

    /**
     * Logic: Email Login/Signup
     */
    async handleEmailAuth(e, mode) {
        e.preventDefault();
        const email = document.getElementById('inp-email')?.value;
        const pass = document.getElementById('inp-pass')?.value;
        const name = document.getElementById('inp-email-name')?.value; // Only for signup

        if (!email || !pass) {
            alert("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
            return;
        }

        // Show Loading
        const btn = mode === 'LOGIN' ? this.dom.btnLogin : this.dom.btnSignup;
        const originalText = btn.textContent;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        btn.disabled = true;

        try {
            if (mode === 'LOGIN') {
                await this.authService.loginEmail(email, pass);
            } else {
                if (!name) throw new Error("يرجى كتابة الاسم.");
                await this.authService.registerUserEmail(email, pass, {
                    username: name,
                    zoneId: 1, // Default Zone
                    activityType: 'PLAYER_FREE',
                    position: 'FWD',
                    visualDna: { skin: 1, kit: 1 }
                });
                alert("تم التسجيل بنجاح!");
            }
            
            // Reload to Enter App
            window.location.reload();

        } catch (err) {
            alert("خطأ: " + err.message);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    /**
     * Logic: Telegram Mint
     */
    async handleTelegramMint(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-mint');
        btn.innerHTML = '...';
        btn.disabled = true;

        const name = document.getElementById('inp-name').value;
        const zone = document.getElementById('inp-zone').value;
        const activity = document.getElementById('inp-activity').value;

        // Position Logic
        let pos = 'FAN';
        if (activity !== 'FAN' && activity !== 'INACTIVE') {
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
            window.location.reload();
        } catch (err) {
            alert(err.message);
            btn.innerHTML = 'صك الهوية';
            btn.disabled = false;
        }
    }

    // --- Helpers ---
    bindAvatarControls() {
        const bind = (id, type, dir) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', (e) => {
                e.preventDefault();
                this.avatarEngine.change(type, dir);
                this.updatePreview();
            });
        };
        bind('btn-skin-next', 'skin', 1); bind('btn-skin-prev', 'skin', -1);
        bind('btn-kit-next', 'kit', 1); bind('btn-kit-prev', 'kit', -1);
        
        // Live Name
        const nameInput = document.getElementById('inp-name');
        if (nameInput) nameInput.addEventListener('input', () => this.updatePreview());
    }

    updatePreview() {
        const container = document.getElementById('auth-avatar-display');
        const nameInput = document.getElementById('inp-name');
        if (!container) return;

        const config = JSON.parse(this.avatarEngine.getConfig());
        const name = nameInput ? nameInput.value : 'NOUB';
        
        // Use AvatarEngine static method (Ensure AvatarEngine is updated too!)
        // If AvatarEngine static method is missing in your version, this handles it:
        const skinColors = ['#F5C6A5', '#C68642', '#8D5524'];
        const kitColors = ['#EF4444', '#10B981', '#3B82F6'];
        
        const skin = skinColors[config.skin - 1] || skinColors[0];
        const kit = kitColors[config.kit - 1] || kitColors[0];

        container.parentElement.innerHTML = `
            <div class="avatar-comp" style="position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
                <i class="fa-solid fa-user" style="font-size: 90px; color: ${skin}; position: absolute; bottom: 40px; z-index: 1;"></i>
                <i class="fa-solid fa-shirt" style="font-size: 110px; color: ${kit}; position: absolute; bottom: -10px; z-index: 2;"></i>
                <div style="position: absolute; bottom: 35px; z-index: 3; color: rgba(255,255,255,0.8); font-size: 10px; font-weight: bold; text-transform: uppercase;">
                    ${name}
                </div>
            </div>
        `;
        // Re-bind container after overwrite
        this.previewContainer = document.querySelector('.avatar-comp');
    }
}
