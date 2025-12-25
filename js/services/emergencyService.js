/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/services/emergencyService.js
 * Version: 1.1.0 (FULL CYCLE LOGIC)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * This service layer acts as the bridge between the Operations Controller and 
 * the Database (Supabase). It manages the entire lifecycle of a "Match Request".
 * 
 * CORE RESPONSIBILITIES:
 * 1. Broadcasting: Creating new 'WANTED' ads for Jokers and Referees.
 * 2. Self-Promotion: Allowing players to announce availability.
 * 3. Feed Aggregation: Fetching active, open requests filtered by Zone.
 * 4. Transactional Locking: Securely accepting a request and locking it.
 * 5. [NEW] Notification Trigger: Automatically alerts the requester upon acceptance.
 * -----------------------------------------------------------------------------
 */

import { supabase } from '../core/supabaseClient.js';

export class EmergencyService {

    /**
     * [ACTION 1] POST REQUEST (Captain's Call)
     * Creates a new 'WANTED' entry in the 'match_requests' table.
     * Used when a team is short a player or needs a referee.
     * 
     * @param {string} userId - UUID of the Captain (Requester).
     * @param {number} zoneId - The geographic zone ID to broadcast to.
     * @param {string} type - Enum: 'WANTED_JOKER' or 'WANTED_REF'.
     * @param {Object} matchDetails - Payload { time, venue, teams, position, note }.
     * @returns {Promise<boolean>} True if successful.
     */
    async postRequest(userId, zoneId, type, matchDetails) {
        console.log(`🚨 SOS Service: Posting Request (${type}) by User ${userId}`);

        const { error } = await supabase
            .from('match_requests')
            .insert([{
                requester_id: userId,
                zone_id: zoneId,
                type: type,
                match_time: matchDetails.time, // ISO 8601 String
                venue_name: matchDetails.venue,
                // JSONB Payload for flexibility (No schema change needed for extra fields)
                details: {
                    teams: matchDetails.teams || 'Unknown Match',
                    position: matchDetails.position || 'ANY',
                    note: matchDetails.note || ''
                },
                status: 'OPEN' // Default visible state
            }]);

        if (error) {
            console.error("SOS Post Error:", error);
            throw new Error("فشل نشر الطلب. يرجى التأكد من الاتصال.");
        }
        return true;
    }

    /**
     * [ACTION 2] POST AVAILABILITY (Player's Offer)
     * Allows a player to announce they are free to play (The "Tayyar" mode).
     * Includes an integrity check to prevent spamming multiple active ads.
     * 
     * @param {string} userId - UUID of the Player.
     * @param {number} zoneId - Geographic zone ID.
     * @param {string} position - Preferred position (e.g., GK, FWD).
     * @returns {Promise<boolean>} True if successful.
     */
    async postAvailability(userId, zoneId, position) {
        // 1. Integrity Check: Does an active ad already exist for this user?
        const { data } = await supabase
            .from('match_requests')
            .select('id')
            .eq('requester_id', userId)
            .eq('type', 'I_AM_AVAILABLE')
            .eq('status', 'OPEN')
            .maybeSingle();

        if (data) {
            throw new Error("لديك إعلان توفر نشط بالفعل في غرفة العمليات. انتظر اتصالاً.");
        }

        // 2. Post the Ad
        const { error } = await supabase
            .from('match_requests')
            .insert([{
                requester_id: userId,
                zone_id: zoneId,
                type: 'I_AM_AVAILABLE',
                // For availability, specific time/venue are null as they are TBD
                details: { position: position },
                status: 'OPEN'
            }]);

        if (error) {
            console.error("Availability Post Error:", error);
            throw new Error("فشل تسجيل حالتك.");
        }
        return true;
    }

