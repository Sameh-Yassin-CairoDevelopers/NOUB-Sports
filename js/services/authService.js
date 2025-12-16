/*
 * Filename: js/services/authService.js
 * Version: 6.0.0 (EXPLICIT ENGINEERING)
 * Description: Auth Service with Client-Side Orchestration.
 * 
 * CHANGE: Removed reliance on SQL Triggers. 
 * The client explicitly creates the Public User and Genesis Card 
 * immediately after Auth Signup ensures atomic-like behavior via code.
 */

import { supabase } from '../core/supabaseClient.js';
import { User } from '../models/User.js';

export class AuthService {
    
    // --- Helpers ---
    getCurrentId() {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser?.id) return tgUser.id.toString();
        return localStorage.getItem('noub_user_id'); 
    }

    async getUserByUuid(uuid) {
        const { data } = await supabase.from('users').select('*').eq('id', uuid).single();
        return data ? new User(data) : null;
    }

    // --- Main Check ---
    async checkUser() {
        // 1. Check Email Session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
            return this.getUserByUuid(sessionData.session.user.id);
        }
        
        // 2. Check Telegram ID
        const id = this.getCurrentId();
        if (id) {
            const { data } = await supabase.from('users').select('*').eq('telegram_id', id).maybeSingle();
            return data ? new User(data) : null;
        }
        return null;
    }

    // --- EMAIL REGISTRATION (The Fixed Logic) ---
    async registerUserEmail(email, password, userData) {
        console.log("🔐 Auth: Starting Explicit Registration Flow...");

        // 1. Create Auth Account (Supabase Identity)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (authError) throw new Error(authError.message);
        if (!authData.user) throw new Error("فشل إنشاء الحساب.");

        const userId = authData.user.id;

        // 2. Create Public Profile (Explicit Insert)
        // This will succeed because of the RLS Policy "Insert Own Profile"
        const { error: profileError } = await supabase
            .from('users')
            .insert([{
                id: userId, // Link to Auth ID
                email: email,
                username: userData.username,
                current_zone_id: userData.zoneId,
                wallet_balance: 100,
                reputation_score: 100
            }]);

        if (profileError) {
            // Rollback: If profile fails, shouldn't keep the auth account
            console.error("Profile creation failed:", profileError);
            throw new Error("فشل إنشاء ملف المستخدم.");
        }

        // 3. Mint Genesis Card (Explicit Insert)
        await this._mintGenesisCard(userId, userData);

        return this.getUserByUuid(userId);
    }

    // --- LOGIN ---
    async loginEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("بيانات الدخول غير صحيحة");
        
        // Check if Public Profile exists (integrity check)
        const user = await this.getUserByUuid(data.user.id);
        if (!user) throw new Error("حسابك موجود لكن ملفك الشخصي مفقود (بيانات تالفة).");
        
        return user;
    }

    async logout() {
        await supabase.auth.signOut();
        localStorage.removeItem('noub_user_id');
        window.location.reload();
    }

    // --- TELEGRAM REGISTRATION ---
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

    // --- INTERNAL: Minting ---
    async _mintGenesisCard(userId, userData) {
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

        if (error) console.error("Genesis Mint Error:", error);
    }
}
