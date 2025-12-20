/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/cvGenerator.js
 * Version: 1.0.0 (NATIVE SNAPSHOT)
 * Description: Generates a High-Res Image of the Player Card.
 * 
 * TECHNIQUE:
 * Uses SVG <foreignObject> to serialize the DOM element into an image.
 * This allows us to "screenshot" the HTML/CSS card without external libraries.
 */

export class CVGenerator {

    /**
     * Generates and downloads the CV Image.
     * @param {string} elementId - The ID of the container to capture (e.g. 'my-player-card').
     * @param {string} filename - Output name.
     */
    static async downloadCV(elementId, filename = 'noub-scout-report.png') {
        const element = document.getElementById(elementId);
        
        if (!element) {
            console.error("CV Error: Element not found.");
            return;
        }

        // 1. Get Dimensions
        const rect = element.getBoundingClientRect();
        const width = rect.width + 40; // Add padding
        const height = rect.height + 100; // Add space for footer branding

        // 2. Clone the element to manipulate styles safely
        const clone = element.cloneNode(true);
        clone.style.margin = '20px'; // Center it
        clone.style.transform = 'none'; // Remove 3D tilt for flat print
        clone.style.boxShadow = '0 0 0 2px #D4AF37'; // Simplify shadow for print

        // 3. Serialize HTML to XML
        const htmlContent = new XMLSerializer().serializeToString(clone);

        // 4. Construct SVG Image with foreignObject
        // We embed the HTML/CSS inside an SVG container
        const svgData = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
                <foreignObject width="100%" height="100%">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="background-color:#0f1014; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; padding-top:20px; font-family: sans-serif;">
                        <style>
                            /* Critical: Embed basic CSS rules here to ensure look consistency */
                            .player-card { border-radius: 20px; overflow: hidden; position: relative; color: white; background: #111; border: 2px solid #D4AF37; }
                            .card-top { position: absolute; top: 20px; left: 20px; text-align: center; }
                            .card-rating { font-size: 40px; font-weight: bold; color: white; }
                            .card-pos { font-size: 16px; color: #D4AF37; font-weight: bold; }
                            .player-name { font-size: 24px; color: #D4AF37; text-align: center; text-transform: uppercase; margin-top: 250px; }
                            .stat-box { display: flex; justify-content: space-between; width: 200px; color: white; font-size: 12px; margin: 2px auto; }
                            /* Note: External images (Avatar) might need base64 conversion for strict security, 
                               but for MVP local/blob urls often work in modern browsers. */
                        </style>
                        ${htmlContent}
                        <div style="margin-top:20px; color:#666; font-size:12px; font-weight:bold;">
                            NOUB OFFICIAL SCOUT REPORT
                        </div>
                    </div>
                </foreignObject>
            </svg>
        `;

        // 5. Create Canvas and Draw
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // Draw background
            ctx.fillStyle = "#0f1014";
            ctx.fillRect(0, 0, width, height);
            
            // Draw SVG
            ctx.drawImage(img, 0, 0);
            
            // Download
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // Cleanup
            URL.revokeObjectURL(url);
        };

        img.src = url;
    }
}