/*
 * Filename: js/services/notificationService.js
 * Version: 3.0.0 (Day 4 - Batch 5)
 * Description: Manages the Inbox (Mint Requests & Match Verifications).
 * Acts as the 'Action Center' for Captains and Players.
 */

import { supabase } from '../core/supabaseClient.js';

export class NotificationService {

    /**
     * Fetches all pending actions for the user.
     * Aggregates data from 'mint_requests' and 'matches'.
     * @param {string} userId - Current User UUID.
     */
    async getPendingActions(userId) {
        console.log("🔔 Fetching Notifications...");
        
        const actions = [];

        // 1. Fetch Mint Requests (Incoming)
        const { data: mintReqs, error: mintError } = await supabase
            .from('mint_requests')
            .select(`
                id, message, created_at,
                requester:users!requester_id (username)
            `)
            .eq('target_player_id', userId)
            .eq('status', 'PENDING');

        if (!mintError && mintReqs) {
            mintReqs.forEach(req => {
                actions.push({
                    type: 'MINT_REQUEST',
                    id: req.id,
                    title: 'طلب توقيع كارت',
                    desc: `${req.requester.username} يطلب نسخة موقعة منك.`,
                    time: req.created_at
                });
            });
        }

        // 2. Fetch Match Verifications (For Captains)
        const { data: matchReqs, error: matchError } = await supabase
            .from('matches')
            .select(`
                id, score_a, score_b, played_at,
                team_a:teams!team_a_id (name),
                team_b:teams!team_b_id (name)
            `)
            .eq('verifier_id', userId)
            .eq('status', 'PENDING_VERIFICATION');

        if (!matchError && matchReqs) {
            matchReqs.forEach(match => {
                actions.push({
                    type: 'MATCH_VERIFY',
                    id: match.id,
                    title: 'تأكيد نتيجة مباراة',
                    desc: `${match.team_a.name} (${match.score_a}) - (${match.score_b}) ${match.team_b.name}`,
                    time: match.played_at
                });
            });
        }

        // Sort by newest
        return actions.sort((a, b) => new Date(b.time) - new Date(a.time));
    }

    /**
     * ACTION: Approve a Social Mint Request.
     * Logic:
     * 1. Mark Request as APPROVED.
     * 2. Clone the Player's Genesis Card as a GIFT for the Requester.
     */
    async approveMint(requestId, userId) {
        // A. Get Request Data
        const { data: req } = await supabase
            .from('mint_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (!req) throw new Error("الطلب غير موجود");

        // B. Get Genesis Card Data (To copy visuals)
        const { data: genesis } = await supabase
            .from('cards')
            .select('*')
            .eq('owner_id', userId)
            .eq('type', 'GENESIS')
            .single();

        if (!genesis) throw new Error("لا تملك كارتاً أصلياً لتنسخه.");

        // C. Mint the Gift Card
        // Transaction: Insert Card + Update Request
        const { error } = await supabase
            .from('cards')
            .insert([{
                owner_id: req.requester_id,     // The fan owns it now
                subject_id: userId,             // It's a picture of YOU
                display_name: genesis.display_name,
                activity_type: 'FAN',           // Gifts are passive
                position: genesis.position,
                visual_dna: genesis.visual_dna,
                stats: genesis.stats,           // Snapshot of stats
                minted_by: userId,              // Signed by You
                type: 'GIFT',
                is_verified: true
            }]);

        if (error) throw error;

        // D. Close Request
        await supabase
            .from('mint_requests')
            .update({ status: 'APPROVED' })
            .eq('id', requestId);

        return true;
    }

    /**
     * ACTION: Reject Mint
     */
    async rejectMint(requestId) {
        await supabase
            .from('mint_requests')
            .update({ status: 'REJECTED' })
            .eq('id', requestId);
    }

    /**
     * ACTION: Confirm Match Result
     * Logic: Update match status -> Triggers (DB Side) will handle points.
     */
    async confirmMatch(matchId) {
        const { error } = await supabase
            .from('matches')
            .update({ status: 'CONFIRMED' })
            .eq('id', matchId);

        if (error) throw error;
        return true;
    }

    /**
     * ACTION: Reject Match
     */
    async rejectMatch(matchId) {
        const { error } = await supabase
            .from('matches')
            .update({ status: 'REJECTED' })
            .eq('id', matchId);
        
        if (error) throw error;
        return true;
    }
}
