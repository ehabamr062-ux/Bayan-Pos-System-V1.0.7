function getActiveWarehouseStock(productOrName) {
    if (!productOrName) return 0;
    const name = (typeof productOrName === 'object') ? productOrName.name : productOrName;
    const activeWH = (typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';
    if (typeof getWarehouseStock === 'function') {
        return getWarehouseStock(name, activeWH);
    }
    if (typeof productOrName === 'object' && productOrName.stock !== undefined) {
        return parseFloat(productOrName.stock) || 0;
    }
    return 0;
}
window.getActiveWarehouseStock = getActiveWarehouseStock;

function updateHeaderPartnerInfo() {

    // تحديث شارة اسم العميل/المورد في هيدر الفاتورة

    const sPB = document.getElementById('salesPartnerBadge');

    const sCode = document.getElementById('customerCodeDisplay');

    const sBalance = document.getElementById('customerBalanceDisplay');

    if (sPB && document.getElementById('customerName')) {

        const name = document.getElementById('customerName').value || '---';

        sPB.innerText = '👤 عميل: ' + name;

        const acc = accounts.find(a => a.name === name);

        if (acc) {

            if (sCode) sCode.innerText = acc.code || '---';

            if (sBalance) {

                const bal = getAccountBalance(name);

                sBalance.innerText = bal.toFixed(2);

                // رصيد سابق في شاشة المبيعات

                if (document.getElementById('prevBalanceDisplay')) {

                    document.getElementById('prevBalanceDisplay').innerText = bal.toFixed(2);

                    // استدعاء الحساب لتحديث الإجمالي الكلي

                    if (typeof calculateTotals === 'function') calculateTotals();

                }

                // تلوين الرصيد (أخضر للمديونية "عليه"، أحمر للدائن "له") حسب طلب المستخدم

                sBalance.style.color = (bal > 0) ? 'var(--main-green)' : (bal < 0 ? '#c0392b' : 'white');

                sBalance.parentElement.style.backgroundColor = (bal > 0) ? 'rgba(39, 174, 96, 0.2)' : (bal < 0 ? 'rgba(192, 57, 43, 0.2)' : '#444');

            }

        } else {

            if (sCode) sCode.innerText = '---';

            if (sBalance) {

                sBalance.innerText = '0.00';

                sBalance.style.color = 'white';

                sBalance.parentElement.style.backgroundColor = '#444';

            }

            if (document.getElementById('prevBalanceDisplay')) {

                document.getElementById('prevBalanceDisplay').innerText = '0.00';

                if (typeof calculateTotals === 'function') calculateTotals();

            }

        }

    }

    const pPB = document.getElementById('purchasePartnerBadge');

    const pCode = document.getElementById('supplierCodeDisplay');

    const pBalance = document.getElementById('supplierBalanceDisplay');

    if (pPB && document.getElementById('supplierName')) {

        const name = document.getElementById('supplierName').value || '---';

        pPB.innerText = '👤 مورد: ' + name;

        const acc = accounts.find(a => a.name === name);

        if (acc) {

            if (pCode) pCode.innerText = acc.code || '---';

            if (pBalance) {

                const bal = getAccountBalance(name);

                pBalance.innerText = bal.toFixed(2);

                if (document.getElementById('purchasePrevBalanceDisplay')) {

                    document.getElementById('purchasePrevBalanceDisplay').innerText = bal.toFixed(2);

                    if (typeof calculatePurchaseTotals === 'function') calculatePurchaseTotals();

                }

                // تلوين الرصيد (أخضر للمديونية "عليه"، أحمر للدائن "له")

                pBalance.style.color = (bal > 0) ? 'var(--main-green)' : (bal < 0 ? '#c0392b' : 'white');

                pBalance.parentElement.style.backgroundColor = (bal > 0) ? 'rgba(39, 174, 96, 0.2)' : (bal < 0 ? 'rgba(192, 57, 43, 0.2)' : '#444');

            }

        } else {

            if (pCode) pCode.innerText = '---';

            if (pBalance) {

                pBalance.innerText = '0.00';

                pBalance.style.color = 'white';

                pBalance.parentElement.style.backgroundColor = '#444';

            }

            if (document.getElementById('purchasePrevBalanceDisplay')) {

                document.getElementById('purchasePrevBalanceDisplay').innerText = '0.00';

                if (typeof calculatePurchaseTotals === 'function') calculatePurchaseTotals();

            }

        }

    }

    const srPB = document.getElementById('salesReturnPartnerBadge');

    if (srPB && document.getElementById('salesReturnPartnerDisplay')) {

        const name = document.getElementById('salesReturnPartnerDisplay').innerText || '---';

        srPB.innerText = '👤 عميل: ' + name;

    }

    const prPB = document.getElementById('purReturnPartnerBadge');

    if (prPB && document.getElementById('purReturnPartnerDisplay')) {

        const name = document.getElementById('purReturnPartnerDisplay').innerText || '---';

        prPB.innerText = '👤 مورد: ' + name;

    }

}

// =========================================================================================
// تم نقل جميع دوال شاشة وهيدر المشتريات بالكامل إلى ملف js/purchases.js
// =========================================================================================

async function fastQuickAddProduct(name, context) {

    if (!name) return;

    // تحقق من وجود المنتج مسبقاً لتجنب التكرار

    const exists = productsDB.find(p => p.name.trim() === name.trim());

    if (exists) {

        if (context === 'purchase') addToPurchaseCart(exists.id);

        else if (context === 'sales') addToCart(exists.id);

        document.getElementById('purchaseSearch').value = '';

        document.getElementById('purchaseSearchResults').style.display = 'none';

        return;

    }

    const newItem = {

        id: Date.now(),

        name: name.trim(),

        price: 0,

        cost: 0,

        wholesale: 0,

        minPrice: 0,

        discount: 0,

        barcode: '',

        code: '',

        category: 'عام',

        shelf: '',

        stock: 0,

        minStock: 0,

        expiry: '',

        notes: 'إضافة سريعة من شاشة الشراء',

        units: [{

            unitName: 'قطعة',

            factor: 1,

            wholesale: 0,

            price: 0,

            cost: 0,

            isDefaultSale: true,

            isDefaultPurchase: true,

            unitBarcode: ''

        }],

        image: null

    };

    try {

        await db.products.add(newItem);

        productsDB.push(newItem);

        if (context === 'purchase') {

            addToPurchaseCart(newItem.id);

            document.getElementById('purchaseSearch').value = '';

        } else if (context === 'sales') {

            addToCart(newItem.id);

            if (document.getElementById('productSearch')) document.getElementById('productSearch').value = '';

        }

        const resultsDiv = document.getElementById(context === 'purchase' ? 'purchaseSearchResults' : 'searchResults');

        if (resultsDiv) resultsDiv.style.display = 'none';

        if (typeof showToast === 'function') showToast(`تمت إضافة "${name}" بنجاح ⚡`, 'success');

    } catch (err) {

        console.error("Fast Add Error:", err);

        alert("حدث خطأ أثناء الإضافة السريعة");

    }

}

// دالة حساب الرصيد المتوقع بعد المرتجع

function updateProjectedAccountBalance(type) {

    if (type !== 'sales' && type !== 'purchase') return;

    const isSales = type === 'sales';

    const prefix = isSales ? 'sr' : 'pr';

    const selectId = isSales ? 'sales-return-sectionPaymentMethodSelect' : 'purchase-return-sectionPaymentMethodSelect';

    const amountId = isSales ? 'returnTotalAmount' : 'purReturnTotalAmount';

    const accountCard = document.getElementById(prefix + 'ReturnAccountCard');

    const container = document.getElementById(prefix + 'AccAfterReturnContainer');

    const balanceAfterEl = document.getElementById(prefix + 'AccBalanceAfter');

    const currentBalanceEl = document.getElementById(prefix + 'AccBalance');

    if (!accountCard || accountCard.style.display === 'none') {

        if (container) container.style.display = 'none';

        return;

    }

    const selectEl = document.getElementById(selectId);

    const amountEl = document.getElementById(amountId);

    if (!selectEl || !amountEl || !container || !balanceAfterEl || !currentBalanceEl) return;

    const paymentMethod = selectEl.value;

    const returnTotal = parseFloat(amountEl.innerText) || 0;

    // استخراج الرصيد الحالي من الخاصية المخفية التي وضعناها في دالة التحديث

    let currentBalance = parseFloat(currentBalanceEl.dataset.rawBalance) || 0;

    // إذا كان المرتجع نقدي، الرصيد لن يتأثر - نعرضه كما هو مع وصف

    if (paymentMethod.includes('نقدي')) {

        container.style.display = 'block';

        balanceAfterEl.innerText = Math.abs(currentBalance).toFixed(2);

        if (currentBalance > 0) {

            balanceAfterEl.style.color = isSales ? '#dc2626' : '#be123c';

            balanceAfterEl.innerText += ' (عليه - لم يتغير)';

        } else if (currentBalance < 0) {

            balanceAfterEl.style.color = '#16a34a';

            balanceAfterEl.innerText += ' (له - لم يتغير)';

        } else {

            balanceAfterEl.style.color = '#333';

            balanceAfterEl.innerText = '0.00 (خالص)';

        }

        return;

    }

    // إذا كان خصم من حساب العميل أو إضافة لحساب المورد

    let newBalance = currentBalance;

    if (isSales && paymentMethod === 'خصم من حساب العميل') {

        // العميل قام بإرجاع بضاعة، وبالتالي فإن دينه لنا (owes) يقل، أو مستحقاته تزيد (owed)

        // newBalance = owes - (owed + returnTotal) = currentBalance - returnTotal

        newBalance = currentBalance - returnTotal;

    } else if (!isSales && paymentMethod === 'إضافة إلى حساب المورد') {

        // أرجعنا بضاعة للمورد، وبالتالي فإن ديننا للمورد (owes) يقل

        // newBalance = (owes - returnTotal) - owed = currentBalance - returnTotal

        newBalance = currentBalance - returnTotal;

    }

    container.style.display = 'block';

    balanceAfterEl.innerText = Math.abs(newBalance).toFixed(2);

    if (newBalance > 0) {

        // عليه (مدين)

        balanceAfterEl.style.color = isSales ? '#dc2626' : '#be123c';

        balanceAfterEl.innerText += ' (عليه)';

    } else if (newBalance < 0) {

        // له (دائن)

        balanceAfterEl.style.color = '#16a34a';

        balanceAfterEl.innerText += ' (له)';

    } else {

        balanceAfterEl.style.color = '#333';

        balanceAfterEl.innerText = '0.00 (خالص)';

    }

}

// إضافة مستمعات الأحداث للقوائم المنسدلة لطرق الدفع في شاشات المرتجع

setTimeout(() => {

    const sSelect = document.getElementById('sales-return-sectionPaymentMethodSelect');

    if(sSelect) sSelect.addEventListener('change', () => updateProjectedAccountBalance('sales'));

    const pSelect = document.getElementById('purchase-return-sectionPaymentMethodSelect');

    if(pSelect) pSelect.addEventListener('change', () => updateProjectedAccountBalance('purchase'));

}, 1000);

// =========================================================================================
// تم نقل جميع دوال جدول وحسابات وحفظ فواتير المشتريات بالكامل إلى ملف js/purchases.js
// =========================================================================================

// ================= منطق حركة الصنف (History Logic) =================

let historySearchActiveIndex = -1;

function handleHistorySearch(query, event) {
    const resultsDiv = document.getElementById('historySearchResults');
    const input = document.getElementById('historySearch');
    if (!resultsDiv || !input) return;

    // التعامل مع أزرار الكيبورد (ArrowDown, ArrowUp, Enter, Escape)
    if (event) {
        const items = resultsDiv.querySelectorAll('.result-item');
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (items.length > 0) {
                historySearchActiveIndex = (historySearchActiveIndex + 1) % items.length;
                updateHistorySearchHighlight(items);
            }
            return;
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (items.length > 0) {
                historySearchActiveIndex = (historySearchActiveIndex - 1 + items.length) % items.length;
                updateHistorySearchHighlight(items);
            }
            return;
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (items.length > 0 && historySearchActiveIndex >= 0 && historySearchActiveIndex < items.length) {
                items[historySearchActiveIndex].click();
            } else if (items.length > 0) {
                items[0].click(); // اختيار أول صنف إذا لم يتم التحديد
            } else {
                resultsDiv.style.display = 'none';
                renderHistoryTable(input.value.trim());
            }
            return;
        } else if (event.key === 'Escape') {
            resultsDiv.style.display = 'none';
            historySearchActiveIndex = -1;
            return;
        }
    }

    historySearchActiveIndex = -1;
    resultsDiv.innerHTML = '';

    if (!query || !query.trim()) { 
        resultsDiv.style.display = 'none'; 
        renderHistoryTable(); 
        return; 
    }

    // البحث في قاعدة البيانات لاقتراح الصنف
    const lowerQuery = query.toLowerCase().trim();
    const filtered = (productsDB || []).filter(p =>
        (p.name && p.name.toLowerCase().includes(lowerQuery)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(lowerQuery)) ||
        (p.sysCode && String(p.sysCode).toLowerCase().includes(lowerQuery)) ||
        (p.code && String(p.code).toLowerCase().includes(lowerQuery))
    ).slice(0, 50);

    if (filtered.length > 0) {
        resultsDiv.style.display = 'block';

        filtered.forEach((p, idx) => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.setAttribute('data-index', idx);
            div.style.cssText = 'padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-weight: 700; transition: 0.15s;';
            
            const codeSpan = p.code ? `<span style="font-size:0.75rem; color:#94a3b8; margin-right:8px;">#${p.code}</span>` : '';
            const curStock = getActiveWarehouseStock(p);
            div.innerHTML = `<span>📦 ${p.name} ${codeSpan}</span><span style="font-size:0.8rem; color:#059669; font-weight:900;">${curStock} ${p.unit || ''}</span>`;

            div.onmouseover = () => {
                historySearchActiveIndex = idx;
                updateHistorySearchHighlight(resultsDiv.querySelectorAll('.result-item'));
            };

            div.onclick = () => {
                input.value = p.name;
                resultsDiv.style.display = 'none';
                historySearchActiveIndex = -1;
                renderHistoryTable(p.name);
            };

            resultsDiv.appendChild(div);
        });
    } else { 
        resultsDiv.style.display = 'none'; 
    }
}

function updateHistorySearchHighlight(items) {
    items.forEach((item, i) => {
        if (i === historySearchActiveIndex) {
            item.classList.add('selected');
            item.style.backgroundColor = '#f3e8ff';
            item.style.color = 'var(--main-purple)';
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            item.classList.remove('selected');
            item.style.backgroundColor = '';
            item.style.color = '';
        }
    });
}

function toggleHistoryColumn(index, isVisible) {

    const cells = document.querySelectorAll(`.col-hist-${index}`);

    cells.forEach(c => c.style.display = isVisible ? '' : 'none');

    // حفظ التفضيلات

    let historyCols = JSON.parse(getStore('pos_hist_cols') || '{}');

    historyCols[index] = isVisible;

    setStore('pos_hist_cols', JSON.stringify(historyCols));

}

function applyHistoryColumnVisibility() {

    let historyCols = JSON.parse(getStore('pos_hist_cols') || '{"0":true,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true,"7":true,"8":true,"9":true,"10":true}');

    for (let i = 0; i <= 10; i++) {

        const isVisible = historyCols[i] !== false;

        toggleHistoryColumn(i, isVisible);

        // تحديث الشيك بوكس في القائمة المنبثقة

        const checkbox = document.querySelector(`#historyColCheckboxes input[onchange*="(${i},"]`);

        if (checkbox) checkbox.checked = isVisible;

    }

}

// متخصص لفلترة الفترة في صفحة الحركة

function applyHistoryPeriodFilter(period) {

    const fromInput = document.getElementById('historyDateFrom');

    const toInput = document.getElementById('historyDateTo');

    const customDatesDiv = document.getElementById('historyCustomDates');

    const today = new Date();

    const todayStr = today.toLocaleDateString('en-CA');

    if (period === 'custom') {

        customDatesDiv.style.opacity = '1';

        customDatesDiv.style.pointerEvents = 'auto';

        return; // نترك المستخدم يختار

    }

    if (period === 'today') {

        fromInput.value = todayStr;

        toInput.value = todayStr;

    } else if (period === 'yesterday') {

        const yest = new Date();

        yest.setDate(yest.getDate() - 1);

        const yestStr = yest.toLocaleDateString('en-CA');

        fromInput.value = yestStr;

        toInput.value = yestStr;

    } else if (period === 'last7days') {

        const last7 = new Date();

        last7.setDate(last7.getDate() - 7);

        fromInput.value = last7.toLocaleDateString('en-CA');

        toInput.value = todayStr;

    } else if (period === 'thismonth') {

        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

        fromInput.value = firstDay.toLocaleDateString('en-CA');

        toInput.value = todayStr;

    } else if (period === 'all') {

        fromInput.value = '';

        toInput.value = '';

    }

    renderHistoryTable();

    if (typeof saveCurrentTabState === 'function') saveCurrentTabState();

}

// دالة حساب الرصيد التاريخي لكل حركة بالترتيب الزمني الدقيق (الكمية بعد العملية)
function computeHistoricalStockMap() {
    const resultMap = new Map();
    const db = window.productsDB || [];
    const productCurrentStockMap = {};
    const productUnitsMap = {};
    db.forEach(p => {
        if (p.name) {
            const key = p.name.trim();
            productCurrentStockMap[key] = parseFloat(p.stock) || 0;
            productUnitsMap[key] = p.units || [];
        }
    });

    // تجميع الحركات المخزنية لكل صنف بالتسلسل الزمني الأصلي
    const productTransMap = {};
    transactions.forEach((t, i) => {
        if (!t.product) return;
        const pName = t.product.trim();
        if (!productTransMap[pName]) productTransMap[pName] = [];
        productTransMap[pName].push({ trans: t, origIndex: i });
    });

    Object.keys(productTransMap).forEach(pName => {
        const transList = productTransMap[pName];
        const currentStock = (productCurrentStockMap[pName] !== undefined) ? productCurrentStockMap[pName] : 0;
        const pUnits = productUnitsMap[pName] || [];

        let totalDelta = 0;
        const deltas = transList.map(item => {
            const t = item.trans;
            let factor = parseFloat(t.unitFactor) || 1;
            if (t.unit && pUnits.length > 0) {
                const u = pUnits.find(un => un.unitName === t.unit);
                if (u) factor = parseFloat(u.factor) || 1;
            }
            const rawQty = (parseFloat(t.qty) || 0) * factor;
            const type = t.type || '';

            let delta = 0;
            if (type.includes('شراء') && !type.includes('مرتجع')) {
                delta = rawQty;
            } else if (type.includes('مرتجع بيع')) {
                delta = rawQty;
            } else if (type.includes('بيع') && !type.includes('مرتجع')) {
                delta = -rawQty;
            } else if (type.includes('مرتجع شراء')) {
                delta = -rawQty;
            } else if (type.includes('تسوية')) {
                if (type.includes('+')) delta = Math.abs(rawQty);
                else if (type.includes('-')) delta = -Math.abs(rawQty);
                else delta = rawQty;
            }
            totalDelta += delta;
            return delta;
        });

        // الرصيد الابتدائي للصنف قبل كافة العمليات المسجلة
        let runningStock = currentStock - totalDelta;

        // حساب الرصيد التراكمي بعد كل عملية تاريخياً
        transList.forEach((item, idx) => {
            runningStock += deltas[idx];
            const finalBal = (item.trans.balanceAfter !== undefined && item.trans.balanceAfter !== null && !isNaN(parseFloat(item.trans.balanceAfter)))
                ? parseFloat(item.trans.balanceAfter)
                : runningStock;

            resultMap.set(item.origIndex, finalBal);
        });
    });

    return resultMap;
}
window.computeHistoricalStockMap = computeHistoricalStockMap;

function renderHistoryTable(filterName = null) {

    const tbody = document.getElementById('historyTableBody');

    const fromDate = document.getElementById('historyDateFrom').value;

    const toDate = document.getElementById('historyDateTo').value;

    const typeFilter = document.getElementById('historyTypeFilter').value;

    const methodFilter = document.getElementById('historyMethodFilter').value;

    if (!filterName) {

        const searchVal = document.getElementById('historySearch')?.value?.trim();

        if (searchVal) filterName = searchVal;

    }

    tbody.innerHTML = '';

    // إضافة index أصلي لكل عنصر للتمكن من حذفه وحساب رصيده بشكل صحيح

    let data = transactions.map((t, i) => ({ ...t, originalIndex: i }));

    // 1. فلترة إجبارية: عرض الحركات المخزنية فقط (استبعاد القبض والصرف المالي البحت)

    data = data.filter(t => ['بيع', 'شراء', 'مرتجع', 'تسوية', 'تحويل'].some(k => t.type.includes(k)));

    // 2. فلترة الأصناف: استبعاد سجلات الرأس (Head) التي لا تحتوي على صنف فعلي

    data = data.filter(t => t.product);

    // فلترة بالتاريخ

    if (fromDate) data = data.filter(t => t.dateISO >= fromDate && t.dateISO !== undefined);

    if (toDate) data = data.filter(t => t.dateISO <= toDate && t.dateISO !== undefined);

    if (typeFilter && typeFilter !== 'all') {

        if (typeFilter === 'بيع') {

            data = data.filter(t => t.type.includes('بيع') && !t.type.includes('مرتجع'));

        } else if (typeFilter === 'شراء') {

            data = data.filter(t => t.type.includes('شراء') && !t.type.includes('مرتجع'));

        } else {

            data = data.filter(t => t.type.includes(typeFilter));

        }

    }

    // فلترة بطريقة السداد

    if (methodFilter !== 'all') {

        if (methodFilter === 'cash') {

            data = data.filter(t => t.method && (t.method.includes('نقدية') || t.method.includes('نقدي') || t.method.includes('فودافون')));

        } else if (methodFilter === 'credit') {

            data = data.filter(t => t.method && t.method.includes('آجل'));

        }

    }

    // فلترة بالاسم (إذا تم تمريره)

    if (filterName) {

        data = data.filter(t => (t.product && t.product.toLowerCase().includes(filterName.toLowerCase())));

    }

    const historyBalMap = computeHistoricalStockMap();

    let rowsHtml = '';
    data.forEach(t => {
        const isSelected = (selectedHistoryIndex === t.originalIndex);
        const histBal = historyBalMap.get(t.originalIndex);
        let balHtml = '<span class="hist-balance-zero">—</span>';
        if (histBal !== undefined && histBal !== null && !isNaN(histBal)) {
            const num = parseFloat(histBal);
            const formattedBal = num % 1 === 0 ? num : num.toFixed(2);
            if (num > 0) {
                balHtml = `<span class="hist-balance-up">▲ ${formattedBal}</span>`;
            } else if (num < 0) {
                balHtml = `<span class="hist-balance-down">▼ ${Math.abs(formattedBal)}</span>`;
            } else {
                balHtml = `<span class="hist-balance-zero">0</span>`;
            }
        }

        rowsHtml += `
            <tr class="${isSelected ? 'selected-row' : ''}" onclick="selectHistoryRow(${t.originalIndex})">
                <td class="col-hist-0"><input type="radio" name="histRad" ${isSelected ? 'checked' : ''}></td>
                <td class="col-hist-1"><span style="background:#eee; padding:2px 6px; border-radius:4px; font-weight:bold;">${t.invoiceId || '-'}</span></td>
                <td class="col-hist-2">${t.date}</td>
                <td class="col-hist-3">
                    <span class="stock-badge ${t.type.includes('بيع') ? (t.type.includes('مرتجع') ? 'badge-return' : 'badge-sale') :
                        (t.type.includes('شراء') ? (t.type.includes('مرتجع') ? 'badge-return' : 'badge-purchase') :
                        (t.type.includes('تسوية') ? (t.type.includes('-') ? 'badge-return' : 'badge-adj') :
                        (t.type.includes('تحويل') ? 'badge-adj' :
                        (t.type.includes('قبض') ? 'badge-receipt' : (t.type.includes('صرف') ? 'badge-disburse' : '')))))}">
                        ${t.type}
                    </span>
                </td>
                <td class="col-hist-4" style="font-weight:bold;">${t.product || '-'}${t.size || t.color ? `<span style="font-size:0.75rem; color:#64748b; margin-right:4px;">(${[t.size, t.color].filter(Boolean).join(' - ')})</span>` : ''}</td>
                <td class="col-hist-5" style="font-weight: 800; ${t.type.includes('تسوية') ? (t.type.includes('+') ? 'color: #059669;' : (t.type.includes('-') ? 'color: #dc2626;' : '')) : ''}">${t.type.includes('تسوية') ? (t.type.includes('+') ? '+' : (t.type.includes('-') ? '-' : '')) : ''}${t.qty || 0}</td>
                <td class="col-hist-6">${t.price || 0}</td>
                <td class="col-hist-7" style="font-weight:bold; color:var(--main-blue);">${t.total || 0}</td>
                <td class="col-hist-8">${t.partner || '-'}</td>
                <td class="col-hist-9" style="font-size:0.75rem; color:#64748b;">${t.editDate || '-'}</td>
                <td class="col-hist-10" style="font-size:0.85rem; color:#0f766e; font-weight:bold;">${t.user || '-'}</td>
                <td class="col-hist-11" style="text-align:center; font-weight:900;">${balHtml}</td>
            </tr>`;
    });

    tbody.innerHTML = rowsHtml || `<tr><td colspan="12" style="text-align:center; padding:20px;">لا توجد حركات مسجلة</td></tr>`;

    if (document.getElementById('historyBadgeCount')) document.getElementById('historyBadgeCount').innerText = 'عدد: ' + data.length;

    if (typeof applyHistoryColumnVisibility === 'function') {

        applyHistoryColumnVisibility();

    }

}

// متغيرات للتحكم في ظهور الأعمدة مع الحفظ في localStorage

let invoicesColumnVisibility = JSON.parse(getStore('pos_inv_cols_visible') || '{"0":true,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true,"7":true,"8":true,"9":true,"10":true,"11":true,"12":true,"13":true}');

// دالة لتحديث أنماط الجدول بالكامل دفعة واحدة (تمنع الترحيل وتدعم الأداء)

function updateInvoicesTableStyles() {

    let styleEl = document.getElementById('style-invoices-cols-global');

    if (!styleEl) {

        styleEl = document.createElement('style');

        styleEl.id = 'style-invoices-cols-global';

        document.head.appendChild(styleEl);

    }

    let css = '';

    for (let i = 0; i <= 13; i++) {

        if (invoicesColumnVisibility[i] === false) {

            css += `#invoicesMainTable .col-inv-${i} { display: none !important; }\n`;

        }

    }

    styleEl.innerHTML = css;

}

// دالة لتهيئة ظهور الأعمدة عند تحميل الصفحة

function initInvoicesColumns() {

    updateInvoicesTableStyles();

    // مزامنة حالة مربعات الاختيار في نافذة التخصيص
    for (let i = 0; i <= 13; i++) {
        const isVisible = invoicesColumnVisibility[i] !== false;
        const checkbox = document.querySelector(`#invoicesColSelectorPopup input[onchange*="(${i},"]`);
        if (checkbox) checkbox.checked = isVisible;
    }

}

function setInvoicesView(view) {

    currentInvoicesView = view;

    // تحديث شكل الأزرار

    const opBtn = document.getElementById('viewOperationBtn');

    const itBtn = document.getElementById('viewItemsBtn');

    if (view === 'operation') {

        opBtn.style.background = '#34495e'; opBtn.style.color = 'white';

        itBtn.style.background = '#ecf0f1'; itBtn.style.color = '#7f8c8d';

    } else {

        itBtn.style.background = '#34495e'; itBtn.style.color = 'white';

        opBtn.style.background = '#ecf0f1'; opBtn.style.color = '#7f8c8d';

    }

    renderInvoicesTable();

}

function toggleInvoicesColumn(index, isVisible, shouldSave = true) {

    invoicesColumnVisibility[index] = isVisible;

    if (shouldSave) {

        setStore('pos_inv_cols_visible', JSON.stringify(invoicesColumnVisibility));

    }

    updateInvoicesTableStyles();

}

function setInvoicesTypeFilter(type, btn) {

    // إزالة الحالة النشطة من جميع التبويبات

    document.querySelectorAll('.invoice-tab').forEach(t => t.classList.remove('active'));

    // إضافة الحالة النشطة للتبويب المختار

    btn.classList.add('active');

    // تحديث قيمة الـ select المخفية للحفاظ على التوافق مع الكود الحالي

    const filterEl = document.getElementById('invoicesTypeFilter');

    if (filterEl) {

        filterEl.value = type;

        // استدعاء التحديث

        renderInvoicesTable();

    }

}

function handleGeneralAccountSearch(query, inputId, resultsId) {

    const resultsDiv = document.getElementById(resultsId);

    resultsDiv.innerHTML = '';

    // إظهار/إخفاء زر الحذف (X)

    const clearBtn = document.getElementById(inputId + 'Clear');

    if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

    if (!query) {

        resultsDiv.style.display = 'none';

        // تصفير الرصيد عند مسح الاسم

        const balId = (inputId === 'receiptCustomer') ? 'receiptAccountBalance' : 'disburseAccountBalance';

        const balEl = document.getElementById(balId);

        if (balEl) balEl.innerText = '0.00';

        return;

    }

    // البحث بالاسم أو الكود
    const queryLower = query.toLowerCase();
    const filtered = accounts.filter(a => a.name.toLowerCase().includes(queryLower) || (a.code && a.code.toString().includes(query)));

    // إذا تم كتابة اسم حساب مطابق تماماً، يتم حديث الرصيد فوراً
    const exactMatch = accounts.find(a => a.name.trim().toLowerCase() === query.trim().toLowerCase());
    if (exactMatch && (inputId === 'receiptCustomer' || inputId === 'disbursePayee')) {
        const bal = typeof getAccountBalance === 'function' ? getAccountBalance(exactMatch.name) : (exactMatch.balance || 0);
        const formattedBal = (bal < 0 ? '-' : '') + Math.abs(bal).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const balId = (inputId === 'receiptCustomer') ? 'receiptAccountBalance' : 'disburseAccountBalance';
        const balEl = document.getElementById(balId);
        if (balEl) balEl.innerText = formattedBal;
    }

    if (filtered.length > 0) {

        resultsDiv.style.display = 'block';

        filtered.forEach(a => {

            const div = document.createElement('div');

            div.className = 'result-item';

            div.innerHTML = `<span>${a.name}</span> <span class="stock-badge">${a.type === 'client' ? 'عميل' : (a.type === 'supplier' ? 'مورد' : a.type)}</span>`;

            div.onclick = () => {

                document.getElementById(inputId).value = a.name;

                resultsDiv.style.display = 'none';

                // إظهار زر X للمسح

                if (clearBtn) clearBtn.style.display = 'block';

                // تحديث الرصيد للمعلومات فقط

                if (inputId === 'receiptCustomer' || inputId === 'disbursePayee') {
                    const bal = typeof getAccountBalance === 'function' ? getAccountBalance(a.name) : (a.balance || 0);
                    const formattedBal = (bal < 0 ? '-' : '') + Math.abs(bal).toLocaleString('en-US', { minimumFractionDigits: 2 });
                    const balId = (inputId === 'receiptCustomer') ? 'receiptAccountBalance' : 'disburseAccountBalance';
                    const balEl = document.getElementById(balId);
                    if (balEl) balEl.innerText = formattedBal;
                }

            };

            resultsDiv.appendChild(div);

        });

    } else {

        // خيار الإضافة السريعة

        resultsDiv.style.display = 'block';

        resultsDiv.innerHTML = `

                <div class="result-item" onclick="quickAddAccount('${query}')" style="color:var(--main-green); font-weight:bold; justify-content:center;">

                <span>➕ إضافة سريع: ${query}</span>

                </div>

                `;

    }

}

