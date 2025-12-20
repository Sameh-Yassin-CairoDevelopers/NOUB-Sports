/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/services/matchService.js
 * Version: Noub Sports_beta 0.0.2 (PRESS ENGINE)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * The Central Match Engine. It acts as the bridge between the UI and the DB.
 * 
 * NEW CAPABILITIES (PRESS ENGINE):
 * - Integrates with 'NewsEngine' to auto-generate match narratives (Headlines).
 * - Stores narrative data into the 'match_data' JSONB column for retrieval.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Constraints: Enforces Weekly Cap (24 matches) & Time Buffer (2 hours).
 * 2. Transaction: Executes the Submit Match operation (Match + Lineup + Events).
 * 3. Verification: Handles the 'Handshake' (Verify/Reject) logic.
 * 4. Feed: Provides the live stream of matches for the Arena.
 * -----------------------------------------------------------------------------
 */

import { supabase } from '../core/supabaseClient.js';
import { NewsEngine } from '../utils/newsEngine.js'; // [NEW] Import News Engine

export class MatchService {

    /**
     * Fetches valid opponents in the same zone.
     * Rules: Active teams only, excluding self.
     * @param {number} zoneId - Zone ID.
     * @param {string} myTeamId - My Team ID.
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
     * Fetches registered venues for GPS validation.
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
     * VALIDATION: Checks if team is allowed to play.
     * Enforces Anti-Fraud rules.
     */
    async validateMatchConstraints(teamId) {
        const now = new Date();
        
        // 1. Weekly Cap (24 Matches)
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

        // 2. Time Buffer (2 Hours)
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(now.getHours() - 2);
        
        const { data: recentMatch, error: timeError } = await supabase
            .from('matches')
            .select('id')
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .gte('played_at', twoHoursAgo.toISOString())
            .maybeSingle();

        if (timeError && timeError.code !== 'PGRST116') throw timeError;

        if (recentMatch) {
            throw new Error("تنبيه: الفريق في فترة راحة إجبارية. يجب الانتظار ساعتين بين المباريات.");
        }

        return true;
    }

    /**
     * TRANSACTION: Submit Match + Generate News.
     * @param {Object} payload - Data Bundle from Controller.
     */
    async submitMatch(payload) {
        console.log("⚔️ MatchService: Generating News & Submitting...");

        // [NEW] 1. Generate Press Report
        // We need team names for the report.
        // For MVP speed, we might fetch names or pass them in payload.
        // Here we assume payload has names or we fetch them quickly.
        // Ideally, controller sends names to avoid extra fetch.
        // Fallback: Generic names if missing.
        const teamAName = payload.myTeamName || "فريقنا";
        const teamBName = payload.oppTeamName || "الخصم";

        const newsReport = NewsEngine.generateReport(
            teamAName, 
            teamBName, 
            payload.myScore, 
            payload.oppScore
        );

        // [NEW] 2. Prepare Match Data JSON
        const matchData = {
            headline: newsReport.headline,
            body: newsReport.body,
            mood: newsReport.mood,
            scorers_ids: payload.scorers || [] // Reserved for future
        };

        // 3. Insert Match Header
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .insert([{
                season_id: 1, // Default
                team_a_id: payload.myTeamId,
                team_b_id: payload.oppTeamId,
                venue_id: payload.venueId,
                score_a: payload.myScore,
                score_b: payload.oppScore,
                creator_id: payload.creatorId,
                status: 'PENDING_VERIFICATION',
                match_data: matchData, // <--- Storing the News Here
                played_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (matchError) {
            console.error("Match Insert Error:", matchError);
            throw new Error(`فشل تسجيل المباراة: ${matchError.message}`);
        }
        
        const matchId = match.id;

        // 4. Insert Lineups (Participation Logic)
        if (payload.lineup && payload.lineup.length > 0) {
            const lineupRows = payload.lineup.map(userId => ({
                match_id: matchId,
                team_id: payload.myTeamId,
                player_id: userId,
                is_starter: true,
                xp_earned: 0
            }));
            
            const { error: lineupError } = await supabase
                .from('match_lineups')
                .insert(lineupRows);
                
            if (lineupError) console.error("Lineup Insert Error:", lineupError);
        }

        // 5. Insert Events (Goals)
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
     * CONSENSUS: Confirm Match.
     */
    async confirmMatch(matchId, verifierId) {
        console.log(`🤝 MatchService: Confirming ${matchId}`);
        await supabase.from('match_verifications').insert([{
            match_id: matchId, verifier_id: verifierId, action: 'CONFIRM'
        }]);
        
        const { error } = await supabase.from('matches').update({ status: 'CONFIRMED' }).eq('id', matchId);
        if (error) throw error;
        return true;
    }

    /**
     * CONSENSUS: Reject Match.
     */
    async rejectMatch(matchId, verifierId) {
        console.log(`🚩 MatchService: Rejecting ${matchId}`);
        await supabase.from('match_verifications').insert([{
            match_id: matchId, verifier_id: verifierId, action: 'REJECT'
        }]);
        
        const { error } = await supabase.from('matches').update({ status: 'REJECTED' }).eq('id', matchId);
        if (error) throw error;
        return true;
    }

    /**
     * FEED: Get Live Matches (With News Headlines).
     */
    async getLiveFeed(zoneId) {
        // We select match_data which now contains the 'headline'
        const { data, error } = await supabase
            .from('matches')
            .select(`
                id, score_a, score_b, status, played_at, match_data,
                team_a:teams!team_a_id (name, logo_dna, zone_id),
                team_b:teams!team_b_id (name, logo_dna),
                venue:venues (name)
            `)
            .eq('team_a.zone_id', zoneId) 
            .order('played_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error("Feed Error:", error);
            return [];
        }
        return data;
    }
}
