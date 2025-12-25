/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/tacticsCtrl.js
 * Version: Noub Sports_beta 2.6.0 (FIXED 7-A-SIDE & ARROW)
 * Status: Production Ready
 */

import { CanvasExporter } from '../utils/canvasExporter.js';
import { SoundManager } from '../utils/soundManager.js';

export class TacticsController {
    
    constructor() {
        this.viewContainer = document.getElementById('view-tactics');
        this.field = null;
        this.currentMode = 5; 
        this.selectedElement = null;
        
        // FORMATION DATABASE (Percentage [x, y])
        // UPDATED: All arrays now support up to 7 players.
        // Indices 0-4 are for 5-a-side. Indices 5-6 are added for 7-a-side wings.
        this.formations = {
            // Box (2-2) -> became (3-2-1) in 7s
            '2-2': [
                [50, 8],  [25, 30], [75, 30], [25, 70], [75, 70], // 1-5
                [10, 50], [90, 50] // 6-7 (Wings added)
            ],
            // Diamond (1-2-1) -> became (1-4-1) in 7s
            '1-2-1': [
                [50, 8],  [50, 25], [20, 50], [80, 50], [50, 80], // 1-5
                [10, 35], [90, 35] // 6-7 (Wide Mids added)
            ],
            // Pyramid (3-1) -> became (3-2-1) in 7s
            '3-1': [
                [50, 8],  [20, 30], [50, 30], [80, 30], [50, 75], // 1-5
                [35, 60], [65, 60] // 6-7 (Support Strikers added)
            ]
        };
    }

    init() {
        console.log("♟️ Tactics Engine: Drafting Mode Active.");
        this.viewContainer.classList.remove('hidden');
        this.renderInterface();
        this.field = document.getElementById('tactics-field');
        this.renderBoardContent();
        
        // Deselect Listener
        this.field.addEventListener('mousedown', (e) => { if(e.target === this.field) this.deselectAll(); });
        this.field.addEventListener('touchstart', (e) => { if(e.target === this.field) this.deselectAll(); });
    }

    renderInterface() {
        this.viewContainer.innerHTML = `
            <div class="tactics-wrapper">
                <div class="tactics-toolbar-container">
                    <div class="toolbar-group">
                        <button class="btn-close-board" id="btn-close-board"><i class="fa-solid fa-xmark"></i></button>
                        <select id="formation-select" style="background:#222; color:#fff; border:1px solid #444; border-radius:6px; padding:5px; font-size:0.8rem;">
                            <option value="2-2">2-2 / 3-2-1</option>
                            <option value="1-2-1">1-2-1 / 1-4-1</option>
                            <option value="3-1">3-1 / 3-2-1</option>
                        </select>
                        <button class="tool-btn active" id="btn-mode-5">5</button>
                        <button class="tool-btn" id="btn-mode-7">7</button>
                    </div>
                    <div class="toolbar-group">
                        <button class="tool-btn" id="btn-add-ball" title="كرة"><i class="fa-solid fa-futbol"></i></button>
                        <button class="tool-btn" id="btn-add-cone" title="قمع"><i class="fa-solid fa-triangle-exclamation"></i></button>
                        <button class="tool-btn" id="btn-add-arrow" title="سهم"><i class="fa-solid fa-arrow-up"></i></button>
                    </div>
                    <div class="toolbar-group">
                        <button class="tool-btn" id="btn-rotate" title="تدوير" style="display:none;"><i class="fa-solid fa-rotate-right"></i></button>
                        <button class="tool-btn btn-delete" id="btn-delete" title="حذف"><i class="fa-solid fa-trash"></i></button>
                        <button class="tool-btn" id="btn-save" style="color:var(--gold-main); border-color:var(--gold-main);"><i class="fa-solid fa-camera"></i></button>
                    </div>
                </div>
                <div class="field-wrapper">
                    <div id="tactics-field" class="field-container"></div>
                </div>
            </div>
        `;
        this.bindToolbarEvents();
    }

    bindToolbarEvents() {
        document.getElementById('btn-close-board').onclick = () => this.viewContainer.classList.add('hidden');
        
        document.getElementById('btn-mode-5').onclick = () => this.setMode(5);
        document.getElementById('btn-mode-7').onclick = () => this.setMode(7);

        document.getElementById('formation-select').onchange = (e) => this.applyFormation(e.target.value);

        document.getElementById('btn-add-ball').onclick = () => this.spawnAsset('ball');
        document.getElementById('btn-add-cone').onclick = () => this.spawnAsset('cone');
        document.getElementById('btn-add-arrow').onclick = () => this.spawnAsset('arrow');

        document.getElementById('btn-delete').onclick = () => this.deleteSelected();
        document.getElementById('btn-rotate').onclick = () => this.rotateSelected();
        
        document.getElementById('btn-save').onclick = () => {
            this.deselectAll(); 
            CanvasExporter.exportBoard(this.field, 'NOUB SPORTS - Tactics');
            SoundManager.play('success');
        };
    }

