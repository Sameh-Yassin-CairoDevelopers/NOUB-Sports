/*
 * Filename: js/utils/avatarEngine.js
 * Version: 5.0.0 (Layered System)
 * Description: Generates the Visual Representation of the Player.
 * Logic: Stacks SVGs/Divs to create a composed character.
 * Feature: Renders 'Name on Shirt' dynamically.
 */

import { GAME_CONFIG } from '../config/constants.js';

export class AvatarEngine {
    constructor() {
        this.state = { skin: 1, kit: 1 };
        // We bind to the specific display element dynamically usually,
        // but for onboarding we grab the ID directly.
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
        
        // Update Label
        const lbl = document.getElementById(`lbl-${type}`);
        if(lbl) lbl.textContent = val;

        // Render Preview
        this.renderPreview();
    }

    getConfig() {
        return JSON.stringify(this.state);
    }

    /**
     * Renders the preview in the Onboarding screen.
     */
    renderPreview() {
        if (!this.displayElement) {
            this.displayElement = document.getElementById('auth-avatar-display');
        }
        if (!this.displayElement) return;

        // Apply Layered Styles
        // 1. Skin Color
        const skinColors = ['#F5C6A5', '#C68642', '#8D5524'];
        this.displayElement.style.color = skinColors[this.state.skin - 1] || skinColors[0];

        // 2. Kit Style (Simulated by Border/Shadow)
        const kitColors = ['#EF4444', '#10B981', '#3B82F6'];
        const kitColor = kitColors[this.state.kit - 1] || kitColors[0];
        
        // Visual Hack: Using Drop-Shadow to simulate a Shirt body behind the icon
        this.displayElement.style.filter = `drop-shadow(0 20px 0px ${kitColor})`;
        
        // (In a real SVG implementation, we would swap the <image> src)
    }

    /**
     * Static Helper: Generates the HTML string for a full card avatar.
     * Used by HomeCtrl, ScoutCtrl, etc.
     * Adds the "Name on Shirt" effect.
     * 
     * @param {Object} visualDna - {skin, kit}
     * @param {string} shirtName - Name to print on kit
     */
    static generateAvatarHTML(visualDna, shirtName) {
        // Parse if string
        const dna = (typeof visualDna === 'string') ? JSON.parse(visualDna) : (visualDna || {skin:1, kit:1});
        
        const skinColors = ['#F5C6A5', '#C68642', '#8D5524'];
        const kitColors = ['#EF4444', '#10B981', '#3B82F6']; // Red, Green, Blue
        
        const skin = skinColors[(dna.skin || 1) - 1];
        const kit = kitColors[(dna.kit || 1) - 1];

        // Complex HTML Composition
        return `
            <div class="avatar-comp" style="position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
                
                <!-- 1. Body/Kit Layer -->
                <i class="fa-solid fa-shirt" style="
                    font-size: 140px; 
                    color: ${kit}; 
                    filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5));
                    position: absolute; bottom: -20px;
                "></i>

                <!-- 2. Head Layer -->
                <i class="fa-solid fa-user" style="
                    font-size: 90px; 
                    color: ${skin}; 
                    position: absolute; bottom: 85px;
                    text-shadow: 0 2px 5px rgba(0,0,0,0.3);
                "></i>

                <!-- 3. Name on Shirt (The Viral Feature) -->
                <div class="shirt-text" style="
                    position: absolute; 
                    bottom: 40px; 
                    color: rgba(255,255,255,0.7); 
                    font-family: 'Orbitron'; 
                    font-size: 12px; 
                    font-weight: bold;
                    text-transform: uppercase;
                ">
                    ${shirtName || 'NOUB'}
                </div>
            </div>
        `;
    }
}
