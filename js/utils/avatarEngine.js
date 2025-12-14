/*
 * Filename: js/utils/avatarEngine.js
 * Version: 5.1.0 (Fix: Layering Order)
 * Description: Generates the Visual Representation.
 * FIX: Reordered layers so Shirt sits ON TOP of Body.
 */

import { GAME_CONFIG } from '../config/constants.js';

export class AvatarEngine {
    constructor() {
        this.state = { skin: 1, kit: 1 };
        this.displayElement = document.getElementById('auth-avatar-display');
    }

    /**
     * Changes an attribute state.
     */
    change(type, dir) {
        const limit = GAME_CONFIG.AVATAR_LIMITS[type.toUpperCase()] || 3;
        let val = this.state[type] + dir;
        
        if (val > limit) val = 1;
        if (val < 1) val = limit;
        
        this.state[type] = val;
        
        const lbl = document.getElementById(`lbl-${type}`);
        if(lbl) lbl.textContent = val;

        this.renderPreview();
    }

    getConfig() {
        return JSON.stringify(this.state);
    }

    /**
     * Renders preview in Auth Screen (Simplified)
     */
    renderPreview() {
        if (!this.displayElement) {
            this.displayElement = document.getElementById('auth-avatar-display');
        }
        if (!this.displayElement) return;

        const skinColors = ['#F5C6A5', '#C68642', '#8D5524'];
        this.displayElement.style.color = skinColors[this.state.skin - 1] || skinColors[0];

        const kitColors = ['#EF4444', '#10B981', '#3B82F6'];
        const kitColor = kitColors[this.state.kit - 1] || kitColors[0];
        
        // Use drop-shadow to simulate shirt behind/around
        this.displayElement.style.filter = `drop-shadow(0 0 10px ${kitColor})`;
    }

    /**
     * Static Helper: Generates the HTML string for a full card avatar.
     * FIX: Z-Index and Order swapped.
     */
    static generateAvatarHTML(visualDna, shirtName) {
        const dna = (typeof visualDna === 'string') ? JSON.parse(visualDna) : (visualDna || {skin:1, kit:1});
        
        const skinColors = ['#F5C6A5', '#C68642', '#8D5524'];
        const kitColors = ['#EF4444', '#10B981', '#3B82F6'];
        
        const skin = skinColors[(dna.skin || 1) - 1];
        const kit = kitColors[(dna.kit || 1) - 1];

        // Layering Logic:
        // 1. Head/Body (Bottom Layer) - z-index: 1
        // 2. Shirt (Top Layer) - z-index: 2
        // 3. Text (Overlay) - z-index: 3
        
        return `
            <div class="avatar-comp" style="position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
                
                <!-- LAYER 1: The Body (Skin) -->
                <i class="fa-solid fa-user" style="
                    font-size: 110px; 
                    color: ${skin}; 
                    position: absolute; 
                    bottom: 40px; /* Adjusted to fit under shirt */
                    z-index: 1;
                    filter: drop-shadow(0 5px 5px rgba(0,0,0,0.5));
                "></i>

                <!-- LAYER 2: The Shirt (Kit) -->
                <!-- Using fa-shirt which is usually broader -->
                <i class="fa-solid fa-shirt" style="
                    font-size: 130px; 
                    color: ${kit}; 
                    position: absolute; 
                    bottom: -20px;
                    z-index: 2;
                    filter: drop-shadow(0 0 5px rgba(0,0,0,0.8));
                "></i>

                <!-- LAYER 3: Name on Shirt -->
                <div class="shirt-text" style="
                    position: absolute; 
                    bottom: 40px; 
                    z-index: 3;
                    color: rgba(255,255,255,0.8); 
                    font-family: 'Orbitron'; 
                    font-size: 14px; 
                    font-weight: bold;
                    text-transform: uppercase;
                    text-shadow: 0 1px 2px #000;
                ">
                    ${shirtName || 'NOUB'}
                </div>
            </div>
        `;
    }
}
