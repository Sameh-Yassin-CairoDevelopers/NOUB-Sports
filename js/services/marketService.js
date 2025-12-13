/*
 * Filename: js/services/marketService.js
 * Version: 4.2.2 (MASTER ACADEMIC)
 * Description: Service layer for Player Discovery & Scouting.
 * Handles complex joins to filter players by Zone, Activity, and Social Stats.
 */

import { supabase } from '../core/supabaseClient.js';

export class MarketService {

    /**
     * Fetches a list of players in the specified Zone.
     * Applies filters to show only relevant 'GENESIS' cards (Main Identity).
     * 
     * @param {number} zoneId - The Zone ID to filter by.
     * @param {string} currentUserId - To exclude self from results.
     * @returns {Promise<Array>} List of card objects with user details.
     */
    async getPlayersInZone(zoneId, currentUserId) {
        // Explicit Join: cards -> users (via owner_id)
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
                users!owner_id (
                    current_zone_id,
                    reputation_score
                )
            `)
            .eq('users.current_zone_id', zoneId) // Filter by Zone
            .neq('owner_id', currentUserId)      // Exclude Self
            .eq('type', 'GENESIS')               // Only Main Cards
            .order('created_at', { ascending: false })
            .limit(50); // Pagination Limit

        if (error) {
            console.error("Market Fetch Error:", error);
            // Translate error for UI
            if (error.code === 'PGRST200' || error.code === 'PGRST201') {
                throw new Error("خطأ في هيكل البيانات (Ambiguous Join).");
            }
            throw new Error("فشل تحميل السوق. يرجى المحاولة لاحقاً.");
        }

        return data;
    }

    /**
     * Retrieves 'Trending' players based on Social Mint Count.
     * Used for the "Talk of the Town" section.
     * 
     * @param {number} zoneId - The Zone ID.
     * @returns {Promise<Array>} Top 5 players by mint_count.
     */
    async getTrendingPlayers(zoneId) {
        const { data, error } = await supabase
            .from('cards')
            .select(`
                id,
                display_name,
                position,
                visual_dna,
                mint_count,
                users!owner_id ( current_zone_id )
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
     * Searches for players by Name or Position.
     * (Client-side filtering helper, or could be DB query).
     * Currently MVP uses client-side filter in Controller.
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
