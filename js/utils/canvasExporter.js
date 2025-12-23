/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/canvasExporter.js
 * Version: Noub Sports_beta 2.5.0 (ENGINEERING & ACADEMIC RELEASE)
 * Status: Production Ready
 * 
 * MODULE DESCRIPTION:
 * A High-Fidelity Rendering Engine designed to rasterize the DOM-based Tactical Board
 * into a production-grade PNG image.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Geometry Projection: Converts CSS relative positioning (%) into absolute Canvas coordinates (px).
 * 2. Vector Drawing: Manually draws the pitch markings using 2D Context API (Rectangular Penalty Boxes).
 * 3. Asset Rendering: Reconstructs DOM elements (Tokens, Tools) with visual fidelity (Gradients, Shadows).
 * 4. Transformation Logic: Handles rotation matrices for directional arrows.
 * 
 * MATHEMATICAL MODEL:
 * - Canvas Resolution: 1000x1600 (High DPI for crisp text).
 * - Aspect Ratio: ~1:1.6 (Optimized for Mobile Screens).
 * - Coordinate Mapping: f(x) = (dom_x - offset) * scale_factor.
 */

export class CanvasExporter {

    /**
     * MAIN EXPORT METHOD
     * Captures the current state of the board and triggers a download.
     * 
     * @param {HTMLElement} container - The DOM element containing the pitch and tokens.
     * @param {string} filename - The desired output filename (default: noub-sports-tactic.png).
     */
    static exportBoard(container, filename = 'noub-sports-tactic.png') {
        
        // ---------------------------------------------------------
        // 1. INITIALIZATION & CONFIGURATION
        // ---------------------------------------------------------
        
        // Define High-Res Canvas Dimensions (Fixed Resolution)
        const width = 1000;
        const height = 1600; 
        
        // Create Off-screen Canvas instance
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // ---------------------------------------------------------
        // 2. LAYER 1: THE PITCH (BACKGROUND & TURF)
        // ---------------------------------------------------------
        
        // A. Base Turf Gradient (Simulating Night Match Lighting)
        // Linear Gradient from Top (#256b44) to Bottom (#1e5233)
        const turfGradient = ctx.createLinearGradient(0, 0, 0, height);
        turfGradient.addColorStop(0, "#256b44");
        turfGradient.addColorStop(1, "#1e5233");
        ctx.fillStyle = turfGradient;
        ctx.fillRect(0, 0, width, height);

        // B. Mowing Patterns (Stripes)
        // Adds aesthetic depth by drawing lighter bands every 80px
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)"; // 5% Opacity Black
        const stripeHeight = 80;
        for (let y = 0; y < height; y += stripeHeight * 2) {
            ctx.fillRect(0, y, width, stripeHeight);
        }

        // ---------------------------------------------------------
        // 3. LAYER 2: PITCH GEOMETRY (MARKINGS)
        // ---------------------------------------------------------
        // Settings for White Lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 6;
        ctx.lineCap = "round"; // Smoother line endings

        // Define Margins (Safe Area)
        const margin = 50; 
        const playWidth = width - (margin * 2);
        const playHeight = height - (margin * 2);

        // A. Touchlines (The Border)
        ctx.strokeRect(margin, margin, playWidth, playHeight);

        // B. Center Line & Circle
        // Midpoint calculation
        const midX = width / 2;
        const midY = height / 2;

        ctx.beginPath();
        ctx.moveTo(margin, midY);
        ctx.lineTo(width - margin, midY);
        ctx.stroke();

