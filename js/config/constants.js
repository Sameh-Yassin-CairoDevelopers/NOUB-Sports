/*
 * Filename: js/config/constants.js
 * Version: 2.0.0
 * Description: Stores immutable game constants, ENUMS, and configuration limits.
 * Centralizes magic strings to avoid typos in logic.
 */

export const GAME_CONFIG = {
    APP_VERSION: '2.0.0',
    ANIMATION_SPEED: 300, // ms
    
    // Limits for Avatar Generation
    AVATAR_LIMITS: {
        SKIN: 3,
        KIT: 3,
        HAIR: 5
    },

    // Activity Types (كما طلبتها)
    ACTIVITY_TYPES: {
        YOUTH_CENTER: 'YOUTH_CENTER', // مركز شباب
        CLUB_MEMBER: 'CLUB_MEMBER',   // عضو نادي
        ACADEMY: 'ACADEMY',           // أكاديمية / حر
        PRO: 'PRO',                   // نادي كبير
        FAN: 'FAN',                   // مشجع
        INACTIVE: 'INACTIVE'          // متوقف
    },

    // Positions
    POSITIONS: {
        FWD: 'FWD',
        MID: 'MID',
        DEF: 'DEF',
        GK: 'GK'
    },

    // Zones (يمكن توسيعها لاحقاً من قاعدة البيانات)
    ZONES: {
        1: 'الفسطاط / المعادي',
        2: 'مصر القديمة',
        3: 'حلوان'
    }
};
