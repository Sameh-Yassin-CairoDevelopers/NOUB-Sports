/*
 * Filename: js/controllers/profileCtrl.js
 * Version: Noub Sports_beta 0.0.4 (EDIT FIX)
 * Description: Controller for Profile Management (Locker Room).
 * UPDATE: Added Hair Controls & Fixed Save Logic.
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
        this.tempVisual = { skin: 1, kit: 1, hair: 1 };
    }

    openEditModal() {
        SoundManager.play('click');
        const user = state.getUser();
        if (!user) return;

        // Init Temp State
        if (user.visualDna) {
            this.tempVisual = typeof user.visualDna === 'string' ? JSON.parse(user.visualDna) : user.visualDna;
        }

        const modalId = 'modal-profile-edit';
        if (!document.getElementById(modalId)) {
            // Build Modal HTML
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${modalId}" class="modal-overlay hidden">
                    <div class="modal-box">
                        <div class="modal-header">
                            <h3>غرفة الملابس</h3>
                            <button class="close-btn" id="btn-close-edit">&times;</button>
                        </div>
                        
                        <div id="editor-content">
                            <!-- Preview -->
                            <div class="avatar-studio" style="margin-bottom:20px;">
                                <div class="avatar-preview" id="edit-avatar-display" style="height:200px;"></div>
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
                                <div class="control-row">
                                    <label>الرأس / الشعر</label>
                                    <div class="selector">
                                        <button class="btn-control" id="edit-hair-prev">❮</button>
                                        <span id="edit-lbl-hair" class="font-num">${this.tempVisual.hair || 1}</span>
                                        <button class="btn-control" id="edit-hair-next">❯</button>
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

            // Close Bind
            document.getElementById('btn-close-edit').onclick = () => document.getElementById(modalId).classList.add('hidden');
        }

        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        this.updateEditorPreview(user.username);
        this.bindEditorEvents(user.username);
    }

    bindEditorEvents(username) {
        const update = (type, dir) => {
            SoundManager.play('click');
            let val = (this.tempVisual[type] || 1) + dir;
            // Hardcoded limits for MVP (Sync with Constants in future)
            const max = type === 'hair' ? 5 : 3; 
            if (val > max) val = 1;
            if (val < 1) val = max;
            this.tempVisual[type] = val;
            
            document.getElementById(`edit-lbl-${type}`).textContent = val;
            this.updateEditorPreview(username);
        };

        // Unbind/Rebind properly
        const getEl = (id) => document.getElementById(id);
        
        getEl('edit-skin-prev').onclick = () => update('skin', -1);
        getEl('edit-skin-next').onclick = () => update('skin', 1);
        
        getEl('edit-kit-prev').onclick = () => update('kit', -1);
        getEl('edit-kit-next').onclick = () => update('kit', 1);
        
        getEl('edit-hair-prev').onclick = () => update('hair', -1);
        getEl('edit-hair-next').onclick = () => update('hair', 1);

        getEl('btn-save-look').onclick = () => this.handleSave();
        getEl('btn-logout').onclick = () => this.handleLogout();
    }

    updateEditorPreview(username) {
        const container = document.getElementById('edit-avatar-display');
        container.innerHTML = AvatarEngine.generateAvatarHTML(this.tempVisual, username);
    }

    async handleSave() {
        const btn = document.getElementById('btn-save-look');
        btn.disabled = true;
        btn.textContent = "جاري الحفظ...";

        try {
            const user = state.getUser();
            
            // 1. Update DB
            const { error } = await supabase
                .from('cards')
                .update({ visual_dna: this.tempVisual })
                .eq('owner_id', user.id)
                .eq('type', 'GENESIS');

            if (error) throw error;

            // 2. Update Local State
            user.visualDna = this.tempVisual;
            state.setUser(user);

            SoundManager.play('success');
            
            // 3. RELOAD to refresh all views (Cards, Avatars everywhere)
            window.location.reload();

        } catch (err) {
            SoundManager.play('error');
            alert("فشل الحفظ: " + err.message);
            btn.disabled = false;
            btn.textContent = "حفظ التعديلات";
        }
    }

    async handleLogout() {
        if(!confirm("خروج؟")) return;
        await this.authService.logout();
    }
}
