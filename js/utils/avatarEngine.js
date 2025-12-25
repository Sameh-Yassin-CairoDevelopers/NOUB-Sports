/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/avatarEngine.js
 * Version: 9.0.0 (GEOMETRIC PERFECTION & SCALING FIX)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ACADEMIC MODULE DESCRIPTION:
 * -----------------------------------------------------------------------------
 * The Core Visual Rendering Engine.
 * Responsible for generating the player's visual identity using vector composition.
 * 
 * ENGINEERING REPORT (V9.0):
 * 1. Global Downscaling (-15%):
 *    - All elements resized to fit comfortably within the container without clipping.
 *    - Solves the "Cut-off Hat" and "Overflowing Shirt" issues.
 * 
 * 2. Anatomical Correction:
 *    - Head (Body) elevated relative to the Shirt to fix the "Sunken Head" look.
 *    - Neck base is now clearly visible above the collar.
 * 
 * 3. Badge Positioning:
 *    - X-Axis Offset reduced (35px -> 22px) to keep the badge centered on the pectoral muscle.
 *    - Prevents the badge from floating outside the shirt boundary.
 * 
 * 4. Data Support:
 *    - Supports Hex Color Strings for Kits.
 *    - Supports Curated Icon Sets for realistic representation.
 * -----------------------------------------------------------------------------
 */

// ==========================================
// 1. ASSET CONFIGURATION LIBRARIES
// ==========================================

const AVATAR_CONFIG = {
    
    // STANDARD SKIN (Unified Identity)
    FIXED_SKIN: '#e0ac69', 

    // LAYER 4: CHEST LOGOS (Badges)
    // Rendered on the Heart Side (Viewer's Right).
    LOGOS: [
        null,                  // 01. None
        'fa-shield-halved',    // 02. Classic Crest
        'fa-star',             // 03. Star
        'fa-bolt',             // 04. Bolt
        'fa-fire',             // 05. Fire
        'fa-crown',            // 06. Crown
        'fa-skull',            // 07. Skull
        'fa-gem',              // 08. Gem
        'fa-dragon',           // 09. Dragon
        'fa-anchor',           // 10. Anchor
        'fa-feather-pointed',  // 11. Feather
        'fa-paw',              // 12. Paw
        'fa-award',            // 13. Award
        'fa-certificate',      // 14. Seal
        'fa-yin-yang',         // 15. Balance
        'fa-peace',            // 16. Peace
        'fa-heart-crack',      // 17. Broken Heart
        'fa-diamond',          // 18. Suit Diamond
        'fa-chess-knight',     // 19. Knight
        'fa-rocket',           // 20. Rocket
        'fa-jet-fighter',      // 21. Jet
        'fa-ghost',            // 22. Ghost
        'fa-robot',            // 23. Robot
        'fa-tree',             // 24. Tree
        'fa-water',            // 25. Wave
        'fa-wind'              // 26. Wind
    ],
    
    // LAYER 2: FACE ACCESSORIES (Eyes/Mouth)
    FACE_GEAR: [
        null,                  // 01. Clean
        'fa-glasses',          // 02. Glasses
        'fa-mask',             // 03. Mask
        'fa-head-side-mask',   // 04. Medical
        'fa-eye-slash',        // 05. Patch
        'fa-user-secret',      // 06. Spy
        'fa-mask-ventilator',  // 07. Bane Style
        'fa-bandage',          // 08. Injured
        'fa-microscope',       // 09. Scientist
        'fa-infinity',         // 10. Cyclops
        'fa-video'             // 11. CCTV
    ],

    // LAYER 6: HEADGEAR / HAIR (Top of Head)
    // Only items that sit ON TOP of the head ball.
    HEAD_GEAR: [
        null,                  // 01. Shaved
        'fa-hat-cowboy',       // 02. Cowboy
        'fa-hat-wizard',       // 03. Wizard
        'fa-graduation-cap',   // 04. Cap
        'fa-helmet-safety',    // 05. Helmet
        'fa-crown',            // 06. Crown
        'fa-user-astronaut',   // 07. Astro
        'fa-ribbon',           // 08. Ribbon
        'fa-mitten',           // 09. Mohawk
        'fa-user-graduate',    // 10. Student
        'fa-user-doctor',      // 11. Doc
        'fa-bell',             // 12. Bell
        'fa-lightbulb',        // 13. Idea
        'fa-cloud',            // 14. Cloud
        'fa-sun',              // 15. Sun
        'fa-headphones'        // 16. DJ
    ],

    // PRESET PALETTE (For UI Grid Defaults)
    KITS: [
        '#3b82f6', // Blue
        '#ef4444', // Red
        '#10b981', // Green
        '#f59e0b', // Orange
        '#ffffff', // White
        '#111111', // Black
        '#8b5cf6', // Purple
        '#D4AF37', // Gold
        '#ec4899', // Pink
        '#6366f1', // Indigo
        '#14b8a6', // Teal
        '#7f1d1d', // Dark Red
        '#1e3a8a'  // Dark Blue
    ]
};

export class AvatarEngine {

