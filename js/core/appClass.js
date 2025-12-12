/*
 * Filename: js/core/appClass.js
 * Version: 3.2.0 (FINAL INTEGRATED)
 * Description: Main Application Controller.
 * Initializes all controllers and handles routing logic.
 */

import { Router } from './router.js';
import { TelegramService } from './telegram.js';
import { State } from './state.js';
import { AuthService } from '../services/authService.js';

// Import All Controllers
import { OnboardingController } from '../controllers/onboardingCtrl.js';
import { HomeController } from '../controllers/homeCtrl.js';
import { TeamController } from '../controllers/teamCtrl.js';
import { ScoutController } from '../controllers/scoutCtrl.js';
import { ArenaController } from '../controllers/arenaCtrl.js';

export class App {
    constructor() {
        this.router = new Router();
        this.telegram = new TelegramService();
        this.state = new State();
        this.auth = new AuthService();
        
        // Instantiate Controllers
        this.homeCtrl = new HomeController();
        this.teamCtrl = new TeamController(); 
        this.scoutCtrl = new ScoutController();
        this.arenaCtrl = new ArenaController();
    }

    async init() {
        console.log("🚀 NOUB SPORTS: System Boot...");
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
            console.log(`✅ Logged in as: ${user.username}`);
            this.state.setUser(user);
            
            // Initial Render
            this.homeCtrl.render(user);
            this.router.navigate('view-home');
            
            if(header) header.classList.remove('hidden');
            if(navbar) navbar.classList.remove('hidden');

            this.bindNavigationEvents();

        } else {
            console.log("🆕 Guest Mode -> Onboarding");
            this.router.navigate('view-onboarding');
            new OnboardingController(); // Init Auth Logic
            
            if(header) header.classList.add('hidden');
            if(navbar) navbar.classList.add('hidden');
        }
    }

    bindNavigationEvents() {
        // 1. Home
        document.getElementById('nav-home')?.addEventListener('click', () => {
            const u = this.state.getUser();
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
    }
}
