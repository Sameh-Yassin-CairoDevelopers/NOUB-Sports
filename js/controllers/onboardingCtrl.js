/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/onboardingCtrl.js
 * Version: Noub Sports_beta 0.0.1 (EMAIL ONLY CONTROLLER)
 * Status: Production Ready
 * 
 * ARCHITECTURAL RESPONSIBILITIES:
 * 1. Mode Management: Toggles between 'LOGIN' (Clean view) and 'SIGNUP' (Full Avatar Studio).
 * 2. Visual Logic: Handles live avatar updates during signup.
 * 3. Form Handling: Validates inputs and delegates to AuthService.
 * 4. UX Feedback: Loading states and Error handling.
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    
    constructor() {
        // 1. Initialize Core Services
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        // 2. Internal State
        this.authMode = 'LOGIN'; // Default state: Login

        // 3. Cache DOM Elements
        this.dom = {
            // Containers
            studio: document.getElementById('studio-container'),
            extras: document.getElementById('signup-extras'),
            
            // Form Elements
            form: document.getElementById('form-email-auth'),
            btnAction: document.getElementById('btn-auth-action'),
            title: document.getElementById('auth-title'),
            
            // Inputs
            email: document.getElementById('inp-email'),
            pass: document.getElementById('inp-pass'),
            name: document.getElementById('inp-name'), // Used for Signup
            activity: document.getElementById('inp-activity'),
            zone: document.getElementById('inp-zone'),
            
            // Toggles
            linkToSignup: document.getElementById('link-toggle-mode'),
            
            // Visual Preview
            previewContainer: document.getElementById('auth-avatar-display'),
            posGroup: document.getElementById('group-position')
        };

        this.init();
    }

    /**
     * Initialization Routine
     */
    init() {
        console.log("🎮 Onboarding: Email Mode Active.");
        this.bindEvents();
        this.updateAuthUI(); // Set initial view state
    }

    /**
     * Bind DOM Events
     */
    bindEvents() {
        // 1. Mode Toggle (Login <-> Signup)
        if (this.dom.linkToSignup) {
            this.dom.linkToSignup.addEventListener('click', (e) => {
                e.preventDefault();
                SoundManager.play('click');
                // Toggle Mode
                this.authMode = (this.authMode === 'LOGIN') ? 'SIGNUP' : 'LOGIN';
                this.updateAuthUI();
            });
        }

        // 2. Form Submission
        if (this.dom.form) {
            this.dom.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // 3. Avatar Controls (Only active in Signup Mode)
        this.bindAvatarControls();

        // 4. Activity Logic (Hide/Show Position)
        if (this.dom.activity) {
            this.dom.activity.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'FAN' || val === 'ACADEMY') {
                    this.dom.posGroup.classList.add('hidden');
                } else {
                    this.dom.posGroup.classList.remove('hidden');
                }
            });
        }
        
        // 5. Live Name Typing
        if (this.dom.name) {
            this.dom.name.addEventListener('input', () => this.updateLivePreview());
        }
    }

    /**
     * Updates the UI based on Auth Mode.
     * LOGIN: Hides Avatar Studio & Extra Fields.
     * SIGNUP: Shows everything for Card Creation.
     */
    updateAuthUI() {
        const isLogin = this.authMode === 'LOGIN';
        
        // Update Title & Button
        this.dom.title.textContent = isLogin ? "تسجيل الدخول" : "إنشاء هوية جديدة";
        this.dom.btnAction.textContent = isLogin ? "دخول" : "صك الهوية";
        this.dom.linkToSignup.textContent = isLogin ? "إنشاء حساب جديد" : "لدي حساب بالفعل";

        // Toggle Visibility
        if (isLogin) {
            this.dom.studio.classList.add('hidden');
            this.dom.extras.classList.add('hidden');
            // Remove 'required' from signup fields to allow login submit
            this.dom.name.removeAttribute('required');
            this.dom.activity.removeAttribute('required');
        } else {
            this.dom.studio.classList.remove('hidden');
            this.dom.extras.classList.remove('hidden');
            // Add 'required' back
            this.dom.name.setAttribute('required', 'true');
            this.dom.activity.setAttribute('required', 'true');
            // Refresh Avatar
            this.updateLivePreview();
        }
    }

    /**
     * Main Handler for Auth Action
     */
    async handleSubmit(e) {
        e.preventDefault();
        const btn = this.dom.btnAction;
        const originalText = btn.textContent;
        
        // 1. Basic Validation
        if (!this.dom.email.value || !this.dom.pass.value) {
            return alert("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
        }

        // 2. Set Loading
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> جاري التحميل...';

        try {
            if (this.authMode === 'LOGIN') {
                // --- A. LOGIN FLOW ---
                await this.authService.login(
                    this.dom.email.value, 
                    this.dom.pass.value
                );
            } else {
                // --- B. SIGNUP FLOW ---
                // Collect Visual DNA & Meta Data
                const config = JSON.parse(this.avatarEngine.getConfig());
                
                // Determine Position
                let pos = 'FAN';
                if (!this.dom.posGroup.classList.contains('hidden')) {
                    const posEl = document.querySelector('input[name="pos"]:checked');
                    pos = posEl ? posEl.value : 'FWD';
                }

                const metadata = {
                    username: this.dom.name.value,
                    zoneId: parseInt(this.dom.zone.value),
                    activityType: this.dom.activity.value,
                    position: pos,
                    visualDna: config
                };

                await this.authService.register(
                    this.dom.email.value,
                    this.dom.pass.value,
                    metadata
                );
                
                SoundManager.play('success');
                alert("تم صك الهوية بنجاح!");
            }

            // 3. Success: Reload to enter App
            window.location.reload();

        } catch (err) {
            console.error(err);
            SoundManager.play('error');
            alert(err.message);
            
            // Reset Button
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    /**
     * Helper: Updates Avatar Visuals
     */
    updateLivePreview() {
        if (!this.dom.previewContainer) return;
        const config = JSON.parse(this.avatarEngine.getConfig());
        const name = this.dom.name.value || 'NOUB';
        
        // Import static generator logic (ensure AvatarEngine class has it)
        // If not available in utils yet, we rely on the logic we wrote in previous batches.
        // Assuming AvatarEngine.generateAvatarHTML exists:
        if (typeof AvatarEngine.generateAvatarHTML === 'function') {
            this.dom.previewContainer.parentElement.innerHTML = AvatarEngine.generateAvatarHTML(config, name);
            this.dom.previewContainer = document.querySelector('.avatar-comp');
        }
    }

    /**
     * Bind Avatar Arrows (Only relevant in Signup)
     */
    bindAvatarControls() {
        const bind = (id, type, dir) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    SoundManager.play('click');
                    this.avatarEngine.change(type, dir);
                    this.updateLivePreview();
                });
            }
        };

        bind('btn-skin-prev', 'skin', -1); bind('btn-skin-next', 'skin', 1);
        bind('btn-kit-prev', 'kit', -1);   bind('btn-kit-next', 'kit', 1);
    }
}
