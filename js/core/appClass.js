/*
 * Filename: js/core/appClass.js
 * Version: 4.0.0 (MASTER STABLE)
 * Description: The Central Nervous System of the Application.
 * 
 * ARCHITECTURAL RESPONSIBILITIES:
 * 1. Bootstrapping: Initializes core services (Telegram, State).
 * 2. Auth Guard: Acts as the gatekeeper, checking session validity before rendering.
 * 3. Router Orchestration: Manages view transitions and Navbar states.
 * 4. Controller binding: Lazily or Eagerly loads module controllers based on user interaction.
 */

import { Router } from './router.js';
import { TelegramService } from './telegram.js';
import { State } from './state.js';
import { AuthService } from '../services/authService.js';

// --- Module Controllers Imports ---
import { OnboardingController } from '../controllers/onboardingCtrl.js';
import { HomeController } from '../controllers/homeCtrl.js';
import { TeamController } from '../controllers/teamCtrl.js';
import { ArenaController } from '../controllers/arenaCtrl.js';
import { ScoutController } from '../controllers/scoutCtrl.js';

export class App {
    
    /**
     * Constructor: Initializes Core Dependencies.
     * Does NOT trigger network calls here (moved to init).
     */
    constructor() {
        // Core Utilities
        this.router = new Router();
        this.telegram = new TelegramService();
        this.state = new State();
        
        // Services
        this.auth = new AuthService();
        
        // View Controllers (Instantiated to be ready)
        this.homeCtrl = new HomeController();
        this.teamCtrl = new TeamController();
        this.arenaCtrl = new ArenaController();
        this.scoutCtrl = new ScoutController();
    }

    /**
     * Main Entry Point.
     * Executed once DOMContentLoaded event fires.
     */
    async init() {
        console.log("🚀 System Boot Sequence Initiated...");
        
        // 1. Initialize Environment (Telegram Colors/Haptics)
        this.telegram.init();

        try {
            // 2. Authentication Check (Critical Path)
            // Checks both Telegram ID and Persistent Email Sessions
            const user = await this.auth.checkUser();
            
            // 3. Decide Route
            this.handleRouting(user);
            
        } catch (error) {
            console.error("⛔ Critical Boot Error:", error);
            // Fail-safe: Redirect to Onboarding on error
            this.handleRouting(null);
        }
    }

    /**
     * Routing Logic Engine.
     * Decides whether to show the App (Home) or the Gate (Onboarding).
     * @param {Object|null} user - The authenticated User Model or null.
     */
    handleRouting(user) {
        // UI References
        const splash = document.getElementById('screen-splash');
        const header = document.getElementById('global-header');
        const navbar = document.getElementById('global-navbar');
        
        // A. Dismiss Splash Screen (Smooth Fade)
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                splash.classList.remove('active');
            }, 500);
        }

        if (user) {
            // --- PATH: AUTHENTICATED USER ---
            console.log(`✅ Session Validated: ${user.username}`);
            
            // 1. Persist User State
            this.state.setUser(user);
            
            // 2. Initial Render (Home Dashboard)
            this.homeCtrl.render(user);
            this.router.navigate('view-home');
            
            // 3. Unlock UI Shell
            if(header) header.classList.remove('hidden');
            if(navbar) navbar.classList.remove('hidden');

            // 4. Bind Global Navigation Events (The "Wiring")
            this.bindModuleTriggers();

        } else {
            // --- PATH: GUEST / NEW USER ---
            console.log("🆕 No Session Found -> Redirecting to Onboarding");
            
            // 1. Navigate to Auth Screen
            this.router.navigate('view-onboarding');
            
            // 2. Initialize Auth Logic
            new OnboardingController(); 
            
            // 3. Lock UI Shell (Focus Mode)
            if(header) header.classList.add('hidden');
            if(navbar) navbar.classList.add('hidden');
        }
    }

    /**
     * Binds Navigation Bar buttons to their respective Controllers.
     * Ensures data is refreshed ("Pulled") every time a tab is visited.
     */
    bindModuleTriggers() {
        // 1. Home Tab
        document.getElementById('nav-home')?.addEventListener('click', () => {
            const currentUser = this.state.getUser();
            if (currentUser) this.homeCtrl.render(currentUser);
        });

        // 2. Arena Tab (Fixes "Coming Soon" issue)
        document.getElementById('nav-arena')?.addEventListener('click', () => {
            console.log("🏟️ Module Load: Arena");
            this.arenaCtrl.init(); // Triggers data fetch
        });

        // 3. Scout Tab (Fixes "Coming Soon" issue)
        document.getElementById('nav-scout')?.addEventListener('click', () => {
            console.log("🔍 Module Load: Scout");
            this.scoutCtrl.init(); // Triggers data fetch
        });

        // 4. Team Tab (Fixes Login Loop issue)
        document.getElementById('nav-team')?.addEventListener('click', () => {
            console.log("🛡️ Module Load: Team");
            this.teamCtrl.init(); // Triggers data fetch
        });
    }
}
