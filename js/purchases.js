/**
 * =========================================================================================
 * BAYAN APP - PURCHASES MODULE (قسم المشتريات)
 * =========================================================================================
 * ملف مخصص بالكامل لجميع عمليات شاشة الشراء وإدخال الفواتير، البحث، الحسابات، والطباعة.
 */

window.purchaseCart = window.purchaseCart || [];
var purchaseCart = window.purchaseCart;
var currentPurchaseHeaderProductId = null;
var currentPurchaseHeaderUnit = null;
var currentPurchaseHeaderVariant = null;
var purchaseSearchSelectedIndex = -1;
var currentSupplierSearchIndex = -1;
var purchaseTotalVal = 0;

// --- 1. دوال الهيدر والإدخال السريع (Fast Input Header) ---

async function selectProductToPurchaseHeader(productId) {
    const product = (typeof db !== 'undefined') ? await db.products.get(productId) : productsDB.find(p => p.id === productId);
    if (!product) return;

    // إذا كان للصنف تشكيلة مقاسات وألوان ونظام المقاسات مفعل، نفتح نافذة المقاسات والألوان
    const isVariantsActive = document.body.classList.contains('bayan-variants-enabled');
    if (isVariantsActive && product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        const resultsDiv = document.getElementById('purchaseSearchResults');
        if (resultsDiv) resultsDiv.style.display = 'none';
        if (typeof showVariantSelectionModal === 'function') {
            showVariantSelectionModal(product, 'purchase');
        }
        return;
    }

    // إذا كان المنتج له وحدات متعددة، نفتح نافذة اختيار الوحدات
    if (product.units && product.units.length > 1) {
        const resultsDiv = document.getElementById('purchaseSearchResults');
        if (resultsDiv) resultsDiv.style.display = 'none';
        if (typeof showUnitSelectionModal === 'function') {
            showUnitSelectionModal(product, 'purchase');
        }
        return;
    }

    const defUnit = (product.units && product.units.length > 0) ? product.units[0] : null;
    fillPurchaseHeaderWithUnit(product, defUnit);
    const resultsDiv = document.getElementById('purchaseSearchResults');
    if (resultsDiv) resultsDiv.style.display = 'none';
}

function fillPurchaseHeaderWithUnit(product, unit) {
    currentPurchaseHeaderProductId = product.id;
    currentPurchaseHeaderUnit = unit;
    currentPurchaseHeaderVariant = null;

    const pSearch = document.getElementById('purchaseSearch');
    const hQty = document.getElementById('purchaseHeaderQty');
    const hPrice = document.getElementById('purchaseHeaderPrice');
    const hSale = document.getElementById('purchaseHeaderSalePrice');
    const hWholesale = document.getElementById('purchaseHeaderWholesalePrice');

    if (pSearch) pSearch.value = product.name;
    if (hPrice) hPrice.value = (unit ? (parseFloat(unit.cost) || parseFloat(product.cost) || 0) : (parseFloat(product.cost) || 0)).toFixed(2);
    if (hSale) hSale.value = (unit ? (parseFloat(unit.price) || parseFloat(product.price) || 0) : (parseFloat(product.price) || 0)).toFixed(2);
    if (hWholesale) hWholesale.value = (unit ? (parseFloat(unit.wholesale) || parseFloat(product.wholesale) || 0) : (parseFloat(product.wholesale) || 0)).toFixed(2);

    if (hQty) {
        hQty.value = 1;
        hQty.focus();
        hQty.select();
    }
}

function fillPurchaseHeaderWithVariant(product, unit, variant) {
    currentPurchaseHeaderProductId = product.id;
    currentPurchaseHeaderUnit = unit;
    currentPurchaseHeaderVariant = variant;

    const pSearch = document.getElementById('purchaseSearch');
    const hQty = document.getElementById('purchaseHeaderQty');
    const hPrice = document.getElementById('purchaseHeaderPrice');
    const hSale = document.getElementById('purchaseHeaderSalePrice');
    const hWholesale = document.getElementById('purchaseHeaderWholesalePrice');

    const varDesc = [variant.size ? `مقاس ${variant.size}` : '', variant.color ? `لون ${variant.color}` : ''].filter(Boolean).join(' - ');
    if (pSearch) pSearch.value = varDesc ? `${product.name} (${varDesc})` : product.name;

    const costVal = parseFloat(variant.cost) || parseFloat(product.cost) || 0;
    if (hPrice) hPrice.value = costVal.toFixed(2);

    const priceVal = parseFloat(variant.price) || parseFloat(product.price) || 0;
    if (hSale) hSale.value = priceVal.toFixed(2);

    const wsVal = parseFloat(variant.wholesale) || parseFloat(product.wholesale) || 0;
    if (hWholesale) hWholesale.value = wsVal.toFixed(2);

    if (hQty) {
        hQty.value = 1;
        hQty.focus();
        hQty.select();
    }
}

// --- 2. البحث والتنقل الذكي بالكيبورد في قسم الشراء ---

