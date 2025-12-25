/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/profileCtrl.js
 * Version: Noub Sports_beta 6.0.0 (PROFESSIONAL STUDIO MASTER)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ACADEMIC MODULE DESCRIPTION:
 * -----------------------------------------------------------------------------
 * This controller serves as the Logic Layer for the "Pro Dressing Room".
 * It implements a sophisticated UI pattern separating "Attribute Modification" 
 * (Color Wheels) from "Asset Selection" (Icon Grids).
 * 
 * CORE RESPONSIBILITIES:
 * 1. State Hydration: Loads user's visual DNA, adapting legacy data types 
 *    (Integer Indices) to new formats (Hex Strings) on the fly.
 * 2. Dynamic Rendering: Builds the DOM for the Studio Modal, switching interactively
 *    between Palettes and Color Wheels based on the active tab context.
 * 3. Live Preview: Bridges the UI events (Input/Click) with the AvatarEngine V6
 *    to provide real-time visual feedback before saving.
 * 4. Persistence Layer: Commits the final DNA state to Supabase JSONB storage.
 * -----------------------------------------------------------------------------
 */

import { state } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { AvatarEngine } from '../utils/avatarEngine.js';
import { SoundManager } from '../utils/soundManager.js';
import { AuthService } from '../services/authService.js';
import { CVGenerator } from '../utils/cvGenerator.js';

export class ProfileController {
    
    /**
     * Constructor: Initializes the controller instance.
     * Sets up the internal state container for visual modifications.
     */
    constructor() {
        this.authService = new AuthService();
        
        // Internal Mutable State (The Editing Buffer)
        // Stores the DNA configuration currently being edited.
        // V6 Schema: { kit: string(hex), logo: int, face: int, hair: int }
        this.tempVisual = { 
            kit: '#3b82f6', // Default Royal Blue
            logo: 1, 
            face: 1, 
            hair: 1 
        };
        
        // UI State: Tracks the currently selected editing category
        // Options: 'kit', 'logo', 'face', 'hair'
        this.activeTab = 'kit'; 
        
        console.log("👕 ProfileController: Visual Studio V6 Initialized.");
    }

    /**
     * MAIN ENTRY POINT: Opens the Studio Modal.
     * Handles Lazy Loading of DOM elements and State Hydration.
     */
    openEditModal() {
        SoundManager.play('click');
        
        const user = state.getUser();
        if (!user) return;

        // 1. Hydrate State from User Profile (Deep Copy)
        if (user.visualDna) {
            const dna = typeof user.visualDna === 'string' ? JSON.parse(user.visualDna) : user.visualDna;
            
            // Backward Compatibility Layer:
            // If 'kit' comes as an integer (Legacy V1-V5), map it to a default Hex.
            // If it's a string (V6+), use it directly.
            this.tempVisual = {
                kit: typeof dna.kit === 'string' ? dna.kit : '#3b82f6',
                logo: dna.logo || dna.bg || 1, // Map old 'bg' index to 'logo' slot if upgrading
                face: dna.face || 1,
                hair: dna.hair || 1
            };
        }

        const modalId = 'modal-profile-edit';

        // 2. Build DOM if not present (Singleton Pattern)
        if (!document.getElementById(modalId)) {
            this.buildModalDOM(modalId);
        }

        // 3. Display Modal
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        // 4. Initial Render Sequence
        this.updateEditorPreview(user.username);
        this.renderControlPanel(user.username); // Renders the tools for the default tab
        this.bindTabEvents(user.username);
    }

    /**
     * DOM BUILDER: Injects the Studio HTML Structure.
     * Creates the Layout: Header -> Preview Stage -> Tab Bar -> Control Panel -> Actions.
     * 
     * @param {string} modalId - The unique ID for the modal container.
     */
    buildModalDOM(modalId) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="${modalId}" class="modal-overlay hidden" style="align-items: center;">
                <div class="modal-box" style="max-width: 400px; background: #1a1c23; border: 1px solid rgba(212,175,55,0.2); border-radius: 24px; padding: 20px;">
                    
