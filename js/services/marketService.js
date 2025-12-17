/*
 * Filename: js/services/marketService.js
 * Version: 5.6.0 (FULL REPAIR)
 * Description: Service layer for Discovery & Scouting.
 * Includes methods for Players, Fans, and Teams fetching.
 */

import { supabase } from '../core/supabaseClient.js';

export class MarketService {

    /**
     * Fetch Players or Fans in a specific Zone.
     * Uses Inner Joins to filter cards by the owner's location.
     * 
     * @param {number} zoneId - The Zone ID.
     * @param {string} userId - Current user ID (to exclude self).
     * @param {string} filterType - 'PLAYER' or 'FAN' (or 'ALL').
     * @param {boolean} enableGlobal - If true, ignores zone filter.
     * @returns {Promise<Array>} List of cards.
     */
    async getPlayersInZone(zoneId, userId, filterType = 'PLAYER', enableGlobal = false) {
        
        // 1. Base Query: Select Cards + Owner Info
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
            .neq('owner_id', userId)             // Exclude Self
            .eq('type', 'GENESIS')               // Only Main Identity Cards
            .order('created_at', { ascending: false })
            .limit(50);

        // 2. Apply Zone Filter (if not Global)
        if (!enableGlobal) {
            query = query.eq('users.current_zone_id', zoneId);
        }

        // 3. Apply Role Filter
        if (filterType === 'PLAYER') {
            // Exclude Fans and Inactive
            query = query.neq('activity_type', 'FAN').neq('activity_type', 'INACTIVE');
        } else if (filterType === 'FAN') {
            // Show Fans Only
            query = query.eq('activity_type', 'FAN');
        }

        const { data, error } = await query;

        if (error) {
            console.error("Market Fetch Error:", error);
            throw new Error("فشل تحميل السوق. يرجى التحقق من الشبكة.");
        }

        return data || [];
    }

    /**
     * NEW: Fetch Active Teams in a Zone.
     * @param {number} zoneId - The Zone ID.
     * @param {boolean} enableGlobal - If true, ignores zone filter.
     */
    async getTeamsInZone(zoneId, enableGlobal = false) {
        let query = supabase
            .from('teams')
            .select('*')
            .in('status', ['ACTIVE', 'DRAFT'])
            .order('total_matches', { ascending: false });

        if (!enableGlobal) {
            query = query.eq('zone_id', zoneId);
        }

        const { data, error } = await query;
        
        if (error) {
            console.error("Teams Fetch Error:", error);
            throw new Error("فشل تحميل الفرق.");
        }
        return data || [];
    }

    /**
     * Retrieves 'Trending' players (Unique Subjects Only).
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
            .limit(20);

        if (error) {
            console.warn("Trending Warning:", error);
            return [];
        }
        
        // Deduplication: Ensure unique people
        const uniquePlayers = [];
        const seenIds = new Set();
        
        for (const card of data) {
            if (!seenIds.has(card.subject_id)) {
                seenIds.add(card.subject_id);
                uniquePlayers.push(card);
            }
            if (uniquePlayers.length >= 5) break; 
        }

        return uniquePlayers;
    }

    /**
     * Client-side search helper.
     */
    searchLocal(allPlayers, term) {
        if (!term) return allPlayers;
        const lowerTerm = term.toLowerCase();
        
        return allPlayers.filter(p => 
            (p.display_name && p.display_name.toLowerCase().includes(lowerTerm)) ||
            (p.position && p.position.toLowerCase().includes(lowerTerm)) ||
            (p.name && p.name.toLowerCase().includes(lowerTerm)) // For Teams
        );
    }
}

