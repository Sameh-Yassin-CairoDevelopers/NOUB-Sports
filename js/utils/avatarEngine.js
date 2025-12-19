/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/avatarEngine.js
 * Version: Noub Sports_beta 0.0.5 (ROYAL UPDATE)
 * Status: Production Ready
 * 
 * DESCRIPTION:
 * The Core Visual Generation Engine.
 * Responsible for composing the SVG-based Avatar layers based on DNA.
 * 
 * ARCHITECTURE (System of Layers):
 * [Layer 1]: Body/Skin (Base) - Z-Index 1
 * [Layer 2]: Kit/Shirt (Torso) - Z-Index 2 (Sits ON TOP of body)
 * [Layer 3]: Accessories (Headgear) - Z-Index 4 (Sits ON TOP of head)
 * [Layer 4]: Branding (Name on Shirt) - Z-Index 5
 */

// ==========================================
// 1. CONFIGURATION CONSTANTS
// ==========================================

const AVATAR_CONFIG = {
    // Skin Tones (Light -> Dark)
    SKINS: [
        '#F5C6A5', // 1. Light
        '#E0AC69', // 2. Medium
        '#C68642', // 3. Tan
        '#8D5524', // 4. Dark
        '#523115'  // 5. Deep
    ],
    
    // Kit Colors (Teams)
    KITS: [
        '#EF4444', // 1. Red (Fustat)
        '#10B981', // 2. Green (Maadi)
        '#3B82F6', // 3. Blue
        '#F59E0B', // 4. Gold
        '#111111'  // 5. Black
    ],

    // Accessories (Headgear/Hair)
    // Mapping FontAwesome Classes.
    ACCESSORIES: [
        null,                  // 1. Bald/None
        'fa-hat-cowboy',       // 2. Cap
        'fa-crown',            // 3. King
        'fa-helmet-safety',    // 4. Defender
        'fa-graduation-cap'    // 5. Academy
    ]
};

export class AvatarEngine {

    /**
     * Constructor: Initializes state.
     * Looks for a default display element if available (for Onboarding).
     */
    constructor() {
        // Default State
        this.state = { 
            skin: 1, 
            kit: 1, 
            hair: 1 
        };

        // Cache DOM if running in Onboarding
        this.displayElement = document.getElementById('auth-avatar-display');
    }

    /**
     * State Modifier: Cycles through available options.
     * @param {string} type - 'skin', 'kit', or 'hair'.
     * @param {number} dir - Direction (+1 or -1).
     */
    change(type, dir) {
        let max;
        
        // Determine Max based on Config Arrays
        if (type === 'skin') max = AVATAR_CONFIG.SKINS.length;
        else if (type === 'kit') max = AVATAR_CONFIG.KITS.length;
        else if (type === 'hair') max = AVATAR_CONFIG.ACCESSORIES.length;
        else return;

        let val = this.state[type] + dir;
        
        // Circular Logic
        if (val > max) val = 1;
        if (val < 1) val = max;
        
        this.state[type] = val;
        
        // Update UI Label (if exists)
        const lbl = document.getElementById(`lbl-${type}`);
        if(lbl) lbl.textContent = val;

        // Trigger Render (Only for Onboarding Preview)
        this.renderPreview(); 
    }

    /**
     * Export Config: Returns the JSON string for DB storage.
     */
    getConfig() {
        return JSON.stringify(this.state);
    }

    /**
     * Internal Preview Render (Simple injection for Onboarding).
     */
    renderPreview() {
        if (!this.displayElement) {
            this.displayElement = document.getElementById('auth-avatar-display');
        }
        if (!this.displayElement) return;

        // Use the Static Generator to inject the full HTML into the preview box
        const html = AvatarEngine.generateAvatarHTML(this.state, 'PREVIEW');
        
        // Replace content
        if(this.displayElement.parentElement) {
            this.displayElement.parentElement.innerHTML = html;
            // Re-bind to the new element created
            this.displayElement = document.querySelector('.avatar-comp');
        }
    }

    /**
     * STATIC GENERATOR: The Core Renderer.
     * Creates the complex HTML string for the avatar.
     * 
     * FIX APPLIED: Adjusted 'bottom' pixels to fix proportions.
     * 
     * @param {Object} visualDna - { skin: int, kit: int, hair: int }
     * @param {string} shirtName - Text to print on shirt.
     * @returns {string} HTML String.
     */
    static generateAvatarHTML(visualDna, shirtName) {
        // 1. Safe Parsing
        const dna = (typeof visualDna === 'string') ? JSON.parse(visualDna) : (visualDna || {skin:1, kit:1, hair:1});
        
        // 2. Resolve Attributes
        const skinColor = AVATAR_CONFIG.SKINS[(dna.skin || 1) - 1] || AVATAR_CONFIG.SKINS[0];
        const kitColor  = AVATAR_CONFIG.KITS[(dna.kit || 1) - 1] || AVATAR_CONFIG.KITS[0];
        const accessoryIcon = AVATAR_CONFIG.ACCESSORIES[(dna.hair || 1) - 1];

        // 3. Construct HTML Layer by Layer
        return `
            <div class="avatar-comp" style="position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
                
                <!-- LAYER 1: The Body (Skin) -->
                <!-- Raised to 75px to show neck above shirt line -->
                <i class="fa-solid fa-user" style="
                    font-size: 110px; 
                    color: ${skinColor}; 
                    position: absolute; 
                    bottom: 75px; 
                    z-index: 1;
                    filter: drop-shadow(0 5px 5px rgba(0,0,0,0.5));
                "></i>

                <!-- LAYER 2: The Shirt (Kit) -->
                <!-- Increased size to 160px to cover shoulders -->
                <i class="fa-solid fa-shirt" style="
                    font-size: 160px; 
                    color: ${kitColor}; 
                    position: absolute; 
                    bottom: -20px;
                    z-index: 2;
                    filter: drop-shadow(0 0 10px rgba(0,0,0,0.8));
                "></i>

                <!-- LAYER 3: The Accessory (Hair/Cap) -->
                <!-- Raised to 155px to sit on top of the raised head -->
                ${accessoryIcon ? `
                <i class="fa-solid ${accessoryIcon}" style="
                    font-size: 60px;
                    color: ${kitColor}; /* Matches Kit Color */
                    position: absolute;
                    bottom: 155px; 
                    z-index: 4;
                    filter: drop-shadow(0 4px 4px rgba(0,0,0,0.6));
                "></i>
                ` : ''}

                <!-- LAYER 4: Name on Shirt (Branding) -->
                <div class="shirt-text" style="
                    position: absolute; 
                    bottom: 50px; 
                    z-index: 5;
                    color: rgba(255,255,255,0.9); 
                    font-family: 'Orbitron'; 
                    font-size: 13px; 
                    font-weight: 900;
                    text-transform: uppercase;
                    text-shadow: 0 1px 2px #000;
                    letter-spacing: 1px;
                    pointer-events: none;
                ">
                    ${shirtName || 'NOUB'}
                </div>
            </div>
        `;
    }
}
