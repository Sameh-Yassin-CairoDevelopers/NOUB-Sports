/*
 * Filename: js/models/PlayerCard.js
 * Description: Data model representing the Digital Asset (Card).
 */

export class PlayerCard {
    constructor(data = {}) {
        this.id = data.id;
        this.ownerId = data.owner_id;
        this.displayName = data.display_name;
        this.position = data.position || 'N/A';
        this.stats = data.stats || { matches: 0, goals: 0, rating: 50 };
        this.visuals = data.visual_dna ? JSON.parse(data.visual_dna) : { skin: 1, kit: 1 };
        this.isVerified = data.is_verified || false;
    }

    get ratingLabel() {
        return this.stats.rating >= 90 ? 'LEGEND' : (this.stats.rating >= 75 ? 'PRO' : 'HAWI');
    }
}