    setMode(n) {
        this.currentMode = n;
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-mode-${n}`).classList.add('active');
        
        this.renderBoardContent();
    }

    renderBoardContent() {
        this.field.innerHTML = ''; 
        // Static Geometry
        this.field.innerHTML = `
            <div class="goal-net top"></div><div class="goal-net bottom"></div>
            <div class="pitch-line center-line"></div><div class="pitch-circle"></div><div class="pitch-spot-center"></div>
            <div class="penalty-box top"></div><div class="penalty-spot top"></div>
            <div class="penalty-box bottom"></div><div class="penalty-spot bottom"></div>
            <div class="corner-arc tl"></div><div class="corner-arc tr"></div>
            <div class="corner-arc bl"></div><div class="corner-arc br"></div>
        `;
        // Spawn My Team
        this.applyFormation(document.getElementById('formation-select').value);
        // Spawn Opponents
        this.spawnOpponents();
    }

    applyFormation(fmt) {
        // Remove existing gold tokens
        this.field.querySelectorAll('.token-gold').forEach(e => e.remove());
        
        // Get coords and ensure we have enough points fallback
        const coords = this.formations[fmt] || this.formations['2-2'];
        
        for (let i = 0; i < this.currentMode; i++) {
            // Fallback coordinate if array is too short
            const pos = coords[i] || [50, 50]; 
            
            const el = this.createToken(i+1, 'gold');
            el.style.left = `${pos[0]}%`; 
            el.style.bottom = `${pos[1]}%`;
            this.field.appendChild(el);
        }
    }

    spawnOpponents() {
        // Remove existing red tokens
        this.field.querySelectorAll('.token-red').forEach(e => e.remove());

        // Simple formation logic for opponent (Mirrored)
        // [X, Y] -> Y is from bottom. 
        const positions = [
            [50, 92], // GK
            [30, 80], [70, 80], // DEF
            [40, 60], [60, 60], // MID
            [20, 55], [80, 55]  // WINGS (6 & 7)
        ];

        for(let i = 0; i < this.currentMode; i++) {
            const pos = positions[i] || [50, 50];
            const el = this.createToken(i+1, 'red');
            el.style.left = `${pos[0]}%`;
            el.style.bottom = `${pos[1]}%`;
            this.field.appendChild(el);
        }
    }

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
            // Updated Structure for CSS Stability
            el.innerHTML = `<div class="arrow-container"><div class="arrow-shaft"></div><div class="arrow-head"></div></div>`;
            el.dataset.rotation = 0; 
        }
        
        el.style.left = '50%'; el.style.top = '50%';
        this.field.appendChild(el);
        this.enableInteraction(el);
        this.selectElement(el);
    }

    enableInteraction(el) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        const onStart = (e) => {
            this.selectElement(el);
            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const rect = el.getBoundingClientRect();
            const parent = this.field.getBoundingClientRect();
            
            startLeft = rect.left - parent.left;
            startTop = rect.top - parent.top;
            startX = clientX; startY = clientY;

            el.style.bottom = 'auto'; el.style.right = 'auto';
            el.style.left = `${startLeft}px`; el.style.top = `${startTop}px`;
        };

        const onMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            el.style.left = `${startLeft + (clientX - startX)}px`;
            el.style.top = `${startTop + (clientY - startY)}px`;
        };

        const onEnd = () => { isDragging = false; };

        el.addEventListener('mousedown', onStart);
        el.addEventListener('touchstart', onStart, {passive: false});
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, {passive: false});
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
    }

    selectElement(el) {
        this.deselectAll();
        this.selectedElement = el;
        el.classList.add('is-selected');
        document.getElementById('btn-delete').classList.add('enabled');
        
        if (el.classList.contains('tool-arrow')) {
            document.getElementById('btn-rotate').style.display = 'flex';
        }
    }

    deselectAll() {
        if (this.selectedElement) this.selectedElement.classList.remove('is-selected');
        this.selectedElement = null;
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
            let deg = parseInt(this.selectedElement.dataset.rotation || 0);
            deg = (deg + 45) % 360;
            this.selectedElement.style.transform = `rotate(${deg}deg)`;
            this.selectedElement.dataset.rotation = deg;
        }
    }
}
