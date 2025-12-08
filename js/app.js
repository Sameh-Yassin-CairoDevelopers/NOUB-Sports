/**
 * NOUB Sports - Main Entry Point
 * يقوم بتحميل النظام وإدارة دورة حياة التطبيق
 */

import { CONFIG } from './config.js';

// تعريف المتغيرات العامة
let supabase = null;
let telegramApp = window.Telegram?.WebApp;

// 1. دالة البدء (The Initializer)
async function initApp() {
    console.log(`%c NOUB SPORTS v${CONFIG.APP_VERSION} `, 'background: #fbbf24; color: #000; font-weight: bold;');

    try {
        // أ. تهيئة Supabase
        if (window.supabase) {
            supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
            console.log("✅ Supabase Connected");
        } else {
            console.error("❌ Supabase SDK not loaded");
        }

        // ب. تهيئة تليجرام
        if (telegramApp) {
            telegramApp.ready();
            telegramApp.expand(); // توسيع الشاشة بالكامل
            console.log("✅ Telegram WebApp Ready");
        }

        // ج. محاكاة تحميل البيانات (سنسحب البيانات الحقيقية لاحقاً)
        await simulateLoading();

        // د. الانتقال للشاشة الرئيسية
        transitionToHome();

    } catch (error) {
        console.error("Critical Error during init:", error);
    }
}

// 2. محاكاة وقت التحميل (لإظهار اللوجو)
function simulateLoading() {
    return new Promise(resolve => setTimeout(resolve, 2000));
}

// 3. الانتقال من الـ Splash إلى التطبيق
function transitionToHome() {
    const splash = document.getElementById('splash-screen');
    const header = document.getElementById('main-header');
    const nav = document.getElementById('bottom-nav');
    
    // إخفاء الـ Splash
    splash.style.opacity = '0';
    setTimeout(() => {
        splash.classList.remove('active');
        splash.classList.add('hidden');
        
        // إظهار عناصر الواجهة
        header.classList.remove('hidden');
        header.classList.add('active');
        nav.classList.remove('hidden');
        nav.classList.add('active'); // CSS Flexbox
        nav.style.display = 'flex';  // تأكيد الظهور
        
        console.log("🚀 App Launched Successfully");
    }, 500); // نصف ثانية للأنيميشن
}

// تشغيل النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);