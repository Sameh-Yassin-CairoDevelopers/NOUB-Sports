/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/canvasExporter.js
 * Version: 1.0.0 (NATIVE ENGINE)
 * Description: Generates an Image snapshot of the Tactics Board.
 * 
 * LOGIC:
 * Instead of taking a screenshot, it reconstructs the scene on a hidden HTML5 Canvas
 * based on the coordinate data of the tokens. This ensures high-res output.
 */

export class CanvasExporter {

    /**
     * Captures the current state of the board and downloads an image.
     * @param {HTMLElement} container - The board container.
     * @param {NodeList} tokens - The player tokens.
     * @param {string} filename - Output name.
     */
    static exportBoard(container, tokens, filename = 'noub-tactic.png') {
        const width = 600; // Fixed High-Res Width
        const height = 900; // Fixed High-Res Height
        
        // 1. Create Off-screen Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 2. Draw Pitch (Green Background)
        // Gradient Turf
        const grd = ctx.createLinearGradient(0, 0, 0, height);
        grd.addColorStop(0, "#2c6e49");
        grd.addColorStop(1, "#1b4d3e");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);

        // 3. Draw Markings (White Lines)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 3;
        
        // Center Line
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Center Circle
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 80, 0, 2 * Math.PI);
        ctx.stroke();

        // Penalty Areas
        ctx.strokeRect(width / 4, 0, width / 2, 100);
        ctx.strokeRect(width / 4, height - 100, width / 2, 100);

        // 4. Draw Tokens (Players)
        // Need to map DOM coordinates to Canvas coordinates
        const rect = container.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;

        tokens.forEach(token => {
            const tRect = token.getBoundingClientRect();
            // Calculate relative position center
            const x = (tRect.left - rect.left + tRect.width/2) * scaleX;
            const y = (tRect.top - rect.top + tRect.height/2) * scaleY;
            const label = token.innerText;
            const color = window.getComputedStyle(token).backgroundColor;

            // Draw Token Circle
            ctx.beginPath();
            ctx.arc(x, y, 25, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#fff";
            ctx.stroke();

            // Draw Number/Label
            ctx.fillStyle = "#fff";
            ctx.font = "bold 20px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, x, y);
        });

        // 5. Branding (Watermark)
        ctx.fillStyle = "rgba(212, 175, 55, 0.5)";
        ctx.font = "bold 30px Arial";
        ctx.fillText("NOUB SPORTS", width - 120, height - 30);

        // 6. Download
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }
}