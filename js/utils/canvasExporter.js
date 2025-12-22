/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/canvasExporter.js
 * Version: Noub Sports_beta 0.0.9 (HIGH FIDELITY EXPORT)
 * Status: Production Ready
 * 
 * DESCRIPTION:
 * A specialized rendering engine that reconstructs the DOM Board into a PNG image.
 * 
 * UPGRADES:
 * 1. High-DPI Rendering: Ensures crisp text and lines.
 * 2. True 3D Tokens: Manually paints Radial Gradients for Gold/Red coins (matching CSS).
 * 3. Branding: Adds the 'NOUB SPORTS' watermark.
 */

export class CanvasExporter {

    /**
     * Captures the current state of the board and downloads an image.
     * 
     * @param {HTMLElement} container - The board container element (The Pitch).
     * @param {NodeList} tokens - The list of player token elements.
     * @param {string} filename - The output filename.
     */
    static exportBoard(container, tokens, filename = 'noub-tactic.png') {
        // 1. Define High-Res Canvas Dimensions
        const width = 800;
        const height = 1200; // Portrait Aspect Ratio for Mobile Sharing
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // ============================
        // A. DRAW THE PITCH
        // ============================
        
        // 1. Green Turf Gradient
        const grd = ctx.createLinearGradient(0, 0, 0, height);
        grd.addColorStop(0, "#2e7d52");
        grd.addColorStop(1, "#1e5233");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);

        // 2. Pitch Patterns (Stripes)
        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        const stripeHeight = 60;
        for (let y = 0; y < height; y += stripeHeight * 2) {
            ctx.fillRect(0, y, width, stripeHeight);
        }

        // 3. Pitch Markings (White Lines)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 4;
        
        // Border
        ctx.strokeRect(20, 20, width - 40, height - 40);

        // Center Line
        ctx.beginPath();
        ctx.moveTo(20, height / 2);
        ctx.lineTo(width - 20, height / 2);
        ctx.stroke();

        // Center Circle
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 100, 0, 2 * Math.PI);
        ctx.stroke();

        // Penalty Areas (Goals)
        const boxWidth = width * 0.5;
        const boxHeight = height * 0.15;
        
        // Top Box
        ctx.strokeRect((width - boxWidth) / 2, 20, boxWidth, boxHeight);
        // Bottom Box
        ctx.strokeRect((width - boxWidth) / 2, height - 20 - boxHeight, boxWidth, boxHeight);


        // ============================
        // B. DRAW TOKENS (PLAYERS)
        // ============================
        
        // Calculate Scaling Factors to map DOM positions to Canvas pixels
        const rect = container.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;

        tokens.forEach(token => {
            const tRect = token.getBoundingClientRect();
            
            // Calculate Center Position relative to the canvas
            // Formula: (TokenAbsLeft - ContainerAbsLeft + HalfTokenWidth) * Scale
            const x = (tRect.left - rect.left + tRect.width / 2) * scaleX;
            const y = (tRect.top - rect.top + tRect.height / 2) * scaleY;
            
            // Determine Team Color (Gold vs Red) based on class
            const isGold = token.classList.contains('token-gold');
            const isGK = token.classList.contains('is-gk');
            
            // 1. Draw 3D Coin Gradient
            const radius = 30; // Bigger on canvas for clarity
            const tokenGrad = ctx.createRadialGradient(x - 10, y - 10, 5, x, y, radius);
            
            if (isGold) {
                tokenGrad.addColorStop(0, "#ffd700"); // Highlight
                tokenGrad.addColorStop(1, "#b8860b"); // Shadow
                ctx.fillStyle = tokenGrad;
                ctx.strokeStyle = "#ffffff";
            } else {
                // Red Team
                tokenGrad.addColorStop(0, "#ff6b6b");
                tokenGrad.addColorStop(1, "#cc0000");
                ctx.fillStyle = tokenGrad;
                ctx.strokeStyle = "#ffffff";
            }

            // Draw Circle
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw Border (Thicker for GK)
            ctx.lineWidth = isGK ? 5 : 3;
            if (isGK) ctx.strokeStyle = "#000000"; // GK Black Rim
            ctx.stroke();

            // 2. Draw Number
            ctx.fillStyle = isGold ? "#332200" : "#ffffff";
            ctx.font = "900 24px Arial"; // Bold font
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(token.innerText, x, y + 2); // Slight Y adjustment for optical center
        });


        // ============================
        // C. BRANDING (WATERMARK)
        // ============================
        ctx.save();
        ctx.fillStyle = "rgba(212, 175, 55, 0.4)";
        ctx.font = "900 40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("NOUB SPORTS", width / 2, height - 60);
        ctx.restore();

        // ============================
        // D. EXPORT
        // ============================
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }
}
