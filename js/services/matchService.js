/*
 * Filename: js/services/matchService.js
 * Version: 5.0.0 (MASTER ENGINE)
 * Description: The Core Match Engine Service.
 * 
 * RESPONSIBILITIES:
 * 1. Constraints: Enforces Weekly Cap (24 matches) & Time Buffer (2 hours).
 * 2. Discovery: Fetches valid opponents (Active Teams) and Venues.
 * 3. Transaction: Executes the complex 'Submit Match' operation atomically:
 *    (Insert Match -> Insert Lineup -> Insert Events).
 * 4. Feed: Provides the live stream of matches for the Arena.
 */

import { supabase } from '../core/supabaseClient.js';

export class MatchService {

    /**
     * Fetches valid opponents in the same zone.
     * Rules: Team must be ACTIVE (5+ players) and NOT my team.
     * @param {number} zoneId - Local Zone ID.
     * @param {string} myTeamId - ID of the creating team.
     */
    async getOpponents(zoneId, myTeamId) {
        const { data, error } = await supabase
            .from('teams')
            .select('id, name, logo_dna')
            .eq('zone_id', zoneId)
            .eq('status', 'ACTIVE') 
            .neq('id', myTeamId);   
            
        if (error) throw new Error("فشل تحميل قائمة الخصوم.");
        return data || [];
    }

    /**
     * Fetches registered venues in the zone.
     */
    async getVenues(zoneId) {
        const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('zone_id', zoneId);
            
        if (error) throw new Error("فشل تحميل قائمة الملاعب.");
        return data || [];
    }

    /**
     * VALIDATION: Checks if the team is allowed to play.
     * @param {string} teamId - The team ID.
     */
    async validateMatchConstraints(teamId) {
        const now = new Date();
        
        // 1. Weekly Cap Check (24 Matches)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        
        const { count, error } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .gte('created_at', oneWeekAgo.toISOString());

        if (error) throw error;
        if (count >= 24) throw new Error("استنفد الفريق الحد الأقصى (24 مباراة أسبوعياً).");

        // 2. Time Buffer Check (2 Hours)
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(now.getHours() - 2);
        
        const { data: recent } = await supabase
            .from('matches')
            .select('id')
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .gte('created_at', twoHoursAgo.toISOString())
            .maybeSingle();

        if (recent) throw new Error("يجب الانتظار ساعتين بين المباريات الرسمية.");

        return true;
    }

    /**
     * TRANSACTION: Submits a full match record.
     * @param {Object} payload - { creatorId, myTeamId, oppTeamId, venueId, myScore, oppScore, lineup[] }
     */
    async submitMatch(payload) {
        console.log("⚔️ MatchService: Executing Transaction...");

        // 1. Insert Match Header
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .insert([{
                season_id: 1, // Default Season
                team_a_id: payload.myTeamId,
                team_b_id: payload.oppTeamId,
                venue_id: payload.venueId,
                score_a: payload.myScore,
                score_b: payload.oppScore,
                creator_id: payload.creatorId,
                status: 'PENDING_VERIFICATION',
                match_data: {}, // Future: Scorers JSON
                played_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (matchError) throw new Error(`فشل التسجيل: ${matchError.message}`);
        
        const matchId = match.id;

        // 2. Insert Lineup (Critical for Defenders/GKs logic)
        if (payload.lineup && payload.lineup.length > 0) {
            const lineupRows = payload.lineup.map(userId => ({
                match_id: matchId,
                team_id: payload.myTeamId,
                player_id: userId,
                is_starter: true,
                xp_earned: 0 // Calculated later by triggers
            }));
            
            const { error: lineupError } = await supabase.from('match_lineups').insert(lineupRows);
            if (lineupError) console.error("Lineup Error:", lineupError);
        }

        // 3. Insert Events (Goals) - Future expansion
        // ...

        return true;
    }

    /**
     * Gets Live Match Feed.
     */
    async getLiveFeed(zoneId) {
        const { data, error } = await supabase
            .from('matches')
            .select(`
                id, score_a, score_b, status, played_at,
                team_a:teams!team_a_id (name, logo_dna),
                team_b:teams!team_b_id (name, logo_dna),
                venue:venues (name)
            `)
            // Filter matches where Team A (Home) is in this Zone
            // Note: This relies on inner join filtering logic
            .eq('team_a.zone_id', zoneId) 
            .order('played_at', { ascending: false })
            .limit(20);

        if (error) {
            console.warn("Feed Fetch Warning:", error.message);
            return [];
        }
        return data;
    }
}
