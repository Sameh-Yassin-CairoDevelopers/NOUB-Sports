/*
 * Filename: js/core/appClass.js
 * Version: Noub Sports_beta 1.0.0 (TACTICS WIRED)
 * Description: Main App Controller. 
 * UPDATE: Wires the Floating Action Button (+) to the Tactics Board.
 */

import { Router } from './router.js';
import { TelegramService } from './telegram.js';
import { state } from './state.js';
import { AuthService } from '../services/authService.js';

// Feature Controllers
import { OnboardingController } from '../controllers/onboardingCtrl.js';
import { HomeController } from '../controllers/homeCtrl.js';
import { TeamController } from '../controllers/teamCtrl.js';
import { ArenaController } from '../controllers/arenaCtrl.js';
import { ScoutController } from '../controllers/scoutCtrl.js';
import { TacticsController } from '../controllers/tacticsCtrl.js'; // [NEW]

export class App {
    constructor() {
        this.router = new Router();
        this.telegram = new TelegramService();
        this.auth = new AuthService();
        
        // Instantiate Controllers
        this.homeCtrl = new HomeController();
        this.teamCtrl = new TeamController();
        this.arenaCtrl = new ArenaController();
        this.scoutCtrl = new ScoutController();
        this.tacticsCtrl = new TacticsController(); // [NEW]
    }

    async init() {
        console.log("🚀 System Boot...");
        this.telegram.init();

        try {
            const user = await this.auth.checkUser();
            this.handleRouting(user);
        } catch (error) {
            console.error("Boot Error:", error);
            this.handleRouting(null);
        }
    }

    handleRouting(user) {
        const splash = document.getElementById('screen-splash');
        const header = document.getElementById('global-header');
        const navbar = document.getElementById('global-navbar');
        
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                splash.classList.remove('active');
            }, 500);
        }

        if (user) {
            console.log(`✅ User Active: ${user.username}`);
            state.setUser(user);
            
            // Render Home
            this.homeCtrl.render(user);
            this.router.navigate('view-home');
            
            if(header) header.classList.remove('hidden');
            if(navbar) navbar.classList.remove('hidden');

            this.bindNavigationEvents();

        } else {
            console.log("🆕 Guest Mode");
            this.router.navigate('view-onboarding');
            new OnboardingController();
            
            if(header) header.classList.add('hidden');
            if(navbar) navbar.classList.add('hidden');
        }
    }

    /**
     * WIRING: Connects Navbar to Controllers
     */
    bindNavigationEvents() {
        // 1. Home
        document.getElementById('nav-home')?.addEventListener('click', () => {
            const u = state.getUser();
            if(u) this.homeCtrl.render(u);
        });

        // 2. Arena
        document.getElementById('nav-arena')?.addEventListener('click', () => {
            this.arenaCtrl.init(); 
        });

        // 3. Scout
        document.getElementById('nav-scout')?.addEventListener('click', () => {
            this.scoutCtrl.init(); 
        });

        // 4. Team
        document.getElementById('nav-team')?.addEventListener('click', () => {
            this.teamCtrl.init(); 
        });
        
        // 5. Action Button (TACTICS BOARD)
        document.getElementById('nav-action')?.addEventListener('click', () => {
             console.log("♟️ Opening Tactics Board...");
             this.tacticsCtrl.init();
        });
    }
}
