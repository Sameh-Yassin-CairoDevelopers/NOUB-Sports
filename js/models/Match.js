/*
 * Filename: js/models/Match.js
 * Description: Data model for Match Fixtures.
 */

export class Match {
    constructor(data = {}) {
        this.id = data.id;
        this.teamA = data.team_a_name || 'Team A';
        this.teamB = data.team_b_name || 'Team B';
        this.scoreA = data.score_a || 0;
        this.scoreB = data.score_b || 0;
        this.status = data.status || 'pending';
        this.playedAt = new Date(data.played_at);
    }
}
