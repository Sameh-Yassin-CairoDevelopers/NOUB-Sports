/*
 * Filename: js/services/marketService.js
 * Version: 5.2.0 (MASTER ENGINE)
 * Description: Service layer for Player Discovery, Scouting, and Trending Logic.
 * 
 * CORE FEATURES:
 * 1. Zone Filtering: Uses INNER JOINs to filter cards based on owner's location.
 * 2. Global Search: Allows bypassing zone filters for cross-region scouting.
 * 3. Deduplication Algorithm: Post-processes trending data to ensure unique players.
 * 4. Role Segmentation: Fetches Players vs Fans based on Activity Type.
 */

import { supabase } from '../core/supabaseClient.js';

export class MarketService {

    /**
     * Fetches a list of cards based on Zone, Activity Type, and Scope.
     * 
     * @param {number} zoneId - The User's local Zone ID.
     * @param {string} userId - Current User ID (to exclude self).
     * @param {string} filterType - 'PLAYER', 'FAN', or 'ALL'.
     * @param {boolean} [enableGlobal=false] - If true, ignores Zone ID (See all Egypt).
     * @returns {Promise<Array>} List of Card Objects with User metadata.
     */
    async getPlayersInZone(zoneId, userId, filterType = 'PLAYER', enableGlobal = false) {
        
        // 1. Build the Base Query
        // We select Card details AND User details (Zone, Reputation) via Inner Join.
        // '!inner' ensures we only get cards where the user relation exists and matches filters.
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
            .neq('owner_id', userId) // Exclude my own card
            .eq('type', 'GENESIS')   // Only show Main Identity Cards (not gifts)
            .order('created_at', { ascending: false })
            .limit(50); // Pagination Limit

        // 2. Apply Geographic Scope
        if (!enableGlobal) {
            // Strict Mode: Only show players in my zone
            query = query.eq('users.current_zone_id', zoneId);
        }

        // 3. Apply Activity Filter
        if (filterType === 'PLAYER') {
            // Show Active Players (Club, Youth, Free) - Hide Fans & Inactive
            query = query.neq('activity_type', 'FAN').neq('activity_type', 'INACTIVE');
        } else if (filterType === 'FAN') {
            // Show Fans Only
            query = query.eq('activity_type', 'FAN');
        }
        // 'ALL' case implies no specific activity filter

        // 4. Execute
        const { data, error } = await query;

        if (error) {
            console.error("Market Fetch Error:", error);
            throw new Error("فشل تحميل بيانات السوق. يرجى التحقق من الاتصال.");
        }

        return data || [];
    }

    /**
     * Retrieves 'Trending' players based on Mint Count (Social Popularity).
     * Implements Client-Side Deduplication to show unique subjects only.
     * 
     * @param {number} zoneId - The Zone ID to filter trending (Local Heroes).
     * @returns {Promise<Array>} Top 5 Unique Players.
     */
    async getTrendingPlayers(zoneId) {
        // Fetch Top 20 candidates
        const { data, error } = await supabase
            .from('cards')
            .select(`
                id,
                display_name,
                position,
                visual_dna,
                mint_count,
                subject_id,
                users!owner_id!inner ( current_zone_id )
            `)
            .eq('users.current_zone_id', zoneId)
            .eq('type', 'GENESIS')
            .order('mint_count', { ascending: false })
            .limit(20);

        if (error) {
            console.warn("Trending Warning:", error);
            return [];
        }
        
        // --- Deduplication Algorithm ---
        // Logic: A player might have multiple cards (bugs/gifts), 
        // but we want to show the PERSON (subject_id) only once.
        
        const uniquePlayers = [];
        const seenIds = new Set();
        
        for (const card of data) {
            if (!seenIds.has(card.subject_id)) {
                seenIds.add(card.subject_id);
                uniquePlayers.push(card);
            }
            // Stop once we have 5 unique items
            if (uniquePlayers.length >= 5) break; 
        }

        return uniquePlayers;
    }

    /**
     * Helper: Client-Side Search
     * Filters a loaded list by Name or Position.
     * @param {Array} allPlayers - The full list.
     * @param {string} term - Search query.
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
