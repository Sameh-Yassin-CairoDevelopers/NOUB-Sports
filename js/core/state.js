/*
 * Filename: js/core/state.js
 * Version: 4.2.0 (Diamond Release)
 * Description: Centralized State Management Store (Singleton Pattern).
 * 
 * ACADEMIC NOTE:
 * This module implements the 'Singleton' design pattern. It ensures that 
 * the entire application shares a single source of truth for the User Session.
 * It creates a persistence layer between the volatile Memory (RAM) and 
 * the persistent Storage (LocalStorage/Supabase).
 */

class StateManager {
    
    /**
     * Initializes the State Manager.
     * Sets up empty slots for user data and session timestamps.
     */
    constructor() {
        // The active user object (Held in Memory)
        this.currentUser = null;
        
        // Session tracking (for security/timeout logic later)
        this.lastActive = new Date();
        
        console.log("💾 StateManager: Singleton Instance Created.");
    }

    /**
     * Updates the Global User State.
     * @param {Object} userData - The User Model object returned from AuthService.
     * @param {boolean} [persist=true] - Whether to save to LocalStorage (Default: true).
     */
    setUser(userData, persist = true) {
        this.currentUser = userData;
        this.lastActive = new Date();

        if (persist && userData) {
            try {
                // Serialize user object to JSON string for storage
                // Key: 'noub_session_cache'
                localStorage.setItem('noub_session_cache', JSON.stringify(userData));
                console.log("💾 State: User Cached in Browser Storage.");
            } catch (error) {
                console.error("⚠️ State: Failed to persist user data", error);
            }
        }
    }

    /**
     * Retrieves the current authenticated user.
     * Implements a 'Hydration Strategy':
     * 1. Check Memory (Fastest).
     * 2. If empty, Check Storage (Persisted).
     * 3. If both empty, return null (User is Guest).
     * 
     * @returns {Object|null} The User Model or null.
     */
    getUser() {
        // Priority 1: Memory Hit
        if (this.currentUser) {
            return this.currentUser;
        }

        // Priority 2: Storage Re-hydration (Page Refresh Scenario)
        const cachedData = localStorage.getItem('noub_session_cache');
        if (cachedData) {
            try {
                this.currentUser = JSON.parse(cachedData);
                console.log("💧 State: Re-hydrated User from Storage.");
                return this.currentUser;
            } catch (error) {
                console.error("⚠️ State: Cache Corrupted. Clearing...", error);
                this.clear(); // Security measure: wipe corrupt data
                return null;
            }
        }

        // Priority 3: No Session
        return null;
    }

    /**
     * Clears all session data (Logout Operation).
     * Wipes both Memory and Storage.
     */
    clear() {
        this.currentUser = null;
        localStorage.removeItem('noub_session_cache');
        console.log("🧹 State: Session Cleared.");
    }

    /**
     * Utility: Check if user is logged in boolean.
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!this.getUser();
    }
}

/*
 * EXPORT STRATEGY:
 * We export a 'new' instance, not the class itself.
 * This forces all importers to use the SAME object.
 */
export const state = new StateManager();