function clearAccountSearch(inputId, balanceId) {

    const input = document.getElementById(inputId);

    if (input) {

        input.value = '';

        input.focus();

    }

    if (document.getElementById(balanceId)) document.getElementById(balanceId).innerText = '0.00';

    if (document.getElementById(inputId + 'Clear')) document.getElementById(inputId + 'Clear').style.display = 'none';

    const resultsId = (inputId === 'receiptCustomer') ? 'receiptSearchResults' : 'disburseSearchResults';

    const resultsDiv = document.getElementById(resultsId);

    if (resultsDiv) {

        resultsDiv.innerHTML = '';

        resultsDiv.style.display = 'none';

    }

}

let currentCustomerSearchIndex = -1;

async function handleCustomerSearch(query) {
    const resultsDiv = document.getElementById('customerSearchResults');
    if (!resultsDiv) return;
    resultsDiv.innerHTML = '';
    currentCustomerSearchIndex = -1;

    if (!query || !query.trim()) {
        resultsDiv.style.display = 'none';
        return;
    }

    const queryLower = query.toLowerCase().trim();
    const combined = accounts.filter(a =>
        (a.name && a.name.toLowerCase().includes(queryLower)) ||
        (a.code && a.code.toString().includes(queryLower)) ||
        (a.mobile && a.mobile.includes(queryLower))
    );

    if (combined.length > 0) {
        resultsDiv.style.display = 'block';
        combined.forEach((a, idx) => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.setAttribute('data-index', idx);
            div.innerHTML = `<span>${a.name}</span> <span class="stock-badge">${a.type === 'client' ? 'عميل' : (a.type === 'mixed' ? 'مشترك' : 'حساب')}</span>`;
            div.onclick = () => selectCustomerSearchResult(a);
            resultsDiv.appendChild(div);
        });
    } else {
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `
            <div class="result-item" onclick="quickAddAccount('${query.replace(/'/g, "\\'")}')" style="color:var(--main-green); font-weight:bold; justify-content:center;">
                <span>➕ إضافة عميل جديد: ${query}</span>
            </div>
        `;
    }
}

function selectCustomerSearchResult(a) {
    const custInput = document.getElementById('customerName');
    if (custInput) custInput.value = a.name;

    const resultsDiv = document.getElementById('customerSearchResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'none';
    }

    currentCustomerSearchIndex = -1;

    // تحديث مستوى السعر تلقائياً بناءً على بيانات العميل (فقط إذا لم يكن مثبتاً بالدبوس 📌)
    if (typeof isPriceLevelPinned === 'function' && !isPriceLevelPinned()) {
        if (a.priceLevel === 'wholesale') {
            const pl = document.getElementById('salesPriceLevel');
            if (pl) {
                pl.value = 'wholesale';
                updateCartPriceLevel();
            }
        } else {
            const pl = document.getElementById('salesPriceLevel');
            if (pl) {
                pl.value = 'retail';
                updateCartPriceLevel();
            }
        }
    }

    updateHeaderPartnerInfo();

    // تحديث المتغير العالمي عند اختيار العميل
    currentSessionSelectedAddress = (a.address || '').split(/[|,]/)[0];

    if (typeof calculateChange === 'function') calculateChange();

    if (typeof checkAccountFrozenAndAlert === 'function') {
        checkAccountFrozenAndAlert(a);
    }

    if (typeof updateActiveTabTitle === 'function') {
        updateActiveTabTitle(a.name, 'بيع');
    }

    // الانتقال للبحث عن الصنف تلقائياً
    const pSearch = document.getElementById('productSearch');
    if (pSearch) pSearch.focus();
}

