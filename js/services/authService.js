/*
 * Filename: js/services/authService.js
 * Version: 3.2.0 (FINAL INTEGRATED)
 * Description: Auth & Registration Logic.
 */

import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    getCurrentId() {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser && tgUser.id) return tgUser.id.toString();
        const sbSession = localStorage.getItem('sb-oxunjrytoqqazgzuoutb-auth-token'); 
        if(sbSession) return 'EMAIL_USER'; 
        return localStorage.getItem('noub_user_id'); 
    }

    async checkUser() {
        // A. Email Check
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
            return this.getUserById(sessionData.session.user.id);
        }

        // B. Telegram/Local Check
        const id = this.getCurrentId();
        if (!id || id === 'EMAIL_USER') return null;

        const { data, error } = await supabase.from('users').select('*').eq('telegram_id', id).single();
        if (error || !data) return null;
        
        return new User(data);
    }

    async getUserById(uuid) {
        const { data } = await supabase.from('users').select('*').eq('id', uuid).single();
        return data ? new User(data) : null;
    }

    // Telegram Registration
    async registerUserTelegram(userData) {
        let finalId = userData.telegramId || Math.floor(Math.random() * 1000000000).toString();
        
        const { data, error } = await supabase.from('users').insert([{
            telegram_id: finalId,
            username: userData.username,
            current_zone_id: userData.zoneId,
            wallet_balance: 100
        }]).select().single();

        if (error) throw error;
        await this._mintGenesisCard(data.id, userData);

        if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
            localStorage.setItem('noub_user_id', finalId);
        }
        return new User(data);
    }

    // Email Registration
    async registerUserEmail(email, password, userData) {
        const { data: authData, error } = await supabase.auth.signUp({
            email, password, options: { data: { full_name: userData.username } }
        });
        if (error) throw error;
        
        // Wait for Trigger
        await new Promise(r => setTimeout(r, 1000));
        
        // Update Zone & Mint
        await supabase.from('users').update({ current_zone_id: userData.zoneId }).eq('id', authData.user.id);
        await this._mintGenesisCard(authData.user.id, userData);
        
        return this.getUserById(authData.user.id);
    }

    // Email Login
    async loginEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return this.getUserById(data.user.id);
    }

    // Internal Minting
    async _mintGenesisCard(userId, userData) {
        const { error } = await supabase.from('cards').insert([{
            owner_id: userId,
            subject_id: userId,
            display_name: userData.username,
            activity_type: userData.activityType,
            position: userData.position,
            visual_dna: userData.visualDna,
            minted_by: userId,
            serial_number: 1,
            type: 'GENESIS',
            is_verified: false,
            stats: { rating: 60, matches: 0, goals: 0 }
        }]);
        if (error) throw error;
    }
}
