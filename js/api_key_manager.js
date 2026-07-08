/**
 * Bayan POS - Gemini API Key Manager
 * تدوير مفاتيح Gemini تلقائياً عند انتهاء الكوتة
 */
(function () {
    'use strict';

    // ==============================
    // قائمة المفاتيح (الأول ثم الثاني)
    // ==============================
    const GEMINI_KEYS = [];

    const STORAGE_KEY     = 'bayan_gemini_key';
    const ACTIVE_IDX_KEY  = 'bayan_gemini_active_idx';

    // ==============================
    // تهيئة: حفظ المفتاح النشط
    // ==============================
    function getActiveIdx() {
        return parseInt(localStorage.getItem(ACTIVE_IDX_KEY) || '0', 10);
    }

    function setActiveIdx(idx) {
        localStorage.setItem(ACTIVE_IDX_KEY, String(idx));
        localStorage.setItem(STORAGE_KEY, GEMINI_KEYS[idx]);
        console.log(`🔑 [API Key Manager] تم التحويل للمفتاح رقم ${idx + 1}`);
    }

    // تأكيد إن المفاتيح محفوظة في localStorage
    function initKeys() {
        // الكود الأصلي بيقبل مفاتيح متعددة مفصولة بفاصلة
        const allKeys = GEMINI_KEYS.join(',');
        localStorage.setItem(STORAGE_KEY, allKeys);
        localStorage.setItem(ACTIVE_IDX_KEY, '0');
        console.log(`✅ [API Key Manager] تم تحميل ${GEMINI_KEYS.length} مفاتيح في localStorage`);
    }

    // ==============================
    // اعتراض fetch للكشف عن انتهاء الكوتة
    // ==============================
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
        const url = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');

        // نتعامل فقط مع طلبات Gemini
        if (!url.includes('generativelanguage.googleapis.com') && !url.includes('firestore.googleapis.com')) {
            return originalFetch.apply(this, args);
        }

        if (!url.includes('generativelanguage.googleapis.com')) {
            return originalFetch.apply(this, args);
        }

        const response = await originalFetch.apply(this, args);

        // لو رجع 429 (Too Many Requests) أو 403 (quota) → حوّل للمفتاح التاني
        if (response.status === 429 || response.status === 403) {
            const currentIdx = getActiveIdx();
            const nextIdx = currentIdx + 1;

            if (nextIdx < GEMINI_KEYS.length) {
                console.warn(`⚠️ [API Key Manager] المفتاح ${currentIdx + 1} انتهت كوتته — التحويل للمفتاح ${nextIdx + 1}`);
                setActiveIdx(nextIdx);

                // إعادة بناء الـ URL بالمفتاح الجديد
                let newUrl = url.replace(/key=[^&]+/, `key=${GEMINI_KEYS[nextIdx]}`);
                const newArgs = [newUrl, ...args.slice(1)];
                return originalFetch.apply(this, newArgs);
            } else {
                console.error('❌ [API Key Manager] كل المفاتيح انتهت كوتتها!');
                showApiExhaustedWarning();
            }
        }

        return response;
    };

    // ==============================
    // إشعار للمستخدم لما كل المفاتيح تخلص
    // ==============================
    function showApiExhaustedWarning() {
        if (document.getElementById('api-exhausted-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'api-exhausted-banner';
        banner.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white; padding: 14px 24px; border-radius: 14px;
            font-family: 'Cairo', sans-serif; font-size: 0.95rem; font-weight: 700;
            z-index: 99999; box-shadow: 0 8px 25px rgba(239,68,68,0.4);
            display: flex; align-items: center; gap: 10px; direction: rtl;
        `;
        banner.innerHTML = `
            <span style="font-size:1.3rem;">⚠️</span>
            <span>انتهت كوتة جميع مفاتيح Gemini — يرجى إضافة مفتاح جديد من الإعدادات</span>
            <button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:4px 10px;border-radius:8px;cursor:pointer;font-weight:700;">✕</button>
        `;
        document.body.appendChild(banner);
        setTimeout(() => banner?.remove(), 8000);
    }

    // ==============================
    // تشغيل
    // ==============================
    document.addEventListener('DOMContentLoaded', () => {
        initKeys();
        console.log(`✅ [API Key Manager] تم تحميل ${GEMINI_KEYS.length} مفاتيح — المفتاح النشط: ${getActiveIdx() + 1}`);
    });

})();
