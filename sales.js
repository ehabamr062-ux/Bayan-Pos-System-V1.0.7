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

let currentPurchaseHeaderProductId = null;

// دالة لاختيار الصنف وتعبئة بياناته في هيدر المشتريات (المربعات الملونة)

async function selectProductToPurchaseHeader(productId) {

    const product = (typeof db !== 'undefined') ? await db.products.get(productId) : productsDB.find(p => p.id === productId);

    if (!product) return;

    // إذا كان المنتج له وحدات متعددة، نفتح نافذة اختيار الوحدات فوراً

    if (product.units && product.units.length > 1) {

        addToPurchaseCart(productId);

        const resultsDiv = document.getElementById('purchaseSearchResults');

        if (resultsDiv) resultsDiv.style.display = 'none';

        const pSearch = document.getElementById('purchaseSearch');

        if (pSearch) pSearch.value = '';

        return;

    }

    currentPurchaseHeaderProductId = productId;

    const resultsDiv = document.getElementById('purchaseSearchResults');

    const pSearch = document.getElementById('purchaseSearch');

    const hQty = document.getElementById('purchaseHeaderQty');

    const hPrice = document.getElementById('purchaseHeaderPrice');

    if (pSearch) pSearch.value = product.name;

    // في المشتريات نستخدم سعر التكلفة (Cost) وأسعار البيع الحالية

    if (hPrice) hPrice.value = (parseFloat(product.cost) || 0).toFixed(2);

    const hSale = document.getElementById('purchaseHeaderSalePrice');

    const hWholesale = document.getElementById('purchaseHeaderWholesalePrice');

    if (hSale) hSale.value = (parseFloat(product.price) || 0).toFixed(2);

    if (hWholesale) hWholesale.value = (parseFloat(product.wholesale) || 0).toFixed(2);

    if (hQty) {

        hQty.value = 1;

        hQty.focus();

        hQty.select();

    }

    if (resultsDiv) resultsDiv.style.display = 'none';

}

let currentPurchaseHeaderUnit = null;

function fillPurchaseHeaderWithUnit(product, unit) {

    currentPurchaseHeaderProductId = product.id;

    currentPurchaseHeaderUnit = unit;

    const pSearch = document.getElementById('purchaseSearch');

    const hQty = document.getElementById('purchaseHeaderQty');

    const hPrice = document.getElementById('purchaseHeaderPrice');

    const hSale = document.getElementById('purchaseHeaderSalePrice');

    const hWholesale = document.getElementById('purchaseHeaderWholesalePrice');

    if (pSearch) pSearch.value = product.name;

    if (hPrice) hPrice.value = (parseFloat(unit.cost) || parseFloat(product.cost) || 0).toFixed(2);

    if (hSale) hSale.value = (parseFloat(unit.price) || parseFloat(product.price) || 0).toFixed(2);

    if (hWholesale) hWholesale.value = (parseFloat(unit.wholesale) || parseFloat(product.wholesale) || 0).toFixed(2);

    if (hQty) {

        hQty.value = 1;

        hQty.focus();

        hQty.select();

    }

}

async function handlePurchaseSearch(query) {

    const resultsDiv = document.getElementById('purchaseSearchResults');

    resultsDiv.innerHTML = '';

    if (!query) { resultsDiv.style.display = 'none'; return; }

    // 1. البحث بالباركود أو الكود (تطابق تام) لسرعة الاختيار

    let barcodeMatch = productsDB.find(p => String(p.barcode) === String(query) || String(p.code) === String(query));

    if (!barcodeMatch) {

        barcodeMatch = productsDB.find(p => p.units && p.units.some(u => String(u.unitBarcode) === String(query)));

    }

    if (barcodeMatch) {

        selectProductToPurchaseHeader(barcodeMatch.id);

        return;

    }

    // 2. البحث الحي (Live Search)

    const queryLower = query.toLowerCase();

    const filtered = productsDB.filter(p =>

        (p.name && p.name.toLowerCase().includes(queryLower)) ||

        (p.barcode && String(p.barcode).toLowerCase().includes(queryLower)) ||

        (p.code && String(p.code).toLowerCase().includes(queryLower))

    ).slice(0, 10);

    if (filtered.length > 0) {

        resultsDiv.style.display = 'block';

        filtered.forEach(p => {

            const div = document.createElement('div');

            div.className = 'result-item';

            div.innerHTML = `

                        <div style="flex:1;">

                            <span style="font-weight:bold; font-size:1rem; color:var(--main-blue);">${p.name}</span>

                            <div style="display:flex; gap:10px; font-size:0.75rem; color:#666; margin-top:2px;">

                                <span>🏷️ كود: ${p.barcode || '---'}</span>

                                <span>📦 الرصيد: <b style="color: ${p.stock <= 5 ? '#e74c3c' : '#27ae60'}">${p.stock || 0}</b></span>

                            </div>

                        </div>

                        <div style="text-align:left;">

                            <div style="font-weight:bold; color:var(--main-green); font-size:0.95rem;">${(parseFloat(p.cost) || 0).toFixed(2)} ج.م</div>

                            <div style="font-size:0.7rem; color:#888;">سعر التوريد</div>

                        </div>

                    `;

            div.onclick = () => selectProductToPurchaseHeader(p.id);

            resultsDiv.appendChild(div);

        });

    } else {

        resultsDiv.style.display = 'block';

        resultsDiv.innerHTML = `

                <div style="display:flex; flex-direction:column; gap:5px; padding:5px;">

                    <button class="result-item fast-add-btn" onclick="fastQuickAddProduct('${query.replace(/'/g, "\\'")}', 'purchase')" 

                        style="width:100%; border: 2px solid var(--main-green); background: rgba(39, 174, 96, 0.1); color: var(--main-green); font-weight: bold; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:10px; padding:12px; cursor:pointer; transition:0.3s; margin:0;">

                        <span style="font-size:1.2rem;">⚡</span>

                        <span>إضافة سريعة ومباشرة: "${query}"</span>

                    </button>

                </div>`;

    }

}

async function handlePurchaseSearchEnter(query, event, forceAdd = false) {

    if (forceAdd && currentPurchaseHeaderProductId) {

        const product = productsDB.find(p => p.id === currentPurchaseHeaderProductId);

        if (product) {

            completeAddToPurchaseCart(product, currentPurchaseHeaderUnit);

            currentPurchaseHeaderProductId = null;

            currentPurchaseHeaderUnit = null;

            document.getElementById('purchaseSearch').value = '';

            document.getElementById('purchaseSearchResults').style.display = 'none';

            // التعديل: لا نرجع الفوكس للبحث إلا لو كنا في الهيدر أصلاً

            if (event && event.target && event.target.id !== 'purchaseHeaderWholesalePrice') {

                document.getElementById('purchaseSearch').focus();

            } else if (!event) {

                document.getElementById('purchaseSearch').focus();

            }

        }

        return;

    }

    if (!query || query.trim() === "") return;

    let pMatch = productsDB.find(p => String(p.barcode) === String(query) || String(p.code) === String(query));

    if (!pMatch) {

        pMatch = productsDB.find(p => p.units && p.units.some(u => String(u.unitBarcode) === String(query)));

    }

    // fallback بالاسم

    if (!pMatch) {

        const queryLower = query.toLowerCase();

        pMatch = productsDB.find(p => p.name && p.name.toLowerCase().includes(queryLower));

    }

    if (pMatch) {

        if (forceAdd) {

            addToPurchaseCart(pMatch.id);

            document.getElementById('purchaseSearch').value = '';

            document.getElementById('purchaseSearchResults').style.display = 'none';

            document.getElementById('purchaseSearch').focus();

        } else {

            selectProductToPurchaseHeader(pMatch.id);

        }

    }

}

function handleSupplierSearch(query) {

    const resultsDiv = document.getElementById('supplierSearchResults');

    resultsDiv.innerHTML = '';

    if (!query) { resultsDiv.style.display = 'none'; return; }

    const filtered = accounts.filter(a => a.name.includes(query));

    if (filtered.length > 0) {

        resultsDiv.style.display = 'block';

        filtered.forEach(a => {

            const div = document.createElement('div');

            div.className = 'result-item';

            div.innerHTML = `<span>${a.name}</span><span class="stock-badge">${a.type === 'supplier' ? 'مورد' : (a.type === 'mixed' ? 'مشترك' : 'حساب')}</span>`;

            div.onclick = () => {

                document.getElementById('supplierName').value = a.name;

                resultsDiv.style.display = 'none';

                updateHeaderPartnerInfo();

            };

            resultsDiv.appendChild(div);

        });

    } else { resultsDiv.style.display = 'none'; }

}

