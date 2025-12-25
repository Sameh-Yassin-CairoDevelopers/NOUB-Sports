/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/avatarEngine.js
 * Version: 7.0.0 (FINAL ANATOMY & BADGE FIX)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ACADEMIC MODULE DESCRIPTION:
 * -----------------------------------------------------------------------------
 * The Core Visual Rendering Engine for the Digital Identity Asset.
 * This class orchestrates the composition of vector layers (FontAwesome/SVG)
 * to generate a scientifically proportioned player avatar.
 * 
 * FINAL ENGINEERING SPECIFICATIONS (V7.0):
 * 1. Background Architecture:
 *    - Fixed "Royal Green" Gradient (Standardized Brand Identity).
 *    - Removed dynamic background switching to prioritize data visibility.
 * 
 * 2. Anatomical Geometry:
 *    - Base Anchor: The Shirt is the primary anchor point.
 *    - Head Scale: Increased by 20% to fit the collar naturally.
 *    - Headgear: Z-Index elevated, Y-Axis lowered to overlap the forehead (No floating).
 *    - Curation: Removed any headgear icons that included body parts (shoulders).
 * 
 * 3. Badge Placement (The Crest):
 *    - Moved from Center Sternum to Left Pectoral (Heart Side).
 *    - Rendered with a metallic/embroidered effect filter.
 * 
 * 4. Color Logic:
 *    - Supports direct HEX string injection from the Color Wheel.
 * -----------------------------------------------------------------------------
 */

// ==========================================
// 1. CURATED ASSET LIBRARIES
// ==========================================

