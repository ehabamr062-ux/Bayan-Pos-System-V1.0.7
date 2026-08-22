// تهيئة قائمة المعرفات المختارة لتظل محفوظة عند التنقل بين الأقسام
window.selectedInventoryIds = window.selectedInventoryIds || new Set();

// دالة مساعدة لحساب متوسط التكلفة لصنف واحد بناءً على الحركات
window.getProductAverageCost = function(productName, fallbackCost = 0) {
    if (!productName) return parseFloat(fallbackCost) || 0;

    const cleanName = String(productName).trim().toLowerCase();
    let totalCost = 0;
    let totalQty = 0;

    const pRef = productsDB.find(x => x && x.name && x.name.trim().toLowerCase() === cleanName);
    if (!pRef) return parseFloat(fallbackCost) || 0;

    transactions.forEach(t => {
        if (!t || !t.product || t.product.trim().toLowerCase() !== cleanName) return;

        // حساب المتوسط بناءً على فواتير الشراء فقط (توريد شراء)
        if (t.type && t.type.includes('شراء') && !t.type.includes('مرتجع')) {
            let factor = 1;
            if (pRef.units && Array.isArray(pRef.units) && t.unit) {
                const cleanTUnit = String(t.unit).trim().toLowerCase();
                const u = pRef.units.find(un => un && un.unitName && un.unitName.trim().toLowerCase() === cleanTUnit);
                if (u) factor = parseFloat(u.factor) || 1;
            }
            const qty = (parseFloat(t.qty) || 0) * factor;
            const price = (parseFloat(t.price) || 0) / factor;

            if (qty > 0) {
                totalCost += qty * price;
                totalQty += qty;
            }
        }
    });

    // إذا كانت هناك مشتريات نحسب المتوسط. إذا لم يوجد، نأخذ التكلفة المسجلة في كارت الصنف
    if (totalQty > 0) {
        const avg = totalCost / totalQty;
        return isNaN(avg) ? (parseFloat(pRef.cost) || parseFloat(fallbackCost) || 0) : avg;
    } else {
        return parseFloat(pRef.cost) || parseFloat(fallbackCost) || 0;
    }
};

// دالة مساعدة لحساب آخر سعر شراء لصنف واحد بناءً على الحركات
window.getProductLastPurchasePrice = function(productName, fallbackCost = 0) {
    if (!productName) return parseFloat(fallbackCost) || 0;

    const cleanName = String(productName).trim().toLowerCase();

    const pRef = productsDB.find(x => x && x.name && x.name.trim().toLowerCase() === cleanName);
    if (!pRef) return parseFloat(fallbackCost) || 0;

    // البحث في الحركات من الأحدث إلى الأقدم عن آخر سعر شراء
    for (let i = transactions.length - 1; i >= 0; i--) {
        const t = transactions[i];
        if (!t || !t.product || t.product.trim().toLowerCase() !== cleanName) continue;

        // فواتير الشراء فقط (توريد شراء)
        if (t.type && t.type.includes('شراء') && !t.type.includes('مرتجع')) {
            let factor = 1;
            if (pRef.units && Array.isArray(pRef.units) && t.unit) {
                const cleanTUnit = String(t.unit).trim().toLowerCase();
                const u = pRef.units.find(un => un && un.unitName && un.unitName.trim().toLowerCase() === cleanTUnit);
                if (u) factor = parseFloat(u.factor) || 1;
            }
            // حساب السعر المحسوب للوحدة الأساسية
            const basePrice = (parseFloat(t.price) || 0) / factor;
            if (basePrice > 0 && !isNaN(basePrice)) {
                return basePrice;
            }
        }
    }

    return parseFloat(pRef.cost) || parseFloat(fallbackCost) || 0;
};

let _invSummaryCache = null;
let _invSummaryKey = null;

function invalidateInvSummaryCache() {
    _invSummaryCache = null;
    _invSummaryKey = null;
}
window.invalidateInvSummaryCache = invalidateInvSummaryCache;

function getInvSummaryMap(currentWH) {
    const key = `${transactions.length}_${productsDB.length}_${currentWH}`;
    if (_invSummaryCache && _invSummaryKey === key) return _invSummaryCache;

    const productMapByName = {};
    productsDB.forEach(p => { if (p.name) productMapByName[p.name] = p; });

    const summary = {};
    for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];
        const pName = t.product;
        if (!pName) continue;

        const pRef = productMapByName[pName];
        let factor = 1;
        if (pRef && t.unit && pRef.units) {
            const u = pRef.units.find(un => un.unitName === t.unit);
            if (u) factor = parseFloat(u.factor) || 1;
        }

        if (!summary[pName]) summary[pName] = { in: 0, out: 0, lastPur: 0, totalCost: 0, totalQty: 0, wStock: 0, globalChange: 0 };
        const s = summary[pName];

        const qty = (parseFloat(t.qty || 0)) * factor; 
        const price = (parseFloat(t.price || 0)) / factor;
        const type = t.type || '';
        const tWH = (t.warehouse || 'المخزن الرئيسي').trim();

        let change = 0;
        if (type.includes('شراء') && !type.includes('مرتجع')) {
            change = qty; s.in += qty; s.lastPur = price; s.totalCost += qty * price; s.totalQty += qty;
        } else if (type.includes('مرتجع بيع')) {
            change = qty; s.in += qty;
        } else if (type.includes('بيع') && !type.includes('مرتجع')) {
            change = -qty; s.out += qty;
        } else if (type.includes('مرتجع شراء')) {
            change = -qty; s.out += qty;
        } else if (type.includes('تسوية')) {
            if (type.includes('+')) change = Math.abs(qty);
            else if (type.includes('-')) change = -Math.abs(qty);
            else change = qty;
        }

        if (!type.includes('تحويل')) s.globalChange += change;
        if (tWH === currentWH) s.wStock += change;

        if (type.includes('تحويل')) {
            const parts = (t.partner || '').split(' -> ');
            if (parts.length === 2) {
                if (parts[1].trim() === currentWH) s.wStock += qty;
                if (parts[0].trim() === currentWH) s.wStock -= qty;
            }
        }
    }

    _invSummaryCache = summary;
    _invSummaryKey = key;
    return summary;
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    if (typeof hasPermission === 'function' && !hasPermission('stock_view')) {
        tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center; padding:50px; color:#64748b; font-weight:bold;">ليس لديك صلاحية لعرض المخزن</td></tr>';
        return;
    }

    const searchInput = document.getElementById('invSearchInput');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const catFilter = document.getElementById('invCategoryFilter')?.value || 'all';

    if (search === '' && typeof updateCategoryFilterOptions === 'function') updateCategoryFilterOptions();

    tbody.innerHTML = '';
    let totalStockSum = 0;
    let totalItemsDisplay = 0;

    const currentWH = ((typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي').trim();

    // خريطة تلخيص الحركات المحفوظة في الذاكرة لتجنب الفرز المكرر
    const summary = getInvSummaryMap(currentWH);

    const htmlRows = [];

    productsDB.forEach((p, idx) => {
        const s = summary[p.name] || { in: 0, out: 0, lastPur: 0, totalCost: 0, totalQty: 0, wStock: 0, globalChange: 0 };

        let currentStock = (typeof getWarehouseStock === 'function')
            ? getWarehouseStock(p.name, currentWH)
            : (parseFloat(p.stock) || 0);

        const avgCost = s.totalQty > 0 ? (s.totalCost / s.totalQty) : (parseFloat(p.cost) || 0);
        const retail = parseFloat(p.price) || 0;
        const profitMargin = retail > 0 ? (((retail - avgCost) / retail) * 100).toFixed(1) : 0;
        const marginColor = profitMargin < 10 ? '#ef4444' : (profitMargin > 30 ? '#10b981' : '#f59e0b');

        if (!p.name.toLowerCase().includes(search) && !(p.barcode && String(p.barcode).includes(search)) && !(p.code && String(p.code).includes(search))) return;
        if (catFilter !== 'all' && (p.category || '').trim() !== catFilter.trim()) return;

        const targetMinStock = parseFloat(p.minStock) || 5;

        if (typeof currentInvFilter !== 'undefined') {
            if (currentInvFilter === 'active' && currentStock <= 0) return;
            if (currentInvFilter === 'low' && (currentStock > targetMinStock || currentStock <= 0)) return;
            if (currentInvFilter === 'zero' && currentStock > 0) return;
        }

        totalStockSum += currentStock;
        totalItemsDisplay++;

        let baseUnitName = (p.unit && p.unit !== 'وحدة') ? p.unit : "قطعة";
        let detailed = `${Number(currentStock.toFixed(2))} ${baseUnitName}`;

        if (p.units && p.units.length > 0) {
            const baseUnitObj = p.units[0];
            baseUnitName = baseUnitObj.unitName;

            const sub = p.units.find(u => u.factor < 1);

            if (sub) {
                const baseUnits = Math.trunc(currentStock + 0.00001);
                const subUnits = Math.round((currentStock - baseUnits) / sub.factor);

                if (baseUnits === 0 && subUnits !== 0) {
                    detailed = `<b>${subUnits}</b> ${sub.unitName}`;
                } else if (subUnits === 0) {
                    detailed = `<b>${baseUnits}</b> ${baseUnitName}`;
                } else {
                    detailed = `<b>${baseUnits}</b> ${baseUnitName} و <b>${subUnits}</b> ${sub.unitName}`;
                }
            }
        }

        const displayStock = Number(currentStock.toFixed(3));

        const isLowStock = currentStock <= (parseFloat(p.minStock) || 0) && currentStock > 0;
        const isOutOfStock = currentStock <= 0;
        let rowBg = '';
        if (isOutOfStock) rowBg = 'rgba(231, 76, 60, 0.08)';
        else if (isLowStock) rowBg = 'rgba(243, 156, 18, 0.08)';

        const isSelected = window.selectedInventoryIds.has(p.id);

        htmlRows.push(`
            <tr onclick="toggleInventoryRowSelection(${p.id}, this, event)" data-id="${p.id}" class="${isSelected ? 'selected-row-gold' : ''}" style="background:${rowBg}">
                <td onclick="handleInventoryCheckClick(event, ${p.id}, this.parentElement)" class="col-inv-0"><input type="checkbox" class="inv-row-check" ${isSelected ? 'checked' : ''}></td>
                <td class="col-inv-1">${idx + 1}</td>
                <td class="col-inv-quick" style="text-align:center;">
                    <button onclick="toggleQuickStatus(event, ${p.id})" 
                        style="background:none; border:none; cursor:pointer; font-size:1.2rem; transition:0.3s; transform: ${p.isQuick ? 'scale(1.2)' : 'scale(1)'}; opacity: ${p.isQuick ? '1' : '0.2'};"
                        title="${p.isQuick ? 'إزالة من الأصناف السريعة' : 'إضافة للأصناف السريعة'}">
                        ⚡
                    </button>
                </td>
                <td class="col-inv-3" style="font-weight:bold;">${p.name}</td>
                <td class="col-inv-13 num-cell" style="color:var(--main-orange); font-weight:900;">${(parseFloat(p.wholesale) || 0).toFixed(2)}</td>
                <td class="col-inv-10 num-cell" style="color:var(--main-blue); font-weight:900;">${retail.toFixed(2)}</td>
                <td class="col-inv-11 num-cell" style="color:#333;">${s.lastPur.toFixed(2)}</td>
                <td class="col-inv-9 num-cell" style="font-size:1.1rem; font-weight:900; color:${currentStock <= 0 ? 'red' : 'var(--main-green)'}">${displayStock}</td>
                <td class="col-inv-12 num-cell" style="color:#666;">${avgCost.toFixed(2)}</td>
                <td class="col-inv-detailed" style="font-size:0.9rem; text-align:center;">${detailed}</td>
                <td class="col-inv-6 num-cell">${(currentStock - s.in + s.out).toFixed(2)}</td>
                <td class="col-inv-7 num-cell" style="color:var(--main-green);">${s.in.toFixed(2)}</td>
                <td class="col-inv-8 num-cell" style="color:#c0392b;">${s.out.toFixed(2)}</td>
                <td class="col-inv-5">${p.shelf || '---'}</td>
                <td class="col-inv-4">${p.barcode || '-'}</td>
                <td class="col-inv-margin" style="text-align:center; font-weight:bold; color:${marginColor}">${profitMargin}%</td>
                <td class="col-inv-2" style="color:var(--main-green); font-weight:bold;">${p.sysCode || p.id}</td>
                <td class="col-inv-internal" style="color:#64748b;">${p.code || '-'}</td>
            </tr>
        `);
    });

    tbody.innerHTML = htmlRows.join('');

    if (typeof applyInventoryColumnVisibility === 'function') applyInventoryColumnVisibility();
    if (document.getElementById('totalItemsCount')) document.getElementById('totalItemsCount').innerText = totalItemsDisplay;
    if (document.getElementById('totalStockQtyDisplay')) document.getElementById('totalStockQtyDisplay').innerText = totalStockSum;
    updateInventorySelectionUI();

    // مزامنة شريط التمرير العلوي مع السفلي ديناميكياً
    setTimeout(() => {
        const topScroll = document.getElementById('invTopScrollbarContainer');
        const bottomScroll = document.querySelector('.inventory-scroll-wrapper');
        const filler = document.getElementById('invTopScrollbarFiller');
        const table = document.querySelector('.inventory-scroll-wrapper table');
        if (topScroll && bottomScroll && filler && table) {
            filler.style.width = table.offsetWidth + 'px';
            topScroll.onscroll = function() {
                if (bottomScroll.scrollLeft !== topScroll.scrollLeft) {
                    bottomScroll.scrollLeft = topScroll.scrollLeft;
                }
            };
            bottomScroll.onscroll = function() {
                if (topScroll.scrollLeft !== bottomScroll.scrollLeft) {
                    topScroll.scrollLeft = bottomScroll.scrollLeft;
                }
            };
        }
    }, 100);
}

async function updateQuickPrices() {
    let targetId = typeof selectedInventoryId !== 'undefined' ? selectedInventoryId : null;
    if (!targetId) {
        const checked = document.querySelector('.inv-row-check:checked');
        if (checked) targetId = parseInt(checked.closest('tr').getAttribute('data-id'));
    }

    if (!targetId) return showToast("⚠️ يرجى اختيار صنف أولاً", "error");

    const retail = parseFloat(document.getElementById('quickEditRetail').value) || 0;
    const wholesale = parseFloat(document.getElementById('quickEditWholesale').value) || 0;
    const cost = parseFloat(document.getElementById('quickEditCost').value) || 0;

    const pIdx = productsDB.findIndex(p => p.id === targetId);
    if (pIdx === -1) return;

    const p = productsDB[pIdx];
    p.price = retail;
    p.wholesale = wholesale;
    p.cost = cost;

    if (p.units && p.units.length > 0) {
        const base = p.units.find(u => u.unitName === p.unit) || p.units[0];
        base.price = retail;
        base.wholesale = wholesale;
        base.cost = cost;
    }

    const subSection = document.getElementById('quickEditSubUnitSection');
    if (subSection && subSection.style.display !== 'none' && p.units && p.units.length > 1) {
        const subRet = parseFloat(document.getElementById('quickEditSubRetail').value) || 0;
        const subWhol = parseFloat(document.getElementById('quickEditSubWholesale').value) || 0;
        const subUnitField = p.units.find(u => u.unitName === document.getElementById('quickEditSubUnitName').innerText);
        if (subUnitField) {
            subUnitField.price = subRet;
            subUnitField.wholesale = subWhol;
            subUnitField.cost = subUnitField.factor > 0 ? (cost / subUnitField.factor) : cost;
        }
    }

    await db.products.put(p);

    if (typeof syncProductsToSupabase === 'function' && typeof supabaseClient !== 'undefined' && supabaseClient) {
        try { await syncProductsToSupabase(); } catch(e) { console.warn("Cloud sync deferred", e); }
    }

    showToast("✅ تم تحديث الأسعار والمزامنة بنجاح", "success");
    closeQuickEditFloating();
    renderInventoryTable();
    if (typeof renderProductsGrid === 'function') renderProductsGrid();
}

async function toggleQuickStatus(event, productId) {
    if (event) event.stopPropagation(); // منع فتح تفاصيل السطر

    const pIdx = productsDB.findIndex(p => p.id === productId);
    if (pIdx === -1) return;

    const p = productsDB[pIdx];
    p.isQuick = !p.isQuick;

    await db.products.put(p);

    renderInventoryTable();
    if (typeof renderQuickItems === 'function') renderQuickItems();

    const action = p.isQuick ? "إضافته للأصناف السريعة ⚡" : "إزالته من الأصناف السريعة";
    showToast(`✅ تم ${action} بنجاح`, "success");
}
window.toggleQuickStatus = toggleQuickStatus;

function shareWarehouseReport(platform) {
    let summaryText = '';
    let grandVal = 0;
    let shopName = (typeof systemConfig !== 'undefined' && systemConfig.shopName) ? systemConfig.shopName : (document.getElementById('shopName')?.value || 'متجر بيان');

    if (typeof warehouses !== 'undefined') {
        warehouses.forEach(w => {
            let iCount = 0, qSum = 0, vSum = 0;
            productsDB.forEach(p => {
                const st = getWarehouseStock(p.name, w.name);
                if (st !== 0) {
                    iCount++; qSum += st;
                    vSum += (st * (parseFloat(p.cost) || 0));
                }
            });
            if (iCount > 0) {
                summaryText += '🏬 *' + w.name + '*: (حوالي ' + iCount + ' صنف) | كمية: ' + qSum + ' | قيمة: ' + vSum.toLocaleString() + ' ج.م\n';
                grandVal += vSum;
            }
        });
    }

    let text = '📊 *أرصدة المخازن - ' + shopName + '*\n';
    text += `📅 بتاريخ: ${new Date().toLocaleDateString('ar-EG')}\n`;
    text += `--------------------------\n`;
    text += summaryText;
    text += `--------------------------\n`;
    text += `💰 *إجمالي قيمة البضاعة*: *${grandVal.toLocaleString()} ج.م*\n`;
    text += `⚙️ *تم استخراجه من نظام بيان POS.*`;

    const encodedText = encodeURIComponent(text);
    let url = platform === 'whatsapp' ? `https://wa.me/?text=${encodedText}` : `https://t.me/share/url?url=${encodedText}`;
    window.open(url, '_blank');
}

function updateCategoryFilterOptions() {
    const filter = document.getElementById('invCategoryFilter');
    if (!filter) return;

    const currentVal = filter.value || 'all';
    const categories = [...new Set(productsDB.map(p => (p.category || '').trim()).filter(c => c))].sort();

    // التحقق مما إذا كانت الخيارات الحالية هي نفس التصنيفات لتفادي إعادة الإنشاء والتصفير
    const existingValues = [...filter.options].map(o => o.value).filter(v => v !== 'all');
    const isSame = existingValues.length === categories.length && existingValues.every((v, i) => v === categories[i]);

    if (!isSame) {
        filter.innerHTML = '<option value="all">كافة التصنيفات</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.innerText = `📁 ${cat}`;
            filter.appendChild(opt);
        });
    }

    if ([...filter.options].some(o => o.value === currentVal)) {
        filter.value = currentVal;
    } else {
        filter.value = 'all';
    }
}

window.toggleWrColMenu = function(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('wrColMenu');
    const overlay = document.getElementById('wrColOverlay');
    if (menu) menu.classList.toggle('hidden');
    if (overlay) overlay.classList.toggle('hidden');
};

window.toggleWrCol = function(colClass, isVisible) {
    const settings = JSON.parse(getStore('wrColSettings') || '{}');
    settings[colClass] = isVisible;
    setStore('wrColSettings', JSON.stringify(settings));
    applyWrColVisibility();
};

window.applyWrColVisibility = function() {
    const settings = JSON.parse(getStore('wrColSettings') || '{"col-wr-cost":true,"col-wr-total-val":true,"col-wr-profit-wh":true,"col-wr-profit-rt":true}');
    Object.keys(settings).forEach(colClass => {
        const isVisible = settings[colClass];
        document.querySelectorAll('.' + colClass).forEach(el => {
            el.style.display = isVisible ? '' : 'none';
        });

        const checkbox = document.querySelector(`input[onchange*="'${colClass}'"]`);
        if (checkbox) checkbox.checked = isVisible;
    });
};

window.wrFilterState = window.wrFilterState || { startDate: null, endDate: null };

window.applyWarehouseReportPeriodFilter = function(period) {
    const customContainer = document.getElementById('wrCustomDateContainer');
    const today = new Date();
    let start = null;
    let end = null;

    if (period === 'custom') {
        if (customContainer) customContainer.classList.remove('hidden');
        applyWarehouseReportCustomFilter();
        return;
    } else {
        if (customContainer) customContainer.classList.add('hidden');
    }

    const formatDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    if (period === 'today') {
        start = formatDate(today);
        end = start;
    } else if (period === 'yesterday') {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        start = formatDate(y);
        end = start;
    } else if (period === 'thisweek') {
        const first = new Date(today);
        const day = first.getDay();
        const diff = first.getDate() - (day === 6 ? 0 : day + 1);
        first.setDate(diff);
        start = formatDate(first);
        end = formatDate(today);
    } else if (period === 'lastweek') {
        const first = new Date(today);
        const day = first.getDay();
        const diff = first.getDate() - (day === 6 ? 0 : day + 1) - 7;
        first.setDate(diff);
        const last = new Date(first);
        last.setDate(first.getDate() + 6);
        start = formatDate(first);
        end = formatDate(last);
    } else if (period === 'thismonth') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        start = formatDate(firstDay);
        end = formatDate(today);
    } else if (period === 'thisyear') {
        start = `${today.getFullYear()}-01-01`;
        end = formatDate(today);
    } else if (period === 'lastyear') {
        start = `${today.getFullYear() - 1}-01-01`;
        end = `${today.getFullYear() - 1}-12-31`;
    } else if (period === 'total') {
        start = null;
        end = null;
    }

    window.wrFilterState = { startDate: start, endDate: end };
    if (typeof invalidateStockCache === 'function') invalidateStockCache();
    renderWarehouseReportTable();
    if (typeof saveCurrentTabState === 'function') saveCurrentTabState();
};