function addToPurchaseCart(id, unitName = null, manualQty = null, manualCost = null) {

    const product = productsDB.find(p => p.id === id);

    if (!product) return;

    // إذا كان تم تحديد وحدة مسبقاً (باركود وحدة مثلاً)

    if (unitName) {

        const unit = product.units ? product.units.find(u => u.unitName === unitName) : null;

        completeAddToPurchaseCart(product, unit, manualQty, manualCost);

        return;

    }

    // إذا كان له أكثر من وحدة ولم يتم تحديد واحدة

    if (product.units && product.units.length > 1) {

        showUnitSelectionModal(product, 'purchase');

        return;

    }

    // وحدة واحدة أو لا يوجد

    const defUnit = (product.units && product.units.length > 0) ? product.units[0] : null;

    completeAddToPurchaseCart(product, defUnit, manualQty, manualCost);

}

function completeAddToPurchaseCart(product, selectedUnit, manualQty = null, manualCost = null) {

    let qtyToAdd = 1;

    const hQtyInput = document.getElementById('purchaseHeaderQty');

    const hPriceInput = document.getElementById('purchaseHeaderPrice');

    if (manualQty !== null) {

        qtyToAdd = parseFloat(manualQty) || 1;

    } else {

        qtyToAdd = hQtyInput ? (parseFloat(hQtyInput.value) || 1) : 1;

    }

    const existing = purchaseCart.find(item =>

        item.id === product.id &&

        ((!item.selectedUnit && !selectedUnit) || (item.selectedUnit && selectedUnit && item.selectedUnit.unitName === selectedUnit.unitName))

    );

    // استخدام الوحدة المختارة من المتغير العالمي إذا لم يتم تمرير واحدة

    const finalUnit = selectedUnit || currentPurchaseHeaderUnit;

    const factor = finalUnit ? parseFloat(finalUnit.factor) : 1;

    // أسعار البيع من الهيدر (لو موجودة) أو من الصنف نفسه

    const hSalePrice = document.getElementById('purchaseHeaderSalePrice');

    const hWholesalePrice = document.getElementById('purchaseHeaderWholesalePrice');

    const salePrice = hSalePrice ? (parseFloat(hSalePrice.value) || 0) : (selectedUnit ? (parseFloat(selectedUnit.price) || 0) : (parseFloat(product.price) || 0));

    const wholesalePrice = hWholesalePrice ? (parseFloat(hWholesalePrice.value) || 0) : (selectedUnit ? (parseFloat(selectedUnit.wholesale) || 0) : (parseFloat(product.wholesale) || 0));

    let cost = 0;

    if (manualCost !== null) {

        cost = parseFloat(manualCost) || 0;

    } else {

        cost = (hPriceInput && hPriceInput.value) ? parseFloat(hPriceInput.value) : (selectedUnit ? (parseFloat(selectedUnit.cost) || parseFloat(product.cost) || 0) : (parseFloat(product.cost) || 0));

    }

    if (existing) {

        existing.qty += qtyToAdd;

        existing.price = cost;

        existing.salePrice = salePrice;

        existing.wholesalePrice = wholesalePrice;

    } else {

        purchaseCart.push({

            ...product,

            qty: qtyToAdd,

            price: cost,

            salePrice: salePrice,

            wholesalePrice: wholesalePrice,

            selectedUnit: finalUnit,

            unitFactor: factor

        });

    }

    // تصفير المتغير العالمي للوحدة بعد الإضافة

    currentPurchaseHeaderUnit = null;

    // تصفير مدخلات الهيدر للاستعداد للصنف التالي

    if (hQtyInput) hQtyInput.value = 1;

    if (hPriceInput) hPriceInput.value = '';

    const hSale = document.getElementById('purchaseHeaderSalePrice');

    const hWholesale = document.getElementById('purchaseHeaderWholesalePrice');

    if (hSale) hSale.value = '';

    if (hWholesale) hWholesale.value = '';

    const pSearch = document.getElementById('purchaseSearch');

    if (pSearch) {

        pSearch.value = '';

        pSearch.focus();

    }

    renderPurchaseCart_Finalized_V3();

    calculatePurchaseTotals();

}

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

function renderPurchaseCart_Finalized_V3() {

    const tbody = document.getElementById('purchaseTableBody');

    if (!tbody) return;

    tbody.innerHTML = '';

    updateHeaderPartnerInfo();

    let sub = 0;

    purchaseCart.forEach((item, idx) => {

        // التأكد من أن السعر والكمية أرقام صحيحة لضمان دقة الإجمالي

        const price = parseFloat(item.price) || 0;

        const qty = parseFloat(item.qty) || 0;

        const total = price * qty;

        sub += total;

        // إنشاء قائمة الوحدات

        let unitOptions = `<option value="base" ${!item.selectedUnit ? 'selected' : ''}>${item.unit || 'قطعة'}</option>`;

        if (item.units && item.units.length > 0) {

            unitOptions = item.units.map(u =>

                `<option value="${u.unitName}" ${item.selectedUnit && item.selectedUnit.unitName === u.unitName ? 'selected' : ''}>${u.unitName}</option>`

            ).join('');

        }

        const tr = document.createElement('tr');

        tr.setAttribute('data-index', idx);

        tr.className = 'purchase-row';

        tr.innerHTML = `

                    <td style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${idx + 1}</td>

                    <td style="font-size: 0.85rem; color: #64748b; text-align: center; font-family: monospace;">${item.code || '---'}</td>

                    <td style="font-weight: 600; color: #1e293b;">${item.name}</td>

                    <td>

                        <select class="unit-select" onchange="updatePurchaseItemUnit(${idx}, this.value)" style="width:100%; padding:6px; border-radius:6px; border:1px solid #e2e8f0; background: #f8fafc; font-size: 0.9rem;">

                            ${unitOptions}

                        </select>

                    </td>

                    <td>

                        <input type="text" class="qty-input-styled" value="${item.qty}" 

                               inputmode="decimal"

                               oninput="this.value = this.value.replace(/[^0-9.]/g, ''); updatePurchaseItem(${idx}, 'qty', this.value, false)" 

                               onchange="updatePurchaseItem(${idx}, 'qty', this.value, true)"

                               onclick="this.select()" 

                               style="width: 100%; text-align: center; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; padding: 6px; font-weight: bold; font-size: 1rem; color: #1e293b; transition: all 0.2s; outline: none;">

                    </td>

                    <td>

                        <input type="number" class="final-editable-purchase-price" value="${price}" 

                               step="0.01"

                               oninput="updatePurchaseItem(${idx}, 'price', this.value, false)" 

                               onchange="updatePurchaseItem(${idx}, 'price', this.value, true)"

                               onclick="this.select()" 

                               style="width: 100% !important; text-align: center !important; border: 2px solid #3b82f6 !important; background: #ffffff !important; border-radius: 8px !important; padding: 8px !important; font-weight: 900 !important; font-size: 1rem !important; color: #1e3a8a !important; display: block !important; outline: none !important; cursor: text !important;">

                    </td>

                    <td style="background: rgba(34, 197, 94, 0.05);">

                        <input type="text" class="retail-input-styled" value="${item.salePrice || 0}" 

                               inputmode="decimal"

                               oninput="this.value = this.value.replace(/[^0-9.]/g, ''); updatePurchaseItem(${idx}, 'salePrice', this.value, false)" 

                               onchange="updatePurchaseItem(${idx}, 'salePrice', this.value, true)"

                               onclick="this.select()" 

                               style="width: 100%; text-align: center; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; padding: 6px; font-weight: bold; font-size: 0.9rem; color: #16a34a; outline: none;">

                    </td>

                    <td style="background: rgba(245, 158, 11, 0.05);">

                        <input type="text" class="wholesale-input-styled" value="${item.wholesalePrice || 0}" 

                               inputmode="decimal"

                               oninput="this.value = this.value.replace(/[^0-9.]/g, ''); updatePurchaseItem(${idx}, 'wholesalePrice', this.value, false)" 

                               onchange="updatePurchaseItem(${idx}, 'wholesalePrice', this.value, true)"

                               onclick="this.select()" 

                               style="width: 100%; text-align: center; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; padding: 6px; font-weight: bold; font-size: 0.9rem; color: #d97706; outline: none;">

                    </td>

                    <td class="row-total" style="text-align: center; font-weight: 800; color: #0f172a; font-size: 1rem;">${total.toFixed(2)}</td>

                    <td style="text-align:center; width: 50px;">

                        <button class="btn-delete-row-minimal" onclick="removePurchaseItem(${idx})" title="حذف" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem; opacity: 0.6; transition: 0.2s;">🗑️</button>

                    </td>

                `;

        tbody.appendChild(tr);

    });

    const subTotalEl = document.getElementById('purchaseSubTotal');

    if (subTotalEl) subTotalEl.innerText = sub.toFixed(2);

    calculatePurchaseTotals(sub);

}

