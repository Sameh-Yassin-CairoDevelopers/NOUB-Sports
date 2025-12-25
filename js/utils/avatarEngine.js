/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/avatarEngine.js
 * Version: Noub Sports_beta 6.0.0 (PROFESSIONAL ANATOMY)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * VISUAL ENGINEERING REPORT:
 * -----------------------------------------------------------------------------
 * Redesigned the visual assembly to correct anatomical proportions.
 * 
 * NEW LAYER STACK (Z-Index Order):
 * 1. Body Base (Head/Neck) - Z:1
 * 2. Face Accessories (Glasses/Masks) - Z:2
 * 3. Shirt (Kit) - Z:3 (Shoulders cover neck base)
 * 4. Chest Logo (Badge) - Z:4 (Centered on Shirt)
 * 5. Branding Text (Name) - Z:5
 * 6. Headgear (Hats/Hair) - Z:6 (Sits on top of Head)
 * 
 * PROPORTIONS UPDATE:
 * - Shirt is now the anchor.
 * - Head is anchored deeper into the shirt to simulate a neck.
 * - Accessories are positioned relative to the "Eye Line".
 * -----------------------------------------------------------------------------
 */

// ==========================================
// 1. CURATED ASSET LIBRARIES
// ==========================================

const AVATAR_CONFIG = {
    
    // STANDARD SKIN (Unified)
    FIXED_SKIN: '#e0ac69', 

    // LAYER: CHEST LOGOS (Replaces Backgrounds)
    // Selected symbols that look like Team Crests
    LOGOS: [
        null,                  // 1. None
        'fa-shield-halved',    // 2. Classic Crest
        'fa-star',             // 3. The Star
        'fa-bolt',             // 4. Energy/Strike
        'fa-fire',             // 5. Hot/Ultras
        'fa-crown',            // 6. Royals
        'fa-skull',            // 7. Pirates/Danger
        'fa-gem',              // 8. Rich/Diamond
        'fa-dragon',           // 9. Beast
        'fa-anchor'            // 10. Port Teams
    ],
    
    // LAYER: FACE ACCESSORIES (Curated)
    FACE_GEAR: [
        null,                  // 1. Clean Face
        'fa-glasses',          // 2. Classic Glasses
        'fa-mask',             // 3. Zorro Mask
        'fa-head-side-mask',   // 4. Medical Mask (Protection)
        'fa-eye-slash',        // 5. Eye Patch
        'fa-user-secret'       // 6. Spy Glasses
    ],

    // LAYER: HEADGEAR / HAIR (Realistic Selection)
    HEAD_GEAR: [
        null,                  // 1. Bald/Shaved (Default)
        'fa-user-tie',         // 2. Slick Hair (Simulated via User Icon style)
        'fa-user-ninja',       // 3. Headband/Ninja
        'fa-hat-cowboy',       // 4. Cowboy Hat
        'fa-graduation-cap',   // 5. Cap (Backwards style simulation)
        'fa-helmet-safety',    // 6. Hard Hat (Defender style)
        'fa-crown',            // 7. King Crown
        'fa-user-astronaut'    // 8. Full Helmet
    ]
};

export class AvatarEngine {

    constructor() {
        // Default DNA: kit is now a HEX STRING (Color Wheel), not an index
        this.state = { 
            kit: '#3b82f6', // Default Blue
            logo: 1, 
            face: 1, 
            hair: 1 
        };
    }

    /**
     * STATIC GENERATOR: The Anatomical Renderer.
     * 
     * GEOMETRY LOGIC (Based on 200px Height Container):
     * - Shirt: Large base (160px).
     * - Head: 100px, sitting at bottom:75px (Neck overlap).
     * - Eyes: Approx at bottom:115px.
     * - Hat: Sits at bottom:150px to cover forehead.
     */
    static generateAvatarHTML(visualDna, shirtName) {
        const dna = (typeof visualDna === 'string') ? JSON.parse(visualDna) : (visualDna || {});
        
        // Resolve Assets
        // Note: 'kit' comes as a Hex String from Color Picker now
        const kitColor  = dna.kit || '#3b82f6'; 
        const logoIcon  = AVATAR_CONFIG.LOGOS[(dna.logo || 1) - 1];
        const faceIcon  = AVATAR_CONFIG.FACE_GEAR[(dna.face || 1) - 1];
        const headIcon  = AVATAR_CONFIG.HEAD_GEAR[(dna.hair || 1) - 1];
        
        const skinColor = AVATAR_CONFIG.FIXED_SKIN;

        return `
            <div class="avatar-comp" style="
                position: relative; 
                width: 100%; 
                height: 100%; 
                display: flex; 
                justify-content: center; 
                align-items: flex-end;
                overflow: hidden; /* Clips bottom of shirt */
            ">
                
                <!-- 1. BODY (Head & Neck) -->
                <!-- Positioned to merge neck into shirt collar -->
                <i class="fa-solid fa-user" style="
                    font-size: 110px; 
                    color: ${skinColor}; 
                    position: absolute; 
                    bottom: 60px; 
                    z-index: 1;
                    filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));
                "></i>

                <!-- 2. FACE ACCESSORY -->
                <!-- Aligned with eye level -->
                ${faceIcon ? `
                <i class="fa-solid ${faceIcon}" style="
                    font-size: 45px;
                    color: #333;
                    position: absolute;
                    bottom: 112px; 
                    z-index: 2;
                    opacity: 0.9;
                "></i>
                ` : ''}

                <!-- 3. THE SHIRT (Base) -->
                <!-- Wide to create shoulders -->
                <i class="fa-solid fa-shirt" style="
                    font-size: 170px; 
                    color: ${kitColor}; 
                    position: absolute; 
                    bottom: -30px;
                    z-index: 3;
                    filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
                "></i>

                <!-- 4. CHEST LOGO (Badge) -->
                <!-- Centered on the chest area -->
                ${logoIcon ? `
                <i class="fa-solid ${logoIcon}" style="
                    font-size: 32px;
                    color: rgba(255,255,255,0.9); /* White Logo */
                    position: absolute;
                    bottom: 65px; 
                    z-index: 4;
                    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));
                "></i>
                ` : ''}

                <!-- 5. BRANDING (Name) -->
                <!-- Placed below the logo -->
                <div class="shirt-text" style="
                    position: absolute; 
                    bottom: 40px; 
                    z-index: 5;
                    color: rgba(255,255,255,0.8); 
                    font-family: 'Orbitron', sans-serif; 
                    font-size: 12px; 
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    pointer-events: none;
                ">
                    ${shirtName || 'NOUB'}
                </div>

                <!-- 6. HEADGEAR (Hair/Hat) -->
                <!-- Sits on top, overlapping forehead -->
                ${headIcon ? `
                <i class="fa-solid ${headIcon}" style="
                    font-size: 75px;
                    color: #fff; /* Most gear looks best white or secondary color */
                    text-shadow: 0 2px 5px rgba(0,0,0,0.5); /* Depth */
                    position: absolute;
                    bottom: 145px; 
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
