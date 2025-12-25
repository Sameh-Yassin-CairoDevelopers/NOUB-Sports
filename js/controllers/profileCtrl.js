/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/profileCtrl.js
 * Version: Noub Sports_beta 5.0.0 (PRO DRESSING ROOM - FULL)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * This controller manages the "Dressing Room" (Visual Editor) logic.
 * It moves away from linear "Next/Prev" controls to a modern "Palette Selection"
 * interface using Tabs and Grids, providing a premium user experience.
 * 
 * CORE RESPONSIBILITIES:
 * 1. UI Rendering: Dynamically builds the Modal DOM with a Tabbed Interface.
 * 2. State Management: Hydrates temporary state from the User's current config.
 * 3. Palette Generation: Fetches asset arrays from AvatarEngine and renders
 *    interactive selection grids (Color pickers, Icon grids).
 * 4. Persistence: Saves the visual DNA to Supabase and updates the local Singleton.
 * 5. Export: Handles the logic for taking a snapshot (CV) of the player card.
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
        // bg: Background Style, kit: Shirt Color, face: Face Accessory, hair: Headgear
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
        // Ensure we parse the JSONB if it comes as a string from DB
        if (user.visualDna) {
            this.tempVisual = typeof user.visualDna === 'string' ? JSON.parse(user.visualDna) : user.visualDna;
        } else {
            // Fallback default
            this.tempVisual = { bg: 1, kit: 1, face: 1, hair: 1 };
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
        this.renderActivePalette(user.username); // Render the grid for the default tab
        this.bindEvents(user.username);
    }

    /**
     * Helper: Injects the HTML structure.
     * Defines the "Glass Dashboard" layout with Tabs and large Preview Area.
     * 
     * @param {string} modalId - The unique ID for the modal container.
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
                    <!-- This container hosts the live-updated Avatar -->
                    <div class="avatar-studio" style="
                        margin-bottom: 20px; 
                        background: #000; 
                        border: 2px solid #333; 
                        border-radius: 16px; 
                        overflow: hidden;
                        height: 280px; /* Increased Height for full scaling */
                        box-shadow: inset 0 0 20px rgba(0,0,0,0.8);
                        display: flex; justify-content: center; align-items: center;
                    ">
                        <div id="edit-avatar-display" style="width:100%; height:100%;">
                            <!-- Avatar HTML injected here dynamically -->
                        </div>
                    </div>

                    <!-- B. Control Tabs (Icons) -->
                    <!-- Navigation for different customization categories -->
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
                    <!-- This area is repopulated based on the active tab -->
                    <div id="editor-palette-container" style="
                        height: 140px; 
                        overflow-y: auto; 
                        margin-bottom: 20px;
                        background: rgba(255,255,255,0.03);
                        border-radius: 12px;
                        padding: 10px;
                    ">
                        <!-- Grid items (buttons) injected here via JS -->
                    </div>

                    <!-- D. Actions Footer -->
                    <div style="display:flex; gap:10px;">
                        <button id="btn-save-look" class="btn-primary" style="flex:2; font-size:1rem; margin-top:0;">
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

        // Close Logic Binding
        const close = () => document.getElementById(modalId).classList.add('hidden');
        document.getElementById('btn-close-edit').onclick = close;
        document.getElementById('btn-cancel-edit').onclick = close;
    }

    /**
     * Binds interactions for the Tab System and Action Buttons.
     * Ensures click events are not duplicated.
     * 
     * @param {string} username - Used for live preview rendering.
     */
    bindEvents(username) {
        // Tab Switching Logic
        const tabs = document.querySelectorAll('.tab-icon');
        tabs.forEach(btn => {
            btn.onclick = (e) => {
                SoundManager.play('click');
                // UI Toggle: Reset all tabs to dim state
                tabs.forEach(t => {
                    t.style.color = '#777'; 
                    t.style.background = 'transparent';
                });
                
                // Highlight Active Tab
                const target = e.currentTarget; 
                target.style.color = 'var(--gold-main)';
                target.style.background = 'rgba(212,175,55,0.1)';
                
                // Update State and Render Grid
                this.activeTab = target.dataset.target;
                this.renderActivePalette(username);
            };
        });

        // Force click the active tab to set initial visual state
        const initialTab = document.querySelector(`.tab-icon[data-target="${this.activeTab}"]`);
        if(initialTab) initialTab.click();

        // Bind Action Buttons
        document.getElementById('btn-save-look').onclick = () => this.handleSave();
        document.getElementById('btn-download-cv').onclick = () => this.handleDownloadCV();
    }

    /**
     * CORE LOGIC: Renders the selection grid based on the active tab.
     * Fetches configuration directly from AvatarEngine static config.
     * 
     * @param {string} username - Passed to preview update for immediate feedback.
     */
    renderActivePalette(username) {
        const container = document.getElementById('editor-palette-container');
        const config = AvatarEngine.getConfig(); // Fetch Arrays from Engine
        
        container.innerHTML = ''; // Clear previous grid
        
        // Define Grid Style dynamically
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

        // Generate Buttons Loop
        items.forEach((item, index) => {
            const btn = document.createElement('button');
            const logicalIndex = index + 1; // 1-based index for DB storage
            const isActive = this.tempVisual[type] === logicalIndex;

            // Common Styling
            btn.style.width = '100%';
            btn.style.aspectRatio = '1/1';
            btn.style.borderRadius = '10px';
            btn.style.border = isActive ? '2px solid #fff' : '1px solid #444'; // Highlight Selection
            btn.style.cursor = 'pointer';
            btn.style.display = 'flex';
            btn.style.justifyContent = 'center';
            btn.style.alignItems = 'center';
            btn.style.fontSize = '1.2rem';
            btn.style.position = 'relative';
            
            // Type-Specific Styling & Content
            if (type === 'kit') {
                btn.style.background = item;
                // Add tiny shirt icon for contrast
                btn.innerHTML = `<i class="fa-solid fa-shirt" style="color:rgba(0,0,0,0.3); font-size:0.9rem;"></i>`;
            
            } else if (type === 'bg') {
                btn.style.background = item;
            
            } else if (type === 'face' || type === 'hair') {
                btn.style.background = '#222';
                btn.style.color = isActive ? 'var(--gold-main)' : '#888';
                if (item) {
                    btn.innerHTML = `<i class="fa-solid ${item}"></i>`;
                } else {
                    // "None" option (Empty slot)
                    btn.innerHTML = `<i class="fa-solid fa-ban" style="font-size:0.8rem; opacity:0.5;"></i>`; 
                }
            }

            // Click Handler (Immediate Preview Update)
            btn.onclick = () => {
                SoundManager.play('click');
                this.tempVisual[type] = logicalIndex;
                
                // Update Preview
                this.updateEditorPreview(username);
                
                // Re-render Palette to update the active border highlight
                this.renderActivePalette(username); 
            };

            container.appendChild(btn);
        });
    }

    /**
     * Updates the preview box HTML using the AvatarEngine.
     * 
     * @param {string} username - Name to appear on shirt.
     */
    updateEditorPreview(username) {
        const container = document.getElementById('edit-avatar-display');
        if (container) {
            container.innerHTML = AvatarEngine.generateAvatarHTML(this.tempVisual, username);
        }
    }

    /**
     * TRANSACTION: Save Changes.
     * Updates Supabase 'cards' table and local State Manager.
     */
    async handleSave() {
        const btn = document.getElementById('btn-save-look');
        const originalText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            const user = state.getUser();
            
            // 1. Update Database (Targeting GENESIS card only)
            const { error } = await supabase
                .from('cards')
                .update({ visual_dna: this.tempVisual })
                .eq('owner_id', user.id)
                .eq('type', 'GENESIS');

            if (error) throw error;

            // 2. Update Local State (Crucial for immediate consistency)
            const updatedUser = { ...user, visualDna: this.tempVisual };
            state.setUser(updatedUser);

            SoundManager.play('success');
            
            // 3. Force Reload to reflect changes globally
            window.location.reload(); 

        } catch (err) {
            SoundManager.play('error');
            alert("فشل الحفظ: " + err.message);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    /**
     * LOGIC: Snapshot (CV Generation).
     * Temporarily hides the modal to reveal the underlying Card, takes a snapshot,
     * then restores the modal.
     */
    async handleDownloadCV() {
        const modal = document.getElementById('modal-profile-edit');
        const cardElement = document.getElementById('my-player-card'); // Element on Home Screen

        if (!cardElement) {
            alert("يرجى العودة للصفحة الرئيسية (هويتي) لتتمكن من تصوير الكارت.");
            return;
        }

        // 1. Hide Modal temporarily to reveal the card
        modal.classList.add('hidden');
        
        // 2. Play Sound (Camera Shutter)
        SoundManager.play('success'); 
        
        // 3. Wait 300ms for UI transition to finish, then snap
        setTimeout(async () => {
            try {
                // Generate filename with timestamp
                const filename = `noub-cv-${Date.now()}.png`;
                
                // Call Utility to export
                await CVGenerator.downloadCV('my-player-card', filename);
                
                // 4. Show Modal again after capture
                modal.classList.remove('hidden');
                
            } catch (e) {
                console.error("CV Generation Error:", e);
                alert("حدث خطأ أثناء التصوير.");
                modal.classList.remove('hidden'); // Restore modal even on error
            }
        }, 300);
    }
}
