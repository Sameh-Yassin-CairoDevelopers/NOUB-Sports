/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/onboardingCtrl.js
 * Version: Noub Sports_beta 0.0.1 (MASTER AUTH)
 * Status: Production Ready
 * 
 * RESPONSIBILITIES:
 * 1. Auth Flow Orchestration: Manages Telegram Minting vs Email Login/Signup.
 * 2. Visual Studio: Handles live updates for Avatar (Skin, Kit, Name on Shirt).
 * 3. Dynamic Forms: Adjusts UI based on user role (Player vs Fan).
 * 4. Interaction: Binds UI events to AuthService transactions.
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    
    constructor() {
        // Initialize Services
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        // Internal State
        this.authMode = 'LOGIN'; // Default Email Mode ('LOGIN' or 'SIGNUP')
        
        // DOM References for Live Preview
        this.previewContainer = document.getElementById('auth-avatar-display');
        this.nameInput = document.getElementById('inp-name');

        // Auto-Start
        this.init();
    }

    /**
     * Initialize Controller & Bind Events
     */
    init() {
        console.log("🎮 Onboarding Controller: Ready.");
        this.bindEvents();
        this.updateLivePreview(); // Initial render
        this.updateAuthModeUI();  // Set initial email UI state
    }

    /**
     * Bind all DOM Event Listeners
     */
    bindEvents() {
        // --- 1. Avatar Controls (Visual DNA) ---
        const bindControl = (id, type, dir) => {
            document.getElementById(id)?.addEventListener('click', (e) => {
                e.preventDefault();
                SoundManager.play('click');
                this.avatarEngine.change(type, dir);
                this.updateLivePreview(); // Refresh visual immediately
            });
        };

        bindControl('btn-skin-next', 'skin', 1);
        bindControl('btn-skin-prev', 'skin', -1);
        bindControl('btn-kit-next', 'kit', 1);
        bindControl('btn-kit-prev', 'kit', -1);

        // --- 2. Live Name Typing on Shirt ---
        if (this.nameInput) {
            this.nameInput.addEventListener('input', () => {
                this.updateLivePreview();
            });
        }

        // --- 3. Activity Type Logic (Hide/Show Position) ---
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

        // --- 4. Tab Switching (Telegram vs Email) ---
        const tabTg = document.getElementById('tab-tg');
        const tabEmail = document.getElementById('tab-email');

        if (tabTg && tabEmail) {
            tabTg.addEventListener('click', (e) => this.switchTab(e, 'panel-tg'));
            tabEmail.addEventListener('click', (e) => this.switchTab(e, 'panel-email'));
        }

        // --- 5. Email Auth Toggles (Login <-> Signup) ---
        document.getElementById('link-to-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.authMode = 'SIGNUP';
            this.updateAuthModeUI();
        });
        
        document.getElementById('link-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.authMode = 'LOGIN';
            this.updateAuthModeUI();
        });

        // --- 6. Form Submissions ---
        // A. Telegram Mint
        document.getElementById('form-register')?.addEventListener('submit', (e) => this.handleTelegramMint(e));
        
        // B. Email Submit (Handles both Login & Signup)
        document.getElementById('form-email-auth')?.addEventListener('submit', (e) => this.handleEmailSubmit(e));
    }

    /**
     * Helper: Updates the avatar preview using the Engine.
     */
    updateLivePreview() {
        if (!this.previewContainer) return;
        
        const currentConfig = JSON.parse(this.avatarEngine.getConfig());
        const name = this.nameInput?.value || 'NOUB';
        
        // Generate Layered HTML
        const html = AvatarEngine.generateAvatarHTML(currentConfig, name);
        
        // Inject
        this.previewContainer.parentElement.innerHTML = html;
        this.previewContainer = document.querySelector('.avatar-comp'); // Re-bind reference
    }

    /**
     * UX: Switch between Main Tabs
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
     * UX: Toggle Email Form Mode
     */
    updateAuthModeUI() {
        const title = document.getElementById('email-auth-title');
        const nameGroup = document.getElementById('group-email-name');
        const btn = document.getElementById('btn-email-action');
        const footerLogin = document.getElementById('footer-login');
        const footerSignup = document.getElementById('footer-signup');

        if (!title) return; // Guard clause

        if (this.authMode === 'LOGIN') {
            title.textContent = "تسجيل الدخول";
            nameGroup.classList.add('hidden');
            btn.textContent = "دخول";
            footerLogin.classList.add('hidden');
            footerSignup.classList.remove('hidden');
            // Remove 'required' from name input to allow submission
            document.getElementById('inp-email-name').removeAttribute('required');
        } else {
            title.textContent = "إنشاء حساب جديد";
            nameGroup.classList.remove('hidden');
            btn.textContent = "تسجيل";
            footerLogin.classList.remove('hidden');
            footerSignup.classList.add('hidden');
            // Add 'required' to name input
            document.getElementById('inp-email-name').setAttribute('required', 'true');
        }
    }

    /**
     * LOGIC: Handle Telegram Minting
     */
    async handleTelegramMint(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-mint');
        this.setLoadingState(btn, true);

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
                telegramId: null, // Service will generate mock ID if needed
                username: name,
                zoneId: parseInt(zone),
                activityType: activity,
                position: pos,
                visualDna: this.avatarEngine.getConfig()
            });

            SoundManager.play('success');
            alert("تم صك الهوية بنجاح! جاري الدخول للملعب...");
            window.location.reload();

        } catch (err) {
            console.error("Mint Error:", err);
            alert("خطأ: " + err.message);
            this.setLoadingState(btn, false, "صك الهوية");
        }
    }

    /**
     * LOGIC: Handle Email Submit (Login OR Signup)
     */
    async handleEmailSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-email-action');
        const email = document.getElementById('inp-email').value;
        const pass = document.getElementById('inp-pass').value;

        if (!email || !pass) return alert("أدخل البيانات");
        
        this.setLoadingState(btn, true);

        try {
            if (this.authMode === 'LOGIN') {
                // --- Login Flow ---
                await this.authService.loginEmail(email, pass);
            } else {
                // --- Signup Flow ---
                const name = document.getElementById('inp-email-name').value;
                
                await this.authService.registerUserEmail(email, pass, {
                    username: name,
                    zoneId: 1, // Default Zone for Email Signup (User can change later)
                    activityType: 'PLAYER_FREE', // Default
                    position: 'FWD',
                    visualDna: { skin: 1, kit: 1 } // Default Visual
                });
                alert("تم إنشاء الحساب بنجاح!");
            }
            
            // Success -> Enter App
            window.location.reload();

        } catch (err) {
            alert(err.message);
            this.setLoadingState(btn, false, this.authMode === 'LOGIN' ? "دخول" : "تسجيل");
        }
    }

    /**
     * Helper: Loading Spinner
     */
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