async function handlePurchaseSearch(query) {
    const resultsDiv = document.getElementById('purchaseSearchResults');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '';
    purchaseSearchSelectedIndex = -1;
    
    resultsDiv.style.setProperty('overflow', 'visible', 'important');
    resultsDiv.style.setProperty('max-height', 'none', 'important');
    resultsDiv.style.setProperty('border', 'none', 'important');
    resultsDiv.style.setProperty('background', 'transparent', 'important');
    resultsDiv.style.setProperty('box-shadow', 'none', 'important');

    if (!query || !query.trim()) { 
        resultsDiv.style.display = 'none'; 
        resultsDiv.innerHTML = '';
        return; 
    }

    const queryLower = query.trim().toLowerCase();

    const filtered = productsDB.filter(p =>
        (p.name && p.name.toLowerCase().includes(queryLower)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(queryLower)) ||
        (p.code && String(p.code).toLowerCase().includes(queryLower)) ||
        (p.units && p.units.some(u => u.unitBarcode && String(u.unitBarcode).toLowerCase().includes(queryLower)))
    ).slice(0, 10);

    if (filtered.length > 0) {
        resultsDiv.innerHTML = `
            <div class="pos-search-panel" style="width: calc(100% + 340px); max-width: 600px; min-width: 320px; position: absolute; top: 100%; left: 50%; transform: translateX(50%); z-index: 99999; background: white; border-radius: 14px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); border: 1px solid #cbd5e1; direction: rtl; text-align: right; margin-top: 6px; animation: modalFadeIn 0.2s ease-out;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; border-top-left-radius: 14px; border-top-right-radius: 14px;">
                    <span style="font-weight: 800; font-size: 0.88rem; color: #5e3370;">🔍 نتائج بحث الأصناف (${filtered.length} صنف)</span>
                    <button onclick="document.getElementById('purchaseSearchResults').style.display='none';" class="pos-search-close-btn" title="إغلاق النافذة">❌</button>
                </div>
                <div style="max-height: 380px; overflow-y: auto; padding: 6px; scrollbar-gutter: stable;">
                    ${filtered.map(p => {
                        const priceVal = parseFloat(p.price) || 0;
                        const wholesaleVal = parseFloat(p.wholesale) || 0;
                        const stockVal = (typeof getActiveWarehouseStock === 'function') ? getActiveWarehouseStock(p) : (parseFloat(p.stock) || 0);

                        let variantsInfo = '';
                        if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
                            const sizes = [...new Set(p.variants.map(v => v.size).filter(Boolean))].slice(0, 5);
                            const colors = [...new Set(p.variants.map(v => v.color).filter(Boolean))].slice(0, 4);
                            const details = [];
                            if (sizes.length > 0) details.push(`مقاسات: ${sizes.join(', ')}`);
                            if (colors.length > 0) details.push(`ألوان: ${colors.join(', ')}`);
                            if (details.length > 0) {
                                variantsInfo = `<div style="font-size:0.72rem; color:#6d28d9; margin-top:3px; font-weight:700;">👟 ${details.join(' | ')}</div>`;
                            }
                        }

                        return `
                            <div class="pos-search-row" onclick="selectProductToPurchaseHeader(${p.id});" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: 0.15s; border-radius: 10px; gap: 8px;">
                                <div style="flex: 1.5; min-width: 170px;">
                                    <div style="font-weight: 900; font-size: 0.95rem; color: #1e293b;">${p.name}</div>
                                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">🏷️ كود: <b style="color:#5e3370;">${p.code || p.id}</b> | باركود: <b>${p.barcode || '---'}</b></div>
                                    ${variantsInfo}
                                </div>
                                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                    <div style="text-align: center; background: #f8fafc; padding: 4px 8px; border-radius: 8px; border: 1px solid #e2e8f0; min-width: 65px;">
                                        <div style="font-size: 0.7rem; color: #64748b;">📦 الرصيد</div>
                                        <div style="font-weight: 900; font-size: 0.85rem; color: ${stockVal <= 5 ? '#ef4444' : '#10b981'};">${stockVal} <span style="font-size:0.65rem;">${p.unit || 'قطعة'}</span></div>
                                    </div>
                                    <div style="text-align: center; background: rgba(59, 130, 246, 0.08); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2); min-width: 75px;">
                                        <div style="font-size: 0.7rem; color: #1e40af; font-weight: 700;">💰 سعر القطاعي</div>
                                        <div style="font-weight: 900; font-size: 0.9rem; color: #2563eb;">${priceVal.toFixed(2)}</div>
                                    </div>
                                    <div style="text-align: center; background: rgba(16, 185, 129, 0.08); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2); min-width: 75px;">
                                        <div style="font-size: 0.7rem; color: #065f46; font-weight: 700;">💵 سعر الجملة</div>
                                        <div style="font-weight: 900; font-size: 0.9rem; color: #059669;">${wholesaleVal.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        resultsDiv.style.display = 'block';
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
            completeAddToPurchaseCart(product, currentPurchaseHeaderUnit, null, null, currentPurchaseHeaderVariant);
            currentPurchaseHeaderProductId = null;
            currentPurchaseHeaderUnit = null;
            currentPurchaseHeaderVariant = null;
            const pSearch = document.getElementById('purchaseSearch');
            if (pSearch) pSearch.value = '';
            const resultsDiv = document.getElementById('purchaseSearchResults');
            if (resultsDiv) resultsDiv.style.display = 'none';
            if (pSearch) pSearch.focus();
        }
        return;
    }

    const cleanQuery = String(query).trim();

    // 1. بحث فوري في باركود تشكيلات المقاسات والألوان
    let matchingVariant = null;
    let pMatch = productsDB.find(p => {
        if (p.variants && Array.isArray(p.variants)) {
            const vFound = p.variants.find(v => String(v.barcode).trim() === cleanQuery);
            if (vFound) {
                matchingVariant = vFound;
                return true;
            }
        }
        return false;
    });

    if (pMatch && matchingVariant) {
        fillPurchaseHeaderWithVariant(pMatch, null, matchingVariant);
        const pSearch = document.getElementById('purchaseSearch');
        if (pSearch) pSearch.value = '';
        const resultsDiv = document.getElementById('purchaseSearchResults');
        if (resultsDiv) resultsDiv.style.display = 'none';
        return;
    }

    if (!pMatch) {
        pMatch = productsDB.find(p => String(p.barcode) === cleanQuery || String(p.code) === cleanQuery);
    }

    if (!pMatch) {
        pMatch = productsDB.find(p => p.units && p.units.some(u => String(u.unitBarcode) === cleanQuery));
    }

    if (!pMatch) {
        const queryLower = cleanQuery.toLowerCase();
        pMatch = productsDB.find(p => p.name && p.name.toLowerCase().includes(queryLower));
    }

    if (pMatch) {
        const isVariantsActive = document.body.classList.contains('bayan-variants-enabled');
        if (isVariantsActive && pMatch.variants && Array.isArray(pMatch.variants) && pMatch.variants.length > 0) {
            if (typeof showVariantSelectionModal === 'function') {
                showVariantSelectionModal(pMatch, 'purchase');
            }
            const pSearch = document.getElementById('purchaseSearch');
            if (pSearch) pSearch.value = '';
            const resultsDiv = document.getElementById('purchaseSearchResults');
            if (resultsDiv) resultsDiv.style.display = 'none';
            return;
        }

        if (forceAdd) {
            addToPurchaseCart(pMatch.id);
            const pSearch = document.getElementById('purchaseSearch');
            if (pSearch) pSearch.value = '';
            const resultsDiv = document.getElementById('purchaseSearchResults');
            if (resultsDiv) resultsDiv.style.display = 'none';
            if (pSearch) pSearch.focus();
        } else {
            selectProductToPurchaseHeader(pMatch.id);
        }
    }
}

