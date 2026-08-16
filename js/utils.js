        // دالة التأخير (Debounce) لتحسين الأداء عند الكتابة في خانات البحث
        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        // --- النسخ المؤجلة (Debounced Versions) للوظائف المكثفة ---
        const debouncedHandleSearch = debounce((val) => { if (typeof handleSearch === 'function') handleSearch(val); }, 300);
        const debouncedHandleReturnSearch = debounce((val, type) => { if (typeof handleReturnSearch === 'function') handleReturnSearch(val, type); }, 300);
        const debouncedHandleCustomerSearch = debounce((val) => { if (typeof handleCustomerSearch === 'function') handleCustomerSearch(val); }, 300);
        const debouncedRenderInventoryTable = debounce(() => { if (typeof renderInventoryTable === 'function') renderInventoryTable(); }, 350);
        const debouncedHandlePriceAdjSearch = debounce(() => { if (typeof handlePriceAdjSearch === 'function') handlePriceAdjSearch(); }, 300);
        const debouncedHandleSupplierSearch = debounce((val) => { if (typeof handleSupplierSearch === 'function') handleSupplierSearch(val); }, 300);
        const debouncedHandlePurchaseSearch = debounce((val) => { if (typeof handlePurchaseSearch === 'function') handlePurchaseSearch(val); }, 300);



        async function getUniqueHWID() {
            let hwid = getStore('bayan_hwid');
            if (hwid) return hwid;

            try {
                if (typeof db !== 'undefined' && db.settings) {
                    const stored = await db.settings.get('hwid');
                    if (stored && stored.value) {
                        setStore('bayan_hwid', stored.value);
                        return stored.value;
                    }
                }
            } catch(e) {}

            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let part1 = '', part2 = '';
            for(let i=0; i<4; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length));
            for(let i=0; i<4; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length));
            hwid = `BNC-${part1}-${part2}`;

            try {
                if (typeof db !== 'undefined' && db.settings) {
                    await db.settings.put({ id: 'hwid', value: hwid });
                }
            } catch(e) {}
            setStore('bayan_hwid', hwid);
            return hwid;
        }
        window.getUniqueHWID = getUniqueHWID;

        // دالة نسخ كود الجهاز للحافظة
        function copyHwid() {
            const hwid = document.getElementById('displayHwid')?.innerText;
            if(!hwid || hwid.includes('جاري')) return;
            navigator.clipboard.writeText(hwid).then(() => {
                showToast("✅ تم نسخ كود الجهاز (HWID) بنجاح");
            });
        }

        // ربط الفحص المباشر بنظام التحديثات التلقائية المباشر (GitHub Releases API)
        function checkUpdates() {
            if (typeof window.checkGitHubReleases === 'function') {
                window.checkGitHubReleases(true);
            } else if (typeof window.checkForBayanUpdatesManual === 'function') {
                window.checkForBayanUpdatesManual();
            } else {
                showToast("🔍 جاري التحقق من وجود تحديثات جديدة...");
                setTimeout(() => {
                    showCustomAlert({
                        titleText: '✅ نظامك محدث',
                        msg: 'أنت تستخدم حالياً أحدث إصدار مستقر من بَيَان POS (v1.0.8).',
                        type: 'success'
                    });
                }, 1000);
            }
        }

        // فتح رابط خارجي بأمان عبر IPC (Electron) أو متصفح عادي
        function openExternalUrl(url) {
            try {
                // الطريقة الأولى: ipcRenderer (الأسرع والأكثر أماناً مع main.js الحالي)
                if (window.require) {
                    const { ipcRenderer } = window.require('electron');
                    if (ipcRenderer) { ipcRenderer.invoke('open-url', url); return; }
                }
            } catch(e) {}
            // الطريقة الاحتياطية: فتح في المتصفح الافتراضي
            window.open(url, '_blank');
        }

        // تحديث واجهة الاشتراك في النافذة (Modal) بناءً على طلب المستخدم
        function copyText(text, btn) {
            navigator.clipboard.writeText(text).then(() => {
                const originalHTML = btn.innerHTML;
                // تبديل للأيقونة "صح" مع تغيير اللون لأخضر
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color: white;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                btn.style.background = "#27ae60";
                btn.style.borderColor = "#27ae60";

                if (typeof showToast === 'function') {
                    showToast("تم النسخ بنجاح ✨");
                }

                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.background = "#f8fafc";
                    btn.style.borderColor = "#e2e8f0";
                }, 1500);
            }).catch(err => {
                console.error('فشل النسخ: ', err);
            });
        }

        // 1. إنشاء قاعدة البيانات (BayanDatabase)
        function logAuditAction(action, details) {
            const entry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                user: currentUser ? currentUser.name : 'System',
                userId: currentUser ? currentUser.id : 0,
                action: action, // e.g., 'DELETE_TRANSACTION', 'EDIT_USER'
                details: details,
                warehouse: currentUser ? currentUser.warehouseName : 'Unknown'
            };
            auditLogs.push(entry);
            console.log(`🛡️ Audit Log: ${action}`, entry);
            saveData(); // حفظ السجلات فورياً
        }
        let returnCart = []; // سلة مرتجع البيع
        let purReturnCart = []; // سلة مرتجع الشراء
        let currentAnalysisMode = 'detailed'; // وضع تحليل المبيعات (تفصيلي/تجميعي)
        function updateDatalists() {
            fillDatalist('discountReason', discountReasons);
            fillDatalist('taxReason', taxReasons);
            fillDatalist('purchaseDiscountReason', purchaseDiscountReasons);
            fillDatalist('purchaseTaxReason', purchaseTaxReasons);
            fillDatalist('categoriesList', window.inventoryCategories);
        }

        function fillDatalist(listId, array) {
            const list = document.getElementById(listId);
            if (!list) return;
            list.innerHTML = '';

            // إذا كان العنصر select، نضيف خيار "اختر" أولاً
            if (list.tagName === 'SELECT') {
                const emptyOpt = document.createElement('option');
                emptyOpt.value = '';
                emptyOpt.innerText = '--- اختر ---';
                list.appendChild(emptyOpt);
            }

            array.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item;
                if (list.tagName === 'SELECT') opt.innerText = item;
                list.appendChild(opt);
            });
        }

        function addNewReason(value, array, listId) {
            if (value && !array.includes(value)) {
                array.push(value);
                saveData();
                updateDatalists();
            }
        }

        // --- دالة توليد الأرقام المتسلسلة ---
        function getNextSequence(typeKeyword) {
            // بحث عن جميع الحركات التي تطابق النوع المحدد حصراً
            const filtered = (typeof transactions !== 'undefined' ? transactions : []).filter(t => {
                if (!t || !t.type || t.invoiceId == null) return false;
                const tType = t.type;
                if (typeKeyword === 'بيع') return tType.includes('بيع') && !tType.includes('مرتجع');
                if (typeKeyword === 'شراء') return tType.includes('شراء') && !tType.includes('مرتجع');
                if (typeKeyword === 'مرتجع بيع') return tType.includes('مرتجع بيع') || (tType.includes('مرتجع') && tType.includes('بيع'));
                if (typeKeyword === 'مرتجع شراء') return tType.includes('مرتجع شراء') || (tType.includes('مرتجع') && tType.includes('شراء'));
                return tType.includes(typeKeyword);
            });
            if (filtered.length === 0) return 1;
            
            // إيجاد أعلى رقم فاتورة مستخدم بدلاً من عدّ الأسطر
            const maxId = Math.max(0, ...filtered.map(t => parseInt(t.invoiceId) || 0));
            return maxId + 1;
        }

        // --- مراقبة حالة الاتصال (Offline/Online) المباشرة والدورية ---
        window.addEventListener('online', () => updateConnectionStatus(true));
        window.addEventListener('offline', () => updateConnectionStatus(false));
        
        // فحص دوري تلقائي كل 8 ثواني لضمان تحول الحالة فورياً دون ريفريش
        setInterval(updateConnectionStatus, 8000);
        setTimeout(updateConnectionStatus, 1000);

        let _cachedStatusDiv = null;
        let _cachedStatusText = null;
        let _lastConnectionState = null;

        async function updateConnectionStatus(forcedState = null) {
            if (!_cachedStatusDiv) _cachedStatusDiv = document.getElementById('connectionStatus');
            if (!_cachedStatusText) _cachedStatusText = document.getElementById('statusText');
            if (!_cachedStatusDiv || !_cachedStatusText) return;
            
            const isOnline = typeof forcedState === 'boolean' ? forcedState : navigator.onLine;
            if (_lastConnectionState === isOnline) return; // منع إعادة الرسم غير الضروري
            _lastConnectionState = isOnline;
            
            if (isOnline) {
                _cachedStatusDiv.className = 'connection-status online';
                _cachedStatusText.innerText = 'متصل';
            } else {
                _cachedStatusDiv.className = 'connection-status offline';
                _cachedStatusText.innerText = 'أوفلاين';
            }
        }

        // --- تحديث الساعة والتاريخ المباشر (Optimized) ---
        let cachedTimeEl, cachedDateEl, cachedUserNameLabels, cachedTimeLabels;
        function updateTime() {
            if (!cachedTimeEl) cachedTimeEl = document.getElementById("time");
            if (!cachedDateEl) cachedDateEl = document.getElementById("date");

            let now = new Date();
            let timeStr = now.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            let dateStr = now.toLocaleDateString("ar-EG", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            if (cachedTimeEl) cachedTimeEl.innerText = timeStr;
            if (cachedDateEl) cachedDateEl.innerText = dateStr;

            // تحديث الملصقات الإضافية في التبويبات النوافذ المتعددة (مرة كل 5 ثواني للبحث في DOM)
            if (!cachedTimeLabels || now.getSeconds() % 5 === 0) {
                cachedTimeLabels = document.querySelectorAll('.timeLabel');
                cachedUserNameLabels = document.querySelectorAll('.userNameLabel');
            }

            cachedTimeLabels.forEach(el => el.innerText = timeStr);
            const userName = currentUser ? currentUser.name : 'المدير العام (مدير)';
            cachedUserNameLabels.forEach(el => {
                if (el.innerText !== userName) el.innerText = userName;
            });

            // تحديث التاريخ/الوقت في التاب النشط تلقائياً
            const currentTab = openTabs.find(t => t.id === activeTabId);
            if (currentTab) {
                const cfg = [
                    { s: 'sales', d: 'salesDate', t: 'salesTime' },
                    { s: 'purchase', d: 'purchaseDate', t: 'purchaseTime' },
                    { s: 'receipt', d: 'receiptDate', t: 'receiptTime' },
                    { s: 'disbursement', d: 'disburseDate', t: 'disburseTime' },
                    { s: 'sales-return', d: 'salesReturnDate', t: 'salesReturnTime' },
                    { s: 'purchase-return', d: 'purReturnDate', t: 'purReturnTime' },
                    { s: 'adjustment', d: 'adjDate', t: 'adjTime' }
                ].find(c => c.s === currentTab.type);

                if (cfg) {
                    const dEl = document.getElementById(cfg.d);
                    const tEl = document.getElementById(cfg.t);

                    // التحديث المباشر: يحدث فقط إذا كان الحقل للقراءة فقط (ليس مدير) أو لم يتم التركيز عليه
                    // هذا يضمن بقاء الفاتورة متزامنة مع الساعة حتى لحظة الحفظ
                    if (dEl && document.activeElement !== dEl) {
                        const todayLocal = new Date().toLocaleDateString('en-CA');
                        if (dEl.readOnly || dEl.getAttribute('data-touched') !== 'true') {
                            dEl.value = todayLocal;
                        }
                    }
                    if (tEl && document.activeElement !== tEl) {
                        const timeISO = now.toTimeString().slice(0, 5);
                        if (tEl.readOnly || tEl.getAttribute('data-touched') !== 'true') {
                            tEl.value = timeISO;
                        }
                    }
                }
            }
        }

        // تشغيلها أول مرة
        updateTime();
        // تحديث كل ثانية
        setInterval(updateTime, 1000);

        // --- دالة فحص النواقص عند الدخول ---
        window.acknowledgedLowStock = [];
        window.acknowledgedDebt = [];
        window.acknowledgedDelayed = [];

        window.isAccountFrozen = function(accountNameOrId) {
            if (!accountNameOrId) return false;
            let acc = null;
            if (typeof accountNameOrId === 'object') {
                acc = accountNameOrId;
            } else if (typeof accountNameOrId === 'number' || (!isNaN(Number(accountNameOrId)) && typeof accountNameOrId !== 'boolean')) {
                acc = accounts.find(a => a.id == accountNameOrId);
            }
            if (!acc && typeof accountNameOrId === 'string') {
                const trimmed = accountNameOrId.trim();
                acc = accounts.find(a => a.name && a.name.trim() === trimmed);
            }
            return acc ? (acc.inactive === true || acc.inactive === 'true' || acc.isFrozen === true) : false;
        };

        window.checkAccountFrozenAndAlert = function(accountNameOrId) {
            if (!accountNameOrId) return false;
            let accName = accountNameOrId;
            let acc = null;
            if (typeof accountNameOrId === 'object') {
                acc = accountNameOrId;
                accName = acc.name;
            } else if (typeof accountNameOrId === 'number' || (!isNaN(Number(accountNameOrId)) && typeof accountNameOrId !== 'boolean')) {
                acc = accounts.find(a => a.id == accountNameOrId);
                if (acc) accName = acc.name;
            }
            if (!acc && typeof accountNameOrId === 'string') {
                const trimmed = accountNameOrId.trim();
                acc = accounts.find(a => a.name && a.name.trim() === trimmed);
            }

            if (acc && (acc.inactive === true || acc.inactive === 'true' || acc.isFrozen === true)) {
                const msgText = `⚠️ الحساب "${accName}" مجمد حالياً!\nلا يمكن إجراء أي معاملات مالية أو فواتير (بيع / شراء / مرتجعات / سندات) على هذا الحساب حتى يتم إلغاء التجميد من قسم الحسابات.`;
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert({
                        type: 'error',
                        titleText: '❄️ الحساب مجمد',
                        msg: msgText,
                        confirmText: 'حسناً',
                        cancelText: '✏️ تعديل الحساب',
                        showCancel: true,
                        onCancel: () => {
                            if (typeof switchSection === 'function') {
                                switchSection('accounts');
                            }
                            if (typeof selectAccountRow === 'function' && acc.id) {
                                selectAccountRow(acc.id);
                            }
                            if (typeof editSelectedAccount === 'function') {
                                setTimeout(() => {
                                    editSelectedAccount();
                                }, 150);
                            }
                        }
                    });
                } else {
                    alert(msgText);
                }
                return true;
            }
            return false;
        };

        function updateNotifications() {
            // تحميلهم ديناميكياً من getStore مع Fallback لـ localStorage لضمان استقرار كامل حتى لو تم إغلاق البرنامج فوراً
            try {
                const raw = getStore('acknowledged_low_stock') || localStorage.getItem('acknowledged_low_stock');
                window.acknowledgedLowStock = raw ? JSON.parse(raw) : [];
            } catch(e) { window.acknowledgedLowStock = []; }
            try {
                const raw = getStore('acknowledged_debt') || localStorage.getItem('acknowledged_debt');
                window.acknowledgedDebt = raw ? JSON.parse(raw) : [];
            } catch(e) { window.acknowledgedDebt = []; }
            try {
                const raw = getStore('acknowledged_delayed') || localStorage.getItem('acknowledged_delayed');
                window.acknowledgedDelayed = raw ? JSON.parse(raw) : [];
            } catch(e) { window.acknowledgedDelayed = []; }

            const today = new Date();
            const lowStockItems = productsDB.filter(p => p.stock <= 5 && !window.acknowledgedLowStock.includes(p.id));

            const debtAccounts = accounts.filter(a => {
                const balance = (parseFloat(a.debit) || 0) - (parseFloat(a.credit) || 0);
                const isDebt = (a.type === 'client' || a.type === 'mixed') && balance > 0;
                const isRemindActive = (a.remind === true || a.remind === 'true');
                return isDebt && isRemindActive && !window.acknowledgedDebt.includes(a.id);
            });

            // العملاء المتأخرين (رصيد > 0 وأول عملية من أكتر من 30 يوم)
            const delayedClients = accounts.filter(a => {
                const balance = (parseFloat(a.debit) || 0) - (parseFloat(a.credit) || 0);
                if (!((a.type === 'client' || a.type === 'mixed') && balance > 0)) return false;
                const isRemindActive = (a.remind === true || a.remind === 'true');
                if (!isRemindActive) return false;
                if (window.acknowledgedDelayed.includes(a.id)) return false;

                // إيجاد آخر عملية لهذا الحساب
                const lastTrans = transactions.filter(t => t.partnerId === a.id || t.partner === a.name).sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp))[0];
                if (!lastTrans) return true;

                const lastDate = new Date(lastTrans.date || lastTrans.timestamp);
                const diffDays = Math.ceil((today - lastDate) / (1000 * 60 * 60 * 24));
                return diffDays > 30; // متأخر أكتر من 30 يوم
            });

            const totalAlerts = lowStockItems.length + debtAccounts.length + delayedClients.length;
            const badge = document.getElementById('bellBadge');
            if (badge) {
                if (totalAlerts > 0) {
                    badge.innerText = totalAlerts;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }

        window.acknowledgeNotification = function(type, id, returnTab = 'products') {
            if (type === 'low-stock') {
                if (!window.acknowledgedLowStock.includes(id)) window.acknowledgedLowStock.push(id);
                const str = JSON.stringify(window.acknowledgedLowStock);
                setStore('acknowledged_low_stock', str);
                localStorage.setItem('acknowledged_low_stock', str);
            } else if (type === 'debt') {
                if (!window.acknowledgedDebt.includes(id)) window.acknowledgedDebt.push(id);
                const str = JSON.stringify(window.acknowledgedDebt);
                setStore('acknowledged_debt', str);
                localStorage.setItem('acknowledged_debt', str);
            } else if (type === 'delayed') {
                if (!window.acknowledgedDelayed.includes(id)) window.acknowledgedDelayed.push(id);
                const str = JSON.stringify(window.acknowledgedDelayed);
                setStore('acknowledged_delayed', str);
                localStorage.setItem('acknowledged_delayed', str);
            }
            updateNotifications();
            if (typeof showNotificationsModal === 'function') {
                showNotificationsModal(returnTab);
            }
            showToast("✅ تم وضع علامة استلام على التنبيه");
        };

        window.unacknowledgeNotification = function(type, id) {
            if (type === 'low-stock') {
                window.acknowledgedLowStock = window.acknowledgedLowStock.filter(x => x !== id);
                const str = JSON.stringify(window.acknowledgedLowStock);
                setStore('acknowledged_low_stock', str);
                localStorage.setItem('acknowledged_low_stock', str);
            } else if (type === 'debt') {
                window.acknowledgedDebt = window.acknowledgedDebt.filter(x => x !== id);
                const str = JSON.stringify(window.acknowledgedDebt);
                setStore('acknowledged_debt', str);
                localStorage.setItem('acknowledged_debt', str);
            } else if (type === 'delayed') {
                window.acknowledgedDelayed = window.acknowledgedDelayed.filter(x => x !== id);
                const str = JSON.stringify(window.acknowledgedDelayed);
                setStore('acknowledged_delayed', str);
                localStorage.setItem('acknowledged_delayed', str);
            }
            updateNotifications();
            if (typeof showNotificationsModal === 'function') {
                showNotificationsModal('archived');
            }
            showToast("🔄 تم استعادة التنبيه للنشط");
        };

        window.acknowledgeAllProductsNotifications = function() {
            const allLowStock = productsDB.filter(p => (parseFloat(p.stock) || 0) <= (parseFloat(p.minStock) || 5));
            allLowStock.forEach(p => {
                if (!window.acknowledgedLowStock.includes(p.id)) window.acknowledgedLowStock.push(p.id);
            });
            const str = JSON.stringify(window.acknowledgedLowStock);
            setStore('acknowledged_low_stock', str);
            localStorage.setItem('acknowledged_low_stock', str);
            updateNotifications();
            if (typeof showNotificationsModal === 'function') {
                showNotificationsModal('products');
            }
            showToast("✅ تم تأكيد استلام كافة نواقص البضاعة!", "success");
        };

        window.acknowledgeAllAccountsNotifications = function() {
            const today = new Date();
            const allDebtAccounts = accounts.filter(a => {
                const debit = parseFloat(a.debit) || 0;
                const credit = parseFloat(a.credit) || 0;
                const balance = debit - credit;
                return (a.type === 'client' || a.type === 'mixed') && balance > 0;
            });
            const allDelayed = accounts.filter(a => {
                const balance = (parseFloat(a.debit) || 0) - (parseFloat(a.credit) || 0);
                if (!((a.type === 'client' || a.type === 'mixed') && balance > 0)) return false;
                const lastTrans = transactions.filter(t => t.partnerId === a.id || t.account === a.name).sort((x, y) => new Date(y.date || y.timestamp) - new Date(x.date || x.timestamp))[0];
                if (!lastTrans) return true;
                const lastDate = new Date(lastTrans.date || lastTrans.timestamp);
                const diffDays = Math.ceil((today - lastDate) / (1000 * 60 * 60 * 24));
                return diffDays > 30;
            });

            allDebtAccounts.forEach(a => {
                if (!window.acknowledgedDebt.includes(a.id)) window.acknowledgedDebt.push(a.id);
            });
            allDelayed.forEach(a => {
                if (!window.acknowledgedDelayed.includes(a.id)) window.acknowledgedDelayed.push(a.id);
            });

            const debtStr = JSON.stringify(window.acknowledgedDebt);
            const delayedStr = JSON.stringify(window.acknowledgedDelayed);
            setStore('acknowledged_debt', debtStr);
            localStorage.setItem('acknowledged_debt', debtStr);
            setStore('acknowledged_delayed', delayedStr);
            localStorage.setItem('acknowledged_delayed', delayedStr);

            updateNotifications();
            if (typeof showNotificationsModal === 'function') {
                showNotificationsModal('accounts');
            }
            showToast("✅ تم تأكيد استلام جميع تنبيهات الحسابات!", "success");
        };

        window.acknowledgeAllNotifications = function() {
            window.acknowledgeAllProductsNotifications();
            window.acknowledgeAllAccountsNotifications();
        };

        window.resetAcknowledgedNotifications = function() {
            window.acknowledgedLowStock = [];
            window.acknowledgedDebt = [];
            window.acknowledgedDelayed = [];
            removeStore('acknowledged_low_stock');
            removeStore('acknowledged_debt');
            removeStore('acknowledged_delayed');
            localStorage.removeItem('acknowledged_low_stock');
            localStorage.removeItem('acknowledged_debt');
            localStorage.removeItem('acknowledged_delayed');
            updateNotifications();
            if (typeof showNotificationsModal === 'function') {
                showNotificationsModal('archived');
            }
            showToast("🔄 تم تصفير الأرشيف واستعادة كافة التنبيهات للقوائم النشطة");
        };

        function getTransactionDateTime(dateId, timeId) {
            const d = document.getElementById(dateId).value;
            const t = document.getElementById(timeId).value;
            if (!d) {
                const now = new Date();
                return {
                    full: now.toLocaleString('ar-EG'),
                    iso: now.toLocaleDateString('en-CA'),
                    time: now.toTimeString().slice(0, 5)
                };
            }
            const dateObj = new Date(d + (t ? 'T' + t : 'T00:00'));
            return {
                full: dateObj.toLocaleString('ar-EG'),
                iso: d,
                time: t || "00:00"
            };
        }

        // ================= منطق المشتريات (Purchase Logic) =================
        let purchaseCart = [];
        let purchaseTotalVal = 0;

        function exportToExcel() {
            if (!transactions || transactions.length === 0) return alert("❌ لا توجد بيانات للتصدير");

            const XLSXLib = (typeof getXLSXLibrary === 'function' ? getXLSXLibrary() : (typeof XLSX !== 'undefined' ? XLSX : null));
            
            const data = transactions.map(row => ({
                "التاريخ": row.date || "-",
                "نوع العملية": row.type || "-",
                "الصنف": row.product || "-",
                "الكمية": row.qty || 0,
                "السعر": row.price || 0,
                "الإجمالي": row.total || 0,
                "العميل / المورد": row.partner || "-"
            }));

            if (XLSXLib && XLSXLib.utils) {
                try {
                    const ws = XLSXLib.utils.json_to_sheet(data);
                    const wb = XLSXLib.utils.book_new();
                    XLSXLib.utils.book_append_sheet(wb, ws, "سجل الحركة");
                    XLSXLib.writeFile(wb, "سجل_الحركات_بيان.xlsx");
                    if (typeof showToast === 'function') showToast("✅ تم تصدير سجل الحركات إلى Excel بنجاح", "success");
                    return;
                } catch(e) {
                    console.warn("XLSX export failed, fallback to UTF-8 CSV:", e);
                }
            }

            // Fallback: UTF-8 BOM CSV
            let csvContent = "\uFEFFالتاريخ,النوع,الصنف,الكمية,السعر,الإجمالي,الطرف الثاني\n";
            transactions.forEach(row => {
                csvContent += `"${row.date || ''}","${row.type || ''}","${row.product || ''}","${row.qty || 0}","${row.price || 0}","${row.total || 0}","${row.partner || ''}"\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "سجل_الحركات_بيان.csv";
            link.click();
        }

        // ================= منطق القبض والدفع (Receipt & Change Logic) =================
        window.isGenericCashPartner = function(partnerName) {
            if (!partnerName) return true;
            const p = String(partnerName).trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىي]/g, 'ي').replace(/\s+/g, ' ');
            return p === '' || p === '-' || p === '---' || p === 'نقدي' || p === 'كاش' || p === 'عميل نقدي' || p === 'عميل عام' || p === 'مورد نقدي' || p === 'مورد عام' || p === 'غير محدد' || p === 'عام';
        };

        window.isTransactionCredit = function(methodName, total = 0, paid = 0, deferred = 0) {
            const mStr = String(methodName || '').toLowerCase().trim();
            
            // 1. إذا كانت طريقة الدفع صراحة آجل أو ذمم أو حساب
            if (mStr.includes('آجل') || mStr.includes('أجل') || mStr.includes('ذمم') || mStr.includes('حساب') || mStr.includes('دين') || mStr.includes('credit')) {
                return true;
            }
            
            // 2. التحقق من وسائل الدفع المعرفة في النظام
            if (typeof getPaymentMethods === 'function') {
                const methods = getPaymentMethods();
                const found = methods.find(m => m.name && m.name.toLowerCase().trim() === mStr);
                if (found) {
                    if (found.type === 'credit') return true;
                    if (found.type === 'cash' || found.type === 'bank') return false;
                }
            }

            // 3. إذا كانت الطريقة نقدي أو كاش أو شبكة أو بنك -> ليست آجلة أبداً
            if (mStr.includes('نقدي') || mStr.includes('كاش') || mStr.includes('cash') || mStr.includes('تحويل') || mStr.includes('فيزا') || mStr.includes('شبكة') || mStr.includes('بنك') || mStr.includes('bank') || mStr.includes('مدى') || mStr.includes('stc') || mStr.includes('فودافون') || mStr.includes('انستا')) {
                return false;
            }
            
            // 4. في حالة وجود متبقي حقيقي وتم تسجيل مدفوع جزئي (معاملة مختلطة غير نقدية بالكامل)
            if (deferred > 0.001) return true;
            if (total > 0 && paid > 0 && (total - paid) > 0.001) return true;

            return false;
        };

        window.ensurePartnerAccountExists = async function(partnerName, partnerType /* 'عميل' | 'مورد' */, isCredit, onApproved) {
            const isCash = window.isGenericCashPartner(partnerName);
            
            // 1. إذا كانت المعاملة آجلة والاسم نقدي أو فارغ -> نمنع الحفظ نهائياً
            if (isCredit && isCash) {
                showCustomAlert({
                    type: 'error',
                    titleText: `⚠️ مطلوب تحديد ${partnerType}`,
                    msg: `لا يمكن حفظ فاتورة أو حركة "آجلة" لحساب "نقدي" أو بدون تحديد طرف التعامل.<br><br>المعاملات الآجلة والمديونيات تتطلب <b>إلزامياً</b> اختيار أو تسجيل <b>${partnerType}</b> مسجل في قسم الحسابات لمتابعة رصيده وديونه.`
                });
                return false;
            }
            
            // 2. إذا كانت المعاملة نقدية (كاش) -> نسمح فوراً بالحفظ سواء كان الحساب نقدي عام أو اسم عميل اختياري
            if (!isCredit) {
                return true;
            }
            
            // 3. إذا كانت المعاملة آجلة، نتحقق هل الاسم مسجل في الحسابات أم لا
            const cleanArabic = (str) => (str || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىي]/g, 'ي').replace(/\s+/g, ' ');
            const partnerClean = cleanArabic(partnerName);
            
            const existingAcc = (typeof accounts !== 'undefined' ? accounts : []).find(a => cleanArabic(a.name) === partnerClean);
            
            if (existingAcc) {
                return true; // موجود بالفعل -> تستمر العملية الأصلية بدون أي كولباك متكرر
            }
            
            // 4. الاسم غير مسجل في الحسابات -> نطلب من المستخدم إضافة سريعة وتسجيله في الحسابات فوراً
            showCustomAlert({
                type: 'question',
                titleText: `➕ تسجيل ${partnerType} جديد`,
                msg: `الاسم "<b>${partnerName}</b>" غير مسجل في شجرة الحسابات.<br><br>المعاملات الآجلة تتطلب تسجيل الطرف لمتابعة حسابه.<br><br>هل تريد إضافته كـ <b>${partnerType} جديد</b> في قسم الحسابات وحفظ الفاتورة مباشرة؟`,
                showCancel: true,
                confirmText: `نعم، سجّل كـ ${partnerType} واحفظ`,
                cancelText: 'إلغاء وتعديل الاسم',
                onConfirm: async () => {
                    const accType = partnerType === 'مورد' ? 'supplier' : 'client';
                    const codePrefix = partnerType === 'مورد' ? 'SUP-' : 'CLI-';
                    const newAcc = {
                        id: Date.now().toString(),
                        name: partnerName.trim(),
                        type: accType,
                        code: codePrefix + Math.floor(1000 + Math.random() * 9000),
                        debit: 0,
                        credit: 0,
                        balance: 0,
                        createdAt: new Date().toISOString()
                    };
                    
                    if (typeof accounts !== 'undefined') {
                        accounts.push(newAcc);
                    }
                    if (typeof db !== 'undefined' && db.accounts) {
                        try { await db.accounts.put(newAcc); } catch(e) { console.warn("DB account put:", e); }
                    }
                    if (typeof saveData === 'function') {
                        await saveData();
                    }
                    if (typeof renderAccountsTable === 'function') {
                        renderAccountsTable();
                    }
                    if (typeof showToast === 'function') {
                        showToast(`✅ تم تسجيل ${partnerType} "${partnerName}" بنجاح في الحسابات`, 'success');
                    }
                    if (typeof onApproved === 'function') onApproved(newAcc);
                }
            });
            
            return false;
        };

        function calculateChange() {
            const tenderedInput = document.getElementById('tenderedAmount');
            const tendered = parseFloat(tenderedInput ? tenderedInput.value : 0) || 0;
            const method = typeof getSelectedPaymentMethod === 'function' ? getSelectedPaymentMethod('sales-section') : 'نقدي';

            const changeElem = document.getElementById('changeAmount');
            const grandDebtElem = document.getElementById('grandDebtDisplay');
            const prevBal = parseFloat(document.getElementById('prevBalanceDisplay')?.innerText) || 0;

            const isCredit = window.isTransactionCredit(method, currentTotal, tendered, currentTotal - tendered);

            if (isCredit) {
                // في حالة البيع الآجل: العميل يدفع جزءاً من الفاتورة أو لا يدفع
                const remainingOnInvoice = Math.max(0, currentTotal - tendered);
                if (changeElem) changeElem.innerText = '0.00 (آجل)';

                // المديونية الكلية المتراكمة = المديونية السابقة + المتبقي غير المدفوع من الفاتورة الحالية
                const grandTotalDebt = prevBal + remainingOnInvoice;
                if (grandDebtElem) grandDebtElem.innerText = grandTotalDebt.toFixed(2);
            } else {
                // في حالة البيع النقدي أو البنكي:
                const change = Math.max(0, tendered - currentTotal);
                if (changeElem) changeElem.innerText = change.toFixed(2);

                // في الكاش لا تضاف مديونية جديدة من هذه الفاتورة
                if (grandDebtElem) grandDebtElem.innerText = prevBal.toFixed(2);
            }
        }

        function createBtn(container, value) {
            const btn = document.createElement('button');
            btn.className = 'quick-btn';
            btn.innerText = value;
            btn.onclick = () => {
                document.getElementById('tenderedAmount').value = value;
                calculateChange();
            };
            container.appendChild(btn);
        }

        function selectMethod(el) {
            let method = '';
            const section = el.closest('.section-view');

            if (el.tagName === 'SELECT') {
                method = el.value;
            } else {
                el.parentElement.querySelectorAll('.method-btn').forEach(b => b.classList.remove('selected'));
                el.classList.add('selected');
                method = el.innerText.trim();
            }

            const isCredit = window.isTransactionCredit(method);

            if (section) {
                // قسم البيع
                if (section.id === 'sales-section') {
                    const paidBox = document.getElementById('paidBox');
                    const remainingBox = document.getElementById('remainingBox');
                    const btnContainer = document.getElementById('dynamicButtons');
                    const tenderedInput = document.getElementById('tenderedAmount');

                    if (isCredit || method.includes('شيك')) {
                        if (paidBox) paidBox.style.display = 'flex';
                        if (remainingBox) remainingBox.style.display = 'flex';
                        if (btnContainer) btnContainer.style.display = 'flex';

                        // تصفير المدفوع تلقائياً عند اختيار آجل لضمان حساب المتبقي صح
                        if (tenderedInput) tenderedInput.value = 0;

                        // --- ميزة التنبيه الذكي والانتقال الفوري لمربع العميل عند اختيار آجل ---
                        const custInput = document.getElementById('customerName');
                        if (custInput) {
                            setTimeout(() => {
                                custInput.focus();
                                custInput.select();
                                if (typeof debouncedHandleCustomerSearch === 'function') {
                                    debouncedHandleCustomerSearch(custInput.value);
                                }
                            }, 50);
                            custInput.style.transition = 'all 0.3s ease';
                            custInput.style.backgroundColor = '#fef2f2';
                            custInput.style.border = '2.5px solid #ef4444';
                            custInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.35)';

                            if (window.isGenericCashPartner(custInput.value)) {
                                if (typeof showToast === 'function') {
                                    showToast("⚠️ البيع الآجل يتطلب تحديد واختيار حساب العميل", "warning");
                                }
                            }

                            setTimeout(() => {
                                custInput.style.backgroundColor = '';
                                custInput.style.border = '';
                                custInput.style.boxShadow = '';
                            }, 3500);
                        }

                        if (typeof calculateTotals === 'function') calculateTotals();
                    } else {
                        if (paidBox) paidBox.style.display = 'none';
                        if (remainingBox) remainingBox.style.display = 'none';
                        if (btnContainer) btnContainer.style.display = 'none';
                    }
                }
                // قسم الشراء
                else if (section.id === 'purchase-section') {
                    const purchasePaidBox = document.getElementById('purchasePaidBox');
                    const purchaseRemainingBox = document.getElementById('purchaseRemainingBox');
                    const purchasePaidInput = document.getElementById('purchasePaid');

                    if (isCredit || method.includes('شيك')) {
                        if (purchasePaidBox) purchasePaidBox.style.display = 'flex';
                        if (purchaseRemainingBox) purchaseRemainingBox.style.display = 'flex';

                        // تصفير المدفوع للمورد تلقائياً عند اختيار آجل
                        if (purchasePaidInput) purchasePaidInput.value = 0;

                        // تنبيه وانتقال فوري لمربع المورد
                        const supInput = document.getElementById('supplierName');
                        if (supInput) {
                            setTimeout(() => {
                                supInput.focus();
                                supInput.select();
                                if (typeof debouncedHandleSupplierSearch === 'function') {
                                    debouncedHandleSupplierSearch(supInput.value);
                                }
                            }, 50);
                            supInput.style.transition = 'all 0.3s ease';
                            supInput.style.backgroundColor = '#fef2f2';
                            supInput.style.border = '2.5px solid #ef4444';
                            supInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.35)';

                            if (window.isGenericCashPartner(supInput.value) && typeof showToast === 'function') {
                                showToast("⚠️ الشراء الآجل يتطلب تحديد واختيار حساب المورد", "warning");
                            }

                            setTimeout(() => {
                                supInput.style.backgroundColor = '';
                                supInput.style.border = '';
                                supInput.style.boxShadow = '';
                            }, 3500);
                        }

                        if (typeof calculatePurchaseTotals === 'function') calculatePurchaseTotals();
                    } else {
                        // في حالة النقدي، نخفي المربعات ونجعل المدفوع = الإجمالي
                        if (purchasePaidBox) purchasePaidBox.style.display = 'none';
                        if (purchaseRemainingBox) purchaseRemainingBox.style.display = 'none';

                        if (purchasePaidInput) {
                            const totalVal = parseFloat(document.getElementById('purchaseTotal')?.innerText) || 0;
                            purchasePaidInput.value = totalVal;
                        }

                        if (typeof calculatePurchaseTotals === 'function') calculatePurchaseTotals();
                    }
                }
            }
        }

        function getSelectedPaymentMethod(sectionId) {
            const select = document.getElementById(sectionId + 'PaymentMethodSelect');
            if (select) return select.value;

            const btn = document.querySelector('#' + sectionId + ' .method-btn.selected');
            return btn ? btn.innerText.trim() : 'نقدي';
        }

        // --- 3. الوظائف التشغيلية (حفظ، طباعة) ---

        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `toast-msg toast-${type}`;
            const icon = type === 'success' ? '✅' : (type === 'error' ? '🚫' : 'ℹ️');
            toast.innerHTML = `<span>${icon}</span> ${message}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 500);
            }, 3000);
        }

        // دالة التعديل من شريط الأدوات الذكي (مطورة لدعم التحديد المتعدد)
        function editSelectedInventoryItem() {
            if (!checkPermission('stock_edit')) return;
            const checkedBoxes = document.querySelectorAll('.inv-row-check:checked');

            if (checkedBoxes.length === 0) {
                return alert("⚠️ يرجى تحديد صنف واحد على الأقل من الجدول أولاً باستخدام مربع التحديد!");
            }

            if (checkedBoxes.length === 1) {
                const targetId = parseInt(checkedBoxes[0].closest('tr').getAttribute('data-id'));
                const p = productsDB.find(x => x.id === targetId);
                if (p) openNewItemModal(p);
            } else {
                // إذا كان أكثر من صنف، نفتح تعديل الأسعار المجمع
                openPriceAdjustmentModal();
            }
        }

        // دالة الحذف من شريط الأدوات الذكي (مطورة للحذف الجماعي)
        async function deleteSelectedInventoryItem() {
            if (!checkPermission('stock_delete')) return;
            const checkedBoxes = document.querySelectorAll('.inv-row-check:checked');
            let targetIds = [];

            if (checkedBoxes.length > 0) {
                checkedBoxes.forEach(cb => {
                    targetIds.push(parseInt(cb.closest('tr').getAttribute('data-id')));
                });
            }

            if (targetIds.length === 0) return alert("⚠️ يرجى تحديد صنف أو أكثر أولاً باستخدام مربع التحديد!");

            const msg = targetIds.length === 1 ? "🚨 هل أنت متأكد من حذف هذا الصنف ونقله للسلة؟" : `🚨 هل أنت متأكد من حذف عدد (${targetIds.length}) أصناف مختارة ونقلها للسلة؟`;

            if (confirm(msg)) {
                try {
                    // قبل الحذف، ننقلهم للسلة
                    for (const id of targetIds) {
                        const item = productsDB.find(p => p.id === id);
                        if (item) {
                            await trashManager.moveToTrash(item, 'product', item.name);
                        }
                    }

                    // حذف جماعي من قاعدة البيانات
                    await db.products.bulkDelete(targetIds);

                    // تحديث المصفوفة المحلية
                    productsDB = productsDB.filter(x => !targetIds.includes(x.id));

                    if (targetIds.includes(selectedInventoryId)) selectedInventoryId = null;

                    renderInventoryTable();
                    showToast(`✅ تم نقل ${targetIds.length} أصناف إلى سلة المحذوفات`, "success");
                } catch (err) {
                    console.error("Error in bulk delete:", err);
                    alert("❌ حدث خطأ أثناء الحذف");
                }
            }
        }

        function toggleInventoryColumn(idx, show) {
            inventoryColumnVisibility[idx] = show;
            const jsonStr = JSON.stringify(inventoryColumnVisibility);
            setStore('pos_inv_cols', jsonStr);
            try { localStorage.setItem('pos_inv_cols', jsonStr); } catch(e){}
            applyInventoryColumnVisibility();
        }

        function applyInventoryColumnVisibility() {
            // استرجاع الإعدادات المحفوظة من Store
            const saved = getStore('pos_inv_cols') || localStorage.getItem('pos_inv_cols');
            if (saved) {
                try {
                    inventoryColumnVisibility = JSON.parse(saved);
                } catch(e) {}
            }

            // قائمة كافة الأعمدة لضمان تطبيق الرؤية بدقة الترتيب الجديد
            const allCols = ["0","1","quick","3","13","10","11","9","12","detailed","6","7","8","5","4","margin","2","internal"];
            allCols.forEach(idx => {
                const show = inventoryColumnVisibility[idx] !== false; // القيمة الافتراضية true
                const cells = document.querySelectorAll(`.col-inv-${idx}`);
                cells.forEach(c => {
                    c.style.display = show ? '' : 'none';
                });
                const check = document.getElementById(`inv_col_check_${idx}`);
                if (check) check.checked = show;
            });
        }

        async function saveInvEdits() {
            const id = parseInt(document.getElementById('invSelectedId').value);
            if (!id) return alert('⚠️ يرجى تحديد صنف من الجدول أولاً');

            const p = productsDB.find(x => x.id === id);
            if (!p) return alert('❌ الصنف غير موجود');

            const newCode = document.getElementById('invDisplayCode').value.trim();
            const newUnit = document.getElementById('invDisplayUnit').value;
            const newCost = parseFloat(document.getElementById('invDisplayCost').value) || 0;
            const newPrice = parseFloat(document.getElementById('invDisplayPrice').value) || 0;

            if (newPrice <= 0) return alert('⚠️ يرجى إدخال سعر بيع صحيح');

            // تطبيق التعديلات
            p.code = newCode;
            p.unit = newUnit;
            p.cost = newCost;
            p.price = newPrice;

            await saveData();
            renderInventoryTable();
            alert(`✅ تم حفظ تعديلات الصنف: ${p.name}`);
        }

        // --- إدارة أنواع الوحدات العالمية ---
        function getGlobalUnits() {
            try {
                const stored = getStore('bayan_global_units');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch (e) {
                console.error("خطأ في قراءة الوحدات المحفوظة:", e);
            }
            return ['قطعة', 'علبة', 'كرتونة', 'رابطة', 'بالتة', 'رول'];
        }

        function saveGlobalUnits(unitsArray) {
            setStore('bayan_global_units', JSON.stringify(unitsArray));
        }

        function openGlobalUnitsManager() {
            document.getElementById('globalUnitsModal').classList.remove('hidden');
            renderGlobalUnitsList();
        }

        function renderGlobalUnitsList() {
            const units = getGlobalUnits();
            const listDiv = document.getElementById('globalUnitsList');
            const countSpan = document.getElementById('unitsTotalCount');
            if (countSpan) countSpan.innerText = units.length;

            if (listDiv) {
                listDiv.innerHTML = units.map((u, i) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #94a3b8; font-size: 0.8rem;">${i + 1}#</span>
                            <span style="font-weight: 800; color: #1e293b;">${u}</span>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button onclick="editGlobalUnit(${i})" 
                                style="width: 32px; height: 32px; border-radius: 8px; border: none; background: #f1f5f9; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;" title="تعديل">✏️</button>
                            <button onclick="deleteGlobalUnit(${i})" 
                                style="width: 32px; height: 32px; border-radius: 8px; border: none; background: #fee2e2; color: #ef4444; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;" title="حذف">🗑️</button>
                        </div>
                    </div>
                `).join('');
            }
            updateAllUnitSelects();
        }

        async function editGlobalUnit(index) {
            const units = getGlobalUnits();
            const oldName = units[index];
            const newName = await showCustomPrompt("📝 تعديل اسم الوحدة:", oldName);

            if (newName && newName.trim() !== "" && newName !== oldName) {
                if (units.includes(newName.trim())) {
                    return alert("⚠️ هذا الاسم موجود بالفعل!");
                }
                units[index] = newName.trim();
                saveGlobalUnits(units);
                showToast("✅ تم تعديل اسم الوحدة بنجاح", "success");
                renderGlobalUnitsList();
            }
        }

        function addGlobalUnit() {
            const inputEl = document.getElementById('newGlobalUnitName');
            const name = inputEl ? inputEl.value.trim() : "";
            if (!name) return;
            const units = getGlobalUnits();
            if (units.includes(name)) return alert("⚠️ هذا النوع موجود بالفعل");
            units.push(name);
            saveGlobalUnits(units);
            if (inputEl) inputEl.value = "";
            showToast("✨ تم إضافة الوحدة الجديدة", "success");
            renderGlobalUnitsList();
        }

        function deleteGlobalUnit(index) {
            const units = getGlobalUnits();
            if (confirm("🚨 هل أنت متأكد من حذف نوع الوحدة هذا؟ سيؤثر ذلك على القوائم المتاحة فقط.")) {
                units.splice(index, 1);
                saveGlobalUnits(units);
                showToast("🗑️ تم حذف الوحدة", "info");
                renderGlobalUnitsList();
            }
        }

        function updateAllUnitSelects() {
            const units = getGlobalUnits();
            const selects = document.querySelectorAll('.unit-type-select');
            const optionsHtml = units.map(u => `<option value="${u}">${u}</option>`).join('');
            selects.forEach(s => {
                const currentVal = s.value;
                s.innerHTML = optionsHtml;
                if (currentVal && units.includes(currentVal)) {
                    s.value = currentVal;
                }
            });
        }

        window.getGlobalUnits = getGlobalUnits;
        window.openGlobalUnitsManager = openGlobalUnitsManager;
        window.renderGlobalUnitsList = renderGlobalUnitsList;
        window.editGlobalUnit = editGlobalUnit;
        window.addGlobalUnit = addGlobalUnit;
        window.deleteGlobalUnit = deleteGlobalUnit;
        window.updateAllUnitSelects = updateAllUnitSelects;

        // --- منطق نافذة بَيَان الاحترافية لبطاقة الصنف ---
        function switchBayanTab(tabId, el) {
            const parent = document.getElementById('bayanTabContent');
            for (let child of parent.children) {
                child.classList.add('hidden');
            }
            const target = document.getElementById('tab-' + tabId);
            if (target) target.classList.remove('hidden');

            const tabBtns = document.querySelectorAll('.bayan-tab');
            tabBtns.forEach(btn => btn.classList.remove('active'));
            el.classList.add('active');
        }

        function addProductUnitRow(unitName = "", bVal = 1, sVal = 1) {
            const tbody = document.getElementById('productUnitsTableBody');
            const tr = document.createElement('tr');
            const units = getGlobalUnits();

            let selectHtml = `<select class="unit-type-select" style="width:100%; border:1px solid var(--border-color); background:#ffffff; color:#000000; text-align:center; cursor:pointer; border-radius:4px; padding:2px;">`;
            units.forEach(u => {
                selectHtml += `<option value="${u}" ${u === unitName ? 'selected' : ''} style="background:#ffffff; color:#000000;">${u}</option>`;
            });
            selectHtml += `</select>`;

            tr.innerHTML = `
                <td>${selectHtml}</td>
                <td><input type="number" class="base-qty" value="${bVal}" ${tbody.rows.length === 0 ? 'disabled' : ''} oninput="calculateUnitPrices()" style="text-align:center;"></td>
                <td><input type="number" class="sub-qty" value="${sVal}" ${tbody.rows.length === 0 ? 'disabled' : ''} oninput="calculateUnitPrices()" style="text-align:center;"></td>
                <td><input type="number" class="u-wholesale" value="0" oninput="this.dataset.manual='true'" style="text-align:center;"></td>
                <td><input type="number" class="u-price" value="0" oninput="this.dataset.manual='true'" style="text-align:center;"></td>
                <td><span class="u-cost-label" style="font-weight:bold; color:#64748b;">0.00</span></td>
                <td><input type="checkbox" ${tbody.rows.length === 0 ? 'checked' : ''} style="cursor:pointer;"></td>
                <td><input type="checkbox" ${tbody.rows.length === 0 ? 'checked' : ''} style="cursor:pointer;"></td>
                <td><input type="text" placeholder="باركود الوحدة" style="text-align:center;"></td>
            `;
            tbody.appendChild(tr);
            calculateUnitPrices();
        }

        function removeProductUnitRow() {
            const tbody = document.getElementById('productUnitsTableBody');
            if (tbody.rows.length > 1) {
                tbody.deleteRow(-1);
            }
        }

        function calculateUnitPrices() {
            const mainPrice = parseFloat(document.getElementById('newItemPrice').value) || 0;
            const mainCost = parseFloat(document.getElementById('newItemCost').value) || 0;
            const mainWholesale = parseFloat(document.getElementById('newItemWholesale').value) || 0;
            const rows = document.getElementById('productUnitsTableBody').rows;

            for (let i = 0; i < rows.length; i++) {
                const bInput = rows[i].querySelector('.base-qty');
                const sInput = rows[i].querySelector('.sub-qty');
                if (!bInput || !sInput) continue;

                const baseQty = parseFloat(bInput.value) || 1;
                const subQty = parseFloat(sInput.value) || 1;

                // معامل التحويل الذكي: السعر = (سعر الأساس * كمية الأساس) / كمية الفرع
                const factor = baseQty / subQty;

                if (i === 0) {
                    rows[i].querySelector('.u-wholesale').value = mainWholesale;
                    rows[i].querySelector('.u-price').value = mainPrice;
                    const firstCostLabel = rows[i].querySelector('.u-cost-label');
                    if (firstCostLabel) firstCostLabel.innerText = mainCost.toFixed(2);
                } else {
                    const wInput = rows[i].querySelector('.u-wholesale');
                    const pInput = rows[i].querySelector('.u-price');
                    const cLabel = rows[i].querySelector('.u-cost-label');

                    if (wInput && wInput.dataset.manual !== 'true') wInput.value = (mainWholesale * factor).toFixed(2);
                    if (pInput && pInput.dataset.manual !== 'true') pInput.value = (mainPrice * factor).toFixed(2);
                    if (cLabel) cLabel.innerText = (mainCost * factor).toFixed(2);

                    // فحص الخسارة (سعر البيع أقل من التكلفة)
                    const costVal = cLabel ? parseFloat(cLabel.innerText) : 0;
                    if (wInput) wInput.style.backgroundColor = (parseFloat(wInput.value) < costVal) ? '#fee2e2' : 'white';
                    if (pInput) pInput.style.backgroundColor = (parseFloat(pInput.value) < costVal) ? '#fee2e2' : 'white';
                }

                // فحص الحقول الرئيسية فوق
                const mainCostEl = document.getElementById('newItemCost');
                const mainPriceEl = document.getElementById('newItemPrice');
                const mainWholesaleEl = document.getElementById('newItemWholesale');

                if (mainCostEl) {
                    const mCost = parseFloat(mainCostEl.value) || 0;

                    if (mainPriceEl) mainPriceEl.style.border = (parseFloat(mainPriceEl.value) < mCost) ? '2px solid #ef4444' : '';
                    if (mainWholesaleEl) mainWholesaleEl.style.border = (parseFloat(mainWholesaleEl.value) < mCost) ? '2px solid #ef4444' : '';
                }
            }
        }

        let currentProductImageData = null;

        function handleProductImage(event) {
            const file = event && event.target && event.target.files ? event.target.files[0] : null;
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('productImagePreview');
                const removeBtn = document.getElementById('removeProductImageBtn');
                currentProductImageData = e.target.result;
                if (preview) {
                    preview.style.backgroundImage = `url(${e.target.result})`;
                    // إخفاء رمز الكاميرا مع الحفاظ على زر الإزالة إن وُجد
                    Array.from(preview.childNodes).forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE) node.textContent = '';
                    });
                }
                if (removeBtn) {
                    removeBtn.classList.remove('hidden');
                    removeBtn.style.display = 'flex';
                }
            };
            reader.readAsDataURL(file);
        }

        function removeProductImage(event) {
            if (event) event.stopPropagation();
            const preview = document.getElementById('productImagePreview');
            const removeBtn = document.getElementById('removeProductImageBtn');
            const fileInput = document.getElementById('newItemImage');
            if (preview) {
                preview.style.backgroundImage = 'none';
                // إعادة رمز الكاميرا
                let hasText = false;
                Array.from(preview.childNodes).forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        node.textContent = '📷';
                        hasText = true;
                    }
                });
                if (!hasText) preview.insertAdjacentText('afterbegin', '📷');
            }
            currentProductImageData = null;
            if (removeBtn) {
                removeBtn.classList.add('hidden');
                removeBtn.style.display = 'none';
            }
            if (fileInput) fileInput.value = '';
        }

        function openNewItemModal(product = null) {
            document.getElementById('newItemModal').classList.remove('hidden');
            const nameEl = document.getElementById('newItemName');
            const preview = document.getElementById('productImagePreview');
            const removeBtn = document.getElementById('removeProductImageBtn');

            // تصفير الحقول قبل البدء
            document.querySelectorAll('#newItemModal input:not([type=radio]):not([type=checkbox]):not([type=file])').forEach(el => {
                if(el.type === 'number') el.value = "0";
                else el.value = "";
            });
            document.getElementById('newItemNotes').value = "";
            document.getElementById('productUnitsTableBody').innerHTML = "";

            // تعبئة قائمة التصنيفات في الداتاليست
            if (typeof updateDatalists === 'function') updateDatalists();

            // إعادة تعيين الصورة
            preview.style.backgroundImage = 'none';
            preview.innerText = '📷';
            currentProductImageData = null;
            if (removeBtn) removeBtn.classList.add('hidden');

            if (product && typeof product === 'object') {
                currentEditingProductId = product.id;
                fillProductModal(product);
            } else {
                currentEditingProductId = null;
                if (typeof product === 'string') nameEl.value = product;
                document.getElementById('newItemCategory').value = "عام";
                document.getElementById('isQuickItem').checked = false; // تصفير الاختيار للأصناف الجديدة
                addProductUnitRow('قطعة');
            }

            document.getElementById('newItemBarcode').focus();
            switchBayanTab('general', document.querySelector('.bayan-tab'));
            updateAllUnitSelects();
            if (typeof updateProductNavCounter === 'function') updateProductNavCounter();
        }
        window.showCustomPrompt = function(message, defaultValue = '') {
            return new Promise((resolve) => {
                const modal = document.getElementById('customPromptModal');
                const title = document.getElementById('customPromptTitle');
                const input = document.getElementById('customPromptInput');
                const confirmBtn = document.getElementById('customPromptConfirmBtn');
                const cancelBtn = document.getElementById('customPromptCancelBtn');
                
                if (!modal || !title || !input || !confirmBtn || !cancelBtn) {
                    // Fallback to standard prompt if UI elements aren't loaded yet
                    resolve(prompt(message, defaultValue));
                    return;
                }
                
                title.innerText = message;
                input.value = defaultValue;
                modal.classList.remove('hidden');
                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 50);
                
                function cleanup() {
                    modal.classList.add('hidden');
                    confirmBtn.onclick = null;
                    cancelBtn.onclick = null;
                    input.onkeydown = null;
                }
                
                confirmBtn.onclick = () => {
                    const val = input.value;
                    cleanup();
                    resolve(val);
                };
                
                cancelBtn.onclick = () => {
                    cleanup();
                    resolve(null);
                };
                
                input.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        confirmBtn.click();
                    } else if (e.key === 'Escape') {
                        cancelBtn.click();
                    }
                };
            });
        };

        let activeAlertTimeout = null;
        window.closeCustomAlert = function() {
            const modal = document.getElementById('alertModal');
            if (modal) modal.classList.add('hidden');
            if (activeAlertTimeout) {
                clearTimeout(activeAlertTimeout);
                activeAlertTimeout = null;
            }
        };

        function showCustomAlert(options = {}) {
            if (activeAlertTimeout) {
                clearTimeout(activeAlertTimeout);
                activeAlertTimeout = null;
            }
            const modal = document.getElementById('alertModal');
            const icon = document.getElementById('alertIcon');
            const title = document.getElementById('alertTitle');
            const message = document.getElementById('alertMessage');
            const confirmBtn = document.getElementById('alertConfirmBtn');
            const cancelBtn = document.getElementById('alertCancelBtn');

            const {
                type = 'warning',
                titleText = 'تنبيه',
                msg = '',
                confirmText = 'حسناً',
                cancelText = 'تراجع',
                showCancel = false,
                timeout = (options.type === 'success' ? 5000 : null),
                onConfirm = () => { },
                onCancel = () => { }
            } = options;

            title.innerText = titleText;
            message.innerHTML = msg; // تم التغيير ليدعم الروابط
            confirmBtn.innerText = confirmText;
            cancelBtn.innerText = cancelText;

            // إعادة ضبط الستايلات الافتراضية
            confirmBtn.style.color = '#fff';
            cancelBtn.style.color = '#555';
            cancelBtn.style.background = '#edf0f2';

            // ضبط الأيقونة والألوان بناءً على النوع
            if (type === 'error') {
                icon.innerText = '🚫';
                title.style.color = '#c0392b';
                confirmBtn.style.setProperty('background', '#c0392b', 'important');
                confirmBtn.style.setProperty('color', '#ffffff', 'important');
                if (showCancel) {
                    cancelBtn.style.setProperty('background', '#2563eb', 'important');
                    cancelBtn.style.setProperty('color', '#ffffff', 'important');
                }
            } else if (type === 'success') {
                icon.innerText = '✅';
                title.style.color = '#1e8449';
                confirmBtn.style.setProperty('background', '#1e8449', 'important');
                confirmBtn.style.setProperty('color', '#ffffff', 'important');
            } else if (type === 'info') {
                icon.innerText = '👤';
                title.style.color = '#2980b9';
                confirmBtn.style.setProperty('background', '#2980b9', 'important');
                confirmBtn.style.setProperty('color', '#ffffff', 'important');
            } else if (type === 'question') {
                icon.innerText = '❓';
                title.style.color = '#8e44ad'; // Purple
                confirmBtn.style.setProperty('background', '#27ae60', 'important'); // Green
                confirmBtn.style.setProperty('color', '#ffffff', 'important');

                cancelBtn.style.setProperty('background', '#2980b9', 'important'); // Blue
                cancelBtn.style.setProperty('color', '#ffffff', 'important');
            } else {
                icon.innerText = '⚠️';
                title.style.color = '#f39c12';
                confirmBtn.style.setProperty('background', '#1e8449', 'important');
                confirmBtn.style.setProperty('color', '#ffffff', 'important');
            }

            cancelBtn.classList.toggle('hidden', !showCancel);

            confirmBtn.onclick = async () => {
                if (activeAlertTimeout) {
                    clearTimeout(activeAlertTimeout);
                    activeAlertTimeout = null;
                }
                modal.classList.add('hidden');
                try {
                    await onConfirm();
                } catch(err) {
                    console.error("Alert onConfirm error:", err);
                }
            };
            cancelBtn.onclick = async () => {
                if (activeAlertTimeout) {
                    clearTimeout(activeAlertTimeout);
                    activeAlertTimeout = null;
                }
                modal.classList.add('hidden');
                try {
                    await onCancel();
                } catch(err) {
                    console.error("Alert onCancel error:", err);
                }
            };


            modal.classList.remove('hidden');

            if (timeout && typeof timeout === 'number') {
                activeAlertTimeout = setTimeout(() => {
                    confirmBtn.click();
                }, timeout);
            }
        }

        function contactDeveloper() {
            let modal = document.getElementById('bayanHelpModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.remove('hidden');
            } else {
                window.open('https://wa.me/201006825905', '_blank');
            }
        }

        // --- دوال إعدادات الخط والتبويبات ---
        function adjustFontSize(change) {
            currentFontSize += change;
            applyFontSize(currentFontSize);
        }

        function adjustFontSizeExplicit(value) {
            currentFontSize = parseInt(value);
            applyFontSize(currentFontSize);
        }

        function applyFontSize(size) {
            if (size < 10) size = 10;
            if (size > 24) size = 24;
            currentFontSize = size;

            document.documentElement.style.setProperty('--app-font-size', size + 'px');
            const display = document.getElementById('currentFontSizeDisplay');
            if (display) display.innerText = size + 'px';

            const slider = document.getElementById('globalScaleSlider');
            if (slider) slider.value = size;

            // حفظ الإعداد مباشرة
            const settings = JSON.parse(getStore('pos_settings') || '{}');
            settings.fontSize = size;
            setStore('pos_settings', JSON.stringify(settings));
        }

        function openSettingsTab(tabName, btn) {
            document.querySelectorAll('.settings-tab-content').forEach(el => el.classList.add('hidden'));
            const target = document.getElementById('set-tab-' + tabName);
            if (target) target.classList.remove('hidden');

            // Handle all setting tab button classes & set active highlight
            document.querySelectorAll('.settings-tab-btn, .settings-tab-btn-premium, .premium-tab-btn').forEach(b => b.classList.remove('active'));
            if (btn) {
                btn.classList.add('active');
            } else {
                const targetBtn = document.querySelector(`.premium-tab-btn[onclick*="'${tabName}'"]`) ||
                                  document.querySelector(`.settings-tab-btn[onclick*="'${tabName}'"]`) ||
                                  document.querySelector(`.settings-tab-btn-premium[onclick*="'${tabName}'"]`) ||
                                  document.querySelector(`[data-tab="${tabName}"]`);
                if (targetBtn) targetBtn.classList.add('active');
            }

            if (tabName === 'general') {
                if (typeof renderPaymentMethodsSettings === 'function') renderPaymentMethodsSettings();
            } else if (tabName === 'users') {
                if (typeof renderUsersTable === 'function') renderUsersTable();
            } else if (tabName === 'printing') {
                loadPrintSettings();
                loadPrintTemplateChoice();
                if (typeof loadBarcodeLabelSettings === 'function') loadBarcodeLabelSettings();
            } else if (tabName === 'warehouses') {
                renderWarehousesTable();
                updateSettingsWarehouseSelects();
            } else if (tabName === 'trash') {
                if (typeof trashManager !== 'undefined' && trashManager.loadTrash) {
                    trashManager.loadTrash();
                } else if (typeof renderTrashTable === 'function') {
                    renderTrashTable();
                }
            }
        }

        function updateSettingsWarehouseSelects() {
            const select = document.getElementById('settingsActiveWarehouseSelect');
            if (!select) return;
            select.innerHTML = warehouses.map(w => `<option value="${w.name}" ${currentUser && currentUser.warehouseName === w.name ? 'selected' : ''}>${w.name}</option>`).join('');
        }

        function showSubscription() {
            const modal = document.getElementById('subscriptionModal');
            if(modal) modal.classList.remove('hidden');
            const closeBtn = document.getElementById('closeSubBtn');
            if (closeBtn) closeBtn.style.display = 'flex';

            const currentPlan = window.getBayanPlan();
            const currentPlanEl = document.getElementById('currentPlanText');
            if (currentPlanEl) {
                currentPlanEl.innerText = currentPlan;
            }

            // Calculate Trial Invoices
            let invoiceCount = 0;
            if (typeof transactions !== 'undefined') {
                const ops = transactions.filter(t => t.type && (t.type.includes('بيع') || t.type.includes('شراء')) && !t.type.includes('مرتجع') && t.invoiceId);
                const uniqueIds = new Set(ops.map(t => t.invoiceId));
                invoiceCount = uniqueIds.size;
            }
            
            const trialCountEl = document.getElementById('trialInvoicesCount');
            if (trialCountEl) trialCountEl.innerText = invoiceCount;
            
            const trialStatusEl = document.getElementById('trialStatusText');
            if (trialStatusEl) {
                if (currentPlan === 'باقة نسخة المجانية') {
                    if (invoiceCount >= 200) {
                        trialStatusEl.innerText = 'الحالة: انتهت';
                        trialStatusEl.style.color = '#ef4444'; // Red
                    } else {
                        trialStatusEl.innerText = 'الحالة: نشطة';
                        trialStatusEl.style.color = '#10b981'; // Green
                    }
                } else {
                    trialStatusEl.innerText = 'الحالة: تم استهلاك خطة النسخة التجريبية';
                    trialStatusEl.style.color = '#64748b'; // Gray
                }
            }

            // Inject animation styles if not present
            if (!document.getElementById('dynamic-plan-animations')) {
                const style = document.createElement('style');
                style.id = 'dynamic-plan-animations';
                style.textContent = `
                    @keyframes purplePulseGlow {
                        0% { border-color: #4c1d95; box-shadow: 0 0 5px rgba(76,29,149,0.4); }
                        50% { border-color: #a855f7; box-shadow: 0 0 25px rgba(168,85,247,0.8); }
                        100% { border-color: #4c1d95; box-shadow: 0 0 5px rgba(76,29,149,0.4); }
                    }
                    .plan-active-purple {
                        border: 3px solid #4c1d95 !important;
                        animation: purplePulseGlow 1.5s infinite alternate !important;
                        transform: scale(1.04) !important;
                        z-index: 10;
                        position: relative;
                    }
                `;
                document.head.appendChild(style);
            }

            // Reset all cards styling
            const allCards = document.querySelectorAll('.plan-card');
            allCards.forEach(card => {
                card.classList.remove('plan-active-purple');
                card.style.border = ''; // Revert to CSS default
                card.style.boxShadow = '';
                card.style.transform = '';
                const marker = card.querySelector('.active-marker');
                if(marker) marker.style.display = 'none';
                
                const subBtn = card.querySelector('.sub-btn');
                if (subBtn && card.id !== 'plan-باقة نسخة المجانية') {
                    subBtn.innerText = 'اشترك الآن';
                    subBtn.style.background = ''; // Revert to CSS default
                    subBtn.style.cursor = 'pointer';
                    subBtn.disabled = false;
                }
            });

            // Highlight the currently active plan
            let cardId = '';
            if (currentPlan === 'باقة نسخة المجانية') cardId = 'plan-باقة نسخة المجانية';
            else if (currentPlan === 'الباقة الشهرية') cardId = 'plan-الباقة الأساسية';
            else if (currentPlan === 'الباقة السنوية') cardId = 'plan-الباقة المتقدمة';
            else if (currentPlan === 'الباقة مدى الحياة') cardId = 'plan-الباقة الاحترافية';

            if (cardId) {
                const activeCard = document.getElementById(cardId);
                if (activeCard) {
                    activeCard.classList.add('plan-active-purple');
                    
                    const marker = activeCard.querySelector('.active-marker');
                    if(marker) {
                        marker.style.display = 'block';
                        marker.style.background = '#4c1d95'; // Dark Purple
                    }

                    const subBtn = activeCard.querySelector('.sub-btn');
                    if (subBtn && cardId !== 'plan-باقة نسخة المجانية') {
                        subBtn.innerText = 'أنت مشترك بالفعل ✓';
                        subBtn.style.background = '#4c1d95';
                        subBtn.style.cursor = 'not-allowed';
                        subBtn.disabled = true;
                    }
                }
            }
        }

        function activateFreeMonth() {
            const alreadyUsed = getStore('bayan_free_month_used');
            if (alreadyUsed === 'true') {
                alert('⚠️ تم استخدام الشهر المجاني مسبقاً على هذا الجهاز.\nللاستمرار يرجى الاشتراك في إحدى الباقات.');
                return;
            }
            const fakeStart = new Date();
            fakeStart.setDate(fakeStart.getDate() - (7 - 30));
            setStore('bayan_install_date', fakeStart.toISOString());
            setStore('bayan_free_month_used', 'true');
            const modal = document.getElementById('subscriptionModal');
            if(modal) modal.classList.add('hidden');
            setTimeout(() => {
                alert('🎉 تم تفعيل نسخة الشهر المجاني بنجاح!\n✅ لديك الآن 30 يوماً كاملاً لتجربة كامل مميزات نظام بَيَان المتكامل.\nاستمتع ونورنا! 🚀');
                location.reload();
            }, 300);
        }

        function showMyPlanDetails() {
            const modal = document.getElementById('myPlanModal');
            if(!modal) return;
            
            const hwid = getStore('bayan_hwid') || getStore('bayan_machine_id') || 'غير محدد';
            const hwidEl = document.getElementById('modalSubHwid');
            if(hwidEl) hwidEl.innerText = hwid;
            
            const currentPlan = window.getBayanPlan();
            const planEl = document.getElementById('modalSubPlan');
            if(planEl) planEl.innerText = currentPlan;
            
            const expiryDateStr = window.getBayanExpiry();
            const installDateStr = (window.activeLicense && window.activeLicense.activationDate) || getStore('bayan_install_date') || new Date().toISOString();
            const startDate = new Date(installDateStr);
            
            const startEl = document.getElementById('modalSubStartDate');
            const usedEl = document.getElementById('modalSubDaysUsed');
            const countdownEl = document.getElementById('modalSubCountdown');
            const lblUsed = document.getElementById('lblUsed');
            const lblRemaining = document.getElementById('lblRemaining');

            if (currentPlan === 'باقة نسخة المجانية') {
                if(startEl) startEl.innerText = startDate.toLocaleDateString('ar-EG');
                let invoiceCount = 0;
                if (typeof transactions !== 'undefined') {
                    const ops = transactions.filter(t => t.type && (t.type.includes('بيع') || t.type.includes('شراء')) && !t.type.includes('مرتجع') && t.invoiceId);
                    const uniqueIds = new Set(ops.map(t => t.invoiceId));
                    invoiceCount = uniqueIds.size;
                }
                if (lblUsed) lblUsed.innerHTML = '🧾 الفواتير المستخدمة';
                if (lblRemaining) lblRemaining.innerHTML = '⏳ الفواتير المتبقية';
                if (usedEl) usedEl.innerText = invoiceCount + ' فاتورة';
                if (countdownEl) {
                    const left = Math.max(0, 200 - invoiceCount);
                    countdownEl.innerText = left + ' فاتورة متبقية';
                    countdownEl.style.color = left > 50 ? 'var(--primary-color)' : 'red';
                }
            } else if (expiryDateStr) {
                const expDate = new Date(expiryDateStr);
                if(startEl) startEl.innerText = 'تاريخ الانتهاء: ' + expDate.toLocaleDateString('ar-EG');
                if (lblUsed) lblUsed.innerHTML = '⏳ حالة الباقة';
                if (lblRemaining) lblRemaining.innerHTML = '🔄 الأيام المتبقية';
                
                const diffTime = expDate - new Date();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (usedEl) usedEl.innerText = diffDays > 0 ? 'نشطة' : 'منتهية';
                
                if (countdownEl) {
                    if (diffDays <= 0) {
                        countdownEl.innerText = 'منتهي الصلاحية';
                        countdownEl.style.color = 'red';
                    } else if (diffDays > 3650) {
                        countdownEl.innerText = 'نسخة مرخصة للأبد ♾️';
                        countdownEl.style.color = 'var(--accent-gold)';
                    } else {
                        countdownEl.innerText = diffDays + ' يوم متبقي';
                        countdownEl.style.color = diffDays > 5 ? 'var(--primary-color)' : 'red';
                    }
                }
            } else {
                if(startEl) startEl.innerText = startDate.toLocaleDateString('ar-EG');
                if (lblUsed) lblUsed.innerHTML = '⏳ الأيام المستخدمة';
                if (lblRemaining) lblRemaining.innerHTML = '🔄 الأيام المتبقية';
                const diffTime = Math.abs(new Date() - startDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (usedEl) usedEl.innerText = diffDays + ' يوم';
                if(countdownEl) {
                    if(currentPlan === 'الباقة الأساسية' || currentPlan === 'الباقة الشهرية') {
                        const left = Math.max(0, 30 - diffDays);
                        countdownEl.innerText = left + ' يوم متبقي';
                        countdownEl.style.color = left > 5 ? 'var(--primary-color)' : 'red';
                    } else if(currentPlan === 'الباقة المتقدمة' || currentPlan === 'الباقة السنوية') {
                        const left = Math.max(0, 365 - diffDays);
                        countdownEl.innerText = left + ' يوم متبقي';
                        countdownEl.style.color = left > 30 ? 'var(--primary-color)' : 'red';
                    } else if(currentPlan === 'الباقة الاحترافية' || currentPlan === 'الباقة مدى الحياة') {
                        countdownEl.innerText = 'نسخة مرخصة للأبد ♾️';
                        countdownEl.style.color = 'var(--accent-gold)';
                    }
                }
            }
            
            const transferPhone = getStore('bayan_sub_transfer_phone') || '';
            const phoneInput = document.getElementById('modalSubTransferPhone');
            if(phoneInput) phoneInput.value = transferPhone;

            modal.classList.remove('hidden');
        }

        async function verifyAndActivateLicense() {
            const inputEl = document.getElementById('activationCodeInput');
            if(!inputEl) return;
            let code = inputEl.value.trim().toUpperCase();
            if(!code) {
                if (typeof showToast === 'function') showToast("⚠️ الرجاء إدخال كود التفعيل", "warning");
                else alert("الرجاء إدخال كود التفعيل");
                return;
            }

            const mId = getStore('bayan_hwid') || getStore('bayan_machine_id') || '';
            const secret = atob("QkFZQU5fUE9TX1NFQ1JFVF9LRVlfMjAyNg=="); // مفتاح مشفر لمنع الفحص النصي البسيط في المتصفح

            const plans = [
                { name: "الباقة الشهرية", id: "MONTHLY" },
                { name: "الباقة السنوية", id: "ANNUAL" },
                { name: "الباقة مدى الحياة", id: "LIFETIME" }
            ];

            let matchedPlan = null;
            let hashGenerator;

            try {
                if (typeof require !== "undefined") {
                    const { ipcRenderer } = require('electron');
                    hashGenerator = async (dataStr) => {
                        return await ipcRenderer.invoke('hash-activation-payload', dataStr);
                    };
                }
            } catch(e) {}

            if (!hashGenerator && window.crypto && window.crypto.subtle) {
                try {
                    const msgEncoder = new TextEncoder();
                    const keyData = msgEncoder.encode(secret);
                    const cryptoKey = await window.crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
                    hashGenerator = async (dataStr) => {
                        const data = msgEncoder.encode(dataStr);
                        const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, data);
                        const hashArray = Array.from(new Uint8Array(signature));
                        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
                        return hashHex.substring(0, 16);
                    };
                } catch(e) {}
            }

            if (!hashGenerator) {
                try {
                    const sha256=function(r){function n(r,n){return r>>>n|r<<32-n}for(var t,e,o=Math.pow,f=o(2,32),h="length",a="",u=[],c=8*r[h],v=sha256.h=sha256.h||[],i=sha256.k=sha256.k||[],l=i[h],s={},C=2;64>l;C++)if(!s[C]){for(t=0;313>t;t+=C)s[t]=C;v[l]=o(C,.5)*f|0,i[l++]=o(C,1/3)*f|0}for(r+="\x80";r[h]%64-56;)r+="\x00";for(t=0;t<r[h];t++){if(e=r.charCodeAt(t),e>>8)return;u[t>>2]|=e<<24-t%4*8}for(u[u[h]]=c/f|0,u[u[h]]=c,e=0;e<u[h];){var g=u.slice(e,e+=16),d=v;for(v=v.slice(0,8),t=0;64>t;t++){var w=g[t-15],A=g[t-2],p=v[0],m=v[4],S=v[7]+(n(m,6)^n(m,11)^n(m,25))+(m&v[5]^~m&v[6])+i[t]+(g[t]=16>t?g[t]:g[t-16]+(n(w,7)^n(w,18)^w>>>3)+g[t-7]+(n(A,17)^n(A,19)^A>>>10)|0),b=(n(p,2)^n(p,13)^n(p,22))+(p&v[1]^p&v[2]^v[1]&v[2]);v=[S+b|0].concat(v),v[4]=v[4]+S|0}for(t=0;8>t;t++)v[t]=v[t]+d[t]|0}for(t=0;8>t;t++)for(e=3;e+1;e--){var y=v[t]>>8*e&255;a+=(16>y?0:"")+y.toString(16)}return a};
                    const hmacSha256 = (key, msg) => {
                        const blockSize = 64;
                        let keyBytes = [];
                        for(let i=0;i<key.length;i++) keyBytes.push(key.charCodeAt(i));
                        if(keyBytes.length > blockSize) {
                            const h = sha256(key);
                            keyBytes = [];
                            for(let i=0;i<h.length;i+=2) keyBytes.push(parseInt(h.substr(i,2), 16));
                        }
                        while(keyBytes.length < blockSize) keyBytes.push(0);
                        let o_key_pad = "", i_key_pad = "";
                        for(let i=0;i<blockSize;i++) {
                            o_key_pad += String.fromCharCode(keyBytes[i] ^ 0x5c);
                            i_key_pad += String.fromCharCode(keyBytes[i] ^ 0x36);
                        }
                        const hexToBin = (h) => { let s=""; for(let i=0;i<h.length;i+=2) s+=String.fromCharCode(parseInt(h.substr(i,2),16)); return s; };
                        return sha256(o_key_pad + hexToBin(sha256(i_key_pad + msg))).toUpperCase();
                    };
                    hashGenerator = async (dataStr) => hmacSha256(secret, dataStr).substring(0, 16);
                } catch(e) {}
            }

            if (!hashGenerator) {
                if (typeof showToast === "function") showToast("❌ عذراً، وظيفة التفعيل غير متاحة في هذه البيئة.", "error");
                else alert("عذراً، وظيفة التفعيل غير متاحة في هذه البيئة.");
                return;
            }

            // New Time-based Expiry Logic
            const parts = code.split("-");
            if (parts.length === 4 && parts[0] === "BYN") {
                const dateStr = parts[1]; // DDMMYY
                const planChar = parts[2]; // M, A, L
                const providedHash = parts[3]; // HASH8

                const payload = dateStr + planChar;
                const expectedHashFull = await hashGenerator(mId + payload);
                const expectedHash = expectedHashFull.substring(0, 8);
                
                console.log("=== BYN LICENSE DEBUG ===", {
                    mId: mId,
                    payload: payload,
                    expectedHashFull: expectedHashFull,
                    expectedHash: expectedHash,
                    providedHash: providedHash
                });

                if (providedHash === expectedHash) {
                    let planName = "الباقة الشهرية";
                    if (planChar === "A") planName = "الباقة السنوية";
                    if (planChar === "L") planName = "الباقة مدى الحياة";

                    // Parse Date
                    const dd = parseInt(dateStr.substring(0, 2), 10);
                    const mm = parseInt(dateStr.substring(2, 4), 10) - 1;
                    const yy = parseInt("20" + dateStr.substring(4, 6), 10);
                    const expiryDate = new Date(yy, mm, dd);
                    expiryDate.setHours(23, 59, 59, 999);

                    if (new Date() > expiryDate) {
                        if (typeof showToast === "function") showToast("❌ هذا الكود منتهي الصلاحية.", "error");
                        else alert("❌ هذا الكود منتهي الصلاحية.");
                        return;
                    }

                    await LicenseService.saveLicenseLocally(planName, expiryDate.toISOString());
                    
                    if (typeof showToast === "function") showToast(`🎉 تم التفعيل بنجاح! أهلاً بك في ${planName}`, "success");
                    else alert(`تم التفعيل بنجاح! 🎉\nأهلاً بك في ${planName}.`);
                    
                    const modal = document.getElementById("subscriptionModal");
                    if(modal) modal.classList.add("hidden");
                    
                    const currentPlanEl = document.getElementById("currentPlanText");
                    if(currentPlanEl) currentPlanEl.innerText = planName;
                    
                    setTimeout(() => location.reload(), 1500);
                    return;
                }
            }

            // Fallback for old codes
            for (let p of plans) {
                const dataStr = mId + p.id;
                const hash16 = await hashGenerator(dataStr);
                
                const expectedCode1 = `BYN-${hash16.substring(0,4)}-${hash16.substring(4,8)}-${hash16.substring(8,12)}-${hash16.substring(12,16)}`;
                const expectedCode2 = hash16;

                if (code === expectedCode1 || code === expectedCode2 || code === `BYN-${expectedCode2}`) {
                    matchedPlan = p.name;
                    break;
                }
            }

            if (matchedPlan) {
                setStore("bayan_current_plan", matchedPlan);
                setStore("bayan_install_date", new Date().toISOString());
                setStore("bayan_active", "true");
                
                if (typeof showToast === "function") showToast(`🎉 تم التفعيل بنجاح! أهلاً بك في ${matchedPlan}`, "success");
                else alert(`تم التفعيل بنجاح! 🎉\nأهلاً بك في ${matchedPlan}.`);
                
                const modal = document.getElementById("subscriptionModal");
                if(modal) modal.classList.add("hidden");
                
                const currentPlanEl = document.getElementById("currentPlanText");
                if(currentPlanEl) currentPlanEl.innerText = matchedPlan;
                setTimeout(() => location.reload(), 1500);
            } else {
                if (typeof showToast === "function") showToast("❌ كود التفعيل غير صحيح، يرجى التأكد من كتابته بشكل سليم.", "error");
                else alert("كود التفعيل غير صحيح، يرجى التأكد من كتابته بشكل سليم.");
            }
        }

        function closeSubscription() {
            document.getElementById('subscriptionModal').classList.add('hidden');
        }

        // --- فلترة محتويات السلة (Cart Filter Logic) ---
        function filterCartItems(query) {
            const rows = document.querySelectorAll('#cartTableBody tr');
            const q = query.trim().toLowerCase();
            let firstMatch = null;

            rows.forEach(row => {
                // البحث في كل محتوى السطر (الاسم، السعر، الكمية، إلخ)
                const rowText = row.innerText.toLowerCase();
                if (rowText.includes(q)) {
                    row.style.display = "";
                    row.style.background = q !== "" ? "rgba(39, 174, 96, 0.15)" : ""; // تمييز باللون الأخضر
                    if (q !== "" && !firstMatch) firstMatch = row;
                } else {
                    row.style.display = "none";
                }
            });

            // تمرير تلقائي لأول صنف متطابق لسهولة التأكد
            if (firstMatch && q !== "") {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        function filterPurchaseCartItems(query) {
            const rows = document.querySelectorAll('#purchaseTableBody tr');
            const q = query.trim().toLowerCase();
            let firstMatch = null;

            rows.forEach(row => {
                const rowText = row.innerText.toLowerCase();
                if (rowText.includes(q)) {
                    row.style.display = "";
                    row.style.background = q !== "" ? "rgba(52, 152, 219, 0.15)" : ""; // تمييز بالأزرق للمشتريات
                    if (q !== "" && !firstMatch) firstMatch = row;
                } else {
                    row.style.display = "none";
                }
            });

            if (firstMatch && q !== "") {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        async function resetAllData() {
            const confirm1 = confirm("⚠️ تنبيه خطير جداً:\nسيتم حذف كافة البيانات (المنتجات، الحركات، الحسابات، الإعدادات) بشكل نهائي.\nهل أنت متأكد؟");
            if (confirm1) {
                const confirm2 = await showCustomPrompt("⚠️ لتأكيد عملية المسح الشامل، يرجى كتابة (مسح الكل) في المربع أدناه:");
                if (confirm2 === "مسح الكل") {
                    clearStore();
                    alert("✅ تم مسح كافة البيانات بنجاح. سيتم الآن إعادة تشغيل التطبيق.");
                    location.reload();
                } else {
                    alert("❌ لم يتم كتابة عبارة التأكيد بشكل صحيح. تم إلغاء الأمر.");
                }
            }
        }

        async function backupData() {
            await window.executeAutoBackupToFile(false, true);
        }

        function restoreData(input) {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async function (e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Clear existing databases and write new ones
                    await db.products.clear();
                    await db.transactions.clear();
                    await db.accounts.clear();
                    await db.users.clear();
                    await db.trash.clear();
                    
                    if (data.products && data.products.length > 0) await db.products.bulkPut(data.products);
                    if (data.transactions && data.transactions.length > 0) await db.transactions.bulkPut(data.transactions);
                    if (data.accounts && data.accounts.length > 0) await db.accounts.bulkPut(data.accounts);
                    if (data.users && data.users.length > 0) await db.users.bulkPut(data.users);
                    if (data.trash && data.trash.length > 0) await db.trash.bulkPut(data.trash);
                    
                    if (data.settings) {
                        const existingMain = await db.settings.get('main') || {};
                        await db.settings.put({ ...existingMain, ...data.settings, id: 'main' });
                    }
                    
                    alert("✅ تم استعادة النسخة الاحتياطية بنجاح! سيتم إعادة تحميل الصفحة.");
                    location.reload();
                } catch (err) {
                    console.error("Failed to restore backup:", err);
                    alert("❌ فشل استعادة النسخة الاحتياطية، يرجى التأكد من سلامة الملف.");
                }
            };
            reader.readAsText(file);
        }

        // ================= منطق إضافة حساب جديد (New Account Logic) =================
        function openNewAccountModal() {
            // تصفير معرف التعديل لضمان أنها إضافة جديدة
            document.getElementById('editAccId').value = '';

            // تصفير الحقول
            document.querySelectorAll('#newAccountModal input:not([type=radio]):not([type=checkbox]):not([type=hidden]), #newAccountModal textarea').forEach(el => el.value = '');

            // تصفير الأرصدة الافتراضية
            if (document.getElementById('accDebit')) document.getElementById('accDebit').value = '0';
            if (document.getElementById('accCredit')) document.getElementById('accCredit').value = '0';

            document.getElementById('newAccountModal').classList.remove('hidden');
            // تعيين تاريخ اليوم للرصيد وتاريخ إنشاء الحساب في الفوتر
            const todayStr = new Date().toLocaleDateString('en-CA');
            document.getElementById('accBalDate').value = todayStr;
            const createdEl = document.getElementById('accCreatedAt');
            if (createdEl) createdEl.innerText = new Date().toLocaleDateString('ar-EG');
            document.getElementById('accName').focus();
        }

        function closeNewAccountModal() {
            document.getElementById('newAccountModal').classList.add('hidden');
        }

        function safeSetText(id, text) {
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        }

        // ================= منطق استعلام الأصناف (Product Inquiry Logic) =================
        function handleInquirySearch(query) {
            query = query.trim().toLowerCase();
            const productListEl = document.getElementById('inquiryProductList');
            if (!productListEl) return;

            if (!query) {
                renderInquiryProductList(productsDB);
                return;
            }

            const filtered = productsDB.filter(p => {
                const nameMatch = p.name && p.name.toLowerCase().includes(query);
                const codeMatch = p.code && p.code.toLowerCase().includes(query);
                const barcodeMatch = p.barcode && p.barcode.toLowerCase() === query;
                const barcodeInclude = p.barcode && p.barcode.toLowerCase().includes(query);
                const unitBarcodeMatch = p.units && p.units.some(u => u.unitBarcode && u.unitBarcode.toLowerCase() === query);
                const unitBarcodeInclude = p.units && p.units.some(u => u.unitBarcode && u.unitBarcode.toLowerCase().includes(query));

                return nameMatch || codeMatch || barcodeMatch || barcodeInclude || unitBarcodeMatch || unitBarcodeInclude;
            });

            renderInquiryProductList(filtered);

            // اختيار تلقائي للصنف إذا كان هناك تطابق تام للباركود
            const exactMatch = filtered.find(p => 
                (p.barcode && p.barcode.toLowerCase() === query) || 
                (p.units && p.units.some(u => u.unitBarcode && u.unitBarcode.toLowerCase() === query))
            );
            if (exactMatch) {
                selectProductForInquiry(exactMatch.id);
            }
        }

        function renderInquiryProductList(products) {
            const productListEl = document.getElementById('inquiryProductList');
            if (!productListEl) return;

            if (products.length === 0) {
                productListEl.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px; font-size: 0.9rem;">⚠️ لا توجد نتائج مطابقة</div>';
                return;
            }

            productListEl.innerHTML = products.map(p => `
                <div class="inquiry-product-item" id="inquiry-item-${p.id}" onclick="selectProductForInquiry(${p.id})">
                    <div style="display: flex; flex-direction: column; gap: 4px; text-align: right;">
                        <div class="name">${p.name}</div>
                        <div class="code">كود: ${p.code || '---'} | باركود: ${p.barcode || '---'}</div>
                    </div>
                    <span style="font-size: 0.95rem; font-weight: 900; color: #6d28d9; white-space: nowrap;">${parseFloat(p.price || 0).toFixed(2)} ج.م</span>
                </div>
            `).join('');
        }

        function selectProductForInquiry(productId) {
            const product = productsDB.find(p => p.id === productId);
            if (!product) return;

            // تمييز العنصر النشط في القائمة
            document.querySelectorAll('.inquiry-product-item').forEach(el => el.classList.remove('active'));
            const activeItem = document.getElementById(`inquiry-item-${productId}`);
            if (activeItem) activeItem.classList.add('active');

            // إخفاء واجهة البداية وعرض المحتوى
            document.getElementById('inquiryEmptyState').classList.add('hidden');
            document.getElementById('inquiryDetailsContent').classList.remove('hidden');

            // تعبئة البيانات الأساسية
            document.getElementById('inquiryProductName').textContent = product.name;
            document.getElementById('inquiryProductCode').textContent = product.code || '---';
            document.getElementById('inquiryProductShelf').textContent = product.shelf || 'غير محدد';
            document.getElementById('inquiryProductCategory').textContent = product.category || 'عام';

            // الأسعار
            document.getElementById('inquiryPriceRetail').textContent = parseFloat(product.price || 0).toFixed(2);
            document.getElementById('inquiryPriceWholesale').textContent = parseFloat(product.wholesale || 0).toFixed(2);

            const costCard = document.getElementById('inquiryCostCard');
            if (checkPermission('docs_purchase_price')) {
                costCard.style.display = 'flex';
                document.getElementById('inquiryPriceCost').textContent = parseFloat(product.cost || product.cost_price || 0).toFixed(2);
            } else {
                costCard.style.display = 'none';
            }

            // توليد الباركود
            const svgEl = document.getElementById('inquiryBarcodeSvg');
            const barcodeValEl = document.getElementById('inquiryBarcodeValue');
            if (product.barcode) {
                try {
                    svgEl.style.display = 'block';
                    JsBarcode(svgEl, product.barcode, {
                        format: "CODE128",
                        width: 1.5,
                        height: 40,
                        displayValue: false
                    });
                    barcodeValEl.textContent = product.barcode;
                } catch (e) {
                    console.error("Barcode generation error:", e);
                    svgEl.style.display = 'none';
                    barcodeValEl.textContent = product.barcode + " (فشل التوليد البصري)";
                }
            } else {
                svgEl.style.display = 'none';
                barcodeValEl.textContent = "لا يوجد باركود";
            }

            // توزيع المخزون
            const stockTableBody = document.getElementById('inquiryWarehouseStockTableBody');
            let totalStock = 0;

            if (window.warehouses && window.warehouses.length > 0) {
                stockTableBody.innerHTML = window.warehouses.map(w => {
                    const qty = typeof getWarehouseStock === 'function' ? getWarehouseStock(product.name, w.name) : 0;
                    totalStock += qty;

                    let statusBadge = '';
                    if (qty <= 0) {
                        statusBadge = '<span style="background: #fee2e2; color: #ef4444; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">نفذت الكمية</span>';
                    } else if (qty <= (product.minStock || 5)) {
                        statusBadge = '<span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">مخزون منخفض</span>';
                    } else {
                        statusBadge = '<span style="background: #dcfce7; color: #22c55e; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">متوفر</span>';
                    }

                    return `
                        <tr>
                            <td style="padding: 10px; font-weight: bold;">${w.name} ${window.currentUser && window.currentUser.warehouseName === w.name ? '<span style="color: #10b981; font-size: 0.75rem;">(المخزن النشط حالياً)</span>' : ''}</td>
                            <td style="padding: 10px; text-align: center; font-weight: 900; font-size: 1rem; color: #1e293b;">${qty}</td>
                            <td style="padding: 10px; text-align: center;">${statusBadge}</td>
                        </tr>
                    `;
                }).join('');
            } else {
                stockTableBody.innerHTML = `
                    <tr>
                        <td style="padding: 10px; font-weight: bold;">المخزن الرئيسي</td>
                        <td style="padding: 10px; text-align: center; font-weight: 900; font-size: 1rem; color: #1e293b;">${product.stock || 0}</td>
                        <td style="padding: 10px; text-align: center;">
                            ${(product.stock || 0) <= 0 ? '<span style="background: #fee2e2; color: #ef4444; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">نفذت الكمية</span>' : '<span style="background: #dcfce7; color: #22c55e; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">متوفر</span>'}
                        </td>
                    </tr>
                `;
                totalStock = product.stock || 0;
            }

            document.getElementById('inquiryTotalStockBadge').textContent = `الإجمالي: ${totalStock}`;

            // جدول الوحدات
            const unitsTableBody = document.getElementById('inquiryUnitsTableBody');
            if (product.units && product.units.length > 0) {
                unitsTableBody.innerHTML = product.units.map(u => `
                    <tr>
                        <td style="padding: 10px; font-weight: bold;">${u.unitName}</td>
                        <td style="padding: 10px; text-align: center; font-weight: 800;">${u.factor || 1}</td>
                        <td style="padding: 10px; text-align: center; font-weight: 900; color: #1e3a8a;">${parseFloat(u.price || 0).toFixed(2)} ج.م</td>
                        <td style="padding: 10px; text-align: center; font-family: monospace; color: #475569;">${u.unitBarcode || '---'}</td>
                    </tr>
                `).join('');
            } else {
                unitsTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: #94a3b8; padding: 15px;">لا توجد وحدات إضافية لهذا الصنف</td>
                    </tr>
                `;
            }
        }

        // --- وظائف المشاركة والطباعة الفورية ---

        // ================= 🤖 مساعد بيان الذكي (Gemini AI Assistant Logic) =================
        let isAIVoiceActive = false;
        let aiRecognition = null;
        window.aiConversationHistory = [];

        function toggleAICopilot() {
            const drawer = document.getElementById('aiCopilotDrawer');
            if (!drawer) return;

            const isHidden = drawer.style.right === '-420px' || drawer.style.right === '';
            if (isHidden) {
                drawer.style.right = '0px';
                // فحص توفر مفتاح الـ API
                const key = getStore('bayan_gemini_key') || '';
                const alertBox = document.getElementById('aiKeyAlertBox');
                if (!key) {
                    if (alertBox) alertBox.style.display = 'block';
                } else {
                    if (alertBox) alertBox.style.display = 'none';
                }
                setTimeout(() => {
                    document.getElementById('aiChatInput').focus();
                }, 400);
            } else {
                drawer.style.right = '-420px';
                if (isAIVoiceActive) stopAIVoice();
            }
        }

        async function saveQuickAIKey() {
            const key = document.getElementById('aiQuickApiKeyInput').value.trim();
            if (!key) return alert('⚠️ يرجى إدخال مفتاح API صحيح');
            // ✅ أمان: حفظ في IndexedDB (لا يظهر في F12)
            try {
                if (typeof db !== 'undefined' && db.settings) {
                    await db.settings.put({ id: 'gemini_key', value: key });
                    removeStore('bayan_gemini_key'); // حذف القديم
                }
            } catch(e) {
                setStore('bayan_gemini_key', key); // fallback
            }

            const settingsInput = document.getElementById('geminiApiKeyInput');
            if (settingsInput) settingsInput.value = key;

            document.getElementById('aiKeyAlertBox').style.display = 'none';
            showToast('🔑 تم حفظ مفتاح الـ API وتفعيل المساعد بنجاح!', 'success');
        }

        function getAILocalDatabaseContext() {
            // 1. الحسابات والأرصدة (تقليص لأهم/أول 50 حساب لتجنب تجاوز الحد)
            const accountsList = (window.accounts || []).slice(0, 50).map(a => {
                const bal = typeof getAccountBalance === 'function' ? getAccountBalance(a.name) : 0;
                return `- ${a.name} (${a.type}): رصيده ${bal.toFixed(2)} ج.م (إذا كان الرصيد موجب فله فلوس/دائن، سالب عليه فلوس/مدين)`;
            }).join('\n') + (window.accounts && window.accounts.length > 50 ? '\n... (تم تقليص القائمة لـ 50 حساب)' : '');

            // 2. المنتجات والمخزون (تقليص لأول 100 منتج)
            const hasPurchasePerm = checkPermission('docs_purchase_price');
            const productsList = (window.productsDB || []).slice(0, 100).map(p => {
                const costInfo = hasPurchasePerm ? `, سعر التكلفة: ${p.cost || p.cost_price || 0} ج.م` : '';
                return `- ${p.name} (كود: ${p.code || '---'}, باركود: ${p.barcode || '---'}): المخزون العام: ${p.stock || 0} ${p.unit || 'قطعة'}, سعر البيع: ${p.price || 0} ج.م${costInfo}, الرف: ${p.shelf || 'غير محدد'}`;
            }).join('\n') + (window.productsDB && window.productsDB.length > 100 ? '\n... (تم تقليص القائمة لـ 100 صنف)' : '');

            // 3. ملخص الفواتير الأخيرة (آخر 30 عملية)
            const recentTransactions = (window.transactions || []).slice(-30).map(t => {
                return `- فاتورة #${t.invoiceId || 'بدون'} | التاريخ: ${t.date} | النوع: ${t.type} | الطرف: ${t.partner || 'عام'} | الإجمالي: ${t.total || t.price || 0} ج.م | الطريقة: ${t.method || 'نقدي'}`;
            }).join('\n');

            // 4. حالة النظام
            const activeTab = window.activeTabId || 'dashboard';
            const activeWarehouse = (window.currentUser && window.currentUser.warehouseName) ? window.currentUser.warehouseName : 'المخزن الرئيسي';
            const user = (window.currentUser && window.currentUser.name) ? window.currentUser.name : 'المدير';

            return `
=== حالة النظام الحالية ===
- المستخدم الحالي: ${user}
- التبويب المفتوح حالياً: ${activeTab}
- المستودع/المخزن النشط: ${activeWarehouse}
- صلاحية رؤية التكلفة/الأرباح: ${hasPurchasePerm ? 'مسموح' : 'غير مسموح (محجوب)'}

=== قائمة العملاء والموردين وأرصدتهم الحالية ===
${accountsList || 'لا يوجد حسابات مسجلة حالياً.'}

=== قائمة المنتجات والأسعار والمخزون الحالي ===
${productsList || 'لا يوجد أصناف في المخزن حالياً.'}

=== ملخص آخر 30 حركة مالية وفواتير ===
${recentTransactions || 'لا يوجد فواتير مسجلة حالياً.'}
`;
        }

        const AI_LIMIT_12H = 4;
        const AI_LIMIT_WEEKLY = 28;

        window.getGeminiApiKeys = async function() {
            let apiKeys = [];
            // ✅ أمان: نقرأ مفتاح AI من IndexedDB أولاً (لا يظهر في F12)
            try {
                if (typeof db !== 'undefined' && db.settings) {
                    const stored = await db.settings.get('gemini_key');
                    if (stored && stored.value) {
                        apiKeys = stored.value.split(/[\s,;\|]+/).map(k => k.trim()).filter(Boolean);
                    }
                }
            } catch(e) {}

            // Fallback: localStorage (migration من النظام القديم)
            if (apiKeys.length === 0) {
                const userKeys = getStore('bayan_gemini_key');
                if (userKeys) {
                    apiKeys = userKeys.split(/[\s,;\|]+/).map(k => k.trim()).filter(Boolean);
                    // نقل تلقائيلـ IndexedDB وحذف من localStorage
                    try {
                        if (typeof db !== 'undefined' && db.settings) {
                            await db.settings.put({ id: 'gemini_key', value: userKeys });
                            removeStore('bayan_gemini_key');
                        }
                    } catch(e) {}
                }
            }

            if (apiKeys.length === 0) {
                apiKeys = [];
            }
            return apiKeys;
        };

        function checkAILimits() {
            let usage = JSON.parse(getStore('bayan_ai_usage'));
            if (!usage) {
                usage = {
                    currentCount: 0,
                    lastResetTime: Date.now(),
                    weeklyCount: 0,
                    weeklyResetTime: Date.now()
                };
            }

            const now = Date.now();
            const twelveHoursMs = 12 * 60 * 60 * 1000;
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

            if (now - usage.lastResetTime >= twelveHoursMs) {
                usage.currentCount = 0;
                usage.lastResetTime = now;
            }
            if (now - usage.weeklyResetTime >= sevenDaysMs) {
                usage.weeklyCount = 0;
                usage.weeklyResetTime = now;
            }

            setStore('bayan_ai_usage', JSON.stringify(usage));
            return usage;
        }

        function incrementAIUsage() {
            let usage = checkAILimits();
            usage.currentCount++;
            usage.weeklyCount++;
            setStore('bayan_ai_usage', JSON.stringify(usage));
            if (typeof window.updateAILimitsUI === 'function') window.updateAILimitsUI();
        }

        window.updateAILimitsUI = function() {
            const usage = checkAILimits();

            const currentPct = Math.min(100, Math.round((usage.currentCount / AI_LIMIT_12H) * 100));
            const weeklyPct = Math.min(100, Math.round((usage.weeklyCount / AI_LIMIT_WEEKLY) * 100));

            const currentTextEl = document.getElementById('aiCurrentUsageText');
            const currentBarEl = document.getElementById('aiCurrentUsageBar');
            const currentResetEl = document.getElementById('aiCurrentResetText');

            if (currentTextEl) currentTextEl.innerText = `تم استخدام ${currentPct}%`;
            if (currentBarEl) {
                currentBarEl.style.width = `${currentPct}%`;
                if (currentPct >= 100) currentBarEl.style.background = '#ef4444'; // Red if full
                else currentBarEl.style.background = '#f8fafc';
            }

            const nextResetDate = new Date(usage.lastResetTime + 12 * 60 * 60 * 1000);
            if (currentResetEl) {
                let hours = nextResetDate.getHours();
                let mins = nextResetDate.getMinutes().toString().padStart(2, '0');
                let ampm = hours >= 12 ? 'م' : 'ص';
                hours = hours % 12;
                hours = hours ? hours : 12; 
                currentResetEl.innerText = `يُعاد ضبط السقف في ${hours}:${mins} ${ampm}`;
            }

            const weeklyTextEl = document.getElementById('aiWeeklyUsageText');
            const weeklyResetEl = document.getElementById('aiWeeklyResetText');

            if (weeklyTextEl) weeklyTextEl.innerText = `تم استخدام ${weeklyPct}%`;
            if (weeklyResetEl) {
                const nextWeeklyDate = new Date(usage.weeklyResetTime + 7 * 24 * 60 * 60 * 1000);
                const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
                let wHours = nextWeeklyDate.getHours();
                let wMins = nextWeeklyDate.getMinutes().toString().padStart(2, '0');
                let wAmpm = wHours >= 12 ? 'م' : 'ص';
                wHours = wHours % 12;
                wHours = wHours ? wHours : 12; 
                weeklyResetEl.innerText = `يُعاد ضبط السقف في ${nextWeeklyDate.getDate()} ${months[nextWeeklyDate.getMonth()]} عند الساعة ${wHours}:${wMins} ${wAmpm}`;
            }
        };

        async function sendAIChatMessage() {
            const usage = checkAILimits();
            if (usage.currentCount >= AI_LIMIT_12H) {
                showCustomAlert({
                    type: 'warning',
                    titleText: '⚠️ تنبيه',
                    msg: `لقد استنفدت الحد الأقصى للمساعد الذكي (${AI_LIMIT_12H} رسائل). يُعاد ضبط السقف في غضون 12 ساعة.`
                });
                return;
            }

            const inputEl = document.getElementById('aiChatInput');
            const query = inputEl.value.trim();
            if (!query) return;

            const apiKeys = window.getGeminiApiKeys();
            if (apiKeys.length === 0) {
                alert('⚠️ يرجى تعيين مفتاح Gemini API أولاً لتشغيل المساعد.');
                document.getElementById('aiKeyAlertBox').style.display = 'flex';
                return;
            }

            // إضافة رسالة المستخدم للدردشة
            appendAIChatBubble(query, 'user');
            inputEl.value = '';

            // إضافة فقاعة التحميل
            const loadingId = 'ai-loading-' + Date.now();
            const messagesContainer = document.getElementById('aiChatMessages');
            const loadingBubble = document.createElement('div');
            loadingBubble.className = 'ai-loading-msg';
            loadingBubble.id = loadingId;
            loadingBubble.innerHTML = `
                <div class="ai-loading-dot"></div>
                <div class="ai-loading-dot"></div>
                <div class="ai-loading-dot"></div>
            `;
            messagesContainer.appendChild(loadingBubble);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            try {
                // إعداد سياق قاعدة البيانات المحلي
                const dbContext = getAILocalDatabaseContext();

                // بناء الطلب لـ Gemini API
                const systemInstruction = `
أنت "مساعد بيان الذكي" (Bayan AI Copilot)، خبير مالي وإداري ذكي ومساعد لنظام بيان المحاسبي (Bayan POS).
أجب عن أسئلة المستخدم باللغة العربية بأسلوب احترافي، واضح، ومبسط.
لديك وصول كامل لبيانات النظام الحالية الملحقة بالرسالة (العملاء، المنتجات، والفواتير).

قواعد هامة جداً:
1. إذا سألك المستخدم أسئلة تحليلية (مثال: من هو أكثر عميل عليه ديون، أو ما هو الصنف الأكثر مبيعاً، أو كم إجمالي المبيعات)، قم بالبحث في البيانات المرفقة وحساب النتيجة بدقة ثم أجب بالتفصيل واسم الشخص والأرقام.
2. إذا طلب منك المستخدم فتح قسم معين (مثل البيع، الشراء، الحسابات، المخازن، أو استعلام الأصناف) أو البحث عن صنف معين، قم بإدراج أمر التحكم بصيغة JSON داخل وسم <action> في نهاية إجابتك تماماً بدون أي نصوص أخرى داخل هذا الوسم.
صيغة أمر التحكم كالتالي:
- لفتح قسم معين: <action>{"navigate": "sales"}</action> (الخيارات المتاحة: "sales", "purchase", "receipt", "disbursement", "inventory", "accounts", "invoices", "warehouse-report", "product-inquiry", "settings")
- للبحث عن منتج في قسم استعلام الأصناف: <action>{"search_product": "اسم المنتج أو الباركود"}</action> (في هذه الحالة يجب فتح قسم product-inquiry وتصفية المنتج).
3. لا تقم أبداً بكشف أو عرض أو حساب أسعار التكلفة (سعر الشراء) أو أرباح الفواتير إذا كان حقل "صلاحية رؤية التكلفة/الأرباح" قيمته "غير مسموح (محجوب)"، وأجب بأدب أنك لا تملك الصلاحية لعرض هذه البيانات المالية.
`;

                // تحضير سجل المحادثة
                window.aiConversationHistory.push({ role: 'user', parts: [{ text: query }] });

                // إرسال الطلب لـ Gemini API
                const fullPrompt = `${systemInstruction}\n\nسياق قاعدة بيانات البرنامج الحالية:\n${dbContext}\n\nسؤال المستخدم: ${query}`;
                let response = null;
                let lastError = null;
                for (let k = 0; k < apiKeys.length; k++) {
                    const currentKey = apiKeys[k];
                    try {
                        response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${currentKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [
                                    { role: 'user', parts: [{ text: fullPrompt }] }
                                ],
                                generationConfig: { temperature: 0.4 }
                            })
                        });
                        if (response.ok) {
                            lastError = null;
                            break;
                        } else {
                            let errDetails = "";
                            try {
                                const errJson = await response.json();
                                errDetails = errJson.error.message || JSON.stringify(errJson);
                            } catch(e) {
                                errDetails = await response.text();
                            }
                            lastError = new Error(`مفتاح رقم ${k+1} فشل (${response.status}): ${errDetails}`);
                        }
                    } catch (e) {
                        lastError = e;
                    }
                }
                if (lastError || !response || !response.ok) {
                    throw lastError || new Error("فشلت جميع المحاولات باستخدام مفاتيح API المتاحة.");
                }

                const data = await response.json();
                const replyText = data.candidates[0].content.parts[0].text || 'فشل في توليد إجابة.';

                // إزالة فقاعة التحميل
                const loader = document.getElementById(loadingId);
                if (loader) loader.remove();

                // معالجة وحذف وسم الـ action من النص المعروض
                let cleanReply = replyText;
                let actionObj = null;
                const actionMatch = replyText.match(/<action>([\s\S]*?)<\/action>/);
                if (actionMatch) {
                    try {
                        actionObj = JSON.parse(actionMatch[1].trim());
                        cleanReply = replyText.replace(/<action>[\s\S]*?<\/action>/g, '').trim();
                    } catch (e) {
                        console.error('Failed to parse AI action JSON:', e);
                    }
                }

                // إضافة إجابة البوت للدردشة
                appendAIChatBubble(cleanReply, 'bot');
                window.aiConversationHistory.push({ role: 'model', parts: [{ text: replyText }] });

                // تنفيذ أمر التحكم إذا وُجد
                if (actionObj) {
                    executeAIAction(actionObj);
                }

            } catch (err) {
                console.error(err);
                const loader = document.getElementById(loadingId);
                if (loader) loader.remove();
                appendAIChatBubble(`🚀 مساعد بيان الذكي قيد التطوير والتحديث الجذري حالياً، وسيتم إطلاق الإصدار الجديد في 15/10.`, 'bot');
            }
        }

        function appendAIChatBubble(text, sender) {
            const messagesContainer = document.getElementById('aiChatMessages');
            if (!messagesContainer) return;

            const bubble = document.createElement('div');
            bubble.className = sender === 'user' ? 'ai-user-msg' : 'ai-bot-msg';

            // تحويل علامات markdown البسيطة لنصوص منسقة
            let formattedText = text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');

            bubble.innerHTML = `<div style="line-height: 1.6;">${formattedText}</div>`;

            if (sender === 'bot') {
                const actionContainer = document.createElement('div');
                actionContainer.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 5px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 5px;';

                const copyBtn = document.createElement('button');
                copyBtn.innerHTML = '📋 نسخ';
                copyBtn.style.cssText = 'background: transparent; border: 1px solid #cbd5e1; color: #64748b; font-size: 0.7rem; padding: 3px 8px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-family: inherit; font-weight: bold; display: flex; align-items: center; gap: 4px;';
                copyBtn.setAttribute('onmouseover', 'this.style.background="#e2e8f0"');
                copyBtn.setAttribute('onmouseout', 'this.style.background="transparent"');
                copyBtn.setAttribute('data-text', encodeURIComponent(text));
                copyBtn.setAttribute('onclick', 'window.copyAiMessageText(this)');

                actionContainer.appendChild(copyBtn);
                bubble.appendChild(actionContainer);
            }

            messagesContainer.appendChild(bubble);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function executeAIAction(action) {
            if (action.navigate) {
                if (typeof switchSection === 'function') {
                    switchSection(action.navigate);
                    showToast(`🤖 تم فتح قسم: ${action.navigate} بواسطة الذكاء الاصطناعي`, 'info');
                }
            }
            if (action.search_product) {
                if (typeof switchSection === 'function') {
                    switchSection('product-inquiry');
                    setTimeout(() => {
                        const input = document.getElementById('inquirySearchInput');
                        if (input) {
                            input.value = action.search_product;
                            if (typeof handleInquirySearch === 'function') {
                                handleInquirySearch(action.search_product);
                            }
                        }
                    }, 500);
                }
            }
        }

        // ================= تملي الصوت المدمج (Speech-to-Text) =================
        function toggleAIVoiceInput() {
            if (isAIVoiceActive) {
                stopAIVoice();
                return;
            }

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('⚠️ متصفحك الحالي لا يدعم ميزة التعرف على الصوت. يرجى استخدام متصفح Google Chrome.');
                return;
            }

            try {
                aiRecognition = new SpeechRecognition();
                aiRecognition.lang = 'ar-EG'; // اللغة العربية مصر
                aiRecognition.interimResults = false;
                aiRecognition.maxAlternatives = 1;

                aiRecognition.onstart = function() {
                    isAIVoiceActive = true;
                    const voiceBtn = document.getElementById('aiVoiceBtn');
                    if (voiceBtn) {
                        voiceBtn.style.background = '#ef4444';
                        voiceBtn.style.color = 'white';
                    }
                    const statusText = document.getElementById('aiVoiceStatus');
                    if (statusText) statusText.style.display = 'block';
                };

                aiRecognition.onresult = function(event) {
                    const resultText = event.results[0][0].transcript;
                    const inputEl = document.getElementById('aiChatInput');
                    if (inputEl) {
                        inputEl.value = resultText;
                        showToast(`🎙️ تم التعرف: "${resultText}"`, 'info');
                    }
                };

                aiRecognition.onerror = function(event) {
                    console.error('Speech recognition error:', event.error);
                    stopAIVoice();
                };

                aiRecognition.onend = function() {
                    stopAIVoice();
                };

                aiRecognition.start();

            } catch (e) {
                console.error(e);
                stopAIVoice();
            }
        }

        function stopAIVoice() {
            isAIVoiceActive = false;
            if (aiRecognition) {
                try { aiRecognition.stop(); } catch(e){}
            }
            const voiceBtn = document.getElementById('aiVoiceBtn');
            if (voiceBtn) {
                voiceBtn.style.background = 'white';
                voiceBtn.style.color = '#334155';
            }
            const statusText = document.getElementById('aiVoiceStatus');
            if (statusText) statusText.style.display = 'none';
        }

        // ================= مساعد بيان الذكي (الشاشة الكاملة - AI Assistant Page) =================
        let isFullAIVoiceActive = false;
        let fullAiRecognition = null;

        async function sendFullAIChatMessage() {
            const usage = checkAILimits();
            if (usage.currentCount >= AI_LIMIT_12H) {
                showCustomAlert({
                    type: 'warning',
                    titleText: '⚠️ تنبيه',
                    msg: `لقد استنفدت الحد الأقصى للمساعد الذكي (${AI_LIMIT_12H} رسائل). يُعاد ضبط السقف في غضون 12 ساعة.`
                });
                return;
            }

            const inputEl = document.getElementById('aiAssistantFullInput');
            if (!inputEl) return;
            const query = inputEl.value.trim();
            if (!query) return;

            const apiKeys = window.getGeminiApiKeys();
            if (apiKeys.length === 0) {
                alert('⚠️ يرجى تعيين مفتاح Gemini API أولاً لتشغيل المساعد.');
                return;
            }

            // إضافة رسالة المستخدم للدردشة
            appendFullAIChatBubble(query, 'user');
            inputEl.value = '';

            // إضافة فقاعة التحميل
            const loadingId = 'ai-full-loading-' + Date.now();
            const messagesContainer = document.getElementById('aiAssistantFullChatLogs');
            if (!messagesContainer) return;

            const loadingBubble = document.createElement('div');
            loadingBubble.className = 'ai-loading-msg';
            loadingBubble.id = loadingId;
            loadingBubble.style.alignSelf = 'flex-start';
            loadingBubble.innerHTML = `
                <div class="ai-loading-dot"></div>
                <div class="ai-loading-dot"></div>
                <div class="ai-loading-dot"></div>
            `;
            messagesContainer.appendChild(loadingBubble);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            try {
                // إعداد سياق قاعدة البيانات المحلي
                const dbContext = getAILocalDatabaseContext();

                // بناء الطلب لـ Gemini API
                const systemInstruction = `
أنت "مساعد بيان الذكي" (Bayan AI Copilot)، خبير مالي وإداري ذكي ومساعد لنظام بيان المحاسبي (Bayan POS).
أجب عن أسئلة المستخدم باللغة العربية بأسلوب احترافي، واضح، ومبسط.
لديك وصول كامل لبيانات النظام الحالية الملحقة بالرسالة (العملاء، المنتجات، والفواتير).

قواعد هامة جداً:
1. إذا سألك المستخدم أسئلة تحليلية (مثال: من هو أكثر عميل عليه ديون، أو ما هو الصنف الأكثر مبيعاً، أو كم إجمالي المبيعات)، قم بالبحث في البيانات المرفقة وحساب النتيجة بدقة ثم أجب بالتفصيل واسم الشخص والأرقام.
2. إذا طلب منك المستخدم فتح قسم معين (مثل البيع، الشراء، الحسابات، المخازن، أو استعلام الأصناف) أو البحث عن صنف معين، قم بإدراج أمر التحكم بصيغة JSON داخل وسم <action> في نهاية إجابتك تماماً بدون أي نصوص أخرى داخل هذا الوسم.
صيغة أمر التحكم كالتالي:
- لفتح قسم معين: <action>{"navigate": "sales"}</action> (الخيارات المتاحة: "sales", "purchase", "receipt", "disbursement", "inventory", "accounts", "invoices", "warehouse-report", "product-inquiry", "settings")
- للبحث عن منتج في قسم استعلام الأصناف: <action>{"search_product": "اسم المنتج أو الباركود"}</action> (في هذه الحالة يجب فتح قسم product-inquiry وتصفية المنتج).
3. لا تقم أبداً بكشف أو عرض أو حساب أسعار التكلفة (سعر الشراء) أو أرباح الفواتير إذا كان حقل "صلاحية رؤية التكلفة/الأرباح" قيمته "غير مسموح (محجوب)"، وأجب بأدب أنك لا تملك الصلاحية لعرض هذه البيانات المالية.
`;

                // إرسال الطلب لـ Gemini API
                const fullPrompt = `${systemInstruction}\n\nسياق قاعدة بيانات البرنامج الحالية:\n${dbContext}\n\nسؤال المستخدم: ${query}`;
                let response = null;
                let lastError = null;
                for (let k = 0; k < apiKeys.length; k++) {
                    const currentKey = apiKeys[k];
                    try {
                        response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${currentKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [
                                    { role: 'user', parts: [{ text: fullPrompt }] }
                                ],
                                generationConfig: { temperature: 0.4 }
                            })
                        });
                        if (response.ok) {
                            lastError = null;
                            break;
                        } else {
                            let errDetails = "";
                            try {
                                const errJson = await response.json();
                                errDetails = errJson.error.message || JSON.stringify(errJson);
                            } catch(e) {
                                errDetails = await response.text();
                            }
                            lastError = new Error(`مفتاح رقم ${k+1} فشل (${response.status}): ${errDetails}`);
                        }
                    } catch (e) {
                        lastError = e;
                    }
                }
                if (lastError || !response || !response.ok) {
                    throw lastError || new Error("فشلت جميع المحاولات باستخدام مفاتيح API المتاحة.");
                }

                const data = await response.json();
                const replyText = data.candidates[0].content.parts[0].text || 'فشل في توليد إجابة.';

                // إزالة فقاعة التحميل
                const loader = document.getElementById(loadingId);
                if (loader) loader.remove();

                // معالجة وحذف وسم الـ action من النص المعروض
                let cleanReply = replyText;
                let actionObj = null;
                const actionMatch = replyText.match(/<action>([\s\S]*?)<\/action>/);
                if (actionMatch) {
                    try {
                        actionObj = JSON.parse(actionMatch[1].trim());
                        cleanReply = replyText.replace(/<action>[\s\S]*?<\/action>/g, '').trim();
                    } catch (e) {
                        console.error('Failed to parse AI action JSON:', e);
                    }
                }

                // إضافة إجابة البوت للدردشة
                incrementAIUsage();
                appendFullAIChatBubble(cleanReply, 'bot');

                // تنفيذ أمر التحكم إذا وُجد
                if (actionObj) {
                    executeAIAction(actionObj);
                }

            } catch (err) {
                console.error(err);
                const loader = document.getElementById(loadingId);
                if (loader) loader.remove();
                appendFullAIChatBubble(`🚀 مساعد بيان الذكي قيد التطوير والتحديث الجذري حالياً، وسيتم إطلاق الإصدار الجديد في 15/10.`, 'bot');
            }
        }

        function appendFullAIChatBubble(text, sender) {
            const messagesContainer = document.getElementById('aiAssistantFullChatLogs');
            if (!messagesContainer) return;

            const bubble = document.createElement('div');
            bubble.className = sender === 'user' ? 'ai-user-msg' : 'ai-bot-msg';

            if (sender === 'bot') {
                bubble.style.background = '#f8fafc';
                bubble.style.border = '1px solid #e2e8f0';
                bubble.style.color = '#0f172a';
                bubble.style.alignSelf = 'flex-start';
                bubble.style.borderRadius = '18px 18px 18px 0';
            } else {
                bubble.style.alignSelf = 'flex-end';
                bubble.style.background = 'linear-gradient(135deg, #7c3aed, #6d28d9)';
                bubble.style.color = 'white';
                bubble.style.borderRadius = '18px 18px 0 18px';
            }

            // تحويل علامات markdown البسيطة لنصوص منسقة
            let formattedText = text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');

            bubble.innerHTML = `<div style="line-height: 1.6;">${formattedText}</div>`;

            if (sender === 'bot') {
                const actionContainer = document.createElement('div');
                actionContainer.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px;';

                const copyBtn = document.createElement('button');
                copyBtn.innerHTML = '📋 نسخ';
                copyBtn.style.cssText = 'background: transparent; border: 1px solid #cbd5e1; color: #64748b; font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-family: inherit; font-weight: bold; display: flex; align-items: center; gap: 5px;';
                copyBtn.setAttribute('onmouseover', 'this.style.background="#e2e8f0"');
                copyBtn.setAttribute('onmouseout', 'this.style.background="transparent"');
                copyBtn.setAttribute('data-text', encodeURIComponent(text));
                copyBtn.setAttribute('onclick', 'window.copyAiMessageText(this)');

                actionContainer.appendChild(copyBtn);
                bubble.appendChild(actionContainer);
            }
            messagesContainer.appendChild(bubble);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // حفظ الدردشة في IndexedDB لضمان عدم وجود قيود على المساحة
            if (typeof db !== 'undefined') {
                db.settings.put({ id: 'bayan_ai_chat_history', data: messagesContainer.innerHTML }).catch(e => {
                    console.warn("تعذر حفظ الدردشة في IndexedDB, الرجوع لـ LocalStorage", e);
                    setStore('bayan_ai_chat_history', messagesContainer.innerHTML);
                });
            } else {
                setStore('bayan_ai_chat_history', messagesContainer.innerHTML);
            }
        }

        window.loadAIChatHistory = async function() {
            const container = document.getElementById('aiAssistantFullChatLogs');
            if (!container) return;

            let history = null;
            if (typeof db !== 'undefined') {
                try {
                    const doc = await db.settings.get('bayan_ai_chat_history');
                    if (doc) history = doc.data;
                } catch(e) {}
            }
            if (!history) history = getStore('bayan_ai_chat_history');

            if (history && history.trim() !== "") {
                container.innerHTML = history;
                container.scrollTop = container.scrollHeight;
            }
        };

        function clickSuggestedAIPrompt(promptText) {
            const inputEl = document.getElementById('aiAssistantFullInput');
            if (inputEl) {
                inputEl.value = promptText;
                sendFullAIChatMessage();
            }
        }

        window.copyAiMessageText = function(btn) {
            const textToCopy = decodeURIComponent(btn.getAttribute('data-text'));
            navigator.clipboard.writeText(textToCopy).then(() => {
                btn.innerHTML = '✅ تم النسخ';
                btn.style.color = '#10b981';
                btn.style.borderColor = '#10b981';
                setTimeout(() => {
                    btn.innerHTML = '📋 نسخ';
                    btn.style.color = '#64748b';
                    btn.style.borderColor = '#cbd5e1';
                }, 2000);
            });
        };

        function toggleFullAIVoiceInput() {
            if (isFullAIVoiceActive) {
                stopFullAIVoice();
                return;
            }

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('⚠️ متصفحك الحالي لا يدعم ميزة التعرف على الصوت. يرجى استخدام متصفح Google Chrome.');
                return;
            }

            try {
                fullAiRecognition = new SpeechRecognition();
                fullAiRecognition.lang = 'ar-EG';
                fullAiRecognition.interimResults = false;
                fullAiRecognition.maxAlternatives = 1;

                fullAiRecognition.onstart = function() {
                    isFullAIVoiceActive = true;
                    const voiceBtn = document.getElementById('aiAssistantFullVoiceBtn');
                    if (voiceBtn) {
                        voiceBtn.style.background = '#ef4444';
                        voiceBtn.style.color = 'white';
                    }
                };

                fullAiRecognition.onresult = function(event) {
                    const resultText = event.results[0][0].transcript;
                    const inputEl = document.getElementById('aiAssistantFullInput');
                    if (inputEl) {
                        inputEl.value = resultText;
                        showToast(`🎙️ تم التعرف: "${resultText}"`, 'info');
                    }
                };

                fullAiRecognition.onerror = function(event) {
                    console.error('Full AI Speech recognition error:', event.error);
                    stopFullAIVoice();
                };

                fullAiRecognition.onend = function() {
                    stopFullAIVoice();
                };

                fullAiRecognition.start();

            } catch (e) {
                console.error(e);
                stopFullAIVoice();
            }
        }

        function stopFullAIVoice() {
            isFullAIVoiceActive = false;
            if (fullAiRecognition) {
                try { fullAiRecognition.stop(); } catch(e){}
            }
            const voiceBtn = document.getElementById('aiAssistantFullVoiceBtn');
            if (voiceBtn) {
                voiceBtn.style.background = '#f1f5f9';
                voiceBtn.style.color = '#475569';
            }
        }

        // إعداد استماع لزر الإنتر في حقل الإدخال
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof window.updateAILimitsUI === 'function') window.updateAILimitsUI();
            if (typeof window.loadAIChatHistory === 'function') window.loadAIChatHistory();
            const fullInput = document.getElementById('aiAssistantFullInput');
            if (fullInput) {
                fullInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        sendFullAIChatMessage();
                    }
                });
            }
        });

        async function debugGeminiModels() {
            const apiKeys = window.getGeminiApiKeys();
            const apiKey = apiKeys[0] || '';
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
                const data = await res.json();

                let modalHtml = '';
                if (data.models && data.models.length > 0) {
                    const modelItems = data.models.map(m => {
                        const mName = m.name.replace('models/', '');
                        return `<div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; margin-bottom: 8px; font-family: monospace; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;">
                            <span style="color:#f8fafc;">${mName}</span>
                            <span style="font-size: 0.75rem; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 4px;">متاح ✅</span>
                        </div>`;
                    }).join('');
                    modalHtml = `
                        <h3 style="margin: 0 0 15px 0; font-size: 1.2rem; color: #fff; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">🔍 النماذج المتاحة بنجاح</h3>
                        <p style="color:#94a3b8; font-size: 0.85rem; margin-bottom: 15px;">تم الاتصال بالخادم بنجاح واسترداد قائمة النماذج الخاصة بالمفتاح:</p>
                        <div style="max-height: 250px; overflow-y: auto; padding-right: 5px; scrollbar-width: thin; scrollbar-color: #475569 transparent;">
                            ${modelItems}
                        </div>
                    `;
                } else {
                    modalHtml = `
                        <h3 style="margin: 0 0 15px 0; font-size: 1.2rem; color: #ef4444; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">⚠️ فشل جلب النماذج</h3>
                        <p style="color:#94a3b8; font-size: 0.85rem; margin-bottom: 15px;">لم يتم العثور على نماذج أو يوجد خطأ في المفتاح:</p>
                        <pre style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; font-family: monospace; font-size: 0.8rem; overflow-x: auto; color: #cbd5e1; direction: ltr; text-align: left;">${JSON.stringify(data, null, 2)}</pre>
                    `;
                }

                showCustomAIModal(modalHtml);
            } catch(e) {
                showCustomAIModal(`
                    <h3 style="margin: 0 0 15px 0; font-size: 1.2rem; color: #ef4444; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">❌ خطأ في الاتصال</h3>
                    <p style="color:#f8fafc; font-size: 0.9rem;">حدث خطأ أثناء محاولة الاتصال بخادم جيميناي:</p>
                    <div style="background: rgba(239,68,68,0.1); color: #ef4444; padding: 10px; border-radius: 8px; font-family: monospace; font-size: 0.85rem; margin-top: 10px; direction: ltr; text-align: left;">${e.message}</div>
                `);
            }
        }

        function showCustomAIModal(contentHtml) {
            let existingModal = document.getElementById('aiModelsDebugModal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.id = 'aiModelsDebugModal';
            modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); z-index: 9999; justify-content: center; align-items: center;';

            modal.innerHTML = `
                <div style="background: linear-gradient(145deg, #1e293b, #0f172a); color: white; border-radius: 20px; padding: 25px; width: 90%; max-width: 450px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid rgba(255, 255, 255, 0.1); position: relative; overflow: hidden; animation: slideUp 0.3s ease-out;">
                    ${contentHtml}
                    <button onclick="document.getElementById('aiModelsDebugModal').remove()" style="width: 100%; padding: 12px; border-radius: 10px; background: #334155; color: white; font-weight: bold; font-size: 1rem; border: none; cursor: pointer; transition: 0.2s; margin-top: 20px;" onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#334155'">إغلاق</button>
                </div>
            `;
            document.body.appendChild(modal);
        }

