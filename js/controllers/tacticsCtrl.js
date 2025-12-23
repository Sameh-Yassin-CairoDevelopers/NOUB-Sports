/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/tacticsCtrl.js
 * Version: Noub Sports_beta 2.5.0 (DRAFTING TABLE LOGIC)
 * Status: Production Ready
 * 
 * LOGIC UPDATES:
 * - Top Toolbar Architecture.
 * - Selection State Machine (Select -> Delete/Rotate).
 * - Arrow Rotation Logic (45 deg increments).
 */

import { CanvasExporter } from '../utils/canvasExporter.js';
import { SoundManager } from '../utils/soundManager.js';

export class TacticsController {
    
    constructor() {
        this.viewContainer = document.getElementById('view-tactics');
        this.field = null; // Will define in init
        this.currentMode = 5; 
        this.selectedElement = null; // The currently active item
        
        // Formations (Percentage [x, y])
        this.formations = {
            '2-2':   [[50, 8], [25, 30], [75, 30], [25, 70], [75, 70]],
            '1-2-1': [[50, 8], [50, 30], [20, 50], [80, 50], [50, 80]],
            '3-1':   [[50, 8], [20, 30], [50, 30], [80, 30], [50, 75]]
        };
    }

    init() {
        console.log("♟️ Tactics Engine: Drafting Mode Active.");
        this.viewContainer.classList.remove('hidden');
        
        // 1. Inject The New Layout (Toolbar + Pitch)
        this.renderInterface();

        // 2. Bind Pitch Logic
        this.field = document.getElementById('tactics-field');
        this.renderBoardContent();

        // 3. Global Deselect Listener (Clicking background clears selection)
        this.field.addEventListener('mousedown', (e) => {
            if(e.target === this.field) this.deselectAll();
        });
        this.field.addEventListener('touchstart', (e) => {
            if(e.target === this.field) this.deselectAll();
        });
    }

    /**
     * UI: Builds the Top Toolbar and Empty Pitch Wrapper
     */
    renderInterface() {
        this.viewContainer.innerHTML = `
            <div class="tactics-wrapper">
                
                <!-- TOP TOOLBAR -->
                <div class="tactics-toolbar-container">
                    
                    <!-- Group 1: Formations & Modes -->
                    <div class="toolbar-group">
                        <button class="btn-close-board" id="btn-close-board"><i class="fa-solid fa-xmark"></i></button>
                        <select id="formation-select" style="background:#222; color:#fff; border:1px solid #444; border-radius:6px; padding:5px; font-size:0.8rem;">
                            <option value="2-2">2-2</option>
                            <option value="1-2-1">1-2-1</option>
                            <option value="3-1">3-1</option>
                        </select>
                        <button class="tool-btn active" id="btn-mode-5">5</button>
                        <button class="tool-btn" id="btn-mode-7">7</button>
                    </div>

                    <!-- Group 2: Tools (Center) -->
                    <div class="toolbar-group">
                        <button class="tool-btn" id="btn-add-ball" title="كرة"><i class="fa-solid fa-futbol"></i></button>
                        <button class="tool-btn" id="btn-add-cone" title="قمع"><i class="fa-solid fa-triangle-exclamation"></i></button>
                        <button class="tool-btn" id="btn-add-arrow" title="سهم"><i class="fa-solid fa-arrow-up"></i></button>
                    </div>

                    <!-- Group 3: Actions (Right) -->
                    <div class="toolbar-group">
                        <button class="tool-btn" id="btn-rotate" title="تدوير" style="display:none;"><i class="fa-solid fa-rotate-right"></i></button>
                        <button class="tool-btn btn-delete" id="btn-delete" title="حذف"><i class="fa-solid fa-trash"></i></button>
                        <button class="tool-btn" id="btn-save" style="color:var(--gold-main); border-color:var(--gold-main);"><i class="fa-solid fa-camera"></i></button>
                    </div>
                </div>

                <!-- THE PITCH WRAPPER -->
                <div class="field-wrapper">
                    <div id="tactics-field" class="field-container"></div>
                </div>
            </div>
        `;

        this.bindToolbarEvents();
    }

    bindToolbarEvents() {
        // Close
        document.getElementById('btn-close-board').onclick = () => this.viewContainer.classList.add('hidden');
        
        // Mode 5 vs 7
        document.getElementById('btn-mode-5').onclick = () => this.setMode(5);
        document.getElementById('btn-mode-7').onclick = () => this.setMode(7);

        // Formation
        document.getElementById('formation-select').onchange = (e) => this.applyFormation(e.target.value);

        // Tools
        document.getElementById('btn-add-ball').onclick = () => this.spawnAsset('ball');
        document.getElementById('btn-add-cone').onclick = () => this.spawnAsset('cone');
        document.getElementById('btn-add-arrow').onclick = () => this.spawnAsset('arrow');

        // Actions
        document.getElementById('btn-delete').onclick = () => this.deleteSelected();
        document.getElementById('btn-rotate').onclick = () => this.rotateSelected();
        
        // Export
        document.getElementById('btn-save').onclick = () => {
            this.deselectAll(); // Clean up look before snap
            CanvasExporter.exportBoard(this.field, 'NOUB SPORTS - Tactics');
            SoundManager.play('success');
        };
    }

    setMode(n) {
        this.currentMode = n;
        this.renderBoardContent();
        // Update UI buttons
        document.getElementById('btn-mode-5').className = `tool-btn ${n===5 ? 'active' : ''}`;
        document.getElementById('btn-mode-7').className = `tool-btn ${n===7 ? 'active' : ''}`;
    }

