/*
 * Filename: js/controllers/onboardingCtrl.js
 * Version: 3.3.0 (MASTER EDITION)
 * Description: Controls the Onboarding View logic.
 * Responsibilities:
 *  1. Avatar Customization (Skin/Kit).
 *  2. Tab Navigation (Telegram vs Email).
 *  3. Dynamic Form Validation (Hide position for Fans).
 *  4. Execution of Registration flows via AuthService.
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        this.init();
    }

    /**
     * Initialize Controller & Bind Events
     */
    init() {
        console.log("🎮 Onboarding Controller Initialized");
        this.bindEvents();
    }

    /**
     * Bind all DOM Event Listeners
     */
    bindEvents() {
        // --- 1. Avatar Controls (Visual DNA) ---
        document.getElementById('btn-skin-next')?.addEventListener('click', (e) => { 
            e.preventDefault(); this.avatarEngine.change('skin', 1); 
        });
        document.getElementById('btn-skin-prev')?.addEventListener('click', (e) => { 
            e.preventDefault(); this.avatarEngine.change('skin', -1); 
        });
        document.getElementById('btn-kit-next')?.addEventListener('click', (e) => { 
            e.preventDefault(); this.avatarEngine.change('kit', 1); 
        });
        document.getElementById('btn-kit-prev')?.addEventListener('click', (e) => { 
            e.preventDefault(); this.avatarEngine.change('kit', -1); 
        });

        // --- 2. Activity Type Logic (Hide/Show Position) ---
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

        // --- 3. Tab Switching (Telegram vs Email) ---
        const tabTg = document.getElementById('tab-tg');
        const tabEmail = document.getElementById('tab-email');

        if (tabTg && tabEmail) {
            tabTg.addEventListener('click', (e) => this.switchTab(e, 'panel-tg'));
            tabEmail.addEventListener('click', (e) => this.switchTab(e, 'panel-email'));
        }

        // --- 4. Form Submissions ---
        
        // A. Telegram Mint (The Main Button)
        const tgForm = document.getElementById('form-register');
        if (tgForm) {
            tgForm.addEventListener('submit', (e) => this.handleTelegramMint(e));
        }

        // B. Email Login Button
        const btnLogin = document.getElementById('btn-login');
        if (btnLogin) {
            btnLogin.addEventListener('click', (e) => this.handleEmailLogin(e));
        }

        // C. Email Signup Button
        const btnSignup = document.getElementById('btn-signup');
        if (btnSignup) {
            btnSignup.addEventListener('click', (e) => this.handleEmailSignup(e));
        }
    }

    /**
     * UX: Switch between Auth Panels
     */
    switchTab(e, targetPanelId) {
        e.preventDefault();
        
        // 1. Update Tab Styles
        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // 2. Toggle Panels visibility
        const panelTg = document.getElementById('panel-tg');
        const panelEmail = document.getElementById('panel-email');
        
        if (panelTg) panelTg.classList.add('hidden');
        if (panelEmail) panelEmail.classList.add('hidden');
        
        document.getElementById(targetPanelId)?.classList.remove('hidden');
    }

    /**
     * LOGIC: Handle Telegram Minting Flow
     */
    async handleTelegramMint(e) {
        e.preventDefault();
        
        const btn = document.getElementById('btn-mint');
        this.setLoadingState(btn, true);

        // 1. Collect Data
        const name = document.getElementById('inp-name').value;
        const zone = document.getElementById('inp-zone').value;
        const activity = document.getElementById('inp-activity').value;
        
        // Determine Position
        let pos = 'FAN';
        if (!document.getElementById('group-position').classList.contains('hidden')) {
            const posEl = document.querySelector('input[name="pos"]:checked');
            pos = posEl ? posEl.value : 'FWD';
        }

        try {
            // 2. Execute Service Call
            // Note: We use registerUserTelegram (Correct Method Name)
            await this.authService.registerUserTelegram({
                telegramId: null, // Service will handle generation if null
                username: name,
                zoneId: parseInt(zone),
                activityType: activity,
                position: pos,
                visualDna: this.avatarEngine.getConfig()
            });

            // 3. Success Feedback
            // SoundManager.play('mint_success'); // Uncomment if SoundManager is active
            alert("تم صك الهوية بنجاح! جاري الدخول للملعب...");
            
            // 4. Reload to trigger App Entry
            window.location.reload();

        } catch (err) {
            console.error("Mint Error:", err);
            alert("حدث خطأ: " + err.message);
            this.setLoadingState(btn, false, "صك الهوية");
        }
    }

    /**
     * LOGIC: Handle Email Login Flow
     */
    async handleEmailLogin(e) {
        if(e) e.preventDefault();
        
        const btn = document.getElementById('btn-login');
        const email = document.getElementById('inp-email').value;
        const pass = document.getElementById('inp-pass').value;

        if (!email || !pass) {
            alert("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
            return;
        }

        this.setLoadingState(btn, true);

        try {
            await this.authService.loginEmail(email, pass);
            // Success -> Reload to enter
            window.location.reload();
        } catch (err) {
            alert("فشل الدخول: " + err.message);
            this.setLoadingState(btn, false, "دخول");
        }
    }

    /**
     * LOGIC: Handle Email Signup Flow
     */
    async handleEmailSignup(e) {
        if(e) e.preventDefault();

        const btn = document.getElementById('btn-signup');
        const email = document.getElementById('inp-email').value;
        const pass = document.getElementById('inp-pass').value;
        const name = document.getElementById('inp-email-name').value;
        
        // For Email signup, we assume default Zone/Activity for MVP step
        // Ideally, we should show Zone selector in Email tab too.
        const defaultZone = 1; 

        if (!email || !pass || !name) {
            alert("يرجى إدخال البريد، كلمة المرور، والاسم.");
            return;
        }

        this.setLoadingState(btn, true);

        try {
            // 1. Register via Supabase Auth
            await this.authService.registerUserEmail(email, pass, {
                username: name,
                zoneId: defaultZone,
                activityType: 'PLAYER_FREE', // Default
                position: 'FWD',
                visualDna: { skin: 1, kit: 1 }
            });

            alert("تم إنشاء الحساب بنجاح! جاري الدخول...");
            window.location.reload();

        } catch (err) {
            alert("فشل التسجيل: " + err.message);
            this.setLoadingState(btn, false, "جديد");
        }
    }

    /**
     * Helper: Manage Button Loading State
     */
    setLoadingState(btn, isLoading, originalText = "") {
        if (isLoading) {
            btn.disabled = true;
            // Save original text if not provided
            if(!originalText) originalText = btn.textContent;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> جاري التحميل...';
        } else {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}
