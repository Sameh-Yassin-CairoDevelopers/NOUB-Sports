/*
 * Filename: js/services/notificationService.js
 * Version: 3.0.0 (Day 4 - Engagement)
 * Description: Manages User Notifications.
 * Responsibilities:
 *  - Fetch inbox.
 *  - Mark as read.
 *  - Handle Actions: Approve Mint Request (and generate card), Accept Match Invite.
 */

import { supabase } from '../core/supabaseClient.js';

export class NotificationService {

    /**
     * Get unread notifications for a user.
     */
    async getNotifications(userId) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data;
    }

    /**
     * Mark notification as read.
     */
    async markAsRead(notifId) {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notifId);
    }

    /**
     * ACTION: Approve a Social Mint Request.
     * This logic sits here because it's triggered from the Notification View.
     * 
     * 1. Update request status to APPROVED.
     * 2. Mint the GIFT Card for the requester.
     */
    async approveMintRequest(requestId) {
        console.log(`🎁 Social Mint: Approving Request ${requestId}`);

        // A. Get Request Details
        const { data: reqData, error: fetchError } = await supabase
            .from('mint_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (fetchError || !reqData) throw new Error("طلب غير موجود.");

        // B. Update Status
        await supabase
            .from('mint_requests')
            .update({ status: 'APPROVED' })
            .eq('id', requestId);

        // C. Fetch The Star Player Data (Source of the card)
        // We need to copy visual_dna from the star (target_player_id)
        const { data: starCard } = await supabase
            .from('cards')
            .select('*')
            .eq('owner_id', reqData.target_player_id)
            .eq('type', 'GENESIS')
            .single();

        if (!starCard) throw new Error("لا يمكن العثور على الكارت الأصلي.");

        // D. Mint the GIFT Card
        // Logic: Owner becomes the Requester, but Subject remains the Star.
        const { error: mintError } = await supabase
            .from('cards')
            .insert([{
                owner_id: reqData.requester_id,   // The Fan gets it
                subject_id: reqData.target_player_id, // It's a picture of the Star
                display_name: starCard.display_name,
                
                activity_type: 'FAN', // Gift cards don't play matches
                visual_dna: starCard.visual_dna, // Same look
                stats: starCard.stats, // Snapshot of stats
                
                type: 'GIFT',
                minted_by: reqData.target_player_id, // Signed by Star
                is_verified: true,
                
                // Serial Number Logic: Count existing cards + 1
                // (Simplified for MVP, usually requires atomic increment)
                serial_number: Math.floor(Math.random() * 1000) + 2 
            }]);

        if (mintError) throw mintError;

        return true;
    }

    /**
     * ACTION: Reject Request
     */
    async rejectMintRequest(requestId) {
        await supabase
            .from('mint_requests')
            .update({ status: 'REJECTED' })
            .eq('id', requestId);
    }
}