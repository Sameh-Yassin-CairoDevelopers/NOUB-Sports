/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/controllers/menuCtrl.js
 * Version: 1.0.0 (NAVIGATION COMMANDER)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * This controller manages the Side Drawer (Hamburger Menu).
 * It acts as the "Navigation Router's Assistant", handling UI state transitions
 * for the menu and executing "Deep Links" to specific app functions.
 * 
 * CORE RESPONSIBILITIES:
 * 1. State Management: Toggles the 'active' CSS class on the overlay/drawer.
 * 2. Event Binding: Connects menu items (IDs defined in index.html) to actions.
 * 3. Deep Linking: Uses CustomEvents to trigger specific modals in other controllers
 *    (e.g., clicking "Request Joker" opens the Post Modal in OperationsCtrl).
 * 4. UX Polish: Handles "Click Outside" to close, and plays haptic sounds.
 * -----------------------------------------------------------------------------
 */

import { SoundManager } from '../utils/soundManager.js';
import { ProfileController } from './profileCtrl.js';
import { TacticsController } from './tacticsCtrl.js';

export class MenuController {

    /**
     * Constructor: Initializes DOM references and Sub-Controllers.
     * Prepares the navigation logic.
     */
    constructor() {
        // Dependencies (for direct actions)
        this.profileCtrl = new ProfileController();
        this.tacticsCtrl = new TacticsController();

        // DOM Cache (The Shell)
        this.dom = {
            toggleBtn: document.getElementById('btn-menu-toggle'),
            closeBtn: document.getElementById('btn-menu-close'),
            overlay: document.getElementById('side-menu-overlay'),
            drawer: document.getElementById('side-menu')
        };

        // Initialize immediately
        this.init();
    }

    /**
     * Main Initialization.
     * Binds all event listeners for the menu lifecycle and items.
     */
    init() {
        console.log("🍔 MenuController: Service Started.");

        // 1. Bind Open/Close Triggers
        if (this.dom.toggleBtn) {
            this.dom.toggleBtn.addEventListener('click', () => this.openMenu());
        }
        if (this.dom.closeBtn) {
            this.dom.closeBtn.addEventListener('click', () => this.closeMenu());
        }

        // 2. Bind "Click Outside" to Close
        if (this.dom.overlay) {
            this.dom.overlay.addEventListener('click', (e) => {
                if (e.target === this.dom.overlay) {
                    this.closeMenu();
                }
            });
        }

        // 3. Bind Menu Items (The Navigation Map)
        this.bindMenuItems();
    }

    /**
     * LOGIC: Opens the Side Drawer.
     * Adds the 'active' class which triggers CSS transforms.
     */
    openMenu() {
        SoundManager.play('click');
        this.dom.overlay.classList.remove('hidden');
        // Small timeout to allow 'display:flex' to apply before adding opacity class
        // This ensures the CSS transition plays correctly.
        requestAnimationFrame(() => {
            this.dom.overlay.classList.add('active');
        });
    }

    /**
     * LOGIC: Closes the Side Drawer.
     * Removes 'active' class, waits for animation, then hides DOM.
     */
    closeMenu() {
        this.dom.overlay.classList.remove('active');
        
        // Wait for CSS transition (0.3s) before hiding element
        setTimeout(() => {
            this.dom.overlay.classList.add('hidden');
        }, 300);
    }

    /**
     * MAPPING: Connects Button IDs to App Actions.
     * Defines the "Deep Links" logic.
     */
    bindMenuItems() {
        // Helper to bind click
        const bind = (id, action) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', () => {
                    SoundManager.play('click');
                    this.closeMenu(); // Always close menu on selection
                    action();         // Execute logic
                });
            }
        };

        // --- GROUP 1: CORE NAVIGATION ---
        
        // Profile -> Home View
        bind('menu-profile', () => {
            window.router('view-home');
        });

        // --- GROUP 2: OPERATIONS (The New Features) ---
        
        // Main Operations Room
        bind('menu-operations', () => {
            window.router('view-operations');
        });

        // Deep Link: Request Joker (Tayyar)
        // Dispatches event to OperationsController to open the "Post" modal immediately
        bind('menu-req-joker', () => {
            window.router('view-operations');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('trigger-post-request', { detail: { type: 'WANTED_JOKER' } }));
            }, 100); // Slight delay to ensure view renders
        });

        // Deep Link: Request Referee
        bind('menu-req-ref', () => {
            window.router('view-operations');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('trigger-post-request', { detail: { type: 'WANTED_REF' } }));
            }, 100);
        });

        // --- GROUP 3: CAPTAIN TOOLS ---

        // Create Match -> Arena -> Tab Create
        bind('menu-create-match', () => {
            window.router('view-arena');
            // Trigger ArenaController to switch tab
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('trigger-arena-tab', { detail: { tab: 'create' } }));
            }, 100);
        });

        // Record Result -> Same as Create Match for now
        bind('menu-record-result', () => {
            window.router('view-arena');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('trigger-arena-tab', { detail: { tab: 'create' } }));
            }, 100);
        });

        // Tactics Board (Overlay)
        // Initializes the Tactics Controller directly
        bind('menu-tactics', () => {
            console.log("♟️ Menu: Launching Tactics...");
            this.tacticsCtrl.init();
        });

        // --- GROUP 4: SYSTEM ---

        // Settings -> Profile Modal
        bind('menu-settings', () => {
            this.profileCtrl.openEditModal();
        });
    }
}