    constructor() {
        this.state = { kit: '#3b82f6', logo: 1, face: 1, hair: 1 };
    }

    /**
     * STATIC GENERATOR: The Anatomical Renderer.
     * 
     * REVISED GEOMETRY (V9.0):
     * - Shirt Width: Reduced to 150px (was 170px) -> Fits better inside container.
     * - Body Size: Reduced to 95px (was 110px) -> Proportionate to new shirt.
     * - Hat Size: Reduced to 65px (was 76px) -> Prevents clipping at top.
     * 
     * - Vertical Positioning (Y-Axis):
     *   - Shirt Bottom: -15px (Shows torso base).
     *   - Body Bottom: 45px (Neck connects to collar).
     *   - Eyes (Accessory): 90px (Aligned with head).
     *   - Hat: 125px (Sits firmly on head).
     * 
     * @param {Object} visualDna - { kit, logo, face, hair }
     * @param {string} shirtName - Player Name
     * @returns {string} HTML String
     */
    static generateAvatarHTML(visualDna, shirtName) {
        // 1. Data Sanitization
        const dna = (typeof visualDna === 'string') ? JSON.parse(visualDna) : (visualDna || {});
        
        // 2. Asset Resolution
        const kitColor = dna.kit || '#3b82f6'; 
        const logoIcon = AVATAR_CONFIG.LOGOS[(dna.logo || 1) - 1];
        const faceIcon = AVATAR_CONFIG.FACE_GEAR[(dna.face || 1) - 1];
        const headIcon = AVATAR_CONFIG.HEAD_GEAR[(dna.hair || 1) - 1];
        const skinColor = AVATAR_CONFIG.FIXED_SKIN;

        // 3. HTML Composition
        // Container uses transparent background to blend with Cards/Modals
        return `
            <div class="avatar-comp" style="
                position: relative; 
                width: 100%; 
                height: 100%; 
                display: flex; 
                justify-content: center; 
                align-items: flex-end;
                overflow: hidden; 
                background: transparent; 
                border-radius: inherit;
            ">
                
                <!-- LAYER 1: BODY (Head & Neck) -->
                <i class="fa-solid fa-user" style="
                    font-size: 95px; 
                    color: ${skinColor}; 
                    position: absolute; 
                    bottom: 45px; 
                    z-index: 1;
                    filter: drop-shadow(0 3px 5px rgba(0,0,0,0.4));
                "></i>

                <!-- LAYER 2: FACE ACCESSORY (Eyes) -->
                ${faceIcon ? `
                <i class="fa-solid ${faceIcon}" style="
                    font-size: 38px;
                    color: #222; 
                    position: absolute;
                    bottom: 90px; /* Aligned with scaled-down head */
                    z-index: 2;
                    opacity: 0.95;
                "></i>
                ` : ''}

                <!-- LAYER 3: THE SHIRT (Kit) -->
                <!-- Scaled down to 150px to prevent overflow -->
                <i class="fa-solid fa-shirt" style="
                    font-size: 150px; 
                    color: ${kitColor}; 
                    position: absolute; 
                    bottom: -15px; 
                    z-index: 3;
                    filter: drop-shadow(0 -4px 12px rgba(0,0,0,0.5));
                "></i>

                <!-- LAYER 4: CHEST BADGE (Logo) -->
                <!-- Adjusted Margin-Left (22px) to keep it on the shirt -->
                ${logoIcon ? `
                <div style="
                    position: absolute;
                    bottom: 50px;
                    left: 50%;
                    margin-left: 22px; /* Precision offset for Heart Side */
                    z-index: 4;
                    width: 24px; height: 24px;
                    display: flex; justify-content: center; align-items: center;
                    filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.6));
                ">
                    <i class="fa-solid ${logoIcon}" style="
                        font-size: 20px;
                        color: rgba(255,255,255,0.95);
                    "></i>
                </div>
                ` : ''}

                <!-- LAYER 5: BRANDING (Name) -->
                <div class="shirt-text" style="
                    position: absolute; 
                    bottom: 30px; 
                    z-index: 5;
                    color: rgba(255,255,255,0.85); 
                    font-family: 'Orbitron', sans-serif; 
                    font-size: 11px; 
                    font-weight: 900;
                    text-transform: uppercase;
                    text-shadow: 0 1px 3px #000;
                    letter-spacing: 1px;
                    pointer-events: none;
                ">
                    ${shirtName || 'NOUB'}
                </div>

                <!-- LAYER 6: HEADGEAR (Hat) -->
                <!-- Scaled down to 65px to avoid top-clipping -->
                ${headIcon ? `
                <i class="fa-solid ${headIcon}" style="
                    font-size: 65px;
                    color: #fff;
                    text-shadow: 0 4px 8px rgba(0,0,0,0.5); 
                    position: absolute;
                    bottom: 125px; /* Sits firmly on the 95px head */
                    z-index: 6;
                "></i>
                ` : ''}

            </div>
        `;
    }

    /**
     * CONFIG EXPORTER:
     * Provides asset arrays to the UI Controllers.
     */
    static getConfig() {
        return AVATAR_CONFIG;
    }
}