function handleCustomerSearchKeydown(e) {
    const resultsDiv = document.getElementById('customerSearchResults');
    if (!resultsDiv || resultsDiv.style.display === 'none') {
        if (e.key === 'Enter') {
            e.preventDefault();
            const pSearch = document.getElementById('productSearch');
            if (pSearch) pSearch.focus();
        }
        return;
    }

    const items = resultsDiv.querySelectorAll('.result-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentCustomerSearchIndex = (currentCustomerSearchIndex + 1) % items.length;
        updateCustomerSearchHighlight(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentCustomerSearchIndex = (currentCustomerSearchIndex - 1 + items.length) % items.length;
        updateCustomerSearchHighlight(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentCustomerSearchIndex >= 0 && items[currentCustomerSearchIndex]) {
            items[currentCustomerSearchIndex].click();
        } else if (items.length === 1) {
            items[0].click();
        } else {
            resultsDiv.style.display = 'none';
            const pSearch = document.getElementById('productSearch');
            if (pSearch) pSearch.focus();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        resultsDiv.style.display = 'none';
    }
}

function updateCustomerSearchHighlight(items) {
    items.forEach((item, idx) => {
        if (idx === currentCustomerSearchIndex) {
            item.classList.add('selected');
            item.style.background = 'rgba(39, 174, 96, 0.15)';
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
            item.style.background = '';
        }
    });
}

function quickAddAccount(name) {

    openNewAccountModal();

    document.getElementById('accName').value = name;

    // إخفاء قوائم البحث المفتوحة

    document.querySelectorAll('.search-results').forEach(el => el.style.display = 'none');

}

// ================= نظام التنقل في البحث بالكيبورد =================

let searchSelectedIndex = -1;

let currentHeaderProductId = null; let currentHeaderUnit = null; // لتتبع الصنف المختار حالياً في الهيدر قبل الحفظ

// دالة لاختيار الصنف وتعبئة بياناته في الهيدر (المربعات الملونة) قبل الحفظ

async function selectProductToHeader(productId) {

    const product = (typeof productsDB !== 'undefined' && Array.isArray(productsDB))
        ? productsDB.find(p => p.id == productId)
        : await db.products.get(productId);

    if (!product) return;

    const resultsDiv = document.getElementById('searchResults');
    if (resultsDiv) resultsDiv.style.display = 'none';
    searchSelectedIndex = -1;

    // إذا كان للصنف تشكيلة مقاسات وألوان ونظام المقاسات مفعل، نفتح نافذة المقاسات والألوان فوراً
    const isVariantsActive = document.body.classList.contains('bayan-variants-enabled');
    if (isVariantsActive && product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        showVariantSelectionModal(product, 'sales');
        const pSearch = document.getElementById('productSearch');
        if (pSearch) pSearch.value = '';
        return;
    }

    currentHeaderProductId = productId; // تخزين الـ ID الحالي

    const pSearch = document.getElementById('productSearch');
    const hQty = document.getElementById('headerQty');
    const hPrice = document.getElementById('headerPrice');

    // 1. كتابة اسم الصنف في مربع البحث
    if (pSearch) pSearch.value = product.name;

    // 2. تحديد السعر التلقائي بناءً على مستوى السعر
    if (hPrice) {
        const priceLevelSelect = document.getElementById('salesPriceLevel');
        const priceLevel = priceLevelSelect ? priceLevelSelect.value : 'retail';

        // البحث عن وحدة البيع الافتراضية إذا وُجدت
        let defaultPrice = product.price;
        if (product.units && product.units.length > 1) {
            if (resultsDiv) resultsDiv.style.display = 'none';
            showUnitSelectionModal(product, 'sales-header');
            return; // Stop here, the modal will complete the action

        } else if (product.units && product.units.length === 1) {

            const defUnit = product.units[0];

            defaultPrice = (priceLevel === 'wholesale') ? (defUnit.wholesale || defUnit.price) : defUnit.price;

            currentHeaderUnit = defUnit;

        } else {

            defaultPrice = (priceLevel === 'wholesale') ? (product.wholesale || product.price) : product.price;

            currentHeaderUnit = null;

        }

        hPrice.value = parseFloat(defaultPrice).toFixed(2);

    }

    // 3. تصفير الكمية لـ 1 والتركيز عليها (دورة الإنتر تبدأ هنا)

    if (hQty) {

        hQty.value = 1;

        hQty.focus();

        setTimeout(() => hQty.select(), 10);

    }

    // 4. إخفاء نتائج البحث

    if (resultsDiv) resultsDiv.style.display = 'none';

    return;

}

async function handleSearch(query) {

    const resultsDiv = document.getElementById('searchResults');

    searchSelectedIndex = -1; // إعادة تصغير المؤشر عند كل كتابة جديدة

    // منع قص النوافذ المنبثقة الجديدة وإلغاء القيود القديمة للفئة search-results
    resultsDiv.style.setProperty('overflow', 'visible', 'important');
    resultsDiv.style.setProperty('max-height', 'none', 'important');
    resultsDiv.style.setProperty('border', 'none', 'important');
    resultsDiv.style.setProperty('background', 'transparent', 'important');
    resultsDiv.style.setProperty('box-shadow', 'none', 'important');

    if (!query) {

        resultsDiv.innerHTML = '';

        resultsDiv.style.display = 'none';

        return;

    }

    // 1. فحص باركود أو كود (تطابق تام صريح)

    if (query.length >= 8) {

        let exact = await db.products.where('barcode').equals(query).first();

        if (!exact) exact = await db.products.where('code').equals(query).first();

        if (exact) {

            selectProductToHeader(exact.id);

            return;

        }

    }

    // 2. البحث الحي (Live Search)

    const queryLower = query.toLowerCase();

    const filtered = [];
    for (let i = 0; i < productsDB.length; i++) {
        const p = productsDB[i];
        if (
            (p.name && p.name.toLowerCase().includes(queryLower)) ||
            (p.barcode && String(p.barcode).toLowerCase().includes(queryLower)) ||
            (p.code && String(p.code).toLowerCase().includes(queryLower))
        ) {
            filtered.push(p);
            if (filtered.length >= 10) break;
        }
    }

    if (filtered.length > 0) {
        const settings = JSON.parse(getStore('pos_settings') || '{}');
        const bType = settings.businessType || 'clothing';
        const currSymbol = settings.currencySymbol || 'ج.م';
        const isSupermarket = (bType === 'supermarket');

        let tableHeaderHTML = '';
        let tableRowsHTML = '';
        const panelWidth = isSupermarket ? 'max-width: 820px; width: 95%;' : 'max-width: 560px; width: 92%;';

        if (isSupermarket) {
            // نمط السوبر ماركت والمواد الغذائية: عرض البيانات الموسعة بحجم أنيق وملموم (اسم الصنف، الكود/الباركود، التصنيف، المخزون، سعر الجملة، آخر شراء، متوسط التكلفة، القطاعي)
            tableHeaderHTML = `
                <tr style="background: #f8fafc; color: #334155; font-size: 0.76rem; font-weight: 900; border-bottom: 2px solid #cbd5e1; position: sticky; top: 0; z-index: 2;">
                    <th style="padding: 7px 10px; text-align: right; white-space: nowrap;">اسم الصنف</th>
                    <th style="padding: 7px 4px; text-align: center; white-space: nowrap; width: 110px;">الكود / الباركود</th>
                    <th style="padding: 7px 4px; text-align: center; white-space: nowrap; width: 75px;">التصنيف</th>
                    <th style="padding: 7px 4px; text-align: center; white-space: nowrap; width: 70px;">المخزون</th>
                    <th style="padding: 7px 4px; text-align: center; white-space: nowrap; width: 75px;">الجملة</th>
                    <th style="padding: 7px 4px; text-align: center; white-space: nowrap; width: 75px;">آخر شراء</th>
                    <th style="padding: 7px 4px; text-align: center; white-space: nowrap; width: 75px;">متوسط التكلفة</th>
                    <th style="padding: 7px 8px; text-align: center; white-space: nowrap; width: 85px;">القطاعي</th>
                </tr>
            `;

            tableRowsHTML = filtered.map(p => {
                const priceVal = parseFloat(p.price) || 0;
                const wholesaleVal = parseFloat(p.wholesale) || 0;
                const stockVal = getActiveWarehouseStock(p);
                const lastPurchase = typeof getProductLastPurchasePrice === 'function' ? getProductLastPurchasePrice(p.name, p.cost) : (parseFloat(p.cost) || 0);
                const avgCost = typeof getProductAverageCost === 'function' ? getProductAverageCost(p.name, p.cost) : (parseFloat(p.cost) || 0);

                const stockColor = stockVal <= 0 ? '#dc2626' : (stockVal <= 5 ? '#d97706' : '#059669');
                const stockBg = stockVal <= 0 ? '#fee2e2' : (stockVal <= 5 ? '#fef3c7' : '#ecfdf5');
                return `
                    <tr class="pos-search-row" onclick="selectProductToHeader(${p.id});" 
                        style="border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.1s ease; user-select: none;"
                        onmouseenter="this.style.background='#f1f5f9';"
                        onmouseleave="if(!this.classList.contains('active-search-row')) this.style.background='';">
                        <td style="padding: 6px 10px; font-weight: 800; color: #0f172a; white-space: nowrap; font-size: 0.84rem;">
                            ${p.name}
                        </td>
                        <td style="padding: 6px 4px; text-align: center; white-space: nowrap;">
                            <span style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 800; color: #475569; font-family: monospace;">
                                ${p.code || p.id}${p.barcode ? ` | ${p.barcode}` : ''}
                            </span>
                        </td>
                        <td style="padding: 6px 4px; text-align: center; white-space: nowrap;">
                            <span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 800;">
                                ${p.category || 'عام'}
                            </span>
                        </td>
                        <td style="padding: 6px 4px; text-align: center; white-space: nowrap;">
                            <span style="background: ${stockBg}; color: ${stockColor}; padding: 2px 6px; border-radius: 4px; font-weight: 900; font-size: 0.76rem;">
                                ${stockVal} ${p.unit || ''}
                            </span>
                        </td>
                        <td style="padding: 6px 4px; text-align: center; font-weight: 800; color: #2563eb; font-size: 0.8rem; white-space: nowrap;">
                            ${wholesaleVal > 0 ? wholesaleVal.toFixed(2) : '-'}
                        </td>
                        <td style="padding: 6px 4px; text-align: center; font-weight: 800; color: #d97706; font-size: 0.8rem; white-space: nowrap;">
                            ${lastPurchase > 0 ? lastPurchase.toFixed(2) : '-'}
                        </td>
                        <td style="padding: 6px 4px; text-align: center; font-weight: 800; color: #7c3aed; font-size: 0.8rem; white-space: nowrap;">
                            ${avgCost > 0 ? avgCost.toFixed(2) : '-'}
                        </td>
                        <td style="padding: 6px 8px; text-align: center; font-weight: 900; color: #047857; font-size: 0.86rem; white-space: nowrap;">
                            ${priceVal.toFixed(2)} ${currSymbol}
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            // نمط محلات الملابس والأحذية والشنط: 4 بيانات أساسية فقط بحجم أنيق ومتوسط في المنتصف (اسم الصنف، الكود، المخزون، وسعر القطاعي)
            tableHeaderHTML = `
                <tr style="background: #f8fafc; color: #334155; font-size: 0.8rem; font-weight: 900; border-bottom: 2px solid #cbd5e1; position: sticky; top: 0; z-index: 2;">
                    <th style="padding: 8px 14px; text-align: right; white-space: nowrap;">اسم الصنف</th>
                    <th style="padding: 8px 10px; text-align: center; white-space: nowrap; width: 95px;">الكود</th>
                    <th style="padding: 8px 10px; text-align: center; white-space: nowrap; width: 85px;">المخزون</th>
                    <th style="padding: 8px 14px; text-align: center; white-space: nowrap; width: 110px;">سعر القطاعي</th>
                </tr>
            `;

            tableRowsHTML = filtered.map(p => {
                const priceVal = parseFloat(p.price) || 0;
                const stockVal = getActiveWarehouseStock(p);
                const stockColor = stockVal <= 0 ? '#dc2626' : (stockVal <= 5 ? '#d97706' : '#059669');
                const stockBg = stockVal <= 0 ? '#fee2e2' : (stockVal <= 5 ? '#fef3c7' : '#ecfdf5');
                return `
                    <tr class="pos-search-row" onclick="selectProductToHeader(${p.id});" 
                        style="border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.1s ease; user-select: none;"
                        onmouseenter="this.style.background='#f1f5f9';"
                        onmouseleave="if(!this.classList.contains('active-search-row')) this.style.background='';">
                        <td style="padding: 8px 14px; font-weight: 800; color: #0f172a; white-space: nowrap; font-size: 0.88rem;">
                            ${p.name}
                        </td>
                        <td style="padding: 8px 8px; text-align: center; white-space: nowrap;">
                            <span style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 800; color: #64748b; font-family: monospace;">
                                ${p.code || p.id}
                            </span>
                        </td>
                        <td style="padding: 8px 8px; text-align: center; white-space: nowrap;">
                            <span style="background: ${stockBg}; color: ${stockColor}; padding: 2px 8px; border-radius: 4px; font-weight: 900; font-size: 0.8rem;">
                                ${stockVal}
                            </span>
                        </td>
                        <td style="padding: 8px 14px; text-align: center; font-weight: 900; color: #047857; font-size: 0.9rem; white-space: nowrap;">
                            ${priceVal.toFixed(2)} ${currSymbol}
                        </td>
                    </tr>
                `;
            }).join('');
        }

        const panelWidthStyle = isSupermarket
            ? 'width: calc(100% + 440px); max-width: 820px; min-width: 340px;'
            : 'width: calc(100% + 340px); max-width: 580px; min-width: 320px;';

        resultsDiv.innerHTML = `
            <div class="pos-search-panel" style="${panelWidthStyle} position: absolute; top: 100%; left: 50%; transform: translateX(50%); z-index: 99999; background: white; border-radius: 14px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); border: 1.5px solid #cbd5e1; direction: rtl; text-align: right; margin-top: 6px; animation: modalFadeIn 0.15s ease-out; overflow: hidden; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: #f8fafc; border-bottom: 1.5px solid #e2e8f0;">
                    <span style="font-weight: 900; font-size: 0.88rem; color: #1e293b;">🔍 نتائج البحث (${filtered.length} صنف)</span>
                    <button onclick="document.getElementById('searchResults').style.display='none';" class="pos-search-close-btn" style="background: #e2e8f0; border: none; width: 24px; height: 24px; border-radius: 50%; font-size: 0.85rem; cursor: pointer; color: #475569; font-weight: 900; display: flex; align-items: center; justify-content: center; transition: 0.15s;" onmouseover="this.style.background='#fee2e2'; this.style.color='#dc2626';" onmouseout="this.style.background='#e2e8f0'; this.style.color='#475569';" title="إغلاق النافذة">✕</button>
                </div>
                <div style="max-height: 360px; overflow-y: auto; overflow-x: auto; scrollbar-gutter: stable;">
                    <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.86rem;">
                        <thead>
                            ${tableHeaderHTML}
                        </thead>
                        <tbody>
                            ${tableRowsHTML}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        resultsDiv.style.display = 'block';
    } else {
        // إذا لم يتم العثور على أي صنف، نظهر خيارات الإضافة
        resultsDiv.innerHTML = `
            <div class="pos-search-panel" style="width: calc(100% + 340px); max-width: 500px; min-width: 300px; position: absolute; top: 100%; left: 50%; transform: translateX(50%); z-index: 99999; margin-top: 6px; animation: modalFadeIn 0.15s ease-out; background: white; border-radius: 14px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); border: 1px solid #cbd5e1; padding: 8px; display: flex; flex-direction: column; gap: 6px;">
                <div class="search-item" onclick="if(typeof fastQuickAddProduct === 'function') fastQuickAddProduct('${query.replace(/'/g, "\\'")}', 'sales');" style="padding: 12px; cursor: pointer; background: #f5f3ff; border: 2px dashed #8e44ad; border-radius: 10px; color: #8e44ad; text-align: center; font-weight: bold; transition: 0.2s;">
                    ⚡ إضافة سريعة ومباشرة: "${query}"
                </div>
                <div class="search-item" onclick="document.getElementById('searchResults').style.display='none'; quickAddProduct('${query.replace(/'/g, "\\'")}', 'sales');" style="padding: 10px; cursor: pointer; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; color: #475569; text-align: center; font-weight: bold; transition: 0.2s;">
                    📝 إضافة تفصيلية لصنف جديد: (${query})
                </div>
            </div>
        `;
        resultsDiv.style.display = 'block';
    }

}

// دالة التحكم في الأسهم والإنتر داخل مربع البحث
window.handleProductSearchKeydown = function (e) {
    const resultsDiv = document.getElementById('searchResults');
    const isVisible = resultsDiv && resultsDiv.style.display !== 'none' && resultsDiv.innerHTML.trim() !== '';
    const items = isVisible ? resultsDiv.querySelectorAll('.pos-search-row, .search-item, .result-item') : [];

    if (e.key === 'ArrowDown') {
        if (isVisible && items.length > 0) {
            e.preventDefault();
            searchSelectedIndex = (searchSelectedIndex + 1) % items.length;
            updateSearchSelection(items);
            return;
        }
    } else if (e.key === 'ArrowUp') {
        if (isVisible && items.length > 0) {
            e.preventDefault();
            searchSelectedIndex = (searchSelectedIndex - 1 + items.length) % items.length;
            updateSearchSelection(items);
            return;
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();

        // 1. إذا كانت قائمة نتائج البحث مفتوحة وفيها عناصر
        if (isVisible && items.length > 0) {
            const targetIdx = (searchSelectedIndex >= 0 && searchSelectedIndex < items.length) ? searchSelectedIndex : 0;
            const targetRow = items[targetIdx];
            if (targetRow) {
                targetRow.click();
                return;
            }
        }

        // 2. إذا كانت القائمة مغلقة (مثل مسح باركود مباشر عبر قارئ الباركود)
        const inputVal = e.target ? e.target.value : (document.getElementById('productSearch')?.value || '');
        handleSearchEnter(inputVal, e);
        return;
    } else if (e.key === 'Escape') {
        if (resultsDiv) resultsDiv.style.display = 'none';
        searchSelectedIndex = -1;
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const hQty = document.getElementById('headerQty');
        if (hQty) hQty.focus();
    }
};

function updateSearchSelection(items) {
    items.forEach((item, index) => {
        if (index === searchSelectedIndex) {
            item.classList.add('active-search-row');
            item.style.background = '#eff6ff';
            item.style.outline = '2px solid #3b82f6';
            item.style.outlineOffset = '-2px';
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.remove('active-search-row');
            item.style.background = '';
            item.style.outline = 'none';
        }
    });
}

function fillSalesHeaderWithUnit(product, unit) {

    currentHeaderProductId = product.id;

    currentHeaderUnit = unit;

    const resultsDiv = document.getElementById('searchResults');

    const pSearch = document.getElementById('productSearch');

    const hQty = document.getElementById('headerQty');

    const hPrice = document.getElementById('headerPrice');

    if (pSearch) pSearch.value = product.name;

    if (hPrice) {

        const priceLevelSelect = document.getElementById('salesPriceLevel');

        const priceLevel = priceLevelSelect ? priceLevelSelect.value : 'retail';

        let p = (priceLevel === 'wholesale') ? (unit.wholesale || unit.price) : unit.price;

        hPrice.value = parseFloat(p).toFixed(2);

    }

    if (hQty) {

        hQty.value = 1;

        hQty.focus();

        setTimeout(() => hQty.select(), 10);

    }

    if (resultsDiv) resultsDiv.style.display = 'none';

}

// =========================================================================
// 🎯 المطابقة الدقيقة للمقاس واللون والباركود (Unified Variant Matcher)
// =========================================================================
window.findMatchingVariant = function(product, item) {
    if (!product || !product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
        return null;
    }
    
    // 1. المطابقة بالباركود الصريح الخاص بالـ Variant
    const targetBarcode = item.selectedVariant?.barcode || item.barcode || (item.code && item.code !== product.code ? item.code : null);
    if (targetBarcode) {
        const vByBarcode = product.variants.find(v => v.barcode && String(v.barcode).trim() === String(targetBarcode).trim());
        if (vByBarcode) return vByBarcode;
    }

    const itemSize = (item.selectedSize || item.size || '').trim().toLowerCase();
    const itemColor = (item.selectedColor || item.color || '').trim().toLowerCase();

    // 2. المطابقة باللون والمقاس معاً
    if (itemSize && itemColor) {
        const vBoth = product.variants.find(v => 
            (v.size || '').trim().toLowerCase() === itemSize && 
            (v.color || '').trim().toLowerCase() === itemColor
        );
        if (vBoth) return vBoth;
    }

    // 3. المطابقة بالمقاس فقط (إذا لم يوجد لون)
    if (itemSize && !itemColor) {
        const vSize = product.variants.find(v => (v.size || '').trim().toLowerCase() === itemSize);
        if (vSize) return vSize;
    }

    // 4. المطابقة باللون فقط (منتجات الألوان فقط كالشنط والمقاس الموحد)
    if (itemColor) {
        const vColor = product.variants.find(v => {
            const vS = (v.size || '').trim().toLowerCase();
            const vC = (v.color || '').trim().toLowerCase();
            return vC === itemColor && (!vS || vS === 'موحد' || vS === 'قياسي' || vS === itemSize);
        });
        if (vColor) return vColor;
    }

    return null;
};

// ⚖️ دالة فك شفرة باركود الميزان الإلكتروني (Scale Barcode Decoder)
// يدعم البادئات القياسية لموازين الباركود: 20، 21، 22، 23، 24، 99 بطول 13 رقم
function parseScaleBarcode(barcodeStr) {
    if (!barcodeStr || typeof barcodeStr !== 'string') return null;
    const clean = barcodeStr.trim();
    if (clean.length !== 13 || !/^\d{13}$/.test(clean)) return null;

    const prefix = clean.substring(0, 2);
    const scalePrefixes = ['20', '21', '22', '23', '24', '99'];
    if (!scalePrefixes.includes(prefix)) return null;

    const itemCode5 = clean.substring(2, 7);
    const itemCode4 = clean.substring(2, 6);
    const itemCodeTrimmed = String(parseInt(itemCode5, 10));

    const rawVal = parseInt(clean.substring(7, 12), 10);
    const weightOrPrice = rawVal / 1000;

    const product = productsDB.find(p => 
        String(p.code) === itemCode5 || 
        String(p.code) === itemCode4 || 
        String(p.code) === itemCodeTrimmed ||
        String(p.barcode) === clean.substring(0, 7) ||
        String(p.barcode) === itemCode5 ||
        String(p.barcode) === itemCodeTrimmed
    );

    if (product) {
        return {
            product: product,
            qty: weightOrPrice > 0 ? weightOrPrice : 1,
            isScale: true
        };
    }
    return null;
}
window.parseScaleBarcode = parseScaleBarcode;

async function handleSearchEnter(query, event, forceAdd = false) {
    if (forceAdd && currentHeaderProductId) {
        addToCart(currentHeaderProductId, typeof currentHeaderUnit !== 'undefined' ? currentHeaderUnit : null);
        return;
    }

    if (!query || query.trim() === "") return;

    const resultsDiv = document.getElementById('searchResults');
    const cleanQuery = String(query).trim();

    // 0. قراءة ومسح باركود الميزان الإلكتروني تلقائياً (Scale Barcode Detection)
    const scaleData = parseScaleBarcode(cleanQuery);
    if (scaleData && scaleData.product) {
        const prod = scaleData.product;
        const hQtyInput = document.getElementById('headerQty');
        const hPriceInput = document.getElementById('headerPrice');
        if (hQtyInput) hQtyInput.value = scaleData.qty;
        if (hPriceInput) {
            const priceLevel = document.getElementById('salesPriceLevel')?.value || 'retail';
            hPriceInput.value = (priceLevel === 'wholesale' && parseFloat(prod.wholesale) > 0) ? (parseFloat(prod.wholesale) || 0).toFixed(2) : (parseFloat(prod.price) || 0).toFixed(2);
        }
        completeAddToCart(prod, null, null, scaleData.qty);
        if (resultsDiv) resultsDiv.style.display = 'none';
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        return;
    }

    // 1. بحث فوري في باركود تشكيلات المقاسات والألوان (Variant Barcode Match)
    let matchingVariant = null;
    let pInDB = productsDB.find(p => {
        if (p.variants && Array.isArray(p.variants)) {
            const vFound = p.variants.find(v => String(v.barcode).trim() === cleanQuery);
            if (vFound) {
                matchingVariant = vFound;
                return true;
            }
        }
        return false;
    });

    if (pInDB && matchingVariant) {
        const vStock = parseFloat(matchingVariant.stock) || 0;
        if (vStock <= 0) {
            const desc = matchingVariant.size 
                ? `المقاس (${matchingVariant.size}) واللون (${matchingVariant.color || 'موحد'}) غير متوفر حالياً بالمخزن (الرصيد 0).`
                : `اللون (${matchingVariant.color || 'موحد'}) غير متوفر حالياً بالمخزن (الرصيد 0).`;
            showToast("⛔ " + desc, "error");
            if (resultsDiv) resultsDiv.style.display = 'none';
            const searchInput = document.getElementById('productSearch');
            if (searchInput) { searchInput.value = ''; searchInput.focus(); }
            return;
        }
        // إذا كان مسح باركود مقاس محدد، نضيفه للسلة فوراً بتفاصيله
        addToCart(pInDB.id, null, matchingVariant);
        if (resultsDiv) resultsDiv.style.display = 'none';
        const searchInput = document.getElementById('productSearch');
        if (searchInput) searchInput.value = '';
        return;
    }

    // 2. البحث المطابق بالباركود الأساسي أو الكود
    if (!pInDB) {
        pInDB = productsDB.find(p => String(p.barcode).trim() === cleanQuery || String(p.code).trim() === cleanQuery);
    }

    // 3. بحث عميق في باركود الوحدات
    if (!pInDB) {
        pInDB = productsDB.find(p => p.units && p.units.some(u => String(u.unitBarcode).trim() === cleanQuery));
    }

    // 4. إذا لم نجد تطابقاً كاملاً، نبحث بالاسم ونأخذ أول نتيجة لملء الخانات
    if (!pInDB) {
        const queryLower = cleanQuery.toLowerCase();
        pInDB = productsDB.find(p =>
            (p.name && p.name.toLowerCase().includes(queryLower)) ||
            (p.code && String(p.code).toLowerCase().includes(queryLower))
        );
    }

    if (pInDB) {
        // إذا كان للموديل مقاسات وألوان ونظام المقاسات مفعل، نفتح نافذة الاختيار السريع
        const isVariantsActive = document.body.classList.contains('bayan-variants-enabled');
        if (isVariantsActive && pInDB.variants && Array.isArray(pInDB.variants) && pInDB.variants.length > 0) {
            showVariantSelectionModal(pInDB, 'sales');
            if (resultsDiv) resultsDiv.style.display = 'none';
            const searchInput = document.getElementById('productSearch');
            if (searchInput) searchInput.value = '';
            return;
        }

        // دايماً نعبي الخانات أولاً ونركز على الكمية (حسب طلب المستخدم)
        selectProductToHeader(pInDB.id);
    } else {

        // الصنف غريب (غير موجود)

        showCustomAlert({

            titleText: '⚠️ صنف غير مسمى',

            msg: `الباركود أو الاسم (${query}) غير مسجل في قاعدة البيانات، هل تريد إضافته الآن؟`,

            type: 'question',

            showCancel: true,

            confirmText: 'نعم، إضافة صنف',

            cancelText: 'إلغاء',

            onConfirm: () => {

                document.getElementById('productSearch').value = '';

                quickAddProduct(query, 'sales');

            }

        });

    }

}

let pendingAddToCartProduct = null;

let unitModalSelectedIndex = 0;

let unitModalContext = 'sales';

function closeUnitSelectionModal() {

    document.getElementById('unitSelectionModal').classList.add('hidden');

    pendingAddToCartProduct = null;

    window.removeEventListener('keydown', handleUnitModalKeydown);

    // إعادة التركيز للمكان الصحيح بناءً على القسم المفتوح لضمان سرعة الإدخال

    if (unitModalContext === 'purchase') {

        const hQty = document.getElementById('purchaseHeaderQty');

        if (hQty) {

            hQty.focus();

            hQty.select();

        }

    } else {

        const searchId = (unitModalContext === 'sales') ? 'productSearch' : 'purchaseSearch';

        const searchInput = document.getElementById(searchId);

        if (searchInput) searchInput.focus();

    }

}

function handleUnitModalKeydown(e) {

    const modal = document.getElementById('unitSelectionModal');

    if (modal.classList.contains('hidden')) return;

    const cards = document.querySelectorAll('.unit-option-card');

    if (cards.length === 0) return;

    if (e.key === 'ArrowDown') {

        e.preventDefault();

        unitModalSelectedIndex = (unitModalSelectedIndex + 1) % cards.length;

        updateUnitModalSelection(cards);

    } else if (e.key === 'ArrowUp') {

        e.preventDefault();

        unitModalSelectedIndex = (unitModalSelectedIndex - 1 + cards.length) % cards.length;

        updateUnitModalSelection(cards);

    } else if (e.key === 'Enter') {

        e.preventDefault();

        // التأكد من تحديد الكارد أولاً ثم تنفيذ الضغط على زر التأكيد

        const targetCard = cards[unitModalSelectedIndex];

        if (targetCard) {

            targetCard.click();

            setTimeout(() => {

                const confirmBtn = document.getElementById('confirmUnitBtn');

                if (confirmBtn) confirmBtn.click();

            }, 10);

        }

    } else if (e.key === 'Escape') {

        e.preventDefault();

        closeUnitSelectionModal();

    }

}

function updateUnitModalSelection(cards) {

    cards.forEach((card, idx) => {

        if (idx === unitModalSelectedIndex) {

            card.classList.add('selected');

            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } else {

            card.classList.remove('selected');

        }

    });

}

function addToCart(productId, preSelectedUnit = null, preSelectedVariant = null) {
    const product = productsDB.find(p => p.id === productId);
    if (!product) return;

    // فحص الرصيد الصارم قبل أي إجراء
    if (preSelectedVariant) {
        const vStock = parseFloat(preSelectedVariant.stock) || 0;
        if (vStock <= 0) {
            const desc = preSelectedVariant.size 
                ? `المقاس (${preSelectedVariant.size}) واللون (${preSelectedVariant.color || 'موحد'}) غير متوفر حالياً بالمخزن (الرصيد 0).`
                : `اللون (${preSelectedVariant.color || 'موحد'}) غير متوفر حالياً بالمخزن (الرصيد 0).`;
            showToast("⛔ " + desc, "error");
            return;
        }
    } else if (!product.variants || product.variants.length === 0) {
        const pStock = getActiveWarehouseStock(product);
        if (pStock <= 0) {
            showToast(`⛔ الصنف (${product.name}) غير متوفر حالياً بالمخزن (الرصيد 0).`, "error");
            return;
        }
    }

    // إذا كان للصنف تشكيلة مقاسات وألوان ولم يتم تمرير مقاس محدد، نفتح نافذة الاختيار السريع
    if (!preSelectedVariant && product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        showVariantSelectionModal(product, 'sales');
        return;
    }

    if (preSelectedUnit) {
        completeAddToCart(product, preSelectedUnit, preSelectedVariant);
        return;
    }

    if (product.units && product.units.length > 1) {
        showUnitSelectionModal(product, 'sales');
        return;
    }

    const defUnit = (product.units && product.units.length > 0) ? product.units[0] : null;
    completeAddToCart(product, defUnit, preSelectedVariant);
}

function completeAddToCart(product, selectedUnit, selectedVariant = null, explicitQty = null) {
    const productId = product.id;

    // ميزة إدخال الكمية والسعر من الهيدر مباشرة
    const hQtyInput = document.getElementById('headerQty');
    const hPriceInput = document.getElementById('headerPrice');
    let hQty = (explicitQty !== null && !isNaN(explicitQty) && explicitQty > 0)
        ? explicitQty
        : (hQtyInput ? (parseFloat(hQtyInput.value) || 1) : 1);
    if (hQty <= 0) hQty = 1;
    const hPrice = (hPriceInput && hPriceInput.value) ? parseFloat(hPriceInput.value) : null;

    const vSize = selectedVariant ? (selectedVariant.size || '') : '';
    const vColor = selectedVariant ? (selectedVariant.color || '') : '';

    const existingItem = cart.find(item =>
        item.id === productId &&
        ((!item.selectedUnit && !selectedUnit) || (item.selectedUnit && selectedUnit && item.selectedUnit.unitName === selectedUnit.unitName)) &&
        ((item.selectedSize || '') === vSize) &&
        ((item.selectedColor || '') === vColor)
    );

    const currentInCart = existingItem ? parseFloat(existingItem.qty) || 0 : 0;

    // 🛑 التحقق الصارم من الرصيد المتاح للـ Variant أو الصنف العادي
    let originalSoldQty = 0;
    if (isEditMode && Array.isArray(editingOriginalItems)) {
        const origMatches = editingOriginalItems.filter(o => {
            const isProdMatch = (o.productId && product.id && String(o.productId) === String(product.id)) || (o.product === product.name);
            if (!isProdMatch) return false;
            const isVariantMatch = (!vSize || (o.size || o.selectedSize) === vSize) &&
                                   (!vColor || (o.color || o.selectedColor) === vColor);
            return isVariantMatch;
        });
        originalSoldQty = origMatches.reduce((sum, o) => sum + (parseFloat(o.qty) || 0), 0);
    }

    if (selectedVariant) {
        const vStock = (parseFloat(selectedVariant.stock) || 0) + (isEditMode ? originalSoldQty : 0);
        if (vStock <= 0) {
            const desc = selectedVariant.size 
                ? `المقاس (${selectedVariant.size}) واللون (${selectedVariant.color || 'موحد'}) غير متوفر حالياً بالمخزن (الرصيد 0).`
                : `اللون (${selectedVariant.color || 'موحد'}) غير متوفر حالياً بالمخزن (الرصيد 0).`;
            showToast("⛔ " + desc, "error");
            return;
        }
        if (currentInCart + hQty > vStock) {
            const desc = selectedVariant.size 
                ? `المقاس (${selectedVariant.size}) واللون (${selectedVariant.color || 'موحد'})` 
                : `اللون (${selectedVariant.color || 'موحد'})`;
            showToast(`⚠️ الكمية المتاحة من ${desc} بالمخزن هي (${vStock} قطعة) فقط!`, "warning");
            if (currentInCart >= vStock) {
                return;
            }
            hQty = vStock - currentInCart;
        }
    } else if (!product.variants || product.variants.length === 0) {
        const pStock = getActiveWarehouseStock(product) + (isEditMode ? originalSoldQty : 0);
        if (pStock <= 0) {
            showToast(`⛔ الصنف (${product.name}) غير متوفر حالياً بالمخزن (الرصيد 0).`, "error");
            return;
        }
        if (currentInCart + hQty > pStock) {
            showToast(`⚠️ الكمية المتاحة من الصنف (${product.name}) بالمخزن هي (${pStock} قطعة) فقط!`, "warning");
            if (currentInCart >= pStock) {
                return;
            }
            hQty = pStock - currentInCart;
        }
    }

    if (existingItem) {
        existingItem.qty += hQty;
        if (hPrice !== null) existingItem.price = hPrice;
    } else {
        const priceLevelSelect = document.getElementById('salesPriceLevel');
        const priceLevel = priceLevelSelect ? priceLevelSelect.value : 'retail';
        let factor = 1;
        let price = 0;
        let itemCost = (selectedVariant && selectedVariant.cost) ? parseFloat(selectedVariant.cost) : (parseFloat(product.cost) || 0);

        if (selectedVariant) {
            if (priceLevel === 'wholesale') {
                price = parseFloat(selectedVariant.wholesale) || parseFloat(selectedVariant.price) || parseFloat(product.wholesale) || parseFloat(product.price) || 0;
            } else {
                price = parseFloat(selectedVariant.price) || parseFloat(product.price) || 0;
            }
        } else if (selectedUnit) {
            factor = parseFloat(selectedUnit.factor) || 1;
            if (priceLevel === 'wholesale') {
                price = parseFloat(selectedUnit.wholesale) || parseFloat(selectedUnit.price) || 0;
            } else {
                price = parseFloat(selectedUnit.price) || 0;
            }
        } else {
            if (priceLevel === 'wholesale') {
                price = parseFloat(product.wholesale) || parseFloat(product.price) || 0;
            } else {
                price = parseFloat(product.price) || 0;
            }
        }

        const baseOriginalPrice = price;
        const itemDiscount = parseFloat(product.discount) || 0;

        // استخدام السعر اليدوي من الهيدر إذا وُجد
        if (hPrice !== null) {
            price = hPrice;
        } else if (itemDiscount > 0) {
            price = Number(Math.max(0, price - (price * itemDiscount / 100)).toFixed(2));
        }

        cart.push({
            id: product.id,
            code: (selectedVariant && selectedVariant.barcode) ? selectedVariant.barcode : product.code,
            name: product.name,
            originalPrice: baseOriginalPrice,
            discount: itemDiscount,
            price: price,
            cost: itemCost,
            qty: hQty,
            selectedSize: vSize,
            selectedColor: vColor,
            selectedVariant: selectedVariant,
            units: product.units || [],
            selectedUnit: selectedUnit,
            unitFactor: factor,
            taxType: product.taxType || 'none',
            taxRate: product.taxRate || 0
        });
    }

    renderCart();
    if (typeof calculateCartTotals === 'function') calculateCartTotals();
    if (typeof calculateTotals === 'function') calculateTotals();

    // تصفير البحث والمدخلات والتركيز
    if (hQtyInput) hQtyInput.value = 1;
    if (hPriceInput) hPriceInput.value = '';

    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
}

// =========================================================================
// 👗 نافذة الاختيار السريع للمقاسات والألوان (Fast Variant Picker Modal with Keyboard Control)
// =========================================================================

const GLOBAL_SIZE_RANKS = {
    'xxxs': 1, '3xs': 1,
    'xxs': 2, '2xs': 2,
    'xs': 3,
    's': 4, 'small': 4, 'صغير': 4,
    'm': 5, 'med': 5, 'medium': 5, 'وسط': 5, 'متوسط': 5,
    'l': 6, 'large': 6, 'كبير': 6,
    'xl': 7, '1xl': 7,
    'xxl': 8, '2xl': 8,
    'xxxl': 9, '3xl': 9,
    'xxxxl': 10, '4xl': 10,
    'xxxxxl': 11, '5xl': 11,
    '6xl': 12, '7xl': 13, '8xl': 14,
    'free': 90, 'freesize': 90, 'free size': 90, 'one size': 90, 'موحد': 90, 'قياسي': 90, 'عام': 90
};

function getNormalizedSizeRank(sizeStr) {
    if (!sizeStr) return 999;
    const s = String(sizeStr).trim().toLowerCase().replace(/\s+/g, '');
    if (GLOBAL_SIZE_RANKS[s] !== undefined) return GLOBAL_SIZE_RANKS[s];

    // للأرقام الصريحة مثل 28, 30, 32, 38, 40, 42, 44...
    const num = parseFloat(s);
    if (!isNaN(num)) return 100 + num;

    // للتركيبات مثل 2XL أو مقاس 38
    const numMatch = s.match(/\d+/);
    if (numMatch) return 200 + parseFloat(numMatch[0]);

    return 500;
}

function compareSizes(sizeA, sizeB) {
    const sA = (sizeA || '').trim();
    const sB = (sizeB || '').trim();
    if (sA && !sB) return -1;
    if (!sA && sB) return 1;
    if (!sA && !sB) return 0;
    const rankA = getNormalizedSizeRank(sA);
    const rankB = getNormalizedSizeRank(sB);
    if (rankA !== rankB) return rankA - rankB;
    return sA.localeCompare(sB, 'ar', { numeric: true });
}
window.compareSizes = compareSizes;

let variantModalSelectedIndex = 0;
let variantModalProduct = null;
let variantModalContext = 'sales';
let variantModalSortedList = [];

function showVariantSelectionModal(product, context = 'sales') {
    closeVariantSelectionModal(); // إغلاق أي نافذة قديمة وتنظيف المستمعات

    const variants = product.variants || [];
    if (variants.length === 0) {
        addToCart(product.id);
        return;
    }

    // مزامنة فورية إذا كان رصيد الصنف الإجمالي متاحاً بالمخزن ولكن رصيد التشكيلات صفر (بسبب تسوية سابقة)
    const pStock = getActiveWarehouseStock(product);
    const vSum = variants.reduce((sum, v) => sum + (parseFloat(v.stock) || 0), 0);
    if (pStock > 0 && vSum === 0 && variants.length > 0) {
        variants[0].stock = pStock;
        if (typeof db !== 'undefined' && db.products) {
            db.products.put(product).catch(e => console.warn(e));
        }
    }

    variantModalProduct = product;
    variantModalContext = context;
    variantModalSelectedIndex = 0;

    // 🌟 ترتيب التشكيلات ترتيباً منطقياً قياسياً بالمقاسات أولاً ثم الألوان مع الحفاظ على الفهرس الأصلي
    const indexedVariants = variants.map((v, originalIndex) => ({ ...v, originalIndex }));
    indexedVariants.sort((a, b) => {
        const sizeComp = compareSizes(a.size, b.size);
        if (sizeComp !== 0) return sizeComp;
        const colorA = (a.color || '').trim();
        const colorB = (b.color || '').trim();
        return colorA.localeCompare(colorB, 'ar');
    });

    variantModalSortedList = indexedVariants;

    const isColorsOnly = indexedVariants.every(v => !v.size || v.size.trim() === '');
    const priceLevelSelect = document.getElementById('salesPriceLevel');
    const priceLevel = priceLevelSelect ? priceLevelSelect.value : 'retail';

    let cardsHtml = indexedVariants.map((v, displayIndex) => {
        const vPrice = (priceLevel === 'wholesale') 
            ? (parseFloat(v.wholesale) || parseFloat(v.price) || parseFloat(product.wholesale) || parseFloat(product.price) || 0)
            : (parseFloat(v.price) || parseFloat(product.price) || 0);

        const vStock = parseFloat(v.stock) || 0;
        const isOutOfStock = vStock <= 0;
        const stockColor = isOutOfStock ? '#dc2626' : '#047857';
        const stockBg = isOutOfStock ? '#fef2f2' : '#ecfdf5';
        const stockText = isOutOfStock ? 'نفد (0)' : `المتاح: ${vStock}`;
        const opacityStyle = (isOutOfStock && context === 'sales') ? 'opacity: 0.6;' : '';

        const badgeHtml = isColorsOnly
            ? `<div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                 <span style="background: #1e1b4b; color: #f8fafc; padding: 4px 10px; border-radius: 8px; font-weight: 900; font-size: 0.95rem; display: flex; align-items: center; gap: 4px;">
                   🎨 ${v.color || 'موحد'}
                 </span>
                 ${isOutOfStock ? `<span style="background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 6px; font-size: 0.72rem; font-weight: 900;">نفد من المخزن</span>` : ''}
               </div>`
            : `<div style="display: flex; justify-content: space-between; align-items: center;">
                 <span class="variant-size-badge" style="background: #1e293b; color: white; padding: 3px 12px; border-radius: 8px; font-weight: 900; font-size: 1rem;">
                   ${v.size || 'قياسي'}
                 </span>
                 <span style="font-weight: 800; color: #475569; font-size: 0.9rem;">
                   🎨 ${v.color || 'موحد'}
                 </span>
               </div>`;

        return `
            <div class="variant-picker-card" data-index="${displayIndex}" onclick="selectVariantAndAddToCart(${product.id}, ${v.originalIndex}, '${context}')"
                onmouseenter="variantModalSelectedIndex = ${displayIndex}; updateVariantModalSelection();"
                style="background: white; border: 2px solid ${isOutOfStock ? '#fca5a5' : '#e2e8f0'}; border-radius: 14px; padding: 12px; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); user-select: none; ${opacityStyle}">
                ${badgeHtml}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 6px;">
                    <span style="color: ${stockColor}; background: ${stockBg}; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 800;">
                        ${stockText}
                    </span>
                    <span style="color: #047857; font-weight: 900; font-size: 1.05rem;">
                        ${vPrice.toFixed(2)} ج.م
                    </span>
                </div>
            </div>
        `;
    }).join('');

    const modalTitle = isColorsOnly
        ? (context === 'purchase' ? `📥 اختر اللون للتوريد والشراء: <span style="color:#7c3aed;">${product.name}</span>` : 
          (context === 'transfer' ? `🚚 اختر اللون للتحويل المخزني: <span style="color:#059669;">${product.name}</span>` :
          (context === 'adj' ? `⚖️ اختر اللون لتسوية المخزون: <span style="color:#7c3aed;">${product.name}</span>` : 
          (context === 'return' ? `🔄 اختر اللون لمرتجع المبيعات: <span style="color:#dc2626;">${product.name}</span>` :
          (context === 'purReturn' ? `🔄 اختر اللون لمرتجع المشتريات: <span style="color:#d97706;">${product.name}</span>` :
          `👜 اختر اللون للصنف: <span style="color:#7c3aed;">${product.name}</span>`)))))
        : (context === 'purchase' ? `📥 اختر المقاس واللون للتوريد والشراء: <span style="color:#2563eb;">${product.name}</span>` : 
          (context === 'transfer' ? `🚚 اختر المقاس واللون للتحويل المخزني: <span style="color:#059669;">${product.name}</span>` :
          (context === 'adj' ? `⚖️ اختر المقاس واللون للتسوية: <span style="color:#f59e0b;">${product.name}</span>` : 
          (context === 'return' ? `🔄 اختر المقاس واللون لمرتجع المبيعات: <span style="color:#dc2626;">${product.name}</span>` :
          (context === 'purReturn' ? `🔄 اختر المقاس واللون لمرتجع المشتريات: <span style="color:#d97706;">${product.name}</span>` :
          `👕 اختر المقاس واللون للموديل: <span style="color:#047857;">${product.name}</span>`)))));

    const modalBorderColor = (context === 'return') ? '#dc2626' : ((context === 'purReturn') ? '#d97706' : ((context === 'purchase') ? '#3b82f6' : ((context === 'transfer') ? '#10b981' : ((context === 'adj') ? '#f59e0b' : (isColorsOnly ? '#7c3aed' : '#10b981')))));

    const modalHtml = `
        <div id="bayanVariantPickerOverlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.75); backdrop-filter:blur(6px); z-index:11500; display:flex; align-items:center; justify-content:center; direction:rtl; font-family:'Cairo',sans-serif;" onclick="if(event.target === this) closeVariantSelectionModal();">
            <div style="background:white; border-radius:24px; width:580px; max-width:94%; padding:24px; box-shadow:0 25px 50px rgba(0,0,0,0.35); border:2.5px solid ${modalBorderColor}; animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #f1f5f9; padding-bottom:12px; margin-bottom:14px;">
                    <div>
                        <h3 style="margin:0; font-size:1.25rem; color:#1e293b; font-weight:900;">
                            ${modalTitle}
                        </h3>
                        <div style="display:flex; align-items:center; gap:8px; margin-top:4px; flex-wrap:wrap;">
                            <span style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; padding:2px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">
                                ⌨️ تحكم بالأسهم ( ⬅️ ➡️ ⬆️ ⬇️ ) + اضغط Enter للاختيار السريع
                            </span>
                            <span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:2px 10px; border-radius:6px; font-size:0.8rem; font-weight:900;">
                                📦 إجمالي الرصيد بالمخزن: ${pStock} قطعة
                            </span>
                        </div>
                    </div>
                    <button onclick="closeVariantSelectionModal()" style="background:#f1f5f9; border:none; width:34px; height:34px; border-radius:50%; font-size:1.3rem; cursor:pointer; color:#64748b; font-weight:900; display:flex; align-items:center; justify-content:center; transition:0.2s;" onmouseover="this.style.background='#fee2e2'; this.style.color='#dc2626';" onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b';">&times;</button>
                </div>
                <div class="variant-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(155px, 1fr)); gap:12px; max-height:380px; overflow-y:auto; padding:6px;">
                    ${cardsHtml}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    window.addEventListener('keydown', handleVariantPickerKeydown, true);

    setTimeout(() => {
        updateVariantModalSelection();
    }, 40);
}

function handleVariantPickerKeydown(e) {
    const overlay = document.getElementById('bayanVariantPickerOverlay');
    if (!overlay || !variantModalProduct || !variantModalSortedList || variantModalSortedList.length === 0) return;

    const total = variantModalSortedList.length;
    if (total === 0) return;

    const cards = overlay.querySelectorAll('.variant-picker-card');
    if (!cards || cards.length === 0) return;

    // حساب عدد الأعمدة ديناميكياً بناءً على موضع أول كارتين
    let cols = 3;
    if (cards.length >= 2) {
        const firstTop = cards[0].offsetTop;
        let cCount = 0;
        for (let i = 0; i < cards.length; i++) {
            if (cards[i].offsetTop === firstTop) cCount++;
            else break;
        }
        if (cCount > 0) cols = cCount;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
    }

    if (e.key === 'Escape') {
        closeVariantSelectionModal();
        return;
    }

    if (e.key === 'Enter') {
        if (variantModalSelectedIndex >= 0 && variantModalSelectedIndex < total) {
            const selectedObj = variantModalSortedList[variantModalSelectedIndex];
            if (selectedObj) {
                selectVariantAndAddToCart(variantModalProduct.id, selectedObj.originalIndex, variantModalContext);
            }
        }
        return;
    }

    if (e.key === 'ArrowLeft') {
        // في RTL: السهم الأيسر يتحرك للكارت التالي
        variantModalSelectedIndex = (variantModalSelectedIndex + 1) % total;
        updateVariantModalSelection();
    } else if (e.key === 'ArrowRight') {
        // في RTL: السهم الأيمن يتحرك للكارت السابق
        variantModalSelectedIndex = (variantModalSelectedIndex - 1 + total) % total;
        updateVariantModalSelection();
    } else if (e.key === 'ArrowDown') {
        if (variantModalSelectedIndex + cols < total) {
            variantModalSelectedIndex += cols;
        } else {
            variantModalSelectedIndex = Math.min(total - 1, variantModalSelectedIndex + 1);
        }
        updateVariantModalSelection();
    } else if (e.key === 'ArrowUp') {
        if (variantModalSelectedIndex - cols >= 0) {
            variantModalSelectedIndex -= cols;
        } else {
            variantModalSelectedIndex = Math.max(0, variantModalSelectedIndex - 1);
        }
        updateVariantModalSelection();
    }
}

function updateVariantModalSelection() {
    const overlay = document.getElementById('bayanVariantPickerOverlay');
    if (!overlay) return;

    const cards = overlay.querySelectorAll('.variant-picker-card');
    cards.forEach((card, idx) => {
        if (idx === variantModalSelectedIndex) {
            card.style.borderColor = '#10b981';
            card.style.background = 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)';
            card.style.transform = 'scale(1.05)';
            card.style.boxShadow = '0 12px 28px rgba(16, 185, 129, 0.4)';
            card.style.outline = '3px solid #10b981';
            card.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        } else {
            card.style.borderColor = '#e2e8f0';
            card.style.background = 'white';
            card.style.transform = 'none';
            card.style.boxShadow = '0 2px 5px rgba(0,0,0,0.03)';
            card.style.outline = 'none';
        }
    });
}

function closeVariantSelectionModal() {
    const overlay = document.getElementById('bayanVariantPickerOverlay');
    if (overlay) overlay.remove();
    window.removeEventListener('keydown', handleVariantPickerKeydown, true);
    variantModalProduct = null;
    variantModalSortedList = [];
    const searchInput = document.getElementById('productSearch');
    if (searchInput) searchInput.focus();
}

function selectVariantAndAddToCart(productId, variantIndex, context = 'sales') {
    const product = productsDB.find(p => p.id === productId);
    if (!product || !product.variants || !product.variants[variantIndex]) return;

    const variant = product.variants[variantIndex];
    const vStock = parseFloat(variant.stock) || 0;

    // حظر البيع بالسالب إذا كان رصيد هذا اللون أو المقاس منتهياً
    if (context === 'sales' && vStock <= 0) {
        const desc = variant.size 
            ? `المقاس (${variant.size}) واللون (${variant.color || 'موحد'}) غير متوفر حالياً بالمخزن (الرصيد 0).`
            : `اللون (${variant.color || 'موحد'}) غير متوفر حالياً بالمخزن (الرصيد 0).`;
        showToast("⛔ " + desc, "error");
        return;
    }

    closeVariantSelectionModal();

    const defUnit = (product.units && product.units.length > 0) ? product.units[0] : null;
    if (context === 'sales') {
        // إضافة الصنف فوراً لسلة المبيعات بتفاصيل المقاس واللون
        completeAddToCart(product, defUnit, variant);
    } else if (context === 'purchase') {
        // تعبئة الهيدر بتفاصيل المقاس واللون والتركيز على خانة الكمية لدورة الإنتر
        fillPurchaseHeaderWithVariant(product, defUnit, variant);
    } else if (context === 'transfer') {
        // 🚚 إضافة الصنف فوراً لجدول التحويل المخزني بتفاصيل المقاس واللون المختار
        const wFrom = document.getElementById('transferFrom')?.value || 'المخزن الرئيسي';
        const currentStock = (typeof getWarehouseStock === 'function') ? getWarehouseStock(product.name, wFrom) : (parseFloat(product.stock) || 0);

        if (typeof transferItemsBatch !== 'undefined') {
            const existing = transferItemsBatch.find(item => 
                (item.id === product.id || item.name === product.name) &&
                (item.selectedSize || '') === (variant.size || '') &&
                (item.selectedColor || '') === (variant.color || '')
            );

            if (existing) {
                existing.qty = (parseFloat(existing.qty) || 0) + 1;
            } else {
                transferItemsBatch.push({
                    id: product.id,
                    name: product.name,
                    stock: currentStock,
                    selectedSize: variant.size || '',
                    selectedColor: variant.color || '',
                    size: variant.size || '',
                    color: variant.color || '',
                    selectedVariant: variant,
                    qty: 1,
                    price: parseFloat(variant.cost || product.cost || 0),
                    unitName: defUnit ? defUnit.unitName : (product.unit || 'قطعة'),
                    unitFactor: defUnit ? (parseFloat(defUnit.factor) || 1) : 1
                });
            }

            if (typeof renderTransferTable === 'function') renderTransferTable();
            showToast(`🚚 تمت إضافة (${product.name} - ${variant.size || ''} ${variant.color || ''}) لقائمة التحويل`, "success");
        }
    } else if (context === 'adj') {
        window.selectedAdjItem = product;
        if (!window.adjCart) window.adjCart = [];
        window.adjCart.push({
            ...product,
            qty: 1,
            price: parseFloat(variant.cost || product.cost || 0),
            selectedVariant: variant,
            selectedSize: variant.size || '',
            selectedColor: variant.color || '',
            unitFactor: 1,
            selectedUnit: null
        });
        if (typeof renderAdjTable === 'function') renderAdjTable();
    } else if (context === 'return') {
        returnCart.push({
            id: product.id,
            name: product.name,
            code: (variant && variant.barcode) ? variant.barcode : (product.code || '---'),
            price: (variant && parseFloat(variant.price) > 0) ? parseFloat(variant.price) : (parseFloat(product.price) || 0),
            qty: 1,
            maxQty: 9999,
            selectedUnit: defUnit,
            unitFactor: defUnit ? defUnit.factor : 1,
            selectedSize: variant ? (variant.size || '') : '',
            selectedColor: variant ? (variant.color || '') : '',
            selectedVariant: variant
        });
        if (typeof renderReturnCart === 'function') renderReturnCart();
    } else if (context === 'purReturn') {
        purReturnCart.push({
            id: product.id,
            name: product.name,
            code: (variant && variant.barcode) ? variant.barcode : (product.code || '---'),
            price: (variant && parseFloat(variant.cost) > 0) ? parseFloat(variant.cost) : (parseFloat(product.cost) || 0),
            qty: 1,
            maxQty: 9999,
            selectedUnit: defUnit,
            unitFactor: defUnit ? defUnit.factor : 1,
            selectedSize: variant ? (variant.size || '') : '',
            selectedColor: variant ? (variant.color || '') : '',
            selectedVariant: variant
        });
        if (typeof renderPurReturnCart === 'function') renderPurReturnCart();
    }
}

function showUnitSelectionModal(product, context = 'sales') {
    pendingAddToCartProduct = product;

    unitModalContext = context;

    unitModalSelectedIndex = 0;

    const list = document.getElementById('unitSelectionList');

    list.innerHTML = '';

    let priceLevel = 'retail';

    if (context === 'sales' || context === 'sales-header') {

        const priceLevelSelect = document.getElementById('salesPriceLevel');

        priceLevel = priceLevelSelect ? priceLevelSelect.value : 'retail';

    }

    product.units.forEach((unit, idx) => {

        let displayPrice = 0;

        if (context === 'sales' || context === 'sales-header' || context === 'sales-return') {

            if (priceLevel === 'wholesale') {

                displayPrice = parseFloat(unit.wholesale) || parseFloat(unit.price) || 0;

            } else {

                displayPrice = parseFloat(unit.price) || 0;

            }

        } else {

            displayPrice = parseFloat(unit.cost) || 0;

        }

        const card = document.createElement('div');

        card.className = 'unit-option-card' + (idx === 0 ? ' selected' : '');

        card.onclick = () => {

            document.querySelectorAll('.unit-option-card').forEach(c => c.classList.remove('selected'));

            card.classList.add('selected');

        };

        card.ondblclick = () => {

            if (context === 'sales') {

                completeAddToCart(product, unit);

                closeUnitSelectionModal();

            } else if (context === 'sales-header') {

                fillSalesHeaderWithUnit(product, unit);

                closeUnitSelectionModal();

            } else if (context === 'purchase') {

                // بدلاً من الإضافة الفورية، نملأ الهيدر ونركز على الكمية

                fillPurchaseHeaderWithUnit(product, unit);

                closeUnitSelectionModal();

            } else if (context === 'sales-return') {

                completeAddToReturnCart(product, unit);

                closeUnitSelectionModal();

            } else if (context === 'purchase-return') {

                completeAddToPurReturnCart(product, unit);

                closeUnitSelectionModal();

            } else if (context === 'adjustment') {

                // في التسوية، نملأ الهيدر ونركز على الكمية

                if (typeof fillAdjustmentHeaderWithUnit === 'function') {

                    fillAdjustmentHeaderWithUnit(product, unit);

                }

                closeUnitSelectionModal();

            } else if (context === 'transfer') {

                // في التحويل، نملأ الهيدر ونركز على الكمية

                if (typeof fillTransferHeaderWithUnit === 'function') {

                    fillTransferHeaderWithUnit(product, unit);

                }

                closeUnitSelectionModal();

            } else if (context === 'sales-return-header') {

                fillReturnHeaderWithUnit(product, unit, 'sales');

                closeUnitSelectionModal();

            } else if (context === 'purchase-return-header') {

                fillReturnHeaderWithUnit(product, unit, 'purchase');

                closeUnitSelectionModal();

            }

        };

        const formattedFactor = (unit.factor % 1 === 0) ? unit.factor : parseFloat(unit.factor).toFixed(2);

        card.innerHTML = `

                    <div style="display:flex; flex-direction:column;">

                        <span class="unit-name">${unit.unitName}</span>

                        <span style="font-size:0.75rem; color:#64748b;">معامل التحويل: ${formattedFactor}</span>

                    </div>

                    <span class="unit-price">${displayPrice.toFixed(2)} ج.م</span>

                `;

        card.dataset.unitIdx = idx;

        list.appendChild(card);

    });

    document.getElementById('confirmUnitBtn').onclick = () => {

        const selected = document.querySelector('.unit-option-card.selected');

        if (selected) {

            const unitIdx = selected.dataset.unitIdx;

            const unit = product.units[unitIdx];

            if (context === 'sales') {

                completeAddToCart(product, unit);

                closeUnitSelectionModal();

            } else if (context === 'sales-header') {

                fillSalesHeaderWithUnit(product, unit);

                closeUnitSelectionModal();

            } else if (context === 'purchase') {

                fillPurchaseHeaderWithUnit(product, unit);

                closeUnitSelectionModal();

            } else if (context === 'sales-return') {

                completeAddToReturnCart(product, unit);

                closeUnitSelectionModal();

            } else if (context === 'purchase-return') {

                completeAddToPurReturnCart(product, unit);

                closeUnitSelectionModal();

            } else if (context === 'adjustment') {

                if (typeof fillAdjustmentHeaderWithUnit === 'function') {

                    fillAdjustmentHeaderWithUnit(product, unit);

                }

                closeUnitSelectionModal();

            } else if (context === 'transfer') {

                if (typeof fillTransferHeaderWithUnit === 'function') {

                    fillTransferHeaderWithUnit(product, unit);

                }

                closeUnitSelectionModal();

            } else if (context === 'sales-return-header') {

                fillReturnHeaderWithUnit(product, unit, 'sales');

                closeUnitSelectionModal();

            } else if (context === 'purchase-return-header') {

                fillReturnHeaderWithUnit(product, unit, 'purchase');

                closeUnitSelectionModal();

            }

        }

    };

    document.getElementById('unitSelectionModal').classList.remove('hidden');

    if (document.activeElement) document.activeElement.blur();

    window.addEventListener('keydown', handleUnitModalKeydown);
}

function updateItemUnit(index, unitName, cartType = 'sales') {
    let currentCart = cart;
    if (cartType === 'purchase') currentCart = purchaseCart;
    else if (cartType === 'return') currentCart = returnCart;
    else if (cartType === 'purReturn') currentCart = purReturnCart;

    const item = currentCart[index];
    if (!item) return;

    const pInfo = productsDB.find(p => p.id === item.id || p.name === item.name);
    const baseUnitName = (pInfo ? pInfo.unit : item.unit) || 'قطعة';
    const rawUnits = (pInfo && pInfo.units && Array.isArray(pInfo.units)) ? pInfo.units : (item.units || []);

    let allUnits = [];
    const hasBaseInUnits = rawUnits.some(u => u.unitName === baseUnitName || parseFloat(u.factor) === 1);
    if (!hasBaseInUnits) {
        allUnits.push({
            unitName: baseUnitName,
            factor: 1,
            cost: parseFloat(pInfo?.cost || item.cost || 0),
            price: parseFloat(pInfo?.price || item.salePrice || 0),
            wholesale: parseFloat(pInfo?.wholesale || item.wholesalePrice || 0)
        });
    }
    rawUnits.forEach(u => {
        if (!allUnits.some(au => au.unitName === u.unitName)) {
            allUnits.push(u);
        }
    });

    const unit = allUnits.find(u => u.unitName === unitName);

    if (unit && parseFloat(unit.factor) !== 1) {
        item.selectedUnit = unit;
        item.unit = unit.unitName;
        item.unitFactor = parseFloat(unit.factor) || 1;

        if (cartType === 'sales') {
            const priceLevel = document.getElementById('salesPriceLevel')?.value || 'retail';
            const basePrice = (priceLevel === 'wholesale') ? (parseFloat(unit.wholesale) || parseFloat(unit.price) || 0) : (parseFloat(unit.price) || 0);
            item.originalPrice = basePrice;
            const itemDisc = parseFloat(item.discount) || 0;
            if (itemDisc > 0) {
                item.price = Number(Math.max(0, basePrice - (basePrice * itemDisc / 100)).toFixed(2));
            } else {
                item.price = basePrice;
            }
        } else {
            const unitCost = parseFloat(unit.cost);
            item.price = (!isNaN(unitCost) && unitCost > 0) ? unitCost : ((parseFloat(pInfo ? pInfo.cost : item.cost) || 0) * item.unitFactor);
            item.cost = item.price;
            if (parseFloat(unit.price) > 0) item.salePrice = parseFloat(unit.price);
            if (parseFloat(unit.wholesale) > 0) item.wholesalePrice = parseFloat(unit.wholesale);
        }
    } else {
        item.selectedUnit = unit || null;
        item.unit = unit ? unit.unitName : baseUnitName;
        item.unitFactor = unit ? (parseFloat(unit.factor) || 1) : 1;
        if (cartType === 'sales') {
            item.price = parseFloat(pInfo ? pInfo.price : item.price) || 0;
            item.originalPrice = item.price;
        } else {
            item.price = parseFloat(pInfo ? pInfo.cost : item.cost) || 0;
            item.cost = item.price;
            item.salePrice = parseFloat(pInfo ? pInfo.price : item.salePrice) || 0;
            item.wholesalePrice = parseFloat(pInfo ? pInfo.wholesale : item.wholesalePrice) || 0;
        }
    }

    if (cartType === 'sales') {
        renderCart();
        if (typeof saveCurrentTabState === 'function') saveCurrentTabState();
    } else if (cartType === 'purchase') {
        renderPurchaseCart_Finalized_V3();
        if (typeof saveCurrentTabState === 'function') saveCurrentTabState();
    } else if (cartType === 'return') {
        if (typeof renderReturnCart === 'function') renderReturnCart();
    } else if (cartType === 'purReturn') {
        if (typeof renderPurReturnCart === 'function') renderPurReturnCart();
    }
}
window.updateItemUnit = updateItemUnit;

function renderVariantSelectElements(item, index, cartType = 'sales') {
    const pInfo = productsDB.find(p => p.id === item.id || p.name === item.name);
    const variants = (pInfo && pInfo.variants && Array.isArray(pInfo.variants)) ? pInfo.variants : [];

    // 1. خيارات المقاسات (Dropdown للمقاسات)
    const availableSizes = [...new Set(variants.map(v => v.size).filter(s => s && String(s).trim() !== ''))];
    availableSizes.sort(compareSizes);
    if (item.selectedSize && !availableSizes.includes(item.selectedSize)) {
        availableSizes.unshift(item.selectedSize);
    }

    let sizeElement = `<span style="color:#cbd5e1;">-</span>`;
    if (availableSizes.length > 0) {
        if (!item.selectedSize || !availableSizes.includes(item.selectedSize)) {
            item.selectedSize = availableSizes[0];
            item.size = availableSizes[0];
        }
        const sizeOptions = availableSizes.map(s => `<option value="${s}" ${item.selectedSize === s ? 'selected' : ''}>${s}</option>`).join('');
        sizeElement = `<select onchange="updateItemVariantAttr(${index}, 'size', this.value, '${cartType}')" title="اختر المقاس"
            style="width: 80px; max-width: 100%; border: 1.5px solid #a7f3d0; background: #ecfdf5; color: #047857; border-radius: 6px; padding: 4px 2px; font-weight: 900; font-size: 0.85rem; outline: none; cursor: pointer; text-align: center;">
            ${sizeOptions}
        </select>`;
    } else if (item.selectedSize) {
        sizeElement = `<span style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; padding:2px 8px; border-radius:6px; font-weight:900; font-size:0.82rem;">${item.selectedSize}</span>`;
    }

    // 2. خيارات الألوان (Dropdown للألوان)
    const availableColors = [...new Set(variants.map(v => v.color).filter(c => c && String(c).trim() !== ''))];
    availableColors.sort((a, b) => a.localeCompare(b, 'ar'));
    if (item.selectedColor && !availableColors.includes(item.selectedColor)) {
        availableColors.unshift(item.selectedColor);
    }

    let colorElement = `<span style="color:#cbd5e1;">-</span>`;
    if (availableColors.length > 0) {
        if (!item.selectedColor || !availableColors.includes(item.selectedColor)) {
            item.selectedColor = availableColors[0];
            item.color = availableColors[0];
        }
        const colorOptions = availableColors.map(c => `<option value="${c}" ${item.selectedColor === c ? 'selected' : ''}>${c}</option>`).join('');
        colorElement = `<select onchange="updateItemVariantAttr(${index}, 'color', this.value, '${cartType}')" title="اختر اللون"
            style="width: 80px; max-width: 100%; border: 1.5px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; border-radius: 6px; padding: 4px 2px; font-weight: 900; font-size: 0.85rem; outline: none; cursor: pointer; text-align: center;">
            ${colorOptions}
        </select>`;
    } else if (item.selectedColor) {
        colorElement = `<span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:2px 8px; border-radius:6px; font-weight:900; font-size:0.82rem;">${item.selectedColor}</span>`;
    }

    return { sizeElement, colorElement };
}
window.renderVariantSelectElements = renderVariantSelectElements;

function updateItemVariantAttr(index, attr, value, cartType = 'sales') {
    let currentCart = cart;
    if (cartType === 'purchase') currentCart = purchaseCart;
    else if (cartType === 'return') currentCart = returnCart;
    else if (cartType === 'purReturn') currentCart = purReturnCart;
    else if (cartType === 'adj') currentCart = (typeof window.adjCart !== 'undefined' ? window.adjCart : []);
    else if (cartType === 'transfer') currentCart = (typeof transferItemsBatch !== 'undefined' ? transferItemsBatch : []);

    const item = currentCart[index];
    if (!item) return;

    if (attr === 'size') {
        item.selectedSize = value;
        item.size = value;
    } else if (attr === 'color') {
        item.selectedColor = value;
        item.color = value;
    }

    // البحث عن التشكيلة المطابقة لتحديث السعر والباركود وفحص الرصيد
    const pInfo = productsDB.find(p => p.id === item.id || p.name === item.name);
    if (pInfo && pInfo.variants && Array.isArray(pInfo.variants)) {
        const matchedVariant = pInfo.variants.find(v => 
            (!item.selectedSize || v.size === item.selectedSize) && 
            (!item.selectedColor || v.color === item.selectedColor)
        );
        if (matchedVariant) {
            item.selectedVariant = matchedVariant;
            if (matchedVariant.barcode) item.barcode = matchedVariant.barcode;
            if (matchedVariant.price && cartType === 'sales' && parseFloat(matchedVariant.price) > 0) {
                const priceLevel = document.getElementById('salesPriceLevel')?.value || 'retail';
                const vPrice = (priceLevel === 'wholesale' && parseFloat(matchedVariant.wholesale) > 0) ? parseFloat(matchedVariant.wholesale) : parseFloat(matchedVariant.price);
                item.price = vPrice;
                item.originalPrice = vPrice;
            }

            // فحص المخزون المتاح للتشكيلة المختارة في سلة المبيعات والتحويل
            if (cartType === 'sales') {
                let originalSoldQty = 0;
                if (isEditMode && Array.isArray(editingOriginalItems)) {
                    const origMatches = editingOriginalItems.filter(o => {
                        const isProdMatch = (o.productId && pInfo.id && String(o.productId) === String(pInfo.id)) || (o.product === pInfo.name);
                        if (!isProdMatch) return false;
                        const isVariantMatch = (!item.selectedSize || (o.size || o.selectedSize) === item.selectedSize) &&
                                               (!item.selectedColor || (o.color || o.selectedColor) === item.selectedColor);
                        return isVariantMatch;
                    });
                    originalSoldQty = origMatches.reduce((sum, o) => sum + (parseFloat(o.qty) || 0), 0);
                }

                const vStock = (parseFloat(matchedVariant.stock) || 0) + originalSoldQty;
                if (vStock <= 0) {
                    const desc = matchedVariant.size ? "هذا اللون والمقاس غير متوفر حالياً بالمخزن." : "هذا اللون غير متوفر حالياً بالمخزن.";
                    showToast("⛔ " + desc, "error");
                    item.qty = 1;
                } else if (item.qty > vStock) {
                    const desc = matchedVariant.size ? "من هذا اللون والمقاس" : "من هذا اللون";
                    showToast("⚠️ الكمية المتاحة " + desc + " هي (" + vStock + " قطعة) فقط!", "warning");
                    item.qty = vStock;
                }
            } else if (cartType === 'transfer') {
                const vStock = parseFloat(matchedVariant.stock) || 0;
                item.stock = vStock;
                if (item.qty > vStock) {
                    const desc = matchedVariant.size ? `للمقاس (${matchedVariant.size}) واللون (${matchedVariant.color || 'موحد'})` : `للون (${matchedVariant.color || 'موحد'})`;
                    showToast(`⚠️ الكمية المتاحة ${desc} بالمخزن هي (${vStock} قطعة) فقط!`, "warning");
                    item.qty = Math.max(1, vStock);
                }
            }
        }
    }

    if (cartType === 'sales') {
        renderCart();
        if (typeof saveCurrentTabState === 'function') saveCurrentTabState();
    } else if (cartType === 'purchase') {
        if (typeof renderPurchaseCart_Finalized_V3 === 'function') renderPurchaseCart_Finalized_V3();
        if (typeof saveCurrentTabState === 'function') saveCurrentTabState();
    } else if (cartType === 'return') {
        if (typeof renderReturnCart === 'function') renderReturnCart();
    } else if (cartType === 'purReturn') {
        if (typeof renderPurReturnCart === 'function') renderPurReturnCart();
    } else if (cartType === 'adj') {
        if (typeof renderAdjTable === 'function') renderAdjTable();
    } else if (cartType === 'transfer') {
        if (typeof renderTransferTable === 'function') renderTransferTable();
    }
}
window.updateItemVariantAttr = updateItemVariantAttr;

function removeFromCart(index) {
    if (isEditMode && !checkPermission('docs_edit')) return;
    const item = cart[index];
    if (item) addToTrash('draft_item', item, `حذف من فاتورة بيع(مسودة): ${item.name} - الكمية: ${item.qty}`);
    cart.splice(index, 1);
    renderCart();
}

function updateQty(index, newQty) {
    if (isEditMode && !checkPermission('docs_edit')) return renderCart();
    const item = cart[index];
    if (!item) return;

    const requestedQty = parseFloat(newQty) || 0;
    if (requestedQty < 1) return renderCart();

    const p = productsDB.find(prod => prod.id === item.id || prod.name === item.name);
    if (p) {
        let originalSoldQty = 0;
        if (isEditMode && Array.isArray(editingOriginalItems)) {
            const origMatches = editingOriginalItems.filter(o => {
                const isProdMatch = (o.productId && p.id && String(o.productId) === String(p.id)) || (o.product === p.name);
                if (!isProdMatch) return false;
                const isVariantMatch = (!item.selectedSize || (o.size || o.selectedSize) === item.selectedSize) &&
                                       (!item.selectedColor || (o.color || o.selectedColor) === item.selectedColor);
                return isVariantMatch;
            });
            originalSoldQty = origMatches.reduce((sum, o) => sum + (parseFloat(o.qty) || 0), 0);
        }

        // فحص رصيد التشكيلة (اللون/المقاس)
        if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
            const vMatch = window.findMatchingVariant(p, item);
            if (vMatch) {
                const maxStock = (parseFloat(vMatch.stock) || 0) + originalSoldQty;
                if (maxStock <= 0) {
                    const desc = vMatch.size 
                        ? `المقاس (${vMatch.size}) واللون (${vMatch.color || 'موحد'}) غير متوفر حالياً بالمخزن (الرصيد 0).`
                        : `اللون (${vMatch.color || 'موحد'}) غير متوفر حالياً بالمخزن (الرصيد 0).`;
                    showToast("⛔ " + desc, "error");
                    cart[index].qty = 1;
                    return renderCart();
                } else if (requestedQty > maxStock) {
                    const desc = vMatch.size 
                        ? `المقاس (${vMatch.size}) واللون (${vMatch.color || 'موحد'})` 
                        : `اللون (${vMatch.color || 'موحد'})`;
                    showToast(`⚠️ الكمية المتاحة من ${desc} بالمخزن هي (${maxStock} قطعة) فقط!`, "warning");
                    cart[index].qty = maxStock;
                    return renderCart();
                }
            }
        } else {
            // صنف عادي بدون متغيرات
            const maxStock = getActiveWarehouseStock(pInfo) + originalSoldQty;
            if (maxStock <= 0) {
                showToast(`⛔ الصنف (${p.name}) غير متوفر حالياً بالمخزن (الرصيد 0).`, "error");
                cart[index].qty = 1;
                return renderCart();
            } else if (requestedQty > maxStock) {
                showToast(`⚠️ الكمية المتاحة من الصنف (${p.name}) بالمخزن هي (${maxStock} قطعة) فقط!`, "warning");
                cart[index].qty = maxStock;
                return renderCart();
            }
        }
    }

    cart[index].qty = requestedQty;
    renderCart();
}

function updateCartPrice(index, newPrice) {
    if (isEditMode && !checkPermission('docs_edit')) return renderCart();
    if (newPrice < 0) return;
    cart[index].price = parseFloat(newPrice);
    renderCart();
}

function resetBill() {
    cart = [];
    isEditMode = false;
    editingInvoiceId = null;
    editingOriginalDate = null;
    editingInvoiceType = null;
    editingOriginalItems = [];

    const mainSaveBtn = document.querySelector('#sales-section .btn-save');

    if (mainSaveBtn) {

        mainSaveBtn.style.background = '';

        mainSaveBtn.innerText = '💾 حفظ الفاتورة (F9)';

    }

    currentTotal = 0;

    document.getElementById('discountInput').value = 0;

    document.getElementById('discountType').value = 'val';

    document.getElementById('taxInput').value = 0;

    document.getElementById('taxType').value = 'val';

    document.getElementById('tenderedAmount').value = '';

    document.getElementById('customerName').value = '';

    if (document.getElementById('salesNotes')) document.getElementById('salesNotes').value = '';

    document.getElementById('changeAmount').innerText = '0.00';

    if (document.getElementById('cartFilterInput')) document.getElementById('cartFilterInput').value = '';

    if (document.getElementById('customerCodeDisplay')) document.getElementById('customerCodeDisplay').innerText = '---';

    if (document.getElementById('customerBalanceDisplay')) document.getElementById('customerBalanceDisplay').innerText = '0.00';

    if (document.getElementById('salesItemsCount')) document.getElementById('salesItemsCount').innerText = '0';

    if (document.getElementById('salesTotalQty')) document.getElementById('salesTotalQty').innerText = '0';

    const now = new Date();

    if (document.getElementById('salesDate')) document.getElementById('salesDate').value = now.toLocaleDateString('en-CA');

    if (document.getElementById('salesTime')) document.getElementById('salesTime').value = now.toTimeString().slice(0, 5);

    renderCart();

    // تحديث رقم الفاتورة في المربع الأخضر

    if (document.getElementById('salesBadgeID')) {
        document.getElementById('salesBadgeID').innerText = typeof getNextSequence === 'function' ? getNextSequence('بيع') : 1;
    }

    // 💡 استعادة طريقة السداد الافتراضية للفاتورة القادمة (إما الخيار المثبت بالدبوس 📌 أو كاش تلقائياً)
    const pinnedMethod = getStore('pinned_payment_method');
    const methodSelect = document.getElementById('sales-sectionPaymentMethodSelect') || document.getElementById('salesPaymentMethodSelect');
    if (methodSelect) {
        if (pinnedMethod) {
            methodSelect.value = pinnedMethod;
        } else {
            methodSelect.value = 'نقدي'; // إرجاعها كاش تلقائياً بعد حفظ الفاتورة
        }
        if (typeof selectMethod === 'function') selectMethod(methodSelect);
        selectedMethod = methodSelect.value;
    }
    if (typeof checkPaymentPinState === 'function') checkPaymentPinState();

    // إخفاء وتصفير أي نوافذ بحث معلقة
    const custResults = document.getElementById('customerSearchResults');
    if (custResults) {
        custResults.innerHTML = '';
        custResults.style.display = 'none';
    }
    const prodResults = document.getElementById('searchResults');
    if (prodResults) {
        prodResults.innerHTML = '';
        prodResults.style.display = 'none';
    }

    document.getElementById('productSearch').focus();
}

// 📌 إدارة وتثبيت طريقة الدفع المفضلة للفواتير القادمة
window.togglePinPaymentMethod = function(e) {
    if (e) e.stopPropagation();
    const methodSelect = document.getElementById('sales-sectionPaymentMethodSelect') || document.getElementById('salesPaymentMethodSelect');
    if (!methodSelect) return;

    const currentVal = methodSelect.value;
    const existingPinned = getStore('pinned_payment_method');

    if (existingPinned === currentVal) {
        // إلغاء التثبيت
        setStore('pinned_payment_method', '');
        if (typeof showToast === 'function') showToast("🔓 تم إلغاء تثبيت طريقة الدفع المفضلة", "info");
    } else {
        // تثبيت الخيار الحالي
        setStore('pinned_payment_method', currentVal);
        const nameMap = { 'نقدي': 'كاش 💵', 'آجل': 'آجل ⏳', 'تحويل': 'بنك 🏦' };
        if (typeof showToast === 'function') showToast(`📌 تم تثبيت (${nameMap[currentVal] || currentVal}) كطريقة دفع افتراضية للفواتير القادمة`, "success");
    }

    window.checkPaymentPinState();
};

window.checkPaymentPinState = function() {
    const pinBtn = document.getElementById('pinPaymentMethodBtn');
    const methodSelect = document.getElementById('sales-sectionPaymentMethodSelect') || document.getElementById('salesPaymentMethodSelect');
    if (!pinBtn || !methodSelect) return;

    const pinnedVal = getStore('pinned_payment_method');
    const currentVal = methodSelect.value;

    if (pinnedVal && pinnedVal === currentVal) {
        pinBtn.style.opacity = '1';
        pinBtn.style.color = '#f59e0b';
        pinBtn.style.transform = 'scale(1.25)';
        pinBtn.title = `طريقة الدفع (${pinnedVal}) مثبتة كافتراضي. انقر لإلغاء التثبيت`;
    } else {
        pinBtn.style.opacity = '0.5';
        pinBtn.style.color = 'inherit';
        pinBtn.style.transform = 'none';
        pinBtn.title = 'تثبيت طريقة الدفع الحالية كافتراضي للفواتير القادمة';
    }
};

// ================= 📌 إدارة وتثبيت مستوى سعر البيع الدائم (Pinned Price Level) =================
window.isPriceLevelPinned = function() {
    const pinned = getStore('pos_price_level_pinned');
    return pinned === 'true' || pinned === true;
};

window.getPinnedPriceLevel = function() {
    return getStore('pos_pinned_price_level') || 'retail';
};

window.loadPinnedPriceLevel = function() {
    const priceLevelSelect = document.getElementById('salesPriceLevel');
    const pinBtn = document.getElementById('pinPriceLevelBtn');
    const pinIcon = document.getElementById('pinPriceLevelIcon');
    if (!priceLevelSelect) return;

    const isPinned = window.isPriceLevelPinned();
    const pinnedLevel = window.getPinnedPriceLevel();

    if (isPinned) {
        priceLevelSelect.value = pinnedLevel;
        if (pinBtn) {
            pinBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            pinBtn.style.borderColor = '#34d399';
            pinBtn.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.4)';
            pinBtn.title = `مستوى السعر (${pinnedLevel === 'wholesale' ? 'جملة تجار' : 'قطاعي'}) مُثبّت دائماً كافتراضي (انقر لإلغاء التثبيت)`;
        }
        if (pinIcon) pinIcon.innerText = '📌';
    } else {
        if (pinBtn) {
            pinBtn.style.background = 'rgba(255, 255, 255, 0.08)';
            pinBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            pinBtn.style.boxShadow = 'none';
            pinBtn.title = 'انقر لتثبيت مستوى السعر الحالي كافتراضي دائم';
        }
        if (pinIcon) pinIcon.innerText = '📍';
    }
};

window.togglePinPriceLevel = async function(e) {
    if (e) e.stopPropagation();
    const priceLevelSelect = document.getElementById('salesPriceLevel');
    if (!priceLevelSelect) return;

    const currentLevel = priceLevelSelect.value;
    const isCurrentlyPinned = window.isPriceLevelPinned();

    if (!isCurrentlyPinned) {
        // تثبيت دائم
        setStore('pos_price_level_pinned', 'true');
        setStore('pos_pinned_price_level', currentLevel);
        try {
            if (typeof db !== 'undefined' && db.settings) {
                await db.settings.put({ id: 'pinned_price_level', value: currentLevel, isPinned: true });
            }
        } catch(err) {}
        window.loadPinnedPriceLevel();
        if (typeof showToast === 'function') {
            showToast(`📌 تم تثبيت وضع (${currentLevel === 'wholesale' ? 'جملة تجار 📦' : 'القطاعي 🛒'}) كافتراضي دائم للبرنامج!`, 'success');
        }
    } else {
        // إلغاء التثبيت
        setStore('pos_price_level_pinned', 'false');
        try {
            if (typeof db !== 'undefined' && db.settings) {
                await db.settings.put({ id: 'pinned_price_level', value: currentLevel, isPinned: false });
            }
        } catch(err) {}
        window.loadPinnedPriceLevel();
        if (typeof showToast === 'function') {
            showToast('📍 تم إلغاء تثبيت مستوى السعر', 'info');
        }
    }
};

window.onSalesPriceLevelChange = function() {
    const priceLevelSelect = document.getElementById('salesPriceLevel');
    if (!priceLevelSelect) return;

    const newLevel = priceLevelSelect.value;
    if (window.isPriceLevelPinned()) {
        setStore('pos_pinned_price_level', newLevel);
        try {
            if (typeof db !== 'undefined' && db.settings) {
                db.settings.put({ id: 'pinned_price_level', value: newLevel, isPinned: true });
            }
        } catch(err) {}
        window.loadPinnedPriceLevel();
    }
    updateCartPriceLevel();
};

// --- 🖨️ إدارة خيار الطباعة التلقائية لفواتير البيع (Sales Auto-Print Control) ---
function isSalesAutoPrintEnabled() {
    return getStore('pos_sales_auto_print') === 'true';
}
window.isSalesAutoPrintEnabled = isSalesAutoPrintEnabled;

function toggleSalesAutoPrint() {
    const currentState = isSalesAutoPrintEnabled();
    const newState = !currentState;
    setStore('pos_sales_auto_print', newState ? 'true' : 'false');
    updateSalesAutoPrintUI();
    if (typeof showToast === 'function') {
        showToast(newState ? "🖨️ تم تفعيل الطباعة التلقائية (سيتم طباعة الفاتورة فور الحفظ)" : "🖨️ تم إيقاف الطباعة التلقائية (الطباعة يدوياً فقط)", "info");
    }
}
window.toggleSalesAutoPrint = toggleSalesAutoPrint;

function updateSalesAutoPrintUI() {
    const btn = document.getElementById('salesAutoPrintToggle');
    const icon = document.getElementById('salesAutoPrintIcon');
    const label = document.getElementById('salesAutoPrintLabel');
    if (!btn) return;

    const enabled = isSalesAutoPrintEnabled();
    if (enabled) {
        btn.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.12))';
        btn.style.borderColor = '#10b981';
        btn.style.color = '#047857';
        btn.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.25)';
        if (icon) {
            icon.style.filter = 'drop-shadow(0 0 4px #10b981)';
            icon.style.transform = 'scale(1.1)';
        }
        if (label) {
            label.textContent = 'طباعة تلقائية: مفعلة';
        }
        btn.title = 'الطباعة التلقائية مفعلة (سيتم إرسال الفاتورة للطباعة فور الحفظ). انقر للإيقاف';
    } else {
        btn.style.background = '#f8fafc';
        btn.style.borderColor = '#cbd5e1';
        btn.style.color = '#64748b';
        btn.style.boxShadow = 'none';
        if (icon) {
            icon.style.filter = 'grayscale(1)';
            icon.style.opacity = '0.7';
            icon.style.transform = 'scale(1)';
        }
        if (label) {
            label.textContent = 'طباعة تلقائية: معطلة';
        }
        btn.title = 'الطباعة التلقائية معطلة (الطباعة يدوياً فقط). انقر للتفعيل';
    }
}
window.updateSalesAutoPrintUI = updateSalesAutoPrintUI;