function handlePurchaseSearchKeydown(e) {
    const resultsDiv = document.getElementById('purchaseSearchResults');
    if (!resultsDiv || resultsDiv.style.display === 'none') {
        if (e.key === 'Enter') {
            e.preventDefault();
            handlePurchaseSearchEnter(e.target.value, e);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('purchaseHeaderQty')?.focus();
        }
        return;
    }

    const items = resultsDiv.querySelectorAll('.pos-search-row, .search-item, .result-item');
    if (items.length === 0) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handlePurchaseSearchEnter(e.target.value, e);
        }
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        purchaseSearchSelectedIndex = (purchaseSearchSelectedIndex + 1) % items.length;
        updatePurchaseSearchSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        purchaseSearchSelectedIndex = (purchaseSearchSelectedIndex - 1 + items.length) % items.length;
        updatePurchaseSearchSelection(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (purchaseSearchSelectedIndex > -1 && items[purchaseSearchSelectedIndex]) {
            e.stopPropagation();
            items[purchaseSearchSelectedIndex].click();
        } else {
            handlePurchaseSearchEnter(e.target.value, e);
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        resultsDiv.style.display = 'none';
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        document.getElementById('purchaseHeaderQty')?.focus();
    }
}

function updatePurchaseSearchSelection(items) {
    items.forEach((item, index) => {
        if (index === purchaseSearchSelectedIndex) {
            item.style.setProperty('background', '#eff6ff', 'important');
            item.style.setProperty('border-right', '5px solid #3b82f6', 'important');
            item.style.setProperty('box-shadow', '0 2px 8px rgba(59, 130, 246, 0.15)', 'important');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.style.background = '';
            item.style.borderRight = 'none';
            item.style.boxShadow = 'none';
        }
    });
}

// --- 3. البحث عن الموردين واختيارهم ---

function handleSupplierSearch(query) {
    const resultsDiv = document.getElementById('supplierSearchResults');
    if (!resultsDiv) return;
    resultsDiv.innerHTML = '';
    currentSupplierSearchIndex = -1;

    if (!query || !query.trim()) {
        resultsDiv.style.display = 'none';
        return;
    }

    const queryLower = query.toLowerCase().trim();
    const filtered = accounts.filter(a =>
        (a.name && a.name.toLowerCase().includes(queryLower)) ||
        (a.code && a.code.toString().includes(queryLower)) ||
        (a.mobile && a.mobile.includes(queryLower))
    );

    if (filtered.length > 0) {
        resultsDiv.style.display = 'block';
        filtered.forEach((a, idx) => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.setAttribute('data-index', idx);
            div.innerHTML = `<span>${a.name}</span><span class="stock-badge">${a.type === 'supplier' ? 'مورد' : (a.type === 'mixed' ? 'مشترك' : 'حساب')}</span>`;
            div.onclick = () => selectSupplierSearchResult(a);
            resultsDiv.appendChild(div);
        });
    } else {
        resultsDiv.style.display = 'none';
    }
}

function selectSupplierSearchResult(a) {
    const suppInput = document.getElementById('supplierName');
    if (suppInput) suppInput.value = a.name;

    const resultsDiv = document.getElementById('supplierSearchResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'none';
    }

    currentSupplierSearchIndex = -1;
    if (typeof updateHeaderPartnerInfo === 'function') {
        updateHeaderPartnerInfo();
    }

    const pSearch = document.getElementById('purchaseSearch');
    if (pSearch) pSearch.focus();
}

