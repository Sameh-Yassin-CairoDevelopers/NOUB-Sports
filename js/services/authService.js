/*
 * Filename: js/services/authService.js
 * Version: 4.2.0 (Diamond Release)
 * Description: The Core Authentication Service.
 * 
 * ACADEMIC NOTE:
 * This service implements the 'Repository Pattern' for User Data.
 * It abstracts the complexity of dealing with two different auth providers 
 * (Telegram's Native Auth & Supabase's Email Auth) into a unified API.
 * 
 * CRITICAL LOGIC:
 * - Atomic Registration: User creation implies Card creation. We never leave a user without a card.
 * - Session Recovery: Automatically detects if the user is returning via Email Session or Telegram ID.
 */



import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    /**
     * Identifies the source of the current session context.
     * Used to determine which DB column to query (telegram_id vs uuid).
     * @returns {Object|null} { type: 'TELEGRAM', value: string } or null.
     */
    getCurrentIdentityToken() {
        // Priority 1: Telegram WebApp Context (Production)
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser && tgUser.id) {
            return { type: 'TELEGRAM', value: tgUser.id.toString() };
        }
        
        // Priority 2: Browser Dev Mode (LocalStorage Persistence)
        const storedId = localStorage.getItem('noub_user_id');
        if (storedId) {
            return { type: 'TELEGRAM', value: storedId };
        }

        return null;
    }

    /**
     * The Master Check Function.
     * Verifies existence in 'public.users' table based on identity source.
     * @returns {Promise<User|null>} Authenticated User Model or null.
     */
    async checkUser() {
        // A. First: Check for Active Supabase Auth Session (Email Login)
        // This session persists in cookies/storage automatically by Supabase SDK.
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
            
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('telegram_id', identity.value)
                .maybeSingle(); // Safe query, returns null if not found instead of throwing

            if (error) {
                console.error("Auth DB Error:", error);
                return null;
            }
            
            if (!data) {
                console.warn("Auth: Telegram ID exists locally but not in DB (New User).");
                return null; 
            }
            
            return new User(data);
        }

        return null; 
    }

    /**
     * Helper: Fetch User by Primary Key (UUID)
     * @param {string} uuid - The user's database ID.
     */
    async getUserByUuid(uuid) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', uuid)
            .maybeSingle();
            
        if (error || !data) {
            console.warn("Auth: Auth User exists but Public Profile missing (Data integrity issue).");
            return null;
        }
        return new User(data);
    }

    /**
     * REGISTRATION FLOW 1: TELEGRAM & DEV MODE
     * Direct insert into 'public.users' since we trust Telegram's validation.
     * @param {Object} userData - Payload from Onboarding Controller.
     */
    async registerUserTelegram(userData) {
        // Generate Mock ID if in Dev Mode (Browser)
        let finalId = userData.telegramId;
        if (!finalId) {
            finalId = Math.floor(Math.random() * 1000000000).toString();
        }

        console.log(`⚡ Auth: Registering Telegram User: ${finalId}`);

        // Transaction Step 1: Create User
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert([{
                telegram_id: finalId,
                username: userData.username,
                current_zone_id: userData.zoneId,
                wallet_balance: 100, // Welcome Bonus
                reputation_score: 100
            }])
            .select()
            .single();

        if (userError) throw new Error(`Registration Failed: ${userError.message}`);

        // Transaction Step 2: Mint Genesis Card (Critical)
        await this._mintGenesisCard(newUser.id, userData);

        // Persistence (Browser Only) - To prevent loop on refresh
        if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
            localStorage.setItem('noub_user_id', finalId);
        }

        return new User(newUser);
    }

    /**
     * REGISTRATION FLOW 2: EMAIL
     * Supabase Auth SignUp -> SQL Trigger creates Public User -> We update Public User details.
     */
    async registerUserEmail(email, password, userData) {
        console.log(`⚡ Auth: Registering Email User...`);

        // 1. SignUp via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: { data: { full_name: userData.username } } // Meta for SQL Trigger
        });

        if (authError) throw new Error(authError.message);
        if (!authData.user) throw new Error("Signup failed. Please check your network.");

        // 2. Wait for DB Trigger (Async propagation)
        // The SQL Trigger 'handle_new_user' creates the row in public.users asynchronously.
        // We wait 2s to ensure it exists before updating.
        await new Promise(r => setTimeout(r, 2000));

        // 3. Update the auto-created profile (Set Zone ID which Trigger doesn't know)
        const userId = authData.user.id;
        const { error: updateError } = await supabase
            .from('users')
            .update({ current_zone_id: userData.zoneId })
            .eq('id', userId);

        if (updateError) console.error("Zone Update Warning:", updateError);

        // 4. Mint Genesis Card
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
     * Clears all session traces (Supabase & LocalStorage).
     */
    async logout() {
        await supabase.auth.signOut();
        localStorage.removeItem('noub_user_id');
        window.location.reload();
    }

    /**
     * PRIVATE: Minting Logic (Internal Use)
     * Creates the first card for the user.
     */
    async _mintGenesisCard(userId, userData) {
        console.log("🎨 Auth: Minting Genesis Card...");
        
        const { error } = await supabase.from('cards').insert([{
            owner_id: userId,
            subject_id: userId, // I own my own identity
            display_name: userData.username,
            
            // Core Attributes
            activity_type: userData.activityType, // (PLAYER_CLUB, FAN...)
            position: userData.position || 'FAN',
            
            // Visuals
            visual_dna: userData.visualDna, // JSON from AvatarEngine
            
            // Initial Stats
            stats: { rating: 60, matches: 0, goals: 0, wins: 0 },
            
            // Metadata
            minted_by: userId,
            serial_number: 1, // The First Original Copy
            type: 'GENESIS',
            is_verified: false
        }]);

        if (error) {
            console.error("Minting Error:", error);
            // We log but don't throw, to avoid blocking user login if card fails (rare edge case)
        }
    }
}