// استدعاء أولي لتحديث شكل الزر
setTimeout(() => { if (typeof updateSalesAutoPrintUI === 'function') updateSalesAutoPrintUI(); }, 50);

// --- 2. رسم الجدول والحسابات ---

function renderCart() {

    const tbody = document.getElementById('cartTableBody');

    tbody.innerHTML = '';

    let subTotal = 0;

    cart.forEach((item, index) => {

        const itemTotal = item.price * item.qty;

        subTotal += itemTotal;

        let unitOptions = `<option value="قطعة">قطعة</option>`;

        if (item.units && item.units.length > 0) {

            // selectedUnit قد يكون object أو string

            const selectedUnitName = item.selectedUnit

                ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit)

                : null;

            unitOptions = item.units.map(u =>

                `<option value="${u.unitName}" ${u.unitName === selectedUnitName ? 'selected' : ''}>${u.unitName}</option>`

            ).join('');

        }

        const tr = document.createElement('tr');

        // تمييز الأصناف التي نفد رصيدها (خلصانة) بصرياً

        const pInfo = productsDB.find(p => p.id === item.id || p.name === item.name);

        if (pInfo && pInfo.stock <= 0) {
            tr.classList.add('out-of-stock-row');
        }

        const { sizeElement, colorElement } = renderVariantSelectElements(item, index, 'sales');

        const discountTag = (parseFloat(item.discount) > 0) 
            ? `<div style="font-size:0.72rem; color:#dc2626; font-weight:800; display:flex; align-items:center; justify-content:center; gap:3px; margin-top:2px;" title="خصم ${item.discount}%">
                 <span style="text-decoration:line-through; opacity:0.65;">${(parseFloat(item.originalPrice) || (item.price / (1 - (parseFloat(item.discount) || 0) / 100))).toFixed(2)}</span>
                 <span style="background:#fee2e2; color:#b91c1c; padding:1px 4px; border-radius:4px;">-${item.discount}%</span>
               </div>` 
            : '';

        tr.innerHTML = `
                    <td style="font-weight: 800; color: #64748b;">${index + 1}</td>
                    <td style="font-size: 0.82rem; color: #475569; font-weight: bold;">${item.code || '---'}</td>
                    <td style="font-weight: 900; color: #1e293b; text-align: right;">${item.name}</td>
                    <td class="col-variant-size" style="text-align: center;">${sizeElement}</td>
                    <td class="col-variant-color" style="text-align: center;">${colorElement}</td>
                    <td style="text-align: center;">
                        <select onchange="updateItemUnit(${index}, this.value, 'sales')" 
                            style="width: 80px; max-width: 100%; border: 1.5px solid #cbd5e1; background: #fff; color: #1e293b; border-radius: 6px; padding: 4px; font-weight: 800; font-size: 0.85rem; outline: none; cursor: pointer; text-align: center;">
                            ${unitOptions}
                        </select>
                    </td>
                    <td style="text-align: center;">
                        <input type="number" class="qty-input" value="${item.qty}" min="1" step="any"
                               onchange="updateQty(${index}, this.value)" onclick="this.select()" title="تعديل الكمية"
                               style="width: 72px; height: 34px; font-size: 1.1rem; font-weight: 900; text-align: center; border-radius: 8px; border: 2px solid #10b981; background: #ecfdf5; color: #065f46; box-sizing: border-box; padding: 2px 4px;">
                    </td>
                    <td style="text-align: center;">
                        <input type="number" class="price-input" value="${(parseFloat(item.price) || 0).toFixed(2)}" min="0" step="0.01"
                               onchange="updateCartPrice(${index}, this.value)" onclick="this.select()" title="تعديل السعر"
                               style="width: 88px; height: 34px; font-size: 1.05rem; font-weight: 900; text-align: center; border-radius: 8px; border: 2px solid #3b82f6; background: #eff6ff; color: #1e40af; box-sizing: border-box; padding: 2px 4px;">
                        ${discountTag}
                    </td>
                    <td class="cart-item-total" style="font-weight: 900; color: #047857; font-size: 1.1rem; text-align: center;">${itemTotal.toFixed(2)}</td>
                    <td style="text-align: center;">
                        <button class="btn-delete-row" onclick="removeFromCart(${index})" title="حذف هذا الصنف"
                            style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; padding: 5px 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s;">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    </td>
        `;
        tbody.appendChild(tr);

    });

    document.getElementById('subTotalDisplay').innerText = subTotal.toFixed(2);

    calculateTotals(subTotal);

    updateHeaderPartnerInfo();

}

