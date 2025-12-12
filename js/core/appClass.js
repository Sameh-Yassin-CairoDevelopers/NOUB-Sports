/*
 * Filename: js/core/appClass.js
 * Version: 3.1.0
 * Description: The Central Application Controller.
 * Manages Auth Check, Routing, and Controller Initialization.
 */

import { Router } from './router.js';
import { TelegramService } from './telegram.js';
import { State } from './state.js';
import { AuthService } from '../services/authService.js';
import { OnboardingController } from '../controllers/onboardingCtrl.js';
import { HomeController } from '../controllers/homeCtrl.js';
import { TeamController } from '../controllers/teamCtrl.js'; // [NEW]

export class App {
    constructor() {
        this.router = new Router();
        this.telegram = new TelegramService();
        this.state = new State();
        this.auth = new AuthService();
        
        // Load Controllers
        this.homeCtrl = new HomeController();
        this.teamCtrl = new TeamController(); 
    }

    async init() {
        console.log("🚀 System Init...");
        this.telegram.init();

        try {
            const user = await this.auth.checkUser();
            this.handleRouting(user);
        } catch (error) {
            console.error("Auth Error:", error);
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
            console.log(`✅ Welcome ${user.username}`);
            this.state.setUser(user);
            
            // Initial Views Render
            this.homeCtrl.render(user);
            
            this.router.navigate('view-home');
            
            if(header) header.classList.remove('hidden');
            if(navbar) navbar.classList.remove('hidden');

            this.bindNavigationEvents();

        } else {
            console.log("🆕 New User");
            this.router.navigate('view-onboarding');
            new OnboardingController(); 
            
            if(header) header.classList.add('hidden');
            if(navbar) navbar.classList.add('hidden');
        }
    }

    bindNavigationEvents() {
        // Team Tab Refresh
        document.getElementById('nav-team')?.addEventListener('click', () => {
            this.teamCtrl.init(); 
        });

        // Home Tab Refresh
        document.getElementById('nav-home')?.addEventListener('click', () => {
            const user = this.state.getUser();
            if(user) this.homeCtrl.render(user);
        });
    }
}
