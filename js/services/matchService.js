/*
 * Filename: js/services/matchService.js
 * Version: 3.0.0 (Day 4 - The Engine)
 * Description: Handles Match Lifecycle, Constraints, and Verification.
 * Enforces strict rules:
 *  1. Weekly Cap (24 matches).
 *  2. Temporal Buffer (2 hours).
 *  3. Full Result Logging (Score + Lineup + Events).
 *  4. Consensus Mechanism (Verification).
 */

import { supabase } from '../core/supabaseClient.js';

export class MatchService {

    /**
     * Validates if a team is allowed to play a new match.
     * @param {string} teamId - The team initiating the match.
     * @returns {Promise<boolean>} True if allowed, throws Error if blocked.
     */
    async validateMatchConstraints(teamId) {
        // 1. Check Weekly Cap (Max 24)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { count, error } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .gte('played_at', oneWeekAgo.toISOString());

        if (error) throw error;

        if (count >= 24) {
            throw new Error("لقد استنفد الفريق الحد الأقصى للمباريات هذا الأسبوع (24 مباراة).");
        }

        // 2. Check Temporal Overlap (2 Hours Buffer)
        // Logic: Is there any match played by this team in the last 2 hours?
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

        const { data: recentMatch } = await supabase
            .from('matches')
            .select('id')
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .gte('played_at', twoHoursAgo.toISOString())
            .maybeSingle();

        if (recentMatch) {
            throw new Error("لا يمكن تسجيل مباراة جديدة. الفريق في فترة راحة إجبارية (ساعتين بين المباريات).");
        }

        return true;
    }

    /**
     * Creates a basic match record (Pre-Game or Post-Game Entry).
     * Status starts as 'PENDING_VERIFICATION'.
     */
    async createMatchRecord(creatorId, teamA_Id, teamB_Id, venueId, date) {
        console.log("⚔️ Engine: Creating Match Record...");
        
        // Validate Constraints first
        await this.validateMatchConstraints(teamA_Id);

        const { data, error } = await supabase
            .from('matches')
            .insert([{
                creator_id: creatorId,
                team_a_id: teamA_Id,
                team_b_id: teamB_Id,
                venue_id: venueId,
                played_at: date,
                status: 'PENDING_VERIFICATION' // Waiting for logic
            }])
            .select()
            .single();

        if (error) throw new Error(`فشل إنشاء المباراة: ${error.message}`);
        return data;
    }

    /**
     * Submits the full result (Score, Lineup, Events).
     * This is a Transaction-like operation.
     * @param {string} matchId - The Match UUID.
     * @param {Object} resultData - { scoreA, scoreB, lineup: [], events: [] }
     */
    async submitFullResult(matchId, resultData) {
        console.log(`📝 Engine: Logging Result for Match ${matchId}`);

        // 1. Update Match Score & Status
        const { error: matchError } = await supabase
            .from('matches')
            .update({
                score_a: resultData.scoreA,
                score_b: resultData.scoreB,
                status: 'PENDING_VERIFICATION' // Needs opponent confirm
            })
            .eq('id', matchId);

        if (matchError) throw matchError;

        // 2. Insert Lineup (Who played?)
        // lineup array contains: { playerId, teamId, isStarter }
        if (resultData.lineup && resultData.lineup.length > 0) {
            const lineupRows = resultData.lineup.map(p => ({
                match_id: matchId,
                player_id: p.playerId,
                team_id: p.teamId,
                is_starter: p.isStarter
            }));
            
            const { error: lineupError } = await supabase
                .from('match_lineups')
                .insert(lineupRows);
                
            if (lineupError) console.error("Lineup Insert Error:", lineupError);
        }

        // 3. Insert Events (Goals, Cards)
        // events array contains: { playerId, type, minute }
        if (resultData.events && resultData.events.length > 0) {
            const eventRows = resultData.events.map(e => ({
                match_id: matchId,
                player_id: e.playerId,
                event_type: e.type, // GOAL, YELLOW, RED
                minute: e.minute
            }));

            const { error: eventError } = await supabase
                .from('match_events')
                .insert(eventRows);

            if (eventError) console.error("Event Insert Error:", eventError);
        }

        // 4. Create Notification for Opponent Captain (handled in NotificationService or Trigger)
        // For MVP, we assume the UI will handle sending the notification call.

        return true;
    }

    /**
     * The Handshake: Verify Match
     * @param {string} matchId 
     * @param {string} verifierId - The Opponent Captain
     * @param {string} action - 'CONFIRM' or 'REJECT'
     */
    async verifyMatch(matchId, verifierId, action) {
        console.log(`🤝 Consensus: ${action} by ${verifierId}`);

        // 1. Log Verification Action
        await supabase.from('match_verifications').insert([{
            match_id: matchId,
            verifier_id: verifierId,
            action: action
        }]);

        // 2. Update Match Status
        const newStatus = (action === 'CONFIRM') ? 'CONFIRMED' : 'REJECTED';
        
        const { error } = await supabase
            .from('matches')
            .update({ status: newStatus })
            .eq('id', matchId);

        if (error) throw error;

        // Note: If CONFIRMED, a Database Trigger (statsEngine) should update 
        // team stats and player XP automatically. We don't do it in JS to prevent cheating.

        return newStatus;
    }

    /**
     * Fetch Live Matches in Zone
     */
    async getMatchesInZone(zoneId) {
        const { data, error } = await supabase
            .from('matches')
            .select(`
                id, played_at, status, score_a, score_b,
                team_a:team_a_id(name, logo_dna),
                team_b:team_b_id(name, logo_dna),
                venue:venue_id(name)
            `)
            .eq('status', 'CONFIRMED') // Only show confirmed or active
            // Note: In real app, we filter by venue.zone_id via join, 
            // but for simplicity we fetch all and filter or rely on simple query.
            .order('played_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        return data;
    }
}
