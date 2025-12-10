/*
 * Filename: js/services/mintingService.js
 * Description: Handles the Card Minting process.
 */

import { supabase } from '../core/supabaseClient.js';

export class MintingService {
    
    async mintCard(cardData) {
        const { error } = await supabase
            .from('cards')
            .insert([{
                owner_id: cardData.ownerId,
                display_name: cardData.name,
                position: cardData.position,
                visual_dna: cardData.visualDna,
                minted_by: cardData.ownerId, // Self Mint
                is_verified: false,
                stats: { matches: 0, goals: 0, rating: 60 }
            }]);
            
        if (error) throw error;
        return true;
    }
}
