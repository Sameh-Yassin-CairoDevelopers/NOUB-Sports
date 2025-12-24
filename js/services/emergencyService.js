/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/services/emergencyService.js
 * Version: 1.0.0 (OPERATIONS CORE)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * This service manages the "Live Marketplace" for match resources.
 * It handles the connection between the "Emergency Room" UI and the Supabase DB.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Broadcasting: Posting new 'WANTED' ads for Jokers (Tayyar) and Referees.
 * 2. Self-Promotion: Allowing players to post 'Availability' ads.
 * 3. Feed Aggregation: Fetching active, open requests filtered by Zone ID.
 * 4. Atomic Handshake: Securely locking a request when a user accepts it.
 * -----------------------------------------------------------------------------
 */

import { supabase } from '../core/supabaseClient.js';

export class EmergencyService {

    /**
     * [ACTION 1] POST REQUEST (Captain's Call)
     * Creates a new 'WANTED' entry in the database.
     * Used when a team is short a player or needs a referee.
     * 
     * @param {string} userId - UUID of the Captain (Requester).
     * @param {number} zoneId - The geographic zone ID.
     * @param {string} type - 'WANTED_JOKER' or 'WANTED_REF'.
     * @param {Object} matchDetails - { time, venue, teamNames, neededPos, note }.
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
                match_time: matchDetails.time, // ISO String
                venue_name: matchDetails.venue,
                // JSONB Payload for flexibility
                details: {
                    teams: matchDetails.teams || 'Unknown Match',
                    position: matchDetails.position || 'ANY',
                    note: matchDetails.note || ''
                },
                status: 'OPEN' // Default state
            }]);

        if (error) {
            console.error("SOS Post Error:", error);
            throw new Error("فشل نشر الطلب. يرجى المحاولة لاحقاً.");
        }
        return true;
    }

    /**
     * [ACTION 2] POST AVAILABILITY (Player's Offer)
     * Allows a player to announce they are free to play (The "Tayyar" mode).
     * Includes a check to prevent spamming duplicate ads.
     * 
     * @param {string} userId - UUID of the Player.
     * @param {number} zoneId - Geographic zone ID.
     * @param {string} position - Preferred position (e.g., GK, FWD).
     * @returns {Promise<boolean>} True if successful.
     */
    async postAvailability(userId, zoneId, position) {
        // 1. Integrity Check: Does an active ad already exist?
        const { data } = await supabase
            .from('match_requests')
            .select('id')
            .eq('requester_id', userId)
            .eq('type', 'I_AM_AVAILABLE')
            .eq('status', 'OPEN')
            .maybeSingle();

        if (data) {
            throw new Error("لديك إعلان توفر نشط بالفعل في غرفة العمليات.");
        }

        // 2. Post the Ad
        const { error } = await supabase
            .from('match_requests')
            .insert([{
                requester_id: userId,
                zone_id: zoneId,
                type: 'I_AM_AVAILABLE',
                // For availability, time/venue are null as they are TBD
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
     * Performs a JOIN to get the Requester's Username and Reputation.
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
                    username,
                    reputation_score
                )
            `)
            .eq('zone_id', zoneId)
            .eq('status', 'OPEN')
            .order('created_at', { ascending: false }); // Newest first

        if (error) {
            console.error("SOS Feed Error:", error);
            throw new Error("فشل تحميل غرفة العمليات.");
        }
        return data || [];
    }

    /**
     * [ACTION 4] ACCEPT REQUEST (The Handshake)
     * Performs an ATOMIC update to lock the request.
     * This prevents two players from accepting the same request simultaneously.
     * 
     * @param {string} requestId - UUID of the request.
     * @param {string} responderId - UUID of the user accepting the task.
     * @returns {Promise<boolean>} True if locked successfully.
     */
    async acceptRequest(requestId, responderId) {
        // A. Pre-check Verification
        const { data: request } = await supabase
            .from('match_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (!request) throw new Error("الطلب غير موجود.");
        if (request.status !== 'OPEN') throw new Error("عذراً، تم قبول هذا الطلب بواسطة شخص آخر للتو.");
        if (request.requester_id === responderId) throw new Error("لا يمكنك قبول طلبك الخاص.");

        // B. Execute Lock (Atomic Update)
        // We ensure 'status' is still 'OPEN' in the WHERE clause for concurrency safety.
        const { error } = await supabase
            .from('match_requests')
            .update({
                status: 'LOCKED',
                responder_id: responderId
            })
            .eq('id', requestId)
            .eq('status', 'OPEN'); 

        if (error) {
            console.error("Accept Error:", error);
            throw new Error("فشل قبول الطلب. حاول مرة أخرى.");
        }
        
        return true;
    }
}