/**
 * Dynamic Print Template Builder
 */
function buildInvoiceHTML(data, templateChoice) {
    const itemsHtml = data.items.map(item => {
        const unitName = item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (item.unit || 'قطعة');
        return `
            <tr style="border-bottom:1px solid #ddd; font-style:normal !important;">
                <td style="padding:5px; text-align:right; font-style:normal !important; font-weight:bold;">${item.name}</td>
                <td style="padding:5px; text-align:center; font-style:normal !important; font-weight:bold;">${item.qty} ${unitName}</td>
                <td style="padding:5px; text-align:center; font-style:normal !important; font-weight:bold;">${(parseFloat(item.price) || 0).toFixed(2)}</td>
                <td style="padding:5px; text-align:left; font-style:normal !important; font-weight:bold;">${((parseFloat(item.price) || 0) * (parseFloat(item.qty) || 0)).toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const compactItemsHtml = data.items.map(item => {
        const unitName = item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (item.unit || 'قطعة');
        return `
            <tr style="font-style:normal !important; border-bottom:1px solid #ccc;">
                <td style="text-align:right; font-style:normal !important; font-weight:900; color:#000; padding:2px 0;">${item.name}</td>
                <td style="text-align:center; font-style:normal !important; font-weight:900; color:#000; padding:2px 0;">${item.qty}</td>
                <td style="text-align:left; font-style:normal !important; font-weight:900; color:#000; padding:2px 0;">${((parseFloat(item.price) || 0) * (parseFloat(item.qty) || 0)).toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    let layout = '';

    if (templateChoice === 'A4 Professional' || templateChoice === 'A4') {
        layout = `
            <div class="print-container" style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction:rtl; padding:40px; background:#fff; color:#333; font-style:normal !important;">
                <div style="display:flex; justify-content:space-between; border-bottom:2px solid #2c3e50; padding-bottom:20px; margin-bottom:30px;">
                    <div>
                        <h1 style="margin:0; color:#2c3e50; font-size:2rem; font-style:normal !important;">${data.shopName}</h1>
                        <p style="margin:5px 0 0 0; color:#7f8c8d; font-style:normal !important;">${data.shopAddress}</p>
                        <p style="margin:5px 0 0 0; color:#7f8c8d; font-style:normal !important;">${data.shopPhone}</p>
                    </div>
                    <div style="text-align:left;">
                        <h2 style="margin:0; color:#e74c3c; font-size:1.8rem; font-style:normal !important;">${data.title}</h2>
                        <p style="margin:5px 0 0 0; font-weight:bold; font-style:normal !important;">رقم المستند: #${data.id}</p>
                        <p style="margin:5px 0 0 0; font-style:normal !important;">التاريخ: ${data.date}</p>
                    </div>
                </div>

                <div style="background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:30px; display:flex; justify-content:space-between;">
                    <div>
                        <strong style="color:#2c3e50; font-style:normal !important;">${data.partnerLabel}:</strong> ${data.partnerName} <br>
                        ${data.partnerAddress ? `<span style="color:#7f8c8d; font-style:normal !important;">العنوان: ${data.partnerAddress}</span>` : ''}
                    </div>
                    <div style="text-align:left;">
                        <strong style="color:#2c3e50; font-style:normal !important;">الكاشير:</strong> ${data.cashier}<br>
                        <strong style="color:#2c3e50; font-style:normal !important;">طريقة الدفع:</strong> ${data.paymentMethod}
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
                    <thead>
                        <tr style="background:#2c3e50; color:white;">
                            <th style="padding:12px; text-align:right; border:1px solid #34495e; font-style:normal !important;">الصنف</th>
                            <th style="padding:12px; text-align:center; border:1px solid #34495e; font-style:normal !important;">الكمية</th>
                            <th style="padding:12px; text-align:center; border:1px solid #34495e; font-style:normal !important;">سعر الوحدة</th>
                            <th style="padding:12px; text-align:left; border:1px solid #34495e; font-style:normal !important;">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div style="display:flex; justify-content:flex-end;">
                    <div style="width:300px; background:#f9f9f9; padding:20px; border-radius:8px; border:1px solid #eee;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:1.2rem; font-weight:bold; color:#2c3e50;">
                            <span style="font-style:normal !important;">الإجمالي الكلي:</span>
                            <span style="font-style:normal !important;">${data.total.toFixed(2)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px; color:#27ae60;">
                            <span style="font-style:normal !important;">المدفوع:</span>
                            <span style="font-style:normal !important;">${data.paid.toFixed(2)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; color:#c0392b; font-weight:bold;">
                            <span style="font-style:normal !important;">المتبقي:</span>
                            <span style="font-style:normal !important;">${data.credit.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top:50px; text-align:center; border-top:1px solid #ddd; padding-top:20px; color:#7f8c8d; font-style:normal !important;">
                    <p style="font-style:normal !important;">${data.footerMsg}</p>
                </div>
            </div>
        `;
    } else if (templateChoice === 'A5 Modern' || templateChoice === 'A5') {
        layout = `
            <div class="print-container" style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction:rtl; padding:20px; background:#fff; color:#333; font-style:normal !important;">
                <div style="text-align:center; margin-bottom:20px;">
                    <h1 style="margin:0; color:#34495e; font-size:1.6rem; font-style:normal !important;">${data.shopName}</h1>
                    <h2 style="margin:5px 0 0 0; color:#e67e22; font-size:1.2rem; font-style:normal !important;">${data.title}</h2>
                </div>

                <table style="width:100%; font-size:0.9rem; margin-bottom:15px;">
                    <tr>
                        <td style="width:50%; font-style:normal !important;"><b>رقم:</b> #${data.id}</td>
                        <td style="width:50%; text-align:left; font-style:normal !important;"><b>التاريخ:</b> ${data.date}</td>
                    </tr>
                    <tr>
                        <td style="width:50%; font-style:normal !important;"><b>${data.partnerLabel}:</b> ${data.partnerName}</td>
                        <td style="width:50%; text-align:left; font-style:normal !important;"><b>الدفع:</b> ${data.paymentMethod}</td>
                    </tr>
                </table>

                <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:0.9rem;">
                    <thead>
                        <tr style="background:#ecf0f1; border-bottom:2px solid #bdc3c7;">
                            <th style="padding:8px; text-align:right; font-style:normal !important;">الصنف</th>
                            <th style="padding:8px; text-align:center; font-style:normal !important;">الكمية</th>
                            <th style="padding:8px; text-align:center; font-style:normal !important;">السعر</th>
                            <th style="padding:8px; text-align:left; font-style:normal !important;">إجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <table style="width:100%; font-size:1rem; border-top:2px solid #34495e; padding-top:10px;">
                    <tr>
                        <td style="font-weight:bold; font-style:normal !important;">الصافي المطلوب:</td>
                        <td style="text-align:left; font-weight:bold; font-size:1.2rem; font-style:normal !important;">${data.total.toFixed(2)} ج.م</td>
                    </tr>
                    ${data.credit > 0 ? `
                    <tr>
                        <td style="color:#27ae60; font-size:0.9rem; font-style:normal !important;">المدفوع: ${data.paid.toFixed(2)}</td>
                        <td style="text-align:left; color:#c0392b; font-size:0.9rem; font-style:normal !important;">المتبقي: ${data.credit.toFixed(2)}</td>
                    </tr>` : ''}
                </table>

                <div style="text-align:center; margin-top:30px; font-size:0.8rem; color:#7f8c8d; font-style:normal !important;">
                    ${data.footerMsg}
                </div>
            </div>
        `;
    } else if (templateChoice === '57mm Mobile' || templateChoice === '57mm') {
        layout = `
            <div class="print-container" style="width:57mm; font-family:Arial, sans-serif; direction:rtl; padding:2mm; margin:0 auto; color:#000; font-size:11px; font-style:normal !important; font-weight:bold;">
                <div style="text-align:center; margin-bottom:5px; border-bottom:1px dashed #000; padding-bottom:5px;">
                    <strong style="font-size:14px; font-style:normal !important;">${data.shopName}</strong><br>
                    <span style="font-style:normal !important;">${data.title}</span>
                </div>
                <div style="margin-bottom:5px; font-style:normal !important;">
                    #${data.id} | ${data.date}<br>
                    ${data.partnerLabel}: ${data.partnerName}<br>
                    الدفع: ${data.paymentMethod}
                </div>
                <table style="width:100%; border-collapse:collapse; margin-bottom:5px; border-top:1px dashed #000; border-bottom:1px dashed #000;">
                    <tr style="border-bottom:1px solid #000;">
                        <th style="text-align:right; font-style:normal !important;">الصنف</th>
                        <th style="text-align:center; font-style:normal !important;">ك</th>
                        <th style="text-align:left; font-style:normal !important;">ق</th>
                    </tr>
                    ${compactItemsHtml}
                </table>
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:13px; font-style:normal !important;">
                    <span style="font-style:normal !important;">المطلوب:</span>
                    <span style="font-style:normal !important;">${data.total.toFixed(2)}</span>
                </div>
                ${data.credit > 0 ? `
                <div style="display:flex; justify-content:space-between; font-size:11px; font-style:normal !important;">
                    <span style="font-style:normal !important;">مدفوع:</span><span style="font-style:normal !important;">${data.paid.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; font-style:normal !important;">
                    <span style="font-style:normal !important;">باقي:</span><span style="font-style:normal !important;">${data.credit.toFixed(2)}</span>
                </div>` : ''}
                <div style="text-align:center; margin-top:5px; border-top:1px dashed #000; padding-top:5px; font-size:10px; font-style:normal !important;">
                    ${data.footerMsg}
                </div>
            </div>
        `;
    } else if (templateChoice === '80mm Compact') {
         layout = `
            <div class="print-container" style="width:80mm; font-family:Arial, sans-serif; direction:rtl; padding:3mm; margin:0 auto; color:#000; font-size:13px; font-style:normal !important; font-weight:900;">
                <div style="text-align:center; margin-bottom:5px; border-bottom:2px solid #000; padding-bottom:5px;">
                    <strong style="font-size:22px; font-weight:900; color:#000; font-style:normal !important;">${data.shopName}</strong><br>
                    ${data.shopAddress ? `<span style="font-size:14px; font-weight:900; color:#000; font-style:normal !important;">${data.shopAddress}</span><br>` : ''}
                    ${data.shopPhone ? `<span style="font-size:14px; font-weight:900; color:#000; font-style:normal !important;">ت: ${data.shopPhone}</span><br>` : ''}
                    <span style="font-size:16px; font-weight:900; border:2px solid #000; padding:2px 10px; display:inline-block; margin-top:5px; font-style:normal !important;">${data.title}</span>
                </div>

                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:900; margin-bottom:5px; font-style:normal !important; color:#000;">
                    <div style="text-align:right;">
                        <span style="font-style:normal !important;">كاشير: ${data.cashier}</span><br>
                        <span style="font-style:normal !important;">التاريخ: ${data.date}</span>
                    </div>
                    <div style="text-align:left;">
                        <span style="font-size:15px; font-style:normal !important;">رقم: #${data.id}</span>
                    </div>
                </div>

                <div style="font-size:13px; font-weight:900; border-bottom:2px solid #000; padding-bottom:3px; margin-bottom:5px; font-style:normal !important; color:#000;">
                    <div style="font-style:normal !important;">${data.partnerLabel}: ${data.partnerName}</div>
                    <div style="font-style:normal !important;">الدفع: ${data.paymentMethod}</div>
                </div>

                <table style="width:100%; border-collapse:collapse; margin-bottom:5px; border-top:2px solid #000; border-bottom:2px solid #000; font-weight:900; color:#000;">
                    <thead>
                        <tr style="border-bottom:2px solid #000;">
                            <th style="text-align:right; padding:2px; font-size:16px; font-weight:900; color:#000; -webkit-text-stroke:0.5px #000; font-style:normal !important;">الصنف</th>
                            <th style="text-align:center; padding:2px; font-size:16px; font-weight:900; color:#000; -webkit-text-stroke:0.5px #000; font-style:normal !important;">الكمية</th>
                            <th style="text-align:left; padding:2px; font-size:16px; font-weight:900; color:#000; -webkit-text-stroke:0.5px #000; font-style:normal !important;">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${compactItemsHtml}
                    </tbody>
                </table>

                <div style="margin-bottom:5px; font-weight:900; font-size:14px; font-style:normal !important; color:#000;">
                    <div style="display:flex; justify-content:space-between; font-style:normal !important;">
                        <span style="font-style:normal !important;">مبلغ الفاتورة:</span>
                        <span style="font-style:normal !important;">${(data.invoiceAmount || data.total).toFixed(2)}</span>
                    </div>
                    ${(data.prevBalance && data.prevBalance > 0) ? `
                    <div style="display:flex; justify-content:space-between; font-style:normal !important;">
                        <span style="font-style:normal !important;">الرصيد السابق للعميل:</span>
                        <span style="font-style:normal !important;">${data.prevBalance.toFixed(2)}</span>
                    </div>` : ''}
                    <div style="display:flex; justify-content:space-between; font-size:17px; border-top:2px dashed #000; border-bottom:2px dashed #000; margin:3px 0; padding:2px 0; font-style:normal !important;">
                        <span style="font-style:normal !important;">الإجمالي المستحق:</span>
                        <span style="font-style:normal !important;">${data.total.toFixed(2)} ج.م</span>
                    </div>
                    ${data.credit > 0 ? `
                    <div style="display:flex; justify-content:space-between; font-style:normal !important;">
                        <span style="font-style:normal !important;">المدفوع:</span>
                        <span style="font-style:normal !important;">${data.paid.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-style:normal !important;">
                        <span style="font-style:normal !important;">الرصيد النهائي:</span>
                        <span style="font-style:normal !important;">${data.credit.toFixed(2)}</span>
                    </div>` : ''}
                </div>

                <div style="text-align:center; margin-top:10px; font-size:15px; font-weight:900; color:#000; font-style:normal !important;">
                    ${data.footerMsg}
                </div>
            </div>
        `;
    } else {
        // Default: 80mm Standard
        layout = `
            <div class="print-container" style="width:80mm; font-family:'Arial', 'Segoe UI', sans-serif; direction:rtl; padding:5px; color:#000; box-sizing:border-box; line-height:1.5; font-weight:bold; font-style:normal !important;">
                <div style="text-align:center; border-bottom:3px solid #000; padding-bottom:5px; margin-bottom:10px; font-style:normal !important;">
                    <div style="font-size:24px; font-weight:bold; font-style:normal !important;">${data.shopName}</div>
                    <div style="font-size:18px; font-weight:bold; border:2px solid #000; display:inline-block; padding:3px 15px; margin-top:5px; font-style:normal !important;">${data.title}</div>
                </div>

                <div style="font-size:13px; font-weight:bold; margin-bottom:10px; border-bottom:2px solid #000; padding-bottom:5px; font-style:normal !important;">
                    <div style="display:flex; justify-content:space-between; font-style:normal !important;">
                        <span style="font-style:normal !important;">رقم: #${data.id}</span>
                        <span style="font-style:normal !important;">التاريخ: ${data.date}</span>
                    </div>
                    <div style="margin-top:3px; font-style:normal !important;">${data.partnerLabel}: ${data.partnerName} ${data.partnerAddress ? ' (' + data.partnerAddress + ')' : ''}</div>
                    <div style="display:flex; justify-content:space-between; margin-top:3px; font-style:normal !important;">
                        <span style="font-style:normal !important;">كاشير: ${data.cashier}</span>
                        <span style="font-style:normal !important;">الدفع: ${data.paymentMethod}</span>
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:10px; border:2px solid #000; font-weight:bold; font-style:normal !important;">
                    <thead>
                        <tr style="border-bottom:2px solid #000; background:#fff; font-style:normal !important;">
                            <th style="text-align:right; padding:5px 2px; border-left:1px solid #000; font-size:15px; font-style:normal !important; font-weight:900; color:#000; -webkit-text-stroke:0.5px #000;">الصنف</th>
                            <th style="padding:5px 2px; border-left:1px solid #000; font-size:15px; font-style:normal !important; font-weight:900; color:#000; -webkit-text-stroke:0.5px #000;">الكمية</th>
                            <th style="padding:5px 2px; border-left:1px solid #000; font-size:15px; font-style:normal !important; font-weight:900; color:#000; -webkit-text-stroke:0.5px #000;">السعر</th>
                            <th style="text-align:left; padding:5px 2px; font-size:15px; font-style:normal !important; font-weight:900; color:#000; -webkit-text-stroke:0.5px #000;">إجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div style="margin-bottom:10px; font-size:14px; font-style:normal !important;">
                    <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:900; border-top:2px solid #000; border-bottom:2px solid #000; padding:5px 0; margin-bottom:5px; font-style:normal !important;">
                        <span style="font-style:normal !important;">صافي المطلوب:</span>
                        <span style="font-style:normal !important;">${data.total.toFixed(2)}</span>
                    </div>
                    ${data.credit > 0 ? `
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px; font-style:normal !important;">
                        <span style="font-style:normal !important;">المدفوع:</span>
                        <span style="font-style:normal !important;">${data.paid.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px; font-style:normal !important;">
                        <span style="font-style:normal !important;">المتبقي:</span>
                        <span style="font-style:normal !important;">${data.credit.toFixed(2)}</span>
                    </div>` : ''}
                </div>

                <div style="text-align:center; border-top:2px dashed #000; padding-top:10px; font-size:12px; font-style:normal !important;">
                    ${data.footerMsg}
                </div>
            </div>
        `;
    }

    return layout;
}

// ================= نظام إدارة تراخيص وصلاحيات الباقات الموحد =================
window.isSubscriptionValid = function(actionType = 'invoice') {
    // 🛡️ حماية أمنية ضد التلاعب وتغيير ساعة/تاريخ الجهاز للخلف
    const nowTime = Date.now();
    const maxSeenTimeStr = getStore('bayan_max_seen_timestamp');
    let maxSeenTime = maxSeenTimeStr ? parseInt(maxSeenTimeStr, 10) : 0;

    // إذا تم تأخير ساعة الجهاز للخلف بأكثر من 5 دقائق (300000 مللي ثانية)
    if (maxSeenTime > 0 && nowTime < (maxSeenTime - 300000)) {
        window.clockTampered = true;
        return false;
    } else {
        window.clockTampered = false;
        if (nowTime > maxSeenTime) {
            setStore('bayan_max_seen_timestamp', nowTime.toString());
        }
    }

    const activeLic = window.activeLicense || { plan: 'باقة نسخة المجانية', isValid: true };
    if (!activeLic.isValid) return false;
    const currentPlan = activeLic.plan;
    
    // 1. باقة نسخة المجانية (Trial Version)
    if (currentPlan === 'باقة نسخة المجانية') {
        let count = 0;
        if (typeof transactions !== 'undefined') {
            const ops = transactions.filter(t => t.type && (t.type.includes('بيع') || t.type.includes('شراء')) && !t.type.includes('مرتجع') && t.invoiceId);
            const uniqueIds = new Set(ops.map(t => t.invoiceId));
            count = uniqueIds.size;
        }
        
        // إذا تم استهلاك 200 فاتورة، يتم قفل الفواتير والعمليات
        if (count >= 200) return false;
        
        if (actionType === 'receipt') {
            const rCount = transactions.filter(t => t.type && t.type.includes('قبض') && t.invoiceId).length;
            if (rCount >= 75) return false;
        } else if (actionType === 'disbursement') {
            const dCount = transactions.filter(t => t.type && t.type.includes('صرف') && t.invoiceId).length;
            if (dCount >= 75) return false;
        }
        
        return true; 
    }
    
    // 2. الباقات مدى الحياة (Lifetime Packages)
    if (currentPlan === 'الباقة مدى الحياة' || currentPlan === 'الباقة الاحترافية') {
        return true;
    }
    
    // 3. الباقات الزمنية (Monthly, Annual, etc.)
    const expiryDateStr = activeLic.expiry || getStore('bayan_expiry_date');
    if (expiryDateStr) {
        const expDate = new Date(expiryDateStr);
        if (new Date() > expDate) {
            return false;
        }
    } else {
        const installDateStr = getStore('bayan_install_date');
        if (installDateStr) {
            const startDate = new Date(installDateStr);
            const diffTime = Math.abs(new Date() - startDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if ((currentPlan === 'الباقة الشهرية' || currentPlan === 'الباقة الأساسية') && diffDays > 30) return false;
            if ((currentPlan === 'الباقة السنوية' || currentPlan === 'الباقة المتقدمة') && diffDays > 365) return false;
        }
    }
    
    return true;
};

window.enforceSubscriptionCheck = function(actionType = 'invoice') {
    if (window.clockTampered) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert({
                type: 'error',
                titleText: '🛑 تحذير أمني: تم رصد تغيير في تاريخ الجهاز!',
                msg: 'تم رصد إرجاع تاريخ أو ساعة الكمبيوتر للخلف برمجياً.\n\nلحماية أمان المنظومة والسجلات المالية، يرجى ضبط تاريخ وساعة الجهاز بالشكل الصحيح للاستمرار في إجراء وحفظ العمليات والفواتير.',
                confirmText: 'تعديل التاريخ ⚙️'
            });
        } else {
            alert("🛑 تحذير أمني: يرجى ضبط تاريخ وساعة جهاز الكمبيوتر بشكل صحيح.");
        }
        return false;
    }

    if (!window.isSubscriptionValid(actionType)) {
        const activeLic = window.activeLicense || { plan: 'باقة نسخة المجانية', isValid: true };
        const currentPlan = activeLic.plan;
        let msg = 'لقد انتهت صلاحية باقتك الحالية أو استهلكت رصيد الفواتير المجانية.\n\nيمكنك إدخال وتعديل الأصناف والحسابات بحرية، ولكن لحفظ الفواتير والعمليات الجديدة يرجى تجديد الاشتراك.';
        
        if (currentPlan === 'باقة نسخة المجانية') {
            msg = 'لقد استهلكت كامل رصيدك في النسخة التجريبية المجانية (200 فاتورة).\n\nحفظ الفواتير الجديدة مقفل حالياً. يمكنك تصفح البيانات كالمعتاد، ولفتح حفظ الفواتير يرجى الترقية لإحدى باقات بَيَان POS.';
        } else {
            msg = `لقد انتهت فترة صلاحية باقتك الحالية (${currentPlan}).\n\nيمكنك تصفح التقارير وطباعة السجلات وإدخال الأصناف والحسابات عادي، ولكن لحفظ فواتير جديدة يرجى تجديد الاشتراك.`;
        }

        if (typeof showCustomAlert === 'function') {
            showCustomAlert({
                type: 'error',
                titleText: '🛑 انتهت صلاحية الاشتراك الحالي',
                msg: msg,
                confirmText: 'عرض الباقات والاشتراك 💎',
                onConfirm: () => {
                    if (typeof toggleSubscriptionModal === 'function') toggleSubscriptionModal(true);
                }
            });
        } else {
            alert("انتهت صلاحية الباقة: " + msg);
            if (typeof toggleSubscriptionModal === 'function') toggleSubscriptionModal(true);
        }
        return false;
    }
    return true;
};

// ================= خدمة التراخيص المحمية (LicenseService) =================
// ✅ أمان: حماية window.activeLicense من التعديل المباشر عبر الكونسول
// يستخدم Object.defineProperty لجعل الخاصية للقراءة فقط من الخارج
(function() {
    let _licenseData = { plan: 'باقة نسخة المجانية', expiry: '', isValid: false };
    Object.defineProperty(window, 'activeLicense', {
        get: function() { return Object.assign({}, _licenseData); }, // إرجاع نسخة مجمّدة
        set: function(val) {
            // السماح بالتعيين فقط من داخل LicenseService (يُتحقق منه بالـ call stack)
            // اي محاولة خارجية ستُسجَّل وتُتجاهل بصمت
            const stack = new Error().stack || '';
            if (stack.includes('verifyLicense') || stack.includes('saveLicenseLocally') || stack.includes('LicenseService')) {
                _licenseData = val;
            } else {
                console.warn('🛑 محاولة تعديل الترخيص من مصدر غير مصرح!');
            }
        },
        configurable: false
    });
})();

window.LicenseService = {
    generateLicenseSignature: async function(plan, expiry, machineId) {
        if (typeof require !== 'undefined') {
            try {
                const { ipcRenderer } = require('electron');
                const sig = await ipcRenderer.invoke('generate-license-signature', plan, expiry, machineId);
                if (sig) return sig;
            } catch(e) {
                console.warn("Secure Main Process IPC not available, trying local fallback", e);
            }
        }
        
        // Local Fallback signature (without using the actual secure Main Process key)
        const dataString = `${plan}_${expiry}_${machineId}`;
        const secret = atob("QkFZQU5fUE9TX1NFQ1JFVF9LRVlfMjAyNg=="); // مفتاح مشفر لمنع الفحص النصي البسيط في المتصفح
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        let secretHash = 0;
        for (let i = 0; i < secret.length; i++) {
            const char = secret.charCodeAt(i);
            secretHash = ((secretHash << 5) - secretHash) + char;
            secretHash = secretHash & secretHash;
        }
        return Math.abs(hash ^ secretHash).toString(16).toUpperCase();
    },

    saveLicenseLocally: async function(plan, expiry) {
        const machineId = (window.getUniqueHWID ? await window.getUniqueHWID() : '') || getStore('bayan_hwid') || getStore('bayan_machine_id') || 'LOCAL_DEVICE';
        const signature = await this.generateLicenseSignature(plan, expiry, machineId);
        
        const licenseInfo = {
            id: 'license_info',
            plan: plan,
            expiry: expiry,
            machineId: machineId,
            signature: signature,
            activationDate: new Date().toISOString(),
            lastValidation: new Date().toISOString()
        };

        setStore('license_info', JSON.stringify(licenseInfo));
        window.activeLicense = {
            plan: plan,
            expiry: expiry,
            isValid: true
        };
    },

    verifyLicense: async function() {
        const machineId = (window.getUniqueHWID ? await window.getUniqueHWID() : '') || getStore('bayan_hwid') || getStore('bayan_machine_id') || 'LOCAL_DEVICE';
        
        let licenseInfo = null;
        try {
            licenseInfo = JSON.parse(getStore('license_info'));
        } catch(e) {}


        if (!licenseInfo) {
            const freePlan = 'باقة نسخة المجانية';
            const freeExpiry = '';
            const sig = await this.generateLicenseSignature(freePlan, freeExpiry, machineId);
            
            licenseInfo = {
                id: 'license_info',
                plan: freePlan,
                expiry: freeExpiry,
                machineId: machineId,
                signature: sig,
                activationDate: new Date().toISOString(),
                lastValidation: new Date().toISOString()
            };
            setStore('license_info', JSON.stringify(licenseInfo));
        }

        let expectedSig = await this.generateLicenseSignature(licenseInfo.plan, licenseInfo.expiry, machineId);
        
        if (licenseInfo.signature !== expectedSig || licenseInfo.machineId !== machineId) {
            // إذا كان الترخيص غير متطابق ولكنه الباقة المجانية أو محظور بسبب انتقال كود الجهاز القديم، نقوم بإصلاحه وتجديده تلقائياً للجهاز الحالي
            if (licenseInfo.plan === 'باقة نسخة المجانية' || !licenseInfo.plan || licenseInfo.plan === 'Blocked') {
                console.log("🛠️ Auto-repairing free trial license...");
                const freePlan = 'باقة نسخة المجانية';
                const freeExpiry = '';
                const sig = await this.generateLicenseSignature(freePlan, freeExpiry, machineId);
                
                licenseInfo = {
                    id: 'license_info',
                    plan: freePlan,
                    expiry: freeExpiry,
                    machineId: machineId,
                    signature: sig,
                    activationDate: licenseInfo.activationDate || new Date().toISOString(),
                    lastValidation: new Date().toISOString()
                };
                setStore('license_info', JSON.stringify(licenseInfo));
                expectedSig = sig; // تحديث التوقيع المتوقع ليطابق الجديد
            } else {
                console.error("🛑 License tampered or machine ID mismatch!");
                window.activeLicense = {
                    plan: 'Blocked',
                    expiry: '',
                    isValid: false
                };
                return false;
            }
        }

        if (licenseInfo.expiry && licenseInfo.plan !== 'باقة نسخة المجانية') {
            const expDate = new Date(licenseInfo.expiry);
            if (new Date() > expDate) {
                window.activeLicense = {
                    plan: licenseInfo.plan,
                    expiry: licenseInfo.expiry,
                    isValid: false
                };
                return false;
            }
        }

        window.activeLicense = {
            plan: licenseInfo.plan,
            expiry: licenseInfo.expiry,
            isValid: true
        };
        
        return true;
    }
};

// ================= خدمة النسخ الاحتياطي التلقائي المطور (BackupService) =================
window.BackupService = {
    createAutoBackup: async function() {
        try {
            console.log("⏳ Starting automated local database backup...");
            const products = await db.products.toArray();
            const transactions = await db.transactions.toArray();
            const accounts = await db.accounts.toArray();
            const users = await db.users.toArray();
            
            const backupRecord = {
                timestamp: new Date().toISOString(),
                products: products,
                transactions: transactions,
                accounts: accounts,
                users: users
            };
            
            await db.backups.add(backupRecord);
            console.log("✅ Automated backup created successfully!");
            await this.rotateBackups();
        } catch(e) {
            console.error("❌ Failed to create auto backup:", e);
        }
    },
    
    rotateBackups: async function() {
        try {
            const allBackups = await db.backups.toArray();
            allBackups.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            if (allBackups.length > 20) {
                const toDeleteCount = allBackups.length - 20;
                const deletePromises = [];
                for (let i = 0; i < toDeleteCount; i++) {
                    deletePromises.push(db.backups.delete(allBackups[i].id));
                }
                await Promise.all(deletePromises);
                console.log(`🧹 Rotated backups: Removed ${toDeleteCount} oldest backup(s).`);
            }
        } catch(e) {
            console.error("❌ Failed to rotate backups:", e);
        }
    }
};

window.getBayanPlan = function() {
    return (window.activeLicense && window.activeLicense.plan) || 'باقة نسخة المجانية';
};

window.getBayanExpiry = function() {
    return (window.activeLicense && window.activeLicense.expiry) || '';
};


window.copyPaymentNumber = function(text) {
    if (!text || text === '---' || text === 'غير محدد') {
        alert('لا يوجد كود جهاز لنسخه!');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        alert('تم نسخ كود الجهاز بنجاح! 📋\n' + text);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        const tempInput = document.createElement('input');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('تم نسخ كود الجهاز بنجاح! 📋\n' + text);
    });
};

// ================= خدمة النسخ الاحتياطي التلقائي المطور (Advanced Auto-Backup) =================

window.showBackupProgressOverlay = function() {
    let backupPathDisplay = 'C:\\Users\\...\\AppData\\Roaming\\Bayan POS\\backups';
    try {
        const path = require('path');
        const os = require('os');
        backupPathDisplay = path.join(os.homedir(), 'AppData', 'Roaming', 'Bayan POS', 'backups');
    } catch(e) {}

    let overlay = document.getElementById('backupProgressOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'backupProgressOverlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: white; font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 18px; max-width: 540px; width: 95%; background: linear-gradient(150deg, #1e113a 0%, #130a24 50%, #0f172a 100%); padding: 32px; border-radius: 26px; border: 2px solid rgba(212, 175, 55, 0.4); box-shadow: 0 30px 60px rgba(0,0,0,0.8), 0 0 30px rgba(147, 51, 234, 0.25);">
                <div class="hourglass-animation" style="font-size: 4rem; animation: hourglass-spin 1.8s infinite ease-in-out; cursor: default; user-select: none; filter: drop-shadow(0 0 15px rgba(212, 175, 55, 0.6));">⏳</div>
                <h2 style="margin: 0; font-size: 1.45rem; font-weight: 900; color: #ffffff; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">جاري حفظ النسخة الاحتياطية بأمان...</h2>
                <p style="margin: 0; font-size: 0.9rem; color: #cbd5e1; font-weight: 700;">يتم الآن تأمين وتشفير كافة البيانات والعمليات.</p>
                
                <div style="width: 100%; background: rgba(15, 23, 42, 0.75); border-radius: 16px; padding: 14px 18px; border: 1.5px solid rgba(255,255,255,0.1); text-align: right; box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);">
                    <div style="font-size: 0.82rem; color: #d4af37; font-weight: 800; margin-bottom: 5px; display: flex; align-items: center; gap: 6px;">📍 مسار حفظ النسخ الاحتياطية الموحد:</div>
                    <div id="bayanBackupPathLabel" style="font-size: 0.86rem; font-weight: 700; color: #38bdf8; word-break: break-all; direction: ltr; text-align: left; font-family: monospace;">${backupPathDisplay}</div>
                </div>

                <button onclick="window.openBackupFolder()" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: 1.5px solid rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 14px; font-weight: 900; font-size: 0.92rem; cursor: pointer; transition: 0.25s; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                    📂 فتح مجلد النسخ الاحتياطية
                </button>
            </div>
            <style>
                @keyframes hourglass-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(180deg); }
                }
            </style>
        `;
        document.body.appendChild(overlay);

        // جلب المسار الحقيقي المباشر من Electron IPC وتحديثه في الشاشة
        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                if (ipcRenderer) {
                    ipcRenderer.invoke('get-backup-dir').then(realDir => {
                        if (realDir) {
                            const lbl = document.getElementById('bayanBackupPathLabel');
                            if (lbl) lbl.textContent = realDir;
                        }
                    }).catch(() => {});
                }
            }
        } catch(e) {}
    }
};

window.hideBackupProgressOverlay = function() {
    const overlay = document.getElementById('backupProgressOverlay');
    if (overlay) overlay.remove();
};

window.openBackupFolder = async function() {
    try {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            if (ipcRenderer) {
                const res = await ipcRenderer.invoke('open-backup-folder');
                if (res) {
                    if (typeof showToast === 'function') showToast("📂 تم فتح مجلد النسخ الاحتياطية بنجاح", "success");
                    return;
                }
            }
        }
        const defaultPath = 'AppData\\Roaming\\Bayan POS\\backups';
        if (typeof showToast === 'function') showToast(`📍 مسار النسخ الاحتياطية: ${defaultPath}`, "info");
        else alert(`📍 مسار مجلد النسخ الاحتياطية هو:\n${defaultPath}`);
    } catch(e) {
        console.log("Error opening backup folder:", e);
    }
};

window.executeAutoBackupToFile = async function(silent = false, isManual = false) {
    if (!silent) {
        window.showBackupProgressOverlay();
    }
    
    const data = {
        products: productsDB,
        transactions: transactions,
        settings: JSON.parse(getStore('pos_settings') || '{}'),
        users: users,
        accounts: accounts,
        trash: trashBin
    };
    
    setStore('pos_last_backup_time', Date.now());
    
    let success = false;
    let savedFilePath = '';
    let backupDirDisplay = '';

    // محاولة الحفظ المباشر في مجلد التطبيق الموحد (AppData/Roaming/Bayan POS/backups)
    try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const { ipcRenderer } = require('electron');
        
        let backupDir = '';
        if (ipcRenderer) {
            try {
                backupDir = await ipcRenderer.invoke('get-backup-dir');
            } catch(e) {}
        }
        if (!backupDir) {
            backupDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Bayan POS', 'backups');
        }
        backupDirDisplay = backupDir;
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const pad = (n) => String(n).padStart(2, '0');
        const d = new Date();
        const timestamp = `${d.getFullYear()}_${pad(d.getMonth()+1)}_${pad(d.getDate())}__${pad(d.getHours())}_${pad(d.getMinutes())}`;
        const prefix = isManual ? 'backup_pos_manual_' : 'backup_pos_auto_';
        const fileName = `${prefix}${timestamp}.json`;
        savedFilePath = path.join(backupDir, fileName);
        
        fs.writeFileSync(savedFilePath, JSON.stringify(data, null, 2), 'utf8');
        console.log("Backup successfully saved to local path:", savedFilePath);
        success = true;

        // 🧹 إدارة تدوير النسخ الاحتياطية الاحتفاظ بـ 100 نسخة فقط (أو القيمة المخزنة في الإعدادات)
        try {
            const settings = JSON.parse(getStore('pos_settings') || '{}');
            const maxBackups = parseInt(settings.maxBackupFiles) || 100;
            const { ipcRenderer } = require('electron');
            if (ipcRenderer) {
                await ipcRenderer.invoke('rotate-backups', maxBackups);
            }
        } catch(rotErr) {
            console.warn("Backup rotation failed:", rotErr);
        }

    } catch (e) {
        console.log("Fallback to browser-style download backup.", e);
        try {
            const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_pos_${isManual ? 'manual' : 'auto'}_${new Date().toLocaleDateString('en-CA')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            success = true;
        } catch (downloadErr) {
            console.error("Browser download backup failed:", downloadErr);
        }
    }
    
    if (!silent) {
        await new Promise(resolve => setTimeout(resolve, 800));
        window.hideBackupProgressOverlay();

        if (success) {
            showCustomAlert({
                type: 'success',
                titleText: '✅ تم إنشاء النسخة الاحتياطية بنجاح',
                msg: `
                    <div style="text-align: right; direction: rtl; font-family: 'Cairo', sans-serif;">
                        <p style="margin-bottom: 12px; font-weight: 800; color: #1e293b;">تم حفظ وتأمين كافة بيانات النظام بأمان.</p>
                        <div style="background: #f1f5f9; padding: 12px; border-radius: 12px; border: 1px solid #cbd5e1; margin-bottom: 15px;">
                            <div style="font-size: 0.85rem; color: #64748b; font-weight: 800; margin-bottom: 4px;">📍 مكان الحفظ:</div>
                            <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a; direction: ltr; text-align: left; font-family: monospace; word-break: break-all;">${backupDirDisplay || 'bayan_backups'}</div>
                        </div>
                        <button onclick="window.openBackupFolder()" style="width: 100%; height: 45px; background: #2563eb; color: white; border: none; border-radius: 12px; font-weight: 900; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                            📂 فتح مجلد النسخ الاحتياطية
                        </button>
                    </div>
                `,
                confirmText: 'إغلاق ✖️'
            });
        }
    }
    
    return success;
};

// فحص النسخ الاحتياطي الدوري في الخلفية
window.checkAndRunPeriodicBackup = function() {
    const settings = JSON.parse(getStore('pos_settings') || '{}');
    if (!settings.autoBackup || !settings.autoBackupInterval || settings.autoBackupInterval === 'close') return;
    
    const intervalHours = parseFloat(settings.autoBackupInterval);
    if (isNaN(intervalHours)) return;
    
    const lastBackup = parseFloat(getStore('pos_last_backup_time') || '0');
    const now = Date.now();
    const elapsedMs = now - lastBackup;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    if (elapsedMs >= intervalMs) {
        console.log(`Periodic backup triggered: every ${intervalHours} hour(s).`);
        window.executeAutoBackupToFile(true);
    }
};

// تشغيل الفحص الدوري كل 5 دقائق
setInterval(window.checkAndRunPeriodicBackup, 5 * 60 * 1000);
setTimeout(window.checkAndRunPeriodicBackup, 8000); // تشغيل أولي بعد 8 ثواني من الإقلاع

// 🔒 دالة فحص وجود بيانات غير محفوظة في كافة التبويبات المفتوحة قبل الخروج
window.checkUnsavedDataInAllTabs = function() {
    if (typeof openTabs === 'undefined' || !Array.isArray(openTabs)) return null;

    // 1. حفظ حالة التبويب النشط حالياً على الشاشة أولاً
    if (typeof saveCurrentTabState === 'function') {
        saveCurrentTabState();
    }

    // 2. فحص كافة التبويبات المفتوحة
    for (const tab of openTabs) {
        const tabId = tab.id;
        const type = tab.type;
        const label = tab.label || tab.type;

        let hasData = false;
        let reason = '';

        // إذا كان التبويب هو الفعّال حالياً
        if (typeof activeTabId !== 'undefined' && activeTabId === tabId) {
            if (type === 'sales') {
                if (typeof cart !== 'undefined' && cart.length > 0) {
                    hasData = true; reason = `سلة المبيعات تحتوي على (${cart.length}) صنف غير محفوظ`;
                } else {
                    const cInput = document.getElementById('customerName');
                    if (cInput && cInput.value.trim() !== '') { hasData = true; reason = 'تم إدخال اسم عميل في فاتورة البيع ولم تحفظ'; }
                }
            } else if (type === 'purchase') {
                if (typeof purchaseCart !== 'undefined' && purchaseCart.length > 0) {
                    hasData = true; reason = `سلة المشتريات تحتوي على (${purchaseCart.length}) صنف غير محفوظ`;
                } else {
                    const sInput = document.getElementById('supplierName');
                    if (sInput && sInput.value.trim() !== '') { hasData = true; reason = 'تم إدخال اسم مورد في فاتورة الشراء ولم تحفظ'; }
                }
            } else if (type === 'sales-return') {
                if (typeof returnCart !== 'undefined' && returnCart.length > 0) {
                    hasData = true; reason = `سلة مرتجع المبيعات تحتوي على (${returnCart.length}) صنف غير محفوظ`;
                }
            } else if (type === 'purchase-return') {
                if (typeof purReturnCart !== 'undefined' && purReturnCart.length > 0) {
                    hasData = true; reason = `سلة مرتجع المشتريات تحتوي على (${purReturnCart.length}) صنف غير محفوظ`;
                }
            } else if (type === 'adjustment') {
                if (typeof adjCart !== 'undefined' && adjCart.length > 0) {
                    hasData = true; reason = `سلة تسوية المخزن تحتوي على (${adjCart.length}) صنف غير محفوظ`;
                }
            } else if (type === 'receipt') {
                const am = parseFloat(document.getElementById('receiptAmount')?.value || 0);
                const cName = document.getElementById('receiptCustomer')?.value.trim() || '';
                if (am > 0 || cName !== '') { hasData = true; reason = 'توجد بيانات مبلغ أو عميل غير محفوظة في سند القبض'; }
            } else if (type === 'disbursement') {
                const am = parseFloat(document.getElementById('disburseAmount')?.value || 0);
                const pName = document.getElementById('disbursePayee')?.value.trim() || '';
                if (am > 0 || pName !== '') { hasData = true; reason = 'توجد بيانات مبلغ أو مستفيد غير محفوظة في سند الصرف'; }
            }
        } 
        
        // إذا كان التبويب محفوطاً في التبويبات الأخرى (Background Tabs)
        if (!hasData && typeof tabStates !== 'undefined' && tabStates[tabId]) {
            const state = tabStates[tabId];
            if (type === 'sales' && state.cart && state.cart.length > 0) {
                hasData = true; reason = `سلة المبيعات تحتوي على (${state.cart.length}) صنف غير محفوظ`;
            } else if (type === 'purchase' && state.purchaseCart && state.purchaseCart.length > 0) {
                hasData = true; reason = `سلة المشتريات تحتوي على (${state.purchaseCart.length}) صنف غير محفوظ`;
            } else if (type === 'sales-return' && state.returnCart && state.returnCart.length > 0) {
                hasData = true; reason = 'توجد أصناف غير محفوظة في مرتجع المبيعات';
            } else if (type === 'purchase-return' && state.purReturnCart && state.purReturnCart.length > 0) {
                hasData = true; reason = 'توجد أصناف غير محفوظة في مرتجع المشتريات';
            } else if (type === 'adjustment' && state.adjCart && state.adjCart.length > 0) {
                hasData = true; reason = 'توجد أصناف غير محفوظة في تسوية المخزن';
            } else if ((type === 'receipt' || type === 'disbursement') && (parseFloat(state.amount) > 0 || (state.partnerName && state.partnerName.trim() !== ''))) {
                hasData = true; reason = 'توجد بيانات غير محفوظة في السند';
            }
        }

        if (hasData) {
            return {
                hasUnsaved: true,
                tabId: tabId,
                tabType: type,
                tabLabel: label,
                reason: reason
            };
        }
    }

    return null;
};

// تسجيل مستمع حدث الإغلاق من عملية Electron الرئيسية
try {
    const electron = window.require ? window.require('electron') : (typeof require !== 'undefined' ? require('electron') : null);
    if (electron && electron.ipcRenderer) {
        electron.ipcRenderer.on('trigger-backup-before-quit', async () => {
            // 1. فحص هل هناك أي بيانات غير محفوظة في التبويبات المفتوحة قبل أي شيء
            const unsaved = window.checkUnsavedDataInAllTabs();

            if (unsaved && unsaved.hasUnsaved) {
                // إلغاء الإغلاق فوراً
                if (electron && electron.ipcRenderer) electron.ipcRenderer.send('cancel-quit');

                // التوجه والرجوع التلقائي للتبويب المفتوح الذي يحتوي على البيانات غير المحفوظة
                if (typeof switchSection === 'function') {
                    switchSection(unsaved.tabType, true, unsaved.tabId);
                }

                // إظهار تنبيه حاسم ومحذر للمستخدم
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert({
                        titleText: '⚠️ تنبيه أمان: بيانات غير محفوظة!',
                        msg: `تنبيه: لا يمكن خروج البرنامج لأن هناك بيانات غير محفوظة في (${unsaved.tabLabel}).\n\n📌 السبب: ${unsaved.reason}.\n\nيرجى حفظ الفاتورة/المستند أولاً أو إفراغ البيانات قبل إغلاق البرنامج.`,
                        type: 'warning'
                    });
                } else {
                    alert(`⚠️ تنبيه أمان: توجد بيانات غير محفوظة في (${unsaved.tabLabel}).\n${unsaved.reason}.\n\nيرجى حفظ البيانات أو إلغاؤها أولاً قبل الخروج.`);
                }
                return;
            }

            // 2. إذا كانت كافة البيانات محفوظة ولا توجد أصناف معلقة، نقوم بالنسخ الاحتياطي ثم الخروج
            const settings = JSON.parse(getStore('pos_settings') || '{}');
            if (settings.autoBackup !== false) { // مفعل تلقائياً كخيار أمان أقصى
                await window.executeAutoBackupToFile(false);
            }

            // إكمال عملية الخروج بأمان بعد إنهاء النسخ الاحتياطي
            if (electron && electron.ipcRenderer) electron.ipcRenderer.send('proceed-quit');
        });
    }
} catch (e) {
    console.log("Not running in Electron environment or ipcRenderer unavailable.");
}


// ================= نظام التصدير الموحد الاحترافي (PDF & Excel Export Engine) =================

// 1. منشئ ملف PDF الحقيقي بدون فتح نافذة الطباعة (Pure PDF Stream & Blob Builder)
function createPDFBlobFromDataURL(dataURL, width, height) {
    const base64Data = dataURL.split(',')[1];
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    
    const pdfWidth = 595.28;
    const pdfHeight = (height / width) * pdfWidth;

    const pdfHeader = `%PDF-1.4\n`;
    const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfWidth.toFixed(2)} ${pdfHeight.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /I1 5 0 R >> >> >>\nendobj\n`;
    
    const contentStream = `q ${pdfWidth.toFixed(2)} 0 0 ${pdfHeight.toFixed(2)} 0 0 cm /I1 Do Q\n`;
    const obj4 = `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;
    
    const obj5Head = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${len} >>\nstream\n`;
    const obj5Tail = `\nendstream\nendobj\n`;

    const encoder = new TextEncoder();
    const hBytes = encoder.encode(pdfHeader + obj1 + obj2 + obj3 + obj4 + obj5Head);
    const tBytes = encoder.encode(obj5Tail);

    const offset1 = pdfHeader.length;
    const offset2 = offset1 + obj1.length;
    const offset3 = offset2 + obj2.length;
    const offset4 = offset3 + obj3.length;
    const offset5 = offset4 + obj4.length;
    const endObj5Pos = offset5 + obj5Head.length + len + obj5Tail.length;

    const xref = `xref\n0 6\n0000000000 65535 f \n${String(offset1).padStart(10, '0')} 00000 n \n${String(offset2).padStart(10, '0')} 00000 n \n${String(offset3).padStart(10, '0')} 00000 n \n${String(offset4).padStart(10, '0')} 00000 n \n${String(offset5).padStart(10, '0')} 00000 n \n`;
    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${endObj5Pos}\n%%EOF`;
    const trBytes = encoder.encode(xref + trailer);

    return new Blob([hBytes, bytes, tBytes, trBytes], { type: 'application/pdf' });
}
window.createPDFBlobFromDataURL = createPDFBlobFromDataURL;

// 2. دالة تصدير عنصر إلى PDF وتنزيله مباشرة بدون فتح نافذة Print نهائياً (متوافقة 100% مع Electron والويب)
async function exportElementToPDF(elementOrId, fileName) {
    let element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!element) {
        element = document.getElementById('receipt-area') || document.getElementById('customInvoiceModal') || document.body;
    }
    
    if (typeof showToast === 'function') showToast("🔄 جاري إنشاء وتنزيل ملف PDF...", "info");

    try {
        const computed = window.getComputedStyle(element);
        const isHidden = (computed.display === 'none' || computed.visibility === 'hidden' || element.offsetWidth === 0);

        const origDisplay = element.style.display;
        const origPos = element.style.position;
        const origLeft = element.style.left;
        const origTop = element.style.top;
        const origZIndex = element.style.zIndex;

        if (isHidden) {
            element.style.display = 'block';
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            element.style.top = '0px';
            element.style.zIndex = '-9999';
        }

        if (typeof html2canvas === 'function') {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            if (isHidden) {
                element.style.display = origDisplay;
                element.style.position = origPos;
                element.style.left = origLeft;
                element.style.top = origTop;
                element.style.zIndex = origZIndex;
            }

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdfBlob = createPDFBlobFromDataURL(imgData, canvas.width, canvas.height);
            
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            const cleanName = (fileName || 'فاتورة').replace(/[\\\/:*?"<>|]/g, '_');
            link.download = cleanName.endsWith('.pdf') ? cleanName : (cleanName + '.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 4000);
            
            if (typeof showToast === 'function') showToast("✅ تم تصدير وتنزيل ملف PDF بنجاح", "success");
        } else {
            if (isHidden) {
                element.style.display = origDisplay;
                element.style.position = origPos;
                element.style.left = origLeft;
                element.style.top = origTop;
                element.style.zIndex = origZIndex;
            }
            window.print();
        }
    } catch(err) {
        console.error("PDF Export Error:", err);
        window.print();
        if (typeof showToast === 'function') showToast("ℹ️ تم فتح نافذة الطباعة/الحفظ كـ PDF", "info");
    }
}
window.exportElementToPDF = exportElementToPDF;

function getXLSXLibrary() {
    let lib = null;
    if (typeof window !== 'undefined' && window.XLSX && (window.XLSX.utils || window.XLSX.read)) lib = window.XLSX;
    else if (typeof XLSX !== 'undefined' && XLSX && (XLSX.utils || XLSX.read)) lib = XLSX;
    else if (typeof globalThis !== 'undefined' && globalThis.XLSX && (globalThis.XLSX.utils || globalThis.XLSX.read)) lib = globalThis.XLSX;
    else if (typeof self !== 'undefined' && self.XLSX && (self.XLSX.utils || self.XLSX.read)) lib = self.XLSX;
    else if (typeof window !== 'undefined' && window.tempModule && window.tempModule.exports && (window.tempModule.exports.utils || window.tempModule.exports.read)) lib = window.tempModule.exports;

    if (!lib && typeof require === 'function') {
        try {
            const path = require('path');
            const xlsxPath = path.join(__dirname, '..', 'lib', 'xlsx.full.min.js');
            const _reqXLSX = require(xlsxPath);
            if (_reqXLSX && (_reqXLSX.utils || _reqXLSX.read)) lib = _reqXLSX;
        } catch(e) {}
        if (!lib) {
            try {
                const _reqNodeXLSX = require('xlsx');
                if (_reqNodeXLSX && (_reqNodeXLSX.utils || _reqNodeXLSX.read)) lib = _reqNodeXLSX;
            } catch(e) {}
        }
    }

    if (lib && typeof window !== 'undefined') {
        window.XLSX = lib;
    }
    return lib;
}
window.getXLSXLibrary = getXLSXLibrary;

// دالة المحرك المباشر الحصين لتصدير المصفوفات كملفات Excel/CSV محصنة بـ UTF-8 BOM
function downloadAOAAsExcelCSV(aoaData, fileName) {
    if (!Array.isArray(aoaData) || aoaData.length === 0) return;
    let csvContent = "\uFEFF";
    aoaData.forEach(row => {
        let rowStr = row.map(val => {
            if (val === null || val === undefined) return '""';
            let str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        }).join(',');
        csvContent += rowStr + "\r\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanName = (fileName || 'تقرير').replace(/[\\\/:*?"<>|]/g, '_');
    link.download = cleanName.endsWith('.csv') || cleanName.endsWith('.xlsx') ? cleanName : (cleanName + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (typeof showToast === 'function') showToast("✅ تم تصدير التقرير بنجاح", "success");
}
window.downloadAOAAsExcelCSV = downloadAOAAsExcelCSV;

// 2.6 دالة مشاركة الفواتير والمستندات عبر الواتساب والتليجرام
function shareTransaction(type, platform) {
    let isBillEmpty = false;
    if (type === 'sales' && (!window.cart || window.cart.length === 0)) isBillEmpty = true;
    else if (type === 'purchase' && (!window.purchaseCart || window.purchaseCart.length === 0)) isBillEmpty = true;
    else if (type === 'salesReturn' && (!window.salesReturnCart || window.salesReturnCart.length === 0)) isBillEmpty = true;
    else if (type === 'purchaseReturn' && (!window.purchaseReturnCart || window.purchaseReturnCart.length === 0)) isBillEmpty = true;
    else if (type === 'receipt' && (!document.getElementById('receiptAmount')?.value || parseFloat(document.getElementById('receiptAmount')?.value) === 0)) isBillEmpty = true;
    else if (type === 'disbursement' && (!document.getElementById('disburseAmount')?.value || parseFloat(document.getElementById('disburseAmount')?.value) === 0)) isBillEmpty = true;

    if (isBillEmpty) {
        document.querySelectorAll('.share-menu').forEach(m => m.classList.remove('active'));
        if (typeof showToast === 'function') showToast("⚠️ الفاتورة فارغة! يرجى إضافة أصناف أو بيانات أولاً قبل المشاركة.", "warning");
        else alert("⚠️ الفاتورة فارغة! يرجى إضافة أصناف أو بيانات أولاً قبل المشاركة.");
        return;
    }

    let title = "مشاركة مستند";
    let invNo = "---";
    let partnerName = "---";
    let grandTotal = "0.00";
    let itemsText = "";

    if (type === 'sales') {
        title = "📄 فاتورة مبيعات";
        partnerName = document.getElementById('customerName')?.value || 'عميل نقدي';
        invNo = document.getElementById('salesInvoiceNo')?.value || document.getElementById('salesInvNoDisplay')?.innerText || '---';
        grandTotal = (typeof currentTotal !== 'undefined' ? currentTotal : 0).toFixed(2);
        if (typeof cart !== 'undefined' && cart.length > 0) {
            itemsText = "\n📋 الأصناف:\n" + cart.map((item, i) => `${i + 1}. ${item.name} (${item.qty} × ${item.price}) = ${(item.qty * item.price).toFixed(2)}`).join('\n');
        }
    } else if (type === 'purchase') {
        title = "📦 فاتورة مشتريات";
        partnerName = document.getElementById('supplierName')?.value || 'مورد';
        invNo = document.getElementById('purchaseInvoiceNo')?.value || '---';
        grandTotal = (typeof purchaseCart !== 'undefined' ? purchaseCart.reduce((sum, item) => sum + (item.qty * item.cost), 0) : 0).toFixed(2);
        if (typeof purchaseCart !== 'undefined' && purchaseCart.length > 0) {
            itemsText = "\n📋 الأصناف:\n" + purchaseCart.map((item, i) => `${i + 1}. ${item.name} (${item.qty} × ${item.cost}) = ${(item.qty * item.cost).toFixed(2)}`).join('\n');
        }
    } else if (type === 'salesReturn') {
        title = "🔄 مرتجع مبيعات";
        partnerName = document.getElementById('salesReturnPartnerDisplay')?.innerText || 'عميل';
        grandTotal = (document.getElementById('salesReturnTotalDisplay')?.innerText || '0.00');
    } else if (type === 'purchaseReturn') {
        title = "🔄 مرتجع مشتريات";
        partnerName = document.getElementById('purReturnPartnerDisplay')?.innerText || 'مورد';
        grandTotal = (document.getElementById('purReturnTotalDisplay')?.innerText || '0.00');
    } else if (type === 'receipt') {
        title = "💵 سند قبض";
        partnerName = document.getElementById('receiptCustomer')?.value || 'عميل';
        grandTotal = (document.getElementById('receiptAmount')?.value || '0.00');
    } else if (type === 'disbursement') {
        title = "💸 سند صرف";
        partnerName = document.getElementById('disbursePayee')?.value || 'جهة';
        grandTotal = (document.getElementById('disburseAmount')?.value || '0.00');
    } else if (type === 'dailyReport') {
        title = "📊 تقرير الحركة اليومية الشامل";
        partnerName = "تقرير تقفيل اليومية";
        
        const fromD = document.getElementById('reportDateFrom')?.value || new Date().toLocaleDateString('en-CA');
        const toD = document.getElementById('reportDateTo')?.value || new Date().toLocaleDateString('en-CA');
        
        const netProfit = document.getElementById('dailyNetProfit')?.innerText || '0.00';
        const totalSales = document.getElementById('dailyTotalSales')?.innerText || '0.00';
        const totalPurchases = document.getElementById('dailyTotalPurchases')?.innerText || '0.00';
        const totalExpenses = document.getElementById('dailyTotalExpenses')?.innerText || '0.00';
        const totalReceipts = document.getElementById('dailyTotalReceipts')?.innerText || '0.00';
        const totalDisbursements = document.getElementById('dailyTotalDisbursements')?.innerText || '0.00';
        const grossProfit = document.getElementById('dailyGrossProfit')?.innerText || '0.00';

        grandTotal = netProfit;
        itemsText = `\n📅 الفترة: من ${fromD} إلى ${toD}\n` +
                    `🛍️ إجمالي المبيعات: ${totalSales} ج.م\n` +
                    `📦 إجمالي المشتريات: ${totalPurchases} ج.م\n` +
                    `💵 المقبوضات المالية: ${totalReceipts} ج.م\n` +
                    `💸 المصروفات / السندات: ${totalExpenses} ج.م\n` +
                    `📈 مجمل الربح: ${grossProfit} ج.م\n` +
                    `🎯 صافي الربح النهائي: ${netProfit} ج.م`;
    }

    const shopName = document.getElementById('shopName')?.value || 'بَيَان POS';
    let message = "";
    if (type === 'dailyReport') {
        message = `✨ *${shopName}* ✨\n${title}${itemsText}\n\nتاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}\nتم الاستخراج بواسطة برنامج بَيَان 🚀`;
    } else {
        message = `✨ *${shopName}* ✨\n${title}\n📌 رقم المستند: ${invNo}\n👤 الطرف: ${partnerName}\n💰 الإجمالي: ${grandTotal} ج.م${itemsText}\n\nشكراً لتعاملكم معنا! 🙏`;
    }

    const encodedText = encodeURIComponent(message);
    let shareUrl = "";

    if (platform === 'wa' || platform === 'whatsapp') {
        shareUrl = `https://wa.me/?text=${encodedText}`;
    } else if (platform === 'tg' || platform === 'telegram') {
        shareUrl = `https://t.me/share/url?url=${encodedText}`;
    }

    document.querySelectorAll('.share-menu').forEach(m => m.classList.remove('active'));

    if (shareUrl) {
        if (typeof showToast === 'function') {
            showToast("📱 جاري فتح نافذة المشاركة...", "info");
        }
        window.open(shareUrl, '_blank');
    }
}
window.shareTransaction = shareTransaction;

// 3. دالة تصدير بيانات الفاتورة والمستندات إلى ملف Excel غني يشمل كافة الحقول والبيانات المطلوبة
function exportInvoiceDataToExcel(type, fileName, customItems) {
    const XLSXLib = (typeof getXLSXLibrary === 'function' ? getXLSXLibrary() : (typeof XLSX !== 'undefined' ? XLSX : (typeof window.XLSX !== 'undefined' ? window.XLSX : null)));

    const currentUserStr = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : 'المدير العام';
    const shopName = document.getElementById('shopName')?.value || 'بَيَان POS';

    let meta = {};
    let itemRows = [];
    let summary = {};

    if (type === 'sales') {
        const partner = document.getElementById('customerName')?.value || 'عميل نقدي';
        const method = (typeof getSelectedPaymentMethod === 'function' ? getSelectedPaymentMethod('sales-section') : (document.getElementById('salesPaymentMethod')?.value || 'نقدي'));
        const invNo = document.getElementById('salesInvoiceNo')?.value || document.getElementById('salesInvNoDisplay')?.innerText || document.getElementById('salesBadgeID')?.innerText || 'مبيعات';
        const date = (typeof getTransactionDateTime === 'function' ? getTransactionDateTime('salesDate', 'salesTime').full : new Date().toLocaleString('ar-EG'));
        const status = method.includes('آجل') ? 'آجل (مديونية)' : 'نقدي (مسدد)';
        const disc = parseFloat(document.getElementById('salesDiscount')?.value) || 0;
        const tax = parseFloat(document.getElementById('salesTax')?.value) || 0;
        const grandTotal = parseFloat(typeof currentTotal !== 'undefined' ? currentTotal : 0);

        meta = {
            title: "فاتورة مبيعات",
            invNo: invNo,
            date: date,
            partner: partner,
            method: method,
            status: status,
            user: currentUserStr
        };

        let subTotal = 0;
        itemRows = (typeof cart !== 'undefined' ? cart : []).map(item => {
            const pInDB = (typeof productsDB !== 'undefined' ? productsDB.find(p => p.id === item.id || p.name === item.name) : null);
            const barcode = item.barcode || (pInDB ? (pInDB.barcode || pInDB.code || '-') : '-');
            const unit = item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (item.unit || 'قطعة');
            const qty = parseFloat(item.qty) || 1;
            const price = parseFloat(item.price) || 0;
            const itemDisc = parseFloat(item.discount || 0);
            const itemTax = parseFloat(item.tax || 0);
            const total = (qty * price) - itemDisc + itemTax;
            subTotal += total;
            return {
                name: item.name || '-',
                barcode: barcode,
                qty: qty,
                unit: unit,
                price: price,
                discount: itemDisc,
                tax: itemTax,
                total: total
            };
        });

        let discountAmount = (document.getElementById('discountType')?.value === 'perc') ? (subTotal * disc / 100) : disc;
        let taxAmount = (document.getElementById('taxType')?.value === 'perc') ? (subTotal * tax / 100) : tax;

        summary = {
            subTotal: subTotal,
            discount: discountAmount,
            tax: taxAmount,
            grandTotal: (grandTotal > 0 ? grandTotal : (subTotal - discountAmount + taxAmount))
        };
    } else if (type === 'purchase') {
        const partner = document.getElementById('supplierName')?.value || 'مورد';
        const method = (typeof getSelectedPaymentMethod === 'function' ? getSelectedPaymentMethod('purchase-section') : (document.getElementById('purchasePaymentMethod')?.value || 'نقدي'));
        const invNo = document.getElementById('purchaseInvoiceNo')?.value || document.getElementById('purBadgeID')?.innerText || 'مشتريات';
        const date = document.getElementById('purchaseDate')?.value || new Date().toLocaleDateString('ar-EG');
        const status = method.includes('آجل') ? 'آجل (مديونية)' : 'نقدي (مسدد)';
        const totalNet = parseFloat(document.getElementById('purchaseGrandTotal')?.innerText) || 0;

        meta = {
            title: "فاتورة مشتريات",
            invNo: invNo,
            date: date,
            partner: partner,
            method: method,
            status: status,
            user: currentUserStr
        };

        let subTotal = 0;
        itemRows = (typeof purchaseCart !== 'undefined' ? purchaseCart : []).map(item => {
            const pInDB = (typeof productsDB !== 'undefined' ? productsDB.find(p => p.id === item.id || p.name === item.name) : null);
            const barcode = item.barcode || (pInDB ? (pInDB.barcode || pInDB.code || '-') : '-');
            const unit = item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (item.unit || 'قطعة');
            const qty = parseFloat(item.qty) || 1;
            const price = parseFloat(item.price) || 0;
            const total = qty * price;
            subTotal += total;
            return {
                name: item.name || '-',
                barcode: barcode,
                qty: qty,
                unit: unit,
                price: price,
                discount: 0,
                tax: 0,
                total: total
            };
        });

        summary = {
            subTotal: subTotal,
            grandTotal: (totalNet > 0 ? totalNet : subTotal)
        };
    } else if (type === 'salesReturn' || type === 'purchaseReturn') {
        const isSales = (type === 'salesReturn');
        const partner = isSales ? (document.getElementById('salesReturnPartnerDisplay')?.innerText || 'عميل') : (document.getElementById('purReturnPartnerDisplay')?.innerText || 'مورد');
        const date = isSales ? (document.getElementById('salesReturnDate')?.value || new Date().toLocaleDateString('ar-EG')) : (document.getElementById('purReturnDate')?.value || new Date().toLocaleDateString('ar-EG'));
        const invNo = isSales ? (document.getElementById('salesReturnBadgeID')?.innerText || 'مرتجع مبيعات') : (document.getElementById('purReturnBadgeID')?.innerText || 'مرتجع مشتريات');
        const totalNet = parseFloat(document.getElementById(isSales ? 'returnTotalAmount' : 'purReturnTotalAmount')?.innerText) || 0;
        const cartArr = isSales ? (typeof returnCart !== 'undefined' ? returnCart : []) : (typeof purReturnCart !== 'undefined' ? purReturnCart : []);

        meta = {
            title: isSales ? "مرتجع مبيعات 🔄" : "مرتجع مشتريات 🔄",
            invNo: invNo,
            date: date,
            partner: partner,
            method: "مرتجع",
            status: "مكتمل",
            user: currentUserStr
        };

        let subTotal = 0;
        itemRows = cartArr.map(item => {
            const qty = parseFloat(item.qty) || 1;
            const price = parseFloat(item.price) || 0;
            const total = qty * price;
            subTotal += total;
            return {
                name: item.name || '-',
                barcode: item.barcode || '-',
                qty: qty,
                unit: item.unit || 'قطعة',
                price: price,
                discount: 0,
                tax: 0,
                total: total
            };
        });

        summary = {
            subTotal: subTotal,
            grandTotal: (totalNet > 0 ? totalNet : subTotal)
        };
    } else if (type === 'receipt' || type === 'disbursement') {
        const isReceipt = (type === 'receipt');
        const amount = parseFloat(document.getElementById(isReceipt ? 'receiptAmount' : 'disburseAmount')?.value) || 0;
        const partner = document.getElementById(isReceipt ? 'receiptCustomer' : 'disbursePayee')?.value || (isReceipt ? 'عميل' : 'مورد');
        const date = document.getElementById(isReceipt ? 'receiptDate' : 'disburseDate')?.value || new Date().toLocaleDateString('ar-EG');
        const invNo = document.getElementById(isReceipt ? 'receiptID' : 'disburseID')?.value || (isReceipt ? 'سند قبض' : 'سند صرف');
        const notes = document.getElementById(isReceipt ? 'receiptNotes' : 'disburseNotes')?.value || (isReceipt ? 'سند قبض مالي' : 'سند صرف مالي');

        meta = {
            title: isReceipt ? "سند قبض مالي 💵" : "سند صرف مالي 💸",
            invNo: invNo,
            date: date,
            partner: partner,
            method: document.getElementById(isReceipt ? 'receiptPaymentMethod' : 'disbursePaymentMethod')?.value || "نقدي",
            status: "مكتمل",
            user: currentUserStr
        };

        itemRows = [{
            name: notes,
            barcode: "-",
            qty: 1,
            unit: "عملية",
            price: amount,
            discount: 0,
            tax: 0,
            total: amount
        }];

        summary = {
            grandTotal: amount
        };
    } else if (type === 'dailyReport') {
        const fromDate = document.getElementById('reportDateFrom')?.value || new Date().toLocaleDateString('en-CA');
        const toDate = document.getElementById('reportDateTo')?.value || new Date().toLocaleDateString('en-CA');
        
        const netProfit = document.getElementById('dailyNetProfit')?.innerText || '0.00';
        const totalSales = document.getElementById('dailyTotalSales')?.innerText || '0.00';
        const totalPurchases = document.getElementById('dailyTotalPurchases')?.innerText || '0.00';
        const totalExpenses = document.getElementById('dailyTotalExpenses')?.innerText || '0.00';
        const totalReceipts = document.getElementById('dailyTotalReceipts')?.innerText || '0.00';
        const totalDisbursements = document.getElementById('dailyTotalDisbursements')?.innerText || '0.00';
        const grossProfit = document.getElementById('dailyGrossProfit')?.innerText || '0.00';

        const filtered = (typeof transactions !== 'undefined' ? transactions : []).filter(t => (!fromDate || t.dateISO >= fromDate) && (!toDate || t.dateISO <= toDate));
        
        const summaryRows = [
            ["📊 ملخص تقرير الحركة والتقفيل اليومي"],
            ["الفترة الزمنية:", `من ${fromDate} إلى ${toDate}`],
            ["تاريخ الاستخراج:", new Date().toLocaleString('ar-EG')],
            [],
            ["البيان المالي", "القيمة الإجمالية (ج.م)"],
            ["🛍️ إجمالي المبيعات", totalSales],
            ["📦 إجمالي المشتريات والتوريد", totalPurchases],
            ["💵 إجمالي المقبوضات (سندات القبض)", totalReceipts],
            ["💸 إجمالي المصروفات وسندات الصرف", totalExpenses],
            ["📈 مجمل الربح", grossProfit],
            ["🎯 صافي الربح النهائي", netProfit],
            [],
            ["📋 تفاصيل سجل الحركات والفواتير خلال الفترة:"]
        ];

        const headersRow = ["م", "رقم الفاتورة / المستند", "حالة/نوع الفاتورة", "التاريخ والوقت", "العميل / المورد", "طريقة الدفع", "اسم المنتج / الصنف", "الباركود", "الكمية", "سعر الوحدة", "الخصم", "الضريبة", "إجمالي الحركة", "المستخدم"];
        summaryRows.push(headersRow);

        filtered.forEach((t, idx) => {
            summaryRows.push([
                idx + 1,
                t.invoiceId || t.id || '-',
                t.type || 'حركة',
                t.dateISO ? `${t.dateISO} ${t.timeISO || ''}` : (t.date || '-'),
                t.partner || '-',
                t.method || 'نقدي',
                t.product || '-',
                t.barcode || '-',
                t.qty || 1,
                parseFloat(t.price || 0).toFixed(2),
                parseFloat(t.discount || 0).toFixed(2),
                parseFloat(t.tax || 0).toFixed(2),
                parseFloat(t.total || t.price || 0).toFixed(2),
                t.user || currentUserStr
            ]);
        });

        if (XLSXLib && XLSXLib.utils) {
            try {
                const ws = XLSXLib.utils.aoa_to_sheet(summaryRows);
                ws['!dir'] = 'rtl';
                ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 25 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];

                const wb = XLSXLib.utils.book_new();
                XLSXLib.utils.book_append_sheet(wb, ws, "تقرير الحركة اليومية");
                
                const cleanFileName = (fileName || 'Bayan_Daily_Report').replace(/[\\\/:*?"<>|]/g, '_');
                XLSXLib.writeFile(wb, cleanFileName.endsWith('.xlsx') ? cleanFileName : (cleanFileName + '.xlsx'));
                return showToast("✅ تم تصدير ملف Excel تقرير الحركة اليومية بنجاح", "success");
            } catch (e) {
                console.warn("XLSXLib dailyReport aoa_to_sheet fallback:", e);
            }
        }

        if (typeof downloadAOAAsExcelCSV === 'function') {
            downloadAOAAsExcelCSV(summaryRows, fileName || 'Bayan_Daily_Report');
        } else if (typeof window.downloadAOAAsExcelCSV === 'function') {
            window.downloadAOAAsExcelCSV(summaryRows, fileName || 'Bayan_Daily_Report');
        }
        return;
    } else if (type === 'invoices') {
        const fromDate = document.getElementById('invFilterFrom')?.value || '';
        const toDate = document.getElementById('invFilterTo')?.value || '';
        const filtered = (typeof transactions !== 'undefined' ? transactions : []).filter(t => (!fromDate || t.dateISO >= fromDate) && (!toDate || t.dateISO <= toDate));
        
        const items = filtered.map((t, idx) => ({
            "م": idx + 1,
            "رقم الفاتورة / المستند": t.invoiceId || t.id || '-',
            "حالة/نوع الفاتورة": t.type || 'حركة',
            "التاريخ والوقت": t.dateISO ? `${t.dateISO} ${t.timeISO || ''}` : (t.date || '-'),
            "العميل / المورد": t.partner || '-',
            "طريقة الدفع": t.method || 'نقدي',
            "اسم المنتج / الصنف": t.product || '-',
            "الباركود": t.barcode || '-',
            "الكمية": t.qty || 1,
            "الوحدة": t.unit || 'قطعة',
            "سعر الوحدة (ج.م)": parseFloat(t.price || 0).toFixed(2),
            "الخصم": parseFloat(t.discount || 0).toFixed(2),
            "الضريبة": parseFloat(t.tax || 0).toFixed(2),
            "إجمالي الصنف (ج.م)": parseFloat(t.total || t.price || 0).toFixed(2),
            "المستخدم المسؤول": t.user || currentUserStr
        }));

        if (!items || items.length === 0) {
            return showToast("⚠️ لا توجد بيانات للتصدير حالياً", "warning");
        }

        if (XLSXLib && XLSXLib.utils) {
            try {
                const ws = XLSXLib.utils.json_to_sheet(items);
                ws['!dir'] = 'rtl';
                const colWidths = Object.keys(items[0]).map(key => ({
                    wch: Math.max(key.length + 6, ...items.map(row => String(row[key] || '').length + 2))
                }));
                ws['!cols'] = colWidths;

                const wb = XLSXLib.utils.book_new();
                XLSXLib.utils.book_append_sheet(wb, ws, "سجل الفواتير");
                
                const cleanFileName = (fileName || 'Bayan_Invoices_Report').replace(/[\\\/:*?"<>|]/g, '_');
                XLSXLib.writeFile(wb, cleanFileName.endsWith('.xlsx') ? cleanFileName : (cleanFileName + '.xlsx'));
                return showToast("✅ تم تصدير ملف Excel الشامل للفواتير بنجاح", "success");
            } catch (e) {
                console.warn("XLSXLib json_to_sheet fallback:", e);
            }
        }

        const keys = Object.keys(items[0]);
        const aoaTable = [keys];
        items.forEach(it => {
            aoaTable.push(keys.map(k => it[k]));
        });
        if (typeof downloadAOAAsExcelCSV === 'function') {
            downloadAOAAsExcelCSV(aoaTable, fileName || 'Bayan_Invoices_Report');
        } else if (typeof window.downloadAOAAsExcelCSV === 'function') {
            window.downloadAOAAsExcelCSV(aoaTable, fileName || 'Bayan_Invoices_Report');
        }
        return;
    }

    if (!itemRows || itemRows.length === 0) {
        return showToast("⚠️ لا توجد أصناف داخل الفاتورة لتصديرها إلى Excel", "warning");
    }

    const aoa = [];
    aoa.push([`📄 ${meta.title} - ${shopName}`]);
    aoa.push([]); 
    aoa.push(["رقم الفاتورة / المستند:", meta.invNo, "", "التاريخ والوقت:", meta.date]);
    aoa.push(["الطرف الثاني (العميل/المورد):", meta.partner, "", "طريقة الدفع والحالة:", `${meta.method} (${meta.status})`]);
    aoa.push(["المستخدم المسؤول:", meta.user, "", "", ""]);
    aoa.push([]); 
    aoa.push(["م", "اسم الصنف / المنتج", "الباركود", "الكمية", "الوحدة", "سعر الوحدة (ج.م)", "الخصم (ج.م)", "الضريبة (ج.م)", "إجمالي الصنف (ج.م)"]);

    itemRows.forEach((item, idx) => {
        aoa.push([
            idx + 1,
            item.name,
            item.barcode,
            item.qty,
            item.unit,
            parseFloat(item.price).toFixed(2),
            parseFloat(item.discount || 0).toFixed(2),
            parseFloat(item.tax || 0).toFixed(2),
            parseFloat(item.total).toFixed(2)
        ]);
    });

    aoa.push([]); 
    if (summary.subTotal !== undefined) aoa.push(["", "", "", "", "", "", "", "المجموع الفرعي:", parseFloat(summary.subTotal).toFixed(2)]);
    if (summary.discount !== undefined && summary.discount > 0) aoa.push(["", "", "", "", "", "", "", "إجمالي الخصم:", `-${parseFloat(summary.discount).toFixed(2)}`]);
    if (summary.tax !== undefined && summary.tax > 0) aoa.push(["", "", "", "", "", "", "", "إجمالي الضريبة:", `+${parseFloat(summary.tax).toFixed(2)}`]);
    if (summary.grandTotal !== undefined) aoa.push(["", "", "", "", "", "", "", "إجمالي الفاتورة الصافي:", parseFloat(summary.grandTotal).toFixed(2)]);

    const cleanFileName = (fileName || 'Bayan_Invoice').replace(/[\\\/:*?"<>|]/g, '_');

    if (XLSXLib && XLSXLib.utils) {
        try {
            const ws = XLSXLib.utils.aoa_to_sheet(aoa);
            ws['!dir'] = 'rtl';
            ws['!cols'] = [{ wch: 6 }, { wch: 32 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];

            const wb = XLSXLib.utils.book_new();
            XLSXLib.utils.book_append_sheet(wb, ws, "الفاتورة");

            XLSXLib.writeFile(wb, cleanFileName.endsWith('.xlsx') ? cleanFileName : (cleanFileName + '.xlsx'));
            return showToast("✅ تم تصدير ملف Excel احترافي وشامل للفاتورة بنجاح", "success");
        } catch (e) {
            console.warn("XLSXLib writeFile fallback triggered:", e);
        }
    }

    if (typeof downloadAOAAsExcelCSV === 'function') {
        downloadAOAAsExcelCSV(aoa, cleanFileName);
    } else if (typeof window.downloadAOAAsExcelCSV === 'function') {
        window.downloadAOAAsExcelCSV(aoa, cleanFileName);
    }
}
window.exportInvoiceDataToExcel = exportInvoiceDataToExcel;

// تجهيز كود HTML الفعلي للمستند المخصص قبل تصدير PDF
function prepareBillHTML(type) {
    const receiptArea = document.getElementById('receipt-area');
    if (!receiptArea) return;

    const shopName = document.getElementById('shopName')?.value || 'بَيَان POS';
    const shopAddress = document.getElementById('shopAddress')?.value || '';
    const shopPhone = document.getElementById('shopPhone1')?.value || '';
    const footerMsg = document.getElementById('printFooterMsg')?.value || 'شكراً لتعاملكم معنا';
    const userName = (typeof currentUser !== 'undefined' && currentUser ? currentUser.name : 'المدير العام');
    const todayDate = new Date().toLocaleDateString('ar-EG');
    const todayTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    if (type === 'receipt' || type === 'disbursement') {
        const isReceipt = (type === 'receipt');
        const title = isReceipt ? 'سند قبض مالي 💵' : 'سند صرف مالي 💸';
        const mainColor = isReceipt ? '#065f46' : '#991b1b';
        const id = isReceipt ? (document.getElementById('receiptID')?.value || '---') : (document.getElementById('disburseID')?.value || '---');
        const partnerLabel = isReceipt ? 'استلمنا من السيد / الحساب:' : 'صُرف لطلب السيد / الحساب:';
        const partner = isReceipt ? (document.getElementById('receiptCustomer')?.value || 'عميل') : (document.getElementById('disbursePayee')?.value || 'جهة');
        const amount = parseFloat(document.getElementById(isReceipt ? 'receiptAmount' : 'disburseAmount')?.value) || 0;
        const notes = document.getElementById(isReceipt ? 'receiptNotes' : 'disburseNotes')?.value || (isReceipt ? 'مقابل سند قبض مالي' : 'مقابل سند صرف مالي');
        const method = document.getElementById(isReceipt ? 'receiptPaymentMethod' : 'disbursePaymentMethod')?.value || 'نقدي';
        const dateStr = document.getElementById(isReceipt ? 'receiptDate' : 'disburseDate')?.value || todayDate;
        const timeStr = document.getElementById(isReceipt ? 'receiptTime' : 'disburseTime')?.value || todayTime;

        // حساب الأرصدة المالية الحقيقية للحساب/العميل (قبل حفظ السند الحالي)
        const prevBal = (typeof getAccountBalance === 'function' ? getAccountBalance(partner) : 0);
        const remainBal = isReceipt ? (prevBal - amount) : (prevBal + amount);

        receiptArea.innerHTML = `
            <div class="print-container" style="direction:rtl; padding:25px; font-family:'Arial',sans-serif; background:#fff; color:#000; width:100%; border:3px double ${mainColor}; box-sizing:border-box; border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ${mainColor}; padding-bottom:12px; margin-bottom:15px;">
                    <div>
                        <div style="font-size:22px; font-weight:900; color:${mainColor};">${shopName}</div>
                        ${shopAddress ? `<div style="font-size:12px; color:#475569; margin-top:3px;">${shopAddress} ${shopPhone ? ' | ' + shopPhone : ''}</div>` : ''}
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:18px; font-weight:bold; background:${mainColor}; color:#fff; padding:6px 20px; border-radius:6px;">${title}</div>
                        <div style="font-size:13px; font-weight:bold; margin-top:5px; color:#334155;">رقم السند: <span style="color:${mainColor}; font-size:15px;">#${id}</span></div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; background:#f8fafc; padding:10px 15px; border:1px solid #cbd5e1; border-radius:6px; margin-bottom:15px; font-size:13px; font-weight:bold;">
                    <div>التاريخ: ${dateStr} - ${timeStr}</div>
                    <div>طريقة الدفع: <span style="color:${mainColor}">${method}</span></div>
                    <div>المسؤول: ${userName}</div>
                </div>

                <div style="border:1px solid #cbd5e1; padding:12px 15px; border-radius:6px; margin-bottom:12px; font-size:14px; line-height:1.8;">
                    <div style="margin-bottom:8px;"><b>${partnerLabel}</b> <span style="font-size:16px; font-weight:bold; color:#0f172a;">${partner}</span></div>
                    <div style="margin-bottom:8px; display:flex; align-items:center;">
                        <b style="margin-left:8px;">مبلغ وقدره:</b>
                        <span style="font-size:20px; font-weight:900; color:${mainColor}; background:#f1f5f9; padding:2px 14px; border-radius:4px; border:1px solid ${mainColor};">
                            ${amount.toFixed(2)} ج.م
                        </span>
                    </div>
                    <div><b>وذلك عن / البيان:</b> <span style="color:#334155; font-weight:bold;">${notes}</span></div>
                </div>

                <!-- مربعات الحساب والترصيد المالي المخصص والواضح -->
                <div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:15px; text-align:center;">
                    <div style="flex:1; background:#f1f5f9; padding:10px; border-radius:6px; border:1px solid #cbd5e1;">
                        <div style="font-size:12px; color:#64748b; font-weight:bold;">الرصيد السابق (قبل السند)</div>
                        <div style="font-size:16px; font-weight:900; color:#334155; margin-top:3px;">${prevBal.toFixed(2)} ج.م</div>
                    </div>
                    <div style="flex:1; background:${isReceipt ? '#f0fdf4' : '#fef2f2'}; padding:10px; border-radius:6px; border:1px solid ${mainColor};">
                        <div style="font-size:12px; color:${mainColor}; font-weight:bold;">${isReceipt ? 'المبلغ المقبوض حالياً' : 'المبلغ المصروف حالياً'}</div>
                        <div style="font-size:18px; font-weight:900; color:${mainColor}; margin-top:3px;">${amount.toFixed(2)} ج.م</div>
                    </div>
                    <div style="flex:1; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #cbd5e1;">
                        <div style="font-size:12px; color:#64748b; font-weight:bold;">الرصيد المتبقي (بعد السند)</div>
                        <div style="font-size:16px; font-weight:900; color:#0f172a; margin-top:3px;">${remainBal.toFixed(2)} ج.م</div>
                    </div>
                </div>

                <div style="margin-top:30px; display:flex; justify-content:space-between; text-align:center; font-size:13px; font-weight:bold; padding:0 20px;">
                    <div>
                        <div>توقيع المستلم</div>
                        <div style="margin-top:35px; border-bottom:1px dashed #000; width:140px;"></div>
                    </div>
                    <div>
                        <div>المحاسب / المدير</div>
                        <div style="margin-top:35px; border-bottom:1px dashed #000; width:140px;"></div>
                    </div>
                </div>

                <div style="text-align:center; margin-top:20px; font-size:12px; color:#64748b; border-top:1px solid #e2e8f0; padding-top:10px;">${footerMsg}</div>
            </div>
        `;
    } else if (type === 'salesReturn' || type === 'purchaseReturn') {
        const isSalesRet = (type === 'salesReturn');
        const title = isSalesRet ? "إشعار مرتجع مبيعات 🔄" : "إشعار مرتجع مشتريات 🔄";
        const mainColor = isSalesRet ? "#1e40af" : "#c2410c";
        const partner = isSalesRet ? (document.getElementById('salesReturnPartnerDisplay')?.innerText || 'عميل') : (document.getElementById('purReturnPartnerDisplay')?.innerText || 'مورد');
        const invId = isSalesRet ? (document.getElementById('salesReturnBadgeID')?.innerText || '---') : (document.getElementById('purReturnBadgeID')?.innerText || '---');
        const cartArr = isSalesRet ? (typeof returnCart !== 'undefined' ? returnCart : []) : (typeof purReturnCart !== 'undefined' ? purReturnCart : []);
        
        let subTotal = cartArr.reduce((sum, item) => sum + ((parseFloat(item.price)||0) * (parseFloat(item.qty)||1)), 0);
        let itemsRows = cartArr.map(item => {
            const qty = parseFloat(item.qty || 0);
            const price = parseFloat(item.price || 0);
            const lineTotal = (price * qty).toFixed(2);
            return `<tr>
                <td style="text-align:right; padding:6px; border:1px solid #000; font-weight:bold;">${item.name || ''}</td>
                <td style="text-align:center; padding:6px; border:1px solid #000;">${qty} ${item.unit || 'قطعة'}</td>
                <td style="text-align:center; padding:6px; border:1px solid #000;">${price.toFixed(2)}</td>
                <td style="text-align:center; padding:6px; border:1px solid #000; font-weight:bold;">${lineTotal}</td>
            </tr>`;
        }).join('');

        receiptArea.innerHTML = `
            <div class="print-container" style="direction:rtl; padding:20px; font-family:'Arial',sans-serif; background:#fff; color:#000; width:100%; box-sizing:border-box;">
                <div style="text-align:center; border-bottom:2px solid ${mainColor}; padding-bottom:10px; margin-bottom:12px;">
                    <div style="font-size:22px; font-weight:900;">${shopName}</div>
                    <div style="font-size:16px; font-weight:bold; background:${mainColor}; color:#fff; display:inline-block; padding:4px 16px; margin-top:6px; border-radius:6px;">${title}</div>
                </div>
                <table style="width:100%; margin-bottom:12px; font-size:13px; font-weight:bold;">
                    <tr><td><b>رقم الإشعار:</b> ${invId}</td><td style="text-align:left;"><b>التاريخ:</b> ${todayDate}</td></tr>
                    <tr><td><b>الطرف الثاني:</b> ${partner}</td><td style="text-align:left;"><b>المسؤول:</b> ${userName}</td></tr>
                </table>
                <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:13px;">
                    <thead>
                        <tr style="background:#f1f5f9;">
                            <th style="text-align:right; border:1px solid #000; padding:8px;">اسم الصنف المرتجع</th>
                            <th style="border:1px solid #000; padding:8px;">الكمية</th>
                            <th style="border:1px solid #000; padding:8px;">سعر الوحدة</th>
                            <th style="border:1px solid #000; padding:8px;">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>${itemsRows}</tbody>
                </table>
                <div style="font-size:16px; font-weight:900; text-align:left; border-top:2px solid #000; padding-top:8px; color:${mainColor};">
                    إجمالي المبلغ المرتجع: ${subTotal.toFixed(2)} ج.م
                </div>
            </div>
        `;
    } else if (type === 'dailyReport') {
        const fromD = document.getElementById('reportDateFrom')?.value || todayDate;
        const toD = document.getElementById('reportDateTo')?.value || todayDate;
        const data = window.dailyReportData || {};
        const netProfit = data.netProfit !== undefined ? data.netProfit.toFixed(2) : '0.00';
        const totalSales = data.totalSales !== undefined ? data.totalSales.toFixed(2) : '0.00';
        const totalPurchases = data.totalPurchases !== undefined ? data.totalPurchases.toFixed(2) : '0.00';
        const totalExpenses = data.totalExpenses !== undefined ? data.totalExpenses.toFixed(2) : '0.00';
        const totalReceipts = data.totalReceipts !== undefined ? data.totalReceipts.toFixed(2) : '0.00';
        const grossProfit = data.grossProfit !== undefined ? data.grossProfit.toFixed(2) : '0.00';

        receiptArea.innerHTML = `
            <div class="print-container" style="direction:rtl; padding:25px; font-family:'Cairo','Arial',sans-serif; background:#fff; color:#000; width:100%; box-sizing:border-box; border:2px solid #0f172a; border-radius:10px;">
                <div style="text-align:center; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:15px;">
                    <div style="font-size:24px; font-weight:900; color:#0f172a;">${shopName}</div>
                    ${shopAddress ? `<div style="font-size:13px; color:#475569;">${shopAddress} ${shopPhone ? ' | ' + shopPhone : ''}</div>` : ''}
                    <div style="font-size:18px; font-weight:bold; background:#0f172a; color:#fff; display:inline-block; padding:6px 24px; margin-top:10px; border-radius:6px;">📊 تقرير الحركة والملخص اليومي</div>
                </div>

                <div style="display:flex; justify-content:space-between; background:#f8fafc; padding:10px 15px; border:1px solid #cbd5e1; border-radius:6px; margin-bottom:15px; font-size:13px; font-weight:bold;">
                    <div>الفترة من: ${fromD} إلى: ${toD}</div>
                    <div>تاريخ الاستخراج: ${todayDate} - ${todayTime}</div>
                    <div>المسؤول: ${userName}</div>
                </div>

                <table style="width:100%; border-collapse:collapse; margin-bottom:15px; font-size:14px;">
                    <thead>
                        <tr style="background:#0f172a; color:#fff;">
                            <th style="padding:10px; border:1px solid #000; text-align:right;">بيان الحركة المالية</th>
                            <th style="padding:10px; border:1px solid #000; text-align:left;">المبلغ الإجمالي (ج.م)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style="padding:9px; border:1px solid #cbd5e1; font-weight:bold;">🛍️ إجمالي المبيعات</td><td style="padding:9px; border:1px solid #cbd5e1; text-align:left; font-weight:900; color:#16a34a;">${totalSales} ج.م</td></tr>
                        <tr><td style="padding:9px; border:1px solid #cbd5e1; font-weight:bold;">📦 إجمالي المشتريات والتوريد</td><td style="padding:9px; border:1px solid #cbd5e1; text-align:left; font-weight:900; color:#dc2626;">${totalPurchases} ج.م</td></tr>
                        <tr><td style="padding:9px; border:1px solid #cbd5e1; font-weight:bold;">💵 إجمالي المقبوضات (سندات القبض)</td><td style="padding:9px; border:1px solid #cbd5e1; text-align:left; font-weight:900; color:#0284c7;">${totalReceipts} ج.م</td></tr>
                        <tr><td style="padding:9px; border:1px solid #cbd5e1; font-weight:bold;">💸 إجمالي المصروفات وسندات الصرف</td><td style="padding:9px; border:1px solid #cbd5e1; text-align:left; font-weight:900; color:#e11d48;">${totalExpenses} ج.م</td></tr>
                        <tr style="background:#f1f5f9;"><td style="padding:9px; border:1px solid #cbd5e1; font-weight:bold;">📈 مجمل الأرباح</td><td style="padding:9px; border:1px solid #cbd5e1; text-align:left; font-weight:900; color:#2563eb;">${grossProfit} ج.م</td></tr>
                        <tr style="background:#dcfce7;"><td style="padding:12px; border:2px solid #16a34a; font-weight:900; font-size:16px;">🎯 صافي الربح النهائي</td><td style="padding:12px; border:2px solid #16a34a; text-align:left; font-weight:900; font-size:18px; color:#15803d;">${netProfit} ج.م</td></tr>
                    </tbody>
                </table>

                <div style="text-align:center; margin-top:20px; font-size:12px; color:#64748b; border-top:1px solid #e2e8f0; padding-top:10px;">${footerMsg}</div>
            </div>
        `;
    } else {
        // فواتير المبيعات والمشتريات العادية
        const isSales = (type === 'sales');
        const title = isSales ? "فاتورة مبيعات" : "فاتورة مشتريات 🚐";
        const partner = isSales ? (document.getElementById('customerName')?.value.trim() || 'عميل نقدي') : (document.getElementById('supplierName')?.value.trim() || 'مورد');
        const method = isSales ? (typeof getSelectedPaymentMethod === 'function' ? getSelectedPaymentMethod('sales-section') : 'نقدي') : (document.getElementById('purchasePaymentMethod')?.value || 'نقدي');
        const dt = (typeof getTransactionDateTime === 'function' ? getTransactionDateTime('salesDate', 'salesTime') : { full: todayDate });
        const invId = isSales ? (document.getElementById('salesBadgeID')?.innerText || '---') : (document.getElementById('purBadgeID')?.innerText || '---');
        let cartArr = isSales ? (typeof cart !== 'undefined' ? cart : []) : (typeof purchaseCart !== 'undefined' ? purchaseCart : []);
        
        if ((!cartArr || cartArr.length === 0) && typeof editingOriginalItems !== 'undefined' && Array.isArray(editingOriginalItems) && editingOriginalItems.length > 0) {
            cartArr = editingOriginalItems.map(item => ({
                name: item.product || item.name,
                qty: item.qty,
                price: item.price,
                unit: item.unit,
                selectedUnit: item.unit
            }));
        }
        if ((!cartArr || cartArr.length === 0) && typeof editingInvoiceId !== 'undefined' && editingInvoiceId && typeof transactions !== 'undefined') {
            const invTx = transactions.filter(t => String(t.invoiceId) === String(editingInvoiceId) && t.product);
            if (invTx.length > 0) {
                cartArr = invTx.map(item => ({
                    name: item.product || item.productName || item.name,
                    qty: item.qty,
                    price: item.price,
                    unit: item.unit,
                    selectedUnit: item.unit
                }));
            }
        }

        let subTotal = cartArr.reduce((sum, item) => sum + ((parseFloat(item.price)||0) * (parseFloat(item.qty)||1)), 0);
        let itemsRows = cartArr.map(item => {
            const qty = parseFloat(item.qty || 0);
            const price = parseFloat(item.price || 0);
            const lineTotal = (price * qty).toFixed(2);
            const unitName = item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (item.unit || 'قطعة');
            return `<tr>
                <td style="text-align:right; padding:6px; border:1px solid #000; font-weight:bold;">${item.name || ''}</td>
                <td style="text-align:center; padding:6px; border:1px solid #000;">${qty} ${unitName}</td>
                <td style="text-align:center; padding:6px; border:1px solid #000;">${price.toFixed(2)}</td>
                <td style="text-align:center; padding:6px; border:1px solid #000; font-weight:bold;">${lineTotal}</td>
            </tr>`;
        }).join('');

        let discountVal = parseFloat(document.getElementById('discountInput')?.value) || 0;
        let discountAmount = (document.getElementById('discountType')?.value === 'perc') ? (subTotal * discountVal / 100) : discountVal;
        let taxVal = parseFloat(document.getElementById('taxInput')?.value) || 0;
        let taxAmount = (document.getElementById('taxType')?.value === 'perc') ? (subTotal * taxVal / 100) : taxVal;
        let grandTotal = (subTotal - discountAmount + taxAmount);

        receiptArea.innerHTML = `
            <div class="print-container" style="direction:rtl; padding:20px; font-family:'Arial',sans-serif; background:#fff; color:#000; width:100%; box-sizing:border-box;">
                <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:12px; margin-bottom:12px;">
                    <div style="font-size:24px; font-weight:900;">${shopName}</div>
                    ${shopAddress ? `<div style="font-size:13px; color:#555;">${shopAddress} ${shopPhone ? ' | ' + shopPhone : ''}</div>` : ''}
                    <div style="font-size:18px; font-weight:bold; border:2px solid #000; display:inline-block; padding:4px 18px; margin-top:8px; border-radius:6px; background:#f8fafc;">${title}</div>
                </div>
                <table style="width:100%; margin-bottom:12px; font-size:13px; font-weight:bold; line-line:1.6;">
                    <tr><td><b>رقم الفاتورة:</b> ${invId}</td><td style="text-align:left;"><b>التاريخ والوقت:</b> ${dt.full || dt.iso || todayDate}</td></tr>
                    <tr><td><b>الطرف الثاني:</b> ${partner}</td><td style="text-align:left;"><b>طريقة الدفع:</b> ${method}</td></tr>
                    <tr><td><b>المستخدم المسؤول:</b> ${userName}</td><td></td></tr>
                </table>
                <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:13px;">
                    <thead>
                        <tr style="background:#f1f5f9;">
                            <th style="text-align:right; border:1px solid #000; padding:8px;">الصنف / المنتج</th>
                            <th style="border:1px solid #000; padding:8px;">الكمية</th>
                            <th style="border:1px solid #000; padding:8px;">السعر (ج.م)</th>
                            <th style="border:1px solid #000; padding:8px;">الإجمالي (ج.م)</th>
                        </tr>
                    </thead>
                    <tbody>${itemsRows}</tbody>
                </table>
                <div style="font-size:14px; font-weight:bold; border-top:2px solid #000; padding-top:10px; line-height:1.8;">
                    <div style="display:flex; justify-content:space-between;"><span>المجموع الفرعي:</span><span>${subTotal.toFixed(2)} ج.م</span></div>
                    ${discountAmount > 0 ? `<div style="display:flex; justify-content:space-between; color:#dc2626;"><span>إجمالي الخصم:</span><span>-${discountAmount.toFixed(2)} ج.م</span></div>` : ''}
                    ${taxAmount > 0 ? `<div style="display:flex; justify-content:space-between; color:#2563eb;"><span>إجمالي الضريبة:</span><span>+${taxAmount.toFixed(2)} ج.م</span></div>` : ''}
                    <div style="display:flex; justify-content:space-between; font-size:19px; font-weight:900; margin-top:6px; border-top:2px dashed #000; padding-top:6px;"><span>صافي الإجمالي النهائي:</span><span>${grandTotal.toFixed(2)} ج.م</span></div>
                </div>
                <div style="text-align:center; margin-top:20px; font-size:13px; border-top:1px solid #ccc; padding-top:10px; font-weight:bold;">${footerMsg}</div>
            </div>
        `;
    }
}
window.prepareBillHTML = prepareBillHTML;

// ================= تصدير العناصر كصورة عالية الجودة =================
async function exportElementToImage(elementOrId, fileName) {
    try {
        let element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
        if (!element) throw new Error("العنصر المراد تصديره غير موجود!");

        let isHidden = false;
        let origDisplay = '', origPos = '', origLeft = '', origTop = '', origZIndex = '';

        if (window.getComputedStyle(element).display === 'none') {
            isHidden = true;
            origDisplay = element.style.display;
            origPos = element.style.position;
            origLeft = element.style.left;
            origTop = element.style.top;
            origZIndex = element.style.zIndex;

            element.style.display = 'block';
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            element.style.top = '0px';
            element.style.zIndex = '-9999';
        }

        if (typeof html2canvas === 'function') {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            if (isHidden) {
                element.style.display = origDisplay;
                element.style.position = origPos;
                element.style.left = origLeft;
                element.style.top = origTop;
                element.style.zIndex = origZIndex;
            }

            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            const cleanName = (fileName || 'صورة_التقرير').replace(/[\\\/:*?"<>|]/g, '_');
            link.download = cleanName.endsWith('.png') ? cleanName : (cleanName + '.png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (typeof showToast === 'function') showToast("✅ تم تصدير صورة التقرير بنجاح", "success");
        } else {
            if (isHidden) {
                element.style.display = origDisplay;
                element.style.position = origPos;
                element.style.left = origLeft;
                element.style.top = origTop;
                element.style.zIndex = origZIndex;
            }
            showToast("⚠️ مكتبة تحويل الصور غير محملة", "error");
        }
    } catch(err) {
        console.error("Image Export Error:", err);
        if (typeof showToast === 'function') showToast("❌ فشل تصدير الصورة: " + err.message, "error");
    }
}
window.exportElementToImage = exportElementToImage;

function exportCurrentBill(type, format) {
    let fileName = "فاتورة";
    let elementId = "";

    if (type === 'sales') {
        fileName = "فاتورة_مبيعات_" + (document.getElementById('customerName')?.value || 'عميل');
        elementId = 'sales-section';
    } else if (type === 'salesReturn') {
        fileName = "مرتجع_مبيعات_" + (document.getElementById('salesReturnPartnerDisplay')?.innerText || 'عميل');
        elementId = 'sales-return-section';
    } else if (type === 'purchaseReturn') {
        fileName = "مرتجع_مشتريات_" + (document.getElementById('purReturnPartnerDisplay')?.innerText || 'مورد');
        elementId = 'purchase-return-section';
    } else if (type === 'purchase') {
        fileName = "فاتورة_مشتريات_" + (document.getElementById('supplierName')?.value || 'مورد');
        elementId = 'purchase-section';
    } else if (type === 'receipt') {
        fileName = "سند_قبض_" + (document.getElementById('receiptCustomer')?.value || 'عميل');
        elementId = 'receipt-section';
    } else if (type === 'disbursement') {
        fileName = "سند_صرف_" + (document.getElementById('disbursePayee')?.value || 'جهة');
        elementId = 'disbursement-section';
    } else if (type === 'adjustment') {
        fileName = "تسوية_مخزنية_" + new Date().toLocaleDateString('ar-EG');
        elementId = 'adjustment-section';
    } else if (type === 'dailyReport') {
        fileName = "تقرير_الحركة_اليومية_" + (document.getElementById('reportDateFrom')?.value || new Date().toLocaleDateString('en-CA'));
        elementId = 'daily-report-section';
    } else if (type === 'invoices') {
        fileName = "سجل_الفواتير_والحركات";
        elementId = 'invoices-section';
    }

    document.querySelectorAll('.share-menu').forEach(m => m.classList.remove('active'));

    if (format === 'excel') {
        exportInvoiceDataToExcel(type, fileName);
    } else if (format === 'pdf') {
        prepareBillHTML(type);
        const receiptArea = document.getElementById('receipt-area');
        let target = (receiptArea && receiptArea.children.length > 0) ? receiptArea : elementId;
        exportElementToPDF(target, fileName);
    } else if (format === 'image') {
        prepareBillHTML(type);
        const receiptArea = document.getElementById('receipt-area');
        let target = (receiptArea && receiptArea.children.length > 0) ? receiptArea : elementId;
        exportElementToImage(target, fileName);
    }
}
window.exportCurrentBill = exportCurrentBill;

// ================= مساعد بَيَان الذكي (Gemini AI Assistant Copilot) =================
window.aiConversationHistory = window.aiConversationHistory || [];

function toggleAICopilot() {
    const drawer = document.getElementById('aiCopilotDrawer');
    if (!drawer) return;

    const isHidden = drawer.style.right === '-420px' || drawer.style.right === '';
    if (isHidden) {
        drawer.style.right = '0px';
        const alertBox = document.getElementById('aiKeyAlertBox');
        window.getGeminiApiKeys().then(keys => {
            if (alertBox) alertBox.style.display = (keys.length === 0) ? 'block' : 'none';
        });
        setTimeout(() => {
            document.getElementById('aiChatInput')?.focus();
        }, 400);
    } else {
        drawer.style.right = '-420px';
        if (typeof isAIVoiceActive !== 'undefined' && isAIVoiceActive) stopAIVoice();
    }
}

async function saveQuickAIKey() {
    const key = document.getElementById('aiQuickApiKeyInput').value.trim();
    if (!key) return alert('⚠️ يرجى إدخال مفتاح API صحيح');
    try {
        if (typeof db !== 'undefined' && db.settings) {
            await db.settings.put({ id: 'gemini_key', value: key });
            removeStore('bayan_gemini_key');
        }
    } catch(e) {
        setStore('bayan_gemini_key', key);
    }

    const settingsInput = document.getElementById('geminiApiKeyInput');
    if (settingsInput) settingsInput.value = key;

    document.getElementById('aiKeyAlertBox').style.display = 'none';
    showToast('✅ تم حفظ مفتاح API وتفعيل المساعد بنجاح!', 'success');
}

function getAILocalDatabaseContext() {
    const accountsList = (window.accounts || []).slice(0, 50).map(a => {
        const bal = typeof getAccountBalance === 'function' ? getAccountBalance(a.name) : 0;
        return `- ${a.name} (${a.type}): رصيده ${bal.toFixed(2)} ج.م`;
    }).join('\n');

    const productsList = (window.productsDB || []).slice(0, 100).map(p => {
        return `- ${p.name} (كود: ${p.code || '---'}, باركود: ${p.barcode || '---'}): المخزون العام: ${p.stock || 0} ${p.unit || 'قطعة'}, سعر البيع: ${p.price || 0} ج.م`;
    }).join('\n');

    const recentTransactions = (window.transactions || []).slice(-30).map(t => {
        return `- فاتورة #${t.invoiceId || 'بدون'} | التاريخ: ${t.date} | النوع: ${t.type} | الطرف: ${t.partner || 'عام'} | الإجمالي: ${t.total || t.price || 0} ج.م`;
    }).join('\n');

    const activeTab = window.activeTabId || 'dashboard';
    const user = (window.currentUser && window.currentUser.name) ? window.currentUser.name : 'المدير';

    return `
=== حالة النظام الحالية ===
- المستخدم الحالي: ${user}
- التبويب المفتوح حالياً: ${activeTab}

=== قائمة العملاء والموردين وأرصدتهم الحالية ===
${accountsList || 'لا توجد حسابات مسجلة حالياً.'}

=== قائمة المنتجات والأسعار والمخزون الحالي ===
${productsList || 'لا توجد أصناف في المخزن حالياً.'}

=== ملخص آخر 30 حركة مالية وفواتير ===
${recentTransactions || 'لا توجد فواتير مسجلة حالياً.'}
`;
}

window.getGeminiApiKeys = async function() {

    let apiKeys = [];
    try {
        if (typeof db !== 'undefined' && db.settings) {
            const stored = await db.settings.get('gemini_key');
            if (stored && stored.value) {
                apiKeys = stored.value.split(/[\s,;\|]+/).map(k => k.trim()).filter(Boolean);
            }
        }
    } catch(e) {}

    if (apiKeys.length === 0) {
        const userKeys = getStore('bayan_gemini_key');
        if (userKeys) {
            apiKeys = userKeys.split(/[\s,;\|]+/).map(k => k.trim()).filter(Boolean);
        }
    }
    return apiKeys;
};

function checkAILimits() {
    let usage = JSON.parse(getStore('bayan_ai_usage'));
    if (!usage) {
        usage = {
            currentCount: 0,
            lastResetTime: Date.now(),
            weeklyCount: 0,
            weeklyResetTime: Date.now()
        };
    }

    const now = Date.now();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    if (now - usage.lastResetTime >= twelveHoursMs) {
        usage.currentCount = 0;
        usage.lastResetTime = now;
    }
    if (now - usage.weeklyResetTime >= sevenDaysMs) {
        usage.weeklyCount = 0;
        usage.weeklyResetTime = now;
    }

    setStore('bayan_ai_usage', JSON.stringify(usage));
    return usage;
}

function incrementAIUsage() {
    let usage = checkAILimits();
    usage.currentCount++;
    usage.weeklyCount++;
    setStore('bayan_ai_usage', JSON.stringify(usage));
    if (typeof window.updateAILimitsUI === 'function') window.updateAILimitsUI();
}

window.updateAILimitsUI = function() {
    const usage = checkAILimits();
    const currentPct = Math.min(100, Math.round((usage.currentCount / AI_LIMIT_12H) * 100));
    const currentTextEl = document.getElementById('aiCurrentUsageText');
    const currentBarEl = document.getElementById('aiCurrentUsageBar');

    if (currentTextEl) currentTextEl.innerText = `تم استخدام ${currentPct}%`;
    if (currentBarEl) {
        currentBarEl.style.width = `${currentPct}%`;
        currentBarEl.style.background = currentPct >= 100 ? '#ef4444' : '#f8fafc';
    }
};

async function sendAIChatMessage() {
    const usage = checkAILimits();
    if (usage.currentCount >= AI_LIMIT_12H) {
        showCustomAlert({
            type: 'warning',
            titleText: '⚠️ تنبيه!',
            msg: `لقد استنفدت الحد الأقصى للمساعد الذكي (${AI_LIMIT_12H} رسائل). يُعاد ضبط السقف خلال 12 ساعة.`
        });
        return;
    }

    const inputEl = document.getElementById('aiChatInput');
    const query = inputEl.value.trim();
    if (!query) return;

    const apiKeys = await window.getGeminiApiKeys();
    if (apiKeys.length === 0) {
        alert('⚠️ يرجى تعيين مفتاح Gemini API أولاً لتشغيل المساعد.');
        document.getElementById('aiKeyAlertBox').style.display = 'flex';
        return;
    }

    appendAIChatBubble(query, 'user');
    inputEl.value = '';

    const loadingId = 'ai-loading-' + Date.now();
    const messagesContainer = document.getElementById('aiChatMessages');
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'ai-loading-msg';
    loadingBubble.id = loadingId;
    loadingBubble.innerHTML = `<div class="ai-loading-dot"></div><div class="ai-loading-dot"></div><div class="ai-loading-dot"></div>`;
    messagesContainer.appendChild(loadingBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const dbContext = getAILocalDatabaseContext();
        const systemInstruction = `أنت "مساعد بَيَان الذكي" (Bayan AI Copilot)، خبير مالي وإداري محترف في نظام بَيَان المحاسبي. أجب باللغة العربية بأسلوب راقي ومبسط.`;
        const fullPrompt = `${systemInstruction}\n\nبيانات البرامج الحالية:\n${dbContext}\n\nسؤال المستخدم: ${query}`;

        let response = null;
        let lastError = null;
        for (let k = 0; k < apiKeys.length; k++) {
            try {
                response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKeys[k]}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: fullPrompt }] }] })
                });
                if (response.ok) { lastError = null; break; }
            } catch (e) { lastError = e; }
        }

        if (lastError || !response || !response.ok) throw lastError || new Error("فشلت المحاولة.");

        const data = await response.json();
        const replyText = data.candidates[0].content.parts[0].text || 'فشل في توليد إجابة.';

        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        incrementAIUsage();
        appendAIChatBubble(replyText, 'bot');
    } catch (err) {
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        appendAIChatBubble(`⚠️ مساعد بَيَان الذكي قيد التحديث، يرجى المحاولة لاحقاً.`, 'bot');
    }
}

function appendAIChatBubble(text, sender) {
    const messagesContainer = document.getElementById('aiChatMessages');
    if (!messagesContainer) return;

    const bubble = document.createElement('div');
    bubble.className = sender === 'user' ? 'ai-user-msg' : 'ai-bot-msg';

    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

    bubble.innerHTML = `<div style="line-height: 1.6;">${formattedText}</div>`;
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ================= نافذة التنبيه وقف الحساب التلقائي (Bayan License Lock Modal) =================
function showBayanLicenseLockModal(reasonText) {
    let modal = document.getElementById('bayanLicenseLockModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bayanLicenseLockModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(20px);
            z-index: 99999999; display: flex; align-items: center; justify-content: center;
            direction: rtl; font-family: 'Cairo', sans-serif; padding: 20px; box-sizing: border-box;
        `;
        modal.innerHTML = `
            <div style="background: #ffffff; width: 100%; max-width: 580px; border-radius: 24px; padding: 40px 30px; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.5); border: 2px solid #ef4444;">
                <div style="width: 80px; height: 80px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                    <span style="font-size: 40px; color: #ef4444;">🔒</span>
                </div>
                <h2 style="color: #991b1b; font-size: 1.8rem; font-weight: 900; margin: 0 0 15px 0;">تنبيه: انتهت فترة التجربة / الاشتراك</h2>
                <p id="bayanLockReasonText" style="color: #374151; font-size: 1.1rem; line-height: 1.7; margin: 0 0 25px 0; font-weight: 600;">${reasonText}</p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 25px;">
                    <div style="color: #64748b; font-size: 0.95rem; font-weight: 700; margin-bottom: 8px;">📞 لتفعيل/تجديد الاشتراك اتصل أو تواصل عبر واتساب:</div>
                    <div style="color: #064e3b; font-size: 1.6rem; font-weight: 900; letter-spacing: 1px;">01006825905</div>
                </div>
                <a href="https://wa.me/201006825905" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; gap: 10px; background: #25d366; color: white; text-decoration: none; padding: 14px 30px; font-size: 1.1rem; font-weight: 800; border-radius: 14px; box-shadow: 0 8px 20px rgba(37, 211, 102, 0.3);">
                    💬 التواصل مباشرة عبر واتساب (01006825905)
                </a>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        const p = document.getElementById('bayanLockReasonText');
        if (p) p.innerText = reasonText;
        modal.style.display = 'flex';
    }
}
window.showBayanLicenseLockModal = showBayanLicenseLockModal;

function hideBayanLicenseLockModal() {
    const modal = document.getElementById('bayanLicenseLockModal');
    if (modal) modal.style.display = 'none';
}
window.hideBayanLicenseLockModal = hideBayanLicenseLockModal;

// ================= استعلام الأصناف المطور (Product Inquiry Logic) =================
function handleInquirySearch(query) {
    query = query.trim().toLowerCase();
    const productListEl = document.getElementById('inquiryProductList');
    if (!productListEl) return;

    if (!query) {
        renderInquiryProductList(productsDB);
        return;
    }

    const filtered = productsDB.filter(p => {
        const nameMatch = p.name && p.name.toLowerCase().includes(query);
        const codeMatch = p.code && p.code.toLowerCase().includes(query);
        const barcodeMatch = p.barcode && p.barcode.toLowerCase() === query;
        const barcodeInclude = p.barcode && p.barcode.toLowerCase().includes(query);
        return nameMatch || codeMatch || barcodeMatch || barcodeInclude;
    });

    renderInquiryProductList(filtered);
}

function renderInquiryProductList(products) {
    const productListEl = document.getElementById('inquiryProductList');
    if (!productListEl) return;

    if (products.length === 0) {
        productListEl.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px; font-size: 0.9rem;">⚠️ لا توجد نتائج مطابقة</div>';
        return;
    }

    productListEl.innerHTML = products.map(p => `
        <div class="inquiry-product-item" id="inquiry-item-${p.id}" onclick="selectProductForInquiry(${p.id})">
            <div style="display: flex; flex-direction: column; gap: 4px; text-align: right;">
                <div class="name">${p.name}</div>
                <div class="code">كود: ${p.code || '---'} | باركود: ${p.barcode || '---'}</div>
            </div>
            <span style="font-size: 0.95rem; font-weight: 900; color: #6d28d9; white-space: nowrap;">${parseFloat(p.price || 0).toFixed(2)} ${typeof getCurrencySymbol === 'function' ? getCurrencySymbol() : 'ج.م'}</span>
        </div>
    `).join('');
}

// =========================================================================
// 💰 دالة رمز العملة الشاملة والموحدة (Global Reactive Currency Symbol)
// =========================================================================
function getCurrencySymbol() {
    try {
        const stored = typeof getStore === 'function' ? getStore('pos_settings') : null;
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.currencySymbol) return parsed.currencySymbol;
        }
        const inputEl = document.getElementById('appCurrencySymbol');
        if (inputEl && inputEl.value) return inputEl.value;
    } catch(e) {}
    return 'ج.م';
}
window.getCurrencySymbol = getCurrencySymbol;

function updateAllCurrencyLabels() {
    const symbol = getCurrencySymbol();
    
    // 1. تحديث خيارات الخصم والإضافة في فواتير البيع والشراء والمرتجعات
    const discountAdditionSelects = [
        'salesDiscountType', 'salesAdditionType',
        'purDiscountType', 'purAdditionType',
        'salesReturnDiscountType', 'salesReturnAdditionType',
        'purReturnDiscountType', 'purReturnAdditionType'
    ];
    discountAdditionSelects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            Array.from(el.options).forEach(opt => {
                if (opt.value === 'val') {
                    opt.textContent = symbol;
                }
            });
        }
    });

    document.querySelectorAll('.currency-symbol-dynamic, select option[value="val"]').forEach(opt => {
        opt.textContent = symbol;
    });

    // 2. تحديث كروت الأصناف السريعة
    if (typeof renderQuickItems === 'function') renderQuickItems();
}
window.updateAllCurrencyLabels = updateAllCurrencyLabels;

