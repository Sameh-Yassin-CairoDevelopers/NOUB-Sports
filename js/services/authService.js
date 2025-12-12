/*
 * Filename: js/services/authService.js
 * Version: 4.0.0 (MASTER STABLE)
 * Description: Authentication & Identity Management Service.
 * 
 * CORE FUNCTIONS:
 * 1. checkUser(): Determines identity from Storage/Telegram/Email Session.
 * 2. registerUserTelegram(): Direct DB Insert for TMA users.
 * 3. registerUserEmail(): Supabase Auth SignUp + Public Table Sync.
 * 4. loginEmail(): Supabase Auth SignIn.
 */

import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    /**
     * Identifies the source of the current session.
     * @returns {string|null} Returns 'TELEGRAM_ID', 'EMAIL_SESSION_ID', or null.
     */
    getCurrentIdentityToken() {
        // Priority 1: Telegram WebApp Context
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser && tgUser.id) {
            return { type: 'TELEGRAM', value: tgUser.id.toString() };
        }

        // Priority 2: Supabase Auth Session (Email)
        // (Handled asynchronously in checkUser, but we check local storage hint here if needed)
        
        // Priority 3: Browser Dev Mode (LocalStorage)
        const storedId = localStorage.getItem('noub_user_id');
        if (storedId) {
            return { type: 'TELEGRAM', value: storedId };
        }

        return null;
    }

    /**
     * The Master Check Function.
     * Verifies existence in 'public.users' table based on identity source.
     * @returns {Promise<User|null>} Authenticated User Model.
     */
    async checkUser() {
        // A. First: Check for Active Supabase Auth Session (Email Login)
        // This is persistent across reloads for Email users.
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user) {
            console.log(`📧 Auth: Detected Email Session (UUID: ${sessionData.session.user.id})`);
            // Fetch public profile using the UUID from Auth
            return this.getUserByUuid(sessionData.session.user.id);
        }

        // B. Second: Check for Telegram/Local Identity
        const identity = this.getCurrentIdentityToken();
        
        if (identity && identity.type === 'TELEGRAM') {
            console.log(`📱 Auth: Detected Telegram ID (${identity.value})`);
            
            // Query DB by telegram_id
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('telegram_id', identity.value)
                .maybeSingle(); // Safe query, returns null if not found

            if (error) {
                console.error("Auth DB Error:", error);
                return null;
            }
            
            if (!data) return null; // New User
            
            return new User(data);
        }

        // No identity found
        return null; 
    }

    /**
     * Helper: Fetch User by Primary Key (UUID)
     */
    async getUserByUuid(uuid) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', uuid)
            .maybeSingle();
            
        if (error || !data) {
            console.warn("Auth: Auth User exists but Public Profile missing.");
            return null;
        }
        return new User(data);
    }

    /**
     * REGISTRATION FLOW 1: TELEGRAM
     * Direct insert into public tables.
     */
    async registerUserTelegram(userData) {
        // Generate Mock ID if in Dev Mode
        let finalId = userData.telegramId;
        if (!finalId) {
            finalId = Math.floor(Math.random() * 1000000000).toString();
        }

        // Transaction Step 1: Create User
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert([{
                telegram_id: finalId,
                username: userData.username,
                current_zone_id: userData.zoneId,
                wallet_balance: 100,
                reputation_score: 100
            }])
            .select()
            .single();

        if (userError) throw new Error(`Registration Failed: ${userError.message}`);

        // Transaction Step 2: Mint Card
        await this._mintGenesisCard(newUser.id, userData);

        // Persistence (Browser Only)
        if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
            localStorage.setItem('noub_user_id', finalId);
        }

        return new User(newUser);
    }

    /**
     * REGISTRATION FLOW 2: EMAIL
     * Supabase Auth SignUp -> Trigger creates Public User -> We update Public User.
     */
    async registerUserEmail(email, password, userData) {
        // 1. SignUp
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: { data: { full_name: userData.username } } // Meta for Trigger
        });

        if (authError) throw new Error(authError.message);
        if (!authData.user) throw new Error("Signup failed. Check email confirmation settings.");

        // 2. Wait for DB Trigger (Async propagation)
        // We delay slightly to ensure the trigger has finished creating the public.users row
        await new Promise(r => setTimeout(r, 2000));

        // 3. Update the auto-created profile (Set Zone)
        const userId = authData.user.id;
        const { error: updateError } = await supabase
            .from('users')
            .update({ current_zone_id: userData.zoneId })
            .eq('id', userId);

        if (updateError) console.error("Zone Update Warning:", updateError);

        // 4. Mint Card
        await this._mintGenesisCard(userId, userData);

        return this.getUserByUuid(userId);
    }

    /**
     * LOGIN FLOW: EMAIL
     */
    async loginEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (error) throw new Error("بيانات الدخول غير صحيحة");
        
        return this.getUserByUuid(data.user.id);
    }

    /**
     * UNIVERSAL LOGOUT
     */
    async logout() {
        // Clear everything
        await supabase.auth.signOut();
        localStorage.removeItem('noub_user_id');
        window.location.reload();
    }

    /**
     * PRIVATE: Minting Logic (Shared)
     */
    async _mintGenesisCard(userId, userData) {
        const { error } = await supabase.from('cards').insert([{
            owner_id: userId,
            subject_id: userId,
            display_name: userData.username,
            activity_type: userData.activityType,
            position: userData.position || 'FAN',
            visual_dna: userData.visualDna,
            stats: { rating: 60, matches: 0, goals: 0 }, // Default Stats
            minted_by: userId,
            serial_number: 1,
            type: 'GENESIS',
            is_verified: false
        }]);

        if (error) {
            console.error("Minting Error:", error);
            // Non-blocking error (User created but card failed - edge case)
        }
    }
}