function handleSupplierSearchKeydown(e) {
    const resultsDiv = document.getElementById('supplierSearchResults');
    if (!resultsDiv || resultsDiv.style.display === 'none') {
        if (e.key === 'Enter') {
            e.preventDefault();
            const pSearch = document.getElementById('purchaseSearch');
            if (pSearch) pSearch.focus();
        }
        return;
    }

    const items = resultsDiv.querySelectorAll('.result-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentSupplierSearchIndex = (currentSupplierSearchIndex + 1) % items.length;
        updateSupplierSearchHighlight(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentSupplierSearchIndex = (currentSupplierSearchIndex - 1 + items.length) % items.length;
        updateSupplierSearchHighlight(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentSupplierSearchIndex >= 0 && items[currentSupplierSearchIndex]) {
            items[currentSupplierSearchIndex].click();
        } else if (items.length === 1) {
            items[0].click();
        } else {
            resultsDiv.style.display = 'none';
            const pSearch = document.getElementById('purchaseSearch');
            if (pSearch) pSearch.focus();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        resultsDiv.style.display = 'none';
    }
}

function updateSupplierSearchHighlight(items) {
    items.forEach((item, idx) => {
        if (idx === currentSupplierSearchIndex) {
            item.classList.add('selected');
            item.style.background = 'rgba(59, 130, 246, 0.15)';
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
            item.style.background = '';
        }
    });
}

// --- 4. إضافة وتعديل عناصر سلة الشراء (Purchase Cart Logic) ---

function addToPurchaseCart(id, unitName = null, manualQty = null, manualCost = null, preSelectedVariant = null) {
    const product = productsDB.find(p => p.id === id);
    if (!product) return;

    if (preSelectedVariant) {
        const defUnit = (product.units && product.units.length > 0) ? product.units[0] : null;
        completeAddToPurchaseCart(product, defUnit, manualQty, manualCost, preSelectedVariant);
        return;
    }

    if (product.variants && product.variants.length > 0 && !preSelectedVariant) {
        if (typeof showVariantSelectionModal === 'function') {
            showVariantSelectionModal(product, 'purchase');
        }
        return;
    }

    if (unitName) {
        const unit = product.units ? product.units.find(u => u.unitName === unitName) : null;
        completeAddToPurchaseCart(product, unit, manualQty, manualCost);
        return;
    }

    if (product.units && product.units.length > 1) {
        if (typeof showUnitSelectionModal === 'function') {
            showUnitSelectionModal(product, 'purchase');
        }
        return;
    }

    const defUnit = (product.units && product.units.length > 0) ? product.units[0] : null;
    completeAddToPurchaseCart(product, defUnit, manualQty, manualCost);
}

function completeAddToPurchaseCart(product, selectedUnit, manualQty = null, manualCost = null, selectedVariant = null) {
    let qtyToAdd = 1;
    const hQtyInput = document.getElementById('purchaseHeaderQty');
    const hPriceInput = document.getElementById('purchaseHeaderPrice');

    if (manualQty !== null) {
        qtyToAdd = parseFloat(manualQty) || 1;
    } else {
        qtyToAdd = hQtyInput ? (parseFloat(hQtyInput.value) || 1) : 1;
    }

    const vSize = selectedVariant ? (selectedVariant.size || '') : '';
    const vColor = selectedVariant ? (selectedVariant.color || '') : '';

    const existing = purchaseCart.find(item =>
        item.id === product.id &&
        ((!item.selectedUnit && !selectedUnit) || (item.selectedUnit && selectedUnit && item.selectedUnit.unitName === selectedUnit.unitName)) &&
        ((item.selectedSize || '') === vSize) &&
        ((item.selectedColor || '') === vColor)
    );

    const finalUnit = selectedUnit || currentPurchaseHeaderUnit;
    const factor = finalUnit ? parseFloat(finalUnit.factor) : 1;

    const hSalePrice = document.getElementById('purchaseHeaderSalePrice');
    const hWholesalePrice = document.getElementById('purchaseHeaderWholesalePrice');

    let salePrice = (selectedVariant && parseFloat(selectedVariant.price) > 0)
        ? parseFloat(selectedVariant.price)
        : (finalUnit && parseFloat(finalUnit.price) > 0)
            ? parseFloat(finalUnit.price)
            : (parseFloat(product.price) || 0);

    if (currentPurchaseHeaderProductId === product.id && hSalePrice && hSalePrice.value.trim() !== '') {
        const hVal = parseFloat(hSalePrice.value);
        if (!isNaN(hVal) && hVal > 0) salePrice = hVal;
    }

    let wholesalePrice = (selectedVariant && parseFloat(selectedVariant.wholesale) > 0)
        ? parseFloat(selectedVariant.wholesale)
        : (finalUnit && parseFloat(finalUnit.wholesale) > 0)
            ? parseFloat(finalUnit.wholesale)
            : (parseFloat(product.wholesale) || 0);

    if (currentPurchaseHeaderProductId === product.id && hWholesalePrice && hWholesalePrice.value.trim() !== '') {
        const hVal = parseFloat(hWholesalePrice.value);
        if (!isNaN(hVal) && hVal > 0) wholesalePrice = hVal;
    }

    let cost = 0;
    if (manualCost !== null && !isNaN(parseFloat(manualCost))) {
        cost = parseFloat(manualCost);
    } else if (hPriceInput && hPriceInput.value.trim() !== '') {
        cost = parseFloat(hPriceInput.value) || 0;
    } else if (selectedVariant && selectedVariant.cost) {
        cost = parseFloat(selectedVariant.cost) || 0;
    } else if (finalUnit && parseFloat(finalUnit.cost) > 0) {
        cost = parseFloat(finalUnit.cost);
    } else {
        cost = parseFloat(product.cost) || 0;
    }

    if (existing) {
        existing.qty += qtyToAdd;
        if (cost > 0) existing.cost = cost;
        existing.price = cost;
        existing.salePrice = salePrice;
        existing.wholesalePrice = wholesalePrice;
    } else {
        purchaseCart.push({
            id: product.id,
            code: (selectedVariant && selectedVariant.barcode) ? selectedVariant.barcode : product.code,
            name: product.name,
            selectedSize: vSize,
            selectedColor: vColor,
            selectedVariant: selectedVariant,
            price: cost,
            cost: cost,
            salePrice: salePrice,
            wholesalePrice: wholesalePrice,
            qty: qtyToAdd,
            units: product.units || [],
            selectedUnit: finalUnit,
            unitFactor: factor,
            expiry: product.expiry || ''
        });
    }

    currentPurchaseHeaderUnit = null;

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

function renderPurchaseCart_Finalized_V3() {
    const tbody = document.getElementById('purchaseTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (typeof updateHeaderPartnerInfo === 'function') {
        updateHeaderPartnerInfo();
    }

    let sub = 0;

    purchaseCart.forEach((item, idx) => {
        const price = parseFloat(item.price) || 0;
        const qty = parseFloat(item.qty) || 0;
        const total = price * qty;
        sub += total;

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

        const displaySalePrice = (item.salePrice !== undefined && item.salePrice !== null && !isNaN(item.salePrice) && parseFloat(item.salePrice) > 0) 
            ? item.salePrice 
            : (item.selectedVariant && item.selectedVariant.price ? (parseFloat(item.selectedVariant.price) || 0) : (pInfo ? (parseFloat(pInfo.price) || 0) : 0));

        const displayWholesalePrice = (item.wholesalePrice !== undefined && item.wholesalePrice !== null && !isNaN(item.wholesalePrice) && parseFloat(item.wholesalePrice) > 0) 
            ? item.wholesalePrice 
            : (item.selectedVariant && item.selectedVariant.wholesale ? (parseFloat(item.selectedVariant.wholesale) || 0) : (pInfo ? (parseFloat(pInfo.wholesale) || 0) : 0));

        const { sizeElement, colorElement } = (typeof renderVariantSelectElements === 'function') 
            ? renderVariantSelectElements(item, idx, 'purchase') 
            : { sizeElement: item.selectedSize || '-', colorElement: item.selectedColor || '-' };

        const tr = document.createElement('tr');
        tr.setAttribute('data-index', idx);
        tr.className = 'purchase-row';
        tr.innerHTML = `
            <td style="text-align: center; color: #94a3b8; font-size: 0.8rem; font-weight: bold;">${idx + 1}</td>
            <td style="font-size: 0.85rem; color: #64748b; text-align: center; font-family: monospace; font-weight: bold;">${item.code || '---'}</td>
            <td style="font-weight: 900; color: #1e293b; text-align: right;">${item.name}</td>
            <td class="col-variant-size" style="text-align: center;">${sizeElement}</td>
            <td class="col-variant-color" style="text-align: center;">${colorElement}</td>

            <td>
                <input type="number" class="qty-input-styled" value="${item.qty}" min="0.01" step="any"
                       oninput="updatePurchaseItem(${idx}, 'qty', this.value, false)" 
                       onchange="updatePurchaseItem(${idx}, 'qty', this.value, true)"
                       onclick="this.select()" 
                       onfocus="this.select()"
                       style="width: 100%; height: 36px; text-align: center; border: 1.5px solid #cbd5e1; background: #fff; border-radius: 8px; padding: 4px; font-weight: 900; font-size: 1rem; color: #1e293b; transition: all 0.2s; outline: none; box-sizing: border-box;">
            </td>

            <td>
                <input type="number" class="final-editable-purchase-price" value="${price}" 
                       step="0.01" min="0"
                       oninput="updatePurchaseItem(${idx}, 'price', this.value, false)" 
                       onchange="updatePurchaseItem(${idx}, 'price', this.value, true)"
                       onclick="this.select()" 
                       onfocus="this.select()"
                       style="width: 100% !important; height: 36px !important; text-align: center !important; border: 2px solid #3b82f6 !important; background: #eff6ff !important; border-radius: 8px !important; padding: 4px !important; font-weight: 900 !important; font-size: 1rem !important; color: #1e3a8a !important; display: block !important; outline: none !important; cursor: text !important; box-sizing: border-box !important;">
            </td>

            <td style="background: rgba(34, 197, 94, 0.05); text-align: center;">
                <input type="number" step="0.01" min="0" class="retail-input-styled" value="${displaySalePrice}" 
                       oninput="updatePurchaseItem(${idx}, 'salePrice', this.value, false)" 
                       onchange="updatePurchaseItem(${idx}, 'salePrice', this.value, true)"
                       onclick="this.select()" 
                       onfocus="this.select()"
                       placeholder="0.00"
                       style="width: 100%; height: 36px; text-align: center; border: 1.5px solid #10b981; background: #f0fdf4; border-radius: 8px; padding: 4px; font-weight: 900; font-size: 0.95rem; color: #047857; outline: none; cursor: text; box-sizing: border-box;">
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
    if (typeof updateItemUnit === 'function') {
        updateItemUnit(idx, unitName, 'purchase');
    }
}

function removePurchaseItem(index) {
    if (typeof isEditMode !== 'undefined' && isEditMode && typeof checkPermission === 'function' && !checkPermission('docs_edit')) return;
    const item = purchaseCart[index];
    if (item && typeof addToTrash === 'function') {
        addToTrash('draft_item', item, `حذف من فاتورة شراء (مسودة): ${item.name}`);
    }
    purchaseCart.splice(index, 1);
    renderPurchaseCart_Finalized_V3();
}

function updatePurchaseItem(idx, field, val, shouldReRender = true) {
    if (!purchaseCart[idx]) return;

    const numericVal = parseFloat(val) || 0;
    purchaseCart[idx][field] = numericVal;

    // تحديث الصنف في قاعدة البيانات والذاكرة لو كان التغيير في أي من الأسعار (شراء، قطاعي، جملة)
    if (shouldReRender && (field === 'salePrice' || field === 'wholesalePrice' || field === 'price')) {
        updateProductPricesInDB(purchaseCart[idx]);
    }

    if (!shouldReRender) {
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
    if (!item || !item.id || typeof db === 'undefined') return;

    db.products.get(item.id).then(product => {
        if (!product) return;

        const oldStock = parseFloat(product.stock) || 0;
        const oldCost = parseFloat(product.cost) || 0;
        const newQty = parseFloat(item.qty) || 0;
        const newPurchasePrice = parseFloat(item.price) || 0;

        if (item.selectedUnit) {
            const unitIdx = product.units.findIndex(u => u.unitName === item.selectedUnit.unitName);
            if (unitIdx !== -1) {
                if (item.salePrice !== undefined && item.salePrice !== null) product.units[unitIdx].price = item.salePrice;
                if (item.wholesalePrice !== undefined && item.wholesalePrice !== null) product.units[unitIdx].wholesale = item.wholesalePrice;
                if (newPurchasePrice > 0) {
                    product.units[unitIdx].cost = newPurchasePrice;
                    product.units[unitIdx].avgBuyPrice = newPurchasePrice;
                }
            }
        } else {
            if (item.salePrice !== undefined && item.salePrice !== null) product.price = item.salePrice;
            if (item.wholesalePrice !== undefined && item.wholesalePrice !== null) product.wholesale = item.wholesalePrice;
            if (newPurchasePrice > 0) {
                product.cost = newPurchasePrice;
                product.avgBuyPrice = newPurchasePrice;
            }
        }

        if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
            const vMatch = (typeof window.findMatchingVariant === 'function')
                ? window.findMatchingVariant(product, item)
                : product.variants.find(v => 
                    (item.selectedVariant && v.barcode && v.barcode === item.selectedVariant.barcode) ||
                    ((v.size || '') === (item.selectedSize || item.size || '') && (v.color || '') === (item.selectedColor || item.color || ''))
                );
            if (vMatch) {
                vMatch.price = item.salePrice;
                vMatch.wholesale = item.wholesalePrice;
                vMatch.cost = newPurchasePrice;
            }
        }

        db.products.put(product).then(() => {
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

    const itemsCount = purchaseCart.length;
    const totalQty = purchaseCart.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

    if (document.getElementById('purchaseItemsCount')) document.getElementById('purchaseItemsCount').innerText = itemsCount;
    if (document.getElementById('purchaseTotalQty')) document.getElementById('purchaseTotalQty').innerText = totalQty;
    if (document.getElementById('purchaseSubTotal')) document.getElementById('purchaseSubTotal').innerText = sub.toFixed(2);

    let discVal = parseFloat(document.getElementById('purchaseDiscount')?.value) || 0;
    const discType = document.getElementById('purchaseDiscountType')?.value || 'val';
    let discAmount = (discType === 'perc') ? (sub * discVal / 100) : discVal;
    if (document.getElementById('purchaseDiscountAmountDisplay')) document.getElementById('purchaseDiscountAmountDisplay').innerText = discAmount.toFixed(2);

    let taxVal = parseFloat(document.getElementById('purchaseTax')?.value) || 0;
    const taxType = document.getElementById('purchaseTaxType')?.value || 'val';
    let taxAmount = (taxType === 'perc') ? (sub * taxVal / 100) : taxVal;
    if (document.getElementById('purchaseTaxAmountDisplay')) document.getElementById('purchaseTaxAmountDisplay').innerText = taxAmount.toFixed(2);

    const settings = JSON.parse(getStore('pos_settings') || '{}');
    const globalTaxEnabled = settings.taxEnabled || false;
    const globalTaxPercent = parseFloat(settings.taxPercent) || 0;
    let globalTaxAmount = globalTaxEnabled ? (sub * globalTaxPercent / 100) : 0;

    purchaseTotalVal = sub - discAmount + taxAmount + globalTaxAmount;
    if (purchaseTotalVal < 0) purchaseTotalVal = 0;

    if (document.getElementById('purchaseTotal')) {
        document.getElementById('purchaseTotal').innerText = purchaseTotalVal.toFixed(2);
    }

    const partnerName = document.getElementById('supplierName') ? document.getElementById('supplierName').value.trim() : '';
    let rawBal = 0;
    if (typeof getAccountBalance === 'function' && partnerName) {
        rawBal = getAccountBalance(partnerName);
    } else {
        const prevText = parseFloat(document.getElementById('purchasePrevBalanceDisplay')?.innerText) || 0;
        const balBadge = document.getElementById('supplierBalanceDisplay');
        const isDebt = balBadge && (balBadge.parentElement?.style?.backgroundColor?.includes('39, 174, 96') || balBadge.style?.color?.includes('green'));
        rawBal = isDebt ? prevText : -prevText;
    }

    if (document.getElementById('purchaseGrandTotalDisplay')) {
        const paid = parseFloat(document.getElementById('purchasePaid')?.value || 0);
        const newDebt = purchaseTotalVal - paid;

        let finalGrandTotal = 0;
        if (rawBal > 0) {
            finalGrandTotal = rawBal - newDebt;
        } else if (rawBal < 0) {
            finalGrandTotal = Math.abs(rawBal) + newDebt;
        } else {
            finalGrandTotal = newDebt;
        }
        document.getElementById('purchaseGrandTotalDisplay').innerText = Math.abs(finalGrandTotal).toFixed(2);
    }

    calculatePurchaseChange();

    if (sub > 0) {
        const rows = document.querySelectorAll('#purchaseTableBody tr');
        purchaseCart.forEach((item, index) => {
            const row = rows[index];
            if (row) {
                const totalCell = row.cells[8] || row.querySelector('.row-total');
                if (totalCell) totalCell.innerText = (item.price * item.qty).toFixed(2);
            }
        });
    }
}

function calculatePurchaseChange() {
    const paid = parseFloat(document.getElementById('purchasePaid')?.value) || 0;
    if (document.getElementById('purchaseRemaining')) {
        document.getElementById('purchaseRemaining').innerText = (purchaseTotalVal - paid).toFixed(2);
    }
}

// --- 5. حفظ فاتورة الشراء وتحديث المخازن والحسابات ---

async function savePurchase(force = false, accountChecked = false) {
    if (typeof checkPermission === 'function' && !checkPermission('docs_purchase')) return false;
    if (window.isSavingTransaction) return false;
    window.isSavingTransaction = true;

    try {
        if (!isEditMode && typeof window.enforceSubscriptionCheck === 'function' && !window.enforceSubscriptionCheck('invoice')) {
            return false;
        }

        if (purchaseCart.length === 0) {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert({
                    type: 'warning',
                    titleText: '⚠️ تنبيه',
                    msg: 'الفاتورة فارغة! لا يمكن الحفظ.'
                });
            } else {
                alert('الفاتورة فارغة! لا يمكن الحفظ.');
            }
            return false;
        }

        const supplier = document.getElementById('supplierName')?.value?.trim() || '';

        if (supplier && typeof checkAccountFrozenAndAlert === 'function') {
            if (checkAccountFrozenAndAlert(supplier)) {
                return false;
            }
        }

        const selectedMethod = (typeof getSelectedPaymentMethod === 'function') 
            ? getSelectedPaymentMethod('purchase-section') 
            : (document.getElementById('purchase-sectionPaymentMethodSelect')?.value || 'نقدي');

        const purchasePaidInput = document.getElementById('purchasePaid');
        const purchasePaidBox = document.getElementById('purchasePaidBox');

        const subTotalInit = purchaseCart.reduce((a, b) => a + (b.price * b.qty), 0);
        const discValInit = parseFloat(document.getElementById('purchaseDiscount')?.value) || 0;
        const discTypeInit = document.getElementById('purchaseDiscountType')?.value || 'val';
        const discAmountInit = (discTypeInit === 'perc') ? (subTotalInit * discValInit / 100) : discValInit;
        const taxValInit = parseFloat(document.getElementById('purchaseTax')?.value) || 0;
        const taxTypeInit = document.getElementById('purchaseTaxType')?.value || 'val';
        const taxAmountInit = (taxTypeInit === 'perc') ? (subTotalInit * taxValInit / 100) : taxValInit;
        const finalTotalInit = subTotalInit - discAmountInit + taxAmountInit;

        const isExplicitCreditMethod = (typeof window.isTransactionCredit === 'function') 
            ? window.isTransactionCredit(selectedMethod, 0, 0, 0)
            : selectedMethod.includes('آجل');

        let paidAmount = 0;
        if (!isExplicitCreditMethod) {
            if (!purchasePaidBox || purchasePaidBox.style.display === 'none' || !purchasePaidInput || purchasePaidInput.value === '' || purchasePaidInput.value === '0') {
                paidAmount = finalTotalInit;
                if (purchasePaidInput) purchasePaidInput.value = finalTotalInit;
            } else {
                paidAmount = parseFloat(purchasePaidInput.value) || finalTotalInit;
            }
        } else {
            paidAmount = parseFloat(purchasePaidInput ? purchasePaidInput.value : 0) || 0;
        }

        const isCredit = isExplicitCreditMethod || (!isExplicitCreditMethod && purchasePaidBox && purchasePaidBox.style.display !== 'none' && ((finalTotalInit - paidAmount) > 0.001));

        if (!accountChecked && typeof window.ensurePartnerAccountExists === 'function') {
            window.isSavingTransaction = false;
            const ok = await window.ensurePartnerAccountExists(supplier, 'مورد', isCredit, () => {
                savePurchase(force, true);
            });
            if (!ok) return false;
            window.isSavingTransaction = true;
        }

        const finalPartner = supplier || 'مورد نقدي';

        let purchaseId;
        if (typeof isEditMode !== 'undefined' && isEditMode && editingInvoiceId) {
            purchaseId = editingInvoiceId;
            if (window.revertAndClearOldInvoice) {
                await window.revertAndClearOldInvoice(editingInvoiceId, editingInvoiceType);
            }
        } else {
            purchaseId = document.getElementById('purchaseBadgeID')?.innerText || String(Date.now());
        }

        const dt = (typeof isEditMode !== 'undefined' && isEditMode) ? editingOriginalDate : getTransactionDateTime('purchaseDate', 'purchaseTime');

        const subTotal = purchaseCart.reduce((a, b) => a + (b.price * b.qty), 0);
        const discVal = parseFloat(document.getElementById('purchaseDiscount')?.value) || 0;
        const discType = document.getElementById('purchaseDiscountType')?.value || 'val';
        const discAmount = (discType === 'perc') ? (subTotal * discVal / 100) : discVal;

        const taxVal = parseFloat(document.getElementById('purchaseTax')?.value) || 0;
        const taxType = document.getElementById('purchaseTaxType')?.value || 'val';
        const taxAmount = (taxType === 'perc') ? (subTotal * taxVal / 100) : taxVal;

        const finalTotalVal = subTotal - discAmount + taxAmount;
        const ratio = subTotal > 0 ? (finalTotalVal / subTotal) : 1;
        const activeWH = (typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';

        purchaseCart.forEach((item, idx) => {
            const p = productsDB.find(x => x.id === item.id || x.name === item.name);
            if (p) {
                const factor = item.unitFactor || 1;
                const baseQty = item.qty * factor;
                const itemUnitPriceBase = item.price / factor;

                if (itemUnitPriceBase > 0) {
                    p.cost = itemUnitPriceBase;
                    p.avgBuyPrice = itemUnitPriceBase;
                }

                p.stock = finalStockCount;
                if (!p.warehouseStocks) p.warehouseStocks = {};
                p.warehouseStocks[activeWH] = (parseFloat(p.warehouseStocks[activeWH]) || 0) + baseQty;

                if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
                    const vMatch = (typeof window.findMatchingVariant === 'function')
                        ? window.findMatchingVariant(p, item)
                        : p.variants.find(v => 
                            (item.selectedVariant && v.barcode && v.barcode === item.selectedVariant.barcode) ||
                            ((v.size || '') === (item.selectedSize || item.size || '') && (v.color || '') === (item.selectedColor || item.color || ''))
                        );
                    if (vMatch) {
                        vMatch.stock = (parseFloat(vMatch.stock) || 0) + baseQty;
                        const iSale = parseFloat(item.salePrice) || 0;
                        const iWhole = parseFloat(item.wholesalePrice) || 0;
                        if (iSale > 0) vMatch.price = iSale;
                        if (iWhole > 0) vMatch.wholesale = iWhole;
                        vMatch.cost = itemUnitPriceBase;

                        p.stock = p.variants.reduce((sum, v) => sum + (parseFloat(v.stock) || 0), 0);
                    }
                }

                const salePrice = parseFloat(item.salePrice) || 0;
                const wholesalePrice = parseFloat(item.wholesalePrice) || 0;

                if (salePrice > 0 || wholesalePrice > 0) {
                    if (factor === 1) {
                        if (salePrice > 0) p.price = salePrice;
                        if (wholesalePrice > 0) p.wholesale = wholesalePrice;

                        if (p.units && p.units.length > 0) {
                            const baseU = p.units.find(u => parseFloat(u.factor) === 1) || p.units[0];
                            if (baseU) {
                                if (salePrice > 0) baseU.price = salePrice;
                                if (wholesalePrice > 0) baseU.wholesale = wholesalePrice;
                            }
                        }
                    } else {
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
            const isCash = selectedMethod.includes('نقدي') || selectedMethod.includes('نقدية');
            let purchasePaidAmount = 0;
            if (isCash) {
                purchasePaidAmount = parseFloat(finalTotalVal) || 0;
            } else {
                purchasePaidAmount = parseFloat(document.getElementById('purchasePaid')?.value) || 0;
            }

            transactions.push({
                date: dt.full,
                dateISO: dt.iso,
                timeISO: dt.time,
                type: 'شراء 📥',
                method: selectedMethod,
                invoiceId: purchaseId,
                product: p ? p.name : item.name,
                productId: p ? p.id : item.id,
                unit: item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (item.unit || 'قطعة'),
                size: item.selectedSize || item.size || '',
                color: item.selectedColor || item.color || '',
                barcode: (item.selectedVariant && item.selectedVariant.barcode) || item.barcode || '',
                unitFactor: item.unitFactor || 1,
                qty: item.qty,
                price: item.price,
                salePrice: parseFloat(item.salePrice) || 0,
                wholesalePrice: parseFloat(item.wholesalePrice) || 0,
                total: itemNetTotal,
                partner: finalPartner,
                user: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : '-',
                notes: document.getElementById('purchaseNotes') ? document.getElementById('purchaseNotes').value.trim() : '',
                paidAmount: (idx === 0) ? purchasePaidAmount : 0,
                isInvoiceHead: (idx === 0),
                invoiceDiscount: (idx === 0) ? (parseFloat(document.getElementById('purchaseDiscount')?.value) || 0) : 0,
                invoiceDiscountType: (idx === 0) ? (document.getElementById('purchaseDiscountType')?.value || 'val') : 'val',
                invoiceTax: (idx === 0) ? (parseFloat(document.getElementById('purchaseTax')?.value) || 0) : 0,
                invoiceTaxType: (idx === 0) ? (document.getElementById('purchaseTaxType')?.value || 'val') : 'val',
                warehouse: activeWH,
                editDate: (typeof isEditMode !== 'undefined' && isEditMode) ? `${new Date().toLocaleString('ar-EG')} (تعديل بواسطة: ${(typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : 'مجهول'})` : '-'
            });
        });

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

        const pDiscReason = document.getElementById('purchaseDiscountReason')?.value?.trim();
        const pTaxReason = document.getElementById('purchaseTaxReason')?.value?.trim();
        if (pDiscReason && typeof addNewReason === 'function') addNewReason(pDiscReason, purchaseDiscountReasons, 'purchaseDiscountReasonsList');
        if (pTaxReason && typeof addNewReason === 'function') addNewReason(pTaxReason, purchaseTaxReasons, 'purchaseTaxReasonsList');

        if (document.getElementById('purchaseDiscount')) document.getElementById('purchaseDiscount').value = 0;
        if (document.getElementById('purchaseTax')) document.getElementById('purchaseTax').value = 0;

        if (typeof saveData === 'function') await saveData();

        if (typeof logAuditAction === 'function') {
            const auditAction = (typeof isEditMode !== 'undefined' && isEditMode) ? 'تحديث فاتورة شراء' : 'حفظ فاتورة شراء جديدة';
            logAuditAction(auditAction, `فاتورة شراء رقم #${purchaseId}, الإجمالي: ${finalTotalVal} ج.م, المورد: ${finalPartner}, طريقة الدفع: ${selectedMethod}`);
        }

        if (typeof showCustomAlert === 'function') {
            showCustomAlert({
                type: 'success',
                titleText: (typeof isEditMode !== 'undefined' && isEditMode) ? '✅ تم التعديل' : '✅ تم الحفظ بنجاح',
                msg: `تم ${(typeof isEditMode !== 'undefined' && isEditMode) ? 'تحديث' : 'حفظ'} فاتورة الشراء رقم #${purchaseId} ومزامنة الأسعار مع المخزن.`
            });
        }

        if (typeof _invSummaryCache !== 'undefined') _invSummaryCache = null;
        if (typeof invalidateStockCache === 'function') invalidateStockCache();
        if (typeof renderInventoryTable === 'function') renderInventoryTable();
        if (typeof renderCards === 'function') renderCards();
        if (typeof renderWarehouseReportTable === 'function') renderWarehouseReportTable();
        if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
        if (typeof renderHistoryTable === 'function') renderHistoryTable();
        if (typeof renderAccountsTable === 'function') renderAccountsTable();
        if (typeof updateProductSearchDatalist === 'function') updateProductSearchDatalist();

        resetPurchase();
        return true;
    } finally {
        window.isSavingTransaction = false;
    }
}

function resetPurchase() {
    purchaseCart = [];
    isEditMode = false;
    editingInvoiceId = null;
    editingOriginalDate = null;
    editingInvoiceType = null;

    const mainSaveBtn = document.querySelector('#purchase-section .btn-save');
    if (mainSaveBtn) {
        mainSaveBtn.style.background = '';
        mainSaveBtn.innerText = '💾 حفظ الفاتورة (F9)';
    }

    if (document.getElementById('supplierName')) document.getElementById('supplierName').value = '';
    if (document.getElementById('purchaseSearch')) document.getElementById('purchaseSearch').value = '';

    const purchaseFilterInput = document.getElementById('purchaseCartFilterInput');
    if (purchaseFilterInput) {
        purchaseFilterInput.value = '';
        if (typeof filterPurchaseCartItems === 'function') filterPurchaseCartItems('');
    }

    if (document.getElementById('purchaseDiscount')) document.getElementById('purchaseDiscount').value = 0;
    if (document.getElementById('purchaseTax')) document.getElementById('purchaseTax').value = 0;
    if (document.getElementById('purchasePaid')) document.getElementById('purchasePaid').value = 0;
    if (document.getElementById('purchaseNotes')) document.getElementById('purchaseNotes').value = '';

    const purchaseMethodSelect = document.getElementById('purchase-sectionPaymentMethodSelect');
    if (purchaseMethodSelect) {
        purchaseMethodSelect.value = 'نقدي';
        const purchasePaidBox = document.getElementById('purchasePaidBox');
        const purchaseRemainingBox = document.getElementById('purchaseRemainingBox');
        if (purchasePaidBox) purchasePaidBox.style.display = 'none';
        if (purchaseRemainingBox) purchaseRemainingBox.style.display = 'none';
    }

    const now = new Date();
    if (document.getElementById('purchaseDate')) document.getElementById('purchaseDate').value = now.toLocaleDateString('en-CA');
    if (document.getElementById('purchaseTime')) document.getElementById('purchaseTime').value = now.toTimeString().slice(0, 5);
    if (document.getElementById('purchaseBadgeID') && typeof getNextSequence === 'function') {
        document.getElementById('purchaseBadgeID').innerText = getNextSequence('شراء');
    }

    const suppResults = document.getElementById('supplierSearchResults');
    if (suppResults) {
        suppResults.innerHTML = '';
        suppResults.style.display = 'none';
    }
    const purResults = document.getElementById('purchaseSearchResults');
    if (purResults) {
        purResults.innerHTML = '';
        purResults.style.display = 'none';
    }

    renderPurchaseCart_Finalized_V3();
}

// --- 6. طباعة فاتورة الشراء ---

function printPurchaseBill() {
    if (purchaseCart.length === 0) return alert("⚠️ الفاتورة فارغة!");

    const supplier = document.getElementById('supplierName')?.value || 'مورد عام';
    const dt = (typeof getTransactionDateTime === 'function') 
        ? getTransactionDateTime('purchaseDate', 'purchaseTime')
        : { full: new Date().toLocaleString(), iso: new Date().toISOString(), time: '' };

    const shopName = document.getElementById('shopName')?.value || 'متجر بيان';
    const purchaseId = document.getElementById('purchaseBadgeID') ? document.getElementById('purchaseBadgeID').innerText : '---';

    let subTotal = purchaseCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let discountVal = parseFloat(document.getElementById('purchaseDiscount')?.value) || 0;
    const discountType = document.getElementById('purchaseDiscountType')?.value || 'val';
    let discountAmount = (discountType === 'perc') ? (subTotal * discountVal / 100) : discountVal;

    let taxVal = parseFloat(document.getElementById('purchaseTax')?.value) || 0;
    const taxType = document.getElementById('purchaseTaxType')?.value || 'val';
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
        date: dt.iso || (dt.full ? dt.full.split(' ')[0] : ''),
        time: dt.time || '',
        cashier: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : 'كاشير',
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

    const printFn = (typeof printInvoice === 'function') ? printInvoice : (typeof window.printInvoice === 'function' ? window.printInvoice : null);
    if (printFn) {
        printFn(invoiceData);
    } else {
        alert('خطأ: محرك الطباعة غير متوفر!');
    }
}

// --- Window Exports ---
window.selectProductToPurchaseHeader = selectProductToPurchaseHeader;
window.fillPurchaseHeaderWithUnit = fillPurchaseHeaderWithUnit;
window.fillPurchaseHeaderWithVariant = fillPurchaseHeaderWithVariant;
window.handlePurchaseSearch = handlePurchaseSearch;
window.handlePurchaseSearchEnter = handlePurchaseSearchEnter;
window.handlePurchaseSearchKeydown = handlePurchaseSearchKeydown;
window.updatePurchaseSearchSelection = updatePurchaseSearchSelection;
window.handleSupplierSearch = handleSupplierSearch;
window.selectSupplierSearchResult = selectSupplierSearchResult;
window.handleSupplierSearchKeydown = handleSupplierSearchKeydown;
window.updateSupplierSearchHighlight = updateSupplierSearchHighlight;
window.addToPurchaseCart = addToPurchaseCart;
window.completeAddToPurchaseCart = completeAddToPurchaseCart;
window.renderPurchaseCart_Finalized_V3 = renderPurchaseCart_Finalized_V3;
window.updatePurchaseItemUnit = updatePurchaseItemUnit;
window.removePurchaseItem = removePurchaseItem;
window.updatePurchaseItem = updatePurchaseItem;
window.updateProductPricesInDB = updateProductPricesInDB;
window.calculatePurchaseTotals = calculatePurchaseTotals;
window.calculatePurchaseChange = calculatePurchaseChange;
window.savePurchase = savePurchase;
window.resetPurchase = resetPurchase;
window.printPurchaseBill = printPurchaseBill;

// --- تحسين سرعة بحث المشتريات والموردين (Debounce) ---
if (typeof debounce === 'function') {
    if (typeof handlePurchaseSearch === 'function') {
        const origHandlePurchaseSearch = handlePurchaseSearch;
        window.handlePurchaseSearch = handlePurchaseSearch = debounce(function (query) {
            origHandlePurchaseSearch(query);
        }, 300);
    }

    if (typeof handleSupplierSearch === 'function') {
        const origHandleSupplierSearch = handleSupplierSearch;
        window.handleSupplierSearch = handleSupplierSearch = debounce(function (query) {
            origHandleSupplierSearch(query);
        }, 300);
    }
}