window.applyWarehouseReportCustomFilter = function() {
    const sInput = document.getElementById('wrStartDate');
    const eInput = document.getElementById('wrEndDate');
    const start = sInput ? sInput.value : null;
    const end = eInput ? eInput.value : null;

    window.wrFilterState = { startDate: start || null, endDate: end || null };
    if (typeof invalidateStockCache === 'function') invalidateStockCache();
    renderWarehouseReportTable();
    if (typeof saveCurrentTabState === 'function') saveCurrentTabState();
};

function renderWarehouseReportTable(isSearchTrigger = false) {
    const head = document.getElementById('wrTableHead');
    const body = document.getElementById('wrTableBody');
    const summaryContainer = document.getElementById('wrSummaryCards');
    const searchInput = document.getElementById('wrSearchInput');
    const search = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const settings = JSON.parse(getStore('wrColSettings') || '{}');

    if (!head || !body) return;

    if (!window.wrRenderState || isSearchTrigger) {
        window.wrRenderState = { limit: 100 };
    }

    const whToggles = document.getElementById('wrWarehouseToggles');
    if (whToggles && whToggles.children.length <= 1 && typeof warehouses !== 'undefined') {
        warehouses.forEach(w => {
            const colClass = `col-wh-${w.name.replace(/\s+/g, '_')}`;
            if (settings[colClass] === undefined) settings[colClass] = true;

            const label = document.createElement('label');
            label.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 8px 15px; background: #f1f5f9; border-radius: 10px; cursor: pointer; font-size: 0.85rem;";
            label.innerHTML = `
                <span style="font-weight: 700; color: #475569;">كمية ${w.name}</span>
                <input type="checkbox" ${settings[colClass] !== false ? 'checked' : ''} onchange="toggleWrCol('${colClass}', this.checked)" style="accent-color: #5e3370;">
            `;
            whToggles.appendChild(label);
        });
        setStore('wrColSettings', JSON.stringify(settings));
    }

    let headHTML = `
        <tr style="background: #f8fafc; color: #1e293b; border-bottom: 2px solid #e2e8f0;">
            <th style="width:50px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0; border-radius: 12px 0 0 0;">#</th>
            <th style="width:100px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0;">الكود</th>
            <th style="padding: 15px; text-align: right; font-weight: 800; border: 1px solid #e2e8f0; padding-right: 20px;">اسم الصنف</th>
            <th class="col-wr-cost" style="width:100px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0;">التكلفة</th>
    `;

    if (typeof warehouses !== 'undefined') {
        warehouses.forEach(w => {
            const colClass = `col-wh-${w.name.replace(/\s+/g, '_')}`;
            headHTML += `<th class="${colClass}" style="min-width:110px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0;">كمية ${w.name}</th>`;
        });
    }

    headHTML += `
            <th style="width:110px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0; background: rgba(212,175,55,0.05); color: #8c6a24;">إجمالي الكمية</th>
            <th class="col-wr-total-val" style="width:130px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0; background: rgba(33,115,70,0.05); color: #15803d;">إجمالي القيمة</th>
            <th class="col-wr-profit-wh" style="width:120px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0; background: rgba(39,174,96,0.05); color: #27ae60;">ربح الجملة</th>
            <th class="col-wr-profit-rt" style="width:120px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0; background: rgba(33,150,243,0.05); color: #2196f3; border-radius: 0 12px 0 0;">ربح التجزئة</th>
        </tr>
    `;
    head.innerHTML = headHTML;

    body.innerHTML = '';
    let totalGlobalQty = 0;
    let totalGlobalValue = 0;
    let totalGlobalProfitWH = 0;
    let totalGlobalProfitRT = 0;
    let warehouseStats = (typeof warehouses !== 'undefined') ? warehouses.map(w => ({ name: w.name, qty: 0, val: 0, items: 0 })) : [];

    const filteredProducts = productsDB.filter(p => 
        !search || 
        (p.name && p.name.toLowerCase().includes(search)) || 
        (p.barcode && String(p.barcode).toLowerCase().includes(search)) ||
        (p.code && String(p.code).toLowerCase().includes(search))
    );

    const sDate = (window.wrFilterState && window.wrFilterState.startDate) ? window.wrFilterState.startDate : null;
    const eDate = (window.wrFilterState && window.wrFilterState.endDate) ? window.wrFilterState.endDate : null;

    // حساب الإجماليات الدقيقة على جميع المنتجات المفلترة
    filteredProducts.forEach((p) => {
        const cost = parseFloat(p.cost) || 0;
        let rowQty = 0;

        if (typeof warehouses !== 'undefined') {
            warehouses.forEach((w, wIdx) => {
                const st = getWarehouseStock(p.name, w.name, sDate, eDate);
                rowQty += st;
                if (warehouseStats[wIdx]) {
                    warehouseStats[wIdx].qty += st;
                    warehouseStats[wIdx].val += (st * cost);
                    if (st !== 0) warehouseStats[wIdx].items++;
                }
            });
        }

        const rowValue = rowQty * cost;
        const retailPrice = parseFloat(p.price) || 0;
        const wholesalePrice = parseFloat(p.wholesale) || 0;

        const rowProfitWH = (wholesalePrice > 0) ? rowQty * (wholesalePrice - cost) : 0;
        const rowProfitRT = (retailPrice > 0) ? rowQty * (retailPrice - cost) : 0;

        totalGlobalQty += rowQty;
        totalGlobalValue += rowValue;
        totalGlobalProfitWH += rowProfitWH;
        totalGlobalProfitRT += rowProfitRT;
    });

    // اقتطاع العرض التجزيئي (Chunked Limit) لسرعة الـ Rendering وتجنب إرهاق الـ DOM
    const visibleProducts = filteredProducts.slice(0, window.wrRenderState.limit);
    const htmlRows = [];

    visibleProducts.forEach((p, idx) => {
        const cost = parseFloat(p.cost) || 0;
        let rowQty = 0;
        let warehouseCols = '';

        if (typeof warehouses !== 'undefined') {
            warehouses.forEach((w) => {
                const colClass = `col-wh-${w.name.replace(/\s+/g, '_')}`;
                const st = getWarehouseStock(p.name, w.name, sDate, eDate);
                rowQty += st;

                warehouseCols += `<td class="${colClass} num-cell" style="font-weight:900; color:${st < 0 ? '#ef4444' : (st > 0 ? '#10b981' : '#94a3b8')}; border-left: 1px solid #f1f5f9;">${st}</td>`;
            });
        }

        const rowValue = rowQty * cost;
        const retailPrice = parseFloat(p.price) || 0;
        const wholesalePrice = parseFloat(p.wholesale) || 0;

        const rowProfitWH = (wholesalePrice > 0) ? rowQty * (wholesalePrice - cost) : 0;
        const rowProfitRT = (retailPrice > 0) ? rowQty * (retailPrice - cost) : 0;

        htmlRows.push(`
            <tr class="wr-table-row" style="border-bottom: 1px solid #f1f5f9;">
                <td style="text-align:center; color:#94a3b8; font-size: 0.8rem;">${idx + 1}</td>
                <td style="text-align:center; font-weight:bold; color:#5e3370;">${p.code || p.id}</td>
                <td style="text-align:right; font-weight:800; color: #1e293b; padding-right: 20px;">${p.name}</td>
                <td class="col-wr-cost num-cell" style="color:#64748b; font-weight: 700;">${cost.toFixed(2)}</td>
                ${warehouseCols}
                <td class="num-cell" style="background:rgba(212,175,55,0.05); font-weight:900; color:#8c6a24; font-size: 1.1rem;">${rowQty}</td>
                <td class="col-wr-total-val num-cell" style="background:rgba(33,115,70,0.05); font-weight:900; color:#15803d;">${rowValue.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                <td class="col-wr-profit-wh num-cell" style="background:rgba(39,174,96,0.02); font-weight:900; color:#27ae60;">${rowProfitWH.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                <td class="col-wr-profit-rt num-cell" style="background:rgba(33,150,243,0.02); font-weight:900; color:#2196f3;">${rowProfitRT.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
            </tr>
        `);
    });

    if (filteredProducts.length > window.wrRenderState.limit) {
        const remaining = filteredProducts.length - window.wrRenderState.limit;
        const totalCols = 7 + (typeof warehouses !== 'undefined' ? warehouses.length : 0);
        htmlRows.push(`
            <tr id="wrLoadMoreRow" style="background: #f8fafc; text-align: center;">
                <td colspan="${totalCols}" style="padding: 15px;">
                    <button onclick="window.wrRenderState.limit += 200; renderWarehouseReportTable();" 
                        style="padding: 10px 25px; background: #5e3370; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(94,51,112,0.2);">
                        ➕ عرض المزيد من الأصناف (متبقي ${remaining.toLocaleString()} صنف)
                    </button>
                </td>
            </tr>
        `);
    }

    body.innerHTML = htmlRows.join('');
    applyWrColVisibility();

    if (summaryContainer) {
        let cardsHTML = `
            <div class="summary-card-gold" style="padding: 12px 16px; background: linear-gradient(135deg, #1e293b, #0f172a); color: white; border-radius: 14px; box-shadow: 0 4px 15px rgba(15,23,42,0.15); border: 1px solid rgba(255,255,255,0.1); border-right: 5px solid #3b82f6; display: flex; flex-direction: column; justify-content: center; transition: 0.3s;">
                <div style="font-size: 0.8rem; font-weight: 800; color: #93c5fd; margin-bottom: 4px;">📊 إجمالي المخزون (بكل الفروع)</div>
                <div style="font-size: 1.35rem; font-weight: 900; color: white;">${totalGlobalQty.toLocaleString()} <span style="font-size: 0.75rem; color: #94a3b8; font-weight: normal;">قطعة</span></div>
                <div style="font-size: 0.95rem; font-weight: 800; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 6px; padding-top: 4px; color: #60a5fa;">${totalGlobalValue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} <span style="font-size: 0.75rem;">ج.م</span></div>
            </div>

            <div class="summary-card-profit-wh" style="padding: 12px 16px; background: linear-gradient(135deg, #064e3b, #052e16); color: white; border-radius: 14px; box-shadow: 0 4px 15px rgba(6,78,59,0.15); border: 1px solid rgba(255,255,255,0.1); border-right: 5px solid #10b981; display: flex; flex-direction: column; justify-content: center; transition: 0.3s;">
                <div style="font-size: 0.8rem; font-weight: 800; color: #6ee7b7; margin-bottom: 4px;">💵 إجمالي ربح الجملة</div>
                <div style="font-size: 1.35rem; font-weight: 900; color: white;">${totalGlobalProfitWH.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} <span style="font-size: 0.75rem;">ج.م</span></div>
                <div style="font-size: 0.72rem; margin-top: 4px; color: #34d399; opacity: 0.9;">(بناءً على الأرصدة الحالية)</div>
            </div>

            <div class="summary-card-profit-rt" style="padding: 12px 16px; background: linear-gradient(135deg, #1e3a8a, #172554); color: white; border-radius: 14px; box-shadow: 0 4px 15px rgba(30,58,138,0.15); border: 1px solid rgba(255,255,255,0.1); border-right: 5px solid #60a5fa; display: flex; flex-direction: column; justify-content: center; transition: 0.3s;">
                <div style="font-size: 0.8rem; font-weight: 800; color: #93c5fd; margin-bottom: 4px;">💎 إجمالي ربح التجزئة</div>
                <div style="font-size: 1.35rem; font-weight: 900; color: white;">${totalGlobalProfitRT.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} <span style="font-size: 0.75rem;">ج.م</span></div>
                <div style="font-size: 0.72rem; margin-top: 4px; color: #93c5fd; opacity: 0.9;">(بناءً على الأرصدة الحالية)</div>
            </div>
        `;

        warehouseStats.forEach(ws => {
            cardsHTML += `
                <div class="summary-card-white" style="padding: 12px 16px; background: linear-gradient(135deg, #334155, #0f172a); color: white; border-radius: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.1); border-right: 5px solid #f59e0b; display: flex; flex-direction: column; justify-content: center; transition: 0.3s;">
                    <div style="font-size: 0.8rem; color: #fcd34d; font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">🏬 كمية ${ws.name}</div>
                    <div style="font-size: 1.25rem; font-weight: 900; color: white;">${ws.qty.toLocaleString()} <span style="font-size: 0.75rem; color: #94a3b8; font-weight: normal;">قطعة</span></div>
                    <div style="font-size: 0.95rem; color: #34d399; font-weight: 800; margin-top: 2px;">${ws.val.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} <span style="font-size: 0.65rem;">ج.م</span></div>
                    <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 3px;">(${ws.items} صنف نشط)</div>
                </div>
            `;
        });
        summaryContainer.innerHTML = cardsHTML;
    }
}

