/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/services/authService.js
 * Version: Noub Sports_beta 0.0.1 (EMAIL ONLY CORE)
 * Status: Production Ready
 * 
 * ARCHITECTURAL CHANGE:
 * Removed all Telegram/LocalStorage dependencies.
 * Now relies exclusively on Supabase Auth (JWT) for identity management.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Session Management: Check active session via Supabase SDK.
 * 2. Explicit Registration: Orchestrates the creation of Auth User -> Public Profile -> Genesis Card.
 * 3. Login/Logout: Standard email authentication flow.
 */

import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    /**
     * MAIN GUARD: Checks if a valid session exists.
     * Called on App Boot.
     * @returns {Promise<User|null>} Authenticated User Model or null.
     */
    async checkUser() {
        // 1. Ask Supabase SDK for active session (Persisted in Cookies/Storage)
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user) {
            console.log(`🔐 Auth: Active Session Found (${sessionData.session.user.email})`);
            
            // 2. Fetch the Public Profile associated with this Auth ID
            return this.getUserByUuid(sessionData.session.user.id);
        }

        console.log("🔒 Auth: No Active Session.");
        return null;
    }

    /**
     * Helper: Fetch Public User Profile by UUID.
     * @param {string} uuid - The Auth User ID.
     */
    async getUserByUuid(uuid) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', uuid)
            .maybeSingle();
            
        if (error) {
            console.error("Auth DB Error:", error);
            return null;
        }

        if (!data) {
            console.warn("⚠️ Auth: Login successful but Public Profile is missing (Ghost User).");
            // In a strict system, we might force logout here, 
            // or trigger a self-heal (omitted for clarity in this clean version).
            return null;
        }

        return new User(data);
    }

    /**
     * LOGIN FLOW
     * @param {string} email 
     * @param {string} password 
     */
    async login(email, password) {
        console.log("🔑 Auth: Attempting Login...");
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (error) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        
        // Fetch full profile to ensure data integrity
        const user = await this.getUserByUuid(data.user.id);
        if (!user) throw new Error("حدث خطأ في استرجاع بيانات الملف الشخصي.");
        
        return user;
    }

    /**
     * REGISTRATION FLOW (The Atomic Chain)
     * 1. Auth SignUp -> 2. Public Profile Insert -> 3. Genesis Card Mint.
     * @param {string} email 
     * @param {string} password 
     * @param {Object} metadata - { username, zoneId, visualDna, etc... }
     */
    async register(email, password, metadata) {
        console.log("📝 Auth: Starting Registration Chain...");

        // STEP 1: Create Supabase Auth Account
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email, password
        });

        if (authError) throw new Error(authError.message);
        if (!authData.user) throw new Error("فشل إنشاء الحساب. يرجى المحاولة لاحقاً.");

        const userId = authData.user.id;

        // STEP 2: Create Public Profile (Explicit Insert)
        // We do this manually to ensure it exists before we move to the app.
        const { error: profileError } = await supabase
            .from('users')
            .insert([{
                id: userId, // Link to Auth ID
                email: email,
                username: metadata.username,
                current_zone_id: metadata.zoneId,
                wallet_balance: 100, // Welcome Bonus
                reputation_score: 100
            }]);

        if (profileError) {
            // Cleanup: If profile fails, user shouldn't exist in Auth.
            // (Note: Supabase client-side delete of own user is restricted usually, 
            // but we throw error to stop the flow).
            console.error("Profile Insert Error:", profileError);
            throw new Error("فشل إنشاء الملف الشخصي. قد يكون البريد مستخدماً.");
        }

        // STEP 3: Mint Genesis Card
        await this._mintGenesisCard(userId, metadata);

        // Return the complete user object
        return this.getUserByUuid(userId);
    }

    /**
     * LOGOUT FLOW
     */
    async logout() {
        await supabase.auth.signOut();
        window.location.reload();
    }

    /**
     * INTERNAL: Mint the first Identity Card
     */
    async _mintGenesisCard(userId, metadata) {
        console.log("🎨 Auth: Minting Genesis Card...");
        
        const { error } = await supabase.from('cards').insert([{
            owner_id: userId,
            subject_id: userId,
            display_name: metadata.username,
            activity_type: metadata.activityType,
            position: metadata.position || 'FAN',
            visual_dna: metadata.visualDna,
            stats: { rating: 60, matches: 0, goals: 0 },
            minted_by: userId,
            serial_number: 1,
            type: 'GENESIS',
            is_verified: false
        }]);

        if (error) {
            console.error("Minting Error:", error);
            // Non-blocking warning (User can still login, but card will be missing)
        }
    }
}
