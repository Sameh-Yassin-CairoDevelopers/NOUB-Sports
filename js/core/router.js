/*
 * Filename: js/core/router.js
 * Version: 2.0.0
 * Description: Handles SPA navigation. Toggles visibility of views (Sections)
 * and updates the state of the Global Navbar.
 */

export class Router {
    constructor() {
        this.views = document.querySelectorAll('.view-section');
        this.navBtns = document.querySelectorAll('.nav-btn');
        
        // Expose router to window for HTML onclick events
        window.router = (viewId) => this.navigate(viewId);
    }

    /**
     * Navigates to a specific view
     * @param {string} viewId - The ID of the section to show (e.g., 'view-home')
     */
    navigate(viewId) {
        console.log(`Checking Route: ${viewId}`);

        // 1. Hide All Views
        this.views.forEach(view => {
            view.classList.add('hidden');
        });

        // 2. Show Target View
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.remove('hidden');
            window.scrollTo(0, 0); // Reset Scroll
        } else {
            console.error(`View not found: ${viewId}`);
            return;
        }

        // 3. Update Navbar State
        this.updateNavbar(viewId);
    }

    /**
     * Updates the active class on bottom navbar buttons
     */
    updateNavbar(activeViewId) {
        this.navBtns.forEach(btn => btn.classList.remove('active'));

        // Mapping Logic: Which button opens which view?
        let btnId = '';
        if (activeViewId === 'view-home') btnId = 'nav-home';
        if (activeViewId === 'view-arena') btnId = 'nav-arena';
        if (activeViewId === 'view-scout') btnId = 'nav-scout';
        if (activeViewId === 'view-team') btnId = 'nav-team';

        if (btnId) {
            const activeBtn = document.getElementById(btnId);
            if(activeBtn) activeBtn.classList.add('active');
        }
    }
}
