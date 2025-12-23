/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/tacticsCtrl.js
 * Version: Noub Sports_beta 2.0.0 (PRO LOGIC)
 * Status: Production Ready
 * 
 * ARCHITECTURE:
 * - Physics Engine: Handles drag/drop coordinates relative to pitch.
 * - Asset Factory: Spawns DOM elements (Tokens, Cones, Balls).
 * - Formation Engine: Calculates percentage-based positions for players.
 * - Collision System: Detects interactions with "Trash Zone".
 */

import { CanvasExporter } from '../utils/canvasExporter.js';
import { SoundManager } from '../utils/soundManager.js';

export class TacticsController {
    
    constructor() {
        this.viewContainer = document.getElementById('view-tactics');
        this.field = document.getElementById('tactics-field');
        this.currentMode = 5; // 5 vs 5
        
        // Formations Database (Percentage Coordinates: [x, y])
        // Y starts from bottom (0%) to top (100%)
        this.formations = {
            '2-2':   [[50, 5], [30, 25], [70, 25], [30, 60], [70, 60]],      // Box
            '1-2-1': [[50, 5], [50, 25], [20, 50], [80, 50], [50, 75]],      // Diamond
            '1-1-2': [[50, 5], [50, 30], [50, 50], [30, 80], [70, 80]],      // Pyramid
            '3-1':   [[50, 5], [20, 25], [50, 25], [80, 25], [50, 65]]       // Wall
        };

        this.bindControls();
    }

    init() {
        console.log("♟️ Tactics Pro: Initialized.");
        this.viewContainer.classList.remove('hidden');
        this.renderBoardLayout();
        
        // Build Toolbox UI dynamically if missing
        if(!document.getElementById('tactics-toolbox')) {
            this.injectToolbox();
        }
    }

    /**
     * INJECTION: Adds Sidebar Tools & Trash Zone
     */
    injectToolbox() {
        // 1. Toolbox
        const toolbox = document.createElement('div');
        toolbox.id = 'tactics-toolbox';
        toolbox.className = 'tactics-toolbox';
        toolbox.innerHTML = `
            <button class="tool-btn" data-tool="ball" title="كرة"><i class="fa-solid fa-futbol"></i></button>
            <button class="tool-btn" data-tool="cone" title="قمع"><i class="fa-solid fa-triangle-exclamation"></i></button>
        `;
        this.viewContainer.querySelector('.tactics-wrapper').appendChild(toolbox);

        // Bind Events
        toolbox.querySelectorAll('.tool-btn').forEach(btn => {
            btn.onclick = () => this.spawnTool(btn.dataset.tool);
        });

        // 2. Trash Zone
        const trash = document.createElement('div');
        trash.id = 'trash-zone';
        trash.className = 'trash-zone';
        trash.innerHTML = `<i class="fa-solid fa-trash"></i> حذف`;
        this.field.appendChild(trash); // Append to field for relative positioning check
        
        // 3. Formation Selector (Inject into Header)
        const header = this.viewContainer.querySelector('.tactics-top-bar');
        const select = document.createElement('select');
        select.className = 'formation-select';
        select.innerHTML = `
            <option value="2-2">تشكيلة 2-2</option>
            <option value="1-2-1">تشكيلة 1-2-1</option>
            <option value="1-1-2">تشكيلة 1-1-2</option>
            <option value="3-1">تشكيلة 3-1</option>
        `;
        select.onchange = (e) => this.applyFormation(e.target.value);
        header.insertBefore(select, header.children[1]); // Insert middle
    }

