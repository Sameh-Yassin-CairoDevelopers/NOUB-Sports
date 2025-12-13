/*
 * Filename: js/services/marketService.js
 * Version: 4.3.0 (FIX: Inner Join Filtering)
 * Description: Service layer for Player Discovery & Scouting.
 * FIX NOTES: Added '!inner' to relations to allow filtering by parent table columns.
 */

import { supabase } from '../core/supabaseClient.js';

export class MarketService {

    /**
     * Fetches a list of players in the specified Zone.
     * Uses INNER JOIN to strictly filter cards owned by users in that zone.
     * 
     * @param {number} zoneId - The Zone ID to filter by.
     * @param {string} currentUserId - To exclude self from results.
     * @returns {Promise<Array>} List of card objects with user details.
     */
    async getPlayersInZone(zoneId, currentUserId) {
        // CRITICAL FIX: Used '!inner' to allow filtering on 'users.current_zone_id'
        const { data, error } = await supabase
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
            .eq('users.current_zone_id', zoneId) // This filter requires !inner
            .neq('owner_id', currentUserId)      // Exclude Self
            .eq('type', 'GENESIS')               // Only Main Cards
            .order('created_at', { ascending: false })
            .limit(50); 

        if (error) {
            console.error("Market Fetch Error:", error);
            throw new Error("فشل تحميل السوق. تأكد من صحة البيانات.");
        }

        return data;
    }

    /**
     * Retrieves 'Trending' players based on Social Mint Count.
     * @param {number} zoneId - The Zone ID.
     */
    async getTrendingPlayers(zoneId) {
        // CRITICAL FIX: Used '!inner' here as well
        const { data, error } = await supabase
            .from('cards')
            .select(`
                id,
                display_name,
                position,
                visual_dna,
                mint_count,
                users!owner_id!inner ( current_zone_id )
            `)
            .eq('users.current_zone_id', zoneId)
            .order('mint_count', { ascending: false })
            .limit(5);

        if (error) {
            console.warn("Trending Fetch Warning:", error);
            return [];
        }
        
        return data;
    }

    /**
     * Client-side search helper
     */
    searchLocal(allPlayers, term) {
        if (!term) return allPlayers;
        const lowerTerm = term.toLowerCase();
        
        return allPlayers.filter(p => 
            (p.display_name && p.display_name.toLowerCase().includes(lowerTerm)) ||
            (p.position && p.position.toLowerCase().includes(lowerTerm))
        );
    }
}
