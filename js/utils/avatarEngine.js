/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/avatarEngine.js
 * Version: 10.0.0 (NECK & SHOULDER CORRECTION)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ACADEMIC MODULE DESCRIPTION:
 * -----------------------------------------------------------------------------
 * The Core Visual Rendering Engine.
 * Responsible for generating the player's visual identity using vector composition.
 * 
 * GEOMETRY CORRECTION REPORT (V10.0):
 * 1. The "Sunken Head" Fix:
 *    - Lifted Body Base (Head/Neck) by +25px (from 45px to 70px).
 *    - Lowered Shirt Anchor by -10px (from -15px to -25px) to reveal the neck.
 *    - Result: A clear separation between chin and collar.
 * 
 * 2. Accessory Re-alignment:
 *    - Eyes/Masks lifted to 'bottom: 118px' to match new head height.
 *    - Hats/Hair lifted to 'bottom: 155px' to sit on top of the raised head.
 *    - Badge lifted to 'bottom: 75px' to stay on the chest area.
 * 
 * 3. Asset Persistence:
 *    - Retained the massive library of icons (4x expansion) from previous updates.
 *    - Kept Transparent Background logic.
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
        'fa-infinity',         // 10. Cyclops
    ],

    // LAYER 6: HEADGEAR / HAIR (Top of Head)
    HEAD_GEAR: [
        null,                  // 01. Shaved
        'fa-hat-cowboy',       // 02. Cowboy
        'fa-graduation-cap',   // 04. Cap
        'fa-helmet-safety',    // 05. Helmet
        'fa-crown',            // 06. Crown
    ],

    // PRESET PALETTE (For Grid UI)
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
     * ADJUSTED GEOMETRY (V10.0):
     * - Body Base: Lifted to bottom:70px (was 45px) -> MAJOR FIX
     * - Shirt: Lowered to bottom:-25px (was -15px) -> Creates neck space
     * - Face: Lifted to bottom:118px
     * - Hat: Lifted to bottom:155px
     * - Badge: Lifted to bottom:75px
     * 
     * @param {Object} visualDna - { kit, logo, face, hair }
     * @param {string} shirtName - Player Name
     * @returns {string} HTML String
     */
static generateAvatarHTML(visualDna, shirtName) {
        const dna = (typeof visualDna === 'string') ? JSON.parse(visualDna) : (visualDna || {});
        
        const kitColor = dna.kit || '#3b82f6'; 
        const logoIcon = AVATAR_CONFIG.LOGOS[(dna.logo || 1) - 1];
        const faceIcon = AVATAR_CONFIG.FACE_GEAR[(dna.face || 1) - 1];
        const headIcon = AVATAR_CONFIG.HEAD_GEAR[(dna.hair || 1) - 1];
        const skinColor = AVATAR_CONFIG.FIXED_SKIN;

        return `
            <div class="avatar-comp" style="
                position: relative; 
                width: 100%; 
                height: 100%; 
                display: flex; 
                justify-content: center; 
                align-items: flex-end; 
                overflow: hidden;
                /* الحل الهندسي: تصغير المنظور 10% ليحتوي القبعة والجسم الضخم */
                transform: scale(0.9);
                transform-origin: bottom center;
            ">
                
                <!-- 1. BODY (LAYER 1 - BACK) -->
                <!-- الجسم ضخم (105px) وفي الخلفية -->
                <i class="fa-solid fa-user" style="
                    font-size: 105px; 
                    color: ${skinColor}; 
                    position: absolute; 
                    bottom: 80px; 
                    z-index: 1; 
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
                "></i>

                <!-- 2. SHIRT (LAYER 2 - FRONT) -->
                <!-- القميص أمام الجسم، مرتفع قليلاً ليغطي الأكتاف -->
                <i class="fa-solid fa-shirt" style="
                    font-size: 160px; 
                    color: ${kitColor}; 
                    position: absolute; 
                    bottom: -40px; 
                    z-index: 2; 
                    transform: scaleY(1.15);
                    transform-origin: bottom center;
                    filter: drop-shadow(0 -4px 12px rgba(0,0,0,0.5));
                "></i>

                <!-- 3. FACE ACCESSORY (LAYER 3) -->
                ${faceIcon ? `
                <i class="fa-solid ${faceIcon}" style="
                    font-size: 38px; 
                    color: #222; 
                    position: absolute;
                    bottom: 125px; 
                    z-index: 3; 
                    opacity: 0.95;
                "></i>
                ` : ''}

                <!-- 4. LOGO (LAYER 4) -->
                ${logoIcon ? `
                <div style="
                    position: absolute; 
                    bottom: 50px; 
                    left: 50%; 
                    margin-left: 24px; 
                    z-index: 4; 
                    width: 22px; 
                    height: 22px; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.6));
                ">
                    <i class="fa-solid ${logoIcon}" style="
                        font-size: 20px; 
                        color: rgba(255,255,255,0.95);
                    "></i>
                </div>` : ''}

                <!-- 5. NAME (LAYER 5) -->
                <div class="shirt-text" style="
                    position: absolute; 
                    bottom: 15px; 
                    z-index: 5; 
                    color: rgba(255,255,255,0.9); 
                    font-family: 'Orbitron', sans-serif; 
                    font-size: 11px; 
                    font-weight: 900;
                    text-transform: uppercase;
                    text-shadow: 0 1px 3px #000;
                    pointer-events: none;
                ">
                    ${shirtName || 'NOUB'}
                </div>

                <!-- 6. HEADGEAR (LAYER 6 - TOP) -->
                <!-- بما أننا صغرنا المنظور، القبعة ستظهر كاملة الآن -->
                ${headIcon ? `
                <i class="fa-solid ${headIcon}" style="
                    font-size: 65px; 
                    color: #fff;
                    text-shadow: 0 4px 8px rgba(0,0,0,0.5); 
                    position: absolute;
                    bottom: 160px; 
                    z-index: 6; 
                "></i>
                ` : ''}

            </div>
        `;
    }
    
    /**
     * CONFIG EXPORTER:
     */
    static getConfig() {
        return AVATAR_CONFIG;
    }
}















