/**
 * ====================================================================
 * BAYAN POS - BARCODE MODULE (js/barcode.js)
 * ====================================================================
 * وحدة إدارة الباركود المستقلة والاحترافية:
 * 1. دعم أجهزة قراءة الباركود السلكية (USB) واللا سلكية (Bluetooth Scanner)
 * 2. دعم المسح بواسطة كاميرا الجهاز (Camera Scanner) أوفلاين 100%
 * 3. التنبيهات الصوتية للتأكيد أو الخطأ عبر (Web Audio API Synth)
 * 4. إدارة التبؤر (Focus Management) والتنظيف لتفادي Memory Leaks
 * 5. التحقق من صحة الباركود (Validation) والمنع من التكرار والبحث الفوري
 * 6. التكامل التام مع الفواتير والمنتجات وإعادة الاستخدام
 * ====================================================================
 */

const BayanBarcode = (function () {
    'use strict';

    // المتغيرات الخاصة بالماسح الضوئي (Buffer & Listener)
    let buffer = '';
    let lastKeyTime = 0;
    const SCAN_THRESHOLD_MS = 45; // أجهزة الباركود ترسل المفاتيح بسرعة أقل من 40ms
    let isListening = false;
    let scanCallback = null;

    // المتغيرات الخاصة بالكاميرا
    let videoStream = null;
    let cameraAnimationId = null;

    // المتغيرات الخاصة بالصوت (Web Audio API - Offline)
    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    /**
     * تشغيل نغمة مسح (Beep) محلياً بدون أي مكتبات خارجية
     * @param {boolean} success هل تم المسح بنجاح أم يوجد خطأ
     */
    function playBeep(success = true) {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            if (success) {
                // نغمة نجاح قصيرة وواضحة (1800Hz)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1800, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.12);
            } else {
                // نغمة خطأ/تكرار منخفضة (350Hz)
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(350, ctx.currentTime);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch (e) {
            console.warn('⚠️ تعذر تشغيل النغمة الصوتية:', e);
        }
    }

    /**
     * التحقق من صحة وصلاحية الباركود
     * @param {string} barcode 
     * @returns {object} { isValid: boolean, message: string }
     */
    function validate(barcode) {
        if (!barcode || typeof barcode !== 'string') {
            return { isValid: false, message: 'الباركود فارغ' };
        }

        const trimmed = barcode.trim();
        if (trimmed.length < 2 || trimmed.length > 50) {
            return { isValid: false, message: 'طول الباركود يجب أن يكون بين 2 و 50 رمزاً' };
        }

        // فحص الرموز غير المقبولة (تجنب الرموز المعقدة أو التخريبية)
        if (/[\x00-\x1F\x7F]/.test(trimmed)) {
            return { isValid: false, message: 'الباركود يحتوي على رموز غير صالحة' };
        }

        return { isValid: true, barcode: trimmed, message: 'بار كود صالح' };
    }

    /**
     * التحقق من تكرار الباركود في قاعدة بيانات المنتجات المحليه
     * @param {string} barcode 
     * @param {string|number} excludeProductId معرف المنتج المستثنى عند التعديل
     * @returns {boolean} true إذا كان الباركود مكرراً
     */
    function isDuplicate(barcode, excludeProductId = null) {
        if (!barcode) return false;
        const products = window.productsDB || (typeof getStore === 'function' ? (getStore('bayan_products') || []) : []);
        const targetBc = String(barcode).trim();

        return products.some(p => {
            if (excludeProductId && String(p.id) === String(excludeProductId)) return false;
            return String(p.barcode || '').trim() === targetBc;
        });
    }

    /**
     * البحث عن منتج بواسطة الباركود
     * @param {string} barcode 
     * @returns {object|null}
     */
    function findProduct(barcode) {
        if (!barcode) return null;
        const products = window.productsDB || (typeof getStore === 'function' ? (getStore('bayan_products') || []) : []);
        const targetBc = String(barcode).trim();

        return products.find(p => String(p.barcode || '').trim() === targetBc) || null;
    }

    /**
     * معالج مسح الباركود العام الموحد
     * @param {string} code 
     * @param {string} source ('usb' | 'bluetooth' | 'camera' | 'manual')
     */
    function handleScan(code, source = 'usb') {
        const valRes = validate(code);
        if (!valRes.isValid) {
            playBeep(false);
            if (typeof showToast === 'function') {
                showToast(valRes.message, 'warning');
            }
            return;
        }

        const cleanCode = valRes.barcode;
        console.log(`🔍 [Barcode Scanned] (${source}):`, cleanCode);

        // إذا كان هناك Callback خاص مخصص
        if (typeof scanCallback === 'function') {
            playBeep(true);
            scanCallback(cleanCode, source);
            return;
        }

        // التوجه الافتراضي الذكي:
        // 1. إذا كان المودال المفتوح هو مودال إضافة/تعديل صنف
        const productModal = document.getElementById('productModal');
        if (productModal && productModal.style.display !== 'none' && !productModal.classList.contains('hidden')) {
            const bcInput = document.getElementById('productBarcode');
            if (bcInput) {
                // فحص التكرار عند الإدخال في كارت الصنف
                const editIdInput = document.getElementById('productId') || document.getElementById('editProductId');
                const editId = editIdInput ? editIdInput.value : null;

                if (isDuplicate(cleanCode, editId)) {
                    playBeep(false);
                    if (typeof showToast === 'function') showToast('⚠️ هذا الباركود مستخدم بالفعل لمنتج آخر!', 'error');
                } else {
                    bcInput.value = cleanCode;
                    playBeep(true);
                    if (typeof showToast === 'function') showToast('✅ تم ملء الباركود في بطاقة الصنف', 'success');
                }
                return;
            }
        }

        // 2. إذا كنا في شاشة المبيعات (POS) أو الفاتورة
        const salesSection = document.getElementById('sales-section') || document.getElementById('posSection');
        if (typeof addProductToCart === 'function') {
            const product = findProduct(cleanCode);
            if (product) {
                playBeep(true);
                addProductToCart(product);
                if (typeof showToast === 'function') showToast(`✅ تم إضافة: ${product.name}`, 'success');
                return;
            }
        }

        // 3. البحث في خانة البحث عن المنتجات المتاحة
        const searchInput = document.getElementById('productSearch') || document.getElementById('posSearchInput');
        if (searchInput) {
            searchInput.value = cleanCode;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));

            const product = findProduct(cleanCode);
            if (product) {
                playBeep(true);
                if (typeof showToast === 'function') showToast(`🔍 تم العثور على: ${product.name}`, 'info');
            } else {
                playBeep(false);
                if (typeof showToast === 'function') showToast('⚠️ لم يتم العثور على منتج بهذا الباركود', 'warning');
            }
            return;
        }

        playBeep(true);
    }

    /**
     * الاستماع لإدخالات الباركود السريعة المباشرة من لوحة المفاتيح (USB / Bluetooth Scanner)
     */
    function onGlobalKeyDown(e) {
        // حماية ضد أي حدث غير معرف أو لوحات المفاتيح اللمسية/الافتراضية
        if (!e || typeof e.key !== 'string') return;

        // تجاهل الأحداث إذا كان التركيز في حقل نصي عادي متاح للكتابة، إلا إذا تم الضغط بسرعة عالية جداً بواسطة الماسح
        const activeElem = document.activeElement;
        const isInputField = activeElem && (
            activeElem.tagName === 'INPUT' || 
            activeElem.tagName === 'TEXTAREA' || 
            activeElem.tagName === 'SELECT' ||
            activeElem.isContentEditable
        );

        const currentTime = performance.now();
        const timeDiff = currentTime - lastKeyTime;
        lastKeyTime = currentTime;

        // إذا كان هناك فارق زمني بين المفاتيح أقل من SCAN_THRESHOLD_MS يعتبر مدخل ماسح سريعا
        if (e.key === 'Enter' || e.key === 'Tab') {
            if (buffer && buffer.length >= 2) {
                // إذا تمت القراءة بسرعة أو كان المفتاح Enter
                const scanned = buffer;
                buffer = '';
                if (isInputField && activeElem.id === 'productBarcode') {
                    // ترك الحقل يتلقى القيمة طبيعياً مع تشغيل نغمة المسح
                    playBeep(true);
                    return;
                }
                e.preventDefault();
                handleScan(scanned, 'hardware_scanner');
            } else {
                buffer = '';
            }
            return;
        }

        // تجميع أحرف الباركود مع حماية ضد الأحرف غير المعرفة
        if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            if (timeDiff < SCAN_THRESHOLD_MS || !buffer || buffer.length === 0) {
                buffer = (buffer || '') + e.key;
            } else if (timeDiff > 200) {
                // إعادة تعيين الـ Buffer عند التوقف الطويل عن الكتابة
                buffer = e.key;
            } else {
                buffer = (buffer || '') + e.key;
            }
        }
    }

    /**
     * تشغيل استماع الحساس لجهاز الباركود
     */
    function startHardwareListener(customCallback = null) {
        if (customCallback) scanCallback = customCallback;
        if (!isListening) {
            document.removeEventListener('keydown', onGlobalKeyDown); // حماية ضد التكرار
            document.addEventListener('keydown', onGlobalKeyDown);
            isListening = true;
            console.log('📡 [BayanBarcode] تم تفعيل مستمع أجهزة الباركود (USB/Bluetooth)');
        }
    }

    /**
     * إيقاف الاستماع لمنع Memory Leaks
     */
    function stopHardwareListener() {
        if (isListening) {
            document.removeEventListener('keydown', onGlobalKeyDown);
            isListening = false;
            buffer = '';
            console.log('🛑 [BayanBarcode] تم إيقاف مستمع الباركود');
        }
    }

    /**
     * تشغيل قراءة الباركود عبر كاميرا الجهاز (Camera Scanner - 100% Offline)
     */
    async function startCameraScanner(videoElementId = 'barcodeCameraVideo', canvasElementId = 'barcodeCameraCanvas') {
        const video = document.getElementById(videoElementId);
        const canvas = document.getElementById(canvasElementId);

        if (!video || !canvas) {
            console.error('❌ عناصر فيديو أو كانفاس الكاميرا غير موجودة في الصفحة');
            if (typeof showToast === 'function') showToast('⚠️ تعذر العثور على شاشة الكاميرا', 'error');
            return false;
        }

        try {
            stopCameraScanner(); // إغلاق أي كاميرا تعمل مسبقاً

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });

            videoStream = stream;
            video.srcObject = stream;
            await video.play();

            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // الفحص الدوري للباركود عبر الكاميرا
            const checkBarcodeFrame = () => {
                if (!videoStream || video.paused || video.ended) return;

                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // استخدام BarcodeDetector API النيتيف المتاحة في Electron / Chrome
                    if ('BarcodeDetector' in window) {
                        const detector = new window.BarcodeDetector();
                        detector.detect(canvas)
                            .then(barcodes => {
                                if (barcodes && barcodes.length > 0) {
                                    const detectedCode = barcodes[0].rawValue;
                                    playBeep(true);
                                    stopCameraScanner();
                                    closeCameraModal();
                                    handleScan(detectedCode, 'camera');
                                } else {
                                    cameraAnimationId = requestAnimationFrame(checkBarcodeFrame);
                                }
                            })
                            .catch(err => {
                                cameraAnimationId = requestAnimationFrame(checkBarcodeFrame);
                            });
                    } else {
                        // في حال عدم توفر BarcodeDetector، يتم الإبلاغ والدوران
                        cameraAnimationId = requestAnimationFrame(checkBarcodeFrame);
                    }
                } else {
                    cameraAnimationId = requestAnimationFrame(checkBarcodeFrame);
                }
            };

            cameraAnimationId = requestAnimationFrame(checkBarcodeFrame);
            if (typeof showToast === 'function') showToast('📷 تم تشغيل الكاميرا لقراءة الباركود', 'info');
            return true;
        } catch (err) {
            console.error('❌ خطأ في تشغيل كاميرا الباركود:', err);
            if (typeof showToast === 'function') showToast('⚠️ تعذر الوصول إلى الكاميرا: ' + err.message, 'error');
            return false;
        }
    }

    /**
     * إيقاف الكاميرا وتنظيف الموارد (Prevent Memory Leak)
     */
    function stopCameraScanner() {
        if (cameraAnimationId) {
            cancelAnimationFrame(cameraAnimationId);
            cameraAnimationId = null;
        }
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
            console.log('🛑 [BayanBarcode] تم إغلاق الكاميرا وتنظيف الموارد');
        }
    }

    /**
     * فتح مودال واجهة الكاميرا
     */
    function openCameraModal() {
        let modal = document.getElementById('bayanCameraModal');
        if (!modal) {
            console.warn('⚠️ مودال الكاميرا غير موجود');
            return;
        }
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        startCameraScanner();
    }

    /**
     * إغلاق مودال واجهة الكاميرا
     */
    function closeCameraModal() {
        let modal = document.getElementById('bayanCameraModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
        stopCameraScanner();
    }

    /**
     * الحفاظ على التركيز (Auto Focus) على حقل الباركود
     * @param {string} inputId 
     */
    function keepFocus(inputId) {
        const inputElem = document.getElementById(inputId);
        if (inputElem) {
            inputElem.focus();
        }
    }

    /**
     * التهيئة الأولية لعنصر الباركود
     */
    function init() {
        startHardwareListener();
        console.log('🚀 [BayanBarcode Engine Loaded Successfully]');
    }

    // تصدير واجهة الوظائف العامة
    return {
        init,
        playBeep,
        validate,
        isDuplicate,
        findProduct,
        handleScan,
        startHardwareListener,
        stopHardwareListener,
        startCameraScanner,
        stopCameraScanner,
        openCameraModal,
        closeCameraModal,
        keepFocus
    };
})();

// التهيئة التلقائية فور تحميل المستند
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BayanBarcode.init());
} else {
    BayanBarcode.init();
}