                    <!-- Header -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h3 style="color:var(--gold-main); font-family:var(--font-sport);">غرفة الملابس</h3>
                        <!-- Close/Back Button -->
                        <button class="close-btn" id="btn-close-edit" style="font-size:1.2rem; color:#fff;">
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                    
                    <!-- A. THE STAGE (Visual Preview) -->
                    <!-- Changed background to Standard Royal Gradient per requirements -->
                    <div class="avatar-studio" style="
                        margin-bottom: 20px; 
                        background: radial-gradient(circle, #222 0%, #000 100%); 
                        border: 2px solid #333; 
                        border-radius: 16px; 
                        overflow: hidden;
                        height: 260px; /* Optimized height for V6 Anatomy */
                        box-shadow: inset 0 0 30px rgba(0,0,0,0.9);
                        display: flex; justify-content: center; align-items: flex-end;
                    ">
                        <div id="edit-avatar-display" style="width:100%; height:100%;">
                            <!-- Avatar Engine Output injected here -->
                        </div>
                    </div>

                    <!-- B. TAB NAVIGATION (Icon Bar) -->
                    <div class="editor-tabs" style="
                        display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; 
                        margin-bottom:15px; background:rgba(0,0,0,0.3); padding:8px; border-radius:12px;">
                        
                        <button class="tab-icon active" data-target="kit" title="الزي واللون">
                            <i class="fa-solid fa-shirt"></i>
                        </button>
                        <button class="tab-icon" data-target="logo" title="الشعار">
                            <i class="fa-solid fa-shield-halved"></i>
                        </button>
                        <button class="tab-icon" data-target="face" title="الوجه">
                            <i class="fa-solid fa-glasses"></i>
                        </button>
                        <button class="tab-icon" data-target="hair" title="الرأس">
                            <i class="fa-solid fa-hat-cowboy"></i>
                        </button>
                    </div>

                    <!-- C. CONTROL PANEL (Dynamic: Color Picker OR Grid) -->
                    <div id="editor-control-panel" style="
                        height: 130px; 
                        margin-bottom: 20px;
                        background: rgba(255,255,255,0.03);
                        border-radius: 12px;
                        padding: 15px;
                        display: flex; justify-content: center; align-items: center;
                        overflow-y: auto;
                    ">
                        <!-- Controls injected via JS -->
                    </div>

                    <!-- D. ACTION FOOTER -->
                    <div style="display:flex; gap:10px;">
                        <button id="btn-save-look" class="btn-primary" style="flex:2; font-size:1rem; margin-top:0;">
                            <i class="fa-solid fa-check"></i> حفظ المظهر
                        </button>
                        <button id="btn-download-cv" class="btn-action-secondary" style="flex:1; justify-content:center; border-color:#fff; color:#fff;">
                            <i class="fa-solid fa-camera"></i>
                        </button>
                    </div>

                </div>
            </div>
        `);

        // Bind Close Logic
        document.getElementById('btn-close-edit').onclick = () => {
            document.getElementById(modalId).classList.add('hidden');
        };
    }

    /**
     * EVENT BINDER: Handles Tab Switching.
     * Updates the UI state and re-renders the control panel based on selection.
     */
    bindTabEvents(username) {
        const tabs = document.querySelectorAll('.tab-icon');
        
        tabs.forEach(btn => {
            btn.onclick = (e) => {
                SoundManager.play('click');
                
                // 1. Visual Toggle
                tabs.forEach(t => {
                    t.style.color = '#777'; 
                    t.style.background = 'transparent';
                });
                const target = e.currentTarget;
                target.style.color = 'var(--gold-main)';
                target.style.background = 'rgba(212,175,55,0.1)';
                
                // 2. State Update
                this.activeTab = target.dataset.target;
                
                // 3. Render Appropriate Controls
                this.renderControlPanel(username);
            };
        });

        // Force-click the active tab to set initial visual state
        const initialTab = document.querySelector(`.tab-icon[data-target="${this.activeTab}"]`);
        if(initialTab) {
            initialTab.style.color = 'var(--gold-main)';
            initialTab.style.background = 'rgba(212,175,55,0.1)';
        }

        // Bind Save & Camera Actions
        document.getElementById('btn-save-look').onclick = () => this.handleSave();
        document.getElementById('btn-download-cv').onclick = () => this.handleDownloadCV();
    }

    /**
     * CONTROL RENDERER: The Logic Switcher.
     * Determines whether to show a Color Picker (for Kits) or an Icon Grid (for Items).
     * 
     * @param {string} username - Passed for live preview updates.
     */
    renderControlPanel(username) {
        const container = document.getElementById('editor-control-panel');
        container.innerHTML = ''; // Reset content
        const config = AvatarEngine.getConfig(); // Fetch Arrays from Engine

        // --- SCENARIO A: KIT COLOR (COLOR WHEEL) ---
        if (this.activeTab === 'kit') {
            
            // Container layout
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';
            container.style.alignItems = 'center';

            const label = document.createElement('div');
            label.textContent = "اختر لون الفريق المفضل:";
            label.className = "text-muted";
            label.style.fontSize = "0.9rem";

            // The Native Color Input
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = this.tempVisual.kit; // Set current value
            colorInput.style.width = '80%';
            colorInput.style.height = '50px';
            colorInput.style.border = 'none';
            colorInput.style.borderRadius = '8px';
            colorInput.style.cursor = 'pointer';
            colorInput.style.background = 'transparent';

            // Live Update Event
            colorInput.addEventListener('input', (e) => {
                this.tempVisual.kit = e.target.value; // Store Hex
                this.updateEditorPreview(username);
            });

            container.appendChild(label);
            container.appendChild(colorInput);

        } 
        // --- SCENARIO B: ASSET GRID (LOGOS, FACE, HAIR) ---
        else {
            
            // Map Tab to Config Array
            let items = [];
            if (this.activeTab === 'logo') items = config.LOGOS;
            else if (this.activeTab === 'face') items = config.FACE_GEAR;
            else if (this.activeTab === 'hair') items = config.HEAD_GEAR;

            // Grid Layout Styling
            container.style.display = 'grid';
            container.style.gridTemplateColumns = 'repeat(5, 1fr)';
            container.style.gap = '8px';
            container.style.alignContent = 'start';
            container.style.width = '100%';
            container.style.justifyItems = 'center';

            // Generate Item Buttons
            items.forEach((item, index) => {
                const btn = document.createElement('button');
                const logicalIndex = index + 1; // 1-based index
                const isActive = this.tempVisual[this.activeTab] === logicalIndex;

                // Button Styling
                btn.style.width = '100%';
                btn.style.aspectRatio = '1/1';
                btn.style.borderRadius = '8px';
                btn.style.border = isActive ? '2px solid var(--gold-main)' : '1px solid #444';
                btn.style.background = isActive ? 'rgba(212,175,55,0.1)' : '#222';
                btn.style.color = isActive ? 'var(--gold-main)' : '#888';
                btn.style.cursor = 'pointer';
                btn.style.display = 'flex';
                btn.style.justifyContent = 'center';
                btn.style.alignItems = 'center';
                btn.style.fontSize = '1.2rem';

                // Content (Icon or "None")
                if (item) {
                    btn.innerHTML = `<i class="fa-solid ${item}"></i>`;
                } else {
                    btn.innerHTML = `<i class="fa-solid fa-ban" style="font-size:0.8rem; opacity:0.5;"></i>`;
                }

                // Click Interaction
                btn.onclick = () => {
                    SoundManager.play('click');
                    this.tempVisual[this.activeTab] = logicalIndex;
                    this.updateEditorPreview(username);
                    this.renderControlPanel(username); // Re-render to update borders
                };

                container.appendChild(btn);
            });
        }
    }

    /**
     * PREVIEW RENDERER: Updates the visual stage.
     * Uses AvatarEngine to generate the HTML based on current 'tempVisual' state.
     * 
     * @param {string} username - Name to display on shirt.
     */
    updateEditorPreview(username) {
        const container = document.getElementById('edit-avatar-display');
        if (container) {
            container.innerHTML = AvatarEngine.generateAvatarHTML(this.tempVisual, username);
        }
    }

    /**
     * TRANSACTION: Save Changes.
     * Persists the visual DNA to the Database and Global State.
     */
    async handleSave() {
        const btn = document.getElementById('btn-save-look');
        const originalText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            const user = state.getUser();
            
            // 1. Update Database (Supabase)
            const { error } = await supabase
                .from('cards')
                .update({ visual_dna: this.tempVisual })
                .eq('owner_id', user.id)
                .eq('type', 'GENESIS');

            if (error) throw error;

            // 2. Update Local State (Singleton)
            const updatedUser = { ...user, visualDna: this.tempVisual };
            state.setUser(updatedUser);

            SoundManager.play('success');
            
            // 3. Reload Application
            window.location.reload(); 

        } catch (err) {
            SoundManager.play('error');
            alert("فشل الحفظ: " + err.message);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    /**
     * UTILITY: Snapshot Generation (CV).
     * Temporarily hides UI overlays to capture the pure Card element using CVGenerator.
     */
    async handleDownloadCV() {
        const modal = document.getElementById('modal-profile-edit');
        const cardElement = document.getElementById('my-player-card'); // Target element on Home Screen

        if (!cardElement) {
            alert("يرجى العودة للصفحة الرئيسية (هويتي) لتتمكن من تصوير الكارت.");
            return;
        }

        // 1. Hide Modal
        modal.classList.add('hidden');
        SoundManager.play('success'); // Shutter Sound
        
        // 2. Wait for transitions (300ms) then Capture
        setTimeout(async () => {
            try {
                const filename = `noub-card-${Date.now()}.png`;
                
                // Call Utility to export
                await CVGenerator.downloadCV('my-player-card', filename);
                
                // 3. Restore Modal
                modal.classList.remove('hidden');
                
            } catch (e) {
                console.error("CV Generation Error:", e);
                alert("فشل التصوير.");
                modal.classList.remove('hidden'); // Restore modal even on error
            }
        }, 300);
    }
}
