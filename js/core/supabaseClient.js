/*
 * Filename: js/core/supabaseClient.js
 * Version: 2.1.0 (Stable Fix)
 * Description: Initializes Supabase using the Global Window Object.
 * This prevents 'AuthClient' errors caused by conflicting imports.
 */

import { SUPABASE_CONFIG } from '../config/supabase.js';

// 1. التحقق من وجود المكتبة (من index.html)
if (!window.supabase) {
    console.error("❌ CRITICAL: Supabase script not loaded in index.html");
    throw new Error("Supabase SDK missing");
}

// 2. استخدام المُنشئ العالمي (الأكثر أماناً واستقراراً)
const { createClient } = window.supabase;

// 3. إنشاء وتصدير النسخة
export const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
