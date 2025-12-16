/*
 * Filename: js/services/matchService.js
 * Version: 5.5.0 (MASTER ENGINE)
 * Description: The Core Logic for Match Management.
 * 
 * ACADEMIC RESPONSIBILITIES:
 * 1. Constraint Enforcement: Implements the "Anti-Fraud" rules (Weekly Caps, Time Buffers).
 * 2. Data Transaction: Handles complex multi-table writes (Match Header -> Lineups -> Events).
 * 3. Verification Logic: Manages the consensus mechanism between Captains.
 * 4. Data Retrieval: Fetches contextual data (Opponents, Venues, Live Feed).
 */

import { supabase } from '../core/supabaseClient.js';

export class MatchService {

    /**
     * Fetches valid opponents in the same zone.
     * Rule: Can only play against 'ACTIVE' teams (5+ players).
     * Rule: Cannot play against self.
     * 
     * @param {number} zoneId - The local Khôra ID.
     * @param {string} myTeamId - Current team ID to exclude.
     * @returns {Promise<Array>} List of eligible teams.
     */
    async getOpponents(zoneId, myTeamId) {
        try {
            const { data, error } = await supabase
                .from('teams')
                .select('id, name, logo_dna')
                .eq('zone_id', zoneId)
                .eq('status', 'ACTIVE') 
                .neq('id', myTeamId);   
            
            if (error) throw error;
            return data || [];

        } catch (error) {
            console.error("MatchService: Opponent Fetch Error", error);
            throw new Error("فشل تحميل قائمة الخصوم.");
        }
    }

    /**
     * Fetches registered venues in the zone for GPS verification.
     * @param {number} zoneId - The local zone ID.
     * @returns {Promise<Array>} List of venues.
     */
    async getVenues(zoneId) {
        const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('zone_id', zoneId);
            
        if (error) {
            console.error("MatchService: Venue Fetch Error", error);
            throw new Error("فشل تحميل قائمة الملاعب.");
        }
        return data || [];
    }

    /**
     * VALIDATION ENGINE: Checks if a team is allowed to play.
     * 
     * Constraint 1: Weekly Cap (Max 24 matches/week).
     * Constraint 2: Temporal Buffer (Min 2 hours between matches).
     * 
     * @param {string} teamId - The team initiating the match.
     * @returns {Promise<boolean>} True if valid, throws Error if invalid.
     */
    async validateMatchConstraints(teamId) {
        const now = new Date();
        
        // --- Constraint 1: Weekly Cap (24 Matches) ---
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

        // --- Constraint 2: 2-Hour Buffer ---
        // Checks if the team played a match recently to prevent spam/overlap.
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(now.getHours() - 2);
        
        const { data: recentMatch, error: timeError } = await supabase
            .from('matches')
            .select('id')
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .gte('played_at', twoHoursAgo.toISOString()) // Using played_at timestamp
            .maybeSingle();

        if (timeError && timeError.code !== 'PGRST116') throw timeError;

        if (recentMatch) {
            throw new Error("تنبيه: الفريق في فترة راحة إجبارية. يجب الانتظار ساعتين بين المباريات الرسمية.");
        }

        return true;
    }

    /**
     * TRANSACTION: Submits a full match record.
     * This ensures Data Integrity by writing to multiple tables logically.
     * 
     * @param {Object} payload - Data Bundle containing:
     *  { creatorId, myTeamId, oppTeamId, venueId, myScore, oppScore, lineup[] }
     * @returns {Promise<boolean>} True on success.
     */
    async submitMatch(payload) {
        console.log("⚔️ MatchService: Executing Submission Transaction...");

        // 1. Insert Match Header (The Main Record)
        // Status defaults to 'PENDING_VERIFICATION' in DB, but we set explicit here for clarity
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .insert([{
                season_id: 1, // Default Season (MVP Hardcoded)
                team_a_id: payload.myTeamId,
                team_b_id: payload.oppTeamId,
                venue_id: payload.venueId,
                score_a: payload.myScore,
                score_b: payload.oppScore,
                creator_id: payload.creatorId,
                status: 'PENDING_VERIFICATION',
                match_data: {}, // Future extensibility
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
        // Critical for "Silent Player" problem: Defenders get credit for participation/clean sheets here.
        if (payload.lineup && payload.lineup.length > 0) {
            const lineupRows = payload.lineup.map(userId => ({
                match_id: matchId,
                team_id: payload.myTeamId,
                player_id: userId,
                is_starter: true, // Assuming all checked players started (MVP)
                xp_earned: 0 // Will be calculated by DB Triggers upon confirmation
            }));
            
            const { error: lineupError } = await supabase
                .from('match_lineups')
                .insert(lineupRows);
                
            if (lineupError) {
                console.error("Lineup Insert Error:", lineupError);
                // We log but do not throw, to avoid breaking the main match record creation
            }
        }

        // 3. Insert Events (Goals) if scorers provided
        // (Reserved for Phase 2 implementation of detailed scorer selection)
        if (payload.scorers && payload.scorers.length > 0) {
            const eventRows = payload.scorers.map(userId => ({
                match_id: matchId,
                player_id: userId,
                event_type: 'GOAL'
            }));
            await supabase.from('match_events').insert(eventRows);
        }

        return true;
    }

    /**
     * CONSENSUS: Verify (Confirm) a match result.
     * Called by the Opponent Captain via Notification.
     * 
     * @param {string} matchId - The match UUID.
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

        // 2. Update Match Status
        // This triggers the DB function 'process_match_results' to distribute points
        const { error } = await supabase
            .from('matches')
            .update({ status: 'CONFIRMED' })
            .eq('id', matchId);

        if (error) throw error;
        return true;
    }

    /**
     * CONSENSUS: Reject a match result (Dispute).
     * @param {string} matchId - The match UUID.
     * @param {string} verifierId - The captain clicking reject.
     */
    async rejectMatch(matchId, verifierId) {
        console.log(`🚩 Consensus: Match ${matchId} Rejected`);

        // 1. Log Rejection
        await supabase.from('match_verifications').insert([{
            match_id: matchId,
            verifier_id: verifierId,
            action: 'REJECT'
        }]);

        // 2. Update Status to REJECTED (No points awarded)
        const { error } = await supabase
            .from('matches')
            .update({ status: 'REJECTED' })
            .eq('id', matchId);
        
        if (error) throw error;
        return true;
    }

    /**
     * DISPLAY: Gets the Live Match Feed for the Zone.
     * Returns matches ordered by date (newest first).
     * 
     * @param {number} zoneId - The zone to filter by.
     * @returns {Promise<Array>} List of match objects with joined Team/Venue data.
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
            // Logic: Filter matches where Team A (Home Team) belongs to this Zone
            .eq('team_a.zone_id', zoneId) 
            .order('played_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error("Feed Error:", error);
            // Graceful degradation: return empty array instead of crashing UI
            return [];
        }
        return data;
    }
}
