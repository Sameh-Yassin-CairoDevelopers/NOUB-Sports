/**
 * NOUB Sports - Configuration File
 * يحتوي على ثوابت النظام ومفاتيح الاتصال
 */

export const CONFIG = {
    // 1. Supabase Connection Keys
    // تجدها في: Project Settings -> API
    SUPABASE_URL: 'https://oxunjrytoqqazgzuoutb.supabase.co', // ضع الرابط هنا
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94dW5qcnl0b3FxYXpnenVvdXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjAwOTAsImV4cCI6MjA4MDc5NjA5MH0.pxPp2-9rM5T6jTXDKCIjQGI7vg3_gHcsit2-R6Obxyg', // ضع مفتاح Anon/Public هنا

    // 2. Game Settings
    APP_VERSION: '1.0.0',
    DEFAULT_ZONE_ID: 1, // الفسطاط
    ANIMATION_SPEED: 300, // ms
    
    // 3. Telegram Config
    TELEGRAM_BOT_USERNAME: 'NoubSportsBot' // اسم البوت الخاص بك
};