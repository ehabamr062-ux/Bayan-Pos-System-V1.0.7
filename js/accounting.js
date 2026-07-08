        function getAccountBalance(name) {

            const acc = accounts.find(a => a.name === name);

            if (!acc) return 0;

            let initialDebit = parseFloat(acc.debit) || 0;

            let initialCredit = parseFloat(acc.credit) || 0;

            let currentBalance = initialDebit - initialCredit;

            const accTrans = transactions.filter(t => t.partner === name);

            accTrans.forEach(t => {

                let val = 0;

                // --- 🛠️ تصحيح منطق الحساب: التحقق من المرتجع أولاً لمنع التداخل مع البيع/الشراء ---

                if (t.type.includes('مرتجع بيع')) {

                    val = -(parseFloat(t.total) || 0);

                    // لو المرتجع نقدي (نقدي / نقدية / كاش)، مبيأثرش على مديونية الحساب

                    if (t.method && (t.method.includes('نقدي') || t.method.includes('نقدية') || t.method.includes('كاش'))) val = 0;

                }

                else if (t.type.includes('مرتجع شراء')) {

                    val = (parseFloat(t.total) || 0);

                    if (t.method && (t.method.includes('نقدي') || t.method.includes('نقدية') || t.method.includes('كاش'))) val = 0;

                }

                else if (t.type.includes('بيع')) {

                    val = (parseFloat(t.total) || 0);

                    if (t.isInvoiceHead) val -= (parseFloat(t.paidAmount) || 0);

                }

                else if (t.type.includes('شراء')) {

                    val = -(parseFloat(t.total) || 0);

                    if (t.isInvoiceHead) val += (parseFloat(t.paidAmount) || 0);

                }

                else if (t.type.includes('قبض')) {

                    val = -(parseFloat(t.price) || 0);

                }

                else if (t.type.includes('صرف')) {

                    val = (parseFloat(t.price) || 0);

                }

                currentBalance += val;

            });

            return currentBalance;

        }

        function renderInvoicesTable() {

            const tbody = document.getElementById('invoicesTableBody');

            tbody.innerHTML = '';

            const searchId = document.getElementById('invoicesSearchId').value.toLowerCase();

            const searchPartner = document.getElementById('invoicesSearchPartner').value.toLowerCase();

            const searchProduct = document.getElementById('invoicesSearchProduct') ? document.getElementById('invoicesSearchProduct').value.toLowerCase() : '';

            const searchMethod = document.getElementById('invoicesSearchMethod').value;

            const typeFilter = document.getElementById('invoicesTypeFilter').value;

            const fromDate = document.getElementById('invoicesDateFrom').value;

            const toDate = document.getElementById('invoicesDateTo').value;

            // إضافة index أصلي لكل عنصر للتمكن من حذفه أو تعديله

            let rawData = transactions.map((t, i) => ({ ...t, originalIndex: i }));

            // فلترة التاريخ

            if (fromDate) rawData = rawData.filter(t => t.dateISO >= fromDate && t.dateISO !== undefined);

            if (toDate) rawData = rawData.filter(t => t.dateISO <= toDate && t.dateISO !== undefined);

            // تصفية أصلية (Modified for Tabs)

            if (typeFilter === 'all') {

                // لا نستثني أياً من العمليات ليظهر الكل بما في ذلك تسوية المخزون والتحويلات

            } else {

                rawData = rawData.filter(t => {
                    const tType = t.type || '';
                    if (typeFilter === 'بيع') {
                        return tType.includes('بيع') && !tType.includes('مرتجع');
                    }
                    if (typeFilter === 'شراء') {
                        return (tType.includes('شراء') || tType.includes('مشتريات')) && !tType.includes('مرتجع');
                    }
                    if (typeFilter === 'مرتجع بيع') {
                        return tType.includes('مرتجع') && tType.includes('بيع');
                    }
                    if (typeFilter === 'مرتجع شراء') {
                        return tType.includes('مرتجع') && (tType.includes('شراء') || tType.includes('مشتريات'));
                    }
                    return tType.includes(typeFilter);
                });

            }

            if (searchId) {

                rawData = rawData.filter(t => t.invoiceId && t.invoiceId.toString().includes(searchId));

            }

            if (searchPartner) {

                // العثور على أسماء الحسابات التي تطابق المدخل (اسم، كود، أو هاتف)

                const matchingAccountNames = accounts.filter(acc => {

                    const nameMatch = acc.name && acc.name.toLowerCase().includes(searchPartner);

                    const codeMatch = acc.code && acc.code.toString().toLowerCase().includes(searchPartner);

                    const phoneMatch = (acc.mobile && acc.mobile.toString().includes(searchPartner)) || (acc.landline && acc.landline.toString().includes(searchPartner));

                    return nameMatch || codeMatch || phoneMatch;

                }).map(acc => acc.name.toLowerCase());

                rawData = rawData.filter(t => t.partner && (

                    t.partner.toLowerCase().includes(searchPartner) ||

                    matchingAccountNames.includes(t.partner.toLowerCase())

                ));

            }

            if (searchProduct) {

                rawData = rawData.filter(t => t.product && t.product.toLowerCase().includes(searchProduct));

            }

            if (searchMethod !== 'all') {

                if (searchMethod === 'cash') {

                    rawData = rawData.filter(t => t.method && (t.method.includes('نقدية') || t.method.includes('كاش') || t.method.includes('فودافون') || t.method.includes('cash')));

                } else if (searchMethod === 'credit') {

                    rawData = rawData.filter(t => t.method && (t.method.includes('آجل') || t.method.includes('credit')));

                }

            }

            let finalData = [];

            if (currentInvoicesView === 'operation') {

                // تجميع بالفاتورة

                const groups = {};

                rawData.forEach(t => {

                    const key = (t.invoiceId || 'single_' + t.originalIndex) + '_' + t.type;

                    if (!groups[key]) {

                        groups[key] = {

                            invoiceId: t.invoiceId,

                            date: t.date,

                            type: t.type,

                            partner: t.partner,

                            method: t.method,

                            user: t.user,

                            itemsCount: 0,

                            total: 0,

                            profit: 0,

                            paid: 0,

                            remaining: 0,

                            warehouse: t.warehouse,

                            editDate: t.editDate,

                            notes: t.notes,

                            originalIndex: t.originalIndex,

                            is_returned: t.is_returned || false,

                            products: []

                        };

                    }

                    if (t.is_returned) groups[key].is_returned = true;

                    if (t.product) {

                        groups[key].itemsCount++;

                        groups[key].products.push(`${t.product} (x${t.qty || 0})`);

                    }

                    groups[key].total += (parseFloat(t.total) || parseFloat(t.price) || 0);

                    const itemProfit = (t.type.includes('مرتجع')) ? 0 : (parseFloat(t.profit) || 0);

                    groups[key].profit += itemProfit;

                    // قراءة المدفوع من رأس الفاتورة

                    if (t.isInvoiceHead) {

                        groups[key].paid = parseFloat(t.paidAmount) || 0;

                    } else if (!t.invoiceId) {

                        // لو عملية يدوية (قبض/صرف)

                        groups[key].paid = (parseFloat(t.total) || parseFloat(t.price) || 0);

                    }

                });

                // حساب المتبقي لكل مجموعة بعد التجميع

                Object.values(groups).forEach(g => {

                    const m = g.method || '';

                    if (m.includes('نقدي') || m.includes('نقدية') || m.includes('كاش') || m.includes('تحويل') || g.type.includes('تسوية')) {

                        g.paid = g.total;

                        g.remaining = 0;

                    } else {

                        g.remaining = g.total - g.paid;

                    }

                });

                finalData = Object.values(groups);

            } else {

                // عرض الأصناف تفصيلياً - نستبعد سجلات الرأس الفارغة (مثل رأس التسوية) لمنع التكرار

                finalData = rawData.filter(t => t.product || t.type.includes('قبض') || t.type.includes('صرف'));

            }

            finalData.reverse(); // عرض الأحدث أولاً

            // 🆕 حساب الإجماليات للشريط الملخص

            let sumTotal = 0, sumPaid = 0, sumDebt = 0, sumProfit = 0;

            finalData.forEach(t => {

                sumTotal += (parseFloat(t.total) || 0);

                sumPaid += (parseFloat(t.paid) || 0);

                sumDebt += (parseFloat(t.remaining) || 0);

                // استثناء المرتجعات من إجمالي الربح المعروض في شريط الملخص

                if (!t.type.includes('مرتجع')) {

                    sumProfit += (parseFloat(t.profit) || 0);

                }

            });

            if (document.getElementById('invSumCount')) document.getElementById('invSumCount').innerText = finalData.length;

            if (document.getElementById('invSumTotal')) document.getElementById('invSumTotal').innerText = sumTotal.toFixed(2);

            if (document.getElementById('invSumPaid')) document.getElementById('invSumPaid').innerText = sumPaid.toFixed(2);

            if (document.getElementById('invSumDebt')) document.getElementById('invSumDebt').innerText = sumDebt.toFixed(2);

            if (document.getElementById('invSumProfit')) document.getElementById('invSumProfit').innerText = sumProfit.toFixed(2);

            // إخفاء/إظهار كارت الأرباح بناءً على الصلاحيات

            const hasProfitPerm = checkPermission('general_profits');

            const profitCard = document.getElementById('invProfitCard');

            if (profitCard) profitCard.style.display = hasProfitPerm ? 'flex' : 'none';

            // إخفاء عمود الربح في الجدول برمجياً إذا لم يكن هناك صلاحية

            invoicesColumnVisibility[5] = hasProfitPerm;

            updateInvoicesTableStyles();

            // تحديث رؤوس الجدول يدوياً لضمان المطابقة الكاملة ومنع الترحيل

            const invHeadCells = document.querySelectorAll('#invoicesMainTable thead th');

            invHeadCells.forEach((th, idx) => {

                if (invoicesColumnVisibility[idx] === false) th.style.display = 'none';

                else th.style.display = '';

            });

            finalData.forEach((t) => {

                const isSelected = (selectedInvoiceIndex === t.originalIndex);

                // تصفير عرض الربح للمرتجعات في الجدول

                const displayProfit = t.type.includes('مرتجع') ? 0 : (parseFloat(t.profit) || 0);

                const profitText = (t.profit !== undefined && t.profit !== '-') ? displayProfit.toFixed(2) : '-';

                const warehouse = t.warehouse || 'المخزن الرئيسي';

                let displayProduct = '';

                const isFinancial = t.type.includes('قبض') || t.type.includes('صرف');
                const isSalesOrPurchase = t.type.includes('بيع') || t.type.includes('شراء') || t.type.includes('مبيعات') || t.type.includes('مشتريات');

                if (currentInvoicesView === 'operation') {

                    if (isFinancial) {

                        displayProduct = `<div title="حركة نقدية لـ: ${t.partner || '-'}"><b>${t.partner || '-'}</b> (حركة نقدية) • <small style="color:#888;">${t.product !== 'أخرى' ? t.product : 'صرف/قبض نقدية'}</small></div>`;

                    } else {

                        displayProduct = `<div title="فاتورة رقم #${t.invoiceId} - اضغط على زر التفاصيل لرؤية الأصناف" style="display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap;"><b>${t.partner || '-'}</b> (عدد ${t.itemsCount} أصناف) <button class="tool-btn" style="padding: 2px 6px; font-size: 0.7rem; background: #9b59b6; color:white; border-radius:10px; margin: 0; line-height: 1;" onclick="viewInvoiceItems(${t.invoiceId || -1}, '${t.type}')">📄 التفاصيل</button></div>`;

                    }

                } else {

                    const hoverTitle = `الصنف: ${t.product || '-'}\nالكمية: ${t.qty || 0}\nالسعر: ${t.price || 0}\nالإجمالي: ${t.total || 0}\nالمخزن: ${t.warehouse || '-'}`;

                    displayProduct = `<span title="${hoverTitle}" style="cursor:help; border-bottom:1px dotted #aaa;">${t.product || '-'} ${(!isFinancial && t.qty) ? '(x' + t.qty + ')' : ''}</span>`;

                }

                const totalTextFinal = (t.total || t.price || 0);

                let paid = (t.paid !== undefined) ? (typeof t.paid === 'number' ? t.paid.toFixed(2) : t.paid) : parseFloat(totalTextFinal || 0).toFixed(2);

                const remaining = (t.remaining !== undefined) ? (typeof t.remaining === 'number' ? t.remaining.toFixed(2) : t.remaining) : 0;

                // إذا كانت العملية تحويلاً مخزنياً، نفترض أنها مدفوعة بالكامل (عملية داخلية) حتى لا تظهر في مديونية الفواتير

                if (t.type.includes('تحويل')) {

                    paid = parseFloat(totalTextFinal || 0).toFixed(2);

                }

                const isV = (idx) => invoicesColumnVisibility[idx] !== false;

                tbody.innerHTML += `

                    <tr class="${isSelected ? 'selected-row' : ''}" onclick="selectInvoiceRow(${t.originalIndex})" ondblclick="if(window.viewSelectedInvoice) window.viewSelectedInvoice();">

                        <td class="col-inv-0" style="${isV(0) ? '' : 'display:none;'}"><input type="radio" name="invRad" ${isSelected ? 'checked' : ''}></td>

                        <td class="col-inv-1" style="${isV(1) ? '' : 'display:none;'}">

                            <div style="display:flex; flex-direction:row; gap:4px; align-items:center; justify-content:center; flex-wrap:wrap;">

                                <span style="background:rgba(0,0,0,0.05); padding:2px 5px; border-radius:4px; font-weight:bold; font-size:0.75rem;">${t.invoiceId || '-'} ${t.is_returned ? '<span title="تم الإرجاع" style="color:#ef4444; margin-right:2px;">↩️</span>' : ''}</span>

                                ${isSalesOrPurchase ? `

                                    <span class="${remaining <= 0 ? 'status-paid' : (paid > 0 ? 'status-partial' : 'status-debt')}" style="padding: 1px 4px; font-size: 0.7rem; border-radius: 4px;">

                                        ${remaining <= 0 ? 'مدفوع' : (paid > 0 ? 'جزئي' : 'آجل')}

                                    </span>

                                ` : ''}

                            </div>

                        </td>

                        <td class="col-inv-2" style="${isV(2) ? '' : 'display:none;'}">${t.date}</td>

                        <td class="col-inv-3" style="${isV(3) ? '' : 'display:none;'}">

                            <span class="stock-badge ${t.type.includes('بيع') ? (t.type.includes('مرتجع') ? 'badge-return' : 'badge-sale') : 

                                                    (t.type.includes('شراء') ? (t.type.includes('مرتجع') ? 'badge-return' : 'badge-purchase') : 

                                                    (t.type.includes('قبض') ? 'badge-receipt' : 

                                                    (t.type.includes('صرف') ? 'badge-disburse' : 

                                                    (t.type.includes('تحويل') ? 'badge-transfer' : 

                                                    (t.type.includes('تسوية') ? 'badge-adj' : '')))))}">

                                ${t.type}

                            </span>

                        </td>

                        <td class="col-inv-4" style="font-weight:bold; ${isV(4) ? '' : 'display:none;'}">${displayProduct}</td>

                        <td class="col-inv-5" style="color:var(--main-green); font-weight:bold; ${isV(5) ? '' : 'display:none;'}">${profitText}</td>

                        <td class="col-inv-6" style="${isV(6) ? '' : 'display:none;'}">${warehouse}</td>

                        <td class="col-inv-7" style="font-weight:bold; color:var(--main-blue); ${isV(7) ? '' : 'display:none;'}">${parseFloat(totalTextFinal || 0).toFixed(2)}</td>

                        <td class="col-inv-8" style="color:blue; font-weight:bold; ${isV(8) ? '' : 'display:none;'}">${paid}</td>

                        <td class="col-inv-9" style="color:red; font-weight:bold; ${isV(9) ? '' : 'display:none;'}">${remaining}</td>

                        <td class="col-inv-10" style="${isV(10) ? '' : 'display:none;'}">${t.partner || '-'}</td>

                        <td class="col-inv-13" style="${isV(13) ? '' : 'display:none;'}">${t.notes || '-'}</td>

                        <td class="col-inv-11" style="font-size:0.8rem; ${isV(11) ? '' : 'display:none;'}">${t.user || '-'}</td>

                        <td class="col-inv-12" style="font-size:0.8rem; color: #888; ${isV(12) ? '' : 'display:none;'}">${t.editDate || '-'}</td>

                    </tr>

                `;

            });

if (finalData.length === 0) tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:20px;">لا توجد بيانات تطابق البحث</td></tr>';

        }

        // دالة لعرض تفاصيل الفاتورة في تنبيه أو نافذة

        function viewInvoiceItems(invoiceId, type = '', autoPrint = false) {
            if (!checkPermission('docs_view')) return;
            
            // تنظيف النوع لضمان المطابقة الكاملة
            let searchType = type ? type.trim() : '';
            
            // فلترة الحركات التي تطابق رقم الفاتورة والنوع
            let invoiceItems = [];
            if (searchType) {
                // إذا تم تمرير نوع الفاتورة، نفلتر بالرقم والنوع معاً
                invoiceItems = transactions.filter(t => t.invoiceId == invoiceId && t.type === searchType);
            }
            
            // إذا لم نجد نتائج بالنوع الممرر، نبحث برقم الفاتورة فقط كاحتياط
            if (invoiceItems.length === 0) {
                invoiceItems = transactions.filter(t => t.invoiceId == invoiceId);
            }
            
            if (invoiceItems.length === 0) return alert('خطأ: لم يتم العثور على تفاصيل الفاتورة.');
            
            let head = invoiceItems.find(t => t.isInvoiceHead) || invoiceItems[0];
            let tx = { ...head };
            tx.invoiceId = invoiceId;
            tx.notes = invoiceItems.find(t => t.notes)?.notes || tx.notes || '';
            
            // تصفية السطور الفعلية للأصناف (استبعاد سطر الرأس الرئيسي لتجنب التكرار والتدبيل)
            let rawItems = invoiceItems.filter(i => !i.isInvoiceHead && i.product);
            
            // إذا لم نجد سطور أصناف وكان هناك سطر واحد فقط وهو رأس الفاتورة ويحتوي على صنف
            if (rawItems.length === 0 && head.product) {
                rawItems = [head];
            }

            // تجميع الأصناف المتشابهة لتفادي التكرار
            let uniqueItemsMap = {};
            rawItems.forEach(i => {
                let name = i.product || i.productName || '-';
                let price = parseFloat(i.price || 0);
                // مفتاح فريد بالاسم والسعر لضمان عدم الدمج الخاطئ إذا اختلفت الأسعار
                let key = name + "_" + price; 
                if (uniqueItemsMap[key]) {
                    uniqueItemsMap[key].qty += parseFloat(i.qty || 0);
                    uniqueItemsMap[key].total += parseFloat(i.total || (parseFloat(i.qty || 0) * price));
                } else {
                    uniqueItemsMap[key] = {
                        name: name,
                        qty: parseFloat(i.qty || 0),
                        unit: i.unit || '-',
                        price: price,
                        total: parseFloat(i.total != null ? i.total : (parseFloat(i.qty || 0) * price))
                    };
                }
            });

            tx.items = Object.values(uniqueItemsMap);
            
            // سحب المدفوع والمتبقي من رأس الفاتورة بشكل صحيح وموثوق
            tx.paid = parseFloat(head.paidAmount != null ? head.paidAmount : (head.paid || 0));
            tx.deferred = parseFloat(head.deferred != null ? head.deferred : (head.remaining || 0));
            
            if (typeof window.renderCustomInvoiceModal === 'function') {
                window.renderCustomInvoiceModal(tx, autoPrint);
            } else {
                alert("جاري تحميل واجهة العرض...");
            }
        }
        window.updateEditPrice = function(input) {

            const row = input.closest('tr');

            const name = input.value.trim();

            const p = productsDB.find(x => x.name === name);

            if (p) {

                // جلب سعر المستهلك الافتراضي (أو السعر المسجل)

                row.querySelector('.edit-p-input').value = p.price || 0;

                window.calcEditRow(input); // إعادة حساب الإجماليات

            }

        };

        window.calcEditRow = function(input) {

            const row = input.closest('tr');

            const q = parseFloat(row.querySelector('.edit-q-input').value) || 0;

            const p = parseFloat(row.querySelector('.edit-p-input').value) || 0;

            const total = q * p;

            row.querySelector('.edit-t-cell').innerText = total.toFixed(2);

            // تحديث الإجمالي الكلي

            let grandTotal = 0;

            document.querySelectorAll('.edit-t-cell').forEach(cell => {

                grandTotal += parseFloat(cell.innerText) || 0;

            });

            document.getElementById('advEditGrandTotal').innerText = grandTotal.toFixed(2);

        };

        window.openAdvancedEditModal = async function(invId = null) {

            if (!checkPermission('docs_edit')) return;

            if (!invId) {

                 if (typeof selectedInvoiceIndex === 'undefined' || selectedInvoiceIndex === null) return showCustomAlert({ type: 'warning', titleText: '⚠️ تنبيه', msg: 'يرجى تحديد فاتورة أولاً.' });

                 invId = transactions[selectedInvoiceIndex].invoiceId;

            }

            if (!invId) return showToast("❌ لا يمكن تعديل هذه الحركة مباشرة", "error");

            const items = transactions.filter(t => t.invoiceId == invId);

            const isGoods = items.some(it => it.type.includes('بيع') || it.type.includes('شراء') || it.type.includes('تحويل') || it.type.includes('مرتجع'));

            const displayItems = isGoods ? items.filter(it => it.type.includes('بيع') || it.type.includes('شراء') || it.type.includes('تحويل') || it.type.includes('مرتجع')) : items;

            const head = displayItems[0] || items[0];

            let productOptions = '';

            if (typeof productsDB !== 'undefined') {

                productsDB.forEach(p => { productOptions += `<option value="${p.name}">`; });

            }

            let rowsHtml = '';

            displayItems.forEach((it, idx) => {

                rowsHtml += `

                <tr class="edit-row" data-id="${it.invoiceId}" data-product="${it.product}">

                    <td style="padding:10px; border:1px solid #ddd; background:#f9f9f9;"><input type="text" class="edit-name-input" list="editItemsList" value="${it.product}" oninput="window.updateEditPrice(this)" style="width:100%; border:1px solid #ccc; padding:5px; border-radius:4px; font-weight:bold;"></td>

                    <td style="padding:10px; border:1px solid #ddd;"><input type="number" step="0.01" class="edit-q-input" value="${it.qty}" oninput="window.calcEditRow(this)" style="width:70px; border:1px solid #ccc; padding:5px; border-radius:4px;"></td>

                    <td style="padding:10px; border:1px solid #ddd;"><input type="number" step="0.01" class="edit-p-input" value="${it.price}" oninput="window.calcEditRow(this)" style="width:90px; border:1px solid #ccc; padding:5px; border-radius:4px;"></td>

                    <td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:var(--main-blue);" class="edit-t-cell">${(parseFloat(it.total) || parseFloat(it.price) || 0).toFixed(2)}</td>

                </tr>`;

            });

            const isCash = (head.method && (head.method.includes('نقدي') || head.method.includes('كاش') || head.method.includes('نقدية')));

            const content = `

            <div style="direction:rtl; text-align:right;">

                <datalist id="editItemsList">${productOptions}</datalist>

                <div style="background:var(--main-purple); color:white; padding:15px; border-radius:10px 10px 0 0; margin:-20px -20px 20px -20px; display:flex; justify-content:space-between; align-items:center;">

                    <h3 style="margin:0;">⚙️ التعديل الشامل - ${isGoods ? 'فاتورة' : 'سند'} #${invId}</h3>

                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px; background:#f0f2f5; padding:15px; border-radius:10px;">

                    <div><label style="font-size:0.8rem;">👤 الطرف</label><input type="text" id="advEditPartner" value="${head.partner || ''}" class="search-input" style="width:100%;"></div>

                    <div><label style="font-size:0.8rem;">💳 طريقة الدفع</label><select id="advEditMethod" class="search-input" style="width:100%;"><option value="نقدي" ${isCash ? 'selected' : ''}>نقدي</option><option value="آجل" ${!isCash ? 'selected' : ''}>آجل</option></select></div>

                    <div><label style="font-size:0.8rem;">📅 التاريخ</label><input type="date" id="advEditDate" value="${head.dateISO || ''}" class="search-input" style="width:100%;"></div>

                    <div><label style="font-size:0.8rem;">⏰ الوقت</label><input type="time" id="advEditTime" value="${head.timeISO || ''}" class="search-input" style="width:100%;"></div>

                </div>

                <div style="max-height:300px; overflow-y:auto; border:2px solid #ddd; border-radius:8px; margin-bottom:20px;">

                    <table style="width:100%; border-collapse:collapse;">

                        <thead style="background:#34495e; color:white; position:sticky; top:0;"><tr><th style="padding:10px;">الصنف</th><th style="padding:10px;">الكمية</th><th style="padding:10px;">السعر</th><th style="padding:10px;">الإجمالي</th></tr></thead>

                        <tbody>${rowsHtml}</tbody>

                    </table>

                </div>

                <div style="background:#fff; border:2px solid var(--main-blue); padding:15px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">

                    <div style="font-weight:bold;">الإجمالي الجديد: <span id="advEditGrandTotal" style="color:var(--main-blue); font-size:1.5rem;">${displayItems.reduce((a,b)=>a+(parseFloat(b.total)||0),0).toFixed(2)}</span> ج.م</div>

                    <div style="display:flex; gap:10px;"><button onclick="closeCustomModal()" class="action-btn">إلغاء</button><button onclick="window.saveAdvancedInvoiceChanges(${invId})" style="padding:10px 30px; background:var(--main-green); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">💾 حفظ التعديلات</button></div>

                </div>

            </div>`;

            showProfessionalModal(content);

        };

        window.saveAdvancedInvoiceChanges = async function(invId) {

            const rows = document.querySelectorAll('.edit-row');

            const newPartner = document.getElementById('advEditPartner').value;

            const newMethod = document.getElementById('advEditMethod').value;

            const newDate = document.getElementById('advEditDate').value;

            const newTime = document.getElementById('advEditTime').value;

            // التحقق من صحة المنطق: عميل نقدي لا يمكنه عمل آجل

            if ((newPartner.includes('نقدي') || newPartner.includes('كاش')) && newMethod === 'آجل') {

                return showCustomAlert({ 

                    type: 'warning', 

                    titleText: '⚠️ خطأ في المنطق المحاسبي', 

                    msg: 'لا يمكن عمل فاتورة "آجل" لحساب "عميل نقدي". الحساب النقدي يجب أن يكون مدفوعاً بالكامل ولا يظهر في كشف الحساب كمديونية.' 

                });

            }

            const oldItems = transactions.filter(t => t.invoiceId == invId);

            oldItems.forEach(item => {

                const p = productsDB.find(x => x.name === item.product);

                if (p) {

                   if (item.type.includes('بيع')) p.stock += parseFloat(item.qty);

                   else if (item.type.includes('شراء')) p.stock -= parseFloat(item.qty);

                }

            });

            // حساب الإجمالي الكلي أولاً لتعيينه في خانة المدفوع إذا كانت نقدية

            let totalOfInvoice = 0;

            rows.forEach(r => {

                const q = parseFloat(r.querySelector('.edit-q-input').value) || 0;

                const p = parseFloat(r.querySelector('.edit-p-input').value) || 0;

                totalOfInvoice += (q * p);

            });

            let firstRowHeaderProcessed = false;

            rows.forEach(row => {

                const originalProductName = row.dataset.product;

                const newProductName = row.querySelector('.edit-name-input').value.trim();

                const newQty = parseFloat(row.querySelector('.edit-q-input').value) || 0;

                const newPrice = parseFloat(row.querySelector('.edit-p-input').value) || 0;

                const newTotal = newQty * newPrice;

                // البحث عن السجل الأصلي لتعديله

                const transaction = transactions.find(t => t.invoiceId == invId && t.product === originalProductName);

                if (transaction) {

                    transaction.product = newProductName; // تحديث الاسم الجديد

                    transaction.partner = newPartner;

                    transaction.method = newMethod;

                    transaction.date = newDate;

                    transaction.dateISO = newDate;

                    transaction.timeISO = newTime;

                    transaction.qty = newQty;

                    transaction.price = newPrice;

                    transaction.total = newTotal.toFixed(2);

                    // تسجيل تاريخ التعديل واسم المستخدم الذي قام به

                    const editorName = currentUser ? currentUser.name : 'مجهول';

                    transaction.editDate = `${new Date().toLocaleString('ar-EG')} (بواسطة: ${editorName})`;

                    transaction.user = editorName; // تحديث المستخدم ليكون آخر من عدل الفاتورة

                    // حساب الربح الجديد بناءً على التكلفة

                    const p = productsDB.find(x => x.name === newProductName);

                    if (p) {

                        const cost = parseFloat(p.cost) || 0;

                        const factor = parseFloat(transaction.unitFactor) || 1;

                        const totalCost = cost * newQty * factor;

                        if (transaction.type.includes('بيع')) {

                            transaction.profit = (newTotal - totalCost).toFixed(2);

                        } else {

                            transaction.profit = 0; // المشتريات ليس لها ربح مباشر

                        }

                        // تحديث المخزن (خصم الكمية الجديدة)

                        if (transaction.type.includes('بيع')) p.stock -= newQty;

                        else if (transaction.type.includes('شراء')) p.stock += newQty;

                    }

                    if (!firstRowHeaderProcessed) {

                        transaction.isInvoiceHead = true;

                        // تصحيح: المدفوع هو إجمالي الفاتورة كلها لو نقدي، أو 0 لو آجل

                        const isCash = (newMethod.includes('نقدي') || newMethod.includes('نقدية') || newMethod.includes('كاش'));

                        transaction.paidAmount = (isCash ? totalOfInvoice : 0);

                        firstRowHeaderProcessed = true;

                    } else transaction.isInvoiceHead = false;

                }

            });

            await saveData();

            closeCustomModal();

            renderInvoicesTable();

            showToast("✅ تم تحديث الفاتورة والمخازن بنجاح", "success");

        };

        // ================= وظيفة التعديل الشامل للعمليات (Edit System) =================

        window.editTransaction = async function(invId, type) {

            if (!checkPermission('docs_edit')) return;

            const settings = JSON.parse(localStorage.getItem('pos_settings') || '{}');
            const canEditHistory = !!settings.allowHistoryEdit;
            if (!canEditHistory) {
                showToast("🚫 صلاحية تعديل السجل غير مفعلة", "error");
                return;
            }

            // البحث عن الفاتورة باستخدام الرقم والنوع لضمان الدقة المطلقة

            // نستخدم RegExp للبحث بمرونة عن النوع (مثلاً 'بيع' يطابق 'بيع 📤')

            const typeRegex = new RegExp(type, 'i');

            const t = transactions.find(tx => tx.invoiceId == invId && typeRegex.test(tx.type));

            if (!t) {

                showToast(`⚠️ لم يتم العثور على فاتورة #${invId} من نوع ${type}`, "error");

                return;

            }

            showCustomAlert({

                type: 'question',

                titleText: '⚠️ تعديل عملية',

                msg: `هل أنت متأكد من فتح العملية رقم #${invId} للتعديل؟\nسيتم تحميل كافة البيانات في القسم المختص.`,

                showCancel: true,

                confirmText: 'نعم، ابدأ التعديل',

                onConfirm: async () => {

                    // جلب كافة بنود الفاتورة بالكامل

                    const invItems = transactions.filter(x => x.invoiceId == invId && x.type === t.type);

                    // 1. تفعيل وضع التعديل (Edit Mode) عالمياً

                    isEditMode = true;

                    editingInvoiceId = invId;

                    let timeVal = t.timeISO || '';
                    if (!timeVal && t.date) {
                        if (t.date.includes('،')) {
                            const dateParts = t.date.split('،');
                            if (dateParts[1]) {
                                timeVal = dateParts[1].trim().substring(0, 5)
                                    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
                            }
                        } else if (t.date.includes(' ')) {
                            const dateParts = t.date.split(' ');
                            const lastPart = dateParts[dateParts.length - 1];
                            if (lastPart && lastPart.includes(':')) {
                                timeVal = lastPart.trim().substring(0, 5)
                                    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
                            }
                        }
                    }
                    editingOriginalDate = { full: t.date, iso: t.dateISO, time: timeVal };

                    editingInvoiceType = t.type;

                    editingOriginalItems = JSON.parse(JSON.stringify(invItems)); // نسخة أصلية للعكس

                    // 2. فتح القسم أولاً لضمان وجود تبويب نشط

                    const mainType = t.type;

                    let section = 'sales';
                    let tabSection = 'sales';

                    if (mainType.includes('شراء') && !mainType.includes('مرتجع')) {
                        section = 'purchase';
                        tabSection = 'purchase';
                    }
                    else if (mainType.includes('مرتجع بيع')) {
                        section = 'sales-return';
                        tabSection = 'sales-return';
                    }
                    else if (mainType.includes('مرتجع شراء')) {
                        section = 'purchase-return';
                        tabSection = 'purchase-return';
                    }
                    else if (mainType.includes('قبض')) {
                        section = 'receipt';
                        tabSection = 'receipt';
                    }
                    else if (mainType.includes('صرف')) {
                        section = 'disbursement';
                        tabSection = 'disbursement';
                    }
                    else if (mainType.includes('تسوية')) {
                        section = 'adjustment';
                        tabSection = 'adjustment';
                    }
                    else if (mainType.includes('تحويل')) {
                        section = 'transfer';
                        tabSection = 'inventory';
                    }

                    switchSection(tabSection);

                    // 3. حقن البيانات في القسم النشط (بعد أن استقر التبويب)

                    setTimeout(() => {

                        if (section === 'sales') {

                            cart = invItems.filter(x => x.product).map(it => {

                                const p = productsDB.find(x => x.name === it.product);

                                const u = (p && p.units) ? p.units.find(un => un.unitName === it.unit) : null;

                                return {

                                    id: p ? p.id : (Date.now() + Math.random()),

                                    name: it.product,

                                    qty: parseFloat(it.qty),

                                    price: parseFloat(it.price),

                                    unit: it.unit,

                                    unitFactor: parseFloat(it.unitFactor) || 1,

                                    selectedUnit: u,

                                    units: p ? (p.units || []) : []

                                };

                            });

                            document.getElementById('customerName').value = t.partner || '';

                            document.getElementById('salesDate').value = t.dateISO || '';

                            document.getElementById('salesTime').value = t.timeISO || '';

                            document.querySelectorAll('#sales-section .method-btn').forEach(btn => {

                                btn.classList.toggle('selected', btn.innerText.trim() === t.method);

                            });

                            selectedMethod = t.method;

                            if (t.isInvoiceHead) document.getElementById('tenderedAmount').value = t.paidAmount || 0;

                            renderCart();

                            calculateTotals();

                        } else if (section === 'purchase') {

                            purchaseCart = invItems.filter(x => x.product).map(it => {

                                const p = productsDB.find(x => x.name === it.product);

                                const u = (p && p.units) ? p.units.find(un => un.unitName === it.unit) : null;

                                return {

                                    id: p ? p.id : (Date.now() + Math.random()),

                                    name: it.product,

                                    qty: parseFloat(it.qty),

                                    price: parseFloat(it.price),

                                    unit: it.unit,

                                    unitFactor: parseFloat(it.unitFactor) || 1,

                                    selectedUnit: u,

                                    units: p ? (p.units || []) : []

                                };

                            });

                            document.getElementById('supplierName').value = t.partner || '';

                            document.getElementById('purchaseDate').value = t.dateISO || '';

                            document.getElementById('purchaseTime').value = t.timeISO || '';

                            renderPurchaseCart_Finalized_V3();

                            calculatePurchaseTotals();

                        } else if (section === 'sales-return') {

                            returnCart = invItems.filter(x => x.product).map(it => {

                                const p = productsDB.find(x => x.name === it.product);

                                const u = (p && p.units) ? p.units.find(un => un.unitName === it.unit) : null;

                                return {

                                    name: it.product,

                                    qty: parseFloat(it.qty),

                                    price: parseFloat(it.price),

                                    unit: it.unit,

                                    unitFactor: parseFloat(it.unitFactor) || 1,

                                    selectedUnit: u,

                                    units: p ? (p.units || []) : []

                                };

                            });

                            document.getElementById('salesReturnPartnerDisplay').innerText = t.partner || '---';

                            document.getElementById('salesReturnInvoiceDisplay').innerText = t.originalInvoiceId || '---';

                            if (document.getElementById('salesReturnDate')) document.getElementById('salesReturnDate').value = t.dateISO || '';

                            renderReturnCart();

                        } else if (section === 'purchase-return') {

                            purReturnCart = invItems.filter(x => x.product).map(it => {

                                const p = productsDB.find(x => x.name === it.product);

                                const u = (p && p.units) ? p.units.find(un => un.unitName === it.unit) : null;

                                return {

                                    name: it.product,

                                    qty: parseFloat(it.qty),

                                    price: parseFloat(it.price),

                                    unit: it.unit,

                                    unitFactor: parseFloat(it.unitFactor) || 1,

                                    selectedUnit: u,

                                    units: p ? (p.units || []) : []

                                };

                            });

                            document.getElementById('purReturnPartnerDisplay').innerText = t.partner || '---';

                            document.getElementById('purReturnInvoiceDisplay').innerText = t.originalInvoiceId || '---';

                            if (document.getElementById('purReturnDate')) document.getElementById('purReturnDate').value = t.dateISO || '';

                            renderPurReturnCart();

                        } else if (section === 'transfer') {

                            transferItemsBatch = invItems.filter(x => x.product).map(it => {

                                const p = productsDB.find(x => x.name === it.product);

                                return {

                                    id: p ? p.id : (Date.now() + Math.random()),

                                    name: it.product,

                                    stock: p ? p.stock : 0,

                                    qty: parseFloat(it.qty),

                                    price: parseFloat(it.price)

                                };

                            });

                            const parts = (t.partner || '').split('->');

                            const wFrom = parts[0]?.trim();

                            const wTo = parts[1]?.trim();

                            // ننتظر فتح المودال ثم نعبئ البيانات

                            openTransferModal(true); 

                            const applyValues = () => {
                                if (wFrom) document.getElementById('transferFrom').value = wFrom;
                                updateTransferToList(); 
                                if (wTo) document.getElementById('transferTo').value = wTo;
                                renderTransferTable();
                            };

                            applyValues();
                            setTimeout(applyValues, 250);

                        } else if (section === 'receipt') {

                            document.getElementById('receiptCustomer').value = t.partner || '';

                            document.getElementById('receiptAmount').value = t.total || 0;

                            document.getElementById('receiptDate').value = t.dateISO || '';

                            document.getElementById('receiptTime').value = t.timeISO || '';

                            document.getElementById('receiptNotes').value = t.product || '';

                            if (typeof updateReceiptPartnerBalance === 'function') updateReceiptPartnerBalance();

                        } else if (section === 'disbursement') {

                            document.getElementById('disbursePayee').value = t.partner || '';

                            document.getElementById('disburseAmount').value = t.total || 0;

                            document.getElementById('disburseDate').value = t.dateISO || '';

                            document.getElementById('disburseTime').value = t.timeISO || '';

                            document.getElementById('disburseNotes').value = t.product || '';

                            if (typeof updateDisbursementPartnerBalance === 'function') updateDisbursementPartnerBalance();

                        } else if (section === 'adjustment') {

                            adjCart = invItems.filter(x => x.product).map(it => {

                                const p = productsDB.find(x => x.name === it.product);

                                const u = (p && p.units) ? p.units.find(un => un.unitName === it.unit) : null;

                                return {

                                    id: p ? p.id : (Date.now() + Math.random()),

                                    name: it.product,

                                    qty: parseFloat(it.qty),

                                    price: parseFloat(it.price),

                                    unit: it.unit,

                                    unitFactor: parseFloat(it.unitFactor) || 1,

                                    selectedUnit: u,

                                    units: p ? (p.units || []) : [],

                                    stock: p ? p.stock : 0

                                };

                            });

                            document.getElementById('adjDate').value = t.dateISO || '';

                            document.getElementById('adjTime').value = t.timeISO || '';

                            if (typeof renderAdjTable === 'function') renderAdjTable();

                        }

                        // حفظ الحالة في التبويب فوراً لمنع المسح

                        if (typeof saveCurrentTabState === 'function') saveCurrentTabState();

                        showToast(`🛠️ وضع التعديل: فاتورة #${invId}`, "info");

                        // تمييز زر الحفظ

                        const activeView = document.getElementById(section + '-section');

                        if (activeView) {

                            const saveBtn = activeView.querySelector('.btn-save');

                            if (saveBtn) {

                                saveBtn.style.background = 'var(--main-orange)';

                                saveBtn.innerText = '💾 حفظ التعديلات (F9)';

                            }

                        }

                    }, 200); // تأخير بسيط لضمان انتهاء دالة switchSection

                }

            });

        };

        // دالة مساعدة لتنفيذ منطق الحذف في التعديل (تحتاج لاستدعاء من الحفظ)

        window.revertAndClearOldInvoice = async function(invId, type) {

            if (!editingOriginalItems || editingOriginalItems.length === 0) return;

            // عكس المخزن

            editingOriginalItems.forEach(item => {

                const p = productsDB.find(p => p.name === item.product);

                if (p) {

                    const factor = parseFloat(item.unitFactor) || 1;

                    const baseQty = parseFloat(item.qty) * factor;

                    if (item.type.includes('بيع')) p.stock += baseQty;

                    else if (item.type.includes('شراء')) p.stock -= baseQty;

                    else if (item.type.includes('مرتجع بيع')) p.stock -= baseQty;

                    else if (item.type.includes('مرتجع شراء')) p.stock += baseQty;

                    else if (item.type.includes('تسوية')) p.stock -= baseQty;

                }

            });

            // حذف السجلات القديمة من الذاكرة

            const cleanType = type.replace(/📤|📥|↩️/g, '').trim();

            transactions = transactions.filter(t => !(t.invoiceId == invId && t.type.includes(cleanType)));

            // 🛑 الحذف الفعلي والنهائي من قاعدة البيانات لمنع التكرار (الدبلرة) عند التعديل

            // نستخدم Dexie للبحث والحذف المباشر

            try {

                await db.transactions.where('invoiceId').equals(invId.toString()).filter(t => t.type.includes(cleanType)).delete();

                await db.transactions.where('invoiceId').equals(Number(invId)).filter(t => t.type.includes(cleanType)).delete();

            } catch (e) {

                console.warn("⚠️ فشل الحذف المباشر من القاعدة، سيتم الاعتماد على الحفظ الكلي لاحقاً:", e);

            }

        };

        async function deleteTransaction(idx) {

            if (!checkPermission('docs_delete')) return;

            const t = transactions[idx];

            if (!t) return;

            const msg = t.invoiceId ? `🚨 هل أنت متأكد من حذف الفاتورة رقم #${t.invoiceId} بالكامل؟` : `🚨 هل أنت متأكد من حذف هذه الحركة؟`;

            showCustomAlert({

                type: 'error',

                titleText: '⚠️ حذف نهائي',

                msg: msg + '\nسيتم حذف كافة السجلات المرتبطة وتعديل أرصدة المخازن والحسابات فوراً.',

                showCancel: true,

                confirmText: 'نعم، احذف نهائياً',

                onConfirm: async () => {

                    const invId = t.invoiceId;

                    const cleanType = t.type.split(' ')[0]; // استخراج الكلمة الأولى من النوع (بيع، شراء، تسوية، إلخ) لضمان المطابقة

                    const itemsToRemove = invId ? transactions.filter(x => x.invoiceId == invId && x.type.includes(cleanType)) : [t];

                    // 🗑️ نقل للقمامة قبل الحذف

                    const label = invId ? `فاتورة #${invId} (${t.type})` : `حركة: ${t.product || t.type}`;

                    await trashManager.moveToTrash(itemsToRemove, 'transaction', label);

                    // 1. عكس المخزن

                    itemsToRemove.forEach(item => {

                        const p = productsDB.find(p => p.name === item.product);

                        if (p) {

                            let factor = 1;

                            if (item.unit && p.units) {

                                const u = p.units.find(u => u.unitName === item.unit);

                                if (u) factor = parseFloat(u.factor) || 1;

                            }

                            const baseQty = parseFloat(item.qty) * factor;

                            if (item.type.includes('بيع')) p.stock += baseQty;

                            else if (item.type.includes('شراء')) p.stock -= baseQty;

                            else if (item.type.includes('مرتجع بيع')) p.stock -= baseQty;

                            else if (item.type.includes('مرتجع شراء')) p.stock += baseQty;

                            else if (item.type.includes('تسوية')) p.stock -= baseQty;

                        }

                    });

                    // 2. الحذف من المصفوفة والتحقق من الربط لتنظيف علامة الإرجاع

                    const originalInvIdToClean = itemsToRemove.find(it => it.originalInvoiceId)?.originalInvoiceId;

                    const originalTypeToClean = itemsToRemove[0]?.type.includes('بيع') ? 'بيع' : 'شراء';

                    if (invId) {

                        transactions = transactions.filter(x => !(x.invoiceId == invId && x.type.includes(cleanType)));

                        // 🛑 الحذف النهائي من قاعدة البيانات

                        const invIdStr = invId.toString();

                        const invIdNum = Number(invId);

                        // البحث عن المعرفات الفرعية (id) في قاعدة البيانات لهذه السجلات

                        const dbItems = await db.transactions

                            .where('invoiceId').anyOf([invIdStr, invIdNum])

                            .toArray();

                        // فلترة السجلات التي تطابق النوع أيضاً لضمان الدقة

                        const idsToDelete = dbItems

                            .filter(x => x.type.includes(cleanType))

                            .map(x => x.id);

                        if (idsToDelete.length > 0) {

                            await db.transactions.bulkDelete(idsToDelete);

                        }

                    } else {

                        // لو حركة فردية بدون رقم فاتورة

                        const targetId = t.id;

                        if (targetId) await db.transactions.delete(targetId);

                        transactions.splice(idx, 1);

                    }

                    // 3. تنظيف علامة الإرجاع (is_returned) في الفاتورة الأصلية إذا لم يتبقَ لها مرتجعات أخرى

                    if (originalInvIdToClean) {

                        const remainingReturns = transactions.filter(x => x.originalInvoiceId == originalInvIdToClean && x.type.includes('مرتجع'));

                        if (remainingReturns.length === 0) {

                            transactions.forEach(x => {

                                if (x.invoiceId == originalInvIdToClean && x.type.includes(originalTypeToClean) && !x.type.includes('مرتجع')) {

                                    x.is_returned = false;

                                }

                            });

                        }

                    }

                    await saveData();

                    renderInvoicesTable();

                    if (typeof renderHistoryTable === 'function') renderHistoryTable();

                    showToast("✅ تم النقل للسلة وتصحيح الأرصدة بنجاح.");

                    closeCustomModal();

                }

            });

        }

        // دالة مساعدة لعرض مودال احترافي للمحتوى

        function resetReceipt() {

            if (document.getElementById('receiptAmount')) document.getElementById('receiptAmount').value = '';

            if (document.getElementById('receiptCustomer')) document.getElementById('receiptCustomer').value = '';

            if (document.getElementById('receiptAccountBalance')) document.getElementById('receiptAccountBalance').innerText = '0.00';

            if (document.getElementById('receiptNotes')) document.getElementById('receiptNotes').value = '';

            if (document.getElementById('receiptType')) document.getElementById('receiptType').value = 'أخرى';

            // تعيين التاريخ والوقت ورقم الحركة بالتسلسل

            const now = new Date();

            if (document.getElementById('receiptDate')) document.getElementById('receiptDate').value = now.toLocaleDateString('en-CA');

            if (document.getElementById('receiptTime')) document.getElementById('receiptTime').value = now.toTimeString().slice(0, 5);

            // رقم الحركة يبدأ من 1 ويتسلسل

            if (document.getElementById('receiptID')) {

                document.getElementById('receiptID').value = getNextSequence('قبض');

            }

            if (document.getElementById('pendingInvoicesBody')) document.getElementById('pendingInvoicesBody').innerHTML = '';

            if (document.getElementById('receiptAmount')) document.getElementById('receiptAmount').focus();

        }

        let isReceiptSaving = false; // حماية ضد النقرة المزدوجة

        async function saveReceipt(closeAfterExplicit = false) {

            if (isReceiptSaving) return; // منع التكرار لو العملية جارية

            if (!checkPermission('docs_add')) return false;

            const amount = parseFloat(document.getElementById('receiptAmount').value);

            const payer = document.getElementById('receiptCustomer').value;

            const type = document.getElementById('receiptType').value;

            if (!amount || amount <= 0) {

                alert("⚠️ يرجى إدخال مبلغ صحيح");

                return false;

            }

            if (!payer) {

                alert("⚠️ يرجى اختيار الحساب (العميل)");

                return false;

            }

            // تحديث رصيد الحساب تلقائياً (تم النقل للحساب الديناميكي من جدول الحركات لمنع التكرار)

            const accIndex = accounts.findIndex(a => a.name === payer);

            if (accIndex === -1) {

                alert("⚠️ الحساب غير موجود! يرجى التأكد من اختيار اسم حساب مسجل.");

                return false;

            }

            const dt = getTransactionDateTime('receiptDate', 'receiptTime');

            const notes = document.getElementById('receiptNotes') ? document.getElementById('receiptNotes').value.trim() : "";

            const finalDescription = (type === 'أخرى' && notes) ? notes : type;

            if (isReceiptSaving) return false;

            const currentRID = document.getElementById('receiptID')?.value;

            if (transactions.some(t => t.invoiceId === currentRID && t.type === 'قبض 📥')) {

                console.warn("Duplicate Receipt Blocked");

                return false;

            }

            isReceiptSaving = true;

            if (isEditMode && editingInvoiceId) {

                if (window.revertAndClearOldInvoice) {

                    await window.revertAndClearOldInvoice(editingInvoiceId, editingInvoiceType);

                }

            }

            // --- 🛑 التحقق من حدود الباقة المجانية ---

            const currentPlan = window.getBayanPlan();

            if (!isEditMode && !window.enforceSubscriptionCheck('receipt')) {
                return false;
            }

            // تسجيل الحركة في السجل العام

            const receiptID = isEditMode ? editingInvoiceId : document.getElementById('receiptID').value;

            transactions.push({

                date: dt.full,

                dateISO: dt.iso,

                timeISO: dt.time,

                type: 'قبض 📥',

                method: 'نقدية',

                invoiceId: receiptID,

                product: finalDescription,

                notes: notes,

                qty: 1,

                price: amount,

                total: amount.toFixed(2),

                partner: payer,

                user: currentUser ? currentUser.name : '-',

                editDate: isEditMode ? `${new Date().toLocaleString('ar-EG')} (تعديل بواسطة: ${currentUser ? currentUser.name : 'مجهول'})` : '-'

            });

            await saveData();

            showCustomAlert({

                type: 'success',

                titleText: isEditMode ? '✅ تم تحديث السند' : '✅ تم الحفظ بنجاح',

                msg: `تم ${isEditMode ? 'تحديث' : 'حفظ'} سند القبض رقم #${receiptID} بنجاح.`

            });

            isEditMode = false;

            editingInvoiceId = null;

            editingOriginalDate = null;

            editingInvoiceType = null;

            isReceiptSaving = false; 

            resetReceipt();

            // العودة للسجل

            if (window.viewOldInvoice) window.viewInvoiceItems(receiptID, 'قبض 📥', true);

            return true;

        }

        // ================= منطق الصرف (Disbursement Logic) =================

        function resetDisbursement() {

            if (document.getElementById('disburseAmount')) document.getElementById('disburseAmount').value = '';

            if (document.getElementById('disbursePayee')) document.getElementById('disbursePayee').value = '';

            if (document.getElementById('disburseAccountBalance')) document.getElementById('disburseAccountBalance').innerText = '0.00';

            if (document.getElementById('disburseNotes')) document.getElementById('disburseNotes').value = '';

            if (document.getElementById('disburseType')) document.getElementById('disburseType').value = 'أخرى';

            // رقم الحركة يبدأ من 1 ويتسلسل

            if (document.getElementById('disburseID')) {

                document.getElementById('disburseID').value = getNextSequence('صرف');

            }

            // تعيين التاريخ والوقت الحالي

            const now = new Date();

            if (document.getElementById('disburseDate')) document.getElementById('disburseDate').value = now.toLocaleDateString('en-CA');

            if (document.getElementById('disburseTime')) document.getElementById('disburseTime').value = now.toTimeString().slice(0, 5);

            if (document.getElementById('pendingBillsBody')) document.getElementById('pendingBillsBody').innerHTML = '';

            if (document.getElementById('disburseAmount')) document.getElementById('disburseAmount').focus();

        }

        async function saveDisbursement(closeAfterExplicit = false) {

            if (!checkPermission('docs_add')) return false;

            const amount = parseFloat(document.getElementById('disburseAmount').value);

            const payee = document.getElementById('disbursePayee').value;

            const type = document.getElementById('disburseType').value;

            if (!amount || amount <= 0) {

                alert("⚠️ يرجى إدخال مبلغ صرف صحيح!");

                return false;

            }

            if (!payee) {

                alert("⚠️ يرجى تحديد المستلم (المورد/الحساب)!");

                return false;

            }

            // تحديث رصيد الحساب تلقائياً (تم النقل للحساب الديناميكي من جدول الحركات لمنع التكرار)

            const accIndex = accounts.findIndex(a => a.name === payee);

            if (accIndex === -1) {

                alert("⚠️ الحساب غير موجود! يرجى التأكد من اختيار اسم حساب مسجل.");

                return false;

            }

            const dt = getTransactionDateTime('disburseDate', 'disburseTime');

            const notes = document.getElementById('disburseNotes') ? document.getElementById('disburseNotes').value.trim() : "";

            const finalDescription = (type === 'أخرى' && notes) ? notes : type;

            if (isEditMode && editingInvoiceId) {

                if (window.revertAndClearOldInvoice) {

                    await window.revertAndClearOldInvoice(editingInvoiceId, editingInvoiceType);

                }

            }

            // --- 🛑 التحقق من حدود الباقة المجانية ---

            const currentPlan = window.getBayanPlan();

            if (!isEditMode && !window.enforceSubscriptionCheck('disbursement')) {
                return false;
            }

            // تسجيل الحركة في السجل العام

            const disburseID = isEditMode ? editingInvoiceId : document.getElementById('disburseID').value;

            transactions.push({

                date: dt.full,

                dateISO: dt.iso,

                timeISO: dt.time,

                type: 'صرف 📤',

                method: 'نقدية',

                invoiceId: disburseID,

                product: finalDescription,

                notes: notes,

                qty: 1,

                price: amount,

                total: amount.toFixed(2),

                partner: payee,

                user: currentUser ? currentUser.name : '-',

                editDate: isEditMode ? `${new Date().toLocaleString('ar-EG')} (تعديل بواسطة: ${currentUser ? currentUser.name : 'مجهول'})` : '-'

            });

            await saveData();

            showCustomAlert({

                type: 'success',

                titleText: isEditMode ? '✅ تم تحديث السند' : '✅ تم الحفظ بنجاح',

                msg: `تم ${isEditMode ? 'تحديث' : 'حفظ'} سند الصرف رقم #${disburseID} بنجاح.`

            });

            isEditMode = false;

            editingInvoiceId = null;

            editingOriginalDate = null;

            editingInvoiceType = null;

            resetDisbursement();

            // العودة للسجل

            if (window.viewOldInvoice) window.viewInvoiceItems(disburseID, 'صرف 📤', true);

            return true;

        }

        // ================= منطق تقرير الحركة اليومية (Daily Report Logic) =================

        function generateDailyReport() {

            const fromDate = document.getElementById('reportDateFrom').value;

            const toDate = document.getElementById('reportDateTo').value;

            if (!fromDate || !toDate) {

                showToast("⚠️ يرجى تحديد الفترة الزمنية أولاً");

                return;

            }

            // حفظ الفلاتر (Flexible Reports: Save Filters)

            localStorage.setItem('pos_report_filters', JSON.stringify({

                dateFrom: fromDate,

                dateTo: toDate

            }));

            // 1. حساب الرصيد السابق (إجمالي الحركات النقدية قبل تاريخ البداية)

            let previousBalance = 0;

            transactions.forEach(t => {

                const total = parseFloat(t.total) || parseFloat(t.price) || 0;

                const paid = parseFloat(t.paidAmount) || 0;

                if (t.dateISO < fromDate) {

                    if (t.type.includes('قبض')) {

                        previousBalance += total;

                    } else if (t.type.includes('صرف')) {

                        previousBalance -= total;

                    } else if (t.isInvoiceHead) {

                        if (t.type.includes('بيع') && !t.type.includes('مرتجع')) {

                            previousBalance += paid;

                        } else if (t.type.includes('شراء') && !t.type.includes('مرتجع')) {

                            previousBalance -= paid;

                        } else if (t.type.includes('مرتجع بيع')) {

                            previousBalance -= paid;

                        } else if (t.type.includes('مرتجع شراء')) {

                            previousBalance += paid;

                        }

                    }

                }

            });

            // 2. فلترة العمليات للفترة المحددة

            const filtered = transactions.filter(t => t.dateISO >= fromDate && t.dateISO <= toDate);

            // تهيئة العدادات

            let sales = { count: 0, total: 0, cash: 0, credit: 0 };

            let salesReturn = { count: 0, total: 0, cash: 0, credit: 0 };

            let purchases = { count: 0, total: 0, cash: 0, credit: 0 };

            let purchasesReturn = { count: 0, total: 0, cash: 0, credit: 0 };

            let receipts = { count: 0, total: 0 };

            let disbursements = { count: 0, total: 0 };

            let adjustments = { count: 0, total: 0 };

            let transfers = { count: 0, total: 0 };

            filtered.forEach(t => {

                const total = parseFloat(t.total) || parseFloat(t.price) || 0;

                const paid = parseFloat(t.paidAmount) || 0;

                if (t.type.includes('مرتجع بيع')) {

                    if (t.isInvoiceHead) {

                        salesReturn.count++;

                        salesReturn.total += total;

                        salesReturn.cash += paid;

                        salesReturn.credit += (total - paid);

                    }

                } else if (t.type.includes('بيع')) {

                    if (t.isInvoiceHead) {

                        sales.count++;

                        sales.total += total;

                        sales.cash += paid;

                        sales.credit += (total - paid);

                    }

                } else if (t.type.includes('مرتجع شراء')) {

                    if (t.isInvoiceHead) {

                        purchasesReturn.count++;

                        purchasesReturn.total += total;

                        purchasesReturn.cash += paid;

                        purchasesReturn.credit += (total - paid);

                    }

                } else if (t.type.includes('شراء')) {

                    if (t.isInvoiceHead) {

                        purchases.count++;

                        purchases.total += total;

                        purchases.cash += paid;

                        purchases.credit += (total - paid);

                    }

                } else if (t.type.includes('قبض')) {

                    receipts.count++;

                    receipts.total += total;

                } else if (t.type.includes('صرف')) {

                    disbursements.count++;

                    disbursements.total += total;

                } else if (t.type.includes('تسوية')) {

                    // نجمع إجمالي القيم من سطور الأصناف لأن الـ Head يكون صفر

                    if (!t.isInvoiceHead) {

                        adjustments.total += total;

                    } else {

                        adjustments.count++;

                    }

                } else if (t.type.includes('تحويل')) {

                    if (t.isInvoiceHead) {

                        transfers.count++;

                    }

                    // نجمع قيمة البضاعة المحولة لجميع البنود (بما في ذلك البند الأول)
                    transfers.total += (parseFloat(t.qty) || 0) * (parseFloat(t.price) || 0);

                }

            });

            // تعبئة جدول العمليات

            const opsBody = document.getElementById('opsSummaryBody');

            opsBody.innerHTML = `

                <tr><td>مبيعات</td><td>${sales.count}</td><td>${sales.total.toFixed(2)}</td><td>${sales.cash.toFixed(2)}</td><td>${sales.credit.toFixed(2)}</td></tr>

                <tr><td>مرتجع مبيعات</td><td>${salesReturn.count}</td><td>${salesReturn.total.toFixed(2)}</td><td>${salesReturn.cash.toFixed(2)}</td><td>${salesReturn.credit.toFixed(2)}</td></tr>

                <tr><td>مشتريات</td><td>${purchases.count}</td><td>${purchases.total.toFixed(2)}</td><td>${purchases.cash.toFixed(2)}</td><td>${purchases.credit.toFixed(2)}</td></tr>

                <tr><td>مرتجع مشتريات</td><td>${purchasesReturn.count}</td><td>${purchasesReturn.total.toFixed(2)}</td><td>${purchasesReturn.cash.toFixed(2)}</td><td>${purchasesReturn.credit.toFixed(2)}</td></tr>

                <tr><td>قبض (إيرادات)</td><td>${receipts.count}</td><td>${receipts.total.toFixed(2)}</td><td>${receipts.total.toFixed(2)}</td><td>0.00</td></tr>

                <tr><td>صرف (مصروفات)</td><td>${disbursements.count}</td><td>${disbursements.total.toFixed(2)}</td><td>${disbursements.total.toFixed(2)}</td><td>0.00</td></tr>

                <tr style="background: rgba(142, 68, 173, 0.05);"><td>⚖️ تسوية المخزن</td><td>${adjustments.count}</td><td>${adjustments.total.toFixed(2)}</td><td>-</td><td>-</td></tr>

                <tr style="background: rgba(94, 51, 112, 0.1);"><td>🚚 تحويل مخزني</td><td>${transfers.count}</td><td>${transfers.total.toFixed(2)}</td><td>-</td><td>-</td></tr>

            `;

            // إجمالي اليومية (البيع النقدي + القبض - الصرف)

            const dailyTotal = (sales.cash || 0) + (receipts.total || 0) - (disbursements.total || 0);

            const dailyTotalEl = document.getElementById('dailyTotalVal');

            if (dailyTotalEl) {

                dailyTotalEl.innerText = dailyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 });

                const parentBadge = document.getElementById('dailyTotalSalesReceipts');

                if (parentBadge) {

                    parentBadge.onclick = () => showDailyTotalBreakdown(sales.cash || 0, receipts.total || 0, disbursements.total || 0, dailyTotal);

                }

            }

            const lastUpdateEl = document.getElementById('reportLastUpdate');

            if (lastUpdateEl) {

                const now = new Date();

                const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

                const dateStr = now.toLocaleDateString('ar-EG');

                lastUpdateEl.innerHTML = `آخر تحديث: <b style="color:var(--main-green);">${timeStr}</b> | م ${dateStr}`;

            }

            // حساب القيم النهائية للخزينة (إضافة التسوية للحركة النقدية بناءً على طلب المستخدم)

            // ملاحظة: التحويل المخزني لا يضاف للصافي لأنه حركة بضاعة داخلية وليس تدفق نقدي

            const netCashMovement = (sales.cash + receipts.total + purchasesReturn.cash + adjustments.total) - (purchases.cash + disbursements.total + salesReturn.cash);

            const finalCashBalance = previousBalance + netCashMovement;

            const movementColor = netCashMovement >= 0 ? "var(--main-green)" : "var(--box-red)";

            const balanceColor = finalCashBalance >= 0 ? "var(--main-green)" : "var(--box-red)";

            // تعبئة جدول الخزينة

            const treasuryBody = document.getElementById('treasurySummaryBody');

            treasuryBody.innerHTML = `

                <tr><td>🛒 مبيعات نقدية</td><td style="color:var(--main-green); font-weight:bold;">${sales.cash.toFixed(2)}</td></tr>

                <tr><td>🔄 مرتجع مبيعات نقدي</td><td style="color:var(--box-red); font-weight:bold;">${salesReturn.cash.toFixed(2)}</td></tr>

                <tr><td>🧺 مشتريات نقدية</td><td style="color:var(--box-red); font-weight:bold;">${purchases.cash.toFixed(2)}</td></tr>

                <tr><td>🔙 مرتجع مشتريات نقدي</td><td style="color:var(--main-green); font-weight:bold;">${purchasesReturn.cash.toFixed(2)}</td></tr>

                <tr><td>💰 قبض (إيرادات)</td><td style="color:var(--main-green); font-weight:bold;">${receipts.total.toFixed(2)}</td></tr>

                <tr><td>💸 صرف (مصروفات)</td><td style="color:var(--box-red); font-weight:bold;">${disbursements.total.toFixed(2)}</td></tr>

                <tr style="background: rgba(142, 68, 173, 0.05);"><td>⚖️ تسوية المخزن (قيمة)</td><td style="color:${adjustments.total >= 0 ? 'var(--main-green)' : 'var(--box-red)'}; font-weight:bold;">${adjustments.total.toFixed(2)}</td></tr>

                <tr style="background: rgba(94, 51, 112, 0.1);"><td>🚚 تحويل مخزني (قيمة)</td><td style="color:#5e3370; font-weight:bold;">${transfers.total.toFixed(2)}</td></tr>

                <tr style="font-weight:bold; background:#f9f9f9; border-top:2px dashed #ccc;">

                    <td>⏺️ رصيد سابق (افتتاحي)</td>

                    <td style="color:#2c3e50;">${previousBalance.toFixed(2)}</td>

                </tr>

                <tr style="background:rgba(211, 211, 211, 0.2); font-weight:900;">

                    <td>🔄 صافي الحركة اليومية</td>

                    <td style="color:${movementColor}; font-size:1.1rem;">${netCashMovement.toFixed(2)}</td>

                </tr>

                <tr style="background:var(--main-blue); color:white; font-weight:bold; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">

                    <td>💰 الرصيد النهائي بالدرج</td>

                    <td style="color:white; font-size:1.3rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${finalCashBalance.toFixed(2)}</td>

                </tr>

            `;

            let totalProfit = 0;

            filtered.forEach(t => {

                // نجمع الأرباح من كل بنود الفاتورة (حتى التي تحمل علامة الرأس) طالما يوجد حقل أرباح

                if (t.invoiceId && t.profit !== undefined && t.profit !== '-') {

                   if (t.type.includes('بيع') && !t.type.includes('مرتجع')) {

                        totalProfit += (parseFloat(t.profit) || 0);

                    } else if (t.type.includes('مرتجع بيع')) {

                        totalProfit -= (parseFloat(t.profit) || 0);

                    }

                }

            });

            const profitBody = document.getElementById('profitSummaryBody');

            profitBody.innerHTML = `

                <tr style="background:rgba(142, 68, 173, 0.05);">

                    <td>📈 إجمالي أرباح المبيعات</td>

                    <td style="color:var(--main-green); font-weight:900; font-size:1.1rem;">${totalProfit.toFixed(2)}</td>

                </tr>

                <tr style="background:rgba(142, 68, 173, 0.1); font-weight:900; border-top:2.5px solid var(--main-purple);">

                    <td>📊 صافي الربح النهائي</td>

                    <td style="color:var(--main-purple); font-size:1.4rem; text-shadow:0 1px 2px rgba(0,0,0,0.1);">${totalProfit.toFixed(2)}</td>

                </tr>

            `;

            showToast("✅ تم تحديث التقارير بنجاح");

        }

        function showDailyTotalBreakdown(cashSales, receiptsTotal, disbursementsTotal, netTotal) {

            let existingModal = document.getElementById('dailyTotalBreakdownModal');

            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');

            modal.id = 'dailyTotalBreakdownModal';

            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(3px); animation: fadeIn 0.2s;';

            modal.innerHTML = `

                <div style="background: var(--surface-color, #fff); color: var(--text-color, #0f172a); border-radius: 16px; padding: 25px; width: 90%; max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); position: relative; animation: slideUp 0.3s ease;">

                    <h3 style="margin-top: 0; color: var(--main-purple); border-bottom: 2px solid var(--border-color, #f1f5f9); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">

                        تفاصيل إجمالي اليومية

                        <button onclick="copyDailyTotalFromModal('${netTotal}')" title="نسخ الإجمالي" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">📋</button>

                    </h3>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 1.05rem;">

                        <span>(+) إجمالي البيع النقدي:</span>

                        <span style="color: var(--main-green); font-weight: bold;">${cashSales.toLocaleString('en-US', {minimumFractionDigits:2})}</span>

                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 1.05rem;">

                        <span>(+) إجمالي القبض:</span>

                        <span style="color: var(--main-green); font-weight: bold;">${receiptsTotal.toLocaleString('en-US', {minimumFractionDigits:2})}</span>

                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 1.05rem; border-bottom: 2px dashed var(--border-color, #e2e8f0); padding-bottom: 12px;">

                        <span>(-) إجمالي الصرف:</span>

                        <span style="color: var(--box-red); font-weight: bold;">${disbursementsTotal.toLocaleString('en-US', {minimumFractionDigits:2})}</span>

                    </div>

                    <div style="display: flex; justify-content: space-between; font-size: 1.3rem; font-weight: bold; align-items: center;">

                        <span>الصافي لليومية:</span>

                        <span style="color: ${netTotal >= 0 ? 'var(--main-green)' : 'var(--box-red)'}; background: ${netTotal >= 0 ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)'}; padding: 4px 10px; border-radius: 8px;">${netTotal.toLocaleString('en-US', {minimumFractionDigits:2})}</span>

                    </div>

                    <button onclick="this.closest('#dailyTotalBreakdownModal').remove()" style="width: 100%; margin-top: 25px; background: var(--main-purple); color: white; border: none; padding: 12px; border-radius: 10px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">إغلاق</button>

                </div>

            `;

            document.body.appendChild(modal);

        }

        function copyDailyTotalFromModal(val) {

            if (!val) return;

            const numVal = parseFloat(val).toLocaleString('en-US', {minimumFractionDigits:2});

            navigator.clipboard.writeText(numVal).then(() => {

                showToast("📋 تم نسخ الإجمالي: " + numVal);

            });

        }

        // ================= منطق المبيعات (Sales Logic) =================

        // --- 1. منطق البحث والإضافة ---

        function printReceiptData() {

            const payer = document.getElementById('receiptCustomer').value || 'غير محدد';

            const amount = parseFloat(document.getElementById('receiptAmount').value) || 0;

            if (amount <= 0) return alert("⚠️ يرجى إدخال مبلغ صحيح للطباعة!");

            const id = document.getElementById('receiptID').value;

            const date = document.getElementById('receiptDate').value;

            const time = document.getElementById('receiptTime').value || '';

            const shopName = document.getElementById('shopName').value || 'بـيـان POS';

            // حساب المديونية بشكل ذكي (التأكد إذا كانت الحركة مسجلة بالفعل أم لا)

            const isAlreadySaved = transactions.some(t => t.invoiceId === id && t.type === 'قبض 📥');

            const currentBalance = getAccountBalance(payer);

            let balBefore, balAfter;

            if (isAlreadySaved) {

                // لو مسجلة: يبقى الرصيد الحالي هو "الرصيد بعد"

                balAfter = currentBalance;

                balBefore = currentBalance + amount; // بنرجع المبلغ عشان نعرف "قبل"

            } else {

                // لو مش مسجلة: يبقى الرصيد الحالي هو "الرصيد قبل"

                balBefore = currentBalance;

                balAfter = currentBalance - amount;

            }

            const content = `

                <div class="print-container" style="direction:rtl; font-family:'Arial', sans-serif; padding:10px; color:#000; width:100%; box-sizing:border-box;">

                    <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">

                        <div style="font-size:22px; font-weight:900;">${shopName}</div>

                        <div style="font-size:18px; font-weight:bold; border:2px solid #000; display:inline-block; padding:2px 15px; margin-top:5px;">سند قبض نقدية</div>

                    </div>

                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-weight:bold; font-size:14px;">

                        <span>رقم: ${id}</span>

                        <span>التاريخ: ${date}</span>

                    </div>

                    <div style="border:1px solid #000; padding:10px; font-size:16px; margin-bottom:15px; line-height:1.6;">

                        <div>وصلنا من السيد: <b style="font-size:18px;">${payer}</b></div>

                        <div style="margin-top:10px; text-align:center;">

                            المبلغ: <span style="font-size:26px; font-weight:900; border:2px solid #000; padding:2px 10px;">${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>

                        </div>

                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px; margin-bottom: 15px; text-align: center; border: 1px solid #000;">

                        <div style="border-left:1px solid #000; padding:5px;">

                            <div style="font-size: 11px;">الرصيد السابق</div>

                            <div style="font-size: 14px; font-weight: bold;">${balBefore.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>

                        </div>

                        <div style="border-left:1px solid #000; padding:5px;">

                            <div style="font-size: 11px;">المبلغ المقبوض</div>

                            <div style="font-size: 14px; font-weight: bold;">${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>

                        </div>

                        <div style="padding:5px;">

                            <div style="font-size: 11px;">المتبقي عليه</div>

                            <div style="font-size: 14px; font-weight: bold;">${balAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>

                        </div>

                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; margin-top:30px; font-weight:bold; text-align:center; font-size:14px; gap:20px;">

                        <div style="border-top:1px solid #000; padding-top:5px;">توقيع المستلم</div>

                        <div style="border-top:1px solid #000; padding-top:5px;">الختم</div>

                    </div>

                    <div style="text-align:center; margin-top:20px; border-top:1px dashed #000; padding-top:10px; font-size:12px;">

                        <div style="font-weight:bold;">${document.getElementById('printFooterMsg').value || 'شكراً لزيارتكم!'}</div>

                        <div>نظام بيان POS - مبيعات متكامل</div>

                    </div>

                </div>

            `;

            document.getElementById('receipt-area').innerHTML = content;

            window.print();

        }

        function printDisbursementData() {

            const amount = document.getElementById('disburseAmount').value;

            if (!amount || parseFloat(amount) <= 0) return alert("⚠️ يرجى إدخال مبلغ صحيح للطباعة!");

            const id = document.getElementById('disburseID').value;

            const date = document.getElementById('disburseDate').value;

            const time = document.getElementById('disburseTime').value || '';

            const payee = document.getElementById('disbursePayee').value || 'غير محدد';

            const notes = document.getElementById('disburseNotes').value;

            const shopName = document.getElementById('shopName').value || 'بـيـان POS';

            // حساب المديونية بشكل ذكي (التأكد إذا كانت الحركة مسجلة بالفعل أم لا)

            const isAlreadySaved = transactions.some(t => t.invoiceId === id && t.type === 'صرف 📤');

            const currentBalance = getAccountBalance(payee);

            let balBefore, balAfter;

            if (isAlreadySaved) {

                // لو مسجلة: يبقى الرصيد الحالي هو "الرصيد بعد"

                balAfter = currentBalance;

                balBefore = currentBalance - parseFloat(amount); // بنرجع المبلغ (عكس الصرف) عشان نعرف "قبل"

            } else {

                // لو مش مسجلة: يبقى الرصيد الحالي هو "الرصيد قبل"

                balBefore = currentBalance;

                balAfter = currentBalance + parseFloat(amount);

            }

            const content = `

                <div class="print-container" style="direction:rtl; font-family:'Arial', sans-serif; padding:10px; color:#000; width:100%; box-sizing:border-box;">

                    <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">

                        <div style="font-size:22px; font-weight:900;">${shopName}</div>

                        <div style="font-size:18px; font-weight:bold; border:2px solid #000; display:inline-block; padding:2px 15px; margin-top:5px;">سند صرف نقدية</div>

                    </div>

                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-weight:bold; font-size:14px;">

                        <span>رقم: ${id}</span>

                        <span>التاريخ: ${date}</span>

                    </div>

                    <div style="border:1px solid #000; padding:10px; font-size:16px; margin-bottom:15px; line-height:1.6;">

                        <div>صرف للسيد: <b style="font-size:18px;">${payee}</b></div>

                        <div style="margin-top:10px; text-align:center;">

                            المبلغ: <span style="font-size:26px; font-weight:900; border:2px solid #000; padding:2px 10px;">${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>

                        </div>

                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px; margin-bottom: 15px; text-align: center; border: 1px solid #000;">

                        <div style="border-left:1px solid #000; padding:5px;">

                            <div style="font-size: 11px;">كان له</div>

                            <div style="font-size: 14px; font-weight: bold;">${balBefore.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>

                        </div>

                        <div style="border-left:1px solid #000; padding:5px;">

                            <div style="font-size: 11px;">المنصرف</div>

                            <div style="font-size: 14px; font-weight: bold;">${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>

                        </div>

                        <div style="padding:5px;">

                            <div style="font-size: 11px;">المتبقي له</div>

                            <div style="font-size: 14px; font-weight: bold;">${balAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>

                        </div>

                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; margin-top:30px; font-weight:bold; text-align:center; font-size:14px; gap:20px;">

                        <div style="border-top:1px solid #000; padding-top:5px;">توقيع المستلم</div>

                        <div style="border-top:1px solid #000; padding-top:5px;">المدير المالي</div>

                    </div>

                    <div style="text-align:center; margin-top:20px; border-top:1px dashed #000; padding-top:10px; font-size:12px;">

                        <div style="font-weight:bold;">${document.getElementById('printFooterMsg').value || 'شكراً لزيارتكم!'}</div>

                        <div>نظام بيان POS - مبيعات متكامل</div>

                    </div>

                </div>

            `;

            document.getElementById('receipt-area').innerHTML = content;

            window.print();

        }

        function printReportData() {

            const opsSummary = document.getElementById('opsSummaryBody').innerHTML.replace(/📤|📥|🔄|🔙|💵|💸|⚖️|🚚|🛒|🧺|📦|💰|🌗|✅|⏳/g, '');

            const treasurySummary = document.getElementById('treasurySummaryBody').innerHTML.replace(/📤|📥|🔄|🔙|💵|💸|⚖️|🚚|🛒|🧺|📦|💰|🌗|✅|⏳|⏺️/g, '');

            const from = document.getElementById('reportDateFrom').value;

            const to = document.getElementById('reportDateTo').value;

            const businessName = localStorage.getItem('bayan_business_name') || 'بيان POS للطلب والمبيعات';

            const content = `

                <div class="print-container" style="direction: rtl; font-family: 'Tahoma', 'Arial', sans-serif; padding: 10px; color: #000; width: 100%; box-sizing: border-box;">

                    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">

                        <h1 style="margin: 0; font-size: 22px; font-weight: 900;">${businessName}</h1>

                        <h2 style="margin: 5px 0; font-size: 18px; font-weight: 800;">تقرير الحركة اليومية</h2>

                        <div style="font-size: 14px; margin-top: 5px; font-weight: bold; border: 1px solid #000; padding: 5px; border-radius: 5px;">

                            من: ${from} <br> إلى: ${to}

                        </div>

                    </div>

                    <div style="margin-bottom: 20px;">

                        <h3 style="border-right: 4px solid #000; padding-right: 8px; margin-bottom: 10px; font-size: 16px; font-weight: 900;">ملخص العمليات المالية</h3>

                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 13px;">

                            <thead>

                                <tr style="border-bottom: 2px solid #000;">

                                    <th style="padding: 6px; border-left: 1px solid #000; text-align: right;">البيان</th>

                                    <th style="padding: 6px; border-left: 1px solid #000; text-align: center;">العدد</th>

                                    <th style="padding: 6px; border-left: 1px solid #000; text-align: center;">الإجمالي</th>

                                    <th style="padding: 6px; border-left: 1px solid #000; text-align: center;">نقدي</th>

                                    <th style="padding: 6px; text-align: center;">آجل</th>

                                </tr>

                            </thead>

                            <tbody style="text-align: right;">${opsSummary}</tbody>

                        </table>

                    </div>

                    <div style="margin-bottom: 20px;">

                        <h3 style="border-right: 4px solid #000; padding-right: 8px; margin-bottom: 10px; font-size: 16px; font-weight: 900;">ملخص حركة الخزينة</h3>

                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 14px;">

                            <thead>

                                <tr style="border-bottom: 2px solid #000;">

                                    <th style="padding: 8px; border-left: 1px solid #000; text-align: right;">البيان</th>

                                    <th style="padding: 8px; text-align: center;">القيمة</th>

                                </tr>

                            </thead>

                            <tbody style="font-weight: bold;">${treasurySummary}</tbody>

                        </table>

                    </div>

                    <div style="margin-bottom: 20px;">

                        <h3 style="border-right: 4px solid #000; padding-right: 8px; margin-bottom: 10px; font-size: 16px; font-weight: 900;">ملخص الأرباح</h3>

                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 14px;">

                            <tbody style="font-weight: bold;">

                                ${document.getElementById('profitSummaryBody').innerHTML.replace(/📤|📥|🔄|🔙|💵|💸|⚖️|🚚|🛒|🧺|📦|💰|🌗|✅|⏳/g, '')}

                            </tbody>

                        </table>

                    </div>

                    <div style="margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; font-size: 11px; text-align: center; line-height: 1.6;">

                        <div style="font-weight: bold;">تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</div>

                        <div>بواسطة: ${currentUser ? currentUser.name : 'النظام'}</div>

                        <div style="font-weight: 900; margin-top: 5px; font-size: 12px; border: 1px solid #000; display: inline-block; padding: 2px 10px;">بيان POS - نظام مبيعات متكامل</div>

                    </div>

                </div>

            `;

            const printWindow = window.open('', '_blank');

            printWindow.document.write(`

                <html dir="rtl" lang="ar">

                    <head>

                        <title>طباعة تقرير الحركة اليومية</title>

                        <style>

                            @page { margin: 0; }

                            body { margin: 0 0 0 auto; padding: 5px; width: 80mm; font-family: 'Arial', sans-serif; text-align: right; }

                            table th, table td { padding: 4px; border: 1px solid #000 !important; color: #000 !important; }

                            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }

                            /* إخفاء الخلفيات في الطباعة لضمان الوضوح */

                            tr, td, th { background-color: transparent !important; }

                        </style>

                    </head>

                    <body>

                        ${content}

                        <script>

                            window.onload = function() {

                                setTimeout(function() {

                                    window.focus();

                                    window.print();

                                    setTimeout(function() { window.close(); }, 500);

                                }, 300);

                            };

                        <\/script>

                    </body>

                </html>

            `);

            printWindow.document.close();

        }

         function printAdjustmentData() {

            if (adjCart.length === 0) return alert("لا توجد بيانات للطباعة");

            const shopName    = document.getElementById('shopName')?.value || 'بـيـان POS';
            const shopAddress = document.getElementById('shopAddress')?.value || '';
            const shopPhone   = document.getElementById('shopPhone1')?.value || '';
            const footerMsg   = document.getElementById('printFooterMsg')?.value || 'شكراً لزيارتكم!';

            let rows = '';

            adjCart.forEach(item => {

                rows += `<tr><td>${item.name}</td><td>${item.qty}</td><td>${item.price}</td></tr>`;

            });

            const content = `

                <div class="print-container" style="direction:rtl; font-family:Cairo, sans-serif; padding: 20px;">

                    <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">

                        <h1 style="margin:0;">${shopName}</h1>
                        ${shopAddress ? `<div style="font-size:12px; color:#555; margin-top:2px;">${shopAddress}</div>` : ''}
                        ${shopPhone ? `<div style="font-size:12px; color:#555; margin-top:2px;">هاتف: ${shopPhone}</div>` : ''}

                        <h2 style="margin:5px 0; background:#000; color:#fff; display:inline-block; padding:5px 20px; border-radius:5px;">إذن تسوية مخزنية</h2>

                    </div>

                    <div style="display:flex; justify-content:space-between; margin-bottom: 20px; font-weight:bold;">
                        <div>التاريخ: ${getTransactionDateTime('adjDate', 'adjTime').full}</div>
                    </div>

                    <table style="width:100%; border-collapse:collapse; text-align:center; margin-bottom:20px;" border="1">

                        <thead><tr style="background:#f0f0f0;"><th>الصنف</th><th>الكمية الفعلية</th><th>السعر</th></tr></thead>

                        <tbody>${rows}</tbody>

                    </table>

                    <div style="margin-top:50px; display:flex; justify-content:space-between;">
                        <div style="text-align:center;">توقيع أمين المخزن:<br><br>...........................</div>
                    </div>
                    
                    <div style="text-align:center; margin-top:30px; border-top:1px dashed #000; padding-top:10px; font-size:12px;">
                        <div style="font-weight:bold;">${footerMsg}</div>
                        <div>نظام بيان POS - مبيعات متكامل</div>
                    </div>

                </div>

             `;

            document.getElementById('receipt-area').innerHTML = content;

            window.print();

        }

        // ================= منطق تحليل المبيعات (Sales Analysis Logic) =================

        function setAnalysisMode(mode) {

            currentAnalysisMode = mode;

            renderAnalysisTable();

        }

        function shareAnalysisReport(platform) {

            const totalSales = document.getElementById('anTotalSales').innerText;

            const totalProfit = document.getElementById('anTotalProfit').innerText;

            const fromDate = document.getElementById('anDateFrom').value || 'بداية السجل';

            const toDate = document.getElementById('anDateTo').value || 'اليوم';

            const shopName = document.getElementById('shopName').value || 'متجر السعادة';

            let text = `📊 *تقرير تحليل المبيعات - ${shopName}*\n`;

            text += `🗓️ الفترة: من ${fromDate} إلى ${toDate}\n`;

            text += `------------------\n`;

            text += `💰 إجمالي المبيعات: *${totalSales} ج.م*\n`;

            text += `📊 إجمالي تحليل المبيعات: *${totalProfit} ج.م*\n`;

            text += `------------------\n`;

            text += `✅ تم استخراج التقرير بتاريخ: ${new Date().toLocaleDateString('ar-EG')}`;

            const encodedText = encodeURIComponent(text);

            let url = '';

            if (platform === 'whatsapp') {

                url = `https://wa.me/?text=${encodedText}`;

            } else if (platform === 'telegram') {

                url = `https://t.me/share/url?url=${encodedText}`;

            }

            if (url) window.open(url, '_blank');

        }

        let salesTrendChartInstance = null;

        let categoryChartInstance = null;

        function updateAnalysisCharts(data) {

            const trendData = {};

            const catData = {};

            let totalQty = 0;

            let invoiceIds = new Set();

            data.forEach(t => {

                const isReturn = t.type.includes('مرتجع');

                const qty = parseFloat(t.qty) || 0;

                const total = parseFloat(t.total) || 0;

                const date = t.dateISO;

                if (t.invoiceId) invoiceIds.add(t.invoiceId);

                // Trend

                if (!trendData[date]) trendData[date] = 0;

                trendData[date] += isReturn ? -total : total;

                // التجميع حسب اسم المنتج بدلاً من التصنيف

                const productName = t.product || 'غير معروف';

                if (!catData[productName]) catData[productName] = 0;

                catData[productName] += isReturn ? -total : total;

                totalQty += isReturn ? -qty : qty;

            });

            // تحويل البيانات لترتيبها واختيار الأفضل

            let productSalesArray = Object.keys(catData).map(name => ({

                name: name,

                total: catData[name]

            })).sort((a, b) => b.total - a.total);

            // نأخذ أفضل 7 منتجات والباقي نضعه في "أخرى"

            let finalLabels = [];

            let finalValues = [];

            if (productSalesArray.length > 7) {

                const top7 = productSalesArray.slice(0, 7);

                const others = productSalesArray.slice(7).reduce((sum, p) => sum + p.total, 0);

                finalLabels = top7.map(p => p.name);

                finalValues = top7.map(p => p.total);

                if (others > 0) {

                    finalLabels.push("أصناف أخرى");

                    finalValues.push(others);

                }

            } else {

                finalLabels = productSalesArray.map(p => p.name);

                finalValues = productSalesArray.map(p => p.total);

            }

            // Update KPI Cards

            const invoiceCountEl = document.getElementById('kpi-invoice-count');

            const totalQtyEl = document.getElementById('kpi-total-qty');

            if (invoiceCountEl) invoiceCountEl.innerText = invoiceIds.size;

            if (totalQtyEl) totalQtyEl.innerText = totalQty.toFixed(0);

            // Chart 1: Sales Trend

            const trendLabels = Object.keys(trendData).sort();

            const trendValues = trendLabels.map(l => trendData[l]);

            const trendCtx = document.getElementById('salesTrendChart');

            if (trendCtx) {

                if (salesTrendChartInstance) salesTrendChartInstance.destroy();

                salesTrendChartInstance = new Chart(trendCtx.getContext('2d'), {

                    type: 'line',

                    data: {

                        labels: trendLabels,

                        datasets: [{

                            label: 'المبيعات',

                            data: trendValues,

                            borderColor: '#4f46e5',

                            backgroundColor: 'rgba(79, 70, 229, 0.1)',

                            fill: true,

                            tension: 0.4,

                            borderWidth: 3,

                            pointRadius: 4,

                            pointBackgroundColor: '#4f46e5'

                        }]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        plugins: { 

                            legend: { display: false },

                            title: { display: true, text: '📈 اتجاه المبيعات', font: { family: 'Cairo', size: 14, weight: 'bold' }, color: '#1e293b' }

                        },

                        scales: { 

                            y: { beginAtZero: true, grid: { display: false } },

                            x: { grid: { display: false } }

                        }

                    }

                });

            }

            // Chart 2: Top Products Distribution

            const catCtx = document.getElementById('categoryChart');

            if (catCtx) {

                if (categoryChartInstance) categoryChartInstance.destroy();

                categoryChartInstance = new Chart(catCtx.getContext('2d'), {

                    type: 'doughnut',

                    data: {

                        labels: finalLabels,

                        datasets: [{

                            data: finalValues,

                            backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#94a3b8', '#cbd5e1'],

                            borderWidth: 0

                        }]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        plugins: { 

                            legend: { position: 'right', labels: { boxWidth: 10, font: { family: 'Cairo', size: 10 } } },

                            title: { display: true, text: '🏆 الأصناف الأكثر مبيعاً', font: { family: 'Cairo', size: 14, weight: 'bold' }, color: '#1e293b' }

                        },

                        cutout: '70%'

                    }

                });

            }

        }

        // متغيرات للتحكم في فرز جدول التحليل المبيعات حسب التاريخ
        let analysisDateSortDir = 'desc'; // desc = من الأحدث للأقدم، asc = من الأقدم للأحدث

        function toggleAnalysisDateSort() {
            analysisDateSortDir = (analysisDateSortDir === 'desc') ? 'asc' : 'desc';
            
            // تحديث الأيقونات في ترويسة الجدول
            const sortIcon = document.getElementById('anSortDateIcon');
            if (sortIcon) {
                sortIcon.innerText = (analysisDateSortDir === 'desc') ? ' 🔽' : ' 🔼';
            }
            
            renderAnalysisTable();
        }
        window.toggleAnalysisDateSort = toggleAnalysisDateSort;

        function renderAnalysisTable() {

            const tbody = document.getElementById('analysisTableBody');

            tbody.innerHTML = '';

            // 1. جلب الفلاتر

            const fromDate = document.getElementById('anDateFrom').value;

            const toDate = document.getElementById('anDateTo').value;

            const methodFilter = document.getElementById('anMethod').value;

            const accFilter = document.getElementById('anAccount').value;

            const catFilter = document.getElementById('anCategory').value;

            // تعبئة قائمة الحسابات إذا كانت فارغة

            const accSelect = document.getElementById('anAccount');

            if (accSelect.options.length === 1) {

                accounts.forEach(a => {

                    const opt = document.createElement('option');

                    opt.value = a.name;

                    opt.innerText = a.name;

                    accSelect.appendChild(opt);

                });

            }

            // تعبئة قائمة التصنيفات إذا كانت فارغة

            const catSelect = document.getElementById('anCategory');

            if (catSelect.options.length === 1) {

                const cats = [...new Set(productsDB.map(p => p.category).filter(c => c))];

                cats.forEach(c => {

                    const opt = document.createElement('option');

                    opt.value = c;

                    opt.innerText = c;

                    catSelect.appendChild(opt);

                });

            }

            // 2. فلترة البيانات (نبحث في transactions عن عمليات البيع فقط)

            let data = transactions.filter(t => (t.type.includes('بيع') || t.type.includes('مرتجع بيع')));

            if (fromDate) data = data.filter(t => t.dateISO >= fromDate);

            if (toDate) data = data.filter(t => t.dateISO <= toDate);

            if (accFilter !== 'all') data = data.filter(t => t.partner === accFilter);

            if (methodFilter !== 'all') {

                if (methodFilter === 'نقدية') {

                    data = data.filter(t => t.method && (t.method.includes('نقدية') || t.method.includes('نقدي') || t.method.includes('كاش') || t.method.includes('فودافون')));

                } else {

                    data = data.filter(t => t.method && t.method.includes(methodFilter));

                }

            }

            if (catFilter !== 'all') {

                data = data.filter(t => {

                    const prod = productsDB.find(p => p.name === t.product);

                    return prod && prod.category === catFilter;

                });

            }

            // تطبيق فرز وتريب التاريخ والوقت قبل العرض
            data.sort((a, b) => {
                const dateA = a.dateISO || '';
                const dateB = b.dateISO || '';
                const timeA = a.timeISO || '00:00';
                const timeB = b.timeISO || '00:00';
                
                const datetimeA = dateA + ' ' + timeA;
                const datetimeB = dateB + ' ' + timeB;
                
                if (analysisDateSortDir === 'desc') {
                    return datetimeB.localeCompare(datetimeA);
                } else {
                    return datetimeA.localeCompare(datetimeB);
                }
            });

            // 3. حساب الإجماليات للفترة المحددة (لحساب النسب)

            let totalPeriodProfit = 0;

            let totalPeriodSales = 0;

            data.forEach(t => {

                const isReturn = t.type.includes('مرتجع');

                let profit = parseFloat(t.profit);

                let total = parseFloat(t.total) || 0;

                if (isNaN(profit)) {

                    const p = productsDB.find(x => x.name === t.product);

                    const cost = p ? (parseFloat(p.cost) || parseFloat(p.buyPrice) || 0) : 0;

                    profit = (parseFloat(t.price) - cost) * parseFloat(t.qty);

                }

                if (isReturn) {

                    totalPeriodProfit -= profit;

                    totalPeriodSales -= total;

                } else {

                    totalPeriodProfit += profit;

                    totalPeriodSales += total;

                }

            });

            document.getElementById('anTotalSales').innerText = totalPeriodSales.toFixed(2);

            document.getElementById('anTotalProfit').innerText = totalPeriodProfit.toFixed(2);

            // تحديث كروت الـ KPI الجديدة

            const kpiSales = document.getElementById('kpi-total-sales');

            const kpiProfit = document.getElementById('kpi-total-profit');

            if (kpiSales) kpiSales.innerText = totalPeriodSales.toLocaleString('en-US', { minimumFractionDigits: 2 });

            if (kpiProfit) kpiProfit.innerText = totalPeriodProfit.toLocaleString('en-US', { minimumFractionDigits: 2 });

            // تحديث الرسوم البيانية

            updateAnalysisCharts(data);

            // 4. رسم الجدول

            if (data.length === 0) {

                tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:20px;">لا توجد مبيعات في هذه الفترة</td></tr>';

                return;

            }

            if (currentAnalysisMode === 'detailed') {

                data.forEach((t, idx) => {

                    const isReturn = t.type.includes('مرتجع');

                    const qty = parseFloat(t.qty) || 0;
                    const price = parseFloat(t.price) || 0;
                    const absQty = Math.abs(qty) || 1;

                    // تنظيف وتثبيت قيمة الربح
                    let rawProfit = parseFloat(t.profit);
                    
                    // جلب التكلفة الأساسية ومعامل التحويل من قاعدة البيانات
                    const p = productsDB.find(x => x.name === t.product);
                    let dbCost = p ? (parseFloat(p.cost) || parseFloat(p.buyPrice) || 0) : 0;
                    
                    // استخراج معامل التحويل: إما المخزن في الحركة (unitFactor) أو نجده بمطابقة اسم الوحدة المستخدمة في الحركة
                    let factor = parseFloat(t.unitFactor) || 1;
                    if (p && (!t.unitFactor || t.unitFactor === 1)) {
                        // إذا كانت الوحدة المستخدمة فرعية وليست الأساسية، نبحث عن معاملها في قاعدة البيانات
                        const isSubUnit = p.subUnits && p.subUnits.find(u => u.unitName === t.unit);
                        if (isSubUnit) {
                            factor = parseFloat(isSubUnit.factor) || 1;
                        }
                    }

                    // إذا كان المنتج يحتوي على معامل تحويل والعملية تمت بوحدة فرعية، نضرب التكلفة الأساسية في المعامل
                    if (factor !== 1) {
                        dbCost = dbCost * factor;
                    }
                    
                    // إذا كان الربح المخزن بالعملية غير صالح، أو إذا كان الربح المستخرج (بالمطلق) أكبر من إجمالي المبيعات نفسها (مما يعني خطأ بالتجميع أو تداخل الوحدات الفرعية)
                    if (isNaN(rawProfit) || Math.abs(rawProfit) > (price * absQty)) {
                        // الربح = (سعر بيع القطعة الحالي - التكلفة المسجلة للقطعة) * الكمية المطلقة
                        rawProfit = (price - dbCost) * absQty;
                    } else {
                        rawProfit = Math.abs(rawProfit);
                    }

                    // التكلفة الفردية = سعر البيع للقطعة - (الربح للسطر / الكمية المطلقة)
                    let costPrice = price - (rawProfit / absQty);
                    if (costPrice < 0) costPrice = 0; // لضمان عدم ظهور تكلفة سالبة

                    // الربح المعروض للسطر: سالب دائماً للمرتجع
                    const displayProfit = isReturn ? -rawProfit : rawProfit;

                    // 100% للإجمالي: نسبة ربح هذا السطر إلى إجمالي ربح الفترة بالكامل
                    const profitPercentTotal = totalPeriodProfit !== 0 ? ((displayProfit / totalPeriodProfit) * 100).toFixed(1) : 0;

                    // 100% للتكلفة: نسبة الربح إلى تكلفة السطر
                    const lineCostTotal = costPrice * absQty;
                    const profitPercentCost = lineCostTotal > 0 ? ((displayProfit / lineCostTotal) * 100).toFixed(1) : 0;

                    const isLoss = displayProfit < 0;

                    const rowClass = isReturn ? 'return-row' : (isLoss ? 'loss-row' : '');

                    tbody.innerHTML += `

                        <tr class="${rowClass}">

                            <td style="text-align:center;"><input type="checkbox" onclick="event.stopPropagation()" class="inv-row-check" onchange="if(this.checked) { document.querySelectorAll('#analysisTableBody input.inv-row-check').forEach(box => { if(box !== this) box.checked = false; }); }"></td>

                            <td>${t.invoiceId || '-'}</td>

                            <td>${t.dateISO}</td>

                            <td>${t.timeISO || '-'}</td>

                            <td style="font-weight:bold; color:${isReturn ? '#ef4444' : '#10b981'}; cursor:pointer;" onclick="event.stopPropagation(); if('${t.invoiceId}' !== '-') viewInvoiceItems('${t.invoiceId}', '${t.type}');">${t.type || 'بيع'}</td>

                            <td>${t.partner}</td>

                            <td>${isReturn ? '↩️ ' : ''}${t.product}</td>

                            <td>${isReturn ? '-' : ''}${qty}</td>

                            <td>${costPrice.toFixed(2)} <span style="font-size:0.75rem; color:#64748b; font-weight:normal;">(${(costPrice * absQty).toFixed(2)})</span></td>

                            <td>${price.toFixed(2)}</td>

                            <td class="profit-col" style="color:${isLoss ? '#ef4444' : '#10b981'}; font-weight:bold;">${displayProfit.toFixed(2)}</td>

                            <td class="profit-col">${profitPercentTotal}%</td>

                            <td class="profit-col">${profitPercentCost}%</td>

                        </tr>

                    `;

                });

            } else {

                const groups = {};

                data.forEach(t => {

                    const isReturn = t.type.includes('مرتجع');

                    if (!groups[t.product]) {

                        groups[t.product] = { name: t.product, qty: 0, total: 0, profit: 0, cost: 0 };

                    }

                    const qty = parseFloat(t.qty);

                    const total = parseFloat(t.total);

                    let profit = parseFloat(t.profit);

                    let costPrice = 0;

                    if (isNaN(profit)) {

                        const p = productsDB.find(x => x.name === t.product);

                        costPrice = p ? (parseFloat(p.cost) || parseFloat(p.buyPrice) || 0) : 0;

                        profit = (parseFloat(t.price) - costPrice) * qty;

                    } else {

                        const price = parseFloat(t.price);

                        costPrice = price - (profit / qty);

                    }

                    if (isReturn) {

                        groups[t.product].qty -= qty;

                        groups[t.product].total -= total;

                        groups[t.product].profit -= profit;

                        groups[t.product].cost -= (costPrice * qty);

                    } else {

                        groups[t.product].qty += qty;

                        groups[t.product].total += total;

                        groups[t.product].profit += profit;

                        groups[t.product].cost += (costPrice * qty);

                    }

                });

                Object.values(groups).forEach((g, idx) => {

                    const avgPrice = g.qty !== 0 ? g.total / g.qty : 0;

                    const profitPercentTotal = totalPeriodProfit !== 0 ? ((g.profit / totalPeriodProfit) * 100).toFixed(1) : 0;

                    const profitPercentCost = g.cost > 0 ? ((g.profit / g.cost) * 100).toFixed(1) : 0;

                    const isLoss = g.profit < 0;

                    const rowClass = isLoss ? 'loss-row' : '';

                    tbody.innerHTML += `

                        <tr class="${rowClass}" style="background: rgba(255,255,255,0.5);">

                            <td style="text-align:center;"><input type="checkbox" class="inv-row-check" onchange="if(this.checked) { document.querySelectorAll('#analysisTableBody input.inv-row-check').forEach(box => { if(box !== this) box.checked = false; }); }"></td>

                            <td style="font-weight:900;">${idx + 1}</td>

                            <td style="color:#64748b;">مجمع مبيعات</td> <!-- التاريخ -->

                            <td style="color:#64748b;">-</td> <!-- الوقت -->

                            <td style="color:#64748b;">-</td> <!-- نوع العملية -->

                            <td style="color:#64748b;">-</td> <!-- العميل -->

                            <td style="font-weight:bold; color:var(--main-purple); font-size:1rem;">📦 ${g.name}</td> <!-- الصنف -->

                            <td style="font-weight:bold; text-align:center;">${g.qty}</td> <!-- الكمية -->

                            <td style="color:#64748b;">${(g.cost / (g.qty || 1)).toFixed(2)}</td> <!-- التكلفة (متوسط التكلفة للقطعة) -->

                            <td style="font-weight:bold;">${avgPrice.toFixed(2)}</td> <!-- سعر البيع (متوسط سعر البيع) -->

                            <td class="profit-col" style="color:${isLoss ? '#ef4444' : '#10b981'}; font-weight:900; font-size:1.1rem;">${g.profit.toFixed(2)}</td> <!-- الربح -->

                            <td class="profit-col" style="font-weight:bold;">${profitPercentTotal}%</td> <!-- % للإجمالي -->

                            <td class="profit-col">${g.cost > 0 ? profitPercentCost + '%' : '-'}</td> <!-- % للتكلفة -->

                        </tr>

                    `;

                });

            }

            applyAnalysisColumnVisibility();

        }

        // --- تخصيص أعمدة تحليل المبيعات ---

        let analysisColumnVisibility = JSON.parse(localStorage.getItem('pos_an_cols') || '{"0":true,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true,"7":true,"8":true,"9":true,"10":true,"11":true,"12":true}');

        function toggleAnalysisColumn(index, isVisible) {

            analysisColumnVisibility[index] = isVisible;

            localStorage.setItem('pos_an_cols', JSON.stringify(analysisColumnVisibility));

            applyAnalysisColumnVisibility();

        }

        function applyAnalysisColumnVisibility() {

            const table = document.querySelector('#analysis-section .invoice-table');

            if (!table) return;

            const theadRows = table.querySelectorAll('thead th');

            const tbodyRows = table.querySelectorAll('tbody tr');

            theadRows.forEach((th, i) => {

                th.style.display = analysisColumnVisibility[i] ? '' : 'none';

            });

            tbodyRows.forEach(tr => {

                const tds = tr.querySelectorAll('td');

                tds.forEach((td, i) => {

                    td.style.display = (analysisColumnVisibility[i] !== undefined) ? (analysisColumnVisibility[i] ? '' : 'none') : '';

                });

            });

        }

        function showAnalysisColumnCustomizer() {

            const cols = [

                { id: 0, name: "تحديد" },

                { id: 1, name: "#" },

                { id: 2, name: "التاريخ" },

                { id: 3, name: "الوقت" },

                { id: 4, name: "نوع العملية" },

                { id: 5, name: "العميل" },

                { id: 6, name: "الصنف" },

                { id: 7, name: "الكمية" },

                { id: 8, name: "التكلفة" },

                { id: 9, name: "سعر البيع" },

                { id: 10, name: "الربح" },

                { id: 11, name: "% للإجمالي" },

                { id: 12, name: "% للتكلفة" }

            ];

            let html = `<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; padding:15px 0;">`;

            cols.forEach(c => {

                const checked = analysisColumnVisibility[c.id] ? 'checked' : '';

                html += `<label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:10px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0; font-size:0.9rem; font-weight:bold; color:#334155; transition: all 0.2s ease-in-out; user-select:none;" onmouseover="this.style.background='#f1f5f9'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0';">

                            <input type="checkbox" ${checked} onchange="toggleAnalysisColumn(${c.id}, this.checked)" style="width:16px; height:16px; accent-color:#4f46e5; cursor:pointer;"> ${c.name}

                         </label>`;

            });

            html += `</div>`;

            const modal = document.createElement('div');

            modal.className = 'modal-overlay';

            modal.style.cssText = `

                position: fixed; top: 0; left: 0; width: 100%; height: 100%;

                background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px);

                z-index: 12000; display: flex; align-items: center; justify-content: center;

                direction: rtl; font-family: 'Cairo', sans-serif;

            `;

            modal.innerHTML = `

                <div style="background: white; width: 460px; max-width: 90%; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.4); padding: 25px; display:flex; flex-direction:column; gap:15px; animation: modalFadeIn 0.3s ease-out;">

                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #f1f5f9; padding-bottom:12px;">

                        <h3 style="margin:0; font-size:1.15rem; font-weight:900; color:#1e293b; display:flex; align-items:center; gap:8px;">⚙️ تخصيص أعمدة التحليل</h3>

                        <button onclick="this.closest('.modal-overlay').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#94a3b8; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:50%; transition:0.2s;" onmouseover="this.style.background='#f1f5f9'; this.style.color='#ef4444';" onmouseout="this.style.background='none'; this.style.color='#94a3b8';">&times;</button>

                    </div>

                    ${html}

                    <button class="action-btn btn-save" style="width:100%; margin-top:10px; height:42px; background:linear-gradient(135deg, #4f46e5, #4338ca) !important; color:white !important; border:none !important; border-radius:10px !important; font-weight:900 !important; font-size:0.95rem !important; cursor:pointer; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2); transition: 0.2s;" onmouseover="this.style.transform='translateY(-1px)';" onmouseout="this.style.transform='none';" onclick="this.closest('.modal-overlay').remove()">حفظ وإغلاق</button>

                </div>

            `;

            document.body.appendChild(modal);

        }

        // دالة لفتح الفاتورة للصف المحدد في جدول تحليل المبيعات
        function viewSelectedAnalysisInvoice() {
            const checkedBox = document.querySelector('#analysisTableBody input.inv-row-check:checked');
            if (!checkedBox) {
                return showCustomAlert ? showCustomAlert({ type: 'warning', titleText: '⚠️ تنبيه', msg: 'يرجى اختيار وتحديد عملية من الجدول أولاً.' }) : alert('يرجى تحديد عملية أولاً.');
            }
            // السطر الأب للـ checkbox
            const row = checkedBox.closest('tr');
            if (!row) return;
            
            // قراءة رقم الفاتورة ونوع العملية من السطور المقابلة
            const invoiceIdCell = row.cells[1];
            const typeCell = row.cells[4];
            
            if (invoiceIdCell && typeCell) {
                const invoiceId = invoiceIdCell.innerText.trim();
                const type = typeCell.innerText.trim();
                if (invoiceId && invoiceId !== '-') {
                    viewInvoiceItems(invoiceId, type);
                } else {
                    if (showCustomAlert) showCustomAlert({ type: 'warning', titleText: '⚠️ تنبيه', msg: 'لا توجد فاتورة مرتبطة بهذه العملية.' });
                    else alert('لا توجد فاتورة مرتبطة بهذه العملية.');
                }
            }
        }
        window.viewSelectedAnalysisInvoice = viewSelectedAnalysisInvoice;

        function applyAnalysisPeriodFilter(period) {

            const fromInput = document.getElementById('anDateFrom');

            const toInput = document.getElementById('anDateTo');

            const today = new Date();

            const todayStr = today.toLocaleDateString('en-CA');

            if (period === 'custom') return;

            if (period === 'today') {

                fromInput.value = todayStr;

                toInput.value = todayStr;

            } else if (period === 'yesterday') {

                const yest = new Date();

                yest.setDate(yest.getDate() - 1);

                fromInput.value = yest.toLocaleDateString('en-CA');

                toInput.value = yest.toLocaleDateString('en-CA');

            } else if (period === 'thisweek') {

                const day = today.getDay();

                const start = new Date(today); start.setDate(today.getDate() - day);

                fromInput.value = start.toLocaleDateString('en-CA');

                toInput.value = todayStr;

            } else if (period === 'lastweek') {

                const start = new Date(today); start.setDate(today.getDate() - today.getDay() - 7);

                const end = new Date(today); end.setDate(today.getDate() - today.getDay() - 1);

                fromInput.value = start.toLocaleDateString('en-CA');

                toInput.value = end.toLocaleDateString('en-CA');

            } else if (period === 'thismonth') {

                const first = new Date(today.getFullYear(), today.getMonth(), 1);

                fromInput.value = first.toLocaleDateString('en-CA');

                toInput.value = todayStr;

            } else if (period === 'lastmonth') {

                const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);

                const last = new Date(today.getFullYear(), today.getMonth(), 0);

                fromInput.value = first.toLocaleDateString('en-CA');

                toInput.value = last.toLocaleDateString('en-CA');

            } else if (period === 'thisyear') {

                const first = new Date(today.getFullYear(), 0, 1);

                fromInput.value = first.toLocaleDateString('en-CA');

                toInput.value = todayStr;

            } else if (period === 'lastyear') {

                const first = new Date(today.getFullYear() - 1, 0, 1);

                const last = new Date(today.getFullYear() - 1, 11, 31);

                fromInput.value = first.toLocaleDateString('en-CA');

                toInput.value = last.toLocaleDateString('en-CA');

            } else if (period === 'all') {

                fromInput.value = '';

                toInput.value = '';

            }

            renderAnalysisTable();

        }

        function exportAnalysisToExcel() {

            const table = document.querySelector('#analysis-section .invoice-table');

            let csv = [];

            const rows = table.querySelectorAll("tr");

            for (let i = 0; i < rows.length; i++) {

                let row = [], cols = rows[i].querySelectorAll("td, th");

                for (let j = 0; j < cols.length; j++) row.push(cols[j].innerText);

                csv.push(row.join(","));

            }

            const blob = new Blob(["\uFEFF" + csv.join("\n")], { type: "text/csv;charset=utf-8;" });

            const link = document.createElement("a");

            link.href = URL.createObjectURL(blob);

            link.download = `sales_analysis_${currentAnalysisMode}.csv`;

            link.click();

        }

        function printAnalysisReport() {

            const content = document.querySelector('#analysis-section .table-container').innerHTML;

            const header = `

                <div style="text-align:center; margin-bottom:20px;">

                    <h2>تقرير تحليل المبيعات</h2>

                    <p>الفترة من: ${document.getElementById('anDateFrom').value} إلى: ${document.getElementById('anDateTo').value}</p>

                    <div style="display:flex; justify-content:center; gap:20px; font-weight:bold; margin-top:10px;">

                        <span>إجمالي المبيعات: ${document.getElementById('anTotalSales').innerText}</span>

                        <span>إجمالي تحليل المبيعات: ${document.getElementById('anTotalProfit').innerText}</span>

                    </div>

                </div>

            `;

            document.getElementById('receipt-area').innerHTML = `<div class="print-container">${header}${content}</div>`;

            window.print();

        }

        // --- تقرير العملاء الأكثر إرجاعاً ---

        // --- تقرير العملاء الأكثر إرجاعاً (معدل ليحترم الفلترة) ---

        function renderMostReturningCustomers() {

            const tbody = document.getElementById('analysisTableBody');

            if (!tbody) return;

            tbody.innerHTML = '';

            // 1. جلب الفلاتر الزمنية

            const fromDate = document.getElementById('anDateFrom').value;

            const toDate = document.getElementById('anDateTo').value;

            // 2. تصفية عمليات مرتجع البيع بناءً على الفترة

            let returns = transactions.filter(t => t.type.includes('مرتجع بيع'));

            if (fromDate) returns = returns.filter(t => t.dateISO >= fromDate);

            if (toDate) returns = returns.filter(t => t.dateISO <= toDate);

            if (returns.length === 0) {

                tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:30px; font-weight:bold; color:#64748b;">لا توجد عمليات إرجاع مسجلة في هذه الفترة 🔍</td></tr>';

                return;

            }

            // 3. تجميع حسب العميل (الطرف الثاني)

            const groups = {};

            returns.forEach(t => {

                const partner = t.partner || 'غير محدد';

                if (!groups[partner]) groups[partner] = { name: partner, count: 0, total: 0, products: new Set() };

                groups[partner].count++;

                groups[partner].total += Math.abs(parseFloat(t.total) || 0);

                groups[partner].products.add(t.product);

            });

            // 4. ترتيب تنازلي حسب القيمة الإجمالية للمرتجعات

            const sorted = Object.values(groups).sort((a, b) => b.total - a.total);

            sorted.forEach((g, idx) => {

                const productList = Array.from(g.products);

                const displayProducts = productList.length > 2 ? productList.slice(0, 2).join(' + ') + ` (+${productList.length - 2})` : productList.join(' + ');

                tbody.innerHTML += `

                    <tr style="background-color: #fef2f2; border-right: 4px solid #ef4444;">

                        <td style="text-align:center;"><input type="checkbox"></td>

                        <td style="font-weight:900;">${idx + 1}</td>

                        <td style="color:#64748b;">تقرير مجمع</td>

                        <td style="font-weight:bold; color:#1e293b;">${g.name}</td>

                        <td style="color:#ef4444; font-weight:bold;">🔄 ${displayProducts}</td>

                        <td style="text-align:center; font-weight:bold;">${g.count} فواتير</td>

                        <td>-</td>

                        <td style="font-weight:900; color:#ef4444;">${g.total.toFixed(2)}</td>

                        <td class="profit-col" style="color:#64748b;">-</td>

                        <td class="profit-col">-</td>

                        <td class="profit-col">-</td>

                    </tr>

                `;

            });

            showToast("📊 تم عرض تقرير المرتجعات للفترة المحددة");

        }

        // ================= منطق لوحة التحكم (Dashboard) =================

        function updateDashboard() {

            // تم نقل الإحصائيات إلى تقرير الحركة اليومية، اللوحة الرئيسية الآن للتنقل

        }

        // ================= منطق المخازن (Inventory Logic) =================

        let currentInvFilter = 'all';

        let selectedInventoryId = null;

        let currentEditingProductId = null;

        function filterInventory(type, btn) {

            currentInvFilter = type;

            document.querySelectorAll('.inv-filters .filter-btn').forEach(b => b.classList.remove('active'));

            btn.classList.add('active');

            renderInventoryTable();

        }

        // ================= رفع صورة الهوية للحساب =================

        window.previewAccImage = function(event) {

            const file = event.target.files[0];

            if (file) {

                const reader = new FileReader();

                reader.onload = function(e) {

                    const imgPreview = document.getElementById('accImagePreview');

                    imgPreview.src = e.target.result;

                    imgPreview.dataset.base64 = e.target.result;

                };

                reader.readAsDataURL(file);

            }

        };

        async function saveAccount(isNew) {

            // التحقق من صلاحية الاستخدام قبل الحفظ

            const editId = document.getElementById('editAccId').value;

            const isEdit = !!editId;

            if (isEdit && !checkPermission('accounts_edit')) return;

            if (!isEdit && !checkPermission('accounts_add')) return;

            if (!isEdit && !window.enforceSubscriptionCheck('other')) return false;

            const name = document.getElementById('accName').value;

            if (!name) return alert("يرجى إدخال اسم الحساب");

            const landValue = (document.getElementById('accLandline')?.value || '').trim();

            if (landValue && landValue.length !== 10) {

                return alert("⚠️ يجب أن يتكون رقم الخط الأرضي من 10 أرقام (مثال: 0212345678)");

            }

            const accountData = {

                id: editId ? parseInt(editId) : Date.now(),

                name: name,

                type: document.querySelector('input[name="accType"]:checked').value,

                image: document.getElementById('accImagePreview')?.dataset?.base64 || '',

                debit: document.getElementById('accDebit').value,

                credit: document.getElementById('accCredit').value,

                balanceDate: document.getElementById('accBalDate').value,

                mobile: document.getElementById('accMobile').value,

                landline: (document.getElementById('accLandline')?.value || '').trim(),

                email: document.getElementById('accEmail')?.value || '',

                address: document.getElementById('accAddress')?.value || '',

                code: document.getElementById('accCode')?.value || '',

                tax: document.getElementById('accTax')?.value || '',

                category: document.getElementById('accCategory')?.value || 'عام',

                discount: document.getElementById('accDiscount')?.value || 0,

                maxDebt: parseFloat((document.getElementById('accMaxAllowedDebtField')?.value || '0').replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])) || parseFloat(document.getElementById('accMaxAllowedDebtField')?.value || 0),

                priceLevel: document.getElementById('accPriceLevel')?.value || 'retail',

                remind: document.getElementById('accRemind')?.checked || false,

                inactive: document.getElementById('accInactive')?.checked || false,

                notes: document.getElementById('accNotes')?.value || ''

            };

            if (editId) {

                // وضع التعديل

                const targetId = Number(editId);

                const idx = accounts.findIndex(a => a.id == targetId);

                if (idx !== -1) {

                    accounts[idx] = accountData;

                } else {

                    // إذا لم نجد الحساب في المصفوفة لسبب ما، نبحث عنه بالاسم كبديل

                    const idxByName = accounts.findIndex(a => a.name === accountData.name);

                    if (idxByName !== -1) accounts[idxByName] = accountData;

                }

                await db.accounts.put(accountData); // حفظ مباشر وإلزامي في قاعدة البيانات

            } else {

                // وضع جديد

                accounts.unshift(accountData);

                await db.accounts.add(accountData); // إضافة مباشرة للداتا بيز

            }

            try {

                await saveData();

            } catch (err) {

                console.error("❌ فشل حفظ البيانات:", err);

                return alert("⚠️ حدث خطأ أثناء حفظ البيانات في قاعدة البيانات: " + err.message);

            }

            if (isNew) {

                // حفظ وإضافة آخر: تصفير كل الحقول بما فيها الحقل المختفي الخاص بالـ ID للتعديل

                document.getElementById('editAccId').value = '';

                document.querySelectorAll('#newAccountModal input:not([type=radio]):not([type=checkbox]):not([type=hidden]), #newAccountModal textarea').forEach(el => el.value = '');

                // تصفير الأرصدة الافتراضية للتأكد من عدم تكرارها

                if (document.getElementById('accDebit')) document.getElementById('accDebit').value = '0';

                if (document.getElementById('accCredit')) document.getElementById('accCredit').value = '0';

                document.getElementById('accBalDate').value = new Date().toLocaleDateString('en-CA');

                document.getElementById('accName').focus();

                // تصفير الصورة

                const imgPreview = document.getElementById('accImagePreview');

                if (imgPreview) {

                    imgPreview.src = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22avatarGrad%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%236366f1%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%233b82f6%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22url(%23avatarGrad)%22%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2240%22%20r%3D%2216%22%20fill%3D%22%23ffffff%22%2F%3E%3Cpath%20d%3D%22M25%2075c0-12%2012-16%2025-16s25%204%2025%2016v5H25v-5z%22%20fill%3D%22%23ffffff%22%2F%3E%3C%2Fsvg%3E';

                    delete imgPreview.dataset.base64;

                }

                const imgInput = document.getElementById('accImageInput');

                if (imgInput) imgInput.value = '';

                // تنبيه صغير وسريع

                const notification = document.createElement('div');

                notification.style.cssText = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:var(--main-green); color:white; padding:10px 30px; border-radius:30px; z-index:9000; box-shadow:0 5px 15px rgba(0,0,0,0.2);";

                notification.innerText = "✅ تم حفظ الحساب وبدء حساب جديد";

                document.body.appendChild(notification);

                setTimeout(() => notification.remove(), 2000);

            } else {

                showToast(`✅ تم حفظ تعديلات "${name}" (الحد: ${accountData.maxDebt})`, "success");

                closeNewAccountModal();

            }

            // تحديث الجدول إذا كان مفتوحاً

            if (!document.getElementById('accounts-section').classList.contains('hidden')) renderAccountsTable();

        }

        // ================= منطق جدول الحسابات العام (Accounts Table Logic) =================

        // --- تحسينات إدارة الحسابات (Accounts Enhancements) ---

        // تهيئة التخصيص لجدول الحسابات (إضافة عمود الكود)

        let accountsColumnVisibility = JSON.parse(localStorage.getItem('pos_acc_cols') || '{"0":true,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true,"7":true,"8":true,"9":true,"10":true}');

        let accountsColumnOrder = JSON.parse(localStorage.getItem('pos_acc_cols_order') || '[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]');

        function toggleAccountsColumn(index, isVisible) {

            accountsColumnVisibility[index] = isVisible;

            localStorage.setItem('pos_acc_cols', JSON.stringify(accountsColumnVisibility));

            renderAccountsTable();

        }

        function showAccountsColumnCustomizer() {

            const cols = [

                { id: 0, name: "م" },

                { id: 1, name: "كود الحساب" },

                { id: 2, name: "اسم الحساب" },

                { id: 3, name: "طبيعة الحساب" },

                { id: 4, name: "التصنيف" },

                { id: 5, name: "مدين (عليه)" },

                { id: 6, name: "دائن (له)" },

                { id: 7, name: "إجمالي البيع" },

                { id: 8, name: "آخر تاريخ قبض" },

                { id: 9, name: "آخر حركة" },

                { id: 10, name: "تحديد" }

            ];

            let html = `<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; padding:15px;">`;

            cols.forEach(c => {

                const checked = accountsColumnVisibility[c.id] ? 'checked' : '';

                html += `<label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:5px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; font-size:0.85rem;">

                            <input type="checkbox" ${checked} onchange="toggleAccountsColumn(${c.id}, this.checked)"> ${c.name}

                         </label>`;

            });

            html += `</div>`;

            const modal = document.createElement('div');

            modal.className = 'modal-overlay';

            modal.innerHTML = `

                <div class="login-box" style="width: 480px; text-align: right; padding: 25px; border: 2px solid var(--gold); background: #fff;">

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">

                        <h3 style="margin:0; color:#1e293b;">⚙️ تخصيص أعمدة الحسابات</h3>

                        <button onclick="this.closest('.modal-overlay').remove()" style="background:none; border:none; font-size:1.8rem; cursor:pointer; color:#94a3b8;">&times;</button>

                    </div>

                    ${html}

                    <button class="action-btn btn-save" style="width:100%; margin-top:15px; background:var(--main-blue); color:white;" onclick="this.closest('.modal-overlay').remove()">حفظ وإغلاق</button>

                </div>

            `;

            document.body.appendChild(modal);

        }

        function showInventoryColumnCustomizer() {

            const cols = [

                { id: 0, name: "تحديد" },

                { id: 1, name: "م" },

                { id: "quick", name: "صنف سريع ⭐" },

                { id: 2, name: "كود الصنف" },

                { id: "internal", name: "كود داخلي" },

                { id: 3, name: "اسم الصنف" },

                { id: 4, name: "الباركود" },

                { id: 5, name: "المكان / الرف" },

                { id: 6, name: "رصيد البداية" },

                { id: 7, name: "الوارد (+)" },

                { id: 8, name: "المنصرف (-)" },

                { id: 13, name: "بيع جملة" },

                { id: 10, name: "بيع قطاعي" },

                { id: "margin", name: "نسبة الربح %" },

                { id: 11, name: "آخر شراء" },

                { id: 12, name: "متوسط التكلفة" },

                { id: "detailed", name: "الوحدات" },

                { id: 9, name: "الرصيد النهائي" }

            ];

            let html = `<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; padding:15px;">`;

            cols.forEach(c => {

                const checked = inventoryColumnVisibility[c.id] !== false ? 'checked' : '';

                // تم وضع c.id بين علامات تنصيص مفردة لضمان عمل المعرفات النصية مثل 'margin'

                html += `<label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:5px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; font-size:0.85rem;">

                            <input type="checkbox" ${checked} onchange="toggleInventoryColumn('${c.id}', this.checked)"> ${c.name}

                         </label>`;

            });

            html += `</div>`;

            const modal = document.createElement('div');

            modal.className = 'modal-overlay';

            modal.innerHTML = `

                <div class="login-box" style="width: 480px; text-align: right; padding: 25px; border: 2px solid var(--gold); background: #fff;">

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">

                        <h3 style="margin:0; color:#1e293b;">⚙️ تخصيص أعمدة المخزن</h3>

                        <button onclick="this.closest('.modal-overlay').remove()" style="background:none; border:none; font-size:1.8rem; cursor:pointer; color:#94a3b8;">&times;</button>

                    </div>

                    ${html}

                    <button class="action-btn btn-save" style="width:100%; margin-top:15px; background:var(--main-blue); color:white;" onclick="this.closest('.modal-overlay').remove()">حفظ وإغلاق</button>

                </div>

            `;

            document.body.appendChild(modal);

        }

        // ================= تخصيص أعمدة كشف الحساب (Statement Columns) =================

        let statementColumnVisibility = JSON.parse(localStorage.getItem('pos_stmt_cols') || '{"0":false,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true}');

        function toggleStatementColumn(index, isVisible) {

            statementColumnVisibility[index] = isVisible;

            localStorage.setItem('pos_stmt_cols', JSON.stringify(statementColumnVisibility));

            generateAccountStatement(); // تحديث العرض فورياً

        }

        function showStatementColumnCustomizer() {

            const cols = [

                { id: 0, name: "تحديد" },

                { id: 1, name: "التاريخ" },

                { id: 2, name: "نوع الحركة" },

                { id: 3, name: "البيان" },

                { id: 4, name: "مدين (عليه)" },

                { id: 5, name: "دائن (له)" },

                { id: 6, name: "الرصيد" }

            ];

            let html = `<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; padding:15px;">`;

            cols.forEach(c => {

                const checked = statementColumnVisibility[c.id] ? 'checked' : '';

                html += `<label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; font-size:0.85rem;">

                            <input type="checkbox" ${checked} onchange="toggleStatementColumn(${c.id}, this.checked)"> ${c.name}

                         </label>`;

            });

            html += `</div>`;

            const modal = document.createElement('div');

            modal.className = 'modal-overlay';

            modal.style.zIndex = '10005';

            modal.innerHTML = `

                <div class="login-box" style="width: 400px; text-align: right; padding: 25px;">

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1.5px solid #3498db; padding-bottom:10px;">

                        <h3 style="margin:0; color:#2c3e50;">⚙️ تخصيص أعمدة كشف الحساب</h3>

                        <button onclick="this.closest('.modal-overlay').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#95a5a6;">&times;</button>

                    </div>

                    ${html}

                    <button class="action-btn btn-save" style="width:100%; margin-top:15px; background:#2c3e50; color:white;" onclick="this.closest('.modal-overlay').remove()">✅ حفظ وإغلاق</button>

                </div>

            `;

            document.body.appendChild(modal);

        }

        function moveAccountsColumn(index, direction) {

            const pos = accountsColumnOrder.indexOf(index);

            if (pos === -1) return;

            const newPos = pos + direction;

            if (newPos >= 0 && newPos < accountsColumnOrder.length) {

                const temp = accountsColumnOrder[pos];

                accountsColumnOrder[pos] = accountsColumnOrder[newPos];

                accountsColumnOrder[newPos] = temp;

                localStorage.setItem('pos_acc_cols_order', JSON.stringify(accountsColumnOrder));

                showAccountsColumnCustomizer(); // لإعادة رسم الواجهة بإبقاء المودال مفتوحاً

                renderAccountsTable();

            }

        }

        function showAccountsColumnCustomizer() {

            const allCols = [

                { id: 0, name: "م" },

                { id: 1, name: "كود الحساب" },

                { id: 2, name: "اسم الحساب" },

                { id: 3, name: "طبيعة الحساب" },

                { id: 4, name: "التصنيف" },

                { id: 5, name: "مدين (عليه)" },

                { id: 6, name: "دائن (له)" },

                { id: 7, name: "إجمالي البيع" },

                { id: 8, name: "آخر تاريخ قبض" },

                { id: 9, name: "آخر حركة" },

                { id: 10, name: "تحديد" }

            ];

            // ترتيب الأعمدة حسب الاختيار الحالي

            const orderedCols = accountsColumnOrder.map(id => allCols.find(c => c.id === id));

            let html = `<div style="display:flex; flex-direction:column; gap:8px; padding:15px; max-height:400px; overflow-y:auto;">`;

            orderedCols.forEach((c, idx) => {

                const checked = accountsColumnVisibility[c.id] ? 'checked' : '';

                html += `<div style="display:flex; align-items:center; gap:8px; background:var(--bg-color); padding:8px; border-radius:8px; border:1.5px solid var(--border-color); transition:0.3s; animation: slideIn 0.3s forwards;">

                            <div style="display:flex; flex-direction:column; gap:2px;">

                                <button onclick="moveAccountsColumn(${c.id}, -1)" style="background:none; border:none; cursor:pointer; font-size:0.7rem; padding:0; ${(idx===0)?'opacity:0.3;pointer-events:none;':''}">🔼</button>

                                <button onclick="moveAccountsColumn(${c.id}, 1)" style="background:none; border:none; cursor:pointer; font-size:0.7rem; padding:0; ${(idx===orderedCols.length-1)?'opacity:0.3;pointer-events:none;':''}">🔽</button>

                            </div>

                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; flex:1;">

                                <input type="checkbox" ${checked} onchange="toggleAccountsColumn(${c.id}, this.checked)"> ${c.name}

                            </label>

                            <span style="opacity:0.3; font-size:0.7rem;">#${c.id}</span>

                         </div>`;

            });

            html += `</div>`;

            // إزالة المودال القديم إذا وجد (لتحديث الترتيب)

            const oldModal = document.querySelector('.accounts-cols-customizer');

            if (oldModal) oldModal.remove();

            const modal = document.createElement('div');

            modal.className = 'modal-overlay accounts-cols-customizer';

            modal.style.zIndex = '10006';

            modal.innerHTML = `

                <div class="login-box" style="width: 450px; text-align: right; padding: 25px; background:white; border:2px solid var(--gold); box-shadow:0 20px 50px rgba(0,0,0,0.3);">

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid var(--gold); padding-bottom:12px;">

                        <h3 style="margin:0; font-weight:900;">📤 ترتيب وتخصيص الأعمدة (إدارة الحسابات)</h3>

                        <button onclick="this.closest('.modal-overlay').remove()" style="background:none; border:none; font-size:1.8rem; cursor:pointer; color:#95a5a6; line-height:1;">&times;</button>

                    </div>

                    ${html}

                    <button class="action-btn btn-save" style="width:100%; margin-top:15px; height:50px; background:linear-gradient(135deg, var(--accent-gold), var(--gold)); color:white; font-weight:900;" onclick="this.closest('.modal-overlay').remove()">✅ حفظ الترتيب الجديد</button>

                </div>

            `;

            document.body.appendChild(modal);

        }

        function renderAccountsTable() {

            const tbody = document.getElementById('accountsTableBody');

            if (!tbody) return;

            tbody.innerHTML = '';

            // --- ⚙️ منطق إعادة ترتيب الأعمدة برمجياً ---

            const thead = document.querySelector('#accountsTableHead tr') || 

                          document.querySelector('.accounts-table-wrapper thead tr') ||

                          document.querySelector('[id$="-section"] .invoice-table thead tr');

            const tfoot = document.querySelector('#accountsTableFoot tr');

            // 1. إعادة ترتيب رؤوس الجدول (Thead)

            const thMap = {

                0: `<th class="col-acc-0">م</th>`,

                1: `<th class="col-acc-code">كود الحساب</th>`,

                2: `<th class="col-acc-1">اسم الحساب</th>`,

                3: `<th class="col-acc-2">طبيعة الحساب</th>`,

                4: `<th class="col-acc-3">التصنيف</th>`,

                5: `<th class="col-acc-4">مدين (عليه)</th>`,

                6: `<th class="col-acc-5">دائن (له)</th>`,

                7: `<th class="col-acc-6">إجمالي البيع</th>`,

                8: `<th class="col-acc-7">آخر تاريخ قبض</th>`,

                9: `<th class="col-acc-8">آخر حركة</th>`,

                10: `<th class="col-acc-9">تحديد</th>`

            };

            let thOrderHtml = '';

            accountsColumnOrder.forEach(idx => {

                const isVisible = accountsColumnVisibility[idx];

                const th = thMap[idx];

                const style = isVisible ? '' : 'style="display:none;"';

                thOrderHtml += th.replace('<th ', `<th ${style} `);

            });

            if (thead) thead.innerHTML = thOrderHtml;

            // 2. إعادة ترتيب تذييل الجدول (Tfoot)

            const tfMap = {

                0: `<td></td>`,

                1: `<td></td>`,

                2: `<td style="text-align:left; font-weight:900;">إجمالي الأرصدة:</td>`,

                3: `<td></td>`,

                4: `<td></td>`,

                5: `<td><span id="totalGlobalDebit" class="color-danger" style="font-weight:900; font-size:1.1rem;">0.00</span></td>`,

                6: `<td><span id="totalGlobalCredit" class="color-success" style="font-weight:900; font-size:1.1rem;">0.00</span></td>`,

                7: `<td></td>`,

                8: `<td></td>`,

                9: `<td></td>`,

                10: `<td></td>`

            };

            let tfOrderHtml = '<tr>';

            accountsColumnOrder.forEach(idx => {

                const isVisible = accountsColumnVisibility[idx];

                const tf = tfMap[idx];

                const style = isVisible ? '' : 'style="display:none;"';

                tfOrderHtml += tf.replace('<td ', `<td ${style} `);

            });

            tfOrderHtml += '</tr>';

            if (tfoot) tfoot.innerHTML = tfOrderHtml;

            const search = document.getElementById('accSearchName').value.toLowerCase();

            const typeFilter = document.getElementById('accFilterType').value;

            const catFilter = document.getElementById('accFilterCat').value;

            let globalTotalDebit = 0;

            let globalTotalCredit = 0;

            const filtered = accounts.filter(acc => {

                const matchName = acc.name.toLowerCase().includes(search);

                const matchCode = (acc.code || '').toString().toLowerCase().includes(search);

                const matchType = typeFilter === 'all' || acc.type === typeFilter || (acc.type === 'mixed' && (typeFilter === 'client' || typeFilter === 'supplier'));

                const matchCat = catFilter === 'all' || acc.category === catFilter;

                return (matchName || matchCode) && matchType && matchCat;

            });

            filtered.forEach((acc, idx) => {

                let initialDebit = parseFloat(acc.debit) || 0;

                let initialCredit = parseFloat(acc.credit) || 0;

                let currentBalance = initialDebit - initialCredit;

                let lastTransDate = acc.balanceDate || '-';

                let totalSales = 0;

                let lastReceiptDate = '-';

                const accTrans = transactions.filter(t => t.partner === acc.name);

                accTrans.forEach(t => {

                    let val = 0;

                    if (t.type.includes('بيع') && !t.type.includes('مرتجع')) {

                        val = parseFloat(t.total) || 0;

                        totalSales += val;

                        // خصم المبلغ المدفوع (سواء نقدي بالكامل أو جزء من الآجل) لتحديد صافي المديونية

                        if (t.isInvoiceHead) {

                            val -= (parseFloat(t.paidAmount) || 0);

                        }

                    }

                    else if (t.type.includes('شراء') && !t.type.includes('مرتجع')) {

                        val = -(parseFloat(t.total) || 0);

                        // إضافة المبلغ المدفوع للمورد لتقليل حجم الدائنية

                        if (t.isInvoiceHead) {

                            val += (parseFloat(t.paidAmount) || 0);

                        }

                    }

                    else if (t.type.includes('قبض')) {

                        val = -(parseFloat(t.price) || 0);

                        if (lastReceiptDate === '-' || t.dateISO > lastReceiptDate) lastReceiptDate = t.dateISO;

                    }

                    else if (t.type.includes('صرف')) {

                        val = parseFloat(t.price) || 0;

                    }

                    else if (t.type.includes('مرتجع بيع')) {

                        val = -(parseFloat(t.total) || 0);

                        totalSales += val; // المرتجع ينقص إجمالي البيع

                        // إذا كان المرتجع نقدي وتم دفع المال للعميل، لا يؤثر على الرصيد

                        if (t.method && (t.method.includes('نقدية') || t.method.includes('كاش'))) {

                            val = 0;

                        }

                    }

                    else if (t.type.includes('مرتجع شراء')) {

                        val = parseFloat(t.total) || 0;

                        // إذا كان المرتجع نقدي وتم استلام المال، لا يؤثر على الرصيد

                        if (t.method && (t.method.includes('نقدية') || t.method.includes('كاش'))) {

                            val = 0;

                        }

                    }

                    currentBalance += val;

                    if (t.dateISO > lastTransDate || lastTransDate === '-') lastTransDate = t.dateISO;

                });

                // --- منطق فلترة الأرصدة (Zero Balance Logic) ---

                const balanceFilter = document.getElementById('accFilterBalance') ? document.getElementById('accFilterBalance').value : 'all';

                const isZero = Math.abs(currentBalance) < 0.01;

                if (balanceFilter === 'nonzero' && isZero) return;

                if (balanceFilter === 'zero' && !isZero) return;

                if (balanceFilter === 'debit' && currentBalance <= 0) return;

                if (balanceFilter === 'credit' && currentBalance >= 0) return;

                let displayDebit = currentBalance > 0 ? currentBalance : 0;

                let displayCredit = currentBalance < 0 ? Math.abs(currentBalance) : 0;

                globalTotalDebit += displayDebit;

                globalTotalCredit += displayCredit;

                const typeLabels = { client: 'عميل', supplier: 'مورد', delegate: 'مندوب', mixed: 'عميل ومورد', other: 'أخرى' };

                const isSelected = selectedAccountID === acc.id ? 'background-color: rgba(201, 168, 76, 0.15);' : '';

                const row = document.createElement('tr');

                row.style.cursor = 'pointer';

                if (isSelected) row.style.cssText += isSelected;

                row.onclick = () => selectAccountRow(acc.id);

                const thMapData = {

                    0: idx + 1,

                    1: `<span style="color:var(--text-secondary); font-family:monospace;">${acc.code || '-'}</span>`,

                    2: `<span style="font-weight:bold;">${acc.name}</span>`,

                    3: `<span class="stock-badge">${typeLabels[acc.type] || acc.type}</span>`,

                    4: acc.category || '-',

                    5: `<span class="color-danger" style="font-weight:bold;">${displayDebit > 0 ? displayDebit.toFixed(2) : '-'}</span>`,

                    6: `<span class="color-success" style="font-weight:bold;">${displayCredit > 0 ? displayCredit.toFixed(2) : '-'}</span>`,

                    7: `<span style="color:var(--text-primary);">${totalSales.toFixed(2)}</span>`,

                    8: lastReceiptDate,

                    9: lastTransDate,

                    10: `<input type="radio" name="accSelect" ${selectedAccountID === acc.id ? 'checked' : ''}>`

                };

                accountsColumnOrder.forEach(colIdx => {

                    const data = thMapData[colIdx];

                    const isVisible = accountsColumnVisibility[colIdx];

                    const td = document.createElement('td');

                    td.innerHTML = data;

                    if (!isVisible) td.style.display = 'none';

                    row.appendChild(td);

                });

                tbody.appendChild(row);

            });

            // تحديث إجمالي المديونيات في الأسفل

            const totalDebitEl = document.getElementById('totalGlobalDebit');

            const totalCreditEl = document.getElementById('totalGlobalCredit');

            if (totalDebitEl) totalDebitEl.innerText = globalTotalDebit.toFixed(2);

            if (totalCreditEl) totalCreditEl.innerText = globalTotalCredit.toFixed(2);

        }

        function selectAccountRow(id) {

            selectedAccountID = id;

            renderAccountsTable(); // إعادة رسم لتحديث التحديد البصري

        }

        async function editSelectedAccount() {

            if (!checkPermission('accounts_edit')) return;

            if (!selectedAccountID) return alert("⚠️ يرجى اختيار حساب من الجدول أولاً!");

            // جلب البيانات مباشرة من قاعدة البيانات لضمان الحصول على أحدث القيم المسجلة

            const acc = await db.accounts.get(selectedAccountID);

            if (!acc) return;

            // فتح المودال وتعبئة البيانات

            document.getElementById('newAccountModal').classList.remove('hidden');

            document.getElementById('editAccId').value = acc.id;

            document.getElementById('accName').value = acc.name;

            // تحميل صورة الهوية إن وجدت

            const imgPreview = document.getElementById('accImagePreview');

            if (imgPreview) {

                if (acc.image) {

                    imgPreview.src = acc.image;

                    imgPreview.dataset.base64 = acc.image;

                } else {

                    imgPreview.src = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22avatarGrad%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%236366f1%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%233b82f6%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22url(%23avatarGrad)%22%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2240%22%20r%3D%2216%22%20fill%3D%22%23ffffff%22%2F%3E%3Cpath%20d%3D%22M25%2075c0-12%2012-16%2025-16s25%204%2025%2016v5H25v-5z%22%20fill%3D%22%23ffffff%22%2F%3E%3C%2Fsvg%3E';

                    delete imgPreview.dataset.base64;

                }

            }

            const imgInput = document.getElementById('accImageInput');

            if (imgInput) imgInput.value = '';

            // اختيار نوع الحساب (Radio)

            const typeRadio = document.querySelector(`input[name="accType"][value="${acc.type}"]`);

            if (typeRadio) typeRadio.checked = true;

            document.getElementById('accDebit').value = acc.debit || 0;

            document.getElementById('accCredit').value = acc.credit || 0;

            document.getElementById('accBalDate').value = acc.balanceDate || '';

            document.getElementById('accMobile').value = acc.mobile || '';

            if (document.getElementById('accLandline')) document.getElementById('accLandline').value = acc.landline || '';

            if (document.getElementById('accEmail')) document.getElementById('accEmail').value = acc.email || '';

            if (document.getElementById('accAddress')) document.getElementById('accAddress').value = acc.address || '';

            if (document.getElementById('accCode')) document.getElementById('accCode').value = acc.code || '';

            if (document.getElementById('accTax')) document.getElementById('accTax').value = acc.tax || '';

            if (document.getElementById('accCategory')) document.getElementById('accCategory').value = acc.category || 'عام';

            if (document.getElementById('accDiscount')) document.getElementById('accDiscount').value = acc.discount || 0;

            const debtField = document.getElementById('accMaxAllowedDebtField');

            if (debtField) {

                const val = (acc.maxDebt !== undefined && acc.maxDebt !== null) ? acc.maxDebt : 0;

                showToast(`جاري تحميل حد المديونية: ${val}`, "info");

                // تعيين فوري

                debtField.value = val;

                // تعيين احتياطي بعد تأخير بسيط

                setTimeout(() => {

                    debtField.value = val;

                    debtField.defaultValue = val;

                }, 100);

                console.log(`✅ Multi-stage Load maxDebt for ${acc.name}:`, val);

            }

            if (document.getElementById('accPriceLevel')) document.getElementById('accPriceLevel').value = acc.priceLevel || 'retail';

            if (document.getElementById('accRemind')) document.getElementById('accRemind').checked = acc.remind || false;

            if (document.getElementById('accInactive')) document.getElementById('accInactive').checked = acc.inactive || false;

            if (document.getElementById('accNotes')) document.getElementById('accNotes').value = acc.notes || '';

            document.getElementById('accName').focus();

        }

        async function deleteSelectedAccount() {

            if (!selectedAccountID) return alert("⚠️ يرجى اختيار حساب من الجدول أولاً!");

            const acc = accounts.find(a => a.id === selectedAccountID);

            if (!acc) return;

            if (confirm(`🚨 هل أنت متأكد من حذف الحساب "${acc.name}" ونقله لسلة المحذوفات؟`)) {

                // التحقق مما إذا كان الحساب له حركات مسجلة

                const hasTrans = transactions.some(t => t.partner === acc.name);

                if (hasTrans) {

                    if (!confirm("⚠️ هذا الحساب له حركات (فواتير/سندات) مسجلة. حذفه قد يؤدي لتضارب في التقارير. هل تريد الاستمرار؟")) return;

                }

                // نقل للسلة

                await trashManager.moveToTrash(acc, 'account', acc.name);

                accounts = accounts.filter(a => a.id !== selectedAccountID);

                await db.accounts.delete(selectedAccountID);

                await saveData();

                selectedAccountID = null;

                renderAccountsTable();

                showToast("✅ تم نقل الحساب إلى سلة المحذوفات");

            }

        }

        function printStatement() {

            const shopName = document.getElementById('shopName')?.value || 'Bayan POS';

            const shopPhone = document.getElementById('shopPhone')?.value || '';

            const logoSrc = document.getElementById('logoPreview')?.src || '';

            const logoHTML = logoSrc && !logoSrc.includes('undefined') ? `<img src="${logoSrc}" style="max-height: 70px; max-width: 120px;">` : `<div style="width:100px; height:60px; background:#f0f0f0; border:1px dashed #ccc; display:flex; align-items:center; justify-content:center; color:#999; font-size:12px;">Logo</div>`;

            const headerInfo = document.getElementById('statementHeaderInfo');

            if (!headerInfo) return;

            const accName = headerInfo.querySelector('h3') ? headerInfo.querySelector('h3').innerText.replace('👤 كشف حساب:', '').trim() : 'كشف حساب';

            const balanceText = headerInfo.innerText.split('الرصيد الحالي:')[1] || '---';

            const tableElement = document.querySelector('#statementModal .invoice-table').cloneNode(true);

            tableElement.querySelectorAll('tr').forEach(row => {

                row.querySelectorAll('th, td').forEach(col => {

                    if (col.style.display === 'none') col.remove();

                });

            });

            const fromDate = document.getElementById('stmtDateFrom').value || '---';

            const toDate = document.getElementById('stmtDateTo').value || '---';

            // إنشاء Iframe مخفي للطباعة

            let iframe = document.getElementById('print-iframe');

            if (!iframe) {

                iframe = document.createElement('iframe');

                iframe.id = 'print-iframe';

                iframe.style.cssText = 'position:fixed;right:100%;bottom:100%;width:0;height:0;border:none;';

                document.body.appendChild(iframe);

            }

            const doc = iframe.contentWindow.document;

            doc.open();

            doc.write(`

                <html dir="rtl">

                <head>

                    <title>كشف حساب - ${accName}</title>

                    <style>

                        @page { size: A4 landscape; margin: 10mm; }

                        * { box-sizing: border-box; }

                        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #fff; color: #000; padding: 0; margin: 0; width: 100%; max-width: 100%; }

                        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }

                        .shop-info { text-align: right; flex: 1; }

                        .shop-info h2 { font-size: 1.4rem; font-weight: 900; margin: 0 0 5px 0; }

                        .shop-info p { font-size: 0.9rem; color: #333; margin: 3px 0; font-weight: bold; }

                        .title-container { text-align: center; flex: 1; }

                        .title-box { display: inline-block; background: #000; color: #fff; padding: 8px 25px; border-radius: 5px; font-size: 1.2rem; font-weight: bold; }

                        .logo-container { text-align: left; flex: 1; }

                        .info-grid { display: flex; justify-content: space-between; margin-bottom: 15px; width: 100%; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }

                        .info-box { flex: 1; padding: 12px; }

                        .info-box.left { background: #fdfdfd; border-left: 1px solid #ddd; }

                        .info-box.right { background: #f8fcf8; text-align: left; }

                        .info-label { font-size: 0.85rem; color: #555; margin-bottom: 5px; font-weight: bold; }

                        .info-val { font-size: 1.3rem; font-weight: 900; color: #000; }

                        .info-val.red { color: #c0392b; }

                        .date-period { margin-bottom: 15px; font-size: 0.9rem; background: #eee; padding: 5px 15px; border-radius: 5px; display: inline-block; font-weight: bold; }

                        table { width: 100%; max-width: 100%; border-collapse: collapse; margin-bottom: 40px; table-layout: auto; font-size: 0.85rem; page-break-inside: auto; }

                        tr { page-break-inside: avoid; page-break-after: auto; }

                        thead { display: table-header-group; }

                        tfoot { display: table-footer-group; }

                        th { background: #e0e0e0; color: #000; padding: 8px 4px; border: 1px solid #777; font-weight: bold; text-align: right; }

                        td { padding: 6px 4px; border: 1px solid #999; text-align: right; word-wrap: break-word; }

                        tbody tr:nth-child(even) { background: #f5f5f5; }

                        .signatures { margin-top: 50px; display: flex; justify-content: space-between; padding: 0 50px; page-break-inside: avoid; }

                        .sig-box { text-align: center; }

                        .sig-title { font-weight: bold; margin-bottom: 50px; text-decoration: underline; font-size: 0.9rem; }

                        .sig-line { color: #ccc; font-size: 10px; }

                    </style>

                </head>

                <body>

                    <div class="header">

                        <div class="shop-info">

                            <h2>${shopName}</h2>

                            <p>📞 هاتف: ${shopPhone}</p>

                            <p>📅 التاريخ: ${new Date().toLocaleString('ar-EG')}</p>

                        </div>

                        <div class="title-container">

                            <div class="title-box">كشف حساب تفصيلي</div>

                        </div>

                        <div class="logo-container">

                            ${logoHTML}

                        </div>

                    </div>

                    <div class="info-grid">

                        <div class="info-box left">

                            <div class="info-label">👤 العميل:</div>

                            <div class="info-val">${accName}</div>

                        </div>

                        <div class="info-box right">

                            <div class="info-label">💰 الرصيد الحالي:</div>

                            <div class="info-val red">${balanceText.trim()}</div>

                        </div>

                    </div>

                    <div class="date-period">

                        📅 الفترة: من ${fromDate} إلى ${toDate}

                    </div>

                    <table>

                        <thead>${tableElement.querySelector('thead').innerHTML}</thead>

                        <tbody>${tableElement.querySelector('tbody').innerHTML}</tbody>

                    </table>

                    <div class="signatures">

                        <div class="sig-box">

                            <div class="sig-title">توقيع العميل</div>

                            <div class="sig-line">............................</div>

                        </div>

                        <div class="sig-box">

                            <div class="sig-title">ختم المؤسسة</div>

                            <div class="sig-line">............................</div>

                        </div>

                    </div>

                </body>

                </html>

            `);

            doc.close();

            setTimeout(() => {

                iframe.contentWindow.focus();

                iframe.contentWindow.print();

            }, 600);

        }

        // تم دمج دالة تعديل الحساب مع الدالة الأساسية في الأعلى لمنع التكرار وحل مشكلة اختفاء الحقول (الكود، الحد الأقصى للمديونية، ومستوى السعر)

            // ================= منطق تحويل المخزون المجمّع (Enhanced Batch Transfer) =================

        let transferItemsBatch = [];

        let selectedTransferProductId = null;

        let transferSearchSelectedIndex = -1;

        window.openTransferModal = function(isEdit = false) {

            if (!isEdit) transferItemsBatch = [];

            const tbody = document.getElementById('transferTableBody');

            if (tbody) tbody.innerHTML = '';

            // تهيئة التاريخ والوقت تلقائياً
            if (!isEdit) {
                if (document.getElementById('transferDate')) {
                    document.getElementById('transferDate').value = new Date().toLocaleDateString('en-CA');
                }
                if (document.getElementById('transferTime')) {
                    document.getElementById('transferTime').value = new Date().toTimeString().slice(0, 5);
                }
                if (document.getElementById('transferNotes')) {
                    document.getElementById('transferNotes').value = '';
                }
            } else {
                if (document.getElementById('transferDate') && editingOriginalDate && editingOriginalDate.iso) {
                    document.getElementById('transferDate').value = editingOriginalDate.iso;
                }
                if (document.getElementById('transferTime') && editingOriginalDate && editingOriginalDate.time) {
                    document.getElementById('transferTime').value = editingOriginalDate.time;
                }
            }

            // حساب إجمالي المخزون في كل الفروع

            const totalStock = productsDB.reduce((acc, p) => acc + (parseFloat(p.stock) || 0), 0);

            const totalValue = productsDB.reduce((acc, p) => acc + ((parseFloat(p.stock) || 0) * (parseFloat(p.cost) || 0)), 0);

            const stockCountElem = document.getElementById('allWhStockCount');

            const stockValueElem = document.getElementById('allWhStockValue');

            if (stockCountElem) stockCountElem.innerText = `${totalStock.toLocaleString()} قطعة`;

            if (stockValueElem) stockValueElem.innerText = `${totalValue.toLocaleString()} ج.م`;

            document.getElementById('transferModal').classList.remove('hidden');

            // 1. جمع الأصناف المختارة بعلامة الصح ✅

            const checkedBoxes = document.querySelectorAll('.inv-row-check:checked');

            checkedBoxes.forEach(chk => {

                const tr = chk.closest('tr');

                const pId = tr.getAttribute('data-id');

                const product = productsDB.find(p => p.id == pId);

                if (product && !transferItemsBatch.some(item => item.id == product.id)) {

                    transferItemsBatch.push({ 

                        id: product.id, 

                        name: product.name, 

                        stock: product.stock, 

                        qty: 1,

                        price: parseFloat(product.cost) || 0 // القيمة الافتراضية هي التكلفة

                    });

                }

            });

            // 2. إذا لم يكن هناك "صح" نأخذ الصنف "المظلل بالذهبي" حالياً

            if (transferItemsBatch.length === 0 && selectedInventoryId) {

                const product = productsDB.find(p => p.id == selectedInventoryId);

                if (product) {

                    transferItemsBatch.push({ 

                        id: product.id, 

                        name: product.name, 

                        stock: product.stock, 

                        qty: 1,

                        price: parseFloat(product.cost) || 0

                    });

                }

            }

            // 3. تصفير مربع البحث عند الفتح

            const pSearch = document.getElementById('transferProductSearch');

            if (pSearch) pSearch.value = '';

            document.getElementById('transferSearchResults').innerHTML = '';

            document.getElementById('transferSearchResults').classList.add('hidden');

            selectedTransferProductId = null;

            // 4. تعبئة قائمة المخازن

            const wFrom = document.getElementById('transferFrom');

            if (wFrom) {

                wFrom.innerHTML = '';

                warehouses.forEach(w => {

                    wFrom.innerHTML += `<option value="${w.name}">${w.name}</option>`;

                });

                updateTransferToList();

            }

            renderTransferTable();

            // تطبيق تخصيص الأعمدة فور الفتح

            applyTransferColVisibility();

            document.getElementById('transferModal').classList.remove('hidden');

            // تركيز تلقائي على أول خانة كمية لسرعة الإنجاز

            setTimeout(() => {

                const firstQty = document.querySelector('#transferBatchTableBody input');

                if (firstQty) firstQty.focus();

            }, 300);

        }

        window.closeTransferModal = function() {

            document.getElementById('transferModal').classList.add('hidden');

            // إعادة ضبط وضع التعديل إذا كان نشطاً

            isEditMode = false;

            editingInvoiceId = null;

            editingOriginalDate = null;

            editingInvoiceType = null;

            transferItemsBatch = [];

        }

        let currentTransferHeaderUnit = null;

        window.fillTransferHeaderWithUnit = function(product, unit) {

            selectedTransferProductId = product.id;

            currentTransferHeaderUnit = unit;

            document.getElementById('transferProductSearch').value = product.name;

            // تحديث مربع الإجمالي ليظهر مجموع المخزنين المختارين حالياً للصنف

            const wFrom = document.getElementById('transferFrom').value;

            const wTo = document.getElementById('transferTo').value;

            if (typeof getWarehouseStock === 'function') {

                const s1 = getWarehouseStock(product.name, wFrom);

                const s2 = getWarehouseStock(product.name, wTo);

                const total = s1 + s2;

                const stockElem = document.getElementById('allWhStockCount');

                if (stockElem) stockElem.innerText = `${total.toFixed(2)} ${unit.unitName}`;

            }

            const priceInput = document.getElementById('transferPrice');

            if (priceInput) {

                priceInput.value = (parseFloat(unit.cost) || parseFloat(product.cost) || 0).toFixed(2);

            }

            document.getElementById('transferQty').focus();

            document.getElementById('transferQty').select();

        }

        window.showCombinedStock = function() {

            if (!selectedTransferProductId) {

                return showToast("🔍 يرجى البحث عن صنف أولاً لعرض أرصدته في المخازن", "info");

            }

            const p = productsDB.find(x => x.id == selectedTransferProductId);

            if (!p) return;

            const unitName = currentTransferHeaderUnit ? currentTransferHeaderUnit.unitName : (p.unit || 'قطعة');

            const factor = currentTransferHeaderUnit ? parseFloat(currentTransferHeaderUnit.factor) : 1;

            if (typeof getWarehouseStock === 'function') {

                let whRows = '';

                let grandTotal = 0;

                warehouses.forEach(wh => {

                    const stock = getWarehouseStock(p.name, wh.name) / factor;

                    grandTotal += stock;

                    whRows += `

                        <div style="display:flex; justify-content:space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-family: 'Segoe UI', Tahoma, sans-serif;">

                            <span style="font-weight:700; color:#475569;">🏢 ${wh.name}:</span>

                            <span style="color:#4f46e5; font-weight:900; background: #eef2ff; padding: 2px 10px; border-radius: 8px;">${stock.toFixed(2)} ${unitName}</span>

                        </div>

                    `;

                });

                showCustomAlert({

                    type: 'info',

                    titleText: `📊 تفاصيل الأرصدة: ${p.name}`,

                    msg: `

                        <div style="text-align:right; max-height: 350px; overflow-y: auto; padding-right: 5px;">

                            ${whRows}

                            <div style="display:flex; justify-content:space-between; padding: 15px; margin-top: 15px; border: 2px solid #e0e7ff; background: #f8fafc; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

                                <span style="font-weight:900; color:#1e1b4b;">🌍 الإجمالي في كل المخازن:</span>

                                <span style="color:#4338ca; font-weight:900; font-size:1.2rem;">${grandTotal.toFixed(2)} ${unitName}</span>

                            </div>

                        </div>

                    `,

                    confirmText: 'فهمت ✅'

                });

            }

        }

        window.renderTransferTable = function() {

            const tbody = document.getElementById('transferTableBody');

            const emptyState = document.getElementById('transferEmptyState');

            if (!tbody) return;

            tbody.innerHTML = '';

            let totalVal = 0;

            let itemsCount = transferItemsBatch.length;

            if (itemsCount === 0) {

                if (emptyState) emptyState.style.display = 'block';

            } else {

                if (emptyState) emptyState.style.display = 'none';

            }

            transferItemsBatch.forEach((item, index) => {

                const itemTotal = (item.qty * item.price);

                totalVal += itemTotal;

                const tr = document.createElement('tr');

                tr.style.borderBottom = '1px solid #e2e8f0';

                tr.innerHTML = `

                    <td class="col-tr-name" style="padding: 12px 15px; font-size: 0.95rem; font-weight: bold; color: #1e293b; border-left: 1px solid #e2e8f0; text-align: right;">

                        ${item.name} 

                        <span style="font-size:0.75rem; color:#64748b; font-weight:normal;">(${item.unitName || '---'})</span>

                    </td>

                    <td class="col-tr-stock" style="padding: 12px; text-align: center; color: #64748b; font-size: 0.9rem; font-weight: bold; border-left: 1px solid #e2e8f0;">${item.stock}</td>

                    <td class="col-tr-qty" style="padding: 12px; border-left: 1px solid #e2e8f0;">

                        <input type="number" value="${item.qty}" class="search-input" 

                            style="height: 38px; border-radius: 8px; text-align: center; font-weight: 900; border: 2px solid #e2e8f0; width: 100%;"

                            oninput="window.updateTransferItem(${index}, 'qty', this.value)">

                    </td>

                    <td class="col-tr-price" style="padding: 12px; border-left: 1px solid #e2e8f0;">

                        <input type="number" value="${item.price}" class="search-input" 

                            style="height: 38px; border-radius: 8px; text-align: center; color: var(--main-blue); font-weight: 900; border: 2px solid #e2e8f0; width: 100%;"

                            oninput="window.updateTransferItem(${index}, 'price', this.value)">

                    </td>

                    <td class="col-tr-total" style="padding: 12px; text-align: center; font-weight: 900; color: #1a4d2e; font-size: 1rem; background: rgba(26, 77, 46, 0.03); border-left: 1px solid #e2e8f0;">

                        ${itemTotal.toFixed(2)}

                    </td>

                    <td class="col-tr-delete" style="padding: 12px; text-align: center;">

                        <button onclick="window.removeTransferItem(${index})" style="background: #fee2e2; border: none; color: #ef4444; width: 35px; height: 35px; border-radius: 10px; cursor: pointer; font-size: 1rem; transition: 0.3s; display: flex; align-items: center; justify-content: center; margin: 0 auto;">🗑️</button>

                    </td>

                `;

                tbody.appendChild(tr);

            });

            // تحديث الإجماليات في الفوتر

            const totalValElem = document.getElementById('transferTotalValue');

            const itemsCountElem = document.getElementById('transferItemsCount');

            if (totalValElem) totalValElem.innerText = totalVal.toFixed(2) + ' ج.م';

            if (itemsCountElem) itemsCountElem.innerText = itemsCount;

            // إعادة تطبيق حالة الأعمدة المخصصة

            applyTransferColVisibility();

        }

        function printTransferNote() {

            if (transferItemsBatch.length === 0) return showToast("⚠️ القائمة فارغة!", "warning");

            const wFrom = document.getElementById('transferFrom').value;

            const wTo = document.getElementById('transferTo').value;

            const shopName    = document.getElementById('shopName')?.value || 'بـيـان POS';
            const shopAddress = document.getElementById('shopAddress')?.value || '';
            const shopPhone   = document.getElementById('shopPhone1')?.value || '';
            const footerMsg   = document.getElementById('printFooterMsg')?.value || 'شكراً لزيارتكم!';

            let itemsHtml = transferItemsBatch.map((item, idx) => `

                <tr>

                    <td>${idx + 1}</td>

                    <td style="text-align:right;">${item.name}</td>

                    <td>${item.qty} ${item.unitName || ''}</td>

                    <td>${item.price.toFixed(2)}</td>

                    <td>${(item.qty * item.price).toFixed(2)}</td>

                </tr>

            `).join('');

            const totalValue = transferItemsBatch.reduce((acc, item) => acc + (item.qty * item.price), 0);

            const content = `

                <div class="print-container" style="direction:rtl; font-family:Cairo, sans-serif; padding: 20px;">

                    <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">

                        <h1 style="margin:0;">${shopName}</h1>
                        ${shopAddress ? `<div style="font-size:12px; color:#555; margin-top:2px;">${shopAddress}</div>` : ''}
                        ${shopPhone ? `<div style="font-size:12px; color:#555; margin-top:2px;">هاتف: ${shopPhone}</div>` : ''}

                        <h2 style="margin:5px 0; background:#000; color:#fff; display:inline-block; padding:5px 20px; border-radius:5px;">إذن تحويل مخزني</h2>

                    </div>

                    <div style="display:flex; justify-content:space-between; margin-bottom: 20px; font-weight:bold;">

                        <div>من مخزن: <span style="text-decoration:underline;">${wFrom}</span></div>

                        <div>إلى مخزن: <span style="text-decoration:underline;">${wTo}</span></div>

                        <div>التاريخ: ${new Date().toLocaleString('ar-EG')}</div>

                    </div>

                    <table style="width:100%; border-collapse:collapse; text-align:center;" border="1">

                        <thead>

                            <tr style="background:#f0f0f0;">

                                <th>م</th>

                                <th>الصنف</th>

                                <th>الكمية</th>

                                <th>سعر التحويل</th>

                                <th>الإجمالي</th>

                            </tr>

                        </thead>

                        <tbody>${itemsHtml}</tbody>

                        <tfoot>

                            <tr style="font-weight:bold; background:#f0f0f0;">

                                <td colspan="4">إجمالي قيمة التحويل</td>

                                <td>${totalValue.toFixed(2)}</td>

                            </tr>

                        </tfoot>

                    </table>

                    <div style="margin-top:50px; display:flex; justify-content:space-between;">

                        <div style="text-align:center;">توقيع أمين المخزن (المصدر)<br><br>...........................</div>

                        <div style="text-align:center;">توقيع المستلم (الوجهة)<br><br>...........................</div>

                    </div>
                    
                    <div style="text-align:center; margin-top:30px; border-top:1px dashed #000; padding-top:10px; font-size:12px;">
                        <div style="font-weight:bold;">${footerMsg}</div>
                        <div>نظام بيان POS - مبيعات متكامل</div>
                    </div>

                </div>

            `;

            const printArea = document.getElementById('receipt-area');

            if (printArea) {

                printArea.innerHTML = content;

                window.print();

            }

        }

        window.updateTransferItem = function(index, key, val) {

            transferItemsBatch[index][key] = parseFloat(val) || 0;

            renderTransferTable();

        }

        window.handleTransferProductSearch = function(query) {

            const resultsDiv = document.getElementById('transferSearchResults');

            if (!resultsDiv) return;

            transferSearchSelectedIndex = -1;

            const queryLower = (query || "").toLowerCase().trim();

            let filtered = [];

            if (!queryLower) {

                // عرض أول 15 صنف عند الضغط على الحقل وهو فارغ

                filtered = productsDB.slice(0, 15);

            } else {

                filtered = productsDB.filter(p => 

                    (p.name && p.name.toLowerCase().includes(queryLower)) || 

                    (p.barcode && String(p.barcode).toLowerCase().includes(queryLower)) ||

                    (p.code && String(p.code).toLowerCase().includes(queryLower))

                ).slice(0, 15);

            }

            resultsDiv.innerHTML = '';

            resultsDiv.classList.remove('hidden');

            resultsDiv.style.display = 'block'; // التأكيد على الظهور

            if (filtered.length > 0) {

                filtered.forEach(p => {

                    const div = document.createElement('div');

                    div.className = 'search-item';

                    div.style.padding = '12px 15px';

                    div.style.cursor = 'pointer';

                    div.style.borderBottom = '1px solid #f1f5f9';

                    div.style.transition = '0.2s';

                    div.innerHTML = `

                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">

                            <div style="flex:1; text-align:right;">

                                <div style="font-weight: 800; font-size: 1rem; color: #1e293b; margin-bottom: 4px;">${p.name}</div>

                                <div style="display:flex; gap:10px; align-items:center; font-size:0.75rem; color:#64748b;">

                                    <span style="display:flex; align-items:center; gap:3px;">📦 كود: ${p.code || '---'}</span>

                                    <span style="display:flex; align-items:center; gap:3px; border-right: 1px solid #ddd; padding-right:10px;">🏷️ باركود: ${p.barcode || '---'}</span>

                                </div>

                            </div>

                            <div style="text-align:left; color: var(--main-blue); font-weight: 900; font-size: 1.1rem; min-width: 80px;">

                                ${(p.price || 0).toFixed(2)} <span style="font-size:0.7rem;">ج.م</span>

                            </div>

                        </div>

                    `;

                    div.onclick = (e) => {

                        e.preventDefault();

                        e.stopPropagation();

                        window.selectTransferProduct(p.id, p.name);

                    };

                    div.onmouseover = () => div.style.background = '#f8fafc';

                    div.onmouseout = () => div.style.background = '';

                    resultsDiv.appendChild(div);

                });

            } else {

                resultsDiv.innerHTML = '<div style="padding:20px; text-align:center; color:#94a3b8;"><div style="font-size:2rem; margin-bottom:10px;">🔍</div>لا توجد نتائج مطابقة لـ "' + query + '"</div>';

            }

        }

        window.selectTransferProduct = function(id, name) {

            const p = productsDB.find(x => x.id == id);

            if (!p) return;

            document.getElementById('transferSearchResults').classList.add('hidden');

            transferSearchSelectedIndex = -1;

            // إذا كان المنتج له أكثر من وحدة، نفتح نافذة الاختيار

            if (p.units && p.units.length > 1) {

                if (typeof showUnitSelectionModal === 'function') {

                    showUnitSelectionModal(p, 'transfer');

                }

            } else {

                // وحدة واحدة أو لا يوجد

                const defUnit = (p.units && p.units.length > 0) ? p.units[0] : null;

                window.fillTransferHeaderWithUnit(p, defUnit || { unitName: p.unit || 'قطعة', factor: 1, cost: p.cost });

            }

        }

        document.getElementById('transferProductSearch').addEventListener('keydown', function(e) {

            const resultsDiv = document.getElementById('transferSearchResults');

            const items = resultsDiv.querySelectorAll('.search-item');

            if (resultsDiv.classList.contains('hidden')) return;

            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {

                e.preventDefault();

                transferSearchSelectedIndex = (transferSearchSelectedIndex + 1) % items.length;

                updateTransferSearchSelection(items);

            } else if (e.key === 'ArrowUp') {

                e.preventDefault();

                transferSearchSelectedIndex = (transferSearchSelectedIndex - 1 + items.length) % items.length;

                updateTransferSearchSelection(items);

            } else if (e.key === 'Enter') {

                if (transferSearchSelectedIndex > -1) {

                    e.preventDefault();

                    items[transferSearchSelectedIndex].click();

                } else {

                    // إذا لم يتم الاختيار بالأسهم، نجرب البحث عن تطابق تام أو أول نتيجة

                    const query = e.target.value.trim();

                    if (query) {

                        const match = productsDB.find(p => 

                            (p.barcode && String(p.barcode) === query) || 

                            (p.code && String(p.code) === query)

                        );

                        if (match) {

                            e.preventDefault();

                            selectTransferProduct(match.id, match.name);

                        } else if (items.length > 0) {

                            e.preventDefault();

                            items[0].click();

                        }

                    }

                }

            } else if (e.key === 'Escape') {

                resultsDiv.classList.add('hidden');

            }

        });

        function updateTransferSearchSelection(items) {

            items.forEach((item, index) => {

                if (index === transferSearchSelectedIndex) {

                    item.style.background = '#e8f0fe';

                    item.style.borderRight = '4px solid var(--main-blue)';

                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                } else {

                    item.style.background = '';

                    item.style.borderRight = 'none';

                }

            });

        }

        // إغلاق قائمة البحث عند النقر في أي مكان آخر

        document.addEventListener('click', function(e) {

            const resultsDiv = document.getElementById('transferSearchResults');

            const searchInput = document.getElementById('transferProductSearch');

            if (resultsDiv && !resultsDiv.contains(e.target) && e.target !== searchInput) {

                resultsDiv.classList.add('hidden');

            }

        });

        window.addManualTransferItem = function() {

            const pId = selectedTransferProductId;

            const qty = parseFloat(document.getElementById('transferQty').value) || 1;

            const price = parseFloat(document.getElementById('transferPrice').value) || 0;

            if (!pId) return showToast("⚠️ يرجى اختيار صنف أولاً", "warning");

            const product = productsDB.find(p => p.id == pId);

            if (product) {

                // منع التكرار لنفس الوحدة (يسمح بإضافة وحدات مختلفة لنفس الصنف)

                const unitName = currentTransferHeaderUnit ? currentTransferHeaderUnit.unitName : (product.unit || 'قطعة');

                if (transferItemsBatch.some(item => item.id == pId && item.unitName == unitName)) {

                    return showToast("📋 هذه الوحدة لهذا الصنف موجودة بالفعل في القائمة", "info");

                }

                transferItemsBatch.push({

                    id: product.id,

                    name: product.name,

                    stock: product.stock,

                    qty: qty,

                    price: price,

                    unitName: unitName,

                    unitFactor: currentTransferHeaderUnit ? parseFloat(currentTransferHeaderUnit.factor) : 1

                });

                renderTransferTable();

                // تصفير البحث والمدخلات بعد الإضافة

                document.getElementById('transferProductSearch').value = '';

                document.getElementById('transferQty').value = '1';

                document.getElementById('transferPrice').value = '0.00';

                selectedTransferProductId = null;

                currentTransferHeaderUnit = null;

                document.getElementById('transferProductSearch').focus();

            }

        }

        window.removeTransferItem = function(index) {

            transferItemsBatch.splice(index, 1);

            renderTransferTable();

        }

        window.updateTransferToList = function() {

            const wFromVal = document.getElementById('transferFrom').value;

            const wTo = document.getElementById('transferTo');

            if (!wTo) return;

            wTo.innerHTML = '';

            const filteredWarehouses = warehouses.filter(w => w.name !== wFromVal);

            filteredWarehouses.forEach(w => {

                wTo.innerHTML += `<option value="${w.name}">${w.name}</option>`;

            });

            renderTransferTable();

        }

        window.processBatchTransfer = async function() {

            if (!checkPermission('stock_transfer')) return;

            if (transferItemsBatch.length === 0) return showToast("⚠️ قائمة التحويل فارغة!", "error");

            const wFrom = document.getElementById('transferFrom').value;

            const wTo = document.getElementById('transferTo').value;

            if (!wTo || wFrom === wTo) return showToast("🚫 يرجى اختيار مخزن وجهة مختلف عن المصدر", "error");

            showCustomAlert({

                type: 'warning',

                titleText: '⚠️ تأكيد التحويل المجمّع',

                msg: `هل أنت متأكد من تحويل (${transferItemsBatch.length}) أصناف من [${wFrom}] إلى [${wTo}]؟\nهذا الإجراء سيقوم بتعديل أرصدة المخازن فوراً.`,

                showCancel: true,

                confirmText: 'نعم، نفّذ التحويل',

                onConfirm: async () => {

                    let processedCount = 0;

                    for (let item of transferItemsBatch) {

                        if (item.qty <= 0) continue;

                        const currentStock = getWarehouseStock(item.name, wFrom);

                        if (item.qty > currentStock) {

                            return alert(`🚫 خطأ في تحويل الصنف (${item.name}):\nالكمية المطلوبة: ${item.qty}\nالرصيد المتاح حالياً في (${wFrom}): ${currentStock}\n\nيرجى تعديل الكمية للمتابعة.`);

                        }

                    }

                    const transId = isEditMode ? editingInvoiceId : ('TR-' + Date.now().toString().slice(-6));

                    const inputDate = document.getElementById('transferDate')?.value || new Date().toLocaleDateString('en-CA');
                    const inputTime = document.getElementById('transferTime')?.value || new Date().toTimeString().slice(0, 5);
                    const transferNotes = document.getElementById('transferNotes')?.value || '';

                    const dt = {
                        full: `${new Date(inputDate).toLocaleDateString('ar-EG')}، ${inputTime}`,
                        iso: inputDate,
                        time: inputTime
                    };

                    if (isEditMode && window.revertAndClearOldInvoice) {

                        await window.revertAndClearOldInvoice(editingInvoiceId, editingInvoiceType);

                    }

                    const totalTransferValue = transferItemsBatch.reduce((acc, item) => acc + (parseFloat(item.qty) * parseFloat(item.price)), 0);

                    transferItemsBatch.forEach((item, idx) => {

                        if (item.qty > 0) {

                            transactions.push({

                                invoiceId: transId,

                                isInvoiceHead: (idx === 0),

                                date: dt.full,

                                dateISO: dt.iso,

                                timeISO: dt.time,

                                type: 'تحويل مخزني 🚚',

                                product: item.name,

                                qty: item.qty,

                                unit: item.unitName,

                                price: item.price,

                                total: item.qty * item.price,

                                paidAmount: (idx === 0) ? totalTransferValue : 0,

                                method: 'تحويل داخلي',

                                warehouse: wTo,

                                sourceWarehouse: wFrom,

                                partner: `${wFrom} -> ${wTo}`,

                                notes: transferNotes,

                                user: currentUser ? currentUser.name : '-',

                                editDate: isEditMode ? new Date().toLocaleString('ar-EG') : '-'

                            });

                            processedCount++;

                        }

                    });

                    if (processedCount > 0) {

                        await saveData();

                        // إعادة ضبط وضع التعديل

                        isEditMode = false;

                        editingInvoiceId = null;

                        editingOriginalDate = null;

                        editingInvoiceType = null;

                        // تحديث المصفوفات في الذاكرة من قاعدة البيانات فوراً لضمان دقة الأرصدة

                        productsDB = await db.products.toArray();

                        transactions = await db.transactions.toArray();

                        showToast(`✅ تم بنجاح تحويل ( ${processedCount} ) أصناف من [${wFrom}] إلى [${wTo}]`, "success");

                        transferItemsBatch = [];

                        renderTransferTable();

                        document.getElementById('transferModal').classList.add('hidden');

                        // تحديث كافة الجداول والتقارير المرتبطة

                        if (typeof renderInventoryTable === 'function') renderInventoryTable();

                        if (typeof renderWarehouseReportTable === 'function') renderWarehouseReportTable();

                        if (typeof renderHistoryTable === 'function') renderHistoryTable();

                        if (typeof updateDashboard === 'function') updateDashboard();

                        if (typeof updateInventoryStats === 'function') updateInventoryStats();

                        if (typeof updateWarehousesSummaryBoard === 'function') updateWarehousesSummaryBoard();

                    }

                }

            });

        }

        // --- تخصيص أعمدة التحويل (Transfer Column Customization) ---

        window.toggleTransferColMenu = function(event) {

            if (event) event.stopPropagation();

            const menu = document.getElementById('transferColMenu');

            if (menu) menu.classList.toggle('hidden');

        }

        window.toggleTransferCol = function(colClass, isVisible) {

            const settings = JSON.parse(localStorage.getItem('transferColSettings') || '{}');

            settings[colClass] = isVisible;

            localStorage.setItem('transferColSettings', JSON.stringify(settings));

            applyTransferColVisibility();

        }

        window.applyTransferColVisibility = function() {

            const settings = JSON.parse(localStorage.getItem('transferColSettings') || '{"col-tr-stock":true,"col-tr-price":true,"col-tr-total":true}');

            Object.keys(settings).forEach(colClass => {

                const isVisible = settings[colClass];

                document.querySelectorAll(`.${colClass}`).forEach(el => {

                    el.style.display = isVisible ? '' : 'none';

                });

                // تحديث حالة الـ Checkbox في القائمة

                const chk = document.querySelector(`#transferColMenu input[onchange*="${colClass}"]`);

                if (chk) chk.checked = isVisible;

            });

        }

        // إغلاق القائمة عند النقر خارجها

        document.addEventListener('click', (event) => {

            const menu = document.getElementById('transferColMenu');

            if (menu && !menu.classList.contains('hidden')) {

                // إذا لم يتم النقر داخل القائمة، قم بإغلاقها

                if (!menu.contains(event.target)) {

                    menu.classList.add('hidden');

                }

            }

        });

        function deleteSelectedAccount() {

            if (!checkPermission('accounts_delete')) return;

            if (!selectedAccountID) return alert("يرجى تحديد حساب أولاً");

            if (!confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;

            const idx = accounts.findIndex(a => a.id === selectedAccountID);

            if (idx !== -1) {

                addToTrash('account', accounts[idx], `حساب: ${accounts[idx].name}`);

                accounts.splice(idx, 1);

                saveData();

                selectedAccountID = null;

                renderAccountsTable();

            }

        }

        function quickTransaction(type) {

            if (!selectedAccountID) return alert("يرجى تحديد حساب أولاً");

            const acc = accounts.find(a => a.id === selectedAccountID);

            const balance = typeof getAccountBalance === 'function' ? getAccountBalance(acc.name) : 0;

            if (type === 'receipt') {

                switchSection('receipt');

                document.getElementById('receiptCustomer').value = acc.name;

                const balEl = document.getElementById('receiptAccountBalance');

                if (balEl) balEl.innerText = balance.toLocaleString(undefined, {minimumFractionDigits: 2});

            } else {

                switchSection('disbursement');

                document.getElementById('disbursePayee').value = acc.name;

                const balEl = document.getElementById('disburseAccountBalance');

                if (balEl) balEl.innerText = balance.toLocaleString(undefined, {minimumFractionDigits: 2});

            }

        }

        function viewOldInvoice(invoiceId, type = 'بيع', autoSwitch = true) {

            if (autoSwitch) switchSection('invoices');

            // تصفير الفلاتر لضمان ظهور الفاتورة

            if (document.getElementById('invoicesDateFrom')) document.getElementById('invoicesDateFrom').value = '';

            if (document.getElementById('invoicesDateTo')) document.getElementById('invoicesDateTo').value = '';

            // تحديد نوع الفلترة في جدول الفواتير وتحديث التبويب النشط

            const filterEl = document.getElementById('invoicesTypeFilter');

            if (filterEl) {

                const cleanType = type.split(' ')[0];

                filterEl.value = cleanType;

                document.querySelectorAll('.invoice-tab').forEach(btn => {

                    btn.classList.toggle('active', btn.innerText.includes(cleanType));

                });

            }

            if (document.getElementById('invoicesSearchId')) document.getElementById('invoicesSearchId').value = invoiceId;

            renderInvoicesTable();

            if (document.getElementById('statementModal')) document.getElementById('statementModal').classList.add('hidden');

            setTimeout(() => {

                if (typeof viewInvoiceItems === 'function') viewInvoiceItems(invoiceId, type);

            }, 300);

        }

        // ================= منطق كشف الحساب (Account Statement) =================

        function generateAccountStatement() {

            if (!checkPermission('accounts_statement')) return;

            if (!selectedAccountID) return alert("⚠️ يرجى تحديد حساب من الجدول أولاً لعرض الكشف.");

            const acc = accounts.find(a => a.id === selectedAccountID);

            if (!acc) return;

            // تعيين التاريخ تلقائياً إذا كان فارغاً

            const todayISO = new Date().toLocaleDateString('en-CA');

            if (!document.getElementById('stmtDateFrom').value) {

                // افتراضياً بداية الشهر الحالي

                const firstDay = new Date();

                firstDay.setDate(1);

                document.getElementById('stmtDateFrom').value = firstDay.toLocaleDateString('en-CA');

            }

            if (!document.getElementById('stmtDateTo').value) {

                document.getElementById('stmtDateTo').value = todayISO;

            }

            // قراءة تواريخ الفلترة

            const fromDate = document.getElementById('stmtDateFrom').value;

            const toDate = document.getElementById('stmtDateTo').value;

            // تحديث رؤوس الجدول بناءً على التخصيص

            const tableHeaders = document.querySelectorAll('#statementModal .invoice-table thead th');

            tableHeaders.forEach((th, i) => {

                th.style.display = statementColumnVisibility[i] ? '' : 'none';

            });

            // تحديث خانة المجموع السابقة لتفادي ترحيل الأعمدة

            const prevBalanceRow = document.querySelector('#statementModal tr[style*="background-color: #e9ecef"]');

            if (prevBalanceRow) {

                 prevBalanceRow.querySelectorAll('td').forEach((td, i) => {

                     td.style.display = statementColumnVisibility[i] ? '' : 'none';

                 });

            }

            // 1. تجميع الحركات الخاصة بالحساب

            // نبدأ بالرصيد الافتتاحي (إذا وجد)

            let runningBalance = 0;

            let rowsHTML = '';

            const openDebit = parseFloat(acc.debit) || 0;

            const openCredit = parseFloat(acc.credit) || 0;

            let startBalance = openDebit - openCredit; // موجب = عليه، سالب = له

            runningBalance = startBalance;

            // فلترة العمليات من سجل الحركات (transactions)

            const accTrans = transactions.filter(t => t.partner === acc.name);

            // ترتيب العمليات حسب التاريخ لضمان تسلسل الرصيد

            accTrans.sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));

            // تجميع الحركات (Grouping by InvoiceID)

            let groupedTrans = [];

            let ivMap = {};

            accTrans.forEach(t => {

                const isInvoice = (t.type.includes('بيع') || t.type.includes('شراء')) && t.invoiceId;

                if (isInvoice) {

                    const isReturn = t.type.includes('مرتجع');

                    const key = (isReturn ? "RET_" : "") + t.type.split(' ')[0] + "_" + t.invoiceId; 

                    if (!ivMap[key]) {

                        ivMap[key] = {

                            dateISO: t.dateISO,

                            type: t.type,

                            invoiceId: t.invoiceId,

                            product: (isReturn ? 'مرتجع ' : 'فاتورة ') + (t.type.includes('بيع') ? 'مبيعات' : 'مشتريات') + ' رقم ' + t.invoiceId,

                            total: 0,

                            paid: 0,

                            isInvoice: true,

                            isReturn: isReturn

                        };

                        groupedTrans.push(ivMap[key]);

                    }

                    ivMap[key].total += (parseFloat(t.total) || 0);

                    if (t.isInvoiceHead) {

                        ivMap[key].paid = parseFloat(t.paidAmount) || 0;

                    }

                } else {

                    // حركات يدوية (قبض/صرف) أو مرتجعات بدون ID

                    groupedTrans.push({

                        dateISO: t.dateISO,

                        type: t.type,

                        invoiceId: t.invoiceId,

                        product: t.product || t.type,

                        total: (parseFloat(t.total) || parseFloat(t.price) || 0),

                        paid: (t.type.includes('قبض') || t.type.includes('مرتجع بيع')) ? (parseFloat(t.total) || parseFloat(t.price)) : 0,

                        isInvoice: false

                    });

                }

            });

            // إعادة الفلترة للعرض بعد التجميع

            if (fromDate) {

                const beforeGrouped = groupedTrans.filter(t => t.dateISO < fromDate);

                beforeGrouped.forEach(t => {

                    let debit = 0; let credit = 0;

                    if (t.isInvoice) {

                        if (t.type.includes('بيع')) {

                            if (t.type.includes('مرتجع')) { debit = t.paid; credit = t.total; }

                            else { debit = t.total; credit = t.paid; }

                        } else if (t.type.includes('شراء')) {

                            if (t.type.includes('مرتجع')) { debit = t.total; credit = t.paid; }

                            else { debit = t.paid; credit = t.total; }

                        }

                    } else {

                        if (t.type.includes('قبض') || t.type.includes('مرتجع بيع')) credit = t.total;

                        else if (t.type.includes('صرف') || t.type.includes('بيع') || t.type.includes('مرتجع شراء')) debit = t.total;

                    }

                    runningBalance += (debit - credit);

                });

                rowsHTML += `

                    <tr style="background-color: #e9ecef; font-weight:bold;">

                        <td style="display:${statementColumnVisibility[0] ? '' : 'none'};">-</td>

                        <td style="display:${statementColumnVisibility[1] ? '' : 'none'};">-</td>

                        <td style="display:${statementColumnVisibility[2] ? '' : 'none'};">رصيد سابق</td>

                        <td style="display:${statementColumnVisibility[3] ? '' : 'none'};">حتى ${fromDate}</td>

                        <td style="display:${statementColumnVisibility[4] ? '' : 'none'};">-</td>

                        <td style="display:${statementColumnVisibility[5] ? '' : 'none'};">-</td>

                        <td style="display:${statementColumnVisibility[6] ? '' : 'none'}; font-weight:bold;">${runningBalance.toFixed(2)}</td>

                    </tr>`;

                displayTrans = groupedTrans.filter(t => t.dateISO >= fromDate && (!toDate || t.dateISO <= toDate));

            } else {

                rowsHTML += `

                    <tr style="background-color: #fff3cd;">

                        <td style="display:${statementColumnVisibility[0] ? '' : 'none'};">-</td>

                        <td style="display:${statementColumnVisibility[1] ? '' : 'none'};">${acc.balanceDate || '-'}</td>

                        <td style="display:${statementColumnVisibility[2] ? '' : 'none'};">رصيد افتتاحي</td>

                        <td style="display:${statementColumnVisibility[3] ? '' : 'none'};">بداية المدة</td>

                        <td style="display:${statementColumnVisibility[4] ? '' : 'none'};">${openDebit > 0 ? openDebit.toFixed(2) : '-'}</td>

                        <td style="display:${statementColumnVisibility[5] ? '' : 'none'};">${openCredit > 0 ? openCredit.toFixed(2) : '-'}</td>

                        <td style="display:${statementColumnVisibility[6] ? '' : 'none'}; font-weight:bold;">${runningBalance.toFixed(2)}</td>

                    </tr>`;

                displayTrans = groupedTrans;

                if (toDate) displayTrans = displayTrans.filter(t => t.dateISO <= toDate);

            }

            const typeFilter = document.getElementById('stmtTypeFilter').value;

            let periodDebit = 0;

            let periodCredit = 0;

            displayTrans.forEach(t => {

                let debit = 0; let credit = 0;

                if (t.isInvoice) {

                    if (t.type.includes('بيع')) {

                        if (t.type.includes('مرتجع')) {

                            debit = t.paid;

                            credit = t.total;

                        } else {

                            debit = t.total;

                            credit = t.paid;

                        }

                    } else if (t.type.includes('شراء')) {

                        if (t.type.includes('مرتجع')) {

                            debit = t.total;

                            credit = t.paid;

                        } else {

                            debit = t.paid;

                            credit = t.total;

                        }

                    }

                } else {

                    if (t.type.includes('قبض') || t.type.includes('مرتجع بيع')) credit = t.total;

                    else if (t.type.includes('صرف') || t.type.includes('بيع') || t.type.includes('مرتجع شراء')) debit = t.total;

                }

                runningBalance += (debit - credit);

                // تطبيق فلتر نوع الحركة (العرض فقط)

                let matchesFilter = true;

                if (typeFilter !== 'all') {

                    if (typeFilter === 'sales') matchesFilter = t.type.includes('بيع') && !t.type.includes('مرتجع');

                    else if (typeFilter === 'purchase') matchesFilter = t.type.includes('شراء') && !t.type.includes('مرتجع');

                    else if (typeFilter === 'receipt') matchesFilter = t.type.includes('قبض');

                    else if (typeFilter === 'disbursement') matchesFilter = t.type.includes('صرف');

                    else if (typeFilter === 'returns') matchesFilter = t.type.includes('مرتجع');

                }

                if (matchesFilter) {

                    periodDebit += debit;

                    periodCredit += credit;

                    rowsHTML += `

                        <tr data-trans-id="${t.invoiceId || ''}" data-type="${t.type}" data-total="${t.total}">

                            <td style="display:${statementColumnVisibility[0] ? '' : 'none'}; text-align:center;">

                                <input type="checkbox" class="stmt-row-select">

                            </td>

                            <td style="display:${statementColumnVisibility[1] ? '' : 'none'};">${t.dateISO}</td>

                            <td style="display:${statementColumnVisibility[2] ? '' : 'none'}; cursor:pointer; color:var(--main-blue); text-decoration:underline; font-weight:bold;" 

                                onclick="${t.invoiceId ? `viewInvoiceItems(${t.invoiceId}, '${t.type}')` : ''}">

                                ${t.type} ${t.invoiceId ? `(#${t.invoiceId}) 👁️` : ''}

                            </td>

                            <td style="display:${statementColumnVisibility[3] ? '' : 'none'};">${t.isInvoice ? (t.paid > 0 ? `دفع ${t.paid} من ${t.total}` : 'آجل بالكامل') : t.product}</td>

                            <td style="display:${statementColumnVisibility[4] ? '' : 'none'}; color:#c0392b;">${debit > 0 ? debit.toFixed(2) : '-'}</td>

                            <td style="display:${statementColumnVisibility[5] ? '' : 'none'}; color:var(--main-green);">${credit > 0 ? credit.toFixed(2) : '-'}</td>

                            <td style="display:${statementColumnVisibility[6] ? '' : 'none'}; font-weight:bold; background:rgba(0,0,0,0.02);">${runningBalance.toFixed(2)}</td>

                        </tr>

                    `;

                }

            });

            // عرض البيانات في النافذة

            const finalBalance = runningBalance;

            document.getElementById('statementHeaderInfo').innerHTML = `

                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">

                    <h3 style="margin:0; color:var(--main-blue); display:flex; align-items:center; gap:8px;">

                        <span style="font-size:1.5rem;">👤</span> كشف حساب: ${acc.name}

                    </h3>

                    <div style="display:flex; gap:15px; font-size:0.85rem; color:#666; background:#f8f9fa; padding:5px 15px; border-radius:20px;">

                        <span>📱 ${acc.mobile || 'غير مسجل'}</span>

                        <span>📍 ${acc.address || 'غير مسجل'}</span>

                    </div>

                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 10px;">

                    <div style="background: linear-gradient(135deg, #fff5f5, #fed7d7); border: 1px solid #feb2b2; padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">

                        <div style="color: #c53030; font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">إجمالي الحركات المدينة (عليه)</div>

                        <div style="color: #9b2c2c; font-size: 1.5rem; font-weight: 900;">${periodDebit.toFixed(2)}</div>

                    </div>

                    <div style="background: linear-gradient(135deg, #f0fff4, #c6f6d5); border: 1px solid #9ae6b4; padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">

                        <div style="color: #276749; font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">إجمالي الحركات الدائنة (له)</div>

                        <div style="color: #22543d; font-size: 1.5rem; font-weight: 900;">${periodCredit.toFixed(2)}</div>

                    </div>

                    <div style="background: linear-gradient(135deg, #ebf8ff, #bee3f8); border: 1px solid #90cdf4; padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">

                        <div style="color: #2b6cb0; font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">الرصيد النهائي ${finalBalance >= 0 ? '(عليه)' : '(له)'}</div>

                        <div style="color: ${finalBalance >= 0 ? '#c53030' : '#276749'}; font-size: 1.8rem; font-weight: 900; line-height: 1;">

                            ${Math.abs(finalBalance).toFixed(2)}

                            <span style="font-size: 0.9rem; display:block; margin-top:4px;">${finalBalance >= 0 ? 'مطلوب تحصيله' : 'مطلوب سداده'}</span>

                        </div>

                    </div>

                </div>

            `;

            document.getElementById('statementTableBody').innerHTML = rowsHTML;

            document.getElementById('statementModal').classList.remove('hidden');

        }

        // ================= تقرير المديونيات (Debt Tracking) =================

        function generateDebtReport() {

            const debtors = accounts.filter(a => {

                const bal = (parseFloat(a.debit) || 0) - (parseFloat(a.credit) || 0);

                return bal > 0; // عليه فلوس

            });

            if (debtors.length === 0) return alert("لا توجد مديونيات مستحقة حالياً.");

            let rows = '';

            let totalDebt = 0;

            debtors.forEach(a => {

                const debt = (parseFloat(a.debit) || 0) - (parseFloat(a.credit) || 0);

                totalDebt += debt;

                rows += `<tr><td>${a.name}</td><td>${a.mobile || '-'}</td><td>${debt.toFixed(2)}</td></tr>`;

            });

            const content = `

                <div class="print-container">

                    <div class="print-header"><div class="print-title">تقرير المديونيات المستحقة (الآجل)</div></div>

                    <table class="print-table"><thead><tr><th>العميل</th><th>رقم الهاتف</th><th>المبلغ المستحق</th></tr></thead><tbody>${rows}</tbody></table>

                    <div class="print-total-box">إجمالي الديون: ${totalDebt.toFixed(2)}</div>

                </div>`;

            document.getElementById('receipt-area').innerHTML = content;

            window.print();

        }

        // ================= تقرير تجاوز الحد الائتماني (Over Limit Report) =================

        function generateOverLimitReport() {

            const overLimitAccounts = accounts.filter(a => {

                const limit = parseFloat(a.maxDebt) || 0;

                if (limit <= 0) return false; // لا يوجد حد

                const balance = (parseFloat(a.debit) || 0) - (parseFloat(a.credit) || 0);

                return balance > limit;

            });

            if (overLimitAccounts.length === 0) return alert("✅ ممتاز! لا يوجد عملاء متجاوزين للحد الائتماني.");

            let rows = '';

            overLimitAccounts.forEach(a => {

                const balance = (parseFloat(a.debit) || 0) - (parseFloat(a.credit) || 0);

                const limit = parseFloat(a.maxDebt);

                const diff = balance - limit;

                rows += `<tr><td>${a.name}</td><td>${a.mobile || '-'}</td><td>${limit.toFixed(2)}</td><td style="color:red; font-weight:bold;">${balance.toFixed(2)}</td><td style="color:#c0392b;">+${diff.toFixed(2)}</td></tr>`;

            });

            const content = `

                <div class="print-container">

                    <div class="print-header">

                        <div class="print-title">⚠️ تقرير العملاء المتجاوزين للحد الائتماني</div>

                        <div>تاريخ التقرير: ${new Date().toLocaleString('ar-EG')}</div>

                    </div>

                    <table class="print-table">

                        <thead><tr><th>العميل</th><th>رقم الهاتف</th><th>الحد المسموح</th><th>الرصيد الحالي</th><th>قيمة التجاوز</th></tr></thead>

                        <tbody>${rows}</tbody>

                    </table>

                </div>`;

            document.getElementById('receipt-area').innerHTML = content;

            window.print();

        }

        // ================= إدارة المستخدمين والصلاحيات =================

        /**

         * دالة مزامنة المستخدمين مع سحابة بَيَان (Supabase)

         */

        async function syncUsersToCloud() {

            if (!supabaseClient) return;

            try {

                // ملاحظة: هذا يتطلب جدول 'pos_users' في قاعدة بيانات Supabase مع تفعيل صلاحيات RLS

                const { data, error } = await supabaseClient

                    .from('pos_users')

                    .upsert(users.map(u => ({

                        id: String(u.id),

                        name: u.name,

                        pin: u.pin,

                        role: u.role,

                        permissions: JSON.stringify(u.permissions),

                        updated_at: new Date()

                    })));

                if (error) console.warn("📡 خطأ في مزامنة السحابة:", error.message);

                else console.log("📡 تمت المزامنة السحابية بنجاح ✅");

            } catch (err) {

                console.error("📡 فشل الاتصال بالسحابة:", err);

            }

        }

        // ================= دوال إدارة المخازن (Warehouses) =================

        function exportAccountStatementToExcel() {

            const table = document.querySelector('#statementModal .invoice-table');

            if (!table) return;

            const headerInfo = document.getElementById('statementHeaderInfo');

            const accName = headerInfo ? headerInfo.querySelector('h3').innerText.replace('👤 كشف حساب:', '').trim() : 'كشف_حساب';

            const fileName = `كشف_حساب_${accName}_${new Date().toLocaleDateString('ar-EG')}.csv`;

            let csv = "\uFEFF"; // BOM for Excel UTF-8

            const rows = table.querySelectorAll('tr');

            rows.forEach(row => {

                const cols = row.querySelectorAll('th, td');

                const rowData = [];

                cols.forEach(col => {

                    if (col.style.display !== 'none') {

                        rowData.push('"' + col.innerText.replace(/"/g, '""') + '"');

                    }

                });

                if (rowData.length > 0) csv += rowData.join(',') + "\r\n";

            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

            const link = document.createElement("a");

            link.href = URL.createObjectURL(blob);

            link.download = fileName;

            link.click();

            showToast("✅ تم تصدير كشف الحساب بنجاح");

        }

        function shareAccountStatement(platform) {

            const headerInfo = document.getElementById('statementHeaderInfo');

            if (!headerInfo) return;

            const accName = headerInfo.querySelector('h3').innerText.replace('👤 كشف حساب:', '').trim();

            const fromDate = document.getElementById('stmtDateFrom').value || '---';

            const toDate = document.getElementById('stmtDateTo').value || '---';

            // استخراج الرصيد من النص

            const balanceText = headerInfo.innerText.split('الرصيد الحالي:')[1] || '---';

            const message = `📄 *كشف حساب تفصيلي*\n` +

                          `👤 *العميل:* ${accName}\n` +

                          `📅 *الفترة:* من ${fromDate} إلى ${toDate}\n` +

                          `💰 *الرصيد الحالي:* ${balanceText.trim()}\n` +

                          `بواسطة: *${shopName || 'بيان POS'}*`;

            const encodedMessage = encodeURIComponent(message);

            const url = (platform === 'whatsapp') ? 

                `https://wa.me/?text=${encodedMessage}` : 

                `https://t.me/share/url?url=${encodedMessage}`;

            window.open(url, '_blank');

        }

        function shareSelectedStatementTransactions(platform) {

            const checkedRows = document.querySelectorAll('#statementTableBody tr input.stmt-row-select:checked');

            if (checkedRows.length === 0) return alert("❌ يرجى تحديد حركة واحدة على الأقل للمشاركة.");

            const headerInfo = document.getElementById('statementHeaderInfo');

            const accName = headerInfo.querySelector('h3').innerText.replace('👤 كشف حساب:', '').trim();

            let message = `📄 *ملخص عمليات محددة*\n👤 *العميل:* ${accName}\n------------------\n`;

            checkedRows.forEach(chk => {

                const row = chk.closest('tr');

                const cells = row.querySelectorAll('td');

                // ملاحظة: الفهرس 1 هو التاريخ، 2 هو النوع، 3 هو البيان، 4 مدين، 5 دائن

                const date = cells[1].innerText;

                const type = cells[2].innerText;

                const note = cells[3].innerText;

                const debit = cells[4].innerText;

                const credit = cells[5].innerText;

                message += `📅 ${date}\n🔘 ${type}\n📝 ${note}\n`;

                if (debit !== '-') message += `🔴 عليه: ${debit}\n`;

                if (credit !== '-') message += `🟢 له: ${credit}\n`;

                message += `------------------\n`;

            });

            message += `بواسطة: *${shopName || 'بيان POS'}*`;

            const encodedMessage = encodeURIComponent(message);

            const url = (platform === 'whatsapp') ? 

                `https://wa.me/?text=${encodedMessage}` : 

                `https://t.me/share/url?url=${encodedMessage}`;

            window.open(url, '_blank');

            toggleShareMenu('stmtShareMenu');

        }

        function printAccountStatement() {

            const shopName = document.getElementById('shopName')?.value || localStorage.getItem('shopName') || 'بَيَان POS';

            const shopPhone = document.getElementById('shopPhone')?.value || '';

            const today = new Date().toLocaleDateString('ar-EG');

            // جلب الجدول الحالي المعروض على الشاشة

            const tableEl = document.getElementById('accountsTableBody');

            if (!tableEl) return alert('❌ لا يوجد بيانات للطباعة');

            // نسخ الجدول وتنظيفه من أزرار الاختيار والتحديد

            const tableClone = tableEl.cloneNode(true);

            tableClone.querySelectorAll('input[type="radio"], input[type="checkbox"], button').forEach(el => el.remove());

            const rowsHTML = tableClone.innerHTML;

            // حساب الإجماليات من السطر الأخير المرئي

            const totalDebit = document.querySelector('#accountsTableBody tr:last-child td')?.innerText || '';

            const summaryRow = document.querySelector('.accounts-summary, #accountsSummaryRow');

            const shopLogo = document.getElementById('logoPreview')?.src || '';

            const logoHTML = shopLogo && !shopLogo.includes('undefined') 

                ? `<img src="${shopLogo}" style="max-height:60px; max-width:100px;">` 

                : '';

            // إنشاء Iframe مخفي للطباعة

            let iframe = document.getElementById('print-iframe');

            if (!iframe) {

                iframe = document.createElement('iframe');

                iframe.id = 'print-iframe';

                iframe.style.cssText = 'position:fixed;right:100%;bottom:100%;width:0;height:0;border:none;';

                document.body.appendChild(iframe);

            }

            const doc = iframe.contentWindow.document;

            doc.open();

            doc.write(`

                <html dir="rtl">

                <head>

                    <title>كشف الحسابات - ${shopName}</title>

                    <style>

                        @page { size: A4 landscape; margin: 10mm; }

                        * { box-sizing: border-box; }

                        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 0; color: #000; background: #fff; width: 100%; max-width: 100%; }

                        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 15px; width: 100%; }

                        .shop-info { flex: 1; text-align: right; }

                        .report-title-container { flex: 1; text-align: center; }

                        .logo-container { flex: 1; text-align: left; }

                        .shop-info h2 { margin: 0; font-size: 1.4rem; font-weight: 900; }

                        .shop-info p { margin: 3px 0; font-size: 0.9rem; color: #222; font-weight: bold; }

                        .report-title { display: inline-block; background: #000; color: #fff; padding: 8px 25px; border-radius: 6px; font-size: 1.1rem; font-weight: 900; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }

                        table { width: 100%; max-width: 100%; border-collapse: collapse; font-size: 0.85rem; page-break-inside: auto; table-layout: auto; }

                        tr { page-break-inside: avoid; page-break-after: auto; }

                        thead { display: table-header-group; }

                        tfoot { display: table-footer-group; }

                        thead tr { background: #e0e0e0; color: #000; border-bottom: 2px solid #000; }

                        th { padding: 8px 4px; border: 1px solid #777; text-align: right; font-weight: bold; }

                        td { padding: 6px 4px; border: 1px solid #999; text-align: right; vertical-align: middle; word-wrap: break-word; }

                        tbody tr:nth-child(even) { background: #f5f5f5; }

                        .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 0.85rem; color: #222; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; width: 100%; page-break-inside: avoid; }

                        .badge, .accounts-type-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; border: 1px solid #000; color: #000 !important; background: transparent !important; }

                    </style>

                </head>

                <body>

                    <div class="header">

                        <div class="shop-info">

                            <h2>${shopName}</h2>

                            <p>📞 ${shopPhone}</p>

                            <p>📅 ${today}</p>

                        </div>

                        <div class="report-title-container">

                            <div class="report-title">📋 كشف إجمالي الحسابات</div>

                        </div>

                        <div class="logo-container">

                            ${logoHTML}

                        </div>

                    </div>

                    <table>

                        <thead>

                            <tr>

                                <th>#</th>

                                <th>كود الحساب</th>

                                <th>اسم الحساب</th>

                                <th>طبيعة الحساب</th>

                                <th>التصنيف</th>

                                <th>مدين (عليه)</th>

                                <th>دائن (له)</th>

                                <th>إجمالي البيع</th>

                                <th>آخر تاريخ قبض</th>

                                <th>آخر حركة</th>

                            </tr>

                        </thead>

                        <tbody>${rowsHTML}</tbody>

                    </table>

                    <div class="footer">

                        <span>بواسطة: نظام بَيَان POS النسخة الذهبية</span>

                        <span>وقت الطباعة: ${new Date().toLocaleString('ar-EG')}</span>

                    </div>

                </body>

                </html>

            `);

            doc.close();

            setTimeout(() => {

                iframe.contentWindow.focus();

                iframe.contentWindow.print();

            }, 600);

        }

        // --- إدارة أعمدة تعديل الأسعار (Price Adj Column Manager) ---

        const priceAdjColumns = [

            { id: 1, name: "المسلسل (#)" },

            { id: 'internal', name: "الكود الداخلي" },

            { id: 2, name: "كود الصنف" },

            { id: 3, name: "اسم الصنف" },

            { id: 4, name: "الباركود" },

            { id: 6, name: "الوحدة" },

            { id: 12, name: "متوسط التكلفة" },

            { id: 11, name: "آخر شراء" },

            { id: 13, name: "سعر الجملة" },

            { id: 10, name: "سعر القطاعي" },

            { id: 'profit', name: "الربح %" },

            { id: 'min', name: "أدنى سعر" },

            { id: 9, name: "الرصيد" }

        ];

        function togglePriceAdjColumnManager() {

            const manager = document.getElementById('priceAdjColumnManager');

            if (manager) {

                manager.classList.toggle('hidden');

                if (!manager.classList.contains('hidden')) {

                    initPriceAdjColumnManager();

                }

            }

        }

        function initPriceAdjColumnManager() {

            const container = document.getElementById('priceAdjColumnChecklist');

            if (!container) return;

            let saved = localStorage.getItem('priceAdjHiddenCols');

            let hiddenCols = saved ? JSON.parse(saved) : [];

            container.innerHTML = '';

            priceAdjColumns.forEach(col => {

                const isChecked = !hiddenCols.includes(String(col.id));

                const div = document.createElement('div');

                div.style.display = 'flex';

                div.style.alignItems = 'center';

                div.style.gap = '10px';

                div.style.fontSize = '0.85rem';

                div.style.padding = '3px 0';

                div.innerHTML = `

                    <input type="checkbox" id="chkColAdj${col.id}" ${isChecked ? 'checked' : ''} 

                        onchange="applyPriceAdjColumnVisibility()">

                    <label for="chkColAdj${col.id}" style="cursor:pointer; user-select:none; font-weight:bold;">${col.name}</label>

                `;

                container.appendChild(div);

            });

        }

        function applyPriceAdjColumnVisibility() {

            let hiddenCols = [];

            priceAdjColumns.forEach(col => {

                const chk = document.getElementById(`chkColAdj${col.id}`);

                const isVisible = chk ? chk.checked : true;

                const cells = document.querySelectorAll(`.col-adj-${col.id}`);

                cells.forEach(c => {

                    c.style.display = isVisible ? '' : 'none';

                });

                if (!isVisible) hiddenCols.push(String(col.id));

            });

            localStorage.setItem('priceAdjHiddenCols', JSON.stringify(hiddenCols));

        }

        // --- تصدير قائمة الحسابات إلى إكسيل ---

        function exportAccountsToExcel() {

            try {

                if (typeof XLSX === 'undefined') {

                    return alert("❌ مكتبة Excel غير محملة حالياً.");

                }

                const search = document.getElementById('accSearchName').value.toLowerCase();

                const typeFilter = document.getElementById('accFilterType').value;

                const catFilter = document.getElementById('accFilterCat').value;

                const balanceFilter = document.getElementById('accFilterBalance') ? document.getElementById('accFilterBalance').value : 'all';

                const filtered = accounts.filter(acc => {

                    const matchName = acc.name.toLowerCase().includes(search);

                    const matchCode = (acc.code || '').toString().toLowerCase().includes(search);

                    const matchType = typeFilter === 'all' || acc.type === typeFilter || (acc.type === 'mixed' && (typeFilter === 'client' || typeFilter === 'supplier'));

                    const matchCat = catFilter === 'all' || acc.category === catFilter;

                    return (matchName || matchCode) && matchType && matchCat;

                });

                const exportData = [];

                const typeLabels = { client: 'عميل', supplier: 'مورد', delegate: 'مندوب', mixed: 'عميل ومورد', other: 'أخرى' };

                filtered.forEach((acc, idx) => {

                    let initialDebit = parseFloat(acc.debit) || 0;

                    let initialCredit = parseFloat(acc.credit) || 0;

                    let currentBalance = initialDebit - initialCredit;

                    let totalSales = 0;

                    const accTrans = transactions.filter(t => t.partner === acc.name);

                    accTrans.forEach(t => {

                        let val = 0;

                        if (t.type.includes('بيع') && !t.type.includes('مرتجع')) {

                            val = parseFloat(t.total) || 0;

                            totalSales += val;

                            if (t.isInvoiceHead) val -= (parseFloat(t.paidAmount) || 0);

                        } else if (t.type.includes('شراء') && !t.type.includes('مرتجع')) {

                            val = -(parseFloat(t.total) || 0);

                            if (t.isInvoiceHead) val += (parseFloat(t.paidAmount) || 0);

                        } else if (t.type.includes('قبض')) {

                            val = -(parseFloat(t.price) || 0);

                        } else if (t.type.includes('صرف')) {

                            val = parseFloat(t.price) || 0;

                        } else if (t.type.includes('مرتجع بيع')) {

                            val = -(parseFloat(t.total) || 0);

                            totalSales += val;

                            if (t.method && (t.method.includes('نقدية') || t.method.includes('كاش'))) val = 0;

                        } else if (t.type.includes('مرتجع شراء')) {

                            val = parseFloat(t.total) || 0;

                            if (t.method && (t.method.includes('نقدية') || t.method.includes('كاش'))) val = 0;

                        }

                        currentBalance += val;

                    });

                    const isZero = Math.abs(currentBalance) < 0.01;

                    if (balanceFilter === 'nonzero' && isZero) return;

                    if (balanceFilter === 'zero' && !isZero) return;

                    if (balanceFilter === 'debit' && currentBalance <= 0) return;

                    if (balanceFilter === 'credit' && currentBalance >= 0) return;

                    exportData.push({

                        "م": idx + 1,

                        "كود الحساب": acc.code || "-",

                        "اسم الحساب": acc.name,

                        "النوع": typeLabels[acc.type] || acc.type,

                        "التصنيف": acc.category || "-",

                        "مدين (عليه)": currentBalance > 0 ? currentBalance.toFixed(2) : "0.00",

                        "دائن (له)": currentBalance < 0 ? Math.abs(currentBalance).toFixed(2) : "0.00",

                        "إجمالي المبيعات": totalSales.toFixed(2)

                    });

                });

                if (exportData.length === 0) return alert("❌ لا توجد بيانات لتصديرها حالياً.");

                const ws = XLSX.utils.json_to_sheet(exportData);

                const wb = XLSX.utils.book_new();

                XLSX.utils.book_append_sheet(wb, ws, "دليل الحسابات");

                const fileName = `دليل_الحسابات_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`;

                XLSX.writeFile(wb, fileName);

                showToast("✅ تم تصدير ملف الإكسيل بنجاح", "success");

            } catch (err) {

                console.error("Export Error:", err);

                alert("❌ فشل التصدير: " + err.message);

            }

        }
