/*
 * Filename: js/core/appClass.js
 * Version: 4.2.0 (Diamond Release)
 * Description: The Central Nervous System of the Application.
 * 
 * ACADEMIC NOTE:
 * This class follows the 'Front Controller' pattern. It handles the initial request,
 * performs common tasks (Auth check, Environment setup), and delegates rendering 
 * to specific View Controllers.
 * 
 * CORE FLOW:
 * 1. Constructor -> Instantiate Services & Controllers.
 * 2. init() -> Setup Telegram -> Check Auth -> Route.
 * 3. handleRouting() -> Manage Global UI State (Header/Nav visibility).
 */

import { Router } from './router.js';
import { TelegramService } from './telegram.js';
import { state } from './state.js'; // Singleton Instance
import { AuthService } from '../services/authService.js';

// --- Module Controllers Imports ---
import { OnboardingController } from '../controllers/onboardingCtrl.js';
import { HomeController } from '../controllers/homeCtrl.js';
import { TeamController } from '../controllers/teamCtrl.js';
import { ArenaController } from '../controllers/arenaCtrl.js';
import { ScoutController } from '../controllers/scoutCtrl.js';

export class App {
    
    /**
     * Initialize Core Dependencies.
     * We instantiate controllers early to ensure they are ready for event binding.
     */
    constructor() {
        // 1. Core Utilities
        this.router = new Router();
        this.telegram = new TelegramService();
        
        // 2. Data Services
        this.auth = new AuthService();
        
        // 3. View Controllers
        this.homeCtrl = new HomeController();
        this.teamCtrl = new TeamController();
        this.arenaCtrl = new ArenaController();
        this.scoutCtrl = new ScoutController();
    }

    /**
     * Main Entry Point.
     * Executed once when DOM is ready.
     */
    async init() {
        console.log("🚀 System Boot Sequence Initiated (v4.2)...");
        
        // A. Initialize Environment (Telegram Colors/Haptics)
        this.telegram.init();

        try {
            // B. Authentication Check (Critical Path)
            // Checks both Telegram ID and Persistent Email Sessions via AuthService
            const user = await this.auth.checkUser();
            
            // C. Decide Route based on Auth Result
            this.handleRouting(user);
            
        } catch (error) {
            console.error("⛔ Critical Boot Error:", error);
            // Fail-safe: Redirect to Onboarding on error to prevent white screen
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
            
            // 2. Persist User in Global State
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
            
            // 2. Initialize Auth Logic
            // We create a new instance to ensure fresh form state
            new OnboardingController(); 
            
            // 3. Lock UI Shell (Focus Mode for Registration)
            if(header) header.classList.add('hidden');
            if(navbar) navbar.classList.add('hidden');
        }
    }

    /**
     * Binds Navigation Bar buttons to their respective Controllers.
     * Ensures data is refreshed ("Pulled") every time a tab is clicked.
     */
    bindModuleTriggers() {
        // 1. Home Tab -> Refresh Header & Card
        document.getElementById('nav-home')?.addEventListener('click', () => {
            const currentUser = state.getUser();
            if (currentUser) this.homeCtrl.render(currentUser);
        });

        // 2. Arena Tab -> Load Matches
        document.getElementById('nav-arena')?.addEventListener('click', () => {
            console.log("🏟️ Module Load: Arena");
            this.arenaCtrl.init(); // Triggers data fetch
        });

        // 3. Scout Tab -> Load Market
        document.getElementById('nav-scout')?.addEventListener('click', () => {
            console.log("🔍 Module Load: Scout");
            this.scoutCtrl.init(); // Triggers data fetch
        });

        // 4. Team Tab -> Load Roster/Dashboard
        document.getElementById('nav-team')?.addEventListener('click', () => {
            console.log("🛡️ Module Load: Team");
            this.teamCtrl.init(); // Triggers data fetch
        });
        
        // 5. Action Button -> (Placeholder for future Quick Actions)
        document.getElementById('nav-action')?.addEventListener('click', () => {
             console.log("⚡ Quick Action Triggered");
             // Future: Open Quick Match Modal
        });
    }
}