function updateCartPriceLevel() {

    const priceLevelSelect = document.getElementById('salesPriceLevel');

    const priceLevel = priceLevelSelect ? priceLevelSelect.value : 'retail';

    cart.forEach(item => {

        // البحث عن المنتج الأصلي في قاعدة البيانات لجلب أحدث أسعار الجملة والقطاعي

        const product = productsDB.find(p => p.id === item.id);

        if (!product) return;

        let basePrice = 0;

        if (item.selectedVariant) {

            if (priceLevel === 'wholesale') {
                basePrice = parseFloat(item.selectedVariant.wholesale) || parseFloat(item.selectedVariant.price) || parseFloat(product.wholesale) || parseFloat(product.price) || 0;
            } else {
                basePrice = parseFloat(item.selectedVariant.price) || parseFloat(product.price) || 0;
            }

        } else if (item.selectedUnit && typeof item.selectedUnit === 'object') {

            // إذا كان هناك وحدة مختارة، نبحث عن نفس الوحدة في المنتج الأصلي

            const unitInDb = product.units ? product.units.find(u => u.unitName === item.selectedUnit.unitName) : null;

            if (unitInDb) {

                if (priceLevel === 'wholesale') {

                    basePrice = parseFloat(unitInDb.wholesale) || parseFloat(unitInDb.price) || 0;

                } else {

                    basePrice = parseFloat(unitInDb.price) || 0;

                }

            } else {

                basePrice = (priceLevel === 'wholesale') ? (parseFloat(product.wholesale) || parseFloat(product.price) || 0) : (parseFloat(product.price) || 0);

            }

        } else {

            // السعر الأساسي للمنتج

            if (priceLevel === 'wholesale') {

                basePrice = parseFloat(product.wholesale) || parseFloat(product.price) || 0;

            } else {

                basePrice = parseFloat(product.price) || 0;

            }

        }

        item.originalPrice = basePrice;
        const itemDisc = parseFloat(item.discount !== undefined ? item.discount : product.discount) || 0;
        item.discount = itemDisc;
        if (itemDisc > 0) {
            item.price = Number(Math.max(0, basePrice - (basePrice * itemDisc / 100)).toFixed(2));
        } else {
            item.price = basePrice;
        }

    });

    if (typeof showToast === 'function') {

        showToast(`تم تحويل الأسعار إلى وضع: ${priceLevel === 'wholesale' ? 'الجملة 📦' : 'القطاعي 🛒'}`, 'info');

    }

    renderCart();

}

function calculateTotals(subTotalParam) {

    // إذا لم يتم تمرير المجموع الفرعي، نحسبه من الجدول الحالي

    let subTotal = subTotalParam;

    if (subTotal === undefined) {

        subTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    }

    // تحديث إجمالي الأصناف والكمية

    const itemsCount = cart.length;

    const totalQty = cart.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

    if (document.getElementById('salesItemsCount')) document.getElementById('salesItemsCount').innerText = itemsCount;

    if (document.getElementById('salesTotalQty')) document.getElementById('salesTotalQty').innerText = totalQty;

    if (document.getElementById('subTotalDisplay')) document.getElementById('subTotalDisplay').innerText = subTotal.toFixed(2);

    // حساب الخصم والتحقق من صحته وقواعد الأمان المنطقية
    let discountVal = parseFloat(document.getElementById('discountInput').value) || 0;
    if (discountVal < 0) {
        document.getElementById('discountInput').value = 0;
        discountVal = 0;
        if (typeof showToast === 'function') showToast("⚠️ لا يمكن إدخال قيمة خصم بالسالب!", "warning");
    }

    const discountType = document.getElementById('discountType').value;
    let discountAmount = (discountType === 'perc') ? (subTotal * discountVal / 100) : discountVal;
    
    if (discountAmount > subTotal && subTotal > 0) {
        if (typeof showToast === 'function') showToast("⚠️ قيمة الخصم أكبر من إجمالي الفاتورة! تم ضبط الخصم بحد أقصى مساوٍ للفاتورة", "warning");
        discountAmount = subTotal;
    }

    if (document.getElementById('salesDiscountAmountDisplay')) document.getElementById('salesDiscountAmountDisplay').innerText = discountAmount.toFixed(2);

    // حساب الإضافة/الضريبة والتحقق من قيم الأمان
    let taxVal = parseFloat(document.getElementById('taxInput').value) || 0;
    if (taxVal < 0) {
        document.getElementById('taxInput').value = 0;
        taxVal = 0;
        if (typeof showToast === 'function') showToast("⚠️ لا يمكن إدخال قيمة إضافة أو ضريبة بالسالب!", "warning");
    }

    const taxType = document.getElementById('taxType').value;
    let taxAmount = (taxType === 'perc') ? (subTotal * taxVal / 100) : taxVal;

    if (document.getElementById('salesTaxAmountDisplay')) document.getElementById('salesTaxAmountDisplay').innerText = taxAmount.toFixed(2);

    const settings = JSON.parse(getStore('pos_settings') || '{}');
    const globalTaxEnabled = settings.taxEnabled || false;
    const globalTaxPercent = parseFloat(settings.taxPercent) || 0;
    let globalTaxAmount = globalTaxEnabled ? (subTotal * globalTaxPercent / 100) : 0;

    currentTotal = subTotal - discountAmount + taxAmount + globalTaxAmount;

    if (currentTotal < 0) currentTotal = 0;

    // تحديث إجمالي كل سطر في الجدول ليعكس توزيع الخصم والمصاريف
    if (subTotal > 0) {
        const ratio = currentTotal / subTotal;
        const rows = document.querySelectorAll('#cartTableBody tr');
        cart.forEach((item, index) => {
            const row = rows[index];
            if (row) {
                const totalCell = row.querySelector('.cart-item-total') || row.cells[8];
                if (totalCell) {
                    totalCell.innerText = (item.price * item.qty * ratio).toFixed(2);
                }
            }
        });
    }

    // تحديث الإجمالي

    if (document.getElementById('totalAmount')) document.getElementById('totalAmount').innerText = currentTotal.toFixed(2);

    // حساب إجمالي المديونية المتراكمة (الرصيد السابق + الفاتورة - المدفوع)

    const prevBal = parseFloat(document.getElementById('prevBalanceDisplay').innerText) || 0;

    const tenderedInput = document.getElementById('tenderedAmount');

    const tendered = parseFloat(tenderedInput ? tenderedInput.value : 0) || 0;

    const grandTotalDebt = prevBal + currentTotal - tendered;

    if (document.getElementById('grandDebtDisplay')) {

        document.getElementById('grandDebtDisplay').innerText = grandTotalDebt.toFixed(2);

    }

    if (typeof calculateChange === 'function') calculateChange();

    // تحديث شارة الربح المباشرة (مع مراعاة تكلفة الوحدة الفرعية)

    const totalCost = cart.reduce((sum, item) => {

        let itemCost = 0;

        if (item.selectedUnit && typeof item.selectedUnit === 'object') {

            const unitCost = parseFloat(item.selectedUnit.cost);

            if (!isNaN(unitCost) && item.selectedUnit.cost !== '') {

                // تكلفة الوحدة الفرعية مدخلة صراحةً

                itemCost = unitCost * item.qty;

            } else {

                // الوحدة بدون تكلفة مخصصة → استخدم التكلفة الأساسية × factor

                const factor = parseFloat(item.unitFactor) || 1;

                itemCost = (parseFloat(item.cost) || 0) * item.qty * factor;

            }

        } else {

            // لا وحدة فرعية → تكلفة المنتج مباشرة

            itemCost = (parseFloat(item.cost) || 0) * item.qty;

        }

        return sum + itemCost;

    }, 0);

    const profit = currentTotal - totalCost;

    const profitBadge = document.getElementById('currentProfitBadge');

    if (profitBadge) {

        if (cart.length === 0 || currentTotal === 0) {

            profitBadge.innerText = '0.00';

            profitBadge.style.color = '';

        } else {

            profitBadge.innerText = profit.toFixed(2);

            profitBadge.style.color = profit >= 0 ? 'var(--main-green)' : '#e74c3c';

        }

    }

    // منطق الأزرار الذكية

    const btnContainer = document.getElementById('dynamicButtons');

    btnContainer.innerHTML = '';

    // الحصول على وسيلة الدفع المختارة

    const method = getSelectedPaymentMethod('sales-section');

    if (currentTotal > 0 && method === 'آجل') {

        btnContainer.style.display = 'flex';

        // الزر الأول: المبلغ بالضبط

        createBtn(btnContainer, currentTotal);

        // الزر الثاني: أقرب رقم صحيح أعلى (Logic)

        let nextRound = Math.ceil(currentTotal / 50) * 50;

        if (nextRound === currentTotal) nextRound += 50;

        createBtn(btnContainer, nextRound);

        // زر ثالث اختياري (فئة أكبر)

        let bigNote = Math.ceil(currentTotal / 100) * 100;

        if (bigNote <= nextRound) bigNote += 100;

        createBtn(btnContainer, bigNote);

    } else {

        btnContainer.style.display = 'none';

    }

}

async function saveBill(force = false, accountChecked = false) {

    if (!checkPermission('docs_add')) return false;

    if (window.isSavingTransaction) return false;

    window.isSavingTransaction = true;

    try {

        // --- 🛑 التحقق من حدود الباقة المجانية (Free Trial Limit) ---

        const currentPlan = window.getBayanPlan();

        if (!isEditMode && !window.enforceSubscriptionCheck('invoice')) {
            return false;
        }

        if (cart.length === 0) {

            showCustomAlert({ titleText: '⚠️ الفاتورة فارغة', msg: 'لا يمكن حفظ فاتورة بدون أصناف.' });

            return false;

        }

        // --- 1. التحقق الصارم من توفر الكميات في المخزن (Strict Stock & Variant Check) ---
        let stockErrors = [];

        cart.forEach(item => {
            const p = productsDB.find(x => x.id === item.id || x.name === item.name);
            if (p) {
                let factor = 1;
                if (item.selectedUnit && typeof item.selectedUnit === 'object' && item.selectedUnit.factor) {
                    factor = parseFloat(item.selectedUnit.factor) || 1;
                } else if (item.unit && p.units) {
                    const u = p.units.find(un => un.unitName === item.unit);
                    if (u) factor = parseFloat(u.factor) || 1;
                }
                const reqBaseQty = (parseFloat(item.qty) || 0) * factor;

                // في وضع التعديل (isEditMode)، الكمية المباعة أصلاً في هذه الفاتورة تُضاف للرصيد المتاح لأنها تخص هذه الفاتورة
                let originalSoldBaseQty = 0;
                if (isEditMode && Array.isArray(editingOriginalItems)) {
                    const origMatches = editingOriginalItems.filter(o => {
                        const isProdMatch = (o.productId && p.id && String(o.productId) === String(p.id)) || (o.product === p.name);
                        if (!isProdMatch) return false;
                        const isVariantMatch = (!item.selectedSize || (o.size || o.selectedSize) === item.selectedSize) &&
                                               (!item.selectedColor || (o.color || o.selectedColor) === item.selectedColor);
                        return isVariantMatch;
                    });
                    originalSoldBaseQty = origMatches.reduce((sum, o) => {
                        let oFactor = parseFloat(o.unitFactor) || 1;
                        if (o.unit && p.units && Array.isArray(p.units)) {
                            const u = p.units.find(un => (un.unitName || '').trim() === (o.unit || '').trim());
                            if (u) oFactor = parseFloat(u.factor) || 1;
                        }
                        return sum + ((parseFloat(o.qty) || 0) * oFactor);
                    }, 0);
                }

                if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
                    const vMatch = window.findMatchingVariant(p, item);
                    if (vMatch) {
                        const vStock = (parseFloat(vMatch.stock) || 0) + (isEditMode ? originalSoldBaseQty : 0);
                        if (reqBaseQty > vStock) {
                            const variantDesc = [vMatch.size ? `مقاس ${vMatch.size}` : '', vMatch.color ? `لون ${vMatch.color}` : ''].filter(Boolean).join(' - ') || 'المقاس/اللون المختار';
                            stockErrors.push(`❌ ${item.name} (${variantDesc}): مطلوب(${item.qty} ${item.unit || ''}) / متوفر بالمخزن (${(vStock / factor).toFixed(2)})`);
                        }
                    } else {
                        const pStock = getActiveWarehouseStock(p) + (isEditMode ? originalSoldBaseQty : 0);
                        if (reqBaseQty > pStock) {
                            stockErrors.push(`❌ ${item.name}: مطلوب(${item.qty} ${item.unit || ''}) / متوفر بالمخزن (${(pStock / factor).toFixed(2)})`);
                        }
                    }
                } else {
                    const pStock = getActiveWarehouseStock(p) + (isEditMode ? originalSoldBaseQty : 0);
                    if (reqBaseQty > pStock) {
                        stockErrors.push(`❌ ${item.name}: مطلوب(${item.qty} ${item.unit || ''}) / متوفر بالمخزن (${(pStock / factor).toFixed(2)})`);
                    }
                }
            }
        });

        if (stockErrors.length > 0) {
            showCustomAlert({
                type: 'error',
                titleText: '🚫 نفاد الكمية في المخزن',
                msg: 'الكميات التالية غير متوفرة في المخزن ولا يمكن إتمام البيع بالسالب:\n\n' + stockErrors.join('\n') + '\n\nيرجى مراجعة الكميات المتاحة.'
            });
            window.isSavingTransaction = false;
            return false;
        }

        // --- 🛑 شرط محاسبي: الآجل لازم عميل مسجل ---

        const selectedMethod = getSelectedPaymentMethod('sales-section');

        const customerName = document.getElementById('customerName').value.trim();

        const tenderedInput = document.getElementById('tenderedAmount');
        const paidBox = document.getElementById('paidBox');

        const isExplicitCreditMethod = window.isTransactionCredit(selectedMethod, 0, 0, 0);

        let tendered = 0;
        if (!isExplicitCreditMethod) {
            if (!paidBox || paidBox.style.display === 'none' || !tenderedInput || tenderedInput.value === '' || tenderedInput.value === '0') {
                tendered = currentTotal;
                if (tenderedInput) {
                    tenderedInput.value = currentTotal.toFixed(2);
                }
            } else {
                tendered = (tenderedInput && tenderedInput.value !== '') ? (parseFloat(tenderedInput.value) || currentTotal) : currentTotal;
            }
        } else {
            tendered = (tenderedInput && tenderedInput.value !== '') ? (parseFloat(tenderedInput.value) || 0) : 0;
        }

        const isCredit = isExplicitCreditMethod || (!isExplicitCreditMethod && paidBox && paidBox.style.display !== 'none' && ((currentTotal - tendered) > 0.001));

        if (customerName && !window.isGenericCashPartner(customerName) && typeof checkAccountFrozenAndAlert === 'function') {
            if (checkAccountFrozenAndAlert(customerName)) {
                return false;
            }
        }

        // التحقق الإلزامي من حساب العميل للآجل والتسجيل السريع
        if (!accountChecked) {
            window.isSavingTransaction = false;
            const ok = await window.ensurePartnerAccountExists(customerName, 'عميل', isCredit, () => {
                saveBill(force, true);
            });
            if (!ok) return false;
            window.isSavingTransaction = true;
        }

        // التحقق فقط إذا كان المبلغ المدفوع أقل من المطلوب ولم تكن الفاتورة آجلة (تأكيد الحفظ)

        if (!force && !isCredit && tendered < currentTotal) {

            showCustomAlert({

                type: 'question',

                titleText: '❓ تأكيد العملية',

                msg: 'المبلغ المدفوع أقل من الإجمالي. هل تريد تسجيل الباقي كمديونية؟',

                showCancel: true,

                confirmText: 'نعم، سجل',

                cancelText: 'تراجع',

                onConfirm: () => saveBill(true, true)

            });

            return false;

        }

        // تحديث رصيد العميل بناءً للميزة المضافة لجمع الرصيد السابق وعرض تنبيه ذكي

        if (!force && isCredit) {

            const cleanArabic = (str) => (str || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىي]/g, 'ي').replace(/\s+/g, ' ');

            const targetNameClean = cleanArabic(customerName);

            const accIndex = accounts.findIndex(a => cleanArabic(a.name) === targetNameClean);

            if (accIndex !== -1) {

                const acc = accounts[accIndex];

                // التحقق من الحد الائتماني

                const limit = parseFloat(acc.maxDebt) || 0;

                const currentDebt = getAccountBalance(acc.name);

                const newDebtAmount = currentTotal - tendered;

                if (limit > 0 && (currentDebt + newDebtAmount) > limit) {

                    showCustomAlert({

                        type: 'warning',

                        titleText: '⚠️ تحذير شديد: تجاوز الحد الائتماني المسموح!',

                        msg: `

                                <div style="text-align: right; padding: 10px; background: rgba(230, 126, 34, 0.1); border-radius: 15px; border: 1px solid rgba(230, 126, 34, 0.2);">

                                    <p style="margin-bottom: 10px; font-size: 1.1rem;">👤 العميل: <b style="color: var(--accent-gold);">${acc.name}</b></p>

                                    <hr style="opacity: 0.1; margin: 10px 0;">

                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">

                                        <div>

                                            <span style="font-size: 0.8rem; color: #888;">أعلى دين مسموح:</span>

                                            <div style="font-size: 1.2rem; font-weight: 900; color: #27ae60;">${limit.toFixed(2)}</div>

                                        </div>

                                        <div>

                                            <span style="font-size: 0.8rem; color: #888;">الدين الحالي:</span>

                                            <div style="font-size: 1.2rem; font-weight: 900; color: #e74c3c;">${currentDebt.toFixed(2)}</div>

                                        </div>

                                    </div>

                                    <div style="margin-top: 15px; padding: 10px; background: #e67e22; color: white; border-radius: 10px; font-weight: 900; text-align: center;">

                                        ⚠️ الدين بعد الفاتورة: ${(currentDebt + newDebtAmount).toFixed(2)}

                                    </div>

                                    <p style="margin-top: 15px; color: #333; font-size: 0.95rem; text-align: center; font-weight: bold;">

                                        لقد تجاوز العميل الحد الائتماني المحدد له! هل تريد المتابعة وحفظ الفاتورة على أي حال؟

                                    </p>

                                </div>

                            `,

                        showCancel: true,

                        confirmText: 'نعم، احفظ الفاتورة وتجاوز الحد',

                        cancelText: 'تراجع (لتعديل حد الدين من الحسابات)',

                        onConfirm: () => {

                            saveBill(true);

                        }

                    });

                    return false; // إيقاف العملية مؤقتاً في انتظار التأكيد

                }

                // التنبيه الذكي للمديونية

                const totalDue = currentDebt + newDebtAmount;

                showCustomAlert({

                    type: 'question',

                    titleText: '❓ إجمالي الحساب المطلوب',

                    msg: `العميل عليه سابقاً ${currentDebt.toFixed(2)} ج.م، وبالفاتورة الحالية المستحق ${newDebtAmount.toFixed(2)} ج.م.\n\nيصبح إجمالي المديونية: ${totalDue.toFixed(2)} ج.م.\n\nهل تريد الحفظ؟`,

                    showCancel: true,

                    confirmText: 'نعم، احفظ الفاتورة',

                    cancelText: 'إلغاء',

                    onConfirm: () => {

                        // التحديث سيتم عند استدعاء الدالة بقوة

                        saveBill(true);

                    }

                });

                return false; // نوقف التنفيذ حتى يؤكد المستخدم

            }

        }

        // حفظ أسباب الخصم والإضافة الجديدة (التعلم الآلي)

        const discReason = document.getElementById('discountReason').value.trim();

        const txReason = document.getElementById('taxReason').value.trim();

        if (discReason) addNewReason(discReason, discountReasons, 'discountReasonsList');

        if (txReason) addNewReason(txReason, taxReasons, 'taxReasonsList');

        // حساب رقم الفاتورة (Invoice ID) والتعامل مع المخزن في وضع التعديل

        let newInvoiceId;

        if (isEditMode && editingInvoiceId) {

            newInvoiceId = editingInvoiceId;

            // عكس المخزن القديم وحذف السجلات السابقة باستخدام الوظيفة المركزية

            if (window.revertAndClearOldInvoice) {

                await window.revertAndClearOldInvoice(editingInvoiceId, editingInvoiceType);

            }

        } else {

            newInvoiceId = typeof getNextSequence === 'function' ? getNextSequence('بيع') : 1;

        }

        // تجميد الوقت: استخدام التاريخ الأصلي إذا كنا في وضع التعديل

        const dt = isEditMode ? editingOriginalDate : getTransactionDateTime('salesDate', 'salesTime');

        // حساب النسبة لتوزيع الخصم والضريبة على الأصناف في السجل

        const subTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

        const ratio = subTotal > 0 ? (currentTotal / subTotal) : 1;

        // 3. خصم الكميات الجديدة من المخزن وتسجيل العمليات

        let accumulatedItemsTotal = 0;

        const activeWH = (typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';

        cart.forEach((cartItem, idx) => {

            const product = productsDB.find(p => p.id === cartItem.id || p.name === cartItem.name);

            const factor = cartItem.unitFactor || 1;
            const baseQty = cartItem.qty * factor;

            if (product) {
                product.stock = Math.max(0, (parseFloat(product.stock) || 0) - baseQty);
                if (!product.warehouseStocks) product.warehouseStocks = {};
                product.warehouseStocks[activeWH] = Math.max(0, (parseFloat(product.warehouseStocks[activeWH]) || 0) - baseQty);

                // خصم الكمية من تشكيلة الصنف (اللون أو المقاس المحدد)
                if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
                    const vMatch = window.findMatchingVariant(product, cartItem);
                    if (vMatch) {
                        vMatch.stock = Math.max(0, (parseFloat(vMatch.stock) || 0) - baseQty);
                    }
                    product.stock = product.variants.reduce((sum, v) => sum + (parseFloat(v.stock) || 0), 0);
                }
            }

            let itemNetTotal = cartItem.price * cartItem.qty * ratio;
            if (idx === cart.length - 1) {
                itemNetTotal = currentTotal - accumulatedItemsTotal;
            } else {
                itemNetTotal = parseFloat(itemNetTotal.toFixed(2));
                accumulatedItemsTotal += itemNetTotal;
            }
            let itemTotalCost = 0;
            const baseCost = product ? (parseFloat(product.cost) || 0) : 0;

            if (cartItem.selectedUnit && typeof cartItem.selectedUnit === 'object') {
                const unitCost = parseFloat(cartItem.selectedUnit.cost);
                if (!isNaN(unitCost) && unitCost > 0) {
                    itemTotalCost = unitCost * cartItem.qty;
                } else {
                    itemTotalCost = baseCost * baseQty;
                }
            } else {
                itemTotalCost = baseCost * baseQty;
            }

            const profit = itemNetTotal - itemTotalCost;

            // تسجيل الحركة الجديدة
            transactions.push({
                date: dt.full,
                dateISO: dt.iso,
                timeISO: dt.time,
                type: 'بيع 📤',
                method: selectedMethod,
                invoiceId: newInvoiceId,
                product: product ? product.name : (cartItem.name || 'صنف حر'),
                unit: cartItem.selectedUnit ? (typeof cartItem.selectedUnit === 'object' ? cartItem.selectedUnit.unitName : cartItem.selectedUnit) : (cartItem.unit || 'قطعة'),
                size: cartItem.selectedSize || '',
                color: cartItem.selectedColor || '',
                priceLevel: document.getElementById('salesPriceLevel')?.value || 'retail',
                qty: cartItem.qty,
                price: cartItem.price,
                discount: (cartItem.qty * cartItem.price > itemNetTotal) ? ((cartItem.qty * cartItem.price) - itemNetTotal).toFixed(2) : '0.00',
                addition: (itemNetTotal > cartItem.qty * cartItem.price) ? (itemNetTotal - (cartItem.qty * cartItem.price)).toFixed(2) : '0.00',
                total: itemNetTotal.toFixed(2),
                profit: profit.toFixed(2),
                partner: document.getElementById('customerName')?.value?.trim() || (isEditMode && window.editingOriginalPartner ? window.editingOriginalPartner : 'عميل نقدي'),
                user: (isEditMode && window.editingOriginalUser) ? window.editingOriginalUser : (currentUser ? currentUser.name : '-'),
                notes: document.getElementById('salesNotes') ? document.getElementById('salesNotes').value.trim() : '',
                paidAmount: (idx === 0) ? tendered : 0,
                isInvoiceHead: (idx === 0),
                invoiceDiscount: (idx === 0) ? (parseFloat(document.getElementById('discountInput')?.value) || 0) : 0,
                invoiceDiscountType: (idx === 0) ? (document.getElementById('discountType')?.value || 'val') : 'val',
                invoiceTax: (idx === 0) ? (parseFloat(document.getElementById('taxInput')?.value) || 0) : 0,
                invoiceTaxType: (idx === 0) ? (document.getElementById('taxType')?.value || 'val') : 'val',
                invoiceGrandTotal: (idx === 0) ? currentTotal : 0,
                warehouse: activeWH,
                unitFactor: factor, // حفظ المعامل للرجوع إليه عند التعديل مستقبلاً
                editDate: isEditMode ? `${new Date().toLocaleString('ar-EG')} (تعديل: ${currentUser ? currentUser.name : 'مجهول'})` : '-'
            });

        });

        await saveData();

        if (typeof logAuditAction === 'function') {
            const auditAction = isEditMode ? 'تحديث فاتورة بيع' : 'حفظ فاتورة بيع جديدة';
            logAuditAction(auditAction, `فاتورة رقم #${newInvoiceId}, الإجمالي: ${currentTotal.toFixed(2)} ج.م, العميل: ${document.getElementById('customerName')?.value || 'نقدي'}, طريقة الدفع: ${selectedMethod}`);
        }

        // 🖨️ فحص وتنفيذ الطباعة التلقائية فور اكتمال ونجاح حفظ الفاتورة بالكامل
        const shouldAutoPrint = typeof isSalesAutoPrintEnabled === 'function' && isSalesAutoPrintEnabled();
        if (shouldAutoPrint) {
            try {
                if (typeof printBill === 'function') {
                    printBill(true);
                }
            } catch (printErr) {
                console.error("Auto-print failed:", printErr);
            }
        }

        showCustomAlert({

            type: 'success',

            titleText: isEditMode ? '✅ تم تحديث الفاتورة' : '✅ تم الحفظ بنجاح',

            msg: `تم ${isEditMode ? 'تحديث' : 'حفظ'} فاتورة البيع رقم #${newInvoiceId} ومعالجة فرق المخزون والمديونية.`

        });

        // إعادة ضبط وضع التعديل (Reset Edit State)

        isEditMode = false;

        editingInvoiceId = null;

        editingOriginalDate = null;

        editingOriginalItems = [];

        const mainSaveBtn = document.querySelector('#sales-section .btn-save');

        if (mainSaveBtn) {

            mainSaveBtn.style.background = '';
            mainSaveBtn.innerText = '💾 حفظ الفاتورة (F9)';
        }

        if (typeof _invSummaryCache !== 'undefined') _invSummaryCache = null;
        if (typeof renderInventoryTable === 'function') renderInventoryTable();
        if (typeof renderCards === 'function') renderCards();
        if (typeof renderWarehouseReportTable === 'function') renderWarehouseReportTable();
        if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
        if (typeof renderHistoryTable === 'function') renderHistoryTable();
        if (typeof renderAccountsTable === 'function') renderAccountsTable();
        if (typeof updateProductSearchDatalist === 'function') updateProductSearchDatalist();

        resetBill();

        return true;

    } finally {

        window.isSavingTransaction = false;

    }

}

function shareBill(platform) {

    if (!navigator.onLine) {

        alert("⚠️ أنت في وضع الأوفلاين (غير متصل بالإنترنت).\nلا يمكن مشاركة الفاتورة عبر واتساب أو تلجرام حالياً.");

        return;

    }

    if (cart.length === 0) return alert("الفاتورة فارغة!");

    let text = `🛒 * فاتورة جديدة من متجر السعادة *\n`;

    text += `📅 التاريخ: ${new Date().toLocaleString('ar-EG')}\n`;

    text += `👤 العميل: ${document.getElementById('customerName').value || 'نقدي'}\n`;

    text += `------------------\n`;

    cart.forEach(item => {

        const unitName = item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (item.unit || 'قطعة');

        text += `▪️ ${item.name} (${item.qty} ${unitName}) = ${(item.price * item.qty).toFixed(2)} \n`;

    });

    text += `------------------\n`;

    text += `💰 * الإجمالي: ${currentTotal.toFixed(2)} ج.م *\n`;

    const encodedText = encodeURIComponent(text);

    let url = '';

    if (platform === 'wa') {

        url = `https://wa.me/?text=${encodedText}`;

    } else if (platform === 'tg') {

        url = `https://t.me/share/url?url=${encodedText}&text=`; // Telegram format

    }

    window.open(url, '_blank');

}

function printBill(isAuto = false) {

    if (cart.length === 0) return alert("⚠️ الفاتورة فارغة! لا يمكن طباعة فاتورة بدون أصناف.");

    const method = getSelectedPaymentMethod('sales-section');

    const customerNameInput = document.getElementById('customerName');

    const customer = customerNameInput ? customerNameInput.value.trim() : 'عميل نقدي';

    // --- حماية: منع طباعة آجل لعميل نقدي ---

    if (method.includes('آجل') && (customer === "" || customer.includes('نقدي') || customer.includes('كاش'))) {

        showCustomAlert({

            type: 'error',

            titleText: '⚠️ خطأ في الطباعة',

            msg: 'لا يمكن طباعة فاتورة "آجل" لحساب "نقدي". يرجى اختيار عميل مسجل أولاً لمتابعة مديونيته.'

        });

        if (customerNameInput) {

            customerNameInput.focus();

            customerNameInput.style.border = '2px solid red';

        }

        return;

    }

    const dt = getTransactionDateTime('salesDate', 'salesTime');

    const shopName = document.getElementById('shopName').value || 'متجر السعادة';

    const shopAddress = document.getElementById('shopAddress').value || '';

    const shopPhone = document.getElementById('shopPhone1').value || '';

    const footerMsg = document.getElementById('printFooterMsg').value || 'شكراً لزيارتكم!';

    const salesId = document.getElementById('salesBadgeID') ? document.getElementById('salesBadgeID').innerText : '---';

    const isExplicitCredit = method.includes('آجل') || method.includes('اجل') || method.includes('ذمم') || method.includes('credit');
    let paidValue = currentTotal;
    const tenderedInp = document.getElementById('tenderedAmount');
    if (tenderedInp && tenderedInp.value !== '') {
        paidValue = parseFloat(tenderedInp.value) || 0;
    } else if (isExplicitCredit) {
        paidValue = 0;
    }

    let prevBalance = 0;
    if (customer && !window.isGenericCashPartner(customer)) {
        if (typeof getHistoricalPartnerBalance === 'function') {
            prevBalance = getHistoricalPartnerBalance(customer, salesId);
        } else if (typeof getAccountBalance === 'function') {
            prevBalance = getAccountBalance(customer, salesId);
        }
    } else if (document.getElementById('prevBalanceDisplay')) {
        prevBalance = parseFloat(document.getElementById('prevBalanceDisplay').innerText) || 0;
    }

    let invoiceTotal = currentTotal + prevBalance;
    let creditValue = Math.max(0, invoiceTotal - paidValue);

    let customerAddressToPrint = currentSessionSelectedAddress;

    if (!customerAddressToPrint) {

        const acc = accounts.find(a => a.name === customer);

        if (acc) customerAddressToPrint = (acc.address || acc.mobile || '').split(/[|,]/)[0];

    }

    let subTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    let discountVal = parseFloat(document.getElementById('discountInput').value) || 0;

    const discountType = document.getElementById('discountType').value;

    let discountAmount = (discountType === 'perc') ? (subTotal * discountVal / 100) : discountVal;

    let taxVal = parseFloat(document.getElementById('taxInput').value) || 0;

    const taxType = document.getElementById('taxType').value;

    let taxAmount = (taxType === 'perc') ? (subTotal * taxVal / 100) : taxVal;

    const taxReasonEl = document.getElementById('taxReason');

    const selectedTaxReason = taxReasonEl ? taxReasonEl.value.trim() : 'إضافة';

    const settings = JSON.parse(getStore('pos_settings') || '{}');

    const globalTaxEnabled = settings.taxEnabled || false;

    const globalTaxPercent = parseFloat(settings.taxPercent) || 0;

    let globalTaxAmount = globalTaxEnabled ? (subTotal * globalTaxPercent / 100) : 0;

    const invoiceData = {

        invoiceNumber: salesId,

        invoiceType: method,

        date: dt.iso || dt.full.split(' ')[0],

        time: dt.time || '',

        cashier: currentUser.name,

        customer: customer,

        items: cart,

        subTotal: subTotal,

        discount: discountAmount,

        tax: taxAmount,

        taxLabel: selectedTaxReason,

        globalTax: globalTaxAmount,

        totalAmount: currentTotal,

        paid: paidValue,

        deferred: currentTotal - paidValue,

        prevBalance: prevBalance,

        currentBalance: prevBalance + (currentTotal - paidValue),

        docType: 'sales'

    };

    const printFn = (typeof printInvoice === 'function') ? printInvoice : (typeof window.printInvoice === 'function' ? window.printInvoice : null);

    if (printFn) {

        printFn(invoiceData, isAuto);

    } else {

        alert('خطأ: محرك الطباعة غير متوفر!');

    }

}

