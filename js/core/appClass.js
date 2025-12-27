/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/core/appClass.js
 * Version: Noub Sports_beta 5.0.0 (MASTER ORCHESTRATOR & TOURNAMENT INTEGRATION)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * The "App" class serves as the Bootloader and Central Orchestrator of the SPA.
 * It follows the "Facade Pattern" to initialize subsystems and route traffic.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Bootstrapping: Initializes critical infrastructure (Telegram SDK, State, Auth).
 * 2. Auth Guard (Security): Validates user sessions before rendering restricted views.
 * 3. Routing Logic: Directs users to Onboarding (Guest) or Dashboard (Auth).
 * 4. Module Orchestration: Instantiates and binds all Feature Controllers.
 * 
 * UPDATES IN V5.0.0:
 * - Integrated `TournamentController` to manage the new Ramadan Leagues module.
 * - Delegated the "Central Action Button" (FAB) logic to the Tournament Controller
 *   to render the multi-option menu instead of directly opening the Tactics Board.
 * -----------------------------------------------------------------------------
 */

// --- 1. Core Infrastructure Imports ---
import { Router } from './router.js';
import { TelegramService } from './telegram.js';
import { state } from './state.js'; // Singleton State Store
import { AuthService } from '../services/authService.js';

// --- 2. Feature Controller Imports ---
import { OnboardingController } from '../controllers/onboardingCtrl.js';
import { HomeController } from '../controllers/homeCtrl.js';
import { TeamController } from '../controllers/teamCtrl.js';
import { ArenaController } from '../controllers/arenaCtrl.js';
import { ScoutController } from '../controllers/scoutCtrl.js';
import { TacticsController } from '../controllers/tacticsCtrl.js';

// --- 3. System Imports (Menu, Ops, Tournaments) ---
import { MenuController } from '../controllers/menuCtrl.js';        // Side Drawer
import { OperationsController } from '../controllers/operationsCtrl.js'; // SOS Room
import { TournamentController } from '../controllers/tournamentCtrl.js'; // [NEW] Tournament Hub

/**
 * The Main Application Class.
 * Instantiated once in main.js.
 */
export class App {
    
    /**
     * Constructor: Initializes Dependencies.
     * We instantiate controllers immediately to ensure their event listeners 
     * are bound before any user interaction occurs.
     */
    constructor() {
        // A. Core Utilities
        this.router = new Router();
        this.telegram = new TelegramService();
        
        // B. Data Services
        this.auth = new AuthService();
        
        // C. View Controllers (Legacy Modules)
        this.homeCtrl = new HomeController();
        this.teamCtrl = new TeamController();
        this.arenaCtrl = new ArenaController();
        this.scoutCtrl = new ScoutController();
        this.tacticsCtrl = new TacticsController();
        
        // D. System Controllers
        this.menuCtrl = new MenuController(); 
        this.opsCtrl = new OperationsController();
        
        // [ARCHITECTURAL UPDATE]: Initialize Tournament Controller
        // This controller's constructor automatically hijacks the DOM element '#nav-action'
        // to inject the new multi-option "Floating Action Menu" (FAB).
        this.tournCtrl = new TournamentController();
        
        console.log("🚀 App Core: All Controllers & Subsystems Loaded.");
    }

    /**
     * Main Entry Point (The Boot Sequence).
     * Executed once when the DOM is fully loaded.
     */
    async init() {
        console.log("🚀 System Boot Sequence Initiated...");
        
        // 1. Initialize Environment
        this.telegram.init();

        try {
            // 2. Authentication Check (Critical Path)
            const user = await this.auth.checkUser();
            
            // 3. Routing Decision
            this.handleRouting(user);
            
        } catch (error) {
            console.error("⛔ Critical Boot Error:", error);
            // Fail-safe: Force routing to guest mode
            this.handleRouting(null);
        }
    }

    /**
     * Routing Logic Engine.
     * Manages the Global UI Shell (Header, Navbar) visibility based on Auth State.
     * 
     * @param {Object|null} user - The authenticated User Model or null.
     */
    handleRouting(user) {
        // UI References
        const splash = document.getElementById('screen-splash');
        const header = document.getElementById('global-header');
        const navbar = document.getElementById('global-navbar');
        
        // 1. Dismiss Splash Screen
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
            
            // 1. Persist User State
            state.setUser(user);
            
            // 2. Initial Render
            this.homeCtrl.render(user);
            this.router.navigate('view-home');
            
            // 3. Unlock Global UI Shell
            if(header) header.classList.remove('hidden');
            if(navbar) navbar.classList.remove('hidden');

            // 4. Bind Navigation Events
            this.bindModuleTriggers();

        } else {
            // --- PATH B: GUEST / NEW USER ---
            console.log("🆕 No Session Found -> Redirecting to Onboarding");
            
            // 1. Navigate to Auth
            this.router.navigate('view-onboarding');
            
            // 2. Initialize Auth Logic
            new OnboardingController(); 
            
            // 3. Lock UI Shell
            if(header) header.classList.add('hidden');
            if(navbar) navbar.classList.add('hidden');
        }
    }

    /**
     * Binds Navigation Bar buttons to their respective Controllers.
     * Ensures data is "Pulled" (Refreshed) every time a tab is visited.
     */
    bindModuleTriggers() {
        // 1. Home Tab -> Refresh Identity
        document.getElementById('nav-home')?.addEventListener('click', () => {
            const currentUser = state.getUser();
            if (currentUser) this.homeCtrl.render(currentUser);
        });

        // 2. Arena Tab -> Refresh Feed
        document.getElementById('nav-arena')?.addEventListener('click', () => {
            console.log("🏟️ Module Load: Arena");
            this.arenaCtrl.init(); 
        });

        // 3. Scout Tab -> Refresh Market
        document.getElementById('nav-scout')?.addEventListener('click', () => {
            console.log("🔍 Module Load: Scout");
            this.scoutCtrl.init(); 
        });

        // 4. Team Tab -> Refresh Management
        document.getElementById('nav-team')?.addEventListener('click', () => {
            console.log("🛡️ Module Load: Team");
            this.teamCtrl.init(); 
        });
        
        // 5. Action Button (Center)
        // [DEPRECATED BINDING]:
        // The previous direct binding to `tacticsCtrl.init()` has been REMOVED.
        // Reason: The `TournamentController` now owns this button and attaches
        // the "Floating Action Menu" logic during its instantiation.
        
        /* 
        document.getElementById('nav-action')?.addEventListener('click', () => {
             this.tacticsCtrl.init(); 
        }); 
        */
    }
}
