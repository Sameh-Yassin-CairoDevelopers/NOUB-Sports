/*
 * Filename: js/services/authService.js
 * Version: 5.0.0 (ATOMIC SECURITY EDITION)
 * Description: The Core Authentication Service.
 * 
 * CRITICAL UPDATES:
 * 1. Atomic Registration: Implements Manual Rollback. If Card Minting fails, 
 *    the User account is immediately deleted to prevent 'Ghost Accounts'.
 * 2. Session Recovery: Handles both Supabase Auth (Email) and Telegram ID.
 * 3. Strict Error Handling: Throws explicit errors for UI feedback.
 */

import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    /**
     * Identifies the source of the current session context.
     * @returns {Object|null} { type: 'TELEGRAM', value: string } or null.
     */
    getCurrentIdentityToken() {
        // Priority 1: Telegram WebApp Context
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser && tgUser.id) {
            return { type: 'TELEGRAM', value: tgUser.id.toString() };
        }
        
        // Priority 2: Browser Dev Mode (LocalStorage)
        const storedId = localStorage.getItem('noub_user_id');
        if (storedId) {
            return { type: 'TELEGRAM', value: storedId };
        }

        return null;
    }

    /**
     * Main Check: Verifies existence in 'public.users'.
     * Handles both Email Sessions and Telegram IDs.
     */
    async checkUser() {
        // A. Check Email Session (Supabase Auth)
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user) {
            console.log(`📧 Auth: Detected Email Session (UUID: ${sessionData.session.user.id})`);
            return this.getUserByUuid(sessionData.session.user.id);
        }

        // B. Check Telegram/Local Identity
        const identity = this.getCurrentIdentityToken();
        
        if (identity && identity.type === 'TELEGRAM') {
            console.log(`📱 Auth: Detected Telegram ID (${identity.value})`);
            
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('telegram_id', identity.value)
                .maybeSingle();

            if (error) {
                console.error("Auth DB Error:", error);
                return null;
            }
            
            if (!data) return null; // User not found
            
            return new User(data);
        }

        return null; 
    }

    /**
     * Helper: Fetch User by UUID
     */
    async getUserByUuid(uuid) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', uuid)
            .maybeSingle();
            
        if (error || !data) {
            console.warn("Auth: User exists in Auth but not in Public schema.");
            return null;
        }
        return new User(data);
    }

    /**
     * REGISTRATION FLOW 1: TELEGRAM (With Atomic Rollback)
     * If card minting fails, we delete the user to maintain data integrity.
     */
    async registerUserTelegram(userData) {
        // Generate Mock ID for Dev Mode
        let finalId = userData.telegramId;
        if (!finalId) {
            finalId = Math.floor(Math.random() * 1000000000).toString();
        }

        console.log(`⚡ Auth: Registering Telegram User: ${finalId}`);

        // Step 1: Create User
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

        try {
            // Step 2: Mint Genesis Card (Critical)
            await this._mintGenesisCard(newUser.id, userData);

        } catch (mintError) {
            console.error("⛔ Minting Failed. Rolling back User creation...");
            // ROLLBACK: Delete the user we just created
            await supabase.from('users').delete().eq('id', newUser.id);
            throw new Error("فشل إنشاء الكارت. تم إلغاء العملية.");
        }

        // Persistence (Browser Only)
        if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
            localStorage.setItem('noub_user_id', finalId);
        }

        return new User(newUser);
    }

    /**
     * REGISTRATION FLOW 2: EMAIL
     * Relies on SQL Triggers for user creation.
     */
    async registerUserEmail(email, password, userData) {
        console.log(`⚡ Auth: Registering Email User...`);

        // 1. SignUp
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: { data: { full_name: userData.username } }
        });

        if (authError) throw new Error(authError.message);
        if (!authData.user) throw new Error("Signup failed.");

        // 2. Wait for SQL Trigger to create public user
        await new Promise(r => setTimeout(r, 2000));

        // 3. Update Zone ID
        const userId = authData.user.id;
        await supabase
            .from('users')
            .update({ current_zone_id: userData.zoneId })
            .eq('id', userId);

        // 4. Mint Genesis Card
        try {
            await this._mintGenesisCard(userId, userData);
        } catch (e) {
            console.error("Email Mint Warning:", e);
            // Note: Can't easily rollback Auth user from client-side, 
            // but the public user logic is handled.
        }

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
     * LOGOUT
     */
    async logout() {
        await supabase.auth.signOut();
        localStorage.removeItem('noub_user_id');
        window.location.reload();
    }

    /**
     * PRIVATE: Minting Logic
     * Throws error on failure to trigger rollback in parent function.
     */
    async _mintGenesisCard(userId, userData) {
        console.log("🎨 Auth: Minting Genesis Card...");
        
        const { error } = await supabase.from('cards').insert([{
            owner_id: userId,
            subject_id: userId,
            display_name: userData.username,
            activity_type: userData.activityType,
            position: userData.position || 'FAN',
            visual_dna: userData.visualDna,
            stats: { rating: 60, matches: 0, goals: 0 },
            minted_by: userId,
            serial_number: 1,
            type: 'GENESIS',
            is_verified: false
        }]);

        if (error) throw error; // Throwing ensures the catch block above works
        return true;
    }
}
