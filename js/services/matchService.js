/*
 * Filename: js/services/matchService.js
 * Version: 4.2.0 (Diamond Release)
 * Description: The Core Match Engine Service.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Constraint Validation: Enforces the "24-Match Rule" and "2-Hour Buffer" rule.
 * 2. Data Retrieval: Fetches contextual data (Opponents, Venues, Live Feed).
 * 3. Transaction Management: Orchestrates the complex insert sequence for a match record
 *    (Header -> Lineups -> Events).
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
        
        // --- Check 1: Weekly Cap ---
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

        // --- Check 2: 2-Hour Buffer ---
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(now.getHours() - 2);
        
        const { data: recentMatch, error: timeError } = await supabase
            .from('matches')
            .select('id')
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .gte('created_at', twoHoursAgo.toISOString())
            .maybeSingle();

        if (timeError && timeError.code !== 'PGRST116') throw timeError;

        if (recentMatch) {
            throw new Error("تنبيه: يجب الانتظار ساعتين على الأقل بين المباريات الرسمية.");
        }

        return true;
    }

    /**
     * TRANSACTION: Submits a full match record.
     * 
     * Steps:
     * 1. Insert Match Header (Score, Teams, Venue).
     * 2. Insert Match Lineups (Who played?).
     * 3. Insert Match Events (Scorers).
     * 
     * @param {Object} payload - Combined data object from Controller.
     */
    async submitMatch(payload) {
        console.log("⚔️ MatchService: Submitting Transaction...");

        // 1. Insert Match Header
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
                match_data: {}, // Future: detailed stats
                played_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (matchError) {
            console.error("Match Insert Error:", matchError);
            throw new Error(`فشل تسجيل المباراة: ${matchError.message}`);
        }
        
        const matchId = match.id;

        // 2. Insert Lineups (Critical for Participation XP)
        // Payload.lineup is an array of UserIDs who were checked
        if (payload.lineup && payload.lineup.length > 0) {
            const lineupRows = payload.lineup.map(userId => ({
                match_id: matchId,
                team_id: payload.myTeamId,
                player_id: userId,
                is_starter: true, // MVP: All selected are starters
                xp_earned: 0 // Will be calculated upon confirmation
            }));
            
            const { error: lineupError } = await supabase
                .from('match_lineups')
                .insert(lineupRows);
                
            if (lineupError) {
                console.error("Lineup Insert Error:", lineupError);
                // Non-blocking for MVP, but should be logged
            }
        }

        // 3. Insert Events (Goals) if scorers provided
        // (Note: Controller v4.0 sends empty scorers array currently, reserved for future update)
        if (payload.scorers && payload.scorers.length > 0) {
            const eventRows = payload.scorers.map(userId => ({
                match_id: matchId,
                player_id: userId,
                event_type: 'GOAL'
            }));
            await supabase.from('match_events').insert(eventRows);
        }

        // 4. Verification Logic (Notifications)
        // Handled by Database Triggers or NotificationService polling.
        
        return true;
    }

    /**
     * Gets the Live Match Feed for the Zone.
     * Returns matches ordered by date (newest first).
     * @param {number} zoneId - The zone to filter by.
     */
    async getLiveFeed(zoneId) {
        // We join with 'teams' and 'venues' to get readable names
        const { data, error } = await supabase
            .from('matches')
            .select(`
                id, score_a, score_b, status, played_at,
                team_a:teams!team_a_id (name, logo_dna, zone_id),
                team_b:teams!team_b_id (name, logo_dna),
                venue:venues (name)
            `)
            // Logic: Filter matches where Team A belongs to the Zone
            .eq('team_a.zone_id', zoneId) 
            .order('played_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error("Feed Error:", error);
            // Return empty array gracefully to avoid crashing UI
            return [];
        }
        return data;
    }
}