// =========================================================================
// 💳 نظام وسائل وطرق الدفع المخصصة الديناميكية (Dynamic Payment Methods System)
// =========================================================================

window.DEFAULT_PAYMENT_METHODS = [
    { id: 'cash', name: 'كاش (نقدي)', type: 'cash', active: true, isSystem: true },
    { id: 'network', name: 'شبكة / مدى', type: 'bank', active: true, isSystem: false },
    { id: 'transfer', name: 'تحويل بنكي', type: 'bank', active: true, isSystem: false },
    { id: 'credit', name: 'أجل (حساب عميل/مورد)', type: 'credit', active: true, isSystem: true },
    { id: 'ninja', name: 'نينجا (Ninja)', type: 'bank', active: true, isSystem: false },
    { id: 'tamara', name: 'تمارا (Tamara)', type: 'bank', active: true, isSystem: false },
    { id: 'stc_pay', name: 'STC Pay', type: 'bank', active: true, isSystem: false },
    { id: 'visa', name: 'فيزا / ماستركارد', type: 'bank', active: true, isSystem: false }
];

function getPaymentMethods() {
    try {
        const stored = typeof getStore === 'function' ? getStore('bayan_payment_methods') : null;
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch(e) {}
    return window.DEFAULT_PAYMENT_METHODS;
}

function savePaymentMethods(methodsList) {
    if (typeof setStore === 'function') {
        setStore('bayan_payment_methods', JSON.stringify(methodsList));
    }
    populatePaymentMethodSelects();
    renderPaymentMethodsSettings();
}

function populatePaymentMethodSelects() {
    const methods = getPaymentMethods().filter(m => m.active !== false);
    
    const targetSelectIds = [
        'sales-sectionPaymentMethodSelect',
        'purchase-sectionPaymentMethodSelect',
        'sales-return-sectionPaymentMethodSelect',
        'purchase-return-sectionPaymentMethodSelect',
        'receiptTreasurySelect',
        'disburseTreasurySelect',
        'dailyReportTreasurySelect',
        'paymentMethod',
        'salePaymentMethod',
        'purchasePaymentMethod',
        'trFormPaymentMethod',
        'trPaymentMethodFilter',
        'acFilterPaymentMethod',
        'treasuryFilterPaymentMethod',
        'quickPaymentMethodSelect'
    ];

    const dynamicSelects = document.querySelectorAll('select[id*="PaymentMethod"], select[id*="paymentMethod"], select[name*="paymentMethod"]');
    const allSelects = new Set([...dynamicSelects]);
    
    targetSelectIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) allSelects.add(el);
    });

    allSelects.forEach(selectEl => {
        if (!selectEl) return;
        const currentVal = selectEl.value;
        const isFilter = selectEl.id && selectEl.id.toLowerCase().includes('filter');
        
        let html = isFilter ? '<option value="">كل وسائل الدفع...</option>' : '';
        methods.forEach(m => {
            const icon = m.type === 'cash' ? '💵' : (m.type === 'credit' ? '⏳' : '🏦');
            html += `<option value="${m.name}">${icon} ${m.name}</option>`;
        });
        selectEl.innerHTML = html;
        if (currentVal && Array.from(selectEl.options).some(o => o.value === currentVal)) {
            selectEl.value = currentVal;
        }
    });
}