function updatePurchaseItemUnit(idx, unitName) {

    const item = purchaseCart[idx];

    const product = productsDB.find(p => p.id === item.id);

    if (!product) return;

    const unit = product.units ? product.units.find(u => u.unitName === unitName) : null;

    if (unit) {

        item.selectedUnit = unit;

        item.unitFactor = parseFloat(unit.factor) || 1;

        item.price = parseFloat(unit.cost) || 0; // في المشتريات نستخدم التكلفة

    } else {

        item.selectedUnit = null;

        item.unitFactor = 1;

        item.price = parseFloat(product.cost) || 0;

    }

    renderPurchaseCart_Finalized_V3();

}

function removePurchaseItem(index) {

    if (!checkPermission('docs_delete')) return;

    const item = purchaseCart[index];

    addToTrash('draft_item', item, `حذف من فاتورة شراء (مسودة): ${item.name}`);

    purchaseCart.splice(index, 1);

    renderPurchaseCart_Finalized_V3();

}

function updatePurchaseItem(idx, field, val, shouldReRender = true) {

    // التحقق من الصلاحيات

    if (field === 'price') {

        // إذا كان تحديثاً نهائياً (عند تغيير الخانة) نخرج رسالة تنبيه لو مفيش صلاحية

        if (shouldReRender) {

            if (!checkPermission('docs_purchase_price')) return renderPurchaseCart_Finalized_V3();

        } else {

            // أثناء الكتابة، نتحقق بصمت عشان ميبقاش فيه إزعاج (Has vs Check)

            if (!hasPermission('docs_purchase_price') && !hasPermission('docs_edit')) return;

        }

    } else {

        if (!hasPermission('docs_edit') && !hasPermission('docs_add')) {

            if (shouldReRender) return checkPermission('docs_edit');

            return;

        }

    }

    const numericVal = parseFloat(val) || 0;

    purchaseCart[idx][field] = numericVal;

    // تحديث الصنف في قاعدة البيانات والذاكرة لو كان التغيير في أي من الأسعار (شراء، قطاعي، جملة)

    if (shouldReRender && (field === 'salePrice' || field === 'wholesalePrice' || field === 'price')) {

        updateProductPricesInDB(purchaseCart[idx]);

    }

    if (!shouldReRender) {

        // تحديث السطر الحالي والمجاميع فقط بدون إعادة رسم الجدول (للحفاظ على التركيز)

        const item = purchaseCart[idx];

        const total = item.price * item.qty;

        const tbody = document.getElementById('purchaseTableBody');

        if (tbody) {

            const row = tbody.querySelector(`tr[data-index="${idx}"]`);

            if (row) {

                const totalCell = row.querySelector('.row-total');

                if (totalCell) totalCell.innerText = total.toFixed(2);

            }

        }

        const sub = purchaseCart.reduce((a, b) => a + (b.price * b.qty), 0);

        const subTotalEl = document.getElementById('purchaseSubTotal');

        if (subTotalEl) subTotalEl.innerText = sub.toFixed(2);

        calculatePurchaseTotals(sub);

    } else {

        renderPurchaseCart_Finalized_V3();

    }

}

function updateProductPricesInDB(item) {

    if (!item || !item.id) return;

    db.products.get(item.id).then(product => {

        if (!product) return;

        // حساب متوسط التكلفة الجديد (Weighted Average Cost)

        const oldStock = parseFloat(product.stock) || 0;

        const oldCost = parseFloat(product.cost) || 0;

        const newQty = parseFloat(item.qty) || 0;

        const newPurchasePrice = parseFloat(item.price) || 0;

        let averageCost = newPurchasePrice;

        if (oldStock > 0) {

            averageCost = ((oldStock * oldCost) + (newQty * newPurchasePrice)) / (oldStock + newQty);

        } else if (oldCost > 0) {

            // إذا كان الرصيد صفر ولكن هناك تكلفة مسجلة مسبقاً (تكلفة افتراضية)

            averageCost = (oldCost + newPurchasePrice) / 2;

        }

        // تحديث السعر في الوحدة المختارة أو السعر الأساسي

        if (item.selectedUnit) {

            const unitIdx = product.units.findIndex(u => u.unitName === item.selectedUnit.unitName);

            if (unitIdx !== -1) {

                product.units[unitIdx].price = item.salePrice;

                product.units[unitIdx].wholesale = item.wholesalePrice;

                product.units[unitIdx].cost = newPurchasePrice; // آخر سعر شراء

                product.units[unitIdx].avgBuyPrice = averageCost; // متوسط التكلفة

            }

        } else {

            product.price = item.salePrice;

            product.wholesale = item.wholesalePrice;

            product.cost = newPurchasePrice; // آخر سعر شراء

            product.avgBuyPrice = averageCost; // متوسط التكلفة

        }

        db.products.put(product).then(() => {

            // تحديث المصفوفة في الذاكرة لضمان المزامنة اللحظية في قسم البضاعة

            const memIdx = productsDB.findIndex(p => p.id === item.id);

            if (memIdx !== -1) {

                productsDB[memIdx] = JSON.parse(JSON.stringify(product));

            }

            if (typeof showToast === 'function') {

                showToast(`تم تحديث أسعار "${item.name}" في قسم البضاعة ✅`, 'info');

            }

        });

    }).catch(err => console.error("Update DB Price Error:", err));

}

function calculatePurchaseTotals(sub) {

    if (sub === undefined) sub = purchaseCart.reduce((a, b) => a + (b.price * b.qty), 0);

    // تحديث إجمالي الأصناف والكمية

    const itemsCount = purchaseCart.length;

    const totalQty = purchaseCart.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

    if (document.getElementById('purchaseItemsCount')) document.getElementById('purchaseItemsCount').innerText = itemsCount;

    if (document.getElementById('purchaseTotalQty')) document.getElementById('purchaseTotalQty').innerText = totalQty;

    if (document.getElementById('purchaseSubTotal')) document.getElementById('purchaseSubTotal').innerText = sub.toFixed(2);

    // حساب الخصم

    let discVal = parseFloat(document.getElementById('purchaseDiscount').value) || 0;

    const discType = document.getElementById('purchaseDiscountType').value;

    let discAmount = (discType === 'perc') ? (sub * discVal / 100) : discVal;

    if (document.getElementById('purchaseDiscountAmountDisplay')) document.getElementById('purchaseDiscountAmountDisplay').innerText = discAmount.toFixed(2);

    // حساب الإضافة

    let taxVal = parseFloat(document.getElementById('purchaseTax').value) || 0;

    const taxType = document.getElementById('purchaseTaxType').value;

    let taxAmount = (taxType === 'perc') ? (sub * taxVal / 100) : taxVal;

    if (document.getElementById('purchaseTaxAmountDisplay')) document.getElementById('purchaseTaxAmountDisplay').innerText = taxAmount.toFixed(2);

    const settings = JSON.parse(getStore('pos_settings') || '{}');
    const globalTaxEnabled = settings.taxEnabled || false;
    const globalTaxPercent = parseFloat(settings.taxPercent) || 0;
    let globalTaxAmount = globalTaxEnabled ? (sub * globalTaxPercent / 100) : 0;

    purchaseTotalVal = sub - discAmount + taxAmount + globalTaxAmount;

    if (purchaseTotalVal < 0) purchaseTotalVal = 0;

    document.getElementById('purchaseTotal').innerText = purchaseTotalVal.toFixed(2);

    // تحديث الرصيد السابق والمطلوب النهائي للمورد

    const prevBal = parseFloat(document.getElementById('purchasePrevBalanceDisplay') ? document.getElementById('purchasePrevBalanceDisplay').innerText : 0) || 0;

    if (document.getElementById('purchaseGrandTotalDisplay')) {

        const paid = parseFloat(document.getElementById('purchasePaid').value) || 0;

        // في المشتريات: المطلوب للمورد = الرصيد الحالي (سالب الالتزام) + صافي الحركة الحالية

        // لاحظ أن المشتريات تزيد المديونية للمورد، لذا نجمع (الإجمالي - المدفوع)

        const newDebt = purchaseTotalVal - paid;

        document.getElementById('purchaseGrandTotalDisplay').innerText = (prevBal + newDebt).toFixed(2);

    }

    calculatePurchaseChange();

    // تحديث إجمالي كل سطر في الجدول ليعكس التكلفة الإجمالية بعد توزيع أي قيم أخرى إن وجدت

    if (sub > 0) {

        const rows = document.querySelectorAll('#purchaseTableBody tr');

        purchaseCart.forEach((item, index) => {

            const row = rows[index];

            if (row) {

                const totalCell = row.cells[8]; // عمود الإجمالي هو العمود رقم 9 (اندكس 8)

                if (totalCell) totalCell.innerText = (item.price * item.qty).toFixed(2);

            }

        });

    }

}