window.printBill = printBill;

async function showCurrentBillProfit() {

    if (cart.length === 0) return alert("⚠️ الفاتورة فارغة!");

    let totalCost = 0;

    let totalSale = 0;

    for (const item of cart) {

        // محاولة جلب المنتج بكل الطرق (رقم أو نص) لضمان الدقة

        let latestProduct = await db.products.get(item.id);

        if (!latestProduct && !isNaN(item.id)) {

            latestProduct = await db.products.get(Number(item.id));

        }

        const baseCost = latestProduct ? (parseFloat(latestProduct.avgBuyPrice) || parseFloat(latestProduct.cost) || 0) : (parseFloat(item.cost) || 0);

        console.log(`DB Debug - Item: ${item.name}, ID: ${item.id}, Found in DB: ${!!latestProduct}, Avg Price: ${baseCost}`);

        let itemCost = 0;

        const factor = parseFloat(item.unitFactor) || 1;

        if (item.selectedUnit && typeof item.selectedUnit === 'object') {

            let unitCost = 0;

            if (latestProduct && latestProduct.units) {

                const u = latestProduct.units.find(un => un.unitName === item.selectedUnit.unitName);

                if (u) unitCost = parseFloat(u.avgBuyPrice) || parseFloat(u.cost) || 0;

            }

            if (unitCost > 0) {

                itemCost = unitCost * item.qty;

            } else {

                itemCost = baseCost * item.qty * factor;

            }

        } else {

            itemCost = baseCost * item.qty * factor;

        }

        totalCost += itemCost;

        totalSale += item.price * item.qty;

    }

    let discountVal = parseFloat(document.getElementById('discountInput').value) || 0;

    const discountType = document.getElementById('discountType').value;

    let discountAmount = (discountType === 'perc') ? (totalSale * discountVal / 100) : discountVal;

    const profit = (totalSale - discountAmount) - totalCost;

    // تعبئة بيانات المودرن مودال الجديد

    document.getElementById('pTotalSales').innerText = totalSale.toFixed(2);

    document.getElementById('pTotalCost').innerText = totalCost.toFixed(2);

    document.getElementById('pDiscount').innerText = discountAmount.toFixed(2);

    document.getElementById('pNetProfit').innerText = profit.toFixed(2);

    // إظهار المودال

    document.getElementById('profitModal').classList.remove('hidden');

}

// --- دوال الطباعة للأقسام الأخرى ---

// تمت إزالة التعريف المتكرر هنا واستخدام التعريف المطور بالأسفل

function updateReturnTotal(type) {

    let data = returnCart;

    let totalAmountId = 'returnTotalAmount';

    let discountId = 'salesReturnDiscount';

    let taxId = 'salesReturnTax';

    let tableBodyId = 'returnCartBody';

    // معرفات الملخص الجديد

    let itemsCountId = 'returnItemsCount';

    let totalQtyId = 'returnTotalQty';

    let subTotalDisplayId = 'salesReturnSubTotal';

    let discDispId = 'salesReturnDiscountAmountDisplay';

    let taxDispId = 'salesReturnTaxAmountDisplay';

    if (type === 'purchase') {

        data = purReturnCart;

        totalAmountId = 'purReturnTotalAmount';

        discountId = 'purReturnDiscount';

        taxId = 'purReturnTax';

        tableBodyId = 'purReturnCartBody';

        itemsCountId = 'purReturnItemsCount';

        totalQtyId = 'purReturnTotalQty';

        subTotalDisplayId = 'purReturnSubTotal';

        discDispId = 'purReturnDiscountAmountDisplay';

        taxDispId = 'purReturnTaxAmountDisplay';

    }

    const subTotal = data.reduce((a, b) => a + (b.price * b.qty), 0);

    // تحديث الإحصائيات في الملخص

    const totalQty = data.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

    if (document.getElementById(itemsCountId)) document.getElementById(itemsCountId).innerText = data.length;

    if (document.getElementById(totalQtyId)) document.getElementById(totalQtyId).innerText = totalQty;

    if (document.getElementById(subTotalDisplayId)) document.getElementById(subTotalDisplayId).innerText = subTotal.toFixed(2);

    // حساب الخصم

    let discVal = 0;

    const discEl = document.getElementById(discountId);

    if (discEl) discVal = parseFloat(discEl.value) || 0;

    const discTypeEl = document.getElementById(discountId + 'Type');

    const discType = discTypeEl ? discTypeEl.value : 'fixed';

    let discAmount = (discType === 'perc') ? (subTotal * discVal / 100) : discVal;

    if (document.getElementById(discDispId)) document.getElementById(discDispId).innerText = discAmount.toFixed(2);

    // حساب الإضافة/الضريبة

    let taxVal = 0;

    const taxEl = document.getElementById(taxId);

    if (taxEl) taxVal = parseFloat(taxEl.value) || 0;

    const taxTypeEl = document.getElementById(taxId + 'Type');

    const taxType = taxTypeEl ? taxTypeEl.value : 'fixed';

    let taxAmount = (taxType === 'perc') ? (subTotal * taxVal / 100) : taxVal;

    if (document.getElementById(taxDispId)) document.getElementById(taxDispId).innerText = taxAmount.toFixed(2);

    let finalTotal = subTotal - discAmount + taxAmount;

    if (finalTotal < 0) finalTotal = 0;

    document.getElementById(totalAmountId).innerText = finalTotal.toFixed(2);

    const bigTotalId = (type === 'purchase') ? 'purReturnFinalTotalBig' : 'salesReturnFinalTotalBig';

    const bigTotalEl = document.getElementById(bigTotalId);

    if (bigTotalEl) bigTotalEl.innerText = finalTotal.toFixed(2);

    // تحديث السطور ليعكس توزيع الخصم والضريبة

    if (subTotal > 0) {

        const ratio = finalTotal / subTotal;

        const rows = document.querySelectorAll(`#${tableBodyId} tr`);

        data.forEach((item, index) => {

            const row = rows[index];

            if (row) {

                const totalCell = row.cells[5];

                totalCell.innerText = (item.price * item.qty * ratio).toFixed(2);

            }

        });

    }

    // تحديث الرصيد المتوقع بعد تغيير الإجمالي

    const retType = (type === 'purchase') ? 'purchase' : 'sales';

    if (typeof updateProjectedAccountBalance === 'function') {

        updateProjectedAccountBalance(retType);

    }

}

// --- 1. مرتجع المبيعات (Sales Return) ---

function addToReturnCart(productId) {

    const product = productsDB.find(p => p.id === productId);

    if (!product) return;

    if (product.units && product.units.length > 1) {

        showUnitSelectionModal(product, 'sales-return');

        return;

    }

    const defUnit = (product.units && product.units.length > 0) ? product.units[0] : null;

    completeAddToReturnCart(product, defUnit);

}

function completeAddToReturnCart(product, selectedUnit) {

    let price = product.price;

    if (selectedUnit) {

        price = parseFloat(selectedUnit.price) || product.price;

    }

    returnCart.push({

        id: product.id,

        name: product.name,

        code: product.code || '---',

        price: price,

        qty: 1,

        maxQty: 9999,

        selectedUnit: selectedUnit

    });

    renderReturnCart();

}

// --- 2. مرتجع الشراء (Purchase Return) ---

function addToPurReturnCart(productId) {

    const product = productsDB.find(p => p.id === productId);

    if (!product) return;

    if (product.units && product.units.length > 1) {

        showUnitSelectionModal(product, 'purchase-return');

        return;

    }

    const defUnit = (product.units && product.units.length > 0) ? product.units[0] : null;

    completeAddToPurReturnCart(product, defUnit);

}

function completeAddToPurReturnCart(product, selectedUnit) {

    let cost = product.cost || 0;

    if (selectedUnit) {

        cost = parseFloat(selectedUnit.cost) || product.cost || 0;

    }

    purReturnCart.push({

        id: product.id,

        name: product.name,

        code: product.code || '---',

        price: cost,

        qty: 1,

        maxQty: 9999,

        selectedUnit: selectedUnit

    });

    renderPurReturnCart();

}

function renderReturnCart() {

    const tbody = document.getElementById('returnCartBody');

    if (!tbody) return;

    tbody.innerHTML = '';

    let totalQty = 0;

    returnCart.forEach((item, idx) => {

        const itemTotal = item.price * item.qty;

        totalQty += (parseFloat(item.qty) || 0);

        const product = productsDB.find(p => p.id === item.id);

        let unitOptions = `<option value="base" ${!item.selectedUnit ? 'selected' : ''}>${(product ? (product.unit || 'قطعة') : 'قطعة')}</option>`;

        if (product && product.units && product.units.length > 0) {

            unitOptions = product.units.map(u =>

                `<option value="${u.unitName}" ${item.selectedUnit && item.selectedUnit.unitName === u.unitName ? 'selected' : ''}>${u.unitName}</option>`

            ).join('');

        }

        const { sizeElement, colorElement } = renderVariantSelectElements(item, idx, 'return');

        const tr = document.createElement('tr');
        tr.setAttribute('data-index', idx);
        tr.style.transition = "0.2s";
        tr.innerHTML = `
                    <td style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${idx + 1}</td>
                    <td style="font-size: 0.85rem; color: #64748b; text-align: center; font-family: monospace;">${item.code || '---'}</td>
                    <td style="font-weight: 600; color: #1e293b;">${item.name}</td>
                    <td class="col-variant-size" style="text-align: center;">${sizeElement}</td>
                    <td class="col-variant-color" style="text-align: center;">${colorElement}</td>
                    <td>
                        <select onchange="updateReturnItemUnit(${idx}, this.value)" ${item.invoiceId ? 'disabled' : ''} 
                            style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 0.9rem; ${item.invoiceId ? 'opacity: 0.7; cursor: not-allowed;' : ''}">
                            ${unitOptions}
                        </select>
                    </td>

                    <td>

                        <input type="text" value="${item.qty}" 

                               inputmode="decimal"

                               oninput="this.value = this.value.replace(/[^0-9.]/g, ''); updateReturnItem(${idx}, 'qty', this.value, false)" 

                               onchange="updateReturnItem(${idx}, 'qty', this.value, true)"

                               onclick="this.select()" 

                               style="width: 100%; text-align: center; border: 1px solid transparent; background: transparent; padding: 6px; font-weight: bold; font-size: 1rem; color: #1e293b;">

                    </td>

                    <td>

                        <input type="text" value="${(parseFloat(item.price) || 0).toFixed(2)}" 

                               inputmode="decimal"

                               oninput="this.value = this.value.replace(/[^0-9.]/g, ''); updateReturnItem(${idx}, 'price', this.value, false)" 

                               onchange="updateReturnItem(${idx}, 'price', this.value, true)"

                               onclick="this.select()" 

                               style="width: 100%; text-align: center; border: 1px solid transparent; background: transparent; padding: 6px; font-weight: 800; font-size: 1rem; color: var(--main-orange);">

                    </td>

                    <td class="row-total" style="text-align: center; font-weight: 800; color: #0f172a; font-size: 1.05rem;">${itemTotal.toFixed(2)}</td>

                    <td style="text-align: center;">

                        <button class="btn-delete-row-minimal" onclick="returnCart.splice(${idx},1); renderReturnCart();" title="حذف" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem; opacity: 0.6; transition: 0.2s;">🗑️</button>

                    </td>

                `;

        tbody.appendChild(tr);

    });

    updateReturnTotal();

}

function updateReturnItemUnit(idx, unitName) {

    const item = returnCart[idx];

    const product = productsDB.find(p => p.name === item.name);

    if (!product) return;

    const unit = product.units ? product.units.find(u => u.unitName === unitName) : null;

    if (unit) {

        item.selectedUnit = unit;

        item.unitFactor = parseFloat(unit.factor) || 1;

        item.price = parseFloat(unit.price) || 0;

    } else {

        item.selectedUnit = null;

        item.unitFactor = 1;

        item.price = parseFloat(product.price) || 0;

    }

    renderReturnCart();

}

function updateReturnItem(idx, field, val, shouldReRender = true) {

    const item = returnCart[idx];

    if (!item) return;

    let numericVal = parseFloat(val) || 0;

    if (field === 'qty') {

        if (numericVal > item.maxQty) {

            alert(`⚠️ الكمية لا يمكن أن تتجاوز الكمية المتاحة بالفاتورة وهي (${item.maxQty})`);

            numericVal = item.maxQty;

            const tbody = document.getElementById('returnCartBody');

            if (tbody) {

                const row = tbody.querySelector(`tr[data-index="${idx}"]`);

                if (row) {

                    const qtyInput = row.querySelector('input[inputmode="decimal"]');

                    if (qtyInput) qtyInput.value = numericVal;

                }

            }

        }

        item.qty = numericVal;

    } else if (field === 'price') {

        item.price = numericVal;

    }

    if (!shouldReRender) {

        const itemTotal = item.price * item.qty;

        const tbody = document.getElementById('returnCartBody');

        if (tbody) {

            const row = tbody.querySelector(`tr[data-index="${idx}"]`);

            if (row) {

                const totalCell = row.querySelector('.row-total');

                if (totalCell) totalCell.innerText = itemTotal.toFixed(2);

            }

        }

        updateReturnTotal();

    } else {

        renderReturnCart();

    }

}

function updatePurReturnItem(idx, field, val, shouldReRender = true) {

    const item = purReturnCart[idx];

    if (!item) return;

    let numericVal = parseFloat(val) || 0;

    if (field === 'qty') {

        if (numericVal > item.maxQty) {

            alert(`⚠️ الكمية لا يمكن أن تتجاوز الكمية المتاحة بالفاتورة وهي (${item.maxQty})`);

            numericVal = item.maxQty;

            const tbody = document.getElementById('purReturnCartBody');

            if (tbody) {

                const row = tbody.querySelector(`tr[data-index="${idx}"]`);

                if (row) {

                    const qtyInput = row.querySelector('input[inputmode="decimal"]');

                    if (qtyInput) qtyInput.value = numericVal;

                }

            }

        }

        item.qty = numericVal;

    } else if (field === 'price') {

        item.price = numericVal;

    }

    if (!shouldReRender) {

        const itemTotal = item.price * item.qty;

        const tbody = document.getElementById('purReturnCartBody');

        if (tbody) {

            const row = tbody.querySelector(`tr[data-index="${idx}"]`);

            if (row) {

                const totalCell = row.querySelector('.row-total');

                if (totalCell) totalCell.innerText = itemTotal.toFixed(2);

            }

        }

        updateReturnTotal('purchase');

    } else {

        renderPurReturnCart();

    }

}

function updateReturnQty(idx, val) {

    // بقيت هنا للتوافق مع استدعاءات قديمة إن وجدت

    updateReturnItem(idx, 'qty', val, true);

}

async function saveSalesReturn(force = false, accountChecked = false) {

    if (!checkPermission('docs_return')) return false;

    if (window.isSavingTransaction) return false;

    window.isSavingTransaction = true;

    try {

        // --- 🛑 التحقق من حدود الباقة المجانية ---

        const currentPlan = window.getBayanPlan();

        if (!isEditMode && !window.enforceSubscriptionCheck('invoice')) {
            return false;
        }

        if (returnCart.length === 0) {

            alert("⚠️ لا توجد أصناف للمرتجع! لا يمكن الحفظ.");

            return false;

        }

        let partner = document.getElementById('salesReturnAccountInput')?.value || document.getElementById('salesReturnPartnerDisplay')?.innerText || '';
        if (partner === '---') partner = '';
        partner = partner.trim();

        const method = getSelectedPaymentMethod('sales-return-section');
        const isCredit = window.isTransactionCredit(method);

        if (!accountChecked) {
            window.isSavingTransaction = false;
            const ok = await window.ensurePartnerAccountExists(partner, 'عميل', isCredit, () => {
                saveSalesReturn(force, true);
            });
            if (!ok) return false;
            window.isSavingTransaction = true;
        }

        const finalPartner = partner || 'عميل عام';

        if (finalPartner && finalPartner !== 'عميل عام' && finalPartner !== '---' && typeof checkAccountFrozenAndAlert === 'function') {
            if (checkAccountFrozenAndAlert(finalPartner)) {
                return false;
            }
        }

        const originalInvoiceId = document.getElementById('salesReturnInvoiceDisplay')?.innerText;

        // 🛑 فحص حاسم: التأكد من عدم تجاوز كمية أي صنف للكمية المتاحة في الفاتورة الأصلية
        if (originalInvoiceId && originalInvoiceId !== '---') {
            const cleanStr = (s) => (s || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىي]/g, 'ي').replace(/\s+/g, ' ');
            for (const item of returnCart) {
                const itemClean = cleanStr(item.name);
                const origItems = transactions.filter(t => 
                    String(t.invoiceId) === String(originalInvoiceId) && 
                    (cleanStr(t.product) === itemClean || cleanStr(t.productName) === itemClean || (item.id && (t.productId == item.id || t.product == item.id))) && 
                    t.type && t.type.includes('بيع') && !t.type.includes('مرتجع')
                );
                
                const totalSoldQty = origItems.reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0);
                
                if (totalSoldQty > 0) {
                    const otherReturns = transactions.filter(t => 
                        String(t.originalInvoiceId) === String(originalInvoiceId) && 
                        (cleanStr(t.product) === itemClean || cleanStr(t.productName) === itemClean || (item.id && (t.productId == item.id || t.product == item.id))) && 
                        t.type && t.type.includes('مرتجع') &&
                        (!isEditMode || String(t.invoiceId) !== String(editingInvoiceId))
                    );
                    const alreadyReturned = otherReturns.reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0);
                    const maxAllowed = Math.max(0, totalSoldQty - alreadyReturned);

                    if (item.qty > maxAllowed) {
                        showCustomAlert({
                            type: 'error',
                            titleText: '⚠️ خطأ في كمية المرتجع',
                            msg: `الكمية المراد إرجاعها للصنف "<b>${item.name}</b>" هي (<b>${item.qty}</b>) وتتجاوز أقصى كمية مسموح بإرجاعها من الفاتورة الأصلية رقم #${originalInvoiceId} وهي (<b>${maxAllowed}</b>).`
                        });
                        return false;
                    }
                }
            }
        }

        const reason = document.getElementById('salesReturnReason').value;

        const dt = getTransactionDateTime('salesReturnDate', 'salesReturnTime');

        const subTotal = returnCart.reduce((sum, i) => sum + (i.price * i.qty), 0);

        const discVal = parseFloat(document.getElementById('salesReturnDiscount').value) || 0;

        const discType = document.getElementById('salesReturnDiscountType').value;

        const discAmount = (discType === 'perc') ? (subTotal * discVal / 100) : discVal;

        const taxVal = parseFloat(document.getElementById('salesReturnTax').value) || 0;

        const taxType = document.getElementById('salesReturnTaxType').value;

        const taxAmount = (taxType === 'perc') ? (subTotal * taxVal / 100) : taxVal;

        const finalTotal = subTotal - discAmount + taxAmount;

        const ratio = subTotal > 0 ? (finalTotal / subTotal) : 1;

        let returnInvoiceId;

        if (isEditMode && editingInvoiceId) {

            returnInvoiceId = editingInvoiceId;

            if (window.revertAndClearOldInvoice) {

                await window.revertAndClearOldInvoice(editingInvoiceId, editingInvoiceType);

            }

        } else {

            returnInvoiceId = getNextSequence('مرتجع بيع');

        }

        // isCash محدد من خيار المستخدم في الواجهة
        const isCash = !isCredit;

        returnCart.forEach((item, idx) => {

            const p = productsDB.find(x => x.name === item.name || x.id === item.id);

            const factor = item.unitFactor || 1;

            const baseQty = item.qty * factor;

            if (p) {
                p.stock = (parseFloat(p.stock) || 0) + baseQty;
                const activeWH = (typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';
                if (!p.warehouseStocks) p.warehouseStocks = {};
                p.warehouseStocks[activeWH] = (parseFloat(p.warehouseStocks[activeWH]) || 0) + baseQty;

                // إعادة الكمية المرتجعة للـ Variant المحدد بدقة (اللون والمقاس)
                if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
                    const vMatch = window.findMatchingVariant(p, item);
                    if (vMatch) {
                        vMatch.stock = (parseFloat(vMatch.stock) || 0) + baseQty;
                    }
                    p.stock = p.variants.reduce((sum, v) => sum + (parseFloat(v.stock) || 0), 0);
                }
            }

            const itemNetTotal = parseFloat((item.price * item.qty * ratio).toFixed(2));

            // حساب الربح "المسترد" بناءً على هامش ربح الصنف في الفاتورة الأصلية نفسها وليس من كارت الصنف
            const originalInvItem = transactions.find(t => 
                String(t.invoiceId) === String(originalInvoiceId) && 
                (t.product === item.name || t.productName === item.name) && 
                (t.type && t.type.includes('بيع') && !t.type.includes('مرتجع'))
            );

            let profitLost = 0;
            if (originalInvItem) {
                const origQty = parseFloat(originalInvItem.qty) || 1;
                const origProfit = parseFloat(originalInvItem.profit) || 0;
                const origUnitProfit = origProfit / origQty;
                profitLost = -(origUnitProfit * item.qty);
            } else {
                const baseCost = p ? (parseFloat(p.cost) || 0) : 0;
                const itemTotalCost = baseCost * baseQty;
                profitLost = -(itemNetTotal - itemTotalCost);
            }

            // جلب بيانات الفاتورة الأصلية للمرجعية

            const originalInv = transactions.find(t => t.invoiceId == originalInvoiceId && !t.type.includes('مرتجع'));

            const originalDate = originalInv ? originalInv.date : '-';

            const originalMethod = originalInv ? originalInv.method : '-';

            const originalPartner = originalInv ? originalInv.partner : '-';

            // الحساب المختار حالياً (قد يكون مختلف عن الأصلي)

            const finalPartner = partner;

            transactions.push({

                date: dt.full,

                dateISO: dt.iso,

                timeISO: dt.time,

                type: 'مرتجع بيع ↩️',

                method: isCash ? 'نقدي (من الخزنة)' : 'خصم من حساب العميل',

                invoiceId: returnInvoiceId,

                originalInvoiceId: originalInvoiceId, // ربط بالصورة الأصلية

                originalDate: originalDate,

                originalMethod: originalMethod,

                originalPartner: originalPartner,

                product: item.name,

                unit: item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (item.unit || 'قطعة'),

                size: item.selectedSize || item.size || '',

                color: item.selectedColor || item.color || '',

                qty: item.qty,

                price: item.price,

                total: itemNetTotal,

                profit: profitLost.toFixed(2), // حفظ الربح المفقود

                partner: finalPartner,

                reason: reason,

                user: currentUser ? currentUser.name : '-',

                paidAmount: (idx === 0) ? (isCash ? finalTotal : 0) : 0,

                isInvoiceHead: (idx === 0),

                unitFactor: factor,

                editDate: isEditMode ? new Date().toLocaleString('ar-EG') : '-'

            });

        });

        if (originalInvoiceId && originalInvoiceId !== '---') {

            transactions.forEach(t => {

                if (t.invoiceId == originalInvoiceId && t.type.includes('بيع') && !t.type.includes('مرتجع')) {

                    t.is_returned = true;

                }

            });

        }

        await saveData();

        showCustomAlert({

            type: 'success',

            titleText: isEditMode ? '✅ تم تحديث المرتجع' : '✅ تم حفظ المرتجع',

            msg: `تم ${isEditMode ? 'تحديث' : 'حفظ'} مرتجع البيع رقم #${returnInvoiceId} بنجاح.`

        });

        isEditMode = false;

        editingInvoiceId = null;

        editingOriginalDate = null;

        editingInvoiceType = null;

        if (typeof _invSummaryCache !== 'undefined') _invSummaryCache = null;
        if (typeof invalidateStockCache === 'function') invalidateStockCache();
        if (typeof renderInventoryTable === 'function') renderInventoryTable();
        if (typeof renderCards === 'function') renderCards();
        if (typeof renderWarehouseReportTable === 'function') renderWarehouseReportTable();
        if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
        if (typeof renderHistoryTable === 'function') renderHistoryTable();
        if (typeof renderAccountsTable === 'function') renderAccountsTable();
        if (typeof updateProductSearchDatalist === 'function') updateProductSearchDatalist();

        resetReturn();

        // العودة للسجل

        viewOldInvoice(returnInvoiceId, 'مرتجع بيع', true);

        return true;

    } finally {

        window.isSavingTransaction = false;

    }

}

function printReturnReceipt(type = 'sales') {
    const sectionType = (type === 'purchase' || type === 'purchaseReturn') ? 'purchaseReturn' : 'salesReturn';
    if (typeof prepareBillHTML === 'function') prepareBillHTML(sectionType);
    const receiptArea = document.getElementById('receipt-area');
    if (receiptArea && receiptArea.children.length > 0 && receiptArea.innerText.trim() !== '') {
        if (typeof exportElementToPDF === 'function') {
            exportElementToPDF(receiptArea, type === 'sales' ? 'مرتجع_مبيعات' : 'مرتجع_مشتريات');
        } else {
            window.print();
        }
    } else {
        if (typeof exportCurrentBill === 'function') exportCurrentBill(sectionType, 'pdf');
        else if (typeof showToast === 'function') showToast("⚠️ لا توجد بيانات مرتجع للطباعة حالياً", "warning");
    }
}
window.printReturnReceipt = printReturnReceipt;

function resetReturn() {

    returnCart = [];

    if (document.getElementById('returnProductSearch')) document.getElementById('returnProductSearch').value = '';

    if (document.getElementById('salesReturnAccountInput')) document.getElementById('salesReturnAccountInput').value = '';

    const partnerDisp = document.getElementById('salesReturnPartnerDisplay');

    if (partnerDisp) partnerDisp.innerText = '---';

    const invDisp = document.getElementById('salesReturnInvoiceDisplay');

    if (invDisp) invDisp.innerText = '---';

    const now = new Date();

    if (document.getElementById('salesReturnDate')) document.getElementById('salesReturnDate').value = now.toLocaleDateString('en-CA');

    if (document.getElementById('salesReturnTime')) document.getElementById('salesReturnTime').value = now.toTimeString().slice(0, 5);

    if (document.getElementById('returnItemsCount')) document.getElementById('returnItemsCount').innerText = '0';

    if (document.getElementById('returnTotalQty')) document.getElementById('returnTotalQty').innerText = '0';

    const nextId = getNextSequence('مرتجع بيع');

    if (document.getElementById('salesReturnBadgeID')) document.getElementById('salesReturnBadgeID').innerText = nextId;

    renderReturnCart();

}

// --- 2. مرتجع الشراء (Purchase Return) ---

function renderPurReturnCart() {

    const tbody = document.getElementById('purReturnCartBody');

    tbody.innerHTML = '';

    let subTotal = 0;

    let totalQty = 0;

    purReturnCart.forEach((item, idx) => {

        const itemTotal = item.price * item.qty;

        subTotal += itemTotal;

        totalQty += (parseFloat(item.qty) || 0);

        const product = productsDB.find(p => p.name === item.name);

        let unitOptions = `<option value="base" ${!item.selectedUnit ? 'selected' : ''}>${(product ? product.unit : 'قطعة') || 'قطعة'}</option>`;

        if (product && product.units && product.units.length > 0) {

            unitOptions = product.units.map(u =>

                `<option value="${u.unitName}" ${item.selectedUnit && item.selectedUnit.unitName === u.unitName ? 'selected' : ''}>${u.unitName}</option>`

            ).join('');

        }

        const { sizeElement, colorElement } = renderVariantSelectElements(item, idx, 'purReturn');

        const tr = document.createElement('tr');
        tr.setAttribute('data-index', idx);
        tr.innerHTML = `
                    <td style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${idx + 1}</td>
                    <td style="font-size: 0.85rem; color: #64748b; text-align: center; font-family: monospace;">${item.code || '---'}</td>
                    <td style="font-weight: 600; color: #1e293b;">${item.name}</td>
                    <td class="col-variant-size" style="text-align: center;">${sizeElement}</td>
                    <td class="col-variant-color" style="text-align: center;">${colorElement}</td>
                    <td>
                        <select class="unit-select" onchange="updatePurReturnItemUnit(${idx}, this.value)" ${item.invoiceId ? 'disabled' : ''} 
                            style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 0.9rem; ${item.invoiceId ? 'opacity: 0.7; cursor: not-allowed;' : ''}">
                            ${unitOptions}
                        </select>
                    </td>

                    <td>

                        <input type="text" value="${item.qty}" 

                               inputmode="decimal"

                               oninput="this.value = this.value.replace(/[^0-9.]/g, ''); updatePurReturnItem(${idx}, 'qty', this.value, false)" 

                               onchange="updatePurReturnItem(${idx}, 'qty', this.value, true)"

                               onclick="this.select()" 

                               style="width: 100%; text-align: center; border: 1px solid transparent; background: transparent; padding: 6px; font-weight: bold; font-size: 1rem; color: #1e293b;">

                    </td>

                    <td>

                        <input type="text" value="${(parseFloat(item.price) || 0).toFixed(2)}" 

                               inputmode="decimal"

                               oninput="this.value = this.value.replace(/[^0-9.]/g, ''); updatePurReturnItem(${idx}, 'price', this.value, false)" 

                               onchange="updatePurReturnItem(${idx}, 'price', this.value, true)"

                               onclick="this.select()" 

                               style="width: 100%; text-align: center; border: 1px solid transparent; background: transparent; padding: 6px; font-weight: 800; font-size: 1rem; color: #ef4444;">

                    </td>

                    <td class="row-total" style="text-align: center; font-weight: 800; color: #0f172a; font-size: 1rem;">${itemTotal.toFixed(2)}</td>

                    <td style="text-align: center; width: 50px;">

                        <button class="btn-delete-row-minimal" onclick="purReturnCart.splice(${idx},1); renderPurReturnCart();" title="حذف" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem; opacity: 0.6; transition: 0.2s;">🗑️</button>

                    </td>

                `;

        tbody.appendChild(tr);

    });

    if (document.getElementById('purReturnItemsCount')) document.getElementById('purReturnItemsCount').innerText = purReturnCart.length;

    if (document.getElementById('purReturnTotalQty')) document.getElementById('purReturnTotalQty').innerText = totalQty;

    updateReturnTotal('purchase');

}

function updatePurReturnItemUnit(idx, unitName) {

    const item = purReturnCart[idx];

    const product = productsDB.find(p => p.name === item.name);

    if (!product) return;

    const unit = product.units ? product.units.find(u => u.unitName === unitName) : null;

    if (unit) {

        item.selectedUnit = unit;

        item.unitFactor = parseFloat(unit.factor) || 1;

        item.price = parseFloat(unit.cost) || 0;

    } else {

        item.selectedUnit = null;

        item.unitFactor = 1;

        item.price = parseFloat(product.cost) || 0;

    }

    renderPurReturnCart();

}

function updatePurReturnQty(idx, val) {

    updatePurReturnItem(idx, 'qty', val, true);

}

