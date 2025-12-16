/*
 * Filename: js/services/realtime.js
 * Version: 5.0.0 (Live Listener)
 * Description: Manages Supabase Realtime Subscriptions.
 * Allows the app to react instantly to database changes (Notifications, Match Updates).
 */

import { supabase } from '../core/supabaseClient.js';

export class RealtimeService {
    
    constructor() {
        this.subscriptions = [];
    }

    /**
     * Listen for new notifications for a specific user.
     * @param {string} userId - Current User UUID.
     * @param {Function} onNewNotification - Callback function when data arrives.
     */
    subscribeToNotifications(userId, onNewNotification) {
        console.log("📡 Realtime: Listening for Notifications...");
        
        const sub = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notifications', 
                    filter: `user_id=eq.${userId}` 
                }, 
                (payload) => {
                    console.log("🔔 Realtime: New Notification!", payload);
                    onNewNotification(payload.new);
                }
            )
            .subscribe();

        this.subscriptions.push(sub);
    }

    /**
     * Listen for match updates in a specific zone (Live Feed).
     * @param {number} zoneId - Zone to watch.
     * @param {Function} onMatchUpdate - Callback.
     */
    subscribeToArena(zoneId, onMatchUpdate) {
        // Note: Realtime filtering by joined tables is limited, 
        // so we listen to all matches and filter client-side or assume scope.
        // For MVP: Listen to all match updates (Simple).
        
        const sub = supabase
            .channel('public:matches')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'matches' },
                (payload) => {
                    onMatchUpdate(payload.new);
                }
            )
            .subscribe();

        this.subscriptions.push(sub);
    }

    /**
     * Cleanup all subscriptions (e.g. on logout).
     */
    unsubscribeAll() {
        this.subscriptions.forEach(sub => supabase.removeChannel(sub));
        this.subscriptions = [];
        console.log("Testing Realtime: All channels closed.");
    }
}
