/*
 * Filename: js/services/socialService.js
 * Version: 3.0.0
 * Description: Handles Social Interactions (Mint Requests).
 * Writes to: 'mint_requests' table.
 */

import { supabase } from '../core/supabaseClient.js';

export class SocialService {

    /**
     * Send a request to a player to mint a card for the requester.
     * @param {string} requesterId - Who wants the card.
     * @param {string} targetPlayerId - The star player.
     */
    async requestMint(requesterId, targetPlayerId) {
        // 1. Check if already requested (Pending)
        const { data: existing } = await supabase
            .from('mint_requests')
            .select('id')
            .eq('requester_id', requesterId)
            .eq('target_player_id', targetPlayerId)
            .eq('status', 'PENDING')
            .maybeSingle();

        if (existing) {
            throw new Error("لقد أرسلت طلباً لهذا اللاعب بالفعل وهو قيد الانتظار.");
        }

        // 2. Insert Request
        const { error } = await supabase
            .from('mint_requests')
            .insert([{
                requester_id: requesterId,
                target_player_id: targetPlayerId,
                status: 'PENDING',
                message: 'طلب نسخة موقعة (Social Mint)'
            }]);

        if (error) {
            console.error("Mint Request Error:", error);
            throw new Error("فشل إرسال الطلب.");
        }

        return true;
    }
}