const AVATAR_CONFIG = {
    
    // STANDARD SKIN (Unified Identity)
    // A neutral, warm wheat tone (#e0ac69) used across the platform.
    FIXED_SKIN: '#e0ac69', 

    // LAYER 4: TEAM BADGES (Chest Logos)
    // Curated list of Shield/Crest-like icons.
    // NOTE: These are positioned on the Heart side (Viewer's Right).
    LOGOS: [
        null,                  // 1. Clean Shirt
        'fa-shield-halved',    // 2. Classic Shield
        'fa-star',             // 3. Championship Star
        'fa-bolt',             // 4. Strike Energy
        'fa-fire',             // 5. Ultras Flame
        'fa-crown',            // 6. Royal Club
        'fa-skull',            // 7. Pirates/Ultras
        'fa-gem',              // 8. Rich/Diamond
        'fa-dragon',           // 9. Beast Mode
        'fa-anchor',           // 10. Port City
        'fa-feather-pointed',  // 11. Wings/Speed
        'fa-paw'               // 12. Mascot
    ],
    
    // LAYER 2: FACE ACCESSORIES
    // Strictly eyes/face level items.
    FACE_GEAR: [
        null,                  // 1. Clean Face
        'fa-glasses',          // 2. Hipster/Edgar Glasses
        'fa-mask',             // 3. Hero Mask
        'fa-head-side-mask',   // 4. Medical/Protection
        'fa-eye-slash',        // 5. Pirate Patch
        'fa-user-secret'       // 6. Agent Shades
    ],

    // LAYER 6: HEADGEAR (Strictly Hats/Hair)
    // REMOVED: Icons that include shoulders (e.g. fa-user-tie).
    // KEPT: Only top-of-head items.
    HEAD_GEAR: [
        null,                  // 1. Shaved/Bald (Default)
        'fa-hat-cowboy',       // 2. Cowboy Hat
        'fa-hat-wizard',       // 3. Magician Hat
        'fa-graduation-cap',   // 4. Cap (Backwards style)
        'fa-helmet-safety',    // 5. Hard Hat (Defender)
        'fa-crown',            // 6. King Crown (Captain)
        'fa-user-astronaut',   // 7. Space Helmet
        'fa-ribbon',           // 8. Headband (Ninja Style)
        'fa-mitten'            // 9. Punk/Mohawk Simulation
    ],

    // PRESET PALETTE (For Grid Selection)
    // Used by controllers to render quick-select options.
    // The engine accepts ANY Hex string, not just these.
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
     * Constructor: Initializes default state.
     * Useful for testing isolation.
     */
    constructor() {
        this.state = { 
            kit: '#3b82f6', 
            logo: 1, 
            face: 1, 
            hair: 1 
        };
    }

    /**
     * STATIC GENERATOR: The Anatomical Renderer.
     * 
     * GEOMETRY ENGINE (Based on ~260px Height Container):
     * ---------------------------------------------------
     * 1. BODY (Layer 1): Size 120px | Bottom 55px.
     *    - Provides the neck and head base.
     * 
     * 2. SHIRT (Layer 3): Size 180px | Bottom -35px.
     *    - Wide shoulders to cover the "User Icon" base.
     *    - Sits low to simulate torso.
     * 
     * 3. BADGE (Layer 4): Size 28px | Bottom 55px | Margin-Left 45px.
     *    - Offset from center to sit on the "Heart" (Viewer's Right).
     * 
     * 4. HEADGEAR (Layer 6): Size 85px | Bottom 140px.
     *    - Lowered Y-Axis to ensure it sits ON the head, not hovering.
     * 
     * @param {Object} visualDna - { kit: Hex, logo: Int, face: Int, hair: Int }
     * @param {string} shirtName - Branding text.
     * @returns {string} HTML String.
     */
    static generateAvatarHTML(visualDna, shirtName) {
        // 1. Data Sanitization
        const dna = (typeof visualDna === 'string') ? JSON.parse(visualDna) : (visualDna || {});
        
        // 2. Asset Resolution
        const kitColor = dna.kit || '#3b82f6'; 
        const logoIcon = AVATAR_CONFIG.LOGOS[(dna.logo || 1) - 1];
        const faceIcon = AVATAR_CONFIG.FACE_GEAR[(dna.face || 1) - 1];
        const headIcon = AVATAR_CONFIG.HEAD_GEAR[(dna.hair || 1) - 1];
        
        // Fixed Skin Tone
        const skinColor = AVATAR_CONFIG.FIXED_SKIN;

        // 3. HTML Composition
        // Note: The parent container provides the "Royal Green" background via CSS class,
        // or we inject it here inline to guarantee it everywhere.
        return `
            <div class="avatar-comp" style="
                position: relative; 
                width: 100%; 
                height: 100%; 
                display: flex; 
                justify-content: center; 
                align-items: flex-end;
                overflow: hidden; /* Clips the bottom of shirt */
                background: linear-gradient(180deg, #0f2e1d 0%, #051910 100%); /* ROYAL GREEN FIXED */
                border-radius: inherit; /* Inherits from parent card */
            ">
                
                <!-- LAYER 1: BODY (Head & Neck) -->
                <i class="fa-solid fa-user" style="
                    font-size: 120px; 
                    color: ${skinColor}; 
                    position: absolute; 
                    bottom: 55px; 
                    z-index: 1;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
                "></i>

                <!-- LAYER 2: FACE ACCESSORY (Eyes) -->
                ${faceIcon ? `
                <i class="fa-solid ${faceIcon}" style="
                    font-size: 42px;
                    color: #222; 
                    position: absolute;
                    bottom: 105px; /* Aligned with Eyes */
                    z-index: 2;
                    opacity: 0.9;
                "></i>
                ` : ''}

                <!-- LAYER 3: THE SHIRT (Kit) -->
                <i class="fa-solid fa-shirt" style="
                    font-size: 180px; 
                    color: ${kitColor}; 
                    position: absolute; 
                    bottom: -35px; 
                    z-index: 3;
                    filter: drop-shadow(0 -5px 15px rgba(0,0,0,0.5)); /* Depth shadow */
                "></i>

                <!-- LAYER 4: CHEST BADGE (The Logo) -->
                <!-- Positioned: Offset to the Right (Heart Side) -->
                ${logoIcon ? `
                <div style="
                    position: absolute;
                    bottom: 55px;
                    left: 50%;
                    margin-left: 35px; /* Shift to Heart Side */
                    z-index: 4;
                    width: 30px; height: 30px;
                    display: flex; justify-content: center; align-items: center;
                    filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.6));
                ">
                    <i class="fa-solid ${logoIcon}" style="
                        font-size: 24px;
                        color: rgba(255,255,255,0.95);
                    "></i>
                </div>
                ` : ''}

                <!-- LAYER 5: BRANDING (Name) -->
                <div class="shirt-text" style="
                    position: absolute; 
                    bottom: 35px; 
                    z-index: 5;
                    color: rgba(255,255,255,0.85); 
                    font-family: 'Orbitron', sans-serif; 
                    font-size: 13px; 
                    font-weight: 900;
                    text-transform: uppercase;
                    text-shadow: 0 1px 3px #000;
                    letter-spacing: 1px;
                    pointer-events: none;
                ">
                    ${shirtName || 'NOUB'}
                </div>

                <!-- LAYER 6: HEADGEAR (Hat) -->
                <!-- Adjusted to sit ON the head -->
                ${headIcon ? `
                <i class="fa-solid ${headIcon}" style="
                    font-size: 80px;
                    color: #fff; /* White standard for contrast */
                    text-shadow: 0 4px 8px rgba(0,0,0,0.5); 
                    position: absolute;
                    bottom: 140px; /* Overlaps forehead */
                    z-index: 6;
                "></i>
                ` : ''}

            </div>
        `;
    }

    /**
     * CONFIG EXPORTER:
     * Provides asset arrays to the UI Controllers for grid generation.
     */
    static getConfig() {
        return AVATAR_CONFIG;
    }
}