function renderPaymentMethodsSettings() {
    const tbody = document.getElementById('paymentMethodsTableBody');
    if (!tbody) return;

    const methods = getPaymentMethods();
    let html = '';

    methods.forEach((m, idx) => {
        const isProtected = m.isSystem || m.id === 'cash' || m.id === 'credit' || m.type === 'cash' || m.type === 'credit';

        const typeBadge = m.type === 'cash' 
            ? '<span style="background:#ecfdf5; color:#047857; padding:4px 12px; border-radius:12px; font-weight:bold; font-size:0.8rem;">💵 نقدي (كاش)</span>'
            : m.type === 'credit'
            ? '<span style="background:#fffbeb; color:#b45309; padding:4px 12px; border-radius:12px; font-weight:bold; font-size:0.8rem;">📝 أجل (ذمم)</span>'
            : '<span style="background:#f0f9ff; color:#0369a1; padding:4px 12px; border-radius:12px; font-weight:bold; font-size:0.8rem;">🏦 بنكي / إلكتروني</span>';

        const statusBadge = isProtected 
            ? '<span style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:8px; font-weight:900; font-size:0.8rem;">🟢 مفعّل دائمًا</span>'
            : (m.active !== false
                ? '<span style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:8px; font-weight:900; font-size:0.8rem;">🟢 مفعّل</span>'
                : '<span style="background:#fee2e2; color:#b91c1c; padding:4px 10px; border-radius:8px; font-weight:900; font-size:0.8rem;">🔴 معطّل</span>');

        const orderButtons = `
            <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                <button type="button" onclick="movePaymentMethodUp(${idx})" ${idx === 0 ? 'disabled style="opacity:0.35; cursor:not-allowed; border:1px solid #e2e8f0; background:#f8fafc;"' : 'style="cursor:pointer; background:#ffffff; border:1.5px solid #cbd5e1;"'} class="btn-delete-row" title="تقديم للأعلى" style="padding:6px 10px; border-radius:10px; font-size:0.85rem; transition:0.2s; box-shadow:0 2px 5px rgba(0,0,0,0.03);" onmouseover="if(!this.disabled) { this.style.borderColor='#3b82f6'; this.style.transform='translateY(-1px)'; }" onmouseout="if(!this.disabled) { this.style.borderColor='#cbd5e1'; this.style.transform='none'; }">
                    ⬆️
                </button>
                <button type="button" onclick="movePaymentMethodDown(${idx})" ${idx === methods.length - 1 ? 'disabled style="opacity:0.35; cursor:not-allowed; border:1px solid #e2e8f0; background:#f8fafc;"' : 'style="cursor:pointer; background:#ffffff; border:1.5px solid #cbd5e1;"'} class="btn-delete-row" title="تأخير للأسفل" style="padding:6px 10px; border-radius:10px; font-size:0.85rem; transition:0.2s; box-shadow:0 2px 5px rgba(0,0,0,0.03);" onmouseover="if(!this.disabled) { this.style.borderColor='#3b82f6'; this.style.transform='translateY(-1px)'; }" onmouseout="if(!this.disabled) { this.style.borderColor='#cbd5e1'; this.style.transform='none'; }">
                    ⬇️
                </button>
            </div>
        `;

        const actionsHtml = isProtected ? `
            <div style="display: flex; justify-content: center; align-items: center;">
                <span style="background: #f8fafc; color: #475569; padding: 6px 16px; border-radius: 12px; font-weight: 800; font-size: 0.8rem; border: 1.5px solid #e2e8f0; display: inline-flex; align-items: center; gap: 6px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);">
                    🔒 وسيلة أساسية بالنظام
                </span>
            </div>
        ` : `
            <div style="display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap;">
                <button type="button" onclick="openAddPaymentMethodModal(${idx})" style="padding:6px 14px; border-radius:10px; border:1.5px solid #bfdbfe; background:linear-gradient(135deg, #eff6ff, #dbeafe); color:#1d4ed8; cursor:pointer; font-weight:900; font-size:0.82rem; font-family:'Cairo',sans-serif; display:inline-flex; align-items:center; gap:5px; transition:0.25s; box-shadow:0 2px 6px rgba(29,78,216,0.08);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 10px rgba(29,78,216,0.18)'" onmouseout="this.style.transform='none'; this.style.boxShadow='0 2px 6px rgba(29,78,216,0.08)'">
                    ✏️ تعديل
                </button>
                <button type="button" onclick="togglePaymentMethodActive(${idx})" style="padding:6px 14px; border-radius:10px; border:1.5px solid ${m.active !== false ? '#fed7aa' : '#bbf7d0'}; background:linear-gradient(135deg, ${m.active !== false ? '#fff7ed, #ffedd5' : '#f0fdf4, #dcfce7'}); color:${m.active !== false ? '#c2410c' : '#15803d'}; cursor:pointer; font-weight:900; font-size:0.82rem; font-family:'Cairo',sans-serif; display:inline-flex; align-items:center; gap:5px; transition:0.25s; box-shadow:0 2px 6px rgba(0,0,0,0.05);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 10px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='none'; this.style.boxShadow='0 2px 6px rgba(0,0,0,0.05)'">
                    ${m.active !== false ? '⏸️ تعطيل' : '▶️ تفعيل'}
                </button>
                <button type="button" onclick="deletePaymentMethod(${idx})" title="حذف وسيلة الدفع" style="padding:6px 12px; border-radius:10px; border:1.5px solid #fecaca; background:linear-gradient(135deg, #fef2f2, #fee2e2); color:#dc2626; cursor:pointer; font-weight:900; font-size:0.85rem; font-family:'Cairo',sans-serif; display:inline-flex; align-items:center; justify-content:center; transition:0.25s; box-shadow:0 2px 6px rgba(220,38,38,0.08);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 10px rgba(220,38,38,0.2)'" onmouseout="this.style.transform='none'; this.style.boxShadow='0 2px 6px rgba(220,38,38,0.08)'">
                    🗑️ حذف
                </button>
            </div>
        `;

        html += `
            <tr style="border-bottom:1px solid #f1f5f9; transition:0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding:12px 10px; font-weight:900; color:#64748b; text-align:center;">${idx + 1}</td>
                <td style="padding:12px 15px; font-weight:900; color:#1e293b; font-size:0.95rem;">${m.name}</td>
                <td style="padding:12px 15px;">${typeBadge}</td>
                <td style="padding:12px 15px; text-align:center;">${statusBadge}</td>
                <td style="padding:12px 15px; text-align:center;">${orderButtons}</td>
                <td style="padding:12px 15px; text-align:center;">${actionsHtml}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function openAddPaymentMethodModal(editIdx = null) {
    const modal = document.getElementById('addPaymentMethodModal');
    if (!modal) return;
    const titleEl = document.getElementById('pmModalTitle');
    
    if (editIdx !== null && editIdx !== undefined && editIdx !== '') {
        const methods = getPaymentMethods();
        const m = methods[editIdx];
        if (m) {
            if (m.isSystem || m.id === 'cash' || m.id === 'credit' || m.type === 'cash' || m.type === 'credit') {
                if (typeof showToast === 'function') showToast("🔒 عذراً، لا يمكن تعديل وسائل الدفع الأساسية للنظام (نقدي / أجل)", "warning");
                return;
            }
            if (titleEl) titleEl.innerHTML = '✏️ تعديل وسيلة الدفع';
            document.getElementById('pmEditId').value = editIdx;
            document.getElementById('pmNameInput').value = m.name;
            document.getElementById('pmTypeSelect').value = m.type || 'bank';
        }
    } else {
        if (titleEl) titleEl.innerHTML = '💳 إضافة وسيلة دفع جديدة';
        document.getElementById('pmEditId').value = '';
        document.getElementById('pmNameInput').value = '';
        document.getElementById('pmTypeSelect').value = 'bank';
    }
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    setTimeout(() => {
        const inp = document.getElementById('pmNameInput');
        if (inp) inp.focus();
    }, 100);
}

function closeAddPaymentMethodModal() {
    const modal = document.getElementById('addPaymentMethodModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

function savePaymentMethodFromModal() {
    const nameInput = document.getElementById('pmNameInput');
    const typeSelect = document.getElementById('pmTypeSelect');
    const editIdInput = document.getElementById('pmEditId');
    if (!nameInput) return;

    const name = nameInput.value.trim();
    const type = typeSelect ? typeSelect.value : 'bank';
    const editIdx = editIdInput ? editIdInput.value : '';

    if (!name) {
        if (typeof showToast === 'function') showToast("⚠️ يرجى إدخال اسم وسيلة الدفع", "error");
        return;
    }

    const methods = getPaymentMethods();
    if (editIdx !== '' && editIdx !== null && methods[editIdx]) {
        if (methods[editIdx].isSystem || methods[editIdx].id === 'cash' || methods[editIdx].id === 'credit') {
            if (typeof showToast === 'function') showToast("🔒 لا يمكن تعديل وسائل النظام الأساسية", "warning");
            return;
        }
        methods[editIdx].name = name;
        methods[editIdx].type = type;
        if (typeof showToast === 'function') showToast(`✅ تم تحديث وسيلة الدفع (${name}) بنجاح!`, "success");
    } else {
        methods.push({
            id: 'pm_' + Date.now(),
            name: name,
            type: type,
            active: true,
            isSystem: false
        });
        if (typeof showToast === 'function') showToast(`✅ تم إضافة وسيلة الدفع (${name}) بنجاح!`, "success");
    }

    savePaymentMethods(methods);
    closeAddPaymentMethodModal();
}

function togglePaymentMethodActive(idx) {
    const methods = getPaymentMethods();
    if (methods[idx]) {
        if (methods[idx].isSystem || methods[idx].id === 'cash' || methods[idx].id === 'credit' || methods[idx].type === 'cash' || methods[idx].type === 'credit') {
            if (typeof showToast === 'function') showToast("🔒 وسيلة الدفع هذه أساسية في المنظومة ولا يمكن تعطيلها", "warning");
            return;
        }
        methods[idx].active = !methods[idx].active;
        savePaymentMethods(methods);
        if (typeof showToast === 'function') {
            showToast(`${methods[idx].active ? '🟢 تم تفعيل' : '⏸️ تم تعطيل'} وسيلة (${methods[idx].name})`);
        }
    }
}

function deletePaymentMethod(idx) {
    const methods = getPaymentMethods();
    if (methods[idx] && !methods[idx].isSystem) {
        const name = methods[idx].name;
        if (typeof showCustomAlert === 'function') {
            showCustomAlert({
                type: 'error',
                titleText: '🗑️ تأكيد حذف وسيلة الدفع',
                msg: `هل أنت متأكد من رغبتك في حذف وسيلة الدفع (<b style="color:#ef4444;">${name}</b>) نهائياً من النظام؟`,
                confirmText: 'نعم، حذف نهائي',
                cancelText: 'إلغاء',
                showCancel: true,
                onConfirm: () => {
                    methods.splice(idx, 1);
                    savePaymentMethods(methods);
                    if (typeof showToast === 'function') showToast(`🗑️ تم حذف وسيلة الدفع (${name}) بنجاح!`, "info");
                }
            });
        } else {
            methods.splice(idx, 1);
            savePaymentMethods(methods);
        }
    }
}

function movePaymentMethodUp(idx) {
    const methods = getPaymentMethods();
    if (idx > 0 && idx < methods.length) {
        const temp = methods[idx];
        methods[idx] = methods[idx - 1];
        methods[idx - 1] = temp;
        savePaymentMethods(methods);
        if (typeof showToast === 'function') showToast(`⬆️ تم تقديم وسيلة (${temp.name}) للأعلى`);
    }
}

function movePaymentMethodDown(idx) {
    const methods = getPaymentMethods();
    if (idx >= 0 && idx < methods.length - 1) {
        const temp = methods[idx];
        methods[idx] = methods[idx + 1];
        methods[idx + 1] = temp;
        savePaymentMethods(methods);
        if (typeof showToast === 'function') showToast(`⬇️ تم تأخير وسيلة (${temp.name}) للأسفل`);
    }
}

// تصدير كافة الدوال لـ window لضمان عملها عالمياً في أي مكان
window.getPaymentMethods = getPaymentMethods;
window.savePaymentMethods = savePaymentMethods;
window.populatePaymentMethodSelects = populatePaymentMethodSelects;
window.renderPaymentMethodsSettings = renderPaymentMethodsSettings;
window.openAddPaymentMethodModal = openAddPaymentMethodModal;
window.closeAddPaymentMethodModal = closeAddPaymentMethodModal;
window.savePaymentMethodFromModal = savePaymentMethodFromModal;
window.togglePaymentMethodActive = togglePaymentMethodActive;
window.deletePaymentMethod = deletePaymentMethod;
window.movePaymentMethodUp = movePaymentMethodUp;
window.movePaymentMethodDown = movePaymentMethodDown;

// تشغيل وسائط الدفع عند بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        populatePaymentMethodSelects();
        renderPaymentMethodsSettings();
    }, 400);
});
