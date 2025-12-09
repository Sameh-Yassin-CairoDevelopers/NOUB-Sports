/**
 * NOUB SPORTS - Main Entry Point (Day 1 - Fix)
 * المحرك المبدئي - إدارة واجهة المستخدم
 */

// 1. تعريف الثوابت (عناصر الشاشة)
// التأكد من تطابق الـ IDs مع ملف index.html
const DOM = {
    splash: document.getElementById('screen-splash'),
    
    // تصحيح: الاسم في HTML هو view-auth وليس view-onboarding
    authView: document.getElementById('view-auth'), 
    
    activitySelect: document.getElementById('reg-activity-type'),
    positionGroup: document.getElementById('group-position'),
    
    header: document.getElementById('global-header'),
    navbar: document.getElementById('global-navbar')
};

/**
 * دالة التشغيل الرئيسية (Init)
 */
function initApp() {
    console.log("🚀 NOUB SPORTS System Started...");

    // أ. تهيئة تليجرام
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        console.log("✅ Telegram WebApp Connected");
    }

    // ب. محاكاة التحميل
    // ننتظر 1.5 ثانية ثم نظهر التطبيق
    setTimeout(() => {
        hideSplash();
        
        // بما أننا لم نربط قاعدة البيانات بعد، سنفترض أن المستخدم جديد ونظهر شاشة التسجيل
        showAuthScreen();
    }, 1500);

    // ج. تفعيل التفاعلات
    setupEventListeners();
}

/**
 * إخفاء شاشة التحميل
 */
function hideSplash() {
    if (DOM.splash) {
        DOM.splash.style.opacity = '0';
        setTimeout(() => {
            DOM.splash.style.display = 'none'; // إخفاء كامل بدلاً من remove لتجنب أخطاء مستقبلية
        }, 500);
    }
}

/**
 * إظهار شاشة التسجيل (Auth)
 */
function showAuthScreen() {
    if (DOM.authView) {
        DOM.authView.classList.remove('hidden');
        console.log("👤 Showing Auth Screen");
    } else {
        console.error("❌ Error: Auth View not found in HTML");
    }

    // إخفاء الهيدر والنافبار أثناء التسجيل (لأنه لم يسجل بعد)
    if (DOM.header) DOM.header.classList.add('hidden');
    if (DOM.navbar) DOM.navbar.classList.add('hidden');
}

/**
 * إعداد التفاعلات (اللاعب vs المشجع)
 */
function setupEventListeners() {
    
    // منطق: إخفاء المركز للمشجعين
    if (DOM.activitySelect) {
        DOM.activitySelect.addEventListener('change', (e) => {
            const value = e.target.value;
            console.log("🔄 Activity Changed to:", value);

            // القائمة الممنوعة من اختيار "المركز"
            const nonPlayingRoles = ['FAN', 'INACTIVE'];

            if (DOM.positionGroup) {
                if (nonPlayingRoles.includes(value)) {
                    // إذا كان مشجعاً، نخفي خيار المركز
                    DOM.positionGroup.classList.add('hidden');
                    // تنظيف القيمة
                    const posInput = document.getElementById('reg-position');
                    if (posInput) posInput.value = ""; 
                } else {
                    // إذا كان لاعباً، نظهر خيار المركز
                    DOM.positionGroup.classList.remove('hidden');
                }
            }
        });
    }
}

// تشغيل النظام
document.addEventListener('DOMContentLoaded', initApp);
