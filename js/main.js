/**
 * NOUB SPORTS - Main Entry Point (Day 1)
 * هذا الملف هو "المحرك المبدئي".
 * وظيفته الحالية: تهيئة التطبيق وإدارة التفاعلات البصرية الأولية.
 */

// 1. تعريف الثوابت (عناصر الشاشة)
const DOM = {
    splash: document.getElementById('screen-splash'),
    authView: document.getElementById('view-onboarding'),
    activitySelect: document.getElementById('reg-activity-type'),
    positionGroup: document.getElementById('group-position'),
    header: document.getElementById('global-header'),
    navbar: document.getElementById('global-navbar')
};

/**
 * دالة التشغيل الرئيسية (Init)
 * يتم استدعاؤها فور تحميل الصفحة
 */
function initApp() {
    console.log("🚀 NOUB SPORTS System Started...");

    // أ. تهيئة تليجرام (لضبط الألوان)
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        console.log("✅ Telegram WebApp Connected");
    }

    // ب. محاكاة فحص الاتصال (سنستبدلها بـ Supabase غداً)
    // حالياً: ننتظر ثانيتين ثم نظهر شاشة التسجيل
    setTimeout(() => {
        hideSplash();
        showOnboarding();
    }, 2000);

    // ج. تفعيل مراقب الأحداث (Event Listeners)
    setupEventListeners();
}

/**
 * إخفاء شاشة التحميل بأسلوب سلس
 */
function hideSplash() {
    DOM.splash.style.opacity = '0';
    setTimeout(() => {
        DOM.splash.remove(); // إزالة العنصر تماماً من الـ DOM لتخفيف الحمل
    }, 500);
}

/**
 * إظهار شاشة التسجيل (للمستخدم الجديد)
 * (غداً سنضع شرطاً هنا: لو مسجل يروح Home، لو جديد يجي هنا)
 */
function showOnboarding() {
    DOM.authView.classList.remove('hidden');
    // في مرحلة التسجيل، نخفي الهيدر والنافبار (كما في التصميم)
    DOM.header.classList.add('hidden');
    DOM.navbar.classList.add('hidden');
}

/**
 * إعداد التفاعلات (المنطق الذي طلبته)
 */
function setupEventListeners() {
    
    // منطق: لاعب vs مشجع
    if (DOM.activitySelect) {
        DOM.activitySelect.addEventListener('change', (e) => {
            const value = e.target.value;
            console.log("🔄 Activity Changed to:", value);

            // القائمة الممنوعة من اختيار "المركز"
            const nonPlayingRoles = ['FAN', 'INACTIVE'];

            if (nonPlayingRoles.includes(value)) {
                // إذا كان مشجعاً، نخفي خيار المركز
                DOM.positionGroup.classList.add('hidden');
                // ونلغي اختيار أي مركز سابق (للتنظيف)
                document.getElementById('reg-position').value = ""; 
            } else {
                // إذا كان لاعباً، نظهر خيار المركز
                DOM.positionGroup.classList.remove('hidden');
            }
        });
    }
}

// تشغيل النظام
document.addEventListener('DOMContentLoaded', initApp);