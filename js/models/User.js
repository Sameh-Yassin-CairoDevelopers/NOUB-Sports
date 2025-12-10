/*
 * Filename: js/models/User.js
 * Description: Data model representing a Player/User entity.
 */

export class User {
    constructor(data = {}) {
        this.id = data.id || null;
        this.username = data.username || 'Unknown';
        this.role = data.role || 'FAN'; // PLAYER or FAN
        this.zoneId = data.current_zone_id || 0;
        this.balance = data.wallet_balance || 0;
        this.telegramId = data.telegram_id || null;
    }

    get isPlayer() {
        return this.role !== 'FAN' && this.role !== 'INACTIVE';
    }
}
