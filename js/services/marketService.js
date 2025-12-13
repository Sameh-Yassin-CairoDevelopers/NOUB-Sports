/*
 * Filename: js/services/marketService.js
 * Version: 4.2.1 (FIX: Ambiguous Relationship)
 */

import { supabase } from '../core/supabaseClient.js';

export class MarketService {

    async getPlayersInZone(zoneId, userId) {
        // FIX: Specify the relationship explicitly using the foreign key name
        // Syntax: table!foreign_key(columns)
        
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
                users!owner_id ( current_zone_id, reputation_score )
            `)
            .eq('users.current_zone_id', zoneId)
            .neq('owner_id', userId)
            .eq('type', 'GENESIS') 
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Market Fetch Error:", error);
            throw new Error("فشل تحميل قائمة اللاعبين.");
        }

        return data;
    }

    async getTrendingPlayers(zoneId) {
        // FIX: Same explicit relationship fix here
        const { data, error } = await supabase
            .from('cards')
            .select(`
                id, display_name, position, visual_dna, mint_count,
                users!owner_id ( current_zone_id )
            `)
            .eq('users.current_zone_id', zoneId)
            .order('mint_count', { ascending: false })
            .limit(5);

        if (error) return [];
        return data;
    }
}
