/*
 * Filename: js/utils/soundManager.js
 * Description: Handles audio feedback (Game Juice).
 */

export const SoundManager = {
    play: (soundName) => {
        // Future implementation: load audio from assets/sounds/
        // const audio = new Audio(`assets/sounds/${soundName}.wav`);
        // audio.play().catch(e => console.warn('Audio blocked'));
        console.log(`🔊 Playing Sound: ${soundName}`);
    }
};
