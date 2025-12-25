/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/avatarEngine.js
 * Version: 6.5.0 (GOLDEN MASTER - FULL ANATOMY)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ACADEMIC MODULE DESCRIPTION:
 * -----------------------------------------------------------------------------
 * The Core Visual Rendering Engine for the Digital Identity Asset.
 * This class handles the composition of SVG/FontAwesome layers to generate
 * the player's visual representation based on their DNA.
 * 
 * ARCHITECTURAL SPECIFICATIONS (V6.5):
 * 1. Layering Architecture (Z-Index Stack):
 *    - Layer 1: Body Base (Head/Neck) -> Bottom Anchor
 *    - Layer 2: Face Accessories (Eyes) -> Aligned to Eye Level
 *    - Layer 3: Kit (Shirt) -> Covers Neck Base
 *    - Layer 4: Chest Badge (Logo) -> Centered on Sternum
 *    - Layer 5: Branding (Name) -> Abdominal Placement
 *    - Layer 6: Headgear -> Overlaps Forehead
 * 
 * 2. Geometry Correction:
 *    - Refactored Y-Axis offsets (bottom pixels) to ensure physical realism.
 *    - Adjusted Font-Size scales to prevent "Floating Hat" or "Small Head" issues.
 * 
 * 3. Asset Standardization:
 *    - 'Skin Tone' is fixed to a standard wheat color (#e0ac69) for unified identity.
 *    - 'Kit Color' supports dynamic HEX strings from Color Wheel.
 *    - 'Backgrounds' have been deprecated and replaced with 'Chest Logos'.
 * -----------------------------------------------------------------------------
 */

// ==========================================
// 1. ASSET CONFIGURATION LIBRARIES
// ==========================================

const AVATAR_CONFIG = {
    
    // STANDARD SKIN (Unified Identity)
    // A neutral, warm wheat tone used for all avatars.
    FIXED_SKIN: '#e0ac69', 

    // LAYER: CHEST LOGOS (Badges) - Replaces Backgrounds
    // These render on top of the shirt (Z-Index: 4).
    LOGOS: [
        null,                  // 1. No Logo (Clean Shirt)
        'fa-shield-halved',    // 2. Classic Crest
        'fa-star',             // 3. The Star (Champion)
        'fa-bolt',             // 4. Energy/Strike
        'fa-fire',             // 5. Ultras Flame
        'fa-crown',            // 6. Royal Crown
        'fa-skull',            // 7. Pirates/Danger
        'fa-gem',              // 8. Diamond/Rich
        'fa-dragon',           // 9. Beast Mode
        'fa-anchor',           // 10. Port/Coastal
        'fa-feather',          // 11. Light/Wing
        'fa-paw'               // 12. Animal Mascot
    ],
    
    // LAYER: FACE ACCESSORIES (Personality)
    // Items that sit on the face (Eyes/Mouth level).
    FACE_GEAR: [
        null,                  // 1. Clean Face
        'fa-glasses',          // 2. Classic Glasses (Hipster)
        'fa-mask',             // 3. Zorro/Hero Mask
        'fa-head-side-mask',   // 4. Medical Mask (Protection)
        'fa-eye-slash',        // 5. Pirate Eye Patch
        'fa-user-secret',      // 6. Spy/Agent Shades
        'fa-prescription-bottle' // 7. Scientist/Medic (Abstract)
    ],

    // LAYER: HEADGEAR / HAIR (Style)
    // Items that sit on top of the head.
    HEAD_GEAR: [
        null,                  // 1. Bald/Shaved (Default)
        'fa-user-tie',         // 2. Slick Hair (Simulated via Icon)
        'fa-user-ninja',       // 3. Ninja Headband
        'fa-hat-cowboy',       // 4. Cowboy Hat
        'fa-graduation-cap',   // 5. Cap (Backwards style simulation)
        'fa-helmet-safety',    // 6. Defender Helmet (Hard Hat)
        'fa-crown',            // 7. King (Top Head)
        'fa-user-astronaut',   // 8. Space Helmet
        'fa-hat-wizard'        // 9. Magician
    ],

    // LAYER: KIT PRESETS (For Palette Grid)
    // Used by the Controller to generate the "Quick Select" grid.
    // The engine itself supports ANY Hex string passed to it.
    KITS: [
        '#3b82f6', // Royal Blue
        '#ef4444', // Red
        '#10b981', // Green
        '#f59e0b', // Orange
        '#ffffff', // White
        '#111111', // Black
        '#8b5cf6', // Purple
        '#D4AF37', // Gold
        '#ec4899', // Pink
        '#6366f1'  // Indigo
    ]
};

export class AvatarEngine {

    /**
     * Constructor: Initializes the default DNA state.
     * Useful for instantiation in controllers or testing.
     */
    constructor() {
        // Default DNA Structure
        // kit: Hex String
        // logo, face, hair: Integer Indices (1-based)
        this.state = { 
            kit: '#3b82f6', 
            logo: 1, 
            face: 1, 
            hair: 1 
        };
    }

    /**
     * STATIC GENERATOR: The Anatomical Renderer.
     * Creates the complex HTML string for the avatar using absolute positioning logic.
     * 
     * GEOMETRY SPECIFICATIONS (Based on ~260px Height Container):
     * - Body Base: 110px Size, Anchored at Bottom: 60px.
     * - Shirt: 170px Size, Anchored at Bottom: -30px (Wide Shoulders).
     * - Face Gear: Anchored at Bottom: 112px (Precise Eye Level).
     * - Head Gear: Anchored at Bottom: 145px (Overlaps Forehead).
     * 
     * @param {Object} visualDna - The configuration object { kit, logo, face, hair }.
     * @param {string} shirtName - The text to display on the shirt (Player Name).
     * @returns {string} The complete HTML string of the avatar component.
     */
    static generateAvatarHTML(visualDna, shirtName) {
        // 1. Safe Parsing & Defaults
        // Ensure we have a valid object, even if passed a JSON string or null
        const dna = (typeof visualDna === 'string') ? JSON.parse(visualDna) : (visualDna || {});
        
        // 2. Asset Resolution
        // Kit Color: Defaults to Royal Blue if missing or invalid
        const kitColor  = dna.kit || '#3b82f6'; 
        
        // Icons: Map index (1-based) to FontAwesome Class from config arrays
        // Fallback to index 0 (null) if invalid
        const logoIcon  = AVATAR_CONFIG.LOGOS[(dna.logo || 1) - 1];
        const faceIcon  = AVATAR_CONFIG.FACE_GEAR[(dna.face || 1) - 1];
        const headIcon  = AVATAR_CONFIG.HEAD_GEAR[(dna.hair || 1) - 1];
        
        // Skin: Fixed Standard
        const skinColor = AVATAR_CONFIG.FIXED_SKIN;

        // 3. Construct HTML Layer by Layer (Z-Index determines visibility order)
        return `
            <div class="avatar-comp" style="
                position: relative; 
                width: 100%; 
                height: 100%; 
                display: flex; 
                justify-content: center; 
                align-items: flex-end;
                overflow: hidden; /* Clips the bottom of the shirt */
                /* Background removed here, controlled by Parent Container (Royal Green) */
            ">
                
                <!-- LAYER 1: THE BODY (Head & Neck) -->
                <!-- Z-Index: 1 (Lowest) - Sits behind everything -->
                <i class="fa-solid fa-user" style="
                    font-size: 110px; 
                    color: ${skinColor}; 
                    position: absolute; 
                    bottom: 60px; 
                    z-index: 1;
                    filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));
                "></i>

                <!-- LAYER 2: FACE ACCESSORY (Glasses/Mask) -->
                <!-- Z-Index: 2 - Sits on face but must be under headgear -->
                ${faceIcon ? `
                <i class="fa-solid ${faceIcon}" style="
                    font-size: 45px;
                    color: #333; /* Dark accessories provide contrast on skin */
                    position: absolute;
                    bottom: 112px; /* Precisely aligned with 'User' icon eyes */
                    z-index: 2;
                    opacity: 0.95;
                "></i>
                ` : ''}

                <!-- LAYER 3: THE SHIRT (Kit) -->
                <!-- Z-Index: 3 - Covers the neck base, creates the torso -->
                <i class="fa-solid fa-shirt" style="
                    font-size: 170px; 
                    color: ${kitColor}; 
                    position: absolute; 
                    bottom: -30px; 
                    z-index: 3;
                    filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
                "></i>

                <!-- LAYER 4: CHEST LOGO (Badge) -->
                <!-- Z-Index: 4 - Sits directly on top of the shirt -->
                ${logoIcon ? `
                <i class="fa-solid ${logoIcon}" style="
                    font-size: 32px;
                    color: rgba(255,255,255,0.9); /* White Logo for visibility on dark kits */
                    position: absolute;
                    bottom: 65px; 
                    z-index: 4;
                    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));
                "></i>
                ` : ''}

                <!-- LAYER 5: BRANDING (Player Name) -->
                <!-- Z-Index: 5 - Sits on shirt, below logo -->
                <div class="shirt-text" style="
                    position: absolute; 
                    bottom: 40px; 
                    z-index: 5;
                    color: rgba(255,255,255,0.85); 
                    font-family: 'Orbitron', sans-serif; 
                    font-size: 12px; 
                    font-weight: 900;
                    text-transform: uppercase;
                    text-shadow: 0 1px 2px #000;
                    letter-spacing: 1px;
                    pointer-events: none;
                ">
                    ${shirtName || 'NOUB'}
                </div>

                <!-- LAYER 6: HEADGEAR (Hair/Hat) -->
                <!-- Z-Index: 6 (Highest) - Overlaps forehead and everything else -->
                ${headIcon ? `
                <i class="fa-solid ${headIcon}" style="
                    font-size: 75px;
                    color: #fff; /* White/Neutral headgear standard */
                    text-shadow: 0 2px 5px rgba(0,0,0,0.5); 
                    position: absolute;
                    bottom: 145px; 
                    z-index: 6;
                "></i>
                ` : ''}

            </div>
        `;
    }

    /**
     * CONFIG EXPORTER:
     * Returns the raw config arrays to populate the UI Palettes in Controllers.
     * Used by ProfileController to build the Selection Grids.
     * 
     * @returns {Object} The AVATAR_CONFIG object containing asset arrays.
     */
    static getConfig() {
        return AVATAR_CONFIG;
    }
}
