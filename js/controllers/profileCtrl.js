/*
 * Filename: js/controllers/profileCtrl.js
 * Version: Noub Sports_beta 0.0.4 (EDIT FIX)
 * Description: Controller for Profile Management (Locker Room).
 * UPDATE: Added Hair Controls & Fixed Save Logic.
 */

/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/profileCtrl.js
 * Version: 6.0.0 (MASTER PROFILE CONTROL)
 * Status: Production Ready
 * 
 * ARCHITECTURAL OVERVIEW:
 * This controller manages the User's Personal Settings and Visual Identity.
 * It operates via a Modal (Overlay) to keep the user context within the Home View.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Visual Editor: Provides UI to modify Avatar DNA (Skin, Kit, Hair).
 * 2. State Management: Uses a temporary state pattern to allow previewing before saving.
 * 3. Persistence: Commits changes to Supabase 'cards' table and updates Global State.
 * 4. Session Termination: Handles secure Logout via AuthService.
 */

import { state } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { AvatarEngine } from '../utils/avatarEngine.js';
import { SoundManager } from '../utils/soundManager.js';
import { AuthService } from '../services/authService.js';

export class ProfileController {
    
    /**
     * Constructor: Initializes dependencies.
     */
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        // Internal State: Temporary storage for visual changes before saving
        // Default structure matches AvatarEngine schema
        this.tempVisual = { skin: 1, kit: 1, hair: 1 };
    }

    /**
     * Opens the "Dressing Room" Modal.
     * Lazy-loads the DOM elements if they don't exist.
     */
    openEditModal() {
        SoundManager.play('click');
        
        const user = state.getUser();
        if (!user) return;

        // 1. Hydrate Temp State from Current User Data
        if (user.visualDna) {
            this.tempVisual = typeof user.visualDna === 'string' ? JSON.parse(user.visualDna) : user.visualDna;
        }

        const modalId = 'modal-profile-edit';

        // 2. Build Modal DOM (Singleton Pattern for DOM)
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header">
                            <h3>غرفة الملابس</h3>
                            <button class="close-btn" id="btn-close-edit">&times;</button>
                        </div>
                        
                        <div id="editor-content">
                            <!-- A. Visual Preview -->
                            <div class="avatar-studio" style="margin-bottom:20px; background:#111; border:1px solid #333;">
                                <div class="avatar-preview" id="edit-avatar-display" style="height:200px; border-bottom:none;">
                                    <!-- Dynamic Avatar Injection -->
                                </div>
                            </div>

                            <!-- B. Visual Controls -->
                            <div class="avatar-controls">
                                <!-- Skin -->
                                <div class="control-row">
                                    <label>لون البشرة</label>
                                    <div class="selector">
                                        <button class="btn-control" id="edit-skin-prev">❮</button>
                                        <span id="edit-lbl-skin" class="font-num">${this.tempVisual.skin || 1}</span>
                                        <button class="btn-control" id="edit-skin-next">❯</button>
                                    </div>
                                </div>
                                <!-- Kit -->
                                <div class="control-row">
                                    <label>طقم الفريق</label>
                                    <div class="selector">
                                        <button class="btn-control" id="edit-kit-prev">❮</button>
                                        <span id="edit-lbl-kit" class="font-num">${this.tempVisual.kit || 1}</span>
                                        <button class="btn-control" id="edit-kit-next">❯</button>
                                    </div>
                                </div>
                                <!-- Hair/Headgear -->
                                <div class="control-row">
                                    <label>الرأس / الشعر</label>
                                    <div class="selector">
                                        <button class="btn-control" id="edit-hair-prev">❮</button>
                                        <span id="edit-lbl-hair" class="font-num">${this.tempVisual.hair || 1}</span>
                                        <button class="btn-control" id="edit-hair-next">❯</button>
                                    </div>
                                </div>
                            </div>

                            <!-- C. Actions -->
                            <button id="btn-save-look" class="btn-primary" style="margin-top:25px;">
                                <i class="fa-solid fa-floppy-disk"></i> حفظ المظهر الجديد
                            </button>
                            
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

        // 3. Show Modal
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        // 4. Initial Render
        this.updateEditorPreview(user.username);

        // 5. Bind Events (Re-bound every open to ensure state freshness)
        this.bindEditorEvents(user.username);
    }

    /**
     * Binds click events for the Editor controls.
     * Uses a closure to manage state updates.
     */
    bindEditorEvents(username) {
        // Helper to update state and UI
        const updateState = (type, dir) => {
            SoundManager.play('click');
            
            // Hardcoded limits (Sync with AvatarEngine Config if possible)
            const maxMap = { skin: 5, kit: 5, hair: 5 }; 
            const max = maxMap[type] || 3;

            let val = (this.tempVisual[type] || 1) + dir;
            if (val > max) val = 1;
            if (val < 1) val = max;
            
            this.tempVisual[type] = val;
            
            // Update Label
            const lbl = document.getElementById(`edit-lbl-${type}`);
            if(lbl) lbl.textContent = val;

            // Render
            this.updateEditorPreview(username);
        };

        // DOM Elements
        const get = (id) => document.getElementById(id);

        // Bind Arrows (Overwriting 'onclick' to prevent duplicate listeners)
        get('edit-skin-prev').onclick = () => updateState('skin', -1);
        get('edit-skin-next').onclick = () => updateState('skin', 1);
        
        get('edit-kit-prev').onclick = () => updateState('kit', -1);
        get('edit-kit-next').onclick = () => updateState('kit', 1);
        
        get('edit-hair-prev').onclick = () => updateState('hair', -1);
        get('edit-hair-next').onclick = () => updateState('hair', 1);

        // Bind Actions
        get('btn-save-look').onclick = () => this.handleSave();
        get('btn-logout').onclick = () => this.handleLogout();
    }

    /**
     * Renders the avatar HTML inside the modal.
     */
    updateEditorPreview(username) {
        const container = document.getElementById('edit-avatar-display');
        // Use the Static Generator for consistent visuals
        container.innerHTML = AvatarEngine.generateAvatarHTML(this.tempVisual, username);
    }

    /**
     * TRANSACTION: Save Changes
     * Updates DB and Local State, then reloads app.
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

            // 2. Update Local State (Optimistic UI)
            user.visualDna = this.tempVisual;
            state.setUser(user);

            SoundManager.play('success');
            
            // 3. Force Reload to reflect changes across all views (Home, Scout, Team)
            window.location.reload();

        } catch (err) {
            console.error(err);
            SoundManager.play('error');
            alert("فشل الحفظ: " + err.message);
            btn.disabled = false;
            btn.textContent = "حفظ التعديلات";
        }
    }

    /**
     * ACTION: Logout
     */
    async handleLogout() {
        if(!confirm("هل أنت متأكد من تسجيل الخروج؟")) return;
        
        try {
            await this.authService.logout();
        } catch(e) {
            // Force reload even if service fails
            window.location.reload();
        }
    }
}

