/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/avatarEngine.js
 * Version: Noub Sports_beta 5.0.0 (GEOMETRIC & VISUAL OVERHAUL)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ACADEMIC MODULE DESCRIPTION:
 * -----------------------------------------------------------------------------
 * The Core Rendering Engine for the Digital Identity Asset.
 * This class is responsible for composing the SVG/FontAwesome layers into a 
 * cohesive visual representation of the player.
 * 
 * ARCHITECTURAL CHANGES (V5.0):
 * 1. Layering System: Expanded from 3 to 5 layers (BG -> Body -> Kit -> Face -> Hair).
 * 2. Geometric Correction: Adjusted Scale Factors and Y-Axis offsets to ensure
 *    hats sit correctly on heads and heads sit correctly on shoulders.
 * 3. Standardization: 'Skin Tone' is now a fixed constant to allow for 
 *    richer customization in other areas (Face Accessories).
 * 
 * COORDINATE SYSTEM:
 * - Base Container: Relative Positioning.
 * - Layers: Absolute Positioning with bottom-up anchoring.
 * -----------------------------------------------------------------------------
 */

// ==========================================
// 1. ASSET CONFIGURATION LIBRARIES
// ==========================================

const AVATAR_CONFIG = {
    
    // STANDARD SKIN (Unified Identity)
    // A neutral, warm wheat tone that works with all kits.
    FIXED_SKIN: '#e0ac69', 

    // LAYER 1: BACKGROUNDS (The Atmosphere)
    // CSS Gradients to set the mood of the card.
    BACKGROUNDS: [
        'linear-gradient(180deg, #0f2e1d 0%, #000000 100%)', // 1. Royal Green (Default)
        'linear-gradient(180deg, #1a1a1a 0%, #000000 100%)', // 2. Midnight Black
        'linear-gradient(180deg, #2c3e50 0%, #000000 100%)', // 3. Deep Blue
        'linear-gradient(180deg, #4a0e0e 0%, #000000 100%)', // 4. Crimson Red
        'radial-gradient(circle, #444 0%, #000 100%)',       // 5. Spotlight
        'linear-gradient(45deg, #D4AF37 0%, #000 80%)'       // 6. Golden Luxury
    ],
    
    // LAYER 2: KIT COLORS (Team Identity)
    // Hex codes for shirts.
    KITS: [
        '#3b82f6', // 1. Blue (Primary)
        '#ef4444', // 2. Red
        '#10b981', // 3. Green
        '#f59e0b', // 4. Orange
        '#ffffff', // 5. White
        '#111111', // 6. Black
        '#8b5cf6', // 7. Purple
        '#D4AF37'  // 8. Gold
    ],

    // LAYER 3: FACE ACCESSORIES (Personality)
    // FontAwesome classes for face items.
    FACE_GEAR: [
        null,                  // 1. None
        'fa-glasses',          // 2. Hipster Glasses
        'fa-mask',             // 3. Hero Mask
        'fa-user-secret',      // 4. Spy/Agent
        'fa-head-side-mask',   // 5. Medical Mask
        'fa-eye-slash'         // 6. Pirate Patch
    ],

    // LAYER 4: HEADGEAR / HAIR (Style)
    // FontAwesome classes for head items.
    HEAD_GEAR: [
        null,                  // 1. Bald/Shaved
        'fa-hat-cowboy',       // 2. Cowboy
        'fa-crown',            // 3. King (Leader)
        'fa-helmet-safety',    // 4. Defender/Tank
        'fa-graduation-cap',   // 5. Academy
        'fa-hat-wizard',       // 6. Magician (Playmaker)
        'fa-user-astronaut'    // 7. Space Helmet
    ]
};

export class AvatarEngine {

    /**
     * Constructor: Initializes state container.
     * Used mainly when the engine needs to track state internally, 
     * though static generation is preferred for stateless rendering.
     */
    constructor() {
        // Default DNA Structure
        this.state = { 
            bg: 1, 
            kit: 1, 
            face: 1, 
            hair: 1 
        };
    }