function printWarehouseReport() {
    const shopName = document.getElementById('shopName')?.value || 'متجر بيان';

    const originalHead = document.getElementById('wrTableHead');
    const originalBody = document.getElementById('wrTableBody');

    if (!originalHead || !originalBody) return alert("لا توجد بيانات للطباعة");

    const headers = Array.from(originalHead.querySelectorAll('th')).map(th => th.innerText.replace(/📊|💵|💎|🏬|⚙️/g, '').trim());
    const rows = Array.from(originalBody.querySelectorAll('tr')).filter(tr => tr.style.display !== 'none');

    const summaryCards = document.querySelectorAll('#wrSummaryCards > div');
    let summaryHtml = '<div style="margin-bottom:15px; border:1px solid #000; padding:10px;">';
    summaryCards.forEach(card => {
        const title = card.querySelector('div:first-child')?.innerText.replace(/📊|💵|💎|🏬|⚙️/g, '') || '';
        const val = card.querySelector('div:nth-child(2)')?.innerText || '0';
        summaryHtml += `<div style="display:flex; justify-content:space-between; border-bottom:1px dashed #000; padding:3px 0; font-size:13px;">
            <span>${title}:</span>
            <span style="font-weight:900;">${val}</span>
        </div>`;
    });
    summaryHtml += '</div>';

    let rowsHtml = rows.map(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    }).join('');

    const content = `
        <div style="direction:rtl; font-family:'Arial', sans-serif; padding:15px; color:#000; width:100%; box-sizing:border-box;">
            <div style="text-align:center; border-bottom:3px solid #000; padding-bottom:15px; margin-bottom:20px;">
                <h1 style="margin:0; font-size:22px; font-weight:900;">${shopName}</h1>
                <h2 style="margin:10px 0; font-size:18px; font-weight:bold; border:2px solid #000; display:inline-block; padding:5px 20px; border-radius:8px;">تقرير أرصدة المخازن التفصيلي</h2>
                <div style="font-size:12px; margin-top:5px; font-weight:bold;">بتاريخ: ${new Date().toLocaleString('ar-EG')}</div>
            </div>

            ${summaryHtml}

            <table style="width:100%; border-collapse:collapse; font-size:11px; border:2px solid #000; table-layout: auto;">
                <thead>
                    <tr style="background: #f1f5f9; -webkit-print-color-adjust: exact;">
                        ${headers.map(h => `<th style="padding:8px; border:1px solid #000; text-align:center;">${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody style="text-align:center;">${rowsHtml}</tbody>
            </table>

            <div style="margin-top:30px; text-align:center; font-size:11px; border-top:1px dashed #000; padding-top:15px;">
                <div style="font-weight:bold;">تم استخراج التقرير بواسطة نظام بيان POS</div>
            </div>
        </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>طباعة تقرير المخزون</title>
                <style>
                    @page { margin: 10mm; size: auto; }
                    body { margin: 0; padding: 0; direction: rtl; }
                    table th, table td { padding: 6px; border: 1px solid #000 !important; color: #000 !important; }
                    th { background: #eee !important; font-weight: 900; }
                    tr:nth-child(even) { background: #f9f9f9; }
                </style>
            </head>
            <body>
                ${content}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                <\/script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

function exportWarehouseReportToExcel() {
    const XLSXLib = (typeof getXLSXLibrary === 'function' ? getXLSXLibrary() : (typeof XLSX !== 'undefined' ? XLSX : null));

    const table = [];
    const headerRow = ["#", "كود الصنف", "اسم الصنف", "تكلفة الوحدة"];
    if (typeof warehouses !== 'undefined') {
        warehouses.forEach(w => headerRow.push("كمية " + w.name));
    }
    headerRow.push("إجمالي الكمية", "إجمالي القيمة التقديرية", "ربح الجملة", "ربح التجزئة");
    table.push(headerRow);

    const search = document.getElementById('wrSearchInput')?.value.toLowerCase() || '';
    const filtered = productsDB.filter(p => 
        p.name.toLowerCase().includes(search) || 
        (p.barcode && String(p.barcode).toLowerCase().includes(search)) ||
        (p.code && String(p.code).toLowerCase().includes(search))
    );

    filtered.forEach((p, idx) => {
        const cost = parseFloat(p.cost) || 0;
        const row = [idx + 1, p.code || p.id, p.name, cost];
        let rowQty = 0;
        if (typeof warehouses !== 'undefined') {
            warehouses.forEach(w => {
                const st = getWarehouseStock(p.name, w.name);
                row.push(st);
                rowQty += st;
            });
        }
        row.push(rowQty, rowQty * cost, rowQty * ((parseFloat(p.wholesale) || 0) - cost), rowQty * ((parseFloat(p.price) || 0) - cost));
        table.push(row);
    });

    if (XLSXLib && XLSXLib.utils) {
        try {
            const ws = XLSXLib.utils.aoa_to_sheet(table);
            const wb = XLSXLib.utils.book_new();
            XLSXLib.utils.book_append_sheet(wb, ws, "أرصدة المخازن");
            XLSXLib.writeFile(wb, `تقرير_أرصدة_المخازن_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
            if (typeof showToast === 'function') showToast("✅ تم تصدير التقرير بنجاح", "success");
            return;
        } catch (e) { console.warn("Excel XLSX fallback activated:", e); }
    }

    if (typeof downloadAOAAsExcelCSV === 'function') {
        downloadAOAAsExcelCSV(table, `تقرير_أرصدة_المخازن_${new Date().toLocaleDateString('ar-EG')}`);
    } else if (typeof window.downloadAOAAsExcelCSV === 'function') {
        window.downloadAOAAsExcelCSV(table, `تقرير_أرصدة_المخازن_${new Date().toLocaleDateString('ar-EG')}`);
    }
}
window.exportWarehouseReportToExcel = exportWarehouseReportToExcel;

function downloadProductTemplate() {
    const XLSXLib = (typeof getXLSXLibrary === 'function' ? getXLSXLibrary() : (typeof XLSX !== 'undefined' ? XLSX : null));

    const data = [
        ["كود الصنف", "كود داخلي", "اسم الصنف", "الباربود", "سعر البيع", "سعر الجملة", "سعر الشراء", "الكمية الحالية", "الوحدة", "المكان", "الفئة", "حد الطلب"]
    ];

    if (productsDB.length > 0) {
        productsDB.forEach(p => {
            data.push([
                p.sysCode || p.id || "",
                p.code || "",
                p.name || "",
                p.barcode || "",
                p.price || 0,
                p.wholesale || 0,
                p.cost || 0,
                p.stock || 0,
                p.unit || "قطعة",
                p.shelf || "",
                p.category || "عام",
                p.minStock || 0
            ]);
        });
    } else {
        data.push(["تلقائي", "101", "مثال: صنف جديد 1", "123456789", "100", "90", "80", "50", "قطعة", "رف أ1", "عام", "5"]);
    }

    if (XLSXLib && XLSXLib.utils) {
        const ws = XLSXLib.utils.aoa_to_sheet(data);
        const wb = XLSXLib.utils.book_new();
        XLSXLib.utils.book_append_sheet(wb, ws, "المنتجات");
        ws['!cols'] = [ {wch: 15}, {wch: 12}, {wch: 25}, {wch: 15}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 10} ];
        XLSXLib.writeFile(wb, "نموذج_مخزن_بيان_المتكامل.xlsx");
        if (typeof showToast === 'function') showToast("✅ تم استخراج النموذج بنجاح", "success");
    } else if (typeof downloadAOAAsExcelCSV === 'function') {
        downloadAOAAsExcelCSV(data, "نموذج_مخزن_بيان_المتكامل");
    }
}

async function importProductsFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof showToast === 'function') showToast("🔄 جاري تحليل ملف الإكسيل...", "info");

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const XLSXLib = (typeof getXLSXLibrary === 'function' ? getXLSXLibrary() : (typeof XLSX !== 'undefined' ? XLSX : null));
            if (!XLSXLib) throw new Error("مكتبة Excel غير محملة أو غير جاهزة حالياً!");

            const data = new Uint8Array(e.target.result);
            const workbook = XLSXLib.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSXLib.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length < 2) throw new Error("الملف المختار فارغ أو لا يحتوي على بيانات!");

            const headers = jsonData[0].map(h => String(h || "").toLowerCase().trim());
            const findCol = (keys) => {
                let idx = headers.findIndex(h => keys.some(k => h === k.toLowerCase()));
                if (idx !== -1) return idx;
                return headers.findIndex(h => keys.some(k => h.includes(k.toLowerCase())));
            };

            const sysCodeIdx = findCol(['كود الصنف', 'sys', 'system']);
            const intCodeIdx = findCol(['كود داخلي', 'داخلي', 'internal']);
            const nameIdx = (() => {
                const nameKeys = ['اسم الصنف', 'اسم', 'item name', 'name'];
                let idx = headers.findIndex(h => nameKeys.some(k => h === k.toLowerCase()));
                if (idx !== -1) return idx;
                return headers.findIndex(h => !h.includes('كود') && !h.includes('code') && ['اسم', 'item', 'name', 'صنف'].some(k => h.includes(k)));
            })();
            const barIdx = findCol(['باربود', 'barcode']);
            const priceIdx = findCol(['سعر البيع', 'بيع', 'retail', 'price']);
            const wholesaleIdx = findCol(['جملة', 'wholesale']);
            const costIdx = findCol(['تكلفة', 'شراء', 'cost']);
            const qtyIdx = findCol(['كمية', 'رصيد', 'stock', 'qty']);
            const unitIdx = findCol(['وحدة', 'unit']);
            const shelfIdx = findCol(['مكان', 'رف', 'shelf']);
            const catIdx = findCol(['فئة', 'تصنيف', 'قسم', 'category']);
            const minStockIdx = findCol(['حد الطلب', 'min']);

            if (nameIdx === -1) throw new Error("لم نتمكن من العثور على عمود 'اسم الصنف' في الملف!");

            const rows = jsonData.slice(1);
            let added = 0;
            let updated = 0;
            let skippedEmpty = 0;
            let totalScanned = rows.length;

            await new Promise(resolve => setTimeout(resolve, 100));

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    const name = row[nameIdx] ? String(row[nameIdx]).trim() : "";
                    if (!name) {
                        skippedEmpty++;
                        continue;
                    }

                    const sysCode = sysCodeIdx !== -1 ? String(row[sysCodeIdx] || "").trim() : "";
                    const intCode = intCodeIdx !== -1 ? String(row[intCodeIdx] || "").trim() : "";
                    const barcode = barIdx !== -1 ? String(row[barIdx] || "").trim() : "";
                    const price = parseFloat(row[priceIdx]) || 0;
                    const wholesale = wholesaleIdx !== -1 ? (parseFloat(row[wholesaleIdx]) || price) : price;
                    const cost = parseFloat(row[costIdx]) || 0;
                    const stock = parseFloat(row[qtyIdx]) || 0;
                    const unit = unitIdx !== -1 ? String(row[unitIdx] || "قطعة").trim() : "قطعة";
                    const shelf = shelfIdx !== -1 ? String(row[shelfIdx] || "").trim() : "";
                    const category = catIdx !== -1 ? String(row[catIdx] || "عام").trim() : "عام";
                    const minStock = minStockIdx !== -1 ? (parseFloat(row[minStockIdx]) || 0) : 0;

                    let existing = productsDB.find(p => 
                        (sysCode && sysCode !== "تلقائي" && (p.sysCode === sysCode || String(p.id) === sysCode)) ||
                        (barcode && p.barcode === barcode && barcode !== "-") ||
                        (name.toLowerCase() === p.name.toLowerCase())
                    );

                    if (existing) {
                        if (intCode) existing.code = intCode;
                        if (barcode && barcode !== "-") existing.barcode = barcode;
                        existing.price = price || existing.price;
                        existing.wholesale = wholesale || existing.wholesale;
                        existing.cost = cost || existing.cost;
                        existing.stock = stock;
                        existing.unit = unit || existing.unit;
                        existing.shelf = shelf || existing.shelf;
                        existing.category = category || existing.category;
                        existing.minStock = minStock || existing.minStock;
                        updated++;
                    } else {
                        const newId = Date.now() + i;
                        const newProduct = {
                            id: newId,
                            sysCode: (sysCode && sysCode !== "تلقائي") ? sysCode : String(newId),
                            code: intCode,
                            name, barcode, price, wholesale, cost, stock, unit, shelf, category, minStock,
                            units: [{ unitName: unit, factor: 1, cost, price, wholesale, isDefaultSale: true, isDefaultPurchase: true }]
                        };
                        productsDB.push(newProduct);
                        added++;
                    }

                    if (category && window.inventoryCategories && !window.inventoryCategories.includes(category)) {
                        window.inventoryCategories.push(category);
                        setStore('pos_inv_cats', JSON.stringify(window.inventoryCategories));
                    }
                } catch (rowErr) {
                    console.warn("خطأ في السطر " + (i + 2), rowErr);
                }
            }

            if (typeof saveData === 'function') await saveData();

            renderInventoryTable();
            if (typeof updateDatalists === 'function') updateDatalists();
            if (typeof renderProductsGrid === 'function') renderProductsGrid();

            let summaryMsg = `✅ اكتملت العملية:\n`;
            summaryMsg += `🔹 إجمالي الأسطر: ${totalScanned}\n`;
            summaryMsg += `🔹 تم التحديث: ${updated}\n`;
            summaryMsg += `🔹 تم الإضافة: ${added}\n`;
            if (skippedEmpty > 0) summaryMsg += `🔹 تم تجاهله (بدون اسم): ${skippedEmpty}`;

            alert(summaryMsg);
            event.target.value = ""; 

        } catch (err) {
            console.error('Import error:', err);
            alert("❌ حدث خطأ أثناء الاستيراد:\n" + err.message);
        }
    };
    reader.onerror = () => {
        showToast("❌ فشل قراءة الملف من الجهاز", "error");
    };
    reader.readAsArrayBuffer(file);
}

function selectAllInventory(checked) {
    document.querySelectorAll('.inv-row-check').forEach(chk => {
        chk.checked = checked;
        const tr = chk.closest('tr');
        if (tr) {
            const id = parseInt(tr.getAttribute('data-id'));
            if (checked) {
                window.selectedInventoryIds.add(id);
                tr.classList.add('selected-row-gold');
            } else {
                window.selectedInventoryIds.delete(id);
                tr.classList.remove('selected-row-gold');
            }
        }
    });
    updateInventorySelectionUI();
}

function handleInventoryCheckClick(event, id, tr) {
    event.stopPropagation();
    const chk = event.target.closest('input[type="checkbox"]');
    if (chk) {
        if (chk.checked) {
            window.selectedInventoryIds.add(id);
            window.selectedInventoryId = id;
            tr.classList.add('selected-row-gold');
        } else {
            window.selectedInventoryIds.delete(id);
            if (window.selectedInventoryId === id) window.selectedInventoryId = null;
            tr.classList.remove('selected-row-gold');
        }
    }
    updateInventorySelectionUI();
}

function updateInventorySelectionUI() {
    const checkedCount = window.selectedInventoryIds.size;

    const badge = document.getElementById('priceAdjSelectCount');
    if (badge) {
        if (checkedCount > 0) {
            badge.innerText = checkedCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    const btns = ['invEditBtn', 'invDeleteBtn', 'invPriceAdjBtn'];
    btns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.style.pointerEvents = 'auto';
            btn.style.cursor = 'pointer';
            if (checkedCount > 0) {
                btn.style.opacity = '1';
                btn.style.filter = 'none';
            } else {
                btn.style.opacity = '0.95';
                btn.style.filter = 'none';
            }
        }
    });
}

function toggleInventoryRowSelection(id, tr, event) {
    if (event && event.target.closest('.col-inv-0')) return;

    const chk = tr.querySelector('.inv-row-check');
    if (chk) {
        chk.checked = !chk.checked;
        if (chk.checked) {
            window.selectedInventoryIds.add(id);
            window.selectedInventoryId = id;
            tr.classList.add('selected-row-gold');
        } else {
            window.selectedInventoryIds.delete(id);
            if (window.selectedInventoryId === id) window.selectedInventoryId = null;
            tr.classList.remove('selected-row-gold');
        }
    }
    updateInventorySelectionUI();
}

function updateSideStockCard(productId) {
    const card = document.getElementById('sideStockCard');
    if(!card) return;

    const p = productsDB.find(x => x.id == productId);
    if(!p) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    if (document.getElementById('sideStockProductName')) document.getElementById('sideStockProductName').innerText = p.name;
    if (document.getElementById('sideStockUnit')) document.getElementById('sideStockUnit').innerText = p.unit || 'قطعة';

    const currentWh = (typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';
    if (document.getElementById('sideStockCurrentWarehouseName')) document.getElementById('sideStockCurrentWarehouseName').innerText = currentWh;

    const currentStockVal = getWarehouseStock(p.name, currentWh);
    if (document.getElementById('sideStockCurrentVal')) document.getElementById('sideStockCurrentVal').innerText = currentStockVal;

    const othersContainer = document.getElementById('sideStockOtherWarehouses');
    if(othersContainer && typeof warehouses !== 'undefined') {
        othersContainer.innerHTML = '';
        warehouses.forEach(w => {
            if(w.name === currentWh) return;
            const st = getWarehouseStock(p.name, w.name);
            const row = document.createElement('div');
            row.style.cssText = "display:flex; justify-content:space-between; font-size:0.8rem; border-bottom:1px solid rgba(255,255,255,0.05); padding:4px 0;";
            row.innerHTML = `<span style="color:#aaa;">${w.name}</span><span style="font-weight:bold; color:${st < 0 ? '#e74c3c' : (st > 0 ? '#27ae60' : '#888')};">${st}</span>`;
            othersContainer.appendChild(row);
        });
    }
}

let _stockCache = null;
let _stockCacheKey = null;

function invalidateStockCache() {
    _stockCache = null;
    _stockCacheKey = null;
}
window.invalidateStockCache = invalidateStockCache;

function getWarehouseStock(productName, warehouseName, startDate = null, endDate = null) {
    if (!productName) return 0;
    const db = window.productsDB || [];
    const p = db.find(x => (x.name && x.name.trim() === String(productName).trim()) || x.id == productName);
    if (!p) return 0;

    const targetWH = (warehouseName || 'المخزن الرئيسي').trim();

    // 1. القراءة اللحظية المباشرة من قاعدة بيانات المخزون الموثوقة (بدون فلترة تاريخية)
    if (!startDate && !endDate) {
        const isMainWH = (targetWH === 'المخزن الرئيسي' || 
            (typeof warehouses !== 'undefined' && warehouses.length <= 1) || 
            (typeof warehouses !== 'undefined' && warehouses[0] && warehouses[0].name.trim() === targetWH));

        const totalStock = parseFloat(p.stock) || 0;

        if (isMainWH) {
            if (p.warehouseStocks) {
                // حساب مجموع المخازن الفرعية الأخرى
                let otherWHStock = 0;
                Object.keys(p.warehouseStocks).forEach(wh => {
                    const isNotMain = (wh.trim() !== 'المخزن الرئيسي' && (!warehouses || !warehouses[0] || warehouses[0].name.trim() !== wh.trim()));
                    if (isNotMain) {
                        otherWHStock += (parseFloat(p.warehouseStocks[wh]) || 0);
                    }
                });

                if (p.warehouseStocks[targetWH] !== undefined && (parseFloat(p.warehouseStocks[targetWH]) || 0) > 0) {
                    return parseFloat(p.warehouseStocks[targetWH]) || 0;
                }
                return Math.max(0, totalStock - otherWHStock);
            }
            return totalStock;
        }

        if (p.warehouseStocks && p.warehouseStocks[targetWH] !== undefined) {
            return parseFloat(p.warehouseStocks[targetWH]) || 0;
        }
        return 0;
    }

    // 2. الفلترة التاريخية (تقرير المخازن لفترة محددة)
    const cacheKey = `${startDate || ''}_${endDate || ''}_${transactions.length}_${productsDB.length}`;
    if (!_stockCache || _stockCacheKey !== cacheKey) {
        _stockCache = {};
        _stockCacheKey = cacheKey;

        const prodIndex = {};
        const globalChangeMap = {};
        productsDB.forEach(prod => {
            if (prod && prod.name) {
                const n = prod.name.trim();
                prodIndex[n] = prod;
                prodIndex[n.toLowerCase()] = prod;
                _stockCache[n] = {};
                _stockCache[n.toLowerCase()] = _stockCache[n];
                globalChangeMap[n] = 0;
            }
        });

        for (let i = 0; i < transactions.length; i++) {
            const t = transactions[i];
            const rawName = (t.product || t.productName || t.name || '').trim();
            if (!rawName) continue;
            const pRef = prodIndex[rawName] || prodIndex[rawName.toLowerCase()];
            if (!pRef || !pRef.name) continue;
            const pName = pRef.name.trim();

            let tDateISO = (t.dateISO || t.date || '').trim();
            if (tDateISO.includes('T')) tDateISO = tDateISO.split('T')[0];
            else if (tDateISO.match(/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}/)) {
                const parts = tDateISO.split(/[\/\.-]/);
                tDateISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (tDateISO.length > 10) {
                tDateISO = tDateISO.slice(0, 10);
            }

            if (startDate && tDateISO < startDate) continue;
            if (endDate && tDateISO > endDate) continue;

            let factor = 1;
            if (pRef.units && t.unit) {
                const u = pRef.units.find(un => un.unitName === t.unit);
                if (u) factor = parseFloat(u.factor) || 1;
            }

            const qty = (parseFloat(t.qty || 0)) * factor;
            const type = t.type || '';
            const tWH = (t.warehouse || 'المخزن الرئيسي').trim();

            let change = 0;
            if (type.includes('شراء') && !type.includes('مرتجع')) change = qty;
            else if (type.includes('مرتجع بيع')) change = qty;
            else if (type.includes('بيع') && !type.includes('مرتجع')) change = -qty;
            else if (type.includes('مرتجع شراء')) change = -qty;
            else if (type.includes('تسوية')) {
                if (type.includes('+')) change = Math.abs(qty);
                else if (type.includes('-')) change = -Math.abs(qty);
                else change = qty;
            }

            if (!type.includes('تحويل')) {
                globalChangeMap[pName] = (globalChangeMap[pName] || 0) + change;
            }

            if (!_stockCache[pName]) _stockCache[pName] = {};
            if (!_stockCache[pName][tWH]) _stockCache[pName][tWH] = 0;
            _stockCache[pName][tWH] += change;

            if (type.includes('تحويل')) {
                const parts = (t.partner || '').split(' -> ');
                if (parts.length === 2) {
                    const wTo = parts[1].trim();
                    const wFrom = parts[0].trim();
                    if (!_stockCache[pName]) _stockCache[pName] = {};
                    if (!_stockCache[pName][wTo]) _stockCache[pName][wTo] = 0;
                    _stockCache[pName][wTo] += qty;
                    if (!_stockCache[pName][wFrom]) _stockCache[pName][wFrom] = 0;
                    _stockCache[pName][wFrom] -= qty;
                }
            }
        }
    }

    const pKey = (p.name || '').trim();
    const pStocks = _stockCache ? (_stockCache[pKey] || _stockCache[pKey.toLowerCase()] || {}) : {};
    return pStocks[targetWH] || 0;
}

function showInvDetails(id) {
    const p = productsDB.find(x => x.id === id);
    if (!p) return;

    const idEl = document.getElementById('invSelectedId');
    if (idEl) idEl.value = id;

    const stockEl = document.getElementById('invDisplayStock');
    if (stockEl) stockEl.innerText = p.stock || 0;

    const costEl = document.getElementById('invDisplayCost');
    if (costEl) costEl.value = p.cost || 0;

    const priceEl = document.getElementById('invDisplayPrice');
    if (priceEl) priceEl.value = p.price || 0;

    const unitSel = document.getElementById('invDisplayUnit');
    if (unitSel && p.unit) {
        for (let opt of unitSel.options) {
            if (opt.value === p.unit) { opt.selected = true; break; }
        }
    }

    updateSideStockCard(id);
}

function openQuickEditFloating(id) {
    const p = productsDB.find(x => x.id === id);
    if (!p) return;

    const floatingWin = document.getElementById('quickEditFloatingWindow');
    const floatingTitle = document.getElementById('floatingEditTitle');

    if (floatingWin) {
        floatingWin.classList.remove('hidden');
        if (floatingTitle) floatingTitle.innerText = `✏️ تعديل: ${p.name}`;

        document.getElementById('quickEditBaseUnitName').innerText = p.unit || 'قطعة';
        document.getElementById('quickEditRetail').value = p.price || 0;
        document.getElementById('quickEditWholesale').value = p.wholesale || 0;
        document.getElementById('quickEditCost').value = p.cost || 0;

        const subUnit = (p.units && p.units.length > 1) ? p.units.find(u => u.factor > 1 || u.unitName !== p.unit) : null;
        const subSection = document.getElementById('quickEditSubUnitSection');

        if (subUnit) {
            subSection.style.display = 'block';
            document.getElementById('quickEditSubUnitName').innerText = subUnit.unitName;
            document.getElementById('quickEditSubRetail').value = subUnit.price || 0;
            document.getElementById('quickEditSubWholesale').value = subUnit.wholesale || 0;
        } else if (subSection) {
            subSection.style.display = 'none';
        }

        setTimeout(() => document.getElementById('quickEditRetail')?.focus(), 100);
    }
}

function closeQuickEditFloating() {
    const floatingWin = document.getElementById('quickEditFloatingWindow');
    if (floatingWin) floatingWin.classList.add('hidden');
}

function showQuickEditManual() {
    let targetId = typeof selectedInventoryId !== 'undefined' ? selectedInventoryId : null;
    if (!targetId) {
        const checked = document.querySelector('.inv-row-check:checked');
        if (checked) targetId = parseInt(checked.closest('tr').getAttribute('data-id'));
    }

    if (!targetId) {
        return showToast("⚠️ يرجى تحديد صنف من الجدول أولاً", "error");
    }

    openQuickEditFloating(targetId);
}

function quickAddProduct(name, context) {
    if (typeof currentQuickAddContext !== 'undefined') window.currentQuickAddContext = context;
    if (typeof openNewItemModal === 'function') openNewItemModal(name);
}

async function saveNewItem(mode = 'save') {
    const isEdit = typeof currentEditingProductId !== 'undefined' && !!currentEditingProductId;
    if (isEdit && typeof checkPermission === 'function' && !checkPermission('stock_edit')) return false;
    if (!isEdit && typeof checkPermission === 'function' && !checkPermission('stock_add')) return false;

    const name = document.getElementById('newItemName').value;
    const price = parseFloat(document.getElementById('newItemPrice').value) || 0;
    const cost = parseFloat(document.getElementById('newItemCost').value) || 0;
    const wholesale = parseFloat(document.getElementById('newItemWholesale').value) || 0;
    const minPrice = parseFloat(document.getElementById('newItemMinPrice').value) || 0;
    const discount = parseFloat(document.getElementById('newItemDiscount').value) || 0;

    const sysCode = document.getElementById('newItemSysCode').value;
    const barcode = document.getElementById('newItemBarcode').value;
    const code = document.getElementById('newItemCode').value;
    const category = document.getElementById('newItemCategory').value;
    const shelf = document.getElementById('newItemShelf').value;

    let stock = parseFloat(document.getElementById('newItemStock').value) || 0;
    const minStock = parseFloat(document.getElementById('newItemMinStock').value) || 0;
    const expiry = document.getElementById('newItemExpiry').value;
    const notes = document.getElementById('newItemNotes').value;

    if (!name || price === 0) {
        if (mode === 'silent') {
            if (!name && !currentEditingProductId) return true;
            showToast("⚠️ يرجى إدخال اسم الصنف وسعر البيع للحفظ التلقائي", "warning");
            return false;
        }
        return alert("⚠️ يرجى إدخال اسم الصنف وسعر البيع على الأقل.");
    }

    if (price < cost || wholesale < cost) {
        if (mode === 'silent') {
            showToast("❌ تعذر الحفظ التلقائي: سعر البيع أقل من التكلفة!", "error");
            return false;
        }
        if (price < cost) return alert("❌ خطأ: سعر البيع القطاعي أقل من سعر التكلفة!");
        if (wholesale < cost) return alert("❌ خطأ: سعر بيع الجملة أقل من سعر التكلفة!");
    }

    const units = [];
    const rows = document.getElementById('productUnitsTableBody')?.rows || [];
    for (let i = 0; i < rows.length; i++) {
        const unitSelect = rows[i].cells[0].querySelector('select');
        if (!unitSelect) continue;

        const bQty = parseFloat(rows[i].cells[1].querySelector('input').value) || 1;
        const sQty = parseFloat(rows[i].cells[2].querySelector('input').value) || 1;
        const cLabel = rows[i].querySelector('.u-cost-label');

        units.push({
            unitName: unitSelect.value,
            base_qty: bQty,
            sub_unit_quantity: sQty,
            factor: bQty / sQty,
            wholesale: parseFloat(rows[i].cells[3].querySelector('input').value) || 0,
            price: parseFloat(rows[i].cells[4].querySelector('input').value) || 0,
            cost: cLabel ? parseFloat(cLabel.innerText) : 0,
            isDefaultSale: rows[i].cells[6].querySelector('input').checked,
            isDefaultPurchase: rows[i].cells[7].querySelector('input').checked,
            unitBarcode: rows[i].cells[8].querySelector('input').value
        });
    }

    // تجميع مصفوفة المقاسات والألوان إن وجدت
    const variants = [];
    const vRows = document.getElementById('productVariantsTableBody')?.rows || [];
    for (let i = 0; i < vRows.length; i++) {
        const sizeInp = vRows[i].querySelector('.var-size-input');
        const colorInp = vRows[i].querySelector('.var-color-input');
        const barcodeInp = vRows[i].querySelector('.var-barcode-input');
        const stockInp = vRows[i].querySelector('.var-stock-input');
        const priceInp = vRows[i].querySelector('.var-price-input');
        const wsInp = vRows[i].querySelector('.var-ws-input');
        const costInp = vRows[i].querySelector('.var-cost-input');

        const vSize = sizeInp ? sizeInp.value.trim() : '';
        const vColor = colorInp ? colorInp.value.trim() : '';
        const vBarcode = barcodeInp ? barcodeInp.value.trim() : '';

        if (vSize || vColor || vBarcode) {
            variants.push({
                size: vSize,
                color: vColor,
                barcode: vBarcode,
                stock: stockInp ? parseFloat(stockInp.value) || 0 : 0,
                price: priceInp ? parseFloat(priceInp.value) || price : price,
                wholesale: wsInp ? parseFloat(wsInp.value) || wholesale : wholesale,
                cost: costInp ? parseFloat(costInp.value) || cost : cost
            });
        }
    }

    // جمع رصيد كافة المقاسات والألوان تلقائياً ليكون هو الرصيد الإجمالي للصنف
    if (variants.length > 0) {
        const totalVariantsStock = variants.reduce((sum, v) => sum + (parseFloat(v.stock) || 0), 0);
        if (totalVariantsStock > 0 || stock === 0) {
            stock = totalVariantsStock;
            if (document.getElementById('newItemStock')) {
                document.getElementById('newItemStock').value = stock;
            }
        }
    }

    if (category && window.inventoryCategories && !window.inventoryCategories.includes(category)) {
        window.inventoryCategories.push(category);
        if (typeof updateDatalists === 'function') updateDatalists();
        if (typeof saveData === 'function') saveData();
    }

    const finalId = (typeof currentEditingProductId !== 'undefined' && currentEditingProductId) ? currentEditingProductId : Date.now();
    const existingProduct = (typeof currentEditingProductId !== 'undefined' && currentEditingProductId)
        ? productsDB.find(p => p.id === currentEditingProductId)
        : null;

    // الحفاظ على توزيع الأرصدة بالمخازن وتحديث المخزن النشط في حال تغيير الرصيد يدوياً
    let finalWarehouseStocks = existingProduct && existingProduct.warehouseStocks ? { ...existingProduct.warehouseStocks } : {};
    const activeWH = (typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';
    if (Object.keys(finalWarehouseStocks).length === 0) {
        finalWarehouseStocks[activeWH] = stock;
    }

    const newItem = {
        ...(existingProduct || {}),
        id: finalId,
        sysCode: sysCode || String(finalId),
        name, price, cost, wholesale, minPrice, discount,
        barcode, code, category, shelf,
        stock, minStock, expiry, notes,
        units,
        variants,
        unit: units.length > 0 ? units[0].unitName : "قطعة",
        image: typeof currentProductImageData !== 'undefined' ? currentProductImageData : (existingProduct ? existingProduct.image : null),
        isQuick: document.getElementById('isQuickItem') ? document.getElementById('isQuickItem').checked : false,
        warehouseStocks: finalWarehouseStocks
    };

    if (typeof currentEditingProductId !== 'undefined' && currentEditingProductId) {
        const idx = productsDB.findIndex(p => p.id === currentEditingProductId);
        if (idx !== -1) productsDB[idx] = newItem;
        await db.products.put(newItem);
    } else {
        window.currentEditingProductId = newItem.id;
        productsDB.push(newItem);
        await db.products.add(newItem);
    }

    const qAddCtx = typeof currentQuickAddContext !== 'undefined' ? currentQuickAddContext : null;
    if (qAddCtx === 'sales' && typeof addToCart === 'function') addToCart(newItem.id);
    else if (qAddCtx === 'purchase' && typeof addToPurchaseCart === 'function') addToPurchaseCart(newItem.id);

    window.currentQuickAddContext = null;
    if (mode !== 'silent') {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert({
                type: 'success',
                titleText: 'عملية ناجحة',
                msg: 'تم حفظ الصنف بنجاح بنظام بيان ',
                confirmText: 'حسناً'
            });
        } else {
            alert("تم حفظ الصنف بنجاح!");
        }
    } else {
        showToast("✅ تم الحفظ التلقائي للصنف بنجاح", "success");
    }

    if (typeof _invSummaryCache !== 'undefined') _invSummaryCache = null;
    if (typeof invalidateStockCache === 'function') invalidateStockCache();
    renderInventoryTable();
    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    if (typeof updateProductSearchDatalist === 'function') updateProductSearchDatalist();
    if (typeof updateWarehousesSummaryBoard === 'function') updateWarehousesSummaryBoard();

    if (mode === 'save') {
        document.getElementById('newItemModal')?.classList.add('hidden');
    } else if (mode === 'new') {
        window.currentEditingProductId = null;
        if (document.getElementById('newItemName')) document.getElementById('newItemName').value = "";
        if (document.getElementById('newItemPrice')) document.getElementById('newItemPrice').value = "0";
        document.getElementById('newItemName')?.focus();
        if (typeof updateProductNavCounter === 'function') updateProductNavCounter();
    } else if (mode === 'duplicate') {
        window.currentEditingProductId = null;
        document.getElementById('newItemName')?.focus();
        alert("تم الحفظ، يمكنك تعديل الاسم الآن للتكرار.");
        if (typeof updateProductNavCounter === 'function') updateProductNavCounter();
    }

    try {
        if (typeof _quickAddTargetSection !== 'undefined' && _quickAddTargetSection && newItem) {
            if (_quickAddTargetSection === 'sales' && typeof addToCart === 'function') {
                addToCart(newItem.id);
            } else if (_quickAddTargetSection === 'purchase' && typeof addToPurchaseCart === 'function') {
                addToPurchaseCart(newItem.id);
            } else if (_quickAddTargetSection === 'salesReturn' && typeof addToReturnCart === 'function') {
                addToReturnCart({ name: newItem.name, price: newItem.price, qty: 1, maxQty: 9999 });
            } else if (_quickAddTargetSection === 'purchaseReturn' && typeof addPurToReturnCart === 'function') {
                addPurToReturnCart({ name: newItem.name, price: newItem.cost || newItem.price, qty: 1, maxQty: 9999 });
            } else if (_quickAddTargetSection === 'adj') {
                window.selectedAdjItem = newItem;
                const sEl = document.getElementById('adjSearch');
                const pEl = document.getElementById('adjPrice');
                const qEl = document.getElementById('adjQty');
                if (sEl) sEl.value = newItem.name;
                if (pEl) pEl.value = newItem.cost || 0;
                document.querySelectorAll('.adj-current-stock-val').forEach(el => el.innerText = newItem.stock || 0);
                if (qEl) qEl.focus();
            }
        }
    } catch(e) {
        console.warn("Auto add target section warning:", e);
    } finally {
        window._quickAddTargetSection = null;
    }
}

async function printInventoryBarcode() {
    if (typeof showCustomAlert !== 'function') {
        const choice = await showCustomPrompt("1- المختارة | 2- الكل", "1");
        if (choice) executePrinting(choice === "1" ? "selected" : "all");
        return;
    }

    showCustomAlert({
        type: 'question',
        titleText: '🏷️ خيارات طباعة الباربود',
        msg: 'يرجى اختيار نطاق الطباعة المطلوب:',
        confirmText: 'طباعة كافة الأصناف كلياً',
        cancelText: 'طباعة الأصناف المختارة (✔️) فقط',
        showCancel: true,
        onConfirm: () => requestCopiesAndPrint('all'),
        onCancel: () => requestCopiesAndPrint('selected')
    });
}

async function requestCopiesAndPrint(mode) {
    const copies = await showCustomPrompt("🏷️ كم عدد الملصقات لكل صنف؟", "1") || "1";
    executePrinting(mode, parseInt(copies));
}

function getBarcodeLabelSettings() {
    try {
        const stored = typeof getStore === 'function' ? getStore('bayan_barcode_label_settings') : null;
        if (stored) {
            return JSON.parse(stored);
        }
    } catch(e) {}
    return {
        width: 50,
        height: 25,
        offsetX: 0,
        barcodeHeight: 24,
        showShopName: true,
        showItemName: true,
        showPrice: true,
        showCode: true
    };
}

function saveBarcodeLabelSettings() {
    const s = {
        width: parseFloat(document.getElementById('bcLabelWidth')?.value) || 50,
        height: parseFloat(document.getElementById('bcLabelHeight')?.value) || 25,
        offsetX: parseFloat(document.getElementById('bcLabelOffsetX')?.value) || 0,
        barcodeHeight: parseFloat(document.getElementById('bcBarcodeHeight')?.value) || 24,
        showShopName: document.getElementById('bcShowShopName')?.checked ?? true,
        showItemName: document.getElementById('bcShowItemName')?.checked ?? true,
        showPrice: document.getElementById('bcShowPrice')?.checked ?? true,
        showCode: document.getElementById('bcShowCode')?.checked ?? true
    };
    if (typeof setStore === 'function') {
        setStore('bayan_barcode_label_settings', JSON.stringify(s));
    }
    if (typeof showToast === 'function') showToast("✅ تم حفظ إعدادات ومقاسات طابعة الباركود بنجاح!", "success");
}

function loadBarcodeLabelSettings() {
    const s = getBarcodeLabelSettings();
    if (document.getElementById('bcLabelWidth')) document.getElementById('bcLabelWidth').value = s.width;
    if (document.getElementById('bcLabelHeight')) document.getElementById('bcLabelHeight').value = s.height;
    if (document.getElementById('bcLabelOffsetX')) document.getElementById('bcLabelOffsetX').value = s.offsetX;
    if (document.getElementById('bcBarcodeHeight')) document.getElementById('bcBarcodeHeight').value = s.barcodeHeight;
    if (document.getElementById('bcShowShopName')) document.getElementById('bcShowShopName').checked = s.showShopName;
    if (document.getElementById('bcShowItemName')) document.getElementById('bcShowItemName').checked = s.showItemName;
    if (document.getElementById('bcShowPrice')) document.getElementById('bcShowPrice').checked = s.showPrice;
    if (document.getElementById('bcShowCode')) document.getElementById('bcShowCode').checked = s.showCode;
}

function testPrintBarcodeLabel() {
    const testItem = {
        id: 999,
        name: 'منتج تجريبي للتجربة',
        code: 'TEST-101',
        barcode: '123456789012',
        price: 99.00
    };
    executePrinting([testItem], 1);
}

window.getBarcodeLabelSettings = getBarcodeLabelSettings;
window.saveBarcodeLabelSettings = saveBarcodeLabelSettings;
window.loadBarcodeLabelSettings = loadBarcodeLabelSettings;
window.testPrintBarcodeLabel = testPrintBarcodeLabel;

async function executePrinting(modeOrTargets, copies = 1) {
    let targets = [];
    if (Array.isArray(modeOrTargets)) {
        targets = modeOrTargets;
    } else if (modeOrTargets === "selected") {
        const selectedIds = Array.from(window.selectedInventoryIds || []);
        if (selectedIds.length === 0) return showToast("⚠️ عفواً، يجب عليك اختيار صنف واحد على الأقل من الجدول أولاً!", "error");

        selectedIds.forEach(id => {
            const p = productsDB.find(x => x.id === id);
            if (p) targets.push(p);
        });
    } else {
        if (productsDB.length === 0) return showToast("⚠️ المخزن فارغ!", "error");
        targets = [...productsDB];
    }

    const bSettings = getBarcodeLabelSettings();
    const shopName = (document.getElementById('shopName') ? document.getElementById('shopName').value : '') || 'المتجر الذكي';
    const currency = typeof getCurrencySymbol === 'function' ? getCurrencySymbol() : 'ج.م';

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>طباعة ملصقات الباركود</title>
            <style>
                @page {
                    size: ${bSettings.width}mm ${bSettings.height}mm;
                    margin: 0mm;
                }
                * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                html, body {
                    width: ${bSettings.width}mm;
                    margin: 0 !important;
                    padding: 0 !important;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    direction: rtl;
                    text-align: center;
                    background: #fff;
                    color: #000;
                }
                .label-container {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                    padding: 0;
                }
                .barcode-label { 
                    width: ${bSettings.width}mm;
                    height: ${bSettings.height}mm;
                    max-height: ${bSettings.height}mm;
                    padding: 0.8mm 1.5mm;
                    margin-left: ${bSettings.offsetX}mm;
                    margin-right: auto;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-around;
                    page-break-after: always;
                    page-break-inside: avoid;
                    overflow: hidden;
                    border: 1px dashed #ccc;
                    box-sizing: border-box;
                }
                .shop-title { font-size: 7.5pt; font-weight: 800; color: #000; line-height: 1; margin: 0; }
                .item-name { font-size: 8.5pt; font-weight: 900; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; color: #000; line-height: 1.1; }
                .item-code-line { font-size: 7pt; font-weight: 900; color: #000; margin: 0; line-height: 1; }
                .price-tag { font-size: 9.5pt; font-weight: 900; color: #000; border: 1.2px solid #000; padding: 0.5mm 5mm; border-radius: 3px; background: #fff; line-height: 1.1; margin: 0; }
                svg { max-width: 96%; height: ${bSettings.barcodeHeight}px; margin: 0 auto; display: block; }
                @media print {
                    html, body { width: ${bSettings.width}mm; margin: 0 !important; padding: 0 !important; }
                    .barcode-label { border: none !important; box-shadow: none !important; }
                }
            </style>
        </head>
        <body>
            <div class="label-container" id="printableLabels"></div>
        </body>
        </html>
    `);

    const labelsDiv = printWindow.document.getElementById('printableLabels');

    targets.forEach(p => {
        const codeVal = p.code || p.barcode || p.id;
        const barcodeVal = p.barcode || p.code || p.id;
        const priceFormatted = (p.price || 0).toFixed(2) + ' ' + currency;

        for (let i = 0; i < copies; i++) {
            const label = printWindow.document.createElement('div');
            label.className = 'barcode-label';
            label.innerHTML = `
                ${bSettings.showShopName ? `<div class="shop-title">${shopName}</div>` : ''}
                ${bSettings.showItemName ? `<div class="item-name" title="${p.name}">${p.name}</div>` : ''}
                ${bSettings.showCode ? `<div class="item-code-line">كود: ${codeVal}</div>` : ''}
                <svg id="barcode-${p.id}-${i}"></svg>
                ${bSettings.showPrice ? `<div class="price-tag">${priceFormatted}</div>` : ''}
            `;
            labelsDiv.appendChild(label);

            if (window.JsBarcode) {
                try {
                    window.JsBarcode(label.querySelector('svg'), String(barcodeVal), {
                        format: "CODE128",
                        width: 1.3,
                        height: bSettings.barcodeHeight || 24,
                        displayValue: false,
                        margin: 0
                    });
                } catch(err) {
                    console.warn("Barcode rendering error:", err);
                }
            }
        }
    });

    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // keep preview accessible
    }, 400);
}

function goToAdjustmentWithSelected() {
    if (window.selectedInventoryIds.size > 0) {
        const id = Array.from(window.selectedInventoryIds)[0];
        const p = productsDB.find(x => x.id === id);
        if (p) {
            if (typeof switchSection === 'function') switchSection('adjustment');
            setTimeout(() => {
                const adjSearchInput = document.getElementById('adjSearch');
                if (adjSearchInput) {
                    adjSearchInput.value = p.name;
                }
                
                if (p.units && p.units.length > 1) {
                    if (typeof showUnitSelectionModal === 'function') {
                        showUnitSelectionModal(p, 'adjustment');
                    }
                } else {
                    const defUnit = (p.units && p.units.length > 0) ? p.units[0] : null;
                    if (typeof fillAdjustmentHeaderWithUnit === 'function') {
                        fillAdjustmentHeaderWithUnit(p, defUnit || { unitName: p.unit || 'قطعة', factor: 1, cost: p.cost });
                    }
                }
            }, 150);
            return;
        }
    }
    if (typeof switchSection === 'function') switchSection('adjustment');
}

function goToHistoryWithSelected() {
    if (window.selectedInventoryIds.size > 0) {
        const id = Array.from(window.selectedInventoryIds)[0];
        const p = productsDB.find(x => x.id === id);
        if (p) {
            if (typeof switchSection === 'function') switchSection('history');
            setTimeout(() => {
                const input = document.getElementById('historySearch');
                if (input) {
                    input.value = p.name;
                    if (typeof renderHistoryTable === 'function') {
                        renderHistoryTable(p.name);
                    }
                }
            }, 150);
            return;
        }
    }
    if (typeof switchSection === 'function') switchSection('history');
}

// منطق تسوية المخزن (Adjustment Logic)
window.adjCart = window.adjCart || [];
window.selectedAdjItem = window.selectedAdjItem || null;

function resetAdjustment() {
    window.adjCart = [];
    window.selectedAdjItem = null;
    if (document.getElementById('adjSearch')) document.getElementById('adjSearch').value = '';
    if (document.getElementById('adjQty')) document.getElementById('adjQty').value = '1';
    if (document.getElementById('adjPrice')) document.getElementById('adjPrice').value = '';
    if (document.getElementById('adjNotes')) document.getElementById('adjNotes').value = '';
    if (document.getElementById('adjBadgeID') && typeof getNextSequence === 'function') document.getElementById('adjBadgeID').innerText = getNextSequence('تسوية');

    renderAdjTable();

    const now = new Date();
    if (document.getElementById('adjDate')) document.getElementById('adjDate').value = now.toLocaleDateString('en-CA');
    if (document.getElementById('adjTime')) document.getElementById('adjTime').value = now.toTimeString().slice(0, 5);

    document.getElementById('adjSearch')?.focus();
}

let currentAdjHeaderUnit = null;

function fillAdjustmentHeaderWithUnit(product, unit) {
    window.selectedAdjItem = product;
    currentAdjHeaderUnit = unit;

    if (document.getElementById('adjSearch')) document.getElementById('adjSearch').value = product.name;

    const lastPurchasePrice = typeof getProductLastPurchasePrice === 'function' ? getProductLastPurchasePrice(product.name, product.cost) : (parseFloat(product.cost) || 0);
    const factor = parseFloat(unit.factor) || 1;
    const calculatedPrice = lastPurchasePrice * factor;
    if (document.getElementById('adjPrice')) document.getElementById('adjPrice').value = calculatedPrice.toFixed(2);

    const displayStock = (parseFloat(product.stock) || 0) / factor;
    document.querySelectorAll('.adj-current-stock-val').forEach(el => {
        el.innerText = `${displayStock.toFixed(2)} ${unit.unitName}`;
    });

    document.getElementById('adjQty')?.focus();
    document.getElementById('adjQty')?.select();
}

function handleAdjSearch(query) {
    const resultsDiv = document.getElementById('adjSearchResults');
    if (!resultsDiv) return;
    resultsDiv.innerHTML = '';
    
    // منع قص النوافذ المنبثقة الجديدة وإلغاء القيود القديمة للفئة search-results
    resultsDiv.style.setProperty('overflow', 'visible', 'important');
    resultsDiv.style.setProperty('max-height', 'none', 'important');
    resultsDiv.style.setProperty('border', 'none', 'important');
    resultsDiv.style.setProperty('background', 'transparent', 'important');
    resultsDiv.style.setProperty('box-shadow', 'none', 'important');

    if (!query) { resultsDiv.style.display = 'none'; return; }

    const queryLower = query.toLowerCase();
    const filtered = productsDB.filter(p => 
        p.name.toLowerCase().includes(queryLower) || 
        (p.barcode && String(p.barcode).toLowerCase().includes(queryLower)) ||
        (p.code && String(p.code).toLowerCase().includes(queryLower)) ||
        (p.units && p.units.some(u => String(u.unitBarcode).toLowerCase().includes(queryLower)))
    ).slice(0, 10);

    if (filtered.length > 0) {
        resultsDiv.innerHTML = `
            <div class="pos-search-panel" style="width: 100%; max-width: 650px; min-width: 320px; position: absolute; top: 100%; right: 0; z-index: 99999; background: white; border-radius: 14px; box-shadow: 0 15px 35px rgba(0,0,0,0.25); border: 2px solid #cbd5e1; direction: rtl; text-align: right; margin-top: 6px; animation: modalFadeIn 0.2s ease-out;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; border-top-left-radius: 14px; border-top-right-radius: 14px;">
                    <span style="font-weight: 800; font-size: 0.88rem; color: #5e3370;">🔍 نتائج بحث تسوية المخزون (${filtered.length} صنف)</span>
                    <button onclick="document.getElementById('adjSearchResults').style.display='none';" class="pos-search-close-btn" title="إغلاق النافذة">❌</button>
                </div>
                <div style="max-height: 380px; overflow-y: auto; padding: 6px; scrollbar-gutter: stable;">
                    ${filtered.map(p => {
                        const costVal = parseFloat(p.cost) || 0;
                        const activeWH = (typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';
                        const stockVal = (typeof getWarehouseStock === 'function') ? getWarehouseStock(p.name, activeWH) : (parseFloat(p.stock) || 0);
                        return `
                            <div class="pos-search-row" onclick="
                                document.getElementById('adjSearchResults').style.display='none';
                                const selProd = productsDB.find(x => x.id === ${p.id});
                                if (selProd && selProd.variants && selProd.variants.length > 0) {
                                    if (typeof showVariantSelectionModal === 'function') {
                                        showVariantSelectionModal(selProd, 'adj');
                                    } else {
                                        fillAdjustmentHeaderWithUnit(selProd, ${JSON.stringify((p.units && p.units.length > 0) ? p.units[0] : { unitName: p.unit || 'قطعة', factor: 1, cost: p.cost }).replace(/"/g, '&quot;')});
                                    }
                                } else if (typeof showUnitSelectionModal === 'function' && ${p.units && p.units.length > 1}) {
                                    showUnitSelectionModal(productsDB.find(x => x.id === ${p.id}), 'adjustment');
                                } else {
                                    fillAdjustmentHeaderWithUnit(productsDB.find(x => x.id === ${p.id}), ${JSON.stringify((p.units && p.units.length > 0) ? p.units[0] : { unitName: p.unit || 'قطعة', factor: 1, cost: p.cost }).replace(/"/g, '&quot;')});
                                }" 
                                style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: 0.15s; border-radius: 10px; gap: 8px;">
                                <div style="flex: 1.5; min-width: 180px;">
                                    <div style="font-weight: 900; font-size: 0.95rem; color: #1e293b;">${p.name}</div>
                                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">🏷️ كود: <b style="color:#5e3370;">${p.code || p.id}</b> | باركود: <b>${p.barcode || '---'}</b></div>
                                </div>
                                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                                    <div style="text-align: center; background: rgba(59, 130, 246, 0.08); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2);">
                                        <div style="font-size: 0.7rem; color: #1d4ed8; font-weight: 700;">📦 الرصيد الحالي</div>
                                        <div style="font-weight: 900; font-size: 0.9rem; color: ${stockVal <= 5 ? '#ef4444' : '#1d4ed8'};">${stockVal} <span style="font-size:0.65rem;">${p.unit || 'قطعة'}</span></div>
                                    </div>
                                    <div style="text-align: center; background: #f8fafc; padding: 4px 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
                                        <div style="font-size: 0.7rem; color: #64748b;">📥 الشراء (التكلفة)</div>
                                        <div style="font-weight: 900; font-size: 0.85rem; color: #475569;">${costVal.toFixed(2)}</div>
                                    </div>
                                    <div style="text-align: center; background: #f8fafc; padding: 4px 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
                                        <div style="font-size: 0.7rem; color: #64748b;">💰 سعر البيع</div>
                                        <div style="font-weight: 900; font-size: 0.85rem; color: #3b82f6;">${priceVal.toFixed(2)}</div>
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
        const div = document.createElement('div');
        div.className = 'result-item';
        div.style.cssText = 'color:var(--main-green); font-weight:bold; justify-content:center; border: 1.5px dashed var(--main-green); background: rgba(16,185,129,0.05); cursor: pointer; padding: 12px;';
        div.innerHTML = `<span>➕ إضافة تفصيلية لصنف جديد: (${query})</span>`;
        div.onclick = () => {
            resultsDiv.style.display = 'none';
            quickAddProduct(query, 'adj');
        };
        resultsDiv.appendChild(div);
    }
}

function addAdjItem() {
    if (!window.selectedAdjItem) return alert("يرجى اختيار صنف أولاً");
    const qty = parseFloat(document.getElementById('adjQty').value);
    const price = parseFloat(document.getElementById('adjPrice').value) || window.selectedAdjItem.cost;
    const notes = document.getElementById('adjNotes') ? document.getElementById('adjNotes').value.trim() : '';

    window.adjCart.push({ 
        ...window.selectedAdjItem, 
        qty: qty, 
        price: price,
        notes: notes,
        unitFactor: currentAdjHeaderUnit ? parseFloat(currentAdjHeaderUnit.factor) : 1,
        selectedUnit: currentAdjHeaderUnit 
    });
    renderAdjTable();

    document.getElementById('adjSearch').value = '';
    document.getElementById('adjQty').value = '1';
    document.getElementById('adjPrice').value = '';
    if (document.getElementById('adjNotes')) document.getElementById('adjNotes').value = '';
    document.querySelectorAll('.adj-current-stock-val').forEach(el => el.innerText = '0');
    window.selectedAdjItem = null;
    document.getElementById('adjSearch').focus();
}

function renderAdjTable() {
    const tbody = document.getElementById('adjTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!window.adjCart || window.adjCart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding: 20px; color: #7f8c8d;">ابدأ بالبحث عن صنف بالاسم أو بالباركود</td></tr>';
        if (document.getElementById('adjItemsCount')) document.getElementById('adjItemsCount').innerText = '0';
        if (document.getElementById('adjTotalQty')) document.getElementById('adjTotalQty').innerText = '0';
        if (document.getElementById('adjGrandTotal')) document.getElementById('adjGrandTotal').innerText = '0.00';
        return;
    }
    let totalQty = 0, grandTotal = 0;
    let rowsHtml = '';
    window.adjCart.forEach((item, idx) => {
        const factor = item.unitFactor || 1;
        const totalAdj = item.qty * factor;
        const activeWH = (typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';
        const stockBefore = (typeof getWarehouseStock === 'function') ? getWarehouseStock(item.name, activeWH) : (parseFloat(item.stock) || 0);
        const stockAfter = stockBefore + totalAdj;

        const lineTotal = (item.qty * item.price);
        totalQty += parseFloat(item.qty) || 0;
        grandTotal += lineTotal;

        const { sizeElement, colorElement } = (typeof renderVariantSelectElements === 'function') 
            ? renderVariantSelectElements(item, idx, 'adj') 
            : { sizeElement: `<span style="color:#cbd5e1;">-</span>`, colorElement: `<span style="color:#cbd5e1;">-</span>` };

        let unitOptions = `<option value="base" ${!item.selectedUnit ? 'selected' : ''}>${item.unit || 'قطعة'}</option>`;
        if (item.units && item.units.length > 0) {
            unitOptions = item.units.map(u => 
                `<option value="${u.unitName}" ${item.selectedUnit && item.selectedUnit.unitName === u.unitName ? 'selected' : ''}>${u.unitName}</option>`
            ).join('');
        }

        rowsHtml += `
            <tr>
                <td>${idx + 1}</td>
                <td>${item.code || item.id}</td>
                <td style="font-weight:bold;">${item.name}</td>
                <td class="col-variant-size" style="text-align: center;">${sizeElement}</td>
                <td class="col-variant-color" style="text-align: center;">${colorElement}</td>
                <td style="background: rgba(52, 73, 94, 0.05); font-weight: 900; color: #34495e; font-size: 1.1rem;">${stockBefore}</td>
                <td style="background: rgba(46, 134, 222, 0.05);">
                    <input type="number" class="qty-input" value="${item.qty}" step="0.01"
                        style="width: 80px; text-align: center; font-weight: 900; color: #2e86de; border: 2px solid #2e86de; border-radius: 8px; height: 32px; background: #fff;"
                        onchange="window.adjCart[${idx}].qty=parseFloat(this.value)||0; renderAdjTable();" title="تعديل الكمية">
                </td>
                <td style="background: rgba(94, 51, 112, 0.05); font-weight: 900; color: #5e3370; font-size: 1.2rem;">${stockAfter}</td>
                <td>
                    <select class="unit-select" onchange="updateAdjItemUnit(${idx}, this.value)" style="width:100%; padding:2px; border-radius:4px; border:1px solid #ccc;">
                        ${unitOptions}
                    </select>
                </td>
                <td><input type="number" class="price-input" value="${parseFloat(item.price).toFixed(2)}" min="0" step="0.01"
                    onchange="window.adjCart[${idx}].price=parseFloat(this.value)||0; renderAdjTable();" title="تعديل السعر"></td>
                <td>${lineTotal.toFixed(2)}</td>
                <td style="min-width: 120px;">
                    <input type="text" value="${item.notes || ''}" placeholder="ملاحظة..."
                        style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem; box-sizing: border-box;"
                        onchange="window.adjCart[${idx}].notes=this.value;">
                </td>
                <td style="text-align: center; width: 40px;">
                    <button class="btn-delete-row" onclick="removeAdjItem(${idx})" title="حذف الصنف">❌</button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = rowsHtml;
    if (document.getElementById('adjItemsCount')) document.getElementById('adjItemsCount').innerText = window.adjCart.length;
    if (document.getElementById('adjTotalQty')) document.getElementById('adjTotalQty').innerText = totalQty;
    if (document.getElementById('adjGrandTotal')) document.getElementById('adjGrandTotal').innerText = grandTotal.toFixed(2);
}

function updateAdjItemUnit(idx, unitName) {
    const item = window.adjCart[idx];
    const product = productsDB.find(p => p.id === item.id);
    if (!product) return;

    const unit = product.units ? product.units.find(u => u.unitName === unitName) : null;

    if (unit) {
        item.selectedUnit = unit;
        item.unitFactor = parseFloat(unit.factor) || 1;
        const lastPurchasePrice = typeof getProductLastPurchasePrice === 'function' ? getProductLastPurchasePrice(product.name, product.cost) : (parseFloat(product.cost) || 0);
        const unitCost = parseFloat(unit.cost);
        item.price = (!isNaN(unitCost) && unitCost > 0) ? unitCost : (lastPurchasePrice * item.unitFactor);
    } else {
        item.selectedUnit = null;
        item.unitFactor = 1;
        item.price = typeof getProductLastPurchasePrice === 'function' ? getProductLastPurchasePrice(product.name, product.cost) : (parseFloat(product.cost) || 0);
    }
    renderAdjTable();
}

function removeAdjItem(index) {
    const item = window.adjCart[index];
    if (typeof addToTrash === 'function') addToTrash('draft_item', item, `حذف من تسوية الجرد: ${item.name}`);
    window.adjCart.splice(index, 1);
    renderAdjTable();
}

function removeAdjRow() {
    if (window.adjCart && window.adjCart.length > 0) {
        removeAdjItem(window.adjCart.length - 1);
    } else {
        alert("لا توجد عناصر لحذفها");
    }
}

async function saveAdjustment() {
    if (typeof checkPermission === 'function' && !checkPermission('stock_edit')) return false;
    if (typeof window.enforceSubscriptionCheck === 'function' && !window.enforceSubscriptionCheck('other')) return false;
    if (!window.adjCart || window.adjCart.length === 0) {
        alert("⚠️ قائمة التسوية فارغة! لا يمكن الحفظ.");
        return false;
    }

    let adjId;
    if (typeof isEditMode !== 'undefined' && isEditMode && typeof editingInvoiceId !== 'undefined' && editingInvoiceId) {
        adjId = editingInvoiceId;
        if (window.revertAndClearOldInvoice) {
            await window.revertAndClearOldInvoice(editingInvoiceId, editingInvoiceType);
        }
    } else {
        adjId = typeof getNextSequence === 'function' ? getNextSequence('تسوية') : ('ADJ-' + Date.now());
    }
    let grandTotal = 0;
    const dt = typeof getTransactionDateTime === 'function' ? getTransactionDateTime('adjDate', 'adjTime') : { full: new Date().toLocaleString('ar-EG'), iso: new Date().toISOString(), time: '' };

    const activeWH = (typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';

    window.adjCart.forEach(item => {
        const p = productsDB.find(x => x.id === item.id || x.name === item.name);
        if (p) {
            const factor = item.unitFactor || 1;
            const itemQtyNum = parseFloat(item.qty) || 0;
            const newBaseStock = itemQtyNum * factor;
            const isPositive = itemQtyNum >= 0;
            const adjTypeStr = isPositive ? 'تسوية مخزن (+) ⚖️' : 'تسوية مخزن (-) ⚖️';

            p.stock = (parseFloat(p.stock) || 0) + newBaseStock;
            if (!p.warehouseStocks) p.warehouseStocks = {};
            p.warehouseStocks[activeWH] = (parseFloat(p.warehouseStocks[activeWH]) || 0) + newBaseStock;

            // تحديث رصيد المقاس واللون للتشكيلة المختارة في التسوية
            if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
                const vMatch = (typeof window.findMatchingVariant === 'function')
                    ? window.findMatchingVariant(p, item)
                    : p.variants.find(v => 
                        (item.selectedVariant && v.barcode && v.barcode === item.selectedVariant.barcode) ||
                        ((v.size || '') === (item.selectedSize || item.size || '') && (v.color || '') === (item.selectedColor || item.color || ''))
                    );
                if (vMatch) {
                    vMatch.stock = Math.max(0, (parseFloat(vMatch.stock) || 0) + newBaseStock);
                } else if (p.variants.length === 1) {
                    p.variants[0].stock = Math.max(0, (parseFloat(p.variants[0].stock) || 0) + newBaseStock);
                } else if (p.variants.length > 1) {
                    p.variants[0].stock = Math.max(0, (parseFloat(p.variants[0].stock) || 0) + newBaseStock);
                }
                // مزامنة رصيد الصنف الإجمالي دائماً من مجموع الـ Variants
                p.stock = p.variants.reduce((sum, v) => sum + (parseFloat(v.stock) || 0), 0);
            }

            const lineTotal = Math.abs(itemQtyNum) * (parseFloat(item.price) || 0);
            grandTotal += lineTotal;

            transactions.push({
                date: dt.full,
                dateISO: dt.iso,
                timeISO: dt.time,
                type: adjTypeStr,
                method: '-',
                invoiceId: adjId,
                product: p.name,
                unit: item.selectedUnit ? item.selectedUnit.unitName : (p.unit || 'قطعة'),
                size: item.selectedSize || item.size || '',
                color: item.selectedColor || item.color || '',
                qty: Math.abs(itemQtyNum),
                price: item.price,
                total: lineTotal,
                partner: isPositive ? 'تسوية مخزن (إضافة / فائض)' : 'تسوية مخزن (خصم / عجز)',
                warehouse: activeWH,
                user: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : '-',
                notes: document.getElementById('adjNotes') ? document.getElementById('adjNotes').value.trim() : (item.notes || ''),
                unitFactor: factor,
                balanceAfter: p.stock,
                editDate: (typeof isEditMode !== 'undefined' && isEditMode) ? new Date().toLocaleString('ar-EG') : '-'
            });
        }
    });

    transactions.push({
        date: dt.full,
        dateISO: dt.iso,
        timeISO: dt.time,
        type: 'تسوية مخزن ⚖️',
        isInvoiceHead: true,
        invoiceId: adjId,
        total: grandTotal,
        partner: 'محضر تسوية جرد',
        warehouse: activeWH,
        user: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : '-',
        notes: document.getElementById('adjNotes') ? document.getElementById('adjNotes').value.trim() : '',
        editDate: '-'
    });

    if (typeof saveData === 'function') await saveData();

    // تحديث فوري لكافة الجداول والتقارير المرتبطة (قسم البضاعة، كروت الإحصائيات، تقرير حركة الصنف، الفواتير)
    if (typeof _invSummaryCache !== 'undefined') _invSummaryCache = null;
    if (typeof renderInventoryTable === 'function') renderInventoryTable();
    if (typeof renderCards === 'function') renderCards();
    if (typeof renderWarehouseReportTable === 'function') renderWarehouseReportTable();
    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
    if (typeof updateProductSearchDatalist === 'function') updateProductSearchDatalist();

    alert("✅ تم الحفظ وتحديث رصيد المخزن بنجاح!!");

    if (typeof isEditMode !== 'undefined') window.isEditMode = false;
    if (typeof editingInvoiceId !== 'undefined') window.editingInvoiceId = null;

    resetAdjustment();
    return true;
}

// دالة خصم الفكة بتقريب المبلغ للأصغر
function applyFractionalDiscount(type) {
    let totalEl, discInput, discTypeEl, discReasonEl, calcFn, reasonsArr;

    if (type === 'sales') {
        totalEl = document.getElementById('totalAmount');
        discInput = document.getElementById('discountInput');
        discTypeEl = document.getElementById('discountType');
        discReasonEl = document.getElementById('discountReason');
        reasonsArr = (typeof discountReasons !== 'undefined') ? discountReasons : [];
        calcFn = typeof calculateTotals === 'function' ? calculateTotals : () => {};
    } else if (type === 'salesReturn') {
        totalEl = document.getElementById('returnTotalAmount');
        discInput = document.getElementById('salesReturnDiscount');
        discTypeEl = document.getElementById('salesReturnDiscountType');
        discReasonEl = document.getElementById('salesReturnDiscountReason');
        reasonsArr = [];
        calcFn = () => { if (typeof updateReturnTotal === 'function') updateReturnTotal(); };
    } else if (type === 'purchaseReturn') {
        totalEl = document.getElementById('purReturnTotalAmount');
        discInput = document.getElementById('purReturnDiscount');
        discTypeEl = document.getElementById('purReturnDiscountType');
        discReasonEl = document.getElementById('purReturnDiscountReason');
        reasonsArr = [];
        calcFn = () => { if (typeof updateReturnTotal === 'function') updateReturnTotal('purchase'); };
    } else {
        totalEl = document.getElementById('purchaseTotal');
        discInput = document.getElementById('purchaseDiscount');
        discTypeEl = document.getElementById('purchaseDiscountType');
        discReasonEl = document.getElementById('purchaseDiscountReason');
        reasonsArr = (typeof purchaseDiscountReasons !== 'undefined') ? purchaseDiscountReasons : [];
        calcFn = typeof calculatePurchaseTotals === 'function' ? calculatePurchaseTotals : () => {};
    }

    if (!totalEl || !discInput) return;
    let currentTotal = parseFloat(totalEl.innerText) || 0;
    let fraction = currentTotal - Math.floor(currentTotal);

    if (fraction > 0) {
        if (discTypeEl) discTypeEl.value = 'fixed';

        let currentDisc = parseFloat(discInput.value) || 0;
        discInput.value = (currentDisc + fraction).toFixed(2);

        if (reasonsArr && !reasonsArr.includes('خصم فكة')) {
            reasonsArr.push('خصم فكة');
        }

        if (discReasonEl) {
            if (discReasonEl.tagName === 'SELECT') {
                let found = false;
                for (let i = 0; i < discReasonEl.options.length; i++) {
                    if (discReasonEl.options[i].value === 'خصم فكة') { found = true; break; }
                }
                if (!found) {
                    let opt = document.createElement('option');
                    opt.value = 'خصم فكة'; opt.text = 'خصم فكة 🪙';
                    discReasonEl.add(opt);
                }
            }
            discReasonEl.value = 'خصم فكة';
        }

        calcFn();

        if (typeof showCustomAlert === 'function') {
            showCustomAlert({
                type: 'info',
                titleText: '🪙 تسوية الفكة',
                msg: `تم خصم مبلغ (<b>${fraction.toFixed(2)}</b>) بنجاح لتصحيح الفاتورة إلى عدد صحيح.`
            });
        }
    } else {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert({
                type: 'warning',
                titleText: '⚠️ لا توجد فكة',
                msg: 'المبلغ الحالي هو عدد صحيح بالفعل ولا يحتوي على فكة للخصم.'
            });
        }
    }
}

// أزرار التنقل السريع (Navigation Logic)
async function autoSaveCurrentProductSilent() {
    const nameInput = document.getElementById('newItemName');
    if (!nameInput) return true;
    const nameVal = nameInput.value.trim();

    if (!nameVal && (typeof currentEditingProductId === 'undefined' || !currentEditingProductId)) return true;

    if (!nameVal) {
        showToast("⚠️ يرجى إدخال اسم الصنف أولاً للحفظ", "warning");
        return false;
    }

    const price = parseFloat(document.getElementById('newItemPrice').value) || 0;
    const cost = parseFloat(document.getElementById('newItemCost').value) || 0;

    if (price > 0 && cost > 0 && price < cost) {
        showToast("⚠️ تنبيه: سعر البيع أقل من التكلفة للصنف الحالي", "warning");
    }

    try {
        await saveNewItem('silent');
        return true;
    } catch (err) {
        console.error("Auto save error:", err);
        return true;
    }
}

async function navigateProduct(direction) {
    if (!Array.isArray(productsDB) || productsDB.length === 0) {
        showToast("ℹ️ لا يوجد أصناف مسجلة في المخزن حتى الآن", "info");
        return;
    }

    let curIdx = -1;

    // 1. البحث الدقيق بحسب ID الصنف أو كود النظام
    if (typeof currentEditingProductId !== 'undefined' && currentEditingProductId !== null && currentEditingProductId !== '') {
        const idStr = String(currentEditingProductId).trim();
        curIdx = productsDB.findIndex(p => p && (
            String(p.id).trim() === idStr ||
            String(p.sysCode || '').trim() === idStr ||
            String(p.code || '').trim() === idStr ||
            String(p.barcode || '').trim() === idStr
        ));
    }

    // 2. مطابقة احتياطية بحسب قيم الحقول بالواجهة عند تعذر الوصول بـ ID
    if (curIdx === -1) {
        const sysInp = document.getElementById('newItemSysCode')?.value?.trim();
        const nameInp = document.getElementById('newItemName')?.value?.trim();
        const barInp = document.getElementById('newItemBarcode')?.value?.trim();

        if (sysInp || nameInp || barInp) {
            curIdx = productsDB.findIndex(p => p && (
                (sysInp && String(p.sysCode || '').trim() === sysInp) ||
                (nameInp && p.name && p.name.trim() === nameInp) ||
                (barInp && String(p.barcode || '').trim() === barInp)
            ));
        }
    }

    // 3. التنقل بالتتابع الدقيق صنفاً تلو الآخر
    if (curIdx === -1) {
        curIdx = (direction > 0) ? -1 : productsDB.length;
    }

    let targetIdx = curIdx + direction;

    if (targetIdx < 0) {
        targetIdx = 0;
        showToast("ℹ️ هذا هو أول صنف في السجل (الصنف 1)", "info");
    } else if (targetIdx >= productsDB.length) {
        targetIdx = productsDB.length - 1;
        showToast(`ℹ️ هذا هو آخر صنف في السجل (الصنف ${productsDB.length})`, "info");
    }

    const targetProduct = productsDB[targetIdx];
    if (targetProduct) {
        window.currentEditingProductId = targetProduct.id;
        fillProductModal(targetProduct);
        updateProductNavCounter();
    }
}

function updateProductNavCounter() {
    const textEl = document.getElementById('productNavCounterText');
    if (!textEl) return;

    const total = (productsDB && productsDB.length) || 0;
    let idx = -1;
    if (typeof currentEditingProductId !== 'undefined' && currentEditingProductId !== null && currentEditingProductId !== '' && productsDB) {
        const idStr = String(currentEditingProductId).trim();
        idx = productsDB.findIndex(p => p && (
            String(p.id).trim() === idStr ||
            String(p.sysCode || '').trim() === idStr ||
            String(p.code || '').trim() === idStr
        ));
    }

    if (idx === -1 && productsDB) {
        const nameInp = document.getElementById('newItemName')?.value?.trim();
        if (nameInp) {
            idx = productsDB.findIndex(p => p && p.name && p.name.trim() === nameInp);
        }
    }

    if (idx !== -1) {
        textEl.innerText = `الصنف ${idx + 1} من إجمالي ${total} صنف`;
    } else {
        textEl.innerText = `صنف جديد (إجمالي الأصناف: ${total})`;
    }
}

function fillProductModal(p) {
    window.currentEditingProductId = p.id;
    const preview = document.getElementById('productImagePreview');
    const removeBtn = document.getElementById('removeProductImageBtn');
    if (preview) {
        if (p.image) {
            preview.style.backgroundImage = `url(${p.image})`;
            preview.innerText = '';
            window.currentProductImageData = p.image;
            if (removeBtn) removeBtn.classList.remove('hidden');
        } else {
            preview.style.backgroundImage = 'none';
            preview.innerText = '📷';
            window.currentProductImageData = null;
            if (removeBtn) removeBtn.classList.add('hidden');
        }
    }

    if (document.getElementById('newItemName')) document.getElementById('newItemName').value = p.name || '';
    if (document.getElementById('newItemSysCode')) document.getElementById('newItemSysCode').value = p.sysCode || p.id || '';
    if (document.getElementById('newItemPrice')) document.getElementById('newItemPrice').value = p.price || 0;
    if (document.getElementById('newItemWholesale')) document.getElementById('newItemWholesale').value = p.wholesale || 0;
    if (document.getElementById('newItemCost')) document.getElementById('newItemCost').value = p.cost || 0;
    if (document.getElementById('newItemMinPrice')) document.getElementById('newItemMinPrice').value = p.minPrice || 0;
    if (document.getElementById('newItemDiscount')) document.getElementById('newItemDiscount').value = p.discount || 0;
    if (document.getElementById('newItemBarcode')) document.getElementById('newItemBarcode').value = p.barcode || '';
    if (document.getElementById('newItemCode')) document.getElementById('newItemCode').value = p.code || '';
    if (document.getElementById('newItemCategory')) document.getElementById('newItemCategory').value = p.category || 'عام';
    if (document.getElementById('newItemShelf')) document.getElementById('newItemShelf').value = p.shelf || '';
    if (document.getElementById('newItemStock')) document.getElementById('newItemStock').value = p.stock || 0;
    if (document.getElementById('newItemMinStock')) document.getElementById('newItemMinStock').value = p.minStock || 0;
    if (document.getElementById('newItemCostQty')) document.getElementById('newItemCostQty').value = p.cost || 0;
    if (document.getElementById('newItemExpiry')) document.getElementById('newItemExpiry').value = p.expiry || '';
    if (document.getElementById('newItemNotes')) document.getElementById('newItemNotes').value = p.notes || '';

    const tbody = document.getElementById('productUnitsTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (p.units && p.units.length > 0 && typeof addProductUnitRow === 'function') {
            p.units.forEach((u, idx) => {
                addProductUnitRow(u.unitName, u.base_qty || u.factor || 1, u.sub_unit_quantity || 1);
                const lastRow = tbody.rows[tbody.rows.length - 1];

                const wInp = lastRow.cells[3].querySelector('input');
                const pInp = lastRow.cells[4].querySelector('input');
                const cLabel = lastRow.querySelector('.u-cost-label');
                const saleCheck = lastRow.cells[6].querySelector('input');
                const purCheck = lastRow.cells[7].querySelector('input');
                const bInp = lastRow.cells[8].querySelector('input');

                if (wInp) wInp.value = u.wholesale || 0;
                if (pInp) pInp.value = u.price || 0;
                if (cLabel) cLabel.innerText = (u.cost || 0).toFixed(2);
                if (saleCheck) saleCheck.checked = !!u.isDefaultSale;
                if (purCheck) purCheck.checked = !!u.isDefaultPurchase;
                if (bInp) bInp.value = u.unitBarcode || '';

                if (idx > 0) {
                    if (wInp) wInp.dataset.manual = 'true';
                    if (pInp) pInp.dataset.manual = 'true';
                }
            });
        } else if (typeof addProductUnitRow === 'function') {
            addProductUnitRow('قطعة');
        }
    }

    const quickCheck = document.getElementById('isQuickItem');
    if (quickCheck) quickCheck.checked = !!p.isQuick;

    // تعبئة جدول المقاسات والألوان إن وجدت
    const vBody = document.getElementById('productVariantsTableBody');
    if (vBody) {
        vBody.innerHTML = '';
        window._deletedVariantsStack = [];
        const undoBanner = document.getElementById('variantsUndoBanner');
        if (undoBanner) undoBanner.style.display = 'none';

        if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
            const isColorsOnly = p.variants.every(v => !v.size || v.size.trim() === '');
            setVariantMode(isColorsOnly ? 'colors' : 'sizes');
            p.variants.forEach(v => {
                addVariantRow(v.size || '', v.color || '', v.barcode, v.stock, v.price, v.wholesale, v.cost);
            });
        } else {
            setVariantMode('colors');
        }
        updateVariantsCountBadge();
        calculateTotalVariantsStock();
        setVariantsDisplayView('matrix');
    }

    // عرض تفاصيل توزيع الرصيد على كافة المخازن (Warehouse Distribution Breakdown)
    const distBox = document.getElementById('itemWarehouseDistributionBox');
    const distGrid = document.getElementById('itemWarehouseStocksGrid');
    const distTotalBadge = document.getElementById('itemWarehouseTotalBadge');
    if (distBox && distGrid) {
        const whList = (typeof warehouses !== 'undefined' && Array.isArray(warehouses) && warehouses.length > 0)
            ? warehouses
            : [{ name: 'المخزن الرئيسي' }];

        if (whList.length > 0 && p.name) {
            distBox.style.display = 'block';
            let totalAllWh = 0;
            distGrid.innerHTML = whList.map(wh => {
                const whStock = (typeof getWarehouseStock === 'function') ? getWarehouseStock(p.name, wh.name) : 0;
                totalAllWh += whStock;
                return `
                    <div style="background: white; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <span style="font-weight: 800; font-size: 0.85rem; color: #334155;">🏢 ${wh.name}:</span>
                        <span style="font-weight: 900; font-size: 1rem; color: ${whStock > 0 ? '#059669' : '#94a3b8'};">${whStock} <small style="font-size:0.7rem;">${p.unit || 'قطعة'}</small></span>
                    </div>
                `;
            }).join('');
            if (distTotalBadge) distTotalBadge.innerText = `🌍 الإجمالي الكلي: ${p.stock || totalAllWh} ${p.unit || 'قطعة'}`;
        } else {
            distBox.style.display = 'none';
        }
    }

    if (typeof calculateUnitPrices === 'function') calculateUnitPrices();
    updateProductNavCounter();
}

// =========================================================================
// 👕 دوال إدارة المقاسات والألوان وتوليد الباركودات الذكي (Variant Matrix & Bag Colors Logic)
// =========================================================================

window._currentVariantMode = 'colors';

function setVariantMode(mode) {
    window._currentVariantMode = mode;
    const btnColors = document.getElementById('btn-vmode-colors');
    const btnSizes = document.getElementById('btn-vmode-sizes');
    const panelColors = document.getElementById('variantColorsOnlyPanel');
    const panelSizes = document.getElementById('variantSizesColorsPanel');
    const sizeTh = document.querySelectorAll('#productVariantsTable .col-var-size');
    const sizeTds = document.querySelectorAll('#productVariantsTableBody .col-var-size-td');

    if (mode === 'colors') {
        if (btnColors) {
            btnColors.style.background = '#7c3aed';
            btnColors.style.color = 'white';
            btnColors.style.border = 'none';
            btnColors.style.boxShadow = '0 2px 6px rgba(124,58,237,0.3)';
        }
        if (btnSizes) {
            btnSizes.style.background = 'white';
            btnSizes.style.color = '#475569';
            btnSizes.style.border = '1.5px solid #cbd5e1';
            btnSizes.style.boxShadow = 'none';
        }
        if (panelColors) panelColors.classList.remove('hidden');
        if (panelSizes) panelSizes.classList.add('hidden');
        sizeTh.forEach(th => th.style.display = 'none');
        sizeTds.forEach(td => td.style.display = 'none');
    } else {
        if (btnSizes) {
            btnSizes.style.background = '#7c3aed';
            btnSizes.style.color = 'white';
            btnSizes.style.border = 'none';
            btnSizes.style.boxShadow = '0 2px 6px rgba(124,58,237,0.3)';
        }
        if (btnColors) {
            btnColors.style.background = 'white';
            btnColors.style.color = '#475569';
            btnColors.style.border = '1.5px solid #cbd5e1';
            btnColors.style.boxShadow = 'none';
        }
        if (panelSizes) panelSizes.classList.remove('hidden');
        if (panelColors) panelColors.classList.add('hidden');
        sizeTh.forEach(th => th.style.display = '');
        sizeTds.forEach(td => td.style.display = '');
    }
}
window.setVariantMode = setVariantMode;

function setQuickColorInput(colorName) {
    const nameInput = document.getElementById('colorOnlyNameInput');
    const qtyInput = document.getElementById('colorOnlyQtyInput');
    if (nameInput) nameInput.value = colorName;
    if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
    }
}
window.setQuickColorInput = setQuickColorInput;

function addColorOnlyVariant() {
    const nameInput = document.getElementById('colorOnlyNameInput');
    const qtyInput = document.getElementById('colorOnlyQtyInput');
    const colorName = nameInput ? nameInput.value.trim() : '';
    const qty = qtyInput ? (parseFloat(qtyInput.value) || 0) : 1;

    if (!colorName) {
        return showToast("⚠️ يرجى إدخال اسم اللون أولاً (مثال: أسود، بني، هافان)", "warning");
    }

    // التحقق من تكرار اللون
    const existingRows = document.querySelectorAll('#productVariantsTableBody tr');
    for (let tr of existingRows) {
        const cVal = tr.querySelector('.var-color-input')?.value?.trim();
        if (cVal && cVal.toLowerCase() === colorName.toLowerCase()) {
            showToast(`⚠️ تنبيه: اللون (${colorName}) مضاف مسبقاً في الجدول! يمكنك تعديل رصيده مباشرة`, "info");
            const stockInp = tr.querySelector('.var-stock-input');
            if (stockInp) {
                stockInp.focus();
                stockInp.select();
            }
            return;
        }
    }

    const curPrice = parseFloat(document.getElementById('newItemPrice')?.value) || 0;
    const curWs = parseFloat(document.getElementById('newItemWholesale')?.value) || 0;
    const curCost = parseFloat(document.getElementById('newItemCost')?.value) || 0;

    addVariantRow('', colorName, '', qty, curPrice, curWs, curCost);
    calculateTotalVariantsStock();

    if (nameInput) {
        nameInput.value = '';
        nameInput.focus();
    }
    if (qtyInput) {
        qtyInput.value = 1;
    }

    showToast(`✅ تم إضافة لون (${colorName}) برصيد (${qty}) بنجاح`, "success");
}
window.addColorOnlyVariant = addColorOnlyVariant;

function calculateTotalVariantsStock() {
    const vRows = document.getElementById('productVariantsTableBody')?.rows || [];
    if (vRows.length === 0) return;

    let totalStock = 0;
    for (let i = 0; i < vRows.length; i++) {
        const stockInp = vRows[i].querySelector('.var-stock-input');
        if (stockInp) {
            totalStock += parseFloat(stockInp.value) || 0;
        }
    }

    const stockField = document.getElementById('newItemStock');
    if (stockField) {
        stockField.value = totalStock;
    }
    const costQtyField = document.getElementById('newItemCostQty');
    if (costQtyField) {
        const costVal = parseFloat(document.getElementById('newItemCost')?.value) || 0;
        costQtyField.value = (totalStock * costVal).toFixed(2);
    }
}
window.calculateTotalVariantsStock = calculateTotalVariantsStock;

function applyPresetSizes(presetType) {
    const input = document.getElementById('variantSizesInput');
    if (!input) return;
    if (presetType === 'clothes') {
        input.value = 'S, M, L, XL, XXL, 3XL';
    } else if (presetType === 'shoes') {
        input.value = '38, 39, 40, 41, 42, 43, 44, 45';
    }
}

function generateVariantBarcode(size = '', color = '', index = 1) {
    // توليد باركود رقمي قياسي EAN/UPC Style فريد مبني على وقت وسيريال الصنف
    const baseCode = document.getElementById('newItemSysCode')?.value || document.getElementById('newItemBarcode')?.value || String(Date.now()).slice(-6);
    const cleanBase = String(baseCode).replace(/\D/g, '').slice(-5) || '1001';
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    return `20${cleanBase}${index}${randSuffix}`.slice(0, 13);
}

function addVariantRow(size = '', color = '', barcode = '', stock = 1, price = null, wholesale = null, cost = null) {
    const tbody = document.getElementById('productVariantsTableBody');
    if (!tbody) return;

    const rowIdx = tbody.rows.length + 1;
    const defaultPrice = price !== null ? price : (parseFloat(document.getElementById('newItemPrice')?.value) || 0);
    const defaultWs = wholesale !== null ? wholesale : (parseFloat(document.getElementById('newItemWholesale')?.value) || 0);
    const defaultCost = cost !== null ? cost : (parseFloat(document.getElementById('newItemCost')?.value) || 0);
    const autoBarcode = barcode || generateVariantBarcode(size, color, rowIdx);

    const isColorsMode = (window._currentVariantMode === 'colors') || (!size && !!color);
    const sizeDisplay = isColorsMode ? 'display: none;' : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="font-weight: bold; color: #64748b;">${rowIdx}</td>
        <td class="col-var-size-td" style="${sizeDisplay}">
            <input type="text" class="search-input var-size-input" value="${size}" placeholder="مثال: XL"
                style="height: 32px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px;">
        </td>
        <td>
            <input type="text" class="search-input var-color-input" value="${color}" placeholder="مثال: أسود"
                style="height: 32px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px;">
        </td>
        <td>
            <div style="display: flex; gap: 4px; align-items: center;">
                <input type="text" class="search-input var-barcode-input" value="${autoBarcode}" placeholder="باركود القطعة"
                    style="height: 32px; font-family: monospace; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; letter-spacing: 0.5px; font-size: 0.8rem;">
                <button type="button" class="bayan-btn" onclick="this.previousElementSibling.value = generateVariantBarcode();"
                    style="padding: 2px 6px; height: 32px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.75rem;" title="توليد باركود جديد">⚡</button>
            </div>
        </td>
        <td>
            <input type="number" class="search-input var-stock-input" value="${stock}" min="0" oninput="calculateTotalVariantsStock()"
                style="height: 32px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; color: #047857;">
        </td>
        <td>
            <input type="number" class="search-input var-price-input" value="${defaultPrice}"
                style="height: 32px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; color: #047857;">
        </td>
        <td>
            <input type="number" class="search-input var-ws-input" value="${defaultWs}"
                style="height: 32px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; color: #0284c7;">
        </td>
        <td>
            <input type="number" class="search-input var-cost-input" value="${defaultCost}"
                style="height: 32px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; color: #d97706;">
        </td>
        <td>
            <button type="button" onclick="removeVariantRow(this)"
                style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-weight: bold;" title="حذف هذا الصف">✕</button>
        </td>
    `;
    tbody.appendChild(tr);
    updateVariantsCountBadge();
    if (window._variantCurrentView === 'matrix') {
        renderVariantMatrixGrid();
    }
}

// ↩️ مكدس استرجاع التشكيلات المحذوفة (Undo Stack)
window._deletedVariantsStack = [];
window._variantCurrentView = 'matrix';

function removeVariantRow(btn) {
    const tr = btn.closest('tr');
    if (!tr) return;

    const size = tr.querySelector('.var-size-input')?.value || '';
    const color = tr.querySelector('.var-color-input')?.value || '';
    const barcode = tr.querySelector('.var-barcode-input')?.value || '';
    const stock = parseFloat(tr.querySelector('.var-stock-input')?.value) || 0;
    const price = parseFloat(tr.querySelector('.var-price-input')?.value) || 0;
    const wholesale = parseFloat(tr.querySelector('.var-ws-input')?.value) || 0;
    const cost = parseFloat(tr.querySelector('.var-cost-input')?.value) || 0;

    window._deletedVariantsStack.push({ size, color, barcode, stock, price, wholesale, cost });

    tr.remove();
    updateVariantsCountBadge();
    calculateTotalVariantsStock();

    // إظهار شريط التراجع
    const undoBanner = document.getElementById('variantsUndoBanner');
    const undoText = document.getElementById('variantsUndoText');
    if (undoBanner && undoText) {
        const desc = [size ? `مقاس (${size})` : '', color ? `لون (${color})` : ''].filter(Boolean).join(' - ') || 'التشكيلة';
        undoText.innerText = `تم حذف ${desc} (رصيد: ${stock} قطعة).`;
        undoBanner.style.display = 'flex';
    }

    if (window._variantCurrentView === 'matrix') {
        renderVariantMatrixGrid();
    }
}
window.removeVariantRow = removeVariantRow;

function restoreLastDeletedVariant() {
    if (!window._deletedVariantsStack || window._deletedVariantsStack.length === 0) {
        const undoBanner = document.getElementById('variantsUndoBanner');
        if (undoBanner) undoBanner.style.display = 'none';
        return;
    }

    const item = window._deletedVariantsStack.pop();
    addVariantRow(item.size, item.color, item.barcode, item.stock, item.price, item.wholesale, item.cost);
    calculateTotalVariantsStock();

    if (window._deletedVariantsStack.length === 0) {
        const undoBanner = document.getElementById('variantsUndoBanner');
        if (undoBanner) undoBanner.style.display = 'none';
    } else {
        const undoText = document.getElementById('variantsUndoText');
        if (undoText) undoText.innerText = `متبقي (${window._deletedVariantsStack.length}) تشكيلات محذوفة.`;
    }

    showToast(`↩️ تم استرجاع التشكيلة (${item.size || ''} ${item.color || ''}) بنجاح!`, "success");
}
window.restoreLastDeletedVariant = restoreLastDeletedVariant;

// 🎛️ التبديل بين عرض الشبكة الذكية والجدول التفصيلي
function setVariantsDisplayView(view) {
    window._variantCurrentView = view;
    const btnMatrix = document.getElementById('btn-variant-view-matrix');
    const btnTable = document.getElementById('btn-variant-view-table');
    const gridContainer = document.getElementById('variantMatrixGridContainer');
    const tableContainer = document.getElementById('productVariantsTableContainer');

    if (view === 'matrix') {
        if (btnMatrix) {
            btnMatrix.style.background = '#7c3aed';
            btnMatrix.style.color = 'white';
            btnMatrix.style.border = 'none';
            btnMatrix.style.boxShadow = '0 2px 6px rgba(124,58,237,0.25)';
        }
        if (btnTable) {
            btnTable.style.background = 'white';
            btnTable.style.color = '#475569';
            btnTable.style.border = '1.5px solid #cbd5e1';
            btnTable.style.boxShadow = 'none';
        }
        if (gridContainer) gridContainer.style.display = 'block';
        if (tableContainer) tableContainer.style.display = 'none';
        renderVariantMatrixGrid();
    } else {
        if (btnTable) {
            btnTable.style.background = '#7c3aed';
            btnTable.style.color = 'white';
            btnTable.style.border = 'none';
            btnTable.style.boxShadow = '0 2px 6px rgba(124,58,237,0.25)';
        }
        if (btnMatrix) {
            btnMatrix.style.background = 'white';
            btnMatrix.style.color = '#475569';
            btnMatrix.style.border = '1.5px solid #cbd5e1';
            btnMatrix.style.boxShadow = 'none';
        }
        if (tableContainer) tableContainer.style.display = 'block';
        if (gridContainer) gridContainer.style.display = 'none';
    }
}
window.setVariantsDisplayView = setVariantsDisplayView;

// 📊 رسم شبكة المقاسات والألوان الذكية (2D Matrix Grid)
function renderVariantMatrixGrid() {
    const container = document.getElementById('variantMatrixGridContent');
    if (!container) return;

    const rows = Array.from(document.getElementById('productVariantsTableBody')?.rows || []);
    if (rows.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 25px; color: #94a3b8;">
                <div style="font-size: 2rem; margin-bottom: 6px;">⚡</div>
                <div style="font-weight: 800; font-size: 0.95rem; color: #64748b;">لا توجد مقاسات أو ألوان مضافة حتى الآن</div>
                <div style="font-size: 0.8rem; margin-top: 4px;">استخدم المولد السريع بالأعلى أو زر (إضافة صف) لإضافة التشكيلات</div>
            </div>
        `;
        return;
    }

    const items = rows.map(r => ({
        size: r.querySelector('.var-size-input')?.value?.trim() || '',
        color: r.querySelector('.var-color-input')?.value?.trim() || 'موحد',
        stock: parseFloat(r.querySelector('.var-stock-input')?.value) || 0,
        price: parseFloat(r.querySelector('.var-price-input')?.value) || 0,
        wholesale: parseFloat(r.querySelector('.var-ws-input')?.value) || 0,
        cost: parseFloat(r.querySelector('.var-cost-input')?.value) || 0,
        rowRef: r
    }));

    const isColorsOnly = (window._currentVariantMode === 'colors') || items.every(it => !it.size || it.size === 'قياسي');

    if (isColorsOnly) {
        // عرض كروت الألوان الأنيقة السريعة للشنط والإكسسوارات
        let cardsHtml = items.map((it, idx) => `
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; transition: 0.2s;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="width: 14px; height: 14px; border-radius: 50%; background: #6366f1; display: inline-block;"></span>
                    <span style="font-weight: 900; font-size: 0.95rem; color: #1e293b;">${it.color}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 0.8rem; font-weight: 800; color: #64748b;">الكمية:</span>
                        <input type="number" min="0" value="${it.stock}" 
                            oninput="updateMatrixColorQty('${it.color.replace(/'/g, "\\'")}', this.value)"
                            style="width: 75px; height: 32px; text-align: center; font-weight: 900; font-size: 1rem; color: #047857; border: 1.5px solid #10b981; border-radius: 8px; background: white;">
                    </div>
                    <button type="button" onclick="removeVariantRow(document.getElementById('productVariantsTableBody').rows[${idx}].querySelector('button'))"
                        style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-weight: bold;" title="حذف هذا اللون">✕</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px;">
                ${cardsHtml}
            </div>
        `;
        return;
    }

    // عرض مصفوفة 2D Grid (المقاسات كأعمدة والألوان كصفوف)
    const distinctSizes = [...new Set(items.map(it => it.size).filter(Boolean))];
    distinctSizes.sort((a, b) => (typeof compareSizes === 'function' ? compareSizes(a, b) : a.localeCompare(b)));

    const distinctColors = [...new Set(items.map(it => it.color || 'موحد'))];

    // خريطة الرصيد لكل [color][size]
    const matrixMap = {};
    distinctColors.forEach(c => { matrixMap[c] = {}; });
    items.forEach(it => {
        const c = it.color || 'موحد';
        const s = it.size || '';
        matrixMap[c][s] = it.stock;
    });

    let headerThs = distinctSizes.map(sz => `
        <th style="padding: 8px 6px; background: #1e293b; color: white; border: 1px solid #334155; font-size: 0.85rem; font-weight: 900; min-width: 65px;">
            ${sz}
        </th>
    `).join('');

    let rowsHtml = distinctColors.map(col => {
        let colSum = 0;
        let cellsHtml = distinctSizes.map(sz => {
            const val = matrixMap[col][sz] !== undefined ? matrixMap[col][sz] : 0;
            colSum += val;
            return `
                <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: center;">
                    <input type="number" min="0" value="${val}"
                        oninput="updateMatrixCellStock('${col.replace(/'/g, "\\'")}', '${sz.replace(/'/g, "\\'")}', this.value)"
                        style="width: 58px; height: 32px; text-align: center; font-weight: 900; font-size: 0.95rem; color: ${val <= 0 ? '#dc2626' : '#047857'}; border: 1.5px solid ${val <= 0 ? '#fca5a5' : '#a7f3d0'}; border-radius: 6px; background: ${val <= 0 ? '#fef2f2' : '#f0fdf4'}; outline: none; transition: 0.15s;"
                        onfocus="this.style.borderColor='#7c3aed'; this.select();"
                        onblur="this.style.borderColor='${val <= 0 ? '#fca5a5' : '#a7f3d0'}';">
                </td>
            `;
        }).join('');

        return `
            <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.15s;" onmouseenter="this.style.background='#f8fafc';" onmouseleave="this.style.background='';">
                <td style="padding: 8px 12px; font-weight: 900; color: #1e293b; text-align: right; border: 1px solid #e2e8f0; white-space: nowrap; font-size: 0.88rem; background: #fdfdfd;">
                    🎨 ${col}
                </td>
                ${cellsHtml}
                <td style="padding: 8px 10px; font-weight: 900; color: #7c3aed; background: #faf5ff; border: 1px solid #e2e8f0; text-align: center; font-size: 0.95rem;" class="matrix-color-sum-${col.replace(/\s+/g, '_')}">
                    ${colSum}
                </td>
                <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: center;">
                    <button type="button" onclick="removeMatrixColor('${col.replace(/'/g, "\\'")}')"
                        style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; border-radius: 6px; padding: 3px 7px; cursor: pointer; font-weight: bold; font-size: 0.75rem;" title="حذف هذا اللون بجميع مقاساته">✕</button>
                </td>
            </tr>
        `;
    }).join('');

    // صف إجمالي كل مقاس
    let footerTds = distinctSizes.map(sz => {
        let sizeSum = 0;
        distinctColors.forEach(col => {
            sizeSum += (matrixMap[col][sz] || 0);
        });
        return `
            <td style="padding: 8px 6px; font-weight: 900; color: #1e293b; background: #f1f5f9; border: 1px solid #cbd5e1; text-align: center; font-size: 0.9rem;">
                ${sizeSum}
            </td>
        `;
    }).join('');

    const grandTotal = items.reduce((sum, it) => sum + (it.stock || 0), 0);

    container.innerHTML = `
        <div style="overflow-x: auto; max-width: 100%;">
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.85rem;">
                <thead>
                    <tr>
                        <th style="padding: 8px 12px; background: #0f172a; color: white; border: 1px solid #334155; text-align: right; min-width: 100px;">اللون / المقاس</th>
                        ${headerThs}
                        <th style="padding: 8px 10px; background: #581c87; color: white; border: 1px solid #4c1d95; min-width: 80px;">إجمالي اللون</th>
                        <th style="padding: 8px 6px; background: #0f172a; color: white; border: 1px solid #334155; width: 45px;">حذف</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
                <tfoot>
                    <tr style="border-top: 2px solid #94a3b8; background: #f1f5f9;">
                        <td style="padding: 8px 12px; font-weight: 900; color: #1e293b; text-align: right; border: 1px solid #cbd5e1;">إجمالي المقاس:</td>
                        ${footerTds}
                        <td style="padding: 8px 10px; font-weight: 900; color: #047857; background: #dcfce7; border: 2px solid #86efac; font-size: 1.05rem;">
                            ${grandTotal}
                        </td>
                        <td style="border: 1px solid #cbd5e1;"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}
window.renderVariantMatrixGrid = renderVariantMatrixGrid;

function updateMatrixCellStock(color, size, newQtyVal) {
    const qty = Math.max(0, parseFloat(newQtyVal) || 0);
    const rows = Array.from(document.getElementById('productVariantsTableBody')?.rows || []);
    let found = false;

    for (let r of rows) {
        const rSize = r.querySelector('.var-size-input')?.value?.trim() || '';
        const rColor = r.querySelector('.var-color-input')?.value?.trim() || 'موحد';
        if (rSize === size && rColor === color) {
            const stockInp = r.querySelector('.var-stock-input');
            if (stockInp) stockInp.value = qty;
            found = true;
            break;
        }
    }

    if (!found) {
        // إضافة الصف إذا لم يكن موجوداً
        const curPrice = parseFloat(document.getElementById('newItemPrice')?.value) || 0;
        const curWs = parseFloat(document.getElementById('newItemWholesale')?.value) || 0;
        const curCost = parseFloat(document.getElementById('newItemCost')?.value) || 0;
        addVariantRow(size, color, '', qty, curPrice, curWs, curCost);
    }

    calculateTotalVariantsStock();
    updateVariantsCountBadge();
    
    // تحديث إجماليات الماتريكس بدون إعادة بناء التركيز
    setTimeout(() => {
        renderVariantMatrixGrid();
    }, 400);
}
window.updateMatrixCellStock = updateMatrixCellStock;

function updateMatrixColorQty(color, newQtyVal) {
    const qty = Math.max(0, parseFloat(newQtyVal) || 0);
    const rows = Array.from(document.getElementById('productVariantsTableBody')?.rows || []);
    for (let r of rows) {
        const rColor = r.querySelector('.var-color-input')?.value?.trim() || 'موحد';
        if (rColor === color) {
            const stockInp = r.querySelector('.var-stock-input');
            if (stockInp) stockInp.value = qty;
            break;
        }
    }
    calculateTotalVariantsStock();
    updateVariantsCountBadge();
}
window.updateMatrixColorQty = updateMatrixColorQty;

function removeMatrixColor(color) {
    const rows = Array.from(document.getElementById('productVariantsTableBody')?.rows || []);
    const deletedForColor = [];
    rows.forEach(r => {
        const rColor = r.querySelector('.var-color-input')?.value?.trim() || 'موحد';
        if (rColor === color) {
            const size = r.querySelector('.var-size-input')?.value || '';
            const barcode = r.querySelector('.var-barcode-input')?.value || '';
            const stock = parseFloat(r.querySelector('.var-stock-input')?.value) || 0;
            const price = parseFloat(r.querySelector('.var-price-input')?.value) || 0;
            const wholesale = parseFloat(r.querySelector('.var-ws-input')?.value) || 0;
            const cost = parseFloat(r.querySelector('.var-cost-input')?.value) || 0;

            deletedForColor.push({ size, color, barcode, stock, price, wholesale, cost });
            r.remove();
        }
    });

    if (deletedForColor.length > 0) {
        window._deletedVariantsStack.push(...deletedForColor);
        const undoBanner = document.getElementById('variantsUndoBanner');
        const undoText = document.getElementById('variantsUndoText');
        if (undoBanner && undoText) {
            undoText.innerText = `تم حذف اللون (${color}) بجميع مقاساته (${deletedForColor.length} تشكيلة).`;
            undoBanner.style.display = 'flex';
        }
    }

    calculateTotalVariantsStock();
    updateVariantsCountBadge();
    renderVariantMatrixGrid();
}
window.removeMatrixColor = removeMatrixColor;

function generateVariantsMatrix() {
    const sizesStr = document.getElementById('variantSizesInput')?.value || '';
    const colorsStr = document.getElementById('variantColorsInput')?.value || '';

    const sizes = sizesStr.split(/[,،\s]+/).map(s => s.trim()).filter(Boolean);
    const colors = colorsStr.split(/[,،\s]+/).map(c => c.trim()).filter(Boolean);

    if (sizes.length === 0 && colors.length === 0) {
        return showToast("⚠️ يرجى كتابة مقاسات أو ألوان لتوليد التشكيلة!", "warning");
    }

    const tbody = document.getElementById('productVariantsTableBody');
    if (!tbody) return;

    // الأسعار الافتراضية المأخوذة من أعلى الكارت
    const curPrice = parseFloat(document.getElementById('newItemPrice')?.value) || 0;
    const curWs = parseFloat(document.getElementById('newItemWholesale')?.value) || 0;
    const curCost = parseFloat(document.getElementById('newItemCost')?.value) || 0;

    const listSizes = sizes.length > 0 ? sizes : [''];
    const listColors = colors.length > 0 ? colors : ['موحد'];

    listSizes.forEach(sz => {
        listColors.forEach(col => {
            addVariantRow(sz, col, '', 1, curPrice, curWs, curCost);
        });
    });

    calculateTotalVariantsStock();
    renderVariantMatrixGrid();
    showToast(`✅ تم توليد (${listSizes.length * listColors.length}) تشكيلة بنجاح!`, "success");
}

function generateAllVariantBarcodes() {
    const rows = document.getElementById('productVariantsTableBody')?.rows || [];
    if (rows.length === 0) return showToast("⚠️ لا توجد مقاسات أو ألوان مسجلة لتوليد الباركود لها", "info");

    for (let i = 0; i < rows.length; i++) {
        const barcodeInp = rows[i].querySelector('.var-barcode-input');
        const sizeInp = rows[i].querySelector('.var-size-input');
        const colorInp = rows[i].querySelector('.var-color-input');
        if (barcodeInp) {
            barcodeInp.value = generateVariantBarcode(sizeInp ? sizeInp.value : '', colorInp ? colorInp.value : '', i + 1);
        }
    }
    showToast("✅ تم توليد الباركودات لكافة المقاسات والألوان بنجاح!", "success");
}

// =========================================================================
// 🏷️ طباعة تيكتات وملصقات الشنط والملابس والأحذية (Hangtags & Labels)
// =========================================================================

function printProductVariantHangtags() {
    const rows = document.getElementById('productVariantsTableBody')?.rows || [];
    const productName = document.getElementById('newItemName')?.value || 'موديل الصنف';
    const shopName = (document.getElementById('shopName') ? document.getElementById('shopName').value : '') || 'المتجر الذكي';
    const currency = typeof getCurrencySymbol === 'function' ? getCurrencySymbol() : 'ج.م';

    if (rows.length === 0) {
        return showToast("⚠️ لا توجد تشكيلات أو ألوان مسجلة لطباعة تيكتات لها!", "warning");
    }

    const targets = [];
    for (let i = 0; i < rows.length; i++) {
        const size = rows[i].querySelector('.var-size-input')?.value?.trim() || '';
        const color = rows[i].querySelector('.var-color-input')?.value?.trim() || 'موحد';
        let barcode = rows[i].querySelector('.var-barcode-input')?.value || '';
        if (!barcode) {
            barcode = generateVariantBarcode(size, color, i + 1);
            if (rows[i].querySelector('.var-barcode-input')) rows[i].querySelector('.var-barcode-input').value = barcode;
        }
        const price = parseFloat(rows[i].querySelector('.var-price-input')?.value) || parseFloat(document.getElementById('newItemPrice')?.value) || 0;
        const stock = parseInt(rows[i].querySelector('.var-stock-input')?.value) || 1;

        targets.push({
            name: productName,
            size: size,
            color: color,
            barcode: barcode,
            price: price,
            copies: Math.max(1, stock)
        });
    }

    const isColorsOnly = targets.every(t => !t.size || t.size === 'قياسي' || t.size.trim() === '');
    const bSettings = (typeof getBarcodeLabelSettings === 'function') ? getBarcodeLabelSettings() : { width: 50, height: 35, offsetX: 0, barcodeHeight: 28 };
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    printWindow.document.write(`
        <html>
        <head>
            <title>طباعة تيكتات الأصناف - ${productName}</title>
            <style>
                @page {
                    size: ${bSettings.width || 50}mm ${bSettings.height || 35}mm;
                    margin: 0mm;
                }
                * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                html, body {
                    width: ${bSettings.width || 50}mm;
                    margin: 0 !important;
                    padding: 0 !important;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    direction: rtl;
                    text-align: center;
                    background: #fff;
                    color: #000;
                }
                .hangtag-label { 
                    width: ${bSettings.width || 50}mm;
                    height: ${bSettings.height || 35}mm;
                    padding: 1.5mm 2mm;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    page-break-after: always;
                    page-break-inside: avoid;
                    overflow: hidden;
                    border: 1px dashed #ccc;
                }
                .shop-name { font-size: 8pt; font-weight: 900; color: #1e293b; line-height: 1; border-bottom: 1px solid #000; width: 100%; padding-bottom: 1mm; margin-bottom: 0.5mm; }
                .model-name { font-size: 8.5pt; font-weight: 800; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; line-height: 1.1; }
                .variant-badge-row { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0 1mm; }
                .size-badge { font-size: 8pt; font-weight: 900; background: #000; color: #fff; padding: 0.5mm 2.5mm; border-radius: 2px; }
                .color-badge { font-size: 7.5pt; font-weight: 800; color: #333; }
                .price-badge { font-size: 9.5pt; font-weight: 900; color: #000; border: 1.5px solid #000; padding: 0.5mm 3.5mm; border-radius: 3px; line-height: 1; }
                svg { max-width: 96%; height: 26px; margin: 0 auto; display: block; }
                @media print {
                    html, body { width: ${bSettings.width || 50}mm; margin: 0 !important; padding: 0 !important; }
                    .hangtag-label { border: none !important; box-shadow: none !important; }
                }
            </style>
        </head>
        <body>
            <div id="labelsContainer"></div>
        </body>
        </html>
    `);

    const container = printWindow.document.getElementById('labelsContainer');
    let svgIndex = 0;

    targets.forEach(t => {
        for (let c = 0; c < t.copies; c++) {
            svgIndex++;
            const label = printWindow.document.createElement('div');
            label.className = 'hangtag-label';
            
            const badgeHtml = (!t.size || t.size === 'قياسي' || t.size.trim() === '')
                ? `<div style="text-align: center; width: 100%;"><span class="color-badge" style="font-size: 8.5pt; font-weight: 900; background: #0f172a; color: white; padding: 0.5mm 3.5mm; border-radius: 4px;">اللون: ${t.color}</span></div>`
                : `<div class="variant-badge-row"><span class="size-badge">SIZE: ${t.size}</span><span class="color-badge">اللون: ${t.color}</span></div>`;

            label.innerHTML = `
                <div class="shop-name">${shopName}</div>
                <div class="model-name">${t.name}</div>
                ${badgeHtml}
                <svg id="ht-svg-${svgIndex}"></svg>
                <div class="price-badge">${t.price.toFixed(2)} ${currency}</div>
            `;
            container.appendChild(label);

            if (window.JsBarcode) {
                try {
                    window.JsBarcode(label.querySelector('svg'), String(t.barcode), {
                        format: "CODE128",
                        width: 1.3,
                        height: 24,
                        displayValue: true,
                        fontSize: 9,
                        textMargin: 1,
                        margin: 0
                    });
                } catch(e) {
                    console.warn("JsBarcode error:", e);
                }
            }
        }
    });

    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 400);

    showToast(`🖨️ جاري إرسال (${svgIndex}) تيكت للطباعة...`, "success");
}

function updateVariantsCountBadge() {
    const count = document.getElementById('productVariantsTableBody')?.rows?.length || 0;
    const badge = document.getElementById('variantsCountBadge');
    if (badge) badge.innerText = count;
}

function openPriceAdjustmentModal() {
    if (typeof checkPermission === 'function' && !checkPermission('products_edit')) return;

    const selectedIds = Array.from(window.selectedInventoryIds);
    document.getElementById('priceAdjustmentModal')?.classList.remove('hidden');

    const catSelect = document.getElementById('priceAdjCategory');
    if (catSelect) {
        catSelect.innerHTML = '<option value="all">كافة التصنيفات</option>';
        const cats = [...new Set(productsDB.map(p => p.category).filter(c => c))];
        cats.forEach(c => {
            catSelect.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }

    loadPriceAdjustmentData(selectedIds);

    if (typeof applyPriceAdjColumnVisibility === 'function') {
        setTimeout(applyPriceAdjColumnVisibility, 100);
    }
}

function closePriceAdjustmentModal() {
    document.getElementById('priceAdjustmentModal')?.classList.add('hidden');
    if (document.getElementById('priceAdjSearch')) document.getElementById('priceAdjSearch').value = '';
    window.priceAdjData = [];
}

window.priceAdjData = window.priceAdjData || [];

function loadPriceAdjustmentData(selectedIds = []) {
    const tbody = document.getElementById('priceAdjustmentTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:50px;">⏳ جاري فحص ومزامنة البيانات...</td></tr>';

    try {
        if (!Array.isArray(productsDB) || productsDB.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:50px; color:#ef4444;">⚠️ قاعدة بيانات الأصناف غير متوفرة حالياً، يرجى إعادة المحاولة.</td></tr>';
            return;
        }

        const searchQ = document.getElementById('priceAdjSearch') ? document.getElementById('priceAdjSearch').value.toLowerCase().trim() : '';
        const catQ = document.getElementById('priceAdjCategory') ? document.getElementById('priceAdjCategory').value : 'all';

        let targets = [];

        if (selectedIds.length > 0 && !searchQ) {
            targets = productsDB.filter(p => selectedIds.includes(p.id));
        } else if (searchQ.length > 0 || catQ !== 'all') {
            targets = productsDB.filter(p => {
                const nameMatch = String(p.name || '').toLowerCase().includes(searchQ);
                const codeMatch = String(p.code || '').toLowerCase().includes(searchQ);
                const barcodeMatch = String(p.barcode || '').toLowerCase().includes(searchQ);
                const catMatch = (catQ === 'all') || (p.category === catQ);
                return (nameMatch || codeMatch || barcodeMatch) && catMatch;
            });
            if (targets.length > 500) targets = targets.slice(0, 500);
        } else {
            targets = productsDB;
        }

        window.priceAdjData = [];
        const currentWH = (typeof currentUser !== 'undefined' && currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';

        // إنشاء خريطة سريعة لآخر سعر شراء لتجنب فلترة المعاملات آلاف المرات
        const lastBuyMap = {};
        for (let i = transactions.length - 1; i >= 0; i--) {
            const t = transactions[i];
            if (t.product && t.type && t.type.includes('شراء') && !t.type.includes('مرتجع')) {
                if (lastBuyMap[t.product] === undefined) {
                    lastBuyMap[t.product] = parseFloat(t.price) || 0;
                }
            }
        }

        targets.forEach(p => {
            const itemName = p.name || 'صنف غير مسمى';
            const itemCode = p.code || '';
            const itemBarcode = p.barcode || '';
            const liveStock = parseFloat(p.stock) || 0;
            const liveAvgCost = parseFloat(p.cost) || 0; 
            const lastPPrice = lastBuyMap[itemName] !== undefined ? lastBuyMap[itemName] : liveAvgCost;

            if (!p.units || p.units.length === 0) {
                window.priceAdjData.push({
                    id: p.id,
                    unitIndex: -1,
                    name: itemName,
                    code: itemCode,
                    barcode: itemBarcode,
                    category: p.category || 'عام',
                    unit: p.unit || 'قطعة',
                    lastBuyPrice: lastPPrice,
                    avgBuyPrice: liveAvgCost,
                    wholesale: parseFloat(p.wholesale) || 0,
                    retail: parseFloat(p.price) || 0,
                    minPrice: parseFloat(p.minPrice) || 0,
                    discount: parseFloat(p.discount) || 0,
                    stock: liveStock,
                    profitMargin: (liveAvgCost > 0 && isFinite(liveAvgCost)) ? (((parseFloat(p.price) || 0) - liveAvgCost) / liveAvgCost * 100).toFixed(1) : '0.0'
                });
            } else {
                p.units.forEach((u, uIdx) => {
                    const uCost = (liveAvgCost * (u.factor || 1));
                    const uRetail = parseFloat(u.price) || 0;
                    window.priceAdjData.push({
                        id: p.id,
                        unitIndex: uIdx,
                        name: itemName,
                        code: itemCode,
                        barcode: itemBarcode,
                        category: p.category || 'عام',
                        unit: u.unitName,
                        lastBuyPrice: (lastPPrice * (u.factor || 1)),
                        avgBuyPrice: uCost,
                        wholesale: parseFloat(u.wholesale) || 0,
                        retail: uRetail,
                        minPrice: parseFloat(p.minPrice) || 0, 
                        discount: parseFloat(p.discount) || 0,
                        stock: liveStock / (u.factor || 1),
                        profitMargin: uCost > 0 ? ((uRetail - uCost) / uCost * 100).toFixed(1) : 0
                    });
                });
            }
        });

        renderPriceAdjustmentTable();
        updatePriceAdjStats();

        if (selectedIds.length > 0 && targets.length > 0) {
            showToast(`✅ تم تحميل عدد (${targets.length}) صنف و (${window.priceAdjData.length}) وحدة بيع`, 'success');
        }
    } catch (err) {
        console.error("Price Adjustment Data Load Error:", err);
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:50px; color:#ef4444;">❌ حدث خطأ أثناء المعالجة: ${err.message}</td></tr>`;
    }
}

function renderPriceAdjustmentTable(filteredData = null) {
    const tbody = document.getElementById('priceAdjustmentTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const dataToRender = filteredData || window.priceAdjData;

    if (dataToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:50px; color:#64748b;">ℹ️ لم يتم العثور على أي بيانات لعرضها.</td></tr>';
        if (document.getElementById('priceAdjCount')) document.getElementById('priceAdjCount').innerText = '0';
        return;
    }

    let htmlBuffer = [];
    dataToRender.forEach((p) => {
        const originalIndex = window.priceAdjData.findIndex(item => item.id === p.id && item.unitIndex === p.unitIndex);
        const isSubUnit = p.unitIndex > 0;
        const isEven = originalIndex % 2 === 0;
        const rowBg = isSubUnit ? 'rgba(255, 255, 255, 0.6)' : (isEven ? 'rgba(39, 174, 96, 0.1)' : 'rgba(197, 160, 89, 0.1)');
        const accentColor = isSubUnit ? '#94a3b8' : (isEven ? '#27ae60' : '#c9a84c');

        const profitVal = p.retail - p.avgBuyPrice;
        const profitPerc = p.avgBuyPrice > 0 ? (profitVal / p.avgBuyPrice * 100).toFixed(1) : 0;
        const profitColor = profitPerc > 20 ? '#16a34a' : (profitPerc > 5 ? '#ca8a04' : '#dc2626');

        htmlBuffer.push(`
            <tr style="background: ${rowBg}; border-bottom: 2px solid white; transition:0.3s;" data-orig-idx="${originalIndex}">
                <td class="col-adj-1" style="text-align:center; font-weight:bold; color:#64748b; border-right: 4px solid ${accentColor};">${originalIndex + 1}</td>
                <td class="col-adj-internal" style="text-align:center; font-weight:bold; color:#94a3b8; font-size:0.8rem;">${p.code || '-'}</td>
                <td class="col-adj-2" style="font-weight:bold; color:var(--main-purple); text-align:center;">${p.sysCode || p.id}</td>
                <td class="col-adj-3" style="font-weight:700; color:#1e293b; ${isSubUnit ? 'padding-right:20px;' : ''}">
                    ${p.name}
                </td>
                <td class="col-adj-4" style="text-align:center; font-size:0.8rem;">${p.barcode || '-'}</td>
                <td class="col-adj-6" style="font-size:0.8rem; text-align:center;">
                    <span style="display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:6px; font-weight:bold; ${isSubUnit ? 'background:#e2e8f0; color:#475569;' : 'background:#dcfce7; color:#15803d; border:1px solid #86efac;'}">
                        ${isSubUnit ? '🔹' : '⭐'} ${p.unit || "قطعة"} ${isSubUnit ? '(فرعية)' : '(أساسية)'}
                    </span>
                </td>
                <td class="col-adj-12" style="text-align: center; font-weight: 900; color: #9a3412; background: #fffcf0; padding: 10px; border: 1px solid #fee2e2;">
                    ${p.avgBuyPrice.toFixed(2)}
                </td>
                <td class="col-adj-11" style="background:rgba(255,255,255,0.4); font-weight:bold; color:#991b1b; text-align:center;">${p.lastBuyPrice.toFixed(2)}</td>
                <td class="col-adj-13" style="padding: 5px;">
                    <input type="number" value="${p.wholesale}" 
                        style="width:100%; border:2px solid ${accentColor}; padding:6px; border-radius:6px; text-align:center; font-weight:900; background:white;" 
                        onchange="updateRowPriceAdj(${originalIndex}, 'wholesale', this.value)">
                </td>
                <td class="col-adj-10" style="padding: 5px;">
                    <input type="number" value="${p.retail}" 
                        style="width:100%; border:2px solid ${accentColor}; padding:6px; border-radius:6px; text-align:center; font-weight:900; background:white;" 
                        onchange="updateRowPriceAdj(${originalIndex}, 'retail', this.value)">
                </td>
                <td class="col-adj-profit" style="padding: 5px; text-align: center; font-weight: 900; color: ${profitColor}; background: rgba(255,255,255,0.5);">
                    ${profitPerc}%
                </td>
                <td class="col-adj-min" style="padding: 5px;">
                    <input type="number" value="${p.minPrice}" 
                        style="width:100%; border:1px solid #cbd5e1; padding:6px; border-radius:6px; text-align:center; background:white;" 
                        onchange="updateRowPriceAdj(${originalIndex}, 'minPrice', this.value)">
                </td>
                <td class="col-adj-9" style="text-align:center; font-weight:900; color:#334155; background:rgba(255,255,255,0.2);">${Number(p.stock).toFixed(2).replace(/\.00$/, '')}</td>
            </tr>
        `);
    });
    tbody.innerHTML = htmlBuffer.join('');
    if (document.getElementById('priceAdjCount')) document.getElementById('priceAdjCount').innerText = dataToRender.length;

    if (typeof applyPriceAdjColumnVisibility === 'function') applyPriceAdjColumnVisibility();
}

async function updateRowPriceAdj(adjIndex, field, value) {
    const item = window.priceAdjData[adjIndex];
    if (item) {
        const newValue = parseFloat(value) || 0;
        item[field] = newValue;

        if (field === 'retail' || field === 'avgBuyPrice') {
            item.profitMargin = item.avgBuyPrice > 0 ? ((item.retail - item.avgBuyPrice) / item.avgBuyPrice * 100).toFixed(1) : 0;
        }

        renderPriceAdjustmentTable(window.priceAdjCurrentFiltered);
        updatePriceAdjStats();

        try {
            const pInDB = await db.products.get(item.id);
            if (pInDB) {
                if (item.unitIndex === -1) {
                    if (field === 'retail') pInDB.price = newValue;
                    else if (field === 'wholesale') pInDB.wholesale = newValue;
                    else if (field === 'minPrice') pInDB.minPrice = newValue;
                    else if (field === 'discount') pInDB.discount = newValue;
                    else if (field === 'avgBuyPrice') pInDB.cost = newValue;
                    
                    // Sync base unit (factor 1 or first unit) so that prices are consistent in sales/purchases
                    if (pInDB.units && pInDB.units.length > 0) {
                        const baseU = pInDB.units.find(u => parseFloat(u.factor) === 1) || pInDB.units[0];
                        if (baseU) {
                            if (field === 'retail') baseU.price = newValue;
                            else if (field === 'wholesale') baseU.wholesale = newValue;
                            else if (field === 'avgBuyPrice') baseU.cost = newValue;
                        }
                    }
                } else {
                    if (pInDB.units && pInDB.units[item.unitIndex]) {
                        if (field === 'retail') pInDB.units[item.unitIndex].price = newValue;
                        else if (field === 'wholesale') pInDB.units[item.unitIndex].wholesale = newValue;
                        else if (field === 'avgBuyPrice') pInDB.units[item.unitIndex].cost = newValue;

                        if (item.unitIndex === 0) {
                            if (field === 'retail') pInDB.price = newValue;
                            else if (field === 'wholesale') pInDB.wholesale = newValue;
                            else if (field === 'avgBuyPrice') pInDB.cost = newValue;
                        }
                    }
                }
                await db.products.put(pInDB);
                productsDB = await db.products.toArray();
            }
        } catch (err) {
            console.error("Auto-save failed:", err);
        }
    }
}

window.priceAdjCurrentFiltered = null;

function handlePriceAdjSearch() {
    const query = document.getElementById('priceAdjSearch')?.value.toLowerCase() || '';
    const cat = document.getElementById('priceAdjCategory')?.value || 'all';
    const stockFilter = document.getElementById('priceAdjStockFilter')?.value || 'all';

    const filtered = window.priceAdjData.filter(p => {
        const nameMatch = p.name.toLowerCase().includes(query) || 
                         (p.barcode && p.barcode.includes(query)) ||
                         (p.code && String(p.code).includes(query));

        const catMatch = (cat === 'all' || p.category === cat);

        let stockMatch = true;
        if (stockFilter === 'in') stockMatch = (p.stock > 0);
        else if (stockFilter === 'out') stockMatch = (p.stock <= 0);

        return nameMatch && catMatch && stockMatch;
    });

    const isFiltered = query !== '' || cat !== 'all' || stockFilter !== 'all';
    window.priceAdjCurrentFiltered = isFiltered ? filtered : null;
    renderPriceAdjustmentTable(filtered);
}

async function applyBulkPriceAdjustment(direction = 1) {
    const inputEl = document.getElementById('priceAdjBulkPercent');
    const inputVal = parseFloat(inputEl ? inputEl.value : 0);
    if (isNaN(inputVal) || inputVal <= 0) {
        if (typeof showToast === 'function') showToast("⚠️ يرجى إدخال نسبة مئوية صحيحة (مثلاً 5 أو 10)", "warning");
        else alert("⚠️ يرجى إدخال نسبة مئوية صحيحة");
        if (inputEl) { inputEl.focus(); inputEl.select(); }
        return;
    }

    const percent = inputVal * direction;
    const targetSelect = document.getElementById('priceAdjBulkTarget');
    const targetType = targetSelect ? targetSelect.value : 'both';

    const targetItems = (window.priceAdjCurrentFiltered && window.priceAdjCurrentFiltered.length > 0) 
        ? window.priceAdjCurrentFiltered 
        : (window.priceAdjData || []);

    if (!targetItems || targetItems.length === 0) {
        if (typeof showToast === 'function') showToast("❌ لا توجد أصناف في الجدول لتعديلها", "error");
        else alert("❌ لا توجد أصناف في الجدول لتعديلها");
        return;
    }

    const targetTypeName = targetType === 'retail' ? 'سعر القطاعي' : (targetType === 'wholesale' ? 'سعر الجملة' : 'سعر القطاعي والجملة معاً');

    const factor = 1 + (percent / 100);

    // تطبيق التعديل الفوري على البيانات
    targetItems.forEach(p => {
        if (targetType === 'retail' || targetType === 'both') {
            const currentRetail = parseFloat(p.retail) || 0;
            p.retail = Number((Math.round(currentRetail * factor * 100) / 100).toFixed(2));
            if (p.minPrice > 0) {
                p.minPrice = Number((Math.round(parseFloat(p.minPrice) * factor * 100) / 100).toFixed(2));
            }
        }
        if (targetType === 'wholesale' || targetType === 'both') {
            const currentWS = parseFloat(p.wholesale) || 0;
            p.wholesale = Number((Math.round(currentWS * factor * 100) / 100).toFixed(2));
        }
        const buyCost = parseFloat(p.avgBuyPrice) || 0;
        p.profitMargin = buyCost > 0 ? (((parseFloat(p.retail) || 0) - buyCost) / buyCost * 100).toFixed(1) : 0;
    });

    // إعادة رسم الجدول فوراً بالقيم الجديدة
    renderPriceAdjustmentTable(window.priceAdjCurrentFiltered);
    updatePriceAdjStats();

    // الحفظ في قاعدة البيانات IndexedDB
    try {
        const grouped = {};
        targetItems.forEach(item => {
            if (!grouped[item.id]) grouped[item.id] = [];
            grouped[item.id].push(item);
        });

        for (let prodId in grouped) {
            const idNum = parseInt(prodId);
            let pInDB = null;
            if (typeof db !== 'undefined' && db.products) {
                pInDB = await db.products.get(idNum);
            }
            if (!pInDB) {
                pInDB = (productsDB || []).find(x => x.id === idNum);
            }

            if (pInDB) {
                const changes = grouped[prodId];
                changes.forEach(ch => {
                    if (ch.unitIndex === -1) {
                        if (targetType === 'retail' || targetType === 'both') {
                            pInDB.price = ch.retail;
                            pInDB.minPrice = ch.minPrice;
                        }
                        if (targetType === 'wholesale' || targetType === 'both') {
                            pInDB.wholesale = ch.wholesale;
                        }
                    } else {
                        if (pInDB.units && pInDB.units[ch.unitIndex]) {
                            if (targetType === 'retail' || targetType === 'both') pInDB.units[ch.unitIndex].price = ch.retail;
                            if (targetType === 'wholesale' || targetType === 'both') pInDB.units[ch.unitIndex].wholesale = ch.wholesale;

                            if (ch.unitIndex === 0) {
                                if (targetType === 'retail' || targetType === 'both') {
                                    pInDB.price = ch.retail;
                                    pInDB.minPrice = ch.minPrice;
                                }
                                if (targetType === 'wholesale' || targetType === 'both') {
                                    pInDB.wholesale = ch.wholesale;
                                }
                            }
                        }
                    }
                });

                if (typeof db !== 'undefined' && db.products) {
                    await db.products.put(pInDB);
                }
            }
        }

        if (typeof saveData === 'function') saveData();
        if (typeof renderInventoryTable === 'function') renderInventoryTable();

        if (typeof showToast === 'function') {
            showToast(`✅ تم تطبيق ${percent > 0 ? 'زيادة' : 'خفض'} (${Math.abs(percent)}%) على ${targetTypeName} بنجاح!`, 'success');
        }
    } catch (err) {
        console.error("Bulk price error:", err);
        if (typeof showToast === 'function') {
            showToast(`✅ تم تحديث الأسعار (${percent > 0 ? '+' : ''}${percent}%) بنجاح`, 'success');
        }
    }
}

function updatePriceAdjStats() {
    let totalCost = 0;
    let totalSale = 0;
    if (window.priceAdjData) {
        window.priceAdjData.forEach(p => {
            if (p.unitIndex === -1 || p.unitIndex === 0) {
                const rowCost = p.avgBuyPrice * p.stock;
                const rowProfit = (p.retail > 0) ? (p.retail - p.avgBuyPrice) * p.stock : 0;

                totalCost += rowCost;
                totalSale += (rowCost + rowProfit);
            }
        });
    }
    if (document.getElementById('priceAdjTotalCost')) document.getElementById('priceAdjTotalCost').innerText = totalCost.toFixed(2);
    if (document.getElementById('priceAdjTotalSale')) document.getElementById('priceAdjTotalSale').innerText = totalSale.toFixed(2);
}

async function savePriceAdjustments() {
    if (typeof window.enforceSubscriptionCheck === 'function' && !window.enforceSubscriptionCheck('other')) return false;
    if (!window.priceAdjData || window.priceAdjData.length === 0) {
        closePriceAdjustmentModal();
        return;
    }
    closePriceAdjustmentModal();
    showToast("🔄 جاري حفظ التعديلات في الخلفية...", 'info');

    try {
        const grouped = {};
        window.priceAdjData.forEach(item => {
            if (!grouped[item.id]) grouped[item.id] = [];
            grouped[item.id].push(item);
        });

        for (let prodId in grouped) {
            const idNum = parseInt(prodId);
            const pInDB = await db.products.get(idNum);

            if (pInDB) {
                const changes = grouped[prodId];
                changes.forEach(ch => {
                    if (ch.unitIndex === -1) {
                        pInDB.price = ch.retail;
                        pInDB.wholesale = ch.wholesale;
                        pInDB.minPrice = ch.minPrice;
                        pInDB.discount = ch.discount;
                        pInDB.cost = ch.avgBuyPrice; 
                    } else {
                        if (pInDB.units && pInDB.units[ch.unitIndex]) {
                            pInDB.units[ch.unitIndex].price = ch.retail;
                            pInDB.units[ch.unitIndex].wholesale = ch.wholesale;
                            pInDB.units[ch.unitIndex].cost = ch.avgBuyPrice; 

                            if (ch.unitIndex === 0) {
                                pInDB.price = ch.retail;
                                pInDB.wholesale = ch.wholesale;
                                pInDB.minPrice = ch.minPrice;
                                pInDB.discount = ch.discount;
                                pInDB.cost = ch.avgBuyPrice;
                            }
                        }
                    }
                });
                await db.products.put(pInDB);
            }
        }

        if (typeof syncProductsToSupabase === 'function' && typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                if (typeof toggleStatus === 'function') toggleStatus('cloud', 'sync');
                await syncProductsToSupabase();
            } catch(e) { console.warn("Cloud sync deferred:", e); }
        }

        productsDB = await db.products.toArray();

        showToast("✅ تم حفظ كافة تعديلات الأسعار بنجاح!", 'success');

        if (typeof renderInventoryTable === 'function') renderInventoryTable();
        if (typeof renderWarehouseReportTable === 'function') renderWarehouseReportTable();
        if (typeof renderProductsGrid === 'function') renderProductsGrid();
        if (typeof updateInventoryStats === 'function') updateInventoryStats();
        if (typeof updateDashboard === 'function') updateDashboard();

    } catch (error) {
        console.error("Error saving prices:", error);
        alert("❌ حدث خطأ أثناء الحفظ: " + error.message);
    }
}

document.addEventListener('keydown', (e) => {
    const activeTab = (typeof openTabs !== 'undefined') ? openTabs.find(t => t.id === activeTabId) : null;
    if (activeTab && activeTab.type === 'inventory') {
        const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
        if (!isInput && e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const searchInput = document.getElementById('invSearchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }
});

function initBarcodeScannerHandlers() {
    const bcInput = document.getElementById('newItemBarcode');
    if (!bcInput || bcInput._hasBarcodeHandlers) return;
    bcInput._hasBarcodeHandlers = true;

    bcInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nameInp = document.getElementById('newItemName');
            if (nameInp) nameInp.focus();
        }
    });

    bcInput.addEventListener('change', async (e) => {
        const val = e.target.value.trim();
        if (val) {
            const curEditId = typeof currentEditingProductId !== 'undefined' ? currentEditingProductId : null;
            if (typeof BayanBarcode !== 'undefined' && BayanBarcode.isDuplicate(val, curEditId)) {
                const exists = productsDB.find(p => p.barcode === val && p.id !== curEditId);
                const pName = exists ? exists.name : '';
                if (typeof showToast === 'function') {
                    showToast(`⚠️ تنبيه: هذا الباربود مسجل مسبقاً لصنف (${pName})`, 'warning');
                }
                if (typeof BayanBarcode !== 'undefined') BayanBarcode.playBeep(false);
                bcInput.style.border = '2px solid red';
            } else {
                bcInput.style.border = '1px solid #ddd';
            }
        }
    });
}
setTimeout(initBarcodeScannerHandlers, 1000);

function exportPriceAdjToExcel() {
    try {
        const XLSXLib = (typeof getXLSXLibrary === 'function' ? getXLSXLibrary() : (typeof XLSX !== 'undefined' ? XLSX : (typeof window.XLSX !== 'undefined' ? window.XLSX : null)));
        
        const query = document.getElementById('priceAdjSearch')?.value.toLowerCase() || '';
        const cat = document.getElementById('priceAdjCategory')?.value || 'all';
        const stockFilter = document.getElementById('priceAdjStockFilter')?.value || 'all';

        const filtered = (window.priceAdjData || []).filter(p => {
            const nameMatch = p.name.toLowerCase().includes(query) || 
                             (p.barcode && String(p.barcode).toLowerCase().includes(query)) ||
                             (p.code && String(p.code).toLowerCase().includes(query));
            const catMatch = (cat === 'all' || p.category === cat);
            let stockMatch = true;
            if (stockFilter === 'in') stockMatch = (p.stock > 0);
            else if (stockFilter === 'out') stockMatch = (p.stock <= 0);
            return nameMatch && catMatch && stockMatch;
        });

        if (filtered.length === 0) {
            if (typeof showToast === 'function') showToast("⚠️ لا توجد بيانات لتصديرها حالياً", "warning");
            else alert("⚠️ لا توجد بيانات لتصديرها حالياً.");
            return;
        }

        const tableData = [];
        const headerRow = ["مسلسل", "الكود الداخلي", "كود الصنف", "اسم الصنف", "الباركود", "الوحدة", "متوسط التكلفة", "آخر شراء", "سعر الجملة", "سعر القطاعي", "نسبة الربح %", "أدنى سعر", "الرصيد الفعلي"];
        tableData.push(headerRow);

        filtered.forEach((p, index) => {
            tableData.push([
                index + 1,
                p.sysCode || p.id,
                p.code || "-",
                p.name,
                p.barcode || "",
                p.unit || "قطعة",
                p.avgBuyPrice ? parseFloat(p.avgBuyPrice).toFixed(2) : "0.00",
                p.lastBuyPrice ? parseFloat(p.lastBuyPrice).toFixed(2) : "0.00",
                p.wholesale ? parseFloat(p.wholesale).toFixed(2) : "0.00",
                p.retail ? parseFloat(p.retail).toFixed(2) : "0.00",
                (p.profitMargin || 0) + "%",
                p.minPrice ? parseFloat(p.minPrice).toFixed(2) : "0.00",
                p.stock
            ]);
        });

        const fileName = `تقرير_أسعار_المخزن_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}`;

        if (XLSXLib && XLSXLib.utils) {
            try {
                const ws = XLSXLib.utils.aoa_to_sheet(tableData);
                const wb = XLSXLib.utils.book_new();
                XLSXLib.utils.book_append_sheet(wb, ws, "أسعار المخزون");
                XLSXLib.writeFile(wb, `${fileName}.xlsx`);
                if (typeof showToast === 'function') showToast("✅ تم تصدير ملف الإكسيل بنجاح", "success");
                return;
            } catch (err) {
                console.warn("XLSX lib error, switching to direct download:", err);
            }
        }

        if (typeof downloadAOAAsExcelCSV === 'function') {
            downloadAOAAsExcelCSV(tableData, fileName);
        } else if (typeof window.downloadAOAAsExcelCSV === 'function') {
            window.downloadAOAAsExcelCSV(tableData, fileName);
        }
    } catch (err) {
        console.error("Export Error:", err);
        if (typeof showToast === 'function') showToast("❌ حدث خطأ أثناء التصدير", "error");
    }
}
window.exportPriceAdjToExcel = exportPriceAdjToExcel;
