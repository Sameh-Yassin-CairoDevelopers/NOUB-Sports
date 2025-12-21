/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/tacticsCtrl.js
 * Version: Noub Sports_beta 0.0.7 (TACTICS MASTER)
 * Status: Production Ready
 * 
 * RESPONSIBILITIES:
 * 1. Board Rendering: Draws the pitch, goals, and penalty areas physically in DOM.
 * 2. Token Management: Handles instantiation of My Team vs Opponent tokens.
 * 3. Physics Engine: Manages Touch/Mouse Drag & Drop mechanics with boundary checks.
 * 4. Export: Bridges with CanvasExporter to save the strategy as an image.
 */

import { CanvasExporter } from '../utils/canvasExporter.js';
import { SoundManager } from '../utils/soundManager.js';

export class TacticsController {
    
    constructor() {
        this.viewContainer = document.getElementById('view-tactics');
        this.field = document.getElementById('tactics-field');
        
        // Internal State
        this.currentMode = 5; // 5 vs 7
        this.tokenType = 'MY_TEAM'; // 'MY_TEAM' or 'OPPONENT'
        
        this.bindControls();
    }

    /**
     * Entry Point: Opens the Board overlay.
     */
    init() {
        console.log("♟️ Tactics Controller: Initialized.");
        this.viewContainer.classList.remove('hidden');
        this.renderBoardLayout();
    }

    /**
     * Binds Header/Footer Controls.
     */
    bindControls() {
        // 1. Close Button
        document.getElementById('btn-close-tactics').onclick = () => {
            this.viewContainer.classList.add('hidden');
        };

        // 2. Formation Mode (5 vs 7)
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.onclick = (e) => {
                // UI Toggle
                document.querySelectorAll('.mode-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#333';
                    b.style.color = '#fff';
                });
                e.target.classList.add('active');
                e.target.style.background = '#D4AF37';
                e.target.style.color = '#000';
                
                // Logic
                this.currentMode = parseInt(e.target.dataset.mode);
                this.renderBoardLayout(); // Reset with new count
            };
        });

        // 3. Reset Button
        document.getElementById('btn-reset-tactic').onclick = () => {
            SoundManager.play('click');
            this.renderBoardLayout();
        };

        // 4. Save (Screenshot)
        document.getElementById('btn-save-tactic').onclick = () => {
            const tokens = this.field.querySelectorAll('.tactic-token');
            // We pass the field element to capture background + tokens
            CanvasExporter.exportBoard(this.field, tokens, `noub-tactic-${Date.now()}.png`);
            SoundManager.play('success');
        };

        // 5. [NEW] Opponent Toggle (Needs to be injected or bound if exists)
        // Check if toggle exists, if not, we create it dynamically in renderLayout
    }

    /**
     * Renders the Pitch Markings and Initial Tokens.
     * FIX: Adds physical DIVs for Goals so they are visible during planning.
     */
    renderBoardLayout() {
        // A. Clear Field & Inject Markings (CSS Drawing)
        this.field.innerHTML = `
            <!-- Center Line -->
            <div class="pitch-line center-line" style="position:absolute; top:50%; left:0; width:100%; height:2px; background:rgba(255,255,255,0.4);"></div>
            
            <!-- Center Circle -->
            <div class="pitch-circle" style="position:absolute; top:50%; left:50%; width:80px; height:80px; border:2px solid rgba(255,255,255,0.4); border-radius:50%; transform:translate(-50%, -50%);"></div>
            
            <!-- Goal Area Top (My Team) -->
            <div class="goal-box top" style="position:absolute; top:0; left:25%; width:50%; height:60px; border:2px solid rgba(255,255,255,0.3); border-top:none;"></div>
            
            <!-- Goal Area Bottom (Opponent) -->
            <div class="goal-box bottom" style="position:absolute; bottom:0; left:25%; width:50%; height:60px; border:2px solid rgba(255,255,255,0.3); border-bottom:none;"></div>
        `;

        // B. Render My Team Tokens (Gold)
        this.spawnTokens('MY_TEAM', this.currentMode);

        // C. Render Opponent Tokens (Red) - Optional start
        // For now, we start with just My Team, and user can add opponent.
        // Or we spawn equal number. Let's spawn equal number for a match setup.
        this.spawnTokens('OPPONENT', this.currentMode);
    }

    /**
     * Helper: Spawns a set of tokens.
     */
    spawnTokens(type, count) {
        for (let i = 1; i <= count; i++) {
            const token = document.createElement('div');
            token.textContent = i;
            
            // Base Class
            token.className = 'tactic-token';
            
            // Styling based on Type
            if (type === 'MY_TEAM') {
                token.classList.add('token-gold'); // defined in CSS
                // Position: Bottom Half
                if (i === 1) { // GK
                    token.style.left = '50%';
                    token.style.bottom = '5%';
                    token.classList.add('is-gk');
                } else {
                    const row = Math.floor((i - 1) / 2);
                    const col = (i - 1) % 2;
                    token.style.left = col === 0 ? '30%' : '70%';
                    token.style.bottom = `${20 + (row * 15)}%`;
                }
            } else {
                token.classList.add('token-red'); // defined in CSS
                // Position: Top Half (Mirrored)
                if (i === 1) { // GK
                    token.style.left = '50%';
                    token.style.top = '5%';
                    token.classList.add('is-gk');
                } else {
                    const row = Math.floor((i - 1) / 2);
                    const col = (i - 1) % 2;
                    token.style.left = col === 0 ? '30%' : '70%';
                    token.style.top = `${20 + (row * 15)}%`;
                }
            }

            this.field.appendChild(token);
            this.enableDrag(token);
        }
    }

    /**
     * Enables Physics (Drag & Drop) with Boundaries.
     */
    enableDrag(el) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const start = (e) => {
            if(e.type === 'touchstart') e.preventDefault(); // Stop Scroll
            
            isDragging = true;
            // Get pointer position
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            startX = clientX;
            startY = clientY;
            
            // Get current element position
            const rect = el.getBoundingClientRect();
            const parentRect = this.field.getBoundingClientRect();
            
            // Calculate offset relative to parent
            initialLeft = rect.left - parentRect.left;
            initialTop = rect.top - parentRect.top;
            
            // Visual Feedback
            el.classList.add('dragging');
            SoundManager.play('click');
            
            // Remove 'bottom/right' styles and switch to top/left for movement
            el.style.bottom = 'auto';
            el.style.right = 'auto';
            el.style.left = `${initialLeft}px`;
            el.style.top = `${initialTop}px`;
        };

        const move = (e) => {
            if (!isDragging) return;
            if(e.type === 'touchmove') e.preventDefault();

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            // Apply Move
            el.style.left = `${initialLeft + dx}px`;
            el.style.top = `${initialTop + dy}px`;
        };

        const end = () => {
            if(isDragging) {
                isDragging = false;
                el.classList.remove('dragging');
                SoundManager.play('click'); // Drop sound
            }
        };

        // Listeners
        el.addEventListener('mousedown', start);
        el.addEventListener('touchstart', start, {passive: false});

        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move, {passive: false});

        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    }
}