    /**
     * STATIC GENERATOR: The Core Renderer.
     * Creates the complex HTML string for the avatar with corrected physics.
     * 
     * GEOMETRY FIXES APPLIED:
     * - Head Size: Increased to 130px (from 110px).
     * - Head Position: Lowered to bottom: 65px (Sits firmly on shoulders).
     * - Hat Size: Increased to 90px (from 60px).
     * - Hat Position: Lowered to bottom: 165px (Overlaps forehead).
     * 
     * @param {Object} visualDna - { bg: int, kit: int, face: int, hair: int }
     * @param {string} shirtName - Text to print on shirt.
     * @returns {string} HTML String.
     */
    static generateAvatarHTML(visualDna, shirtName) {
        // 1. Safe Parsing & Defaults
        const dna = (typeof visualDna === 'string') ? JSON.parse(visualDna) : (visualDna || {});
        
        // Resolve Indices (1-based to 0-based array)
        const bgStyle   = AVATAR_CONFIG.BACKGROUNDS[(dna.bg || 1) - 1] || AVATAR_CONFIG.BACKGROUNDS[0];
        const kitColor  = AVATAR_CONFIG.KITS[(dna.kit || 1) - 1] || AVATAR_CONFIG.KITS[0];
        const faceIcon  = AVATAR_CONFIG.FACE_GEAR[(dna.face || 1) - 1];
        const headIcon  = AVATAR_CONFIG.HEAD_GEAR[(dna.hair || 1) - 1];
        
        const skinColor = AVATAR_CONFIG.FIXED_SKIN;

        // 2. Construct HTML Layer by Layer (Z-Index Order)
        return `
            <div class="avatar-comp" style="
                position: relative; 
                width: 100%; 
                height: 100%; 
                display: flex; 
                justify-content: center; 
                align-items: flex-end;
                overflow: hidden;
                border-radius: 12px;
                background: ${bgStyle}; /* LAYER 0: Background */
            ">
                
                <!-- LAYER 1: The Body (Head & Neck) -->
                <!-- Scaled Up & Lowered for realism -->
                <i class="fa-solid fa-user" style="
                    font-size: 130px; 
                    color: ${skinColor}; 
                    position: absolute; 
                    bottom: 65px; 
                    z-index: 1;
                    filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5));
                "></i>

                <!-- LAYER 2: The Face Accessory (Glasses/Mask) -->
                <!-- Carefully positioned to align with eyes -->
                ${faceIcon ? `
                <i class="fa-solid ${faceIcon}" style="
                    font-size: 50px;
                    color: #333; /* Dark accessories usually look best */
                    position: absolute;
                    bottom: 125px; 
                    z-index: 2;
                    opacity: 0.9;
                "></i>
                ` : ''}

                <!-- LAYER 3: The Shirt (Kit) -->
                <!-- Wide shoulders to support the larger head -->
                <i class="fa-solid fa-shirt" style="
                    font-size: 160px; 
                    color: ${kitColor}; 
                    position: absolute; 
                    bottom: -25px;
                    z-index: 3;
                    filter: drop-shadow(0 -5px 10px rgba(0,0,0,0.5));
                "></i>

                <!-- LAYER 4: The Branding (Name on Shirt) -->
                <div class="shirt-text" style="
                    position: absolute; 
                    bottom: 45px; 
                    z-index: 4;
                    color: rgba(255,255,255,0.9); 
                    font-family: 'Orbitron', sans-serif; 
                    font-size: 14px; 
                    font-weight: 900;
                    text-transform: uppercase;
                    text-shadow: 0 1px 2px #000;
                    letter-spacing: 1px;
                    pointer-events: none;
                ">
                    ${shirtName || 'NOUB'}
                </div>

                <!-- LAYER 5: The Headgear (Hat/Hair) -->
                <!-- Sits ON TOP of everything (Z=5) & Overlaps Head -->
                ${headIcon ? `
                <i class="fa-solid ${headIcon}" style="
                    font-size: 90px;
                    color: ${kitColor}; /* Matches Kit Theme */
                    position: absolute;
                    bottom: 165px; 
                    z-index: 5;
                    filter: drop-shadow(0 5px 5px rgba(0,0,0,0.6));
                "></i>
                ` : ''}

            </div>
        `;
    }

    /**
     * CONFIG EXPORTER:
     * Returns the raw config arrays to populate the UI Palettes.
     * This allows the Controller to dynamically build the color grids.
     */
    static getConfig() {
        return AVATAR_CONFIG;
    }
}
