/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/tacticsCtrl.js
 * Version: 1.0.0 (PHYSICS ENGINE)
 * Description: Controller for the Tactics Board.
 * Features:
 * - Draggable Tokens (Touch/Mouse support).
 * - Formation Switching (5 vs 7).
 * - Screenshot Generation.
 */


import { CanvasExporter } from '../utils/canvasExporter.js';
import { SoundManager } from '../utils/soundManager.js';

export class TacticsController {
    
    constructor() {
        this.viewContainer = document.getElementById('view-tactics');
        this.field = document.getElementById('tactics-field');
        this.currentMode = 5; // Default 5v5
        
        // Bind UI Controls
        this.bindControls();
    }

    /**
     * Entry Point: Opens the Board and Resets Positions
     */
    init() {
        console.log("♟️ Tactics Controller: Ready");
        this.viewContainer.classList.remove('hidden');
        this.renderTokens(this.currentMode);
    }

    bindControls() {
        // Close Button
        document.getElementById('btn-close-tactics').onclick = () => {
            this.viewContainer.classList.add('hidden');
        };

        // Mode Switchers
        const btns = document.querySelectorAll('.mode-btn');
        btns.forEach(btn => {
            btn.onclick = (e) => {
                btns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#333';
                    b.style.color = '#fff';
                });
                e.target.classList.add('active');
                e.target.style.background = '#D4AF37';
                e.target.style.color = '#000';
                
                this.currentMode = parseInt(e.target.dataset.mode);
                this.renderTokens(this.currentMode);
            };
        });

        // Reset
        document.getElementById('btn-reset-tactic').onclick = () => {
            SoundManager.play('click');
            this.renderTokens(this.currentMode);
        };

        // Save (Screenshot)
        document.getElementById('btn-save-tactic').onclick = () => {
            const tokens = this.field.querySelectorAll('.tactic-token');
            CanvasExporter.exportBoard(this.field, tokens);
            SoundManager.play('success');
            alert("تم حفظ الخطة كصورة!");
        };
    }

    /**
     * Renders Tokens based on formation mode.
     */
    renderTokens(count) {
        this.field.innerHTML = `
            <div class="pitch-line center-line"></div>
            <div class="pitch-circle"></div>
        `; // Reset Board Markings

        // Generate Tokens
        for (let i = 1; i <= count; i++) {
            const token = document.createElement('div');
            token.className = 'tactic-token';
            token.textContent = i;
            
            // GK Styling
            if (i === 1) {
                token.classList.add('gk-token');
                token.style.left = '50%';
                token.style.bottom = '10px';
            } else {
                // Default Formation (2-2 or 3-2-1)
                const row = Math.floor((i - 1) / 2);
                const col = (i - 1) % 2;
                token.style.left = col === 0 ? '30%' : '70%';
                token.style.bottom = `${30 + (row * 20)}%`;
            }

            this.field.appendChild(token);
            this.enableDrag(token);
        }
    }

    /**
     * Enables Physics (Drag & Drop) for a token.
     * Supports both Touch (Mobile) and Mouse (Desktop).
     */
    enableDrag(el) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const start = (e) => {
            // Prevent scrolling while dragging
            if(e.type === 'touchstart') e.preventDefault();
            
            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            startX = clientX;
            startY = clientY;
            
            // Get current % positions converted to pixels for calculation
            const style = window.getComputedStyle(el);
            const matrix = new WebKitCSSMatrix(style.transform);
            initialLeft = matrix.m41;
            initialTop = matrix.m42;
            
            el.classList.add('dragging');
            SoundManager.play('click');
        };

        const move = (e) => {
            if (!isDragging) return;
            if(e.type === 'touchmove') e.preventDefault(); // Critical for mobile

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            // Simple Transform translate
            el.style.transform = `translate(${initialLeft + dx}px, ${initialTop + dy}px)`;
        };

        const end = () => {
            isDragging = false;
            el.classList.remove('dragging');
            
            // Save final position (bake transform into top/left)
            // For MVP simpler logic: we keep transform. 
            // In CanvasExporter, getBoundingClientRect handles the transform auto-magically.
        };

        el.addEventListener('mousedown', start);
        el.addEventListener('touchstart', start, {passive: false});

        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move, {passive: false});

        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    }
}
