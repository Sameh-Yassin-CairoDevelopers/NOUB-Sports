/*
 * Filename: js/core/state.js
 * Version: 2.0.0
 * Description: Central State Management. Holds the current user data,
 * session status, and temporary cache to reduce DB calls.
 */

export class State {
    constructor() {
        this.currentUser = null;
        this.currentCard = null;
        this.sessionStart = new Date();
    }

    setUser(userData) {
        this.currentUser = userData;
    }

    getUser() {
        return this.currentUser;
    }

    setCard(cardData) {
        this.currentCard = cardData;
    }

    getCard() {
        return this.currentCard;
    }

    isLoggedIn() {
        return !!this.currentUser;
    }
}
