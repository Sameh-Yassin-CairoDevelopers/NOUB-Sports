/*
 * Filename: js/controllers/onboardingCtrl.js
 * Version: Noub Sports_beta 0.0.4 (AVATAR STUDIO UPGRADE)
 * Description: Onboarding Controller with Expanded Avatar Support.
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        this.authMode = 'LOGIN'; // Default

        // DOM Cache
        this.dom = {
            studio: document.getElementById('studio-container'),
            extras: document.getElementById('signup-extras'),
            form: document.getElementById('form-email-auth'),
            btnAction: document.getElementById('btn-auth-action'),
            title: document.getElementById('auth-title'),
            email: document.getElementById('inp-email'),
            pass: document.getElementById('inp-pass'),
            name: document.getElementById('inp-name'),
            activity: document.getElementById('inp-activity'),
            zone: document.getElementById('inp-zone'),
            toggleLink: document.getElementById('link-toggle-mode'),
            footerText: document.getElementById('txt-footer'),
            previewContainer: document.getElementById('auth-avatar-display'),
            posGroup: document.getElementById('group-position')
        };

        this.init();
    }

    init() {
        console.log("🎮 Onboarding Ctrl: Active (v4).");
        this.bindEvents();
        this.updateAuthUI();
        this.updateLivePreview(); // Initial render
    }

    bindEvents() {
        // 1. Auth Mode Toggle
        if (this.dom.toggleLink) {
            this.dom.toggleLink.onclick = (e) => {
                e.preventDefault();
                SoundManager.play('click');
                this.authMode = (this.authMode === 'LOGIN') ? 'SIGNUP' : 'LOGIN';
                this.updateAuthUI();
            };
        }

        // 2. Submit
        if (this.dom.form) {
            this.dom.form.onsubmit = (e) => this.handleSubmit(e);
        }

        // 3. Avatar Controls (Expanded)
        this.bindAvatarControls();

        // 4. Activity Logic
        if (this.dom.activity) {
            this.dom.activity.onchange = (e) => {
                const val = e.target.value;
                if (val === 'FAN' || val === 'ACADEMY') {
                    this.dom.posGroup.classList.add('hidden');
                } else {
                    this.dom.posGroup.classList.remove('hidden');
                }
            };
        }
        
        // 5. Live Name
        if (this.dom.name) {
            this.dom.name.oninput = () => this.updateLivePreview();
        }
    }

    updateAuthUI() {
        const isLogin = this.authMode === 'LOGIN';
        
        this.dom.title.textContent = isLogin ? "تسجيل الدخول" : "إنشاء هوية جديدة";
        this.dom.btnAction.textContent = isLogin ? "دخول" : "صك الهوية";
        
        // Toggle Footer Text
        this.dom.footerText.innerHTML = isLogin 
            ? `ليس لديك حساب؟ <a href="#" id="link-toggle-mode" class="text-gold" style="font-weight:bold;">إنشاء حساب جديد</a>`
            : `لديك حساب بالفعل؟ <a href="#" id="link-toggle-mode" class="text-gold" style="font-weight:bold;">تسجيل الدخول</a>`;
        
        // Re-bind toggle link since we replaced innerHTML
        document.getElementById('link-toggle-mode').onclick = (e) => {
            e.preventDefault();
            SoundManager.play('click');
            this.authMode = isLogin ? 'SIGNUP' : 'LOGIN';
            this.updateAuthUI();
        };

        if (isLogin) {
            this.dom.studio.classList.add('hidden');
            this.dom.extras.classList.add('hidden');
            this.dom.name.removeAttribute('required');
            this.dom.activity.removeAttribute('required');
        } else {
            this.dom.studio.classList.remove('hidden');
            this.dom.extras.classList.remove('hidden');
            this.dom.name.setAttribute('required', 'true');
            this.dom.activity.setAttribute('required', 'true');
            this.updateLivePreview();
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const btn = this.dom.btnAction;
        const txt = btn.textContent;
        
        if (!this.dom.email.value || !this.dom.pass.value) return alert("البيانات ناقصة");

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

        try {
            if (this.authMode === 'LOGIN') {
                await this.authService.loginEmail(this.dom.email.value, this.dom.pass.value);
            } else {
                const config = JSON.parse(this.avatarEngine.getConfig());
                let pos = 'FAN';
                if (!this.dom.posGroup.classList.contains('hidden')) {
                    pos = document.querySelector('input[name="pos"]:checked')?.value || 'FWD';
                }

                await this.authService.registerUserEmail(this.dom.email.value, this.dom.pass.value, {
                    username: this.dom.name.value,
                    zoneId: parseInt(this.dom.zone.value),
                    activityType: this.dom.activity.value,
                    position: pos,
                    visualDna: config
                });
                SoundManager.play('success');
                alert("تم الصك بنجاح!");
            }
            window.location.reload();
        } catch (err) {
            SoundManager.play('error');
            alert(err.message);
            btn.disabled = false;
            btn.textContent = txt;
        }
    }

    updateLivePreview() {
        if (!this.dom.previewContainer) return;
        const config = JSON.parse(this.avatarEngine.getConfig());
        const name = this.dom.name?.value || 'NOUB';
        this.dom.previewContainer.parentElement.innerHTML = AvatarEngine.generateAvatarHTML(config, name);
        this.dom.previewContainer = document.querySelector('.avatar-comp');
    }

    bindAvatarControls() {
        const bind = (id, type, dir) => {
            const el = document.getElementById(id);
            if (el) el.onclick = (e) => {
                e.preventDefault();
                SoundManager.play('click');
                this.avatarEngine.change(type, dir);
                this.updateLivePreview();
            };
        };

        // Bind all 3 axes
        bind('btn-skin-next', 'skin', 1); bind('btn-skin-prev', 'skin', -1);
        bind('btn-kit-next', 'kit', 1);   bind('btn-kit-prev', 'kit', -1);
        bind('btn-hair-next', 'hair', 1); bind('btn-hair-prev', 'hair', -1); // NEW
    }
}
