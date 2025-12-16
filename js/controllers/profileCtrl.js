/*
 * Filename: js/controllers/profileCtrl.js
 * Version: 5.0.0 (MASTER CONTROL)
 * Description: Controller for User Profile Management.
 * 
 * CAPABILITIES:
 * 1. Visual Editor: Opens a modal to modify the Player Card's Visual DNA (Skin/Kit).
 * 2. Persistence: Updates the 'cards' table in Supabase.
 * 3. Session Management: Handles secure Logout.
 */

import { state } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { AvatarEngine } from '../utils/avatarEngine.js';
import { SoundManager } from '../utils/soundManager.js';
import { AuthService } from '../services/authService.js';

export class ProfileController {
    
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        
        // Internal state for the editor
        this.tempVisual = { skin: 1, kit: 1 };
    }

    /**
     * OPENS THE VISUAL EDITOR MODAL
     * Called when user clicks "Edit Appearance" on Home Card.
     */
    openEditModal() {
        SoundManager.play('click');
        const user = state.getUser();
        if (!user) return;

        // 1. Initialize Temp State from current User Data
        if (user.visualDna) {
            this.tempVisual = typeof user.visualDna === 'string' ? JSON.parse(user.visualDna) : user.visualDna;
        }

        const modalId = 'modal-profile-edit';

        // 2. Build DOM if missing
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header">
                            <h3>غرفة الملابس</h3>
                            <button class="close-btn" id="btn-close-edit">&times;</button>
                        </div>
                        
                        <div id="editor-content">
                            <!-- Preview Area -->
                            <div class="avatar-studio" style="margin-bottom:20px;">
                                <div class="avatar-preview" id="edit-avatar-display" style="height:180px;">
                                    <!-- Dynamic Injection -->
                                </div>
                            </div>

                            <!-- Controls -->
                            <div class="avatar-controls">
                                <div class="control-row">
                                    <label>لون البشرة</label>
                                    <div class="selector">
                                        <button class="btn-control" id="edit-skin-prev">❮</button>
                                        <span id="edit-lbl-skin" class="font-num">${this.tempVisual.skin}</span>
                                        <button class="btn-control" id="edit-skin-next">❯</button>
                                    </div>
                                </div>
                                <div class="control-row">
                                    <label>طقم الفريق</label>
                                    <div class="selector">
                                        <button class="btn-control" id="edit-kit-prev">❮</button>
                                        <span id="edit-lbl-kit" class="font-num">${this.tempVisual.kit}</span>
                                        <button class="btn-control" id="edit-kit-next">❯</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Actions -->
                            <button id="btn-save-look" class="btn-primary" style="margin-top:25px;">
                                <i class="fa-solid fa-floppy-disk"></i> حفظ التعديلات
                            </button>
                            
                            <button id="btn-logout" class="btn-action-secondary" style="width:100%; margin-top:10px; justify-content:center; color:var(--danger); border-color:var(--danger);">
                                <i class="fa-solid fa-right-from-bracket"></i> تسجيل خروج
                            </button>
                        </div>
                    </div>
                </div>
            `);

            // Bind Close Event
            document.getElementById('btn-close-edit').addEventListener('click', () => {
                document.getElementById(modalId).classList.add('hidden');
            });
        }

        // 3. Show Modal
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        // 4. Initial Render of Preview
        this.updateEditorPreview(user.username);

        // 5. Bind Editor Controls (Scoped to Modal)
        this.bindEditorEvents(user.username);
    }

    /**
     * Binds events for the Editor Modal buttons.
     */
    bindEditorEvents(username) {
        // Unbind previous to avoid duplicates (clone node trick or direct assignment)
        // Here we use direct onclick for simplicity in modal context
        
        const update = (type, dir) => {
            SoundManager.play('click');
            let val = this.tempVisual[type] + dir;
            if (val > 3) val = 1; // Max limit hardcoded for MVP
            if (val < 1) val = 3;
            this.tempVisual[type] = val;
            
            // Update Label
            document.getElementById(`edit-lbl-${type}`).textContent = val;
            // Update Visual
            this.updateEditorPreview(username);
        };

        document.getElementById('edit-skin-prev').onclick = () => update('skin', -1);
        document.getElementById('edit-skin-next').onclick = () => update('skin', 1);
        document.getElementById('edit-kit-prev').onclick = () => update('kit', -1);
        document.getElementById('edit-kit-next').onclick = () => update('kit', 1);

        // Save Button
        document.getElementById('btn-save-look').onclick = () => this.handleSave();

        // Logout Button
        document.getElementById('btn-logout').onclick = () => this.handleLogout();
    }

    /**
     * Renders the avatar inside the modal using the static Engine.
     */
    updateEditorPreview(username) {
        const container = document.getElementById('edit-avatar-display');
        const html = AvatarEngine.generateAvatarHTML(this.tempVisual, username);
        container.innerHTML = html;
    }

    /**
     * LOGIC: Save changes to Database.
     */
    async handleSave() {
        const btn = document.getElementById('btn-save-look');
        btn.disabled = true;
        btn.textContent = "جاري الحفظ...";

        try {
            const user = state.getUser();
            
            // Update 'cards' table
            const { error } = await supabase
                .from('cards')
                .update({ visual_dna: this.tempVisual })
                .eq('owner_id', user.id)
                .eq('type', 'GENESIS'); // Only update main card

            if (error) throw error;

            // Update Local State
            user.visualDna = this.tempVisual;
            state.setUser(user);

            SoundManager.play('success');
            alert("تم تحديث مظهرك بنجاح!");
            
            // Close Modal & Reload App to reflect changes everywhere
            window.location.reload();

        } catch (err) {
            console.error(err);
            SoundManager.play('error');
            alert("فشل الحفظ: " + err.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديلات';
        }
    }

    /**
     * LOGIC: Logout
     */
    async handleLogout() {
        if(!confirm("هل أنت متأكد من تسجيل الخروج؟")) return;
        await this.authService.logout();
    }
}
