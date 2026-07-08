// حل مشكلة تعريف مكتبة XLSX في بيئة Electron (Node.js Integration)
if (typeof XLSX === 'undefined') {
    if (typeof window.XLSX !== 'undefined') {
        window.XLSX = window.XLSX;
    } else if (typeof module !== 'undefined' && module.exports && module.exports.utils) {
        window.XLSX = module.exports;
    } else if (typeof require !== 'undefined') {
        try { window.XLSX = require('./lib/xlsx.full.min.js'); } catch(e) {}
    }
}

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(reg => {
                        console.log('Service Worker: Registered ✅');
                        // فحص وجود تحديثات جديدة بشكل دوري تلقائي
                        setInterval(() => {
                            reg.update();
                        }, 1000 * 60 * 30); // كل 30 دقيقة
                    })
                    .catch(err => console.log('Service Worker: Failed ❌', err));
            });

            // إعادة تحميل الصفحة فوراً عند تحديث ملفات النظام في الخلفية وتنشيط SW الجديد
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
            });
        }

// Supabase Configuration - Disconnected for local offline usage
        const SUPABASE_URL = '';
        const SUPABASE_KEY = ''; 
        let supabaseClient = null;

        // Cloud initialization disabled for offline mode

// تم إزالة نظام درع بَيَان (حماية السورس كود) لفتح النسخة تجارياً

        // --- 🛡️ نظام درع بَيَان السحابي (Bayan Shield Cloud Logic) ---

        // تم نقل التهيئة للأعلى لضمان التوفر الشامل

        const CLOUD_TABLES = ['users_subscriptions', 'users', 'المستخدمين_عام'];

        const PRIMARY_TABLE = 'users_subscriptions';

        // تم إزالة تشفير هوية الجهاز (HWID Encryption) لفتح النسخة تجارياً

        async function checkSubscriptionStatus() {

            console.log("🔓 النسخة مفتوحة تجارياً - تم تعطيل قيود الاشتراك.");

            localStorage.setItem('bayan_active', 'true');

            const banner = document.getElementById('trialStatusBanner');

            if (banner) banner.style.display = 'none';

            return true;

        }

        // دالة فحص التحديثات الجديدة

        // تهيئة قاعدة بيانات IndexedDB بشكل كامل (Dexie)
        const db = new Dexie("BayanDatabase");
        db.version(3).stores({
            products: "++id, name, barcode, category",
            transactions: "++id, dateISO, type, partner, invoiceId",
            accounts: "++id, name, type, code",
            settings: "id",
            trash: "++id, type, deletedAt",
            users: "++id, name, pin",
            auditLogs: "++id, timestamp, action",
            backups: "++id, timestamp"
        });

        // قاعدة بيانات وهمية للأصناف (سيتم استبدالها لاحقاً ببيانات من DB)

        let initialProducts = [];

        window.productsDB = [];

        let isEditMode = false;

        let editingInvoiceId = null;

        let editingOriginalDate = null;

        let editingOriginalItems = []; // لحساب فرق المخزون والمديونية

        let selectedInvoiceIndex = null;

        let selectedHistoryIndex = null;

        let currentQuickAddContext = null;

        let currentSessionSelectedAddress = ''; // تتبع العنوان المختار للطباعة حالياً

        // --- التبديل بين الأقسام ---

        // --- نظام المختبر المتعدد المطوّر (Multi-Instance Tab Logic) ---

        let openTabs = [{ id: 'dashboard', type: 'dashboard', label: '🏠 الرئيسية' }];

        let activeTabId = 'dashboard';

        let pendingCloseSection = null;

        let tabStates = {};

        let tabCounters = {};

        // --- تهيئة أزرار نافذة التأكيد (Unsaved Changes Modal) ---

        function checkAccess() {

            checkSubscriptionStatus();

            return true;

        }

        function checkAccess() {

            // Updated to use the new async check

            checkSubscriptionStatus().then(res => {

                if (!res) console.log("Access Denied.");

            });

            return true; // We don't block locally anymore, the showLockScreen does it.

        }

        window.cart = [];

        window.currentTotal = 0; // الصافي النهائي

        window.transactions = []; // سجل العمليات العام (إجمالي الحركة)

        window.currentInvoicesView = 'operation'; // وضع العرض: operation (تجميع) أو items (تفصيلي)

        window.currentFontSize = 16; // حجم الخط الافتراضي

        window.users = [];

        window.currentUser = null;

        window.selectedLoginUser = null;

        window.warehouses = []; // مصفوفة المخازن

        window.accounts = []; // مصفوفة الحسابات العامة (العملاء والموردين)

        window.trashBin = []; // سلة المحذوفات

        window.auditLogs = []; // سجل التدقيق للعمليات الحساسة

        window.selectedAccountID = null; // الحساب المحدد في الجدول

        /**

         * دالة تسجيل العمليات الحساسة (Audit Logger)

         */

        let currentLanguage = 'ar'; // اللغة الافتراضية

        // --- نظام تخصيص أعمدة المخزن (Inventory Column Visibility) ---

        let inventoryColumnVisibility = JSON.parse(localStorage.getItem('pos_inv_cols') || '{"0":true,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true,"7":true,"8":true,"9":true,"10":true,"11":true,"12":true,"13":true,"margin":true,"detailed":true}');

        // قوائم أسباب الخصم والإضافة (للحفظ الذكي)

        let discountReasons = ['خصم عام', 'خصم عميل مميز', 'خصم تجاري', 'تعويض شكوى'];

        let taxReasons = ['ضريبة (VAT)', 'خدمة توصيل', 'مصاريف إضافية'];

        let purchaseDiscountReasons = ['خصم توريد', 'خصم كمية', 'تعجيل دفع'];

        let purchaseTaxReasons = ['ضريبة مشتريات', 'نقل ومشال', 'تغليف / إضافات'];

        window.inventoryCategories = ['عام'];

        if (localStorage.getItem('bayan_inventory_categories')) {

            window.inventoryCategories = JSON.parse(localStorage.getItem('bayan_inventory_categories'));

        }

        // --- نظام الحفظ والاسترجاع (LocalStorage) ---

        // --- نظام الحسابات والديناميكية ---

        async function loadData() {

            // 📡 التحقق من ترخيص الاشتراك محلياً بطريقة مؤمنة
            await LicenseService.verifyLicense(); 
            setInterval(() => LicenseService.verifyLicense(), 5 * 60 * 1000); 

            // جلب الإعلانات وتحديثها كل 10 دقائق

            fetchAdminAnnouncements();

            setInterval(fetchAdminAnnouncements, 10 * 60 * 1000);

            const savedSession = localStorage.getItem('pos_session_user');

            try {
                // 1. تحميل كافة البيانات من IndexedDB إلى المصفوفات المحلية
                productsDB = await db.products.toArray();
                transactions = await db.transactions.toArray();
                accounts = await db.accounts.toArray();
                users = await db.users.toArray();
                trashBin = await db.trash.toArray();
                auditLogs = await db.auditLogs.toArray();

                console.log("✅ Data successfully loaded from IndexedDB.");
            } catch (err) {
                console.error("❌ Failed to load data from IndexedDB:", err);
                users = [];
                trashBin = [];
                auditLogs = [];
            }

            if (localStorage.getItem('pos_warehouses')) {

                warehouses = JSON.parse(localStorage.getItem('pos_warehouses'));

            } else {

                warehouses = [{ id: 1, name: 'المخزن الرئيسي', address: 'المقر الرئيسي' }];

            }

            // تحميل أسباب الخصم والإضافة التلقائية (من localStorage للمحافظة على التوافق حالياً)

            if (localStorage.getItem('pos_discount_reasons')) discountReasons = JSON.parse(localStorage.getItem('pos_discount_reasons'));

            if (localStorage.getItem('pos_tax_reasons')) taxReasons = JSON.parse(localStorage.getItem('pos_tax_reasons'));

            if (localStorage.getItem('pos_p_discount_reasons')) purchaseDiscountReasons = JSON.parse(localStorage.getItem('pos_p_discount_reasons'));

            if (localStorage.getItem('pos_p_tax_reasons')) purchaseTaxReasons = JSON.parse(localStorage.getItem('pos_p_tax_reasons'));

            // دمج التصنيفات الموجودة في المنتجات مع القائمة الدائمة لضمان عدم ضياع أي تصنيف قديم

            if (window.productsDB && window.productsDB.length > 0) {

                const existingCats = [...new Set(window.productsDB.map(p => p.category).filter(c => c))];


                existingCats.forEach(cat => {

                    if (!window.inventoryCategories.includes(cat)) {

                        window.inventoryCategories.push(cat);

                    }

                });

            }

            updateDatalists();

            const mainSettings = (await db.settings.get('main')) || {};

            // تطبيق الثيم

            if (mainSettings.theme === 'dark' || localStorage.getItem('pos_theme') === 'dark') {

                document.body.classList.add('dark-mode');

                const themeBtn = document.querySelector('.theme-toggle-btn');

                if (themeBtn) themeBtn.innerText = '☀️';

            }

            // إعدادات الخط

            if (mainSettings.fontSize) {

                currentFontSize = mainSettings.fontSize;

                document.documentElement.style.setProperty('--app-font-size', currentFontSize + 'px');

            }

            if (mainSettings.name) document.getElementById('appTitle').innerText = '🚀 ' + mainSettings.name;

            if (mainSettings.language) {

                currentLanguage = mainSettings.language;

                changeLanguage(currentLanguage);

            }

            if (mainSettings.mainColor) document.documentElement.style.setProperty('--main-green', mainSettings.mainColor);

            const todayISO = new Date().toLocaleDateString('en-CA');

            document.getElementById('reportDateFrom').value = todayISO;

            document.getElementById('reportDateTo').value = todayISO;

            document.getElementById('invoicesDateFrom').value = todayISO;

            document.getElementById('invoicesDateTo').value = todayISO;

            document.getElementById('historyDateFrom').value = todayISO;

            document.getElementById('historyDateTo').value = todayISO;

            // ضبط القيمة الافتراضية للفلاتر لتكون "الكل" عند التحميل

            if (document.getElementById('invoicesSearchMethod')) document.getElementById('invoicesSearchMethod').value = 'all';

            if (document.getElementById('anMethod')) document.getElementById('anMethod').value = 'all';

            if (document.getElementById('historyMethodFilter')) document.getElementById('historyMethodFilter').value = 'all';

            initConfirmModal();

            // إجبار تسجيل الدخول عند كل تحميل للمتصفح بناءً على طلب المستخدم

            initLogin();

            // ✅ أمان: استعادة الجلسة من IndexedDB عبر PIN فقط (لا نثق بالبيانات المخزنة في localStorage)
            if (savedSession) {

                try {

                    const sessionData = JSON.parse(savedSession);
                    const savedPin = sessionData.pin;
                    const savedWarehouse = sessionData.warehouseName || 'المخزن الرئيسي';

                    // نبحث عن المستخدم في IndexedDB بالـ PIN (لا نثق بالبيانات المكتوبة في localStorage)
                    if (savedPin) {
                        const realUser = users.find(u => u.pin === savedPin);
                        if (realUser) {
                            // نملأ اسم المستخدم مسبقاً في شاشة تسجيل الدخول للراحة
                            const userSelect = document.getElementById('loginUsernameInput');
                            if (userSelect) {
                                userSelect.value = realUser.name;
                                setTimeout(() => {
                                    const pinInput = document.getElementById('loginPinInput');
                                    if (pinInput) pinInput.focus();
                                }, 500);
                            }
                        } else {
                            // الـ PIN لا يطابق أي مستخدم حقيقي - نحذف الجلسة
                            localStorage.removeItem('pos_session_user');
                        }
                    }

                } catch(e) {
                    localStorage.removeItem('pos_session_user');
                }

            }

            updateConnectionStatus();

            // تشغيل النسخ الاحتياطي التلقائي عند التحميل
            setTimeout(() => {
                if (typeof BackupService !== 'undefined') BackupService.createAutoBackup();
            }, 2000);

            // تشغيل النسخ الاحتياطي التلقائي عند إغلاق البرنامج
            window.addEventListener('beforeunload', () => {
                if (typeof BackupService !== 'undefined') {
                    // استخدام التزامن أو الحفظ المباشر
                    BackupService.createAutoBackup();
                }
            });

        }

        async function saveData() {
            try {
                // 1. حفظ الأصناف
                await db.products.clear();
                if (productsDB.length > 0) {
                    await db.products.bulkAdd(productsDB);
                }

                // 2. حفظ الحسابات (عملاء وموردين)
                await db.accounts.clear();
                if (accounts.length > 0) {
                    await db.accounts.bulkAdd(accounts);
                }

                // 3. حفظ العمليات والفواتير
                await db.transactions.clear();
                if (transactions.length > 0) {
                    await db.transactions.bulkAdd(transactions);
                }

                // 4. حفظ المستخدمين
                await db.users.clear();
                if (users && users.length > 0) {
                    await db.users.bulkAdd(users);
                }

                // 5. حفظ المهملات
                await db.trash.clear();
                if (trashBin && trashBin.length > 0) {
                    await db.trash.bulkAdd(trashBin);
                }

                // 6. حفظ سجل النظام
                await db.auditLogs.clear();
                if (auditLogs && auditLogs.length > 0) {
                    await db.auditLogs.bulkAdd(auditLogs);
                }

                // 7. حفظ الإعدادات
                const settings = JSON.parse(localStorage.getItem('pos_settings') || '{}');
                await db.settings.put({ id: 'main', ...settings });

                console.log("✅ Data successfully saved to IndexedDB.");
            } catch (err) {
                console.error("❌ Failed to save data to IndexedDB:", err);
            }

            // استمرار دعم localStorage لبعض الإعدادات السريعة
            localStorage.setItem('pos_warehouses', JSON.stringify(warehouses));
            localStorage.setItem('pos_discount_reasons', JSON.stringify(discountReasons));
            localStorage.setItem('pos_tax_reasons', JSON.stringify(taxReasons));
            localStorage.setItem('pos_p_discount_reasons', JSON.stringify(purchaseDiscountReasons));
            localStorage.setItem('pos_p_tax_reasons', JSON.stringify(purchaseTaxReasons));
            localStorage.setItem('bayan_inventory_categories', JSON.stringify(window.inventoryCategories));
            updateNotifications();
        }

        // تحديث القوائم المنسدلة الذكية لدعم الأنواع الجديدة (Select)

        async function wipeAllSystemData() {

            if (!confirm("⚠️ تنبيه خطير جداً!\n\nأنت على وشك مسح كافة بيانات النظام (الأصناف، الفواتير، الحسابات، الإعدادات).\n\nهل أنت متأكد تماماً من هذه الخطوة؟ لا يمكن التراجع عنها!")) {

                return;

            }

            const confirmSecond = confirm("⚠️ تأكيد أخير:\n\nسيتم حذف كل شيء والبدء من جديد. هل أنت متأكد؟");

            if (!confirmSecond) return;

            try {

                // مسح كافة الجداول في IndexedDB

                await Promise.all([

                    db.products.clear(),

                    db.transactions.clear(),

                    db.accounts.clear(),

                    db.users.clear(),

                    db.settings.clear(),

                    db.trash.clear(),

                    db.auditLogs.clear()

                ]);

                // مسح البيانات من LocalStorage

                const keysToRemove = [

                    'pos_products', 'pos_transactions', 'pos_accounts', 'pos_users', 

                    'pos_settings', 'pos_theme', 'pos_session_user', 'pos_warehouses',

                    'bayan_install_date', 'bayan_active'

                ];

                keysToRemove.forEach(key => localStorage.removeItem(key));

                alert("✅ تمت عملية تصفير النظام بنجاح! سيتم إعادة تحميل البرنامج الآن.");

                location.reload();

            } catch (error) {

                console.error("Error wiping data:", error);

                alert("❌ حدث خطأ أثناء مسح البيانات: " + error.message);

            }

        }

        window.wipeAllSystemData = wipeAllSystemData;
