/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/onboardingCtrl.js
 * Version: Noub Sports_beta 0.0.1 (MASTER AUTH)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL RESPONSIBILITIES (مسؤوليات المتحكم):
 * -----------------------------------------------------------------------------
 * 1. Auth Orchestration: Manages the split flow between Telegram Minting & Email Login.
 * 2. Visual Studio Interface: Connects UI buttons to the AvatarEngine.
 * 3. Live Preview: Updates the avatar visual in real-time as user types/selects.
 * 4. Dynamic Forms: Hides/Shows 'Position' field based on Activity Type.
 * -----------------------------------------------------------------------------
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    
    constructor() {
        // 1. Initialize Services
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        // 2. Cache DOM Elements (Performance Optimization)
        this.dom = {
            // Tabs
            tabTg: document.getElementById('tab-tg'),
            tabEmail: document.getElementById('tab-email'),
            panelTg: document.getElementById('panel-tg'),
            panelEmail: document.getElementById('panel-email'),
            
            // Email Form Elements
            btnLogin: document.getElementById('btn-login'),
            btnSignup: document.getElementById('btn-signup'),
            formEmail: document.getElementById('form-email-auth'),
            
            // Telegram Form Elements
            btnMint: document.getElementById('btn-mint'),
            formRegister: document.getElementById('form-register'),
            
            // Visual Elements
            previewContainer: document.getElementById('auth-avatar-display'),
            nameInput: document.getElementById('inp-name')
        };

        // 3. Start Logic
        this.init();
    }

    /**
     * Initialize Controller & Bind Events
     */
    init() {
        console.log("🎮 Onboarding Controller: Initialized & Wiring Events...");
        this.bindEvents();
        
        // Initial Render of Avatar
        this.updateLivePreview();
    }

    /**
     * Bind all DOM Event Listeners
     */
    bindEvents() {
        // --- 1. Tab Switching Logic ---
        if (this.dom.tabTg && this.dom.tabEmail) {
            this.dom.tabTg.addEventListener('click', (e) => this.switchTab(e, 'panel-tg'));
            this.dom.tabEmail.addEventListener('click', (e) => this.switchTab(e, 'panel-email'));
        }

        // --- 2. Email Auth Actions ---
        if (this.dom.btnLogin) {
            this.dom.btnLogin.addEventListener('click', (e) => this.handleEmailAuth(e, 'LOGIN'));
        }
        if (this.dom.btnSignup) {
            this.dom.btnSignup.addEventListener('click', (e) => this.handleEmailAuth(e, 'SIGNUP'));
        }

        // --- 3. Telegram Mint Action ---
        if (this.dom.formRegister) {
            this.dom.formRegister.addEventListener('submit', (e) => this.handleTelegramMint(e));
        }

        // --- 4. Avatar Controls ---
        this.bindAvatarControls();

        // --- 5. Activity Type Logic ---
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
    }

    /**
     * UX: Switch between Auth Panels (Telegram vs Email)
     */
    switchTab(e, targetPanelId) {
        e.preventDefault();
        SoundManager.play('click');

        // Update Tab Styles
        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Toggle Panels
        if (this.dom.panelTg) this.dom.panelTg.classList.add('hidden');
        if (this.dom.panelEmail) this.dom.panelEmail.classList.add('hidden');
        
        document.getElementById(targetPanelId)?.classList.remove('hidden');
    }

    /**
     * HELPER: Updates the avatar preview HTML dynamically.
     * Uses the static generator to ensure consistency with the Card view.
     */
    updateLivePreview() {
        if (!this.dom.previewContainer) return;
        
        // Get config from engine state
        const currentConfig = JSON.parse(this.avatarEngine.getConfig());
        // Get name from input or default
        const name = this.dom.nameInput?.value || 'NOUB';
        
        // Generate HTML
        const html = AvatarEngine.generateAvatarHTML(currentConfig, name);
        
        // Inject into parent container (replacing placeholder)
        this.dom.previewContainer.parentElement.innerHTML = html;
        
        // Re-bind reference since DOM changed
        this.dom.previewContainer = document.querySelector('.avatar-comp');
    }

    /**
     * Binds Avatar Arrow Buttons
     */
    bindAvatarControls() {
        const bind = (id, type, dir) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', (e) => {
                e.preventDefault();
                SoundManager.play('click');
                this.avatarEngine.change(type, dir);
                this.updateLivePreview();
            });
        };

        bind('btn-skin-next', 'skin', 1); 
        bind('btn-skin-prev', 'skin', -1);
        bind('btn-kit-next', 'kit', 1); 
        bind('btn-kit-prev', 'kit', -1);
        
        // Bind Live Typing
        if (this.dom.nameInput) {
            this.dom.nameInput.addEventListener('input', () => this.updateLivePreview());
        }
    }

    /**
     * LOGIC: Handle Email Login/Signup
     */
    async handleEmailAuth(e, mode) {
        e.preventDefault();
        const email = document.getElementById('inp-email')?.value;
        const pass = document.getElementById('inp-pass')?.value;
        const name = document.getElementById('inp-email-name')?.value; // For signup

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
     * LOGIC: Handle Telegram Minting
     */
    async handleTelegramMint(e) {
        e.preventDefault();
        const btn = this.dom.btnMint;
        if(btn) {
            btn.innerHTML = '...';
            btn.disabled = true;
        }

        // Collect Data
        const name = this.dom.nameInput.value;
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
            SoundManager.play('success');
            window.location.reload();
        } catch (err) {
            alert(err.message);
            if(btn) {
                btn.innerHTML = 'صك الهوية';
                btn.disabled = false;
            }
        }
    }
}