    /**
     * CONTENT: Draws Lines & Spawns Players
     */
    renderBoardContent() {
        this.field.innerHTML = ''; // Wipe

        // 1. Static Geometry (Rectangular Box Style)
        this.field.innerHTML = `
            <div class="goal-net top"></div>
            <div class="goal-net bottom"></div>
            
            <div class="pitch-line center-line"></div>
            <div class="pitch-circle"></div><div class="pitch-spot-center"></div>
            
            <div class="penalty-box top"></div><div class="penalty-spot top"></div>
            <div class="penalty-box bottom"></div><div class="penalty-spot bottom"></div>

            <div class="corner-arc tl"></div><div class="corner-arc tr"></div>
            <div class="corner-arc bl"></div><div class="corner-arc br"></div>
        `;

        // 2. Spawn My Team (Gold)
        this.applyFormation('2-2');
        
        // 3. Spawn Opponents (Red)
        this.spawnOpponents();
    }

    applyFormation(fmt) {
        // Remove existing gold tokens
        this.field.querySelectorAll('.token-gold').forEach(e => e.remove());
        
        const coords = this.formations[fmt] || this.formations['2-2'];
        coords.forEach((pos, i) => {
            if (i < this.currentMode) {
                const el = this.createToken(i+1, 'gold');
                el.style.left = `${pos[0]}%`; 
                el.style.bottom = `${pos[1]}%`;
                this.field.appendChild(el);
            }
        });
    }

    spawnOpponents() {
        // Simple Line Formation for Opponent
        const positions = [[50, 92], [30, 80], [70, 80], [40, 60], [60, 60]];
        for(let i=0; i<this.currentMode; i++) {
            const pos = positions[i] || [10+i*10, 50];
            const el = this.createToken(i+1, 'red');
            el.style.left = `${pos[0]}%`;
            el.style.bottom = `${pos[1]}%`;
            this.field.appendChild(el);
        }
    }

    /**
     * ASSETS: Factory Methods
     */
    createToken(num, type) {
        const el = document.createElement('div');
        el.className = `draggable-item tactic-token token-${type} ${num===1 ? 'is-gk' : ''}`;
        el.textContent = num;
        this.enableInteraction(el);
        return el;
    }

    spawnAsset(type) {
        SoundManager.play('click');
        const el = document.createElement('div');
        el.className = `draggable-item tool-${type}`;
        
        if (type === 'arrow') {
            el.innerHTML = `<div class="arrow-shaft"></div><div class="arrow-head"></div>`;
            el.dataset.rotation = 0; // Track rotation state
        }
        
        // Center Spawn
        el.style.left = '50%'; el.style.top = '50%';
        this.field.appendChild(el);
        this.enableInteraction(el);
        
        // Auto-select newly created item
        this.selectElement(el);
    }

    /**
     * INTERACTION ENGINE: Drag, Select, Rotate
     */
    enableInteraction(el) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        const onStart = (e) => {
            // Select on touch/click
            this.selectElement(el);
            isDragging = true;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const rect = el.getBoundingClientRect();
            const parent = this.field.getBoundingClientRect();
            
            startLeft = rect.left - parent.left;
            startTop = rect.top - parent.top;
            startX = clientX; startY = clientY;

            // Convert % to px for smooth drag
            el.style.bottom = 'auto'; el.style.right = 'auto';
            el.style.left = `${startLeft}px`; el.style.top = `${startTop}px`;
        };

        const onMove = (e) => {
            if (!isDragging) return;
            e.preventDefault(); // Stop Scroll
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const dx = clientX - startX;
            const dy = clientY - startY;
            
            el.style.left = `${startLeft + dx}px`;
            el.style.top = `${startTop + dy}px`;
        };

        const onEnd = () => { isDragging = false; };

        el.addEventListener('mousedown', onStart);
        el.addEventListener('touchstart', onStart, {passive: false});
        
        // Bind move/up to window to catch fast drags
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, {passive: false});
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
    }

    /**
     * SELECTION LOGIC (The "Pro" Feel)
     */
    selectElement(el) {
        // 1. Deselect previous
        this.deselectAll();
        
        // 2. Select new
        this.selectedElement = el;
        el.classList.add('is-selected');
        
        // 3. Enable Delete Button
        const delBtn = document.getElementById('btn-delete');
        delBtn.classList.add('enabled');

        // 4. Show Rotate Button ONLY if Arrow
        const rotBtn = document.getElementById('btn-rotate');
        if (el.classList.contains('tool-arrow')) {
            rotBtn.style.display = 'flex';
        } else {
            rotBtn.style.display = 'none';
        }
    }

    deselectAll() {
        if (this.selectedElement) {
            this.selectedElement.classList.remove('is-selected');
        }
        this.selectedElement = null;
        
        // Disable UI controls
        document.getElementById('btn-delete').classList.remove('enabled');
        document.getElementById('btn-rotate').style.display = 'none';
    }

    deleteSelected() {
        if (this.selectedElement) {
            SoundManager.play('click');
            this.selectedElement.remove();
            this.deselectAll();
        }
    }

    rotateSelected() {
        if (this.selectedElement && this.selectedElement.classList.contains('tool-arrow')) {
            SoundManager.play('click');
            // Get current rotation
            let deg = parseInt(this.selectedElement.dataset.rotation || 0);
            deg = (deg + 45) % 360;
            
            this.selectedElement.style.transform = `rotate(${deg}deg)`;
            this.selectedElement.dataset.rotation = deg;
        }
    }
}
