/*
 * Filename: js/main.js
 * Version: NOUB SPORTS v2.0.0 (Bootloader)
 * Description: The entry point of the application. It instantiates the App class
 * and triggers the initialization process once the DOM is ready.
 */

import { App } from './core/appClass.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Create App Instance
    const app = new App();
    
    // 2. Start the System
    app.init();
});
