/*
 * Filename: js/core/appClass.js
 * Version: 6.0.0 (MASTER FULL INTEGRATION)
 * Description: The Central Application Controller (The Brain).
 * 
 * ARCHITECTURE RESPONSIBILITIES:
 * 1. Bootstrapping: Initializes Telegram SDK & Global State.
 * 2. Auth Guard: Checks user session via AuthService.
 * 3. Routing Engine: Decides between 'Onboarding' (Guest) vs 'Home' (User).
 * 4. Module Orchestration: Instantiates and wires up all feature controllers 
 *    (Home, Team, Arena, Scout) to the Navigation Bar.
 */

import { Router } from './router.js';
import { TelegramService } from './telegram.js';
import { state } from './state.js'; // Singleton Instance (CRITICAL FIX)
import { AuthService } from '../services/authService.js';

// --- Feature Controllers Imports ---
import { OnboardingController } from '../controllers/onboardingCtrl.js';
import { HomeController } from '../controllers/homeCtrl.js';
import { TeamController } from '../controllers/teamCtrl.js';
import { ArenaController } from '../controllers/arenaCtrl.js';
import { ScoutController } from '../controllers/scoutCtrl.js';

export class App {
    
    /**
     * Constructor: Initializes Core Dependencies & Feature Controllers.
     * We instantiate controllers early to ensure they are ready for event binding.
     */
    constructor() {
        // 1. Core Utilities
        this.router = new Router();
        this.telegram = new TelegramService();
        
        // 2. Data Services
        this.auth = new AuthService();
        
        // 3. View Controllers (All Modules)
        this.homeCtrl = new HomeController();
        this.teamCtrl = new TeamController();
        this.arenaCtrl = new ArenaController();
        this.scoutCtrl = new ScoutController();
        
        // Note: OnboardingController is instantiated on demand only.
    }

    /**
     * Main Entry Point.
     * Executed once when DOM is ready.
     */
    async init() {
        console.log("🚀 System Boot Sequence Initiated...");
        
        // A. Initialize Environment (Telegram Colors/Haptics)
        this.telegram.init();

        try {
            // B. Authentication Check (Critical Path)
            // Checks both Telegram ID and Persistent Email Sessions
            const user = await this.auth.checkUser();
            
            // C. Decide Route based on Auth Result
            this.handleRouting(user);
            
        } catch (error) {
            console.error("⛔ Critical Boot Error:", error);
            // Fail-safe: Redirect to Onboarding on error
            this.handleRouting(null);
        }
    }

    /**
     * Routing Logic Engine.
     * Controls the visibility of Splash, Header, Navbar, and Views.
     * @param {Object|null} user - The authenticated User Model or null.
     */
    handleRouting(user) {
        // UI References
        const splash = document.getElementById('screen-splash');
        const header = document.getElementById('global-header');
        const navbar = document.getElementById('global-navbar');
        
        // 1. Dismiss Splash Screen (Smooth Fade Out)
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                splash.classList.remove('active');
            }, 500);
        }

        if (user) {
            // --- PATH A: AUTHENTICATED USER ---
            console.log(`✅ Session Validated: ${user.username}`);
            
            // 2. Persist User in Global State (Singleton)
            state.setUser(user);
            
            // 3. Initial Render (Home Dashboard)
            this.homeCtrl.render(user);
            this.router.navigate('view-home');
            
            // 4. Unlock Global UI Shell
            if(header) header.classList.remove('hidden');
            if(navbar) navbar.classList.remove('hidden');

            // 5. Bind Global Navigation Events (Wiring Tabs to Logic)
            this.bindModuleTriggers();

        } else {
            // --- PATH B: GUEST / NEW USER ---
            console.log("🆕 No Session Found -> Redirecting to Onboarding");
            
            // 1. Navigate to Auth Screen
            this.router.navigate('view-onboarding');
            
            // 2. Initialize Auth Logic (Fresh Instance)
            new OnboardingController(); 
            
            // 3. Lock UI Shell (Focus Mode)
            if(header) header.classList.add('hidden');
            if(navbar) navbar.classList.add('hidden');
        }
    }

    /**
     * Binds Navigation Bar buttons to their respective Controllers.
     * Ensures data is refreshed ("Pulled") every time a tab is visited.
     * This fixes the "Empty Screen" issues.
     */
    bindModuleTriggers() {
        // 1. Home Tab -> Refresh Header & Card
        document.getElementById('nav-home')?.addEventListener('click', () => {
            const currentUser = state.getUser();
            if (currentUser) this.homeCtrl.render(currentUser);
        });

        // 2. Arena Tab -> Load Matches Feed
        document.getElementById('nav-arena')?.addEventListener('click', () => {
            console.log("🏟️ Module Load: Arena");
            this.arenaCtrl.init(); // Triggers data fetch
        });

        // 3. Scout Tab -> Load Market & Trending
        document.getElementById('nav-scout')?.addEventListener('click', () => {
            console.log("🔍 Module Load: Scout");
            this.scoutCtrl.init(); // Triggers data fetch
        });

        // 4. Team Tab -> Load Dashboard or Create Form
        document.getElementById('nav-team')?.addEventListener('click', () => {
            console.log("🛡️ Module Load: Team");
            this.teamCtrl.init(); // Triggers data fetch
        });
        
        // 5. Action Button (Center) - Placeholder for Quick Actions
        document.getElementById('nav-action')?.addEventListener('click', () => {
             console.log("⚡ Quick Action Triggered");
             // Can be mapped to "Quick Match" or "QR Scan" later
             if(this.arenaCtrl) this.arenaCtrl.init(); // Default to Arena for now
             this.router.navigate('view-arena');
        });
    }
}
