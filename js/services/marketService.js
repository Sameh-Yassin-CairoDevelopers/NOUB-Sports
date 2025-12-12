/*
 * Filename: js/services/marketService.js
 * Version: 3.0.0 (Day 4 - Batch 3)
 * Description: Handles Player Discovery & Searching.
 * Queries: 'cards' table joined with 'users'.
 * Filters: By Zone (Strict), Position, and Name.
 */

import { supabase } from '../core/supabaseClient.js';

export class MarketService {

    /**
     * Fetch players in the same zone.
     * Logic: Excludes the current user (don't scout yourself).
     * @param {number} zoneId - The local Khôra ID.
     * @param {string} userId - Current user ID (to exclude).
     * @returns {Promise<Array>} List of player cards.
     */
    async getPlayersInZone(zoneId, userId) {
        // We query the 'cards' table where the owner is in the specific zone
        // Note: We need to join with 'users' to filter by zone if zone is on user level
        
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
                users!inner ( current_zone_id, reputation_score )
            `)
            .eq('users.current_zone_id', zoneId)
            .neq('owner_id', userId) // Exclude self
            .eq('type', 'GENESIS') // Only show main identity cards
            .order('created_at', { ascending: false })
            .limit(50); // Pagination limit for MVP

        if (error) {
            console.error("Market Fetch Error:", error);
            throw new Error("فشل تحميل قائمة اللاعبين.");
        }

        return data;
    }

    /**
     * Get 'Talk of the Town' (Trending Players).
     * Logic: Sorted by 'mint_count' (Social Proof).
     */
    async getTrendingPlayers(zoneId) {
        const { data, error } = await supabase
            .from('cards')
            .select(`
                id, display_name, position, visual_dna, mint_count,
                users!inner ( current_zone_id )
            `)
            .eq('users.current_zone_id', zoneId)
            .order('mint_count', { ascending: false })
            .limit(5);

        if (error) return [];
        return data;
    }
}
