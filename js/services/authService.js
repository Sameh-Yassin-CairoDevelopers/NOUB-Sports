/*
 * Filename: js/services/authService.js
 * Version: 3.0.0
 * Description: Handles User Authentication & Initial Registration Logic.
 */

import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    /**
     * Get Telegram ID (Production or Dev Mode)
     */
    getCurrentId() {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser && tgUser.id) return tgUser.id.toString();
        
        // Dev Mode Persistence
        return localStorage.getItem('noub_user_id');
    }

    /**
     * Check if user exists in DB
     */
    async checkUser() {
        const id = this.getCurrentId();
        if (!id) return null;

        console.log(`🔍 Checking DB for ID: ${id}`);
        
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', id)
            .single();

        if (error || !data) return null;
        
        // Return User Model
        return new User(data);
    }

    /**
     * Full Registration Transaction (User + Genesis Card)
     */
    async registerUser(userData) {
        // 1. Generate ID if Dev Mode
        let telegramId = userData.telegramId;
        if (!telegramId) {
            telegramId = Math.floor(Math.random() * 1000000000).toString();
            if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
                localStorage.setItem('noub_user_id', telegramId);
            }
        }

        console.log("⚡ Creating User & Minting Genesis Card...");

        // 2. Insert User
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert([{
                telegram_id: telegramId,
                username: userData.username,
                current_zone_id: userData.zoneId,
                wallet_balance: 100
            }])
            .select()
            .single();

        if (userError) throw userError;

        // 3. Mint Genesis Card
        const { error: cardError } = await supabase
            .from('cards')
            .insert([{
                owner_id: newUser.id,
                display_name: userData.username,
                activity_type: userData.activityType, // (PLAYER/FAN)
                position: userData.position,
                visual_dna: userData.visualDna,
                minted_by: newUser.id, // Self Mint
                is_verified: false,
                stats: { rating: 60, matches: 0, goals: 0, wins: 0 }
            }]);

        if (cardError) throw cardError;

        return new User(newUser);
    }
}