    bindControls() {
        // Close
        document.getElementById('btn-close-tactics').onclick = () => {
            this.viewContainer.classList.add('hidden');
        };

        // Reset
        document.getElementById('btn-reset-tactic').onclick = () => {
            SoundManager.play('click');
            this.renderBoardLayout();
        };

        // Export High-Fidelity Image
        document.getElementById('btn-save-tactic').onclick = () => {
            const tokens = this.field.querySelectorAll('.tactic-token');
            const tools = this.field.querySelectorAll('.tactic-tool'); // Balls/Cones
            const filename = `noub-strategy-${Date.now()}.png`;
            
            // Call the Pro Exporter
            CanvasExporter.exportBoard(this.field, tokens, tools, filename);
            SoundManager.play('success');
        };

        // Mode Switch (5 vs 7)
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentMode = parseInt(e.target.dataset.mode);
                this.renderBoardLayout();
            };
        });
    }

    /**
     * RENDERING: Draws Geometry & Resets Tokens
     */
    renderBoardLayout() {
        this.field.innerHTML = ''; // Wipe

        // 1. Static Geometry (CSS handles specific shapes)
        this.field.innerHTML = `
            <div class="goal-net top"></div>
            <div class="goal-net bottom"></div>
            <div class="pitch-line center-line"></div>
            <div class="pitch-circle"></div>
            <div class="pitch-spot-center"></div>
            
            <div class="penalty-area top"></div>
            <div class="penalty-spot top"></div>
            
            <div class="penalty-area bottom"></div>
            <div class="penalty-spot bottom"></div>

            <div class="corner-arc tl"></div><div class="corner-arc tr"></div>
            <div class="corner-arc bl"></div><div class="corner-arc br"></div>
            
            <!-- Re-inject Trash (as it was wiped) -->
            <div id="trash-zone" class="trash-zone"><i class="fa-solid fa-trash"></i> حذف</div>
        `;

        // 2. Spawn Players (Default Formation 2-2 Logic)
        this.applyFormation('2-2'); 
        // Note: For opponent (Red), we just spawn them mirrored or simple line
        this.spawnOpponents(this.currentMode);
    }

    /**
     * LOGIC: Position Players based on Preset
     */
    applyFormation(fmtName) {
        // Clear existing MY players
        this.field.querySelectorAll('.token-gold').forEach(e => e.remove());

        const coords = this.formations[fmtName] || this.formations['2-2'];
        
        coords.forEach((pos, index) => {
            const token = this.createToken(index + 1, 'MY_TEAM');
            // Convert % to Style
            token.style.left = `${pos[0]}%`;
            token.style.bottom = `${pos[1]}%`;
            this.field.appendChild(token);
        });
    }

    spawnOpponents(count) {
        this.field.querySelectorAll('.token-red').forEach(e => e.remove());
        
        // Simple 1-2-1 Mirror for Opponent
        const positions = [[50, 95], [30, 75], [70, 75], [50, 60], [50, 40]]; // Top down
        
        for(let i=0; i<count; i++) {
            const pos = positions[i] || [10 + (i*15), 90]; // Fallback line
            const token = this.createToken(i+1, 'OPPONENT');
            token.style.left = `${pos[0]}%`;
            token.style.bottom = `${pos[1]}%`;
            this.field.appendChild(token);
        }
    }

    createToken(num, type) {
        const token = document.createElement('div');
        token.className = `tactic-token ${type === 'MY_TEAM' ? 'token-gold' : 'token-red'}`;
        token.textContent = num;
        if(num === 1) token.classList.add('is-gk');
        this.enableDrag(token);
        return token;
    }

    /**
     * FACTORY: Spawn Objects (Cones/Balls)
     */
    spawnTool(type) {
        SoundManager.play('click');
        const tool = document.createElement('div');
        tool.className = `tactic-tool tool-${type}`; // matches CSS
        
        // Random Position near center
        tool.style.left = `${45 + Math.random()*10}%`;
        tool.style.top = `${45 + Math.random()*10}%`;
        
        this.field.appendChild(tool);
        this.enableDrag(tool);
    }

    /**
     * PHYSICS: Drag & Drop + Collision with Trash
     */
    enableDrag(el) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        const trash = document.getElementById('trash-zone');

        const start = (e) => {
            isDragging = true;
            el.classList.add('is-dragging');
            if(trash) trash.classList.add('active');
            
            // Coordinates normalization
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            // Switch to absolute pixels for smooth dragging
            const rect = el.getBoundingClientRect();
            const parent = this.field.getBoundingClientRect();
            
            startLeft = rect.left - parent.left;
            startTop = rect.top - parent.top;
            startX = clientX; 
            startY = clientY;
            
            // Fix position
            el.style.bottom = 'auto'; el.style.right = 'auto';
            el.style.left = `${startLeft}px`; el.style.top = `${startTop}px`;
        };

        const move = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;
            
            el.style.left = `${startLeft + dx}px`;
            el.style.top = `${startTop + dy}px`;

            // Collision Check with Trash
            if(trash) {
                const r1 = el.getBoundingClientRect();
                const r2 = trash.getBoundingClientRect();
                const overlap = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
                
                if(overlap) trash.classList.add('highlight');
                else trash.classList.remove('highlight');
            }
        };

        const end = () => {
            if(!isDragging) return;
            isDragging = false;
            el.classList.remove('is-dragging');
            
            if(trash) {
                // Final Collision Check for Delete
                if(trash.classList.contains('highlight')) {
                    SoundManager.play('click'); // Delete sound
                    el.remove();
                }
                trash.classList.remove('active', 'highlight');
            }
        };

        el.addEventListener('mousedown', start);
        el.addEventListener('touchstart', start, {passive: false});
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move, {passive: false});
        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    }
}
