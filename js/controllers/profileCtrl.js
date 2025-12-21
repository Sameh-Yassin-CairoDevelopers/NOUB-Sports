/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/profileCtrl.js
 * Version: Noub Sports_beta 0.0.6 (VISUAL CONTROL)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * This controller manages the "Dressing Room" (Visual Editor) and User Settings.
 * It operates primarily via a Modal Overlay to maintain context.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Visual Editor Logic: Manages temporary state for Avatar DNA (Skin, Kit, Hair)
 *    before committing to the database.
 * 2. Persistence Layer: Updates the 'cards' table in Supabase and synchronizes
 *    the Singleton State.
 * 3. Export Utility: Bridges the UI with CVGenerator to create downloadable images.
 * 4. Session Management: Handles the secure Logout process.
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
     * Sets up a temporary visual state container.
     */
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        // Internal State: Holds visual changes before "Save" is clicked.
        // Structure matches the database 'visual_dna' JSONB.
        this.tempVisual = { skin: 1, kit: 1, hair: 1 };
    }

    /**
     * Entry Point: Opens the Edit/Settings Modal.
     * Lazy-loads the DOM structure if it doesn't exist yet.
     */
    openEditModal() {
        SoundManager.play('click');
        
        const user = state.getUser();
        if (!user) return;

        // 1. Hydrate Temp State from Current User Data
        // Handles both JSON string and Object formats for safety
        if (user.visualDna) {
            this.tempVisual = typeof user.visualDna === 'string' ? JSON.parse(user.visualDna) : user.visualDna;
        }

        const modalId = 'modal-profile-edit';

        // 2. Build Modal DOM (Singleton Pattern for DOM Elements)
        if (!document.getElementById(modalId)) {
            this.buildModalDOM(modalId);
        }

        // 3. Show Modal
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        // 4. Initial Render of the Preview Avatar inside the modal
        this.updateEditorPreview(user.username);

        // 5. Bind Events (Re-bind on every open to ensure fresh state context)
        this.bindEditorEvents(user.username);
    }

    /**
     * Helper: Injects the HTML structure for the Editor Modal.
     */
    buildModalDOM(modalId) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="${modalId}" class="modal-overlay hidden">
                <div class="modal-box">
                    <!-- Header -->
                    <div class="modal-header">
                        <h3>غرفة الملابس</h3>
                        <button class="close-btn" id="btn-close-edit">&times;</button>
                    </div>
                    
                    <div id="editor-content">
                        <!-- A. Visual Preview Box -->
                        <div class="avatar-studio" style="margin-bottom:20px; background:#111; border:1px solid #333;">
                            <div class="avatar-preview" id="edit-avatar-display" style="height:200px; border-bottom:none;">
                                <!-- Dynamic Avatar HTML will be injected here -->
                            </div>
                        </div>

                        <!-- B. Visual Controls -->
                        <div class="avatar-controls">
                            <!-- Skin Tone Control -->
                            <div class="control-row">
                                <label>لون الجسم</label>
                                <div class="selector">
                                    <button class="btn-control" id="edit-skin-prev">❮</button>
                                    <span id="edit-lbl-skin" class="font-num">${this.tempVisual.skin || 1}</span>
                                    <button class="btn-control" id="edit-skin-next">❯</button>
                                    <span class="lbl-desc">درجة اللون</span>
                                </div>
                            </div>

                            <!-- Kit Style Control -->
                            <div class="control-row">
                                <label>طقم الفريق</label>
                                <div class="selector">
                                    <button class="btn-control" id="edit-kit-prev">❮</button>
                                    <span id="edit-lbl-kit" class="font-num">${this.tempVisual.kit || 1}</span>
                                    <button class="btn-control" id="edit-kit-next">❯</button>
                                    <span class="lbl-desc">لون الزي</span>
                                </div>
                            </div>

                            <!-- Headgear/Hair Control -->
                            <div class="control-row">
                                <label>الرأس / الشعر</label>
                                <div class="selector">
                                    <button class="btn-control" id="edit-hair-prev">❮</button>
                                    <span id="edit-lbl-hair" class="font-num">${this.tempVisual.hair || 1}</span>
                                    <button class="btn-control" id="edit-hair-next">❯</button>
                                    <span class="lbl-desc">تصفيفة</span>
                                </div>
                            </div>
                        </div>

                        <!-- C. Actions Row -->
                        <div style="display:flex; gap:10px; margin-top:25px;">
                            <button id="btn-save-look" class="btn-primary" style="margin-top:0; flex:2;">
                                <i class="fa-solid fa-floppy-disk"></i> حفظ المظهر
                            </button>
                            <button id="btn-download-cv" class="btn-action-secondary" style="flex:1; border-color:var(--gold-main); color:var(--gold-main); justify-content:center;">
                                <i class="fa-solid fa-camera"></i> صورة
                            </button>
                        </div>
                        
                        <!-- Logout Action -->
                        <button id="btn-logout" class="btn-action-secondary" style="width:100%; margin-top:15px; justify-content:center; color:var(--danger); border-color:var(--danger);">
                            <i class="fa-solid fa-right-from-bracket"></i> تسجيل خروج
                        </button>
                    </div>
                </div>
            </div>
        `);

        // Bind Close Button Logic
        document.getElementById('btn-close-edit').addEventListener('click', () => {
            document.getElementById(modalId).classList.add('hidden');
        });
    }

    /**
     * Binds click events for Editor controls.
     * Uses Arrow Functions to maintain 'this' context.
     */
    bindEditorEvents(username) {
        // Helper to update state and UI Labels
        const updateState = (type, dir) => {
            SoundManager.play('click');
            
            // Hardcoded limits (Must match AvatarEngine Config Arrays)
            const maxMap = { skin: 5, kit: 5, hair: 5 }; 
            const max = maxMap[type] || 3;

            let val = (this.tempVisual[type] || 1) + dir;
            // Circular rotation logic
            if (val > max) val = 1;
            if (val < 1) val = max;
            
            this.tempVisual[type] = val;
            
            // Update Number Label
            const lbl = document.getElementById(`edit-lbl-${type}`);
            if(lbl) lbl.textContent = val;
            
            // Re-render Preview
            this.updateEditorPreview(username);
        };

        // Helper to get element safely
        const get = (id) => document.getElementById(id);

        // Bind Arrows (Overwriting 'onclick' to prevent duplicate listeners pile-up)
        get('edit-skin-prev').onclick = () => updateState('skin', -1);
        get('edit-skin-next').onclick = () => updateState('skin', 1);
        
        get('edit-kit-prev').onclick = () => updateState('kit', -1);
        get('edit-kit-next').onclick = () => updateState('kit', 1);
        
        get('edit-hair-prev').onclick = () => updateState('hair', -1);
        get('edit-hair-next').onclick = () => updateState('hair', 1);

        // Bind Main Action Buttons
        get('btn-save-look').onclick = () => this.handleSave();
        get('btn-logout').onclick = () => this.handleLogout();
        get('btn-download-cv').onclick = () => this.handleDownloadCV();
    }

    /**
     * Renders the avatar HTML inside the modal preview box.
     * Uses the AvatarEngine static generator.
     */
    updateEditorPreview(username) {
        const container = document.getElementById('edit-avatar-display');
        if (container) {
            container.innerHTML = AvatarEngine.generateAvatarHTML(this.tempVisual, username);
        }
    }

    /**
     * TRANSACTION: Save Changes
     * 1. Updates 'cards' table in Supabase.
     * 2. Updates Global State.
     * 3. Reloads Page to reflect changes everywhere.
     */
    async handleSave() {
        const btn = document.getElementById('btn-save-look');
        btn.disabled = true;
        btn.textContent = "جاري الحفظ...";

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
            // We clone the user object to trigger state change detection if needed later
            const updatedUser = { ...user, visualDna: this.tempVisual };
            state.setUser(updatedUser);

            SoundManager.play('success');
            
            // 3. Force Reload
            // This ensures all cached views (like Scout lists or Home Card) get the new visual immediately.
            window.location.reload();

        } catch (err) {
            console.error(err);
            SoundManager.play('error');
            alert("فشل الحفظ: " + err.message);
            btn.disabled = false;
            btn.textContent = "حفظ المظهر";
        }
    }

    /**
     * LOGIC: Generate Scout CV Image
     * Temporarily hides the modal to snap the underlying Home Card.
     */
    async handleDownloadCV() {
        const modal = document.getElementById('modal-profile-edit');
        const cardElement = document.getElementById('my-player-card'); // Element on Home Screen

        if (!cardElement) {
            alert("يرجى العودة للصفحة الرئيسية (هويتي) لتصوير الكارت.");
            return;
        }

        // 1. Hide Modal temporarily to reveal the card
        modal.classList.add('hidden');
        
        // 2. Play Sound (Camera Shutter)
        SoundManager.play('success'); 
        
        // 3. Wait 300ms for UI transition, then snap
        setTimeout(async () => {
            try {
                // Generate filename with timestamp
                const filename = `noub-cv-${Date.now()}.png`;
                await CVGenerator.downloadCV('my-player-card', filename);
                
                // 4. Show Modal again
                modal.classList.remove('hidden');
            } catch (e) {
                console.error("CV Gen Error:", e);
                alert("فشل التصوير. تأكد من إعدادات المتصفح.");
                modal.classList.remove('hidden');
            }
        }, 300);
    }

    /**
     * ACTION: Secure Logout
     */
    async handleLogout() {
        if(!confirm("هل أنت متأكد من تسجيل الخروج؟")) return;
        
        try {
            await this.authService.logout();
        } catch(e) {
            // Fallback: Force clear local storage if service fails
            localStorage.clear();
            window.location.reload();
        }
    }
}
