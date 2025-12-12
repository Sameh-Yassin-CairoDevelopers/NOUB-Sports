/*
 * Filename: js/services/matchService.js
 * Version: 3.2.0 (Full Logic with Lineups)
 * Description: Handles the entire Match Lifecycle.
 * Enforces: Weekly Caps, Time Buffers, and Lineup Integrity.
 */

import { supabase } from '../core/supabaseClient.js';

export class MatchService {

    /**
     * Get active teams in the same zone (excluding my team) to play against.
     */
    async getOpponents(zoneId, myTeamId) {
        const { data, error } = await supabase
            .from('teams')
            .select('id, name, logo_dna')
            .eq('zone_id', zoneId)
            .eq('status', 'ACTIVE') // Only full teams
            .neq('id', myTeamId);   // Don't play yourself
            
        if (error) throw new Error("فشل تحميل قائمة الخصوم");
        return data;
    }

    /**
     * Get available venues in the zone.
     */
    async getVenues(zoneId) {
        const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('zone_id', zoneId);
            
        if (error) throw new Error("فشل تحميل الملاعب");
        return data;
    }

    /**
     * Validate Match Constraints (The 24-Match Rule & 2-Hour Buffer).
     */
    async validateConstraints(teamId) {
        const now = new Date();
        
        // 1. Check Weekly Cap (24 Matches)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        
        const { count } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .gte('created_at', oneWeekAgo.toISOString());

        if (count >= 24) throw new Error("استنفد الفريق الحد الأقصى (24 مباراة أسبوعياً).");

        // 2. Check 2-Hour Buffer
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(now.getHours() - 2);
        
        const { data: recent } = await supabase
            .from('matches')
            .select('id')
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .gte('created_at', twoHoursAgo.toISOString())
            .maybeSingle();

        if (recent) throw new Error("يجب الانتظار ساعتين بين المباريات.");

        return true;
    }

    /**
     * MASTER FUNCTION: Submit Match Result
     * Records: Match Header, Lineup, and Events (Goals).
     * @param {Object} payload - { creatorId, myTeamId, oppTeamId, venueId, myScore, oppScore, lineup[], scorers[] }
     */
    async submitMatch(payload) {
        console.log("⚔️ Submitting Match...");

        // 1. Create Match Record (Status: PENDING)
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .insert([{
                season_id: 1, // Default Season (seeded)
                team_a_id: payload.myTeamId,
                team_b_id: payload.oppTeamId,
                venue_id: payload.venueId,
                score_a: payload.myScore,
                score_b: payload.oppScore,
                creator_id: payload.creatorId,
                status: 'PENDING',
                played_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (matchError) throw new Error(`فشل التسجيل: ${matchError.message}`);
        
        const matchId = match.id;

        // 2. Insert Lineup (Who played?) - Critical for Defenders
        // Payload.lineup is array of userIDs
        if (payload.lineup.length > 0) {
            const lineupRows = payload.lineup.map(userId => ({
                match_id: matchId,
                team_id: payload.myTeamId,
                player_id: userId,
                is_starter: true
            }));
            await supabase.from('match_lineups').insert(lineupRows);
        }

        // 3. Insert Goals (Events)
        // Payload.scorers is array of userIDs (can be repeated for multiple goals)
        if (payload.scorers.length > 0) {
            const eventRows = payload.scorers.map(userId => ({
                match_id: matchId,
                player_id: userId,
                event_type: 'GOAL'
            }));
            await supabase.from('match_events').insert(eventRows);
        }

        // 4. Send Notification to Opponent Captain (Handled by DB Triggers usually, or separate service call)
        // For MVP, the match will appear in their "Pending Actions" tab automatically.

        return true;
    }

    /**
     * Get Live Matches for the Arena Feed
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
            .order('played_at', { ascending: false })
            .limit(20);

        if (error) return [];
        return data;
    }
}
