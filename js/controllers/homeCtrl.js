/* Filename: js/controllers/homeCtrl.js */
export class HomeController {
    constructor() { console.log("Home Ctrl Init"); }
    render(user) {
        document.getElementById('header-name').textContent = user.username;
        document.getElementById('header-balance').textContent = user.balance;
        document.getElementById('view-home').classList.remove('hidden');
    }
}
