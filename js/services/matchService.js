/*
 * Filename: js/services/matchService.js
 * Version: 5.1.0 (MASTER FULL)
 * Description: The Complete Match Engine Service.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Data Fetching: Opponents, Venues, Live Feeds.
 * 2. Constraint Engine: Enforces 'Weekly Cap' and 'Time Buffer' rules.
 * 3. Transaction Manager: Handles complex multi-table inserts (Match + Lineup + Events).
 * 4. Consensus Manager: Handles the 'Handshake' (Verify/Reject) logic.
 */

import { supabase } from '../core/supabaseClient.js';

export class MatchService {

    // ============================================================
    // SECTION 1: PRE-MATCH DATA (التحضير)
    // ============================================================

    /**
     * Fetches valid opponents in the same zone.
     * Rules: 
     * - Must be in same Zone.
     * - Must be 'ACTIVE' (have 5+ players).
     * - Cannot play against self.
     * 
     * @param {number} zoneId - The local Khôra ID.
     * @param {string} myTeamId - ID of the creating team.
     * @returns {Promise<Array>} List of eligible teams.
     */
    async getOpponents(zoneId, myTeamId) {
        const { data, error } = await supabase
            .from('teams')
            .select('id, name, logo_dna')
            .eq('zone_id', zoneId)
            .eq('status', 'ACTIVE') 
            .neq('id', myTeamId);   
            
        if (error) {
            console.error("Opponent Fetch Error:", error);
            throw new Error("فشل تحميل قائمة الخصوم.");
        }
        return data || [];
    }

    /**
     * Fetches registered venues in the zone.
     * @param {number} zoneId - The local zone ID.
     * @returns {Promise<Array>} List of venues.
     */
    async getVenues(zoneId) {
        const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('zone_id', zoneId);
            
        if (error) {
            console.error("Venue Fetch Error:", error);
            throw new Error("فشل تحميل قائمة الملاعب.");
        }
        return data || [];
    }

    // ============================================================
    // SECTION 2: CONSTRAINT ENGINE (الحماية ومنع الغش)
    // ============================================================

    /**
     * Checks if a team is allowed to play a new match.
     * Applies strict Anti-Fraud rules.
     * 
     * @param {string} teamId - The team initiating the match.
     * @returns {Promise<boolean>} True if valid, throws Error if invalid.
     */
    async validateMatchConstraints(teamId) {
        const now = new Date();
        
        // --- Rule A: Weekly Cap (Max 24 matches/week) ---
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        
        const { count, error: countError } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .gte('created_at', oneWeekAgo.toISOString());

        if (countError) throw countError;

        if (count >= 24) {
            throw new Error("تنبيه: لقد استنفد الفريق الحد الأقصى للمباريات هذا الأسبوع (24 مباراة).");
        }

        // --- Rule B: Time Buffer (Min 2 hours between matches) ---
        // Prevents spamming matches or playing two games at once.
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(now.getHours() - 2);
        
        const { data: recentMatch, error: timeError } = await supabase
            .from('matches')
            .select('id')
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .gte('played_at', twoHoursAgo.toISOString()) // Check played_at time
            .maybeSingle();

        if (timeError && timeError.code !== 'PGRST116') throw timeError;

        if (recentMatch) {
            throw new Error("تنبيه: الفريق في فترة راحة إجبارية. يجب الانتظار ساعتين بين المباريات.");
        }

        return true;
    }

    // ============================================================
    // SECTION 3: TRANSACTION (التسجيل والتنفيذ)
    // ============================================================