function calculatePurchaseChange() {

    const paid = parseFloat(document.getElementById('purchasePaid').value) || 0;

    document.getElementById('purchaseRemaining').innerText = (purchaseTotalVal - paid).toFixed(2);

}

async function savePurchase() {

    if (!checkPermission('docs_add')) return false;

    if (window.isSavingTransaction) return false;

    window.isSavingTransaction = true;

    try {

        // --- 🛑 التحقق من حدود الباقة المجانية ---

        const currentPlan = window.getBayanPlan();

        if (!isEditMode && !window.enforceSubscriptionCheck('invoice')) {
            return false;
        }

        if (purchaseCart.length === 0) {

            showCustomAlert({

                type: 'warning',

                titleText: '⚠️ تنبيه',

                msg: 'الفاتورة فارغة! لا يمكن الحفظ.'

            });

            return false;

        }

        const supplier = document.getElementById('supplierName').value.trim();

        const selectedMethod = getSelectedPaymentMethod('purchase-section');

        const isCash = selectedMethod.includes('نقدي') || selectedMethod.includes('نقدية');

        // إذا لم يتم إدخال مورد، نتحقق إذا كانت الفاتورة نقدي نسمح، وإذا كانت آجل نرفض

        if (!supplier && !isCash) {

            showCustomAlert({

                type: 'warning',

                titleText: '⚠️ مطلوب اسم المورد',

                msg: 'يجب إدخال اسم المورد لحفظ فاتورة الشراء بالآجل أو الشيك!'

            });

            document.getElementById('supplierName').focus();

            return false;

        }

        const finalPartner = supplier || 'مورد نقدي';

        // التعامل مع الـ ID والتاريخ في وضع التعديل الرجعي

        let purchaseId;

        if (isEditMode && editingInvoiceId) {

            purchaseId = editingInvoiceId;

            // 🛑 عكس المخزن القديم وحذف السجلات السابقة باستخدام الوظيفة المركزية

            if (window.revertAndClearOldInvoice) {

                await window.revertAndClearOldInvoice(editingInvoiceId, editingInvoiceType);

            }

        } else {

            purchaseId = document.getElementById('purchaseBadgeID').innerText;

        }

        const dt = isEditMode ? editingOriginalDate : getTransactionDateTime('purchaseDate', 'purchaseTime');

        // حساب النسبة لتوزيع الخصم والضريبة على الأصناف في السجل

        const subTotal = purchaseCart.reduce((a, b) => a + (b.price * b.qty), 0);

        const discVal = parseFloat(document.getElementById('purchaseDiscount').value) || 0;

        const discType = document.getElementById('purchaseDiscountType').value;

        const discAmount = (discType === 'perc') ? (subTotal * discVal / 100) : discVal;

        const taxVal = parseFloat(document.getElementById('purchaseTax').value) || 0;

        const taxType = document.getElementById('purchaseTaxType').value;

        const taxAmount = (taxType === 'perc') ? (subTotal * taxVal / 100) : taxVal;

        const finalTotalVal = subTotal - discAmount + taxAmount;

        const ratio = subTotal > 0 ? (finalTotalVal / subTotal) : 1;

        purchaseCart.forEach((item, idx) => {

            const p = productsDB.find(x => x.id === item.id);

            if (p) {

                const factor = item.unitFactor || 1;

                const baseQty = item.qty * factor;

                const itemUnitPriceBase = item.price / factor;

                // 1. حساب متوسط التكلفة المرجح (Weighted Average Cost) لضمان دقة التقارير والربحية

                const oldStock = parseFloat(p.stock) || 0;

                const oldCost = parseFloat(p.cost) || 0;

                const totalOldValue = oldStock * oldCost;

                const totalAddedValue = baseQty * itemUnitPriceBase;

                const finalStockCount = oldStock + baseQty;

                if (oldStock > 0) {

                    p.cost = (totalOldValue + totalAddedValue) / finalStockCount;

                } else if (oldCost > 0) {

                    // إذا كان الرصيد صفر ولكن هناك تكلفة مسجلة مسبقاً

                    p.cost = (oldCost + itemUnitPriceBase) / 2;

                } else {

                    p.cost = itemUnitPriceBase;

                }

                // 3. تحديث الرصيد المخزني النهائي

                p.stock = finalStockCount;

                // 4. تحديث أسعار البيع النهائية (القطاعي والجملة) بدقة لكل وحدة

                const salePrice = parseFloat(item.salePrice) || 0;

                const wholesalePrice = parseFloat(item.wholesalePrice) || 0;

                if (salePrice > 0 || wholesalePrice > 0) {

                    // إذا كانت الوحدة المشتراة هي الوحدة الأساسية (المعامل = 1)

                    if (factor === 1) {

                        if (salePrice > 0) p.price = salePrice;

                        if (wholesalePrice > 0) p.wholesale = wholesalePrice;

                        // تحديث الوحدة المقابلة في مصفوفة الوحدات أيضاً لضمان التزامن

                        if (p.units && p.units.length > 0) {

                            const baseU = p.units.find(u => parseFloat(u.factor) === 1) || p.units[0];

                            if (baseU) {

                                if (salePrice > 0) baseU.price = salePrice;

                                if (wholesalePrice > 0) baseU.wholesale = wholesalePrice;

                            }

                        }

                    } else {

                        // إذا كانت وحدة فرعية، نبحث عنها في المصفوفة ونحدث أسعارها هي فقط

                        if (p.units) {

                            const subU = p.units.find(u => u.unitName === (item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : item.unit));

                            if (subU) {

                                if (salePrice > 0) subU.price = salePrice;

                                if (wholesalePrice > 0) subU.wholesale = wholesalePrice;

                            }

                        }

                    }

                }

            }

            const itemNetTotal = (item.price * item.qty * ratio).toFixed(2);

            // تسجيل الحركة في سجل المعاملات

            const isCash = selectedMethod.includes('نقدي') || selectedMethod.includes('نقدية');

            let purchasePaidAmount = 0;

            if (isCash) {

                purchasePaidAmount = parseFloat(finalTotalVal) || 0; // دفع كامل في الكاش

            } else {

                purchasePaidAmount = parseFloat(document.getElementById('purchasePaid').value) || 0; // المبلغ المدخل في الآجل

            }

            transactions.push({

                date: dt.full,

                dateISO: dt.iso,

                timeISO: dt.time,

                type: 'شراء 📥',

                method: selectedMethod,

                invoiceId: purchaseId,

                product: p ? p.name : item.name,

                unit: item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (item.unit || 'قطعة'),

                qty: item.qty,

                price: item.price,

                total: itemNetTotal,

                partner: finalPartner,

                user: currentUser ? currentUser.name : '-',

                notes: document.getElementById('purchaseNotes') ? document.getElementById('purchaseNotes').value.trim() : '',

                paidAmount: (idx === 0) ? purchasePaidAmount : 0,

                isInvoiceHead: (idx === 0),

                editDate: isEditMode ? `${new Date().toLocaleString('ar-EG')} (تعديل بواسطة: ${currentUser ? currentUser.name : 'مجهول'})` : '-'

            });

        });

        // ضمان وجود حساب المورد في قاعدة البيانات وتوليد كود تلقائي إذا لزم الأمر

        if (supplier && !accounts.find(a => a.name === supplier)) {

            const newAcc = {

                id: Date.now().toString(),

                name: supplier,

                type: 'supplier',

                code: 'SUP-' + Math.floor(1000 + Math.random() * 9000),

                debit: 0,

                credit: 0,

                createdAt: new Date().toISOString()

            };

            accounts.push(newAcc);

        }

        const pDiscReason = document.getElementById('purchaseDiscountReason').value.trim();

        const pTaxReason = document.getElementById('purchaseTaxReason').value.trim();

        if (pDiscReason) addNewReason(pDiscReason, purchaseDiscountReasons, 'purchaseDiscountReasonsList');

        if (pTaxReason) addNewReason(pTaxReason, purchaseTaxReasons, 'purchaseTaxReasonsList');

        if (document.getElementById('purchaseDiscount')) document.getElementById('purchaseDiscount').value = 0;

        if (document.getElementById('purchaseTax')) document.getElementById('purchaseTax').value = 0;

        await saveData();

        // إظهار رسالة النجاح

        showCustomAlert({

            type: 'success',

            titleText: isEditMode ? '✅ تم التعديل' : '✅ تم الحفظ بنجاح',

            msg: `تم ${isEditMode ? 'تحديث' : 'حفظ'} فاتورة الشراء رقم #${purchaseId} ومزامنة الأسعار مع المخزن.`

        });

        // تصفير الفاتورة والعودة للوضع الافتراضي (فاتورة جديدة فارغة)

        resetPurchase();

        // إذا كنت تفضل مراجعة الفاتورة بعد الحفظ، يمكنك إلغاء تعليق السطر التالي:

        // viewOldInvoice(purchaseId, 'invoices', true);

        return true;

    } finally {

        window.isSavingTransaction = false;

    }

}

