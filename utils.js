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
            // ✅ أمان: IndexedDB هو المصدر الحقيقي لـ HWID - localStorage هو احتياطي فقط
            try {
                if (typeof db !== 'undefined' && db.settings) {
                    const stored = await db.settings.get('hwid');
                    if (stored && stored.value) {
                        // نحدّث الـ localStorage ليكون متزامناً دائماً
                        setStore('bayan_hwid', stored.value);
                        return stored.value;
                    }
                }
            } catch(e) {}

            // إذا لم يوجد في IndexedDB، نجرب localStorage (migration)
            let hwid = getStore('bayan_hwid');
            if (!hwid) {
                // توليد كود فريد للجهاز بتنسيق احترافي
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let part1 = '';
                let part2 = '';
                for(let i=0; i<4; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length));
                for(let i=0; i<4; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length));
                hwid = `BNC-${part1}-${part2}`;
            }

            // حفظ في IndexedDB و localStorage معاً
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

        // تم تعطيل نظام التحقق السحابي والقيود الأمنية
        function checkUpdates() {
            showToast("🔍 جاري التحقق من وجود تحديثات...");
            setTimeout(() => {
                showCustomAlert({
                    titleText: '✅ نظامك محدث',
                    msg: 'أنت تستخدم حالياً أحدث إصدار مستقر من بَيَان POS (Bayan POS System V1).',
                    type: 'success'
                });
            }, 1500);
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
            // بحث عن جميع الحركات التي تطابق الكلمة المفتاحية
            const filtered = transactions.filter(t => t.type.includes(typeKeyword) && t.invoiceId != null);
            if (filtered.length === 0) return 1;
            
            // إيجاد أعلى رقم فاتورة مستخدم بدلاً من عدّ الأسطر (لأن الفاتورة الواحدة قد تحتوي عدة أسطر)
            const maxId = Math.max(...filtered.map(t => parseInt(t.invoiceId) || 0));
            return maxId + 1;
        }

        // --- مراقبة حالة الاتصال (Offline/Online) ---
        window.addEventListener('online', updateConnectionStatus);
        window.addEventListener('offline', updateConnectionStatus);

        async function updateConnectionStatus() {
            const statusDiv = document.getElementById('connectionStatus');
            const statusText = document.getElementById('statusText');
            
            let isOnline = navigator.onLine;
            
            // If browser says online, verify actual internet connection to avoid false positives (e.g. connected to router but no internet)
            if (isOnline) {
                try {
                    // Try fetching a lightweight external resource
                    await fetch('https://1.1.1.1/cdn-cgi/trace', { mode: 'no-cors', cache: 'no-cache', method: 'HEAD' });
                    isOnline = true;
                } catch (e) {
                    isOnline = false;
                }
            }

            if (isOnline) {
                statusDiv.className = 'connection-status online';
                statusText.innerText = 'متصل';
            } else {
                statusDiv.className = 'connection-status offline';
                statusText.innerText = 'أوفلاين';
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
        window.acknowledgedLowStock = JSON.parse(getStore('acknowledged_low_stock')) || [];
        window.acknowledgedDebt = JSON.parse(getStore('acknowledged_debt')) || [];
        window.acknowledgedDelayed = JSON.parse(getStore('acknowledged_delayed')) || [];

        function updateNotifications() {
            const today = new Date();
            const lowStockItems = productsDB.filter(p => p.stock <= 5 && !window.acknowledgedLowStock.includes(p.id));

            const debtAccounts = accounts.filter(a => {
                const balance = (parseFloat(a.debit) || 0) - (parseFloat(a.credit) || 0);
                const isDebt = (a.type === 'client' || a.type === 'mixed') && balance > 0;
                return isDebt && !window.acknowledgedDebt.includes(a.id);
            });

            // العملاء المتأخرين (رصيد > 0 وأول عملية من أكتر من 30 يوم)
            const delayedClients = accounts.filter(a => {
                const balance = (parseFloat(a.debit) || 0) - (parseFloat(a.credit) || 0);
                if (!((a.type === 'client' || a.type === 'mixed') && balance > 0)) return false;
                if (window.acknowledgedDelayed.includes(a.id)) return false;

                // إيجاد آخر عملية لهذا الحساب
                const lastTrans = transactions.filter(t => t.partnerId === a.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                if (!lastTrans) return false;

                const lastDate = new Date(lastTrans.date);
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

        window.acknowledgeNotification = function(type, id) {
            if (type === 'low-stock') {
                if (!window.acknowledgedLowStock.includes(id)) window.acknowledgedLowStock.push(id);
                setStore('acknowledged_low_stock', JSON.stringify(window.acknowledgedLowStock));
            } else if (type === 'debt') {
                if (!window.acknowledgedDebt.includes(id)) window.acknowledgedDebt.push(id);
                setStore('acknowledged_debt', JSON.stringify(window.acknowledgedDebt));
            } else if (type === 'delayed') {
                if (!window.acknowledgedDelayed.includes(id)) window.acknowledgedDelayed.push(id);
                setStore('acknowledged_delayed', JSON.stringify(window.acknowledgedDelayed));
            }
            updateNotifications();
            if (typeof showNotificationsModal === 'function') {
                // إعادة فتح المودال مع بقائه في تبويب التنبيهات الجديدة 'new'
                showNotificationsModal('new');
            }
            showToast("✅ تم وضع علامة استلام على التنبيه");
        };

        window.unacknowledgeNotification = function(type, id) {
            if (type === 'low-stock') {
                window.acknowledgedLowStock = window.acknowledgedLowStock.filter(x => x !== id);
                setStore('acknowledged_low_stock', JSON.stringify(window.acknowledgedLowStock));
            } else if (type === 'debt') {
                window.acknowledgedDebt = window.acknowledgedDebt.filter(x => x !== id);
                setStore('acknowledged_debt', JSON.stringify(window.acknowledgedDebt));
            } else if (type === 'delayed') {
                window.acknowledgedDelayed = window.acknowledgedDelayed.filter(x => x !== id);
                setStore('acknowledged_delayed', JSON.stringify(window.acknowledgedDelayed));
            }
            updateNotifications();
            if (typeof showNotificationsModal === 'function') {
                showNotificationsModal('archived');
            }
            showToast("🔄 تم استعادة التنبيه للنشط");
        };

        window.resetAcknowledgedNotifications = function() {
            window.acknowledgedLowStock = [];
            window.acknowledgedDebt = [];
            window.acknowledgedDelayed = [];
            removeStore('acknowledged_low_stock');
            removeStore('acknowledged_debt');
            removeStore('acknowledged_delayed');
            updateNotifications();
            showToast("🔄 تم إعادة ضبط كافة التنبيهات");
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
            if (transactions.length === 0) return alert("لا توجد بيانات للتصدير");

            // إضافة BOM لدعم اللغة العربية في Excel
            let csvContent = "\uFEFFالتاريخ,النوع,الصنف,الكمية,السعر,الإجمالي,الطرف الثاني\n";

            transactions.forEach(row => {
                csvContent += `${row.date}, ${row.type}, ${row.product}, ${row.qty}, ${row.price}, ${row.total}, ${row.partner}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "item_history.csv";
            link.click();
        }

        // ================= منطق القبض (Receipt Logic) =================
        function calculateChange() {
            const tendered = parseFloat(document.getElementById('tenderedAmount').value) || 0;
            const change = tendered - currentTotal;
            if (document.getElementById('changeAmount')) document.getElementById('changeAmount').innerText = change.toFixed(2);

            // تحديث إجمالي المديونية المتراكمة عند تغيير المدفوع
            const prevBal = parseFloat(document.getElementById('prevBalanceDisplay').innerText) || 0;
            const grandTotalDebt = prevBal + currentTotal - tendered;
            if (document.getElementById('grandDebtDisplay')) {
                document.getElementById('grandDebtDisplay').innerText = grandTotalDebt.toFixed(2);
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

            if (section) {
                // قسم البيع
                if (section.id === 'sales-section') {
                    const paidBox = document.getElementById('paidBox');
                    const remainingBox = document.getElementById('remainingBox');
                    const btnContainer = document.getElementById('dynamicButtons');
                    const tenderedInput = document.getElementById('tenderedAmount');

                    if (method.includes('آجل') || method.includes('شيك')) {
                        if (paidBox) paidBox.style.display = 'flex';
                        if (remainingBox) remainingBox.style.display = 'flex';
                        if (btnContainer) btnContainer.style.display = 'flex';

                        // تصفير المدفوع تلقائياً عند اختيار آجل لضمان حساب المتبقي صح
                        if (tenderedInput) tenderedInput.value = 0;

                        // --- ميزة التنبيه الذكي للعميل عند اختيار آجل ---
                        const custInput = document.getElementById('customerName');
                        if (custInput) {
                            custInput.focus();
                            custInput.select();
                            // إشارة بصرية: ارتعاش وتغيير لون مؤقت
                            custInput.style.transition = '0.3s';
                            custInput.style.backgroundColor = 'rgba(255, 165, 0, 0.2)';
                            custInput.style.border = '2px solid orange';

                            // تنبيه سريع (Toast)
                            if (custInput.value.includes('نقدي') || custInput.value === "") {
                                if (typeof showToast === 'function') {
                                    showToast("⚠️ تنبيه: البيع الآجل يتطلب اختيار عميل مسجل", "error");
                                }
                            }

                            setTimeout(() => {
                                custInput.style.backgroundColor = '';
                                custInput.style.border = '';
                            }, 1500);
                        }

                        if (typeof calculateTotals === 'function') calculateTotals();
                    } else {
                        if (paidBox) paidBox.style.display = 'none';
                        if (remainingBox) remainingBox.style.display = 'none';
                        if (btnContainer) btnContainer.style.display = 'none';

                        // في الكاش، المدفوع هو الإجمالي (سيتم التعامل معه في الحفظ)
                    }
                }
                // قسم الشراء
                else if (section.id === 'purchase-section') {
                    const purchasePaidBox = document.getElementById('purchasePaidBox');
                    const purchaseRemainingBox = document.getElementById('purchaseRemainingBox');
                    const purchasePaidInput = document.getElementById('purchasePaid');

                    if (method.includes('آجل') || method.includes('شيك')) {
                        if (purchasePaidBox) purchasePaidBox.style.display = 'flex';
                        if (purchaseRemainingBox) purchaseRemainingBox.style.display = 'flex';

                        // تصفير المدفوع للمورد تلقائياً عند اختيار آجل
                        if (purchasePaidInput) purchasePaidInput.value = 0;

                        // تنبيه لاختيار مورد
                        const supInput = document.getElementById('supplierName');
                        if (supInput) {
                            supInput.focus();
                            if ((supInput.value.includes('نقدي') || supInput.value === "") && typeof showToast === 'function') {
                                showToast("⚠️ تنبيه: الشراء الآجل يتطلب اختيار مورد مسجل", "error");
                            }
                        }

                        if (typeof calculatePurchaseTotals === 'function') calculatePurchaseTotals();
                    } else {
                        // في حالة النقدي، نخفي المربعات ونجعل المدفوع = الإجمالي
                        if (purchasePaidBox) purchasePaidBox.style.display = 'none';
                        if (purchaseRemainingBox) purchaseRemainingBox.style.display = 'none';

                        // في النقدي، المدفوع هو كامل المبلغ (نستخدم القيمة المحسوبة حالياً)
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
            setStore('pos_inv_cols', JSON.stringify(inventoryColumnVisibility));
            applyInventoryColumnVisibility();
        }

        function applyInventoryColumnVisibility() {
            // نستخدم القائمة الكاملة للأعمدة لضمان عدم نسيان أي عمود
            const allCols = ["0","1","2","internal","3","4","5","6","7","8","9","10","11","12","13","margin","detailed","quick"];
            allCols.forEach(idx => {
                const show = inventoryColumnVisibility[idx] !== false; // القيمة الافتراضية true
                const cells = document.querySelectorAll(`.col-inv-${idx}`);
                cells.forEach(c => {
                    c.style.display = show ? '' : 'none';
                });
                // تحديث أي checkbox مرتبط بهذا العمود في النافذة إذا كانت مفتوحة
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
        let globalUnits = JSON.parse(getStore('bayan_global_units')) || ['قطعة', 'علبة', 'كرتونة', 'رابطة', 'بالتة', 'رول'];

        function openGlobalUnitsManager() {
            document.getElementById('globalUnitsModal').classList.remove('hidden');
            renderGlobalUnitsList();
        }

        function renderGlobalUnitsList() {
            const listDiv = document.getElementById('globalUnitsList');
            const countSpan = document.getElementById('unitsTotalCount');
            if (countSpan) countSpan.innerText = globalUnits.length;

            listDiv.innerHTML = globalUnits.map((u, i) => `
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
            updateAllUnitSelects();
        }

        async function editGlobalUnit(index) {
            const oldName = globalUnits[index];
            const newName = await showCustomPrompt("📝 تعديل اسم الوحدة:", oldName);

            if (newName && newName.trim() !== "" && newName !== oldName) {
                if (globalUnits.includes(newName.trim())) {
                    return alert("⚠️ هذا الاسم موجود بالفعل!");
                }
                globalUnits[index] = newName.trim();
                setStore('bayan_global_units', JSON.stringify(globalUnits));
                showToast("✅ تم تعديل اسم الوحدة بنجاح", "success");
                renderGlobalUnitsList();
            }
        }

        function addGlobalUnit() {
            const name = document.getElementById('newGlobalUnitName').value.trim();
            if (!name) return;
            if (globalUnits.includes(name)) return alert("⚠️ هذا النوع موجود بالفعل");
            globalUnits.push(name);
            setStore('bayan_global_units', JSON.stringify(globalUnits));
            document.getElementById('newGlobalUnitName').value = "";
            showToast("✨ تم إضافة الوحدة الجديدة", "success");
            renderGlobalUnitsList();
        }

        window.openGlobalUnitsManager = openGlobalUnitsManager;
        window.renderGlobalUnitsList = renderGlobalUnitsList;
        window.editGlobalUnit = editGlobalUnit;
        window.addGlobalUnit = addGlobalUnit;
        window.deleteGlobalUnit = deleteGlobalUnit;
        window.updateAllUnitSelects = updateAllUnitSelects;

        function deleteGlobalUnit(index) {
            if (confirm("🚨 هل أنت متأكد من حذف نوع الوحدة هذا؟ سيؤثر ذلك على القوائم المتاحة فقط.")) {
                globalUnits.splice(index, 1);
                setStore('bayan_global_units', JSON.stringify(globalUnits));
                showToast("🗑️ تم حذف الوحدة", "info");
                renderGlobalUnitsList();
            }
        }

        function updateAllUnitSelects() {
            const selects = document.querySelectorAll('.unit-type-select');
            const optionsHtml = globalUnits.map(u => `<option value="${u}">${u}</option>`).join('');
            selects.forEach(s => {
                const currentVal = s.value;
                s.innerHTML = optionsHtml;
                if (currentVal && globalUnits.includes(currentVal)) {
                    s.value = currentVal;
                }
            });
        }

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

            let selectHtml = `<select class="unit-type-select" style="width:100%; border:1px solid var(--border-color); background:#ffffff; color:#000000; text-align:center; cursor:pointer; border-radius:4px; padding:2px;">`;
            globalUnits.forEach(u => {
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
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('productImagePreview');
                preview.style.backgroundImage = `url(${e.target.result})`;
                preview.innerText = '';
                currentProductImageData = e.target.result;
                document.getElementById('removeProductImageBtn').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }

        function removeProductImage(event) {
            if (event) event.stopPropagation();
            const preview = document.getElementById('productImagePreview');
            const removeBtn = document.getElementById('removeProductImageBtn');
            preview.style.backgroundImage = 'none';
            preview.innerText = '📷';
            currentProductImageData = null;
            if (removeBtn) removeBtn.classList.add('hidden');
            // تفريغ المدخل لتمكين رفع نفس الصورة لاحقاً إذا أراد
            document.getElementById('newItemImage').value = '';
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

            confirmBtn.onclick = () => {
                if (activeAlertTimeout) {
                    clearTimeout(activeAlertTimeout);
                    activeAlertTimeout = null;
                }
                modal.classList.add('hidden');
                onConfirm();
            };
            cancelBtn.onclick = () => {
                if (activeAlertTimeout) {
                    clearTimeout(activeAlertTimeout);
                    activeAlertTimeout = null;
                }
                modal.classList.add('hidden');
                onCancel();
            };

            modal.classList.remove('hidden');

            if (timeout && typeof timeout === 'number') {
                activeAlertTimeout = setTimeout(() => {
                    confirmBtn.click();
                }, timeout);
            }
        }

        // وظيفة تواصل مع المطور للدعم الفني (يعتمد على المستخدم لتصوير المشكلة)
        function contactDeveloper() {
            showCustomAlert({
                titleText: '📞 تواصل مع الدعم الفني (المطور)',
                type: 'question',
                msg: `
                    <div style="text-align: right; direction: rtl; line-height: 1.6;">
                        <p style="font-weight: 800; color: var(--main-blue); margin-bottom: 10px;">عزيزي المستخدم، عند مواجهة أي مشكلة:</p>
                        <ol style="padding-right: 20px;">
                            <li>قم بتصوير الشاشة أو المشكلة (بجوالك أو لقطة شاشة يدوية).</li>
                            <li>تواصل مع المطور مباشرة عبر الأزرار أدناه.</li>
                            <li>اشرح المشكلة وأرسل الصور لتسهيل الحل.</li>
                        </ol>
                        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
                            <a href="https://wa.me/2010025905" target="_blank" style="background: #25D366; color: white !important; padding: 12px; border-radius: 12px; text-decoration: none; font-weight: 900; display: flex; align-items: center; justify-content: center; gap: 10px; border-bottom: 3px solid #1a9446; box-shadow: 0 4px 10px rgba(37, 211, 102, 0.2);">
                                <span>📱</span> تواصل واتساب (010025905)
                            </a>
                            <a href="https://t.me/your_telegram_dev" target="_blank" style="background: #0088cc; color: white !important; padding: 12px; border-radius: 12px; text-decoration: none; font-weight: 900; display: flex; align-items: center; justify-content: center; gap: 10px; border-bottom: 3px solid #005680; box-shadow: 0 4px 10px rgba(0, 136, 204, 0.2);">
                                <span>✈️</span> تواصل تلجرام
                            </a>
                        </div>
                        <p style="font-size: 0.8rem; color: #777; margin-top: 15px; text-align: center;">نحن هنا لمساعدتك في أي وقت! ✅</p>
                    </div>
                `,
                confirmText: 'حسناً، فهمت',
                showCancel: false
            });
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

            // Handle all setting tab button classes
            document.querySelectorAll('.settings-tab-btn, .settings-tab-btn-premium, .premium-tab-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');

            if (tabName === 'printing') {
                loadPrintSettings();
                loadPrintTemplateChoice();
            } else if (tabName === 'warehouses') {
                renderWarehousesTable();
                updateSettingsWarehouseSelects();
            } else if (tabName === 'trash') {
                renderTrashTable();
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

        function checkUpdates() {
            alert("✅ أنت تستخدم أحدث إصدار من النظام (2.5.0)");
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
            const data = {
                products: productsDB,
                transactions: transactions,
                settings: JSON.parse(getStore('pos_settings') || '{}'),
                users: users,
                accounts: accounts,
                trash: trashBin
            };
            
            // محاولة حفظ مباشر في مجلد بيان هوم ديسكتوب (bayan_backups)
            try {
                const fs = require('fs');
                const path = require('path');
                const os = require('os');
                const backupDir = path.join(os.homedir(), 'bayan_backups');
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }
                const pad = (n) => String(n).padStart(2, '0');
                const d = new Date();
                const timestamp = `${d.getFullYear()}_${pad(d.getMonth()+1)}_${pad(d.getDate())}__${pad(d.getHours())}_${pad(d.getMinutes())}`;
                const fileName = `backup_pos_manual_${timestamp}.json`;
                const filePath = path.join(backupDir, fileName);
                
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                alert(`✅ تم حفظ النسخة الاحتياطية اليدوية بنجاح في المجلد:\n${filePath}`);
            } catch (e) {
                // Fallback browser download
                const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_pos_manual_${new Date().toLocaleDateString('en-CA')}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
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
                    
                    if (data.products && data.products.length > 0) await db.products.bulkAdd(data.products);
                    if (data.transactions && data.transactions.length > 0) await db.transactions.bulkAdd(data.transactions);
                    if (data.accounts && data.accounts.length > 0) await db.accounts.bulkAdd(data.accounts);
                    if (data.users && data.users.length > 0) await db.users.bulkAdd(data.users);
                    if (data.trash && data.trash.length > 0) await db.trash.bulkAdd(data.trash);
                    
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
            // تعيين تاريخ اليوم للرصيد
            document.getElementById('accBalDate').value = new Date().toLocaleDateString('en-CA');
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
                renderInquiryProductList(productsDB.slice(0, 30));
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
                appendAIChatBubble(`❌ خطأ: ${err.message || 'حدث خطأ غير متوقع'}`, 'bot');
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
                appendFullAIChatBubble(`❌ خطأ: ${err.message || 'حدث خطأ غير متوقع'}`, 'bot');
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
                <td style="padding:5px; text-align:center; font-style:normal !important; font-weight:bold;">${item.price.toFixed(2)}</td>
                <td style="padding:5px; text-align:left; font-style:normal !important; font-weight:bold;">${(item.price * item.qty).toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const compactItemsHtml = data.items.map(item => {
        const unitName = item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (item.unit || 'قطعة');
        return `
            <tr style="font-style:normal !important; border-bottom:1px solid #ccc;">
                <td style="text-align:right; font-style:normal !important; font-weight:900; color:#000; padding:2px 0;">${item.name}</td>
                <td style="text-align:center; font-style:normal !important; font-weight:900; color:#000; padding:2px 0;">${item.qty}</td>
                <td style="text-align:left; font-style:normal !important; font-weight:900; color:#000; padding:2px 0;">${(item.price * item.qty).toFixed(2)}</td>
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
        
        // إذا تم استهلاك 200 فاتورة، يتم إغلاق وقفل كافة أقسام وعمليات البرنامج بالكامل
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
        // Fallback for older codes without expiry_date specifically saved
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
    if (!window.isSubscriptionValid(actionType)) {
        const activeLic = window.activeLicense || { plan: 'باقة نسخة المجانية', isValid: true };
        const currentPlan = activeLic.plan;
        let msg = 'لقد انتهت صلاحية باقتك الحالية أو استهلكت رصيد الفواتير المجانية.\n\nيرجى الترقية لإحدى الباقات الكاملة لتفعيل حفظ الفواتير مجدداً.';
        
        if (currentPlan === 'باقة نسخة المجانية') {
            msg = 'لقد استهلكت كامل رصيدك في النسخة التجريبية المجانية (200 فاتورة).\n\nجميع الأقسام والعمليات مقفلة الآن بشكل كامل. يرجى الترقية والاشتراك في إحدى باقات بَيَان POS لفتح عدد غير محدود من الفواتير والعمليات.';
        } else {
            msg = `لقد انتهت فترة صلاحية باقتك الحالية (${currentPlan}).\n\nيمكنك الاستمرار في عرض البيانات والتقارير والطباعة، ولكن لإنشاء وحفظ بيانات جديدة يرجى تجديد الاشتراك.`;
        }

        if (typeof showCustomAlert === 'function') {
            showCustomAlert({
                type: 'error',
                titleText: '🛑 انتهت صلاحية الاشتراك التجريبي',
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
    let overlay = document.getElementById('backupProgressOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'backupProgressOverlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(10px);
            z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: white; font-family: 'Cairo', sans-serif; direction: rtl;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px;">
                <div class="hourglass-animation" style="font-size: 5rem; animation: hourglass-spin 1.8s infinite ease-in-out; cursor: default; user-select: none;">⏳</div>
                <h2 style="margin: 0; font-size: 1.6rem; font-weight: 900; letter-spacing: 0.5px;">جاري حفظ نسخة احتياطية تلقائية...</h2>
                <p style="margin: 0; font-size: 0.95rem; opacity: 0.8; font-weight: 500;">الرجاء عدم إغلاق البرنامج حتى يتم تأمين بياناتك بالكامل.</p>
            </div>
            <style>
                @keyframes hourglass-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(180deg); }
                }
            </style>
        `;
        document.body.appendChild(overlay);
    }
};

window.hideBackupProgressOverlay = function() {
    const overlay = document.getElementById('backupProgressOverlay');
    if (overlay) overlay.remove();
};

window.executeAutoBackupToFile = async function(silent = false) {
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
    // محاولة الحفظ المباشر في مجلد التطبيق (وضع الديسكتوب Electron)
    try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const backupDir = path.join(os.homedir(), 'bayan_backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const pad = (n) => String(n).padStart(2, '0');
        const d = new Date();
        const timestamp = `${d.getFullYear()}_${pad(d.getMonth()+1)}_${pad(d.getDate())}__${pad(d.getHours())}_${pad(d.getMinutes())}`;
        const fileName = `backup_pos_auto_${timestamp}.json`;
        const filePath = path.join(backupDir, fileName);
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log("Auto backup successfully saved to local path:", filePath);
        success = true;
    } catch (e) {
        console.log("Fallback to browser-style download backup.", e);
        // في حال العمل على المتصفح العادي: تحميل الملف
        try {
            const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_pos_auto_${new Date().toLocaleDateString('en-CA')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            success = true;
        } catch (downloadErr) {
            console.error("Browser download backup failed:", downloadErr);
        }
    }
    
    if (!silent) {
        // الانتظار لمشاهدة تأثير الساعة الرملية الرائع
        await new Promise(resolve => setTimeout(resolve, 1500));
        window.hideBackupProgressOverlay();
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

// تسجيل مستمع حدث الإغلاق من عملية Electron الرئيسية
try {
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('trigger-backup-before-quit', async () => {
        const settings = JSON.parse(getStore('pos_settings') || '{}');
        if (settings.autoBackup) {
            await window.executeAutoBackupToFile(false);
        }
    });
} catch (e) {
    console.log("Not running in Electron environment or ipcRenderer unavailable.");
}