    /**
     * Submits a FULL match record.
     * This acts as a Transaction: Header -> Lineup -> Events.
     * 
     * @param {Object} payload - Combined data object from Controller.
     * @returns {Promise<boolean>} True on success.
     */
    async submitMatch(payload) {
        console.log("⚔️ MatchService: Executing Submission Transaction...");

        // 1. Insert Match Header (The Main Record)
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .insert([{
                season_id: 1, // Default Season (Hardcoded for MVP)
                team_a_id: payload.myTeamId,
                team_b_id: payload.oppTeamId,
                venue_id: payload.venueId,
                score_a: payload.myScore,
                score_b: payload.oppScore,
                creator_id: payload.creatorId,
                status: 'PENDING_VERIFICATION', // Waits for opponent confirmation
                match_data: {}, // Can store extra meta-data here
                played_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (matchError) {
            console.error("Match Insert Error:", matchError);
            throw new Error(`فشل تسجيل المباراة: ${matchError.message}`);
        }
        
        const matchId = match.id;

        // 2. Insert Lineups (Who actually played?)
        // Crucial for Defenders/GKs to get clean sheet/participation XP
        if (payload.lineup && payload.lineup.length > 0) {
            const lineupRows = payload.lineup.map(userId => ({
                match_id: matchId,
                team_id: payload.myTeamId,
                player_id: userId,
                is_starter: true, // MVP Assumption: All selected are starters
                xp_earned: 0 // Will be calculated by DB Triggers upon confirmation
            }));
            
            const { error: lineupError } = await supabase
                .from('match_lineups')
                .insert(lineupRows);
                
            if (lineupError) {
                console.error("Lineup Insert Error:", lineupError);
                // We log but continue, as the main match is created
            }
        }

        // 3. Insert Events (Scorers, Cards)
        // If scorers array is provided
        if (payload.scorers && payload.scorers.length > 0) {
            const eventRows = payload.scorers.map(userId => ({
                match_id: matchId,
                player_id: userId,
                event_type: 'GOAL' // Currently supports Goals only
            }));
            
            const { error: eventError } = await supabase
                .from('match_events')
                .insert(eventRows);

            if (eventError) console.error("Event Insert Error:", eventError);
        }

        return true;
    }

    // ============================================================
    // SECTION 4: CONSENSUS & VERIFICATION (المصافحة)
    // ============================================================

    /**
     * Verifies (Confirms) a match result.
     * Called by the Opponent Captain.
     * @param {string} matchId - The match to confirm.
     * @param {string} verifierId - The captain clicking confirm.
     */
    async confirmMatch(matchId, verifierId) {
        console.log(`🤝 Consensus: Match ${matchId} Confirmed by ${verifierId}`);

        // 1. Log the Verification Action
        await supabase.from('match_verifications').insert([{
            match_id: matchId,
            verifier_id: verifierId,
            action: 'CONFIRM'
        }]);

        // 2. Update Match Status -> This triggers the Stats Update (DB Trigger)
        const { error } = await supabase
            .from('matches')
            .update({ status: 'CONFIRMED' })
            .eq('id', matchId);

        if (error) throw error;
        return true;
    }

    /**
     * Rejects a match result (Dispute).
     * @param {string} matchId - The match to reject.
     */
    async rejectMatch(matchId, verifierId) {
        console.log(`🚩 Consensus: Match ${matchId} Rejected`);

        await supabase.from('match_verifications').insert([{
            match_id: matchId,
            verifier_id: verifierId,
            action: 'REJECT'
        }]);

        const { error } = await supabase
            .from('matches')
            .update({ status: 'REJECTED' })
            .eq('id', matchId);
        
        if (error) throw error;
        return true;
    }

    // ============================================================
    // SECTION 5: FEED & DISPLAY (العرض)
    // ============================================================

    /**
     * Gets the Live Match Feed for the Zone.
     * Used in Arena View.
     * @param {number} zoneId - The zone to filter by.
     */
    async getLiveFeed(zoneId) {
        // Deep Select: Match -> Teams (A/B) -> Venues
        const { data, error } = await supabase
            .from('matches')
            .select(`
                id, score_a, score_b, status, played_at,
                team_a:teams!team_a_id (name, logo_dna, zone_id),
                team_b:teams!team_b_id (name, logo_dna),
                venue:venues (name)
            `)
            // Logic: Filter matches where Team A (Home) belongs to this Zone
            .eq('team_a.zone_id', zoneId) 
            .order('played_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error("Feed Error:", error);
            // Graceful degradation: return empty array
            return [];
        }
        return data;
    }
}
