/*
 * Filename: js/services/authService.js
 * Version: 2.2.0
 * Description: Manages User Authentication logic.
 * Handles fetching Telegram ID and registering new users in Supabase.
 */

import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    /**
     * Retrieves the Telegram ID based on the environment.
     * Checks Telegram SDK first, then LocalStorage for dev mode.
     * @returns {string|null} The Telegram ID or null if not found.
     */
    getCurrentId() {
        // 1. Production: Try getting ID from Telegram SDK
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser && tgUser.id) {
            return tgUser.id.toString();
        }

        // 2. Development: Try getting ID from Local Storage (Browser)
        const storedId = localStorage.getItem('noub_user_id');
        if (storedId) {
            return storedId;
        }

        // 3. New Session: No ID found
        return null; 
    }

    /**
     * Checks if the current user exists in the database.
     * @returns {Promise<User|null>} The User model or null.
     */
    async checkUser() {
        const id = this.getCurrentId();
        
        // If no ID exists in context, they are definitely a new user
        if (!id) {
            console.log("🔍 Auth: No local ID found. New user flow.");
            return null; 
        }

        console.log(`🔍 Auth: Checking Database for ID: ${id}`);

        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('telegram_id', id)
                .single();
            
            if (error || !data) {
                console.warn("Auth: ID exists locally but not in DB (Data mismatch).");
                return null;
            }

            return new User(data);

        } catch (e) {
            console.error("Auth: Critical Check Error:", e);
            return null;
        }
    }

    /**
     * Registers a new user in the database.
     * @param {Object} userData - Data collected from onboarding.
     * @returns {Promise<User>} The created User model.
     */
    async registerUser(userData) {
        // Generate a random ID if we are in browser testing (Dev Mode)
        let finalTelegramId = userData.telegramId;

        if (!finalTelegramId) {
            // Dev Mode: Generate Mock ID
            finalTelegramId = Math.floor(Math.random() * 1000000000).toString();
        }

        console.log(`📝 Auth: Registering User with ID: ${finalTelegramId}`);

        const { data, error } = await supabase
            .from('users')
            .insert([{
                telegram_id: finalTelegramId,
                username: userData.username,
                current_zone_id: userData.zoneId,
                wallet_balance: 100 // Default Welcome Bonus
            }])
            .select()
            .single();

        if (error) {
            throw new Error(`Database Insert Failed: ${error.message}`);
        }

        // CRITICAL: Save ID to browser storage so we "remember" them on refresh
        if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
            localStorage.setItem('noub_user_id', finalTelegramId);
        }

        return new User(data);
    }
}
