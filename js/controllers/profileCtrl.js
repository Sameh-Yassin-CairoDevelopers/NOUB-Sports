/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/profileCtrl.js
 * Version: Noub Sports_beta 0.0.5 (PLATINUM EDITION)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL RESPONSIBILITIES:
 * -----------------------------------------------------------------------------
 * 1. Visual Customization: Manages the "Dressing Room" modal logic.
 *    Allows modification of Avatar DNA (Skin, Kit, Hair/Accessories).
 * 2. Persistence Layer: Commits visual changes to Supabase and updates Local State.
 * 3. Export Engine: Triggers the generation of the "Scout CV" image via CVGenerator.
 * 4. Session Control: Handles secure user logout.
 * -----------------------------------------------------------------------------
 */

import { state } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { AvatarEngine } from '../utils/avatarEngine.js';
import { SoundManager } from '../utils/soundManager.js';
import { AuthService } from '../services/authService.js';
import { CVGenerator } from '../utils/cvGenerator.js'; // Specialized Generator

export class ProfileController {
    
    /**
     * Constructor: Initialize Dependencies & Temp State.
     */
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        // Temporary state to hold changes before saving
        // Default structure matches AvatarEngine schema
        this.tempVisual = { skin: 1, kit: 1, hair: 1 };
    }

    /**
     * Entry Point: Opens the "Edit Profile" Modal.
     * Lazy-loads the DOM elements if not present.
     */
    openEditModal() {
        SoundManager.play('click');
        
        const user = state.getUser();
        if (!user) return;

        // 1. Hydrate Temp State from Current User Data
        // Parse JSON if it's stored as string, otherwise use object directly
        if (user.visualDna) {
            this.tempVisual = typeof user.visualDna === 'string' ? JSON.parse(user.visualDna) : user.visualDna;
        }

        const modalId = 'modal-profile-edit';

        // 2. Build Modal DOM if missing (Singleton Pattern for DOM)
        if (!document.getElementById(modalId)) {
            this.buildModalDOM(modalId);
        }

        // 3. Show Modal
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        // 4. Initial Render of Preview
        this.updateEditorPreview(user.username);

        // 5. Bind Events (Re-bind every open to ensure state freshness)
        this.bindEditorEvents(user.username);
    }

    /**
     * Helper: Injects the Modal HTML structure into the body.
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
                                <!-- Dynamic Avatar Injection -->
                            </div>
                        </div>

                        <!-- B. Visual Controls -->
                        <div class="avatar-controls">
                            <!-- Skin Tone -->
                            <div class="control-row">
                                <label>لون البشرة</label>
                                <div class="selector">
                                    <button class="btn-control" id="edit-skin-prev">❮</button>
                                    <span id="edit-lbl-skin" class="font-num">${this.tempVisual.skin || 1}</span>
                                    <button class="btn-control" id="edit-skin-next">❯</button>
                                </div>
                            </div>
                            <!-- Kit Color -->
                            <div class="control-row">
                                <label>طقم الفريق</label>
                                <div class="selector">
                                    <button class="btn-control" id="edit-kit-prev">❮</button>
                                    <span id="edit-lbl-kit" class="font-num">${this.tempVisual.kit || 1}</span>
                                    <button class="btn-control" id="edit-kit-next">❯</button>
                                </div>
                            </div>
                            <!-- Hair / Accessories -->
                            <div class="control-row">
                                <label>الرأس / الشعر</label>
                                <div class="selector">
                                    <button class="btn-control" id="edit-hair-prev">❮</button>
                                    <span id="edit-lbl-hair" class="font-num">${this.tempVisual.hair || 1}</span>
                                    <button class="btn-control" id="edit-hair-next">❯</button>
                                </div>
                            </div>
                        </div>

                        <!-- C. Actions Row -->
                        <div style="display:flex; gap:10px; margin-top:25px;">
                            <button id="btn-save-look" class="btn-primary" style="margin-top:0; flex:2;">
                                <i class="fa-solid fa-floppy-disk"></i> حفظ
                            </button>
                            <button id="btn-download-cv" class="btn-action-secondary" style="flex:1; border-color:var(--gold-main); color:var(--gold-main); justify-content:center;">
                                <i class="fa-solid fa-camera"></i> صورة
                            </button>
                        </div>
                        
                        <!-- Logout -->
                        <button id="btn-logout" class="btn-action-secondary" style="width:100%; margin-top:15px; justify-content:center; color:var(--danger); border-color:var(--danger);">
                            <i class="fa-solid fa-right-from-bracket"></i> تسجيل خروج
                        </button>
                    </div>
                </div>
            </div>
        `);

        // Bind Close Button
        document.getElementById('btn-close-edit').addEventListener('click', () => {
            document.getElementById(modalId).classList.add('hidden');
        });
    }

    /**
     * Binds click events for Editor controls, Save, CV, and Logout.
     * Uses closures to manage state updates without global pollution.
     */
    bindEditorEvents(username) {
        // Helper to update state and UI
        const updateState = (type, dir) => {
            SoundManager.play('click');
            
            // Hardcoded limits (Should match AvatarEngine Config)
            const maxMap = { skin: 5, kit: 5, hair: 5 }; 
            const max = maxMap[type] || 3;

            let val = (this.tempVisual[type] || 1) + dir;
            // Circular rotation
            if (val > max) val = 1;
            if (val < 1) val = max;
            
            this.tempVisual[type] = val;
            
            // Update Label
            document.getElementById(`edit-lbl-${type}`).textContent = val;
            // Update Visual
            this.updateEditorPreview(username);
        };

        // DOM Element Getter
        const get = (id) => document.getElementById(id);

        // Bind Arrows (Overwriting 'onclick' prevents duplicate listeners)
        get('edit-skin-prev').onclick = () => updateState('skin', -1);
        get('edit-skin-next').onclick = () => updateState('skin', 1);
        
        get('edit-kit-prev').onclick = () => updateState('kit', -1);
        get('edit-kit-next').onclick = () => updateState('kit', 1);
        
        get('edit-hair-prev').onclick = () => updateState('hair', -1);
        get('edit-hair-next').onclick = () => updateState('hair', 1);

        // Bind Main Actions
        get('btn-save-look').onclick = () => this.handleSave();
        get('btn-logout').onclick = () => this.handleLogout();
        get('btn-download-cv').onclick = () => this.handleDownloadCV();
    }

    /**
     * Renders the avatar HTML inside the modal preview box.
     */
    updateEditorPreview(username) {
        const container = document.getElementById('edit-avatar-display');
        // Use the Static Generator for consistent visuals between Card and Editor
        container.innerHTML = AvatarEngine.generateAvatarHTML(this.tempVisual, username);
    }

    /**
     * TRANSACTION: Save Changes
     * Updates DB 'cards' table and Local State, then reloads.
     */
    async handleSave() {
        const btn = document.getElementById('btn-save-look');
        btn.disabled = true;
        btn.textContent = "جاري الحفظ...";

        try {
            const user = state.getUser();
            
            // 1. Update Database (Genesis Card Only)
            const { error } = await supabase
                .from('cards')
                .update({ visual_dna: this.tempVisual })
                .eq('owner_id', user.id)
                .eq('type', 'GENESIS');

            if (error) throw error;

            // 2. Update Local State (Optimistic UI update)
            user.visualDna = this.tempVisual;
            state.setUser(user);

            SoundManager.play('success');
            
            // 3. Force Reload to reflect changes across all views
            window.location.reload();

        } catch (err) {
            console.error(err);
            SoundManager.play('error');
            alert("فشل الحفظ: " + err.message);
            btn.disabled = false;
            btn.textContent = "حفظ";
        }
    }

    /**
     * LOGIC: Generate Scout CV Image
     * Hides the modal temporarily, snaps the Home Card, then re-shows modal.
     */
    async handleDownloadCV() {
        const modal = document.getElementById('modal-profile-edit');
        const cardElement = document.getElementById('my-player-card'); // Targeted on Home View

        if (!cardElement) {
            alert("يرجى العودة للصفحة الرئيسية لتصوير الكارت.");
            return;
        }

        // 1. Hide Modal temporarily to see the card clearly
        modal.classList.add('hidden');
        
        // 2. Play Sound (Camera Shutter)
        SoundManager.play('success'); 
        
        // 3. Wait 300ms for UI to clear animations, then snap
        setTimeout(async () => {
            try {
                // Generates a timestamped filename
                await CVGenerator.downloadCV('my-player-card', `noub-cv-${Date.now()}.png`);
                
                // 4. Show Modal again
                modal.classList.remove('hidden');
            } catch (e) {
                console.error("CV Gen Error:", e);
                alert("فشل التصوير. يرجى استخدام لقطة الشاشة العادية.");
                modal.classList.remove('hidden');
            }
        }, 500);
    }

    /**
     * ACTION: Logout
     */
    async handleLogout() {
        if(!confirm("هل أنت متأكد من تسجيل الخروج؟")) return;
        
        try {
            await this.authService.logout();
        } catch(e) {
            // Force reload even if service fails to clear local cache
            localStorage.clear();
            window.location.reload();
        }
    }
}