function resetPurchase() {

    purchaseCart = [];

    // إنهاء وضع التعديل إذا كان نشطاً

    isEditMode = false;

    editingInvoiceId = null;

    editingOriginalDate = null;

    editingInvoiceType = null;

    const mainSaveBtn = document.querySelector('#purchase-section .btn-save');

    if (mainSaveBtn) {

        mainSaveBtn.style.background = '';

        mainSaveBtn.innerText = '💾 حفظ الفاتورة (F9)';

    }

    document.getElementById('supplierName').value = '';

    document.getElementById('purchaseSearch').value = '';

    // تصفير مربع فلترة المشتريات

    const purchaseFilterInput = document.getElementById('purchaseCartFilterInput');

    if (purchaseFilterInput) {

        purchaseFilterInput.value = '';

        filterPurchaseCartItems('');

    }

    document.getElementById('purchaseDiscount').value = 0;

    document.getElementById('purchaseTax').value = 0;

    document.getElementById('purchasePaid').value = 0;

    if (document.getElementById('purchaseNotes')) document.getElementById('purchaseNotes').value = '';

    // إعادة ضبط نوع السداد للوضع الافتراضي (نقدي)

    const purchaseMethodSelect = document.getElementById('purchase-sectionPaymentMethodSelect');

    if (purchaseMethodSelect) {

        purchaseMethodSelect.value = 'نقدي';

        const purchasePaidBox = document.getElementById('purchasePaidBox');

        const purchaseRemainingBox = document.getElementById('purchaseRemainingBox');

        if (purchasePaidBox) purchasePaidBox.style.display = 'none';

        if (purchaseRemainingBox) purchaseRemainingBox.style.display = 'none';

    }

    const now = new Date();

    document.getElementById('purchaseDate').value = now.toLocaleDateString('en-CA');

    document.getElementById('purchaseTime').value = now.toTimeString().slice(0, 5);

    document.getElementById('purchaseBadgeID').innerText = getNextSequence('شراء');

    renderPurchaseCart_Finalized_V3();

}

// ================= منطق حركة الصنف (History Logic) =================