async function savePurchaseReturn(force = false, accountChecked = false) {

    if (!checkPermission('docs_return')) return false;

    if (window.isSavingTransaction) return false;

    window.isSavingTransaction = true;

    try {

        // --- 🛑 التحقق من حدود الباقة المجانية ---

        const currentPlan = window.getBayanPlan();

        if (!isEditMode && !window.enforceSubscriptionCheck('invoice')) {
            return false;
        }

        if (purReturnCart.length === 0) {

            alert("⚠️ لا توجد أصناف للمرتجع! لا يمكن الحفظ.");

            return false;

        }

        let partner = document.getElementById('purReturnAccountInput')?.value || document.getElementById('purReturnPartnerDisplay')?.innerText || '';
        if (partner === '---') partner = '';
        partner = partner.trim();

        const reason = document.getElementById('purReturnReason').value;

        const dt = getTransactionDateTime('purReturnDate', 'purReturnTime');

        const method = getSelectedPaymentMethod('purchase-return-section');
        const isCredit = window.isTransactionCredit(method);

        if (!accountChecked) {
            window.isSavingTransaction = false;
            const ok = await window.ensurePartnerAccountExists(partner, 'مورد', isCredit, () => {
                savePurchaseReturn(force, true);
            });
            if (!ok) return false;
            window.isSavingTransaction = true;
        }

        const finalPartner = partner || 'مورد عام';

        const isCash = !isCredit;

        const subTotal = purReturnCart.reduce((a, b) => a + (b.price * b.qty), 0);

        const discVal = parseFloat(document.getElementById('purReturnDiscount').value) || 0;

        const discType = document.getElementById('purReturnDiscountType').value;

        const discAmount = (discType === 'perc') ? (subTotal * discVal / 100) : discVal;

        const taxVal = parseFloat(document.getElementById('purReturnTax').value) || 0;

        const taxType = document.getElementById('purReturnTaxType').value;

        const taxAmount = (taxType === 'perc') ? (subTotal * taxVal / 100) : taxVal;

        const finalTotal = subTotal - discAmount + taxAmount;

        const ratio = subTotal > 0 ? (finalTotal / subTotal) : 1;

        let returnInvoiceId;

        if (isEditMode && editingInvoiceId) {

            returnInvoiceId = editingInvoiceId;

            if (window.revertAndClearOldInvoice) {

                await window.revertAndClearOldInvoice(editingInvoiceId, editingInvoiceType);

            }

        } else {

            returnInvoiceId = getNextSequence('مرتجع شراء');

        }

        const originalInvoiceId = document.getElementById('purReturnInvoiceDisplay')?.innerText;

        // 🛑 فحص حاسم: التأكد من عدم تجاوز كمية أي صنف للكمية المتاحة في الفاتورة الأصلية
        if (originalInvoiceId && originalInvoiceId !== '---') {
            const cleanStr = (s) => (s || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىي]/g, 'ي').replace(/\s+/g, ' ');
            for (const item of purReturnCart) {
                const itemClean = cleanStr(item.name);
                const origItems = transactions.filter(t => 
                    String(t.invoiceId) === String(originalInvoiceId) && 
                    (cleanStr(t.product) === itemClean || cleanStr(t.productName) === itemClean || (item.id && (t.productId == item.id || t.product == item.id))) && 
                    t.type && t.type.includes('شراء') && !t.type.includes('مرتجع')
                );
                
                const totalBoughtQty = origItems.reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0);
                
                if (totalBoughtQty > 0) {
                    const otherReturns = transactions.filter(t => 
                        String(t.originalInvoiceId) === String(originalInvoiceId) && 
                        (cleanStr(t.product) === itemClean || cleanStr(t.productName) === itemClean || (item.id && (t.productId == item.id || t.product == item.id))) && 
                        t.type && t.type.includes('مرتجع') &&
                        (!isEditMode || String(t.invoiceId) !== String(editingInvoiceId))
                    );
                    const alreadyReturned = otherReturns.reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0);
                    const maxAllowed = Math.max(0, totalBoughtQty - alreadyReturned);

                    if (item.qty > maxAllowed) {
                        showCustomAlert({
                            type: 'error',
                            titleText: '⚠️ خطأ في كمية المرتجع',
                            msg: `الكمية المراد إرجاعها للصنف "<b>${item.name}</b>" هي (<b>${item.qty}</b>) وتتجاوز أقصى كمية مسموح بإرجاعها من الفاتورة الأصلية رقم #${originalInvoiceId} وهي (<b>${maxAllowed}</b>).`
                        });
                        return false;
                    }
                }
            }
        }

        purReturnCart.forEach((item, idx) => {

            const p = productsDB.find(x => x.name === item.name || x.id === item.id);

            const factor = item.unitFactor || 1;

            const baseQty = item.qty * factor;

            if (p) {
                p.stock = Math.max(0, (parseFloat(p.stock) || 0) - baseQty);
                const activeWH = (typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';
                if (!p.warehouseStocks) p.warehouseStocks = {};
                p.warehouseStocks[activeWH] = Math.max(0, (parseFloat(p.warehouseStocks[activeWH]) || 0) - baseQty);

                // خصم الكمية المرتجعة للمورد من تشكيلة الصنف (اللون أو المقاس)
                if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
                    const vMatch = (typeof window.findMatchingVariant === 'function')
                        ? window.findMatchingVariant(p, item)
                        : p.variants.find(v => 
                            (item.selectedVariant && v.barcode && v.barcode === item.selectedVariant.barcode) ||
                            ((v.size || '') === (item.selectedSize || item.size || '') && (v.color || '') === (item.selectedColor || item.color || ''))
                        );
                    if (vMatch) {
                        vMatch.stock = Math.max(0, (parseFloat(vMatch.stock) || 0) - baseQty);
                    }
                    p.stock = p.variants.reduce((sum, v) => sum + (parseFloat(v.stock) || 0), 0);
                }
            }

            const itemNetTotal = parseFloat((item.price * item.qty * ratio).toFixed(2));

            // جلب بيانات الفاتورة الأصلية للمرجعية

            const originalInv = transactions.find(t => t.invoiceId == originalInvoiceId && !t.type.includes('مرتجع'));

            const originalDate = originalInv ? originalInv.date : '-';

            const originalMethod = originalInv ? originalInv.method : '-';

            const originalPartner = originalInv ? originalInv.partner : '-';

            // الحساب المختار حالياً

            const finalPartner = partner;

            transactions.push({

                date: dt.full,

                dateISO: dt.iso,

                timeISO: dt.time,

                type: 'مرتجع شراء 📤',

                method: isCash ? 'نقدي (من الخزنة)' : 'خصم من حساب المورد',

                invoiceId: returnInvoiceId,

                originalInvoiceId: originalInvoiceId,

                originalDate: originalDate,

                originalMethod: originalMethod,

                originalPartner: originalPartner,

                product: item.name,

                unit: item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (p ? p.unit : 'قطعة'),

                size: item.selectedSize || item.size || '',

                color: item.selectedColor || item.color || '',

                qty: item.qty,

                price: item.price,

                total: itemNetTotal,

                profit: 0, // مرتجع الشراء ليس له ربح

                partner: finalPartner,

                reason: reason,

                user: currentUser ? currentUser.name : '-',

                paidAmount: (idx === 0) ? (isCash ? finalTotal : 0) : 0,

                isInvoiceHead: (idx === 0),

                unitFactor: factor,

                editDate: isEditMode ? new Date().toLocaleString('ar-EG') : '-'

            });

        });

        if (originalInvoiceId && originalInvoiceId !== '---') {

            transactions.forEach(t => {

                if (t.invoiceId == originalInvoiceId && t.type.includes('شراء') && !t.type.includes('مرتجع')) {

                    t.is_returned = true;

                }

            });

        }

        await saveData();

        showCustomAlert({

            type: 'success',

            titleText: isEditMode ? '✅ تم تحديث المرتجع' : '✅ تم حفظ المرتجع',

            msg: `تم ${isEditMode ? 'تحديث' : 'حفظ'} مرتجع الشراء رقم #${returnInvoiceId} بنجاح.`

        });

        isEditMode = false;

        editingInvoiceId = null;

        editingOriginalDate = null;

        editingInvoiceType = null;

        if (typeof _invSummaryCache !== 'undefined') _invSummaryCache = null;
        if (typeof invalidateStockCache === 'function') invalidateStockCache();
        if (typeof renderInventoryTable === 'function') renderInventoryTable();
        if (typeof renderCards === 'function') renderCards();
        if (typeof renderWarehouseReportTable === 'function') renderWarehouseReportTable();
        if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
        if (typeof renderHistoryTable === 'function') renderHistoryTable();
        if (typeof renderAccountsTable === 'function') renderAccountsTable();
        if (typeof updateProductSearchDatalist === 'function') updateProductSearchDatalist();

        resetPurReturn();

        // العودة للسجل

        viewOldInvoice(returnInvoiceId, 'مرتجع شراء', true);

        return true;

    } finally {

        window.isSavingTransaction = false;

    }

}

function resetPurReturn() {

    purReturnCart = [];

    if (document.getElementById('purReturnProductSearch')) document.getElementById('purReturnProductSearch').value = '';

    if (document.getElementById('purReturnAccountInput')) document.getElementById('purReturnAccountInput').value = '';

    const partnerDisp = document.getElementById('purReturnPartnerDisplay');

    if (partnerDisp) partnerDisp.innerText = '---';

    const invDisp = document.getElementById('purReturnInvoiceDisplay');

    if (invDisp) invDisp.innerText = '---';

    const now = new Date();

    if (document.getElementById('purReturnDate')) document.getElementById('purReturnDate').value = now.toLocaleDateString('en-CA');

    if (document.getElementById('purReturnTime')) document.getElementById('purReturnTime').value = now.toTimeString().slice(0, 5);

    if (document.getElementById('purReturnItemsCount')) document.getElementById('purReturnItemsCount').innerText = '0';

    if (document.getElementById('purReturnTotalQty')) document.getElementById('purReturnTotalQty').innerText = '0';

    const nextId = getNextSequence('مرتجع شراء');

    if (document.getElementById('purReturnBadgeID')) document.getElementById('purReturnBadgeID').innerText = nextId;

    renderPurReturnCart();

}

// ================= دالة فلترة التواريخ السريعة =================

function applyQuickDateFilter(rangeType, fromId, toId) {

    if (!rangeType) return;

    const now = new Date();

    let fromDate = new Date();

    let toDate = new Date();

    const formatDate = (date) => date.toLocaleDateString('en-CA');

    switch (rangeType) {

        case 'today':

            break;

        case 'yesterday':

            fromDate.setDate(now.getDate() - 1);

            toDate.setDate(now.getDate() - 1);

            break;

        case 'thisWeek':

            // نفترض أن الأسبوع يبدأ من السبت (0 = الأحد، فـ 6 = السبت)

            let day = now.getDay();

            let diff = (day + 1) % 7; // الأيام منذ السبت

            fromDate.setDate(now.getDate() - diff);

            break;

        case 'lastWeek':

            let dayLast = now.getDay();

            let diffToSat = (dayLast + 1) % 7;

            fromDate.setDate(now.getDate() - diffToSat - 7);

            toDate.setDate(now.getDate() - diffToSat - 1);

            break;

        case 'thisMonth':

            fromDate.setDate(1);

            break;

        case 'lastMonth':

            fromDate.setMonth(now.getMonth() - 1);

            fromDate.setDate(1);

            toDate = new Date(now.getFullYear(), now.getMonth(), 0);

            break;

        case 'thisYear':

            fromDate.setMonth(0, 1);

            break;

        case 'lastYear':

            fromDate.setFullYear(now.getFullYear() - 1, 0, 1);

            toDate.setFullYear(now.getFullYear() - 1, 11, 31);

            break;

    }

    document.getElementById(fromId).value = formatDate(fromDate);

    document.getElementById(toId).value = formatDate(toDate);

    if (typeof saveCurrentTabState === 'function') saveCurrentTabState();

}

function toggleShareMenu(menuId, event) {

    if (event) event.stopPropagation(); // منع الانتشار لعدم تفعيل مستمع النافذة

    const menu = document.getElementById(menuId);

    const isActive = menu.classList.contains('active');

    // إغلاق أي قائمة مفتوحة أخرى

    document.querySelectorAll('.share-menu').forEach(m => m.classList.remove('active'));

    if (!isActive) {

        menu.classList.add('active');

    }

}

// إغلاق القائمة عند النقر في أي مكان آخر

window.addEventListener('click', function (e) {

    if (!e.target.closest('.share-menu') && !e.target.closest('.action-btn') && !e.target.closest('.acc-action-btn') && !e.target.closest('.v-btn') && !e.target.closest('.btn-excel') && !e.target.closest('.btn-share-trigger')) {

        document.querySelectorAll('.share-menu').forEach(m => m.classList.remove('active'));

    }

});

// النسخ الاحتياطي التلقائي عند الإغلاق

window.addEventListener('beforeunload', (e) => {
    const settings = JSON.parse(getStore('pos_settings') || '{}');
    if (settings.autoBackup) {
        backupData();
        const isElectron = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
        if (!isElectron) {
            e.preventDefault();
            e.returnValue = ''; // مطلوب لبعض المتصفحات لإظهار رسالة التأكيد والسماح بالتحميل
        }
    }
});

// تمت إزالة منطق الحقن لصالح الزر العائم الثابت

// ================= Radial Menu Logic =================

// --- دالة عالمية لجلب معرفات الأصناف المختارة من جدول البضاعة (Centralized Helper) ---

function getSelectedInventoryIds() {

    const checkedBoxes = document.querySelectorAll('.inv-row-check:checked');

    return Array.from(checkedBoxes).map(cb => {

        const tr = cb.closest('tr');

        return tr ? parseInt(tr.getAttribute('data-id')) : null;

    }).filter(id => id !== null);

}

function downloadExcelTemplate() {
    const XLSXLib = (typeof getXLSXLibrary === 'function' ? getXLSXLibrary() : (typeof XLSX !== 'undefined' ? XLSX : null));
    if (!XLSXLib) return alert("❌ مكتبة Excel غير محملة حالياً.");

    const data = [
        ["اسم الصنف", "الكمية الحالية", "سعر الشراء", "سعر البيع", "الوحدة", "الباركود"],
        ["منتج تجريبي 1", "10", "100", "150", "قطعة", "1001"],
        ["منتج تجريبي 2", "5", "50", "80", "كيلو", "1002"]
    ];

    const ws = XLSXLib.utils.aoa_to_sheet(data);
    const wb = XLSXLib.utils.book_new();
    XLSXLib.utils.book_append_sheet(wb, ws, "الأصناف");
    XLSXLib.writeFile(wb, "نموذج_أصناف_بيان_POS.xlsx");
}

// --- دالة معالجة واستيراد ملف الإكسيل ---

// --- ميزات بحث مرتجع سريعة ---

let currentReturnHeaderProductId = null;

let currentReturnHeaderUnit = null;

async function handleReturnSearch(query, type) {

    const resultsDiv = document.getElementById(type === 'sales' ? 'returnSearchResults' : 'purReturnSearchResults');

    if (!query || query.trim() === "") {

        if (resultsDiv) resultsDiv.style.display = 'none';

        return;

    }

    const queryLower = query.toLowerCase();

    const results = productsDB.filter(p =>

        (p.name && p.name.toLowerCase().includes(queryLower)) ||

        (p.code && String(p.code).toLowerCase().includes(queryLower)) ||

        (p.barcode && String(p.barcode).toLowerCase().includes(queryLower)) ||

        (p.units && p.units.some(u => u.unitBarcode && String(u.unitBarcode).toLowerCase().includes(queryLower)))

    ).slice(0, 15);

    if (results.length === 0) {

        resultsDiv.innerHTML = '<div style="padding: 10px; color: #dc2626; text-align: center;">لم يتم العثور على صنف</div>';

        resultsDiv.style.display = 'block';

        return;

    }

    let html = '';

    results.forEach((p, index) => {

        const stockVal = getActiveWarehouseStock(p);

        let stockText = `<span style="font-size: 0.75rem; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">المخزون: ${stockVal}</span>`;

        if (p.units && p.units.length > 1) {

            html += `

                        <div class="search-result-item" tabindex="0" onclick="selectReturnProductToHeader('${p.id}', '${type}')" style="display:flex; justify-content:space-between; align-items:center;">

                            <div style="flex:1;">

                                <div style="font-weight:bold; color:#1e293b; font-size:0.9rem;">${p.name} <span style="font-size:0.7rem; color:#f59e0b; background:#fef3c7; padding:1px 4px; border-radius:4px;">📦 متعدد الوحدات</span></div>

                                <div style="font-size:0.75rem; color:#64748b;">الكود: ${p.code || '-'}</div>

                            </div>

                            <div style="text-align:left;">

                                ${stockText}

                            </div>

                        </div>`;

        } else {

            let unitPrice = p.price;

            html += `

                        <div class="search-result-item" tabindex="0" onclick="selectReturnProductToHeader('${p.id}', '${type}')" style="display:flex; justify-content:space-between; align-items:center;">

                            <div style="flex:1;">

                                <div style="font-weight:bold; color:#1e293b; font-size:0.9rem;">${p.name}</div>

                                <div style="font-size:0.75rem; color:#64748b;">السعر: ${parseFloat(unitPrice).toFixed(2)} ج.م</div>

                            </div>

                            <div style="text-align:left;">

                                ${stockText}

                            </div>

                        </div>`;

        }

    });

    resultsDiv.innerHTML = html;

    resultsDiv.style.display = 'block';

}

function selectReturnProductToHeader(productId, type) {
    const product = productsDB.find(p => p.id === productId);
    if (!product) return;

    // إذا كان للصنف تشكيلة مقاسات وألوان ونظام المقاسات مفعل، نفتح نافذة المقاسات والألوان فوراً
    const isVariantsActive = document.body.classList.contains('bayan-variants-enabled');
    if (isVariantsActive && product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        const resultsDiv = document.getElementById(type === 'sales' ? 'returnSearchResults' : 'purReturnSearchResults');
        if (resultsDiv) resultsDiv.style.display = 'none';
        const pSearch = document.getElementById(type === 'sales' ? 'returnProductSearch' : 'purReturnProductSearch');
        if (pSearch) pSearch.value = '';
        showVariantSelectionModal(product, type === 'sales' ? 'return' : 'purReturn');
        return;
    }

    if (product.units && product.units.length > 1) {
        showUnitSelectionModal(product, type === 'sales' ? 'sales-return-header' : 'purchase-return-header');
    } else {
        const defUnit = (product.units && product.units.length > 0) ? product.units[0] : null;
        fillReturnHeaderWithUnit(product, defUnit, type);
    }
}

function fillReturnHeaderWithUnit(product, unit, type) {
    currentReturnHeaderProductId = product.id;
    currentReturnHeaderUnit = unit;
    const resultsDiv = document.getElementById(type === 'sales' ? 'returnSearchResults' : 'purReturnSearchResults');
    const pSearch = document.getElementById(type === 'sales' ? 'returnProductSearch' : 'purReturnProductSearch');
    const hQty = document.getElementById(type === 'sales' ? 'returnHeaderQty' : 'purReturnHeaderQty');
    const hPrice = document.getElementById(type === 'sales' ? 'returnHeaderPrice' : 'purReturnHeaderPrice');

    if (pSearch) pSearch.value = product.name;
    if (hPrice) {
        let p = (type === 'sales') ? product.price : (product.cost || product.price);
        if (unit) {
            p = (type === 'sales') ? (parseFloat(unit.price) || product.price) : (parseFloat(unit.cost) || parseFloat(unit.price) || product.cost || product.price);
        }
        hPrice.value = parseFloat(p).toFixed(2);
    }

    if (hQty) {
        hQty.value = 1;
        hQty.focus();
        setTimeout(() => hQty.select(), 10);
    }

    if (resultsDiv) resultsDiv.style.display = 'none';
}

async function handleReturnSearchEnter(query, event, type, forceAdd = false) {
    if (forceAdd && currentReturnHeaderProductId) {
        const product = productsDB.find(p => p.id === currentReturnHeaderProductId);
        const hQty = document.getElementById(type === 'sales' ? 'returnHeaderQty' : 'purReturnHeaderQty');
        const hPrice = document.getElementById(type === 'sales' ? 'returnHeaderPrice' : 'purReturnHeaderPrice');
        const pSearch = document.getElementById(type === 'sales' ? 'returnProductSearch' : 'purReturnProductSearch');
        const qty = parseFloat(hQty.value) || 1;
        const price = parseFloat(hPrice.value) || 0;

        if (type === 'sales') {
            returnCart.push({
                id: product.id,
                name: product.name,
                code: product.code || '---',
                price: price,
                qty: qty,
                maxQty: 9999, // Allow free returns without invoice limit
                selectedUnit: currentReturnHeaderUnit,
                unitFactor: currentReturnHeaderUnit ? currentReturnHeaderUnit.factor : 1
            });
            renderReturnCart();
        } else {
            purReturnCart.push({
                id: product.id,
                name: product.name,
                code: product.code || '---',
                price: price,
                qty: qty,
                maxQty: 9999,
                selectedUnit: currentReturnHeaderUnit,
                unitFactor: currentReturnHeaderUnit ? currentReturnHeaderUnit.factor : 1
            });
            renderPurReturnCart();
        }

        currentReturnHeaderProductId = null;
        currentReturnHeaderUnit = null;
        if (pSearch) pSearch.value = '';
        if (hQty) hQty.value = '1';
        if (hPrice) hPrice.value = '';
        if (pSearch) pSearch.focus();
        return;
    }

    if (!query || query.trim() === "") return;

    const cleanQuery = String(query).trim();

    // 1. بحث فوري في باركود تشكيلات المقاسات والألوان (Variant Barcode Match)
    let matchingVariant = null;
    let pInDB = productsDB.find(p => {
        if (p.variants && Array.isArray(p.variants)) {
            const vFound = p.variants.find(v => String(v.barcode).trim() === cleanQuery);
            if (vFound) {
                matchingVariant = vFound;
                return true;
            }
        }
        return false;
    });

    if (pInDB && matchingVariant) {
        const defUnit = (pInDB.units && pInDB.units.length > 0) ? pInDB.units[0] : null;
        if (type === 'sales') {
            returnCart.push({
                id: pInDB.id,
                name: pInDB.name,
                code: matchingVariant.barcode || pInDB.code || '---',
                price: (parseFloat(matchingVariant.price) > 0) ? parseFloat(matchingVariant.price) : (parseFloat(pInDB.price) || 0),
                qty: 1,
                maxQty: 9999,
                selectedUnit: defUnit,
                unitFactor: defUnit ? defUnit.factor : 1,
                selectedSize: matchingVariant.size || '',
                selectedColor: matchingVariant.color || '',
                selectedVariant: matchingVariant
            });
            renderReturnCart();
        } else {
            purReturnCart.push({
                id: pInDB.id,
                name: pInDB.name,
                code: matchingVariant.barcode || pInDB.code || '---',
                price: (parseFloat(matchingVariant.cost) > 0) ? parseFloat(matchingVariant.cost) : (parseFloat(pInDB.cost) || 0),
                qty: 1,
                maxQty: 9999,
                selectedUnit: defUnit,
                unitFactor: defUnit ? defUnit.factor : 1,
                selectedSize: matchingVariant.size || '',
                selectedColor: matchingVariant.color || '',
                selectedVariant: matchingVariant
            });
            renderPurReturnCart();
        }
        const pSearch = document.getElementById(type === 'sales' ? 'returnProductSearch' : 'purReturnProductSearch');
        if (pSearch) { pSearch.value = ''; pSearch.focus(); }
        const resultsDiv = document.getElementById(type === 'sales' ? 'returnSearchResults' : 'purReturnSearchResults');
        if (resultsDiv) resultsDiv.style.display = 'none';
        return;
    }

    if (!pInDB) {
        pInDB = productsDB.find(p => String(p.barcode) === cleanQuery || String(p.code) === cleanQuery);
    }
    if (!pInDB) {
        pInDB = productsDB.find(p => p.units && p.units.some(u => String(u.unitBarcode) === cleanQuery));
    }
    if (!pInDB) {
        const queryLower = cleanQuery.toLowerCase();
        pInDB = productsDB.find(p =>
            (p.name && p.name.toLowerCase().includes(queryLower)) ||
            (p.code && String(p.code).toLowerCase().includes(queryLower))
        );
    }

    if (pInDB) {
        selectReturnProductToHeader(pInDB.id, type);
    } else {
        showCustomAlert({ titleText: '⚠️ تنبيه', msg: 'الصنف غير موجود!' });
    }

}

function filterSalesReturnCartItems(query) {

    const rows = document.querySelectorAll('#returnCartBody tr');

    const q = query.trim().toLowerCase();

    let firstMatch = null;

    rows.forEach(row => {

        const rowText = row.innerText.toLowerCase();

        if (rowText.includes(q)) {

            row.style.display = "";

            row.style.background = q !== "" ? "rgba(230, 126, 34, 0.15)" : "";

            if (q !== "" && !firstMatch) firstMatch = row;

        } else {

            row.style.display = "none";

        }

    });

    if (firstMatch && q !== "") {

        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });

    }

}

// --- فلترة سلة مرتجع الشراء ---

function filterPurReturnCartItems(query) {

    const rows = document.querySelectorAll('#purReturnCartBody tr');

    const q = query.trim().toLowerCase();

    let firstMatch = null;

    rows.forEach(row => {

        const rowText = row.innerText.toLowerCase();

        if (rowText.includes(q)) {

            row.style.display = "";

            row.style.background = q !== "" ? "rgba(192, 57, 43, 0.15)" : "";

            if (q !== "" && !firstMatch) firstMatch = row;

        } else {

            row.style.display = "none";

        }

    });

    if (firstMatch && q !== "") {

        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });

    }

}

// --- نافذة تعديل أسعار البيع (Price Adjustment Window) ---

// ================= نظام السرعة والتركيز العالمي (Universal POS Speed Kit) =================