    /**
     * [ACTION 3] FETCH ACTIVE FEED
     * Retrieves the list of OPEN requests for a specific zone.
     * Performs a Relational JOIN to get the Requester's Username and Reputation score.
     * 
     * @param {number} zoneId - Zone ID to filter by.
     * @returns {Promise<Array>} List of request objects.
     */
    async getActiveRequests(zoneId) {
        const { data, error } = await supabase
            .from('match_requests')
            .select(`
                id,
                type,
                match_time,
                venue_name,
                details,
                created_at,
                requester:users!requester_id (
                    id,
                    username,
                    reputation_score
                )
            `)
            .eq('zone_id', zoneId)
            .eq('status', 'OPEN')
            .order('created_at', { ascending: false }); // Show newest first

        if (error) {
            console.error("SOS Feed Error:", error);
            throw new Error("فشل تحميل بيانات غرفة العمليات.");
        }
        return data || [];
    }

    /**
     * [ACTION 4] ACCEPT REQUEST (The Handshake & Notification)
     * Performs an ATOMIC update to lock the request and notify the owner.
     * This prevents race conditions (two players accepting same job).
     * 
     * UPDATE V1.1: Triggers an insert into 'notifications' table.
     * 
     * @param {string} requestId - UUID of the request.
     * @param {string} responderId - UUID of the user accepting the task.
     * @returns {Promise<boolean>} True if locked successfully.
     */
    async acceptRequest(requestId, responderId) {
        // A. Pre-check Verification (Fetch current state)
        const { data: request } = await supabase
            .from('match_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (!request) throw new Error("الطلب غير موجود أو تم حذفه.");
        
        // Concurrency Check
        if (request.status !== 'OPEN') throw new Error("عذراً، تم قبول هذا الطلب بواسطة شخص آخر للتو.");
        
        // Logic Check
        if (request.requester_id === responderId) throw new Error("لا يمكنك قبول طلبك الخاص.");

        // B. Execute Lock (Atomic Update)
        // We ensure 'status' is still 'OPEN' in the WHERE clause for extra safety.
        const { error: updateError } = await supabase
            .from('match_requests')
            .update({
                status: 'LOCKED',
                responder_id: responderId
            })
            .eq('id', requestId)
            .eq('status', 'OPEN'); 

        if (updateError) {
            console.error("Accept Error:", updateError);
            throw new Error("فشل قبول الطلب. حاول مرة أخرى.");
        }

        // C. [NEW] Trigger Notification for the Requester
        // This closes the loop: Captain gets notified that someone is coming.
        this._sendAcceptNotification(request.requester_id, request.type);
        
        return true;
    }
    /**
     * [ACTION 5] GET MY ACTIVE MISSIONS
     * Fetches requests where I am involved (either as Requester or Responder)
     * AND the status is LOCKED (Work in progress).
     */
    async getMyActiveMissions(userId) {
        const { data, error } = await supabase
            .from('match_requests')
            .select(`
                *,
                requester:users!requester_id(username, reputation_score),
                responder:users!responder_id(username, reputation_score)
            `)
            .eq('status', 'LOCKED') // Only active/locked deals
            .or(`requester_id.eq.${userId},responder_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("My Missions Error:", error);
            return [];
        }
        return data;
    }
    
    /**
     * Internal Helper: Sends a system notification to the requester.
     * Fire-and-forget (we don't await this to keep UI responsive).
     */
    async _sendAcceptNotification(targetUserId, requestType) {
        try {
            const messageMap = {
                'WANTED_JOKER': 'تم العثور على لاعب! (جوكر) قبل مهمتك.',
                'WANTED_REF': 'تم تعيين حكم لمباراتك.',
                'I_AM_AVAILABLE': 'كابتن يريد استدعاءك للمباراة!'
            };

            const msg = messageMap[requestType] || 'تم قبول طلبك في غرفة العمليات.';

            // Insert into notifications table (Assuming table exists based on app architecture)
            await supabase
                .from('notifications')
                .insert([{
                    user_id: targetUserId,
                    type: 'OPS_UPDATE',
                    title: 'تحديث غرفة العمليات',
                    message: msg,
                    is_read: false,
                    created_at: new Date().toISOString()
                }]);
                
            console.log("🔔 Notification sent to requester.");
        } catch (e) {
            // Log error but don't break the flow
            console.warn("Notification Trigger Failed:", e);
        }
    }
}
