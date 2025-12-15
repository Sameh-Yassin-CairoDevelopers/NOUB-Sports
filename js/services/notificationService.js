/*
 * Filename: js/services/notificationService.js
 * Version: 5.0.0 (MASTER SERVICE)
 * Description: Manages User Inbox and Action Execution.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Fetching: Aggregates pending Mint Requests and Match Verifications.
 * 2. Execution: Handles the 'Approve' logic which triggers asset creation (Minting).
 * 3. Feedback: Updates status and sends confirmation notifications.
 */

import { supabase } from '../core/supabaseClient.js';

export class NotificationService {

    /**
     * Fetches all pending actions for the current user.
     * Aggregates data from multiple tables (mint_requests, matches).
     * @param {string} userId - Current User UUID.
     * @returns {Promise<Array>} List of standardized action objects.
     */
    async getPendingActions(userId) {
        const actions = [];

        try {
            // A. Fetch Incoming Mint Requests
            const { data: mintReqs, error: mintError } = await supabase
                .from('mint_requests')
                .select(`
                    id, message, created_at,
                    requester:users!requester_id (username)
                `)
                .eq('target_player_id', userId)
                .eq('status', 'PENDING');

            if (mintReqs && !mintError) {
                mintReqs.forEach(req => {
                    actions.push({
                        type: 'MINT_REQUEST',
                        id: req.id,
                        title: 'طلب توقيع كارت',
                        desc: `${req.requester?.username || 'مستخدم'} يطلب نسخة موقعة منك.`,
                        time: req.created_at
                    });
                });
            }

            // B. Fetch Match Verifications (For Captains)
            const { data: matchReqs, error: matchError } = await supabase
                .from('matches')
                .select(`
                    id, score_a, score_b, played_at,
                    team_a:teams!team_a_id (name),
                    team_b:teams!team_b_id (name)
                `)
                .eq('verifier_id', userId)
                .eq('status', 'PENDING_VERIFICATION');

            if (matchReqs && !matchError) {
                matchReqs.forEach(match => {
                    actions.push({
                        type: 'MATCH_VERIFY',
                        id: match.id,
                        title: 'تأكيد نتيجة مباراة',
                        desc: `${match.team_a?.name} (${match.score_a}) - (${match.score_b}) ${match.team_b?.name}`,
                        time: match.played_at
                    });
                });
            }

            // Sort by newest first
            return actions.sort((a, b) => new Date(b.time) - new Date(a.time));

        } catch (err) {
            console.error("Notification Fetch Error:", err);
            return [];
        }
    }

    /**
     * ACTION: Approve a Social Mint Request.
     * 
     * TRANSACTION LOGIC:
     * 1. Validate Request.
     * 2. Clone the User's Genesis Card.
     * 3. Insert new Card as 'GIFT' for the requester.
     * 4. Update Request Status to 'APPROVED'.
     * 5. Notify Requester.
     */
    async approveMint(requestId, userId) {
        console.log(`🎁 NotificationService: Approving Mint ${requestId}`);

        // 1. Get Request Details
        const { data: req } = await supabase
            .from('mint_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (!req) throw new Error("الطلب غير موجود أو تم حذفه.");

        // 2. Get the Star's Genesis Card (Source of Truth)
        const { data: genesis } = await supabase
            .from('cards')
            .select('*')
            .eq('owner_id', userId)
            .eq('type', 'GENESIS')
            .single();

        if (!genesis) throw new Error("يجب أن تمتلك كارتاً أصلياً (Genesis) لتتمكن من إهداء نسخ.");

        // 3. Mint the GIFT Card (The Asset)
        const { error: mintError } = await supabase
            .from('cards')
            .insert([{
                owner_id: req.requester_id,     // Ownership transferred to Requester
                subject_id: userId,             // The card still depicts YOU
                display_name: genesis.display_name,
                
                // Fan Attributes
                activity_type: 'FAN',           // Gifts are collectibles, not playable
                position: genesis.position,
                visual_dna: genesis.visual_dna, // Keep original look
                stats: genesis.stats,           // Snapshot of current stats
                
                // Meta
                minted_by: userId,              // Signed by You
                type: 'GIFT',
                is_verified: true,              // Verified because it came from the owner
                serial_number: (genesis.mint_count || 1) + 1 // Increment serial (Logic handled by DB trigger ideally, mocked here)
            }]);

        if (mintError) throw new Error(`فشل إنشاء الكارت: ${mintError.message}`);

        // 4. Update Request Status
        await supabase
            .from('mint_requests')
            .update({ status: 'APPROVED' })
            .eq('id', requestId);

        // 5. Increment Mint Count on Genesis Card (For Trending Algo)
        await supabase.rpc('increment_mint_count', { card_id: genesis.id }); 
        // Note: If RPC missing, we can do update: mint_count = mint_count + 1

        return true;
    }

    /**
     * ACTION: Reject Mint Request
     */
    async rejectMint(requestId) {
        const { error } = await supabase
            .from('mint_requests')
            .update({ status: 'REJECTED' })
            .eq('id', requestId);
        
        if (error) throw new Error("فشل رفض الطلب.");
        return true;
    }

    /**
     * ACTION: Confirm Match Result
     * Updates Match status. DB Triggers handle the rest (Points/XP).
     */
    async confirmMatch(matchId) {
        console.log(`⚔️ NotificationService: Confirming Match ${matchId}`);
        
        const { error } = await supabase
            .from('matches')
            .update({ status: 'CONFIRMED' })
            .eq('id', matchId);

        if (error) throw new Error("فشل تأكيد المباراة.");
        return true;
    }

    /**
     * ACTION: Reject Match Result
     */
    async rejectMatch(matchId) {
        console.log(`🚩 NotificationService: Rejecting Match ${matchId}`);
        
        const { error } = await supabase
            .from('matches')
            .update({ status: 'REJECTED' })
            .eq('id', matchId);
        
        if (error) throw new Error("فشل رفض المباراة.");
        return true;
    }
}
