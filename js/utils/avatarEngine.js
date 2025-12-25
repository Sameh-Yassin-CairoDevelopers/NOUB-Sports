/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/avatarEngine.js
 * Version: 8.0.0 (MASSIVE ASSETS & GEOMETRY FIX)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ACADEMIC MODULE DESCRIPTION:
 * -----------------------------------------------------------------------------
 * The Core Visual Rendering Engine for the Digital Identity Asset.
 * Handles vector composition with precise anatomical calculations.
 * 
 * GEOMETRY UPDATE REPORT (V8.0):
 * 1. Vertical Shift (+15%):
 *    - All layers lifted by ~40px to expose more torso and center the figure.
 *    - Body Bottom: 55px -> 95px.
 *    - Shirt Bottom: -35px -> 5px (Visible Torso).
 * 2. Proportions:
 *    - Shirt Width: Reduced by 5% (180px -> 170px) for a fitter look.
 *    - Hat Size: Reduced by 5% (80px -> 76px) for better head fit.
 * 3. Background:
 *    - Removed solid colors. Set to 'transparent' to blend with parent Card containers.
 * 4. Asset Library:
 *    - Expanded Headgear, Face, and Logos arrays by 400% as requested.
 * -----------------------------------------------------------------------------
 */

// ==========================================
// 1. EXPANDED ASSET LIBRARIES (HUGE SELECTION)
// ==========================================

