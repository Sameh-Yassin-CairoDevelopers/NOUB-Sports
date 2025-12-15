/*
 * Filename: js/utils/soundManager.js
 * Version: 5.0.0 (Active Audio Engine)
 * Description: Manages application sound effects (SFX).
 * Uses Pre-loading logic to ensure sounds play instantly on mobile interactions.
 */

export const SoundManager = {
    
    // Repository of Sound Files
    sounds: {
        'click': new Audio('assets/sounds/click.mp3'),
        'success': new Audio('assets/sounds/success.mp3'), // Mint/Win
        'error': new Audio('assets/sounds/error.mp3'),
        'notify': new Audio('assets/sounds/notify.mp3'),
        'whistle': new Audio('assets/sounds/whistle.mp3') // Match Start/End
    },

    /**
     * Initialize sounds (Pre-load)
     * Browsers require user interaction to play audio, so we prepare them.
     */
    init() {
        Object.values(this.sounds).forEach(audio => {
            audio.load();
            audio.volume = 0.5; // Default Volume
        });
        console.log("🔊 Sound System: Ready");
    },

    /**
     * Plays a specific sound effect.
     * @param {string} key - Key of the sound map (e.g., 'click')
     */
    play(key) {
        const audio = this.sounds[key];
        if (audio) {
            // Reset time to allow rapid re-play (e.g., typing sounds)
            audio.currentTime = 0;
            audio.play().catch(e => {
                // Ignore auto-play blocking errors (common on mobile before interaction)
                console.warn("Audio Blocked:", e.message);
            });
        } else {
            console.warn(`Sound missing: ${key}`);
        }
    }
};
