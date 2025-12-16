/*
 * Filename: js/services/authService.js
 * Version: 5.5.0 (SELF-HEALING EDITION)
 * Description: Authentication Service with Fail-safe mechanisms.
 * 
 * CRITICAL FIX: 
 * - 'loginEmail' now performs a "Self-Heal" check. 
 * - If Supabase Auth succeeds but 'public.users' record is missing (Trigger failure),
 *   it manually inserts the record to break the login loop.
 */

import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    /**
     * Helper: Get Identity Source
     */
    getCurrentIdentityToken() {
        // 1. Telegram
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser && tgUser.id) return { type: 'TELEGRAM', value: tgUser.id.toString() };
        
        // 2. Browser Local Storage
        const storedId = localStorage.getItem('noub_user_id');
        if (storedId) return { type: 'TELEGRAM', value: storedId };

        return null;
    }

    /**
     * Main Check: Verifies existence in 'public.users'.
     */
    async checkUser() {
        // A. Check Email Session (Priority)
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user) {
            console.log(`📧 Auth: Active Session Found (${sessionData.session.user.email})`);
            // Try to get public profile
            const user = await this.getUserByUuid(sessionData.session.user.id);
            
            // SELF-HEAL: If session exists but no public user, create it now
            if (!user) {
                console.warn("⚠️ Auth: Ghost User Detected. Attempting Self-Heal...");
                return this.healMissingProfile(sessionData.session.user);
            }
            return user;
        }

        // B. Check Telegram/Local ID
        const identity = this.getCurrentIdentityToken();
        if (identity && identity.type === 'TELEGRAM') {
            const { data } = await supabase.from('users').select('*').eq('telegram_id', identity.value).maybeSingle();
            return data ? new User(data) : null;
        }

        return null; 
    }

    /**
     * Helper: Fetch User by UUID
     */
    async getUserByUuid(uuid) {
        const { data } = await supabase.from('users').select('*').eq('id', uuid).maybeSingle();
        return data ? new User(data) : null;
    }

    /**
     * NEW: Manual Repair for Ghost Users
     */
    async healMissingProfile(authUser) {
        try {
            // Force create the user record
            await supabase.from('users').insert([{
                id: authUser.id, // Use same UUID
                email: authUser.email,
                username: authUser.user_metadata?.full_name || 'Captain',
                telegram_id: Math.floor(Math.random() * 1000000000), // Random backup ID
                wallet_balance: 100,
                current_zone_id: 1 // Default Zone
            }]);
            
            // Force create the Genesis Card
            await this._mintGenesisCard(authUser.id, { 
                username: authUser.user_metadata?.full_name || 'Captain',
                activityType: 'PLAYER_FREE',
                visualDna: {skin: 1, kit: 1}
            });

            console.log("✅ Auth: Self-Heal Successful.");
            return this.getUserByUuid(authUser.id);

        } catch (e) {
            console.error("Self-Heal Failed:", e);
            return null;
        }
    }

    /**
     * LOGIN FLOW: EMAIL (Enhanced)
     */
    async loginEmail(email, password) {
        console.log("🔐 Logging in with Email...");
        
        // 1. Perform Auth Login
        const { data, error } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (error) throw new Error("بيانات الدخول غير صحيحة");
        if (!data.user) throw new Error("فشل الدخول.");

        // 2. Fetch Public Profile
        let user = await this.getUserByUuid(data.user.id);

        // 3. Fallback: If missing, create it NOW
        if (!user) {
            user = await this.healMissingProfile(data.user);
        }

        if (!user) throw new Error("حسابك معلق. يرجى التواصل مع الدعم.");
        
        return user;
    }

    /**
     * REGISTRATION FLOW: EMAIL
     */
    async registerUserEmail(email, password, userData) {
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { full_name: userData.username } }
        });

        if (error) throw error;
        
        // Wait briefly for trigger
        await new Promise(r => setTimeout(r, 1500));

        // Check if created
        let user = await this.getUserByUuid(data.user?.id);
        
        // If trigger failed, do it manually
        if (!user && data.user) {
            user = await this.healMissingProfile(data.user);
        }

        return user;
    }

    /**
     * LOGOUT
     */
    async logout() {
        await supabase.auth.signOut();
        localStorage.removeItem('noub_user_id');
        window.location.reload();
    }

    // ... (registerUserTelegram & _mintGenesisCard remain the same as previous stable version) ...
    // Included here for copy-paste completeness

    async registerUserTelegram(userData) {
        let finalId = userData.telegramId || Math.floor(Math.random() * 1000000000).toString();
        const { data, error } = await supabase.from('users').insert([{
            telegram_id: finalId, username: userData.username, current_zone_id: userData.zoneId, wallet_balance: 100
        }]).select().single();
        if (error) throw error;
        await this._mintGenesisCard(data.id, userData);
        if (!window.Telegram?.WebApp?.initDataUnsafe?.user) localStorage.setItem('noub_user_id', finalId);
        return new User(data);
    }

    async _mintGenesisCard(userId, userData) {
        const { error } = await supabase.from('cards').insert([{
            owner_id: userId, subject_id: userId, display_name: userData.username,
            activity_type: userData.activityType, position: userData.position || 'FAN',
            visual_dna: userData.visualDna, stats: { rating: 60, matches: 0, goals: 0 },
            minted_by: userId, serial_number: 1, type: 'GENESIS', is_verified: false
        }]);
        if (error) console.error("Mint Error:", error);
    }
}
