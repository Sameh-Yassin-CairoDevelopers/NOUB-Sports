/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/tacticsCtrl.js
 * Version: Noub Sports_beta 0.0.8 (FINAL VERIFIED)
 * Status: Production Ready
 * 
 * ARCHITECTURAL OVERVIEW:
 * This controller acts as a "Physics Engine" for the Tactics Board.
 * It manages the DOM elements, Touch/Mouse events, and State Reset.
 */

import { CanvasExporter } from '../utils/canvasExporter.js';
import { SoundManager } from '../utils/soundManager.js';

export class TacticsController {
    
    /**
     * Constructor: Initializes dependencies and cache DOM elements.
     */
    constructor() {
        // Main Overlay Container
        this.viewContainer = document.getElementById('view-tactics');
        // The Pitch Area (Where tokens live)
        this.field = document.getElementById('tactics-field');
        
        // Internal State
        this.currentMode = 5; // Default: 5 vs 5
        
        // Bind UI Controls immediately
        this.bindControls();
    }

    /**
     * Entry Point: Opens the Board and initializes layout.
     * Called by AppClass when FAB (+) is clicked.
     */
    init() {
        console.log("♟️ Tactics Controller: Initialized.");
        this.viewContainer.classList.remove('hidden');
        // Always render fresh on open to ensure positions are correct (Hard Reset)
        this.renderBoardLayout();
    }

    /**
     * Binds Header/Footer Control Buttons.
     */
    bindControls() {
        // 1. Close Button
        document.getElementById('btn-close-tactics').onclick = () => {
            this.viewContainer.classList.add('hidden');
        };

        // 2. Formation Mode Switchers (5 vs 7)
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.onclick = (e) => {
                SoundManager.play('click');
                // UI Toggle
                document.querySelectorAll('.mode-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'transparent';
                    b.style.color = 'var(--text-muted)';
                });
                e.target.classList.add('active');
                e.target.style.background = 'var(--gold-main)';
                e.target.style.color = '#000';
                
                // Logic Update
                this.currentMode = parseInt(e.target.dataset.mode);
                this.renderBoardLayout(); // Re-draw board with new count
            };
        });

        // 3. Reset Button (FIXED: Full Wipe)
        document.getElementById('btn-reset-tactic').onclick = () => {
            SoundManager.play('click');
            // This calls the main render function which clears innerHTML first
            this.renderBoardLayout();
        };

        // 4. Save/Screenshot Button
        document.getElementById('btn-save-tactic').onclick = () => {
            // Select all tokens to pass to renderer
            const tokens = this.field.querySelectorAll('.tactic-token');
            // Generate Filename
            const filename = `noub-tactic-${Date.now()}.png`;
            // Call Utility
            CanvasExporter.exportBoard(this.field, tokens, filename);
            SoundManager.play('success');
            alert("تم حفظ الخطة في المعرض.");
        };
    }

    /**
     * CORE RENDERER: Draws the Pitch and Spawns Tokens.
     * Clears previous state to ensure a clean slate (Reset).
     */
    renderBoardLayout() {
        // A. Wipe the Field Clean (Reset Step 1)
        // This removes all old tokens and lines, ensuring no duplication or wrong positions
        this.field.innerHTML = '';

        // B. Inject Pitch Markings & GOALS (FIXED)
        // Note: The CSS class 'goal-box' handles the centering logic (translateX -50%)
        this.field.innerHTML = `
            <!-- Center Line -->
            <div class="pitch-line center-line"></div>
            
            <!-- Center Circle -->
            <div class="pitch-circle"></div>
            
            <!-- Goal Area Top (My Team) -->
            <div class="goal-box top"></div>
            
            <!-- Goal Area Bottom (Opponent) -->
            <div class="goal-box bottom"></div>
        `;

        // C. Spawn Tokens (Reset Step 2)
        // Spawn My Team (Gold - Bottom)
        this.spawnTokens('MY_TEAM', this.currentMode);

        // Spawn Opponent (Red - Top)
        this.spawnTokens('OPPONENT', this.currentMode);
    }

    /**
     * Helper: Spawns a set of tokens with calculated positions.
     * @param {string} type - 'MY_TEAM' or 'OPPONENT'
     * @param {number} count - 5 or 7
     */
    spawnTokens(type, count) {
        for (let i = 1; i <= count; i++) {
            const token = document.createElement('div');
            token.textContent = i;
            
            // Base Class
            token.className = 'tactic-token';
            
            if (type === 'MY_TEAM') {
                // --- GOLD TEAM CONFIG ---
                token.classList.add('token-gold'); 
                
                // Position Logic (Standard Formation 1-2-1 / 1-2-2)
                if (i === 1) { // GK
                    token.style.left = '50%';
                    token.style.bottom = '5%';
                    token.classList.add('is-gk');
                } else {
                    // Distribute remaining players in rows
                    const row = Math.floor((i - 1) / 2);
                    const col = (i - 1) % 2;
                    token.style.left = col === 0 ? '30%' : '70%';
                    token.style.bottom = `${20 + (row * 15)}%`;
                }
            } else {
                // --- RED TEAM CONFIG (Mirrored) ---
                token.classList.add('token-red'); 
                
                // Position Logic
                if (i === 1) { // GK
                    token.style.left = '50%';
                    token.style.top = '5%'; // Top side
                    token.classList.add('is-gk');
                } else {
                    const row = Math.floor((i - 1) / 2);
                    const col = (i - 1) % 2;
                    token.style.left = col === 0 ? '30%' : '70%';
                    token.style.top = `${20 + (row * 15)}%`;
                }
            }

            // Append to DOM
            this.field.appendChild(token);
            
            // D. Activate Physics (Drag)
            this.enableDrag(token);
        }
    }

    /**
     * PHYSICS ENGINE: Enables Drag & Drop.
     * Supports both Touch (Mobile) and Mouse (Desktop).
     */
    enableDrag(el) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const start = (e) => {
            isDragging = true;
            
            // Unify event coordinates
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            startX = clientX;
            startY = clientY;
            
            // Convert current computed position to absolute pixels
            // This prevents "jumping" when starting drag
            const rect = el.getBoundingClientRect();
            const parentRect = this.field.getBoundingClientRect();
            
            // Calculate position relative to parent field
            initialLeft = rect.left - parentRect.left;
            initialTop = rect.top - parentRect.top;
            
            // Visual Feedback
            el.classList.add('dragging');
            SoundManager.play('click');
            
            // Switch from % positioning to px positioning for smooth drag
            el.style.bottom = 'auto';
            el.style.right = 'auto';
            el.style.left = `${initialLeft}px`;
            el.style.top = `${initialTop}px`;
            el.style.transform = 'none'; // Clear any CSS transforms to avoid conflicts
        };

        const move = (e) => {
            if (!isDragging) return;
            if(e.type === 'touchmove') e.preventDefault(); // Critical: Prevent screen scroll

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            // Apply Delta
            el.style.left = `${initialLeft + dx}px`;
            el.style.top = `${initialTop + dy}px`;
        };

        const end = () => {
            if(isDragging) {
                isDragging = false;
                el.classList.remove('dragging');
                // We leave the element at its new pixel position
            }
        };

        // Attach Listeners
        el.addEventListener('mousedown', start);
        el.addEventListener('touchstart', start, {passive: false});

        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move, {passive: false});

        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    }
}
