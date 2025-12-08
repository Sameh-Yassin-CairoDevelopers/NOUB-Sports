/**
 * NOUB Sports - Main Logic v1.1
 * إدارة دورة حياة التطبيق والتحقق من المستخدم
 */

import { CONFIG } from './config.js';

// Global Variables
let supabase = null;
let telegramApp = window.Telegram?.WebApp;
let currentUser = null;

// --- 1. Initialization ---
async function initApp() {
    console.log(`%c NOUB SPORTS v${CONFIG.APP_VERSION} `, 'background: #fbbf24; color: #000; font-weight: bold;');

    try {
        // A. Setup Supabase
        if (window.supabase) {
            supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        }

        // B. Setup Telegram
        if (telegramApp) {
            telegramApp.ready();
            telegramApp.expand();
            // تلوين الهيدر بلون التطبيق
            telegramApp.setHeaderColor('#0f172a'); 
            telegramApp.setBackgroundColor('#0f172a');
        }

        // C. Check User Identity
        await checkUserIdentity();

    } catch (error) {
        console.error("Critical Init Error:", error);
    }
}

// --- 2. User Check Logic ---
async function checkUserIdentity() {
    // 1. الحصول على ID من تليجرام (أو استخدام ID وهمي للاختبار في المتصفح)
    const tgUser = telegramApp?.initDataUnsafe?.user;
    
    // ملاحظة للمطور: إذا كنا نختبر في المتصفح، نستخدم ID ثابت
    const telegramId = tgUser?.id || 123456789; 

    console.log("🔍 Checking User:", telegramId);

    // 2. البحث في قاعدة البيانات
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

    // إخفاء شاشة التحميل
    document.getElementById('splash-screen').classList.add('hidden');
    document.getElementById('splash-screen').classList.remove('active');
    document.getElementById('main-header').classList.remove('hidden'); // إظهار الهيدر
    document.getElementById('main-header').classList.add('active');

    if (data) {
        // المستخدم موجود -> اذهب للرئيسية
        currentUser = data;
        console.log("✅ User Found:", currentUser.username);
        updateUI(currentUser);
        navigateTo('view-home');
        document.getElementById('bottom-nav').classList.remove('hidden'); // إظهار القائمة
        document.getElementById('bottom-nav').style.display = 'flex';
    } else {
        // المستخدم جديد -> اذهب للصك
        console.log("🆕 New User -> Minting Required");
        navigateTo('view-onboarding');
        // إخفاء القائمة السفلية في شاشة الصك
        document.getElementById('bottom-nav').classList.add('hidden');
    }
}

// --- 3. UI Helpers ---
function navigateTo(viewId) {
    // إخفاء كل الشاشات
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });
    // إظهار الشاشة المطلوبة
    const target = document.getElementById(viewId);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
}

function updateUI(user) {
    // تحديث الهيدر
    document.querySelector('.user-name').textContent = user.username || 'لاعب';
    document.querySelector('.user-rank').textContent = 'LVL. 1'; // مبدئياً
}

// --- 4. Avatar Logic (Simple Version) ---
// تعريف متغيرات الأفاتار
let avatarConfig = { skin: 1, kit: 1 };
const maxOptions = { skin: 3, kit: 3 }; // عدد الخيارات المتاحة

// دالة تغيير الأفاتار (مربوطة بـ window لاستخدامها في HTML)
window.changeAttr = function(attr, dir) {
    let val = avatarConfig[attr] + dir;
    if (val > maxOptions[attr]) val = 1;
    if (val < 1) val = maxOptions[attr];
    avatarConfig[attr] = val;
    
    // تحديث الرقم في الشاشة
    document.getElementById(`label-${attr}`).textContent = val;
    
    // تغيير لون الأيقونة مؤقتاً للمحاكاة
    const icon = document.getElementById('avatar-display');
    if (attr === 'skin') {
        const colors = ['#fca5a5', '#d4a373', '#8d5524']; // فاتح، قمحي، داكن
        icon.style.color = colors[val-1];
    }
    if (attr === 'kit') {
        // تغيير الحدود (Border) كمحاكاة للقميص
        const kitColors = ['#ef4444', '#3b82f6', '#10b981'];
        icon.style.borderColor = kitColors[val-1];
        icon.style.borderWidth = '4px';
        icon.style.borderStyle = 'solid';
        icon.style.borderRadius = '50%';
        icon.style.padding = '10px';
    }
};

// --- 5. Minting Logic (The Core Action) ---
// سنربط زر الصك بوظيفة الحفظ
document.getElementById('btn-mint')?.addEventListener('click', async () => {
    const name = document.getElementById('inp-name').value;
    const position = document.getElementById('inp-position').value;
    
    if (!name) {
        alert("من فضلك اكتب اسم الشهرة!");
        return;
    }

    const tgUser = telegramApp?.initDataUnsafe?.user;
    const telegramId = tgUser?.id || 123456789; // Fallback for testing

    // 1. إنشاء المستخدم
    const { data: user, error: userError } = await supabase
        .from('users')
        .insert([{ 
            telegram_id: telegramId,
            username: name,
            wallet_balance: 100 // مكافأة ترحيب
        }])
        .select()
        .single();

    if (userError) {
        console.error("Mint Error:", userError);
        alert("حدث خطأ أثناء الصك. حاول مرة أخرى.");
        return;
    }

    // 2. إنشاء الكارت
    const { error: cardError } = await supabase
        .from('cards')
        .insert([{
            owner_id: user.id,
            display_name: name,
            position: position,
            visual_dna: JSON.stringify(avatarConfig),
            minted_by: user.id, // صك ذاتي
            is_verified: false
        }]);

    if (!cardError) {
        // نجاح!
        alert("مبروك! تم صك هويتك بنجاح.");
        // إعادة تحميل التطبيق للدخول
        window.location.reload();
    }
});

// Run Init
document.addEventListener('DOMContentLoaded', initApp);
