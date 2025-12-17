/*
 * Filename: js/services/authService.js
 * Version: 6.1.0 (SELF-HEALING MASTER)
 * Description: Auth Service that fixes "Ghost Users" automatically.
 * 
 * LOGIC UPDATE:
 * 1. checkUser() now detects if Auth exists but Public Profile is missing.
 * 2. If missing, it triggers '_restoreMissingProfile' immediately.
 * 3. This guarantees the user is never stuck in a Login Loop.
 */

import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    /**
     * Get Identity Source (Telegram or LocalStorage)
     */
    getCurrentIdentityToken() {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser && tgUser.id) return { type: 'TELEGRAM', value: tgUser.id.toString() };
        
        const storedId = localStorage.getItem('noub_user_id');
        if (storedId) return { type: 'TELEGRAM', value: storedId };

        return null;
    }

    /**
     * MAIN CHECK: The Guard
     * Checks Session -> Validates Public Profile -> Heals if broken -> Returns User.
     */
    async checkUser() {
        // A. Check Email Session (Supabase Auth)
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user) {
            console.log(`📧 Auth: Valid Session (${sessionData.session.user.email})`);
            
            // Try fetch public profile
            let user = await this.getUserByUuid(sessionData.session.user.id);
            
            // CRITICAL FIX: If Auth exists but Public Profile is missing -> HEAL IT
            if (!user) {
                console.warn("⚠️ Auth: Profile missing. Attempting Self-Healing...");
                user = await this._restoreMissingProfile(sessionData.session.user);
            }
            
            return user;
        }

        // B. Check Telegram/Local ID
        const identity = this.getCurrentIdentityToken();
        if (identity && identity.type === 'TELEGRAM') {
            console.log(`📱 Auth: Telegram ID ${identity.value}`);
            const { data } = await supabase.from('users').select('*').eq('telegram_id', identity.value).maybeSingle();
            return data ? new User(data) : null;
        }

        return null; // Guest
    }

    /**
     * Helper: Fetch User by UUID
     */
    async getUserByUuid(uuid) {
        const { data, error } = await supabase.from('users').select('*').eq('id', uuid).maybeSingle();
        if (error) console.error("Fetch Error:", error);
        return data ? new User(data) : null;
    }

    /**
     * INTERNAL FIXER: Creates Public Profile for existing Auth User
     */
    async _restoreMissingProfile(authUser) {
        try {
            // 1. Re-create User Record
            const { error: userError } = await supabase.from('users').insert([{
                id: authUser.id,
                email: authUser.email,
                username: authUser.user_metadata?.full_name || 'Captain',
                current_zone_id: 1, // Default to Fustat
                wallet_balance: 100,
                reputation_score: 100
            }]);

            if (userError) throw userError;

            // 2. Re-mint Genesis Card
            await this._mintGenesisCard(authUser.id, {
                username: authUser.user_metadata?.full_name || 'Captain',
                activityType: 'PLAYER_FREE',
                visualDna: { skin: 1, kit: 1 }
            });

            console.log("✅ Self-Healing Complete.");
            return this.getUserByUuid(authUser.id);

        } catch (e) {
            console.error("❌ Healing Failed:", e);
            return null; // If healing fails, then force logout
        }
    }

    /**
     * MANUAL REGISTRATION (Email)
     */
    async registerUserEmail(email, password, userData) {
        // 1. Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email, password, options: { data: { full_name: userData.username } }
        });

        if (authError) throw new Error(authError.message);
        if (!authData.user) throw new Error("فشل التسجيل.");

        // 2. Explicit Insert (No Triggers)
        const userId = authData.user.id;
        
        const { error: insertError } = await supabase.from('users').insert([{
            id: userId,
            email: email,
            username: userData.username,
            current_zone_id: userData.zoneId,
            wallet_balance: 100
        }]);

        if (insertError) {
            // If already exists (duplicate), ignore. Else throw.
            if (insertError.code !== '23505') throw insertError;
        }

        // 3. Mint Card
        await this._mintGenesisCard(userId, userData);

        return this.getUserByUuid(userId);
    }

    /**
     * MANUAL LOGIN (Email)
     */
    async loginEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("بيانات خطأ.");
        
        // CheckUser logic above will handle the profile fetching/healing
        return this.checkUser();
    }

    /**
     * TELEGRAM REGISTRATION
     */
    async registerUserTelegram(userData) {
        let finalId = userData.telegramId || Math.floor(Math.random() * 1000000000).toString();
        
        const { data, error } = await supabase.from('users').insert([{
            telegram_id: finalId, username: userData.username, current_zone_id: userData.zoneId, wallet_balance: 100
        }]).select().single();

        if (error) throw error;
        await this._mintGenesisCard(data.id, userData);
        
        if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
            localStorage.setItem('noub_user_id', finalId);
        }
        return new User(data);
    }

    async logout() {
        await supabase.auth.signOut();
        localStorage.removeItem('noub_user_id');
        window.location.reload();
    }

    async _mintGenesisCard(userId, userData) {
        // Check if card exists first
        const { data } = await supabase.from('cards').select('id').eq('owner_id', userId).eq('type', 'GENESIS').maybeSingle();
        if (data) return; // Already has card

        const { error } = await supabase.from('cards').insert([{
            owner_id: userId,
            subject_id: userId,
            display_name: userData.username,
            activity_type: userData.activityType || 'PLAYER',
            position: userData.position || 'FAN',
            visual_dna: userData.visualDna || {},
            stats: { rating: 60, matches: 0, goals: 0 },
            minted_by: userId,
            serial_number: 1,
            type: 'GENESIS',
            is_verified: false
        }]);
        if (error) console.error("Mint Error:", error);
    }
}