const AVATAR_CONFIG = {
    
    // STANDARD SKIN (Unified Identity)
    FIXED_SKIN: '#e0ac69', 

    // LAYER 4: CHEST LOGOS (Badges)
    // Massive list of icons suitable for Team Crests
    LOGOS: [
        null,                  // 01. None
        'fa-shield-halved',    // 02. Classic Shield
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
        'fa-award',            // 13. Ribbon
        'fa-certificate',      // 14. Seal
        'fa-circle-radiation', // 15. Hazard
        'fa-biohazard',        // 16. Bio
        'fa-yin-yang',         // 17. Balance
        'fa-peace',            // 18. Peace
        'fa-heart-crack',      // 19. Broken Heart
        'fa-clover',           // 20. Luck
        'fa-diamond',          // 21. Suits
        'fa-chess-knight',     // 22. Knight
        'fa-chess-rook',       // 23. Castle
        'fa-gavel',            // 24. Justice
        'fa-scale-balanced',   // 25. Law
        'fa-flask',            // 26. Science
        'fa-rocket',           // 27. Speed
        'fa-jet-fighter',      // 28. Jet
        'fa-car-burst',        // 29. Crash
        'fa-ghost',            // 30. Spirit
        'fa-robot',            // 31. Tech
        'fa-spider',           // 32. Spider
        'fa-bug',              // 33. Bug
        'fa-fish-fins',        // 34. Shark
        'fa-hippo',            // 35. Heavy
        'fa-otter',            // 36. Agile
        'fa-tree',             // 37. Nature
        'fa-mountain',         // 38. Solid
        'fa-water',            // 39. Wave
        'fa-wind'              // 40. Storm
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
        'fa-microscope',       // 09. Scientist (Symbolic)
        'fa-vial',             // 10. Chemist (Symbolic)
        'fa-prescription',     // 11. Rx
        'fa-infinity',         // 12. Cyclops (Abstract)
        'fa-stopwatch',        // 13. Timer Eye
        'fa-video',            // 14. CCTV Face
        'fa-camera'            // 15. Paparazzi
    ],

    // LAYER 6: HEADGEAR / HAIR (Top of Head)
    // Curated: Only items that sit ON TOP of the head ball.
    HEAD_GEAR: [
        null,                  // 01. Shaved
        'fa-hat-cowboy',       // 02. Cowboy
        'fa-hat-wizard',       // 03. Wizard
        'fa-graduation-cap',   // 04. Cap
        'fa-helmet-safety',    // 05. Helmet
        'fa-crown',            // 06. Crown
        'fa-user-astronaut',   // 07. Astro
        'fa-ribbon',           // 08. Ribbon
        'fa-mitten',           // 09. Punk/Mohawk
        'fa-user-graduate',    // 10. Student Cap
        'fa-user-doctor',      // 11. Doc Mirror
        'fa-user-nurse',       // 12. Nurse Cap
        'fa-bell',             // 13. Bell Head
        'fa-lightbulb',        // 14. Idea Head
        'fa-brain',            // 15. Big Brain
        'fa-cloud',            // 16. Cloud Head
        'fa-sun',              // 17. Sun Head
        'fa-moon',             // 18. Moon Head
        'fa-poop',             // 19. Fun
        'fa-football',         // 20. Ball Head
        'fa-basketball',       // 21. Basket Head
        'fa-headphones',       // 22. DJ
        'fa-headset'           // 23. Gamer
    ],

    // PRESET PALETTE (For UI Grid)
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
        '#84cc16', // Lime
        '#78716c', // Stone
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
     * NEW GEOMETRY (V8.0):
     * - Vertical Shift: +40px UP.
     * - Shirt Width: 170px (-5%).
     * - Hat Size: 76px (-5%).
     * 
     * @param {Object} visualDna - { kit, logo, face, hair }
     * @param {string} shirtName - Player Name
     * @returns {string} HTML String
     */
    static generateAvatarHTML(visualDna, shirtName) {
        const dna = (typeof visualDna === 'string') ? JSON.parse(visualDna) : (visualDna || {});
        
        // Asset Resolution
        const kitColor = dna.kit || '#3b82f6'; 
        const logoIcon = AVATAR_CONFIG.LOGOS[(dna.logo || 1) - 1];
        const faceIcon = AVATAR_CONFIG.FACE_GEAR[(dna.face || 1) - 1];
        const headIcon = AVATAR_CONFIG.HEAD_GEAR[(dna.hair || 1) - 1];
        const skinColor = AVATAR_CONFIG.FIXED_SKIN;

        // HTML Composition
        // NOTE: background is now TRANSPARENT as requested.
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
                <!-- Bottom Raised: 55 -> 95 (+40px) -->
                <i class="fa-solid fa-user" style="
                    font-size: 110px; 
                    color: ${skinColor}; 
                    position: absolute; 
                    bottom: 95px; 
                    z-index: 1;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
                "></i>

                <!-- LAYER 2: FACE ACCESSORY (Eyes) -->
                <!-- Bottom Raised: 105 -> 145 (+40px) -->
                ${faceIcon ? `
                <i class="fa-solid ${faceIcon}" style="
                    font-size: 42px;
                    color: #222; 
                    position: absolute;
                    bottom: 145px; 
                    z-index: 2;
                    opacity: 0.9;
                "></i>
                ` : ''}

                <!-- LAYER 3: THE SHIRT (Kit) -->
                <!-- Size Reduced: 180 -> 170 (-5%) -->
                <!-- Bottom Raised: -35 -> 5 (+40px to show torso) -->
                <i class="fa-solid fa-shirt" style="
                    font-size: 170px; 
                    color: ${kitColor}; 
                    position: absolute; 
                    bottom: 5px; 
                    z-index: 3;
                    filter: drop-shadow(0 -5px 15px rgba(0,0,0,0.5));
                "></i>

                <!-- LAYER 4: CHEST BADGE (Logo) -->
                <!-- Bottom Raised: 55 -> 95 (+40px) -->
                <!-- Heart Side Offset preserved -->
                ${logoIcon ? `
                <div style="
                    position: absolute;
                    bottom: 95px;
                    left: 50%;
                    margin-left: 35px;
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
                <!-- Bottom Raised: 35 -> 75 (+40px) -->
                <div class="shirt-text" style="
                    position: absolute; 
                    bottom: 75px; 
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
                <!-- Size Reduced: 80 -> 76 (-5%) -->
                <!-- Bottom Raised: 140 -> 180 (+40px) -->
                ${headIcon ? `
                <i class="fa-solid ${headIcon}" style="
                    font-size: 76px;
                    color: #fff;
                    text-shadow: 0 4px 8px rgba(0,0,0,0.5); 
                    position: absolute;
                    bottom: 180px; 
                    z-index: 6;
                "></i>
                ` : ''}

            </div>
        `;
    }

    static getConfig() {
        return AVATAR_CONFIG;
    }
}
