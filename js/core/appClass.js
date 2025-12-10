/*
 * Filename: js/core/appClass.js
 * Version: 2.2.0
 * Description: The Central Application Controller.
 * Manages initialization, authentication checks, and view routing.
 */

import { Router } from './router.js';
import { TelegramService } from './telegram.js';
import { State } from './state.js';
import { AuthService } from '../services/authService.js';
import { OnboardingController } from '../controllers/onboardingCtrl.js';
import { HomeController } from '../controllers/homeCtrl.js';

export class App {
    constructor() {
        this.router = new Router();
        this.telegram = new TelegramService();
        this.state = new State();
        this.auth = new AuthService();
    }

    /**
     * Main Entry Point
     */
    async init() {
        console.log("🚀 System Init...");
        
        // 1. Initialize Telegram SDK
        this.telegram.init();

        // 2. Check Authentication Status (Async)
        // This determines if we go to Home or Onboarding
        const user = await this.auth.checkUser();

        // 3. Execute Routing Logic based on Auth result
        this.handleRouting(user);
    }

    /**
     * Decides which screen to show
     * @param {User|null} user - The user object if logged in
     */
    handleRouting(user) {
        const splash = document.getElementById('screen-splash');
        const header = document.getElementById('global-header');
        const navbar = document.getElementById('global-navbar');
        
        // Animation: Remove Splash Screen
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                splash.classList.remove('active');
            }, 500);
        }

        if (user) {
            // Case A: User Logged In -> Go Home
            console.log(`✅ Auth Success. Welcome ${user.username}`);
            
            // Save to State
            this.state.setUser(user);
            
            // Initialize Home Controller to render data
            const homeCtrl = new HomeController();
            homeCtrl.render(user);
            
            // Navigate
            this.router.navigate('view-home');
            
            // Show Global UI Elements
            if(header) header.classList.remove('hidden');
            if(navbar) navbar.classList.remove('hidden');
            
        } else {
            // Case B: New User -> Go Onboarding
            console.log("🆕 New User Detected. Starting Onboarding.");
            
            this.router.navigate('view-onboarding');
            
            // Initialize Onboarding Controller
            new OnboardingController(); 
            
            // Hide Global UI Elements (Clean View)
            if(header) header.classList.add('hidden');
            if(navbar) navbar.classList.add('hidden');
        }
    }
}
