/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/cvGenerator.js
 * Version: 1.1.0 (SECURITY FIX)
 * Description: Generates CV Image.
 * FIX: Handles CORS issues to prevent 'Tainted Canvas' errors.
 */

export class CVGenerator {

    static async downloadCV(elementId, filename = 'noub-scout-report.png') {
        const element = document.getElementById(elementId);
        
        if (!element) {
            console.error("CV Error: Source element not found.");
            return;
        }

        // 1. Get Dimensions & Clone
        const rect = element.getBoundingClientRect();
        const width = rect.width + 60;
        const height = rect.height + 120;

        const clone = element.cloneNode(true);
        clone.style.margin = '30px auto'; 
        clone.style.transform = 'none'; 
        clone.style.boxShadow = '0 0 0 5px #D4AF37'; 
        clone.style.borderRadius = '24px';
        
        const overlay = clone.querySelector('.card-actions-overlay');
        if(overlay) overlay.remove();

        const htmlContent = new XMLSerializer().serializeToString(clone);

        const svgData = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
                <foreignObject width="100%" height="100%">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="background-color:#0f1014; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; padding-top:10px; font-family: sans-serif;">
                        <style>
                            .player-card { position: relative; color: white; background: #111; overflow: hidden; border-radius: 20px; border: 2px solid #D4AF37; }
                            .card-top { position: absolute; top: 20px; left: 20px; text-align: center; }
                            .card-rating { font-size: 40px; font-weight: 900; color: white; }
                            .card-pos { font-size: 16px; color: #D4AF37; font-weight: bold; }
                            .player-name { font-size: 26px; color: #D4AF37; text-align: center; text-transform: uppercase; margin-top: 250px; }
                            .card-info { position: absolute; bottom: 0; width: 100%; height: 160px; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 20px; }
                            .card-stats-grid { display: grid; grid-template-columns: 1fr 1fr; width: 80%; margin: 0 auto; gap: 5px 20px; font-size: 14px; }
                            .stat-box { display: flex; justify-content: space-between; color: white; font-weight: bold; }
                            .stat-box span { color: #f3cf55; }
                            i { display: inline-block; font-family: "Font Awesome 6 Free"; font-weight: 900; }
                        </style>
                        ${htmlContent}
                        <div style="margin-top:25px; color:#666; font-size:14px; font-weight:bold; letter-spacing:2px;">NOUB OFFICIAL REPORT</div>
                    </div>
                </foreignObject>
            </svg>
        `;

        const img = new Image();
        // CRITICAL FIX: Allow cross-origin images
        img.crossOrigin = "anonymous"; 
        
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = "#0f1014";
            ctx.fillRect(0, 0, width, height);
            
            try {
                ctx.drawImage(img, 0, 0);
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (err) {
                console.error("Canvas Export Error:", err);
                alert("فشل حفظ الصورة بسبب قيود المتصفح الأمنية. يرجى أخذ 'Screenshot' يدوياً.");
            }
            
            URL.revokeObjectURL(url);
        };

        img.src = url;
    }
}
