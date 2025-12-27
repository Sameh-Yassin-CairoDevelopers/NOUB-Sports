/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/core/appClass.js
 * Version: Noub Sports_beta 4.2.0 (MASTER ORCHESTRATOR)
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
 * 4. Module Orchestration: Instantiates and binds all Feature Controllers, 
 *    ensuring they are ready to handle events from the global UI.
 * 
 * MODULES INTEGRATED:
 * - Core: Router, State, Telegram, Auth.
 * - Features: Onboarding, Home, Team, Arena, Scout, Tactics.
 * - New System: MenuController (Navigation) & OperationsController (SOS Market).
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

// --- 3. New System Imports (V4 Expansion) ---
import { MenuController } from '../controllers/menuCtrl.js';        // Manages Side Drawer
import { OperationsController } from '../controllers/operationsCtrl.js'; // Manages SOS Room
import { TournamentController } from '../controllers/tournamentCtrl.js'; // [NEW] استيراد مراقب الدورات

/**
 * The Main Application Class.
 * Instantiated once in main.js.
 */
export class App {
    
    /**
     * Constructor: Initializes Dependencies.
     * We instantiate controllers immediately to ensure their event listeners 
     * (like those for Deep Linking) are bound before any user interaction occurs.
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
        
        // D. System Controllers (New Modules)
        this.menuCtrl = new MenuController(); 
        this.opsCtrl = new OperationsController();
        
        console.log("🚀 App Core: All Controllers & Subsystems Loaded.");
    }

    /**
     * Main Entry Point (The Boot Sequence).
     * Executed once when the DOM is fully loaded.
     */
    async init() {
        console.log("🚀 System Boot Sequence Initiated...");
        
        // 1. Initialize Environment (Telegram Colors, Haptics, Theme)
        this.telegram.init();

        try {
            // 2. Authentication Check (Critical Path)
            // Checks both Telegram ID Context and Persistent LocalStorage/Email Sessions.
            const user = await this.auth.checkUser();
            
            // 3. Routing Decision based on Auth Result
            this.handleRouting(user);
            
        } catch (error) {
            console.error("⛔ Critical Boot Error:", error);
            // Fail-safe: Force routing to guest mode on error to prevent white screen
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
        
        // 1. Dismiss Splash Screen (Smooth Fade Out Animation)
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
            
            // 1. Persist User in Singleton State
            state.setUser(user);
            
            // 2. Initial Render (Dashboard/Identity)
            this.homeCtrl.render(user);
            this.router.navigate('view-home');
            
            // 3. Unlock Global UI Shell (Header & Navbar)
            if(header) header.classList.remove('hidden');
            if(navbar) navbar.classList.remove('hidden');

            // 4. Bind Bottom Navigation Events
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
     * Ensures data is "Pulled" (Refreshed) every time a tab is visited.
     */
    bindModuleTriggers() {
        // 1. Home Tab -> Refreshes Header & Identity Card
        document.getElementById('nav-home')?.addEventListener('click', () => {
            const currentUser = state.getUser();
            if (currentUser) this.homeCtrl.render(currentUser);
        });

        // 2. Arena Tab -> Loads Match Feed & SOS Status
        document.getElementById('nav-arena')?.addEventListener('click', () => {
            console.log("🏟️ Module Load: Arena");
            this.arenaCtrl.init(); // Triggers data fetch
        });

        // 3. Scout Tab -> Loads Marketplace & Trending
        document.getElementById('nav-scout')?.addEventListener('click', () => {
            console.log("🔍 Module Load: Scout");
            this.scoutCtrl.init(); // Triggers data fetch
        });

        // 4. Team Tab -> Loads Dashboard or Create Form
        document.getElementById('nav-team')?.addEventListener('click', () => {
            console.log("🛡️ Module Load: Team");
            this.teamCtrl.init(); // Triggers data fetch
        });
        
        // 5. Action Button (The Central Floating Orb)
        // Currently mapped to open the Tactics Board Overlay directly.
        // Can be remapped to Operations or a Quick Menu later.
        document.getElementById('nav-action')?.addEventListener('click', () => {
             console.log("♟️ Opening Tactics Board...");
             this.tacticsCtrl.init(); // Show the Board Overlay
        });
    }
}
