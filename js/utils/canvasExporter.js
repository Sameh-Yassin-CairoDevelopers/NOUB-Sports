/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/canvasExporter.js
 * Version: Noub Sports_beta 2.0.0 (HIGH FIDELITY RENDER)
 * Status: Production Ready
 * 
 * DESCRIPTION:
 * Renders the Tactical Board state into a High-Res PNG.
 * Converts CSS styling into Canvas API draw commands.
 * Handles: Pitch Geometry, Player Tokens, and Tools (Cones/Balls).
 */

export class CanvasExporter {

    /**
     * Master Render Function
     * @param {HTMLElement} container - The Pitch DOM
     * @param {NodeList} tokens - Player Elements
     * @param {NodeList} tools - Tool Elements (Cones/Balls)
     * @param {string} filename
     */
    static exportBoard(container, tokens, tools, filename = 'noub-pro-tactic.png') {
        const width = 1000;
        const height = 1600; // Aspect Ratio ~ 2:3.2
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // --- LAYER 1: PITCH BASE ---
        
        // 1. Grass Gradient
        const grd = ctx.createLinearGradient(0, 0, 0, height);
        grd.addColorStop(0, "#256b44");
        grd.addColorStop(1, "#1e5233");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);

        // 2. Stripes Pattern
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        const stripeH = 100;
        for (let y = 0; y < height; y += stripeH * 2) {
            ctx.fillRect(0, y, width, stripeH);
        }

        // --- LAYER 2: PRO MARKINGS (White Lines) ---
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";

        const margin = 50;
        const wPlay = width - (margin * 2);
        const hPlay = height - (margin * 2);

        // A. Touchlines (Border)
        ctx.strokeRect(margin, margin, wPlay, hPlay);

        // B. Center Line
        ctx.beginPath();
        ctx.moveTo(margin, height / 2);
        ctx.lineTo(width - margin, height / 2);
        ctx.stroke();

        // C. Center Circle
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 120, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Center Spot
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 8, 0, 2 * Math.PI);
        ctx.fill();

        // D. Penalty Areas (Semi-Circles / Arcs)
        const boxRadius = 200; // Scaled for canvas
        
        // Top Box
        ctx.beginPath();
        ctx.arc(width / 2, margin, boxRadius, 0, Math.PI); // Half circle down
        ctx.stroke();
        
        // Bottom Box
        ctx.beginPath();
        ctx.arc(width / 2, height - margin, boxRadius, Math.PI, 0); // Half circle up
        ctx.stroke();

        // E. Penalty Spots
        const spotDist = 180;
        // Top Spot
        ctx.beginPath(); ctx.arc(width / 2, margin + spotDist, 6, 0, 2*Math.PI); ctx.fill();
        // Bottom Spot
        ctx.beginPath(); ctx.arc(width / 2, height - margin - spotDist, 6, 0, 2*Math.PI); ctx.fill();

        // F. Corner Arcs
        const cornerR = 30;
        ctx.beginPath(); ctx.arc(margin, margin, cornerR, 0, 0.5*Math.PI); ctx.stroke(); // TL
        ctx.beginPath(); ctx.arc(width-margin, margin, cornerR, 0.5*Math.PI, Math.PI); ctx.stroke(); // TR
        ctx.beginPath(); ctx.arc(margin, height-margin, cornerR, 1.5*Math.PI, 0); ctx.stroke(); // BL
        ctx.beginPath(); ctx.arc(width-margin, height-margin, cornerR, Math.PI, 1.5*Math.PI); ctx.stroke(); // BR


        // --- LAYER 3: GOAL NETS ---
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 2;
        const goalW = 220; 
        const goalD = 60;
        
        // Draw Net Pattern (Crosshatch)
        const drawNet = (x, y, w, h) => {
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.strokeRect(x, y, w, h);
            ctx.fillRect(x, y, w, h);
            // Mesh lines could be added here loop, simplified for speed
        };
        
        // Top Goal
        drawNet((width - goalW)/2, margin - goalD, goalW, goalD);
        // Bottom Goal
        drawNet((width - goalW)/2, height - margin, goalW, goalD);
        ctx.restore();


        // --- LAYER 4: ASSETS (Players & Tools) ---
        
        // Helper to map DOM coordinates to Canvas
        const rect = container.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;

        // A. Draw Tools (Cones & Balls)
        if (tools) {
            tools.forEach(tool => {
                const tRect = tool.getBoundingClientRect();
                const x = (tRect.left - rect.left + tRect.width/2) * scaleX;
                const y = (tRect.top - rect.top + tRect.height/2) * scaleY;
                
                if (tool.classList.contains('tool-cone')) {
                    // Draw Triangle
                    ctx.fillStyle = "#ff9100";
                    ctx.beginPath();
                    ctx.moveTo(x, y - 25);
                    ctx.lineTo(x + 20, y + 20);
                    ctx.lineTo(x - 20, y + 20);
                    ctx.closePath();
                    ctx.fill();
                    // Base
                    ctx.fillStyle = "#cc7400";
                    ctx.fillRect(x - 25, y + 20, 50, 6);
                } 
                else if (tool.classList.contains('tool-ball')) {
                    // Draw Ball
                    const grad = ctx.createRadialGradient(x-5, y-5, 2, x, y, 18);
                    grad.addColorStop(0, "#fff");
                    grad.addColorStop(1, "#333");
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(x, y, 18, 0, 2*Math.PI);
                    ctx.fill();
                }
            });
        }

        // B. Draw Players
        if (tokens) {
            tokens.forEach(token => {
                const tRect = token.getBoundingClientRect();
                const x = (tRect.left - rect.left + tRect.width / 2) * scaleX;
                const y = (tRect.top - rect.top + tRect.height / 2) * scaleY;
                const isGold = token.classList.contains('token-gold');
                const isGK = token.classList.contains('is-gk');

                // Token Gradient
                const radius = 35;
                const tokenGrad = ctx.createRadialGradient(x - 10, y - 10, 5, x, y, radius);
                if (isGold) {
                    tokenGrad.addColorStop(0, "#ffd700");
                    tokenGrad.addColorStop(1, "#b8860b");
                    ctx.fillStyle = tokenGrad;
                } else {
                    tokenGrad.addColorStop(0, "#ff6b6b");
                    tokenGrad.addColorStop(1, "#cc0000");
                    ctx.fillStyle = tokenGrad;
                }

                // Body
                ctx.beginPath(); ctx.arc(x, y, radius, 0, 2 * Math.PI); ctx.fill();
                
                // Border
                ctx.strokeStyle = isGK ? "#000" : "#fff";
                ctx.lineWidth = isGK ? 6 : 4;
                ctx.stroke();

                // Number
                ctx.fillStyle = isGold ? "#332200" : "#ffffff";
                ctx.font = "900 30px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(token.innerText, x, y + 3);
            });
        }

        // --- LAYER 5: BRANDING ---
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "bold 30px Arial";
        ctx.textAlign = "right";
        ctx.fillText("NOUB TACTICS", width - 30, height - 30);

        // Export
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }
}