function handleHistorySearch(query) {

    const resultsDiv = document.getElementById('historySearchResults');

    resultsDiv.innerHTML = '';

    if (!query) { resultsDiv.style.display = 'none'; renderHistoryTable(); return; } // عرض الكل إذا فارغ

    // البحث في قاعدة البيانات لاقتراح الاسم

    const lowerQuery = query.toLowerCase().trim();

    const filtered = productsDB.filter(p =>

        (p.name && p.name.toLowerCase().includes(lowerQuery)) ||

        (p.barcode && p.barcode.toLowerCase().includes(lowerQuery)) ||

        (p.sysCode && String(p.sysCode).toLowerCase().includes(lowerQuery)) ||

        (p.code && String(p.code).toLowerCase().includes(lowerQuery))

    );

    if (filtered.length > 0) {

        resultsDiv.style.display = 'block';

        filtered.forEach(p => {

            const div = document.createElement('div');

            div.className = 'result-item';

            div.innerHTML = `<span>${p.name}</span>`;

            div.onclick = () => {

                document.getElementById('historySearch').value = p.name;

                resultsDiv.style.display = 'none';

                renderHistoryTable(p.name); // فلترة الجدول

            };

            resultsDiv.appendChild(div);

        });

    } else { resultsDiv.style.display = 'none'; }

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

}

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

    // إضافة index أصلي لكل عنصر للتمكن من حذفه بشكل صحيح

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

    data.forEach(t => {

        const isSelected = (selectedHistoryIndex === t.originalIndex);

        tbody.innerHTML += `

                    <tr class="${isSelected ? 'selected-row' : ''}" onclick="selectHistoryRow(${t.originalIndex})">

                        <td class="col-hist-0"><input type="radio" name="histRad" ${isSelected ? 'checked' : ''}></td>

                        <td class="col-hist-1"><span style="background:#eee; padding:2px 6px; border-radius:4px; font-weight:bold;">${t.invoiceId || '-'}</span></td>

                        <td class="col-hist-2">${t.date}</td>

                        <td class="col-hist-3">

                            <span class="stock-badge ${t.type.includes('بيع') ? (t.type.includes('مرتجع') ? 'badge-return' : 'badge-sale') :

                (t.type.includes('شراء') ? (t.type.includes('مرتجع') ? 'badge-return' : 'badge-purchase') :

                    (t.type.includes('قبض') ? 'badge-receipt' : (t.type.includes('صرف') ? 'badge-disburse' : '')))}">

                                ${t.type}

                            </span>

                        </td>

                        <td class="col-hist-4" style="font-weight:bold;">${t.product || '-'}</td>

                        <td class="col-hist-5">${t.qty || 0}</td>

                        <td class="col-hist-6">${t.price || 0}</td>

                        <td class="col-hist-7" style="font-weight:bold; color:var(--main-blue);">${t.total || 0}</td>

                        <td class="col-hist-8">${t.partner || '-'}</td>

                        <td class="col-hist-9" style="font-size:0.75rem; color:#64748b;">${t.editDate || '-'}</td>

                        <td class="col-hist-10" style="font-size:0.85rem; color:#0f766e; font-weight:bold;">${t.user || '-'}</td>

                    </tr>`;

    });

    if (data.length === 0) tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:20px;">لا توجد حركات مسجلة</td></tr>`;

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

    const filtered = accounts.filter(a => a.name.includes(query) || (a.code && a.code.toString().includes(query)));

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

                if (inputId === 'receiptCustomer') {

                    const bal = getAccountBalance(a.name);

                    const balEl = document.getElementById('receiptAccountBalance');

                    if (balEl) balEl.innerText = bal.toLocaleString('en-US', { minimumFractionDigits: 2 });

                } else if (inputId === 'disbursePayee') {

                    const bal = getAccountBalance(a.name);

                    const balEl = document.getElementById('disburseAccountBalance');

                    if (balEl) balEl.innerText = bal.toLocaleString('en-US', { minimumFractionDigits: 2 });

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

async function handleCustomerSearch(query) {

    const resultsDiv = document.getElementById('customerSearchResults');

    resultsDiv.innerHTML = '';

    if (!query) { resultsDiv.style.display = 'none'; return; }

    // البحث بالاسم أو الكود مباشرة في المصفوفة المحلية لسرعة الاستجابة

    const queryLower = query.toLowerCase();

    const combined = accounts.filter(a =>

        (a.name && a.name.toLowerCase().includes(queryLower)) ||

        (a.code && a.code.toString().includes(queryLower)) ||

        (a.mobile && a.mobile.includes(queryLower))

    );

    if (combined.length > 0) {

        resultsDiv.style.display = 'block';

        combined.forEach(a => {

            const div = document.createElement('div');

            div.className = 'result-item';

            div.innerHTML = `<span>${a.name}</span> <span class="stock-badge">${a.type === 'client' ? 'عميل' : (a.type === 'mixed' ? 'مشترك' : 'حساب')}</span>`;

            div.onclick = () => {

                document.getElementById('customerName').value = a.name;

                resultsDiv.style.display = 'none';

                // تحديث مستوى السعر تلقائياً بناءً على بيانات العميل

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

                updateHeaderPartnerInfo();

                // تحديث المتغير العالمي عند اختيار العميل

                currentSessionSelectedAddress = (a.address || '').split(/[|,]/)[0];

                if (typeof calculateChange === 'function') calculateChange();

            };

            resultsDiv.appendChild(div);

        });

    } else {

        resultsDiv.style.display = 'block';

        resultsDiv.innerHTML = `

                <div class="result-item" onclick="quickAddAccount('${query}')" style="color:var(--main-green); font-weight:bold; justify-content:center;">

                <span>➕ إضافة عميل جديد: ${query}</span>

                </div>

                `;

    }

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

    const product = await db.products.get(productId);

    if (!product) return;

    currentHeaderProductId = productId; // تخزين الـ ID الحالي

    const resultsDiv = document.getElementById('searchResults');

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

            const resultsDiv = document.getElementById('searchResults'); if (resultsDiv) resultsDiv.style.display = 'none';

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

    const filtered = productsDB.filter(p =>

        (p.name && p.name.toLowerCase().includes(queryLower)) ||

        (p.barcode && String(p.barcode).toLowerCase().includes(queryLower)) ||

        (p.code && String(p.code).toLowerCase().includes(queryLower))

    ).slice(0, 10);

    if (filtered.length > 0) {

        resultsDiv.innerHTML = '';

        resultsDiv.style.display = 'block';

        filtered.forEach(p => {

            const div = document.createElement('div');

            div.className = 'search-item';

            div.style.padding = '10px';

            div.style.cursor = 'pointer';

            div.style.borderBottom = '1px solid #eee';

            div.innerHTML = `

                        <div style="display:flex; justify-content:space-between;">

                            <b>${p.name}</b>

                            <span style="color:var(--main-blue); font-weight:bold;">${p.price.toFixed(2)} ج.م</span>

                        </div>

                        <div style="font-size:0.8rem; color:#666;">

                            📦 كود: ${p.code || '---'} | 🏷️ باركود: ${p.barcode || '---'}

                        </div>

                    `;

            div.onclick = () => selectProductToHeader(p.id);

            resultsDiv.appendChild(div);

        });

    } else {

        // إذا لم يتم العثور على أي صنف، نظهر خيار "إضافة صنف جديد"

        resultsDiv.innerHTML = '';

        resultsDiv.style.display = 'block';

        const div = document.createElement('div');

        div.className = 'search-item';

        div.style.padding = '15px';

        div.style.cursor = 'pointer';

        div.style.background = '#f5f3ff';

        div.style.border = '2px dashed #8e44ad';

        div.style.borderRadius = '8px';

        div.style.margin = '5px';

        div.style.color = '#8e44ad';

        div.style.textAlign = 'center';

        div.style.fontWeight = 'bold';

        div.innerHTML = `<span style="font-size: 1.2rem;">📝</span> إضافة تفصيلية لصنف جديد: (${query})`;

        div.onclick = () => {

            resultsDiv.style.display = 'none';

            quickAddProduct(query, 'sales');

        };

        resultsDiv.appendChild(div);

    }

}

// دالة جديدة للتحكم في الأسهم والإنتر داخل مربع البحث

document.getElementById('productSearch').addEventListener('keydown', function (e) {

    const resultsDiv = document.getElementById('searchResults');

    const items = resultsDiv.querySelectorAll('.search-item');

    if (resultsDiv.style.display === 'none') return;

    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {

        e.preventDefault();

        searchSelectedIndex = (searchSelectedIndex + 1) % items.length;

        updateSearchSelection(items);

    } else if (e.key === 'ArrowUp') {

        e.preventDefault();

        searchSelectedIndex = (searchSelectedIndex - 1 + items.length) % items.length;

        updateSearchSelection(items);

    } else if (e.key === 'Enter') {

        if (searchSelectedIndex > -1) {

            e.preventDefault();

            e.stopPropagation(); // منع وصول الإنتر للدالة القديمة

            items[searchSelectedIndex].click();

        }

    } else if (e.key === 'Escape') {

        resultsDiv.style.display = 'none';

    }

});

function updateSearchSelection(items) {

    items.forEach((item, index) => {

        if (index === searchSelectedIndex) {

            item.style.background = '#e8f0fe';

            item.style.borderRight = '4px solid var(--main-blue)';

            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } else {

            item.style.background = '';

            item.style.borderRight = 'none';

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

async function handleSearchEnter(query, event, forceAdd = false) {

    if (forceAdd && currentHeaderProductId) {

        addToCart(currentHeaderProductId, typeof currentHeaderUnit !== 'undefined' ? currentHeaderUnit : null);

        return;

    }

    if (!query || query.trim() === "") return;

    const resultsDiv = document.getElementById('searchResults');

    // البحث المطابق 

    let pInDB = productsDB.find(p => String(p.barcode) === String(query) || String(p.code) === String(query));

    // pInDB already checked above for code match as well

    // بحث عميق في باركود الوحدات

    if (!pInDB) {

        pInDB = productsDB.find(p => p.units && p.units.some(u => String(u.unitBarcode) === String(query)));

    }

    // إذا لم نجد تطابقاً كاملاً، نبحث بالاسم ونأخذ أول نتيجة لملء الخانات

    if (!pInDB) {

        const queryLower = query.toLowerCase();

        pInDB = productsDB.find(p =>

            (p.name && p.name.toLowerCase().includes(queryLower)) ||

            (p.code && String(p.code).toLowerCase().includes(queryLower))

        );

    }

    if (pInDB) {

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

function addToCart(productId, preSelectedUnit = null) {

    const product = productsDB.find(p => p.id === productId);

    if (!product) return;

    if (product.stock <= 0) {

        showToast("⚠️ تنبيه: المنتج (" + product.name + ") غير متوفر في المخزن!", "warning");

    }

    if (preSelectedUnit) {

        completeAddToCart(product, preSelectedUnit);

        return;

    }

    if (product.units && product.units.length > 1) {

        showUnitSelectionModal(product, 'sales');

        return;

    }

    const defUnit = (product.units && product.units.length > 0) ? product.units[0] : null;

    completeAddToCart(product, defUnit);

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

function completeAddToCart(product, selectedUnit) {

    const productId = product.id;

    // ميزة إدخال الكمية والسعر من الهيدر مباشرة

    const hQtyInput = document.getElementById('headerQty');

    const hPriceInput = document.getElementById('headerPrice');

    const hQty = hQtyInput ? (parseFloat(hQtyInput.value) || 1) : 1;

    const hPrice = (hPriceInput && hPriceInput.value) ? parseFloat(hPriceInput.value) : null;

    const existingItem = cart.find(item =>

        item.id === productId &&

        ((!item.selectedUnit && !selectedUnit) || (item.selectedUnit && selectedUnit && item.selectedUnit.unitName === selectedUnit.unitName))

    );

    if (existingItem) {

        existingItem.qty += hQty;

        if (hPrice !== null) existingItem.price = hPrice;

    } else {

        const priceLevelSelect = document.getElementById('salesPriceLevel');

        const priceLevel = priceLevelSelect ? priceLevelSelect.value : 'retail';

        let factor = 1;

        let price = 0;

        if (selectedUnit) {

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

        // استخدام السعر اليدوي من الهيدر إذا وُجد

        if (hPrice !== null) price = hPrice;

        cart.push({

            id: product.id,

            code: product.code,

            name: product.name,

            price: price,

            cost: product.cost || 0, // إضافة سعر التكلفة هنا

            qty: hQty,

            units: product.units || [],

            selectedUnit: selectedUnit,

            unitFactor: factor,

            taxType: product.taxType || 'none',

            taxRate: product.taxRate || 0

        });

    }

    renderCart();

    if (typeof calculateCartTotals === 'function') calculateCartTotals();

    // تصفير البحث والمدخلات والتركيز

    if (hQtyInput) hQtyInput.value = 1;

    if (hPriceInput) hPriceInput.value = '';

    const searchInput = document.getElementById('productSearch');

    if (searchInput) {

        searchInput.value = '';

        searchInput.focus();

    }

}

function updateItemUnit(index, unitName, cartType = 'sales') {

    const currentCart = (cartType === 'sales') ? cart : purchaseCart;

    const item = currentCart[index];

    if (!item || !item.units) return;

    const unit = item.units.find(u => u.unitName === unitName);

    if (unit) {

        const priceLevel = document.getElementById('salesPriceLevel')?.value || 'retail';

        item.selectedUnit = unit;

        if (cartType === 'sales') {

            item.price = (priceLevel === 'wholesale') ? (parseFloat(unit.wholesale) || parseFloat(unit.price) || 0) : (parseFloat(unit.price) || 0);

        } else {

            item.price = parseFloat(unit.cost) || 0;

        }

        item.unitFactor = parseFloat(unit.factor) || 1;

        if (cartType === 'sales') renderCart();

        else renderPurchaseCart_Finalized_V3();

    }

}

function removeFromCart(index) {

    if (!checkPermission('docs_delete')) return;

    const item = cart[index];

    addToTrash('draft_item', item, `حذف من فاتورة بيع(مسودة): ${item.name} - الكمية: ${item.qty}`);

    cart.splice(index, 1);

    renderCart();

}

function updateQty(index, newQty) {

    if (!checkPermission('docs_edit')) return renderCart();

    if (newQty < 1) return;

    cart[index].qty = parseFloat(newQty);

    renderCart();

}

function updateCartPrice(index, newPrice) {

    if (!checkPermission('docs_edit')) return renderCart();

    if (newPrice < 0) return;

    cart[index].price = parseFloat(newPrice);

    renderCart();

}

function resetBill() {

    if (cart.length > 0) {

        if (!checkPermission('docs_delete')) return;

    }

    cart = [];

    // إنهاء وضع التعديل إذا كان نشطاً

    isEditMode = false;

    editingInvoiceId = null;

    editingOriginalDate = null;

    editingInvoiceType = null;

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

    document.getElementById('productSearch').focus();

}

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

        const pInfo = productsDB.find(p => p.id === item.id);

        if (pInfo && pInfo.stock <= 0) {

            tr.classList.add('out-of-stock-row');

        }

        tr.innerHTML = `

                    <td>${index + 1}</td>

                    <td style="font-size: 0.85rem; color: #64748b;">${item.code || '---'}</td>

                    <td>${item.name}</td>

                    <td>

                        <select onchange="updateItemUnit(${index}, this.value, 'sales')" style="width:100%; border:none; background:#f1f5f9; border-radius:4px; padding:2px;">

                            ${unitOptions}

                        </select>

                    </td>

                    <td>

                        <input type="number" class="qty-input" value="${item.qty}" min="1" 

                               onchange="updateQty(${index}, this.value)" onclick="this.select()" title="تعديل الكمية">

                    </td>

                    <td>

                        <input type="number" class="price-input" value="${item.price.toFixed(2)}" min="0" step="0.01"

                               onchange="updateCartPrice(${index}, this.value)" onclick="this.select()" title="تعديل السعر">

                    </td>

                    <td>${itemTotal.toFixed(2)}</td>

                    <td style="text-align:center; min-width: 60px;">

                        <button class="btn-delete-row" onclick="removeFromCart(${index})" title="حذف هذا الصنف">

                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">

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

        if (item.selectedUnit && typeof item.selectedUnit === 'object') {

            // إذا كان هناك وحدة مختارة، نبحث عن نفس الوحدة في المنتج الأصلي

            const unitInDb = product.units ? product.units.find(u => u.unitName === item.selectedUnit.unitName) : null;

            if (unitInDb) {

                if (priceLevel === 'wholesale') {

                    item.price = parseFloat(unitInDb.wholesale) || parseFloat(unitInDb.price) || 0;

                } else {

                    item.price = parseFloat(unitInDb.price) || 0;

                }

            }

        } else {

            // السعر الأساسي للمنتج

            if (priceLevel === 'wholesale') {

                item.price = parseFloat(product.wholesale) || parseFloat(product.price) || 0;

            } else {

                item.price = parseFloat(product.price) || 0;

            }

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

    // حساب الخصم

    let discountVal = parseFloat(document.getElementById('discountInput').value) || 0;

    const discountType = document.getElementById('discountType').value;

    let discountAmount = (discountType === 'perc') ? (subTotal * discountVal / 100) : discountVal;

    if (document.getElementById('salesDiscountAmountDisplay')) document.getElementById('salesDiscountAmountDisplay').innerText = discountAmount.toFixed(2);

    // حساب الإضافة/الضريبة

    let taxVal = parseFloat(document.getElementById('taxInput').value) || 0;

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

                const totalCell = row.cells[6]; // الاندكس 6 هو خلية الإجمالي (م، كود، اسم، وحدة، كمية، سعر، إجمالي)

                totalCell.innerText = (item.price * item.qty * ratio).toFixed(2);

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

async function saveBill(force = false) {

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

        // --- 1. التحقق من توفر الكميات في المخزن (Stock Check) ---

        let stockErrors = [];

        cart.forEach(item => {

            const p = productsDB.find(x => x.id === item.id);

            if (p && item.qty > p.stock) {

                stockErrors.push(`❌ ${item.name}: مطلوب(${item.qty}) / متوفر(${p.stock})`);

            }

        });

        if (stockErrors.length > 0 && !force) {

            showCustomAlert({

                type: 'question',

                titleText: '🚫 تنبيه المخزن',

                msg: 'الكميات التالية غير متوفرة في المخزن:\n' + stockErrors.join('\n') + '\n\nهل تريد إتمام البيع على أي حال؟ (الرصيد سينخفض بالسالب)',

                showCancel: true,

                confirmText: 'نعم، حفظ على أي حال',

                cancelText: 'تراجع',

                onConfirm: () => saveBill(true)

            });

            return false;

        }

        // --- 🛑 شرط محاسبي: الآجل لازم عميل مسجل ---

        const selectedMethod = getSelectedPaymentMethod('sales-section');

        const customerName = document.getElementById('customerName').value.trim();

        const isCashAccount = (customerName === "" || customerName.includes('نقدي') || customerName.includes('كاش'));

        if (selectedMethod.includes('آجل') && isCashAccount) {

            showCustomAlert({

                type: 'error',

                titleText: '⚠️ مديونية بدون عميل',

                msg: 'لا يمكن حفظ فاتورة "آجل" لحساب "نقدي". البيع الآجل يتطلب اختيار عميل مسجل لمتابعة حسابه. يرجى اختيار عميل أو تغيير طريقة الدفع.'

            });

            document.getElementById('customerName').focus();

            return false;

        }

        // منطق الدفع النقدي والآجل (التصحيح المنطقي)

        let tendered = parseFloat(document.getElementById('tenderedAmount').value) || 0;

        const isCredit = selectedMethod.includes('آجل');

        const isCash = !isCredit; // أي طريقة غير الآجل تعتبر نقدية (كاش أو بنك)

        if (isCash) {

            // إذا كان الدفع نقدي، المدفوع دائماً يساوي الإجمالي والمتبقي صفر

            tendered = currentTotal;

            document.getElementById('tenderedAmount').value = currentTotal.toFixed(2); // تحديث الواجهة أيضاً

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

                onConfirm: () => saveBill(true)

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

        cart.forEach((cartItem, idx) => {

            const product = productsDB.find(p => p.id === cartItem.id);

            const factor = cartItem.unitFactor || 1;
            const baseQty = cartItem.qty * factor;

            if (product) {
                product.stock -= baseQty; // خصم الكمية الجديدة
            }

            const itemNetTotal = cartItem.price * cartItem.qty * ratio;
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
                qty: cartItem.qty,
                price: cartItem.price,
                total: itemNetTotal.toFixed(2),
                profit: profit.toFixed(2),
                partner: document.getElementById('customerName').value || 'عميل نقدي',
                user: currentUser ? currentUser.name : '-',
                notes: document.getElementById('salesNotes') ? document.getElementById('salesNotes').value.trim() : '',
                paidAmount: (idx === 0) ? tendered : 0,
                isInvoiceHead: (idx === 0),
                unitFactor: factor, // حفظ المعامل للرجوع إليه عند التعديل مستقبلاً
                editDate: isEditMode ? new Date().toLocaleString('ar-EG') : '-'
            });

        });

        await saveData();

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

        resetBill();

        // فتح الفاتورة المحفوظة للمراجعة والعودة للسجل (كل فاتورة ترجع لقسمها)

        // viewOldInvoice(newInvoiceId, 'بيع', true);

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

function printBill() {

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

    let paidValue = (method.includes('آجل')) ? (parseFloat(document.getElementById('tenderedAmount').value) || 0) : currentTotal;

    let prevBalance = (method.includes('آجل')) ? (parseFloat(document.getElementById('prevBalanceDisplay').innerText) || 0) : 0;

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

    if (typeof printInvoice === 'function') {

        printInvoice(invoiceData);

    } else {

        alert('خطأ: محرك الطباعة غير متوفر!');

    }

}

function printPurchaseBill() {

    if (purchaseCart.length === 0) return alert("⚠️ الفاتورة فارغة!");

    const supplier = document.getElementById('supplierName').value || 'مورد عام';

    const dt = getTransactionDateTime('purchaseDate', 'purchaseTime');

    const shopName = document.getElementById('shopName').value || 'متجر السعادة';

    const shopAddress = document.getElementById('shopAddress').value || '';

    const shopPhone = document.getElementById('shopPhone1').value || '';

    const purchaseId = document.getElementById('purchaseBadgeID') ? document.getElementById('purchaseBadgeID').innerText : '---';

    let subTotal = purchaseCart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    let discountVal = parseFloat(document.getElementById('purchaseDiscount').value) || 0;

    const discountType = document.getElementById('purchaseDiscountType').value;

    let discountAmount = (discountType === 'perc') ? (subTotal * discountVal / 100) : discountVal;

    let taxVal = parseFloat(document.getElementById('purchaseTax').value) || 0;

    const taxType = document.getElementById('purchaseTaxType').value;

    let taxAmount = (taxType === 'perc') ? (subTotal * taxVal / 100) : taxVal;

    const settings = JSON.parse(getStore('pos_settings') || '{}');

    const globalTaxEnabled = settings.taxEnabled || false;

    const globalTaxPercent = parseFloat(settings.taxPercent) || 0;

    let globalTaxAmount = globalTaxEnabled ? (subTotal * globalTaxPercent / 100) : 0;

    let finalTotal = subTotal - discountAmount + taxAmount + globalTaxAmount;

    const purchaseTaxReasonEl = document.getElementById('purchaseTaxReason');

    const selectedPurchaseTaxReason = purchaseTaxReasonEl ? purchaseTaxReasonEl.value.trim() : 'إضافة';

    const invoiceData = {

        invoiceNumber: purchaseId,

        invoiceType: 'نقداً',

        date: dt.iso || dt.full.split(' ')[0],

        time: dt.time || '',

        cashier: currentUser.name,

        customer: supplier,

        items: purchaseCart,

        subTotal: subTotal,

        discount: discountAmount,

        tax: taxAmount,

        taxLabel: selectedPurchaseTaxReason,

        globalTax: globalTaxAmount,

        totalAmount: finalTotal,

        paid: finalTotal,

        deferred: 0,

        prevBalance: 0,

        currentBalance: 0,

        docType: 'purchase'

    };

    if (typeof printInvoice === 'function') {

        printInvoice(invoiceData);

    } else {

        alert('خطأ: محرك الطباعة غير متوفر!');

    }

}

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

        const tr = document.createElement('tr');

        tr.setAttribute('data-index', idx);

        tr.style.transition = "0.2s";

        tr.innerHTML = `

                    <td style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${idx + 1}</td>

                    <td style="font-size: 0.85rem; color: #64748b; text-align: center; font-family: monospace;">${item.code || '---'}</td>

                    <td style="font-weight: 600; color: #1e293b;">${item.name}</td>

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

                        <input type="text" value="${item.price.toFixed(2)}" 

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

async function saveSalesReturn() {

    if (!checkPermission('docs_add')) return false;

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

        let partner = document.getElementById('salesReturnAccountInput')?.value;

        if (!partner || partner.trim() === '') {

            partner = document.getElementById('salesReturnPartnerDisplay').innerText;

        }

        if (!partner || partner === '---' || partner.trim() === '') {

            partner = 'عميل عام';

        }

        const method = getSelectedPaymentMethod('sales-return-section');

        const isCredit = method.includes('خصم') || method.includes('حساب');

        // ⛔ منع الإرجاع بالآجل للعملاء غير المسجلين (مثل عميل عام، عميل نقدي، إلخ)

        const isRegisteredCustomer = accounts.some(a => a.name === partner);

        if (isCredit && !isRegisteredCustomer) {

            showCustomAlert({
                type: 'error',
                titleText: '⚠️ خطأ في طريقة الرد',
                msg: `لا يمكن رد المبلغ على الحساب لأن العميل "<b>${partner}</b>" غير مسجل في شجرة الحسابات.<br><br>يرجى رد المبلغ <b>"نقداً"</b> أو اختيار عميل مسجل.`
            });

            return false;

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

        const originalInvoiceId = document.getElementById('salesReturnInvoiceDisplay').innerText;

        returnCart.forEach((item, idx) => {

            const p = productsDB.find(x => x.name === item.name);

            const factor = item.unitFactor || 1;

            const baseQty = item.qty * factor;

            if (p) p.stock += baseQty;

            const itemNetTotal = parseFloat((item.price * item.qty * ratio).toFixed(2));

            // حساب الربح "المسترد" (الذي سيتم خصمه) بناءً على تكلفة المنتج الحالية

            const baseCost = p ? (parseFloat(p.cost) || 0) : 0;

            const itemTotalCost = baseCost * baseQty;

            const profitLost = -(itemNetTotal - itemTotalCost); // الربح المفقود يكون بالسالب ليطرح من إجمالي الأرباح

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

        // تم إيقاف الطباعة التلقائية بناءً على طلب المستخدم (الحفظ فقط)

        // if (typeof printReturnReceipt === 'function') printReturnReceipt('sales');

        resetReturn();

        // العودة للسجل

        viewOldInvoice(returnInvoiceId, 'مرتجع بيع', true);

        return true;

    } finally {

        window.isSavingTransaction = false;

    }

}

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

        const tr = document.createElement('tr');

        tr.setAttribute('data-index', idx);

        tr.innerHTML = `

                    <td style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${idx + 1}</td>

                    <td style="font-size: 0.85rem; color: #64748b; text-align: center; font-family: monospace;">${item.code || '---'}</td>

                    <td style="font-weight: 600; color: #1e293b;">${item.name}</td>

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

                        <input type="text" value="${item.price.toFixed(2)}" 

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

async function savePurchaseReturn() {

    if (!checkPermission('docs_add')) return false;

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

        let partner = document.getElementById('purReturnAccountInput')?.value;

        if (!partner || partner.trim() === '') {

            partner = document.getElementById('purReturnPartnerDisplay').innerText;

        }

        if (!partner || partner === '---' || partner.trim() === '') {

            partner = 'مورد عام';

        }

        const reason = document.getElementById('purReturnReason').value;

        const dt = getTransactionDateTime('purReturnDate', 'purReturnTime');

        const method = getSelectedPaymentMethod('purchase-return-section');

        const isCredit = method.includes('خصم') || method.includes('حساب');

        // ⛔ منع الإرجاع بالآجل للموردين غير المسجلين (مثل مورد عام، مورد نقدي، إلخ)

        const isRegisteredSupplier = accounts.some(a => a.name === partner);

        if (isCredit && !isRegisteredSupplier) {

            showCustomAlert({
                type: 'error',
                titleText: '⚠️ خطأ في طريقة الرد',
                msg: `لا يمكن رد المبلغ على الحساب لأن المورد "<b>${partner}</b>" غير مسجل في شجرة الحسابات.<br><br>يرجى رد المبلغ <b>"نقداً"</b> أو اختيار مورد مسجل.`
            });

            return false;

        }

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

        const originalInvoiceId = document.getElementById('purReturnInvoiceDisplay').innerText;

        purReturnCart.forEach((item, idx) => {

            const p = productsDB.find(x => x.name === item.name);

            const factor = item.unitFactor || 1;

            const baseQty = item.qty * factor;

            if (p) p.stock -= baseQty;

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

        // تم إيقاف الطباعة التلقائية بناءً على طلب المستخدم (الحفظ فقط)

        // if (typeof printReturnReceipt === 'function') printReturnReceipt('purchase');

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

    const data = [

        ["اسم الصنف", "الكمية الحالية", "سعر الشراء", "سعر البيع", "الوحدة", "الباركود"],

        ["منتج تجريبي 1", "10", "100", "150", "قطعة", "1001"],

        ["منتج تجريبي 2", "5", "50", "80", "كيلو", "1002"]

    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "الأصناف");

    XLSX.writeFile(wb, "نموذج_أصناف_بيان_POS.xlsx");

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

        const stockVal = parseFloat(p.stock) || 0;

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

        let p = product.price;

        if (unit) {

            p = parseFloat(unit.price) || product.price;

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

        // reset

        currentReturnHeaderProductId = null;

        currentReturnHeaderUnit = null;

        if (pSearch) pSearch.value = '';

        if (hQty) hQty.value = '1';

        if (hPrice) hPrice.value = '';

        if (pSearch) pSearch.focus();

        return;

    }

    if (!query || query.trim() === "") return;

    let pInDB = productsDB.find(p => String(p.barcode) === String(query) || String(p.code) === String(query));

    if (!pInDB) {

        pInDB = productsDB.find(p => p.units && p.units.some(u => String(u.unitBarcode) === String(query)));

    }

    if (!pInDB) {

        const queryLower = query.toLowerCase();

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

    const isChar = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;

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

    const items = resultsDiv.querySelectorAll('.search-item, .result-item');

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

        if (universalSelectedIndex > -1) {

            e.preventDefault();

            e.stopImmediatePropagation();

            items[universalSelectedIndex].click();

        }

    }

});

function updateUniversalSelection(items, idx) {

    items.forEach((it, i) => {

        it.style.background = i === idx ? '#e8f0fe' : '';

        it.style.borderRight = i === idx ? '4px solid var(--main-blue)' : 'none';

        if (i === idx) it.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

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

    grid.innerHTML = quickItems.map(p => `

                <div class="quick-item-btn" onclick="addToCart(${p.id})">

                    <div class="item-name">${p.name}</div>

                    <div class="item-price">${p.price.toFixed(2)} ج.م</div>

                </div>

            `).join('');

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

    const originalHandleSearch = handleSearch;

    handleSearch = debounce(function (query) {

        originalHandleSearch(query);

    }, 300);

    const originalHandlePurchaseSearch = handlePurchaseSearch;

    handlePurchaseSearch = debounce(function (query) {

        originalHandlePurchaseSearch(query);

    }, 300);

    const originalHandleCustomerSearch = handleCustomerSearch;

    handleCustomerSearch = debounce(function (query) {

        originalHandleCustomerSearch(query);

    }, 300);

    const originalHandleSupplierSearch = handleSupplierSearch;

    handleSupplierSearch = debounce(function (query) {

        originalHandleSupplierSearch(query);

    }, 300);

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

    document.getElementById(totalId).innerText = origTotal.toFixed(2);

    document.getElementById(returnedId).innerText = returnedVal.toFixed(2);

    const remEl = document.getElementById(remainingId);

    remEl.innerText = remaining.toFixed(2);

    remEl.style.color = remaining <= 0 ? '#dc2626' : '#16a34a';

    card.style.display = 'block';

}