document.addEventListener('keydown', (e) => {

    const currentTab = openTabs.find(t => t.id === activeTabId);

    if (!currentTab) return;

    // خريطة الخانات حسب القسم

    const searchMap = {

        'sales': 'productSearch',

        'purchase': 'purchaseSearch',

        'sales-return': 'returnSearchInput',

        'purchase-return': 'purReturnSearchInput',

        'adjustment': 'adjSearch'

    };

    const targetId = searchMap[currentTab.type] || null;

    if (!targetId) return;

    const active = document.activeElement;

    const isInput = (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT') && !active.readOnly;

    const isChar = e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;

    if (!isInput && isChar) {

        const target = document.getElementById(targetId);

        if (target) {

            target.focus();

        }

    }

    // ميزة الحذف السريع بـ Delete لصنف الفاتورة الأخير

    if (!isInput && e.key === 'Delete' && activeTabId === 'sales') {

        if (cart.length > 0) {

            if (confirm(`🗑️ هل تريد حذف ( ${cart[cart.length - 1].name} ) من الفاتورة؟`)) {

                removeFromCart(cart.length - 1);

            }

        }

    }

});

// تفعيل الأسهم والـ Enter لجميع خانات البحث المتاحة (Unified Keyboard Navigation)

let universalSelectedIndex = -1;

document.addEventListener('keydown', function (e) {

    const currentTab = openTabs.find(t => t.id === activeTabId);

    if (!currentTab) return;

    // خريطة الحوايات حسب القسم

    const containerMap = {

        'sales': 'searchResults',

        'purchase': 'purchaseSearchResults',

        'sales-return': 'returnSearchResults',

        'purchase-return': 'purReturnSearchResults',

        'adjustment': 'adjSearchResults'

    };

    const containerId = containerMap[currentTab.type];

    if (!containerId) return;

    const resultsDiv = document.getElementById(containerId);

    if (!resultsDiv || resultsDiv.style.display === 'none') return;

    const items = resultsDiv.querySelectorAll('.pos-search-row, .search-item, .result-item');

    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {

        e.preventDefault();

        universalSelectedIndex = (universalSelectedIndex + 1) % items.length;

        updateUniversalSelection(items, universalSelectedIndex);

    } else if (e.key === 'ArrowUp') {

        e.preventDefault();

        universalSelectedIndex = (universalSelectedIndex - 1 + items.length) % items.length;

        updateUniversalSelection(items, universalSelectedIndex);

    } else if (e.key === 'Enter') {

        if (universalSelectedIndex > -1 && items[universalSelectedIndex]) {

            e.preventDefault();

            e.stopImmediatePropagation();

            items[universalSelectedIndex].click();

        }

    }

});

function updateUniversalSelection(items, idx) {

    items.forEach((it, i) => {

        if (i === idx) {
            it.style.background = '#eff6ff';
            it.style.borderRight = '5px solid #3b82f6';
            it.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
            it.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            it.style.background = '';
            it.style.borderRight = 'none';
            it.style.boxShadow = 'none';
        }

    });

}

// تصفير مؤشر البحث عند كل كتابة جديدة في أي خانة بحث

document.addEventListener('input', (e) => {

    if (e.target.classList.contains('search-input')) {

        universalSelectedIndex = -1;

    }

});

// ================= وظائف الأصناف السريعة (Quick Items Logic) =================

function renderQuickItems() {

    const grid = document.getElementById('quickItemsGrid');

    if (!grid) return;

    const quickItems = productsDB.filter(p => p.isQuick === true);

    if (quickItems.length === 0) {

        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px; font-size: 0.9rem;">

                    <div style="font-size: 2rem; margin-bottom: 10px;">⭐</div>

                    لم تضف أي أصناف سريعة بعد.<br>أضف صنفاً جديداً وعلم على خيار "الأصناف السريعة" لتظهر هنا.

                </div>`;

        return;

    }

    grid.innerHTML = quickItems.map(p => {
        const imgHtml = p.image 
            ? `<div class="quick-item-img-box"><img src="${p.image}" class="quick-item-img" alt="${p.name}"></div>` 
            : `<div class="quick-item-img-box" style="font-size: 1.4rem;">📦</div>`;
        const currencySymbol = typeof getCurrencySymbol === 'function' ? getCurrencySymbol() : 'ج.م';
        return `
            <div class="quick-item-btn" onclick="addToCart(${p.id})">
                ${imgHtml}
                <div class="item-name">${p.name}</div>
                <div class="item-price">${(p.price || 0).toFixed(2)} ${currencySymbol}</div>
            </div>
        `;
    }).join('');
}

// إتاحة الدالة عالمياً لاستدعائها عند فتح القسم

window.renderQuickItems = renderQuickItems;

function toggleQuickItems() {

    const container = document.getElementById('quickItemsContainer');

    const btn = document.getElementById('toggleQuickItemsBtn');

    const salesLayout = document.querySelector('.sales-main-layout');

    const tableContainer = salesLayout ? salesLayout.querySelector('.table-container') : null;

    if (!container) return;

    if (container.style.display === 'none') {

        container.style.display = 'flex';

        if (btn) {

            btn.style.background = 'var(--main-orange)';

            btn.innerHTML = '⭐';

        }

        if (tableContainer) tableContainer.style.flex = '1.5';

        setStore('showQuickItems', 'true');

    } else {

        container.style.display = 'none';

        if (btn) {

            btn.style.background = '#7f8c8d';

            btn.innerHTML = '🖼️';

        }

        if (tableContainer) tableContainer.style.flex = '1';

        setStore('showQuickItems', 'false');

    }

}

window.toggleQuickItems = toggleQuickItems;

// تطبيق الحالة المحفوظة عند التشغيل

setTimeout(() => {

    const savedState = getStore('showQuickItems');

    if (savedState === 'false') {

        const container = document.getElementById('quickItemsContainer');

        const btn = document.getElementById('toggleQuickItemsBtn');

        const salesLayout = document.querySelector('.sales-main-layout');

        const tableContainer = salesLayout ? salesLayout.querySelector('.table-container') : null;

        if (container) {

            container.style.display = 'none';

            if (btn) {

                btn.style.background = '#7f8c8d';

                btn.innerHTML = '🖼️';

            }

            if (tableContainer) tableContainer.style.flex = '1';

        }

    }

}, 500);

// ================= نظام البحث المتقدم عن الفواتير للمرتجعات =================

function updateSearchInvoiceDates(range) {

    const now = new Date();

    let fromDate = new Date();

    let toDate = new Date();

    const formatDate = (date) => date.toLocaleDateString('en-CA');

    switch (range) {

        case 'today':

            break;

        case 'yesterday':

            fromDate.setDate(now.getDate() - 1);

            toDate.setDate(now.getDate() - 1);

            break;

        case 'thisWeek':

            let day = now.getDay();

            let diff = (day + 1) % 7;

            fromDate.setDate(now.getDate() - diff);

            break;

        case 'lastWeek':

            let dayLW = now.getDay();

            let diffLW = (dayLW + 1) % 7;

            fromDate.setDate(now.getDate() - diffLW - 7);

            toDate.setDate(now.getDate() - diffLW - 1);

            break;

        case 'thisMonth':

            fromDate.setDate(1);

            break;

        case 'lastMonth':

            fromDate.setMonth(now.getMonth() - 1);

            fromDate.setDate(1);

            toDate = new Date(now.getFullYear(), now.getMonth(), 0);

            break;

        case 'thisYear':

            fromDate.setMonth(0);

            fromDate.setDate(1);

            break;

        case 'all':

            fromDate = new Date(2020, 0, 1);

            break;

    }

    document.getElementById('searchInvoiceDateFrom').value = formatDate(fromDate);

    document.getElementById('searchInvoiceDateTo').value = formatDate(toDate);

    executeInvoiceSearch();

}

function resetSearchInvoiceModal() {

    // تصفير المدخلات

    document.getElementById('searchInvoiceRef').value = '';

    document.getElementById('searchInvoiceAccount').value = '';

    document.getElementById('searchInvoiceTableBody').innerHTML = '<tr><td colspan="7" style="padding: 30px; color: #94a3b8; text-align: center;">ابدأ البحث برقم الفاتورة أو اسم العميل...</td></tr>';

    // تعبئة قائمة الحسابات (Autocomplete)

    const list = document.getElementById('searchAccountsList');

    if (list) {

        list.innerHTML = '';

        accounts.forEach(acc => {

            // إضافة خيار بالاسم

            const opt = document.createElement('option');

            opt.value = acc.name;

            opt.innerText = acc.code ? `${acc.name} (${acc.code})` : acc.name;

            list.appendChild(opt);

            // إضافة خيار بالكود لتسهيل الإكمال التلقائي بالكود

            if (acc.code) {

                const optCode = document.createElement('option');

                optCode.value = acc.code;

                optCode.innerText = `${acc.name} (${acc.code})`;

                list.appendChild(optCode);

            }

        });

    }

    // تركيز تلقائي على البحث

    setTimeout(() => {

        const refInput = document.getElementById('searchInvoiceRef');

        if (refInput) refInput.focus();

    }, 300);

}

window.openSearchInvoiceModal = function () {

    const modal = document.getElementById('searchInvoiceModal');

    modal.classList.remove('hidden');

    // جعل محتوى المودال قابلاً للتحريك

    const content = modal.querySelector('.modal-content');

    if (content && typeof makeElementDraggable === 'function') {

        makeElementDraggable(content);

    }

    resetSearchInvoiceModal();

    updateSearchInvoiceDates('all'); // تفعيل "كل الفترات" تلقائياً عند الفتح

};

function executeInvoiceSearch() {

    const ref = document.getElementById('searchInvoiceRef').value.trim();

    const account = document.getElementById('searchInvoiceAccount').value.trim().toLowerCase();

    // السماح بالبحث حتى لو الخانات فارغة لعرض كافة فواتير الفترة المختارة

    const dateFrom = document.getElementById('searchInvoiceDateFrom').value;

    const dateTo = document.getElementById('searchInvoiceDateTo').value;

    const currentTab = typeof openTabs !== 'undefined' ? openTabs.find(t => t.id === activeTabId) : null;

    const isSalesReturn = document.getElementById('sales-return-section') && !document.getElementById('sales-return-section').classList.contains('hidden');

    const targetType = isSalesReturn ? 'بيع' : 'شراء';

    // العثور على أسماء الحسابات التي تطابق المدخل (اسم، كود، أو هاتف)

    const matchingAccountNames = account ? accounts.filter(acc => {

        const nameMatch = acc.name && acc.name.toLowerCase().includes(account);

        const codeMatch = acc.code && acc.code.toString().toLowerCase().includes(account);

        const phoneMatch = (acc.mobile && acc.mobile.toString().includes(account)) || (acc.landline && acc.landline.toString().includes(account));

        return nameMatch || codeMatch || phoneMatch;

    }).map(acc => acc.name.toLowerCase()) : [];

    let results = transactions.filter(t => {

        const isCorrectType = t.type.includes(targetType) && !t.type.includes('مرتجع');

        if (!isCorrectType) return false;

        const matchRef = !ref || (t.invoiceId && t.invoiceId.toString().includes(ref));

        // البحث عن الحساب بالاسم المكتوب أو عبر تطابق الكود/الهاتف المستنتج

        const matchAccount = !account || (t.partner && (

            t.partner.toLowerCase().includes(account) ||

            matchingAccountNames.includes(t.partner.toLowerCase())

        ));

        const matchDate = (!dateFrom || t.dateISO >= dateFrom) && (!dateTo || t.dateISO <= dateTo);

        return matchRef && matchAccount && matchDate;

    });

    // تجميع النتائج حسب رقم الفاتورة وحساب الصافي بعد المرتجعات

    const grouped = {};

    results.forEach(t => {

        if (!grouped[t.invoiceId]) {

            // حساب إجمالي المرتجعات لهذه الفاتورة (باستخدام معرف الربط)

            const returnedVal = transactions

                .filter(rt => rt.originalInvoiceId == t.invoiceId && rt.type.includes('مرتجع'))

                .reduce((sum, rt) => sum + (parseFloat(rt.total) || 0), 0);

            // استخراج الوقت والتاريخ من dateISO إذا أمكن

            let timeStr = '-';

            let dateStr = t.date;

            try {

                if (t.dateISO) {

                    const d = new Date(t.dateISO);

                    timeStr = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

                }

            } catch (e) { }

            grouped[t.invoiceId] = {

                id: t.invoiceId,

                date: dateStr,

                time: timeStr,

                partner: t.partner || '-',

                originalTotal: 0,

                returnedTotal: returnedVal,

                is_returned: t.is_returned || (returnedVal > 0),

                warehouse: t.warehouse || 'المخزن الرئيسي',

                user: t.user || 'أدمن'

            };

        }

        grouped[t.invoiceId].originalTotal += parseFloat(t.total) || 0;

    });

    const tbody = document.getElementById('searchInvoiceTableBody');

    tbody.innerHTML = '';

    Object.values(grouped).reverse().forEach((inv, idx) => {

        const netTotal = inv.originalTotal - inv.returnedTotal;

        const isFullyReturned = netTotal <= 0.01 && inv.returnedTotal > 0;

        const tr = document.createElement('tr');

        tr.style.cursor = 'pointer';

        if (isFullyReturned) {

            tr.style.opacity = '0.6';

            tr.style.background = '#f1f5f9';

        }

        tr.onclick = function () {

            if (isFullyReturned) {

                if (typeof showToast === 'function') {

                    showToast("⚠️ الفاتورة مسترجعة بالكامل ولا يوجد متبقي!", "error");

                } else {

                    alert("⚠️ الفاتورة مسترجعة بالكامل ولا يوجد متبقي!");

                }

                return;

            }

            // Unselect all other radios

            document.querySelectorAll('.invoice-radio-select').forEach(r => r.checked = false);

            document.querySelectorAll('#searchInvoiceTableBody tr').forEach(r => r.style.background = '');

            const radio = tr.querySelector('.invoice-radio-select');

            if (radio) {

                radio.checked = true;

                tr.style.background = '#d1e7dd';

            }

        };

        tr.ondblclick = function () {

            if (isFullyReturned) return;

            openSelectReturnItemsModal(inv.id);

        };

        tr.innerHTML = `

                    <td style="border: 1px solid #ddd; padding: 5px;">

                        <input type="radio" name="selectedReturnInvoice" value="${inv.id}" class="invoice-radio-select" style="cursor: pointer; transform: scale(1.3); ${isFullyReturned ? 'opacity: 0.4;' : ''}">

                    </td>

                    <td style="border: 1px solid #ddd; padding: 5px;">${inv.date}</td>

                    <td style="border: 1px solid #ddd; padding: 5px;">${inv.time}</td>

                    <td style="border: 1px solid #ddd; padding: 5px; font-weight: bold;">${inv.id} ${isFullyReturned ? '<span style="color:#ef4444; font-size:0.7rem;">(مسترجعة)</span>' : ''}</td>

                    <td style="border: 1px solid #ddd; padding: 5px;">${inv.partner}</td>

                    <td style="border: 1px solid #ddd; padding: 5px; direction: ltr;">${netTotal.toFixed(2)}</td>

                    <td style="border: 1px solid #ddd; padding: 5px;">${inv.warehouse}</td>

                    <td style="border: 1px solid #ddd; padding: 5px; color: #1e8449;">${inv.user}</td>

                `;

        tbody.appendChild(tr);

    });

    if (Object.keys(grouped).length === 0) {

        tbody.innerHTML = '<tr><td colspan="7" style="padding: 30px; color: #94a3b8; text-align: center;">لا توجد فواتير تطابق البحث</td></tr>';

    }

}

// فتح مودال تحديد الأصناف للفاتورة المحددة من قائمة البحث

function openSelectReturnItemsForSelected() {

    const checked = document.querySelector('input[name="selectedReturnInvoice"]:checked');

    if (!checked) {

        alert('الرجاء اختيار فاتورة أولاً!');

        return;

    }

    openSelectReturnItemsModal(checked.value);

}

function confirmSelectedInvoiceForReturn(invoiceId) {

    if (!invoiceId) {

        const checked = document.querySelector('input[name="selectedReturnInvoice"]:checked');

        if (!checked) return alert('الرجاء اختيار فاتورة أولاً!');

        invoiceId = checked.value;

    }

    const currentTab = typeof openTabs !== 'undefined' ? openTabs.find(t => t.id === activeTabId) : null;

    const isSalesReturn = document.getElementById('sales-return-section') && !document.getElementById('sales-return-section').classList.contains('hidden');

    const targetType = isSalesReturn ? 'بيع' : 'شراء';

    // جلب أصناف الفاتورة الأصلية

    const originalInvoiceItems = transactions.filter(t => t.invoiceId == invoiceId && t.type.includes(targetType) && !t.type.includes('مرتجع'));

    if (originalInvoiceItems.length === 0) {

        alert("تعذر العثور على أصناف لهذه الفاتورة!");

        return;

    }

    const selectedItems = [];

    originalInvoiceItems.forEach((originalItem) => {

        // حساب الكمية المتاحة فعلياً (الأصلية - المرتجع سابقاً)

        const returnedQty = transactions

            .filter(t => t.originalInvoiceId == originalItem.invoiceId && t.type.includes('مرتجع') && t.product === originalItem.product)

            .reduce((sum, t) => sum + (parseFloat(t.qty) || 0), 0);

        const availableQty = parseFloat(originalItem.qty) - returnedQty;

        if (availableQty > 0) {

            const p = productsDB.find(x => x.name === originalItem.product);

            let selectedUnitObj = null;

            let unitFactor = 1;

            if (p && p.units) {

                const foundUnit = p.units.find(u => u.unitName === originalItem.unit);

                if (foundUnit) {

                    selectedUnitObj = foundUnit;

                    unitFactor = parseFloat(foundUnit.factor) || 1;

                }

            }

            selectedItems.push({

                id: p ? p.id : '',

                name: originalItem.product,

                price: parseFloat(originalItem.price),

                qty: availableQty, // تنزيل كامل الكمية المتبقية تلقائياً

                maxQty: availableQty, // حفظ المتاح كحد أقصى

                unit: originalItem.unit,

                selectedUnit: selectedUnitObj,

                unitFactor: unitFactor,

                code: originalItem.code || '---',

                invoiceId: originalItem.invoiceId

            });

        }

    });

    if (selectedItems.length === 0) {

        alert("⚠️ عذراً، جميع أصناف هذه الفاتورة تم إرجاعها بالكامل بالفعل!");

        return;

    }

    const firstItem = originalInvoiceItems[0];

    const pName = firstItem.partner || (isSalesReturn ? 'عميل عام' : 'مورد عام');

    const invNo = firstItem.invoiceId || '---';

    if (isSalesReturn) {

        returnCart = selectedItems;

        const partnerEl = document.getElementById('salesReturnPartnerDisplay');

        const partnerBadge = document.getElementById('salesReturnPartnerBadge');

        const invEl = document.getElementById('salesReturnInvoiceDisplay');

        const badgeID = document.getElementById('salesReturnBadgeID');

        if (partnerEl) partnerEl.innerText = pName;

        if (partnerBadge) partnerBadge.innerHTML = '👤 عميل: ' + pName;

        const accInput = document.getElementById('salesReturnAccountInput');

        if (accInput) accInput.value = pName;

        if (invEl) invEl.innerText = invNo;

        if (badgeID) badgeID.innerText = invNo;

        if (typeof renderReturnCart === 'function') renderReturnCart();

    } else {

        purReturnCart = selectedItems;

        const partnerEl = document.getElementById('purReturnPartnerDisplay');

        const partnerBadge = document.getElementById('purReturnPartnerBadge');

        const invEl = document.getElementById('purReturnInvoiceDisplay');

        const badgeID = document.getElementById('purReturnBadgeID');

        if (partnerEl) partnerEl.innerText = pName;

        if (partnerBadge) partnerBadge.innerHTML = '👤 مورد: ' + pName;

        const accInput = document.getElementById('purReturnAccountInput');

        if (accInput) accInput.value = pName;

        if (invEl) invEl.innerText = invNo;

        if (badgeID) badgeID.innerText = invNo;

        if (typeof renderPurReturnCart === 'function') renderPurReturnCart();

    }

    // إغلاق نافذة البحث

    document.getElementById('searchInvoiceModal').classList.add('hidden');

    showToast("✅ تم استيراد أصناف الفاتورة مباشرة بنجاح");

    // تحديث بطاقة الفاتورة والحساب

    const retType = isSalesReturn ? 'sales' : 'purchase';

    updateReturnInvoiceCard(invoiceId, retType);

    updateReturnAccountBalance(pName, retType);

}

let currentReturnInvoiceItems = [];

function openSelectReturnItemsModal(invoiceId) {

    const modal = document.getElementById('selectReturnItemsModal');

    if (modal && typeof makeElementDraggable === 'function') {

        const content = modal.querySelector('.modal-content');

        if (content) makeElementDraggable(content);

    }

    const currentTab = typeof openTabs !== 'undefined' ? openTabs.find(t => t.id === activeTabId) : null;

    const isSalesReturn = document.getElementById('sales-return-section') && !document.getElementById('sales-return-section').classList.contains('hidden');

    const targetType = isSalesReturn ? 'بيع' : 'شراء';

    // جلب أصناف الفاتورة الأصلية

    currentReturnInvoiceItems = transactions.filter(t => t.invoiceId == invoiceId && t.type.includes(targetType) && !t.type.includes('مرتجع'));

    if (currentReturnInvoiceItems.length === 0) {

        alert("تعذر العثور على أصناف لهذه الفاتورة!");

        return;

    }

    // حساب إجماليات الفاتورة بالكامل لربطها بما تم إرجاعه

    const origTotal = currentReturnInvoiceItems.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);

    const totalReturnedVal = transactions

        .filter(t => t.originalInvoiceId == invoiceId && t.type.includes('مرتجع'))

        .reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);

    const remainingTotalVal = origTotal - totalReturnedVal;

    // تحديث واجهة العرض (المعلومات العلوية)

    document.getElementById('returnItemsInvoiceInfo').style.display = 'grid';

    document.getElementById('returnItemsInvNo').innerText = '#' + invoiceId;

    document.getElementById('returnItemsAccount').innerText = currentReturnInvoiceItems[0].partner;

    document.getElementById('returnItemsDate').innerText = currentReturnInvoiceItems[0].date;

    document.getElementById('returnItemsOrigTotal').innerText = origTotal.toFixed(2);

    document.getElementById('returnItemsPrevRet').innerText = totalReturnedVal.toFixed(2);

    document.getElementById('returnItemsRemainingTotal').innerText = remainingTotalVal.toFixed(2);

    document.getElementById('returnItemsCount').innerText = currentReturnInvoiceItems.length;

    // تصفير خانة البحث عند فتح المودال

    const searchInput = document.getElementById('returnItemsSearch');

    if (searchInput) searchInput.value = '';

    // إغلاق مودال البحث وفتح مودال الاختيار

    document.getElementById('searchInvoiceModal').classList.add('hidden');

    document.getElementById('selectReturnItemsModal').classList.remove('hidden');

    const tbody = document.getElementById('selectReturnItemsTableBody');

    if (!tbody) return;

    tbody.innerHTML = '';

    // حساب الكميات المرجعة مسبقاً لكل صنف ورسم الجدول

    currentReturnInvoiceItems.forEach((item, idx) => {

        const returnedQty = transactions

            .filter(t => t.originalInvoiceId == invoiceId && t.type.includes('مرتجع') && t.product === item.product)

            .reduce((sum, t) => sum + (parseFloat(t.qty) || 0), 0);

        const availableQty = parseFloat(item.qty) - returnedQty;

        const tr = document.createElement('tr');

        tr.innerHTML = `

                    <td style="text-align: center;">

                        <input type="checkbox" class="return-item-check" data-index="${idx}" onchange="calculateReturnModalTotal()" ${availableQty <= 0 ? 'disabled' : 'checked'} style="width: 18px; height: 18px; cursor: pointer;">

                    </td>

                    <td style="text-align: center; color: #64748b;">${idx + 1}</td>

                    <td style="font-weight: 800; color: #1e293b; text-align: right; padding-right: 15px;">${item.product}</td>

                    <td style="text-align: center;">${item.unit || 'عدد'}</td>

                    <td style="text-align: center; font-weight: bold; color: #94a3b8;">${item.qty}</td>

                    <td style="text-align: center; color: #ef4444; font-weight: bold;">${returnedQty}</td>

                    <td style="text-align: center; color: var(--main-green); font-weight: 900; font-size: 1.1rem; background: rgba(16, 185, 129, 0.05);">${availableQty}</td>

                    <td>

                        <input type="number" class="return-item-qty" data-index="${idx}" value="${availableQty}" min="0" max="${availableQty}" 

                               oninput="calculateReturnModalTotal()" 

                               style="width: 75px; text-align: center; padding: 6px; border: 2px solid #fbbf24; border-radius: 8px; font-weight: 900; color: #b45309;"

                               ${availableQty <= 0 ? 'disabled' : ''}>

                    </td>

                    <td style="font-weight: bold; text-align: center; color: var(--main-blue);">${parseFloat(item.price).toFixed(2)}</td>

                `;

        tbody.appendChild(tr);

    });

    calculateReturnModalTotal();

}

function toggleAllReturnItems(el) {

    const checks = document.querySelectorAll('.return-item-check:not(:disabled)');

    checks.forEach(c => c.checked = el.checked);

    calculateReturnModalTotal();

}

function calculateReturnModalTotal() {

    let total = 0;

    const rows = document.querySelectorAll('#selectReturnItemsTableBody tr');

    rows.forEach((row, idx) => {

        const check = row.querySelector('.return-item-check');

        const qtyInput = row.querySelector('.return-item-qty');

        if (check && check.checked && qtyInput) {

            let qty = parseFloat(qtyInput.value) || 0;

            const max = parseFloat(qtyInput.getAttribute('max')) || 0;

            if (qty > max) {

                qty = max;

                qtyInput.value = max;

            }

            if (currentReturnInvoiceItems[idx]) {

                const price = parseFloat(currentReturnInvoiceItems[idx].price) || 0;

                total += qty * price;

            }

        }

    });

    const totalEl = document.getElementById('totalReturnAmount');

    if (totalEl) totalEl.innerText = total.toFixed(2);

}

function filterReturnItems(query) {

    const q = query.toLowerCase().trim();

    const rows = document.querySelectorAll('#selectReturnItemsTableBody tr');

    let visibleCount = 0;

    rows.forEach(row => {

        const productName = row.cells[2]?.innerText.toLowerCase() || '';

        if (productName.includes(q)) {

            row.style.display = '';

            visibleCount++;

        } else {

            row.style.display = 'none';

        }

    });

    // تحديث العداد بالنتائج الظاهرة

    const countEl = document.getElementById('returnItemsCount');

    if (countEl) countEl.innerText = visibleCount + ' من ' + currentReturnInvoiceItems.length;

}

async function confirmReturnItemsSelection() {

    const selectedItems = [];

    const rows = document.querySelectorAll('#selectReturnItemsTableBody tr');

    rows.forEach((row, idx) => {

        const check = row.querySelector('.return-item-check');

        const qtyInput = row.querySelector('.return-item-qty');

        if (check && check.checked && qtyInput) {

            let qty = parseFloat(qtyInput.value) || 0;

            const originalItem = currentReturnInvoiceItems[idx];

            // حساب الكمية المتاحة فعلياً (الأصلية - المرتجع سابقاً)

            const returnedQty = transactions

                .filter(t => t.originalInvoiceId == originalItem.invoiceId && t.type.includes('مرتجع') && t.product === originalItem.product)

                .reduce((sum, t) => sum + (parseFloat(t.qty) || 0), 0);

            const availableQty = parseFloat(originalItem.qty) - returnedQty;

            if (qty > availableQty) {

                alert(`⚠️ الصنف "${originalItem.product}" الكمية المتاحة منه للإرجاع هي (${availableQty}) فقط!`);

                qty = availableQty;

                qtyInput.value = availableQty;

            }

            if (qty > 0) {
                selectedItems.push({
                    name: originalItem.product,
                    price: parseFloat(originalItem.price),
                    qty: qty,
                    maxQty: availableQty, // حفظ المتاح كحد أقصى وليس إجمالي الفاتورة
                    unit: originalItem.unit,
                    code: originalItem.code || '---',
                    size: originalItem.size || '',
                    color: originalItem.color || '',
                    selectedSize: originalItem.size || '',
                    selectedColor: originalItem.color || '',
                    invoiceId: originalItem.invoiceId // حفظ رقم الفاتورة الأصلية في الصنف
                });
            }

        }

    });

    if (selectedItems.length === 0) {

        alert("يرجى اختيار صنف واحد على الأقل للإرجاع!");

        return;

    }

    const currentTab = typeof openTabs !== 'undefined' ? openTabs.find(t => t.id === activeTabId) : null;

    const isSalesReturn = document.getElementById('sales-return-section') && !document.getElementById('sales-return-section').classList.contains('hidden');

    const firstItem = currentReturnInvoiceItems[0];

    if (isSalesReturn) {

        returnCart = selectedItems;

        const partnerEl = document.getElementById('salesReturnPartnerDisplay');

        const partnerBadge = document.getElementById('salesReturnPartnerBadge');

        const invEl = document.getElementById('salesReturnInvoiceDisplay');

        const badgeID = document.getElementById('salesReturnBadgeID');

        const pName = firstItem.partner || 'عميل عام';

        const invNo = firstItem.invoiceId || '---';

        if (partnerEl) partnerEl.innerText = pName;

        if (partnerBadge) partnerBadge.innerHTML = '👤 عميل: ' + pName;

        const accInput = document.getElementById('salesReturnAccountInput');

        if (accInput) accInput.value = pName;

        if (invEl) invEl.innerText = invNo;

        if (badgeID) badgeID.innerText = invNo;

        if (typeof renderReturnCart === 'function') renderReturnCart();

    } else {

        purReturnCart = selectedItems;

        const partnerEl = document.getElementById('purReturnPartnerDisplay');

        const partnerBadge = document.getElementById('purReturnPartnerBadge');

        const invEl = document.getElementById('purReturnInvoiceDisplay');

        const badgeID = document.getElementById('purReturnBadgeID');

        const pName = firstItem.partner || 'مورد عام';

        const invNo = firstItem.invoiceId || '---';

        if (partnerEl) partnerEl.innerText = pName;

        if (partnerBadge) partnerBadge.innerHTML = '👤 مورد: ' + pName;

        const accInput = document.getElementById('purReturnAccountInput');

        if (accInput) accInput.value = pName;

        if (invEl) invEl.innerText = invNo;

        if (badgeID) badgeID.innerText = invNo;

        if (typeof renderPurReturnCart === 'function') renderPurReturnCart();

    }

    document.getElementById('selectReturnItemsModal').classList.add('hidden');

    showToast("✅ تم استيراد الأصناف المحددة للمرتجع بنجاح");

    // تحديث بطاقة الفاتورة والحساب

    const retType2 = isSalesReturn ? 'sales' : 'purchase';

    const invNo2 = firstItem ? firstItem.invoiceId : null;

    const pName2 = firstItem ? (firstItem.partner || (isSalesReturn ? 'عميل عام' : 'مورد عام')) : '';

    updateReturnInvoiceCard(invNo2, retType2);

    updateReturnAccountBalance(pName2, retType2);

}

// --- تحويل وظائف البحث لوظائف مؤجلة (Debounced) لتحسين سرعة البرنامج ---

if (typeof debounce === 'function') {
    if (typeof handleSearch === 'function') {
        const originalHandleSearch = handleSearch;
        handleSearch = debounce(function (query) {
            originalHandleSearch(query);
        }, 300);
    }

    if (typeof handleCustomerSearch === 'function') {
        const originalHandleCustomerSearch = handleCustomerSearch;
        handleCustomerSearch = debounce(function (query) {
            originalHandleCustomerSearch(query);
        }, 300);
    }
}

// ================= بطاقة رصيد الحساب وتفاصيل الفاتورة في المرتجعات =================

function updateReturnAccountBalance(accountName, type) {

    const isSales = type === 'sales';

    const cardId = isSales ? 'srReturnAccountCard' : 'prReturnAccountCard';

    const balanceId = isSales ? 'srAccBalance' : 'prAccBalance';

    const card = document.getElementById(cardId);

    // 1. التحقق من وجود اسم

    if (!accountName || !accountName.trim() || accountName === '---') {

        if (card) card.style.display = 'none';

        return;

    }

    let name = accountName.trim();

    // 2. التحقق مما إذا كان العميل/المورد مسجلاً في الحسابات (بالاسم، الكود، أو الهاتف)

    let acc = accounts.find(a => a.name === name || (a.code && a.code.toString() === name) || (a.mobile && a.mobile.toString() === name) || (a.landline && a.landline.toString() === name));

    if (!acc) {

        // عميل نقدي -> لا يوجد له كشف حساب ولا مديونية معلقة

        if (card) card.style.display = 'none';

        return;

    }

    // إذا تم العثور على الحساب عن طريق الكود أو الهاتف، نقوم بتحديث قيمة الحقل بالاسم الأصلي للوضوح

    if (acc.name !== name) {

        name = acc.name;

        const inputId = isSales ? 'salesReturnAccountInput' : 'purReturnAccountInput';

        const inputEl = document.getElementById(inputId);

        if (inputEl) inputEl.value = name;

    }

    if (!acc) {

        // عميل نقدي -> لا يوجد له كشف حساب ولا مديونية معلقة

        if (card) card.style.display = 'none';

        return;

    }

    // 3. للعميل المسجل، يتم جلب الرصيد الدقيق باستخدام الدالة المحاسبية المركزية

    const balance = typeof getAccountBalance === 'function' ? getAccountBalance(name) : 0;

    if (card) {

        const balEl = document.getElementById(balanceId);

        balEl.innerText = Math.abs(balance).toFixed(2);

        balEl.dataset.rawBalance = balance; // حفظ الإشارة لاستخدامها لاحقاً في حساب الرصيد المتوقع

        if (balance > 0) {

            balEl.style.color = isSales ? '#dc2626' : '#be123c'; // مدين (عليه)

            balEl.innerText += ' (عليه)';

        } else if (balance < 0) {

            balEl.style.color = '#16a34a'; // دائن (له)

            balEl.innerText += ' (له)';

        } else {

            balEl.style.color = '#64748b';

            balEl.innerText += ' (خالص)';

        }

        card.style.display = 'block';

    }

    if (typeof updateProjectedAccountBalance === 'function') {

        updateProjectedAccountBalance(type);

    }

}

function updateReturnInvoiceCard(invoiceId, type) {

    const isSales = type === 'sales';

    const cardId = isSales ? 'srReturnInvoiceCard' : 'prReturnInvoiceCard';

    const totalId = isSales ? 'srInvTotal' : 'prInvTotal';

    const returnedId = isSales ? 'srInvReturned' : 'prInvReturned';

    const remainingId = isSales ? 'srInvRemaining' : 'prInvRemaining';

    const card = document.getElementById(cardId);

    if (!invoiceId || invoiceId === '---' || !card) {

        if (card) card.style.display = 'none';

        return;

    }

    const invoiceType = isSales ? 'بيع' : 'شراء';

    const origItems = transactions.filter(t =>

        t.invoiceId == invoiceId && t.type.includes(invoiceType) && !t.type.includes('مرتجع')

    );

    const origTotal = origItems.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);

    const returnedVal = transactions

        .filter(t => t.originalInvoiceId == invoiceId && t.type.includes('مرتجع'))

        .reduce((sum, t) => sum + Math.abs(parseFloat(t.total) || 0), 0);

    const remaining = origTotal - returnedVal;

    const totalEl = document.getElementById(totalId);
    if (totalEl) totalEl.innerText = origTotal.toFixed(2);

    const returnedEl = document.getElementById(returnedId);
    if (returnedEl) returnedEl.innerText = returnedVal.toFixed(2);

    const remEl = document.getElementById(remainingId);
    if (remEl) {
        remEl.innerText = remaining.toFixed(2);
        remEl.style.color = remaining <= 0 ? '#dc2626' : '#16a34a';
    }

    card.style.display = 'block';
}

// استدعاء التحميل التلقائي لمستوى السعر المثبت بالدبوس عند بدء تشغيل البرنامج
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (typeof loadPinnedPriceLevel === 'function') loadPinnedPriceLevel();
        }, 150);
    });
}

// =========================================================================
// 🔒 إغلاق وتأمين قوائم البحث العائمة عند النقر خارجها أو التنقل (Search Dropdowns Security)
// =========================================================================
function closeAllSearchPopups() {
    const popups = [
        'customerSearchResults',
        'supplierSearchResults',
        'searchResults',
        'purchaseSearchResults',
        'returnSearchResults',
        'purReturnSearchResults',
        'receiptSearchResults',
        'disburseSearchResults',
        'statementAccountResults',
        'historySearchResults',
        'adjSearchResults',
        'transferSearchResults'
    ];
    popups.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
        }
    });
}
window.closeAllSearchPopups = closeAllSearchPopups;

if (typeof document !== 'undefined') {
    document.addEventListener('mousedown', (e) => {
        // 1. فحص قائمة بحث العملاء
        const custInput = document.getElementById('customerName');
        const custResults = document.getElementById('customerSearchResults');
        if (custResults && custResults.style.display !== 'none') {
            if (!custResults.contains(e.target) && e.target !== custInput) {
                custResults.style.display = 'none';
            }
        }

        // 2. فحص قائمة بحث الموردين
        const suppInput = document.getElementById('supplierName');
        const suppResults = document.getElementById('supplierSearchResults');
        if (suppResults && suppResults.style.display !== 'none') {
            if (!suppResults.contains(e.target) && e.target !== suppInput) {
                suppResults.style.display = 'none';
            }
        }

        // 3. فحص بقية قوائم البحث الفرعية
        ['returnSearchResults', 'purReturnSearchResults', 'receiptSearchResults', 'disburseSearchResults', 'statementAccountResults'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.style.display !== 'none' && !el.contains(e.target)) {
                const parentBox = el.closest('.search-container') || el.parentElement;
                if (parentBox && !parentBox.contains(e.target)) {
                    el.style.display = 'none';
                }
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllSearchPopups();
        }
    });
}

