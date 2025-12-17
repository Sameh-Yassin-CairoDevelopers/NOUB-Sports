/*
 * Filename: js/controllers/onboardingCtrl.js
 * Version: 7.0.0 (SMART UI + LIVE PREVIEW)
 * Description: The Ultimate Onboarding Controller.
 * Merges "Smart Toggle" UI with "Advanced Avatar Engine".
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        this.authMode = 'LOGIN'; // Default State

        // Cache DOM Elements
        this.dom = {
            // Main Tabs
            tabTg: document.getElementById('tab-tg'),
            tabEmail: document.getElementById('tab-email'),
            panelTg: document.getElementById('panel-tg'),
            panelEmail: document.getElementById('panel-email'),
            
            // Email Auth UI
            formEmail: document.getElementById('form-email-auth'),
            inpEmail: document.getElementById('inp-email'),
            inpPass: document.getElementById('inp-pass'),
            groupName: document.getElementById('group-email-name'),
            btnAction: document.getElementById('btn-email-action'),
            
            // Footer Links
            footerLogin: document.getElementById('footer-login'),
            footerSignup: document.getElementById('footer-signup'),
            linkToSignup: document.getElementById('link-to-signup'),
            linkToLogin: document.getElementById('link-to-login'),
            
            // Telegram UI
            formRegister: document.getElementById('form-register'),
            btnMint: document.getElementById('btn-mint'),
            
            // Visuals
            previewContainer: document.getElementById('auth-avatar-display'),
            nameInput: document.getElementById('inp-name'),
            activitySelect: document.getElementById('inp-activity'),
            posGroup: document.getElementById('group-position')
        };

        this.init();
    }

    init() {
        console.log("🎮 Onboarding: Initialized.");
        this.bindEvents();
        this.updateAuthUI(); // Set initial state
        this.updateLivePreview(); // Render avatar
    }

    bindEvents() {
        // 1. Tab Switching
        if (this.dom.tabTg) this.dom.tabTg.onclick = (e) => this.switchTab(e, 'panel-tg');
        if (this.dom.tabEmail) this.dom.tabEmail.onclick = (e) => this.switchTab(e, 'panel-email');

        // 2. Auth Mode Toggles
        if (this.dom.linkToSignup) this.dom.linkToSignup.onclick = (e) => this.toggleAuthMode(e, 'SIGNUP');
        if (this.dom.linkToLogin) this.dom.linkToLogin.onclick = (e) => this.toggleAuthMode(e, 'LOGIN');

        // 3. Avatar Controls
        this.bindAvatarControls();

        // 4. Activity Logic
        if (this.dom.activitySelect) {
            this.dom.activitySelect.addEventListener('change', (e) => {
                const val = e.target.value;
                const hidden = ['FAN', 'INACTIVE', ''];
                if (hidden.includes(val)) this.dom.posGroup.classList.add('hidden');
                else this.dom.posGroup.classList.remove('hidden');
            });
        }

        // 5. Submissions
        if (this.dom.formRegister) this.dom.formRegister.onsubmit = (e) => this.handleTelegramMint(e);
        if (this.dom.btnAction) this.dom.btnAction.onclick = (e) => this.handleEmailAuth(e);
    }

    toggleAuthMode(e, mode) {
        e.preventDefault();
        this.authMode = mode;
        this.updateAuthUI();
    }

    updateAuthUI() {
        if (this.authMode === 'LOGIN') {
            this.dom.groupName?.classList.add('hidden');
            if(this.dom.btnAction) this.dom.btnAction.textContent = "تسجيل الدخول";
            this.dom.footerSignup?.classList.remove('hidden');
            this.dom.footerLogin?.classList.add('hidden');
            // Remove required from name
            document.getElementById('inp-email-name')?.removeAttribute('required');
        } else {
            this.dom.groupName?.classList.remove('hidden');
            if(this.dom.btnAction) this.dom.btnAction.textContent = "إنشاء حساب جديد";
            this.dom.footerSignup?.classList.add('hidden');
            this.dom.footerLogin?.classList.remove('hidden');
            // Add required to name
            document.getElementById('inp-email-name')?.setAttribute('required', 'true');
        }
    }

    switchTab(e, id) {
        e.preventDefault();
        SoundManager.play('click');
        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.dom.panelTg.classList.add('hidden');
        this.dom.panelEmail.classList.add('hidden');
        document.getElementById(id).classList.remove('hidden');
    }

    // --- VISUAL LOGIC ---
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
        bind('btn-skin-next', 'skin', 1); bind('btn-skin-prev', 'skin', -1);
        bind('btn-kit-next', 'kit', 1); bind('btn-kit-prev', 'kit', -1);

        if (this.dom.nameInput) this.dom.nameInput.oninput = () => this.updateLivePreview();
    }

    updateLivePreview() {
        if (!this.dom.previewContainer) return;
        const conf = JSON.parse(this.avatarEngine.getConfig());
        const name = this.dom.nameInput?.value || 'NOUB';
        this.dom.previewContainer.parentElement.innerHTML = AvatarEngine.generateAvatarHTML(conf, name);
        this.dom.previewContainer = document.querySelector('.avatar-comp');
    }

    // --- AUTH LOGIC ---
    async handleEmailAuth(e) {
        e.preventDefault();
        const email = this.dom.inpEmail.value;
        const pass = this.dom.inpPass.value;
        const btn = this.dom.btnAction;

        if (!email || !pass) return alert("أدخل البيانات");

        this.setLoadingState(btn, true);

        try {
            if (this.authMode === 'LOGIN') {
                await this.authService.loginEmail(email, pass);
            } else {
                const name = document.getElementById('inp-email-name').value;
                if (!name) throw new Error("الاسم مطلوب");
                
                await this.authService.registerUserEmail(email, pass, {
                    username: name,
                    zoneId: 1, // Default Zone
                    activityType: 'PLAYER_FREE',
                    position: 'FWD',
                    visualDna: this.avatarEngine.getConfig()
                });
                alert("تم التسجيل بنجاح!");
            }
            window.location.reload();
        } catch (err) {
            alert(err.message);
            this.setLoadingState(btn, false, this.authMode === 'LOGIN' ? "دخول" : "تسجيل");
        }
    }

    async handleTelegramMint(e) {
        e.preventDefault();
        const btn = this.dom.btnMint;
        this.setLoadingState(btn, true);
        
        const name = this.dom.nameInput.value;
        const zone = document.getElementById('inp-zone').value;
        const activity = document.getElementById('inp-activity').value;
        
        let pos = 'FAN';
        if (!this.dom.posGroup.classList.contains('hidden')) {
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
            this.setLoadingState(btn, false, "صك الهوية");
        }
    }

    setLoadingState(btn, isLoading, text = "") {
        if (isLoading) {
            btn.disabled = true;
            if(!text) text = btn.textContent;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        } else {
            btn.disabled = false;
            btn.textContent = text;
        }
    }
}
