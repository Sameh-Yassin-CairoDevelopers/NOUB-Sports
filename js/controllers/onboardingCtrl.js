/*
 * Filename: js/controllers/onboardingCtrl.js
 * Description: Controls the Onboarding View (Inputs, Avatar, Submit).
 */

import { AvatarEngine } from '../utils/avatarEngine.js';
import { AuthService } from '../services/authService.js';
import { MintingService } from '../services/mintingService.js';
import { SoundManager } from '../utils/soundManager.js';

export class OnboardingController {
    constructor() {
        this.avatarEngine = new AvatarEngine();
        this.authService = new AuthService();
        this.mintingService = new MintingService();
        this.init();
    }

    init() {
        console.log("🎮 Onboarding Controller Active");
        this.bindEvents();
    }

    bindEvents() {
        // 1. Avatar Controls
        document.getElementById('btn-skin-next')?.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('skin', 1); });
        document.getElementById('btn-skin-prev')?.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('skin', -1); });
        document.getElementById('btn-kit-next')?.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('kit', 1); });
        document.getElementById('btn-kit-prev')?.addEventListener('click', (e) => { e.preventDefault(); this.avatarEngine.change('kit', -1); });

        // 2. Activity Type Logic (Player vs Fan)
        const activitySelect = document.getElementById('inp-activity');
        const posGroup = document.getElementById('group-position');
        
        if(activitySelect) {
            activitySelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if(val === 'FAN' || val === '') {
                    posGroup.classList.add('hidden');
                } else {
                    posGroup.classList.remove('hidden');
                }
            });
        }

        // 3. Submit (Mint)
        document.getElementById('form-register')?.addEventListener('submit', (e) => this.handleMint(e));
    }

    async handleMint(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-mint');
        btn.disabled = true;
        btn.textContent = "جاري الصك...";

        // Collect Data
        const name = document.getElementById('inp-name').value;
        const zone = document.getElementById('inp-zone').value;
        const pos = document.querySelector('input[name="pos"]:checked')?.value || 'FAN';
        
        try {
            // A. Register User
            // Note: Telegram ID is fetched from TelegramService usually, hardcoded for Day 1 test
            const telegramId = localStorage.getItem('noub_dev_id') || Math.floor(Math.random() * 100000); 
            
            const newUser = await this.authService.registerUser({
                telegramId: telegramId,
                username: name,
                zoneId: parseInt(zone)
            });

            // B. Mint Card
            await this.mintingService.mintCard({
                ownerId: newUser.id,
                name: name,
                position: pos,
                visualDna: this.avatarEngine.getConfig()
            });

            SoundManager.play('success');
            alert("تم الصك بنجاح! سيتم إعادة التحميل.");
            window.location.reload();

        } catch (err) {
            console.error(err);
            alert("حدث خطأ أثناء الصك.");
            btn.disabled = false;
            btn.textContent = "صك الهوية";
        }
    }
}
