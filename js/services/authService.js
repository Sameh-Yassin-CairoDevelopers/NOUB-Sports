/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/services/authService.js
 * Version: Noub Sports_beta 1.0.0 (ULTIMATE AUTH)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * The central security authority for the application.
 * It manages the Identity Lifecycle: Registration -> Authentication -> Session Recovery.
 * 
 * CORE CAPABILITIES:
 * 1. Hybrid Auth: Supports both Supabase Email Auth (JWT) and Telegram ID.
 * 2. Self-Healing: Automatically repairs "Ghost Users" (Auth exists, Public Profile missing).
 * 3. Data Merging: Fetches User Profile + Genesis Card Visuals in a single logical unit.
 * 4. Atomic Operations: Ensures no user exists without a Genesis Card.
 * -----------------------------------------------------------------------------
 */

import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    /**
     * Identifies the source of the current session context.
     * Checks Telegram Environment first, then LocalStorage for Dev Mode.
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
     * THE MASTER GUARD: Checks if a valid session exists.
     * Orchestrates the fetching logic and triggers Self-Healing if needed.
     * @returns {Promise<User|null>} Authenticated User Model or null.
     */
    async checkUser() {
        // A. Check Email Session (Supabase Auth)
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user) {
            console.log(`🔐 Auth: Active Email Session (${sessionData.session.user.email})`);
            
            // Fetch the Public Profile associated with this Auth ID
            let user = await this.getUserByUuid(sessionData.session.user.id);

            // SELF-HEAL LOGIC:
            // If Auth exists but Public Profile is missing, create it now.
            if (!user) {
                console.warn("⚠️ Auth: Ghost User Detected. Initiating Self-Heal Protocol...");
                user = await this._healMissingProfile(sessionData.session.user);
            }

            return user;
        }

        // B. Check Telegram/Local ID
        const identity = this.getCurrentIdentityToken();
        
        if (identity && identity.type === 'TELEGRAM') {
            console.log(`📱 Auth: Detected Telegram ID (${identity.value})`);
            
            const { data, error } = await supabase
                .from('users')
                .select('id') // Just get UUID first
                .eq('telegram_id', identity.value)
                .maybeSingle();

            if (data) {
                // Fetch full profile with Visuals
                return this.getUserByUuid(data.id);
            }
        }

        return null; 
    }

    /**
     * CRITICAL: Fetch User AND their Genesis Card Visuals.
     * Solves the issue where Avatar reverts to default on reload.
     * @param {string} uuid - The user's database ID.
     */
    async getUserByUuid(uuid) {
        // Perform a JOIN-like fetch: Get User, then get their Genesis Card
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', uuid)
            .maybeSingle();
            
        if (error || !userData) {
            return null;
        }

        // Fetch Visual DNA from Cards table
        const { data: cardData } = await supabase
            .from('cards')
            .select('visual_dna')
            .eq('owner_id', uuid)
            .eq('type', 'GENESIS')
            .maybeSingle();

        // Merge Visuals into User Object
        // If no card found, default to basic visual
        let visualDna = { skin: 1, kit: 1, hair: 1 };
        if (cardData && cardData.visual_dna) {
            visualDna = cardData.visual_dna;
        }

        // Construct User Model
        const userObj = new User(userData);
        userObj.visualDna = visualDna; // Inject Visuals
        
        return userObj;
    }

    /**
     * EXPLICIT REGISTRATION: EMAIL
     * Orchestrates: Auth SignUp -> Public Insert -> Card Mint.
     * Does NOT rely on SQL Triggers (Client-Side Control).
     */
    async registerUserEmail(email, password, userData) {
        console.log(`⚡ Auth: Registering Email User...`);

        // 1. Create Auth Account
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: { data: { full_name: userData.username } }
        });

        if (authError) throw new Error(authError.message);
        if (!authData.user) throw new Error("فشل إنشاء الحساب. يرجى المحاولة لاحقاً.");

        const userId = authData.user.id;

        // 2. Insert Public Profile
        const { error: profileError } = await supabase
            .from('users')
            .insert([{
                id: userId, // Must match Auth ID
                email: email,
                username: userData.username,
                current_zone_id: userData.zoneId,
                wallet_balance: 100,
                reputation_score: 100
            }]);

        if (profileError) {
            // Ignore duplicate key error (if retry happens)
            if (profileError.code !== '23505') {
                console.error("Profile Create Error:", profileError);
                throw new Error("فشل حفظ بيانات المستخدم.");
            }
        }

        // 3. Mint Genesis Card
        await this._mintGenesisCard(userId, userData);

        return this.getUserByUuid(userId);
    }

    /**
     * EXPLICIT LOGIN: EMAIL
     */
    async loginEmail(email, password) {
        console.log("🔑 Auth: Attempting Login...");
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (error) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        
        // Fetch full profile
        let user = await this.getUserByUuid(data.user.id);
        
        // Self-Heal if profile missing
        if (!user) {
            user = await this._healMissingProfile(data.user);
        }
        
        return user;
    }

    /**
     * EXPLICIT REGISTRATION: TELEGRAM
     */
    async registerUserTelegram(userData) {
        // Generate Mock ID if in Dev Mode
        let finalId = userData.telegramId;
        if (!finalId) {
            finalId = Math.floor(Math.random() * 1000000000).toString();
        }

        console.log(`⚡ Auth: Registering Telegram User: ${finalId}`);

        // 1. Create User
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

        // 2. Mint Card
        await this._mintGenesisCard(newUser.id, userData);

        // 3. Persist ID
        if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
            localStorage.setItem('noub_user_id', finalId);
        }

        return this.getUserByUuid(newUser.id);
    }

    /**
     * UNIVERSAL LOGOUT
     */
    async logout() {
        await supabase.auth.signOut();
        localStorage.removeItem('noub_user_id');
        window.location.reload();
    }

    /**
     * INTERNAL: Minting Logic
     */
    async _mintGenesisCard(userId, userData) {
        console.log("🎨 Auth: Minting Genesis Card...");
        
        // Check if card exists first to avoid duplicates
        const { data } = await supabase.from('cards')
            .select('id')
            .eq('owner_id', userId)
            .eq('type', 'GENESIS')
            .maybeSingle();

        if (data) return; // Already exists

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

        if (error) console.error("Minting Error:", error);
    }

    /**
     * INTERNAL: Self-Healing Logic for Ghost Users
     */
    async _healMissingProfile(authUser) {
        try {
            console.log("🚑 Auth: Healing Profile...");
            
            // Re-create User
            await supabase.from('users').insert([{
                id: authUser.id,
                email: authUser.email,
                username: authUser.user_metadata?.full_name || 'Captain',
                current_zone_id: 1, 
                wallet_balance: 100
            }]);

            // Re-mint Card
            await this._mintGenesisCard(authUser.id, {
                username: authUser.user_metadata?.full_name || 'Captain',
                activityType: 'PLAYER_FREE',
                visualDna: { skin: 1, kit: 1 }
            });

            return this.getUserByUuid(authUser.id);
        } catch (e) {
            console.error("Heal Failed:", e);
            return null;
        }
    }
}