        // Center Circle (Radius 110px)
        ctx.beginPath();
        ctx.arc(midX, midY, 110, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Center Spot (Solid White)
        ctx.beginPath();
        ctx.arc(midX, midY, 10, 0, 2 * Math.PI);
        ctx.fillStyle = "#fff";
        ctx.fill();

        // C. Penalty Areas (RECTANGULAR GEOMETRY - As Requested)
        // Logic: Standard Box shape relative to canvas width
        const boxWidth = 600;  // 60% of width
        const boxHeight = 250; // Depth of the box
        
        // Top Penalty Box
        ctx.strokeRect((width - boxWidth) / 2, margin, boxWidth, boxHeight);
        
        // Bottom Penalty Box
        ctx.strokeRect((width - boxWidth) / 2, height - margin - boxHeight, boxWidth, boxHeight);

        // D. Penalty Spots (The Dot)
        const spotDistance = 200; // Distance from goal line
        
        // Top Spot
        ctx.beginPath(); 
        ctx.arc(midX, margin + spotDistance, 8, 0, 2 * Math.PI); 
        ctx.fill();
        
        // Bottom Spot
        ctx.beginPath(); 
        ctx.arc(midX, height - margin - spotDistance, 8, 0, 2 * Math.PI); 
        ctx.fill();

        // E. Corner Arcs
        const arcRadius = 30;
        // Top Left
        ctx.beginPath(); ctx.arc(margin, margin, arcRadius, 0, 0.5 * Math.PI); ctx.stroke();
        // Top Right
        ctx.beginPath(); ctx.arc(width - margin, margin, arcRadius, 0.5 * Math.PI, Math.PI); ctx.stroke();
        // Bottom Left
        ctx.beginPath(); ctx.arc(margin, height - margin, arcRadius, 1.5 * Math.PI, 0); ctx.stroke();
        // Bottom Right
        ctx.beginPath(); ctx.arc(width - margin, height - margin, arcRadius, Math.PI, 1.5 * Math.PI); ctx.stroke();

        // F. Goal Nets (Visual Projection)
        // Draws a trapezoid-like net extending OUTSIDE the pitch
        ctx.save(); // Save state to change styles locally
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        const goalWidth = 240;
        const netDepth = 40;

        // Helper function to draw net mesh
        const drawNet = (x, y, w, h) => {
            ctx.strokeRect(x, y, w, h);
            // Crosshatch effect for realism
            ctx.fillStyle = "rgba(255,255,255,0.05)";
            ctx.fillRect(x, y, w, h);
        };

        // Top Net
        drawNet((width - goalWidth) / 2, margin - netDepth, goalWidth, netDepth);
        // Bottom Net
        drawNet((width - goalWidth) / 2, height - margin, goalWidth, netDepth);
        ctx.restore(); // Restore main style

        // ---------------------------------------------------------
        // 4. LAYER 3: ENTITY RENDERING (PLAYERS & TOOLS)
        // ---------------------------------------------------------
        
        // Calculate Scaling Factors
        // Used to map the smaller DOM screen coordinates to the High-Res Canvas
        const rect = container.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        
        // Query all interactive elements
        const items = container.querySelectorAll('.draggable-item');

        items.forEach(el => {
            // Get Absolute Position relative to Container
            const r = el.getBoundingClientRect();
            
            // Mathematical Projection:
            // CanvasX = (DOM_Left - Container_Left + Half_Width) * Scale
            const cx = (r.left - rect.left + r.width / 2) * scaleX;
            const cy = (r.top - rect.top + r.height / 2) * scaleY;

            // --- CASE A: PLAYER TOKENS ---
            if (el.classList.contains('tactic-token')) {
                const isGold = el.classList.contains('token-gold');
                const isGK = el.classList.contains('is-gk');
                const radius = 40; // Scaled up size
                
                // 1. Draw Body (3D Sphere Gradient)
                const grad = ctx.createRadialGradient(cx - 10, cy - 10, 5, cx, cy, radius);
                if (isGold) {
                    grad.addColorStop(0, "#ffd700"); // Highlight
                    grad.addColorStop(1, "#b8860b"); // Shadow
                } else {
                    grad.addColorStop(0, "#ff6b6b");
                    grad.addColorStop(1, "#cc0000");
                }
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
                ctx.fill();

                // 2. Draw Border (Thicker for GK)
                ctx.strokeStyle = isGK ? "#000000" : "#ffffff";
                ctx.lineWidth = isGK ? 8 : 4;
                ctx.stroke();

                // 3. Draw Text (Jersey Number)
                ctx.fillStyle = isGold ? "#332200" : "#ffffff";
                ctx.font = "900 35px Arial"; // Heavy Font
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(el.innerText, cx, cy + 4); // +4px optical adjustment
            }
            
            // --- CASE B: BALL TOOL ---
            else if (el.classList.contains('tool-ball')) {
                // Realistic Ball Gradient
                const ballGrad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, 22);
                ballGrad.addColorStop(0, "#ffffff");
                ballGrad.addColorStop(0.4, "#dddddd");
                ballGrad.addColorStop(1, "#111111");
                
                ctx.fillStyle = ballGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, 22, 0, 2 * Math.PI); // Ball Radius 22px
                ctx.fill();
                
                // Drop Shadow
                ctx.shadowColor = "rgba(0,0,0,0.5)";
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 5;
                ctx.stroke();
                ctx.shadowColor = "transparent"; // Reset
            }
            
            // --- CASE C: CONE TOOL ---
            else if (el.classList.contains('tool-cone')) {
                ctx.fillStyle = "#ff9100"; // Safety Orange
                ctx.beginPath();
                ctx.moveTo(cx, cy - 25);     // Top Point
                ctx.lineTo(cx + 25, cy + 25); // Bottom Right
                ctx.lineTo(cx - 25, cy + 25); // Bottom Left
                ctx.closePath();
                ctx.fill();
                
                // Cone Base
                ctx.fillStyle = "#cc7400"; // Darker Orange
                ctx.fillRect(cx - 30, cy + 25, 60, 8);
            }
            
            // --- CASE D: ARROW TOOL (ROTATABLE) ---
            else if (el.classList.contains('tool-arrow')) {
                // Retrieve rotation value from DOM dataset
                const rotationDeg = parseFloat(el.dataset.rotation || 0);
                const angleRad = rotationDeg * Math.PI / 180;
                
                ctx.save(); // Isolate transformation state
                
                // 1. Move Context to Arrow Center
                ctx.translate(cx, cy);
                // 2. Rotate Context
                ctx.rotate(angleRad);
                
                // 3. Draw Arrow Shape (Relative to 0,0)
                ctx.fillStyle = "#ffffff";
                ctx.shadowColor = "rgba(0,0,0,0.5)"; 
                ctx.shadowBlur = 6;
                
                // Shaft
                ctx.fillRect(-45, -6, 60, 12); // Length 60, Thickness 12
                
                // Head (Triangle)
                ctx.beginPath();
                ctx.moveTo(15, -18); // Top point relative to shaft end
                ctx.lineTo(55, 0);   // Tip
                ctx.lineTo(15, 18);  // Bottom point
                ctx.fill();
                
                ctx.restore(); // Reset transformation for next item
            }
        });

        // ---------------------------------------------------------
        // 5. LAYER 4: BRANDING (WATERMARK)
        // ---------------------------------------------------------
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; // 50% Opacity White
        ctx.font = "900 40px Arial"; // Bold Impact Font
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        
        // Correct Branding as requested
        ctx.fillText("NOUB SPORTS", width - 40, height - 40); 
        ctx.restore();

        // ---------------------------------------------------------
        // 6. EXPORT LOGIC
        // ---------------------------------------------------------
        
        // Convert Canvas to Data URL (PNG format)
        const dataUrl = canvas.toDataURL("image/png");

        // Create virtual link to trigger download
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        
        // Programmatic click
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
