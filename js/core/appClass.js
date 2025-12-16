/*
 * Filename: js/core/appClass.js
 * Version: 5.5.0 (Team Wiring Fix)
 * Description: Main App Controller.
 * UPDATE: Wires the Team Navigation Button to the Team Controller.
 */

import { Router } from './router.js';
import { TelegramService } from './telegram.js';
import { state } from './state.js';
import { AuthService } from '../services/authService.js';

// Controllers
import { OnboardingController } from '../controllers/onboardingCtrl.js';
import { HomeController } from '../controllers/homeCtrl.js';
import { TeamController } from '../controllers/teamCtrl.js';
import { ArenaController } from '../controllers/arenaCtrl.js';
import { ScoutController } from '../controllers/scoutCtrl.js';

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

    bindNavigationEvents() {
        // Home
        document.getElementById('nav-home')?.addEventListener('click', () => {
            const u = state.getUser();
            if(u) this.homeCtrl.render(u);
        });

        // Arena
        document.getElementById('nav-arena')?.addEventListener('click', () => {
            this.arenaCtrl.init(); 
        });

        // Scout
        document.getElementById('nav-scout')?.addEventListener('click', () => {
            this.scoutCtrl.init(); 
        });

        // Team (CRITICAL UPDATE: Refresh on Click)
        document.getElementById('nav-team')?.addEventListener('click', () => {
            console.log("🛡️ Loading Team Module...");
            this.teamCtrl.init(); 
        });
    }
}
