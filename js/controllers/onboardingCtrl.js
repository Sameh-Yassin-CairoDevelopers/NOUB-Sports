/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/onboardingCtrl.js
 * Version: Noub Sports_beta 6.0.0 (COMPATIBILITY UPDATE)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ACADEMIC MODULE DESCRIPTION:
 * -----------------------------------------------------------------------------
 * This controller manages the User Onboarding lifecycle (Login & Registration).
 * 
 * CRITICAL UPDATES (V6.0):
 * 1. Interface Injection: Programmatically replaces legacy avatar controls 
 *    with the new "Color Wheel" and "Hair Selector" to match the V6 Engine.
 * 2. DNA Formatting: Adapts the data payload sent to the AuthService to use 
 *    HEX strings for kits instead of integer indices.
 * 3. Removal of Skin Tone: "Skin" selection is deprecated and removed from 
 *    the UI flow to enforce the unified visual identity.
 * -----------------------------------------------------------------------------
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    
    /**
     * Constructor: Initializes dependencies and state.
     * Caches DOM elements for performance.
     */
    constructor() {
        // 1. Initialize Services
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        // 2. State Management
        this.authMode = 'LOGIN'; // Default view state
        
        // Internal State for Live Preview (V6 Schema)
        // kit: Hex String, logo: Int, hair: Int
        this.tempDna = { 
            kit: '#3b82f6', // Default Royal Blue
            logo: 1,        // No Logo
            hair: 1         // Bald/Shaved
        };

        // 3. DOM Cache
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

        // Start Logic
        this.init();
    }

    /**
     * Initialization Routine.
     * Sets up the UI for the first time.
     */
    init() {
        console.log("🎮 Onboarding Ctrl: Active (V6.0 - Hex Color Support).");
        
        // 1. Inject New Visual Controls (Critical Step)
        // Replaces the static HTML buttons with the dynamic Color Picker
        this.renderVisualControls();
        
        // 2. Bind all Event Listeners
        this.bindEvents();
        
        // 3. Set Initial View State
        this.updateAuthUI();
        
        // 4. Render Initial Avatar
        this.updateLivePreview();
    }

    /**
     * UI INJECTION: Renders the new V6 Controls.
     * This overrides the default HTML inside .avatar-controls to remove 
     * "Skin Color" and add "Kit Color Input".
     */
    renderVisualControls() {
        const controlsDiv = document.querySelector('.avatar-controls');
        if (controlsDiv) {
            controlsDiv.innerHTML = `
                <!-- CONTROL 1: KIT COLOR (Native Picker) -->
                <div class="control-row">
                    <label>لون الفريق</label>
                    <div class="selector" style="background:transparent; border:none;">
                        <input type="color" id="inp-kit-color" value="${this.tempDna.kit}" 
                               style="width:60px; height:40px; border:none; background:none; cursor:pointer;">
                    </div>
                </div>

                <!-- CONTROL 2: HEADGEAR / HAIR (Cycling Arrows) -->
                <div class="control-row">
                    <label>الرأس / الشعر</label>
                    <div class="selector">
                        <button class="btn-control" id="btn-hair-prev">❮</button>
                        <span id="lbl-hair" class="font-num">1</span>
                        <button class="btn-control" id="btn-hair-next">❯</button>
                    </div>
                </div>
                
                <!-- NOTE: 'Logo' and 'Face' are advanced features reserved for the 
                     Dressing Room (Profile) to keep Registration simple. -->
            `;
        }
    }

    /**
     * Event Binding Strategy.
     * Connects UI elements to Logic.
     */
    bindEvents() {
        // A. Authentication Mode Toggle (Login <-> Signup)
        if (this.dom.toggleLink) {
            this.dom.toggleLink.onclick = (e) => {
                e.preventDefault();
                SoundManager.play('click');
                this.authMode = (this.authMode === 'LOGIN') ? 'SIGNUP' : 'LOGIN';
                this.updateAuthUI();
            };
        }

        // B. Form Submission
        if (this.dom.form) {
            this.dom.form.onsubmit = (e) => this.handleSubmit(e);
        }

        // C. Live Name Update
        if (this.dom.name) {
            this.dom.name.oninput = () => this.updateLivePreview();
        }

        // D. Activity Selection Logic (Show/Hide Position)
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

        // E. NEW VISUAL CONTROLS BINDING
        
        // 1. Color Picker Binding
        const colorInp = document.getElementById('inp-kit-color');
        if (colorInp) {
            colorInp.addEventListener('input', (e) => {
                this.tempDna.kit = e.target.value; // Store Hex
                this.updateLivePreview();
            });
        }

        // 2. Hair Selector Binding (Circular Logic)
        const bindArrow = (id, dir) => {
            const el = document.getElementById(id);
            if (el) el.onclick = (e) => {
                e.preventDefault();
                SoundManager.play('click');
                
                // Fetch max limit dynamically from Engine config
                const config = AvatarEngine.getConfig();
                const maxHair = config.HEAD_GEAR.length;

                let val = this.tempDna.hair + dir;
                
                // Circular Boundary Check
                if (val > maxHair) val = 1; 
                if (val < 1) val = maxHair;
                
                this.tempDna.hair = val;
                
                // Update UI Label
                const lbl = document.getElementById('lbl-hair');
                if(lbl) lbl.textContent = val;
                
                this.updateLivePreview();
            };
        };

        bindArrow('btn-hair-next', 1);
        bindArrow('btn-hair-prev', -1);
    }

    /**
     * UI State Management.
     * Toggles visibility of fields based on Auth Mode.
     */
    updateAuthUI() {
        const isLogin = this.authMode === 'LOGIN';
        
        this.dom.title.textContent = isLogin ? "تسجيل الدخول" : "إنشاء هوية جديدة";
        this.dom.btnAction.textContent = isLogin ? "دخول" : "صك الهوية";
        
        // Toggle Footer Link Text
        this.dom.footerText.innerHTML = isLogin 
            ? `ليس لديك حساب؟ <a href="#" id="link-toggle-mode" class="text-gold" style="font-weight:bold;">إنشاء حساب جديد</a>`
            : `لديك حساب بالفعل؟ <a href="#" id="link-toggle-mode" class="text-gold" style="font-weight:bold;">تسجيل الدخول</a>`;
        
        // Re-bind toggle link (since innerHTML replaced the element)
        document.getElementById('link-toggle-mode').onclick = (e) => {
            e.preventDefault();
            SoundManager.play('click');
            this.authMode = isLogin ? 'SIGNUP' : 'LOGIN';
            this.updateAuthUI();
        };

        // Toggle Visibility of Studio & Extras
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
            this.updateLivePreview(); // Ensure preview is correct on switch
        }
    }

    /**
     * Preview Renderer.
     * Calls the AvatarEngine to generate HTML based on current state.
     */
    updateLivePreview() {
        if (!this.dom.previewContainer) return;
        
        const name = this.dom.name?.value || 'NOUB';
        
        // Use the Static Generator
        const html = AvatarEngine.generateAvatarHTML(this.tempDna, name);
        
        // Inject into DOM
        if (this.dom.previewContainer.parentElement) {
            this.dom.previewContainer.parentElement.innerHTML = html;
            // Re-cache the container ref (it gets replaced by innerHTML)
            this.dom.previewContainer = document.querySelector('.avatar-comp');
        }
    }

    /**
     * Form Submission Handler.
     * Manages Login and Registration workflows.
     */
    async handleSubmit(e) {
        e.preventDefault();
        const btn = this.dom.btnAction;
        const originalText = btn.textContent;
        
        // Basic Validation
        if (!this.dom.email.value || !this.dom.pass.value) {
            return alert("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
        }

        // Loading State
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

        try {
            if (this.authMode === 'LOGIN') {
                // Login Flow
                await this.authService.loginEmail(this.dom.email.value, this.dom.pass.value);
            } else {
                // Registration Flow
                let pos = 'FAN';
                // Determine Position based on Activity Type
                if (!this.dom.posGroup.classList.contains('hidden')) {
                    pos = document.querySelector('input[name="pos"]:checked')?.value || 'FWD';
                }

                // Call AuthService with New Data Structure
                await this.authService.registerUserEmail(this.dom.email.value, this.dom.pass.value, {
                    username: this.dom.name.value,
                    zoneId: parseInt(this.dom.zone.value),
                    activityType: this.dom.activity.value,
                    position: pos,
                    visualDna: this.tempDna // Passing the V6 DNA Object directly
                });
                
                SoundManager.play('success');
                alert("تم صك الهوية بنجاح! أهلاً بك في نوب سبورتس.");
            }
            
            // Reload to enter the App
            window.location.reload();

        } catch (err) {
            SoundManager.play('error');
            alert(err.message); // Show readable error
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}
