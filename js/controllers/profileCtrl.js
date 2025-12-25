/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/profileCtrl.js
 * Version: Noub Sports_beta 5.0.0 (PRO DRESSING ROOM)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * This controller manages the "Dressing Room" (Visual Editor) logic.
 * It moves away from linear "Next/Prev" controls to a modern "Palette Selection"
 * interface using Tabs and Grids.
 * 
 * CORE RESPONSIBILITIES:
 * 1. UI Rendering: Dynamically builds the Modal DOM with a Tabbed Interface.
 * 2. State Management: Hydrates temporary state from the User's current config.
 * 3. Palette Generation: Fetches asset arrays from AvatarEngine and renders
 *    interactive selection grids (Color pickers, Icon grids).
 * 4. Persistence: Saves the visual DNA to Supabase and updates the local Singleton.
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
     * Constructor: Initializes dependencies.
     * Sets up the internal state for the visual editor.
     */
    constructor() {
        this.authService = new AuthService();
        
        // Internal State: Holds visual changes before "Save"
        // Structure matches AvatarEngine schema
        this.tempVisual = { bg: 1, kit: 1, face: 1, hair: 1 };
        
        // Active Tab State (Default: Kits)
        this.activeTab = 'kit'; 
        
        console.log("👕 ProfileController: Dressing Room Ready.");
    }

    /**
     * Entry Point: Opens the Pro Dressing Room Modal.
     * Lazy-loads the DOM structure if it doesn't exist yet.
     */
    openEditModal() {
        SoundManager.play('click');
        
        const user = state.getUser();
        if (!user) return;

        // 1. Hydrate Temp State
        if (user.visualDna) {
            this.tempVisual = typeof user.visualDna === 'string' ? JSON.parse(user.visualDna) : user.visualDna;
        }

        const modalId = 'modal-profile-edit';

        // 2. Build Modal DOM (Singleton Pattern)
        if (!document.getElementById(modalId)) {
            this.buildModalDOM(modalId);
        }

        // 3. Show Modal
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        // 4. Initial Render
        this.updateEditorPreview(user.username);
        this.renderActivePalette(); // Render the grid for the default tab
        this.bindEvents(user.username);
    }

    /**
     * Helper: Injects the HTML structure.
     * Defines the "Glass Dashboard" layout with Tabs.
     */
    buildModalDOM(modalId) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="${modalId}" class="modal-overlay hidden" style="align-items: center;">
                <div class="modal-box" style="max-width: 400px; background: #1a1c23; border: 1px solid rgba(212,175,55,0.2); border-radius: 24px; padding: 20px;">
                    
                    <!-- Header -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3 style="color:var(--gold-main); font-family:var(--font-sport);">غرفة الملابس</h3>
                        <button class="close-btn" id="btn-close-edit" style="font-size:1.5rem;">&times;</button>
                    </div>
                    
                    <!-- A. Visual Preview Box (Larger & Cleaner) -->
                    <div class="avatar-studio" style="
                        margin-bottom: 20px; 
                        background: #000; 
                        border: 2px solid #333; 
                        border-radius: 16px; 
                        overflow: hidden;
                        height: 280px; /* Increased Height */
                        box-shadow: inset 0 0 20px rgba(0,0,0,0.8);
                    ">
                        <div id="edit-avatar-display" style="width:100%; height:100%;">
                            <!-- Avatar HTML injected here -->
                        </div>
                    </div>

                    <!-- B. Control Tabs (Icons) -->
                    <div class="editor-tabs" style="display:flex; justify-content:space-around; margin-bottom:15px; background:rgba(0,0,0,0.3); padding:8px; border-radius:12px;">
                        <button class="tab-icon active" data-target="kit" title="الزي">
                            <i class="fa-solid fa-shirt"></i>
                        </button>
                        <button class="tab-icon" data-target="face" title="الوجه">
                            <i class="fa-solid fa-glasses"></i>
                        </button>
                        <button class="tab-icon" data-target="hair" title="الرأس">
                            <i class="fa-solid fa-hat-cowboy"></i>
                        </button>
                        <button class="tab-icon" data-target="bg" title="الخلفية">
                            <i class="fa-solid fa-image"></i>
                        </button>
                    </div>

                    <!-- C. Palette Grid (Dynamic Content) -->
                    <div id="editor-palette-container" style="
                        height: 140px; 
                        overflow-y: auto; 
                        margin-bottom: 20px;
                        background: rgba(255,255,255,0.03);
                        border-radius: 12px;
                        padding: 10px;
                    ">
                        <!-- Grid items injected here based on Tab -->
                    </div>

                    <!-- D. Actions Footer -->
                    <div style="display:flex; gap:10px;">
                        <button id="btn-save-look" class="btn-primary" style="flex:2; font-size:1rem;">
                            <i class="fa-solid fa-check"></i> حفظ المظهر
                        </button>
                        <button id="btn-download-cv" class="btn-action-secondary" style="flex:1; justify-content:center; border-color:#fff; color:#fff;">
                            <i class="fa-solid fa-camera"></i>
                        </button>
                        <button id="btn-cancel-edit" class="btn-action-secondary" style="flex:1; justify-content:center; border-color:#ef4444; color:#ef4444;">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                    </div>

                </div>
            </div>
        `);

        // Close Logic
        const close = () => document.getElementById(modalId).classList.add('hidden');
        document.getElementById('btn-close-edit').onclick = close;
        document.getElementById('btn-cancel-edit').onclick = close;
    }

    /**
     * Binds interactions for the Tab System and Action Buttons.
     */
    bindEvents(username) {
        // Tab Switching Logic
        const tabs = document.querySelectorAll('.tab-icon');
        tabs.forEach(btn => {
            btn.onclick = (e) => {
                SoundManager.play('click');
                // UI Toggle
                tabs.forEach(t => {
                    t.style.color = '#777'; 
                    t.style.background = 'transparent';
                });
                // Highlight Active
                const target = e.currentTarget; // Safer than e.target for icons
                target.style.color = 'var(--gold-main)';
                target.style.background = 'rgba(212,175,55,0.1)';
                
                this.activeTab = target.dataset.target;
                this.renderActivePalette(username);
            };
        });

        // Set Initial Active Tab Style
        const initialTab = document.querySelector(`.tab-icon[data-target="${this.activeTab}"]`);
        if(initialTab) initialTab.click();

        // Save & Snapshot
        document.getElementById('btn-save-look').onclick = () => this.handleSave();
        document.getElementById('btn-download-cv').onclick = () => this.handleDownloadCV();
    }

    /**
     * CORE LOGIC: Renders the selection grid based on the active tab.
     * Fetches config directly from AvatarEngine static config.
     */
    renderActivePalette(username) {
        const container = document.getElementById('editor-palette-container');
        const config = AvatarEngine.getConfig(); // Fetch Arrays
        
        container.innerHTML = ''; // Clear previous
        
        // Define Grid Style
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(4, 1fr)';
        container.style.gap = '10px';

        let items = [];
        let type = this.activeTab;

        // Map Tab to Config Array
        if (type === 'kit') items = config.KITS;
        else if (type === 'bg') items = config.BACKGROUNDS;
        else if (type === 'face') items = config.FACE_GEAR;
        else if (type === 'hair') items = config.HEAD_GEAR;

        // Generate Buttons
        items.forEach((item, index) => {
            const btn = document.createElement('button');
            const logicalIndex = index + 1; // 1-based for storage
            const isActive = this.tempVisual[type] === logicalIndex;

            // Common Styling
            btn.style.width = '100%';
            btn.style.aspectRatio = '1/1';
            btn.style.borderRadius = '10px';
            btn.style.border = isActive ? '2px solid #fff' : '1px solid #444';
            btn.style.cursor = 'pointer';
            btn.style.display = 'flex';
            btn.style.justifyContent = 'center';
            btn.style.alignItems = 'center';
            btn.style.fontSize = '1.2rem';
            
            // Type-Specific Styling
            if (type === 'kit') {
                btn.style.background = item;
                // Add tiny shirt icon for contrast
                btn.innerHTML = `<i class="fa-solid fa-shirt" style="color:rgba(0,0,0,0.3); font-size:0.8rem;"></i>`;
            
            } else if (type === 'bg') {
                btn.style.background = item;
            
            } else if (type === 'face' || type === 'hair') {
                btn.style.background = '#222';
                btn.style.color = isActive ? 'var(--gold-main)' : '#888';
                if (item) {
                    btn.innerHTML = `<i class="fa-solid ${item}"></i>`;
                } else {
                    btn.innerHTML = `<i class="fa-solid fa-ban" style="font-size:0.8rem;"></i>`; // "None" option
                }
            }

            // Click Handler (Immediate Preview)
            btn.onclick = () => {
                SoundManager.play('click');
                this.tempVisual[type] = logicalIndex;
                this.updateEditorPreview(username);
                this.renderActivePalette(username); // Re-render to update active border
            };

            container.appendChild(btn);
        });
    }

    /**
     * Updates the preview box using the Engine.
     */
    updateEditorPreview(username) {
        const container = document.getElementById('edit-avatar-display');
        if (container) {
            container.innerHTML = AvatarEngine.generateAvatarHTML(this.tempVisual, username);
        }
    }

    /**
     * TRANSACTION: Save Changes
     */
    async handleSave() {
        const btn = document.getElementById('btn-save-look');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const user = state.getUser();
            
            // 1. Update Database
            const { error } = await supabase
                .from('cards')
                .update({ visual_dna: this.tempVisual })
                .eq('owner_id', user.id)
                .eq('type', 'GENESIS');

            if (error) throw error;

            // 2. Update Local State
            const updatedUser = { ...user, visualDna: this.tempVisual };
            state.setUser(updatedUser);

            SoundManager.play('success');
            window.location.reload(); // Hard Refresh to apply everywhere

        } catch (err) {
            SoundManager.play('error');
            alert("فشل الحفظ: " + err.message);
            btn.disabled = false;
            btn.textContent = "حفظ المظهر";
        }
    }

    /**
     * LOGIC: Snapshot (CV)
     */
    async handleDownloadCV() {
        // ... (Logic remains same: Hide modal, snap card, show modal)
        // Re-using previous logic but ensuring it targets the new layout if needed
        const modal = document.getElementById('modal-profile-edit');
        const cardElement = document.getElementById('my-player-card'); // Element on Home Screen

        if (!cardElement) {
            alert("يرجى العودة للصفحة الرئيسية لتصوير الكارت.");
            return;
        }

        modal.classList.add('hidden');
        SoundManager.play('success');
        
        setTimeout(async () => {
            try {
                const filename = `noub-cv-${Date.now()}.png`;
                await CVGenerator.downloadCV('my-player-card', filename);
                modal.classList.remove('hidden');
            } catch (e) {
                alert("خطأ في التصوير.");
                modal.classList.remove('hidden');
            }
        }, 300);
    }
}
