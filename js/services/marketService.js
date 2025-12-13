/*
 * Filename: js/services/marketService.js
 * Version: 3.3.0 (FIX: Explicit Join)
 */

import { supabase } from '../core/supabaseClient.js';

export class MarketService {

    async getPlayersInZone(zoneId, userId) {
        // FIX: Using users!owner_id to specify relationship
        const { data, error } = await supabase
            .from('cards')
            .select(`
                id, display_name, position, activity_type, visual_dna, stats, owner_id,
                users!owner_id ( current_zone_id, reputation_score )
            `)
            .eq('users.current_zone_id', zoneId)
            .neq('owner_id', userId)
            .eq('type', 'GENESIS')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Market Fetch Error:", error);
            throw new Error("فشل تحميل السوق");
        }
        return data;
    }

    async getTrendingPlayers(zoneId) {
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
