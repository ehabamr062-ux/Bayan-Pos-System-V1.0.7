// ============================================================
//  Service Worker - نظام بيان المحاسبي (Bayan POS)
//  النسخة المطورة للعمل أوفلاين 100%
// ============================================================

const CACHE_NAME = 'bayan-pos-v2.0.0';
const STATIC_CACHE = 'bayan-static-v2.0.0';
const DYNAMIC_CACHE = 'bayan-dynamic-v2.0.0';

// كافة ملفات النظام الأساسية المتوفرة محلياً (بدون تكرار لتفادي خطأ Entry already exists على GitHub Pages)
const STATIC_FILES = [
    './index.html',
    './manifest.json',
    './version.txt',
    './version.json',
    './css/style.css',
    './css/scrollbars.css',
    './css/premium.css',
    './css/treasury_audit.css',
    './js/store.js',
    './js/core.js',
    './js/utils.js',
    './js/security.js',
    './js/ui.js',
    './js/inventory.js',
    './js/sales.js',
    './js/accounting.js',
    './js/price_tracking.js',
    './js/price_tracking_fixes.js',
    './js/receipt_disburse_fixes.js',
    './js/history_enhancements.js',
    './js/barcode.js',
    './js/settings.js',
    './js/trash.js',
    './js/treasury_audit.js',
    './js/init.js',
    './js/print.js',
    './js/updater.js',
    './lib/html2canvas.min.js',
    './lib/dexie.js',
    './lib/xlsx.full.min.js',
    './lib/supabase.min.js',
    './lib/JsBarcode.all.min.js',
    './lib/Sortable.min.js',
    './lib/chart.min.js',
    './lib/qrcode.min.js',
    './media/logo.png',
    './media/bayan_logo.png',
    './media/logo.ico',
    './media/wallpapers/mountains.jpg',
    './media/wallpapers/burj.jpg',
    './media/wallpapers/beach.jpg',
    './media/wallpapers/night.jpg',
    './media/wallpapers/office.jpg',
    './media/wallpapers/relax.jpg'
];

// تثبيت السيرفس ووركر وتخزين الملفات الأساسية بأمان دون توقف
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(async (cache) => {
            console.log('[SW] 🚀 جاري تخزين الملفات الأساسية...');
            // تخزين الملفات واحداً تلو الآخر لتفادي أي خطأ وتخطي المفقود بأمان
            for (const file of STATIC_FILES) {
                try {
                    await cache.add(file);
                } catch (err) {
                    console.warn(`[SW] تخطي ملف تعذر كاشه: ${file}`, err.message);
                }
            }
        }).then(() => self.skipWaiting())
    );
});

// تفعيل السيرفس ووركر وحذف الكاش القديم
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
                        console.log('[SW] 🗑️ حذف الكاش القديم:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// استراتيجية التحكم في الطلبات (Cache First with Network Fallback)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // تجاهل الطلبات غير الضرورية أو الخارجية غير الآمنة
    if (!request.url.startsWith('http')) return;
    if (url.pathname.includes('socket.io') || url.pathname.includes('/api/')) return;

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            // إذا كان الملف موجوداً في الكاش، أرجعه فوراً (لسرعة البرق أوفلاين)
            if (cachedResponse) {
                return cachedResponse;
            }

            // إذا لم يكن موجوداً، اجلبه من الشبكة وقم بتخزينه فوراً للمرات القادمة
            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
                    return networkResponse;
                }

                // تخزين نسخة من الملف المستلم (خلفيات، خطوط، مكتبات CDN)
                const responseToCache = networkResponse.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // في حالة فشل الشبكة تماماً (أوفلاين) وعدم وجود الملف في الكاش
                if (request.destination === 'document' || request.mode === 'navigate') {
                    return caches.match('./index.html') || caches.match('./');
                }

                // إرجاع SVG افتراضي في حالة فقدان صورة
                if (request.destination === 'image') {
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#eee"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">Bayan POS</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }

                return new Response('', { status: 408, statusText: 'Offline mode active' });
            });
        })
    );
});

// المزامنة في الخلفية (لو عادت الشبكة)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('[SW] 🔄 جاري مزامنة البيانات المتأخرة...');
    }
});
