/*
 * Filename: js/utils/avatarEngine.js
 * Description: Logic to handle Avatar customization and preview rendering.
 */

import { GAME_CONFIG } from '../config/constants.js';

export class AvatarEngine {
    constructor() {
        this.state = { skin: 1, kit: 1 };
        this.displayElement = document.getElementById('auth-avatar-display');
    }

    /**
     * Updates avatar attribute
     * @param {string} type - 'skin' or 'kit'
     * @param {number} dir - +1 or -1
     */
    change(type, dir) {
        const limit = GAME_CONFIG.AVATAR_LIMITS[type.toUpperCase()] || 3;
        let val = this.state[type] + dir;
        
        if (val > limit) val = 1;
        if (val < 1) val = limit;
        
        this.state[type] = val;
        this.render();
        
        // Update Label
        const lbl = document.getElementById(`lbl-${type}`);
        if(lbl) lbl.textContent = val;
    }

    /**
     * Returns current config for Minting
     */
    getConfig() {
        return JSON.stringify(this.state);
    }

    /**
     * Updates the visual DOM (Simulation for Day 1)
     */
    render() {
        if (!this.displayElement) return;
        
        // Simulating visual changes with CSS filters/colors
        if (this.state.skin === 1) this.displayElement.style.color = '#F5C6A5'; // Light
        if (this.state.skin === 2) this.displayElement.style.color = '#C68642'; // Tan
        if (this.state.skin === 3) this.displayElement.style.color = '#8D5524'; // Dark

        if (this.state.kit === 1) this.displayElement.style.borderColor = '#EF4444'; // Red
        if (this.state.kit === 2) this.displayElement.style.borderColor = '#10B981'; // Green
        if (this.state.kit === 3) this.displayElement.style.borderColor = '#3B82F6'; // Blue
    }
}
