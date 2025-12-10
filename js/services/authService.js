/*
 * Filename: js/services/authService.js
 * Description: Manages User Authentication and Registration.
 */

import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    async checkUser(telegramId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('telegram_id', telegramId)
                .single();
            
            if (error || !data) return null;
            return new User(data);
        } catch (e) {
            console.error("Auth Check Failed:", e);
            return null;
        }
    }

    async registerUser(userData) {
        const { data, error } = await supabase
            .from('users')
            .insert([{
                telegram_id: userData.telegramId,
                username: userData.username,
                current_zone_id: userData.zoneId,
                wallet_balance: 100 // Welcome Bonus
            }])
            .select()
            .single();

        if (error) throw error;
        return new User(data);
    }
}
