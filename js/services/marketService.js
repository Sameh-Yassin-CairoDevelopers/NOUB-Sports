/*
 * Filename: js/services/marketService.js
 * Version: 5.0.0 (Smart Filter Edition)
 * Description: Service layer for Player Discovery.
 * 
 * FEATURES:
 * 1. Deduplication: Ensures 'Trending' list shows unique players only.
 * 2. Filtering: Allows fetching by specific Activity Type (PLAYER vs FAN).
 * 3. Deep Linking: Fetches User Zone & Reputation via Inner Joins.
 */

import { supabase } from '../core/supabaseClient.js';

export class MarketService {

    /**
     * Fetches players in the zone with specific filters.
     * @param {number} zoneId - The Zone ID.
     * @param {string} userId - Current user ID (to exclude).
     * @param {string} typeFilter - 'ALL', 'PLAYER', or 'FAN'.
     * @returns {Promise<Array>} List of cards.
     */
    async getPlayersInZone(zoneId, userId, typeFilter = 'ALL') {
        
        // Start building the query
        let query = supabase
            .from('cards')
            .select(`
                id,
                display_name,
                position,
                activity_type,
                visual_dna,
                stats,
                owner_id,
                mint_count,
                users!owner_id!inner (
                    current_zone_id,
                    reputation_score
                )
            `)
            .eq('users.current_zone_id', zoneId) // Strict Zone Filter
            .neq('owner_id', userId)             // Exclude Self
            .eq('type', 'GENESIS')               // Only Main Identity Cards
            .order('created_at', { ascending: false })
            .limit(50);

        // Apply Type Filter
        if (typeFilter === 'PLAYER') {
            // Fetch anyone who is NOT a fan (Club, Youth, Free)
            query = query.neq('activity_type', 'FAN');
        } else if (typeFilter === 'FAN') {
            query = query.eq('activity_type', 'FAN');
        }

        const { data, error } = await query;

        if (error) {
            console.error("Market Fetch Error:", error);
            throw new Error("فشل تحميل السوق. تأكد من جودة الاتصال.");
        }

        return data;
    }

    /**
     * Retrieves 'Trending' players (Unique Subjects Only).
     * Logic: Fetches top 20, then filters duplicates in JS to ensure variety.
     * @param {number} zoneId - The Zone ID.
     */
    async getTrendingPlayers(zoneId) {
        const { data, error } = await supabase
            .from('cards')
            .select(`
                id, display_name, position, visual_dna, mint_count, subject_id,
                users!owner_id!inner ( current_zone_id )
            `)
            .eq('users.current_zone_id', zoneId)
            .eq('type', 'GENESIS')
            .order('mint_count', { ascending: false })
            .limit(20); // Fetch more to allow for filtering

        if (error) {
            console.warn("Trending Warning:", error);
            return [];
        }
        
        // Client-Side Deduplication (Unique Subject ID)
        const uniqueMap = new Map();
        const result = [];
        
        for (const card of data) {
            if (!uniqueMap.has(card.subject_id)) {
                uniqueMap.set(card.subject_id, true);
                result.push(card);
            }
            if (result.length >= 5) break; // Limit to Top 5 Unique
        }

        return result;
    }
}
