// تهيئة قائمة المعرفات المختارة لتظل محفوظة عند التنقل بين الأقسام
window.selectedInventoryIds = window.selectedInventoryIds || new Set();

// دالة مساعدة لحساب متوسط التكلفة لصنف واحد بناءً على الحركات
window.getProductAverageCost = function(productName, fallbackCost = 0) {
    if (!productName) return parseFloat(fallbackCost) || 0;

    const cleanName = productName.trim().toLowerCase();
    let totalCost = 0;
    let totalQty = 0;

    const pRef = productsDB.find(x => x.name.trim().toLowerCase() === cleanName);
    if (!pRef) return parseFloat(fallbackCost) || 0;

    transactions.forEach(t => {
        if (!t.product || t.product.trim().toLowerCase() !== cleanName) return;

        // حساب المتوسط بناءً على فواتير الشراء فقط (توريد شراء)
        if (t.type.includes('شراء') && !t.type.includes('مرتجع')) {
            let factor = 1;
            if (pRef.units && t.unit) {
                const u = pRef.units.find(un => un.unitName === t.unit);
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

    // إذا كانت هناك مشتريات، نحسب المتوسط. إذا لم يوجد، نأخذ التكلفة المسجلة في كارت الصنف
    if (totalQty > 0) {
        return totalCost / totalQty;
    } else {
        return parseFloat(pRef.cost) || parseFloat(fallbackCost) || 0;
    }
};

// دالة مساعدة لحساب آخر سعر شراء لصنف واحد بناءً على الحركات
window.getProductLastPurchasePrice = function(productName, fallbackCost = 0) {
    if (!productName) return parseFloat(fallbackCost) || 0;

    const cleanName = productName.trim().toLowerCase();

    const pRef = productsDB.find(x => x.name.trim().toLowerCase() === cleanName);
    if (!pRef) return parseFloat(fallbackCost) || 0;

    // البحث في الحركات من الأحدث إلى الأقدم عن آخر سعر شراء
    for (let i = transactions.length - 1; i >= 0; i--) {
        const t = transactions[i];
        if (!t.product || t.product.trim().toLowerCase() !== cleanName) continue;

        // فواتير الشراء فقط (توريد شراء)
        if (t.type.includes('شراء') && !t.type.includes('مرتجع')) {
            let factor = 1;
            if (pRef.units && t.unit) {
                const u = pRef.units.find(un => un.unitName === t.unit);
                if (u) factor = parseFloat(u.factor) || 1;
            }
            // حساب السعر المحسوب للوحدة الأساسية
            const basePrice = (parseFloat(t.price) || 0) / factor;
            if (basePrice > 0) {
                return basePrice;
            }
        }
    }

    // إذا لم توجد حركات شراء، نأخذ التكلفة المسجلة في كارت الصنف
    return parseFloat(pRef.cost) || parseFloat(fallbackCost) || 0;
};

function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    if (!hasPermission('stock_view')) {
        tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center; padding:50px; color:#64748b; font-weight:bold;">🚫 ليس لديك صلاحية لعرض المخزن</td></tr>';
        return;
    }

    const searchInput = document.getElementById('invSearchInput');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const catFilter = document.getElementById('invCategoryFilter')?.value || 'all';

    if (search === '' && typeof updateCategoryFilterOptions === 'function') updateCategoryFilterOptions();

    tbody.innerHTML = '';
    let totalStockSum = 0;
    let totalItemsDisplay = 0;

            //  تحسين الأداء: حساب الأرصدة في مرور واحد فقط
            const summary = {};
            const currentWH = ((currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي').trim();

            transactions.forEach(t => {
                const pName = t.product;
                if (!pName) return;

                // البحث عن المنتج للحصول على معامل التحويل للوحدة المستخدمة في الحركة
                const pRef = productsDB.find(x => x.name === pName);
                let factor = 1;
                if (pRef && t.unit && pRef.units) {
                    const u = pRef.units.find(un => un.unitName === t.unit);
                    if (u) factor = parseFloat(u.factor) || 1;
                }

                if (!summary[pName]) summary[pName] = { in: 0, out: 0, lastPur: 0, totalCost: 0, totalQty: 0, wStock: 0, globalChange: 0 };
                const s = summary[pName];

                // توحيد الكمية والسعر بناءً على معامل تحويل الوحدة (التحويل للوحدة الأساسية)
                const qty = (parseFloat(t.qty || 0)) * factor; 
                const price = (parseFloat(t.price || 0)) / factor; // سعر الوحدة الأساسية

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
                    change = type.includes('+') ? qty : -qty;
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
            });

            productsDB.forEach((p, idx) => {
                const s = summary[p.name] || { in: 0, out: 0, lastPur: 0, totalCost: 0, totalQty: 0, wStock: 0, globalChange: 0 };
                const initialBal = (parseFloat(p.stock) || 0) - s.globalChange;

                // تحسين: إذا كان هذا هو المخزن النشط الوحيد أو كان اسمه المخزن الرئيسي سابقاً
                const isMainWH = (currentWH === 'المخزن الرئيسي' || warehouses.length === 1 || (warehouses[0] && warehouses[0].name.trim() === currentWH));
                const currentStock = isMainWH ? (initialBal + s.wStock) : s.wStock;
                const avgCost = s.totalQty > 0 ? (s.totalCost / s.totalQty) : (parseFloat(p.cost) || 0);
                const retail = parseFloat(p.price) || 0;
                const profitMargin = retail > 0 ? (((retail - avgCost) / retail) * 100).toFixed(1) : 0;
                const marginColor = profitMargin < 10 ? '#ef4444' : (profitMargin > 30 ? '#10b981' : '#f59e0b');

                if (!p.name.toLowerCase().includes(search) && !(p.barcode && String(p.barcode).includes(search)) && !(p.code && String(p.code).includes(search))) return;
                if (catFilter !== 'all' && p.category !== catFilter) return;

                if (currentInvFilter === 'active' && currentStock <= 0) return;
                if (currentInvFilter === 'low' && (currentStock > 5 || currentStock <= 0)) return;
                if (currentInvFilter === 'zero' && currentStock > 0) return;

                totalStockSum += currentStock;
                totalItemsDisplay++;

                let baseUnitName = (p.unit && p.unit !== 'وحدة') ? p.unit : "قطعة";
                let detailed = `${Number(currentStock.toFixed(2))} ${baseUnitName}`;

                if (p.units && p.units.length > 1) {
                    // نعتبر أول وحدة في المصفوفة هي الأساسية (factor = 1)
                    const baseUnitObj = p.units[0];
                    baseUnitName = baseUnitObj.unitName;

                    // نعتبر أي وحدة معاملها أصغر من 1 هي الفرعية
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

                const tr = document.createElement('tr');
                tr.onclick = (e) => toggleInventoryRowSelection(p.id, tr, e);
                tr.setAttribute('data-id', p.id);
                if (window.selectedInventoryIds.has(p.id)) tr.classList.add('selected-row-gold');

                const displayStock = Number(currentStock.toFixed(3)); // تقريب لـ 3 أرقام عشرية في الرصيد النهائي

                const isLowStock = currentStock <= (parseFloat(p.minStock) || 0) && currentStock > 0;
                const isOutOfStock = currentStock <= 0;
                let rowBg = '';
                if (isOutOfStock) rowBg = 'rgba(231, 76, 60, 0.08)';
                else if (isLowStock) rowBg = 'rgba(243, 156, 18, 0.08)';

                tr.style.background = rowBg;

                tr.innerHTML = `
                    <td onclick="handleInventoryCheckClick(event, ${p.id}, this.parentElement)" class="col-inv-0"><input type="checkbox" class="inv-row-check" ${window.selectedInventoryIds.has(p.id) ? 'checked' : ''}></td>
                    <td class="col-inv-1">${idx + 1}</td>
                    <td class="col-inv-quick" style="text-align:center;">
                        <button onclick="toggleQuickStatus(event, ${p.id})" 
                            style="background:none; border:none; cursor:pointer; font-size:1.2rem; transition:0.3s; transform: ${p.isQuick ? 'scale(1.2)' : 'scale(1)'}; opacity: ${p.isQuick ? '1' : '0.2'};"
                            title="${p.isQuick ? 'إزالة من الأصناف السريعة' : 'إضافة للأصناف السريعة'}">
                            ${p.isQuick ? '⭐' : '⭐'}
                        </button>
                    </td>
                    <td class="col-inv-2" style="color:var(--main-green); font-weight:bold;">${p.sysCode || p.id}</td>
                    <td class="col-inv-internal" style="color:#64748b;">${p.code || '-'}</td>
                    <td class="col-inv-3" style="font-weight:bold;">${p.name}</td>
                    <td class="col-inv-4">${p.barcode || '-'}</td>
                    <td class="col-inv-5">${p.shelf || '---'}</td>
                    <td class="col-inv-6 num-cell">${(currentStock - s.in + s.out).toFixed(2)}</td>
                    <td class="col-inv-7 num-cell" style="color:var(--main-green);">${s.in.toFixed(2)}</td>
                    <td class="col-inv-8 num-cell" style="color:#c0392b;">${s.out.toFixed(2)}</td>
                    <td class="col-inv-13 num-cell" style="color:var(--main-orange); font-weight:900;">${(parseFloat(p.wholesale) || 0).toFixed(2)}</td>
                    <td class="col-inv-10 num-cell" style="color:var(--main-blue); font-weight:900;">${retail.toFixed(2)}</td>
                    <td class="col-inv-margin" style="text-align:center; font-weight:bold; color:${marginColor}">${profitMargin}%</td>
                    <td class="col-inv-11 num-cell" style="color:#333;">${s.lastPur.toFixed(2)}</td>
                    <td class="col-inv-12 num-cell" style="color:#666;">${avgCost.toFixed(2)}</td>
                    <td class="col-inv-detailed" style="font-size:0.9rem; text-align:center;">${detailed}</td>
                    <td class="col-inv-9 num-cell" style="font-size:1.1rem; font-weight:900; color:${currentStock <= 0 ? 'red' : 'var(--main-green)'}">${displayStock}</td>
                `;
                tbody.appendChild(tr);
            });

            applyInventoryColumnVisibility();
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
                    // جعل طول شريط التمرير العلوي مساوياً تماماً لعرض الجدول
                    filler.style.width = table.offsetWidth + 'px';
                    
                    // مزامنة الاتجاهين عند السحب مع تجنب التكرار اللانهائي للأحداث لتحسين الأداء
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
            let targetId = selectedInventoryId;
            if (!targetId) {
                const checked = document.querySelector('.inv-row-check:checked');
                if (checked) targetId = parseInt(checked.closest('tr').getAttribute('data-id'));
            }

            if (!targetId) return showToast("⚠️ يرجى اختيار صنف أولاً", "error");

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

            // مزامنة سحابية إذا كانت متاحة
            if (typeof syncProductsToSupabase === 'function' && supabaseClient) {
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

            // تحديث الواجهة فوراً
            renderInventoryTable();
            if (typeof renderQuickItems === 'function') renderQuickItems();

            const action = p.isQuick ? "إضافته للأصناف السريعة ⭐" : "إزالته من الأصناف السريعة";
            showToast(`✅ تم ${action} بنجاح`, "success");
        }
        window.toggleQuickStatus = toggleQuickStatus;
        function shareWarehouseReport(platform) {
            let summaryText = '';
            let grandVal = 0;
            let shopName = (typeof systemConfig !== 'undefined' && systemConfig.shopName) ? systemConfig.shopName : (document.getElementById('shopName')?.value || 'متجر بيان');

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
                    summaryText += '¢ *' + w.name + '*: (حوالي ' + iCount + ' صنف) | كمية: ' + qSum + ' | قيمة: ' + vSum.toLocaleString() + ' ج.م\n';
                    grandVal += vSum;
                }
            });

            let text = ' *أرصدة المخازن - ' + shopName + '*\n';
            text += ` بتاريخ: ${new Date().toLocaleDateString('ar-EG')}\n`;
            text += `--------------------------\n`;
            text += summaryText;
            text += `--------------------------\n`;
            text += ` *إجمالي قيمة البضاعة*: *${grandVal.toLocaleString()} ج.م*\n`;
            text += `✅ تم استخراجه من نظام بيان POS.`;

            const encodedText = encodeURIComponent(text);
            let url = platform === 'whatsapp' ? `https://wa.me/?text=${encodedText}` : `https://t.me/share/url?url=${encodedText}`;
            window.open(url, '_blank');
        }
        function updateCategoryFilterOptions() {
            const filter = document.getElementById('invCategoryFilter');
            if (!filter) return;

            const currentVal = filter.value;
            // جمع كافة التصنيفات الفريدة من قاعدة بيانات الأصناف
            const categories = [...new Set(productsDB.map(p => p.category).filter(c => c))];

            filter.innerHTML = '<option value="all"> كافة التصنيفات</option>';
            categories.sort().forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.innerText = ` ${cat}`;
                filter.appendChild(opt);
            });

            //الحفاظ على الاختيار الحال ي إن وÙجد
            if ([...filter.options].some(o => o.value === currentVal)) {
                filter.value = currentVal;
            }
        }

        window.toggleWrColMenu = function(event) {
            if (event) event.stopPropagation();
            const menu = document.getElementById('wrColMenu');
            if (menu) menu.classList.toggle('hidden');
        };

        window.toggleWrCol = function(colClass, isVisible) {
            const settings = JSON.parse(localStorage.getItem('wrColSettings') || '{}');
            settings[colClass] = isVisible;
            localStorage.setItem('wrColSettings', JSON.stringify(settings));
            applyWrColVisibility();
        };

        window.applyWrColVisibility = function() {
            const settings = JSON.parse(localStorage.getItem('wrColSettings') || '{"col-wr-cost":true,"col-wr-total-val":true,"col-wr-profit-wh":true,"col-wr-profit-rt":true}');
            Object.keys(settings).forEach(colClass => {
                const isVisible = settings[colClass];
                document.querySelectorAll('.' + colClass).forEach(el => {
                    el.style.display = isVisible ? '' : 'none';
                });

                // تحديث حالة الـ checkbox في المودال
                const checkbox = document.querySelector(`input[onchange*="'${colClass}'"]`);
                if (checkbox) checkbox.checked = isVisible;
            });
        };

        function renderWarehouseReportTable() {
            const head = document.getElementById('wrTableHead');
            const body = document.getElementById('wrTableBody');
            const summaryContainer = document.getElementById('wrSummaryCards');
            const searchInput = document.getElementById('wrSearchInput');
            const search = searchInput ? searchInput.value.toLowerCase() : '';
            const settings = JSON.parse(localStorage.getItem('wrColSettings') || '{}');

            if (!head || !body) return;

            // تحديث قائمة المخازن في التخصيص إذا كانت فارغة
            const whToggles = document.getElementById('wrWarehouseToggles');
            if (whToggles && whToggles.children.length <= 1) {
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
                localStorage.setItem('wrColSettings', JSON.stringify(settings));
            }

            // 1. بناء الهيدر الديناميكي (مطابق للصورة تماماً)
            let headHTML = `
                <tr style="background: #f8fafc; color: #1e293b; border-bottom: 2px solid #e2e8f0;">
                    <th style="width:50px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0; border-radius: 12px 0 0 0;">#</th>
                    <th style="width:100px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0;">الكود</th>
                    <th style="padding: 15px; text-align: right; font-weight: 800; border: 1px solid #e2e8f0; padding-right: 20px;">اسم الصنف</th>
                    <th class="col-wr-cost" style="width:100px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0;">التكلفة</th>
            `;

            warehouses.forEach(w => {
                const colClass = `col-wh-${w.name.replace(/\s+/g, '_')}`;
                headHTML += `<th class="${colClass}" style="min-width:110px; padding: 15px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0;">كمية ${w.name}</th>`;
            });

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
            let warehouseStats = warehouses.map(w => ({ name: w.name, qty: 0, val: 0, items: 0 }));

            // 2. تصفية الأصناف وعرضها
            const filteredProducts = productsDB.filter(p => 
                p.name.toLowerCase().includes(search) || 
                (p.barcode && String(p.barcode).toLowerCase().includes(search)) ||
                (p.code && String(p.code).toLowerCase().includes(search))
            );

            filteredProducts.forEach((p, idx) => {
                const cost = parseFloat(p.cost) || 0;
                let rowQty = 0;
                let warehouseCols = '';

                warehouses.forEach((w, wIdx) => {
                    const colClass = `col-wh-${w.name.replace(/\s+/g, '_')}`;
                    const st = getWarehouseStock(p.name, w.name, wrFilterState.startDate, wrFilterState.endDate);
                    rowQty += st;
                    warehouseStats[wIdx].qty += st;
                    warehouseStats[wIdx].val += (st * cost);
                    if (st !== 0) warehouseStats[wIdx].items++;

                    warehouseCols += `<td class="${colClass} num-cell" style="font-weight:900; color:${st < 0 ? '#ef4444' : (st > 0 ? '#10b981' : '#94a3b8')}; border-left: 1px solid #f1f5f9;">${st}</td>`;
                });

                const rowValue = rowQty * cost;
                const retailPrice = parseFloat(p.price) || 0;
                const wholesalePrice = parseFloat(p.wholesale) || 0;

                // حساب الربح فقط إذا كان سعر البيع أكبر من صفر لتجنب الأرقام السالبة عند ترك السعر فارغاً
                const rowProfitWH = (wholesalePrice > 0) ? rowQty * (wholesalePrice - cost) : 0;
                const rowProfitRT = (retailPrice > 0) ? rowQty * (retailPrice - cost) : 0;

                totalGlobalQty += rowQty;
                totalGlobalValue += rowValue;
                totalGlobalProfitWH += rowProfitWH;
                totalGlobalProfitRT += rowProfitRT;

                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid #f1f5f9";
                tr.style.transition = "0.2s";
                tr.onmouseover = () => tr.style.background = "#f8fafc";
                tr.onmouseout = () => tr.style.background = "transparent";

                tr.innerHTML = `
                    <td style="text-align:center; color:#94a3b8; font-size: 0.8rem;">${idx + 1}</td>
                    <td style="text-align:center; font-weight:bold; color:#5e3370;">${p.code || p.id}</td>
                    <td style="text-align:right; font-weight:800; color: #1e293b; padding-right: 20px;">${p.name}</td>
                    <td class="col-wr-cost num-cell" style="color:#64748b; font-weight: 700;">${cost.toFixed(2)}</td>
                    ${warehouseCols}
                    <td class="num-cell" style="background:rgba(212,175,55,0.05); font-weight:900; color:#8c6a24; font-size: 1.1rem;">${rowQty}</td>
                    <td class="col-wr-total-val num-cell" style="background:rgba(33,115,70,0.05); font-weight:900; color:#15803d;">${rowValue.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td class="col-wr-profit-wh num-cell" style="background:rgba(39,174,96,0.02); font-weight:900; color:#27ae60;">${rowProfitWH.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td class="col-wr-profit-rt num-cell" style="background:rgba(33,150,243,0.02); font-weight:900; color:#2196f3;">${rowProfitRT.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                `;
                body.appendChild(tr);
            });

            // تطبيق حالة الأعمدة
            applyWrColVisibility();

            // 3. تحديث بطاقات الملخص
            if (summaryContainer) {
                let cardsHTML = `
                    <div class="summary-card-gold" style="min-width:200px; flex: 1; padding:20px; background:linear-gradient(135deg, #4c1d95, #2e1065); color:white; border-radius:18px; box-shadow:0 10px 25px rgba(76,29,149,0.2); border:1px solid rgba(255,255,255,0.1); display:flex; flex-direction:column; justify-content:center; transition: 0.3s;">
                        <div style="font-size:0.85rem; font-weight:bold; color: #d4af37; margin-bottom:8px;">📦 إجمالي المخزون (كل الفروع)</div>
                        <div style="font-size:1.6rem; font-weight:900; color: white;">${totalGlobalQty.toLocaleString()} <span style="font-size:0.8rem; opacity:0.7;">قطعة</span></div>
                        <div style="font-size:1.1rem; font-weight:bold; border-top:1px solid rgba(255,255,255,0.1); margin-top:12px; padding-top:8px; color: #d4af37;">${totalGlobalValue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} <span style="font-size:0.75rem; opacity:0.7;">ج.م (تكلفة)</span></div>
                    </div>

                    <div class="summary-card-profit-wh" style="min-width:180px; flex: 1; padding:20px; background:linear-gradient(135deg, #064e3b, #052e16); color:white; border-radius:18px; box-shadow:0 10px 25px rgba(6,78,59,0.2); border:1px solid rgba(255,255,255,0.1); display:flex; flex-direction:column; justify-content:center; transition: 0.3s;">
                        <div style="font-size:0.85rem; font-weight:bold; color: #34d399; margin-bottom:8px;">💰 إجمالي ربح الجملة</div>
                        <div style="font-size:1.6rem; font-weight:900; color: white;">${totalGlobalProfitWH.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                        <div style="font-size:0.75rem; margin-top:5px; color: #34d399; opacity:0.8;">بناءً على الأرصدة الحالية</div>
                    </div>

                    <div class="summary-card-profit-rt" style="min-width:180px; flex: 1; padding:20px; background:linear-gradient(135deg, #1e3a8a, #172554); color:white; border-radius:18px; box-shadow:0 10px 25px rgba(30,58,138,0.2); border:1px solid rgba(255,255,255,0.1); display:flex; flex-direction:column; justify-content:center; transition: 0.3s;">
                        <div style="font-size:0.85rem; font-weight:bold; color: #93c5fd; margin-bottom:8px;">💸 إجمالي ربح التجزئة</div>
                        <div style="font-size:1.6rem; font-weight:900; color: white;">${totalGlobalProfitRT.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                        <div style="font-size:0.75rem; margin-top:5px; color: #93c5fd; opacity:0.8;">بناءً على الأرصدة الحالية</div>
                    </div>
                `;

                warehouseStats.forEach(ws => {
                    cardsHTML += `
                        <div class="summary-card-white" style="min-width:160px; flex: 1; padding:18px; background:linear-gradient(135deg, #334155, #0f172a); color:white; border-radius:18px; box-shadow:0 8px 20px rgba(0,0,0,0.2); display:flex; flex-direction:column; justify-content:center; border-right: 5px solid #d4af37; transition: 0.3s; border-top: 1px solid rgba(255,255,255,0.1);">
                            <div style="font-size:0.9rem; color:#fcd34d; font-weight:bold; margin-bottom:8px; display: flex; align-items: center; gap: 8px;">🏢 كمية ${ws.name}</div>
                            <div style="font-size:1.4rem; font-weight:900; color:white;">${ws.qty.toLocaleString()} <span style="font-size:0.75rem; color:#94a3b8; font-weight:normal;">قطعة</span></div>
                            <div style="font-size:1.05rem; color:#34d399; font-weight:bold;">${ws.val.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} <span style="font-size:0.65rem;">ج.م</span></div>
                            <div style="font-size:0.75rem; color:#94a3b8; margin-top:8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 5px;">(${ws.items} صنف نشط)</div>
                        </div>
                    `;
                });
                summaryContainer.innerHTML = cardsHTML;
            }
        }

        function printWarehouseReport() {
            const shopName = document.getElementById('shopName')?.value || 'متجر بَيَان';

            // جلب الهيدر والبودي من الجدول الفعلي لضمان مطابقة الفلترة والأعمدة المخفية
            const originalHead = document.getElementById('wrTableHead');
            const originalBody = document.getElementById('wrTableBody');

            if (!originalHead || !originalBody) return alert("لا توجد بيانات للطباعة");

            const headers = Array.from(originalHead.querySelectorAll('th')).map(th => th.innerText.replace(/🔍|📋|📦|💰|📏|🏷️/g, '').trim());
            const rows = Array.from(originalBody.querySelectorAll('tr')).filter(tr => tr.style.display !== 'none');

            // جلب ملخص البطاقات (Totals)
            const summaryCards = document.querySelectorAll('#wrSummaryCards > div');
            let summaryHtml = '<div style="margin-bottom:15px; border:1px solid #000; padding:10px;">';
            summaryCards.forEach(card => {
                const title = card.querySelector('div:first-child')?.innerText.replace(/📦|💰|🏷️|🏢|💸/g, '') || '';
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

        // ================= وظائف استيراد وتحديث إكسيل (Excel Import & Update) =================
        function exportWarehouseReportToExcel() {
            if (typeof XLSX === 'undefined') return alert("â Œ مكتبة Excel غير محملة!");

            const table = [];
            // العناوين
            const headerRow = ["#", "كود الصنف", "اسم الصنف", "تكلفة الوحدة"];
            warehouses.forEach(w => headerRow.push("كمية " + w.name));
            headerRow.push("إجمالي الكمية", "إجمالي القيمة التقديرية", "ربح الجملة", "ربح التجزئة");
            table.push(headerRow);

            // البيانات (الأصناف المفلترة حالياً)
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
                warehouses.forEach(w => {
                    const st = getWarehouseStock(p.name, w.name);
                    row.push(st);
                    rowQty += st;
                });
                row.push(rowQty, rowQty * cost, rowQty * ((parseFloat(p.wholesalePrice) || 0) - cost), rowQty * ((parseFloat(p.retailPrice) || 0) - cost));
                table.push(row);
            });

            const ws = XLSX.utils.aoa_to_sheet(table);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "أرصدة المخازن");
            XLSX.writeFile(wb, `تقرير_أرصدة_المخازن_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
            if (typeof showToast === 'function') showToast("✅ تم تصدير التقرير بنجاح", "success");
        }        

        // ================= وظائف استيراد وتحديث إكسيل (Excel Import & Update) =================

        function downloadProductTemplate() {
            if (typeof XLSX === 'undefined') return alert("⚠️ مكتبة XLSX غير محملة!");

            const data = [
                ["كود الصنف", "كود داخلي", "اسم الصنف", "الباركود", "سعر البيع", "سعر الجملة", "سعر الشراء", "الكمية الحالية", "الوحدة", "المكان", "الفئة", "حد الطلب"]
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
                data.push(["تلقائي", "101", "مثال: صنف جديد 1", "123456789", "100", "90", "80", "50", "قطعة", "رف A1", "عام", "5"]);
            }

            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "المنتجات");
            ws['!cols'] = [ {wch: 15}, {wch: 12}, {wch: 25}, {wch: 15}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 10} ];

            XLSX.writeFile(wb, "نموذج_مخزن_بيان_المتكامل.xlsx");
            if (typeof showToast === 'function') showToast("✅ تم استخراج النموذج بنجاح", "success");
        }

        async function importProductsFromExcel(event) {
            const file = event.target.files[0];
            if (!file) return;

            // إظهار رسالة البدء
            if (typeof showToast === 'function') showToast("⏳ جاري تحليل ملف الإكسيل...", "info");

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    if (typeof XLSX === 'undefined') throw new Error("مكتبة Excel غير محملة في المتصفح!");

                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData.length < 2) throw new Error("الملف المختار فارغ أو لا يحتوي على بيانات!");

                    // استخراج العناوين
                    const headers = jsonData[0].map(h => String(h || "").toLowerCase().trim());
                    const findCol = (keys) => headers.findIndex(h => keys.some(k => h.includes(k)));

                    // تحديد فهارس الأعمدة
                    const sysCodeIdx = findCol(['كود الصنف', 'sys', 'system']);
                    const intCodeIdx = findCol(['كود داخلي', 'داخلي', 'internal']);
                    const nameIdx = findCol(['اسم', 'صنف', 'item', 'name']);
                    const barIdx = findCol(['باركود', 'barcode']);
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

                    // السماح للواجهة بالتحديث قبل بدء المعالجة الثقيلة
                    await new Promise(resolve => setTimeout(resolve, 100));

                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        try {
                            // تنظيف البيانات والتأكد من وجود اسم
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

                            // محاولة المطابقة للتحديث (بناءً على كود النظام أو الباركود أو الاسم بدقة)
                            let existing = productsDB.find(p => 
                                (sysCode && sysCode !== "تلقائي" && (p.sysCode === sysCode || String(p.id) === sysCode)) ||
                                (barcode && p.barcode === barcode && barcode !== "-") ||
                                (name.toLowerCase() === p.name.toLowerCase())
                            );

                            if (existing) {
                                // تحديث المنتج الحالي
                                if (intCode) existing.code = intCode;
                                if (barcode && barcode !== "-") existing.barcode = barcode;
                                existing.price = price || existing.price;
                                existing.wholesale = wholesale || existing.wholesale;
                                existing.cost = cost || existing.cost;
                                existing.stock = stock; // تحديث الرصيد للقيمة الجديدة في الملف
                                existing.unit = unit || existing.unit;
                                existing.shelf = shelf || existing.shelf;
                                existing.category = category || existing.category;
                                existing.minStock = minStock || existing.minStock;
                                updated++;
                            } else {
                                // إضافة منتج جديد
                                const newId = Date.now() + i; // استخدام i لضمان التميز
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

                            // مزامنة التصنيفات
                            if (category && window.inventoryCategories && !window.inventoryCategories.includes(category)) {
                                window.inventoryCategories.push(category);
                                localStorage.setItem('pos_inv_cats', JSON.stringify(window.inventoryCategories));
                            }
                        } catch (rowErr) {
                            console.warn("خطأ في السطر " + (i + 2), rowErr);
                        }
                    }

                    // حفظ وتحديث
                    if (typeof saveData === 'function') await saveData();

                    renderInventoryTable();
                    if (typeof updateDatalists === 'function') updateDatalists();
                    if (typeof renderProductsGrid === 'function') renderProductsGrid();

                    let summaryMsg = `✅ اكتملت العملية:\n`;
                    summaryMsg += `• إجمالي الأسطر: ${totalScanned}\n`;
                    summaryMsg += `• تم التحديث: ${updated}\n`;
                    summaryMsg += `• تم الإضافة: ${added}\n`;
                    if (skippedEmpty > 0) summaryMsg += `• تم تجاهله (بدون اسم): ${skippedEmpty}`;

                    alert(summaryMsg); // استخدام alert هنا لضمان رؤية النتيجة كاملة
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
                    selectedInventoryId = id;
                    tr.classList.add('selected-row-gold');
                } else {
                    window.selectedInventoryIds.delete(id);
                    if (selectedInventoryId === id) selectedInventoryId = null;
                    tr.classList.remove('selected-row-gold');
                }
            }
            updateInventorySelectionUI();
        }

        function updateInventorySelectionUI() {
            const checkedCount = window.selectedInventoryIds.size;

            // تحديث عداد تعديل الأسعار
            const badge = document.getElementById('priceAdjSelectCount');
            if (badge) {
                if (checkedCount > 0) {
                    badge.innerText = checkedCount;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }

            // تحديث حالة الأزرار (تفعيل/تعطيل)
            const btns = ['invEditBtn', 'invDeleteBtn', 'invPriceAdjBtn'];
            btns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    if (checkedCount > 0) {
                        btn.style.opacity = '1';
                        btn.style.pointerEvents = 'auto';
                        btn.style.filter = 'none';
                    } else {
                        btn.style.opacity = '0.5';
                        btn.style.pointerEvents = 'none';
                        btn.style.filter = 'grayscale(1)';
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
                    selectedInventoryId = id;
                    tr.classList.add('selected-row-gold');
                } else {
                    window.selectedInventoryIds.delete(id);
                    if (selectedInventoryId === id) selectedInventoryId = null;
                    tr.classList.remove('selected-row-gold');
                }
            }
            updateInventorySelectionUI();
        }

        let wrFilterState = { startDate: null, endDate: null, period: 'total' };

        window.applyWarehouseReportPeriodFilter = function(period) {
            const today = new Date();
            let start = null;
            let end = null;
            wrFilterState.period = period;

            // إخفاء/إظهار حاوية التاريخ المخصص
            const customContainer = document.getElementById('wrCustomDateContainer');
            if (customContainer) {
                if (period === 'custom') customContainer.classList.remove('hidden');
                else customContainer.classList.add('hidden');
            }

            if (period === 'today') {
                start = null; 
                end = today.toLocaleDateString('en-CA');
            } else if (period === 'yesterday') {
                const yest = new Date();
                yest.setDate(yest.getDate() - 1);
                start = null; 
                end = yest.toLocaleDateString('en-CA');
            } else if (period === 'thisweek') {
                start = null; 
                end = today.toLocaleDateString('en-CA');
            } else if (period === 'lastweek') {
                const lEnd = new Date();
                lEnd.setDate(today.getDate() - today.getDay() - 1);
                start = null; 
                end = lEnd.toLocaleDateString('en-CA');
            } else if (period === 'thismonth') {
                start = null;
                end = today.toLocaleDateString('en-CA');
            } else if (period === 'thisyear') {
                start = null;
                end = today.toLocaleDateString('en-CA');
            } else if (period === 'lastyear') {
                start = null;
                end = new Date(today.getFullYear() - 1, 11, 31).toLocaleDateString('en-CA');
            }

            wrFilterState.startDate = start;
            wrFilterState.endDate = end;
            renderWarehouseReportTable();
        }

        window.applyWarehouseReportCustomFilter = function() {
            wrFilterState.startDate = document.getElementById('wrStartDate').value || null;
            wrFilterState.endDate = document.getElementById('wrEndDate').value || null;
            renderWarehouseReportTable();
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

            const currentWh = (currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';
            if (document.getElementById('sideStockCurrentWarehouseName')) document.getElementById('sideStockCurrentWarehouseName').innerText = currentWh;

            const currentStockVal = getWarehouseStock(p.name, currentWh);
            if (document.getElementById('sideStockCurrentVal')) document.getElementById('sideStockCurrentVal').innerText = currentStockVal;

            // أرصدة الفروع الأخرى
            const othersContainer = document.getElementById('sideStockOtherWarehouses');
            if(othersContainer) {
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

        function getWarehouseStock(productName, warehouseName, startDate = null, endDate = null) {
            const p = productsDB.find(x => x.name === productName);
            if (!p) return 0;

            const targetWH = (warehouseName || '').trim();
            let transStock = 0;
            let globalTransChange = 0;

            transactions.filter(t => t.product === productName).forEach(t => {
                const type = (t.type || '');
                const tWarehouse = (t.warehouse || 'المخزن الرئيسي').trim();
                const tDateISO = t.dateISO || '';

                // حساب معامل التحويل للوحدة المستخدمة في الحركة
                let factor = 1;
                if (p.units && t.unit) {
                    const u = p.units.find(un => un.unitName === t.unit);
                    if (u) factor = parseFloat(u.factor) || 1;
                }

                let qty = parseFloat(t.qty || 0) * factor;
                let change = 0;

                if (startDate && tDateISO < startDate) return;
                if (endDate && tDateISO > endDate) return;

                if (type.includes('شراء') && !type.includes('مرتجع')) change = qty;
                else if (type.includes('مرتجع بيع')) change = qty;
                else if (type.includes('بيع') && !type.includes('مرتجع')) change = -qty;
                else if (type.includes('مرتجع شراء')) change = -qty;
                else if (type.includes('تسوية') && type.includes('+')) change = qty;
                else if (type.includes('تسوية') && type.includes('-')) change = -qty;

                if (!type.includes('تحويل')) {
                    globalTransChange += change;
                }

                if (tWarehouse === targetWH) {
                    transStock += change;
                }

                if (type.includes('تحويل')) {
                    const parts = (t.partner || '').split(' -> ');
                    if (parts.length === 2) {
                        if (parts[1].trim() === targetWH) transStock += qty;
                        if (parts[0].trim() === targetWH) transStock -= qty;
                    }
                }
            });

            if (!startDate) {
                // إذا لم يوجد تاريخ بداية، نعتبر الرصيد تراكمي (Snapshot) حتى تاريخ النهاية
                const initialBalance = (parseFloat(p.stock) || 0) - globalTransChange;
                const isMainWH = (targetWH === 'المخزن الرئيسي' || warehouses.length === 1 || (warehouses[0] && warehouses[0].name.trim() === targetWH));
                if (isMainWH) {
                    return initialBalance + transStock;
                } else {
                    return transStock;
                }
            } else {
                // إذا وجد تاريخ بداية ونهاية، نعتبره "حركة" (Movements) خلال الفترة
                return transStock;
            }
        }

        function showInvDetails(id) {
            const p = productsDB.find(x => x.id === id);
            if (!p) return;

            // تحديث البيانات في الحقول المخفية أو الجانبية دون إظهار النافذة العائمة تلقائياً
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

            // تحديث بطاقة الرصيد الجانبية الذكية
            updateSideStockCard(id);
        }

        // دالة مخصصة لإظهار النافذة العائمة (تستدعى عند الطلب فقط)
        function openQuickEditFloating(id) {
            const p = productsDB.find(x => x.id === id);
            if (!p) return;

            const floatingWin = document.getElementById('quickEditFloatingWindow');
            const floatingTitle = document.getElementById('floatingEditTitle');

            if (floatingWin) {
                floatingWin.classList.remove('hidden');
                floatingTitle.innerText = `” تحديث: ${p.name}`;

                // تعبئة بيانات الوحدة الأساسية
                document.getElementById('quickEditBaseUnitName').innerText = p.unit || 'قطعة';
                document.getElementById('quickEditRetail').value = p.price || 0;
                document.getElementById('quickEditWholesale').value = p.wholesale || 0;
                document.getElementById('quickEditCost').value = p.cost || 0;

                // تعبئة بيانات الوحدة الفرعية (إن وجدت)
                const subUnit = (p.units && p.units.length > 1) ? p.units.find(u => u.factor > 1 || u.unitName !== p.unit) : null;
                const subSection = document.getElementById('quickEditSubUnitSection');

                if (subUnit) {
                    subSection.style.display = 'block';
                    document.getElementById('quickEditSubUnitName').innerText = subUnit.unitName;
                    document.getElementById('quickEditSubRetail').value = subUnit.price || 0;
                    document.getElementById('quickEditSubWholesale').value = subUnit.wholesale || 0;
                } else {
                    subSection.style.display = 'none';
                }

                // التركيز التلقائي لسرعة الإدخال
                setTimeout(() => document.getElementById('quickEditRetail').focus(), 100);
            }
        }

        function closeQuickEditFloating() {
            const floatingWin = document.getElementById('quickEditFloatingWindow');
            if (floatingWin) floatingWin.classList.add('hidden');
        }

        // دالة فتح نافذة التعديل السريع يدوياً من الشريط الجانبي
        function showQuickEditManual() {
            let targetId = selectedInventoryId;
            if (!targetId) {
                const checked = document.querySelector('.inv-row-check:checked');
                if (checked) targetId = parseInt(checked.closest('tr').getAttribute('data-id'));
            }

            if (!targetId) {
                return showToast("⚠️ يرجى تحديد صنف من الجدول أولاً", "error");
            }

            // فتح النافذة الآن عند الطلب من الزر
            openQuickEditFloating(targetId);
        }

        function quickAddProduct(name, context) {
            currentQuickAddContext = context;
            openNewItemModal(name);
        }

        async function saveNewItem(mode = 'save') {
            const isEdit = !!currentEditingProductId;
            if (isEdit && !checkPermission('stock_edit')) return;
            if (!isEdit && !checkPermission('stock_add')) return;
            if (!isEdit && !window.enforceSubscriptionCheck('other')) return false;

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

            const stock = parseFloat(document.getElementById('newItemStock').value) || 0;
            const minStock = parseFloat(document.getElementById('newItemMinStock').value) || 0;
            const expiry = document.getElementById('newItemExpiry').value;
            const notes = document.getElementById('newItemNotes').value;

            if (!name || price === 0) return alert("⚠️ يرجى إدخال اسم الصنف وسعر البيع على الأقل.");

            // منع الحفظ في حالة الخسارة
            if (price < cost) return alert("🚨 خطأ: سعر البيع القطاعي أقل من سعر التكلفة!");
            if (wholesale < cost) return alert("🚨 خطأ: سعر بيع الجملة أقل من سعر التكلفة!");

            // جمع بيانات الوحدات
            const units = [];
            const rows = document.getElementById('productUnitsTableBody').rows;
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

            // تحديث قائمة التصنيفات الذكية
            if (category && !window.inventoryCategories.includes(category)) {
                window.inventoryCategories.push(category);
                if (typeof updateDatalists === 'function') updateDatalists();
                if (typeof saveData === 'function') saveData(); // حفظ القائمة الجديدة فوراً
            }

            const finalId = currentEditingProductId || Date.now();
            const newItem = {
                id: finalId,
                sysCode: sysCode || String(finalId),
                name, price, cost, wholesale, minPrice, discount,
                barcode, code, category, shelf,
                stock, minStock, expiry, notes,
                units,
                unit: units.length > 0 ? units[0].unitName : "قطعة",
                image: currentProductImageData,
                isQuick: document.getElementById('isQuickItem').checked
            };

            if (currentEditingProductId) {
                const idx = productsDB.findIndex(p => p.id === currentEditingProductId);
                if (idx !== -1) productsDB[idx] = newItem;
                await db.products.put(newItem);
            } else {
                productsDB.push(newItem);
                await db.products.add(newItem);
            }

            // إضافة تلقائية للقسم إذا كان "إضافة سريعة"
            if (currentQuickAddContext === 'sales') addToCart(newItem.id);
            else if (currentQuickAddContext === 'purchase') addToPurchaseCart(newItem.id);

            currentQuickAddContext = null;
            showCustomAlert({
                type: 'success',
                titleText: 'عملية ناجحة',
                msg: 'تم حفظ الصنف بنجاح بنظام بَيَان ✅',
                confirmText: 'حسناً'
            });
            renderInventoryTable();

            // التعامل مع وضع الحفظ
            if (mode === 'save') {
                document.getElementById('newItemModal').classList.add('hidden');
            } else if (mode === 'new') {
                // إعادة تصدير النافذة فارغة
                document.getElementById('newItemName').value = "";
                document.getElementById('newItemPrice').value = "0";
                document.getElementById('newItemName').focus();
            } else if (mode === 'duplicate') {
                document.getElementById('newItemName').focus();
                alert("”„ تم الحفظ، يمكنك تعديل الاسم الآن للتكرار.");
            }

            // إضافة الصنف تلقائياً للسلة (إذا كان مفتوحاً من البحث)
            if (_quickAddTargetSection && newItem) {
                if (_quickAddTargetSection === 'sales') {
                    addToCart(newItem.id);
                } else if (_quickAddTargetSection === 'purchase') {
                    addToPurchaseCart(newItem.id);
                } else if (_quickAddTargetSection === 'salesReturn') {
                    addToReturnCart({ name: newItem.name, price: newItem.price, qty: 1, maxQty: 9999 });
                } else if (_quickAddTargetSection === 'purchaseReturn') {
                    addPurToReturnCart({ name: newItem.name, price: newItem.cost || newItem.price, qty: 1, maxQty: 9999 });
                } else if (_quickAddTargetSection === 'adj') {
                    selectedAdjItem = newItem;
                    document.getElementById('adjSearch').value = newItem.name;
                    document.getElementById('adjPrice').value = newItem.cost || 0;
                    document.querySelectorAll('.adj-current-stock-val').forEach(el => el.innerText = newItem.stock);
                    document.getElementById('adjQty').focus();
                }
                _quickAddTargetSection = null;
            }
        }

        async function printInventoryBarcode() {
            if (typeof showCustomAlert !== 'function') {
                // Fallback if custom alert is missing
                const choice = prompt("1- مختار | 2- الكل", "1");
                if (choice) executePrinting(choice === "1" ? "selected" : "all");
                return;
            }

            showCustomAlert({
                type: 'question',
                titleText: '🖨️ خيارات طباعة الباركود',
                msg: 'يرجى اختيار نطاق الطباعة المطلوب:',
                confirmText: 'طباعة كافة الأصناف كلياً',
                cancelText: 'طباعة الأصناف المختارة (✔️) فقط',
                showCancel: true,
                onConfirm: () => requestCopiesAndPrint('all'),
                onCancel: () => requestCopiesAndPrint('selected')
            });
        }

        function requestCopiesAndPrint(mode) {
            const copies = prompt("🖨️ كم عدد الملصقات لكل صنف؟", "1") || "1";
            executePrinting(mode, parseInt(copies));
        }

        async function executePrinting(mode, copies = 1) {
            let targets = [];
            if (mode === "selected") {
                const selectedIds = Array.from(window.selectedInventoryIds);
                if (selectedIds.length === 0) return showToast("⚠️ عذراً، يجب عليك اختيار صنف واحد على الأقل من الجدول أولاً!", "error");

                selectedIds.forEach(id => {
                    const p = productsDB.find(x => x.id === id);
                    if (p) targets.push(p);
                });
            } else {
                if (productsDB.length === 0) return showToast("⚠️ المخزن فارغ!", "error");
                targets = [...productsDB];
            }

            const shopName = (document.getElementById('shopName') ? document.getElementById('shopName').value : '') || 'المتجر الذكي';

            // فتح نافذة طباعة جديدة
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            printWindow.document.write(`
                <html>
                <head>
                    <title>طباعة ملصقات الباركود</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: center; margin: 0; padding: 10px; }
                        .label-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
                        .barcode-label { 
                            width: 50mm; height: 30mm; 
                            border: 1px solid #ccc; padding: 5px; 
                            display: flex; flex-direction: column; align-items: center; justify-content: space-between;
                            page-break-inside: avoid; border-radius: 5px; box-shadow: none;
                        }
                        .shop-title { font-size: 9pt; font-weight: 900; color: #000; }
                        .item-name { font-size: 9pt; font-weight: 900; margin: 2px 0; white-space: nowrap; overflow: hidden; max-width: 100%; color: #000; }
                        .price-tag { font-size: 11pt; font-weight: 900; color: #000; border: 2px solid #000; padding: 2px 10px; border-radius: 4px; background: #fff; }
                        svg { max-width: 90%; height: auto; }
                        @media print {
                            .barcode-label { border: 1.5px solid #000; box-shadow: none; margin: 2px; }
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
                for (let i = 0; i < copies; i++) {
                    const label = printWindow.document.createElement('div');
                    label.className = 'barcode-label';
                    label.innerHTML = `
                        <div class="shop-title">${shopName}</div>
                        <div class="item-name">${p.name}</div>
                        <svg id="barcode-${p.id}-${i}"></svg>
                        <div class="price-tag">${p.price.toFixed(2)} LE</div>
                    `;
                    labelsDiv.appendChild(label);

                    // توليد الباركود مباشرة باستخدام مكتبة النافذة الرئيسية لتجنب بطء وتحميل الـ CDN
                    if (window.JsBarcode) {
                        window.JsBarcode(label.querySelector('svg'), String(p.barcode || p.id), {
                            format: "CODE128",
                            width: 1.5,
                            height: 40,
                            displayValue: true,
                            fontSize: 10,
                            margin: 0
                        });
                    }
                }
            });

            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }

        // الانتقال لجرد/تسوية المخزن بالصنف المحدد
        function goToAdjustmentWithSelected() {
            if (window.selectedInventoryIds.size > 0) {
                const id = Array.from(window.selectedInventoryIds)[0];
                const p = productsDB.find(x => x.id === id);
                if (p) {
                    switchSection('adjustment');
                    setTimeout(() => {
                        // تعيين حقل البحث بالصنف المختار
                        const adjSearchInput = document.getElementById('adjSearch');
                        if (adjSearchInput) {
                            adjSearchInput.value = p.name;
                        }
                        
                        // اختيار الوحدة
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
            switchSection('adjustment');
        }

        // الانتقال لحركة صنف بالصنف المحدد
        function goToHistoryWithSelected() {
            if (window.selectedInventoryIds.size > 0) {
                const id = Array.from(window.selectedInventoryIds)[0];
                const p = productsDB.find(x => x.id === id);
                if (p) {
                    switchSection('history');
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
            switchSection('history');
        }

        // ================= منطق تسوية المخزن (Adjustment Logic) =================
        let adjCart = [];
        let selectedAdjItem = null;

        function resetAdjustment() {
            adjCart = [];
            selectedAdjItem = null;
            document.getElementById('adjSearch').value = '';
            document.getElementById('adjQty').value = '1';
            document.getElementById('adjPrice').value = '';
            if (document.getElementById('adjNotes')) document.getElementById('adjNotes').value = '';
            // document.getElementById('adjShelf').value = ''; // تم إزالته من الواجهة بناءً على طلب المستخدم
            document.getElementById('adjBadgeID').innerText = getNextSequence('تسوية');

            renderAdjTable();

            const now = new Date();
            if (document.getElementById('adjDate')) document.getElementById('adjDate').value = now.toLocaleDateString('en-CA');
            if (document.getElementById('adjTime')) document.getElementById('adjTime').value = now.toTimeString().slice(0, 5);

            document.getElementById('adjSearch').focus();
        }

        let currentAdjHeaderUnit = null;

        function fillAdjustmentHeaderWithUnit(product, unit) {
            selectedAdjItem = product;
            currentAdjHeaderUnit = unit;

            document.getElementById('adjSearch').value = product.name;

            // حساب آخر سعر شراء بدلاً من متوسط التكلفة
            const lastPurchasePrice = typeof getProductLastPurchasePrice === 'function' ? getProductLastPurchasePrice(product.name, product.cost) : (parseFloat(product.cost) || 0);

            const factor = parseFloat(unit.factor) || 1;

            // نستخدم دائماً (آخر سعر شراء × المعامل) لضمان الدقة في التسوية
            const calculatedPrice = lastPurchasePrice * factor;
            document.getElementById('adjPrice').value = calculatedPrice.toFixed(2);

            // تحديث مؤشرات الرصيد الحالي (مع عرض الرصيد بوحدة الصنف المختارة)
            const displayStock = (parseFloat(product.stock) || 0) / (parseFloat(unit.factor) || 1);
            document.querySelectorAll('.adj-current-stock-val').forEach(el => {
                el.innerText = `${displayStock.toFixed(2)} ${unit.unitName}`;
            });

            document.getElementById('adjQty').focus();
            document.getElementById('adjQty').select();
        }

        function handleAdjSearch(query) {
            const resultsDiv = document.getElementById('adjSearchResults');
            resultsDiv.innerHTML = '';
            if (!query) { resultsDiv.style.display = 'none'; return; }

            const queryLower = query.toLowerCase();
            const filtered = productsDB.filter(p => 
                p.name.toLowerCase().includes(queryLower) || 
                (p.barcode && String(p.barcode).toLowerCase().includes(queryLower)) ||
                (p.code && String(p.code).toLowerCase().includes(queryLower)) ||
                (p.units && p.units.some(u => String(u.unitBarcode).toLowerCase().includes(queryLower)))
            ).slice(0, 10);

            if (filtered.length > 0) {
                resultsDiv.style.display = 'block';
                filtered.forEach(p => {
                    const div = document.createElement('div');
                    div.className = 'result-item';
                    div.innerHTML = `<span>${p.name}</span><span class="stock-badge">رصيد: ${p.stock}</span>`;
                    div.onclick = () => {
                        resultsDiv.style.display = 'none';
                        // إذا كان المنتج له أكثر من وحدة، نفتح نافذة الاختيار
                        if (p.units && p.units.length > 1) {
                            if (typeof showUnitSelectionModal === 'function') {
                                showUnitSelectionModal(p, 'adjustment');
                            }
                        } else {
                            // وحدة واحدة أو لا يوجد
                            const defUnit = (p.units && p.units.length > 0) ? p.units[0] : null;
                            fillAdjustmentHeaderWithUnit(p, defUnit || { unitName: p.unit || 'قطعة', factor: 1, cost: p.cost });
                        }
                    };
                    resultsDiv.appendChild(div);
                });
            } else {
                resultsDiv.style.display = 'block';
                const div = document.createElement('div');
                div.className = 'result-item';
                div.style.cssText = 'color:var(--main-green); font-weight:bold; justify-content:center; border: 1.5px dashed var(--main-green); background: rgba(16,185,129,0.05); cursor: pointer; padding: 12px;';
                div.innerHTML = `<span> إضافة تفصيلية لصنف جديد: (${query})</span>`;
                div.onclick = () => {
                    resultsDiv.style.display = 'none';
                    quickAddProduct(query, 'adj');
                }
                resultsDiv.appendChild(div);
            }
        }

        function addAdjItem() {
            if (!selectedAdjItem) return alert("يرجى اختيار صنف أولاً");
            const qty = parseFloat(document.getElementById('adjQty').value);
            const price = parseFloat(document.getElementById('adjPrice').value) || selectedAdjItem.cost;

            adjCart.push({ 
                ...selectedAdjItem, 
                qty: qty, 
                price: price,
                unitFactor: currentAdjHeaderUnit ? parseFloat(currentAdjHeaderUnit.factor) : 1,
                selectedUnit: currentAdjHeaderUnit 
            });
            renderAdjTable();

            // Reset inputs for next item
            document.getElementById('adjSearch').value = '';
            document.getElementById('adjQty').value = '1';
            document.getElementById('adjPrice').value = '';
            document.querySelectorAll('.adj-current-stock-val').forEach(el => el.innerText = '0');
            selectedAdjItem = null;
            document.getElementById('adjSearch').focus();
        }

        function renderAdjTable() {
            const tbody = document.getElementById('adjTableBody');
            tbody.innerHTML = '';
            if (adjCart.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px; color: #7f8c8d;">ابدأ بالبحث عن صنف بالاسم أو بالباركود</td></tr>';
                if (document.getElementById('adjItemsCount')) document.getElementById('adjItemsCount').innerText = '0';
                if (document.getElementById('adjTotalQty')) document.getElementById('adjTotalQty').innerText = '0';
                if (document.getElementById('adjGrandTotal')) document.getElementById('adjGrandTotal').innerText = '0.00';
                return;
            }
            let totalQty = 0, grandTotal = 0;
            adjCart.forEach((item, idx) => {
                const factor = item.unitFactor || 1;
                const totalAdj = item.qty * factor;
                const stockBefore = parseFloat(item.stock) || 0;
                const stockAfter = stockBefore + totalAdj;

                const lineTotal = (item.qty * item.price);
                totalQty += parseFloat(item.qty) || 0;
                grandTotal += lineTotal;

                // إنشاء قائمة الوحدات
                let unitOptions = `<option value="base" ${!item.selectedUnit ? 'selected' : ''}>${item.unit || 'قطعة'}</option>`;
                if (item.units && item.units.length > 0) {
                    unitOptions = item.units.map(u => 
                        `<option value="${u.unitName}" ${item.selectedUnit && item.selectedUnit.unitName === u.unitName ? 'selected' : ''}>${u.unitName}</option>`
                    ).join('');
                }

                tbody.innerHTML += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${item.code || item.id}</td>
                        <td style="font-weight:bold;">${item.name}</td>
                        <td style="background: rgba(52, 73, 94, 0.05); font-weight: 900; color: #34495e; font-size: 1.1rem;">${stockBefore}</td>
                        <td style="background: rgba(46, 134, 222, 0.05);">
                            <input type="number" class="qty-input" value="${item.qty}" step="0.01"
                                style="width: 80px; text-align: center; font-weight: 900; color: #2e86de; border: 2px solid #2e86de; border-radius: 8px; height: 32px; background: #fff;"
                                onchange="adjCart[${idx}].qty=parseFloat(this.value)||0; renderAdjTable();" title="تعديل الكمية">
                        </td>
                        <td style="background: rgba(94, 51, 112, 0.05); font-weight: 900; color: #5e3370; font-size: 1.2rem;">${stockAfter}</td>
                        <td>
                            <select class="unit-select" onchange="updateAdjItemUnit(${idx}, this.value)" style="width:100%; padding:2px; border-radius:4px; border:1px solid #ccc;">
                                ${unitOptions}
                            </select>
                        </td>
                        <td><input type="number" class="price-input" value="${parseFloat(item.price).toFixed(2)}" min="0" step="0.01"
                            onchange="adjCart[${idx}].price=parseFloat(this.value)||0; renderAdjTable();" title="تعديل السعر"></td>
                        <td>${lineTotal.toFixed(2)}</td>
                        <td><button class="btn-delete-row" onclick="removeAdjItem(${idx})">️</button></td>
                    </tr>`;
            });
            if (document.getElementById('adjItemsCount')) document.getElementById('adjItemsCount').innerText = adjCart.length;
            if (document.getElementById('adjTotalQty')) document.getElementById('adjTotalQty').innerText = totalQty;
            if (document.getElementById('adjGrandTotal')) document.getElementById('adjGrandTotal').innerText = grandTotal.toFixed(2);
        }

        function updateAdjItemUnit(idx, unitName) {
            const item = adjCart[idx];
            const product = productsDB.find(p => p.id === item.id);
            if (!product) return;

            const unit = product.units ? product.units.find(u => u.unitName === unitName) : null;

            if (unit) {
                item.selectedUnit = unit;
                item.unitFactor = parseFloat(unit.factor) || 1;

                // حساب آخر سعر شراء بدلاً من متوسط التكلفة
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
            const item = adjCart[index];
            addToTrash('draft_item', item, `حذف من تسوية الجرد: ${item.name}`);
            adjCart.splice(index, 1);
            renderAdjTable();
        }

        function removeAdjRow() {
            if (adjCart.length > 0) {
                removeAdjItem(adjCart.length - 1);
            } else {
                alert("لا توجد عناصر لحذفها");
            }
        }

        async function saveAdjustment() {
            if (!checkPermission('stock_edit')) return false;
            if (!window.enforceSubscriptionCheck('other')) return false;
            if (adjCart.length === 0) {
                alert("⚠️ قائمة التسوية فارغة! لا يمكن الحفظ.");
                return false;
            }

            let adjId;
            if (isEditMode && editingInvoiceId) {
                adjId = editingInvoiceId;
                if (window.revertAndClearOldInvoice) {
                    await window.revertAndClearOldInvoice(editingInvoiceId, editingInvoiceType);
                }
            } else {
                adjId = getNextSequence('تسوية');
            }
            let grandTotal = 0;
            const dt = getTransactionDateTime('adjDate', 'adjTime');

            adjCart.forEach(item => {
                const p = productsDB.find(x => x.id === item.id);
                if (p) {
                    const oldStock = p.stock;
                    const factor = item.unitFactor || 1;
                    const newBaseStock = item.qty * factor;

                    p.stock = (parseFloat(p.stock) || 0) + newBaseStock;
                    const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
                    grandTotal += lineTotal; // تعديل الرصيد (جمع أو طرح) بناءً على الكمية المدخلة

                    // تسجيل الحركة بالفرق بين الرصيد القديم والجديد (بالوحدة الأساسية)
                    transactions.push({
                        date: dt.full,
                        dateISO: dt.iso,
                        timeISO: dt.time,
                        type: 'تسوية مخزن ⚖️',
                        method: '-',
                        invoiceId: adjId,
                        product: p.name,
                        unit: item.selectedUnit ? item.selectedUnit.unitName : (p.unit || 'قطعة'),
                        qty: item.qty, // الكمية المدخلة بالوحدة المختارة
                        price: item.price,
                        total: lineTotal,
                        partner: 'جرد',
                        user: currentUser ? currentUser.name : '-',
                        notes: document.getElementById('adjNotes') ? document.getElementById('adjNotes').value.trim() : '',
                        unitFactor: factor,
                        editDate: isEditMode ? new Date().toLocaleString('ar-EG') : '-'
                    });
                }
            });

            // إضافة سجل رئيسي (Head) للفاتورة ليظهر في تقارير الحركة اليومية
            transactions.push({
                date: dt.full,
                dateISO: dt.iso,
                timeISO: dt.time,
                type: 'تسوية مخزن ⚖️',
                isInvoiceHead: true,
                invoiceId: adjId,
                total: 0, // نضعه صفر هنا لأن جدول الفواتير يجمع إجماليات الأصناف تلقائياً لمنع التضاعف
                partner: 'جرد (تسوية)',
                user: currentUser ? currentUser.name : '-',
                notes: document.getElementById('adjNotes') ? document.getElementById('adjNotes').value.trim() : '',
                editDate: '-'
            });

            await saveData();
            alert("✅ تم الحفظ بنجاح!!");

            // إعادة ضبط وضع التعديل
            isEditMode = false;
            editingInvoiceId = null;
            editingOriginalDate = null;
            editingOriginalItems = [];

            resetAdjustment();
            return true;
        }

        // ================= منطق الإعدادات (Settings Logic) =================

        // ================= نظام تعدد اللغات (Multi-Language System) =================
        const translations = {
            ar: {
                app_title: " نظام إدارة الأعمال المتكامل",
                logout: " خروج",
                financial_ops: "العمليات المالية",
                pos: "بيع (POS)",
                receipt: "قبض (Receipt)",
                payment: "صرف (Payment)",
                sales_return: "مرتجع بيع",
                purchase_return: "مرتجع شراء",
                reports_stores: "التقارير والمخازن",
                daily_report: "حركة يومية",
                sales_analysis: "تحليل المبيعات",
                inventory: "المخازن",
                item_history: "حركة صنف",
                adjustment: "تسوية مخزن",
                purchase: "مشتريات (توريد)",
                admin_settings: "الإدارة والإعدادات",
                accounts: "دليل الحسابات",
                add_account: "إضافة حساب",
                settings: "الإعدادات",
                backup: "نسخة احتياطية",
                tab_business: " بيانات المؤسسة",
                tab_appearance: " المظهر واللغة",
                tab_data: " البيانات والأمان",
                tab_users: " المستخدمين",
                tab_warehouses: " إدارة المخازن",
                tab_trash: "️ المحذوفات",
                tab_about: "ℹ️ حول التطبيق",
                lang_label: "لغة التطبيق (Language)",
                theme_label: "سمة الألوان",
                theme_btn: " تبديل الوضع الليلي / النهاري",
                font_size_label: "حجم الخط (Font Size)",
                font_desc: "تحكم في حجم النصوص في كامل التطبيق",
                back_home: "<span class='icon'></span> الرئيسية",
                search_product: " بحث للبيع (اسم أو باركود)...",
                search_customer: " اسم العميل (اختياري)",
                total_sales: "إجمالي البيع",
                paid: "المدفوع",
                remaining: "المتبقي",
                print: "طباعة",
                save: "حفظ",
                new: "جديد"
            },
            en: {
                app_title: " Integrated Business System",
                logout: " Logout",
                financial_ops: "Financial Operations",
                pos: "POS (Sales)",
                receipt: "Receipt",
                payment: "Payment",
                sales_return: "Sales Return",
                purchase_return: "Purchase Return",
                reports_stores: "Reports & Inventory",
                daily_report: "Daily Report",
                sales_analysis: "Sales Analysis",
                inventory: "Inventory",
                item_history: "Item History",
                adjustment: "Stock Adjustment",
                purchase: "Purchase (Supply)",
                admin_settings: "Admin & Settings",
                accounts: "Accounts",
                add_account: "Add Account",
                settings: "Settings",
                backup: "Backup",
                tab_business: " Business Info",
                tab_appearance: " Appearance & Lang",
                tab_data: " Data & Security",
                tab_users: " Users",
                tab_warehouses: " Warehouses",
                tab_trash: "️ Trash",
                tab_about: "ℹ️ About App",
                lang_label: "App Language",
                theme_label: "Color Theme",
                theme_btn: " Toggle Dark/Light Mode",
                font_size_label: "Font Size",
                font_desc: "Control text size across the app",
                back_home: " Main Menu",
                search_product: " Search Product (Name/Barcode)...",
                search_customer: " Customer Name (Optional)",
                total_sales: "Total Sales",
                paid: "Paid Amount",
                remaining: "Change",
                print: "Print",
                save: "Save",
                new: "New"
            }
        };

        async function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('pos_theme', isDark ? 'dark' : 'light');

            // تحديث أيقونة الزر إذا وجدت
            const themeBtn = document.querySelector('.theme-toggle-btn');
            if (themeBtn) {
                themeBtn.innerText = isDark ? '☀️' : '';
            }
            await saveData();
        }

        // --- تحميل المستحقات الآجلة للمورد (للصرف) ---
        function loadPendingBills() {
            const payee = document.getElementById('disbursePayee').value;
            const tbody = document.getElementById('pendingBillsBody');
            tbody.innerHTML = '';

            if (!payee) return tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:10px;">يرجى تحديد المستلم/المورد أولاً</td></tr>';

            // البحث عن المشتريات الآجلة
            const pending = transactions.filter(t => t.partner === payee && t.type.includes('شراء') && t.method.includes('آجل'));

            if (pending.length === 0) return tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:10px;">لا توجد مستحقات آجلة لهذا المورد</td></tr>';

            pending.forEach(t => {
                tbody.innerHTML += `
                    <tr>
                        <td>${t.dateISO}</td><td>${t.total}</td><td>${t.type}</td>
                        <td><button class="btn-save" style="padding:2px 10px; font-size:0.8rem; background-color:#c0392b;" onclick="document.getElementById('disburseAmount').value='${t.total}'">سداد كامل</button></td>
                    </tr>`;
            });
        }

        // ================= منطق المرتجعات والطباعة (Returns & Printing) =================

        window.printReturnReceipt = function(type) {
            let cartItems = (type === 'sales') ? returnCart : purReturnCart;
            let title = (type === 'sales') ? 'مرتجع مبيعات' : 'مرتجع مشتريات';
            let totalId = (type === 'sales') ? 'returnTotalAmount' : 'purReturnTotalAmount';

            if (!cartItems || cartItems.length === 0) return alert("لا توجد أصناف للطباعة");

            const totalEl = document.getElementById(totalId);
            const total = totalEl ? totalEl.innerText : '0.00';

            const dateInputId = (type === 'sales') ? 'salesReturnDate' : 'purReturnDate';
            const timeInputId = (type === 'sales') ? 'salesReturnTime' : 'purReturnTime';
            const dt = getTransactionDateTime(dateInputId, timeInputId);

            const shopNameEl = document.getElementById('shopName');
            const shopName = shopNameEl ? (shopNameEl.value || 'المتجر') : 'المتجر';

            const shopAddressEl = document.getElementById('shopAddress');
            const shopAddress = shopAddressEl ? (shopAddressEl.value || '') : '';

            const badgeID = (type === 'sales') ? 'salesReturnBadgeID' : 'purReturnBadgeID';
            const badgeEl = document.getElementById(badgeID);
            const returnID = badgeEl ? badgeEl.innerText : '---';

            let itemsHtml = cartItems.map(item => `
                <tr>
                    <td style="text-align:right;">${item.name}</td>
                    <td>${item.qty}</td>
                    <td>${(item.price * item.qty).toFixed(2)}</td>
                </tr>
            `).join('');

            const partnerLabel = (type === 'sales') ? 'العميل' : 'المورد';
            const partnerID = (type === 'sales') ? 'salesReturnPartnerDisplay' : 'purReturnPartnerDisplay';
            const partnerEl = document.getElementById(partnerID);
            const partnerName = partnerEl ? partnerEl.innerText : '---';

            const content = `
                <div class="print-container">
                    <div class="print-header-top">
                        <div class="print-shop-name">${shopName}</div>
                        <div class="print-title-box">${title}</div>
                    </div>

                    <table class="print-info-table">
                        <tr><td><b>رقم:</b> ${returnID}</td><td style="text-align:left;"><b>التاريخ:</b> ${dt.full}</td></tr>
                        <tr><td><b>${partnerLabel}:</b> ${partnerName}</td><td style="text-align:left;"><b>المسؤول:</b> ${currentUser.name}</td></tr>
                    </table>

                    <table class="print-items-table">
                        <thead>
                            <tr>
                                <th style="text-align:right;">الصنف</th>
                                <th>الكمية</th>
                                <th>إجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="print-total-section">
                        <div class="total-row grand-total">
                            <span>إجمالي المرتجع:</span>
                            <span>${total} ج.م</span>
                        </div>
                    </div>

                    <div class="print-footer-area">
                        ${shopAddress ? `<div>  ${shopAddress}</div>` : ''}
                        <p style="margin-top:15px; border-top:1px solid #000; padding-top:10px;">توقيع العميل/المورد: .....................</p>
                        <div style="margin-top:10px; font-size:8pt; opacity:0.6;">نظام بَيَان المحاسبي - المتكامل</div>
                    </div>
                </div>
            `;
            document.getElementById('receipt-area').innerHTML = content;
            window.print();
        }

        function shareReturnReceipt(type, platform) {
            let cart = (type === 'sales') ? returnCart : purReturnCart;
            let title = (type === 'sales') ? 'مرتجع بيع' : 'مرتجع شراء';
            let totalId = (type === 'sales') ? 'returnTotalAmount' : 'purReturnTotalAmount';

            if (cart.length === 0) return alert("القائمة فارغة!");

            const total = document.getElementById(totalId).innerText;
            const dateInputId = (type === 'sales') ? 'salesReturnDate' : 'purReturnDate';
            const timeInputId = (type === 'sales') ? 'salesReturnTime' : 'purReturnTime';
            const date = getTransactionDateTime(dateInputId, timeInputId).full;

            let text = `↩️  *${title} - ${document.getElementById('shopName').value || 'المتجر'}*\n`;
            text += ` التاريخ: ${date}\n`;
            text += `------------------\n`;

            cart.forEach(item => {
                text += `▪️  ${item.name} (x${item.qty}) = ${(item.price * item.qty).toFixed(2)}\n`;
            });

            text += `------------------\n`;
            text += ` *الإجمالي: ${total} ج.م*\n`;

            const encodedText = encodeURIComponent(text);
            let url = '';

            if (platform === 'wa') {
                url = `https://wa.me/?text=${encodedText}`;
            } else if (platform === 'tg') {
                url = `https://t.me/share/url?url=${encodedText}&text=`;
            }

            window.open(url, '_blank');
        }
        // تمت إزالة نظام البحث التقليدي واستبداله بنظام البحث المتقدم الموحد في js/sales.js

        function addToReturnCart(item) {
            const existing = returnCart.find(x => x.name === item.name && (!item.selectedUnit || (x.selectedUnit && x.selectedUnit.unitName === item.selectedUnit.unitName)));
            if (existing) {
                if (existing.qty < (item.maxQty || 9999)) existing.qty++;
                else alert(`⚠️ لا يمكن تجاوز الكمية الأصلية (${item.maxQty})`);
            } else {
                returnCart.push({
                    ...item,
                    unitFactor: item.selectedUnit ? parseFloat(item.selectedUnit.factor) : 1
                });
            }
            renderReturnCart();
        }

        async function loadPriceAdjustmentData() {
            const tbody = document.getElementById('priceAdjustmentTableBody');
            if (!tbody) return;

            try {
                tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:50px;"><div class="loader-premium"></div> جاري معالجة الـ 12 ألف صنف...</td></tr>';

                if (!Array.isArray(productsDB) || productsDB.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:50px; color:#ef4444;">⚠️ قاعدة بيانات الأصناف غير متوفرة حالياً.</td></tr>';
                    return;
                }

                const searchQ = document.getElementById('priceAdjSearch').value.toLowerCase().trim();
                const catQ = document.getElementById('priceAdjCategory').value;
                const selectedIds = getSelectedInventoryIds();
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
                    targets = productsDB.slice(0, 100);
                }

                priceAdjData = [];
                const currentWH = (currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';

                targets.forEach(p => {
                    const itemName = p.name || 'صنف غير مسمى';
                    const liveStock = typeof getWarehouseStock === 'function' ? getWarehouseStock(itemName, currentWH) : 0;

                    if (!p.units || p.units.length === 0) {
                        priceAdjData.push({
                            id: p.id, unitIndex: -1, name: itemName, code: p.code || '', barcode: p.barcode || '',
                            category: p.category || 'عام', unit: p.unit || 'قطعة', 
                            lastBuyPrice: parseFloat(p.cost) || 0, avgBuyPrice: parseFloat(p.cost) || 0,
                            wholesale: parseFloat(p.wholesale) || 0, retail: parseFloat(p.price) || 0,
                            minPrice: parseFloat(p.minPrice) || 0, discount: parseFloat(p.discount) || 0, stock: liveStock
                        });
                    } else {
                        p.units.forEach((u, uIdx) => {
                            priceAdjData.push({
                                id: p.id, unitIndex: uIdx, name: itemName, code: p.code || '', barcode: p.barcode || '',
                                category: p.category || 'عام', unit: u.unitName, 
                                lastBuyPrice: (p.cost * u.factor), avgBuyPrice: (p.cost * u.factor),
                                wholesale: parseFloat(u.wholesale) || 0, retail: parseFloat(u.price) || 0,
                                minPrice: parseFloat(p.minPrice) || 0, discount: parseFloat(p.discount) || 0, 
                                stock: liveStock / u.factor
                            });
                        });
                    }
                });

                renderPriceAdjustmentTable();
                updatePriceAdjStats();

            } catch (err) {
                console.error("Price Adjustment Data Load Error:", err);
                tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:50px; color:#ef4444;">âŒ حدث خطأ أثناء المعالجة: ${err.message}</td></tr>`;
            }
        }

        // ================= وظائف مشاركة وتصدير الإيصال =================
        function shareTransaction(type, platform) {
            let text = "";
            let data = [];
            let partner = "";
            let title = "";

            if (type === 'sales') {
                data = cart;
                partner = document.getElementById('customerName').value || 'عميل';
                title = "فاتورة مبيعات";
            } else if (type === 'purchase') {
                data = purchaseCart;
                partner = document.getElementById('supplierName').value || 'مورد';
                title = "فاتورة مشتريات";
            } else if (type === 'salesReturn') {
                data = returnCart;
                partner = document.getElementById('salesReturnPartnerDisplay') ? document.getElementById('salesReturnPartnerDisplay').innerText : 'عميل';
                title = "مرتجع مبيعات";
            } else if (type === 'purchaseReturn') {
                data = purReturnCart;
                partner = document.getElementById('purReturnPartnerDisplay') ? document.getElementById('purReturnPartnerDisplay').innerText : 'مورد';
                title = "مرتجع مشتريات";
            } else if (type === 'receipt') {
                const amount = document.getElementById('receiptAmount').value;
                partner = document.getElementById('receiptCustomer').value || 'عميل';
                data = [{ name: 'سند قبض مالي', qty: 1, price: parseFloat(amount) || 0 }];
                title = "سند قبض";
            } else if (type === 'disbursement') {
                const amount = document.getElementById('disburseAmount').value;
                partner = document.getElementById('disbursePayee').value || 'جهة';
                data = [{ name: 'سند صرف مالي', qty: 1, price: parseFloat(amount) || 0 }];
                title = "إذن صرف";
            } else if (type === 'adjustment') {
                data = adjCart;
                partner = "المخزن الرئيسي / جرد";
                title = "محضر تسوية مخزنية";
            } else if (type === 'transfer') {
                const p = productsDB.find(x => x.id == document.getElementById('transferProduct').value);
                const q = document.getElementById('transferQty').value;
                const from = document.getElementById('transferFrom').value;
                const to = document.getElementById('transferTo').value;
                data = [{ name: `تحويل (${p ? p.name : 'صنف'}) من ${from} إلى ${to}`, qty: q, price: 0 }];
                partner = `من ${from} إلى ${to}`;
                title = "إذن تحويل مخزني";
            } else if (type === 'dailyReport') {
                const fromDate = document.getElementById('reportDateFrom').value;
                const toDate = document.getElementById('reportDateTo').value;
                const filtered = transactions.filter(t => t.dateISO >= fromDate && t.dateISO <= toDate);
                partner = `الفترة من ${fromDate} إلى ${toDate}`;
                title = "تقرير الحركة اليومية";

                // حساب الملخص للمشاركة (Summary for Sharing)
                let sTotal = 0, pTotal = 0, rTotal = 0, dTotal = 0;
                filtered.forEach(t => {
                    const total = parseFloat(t.total || t.price) || 0;
                    if (t.type.includes('بيع')) sTotal += total;
                    else if (t.type.includes('شراء')) pTotal += total;
                    else if (t.type.includes('قبض')) rTotal += total;
                    else if (t.type.includes('صرف')) dTotal += total;
                });
            } else if (type === 'itemHistory') {
                const activeIdx = selectedHistoryIndex;
                if (activeIdx === null || activeIdx === undefined) return;
                const t = transactions[activeIdx];
                text = `„ تفاصيل حركة الصنف\n\n النوع: ${t.type}\n رقم العملية: ${t.invoiceId || '-'}\n التاريخ: ${t.date}\n الطرف: ${t.partner}\n المبلغ: ${t.total || t.price}\n الصنف: ${t.product || '-'}`;
                if (platform === 'wa') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                else if (platform === 'tg') window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(text)}`);
                return;
            }

            if (data.length === 0) return alert("›’ القائمة فارغة! لا يوجد شيء لمشاركته.");

            // إغلاق أي قائمة مشاركة مفتوحة
            document.querySelectorAll('.share-menu').forEach(m => m.classList.remove('active'));

            text = ` * ${title} - نظام إدارة الأعمال * \n`;
            text += ` التاريخ: ${new Date().toLocaleString('ar-EG')}\n`;
            text += ` ${type === 'dailyReport' ? 'النطاق' : 'الطرف الثاني'}: ${partner}\n`;
            text += `------------------\n`;

            let total = 0;
            data.forEach(item => {
                const itemTotal = (parseFloat(item.price) || 0) * (parseFloat(item.qty) || 1);
                text += ` ${item.name} ${item.qty > 1 ? '(x' + item.qty + ')' : ''} = ${itemTotal.toFixed(2)}\n`;
                total += itemTotal;
            });

            text += `------------------\n`;
            if (type !== 'transfer' && type !== 'adjustment') {
                text += ` * الإجمالي: ${total.toFixed(2)} ج.م *\n`;
            }

            const encodedText = encodeURIComponent(text);
            const url = platform === 'wa'
                ? `https://api.whatsapp.com/send?text=${encodedText}`
                : `https://t.me/share/url?url=${encodedText}`;

            window.open(url, '_blank');
        }

        function exportCurrentBill(type, format) {
            let data = [];
            let fileName = "إيصال";
            let sectionId = "";

            if (type === 'sales') {
                data = cart;
                fileName = "فاتورة_مبيعات_" + (document.getElementById('customerName').value || 'عميل');
                sectionId = 'sales-section';
            } else if (type === 'salesReturn') {
                data = returnCart;
                fileName = "مرتجع_مبيعات_" + (document.getElementById('salesReturnPartnerDisplay') ? document.getElementById('salesReturnPartnerDisplay').innerText : 'عميل');
                sectionId = 'sales-return-section';
            } else if (type === 'purchaseReturn') {
                data = purReturnCart;
                fileName = "مرتجع_مشتريات_" + (document.getElementById('purReturnPartnerDisplay') ? document.getElementById('purReturnPartnerDisplay').innerText : 'مورد');
                sectionId = 'purchase-return-section';
            } else if (type === 'purchase') {
                data = purchaseCart;
                fileName = "فاتورة_مشتريات_" + (document.getElementById('supplierName').value || 'مورد');
                sectionId = 'purchase-section';
            } else if (type === 'receipt') {
                const amount = document.getElementById('receiptAmount').value;
                data = [{ name: 'سند قبض', qty: 1, price: parseFloat(amount) || 0 }];
                fileName = "سند_قبض_" + (document.getElementById('receiptCustomer').value || 'عميل');
                sectionId = 'receipt-section';
            } else if (type === 'disbursement') {
                const amount = document.getElementById('disburseAmount').value;
                data = [{ name: 'سند صرف', qty: 1, price: parseFloat(amount) || 0 }];
                fileName = "سند_صرف_" + (document.getElementById('disbursePayee').value || 'جهة');
                sectionId = 'disbursement-section';
            } else if (type === 'adjustment') {
                data = adjCart;
                fileName = "تسوية_مخزنية_" + new Date().toLocaleDateString('ar-EG');
                sectionId = 'adjustment-section';
            } else if (type === 'dailyReport') {
                const fromDate = document.getElementById('reportDateFrom').value;
                const toDate = document.getElementById('reportDateTo').value;
                const filtered = transactions.filter(t => t.dateISO >= fromDate && t.dateISO <= toDate);
                data = filtered.map(t => ({ name: `${t.type} - ${t.product || t.partner}`, qty: t.qty || 1, price: parseFloat(t.total || t.price) || 0 }));
                fileName = `تقرير_الحركة_${fromDate}_إلى_${toDate}`;
                sectionId = 'daily-report-section';
            } else if (type === 'itemHistory') {
                const pName = document.getElementById('histProductName') ? document.getElementById('histProductName').innerText : 'صنف';
                const filtered = transactions.filter(t => t.product === pName);
                if (filtered.length === 0) return alert("âŒ لا توجد حركة لهذا الصنف لتصديرها");
                data = filtered.map(t => ({ name: `${t.type} (${t.date})`, qty: t.qty || 0, price: parseFloat(t.price) || 0 }));
                fileName = `حركة_صنف_${pName}`;
                sectionId = 'history-section';
            }

            if (data.length === 0) {
                alert("›’ القائمة فارغة! لا يوجد شيء لتصديره.");
                return;
            }

            // إغلاق قائمة المشاركة
            document.querySelectorAll('.share-menu').forEach(m => m.classList.remove('active'));

            if (format === 'excel') {
                let csvContent = "\uFEFFالصنف,الكمية,السعر,الإجمالي\n";
                data.forEach(item => {
                    const q = parseFloat(item.qty) || 1;
                    const p = parseFloat(item.price) || 0;
                    csvContent += `${item.name}, ${q}, ${p.toFixed(2)}, ${(q * p).toFixed(2)}\n`;
                });
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = fileName + ".csv";
                link.click();
            } else if (format === 'pdf') {
                if (type === 'sales') printBill();
                else if (type === 'salesReturn') printReturnReceipt('sales');
                else if (type === 'purchaseReturn') printReturnReceipt('purchase');
                else if (type === 'purchase') printPurchaseBill();
                else if (type === 'receipt') printReceiptData();
                else if (type === 'disbursement') printDisbursementData();
                else if (type === 'adjustment') printAdjustmentData();
                else if (type === 'dailyReport') printReportData();
            } else if (format === 'image') {
                if (typeof html2canvas !== 'undefined') {
                    const element = document.getElementById(sectionId);
                    html2canvas(element, {
                        backgroundColor: document.body.classList.contains('dark-mode') ? '#1a1600' : '#ffffff',
                        scale: 2
                    }).then(canvas => {
                        const link = document.createElement("a");
                        link.download = fileName + ".png";
                        link.href = canvas.toDataURL("image/png");
                        link.click();
                    });
                } else {
                    alert("⚠️ مكتبة تحويل الصور غير جاهزة، يرجى الانتظار ثانية أو إعادة تحميل الصفحة.");
                }
            }
        }

        function renderPriceAdjustmentTable() {
            const tbody = document.getElementById('priceAdjustmentTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            priceAdjData.forEach((p, idx) => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #f1f5f9';
                tr.innerHTML = `
                    <td style="text-align:center; color:#94a3b8;">${idx + 1}</td>
                    <td style="font-weight:bold; color:#64748b;">${p.code || '---'}</td>
                    <td style="text-align:right; font-weight:900; color:#1e293b;">${p.name}</td>
                    <td style="color:#64748b; font-size:0.8rem;">${p.barcode || '---'}</td>
                    <td>${p.shelf || '---'}</td>
                    <td style="font-weight:bold; color:var(--main-blue);">${p.unit || "قطعة"}</td>

                    <td><input type="number" value="${p.avgBuyPrice.toFixed(2)}" class="price-adj-input" 
                        onchange="updatePriceAdjValue(${idx}, 'avgBuyPrice', this.value)" 
                        style="width:90px; border:1px solid var(--gold); background:#fffcf0; padding:5px; border-radius:6px; font-weight:bold; text-align:center;"></td>

                    <td style="text-align:center; color:#ef4444; font-weight:bold;">${p.lastBuyPrice.toFixed(2)}</td>

                    <td><input type="number" value="${p.discount || 0}" class="price-adj-input" 
                        onchange="updatePriceAdjValue(${idx}, 'discount', this.value)" 
                        style="width:70px; border:1px solid #cbd5e1; padding:5px; border-radius:6px; text-align:center;"></td>

                    <td style="background:rgba(197, 160, 89, 0.05);"><input type="number" value="${p.wholesale.toFixed(2)}" class="price-adj-input" 
                        onchange="updatePriceAdjValue(${idx}, 'wholesale', this.value)" 
                        style="width:100px; border:2px solid var(--gold); padding:5px; border-radius:6px; font-weight:900; text-align:center;"></td>

                    <td style="background:rgba(41, 128, 185, 0.05);"><input type="number" value="${p.retail.toFixed(2)}" class="price-adj-input" 
                        onchange="updatePriceAdjValue(${idx}, 'retail', this.value)" 
                        style="width:100px; border:2px solid var(--main-blue); padding:5px; border-radius:6px; font-weight:900; text-align:center;"></td>

                    <td><input type="number" value="${p.minPrice.toFixed(2)}" class="price-adj-input" 
                        onchange="updatePriceAdjValue(${idx}, 'minPrice', this.value)" 
                        style="width:90px; border:1px solid #dc2626; padding:5px; border-radius:6px; text-align:center; color:#dc2626; font-weight:bold;"></td>

                    <td style="text-align:center; background:#f8fafc; font-weight:900; color:${p.stock > 0 ? '#16a34a' : '#dc2626'}">${p.stock.toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function updatePriceAdjValue(idx, field, value) {
            if (priceAdjData[idx]) {
                priceAdjData[idx][field] = parseFloat(value) || 0;
                updatePriceAdjStats(); // تحديث الإحصائيات فوراً
            }
        }

        function updatePriceAdjStats() {
            let totalCost = 0;
            let totalSale = 0;
            priceAdjData.forEach(p => {
                totalCost += (p.avgBuyPrice * p.stock);
                totalSale += (p.retail * p.stock);
            });

            document.getElementById('priceAdjCount').innerText = priceAdjData.length;
            document.getElementById('priceAdjTotalCost').innerText = totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            document.getElementById('priceAdjTotalSale').innerText = totalSale.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function closePriceAdjustmentModal() {
            document.getElementById('priceAdjustmentModal').classList.add('hidden');
            document.getElementById('priceAdjSearch').value = '';
            priceAdjData = [];
        }
        document.addEventListener('click', function (e) {
            const invPopup = document.getElementById('invColSelectorPopup');
            if (invPopup && !invPopup.classList.contains('hidden')) {
                const btn = e.target.closest('.tool-btn.customize');
                if (!invPopup.contains(e.target) && !btn) {
                    invPopup.classList.add('hidden');
                }
            }

            const th = e.target.closest('th');
            if (th && th.closest('thead')) {
                const table = th.closest('table');
                const tbody = table.querySelector('tbody');
                if (!tbody || tbody.rows.length <= 1) return;

                const index = Array.from(th.parentElement.children).indexOf(th);
                const order = th.getAttribute('data-order') === 'asc' ? 'desc' : 'asc';

                // تنظيف الرؤوس الأخرى
                table.querySelectorAll('th').forEach(h => {
                    h.classList.remove('sort-asc', 'sort-desc');
                    h.setAttribute('data-order', 'none');
                });

                th.setAttribute('data-order', order);
                th.classList.add(order === 'asc' ? 'sort-asc' : 'sort-desc');

                const rows = Array.from(tbody.rows);
                const sortedRows = rows.sort((rowA, rowB) => {
                    const cellA = rowA.cells[index].innerText.trim();
                    const cellB = rowB.cells[index].innerText.trim();

                    // 1. فحص هل القيم أرقام
                    const numA = parseFloat(cellA.replace(/,/g, ''));
                    const numB = parseFloat(cellB.replace(/,/g, ''));

                    if (!isNaN(numA) && !isNaN(numB)) {
                        return order === 'asc' ? numA - numB : numB - numA;
                    }

                    // 2. فحص هل القيم تواريخ
                    const dateA = new Date(cellA);
                    const dateB = new Date(cellB);
                    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                        return order === 'asc' ? dateA - dateB : dateB - dateA;
                    }

                    // 3. الفرز النصي (عربي/إنجليزي)
                    return order === 'asc'
                        ? cellA.localeCompare(cellB, 'ar', { numeric: true })
                        : cellB.localeCompare(cellA, 'ar', { numeric: true });
                });

                tbody.append(...sortedRows);
            }
        });

        // نظام تحديد الصف المختار عند الضغط (Row Selection Logic)
        document.addEventListener('click', function (e) {
            const row = e.target.closest('tr');
            if (row && row.closest('tbody')) {
                // استبعاد صفوف الرأس (التي تقع في thead)
                const tbody = row.closest('tbody');
                if (tbody) {
                    tbody.querySelectorAll('tr').forEach(tr => tr.classList.remove('row-selected'));
                    row.classList.add('row-selected');
                }
            }
        });

        // وظيفة خصم الفكة (تقريب المبلغ للأصغر) بناءً على طلب المستخدم
        function applyFractionalDiscount(type) {
            let totalEl, discInput, discTypeEl, discReasonEl, calcFn, reasonsArr, datalistId;

            if (type === 'sales') {
                totalEl = document.getElementById('totalAmount');
                discInput = document.getElementById('discountInput');
                discTypeEl = document.getElementById('discountType');
                discReasonEl = document.getElementById('discountReason');
                reasonsArr = (typeof discountReasons !== 'undefined') ? discountReasons : [];
                datalistId = 'discountReasonsList';
                calcFn = calculateTotals;
            } else if (type === 'salesReturn') {
                totalEl = document.getElementById('returnTotalAmount');
                discInput = document.getElementById('salesReturnDiscount');
                discTypeEl = document.getElementById('salesReturnDiscountType');
                discReasonEl = document.getElementById('salesReturnDiscountReason');
                reasonsArr = [];
                datalistId = '';
                calcFn = () => updateReturnTotal();
            } else if (type === 'purchaseReturn') {
                totalEl = document.getElementById('purReturnTotalAmount');
                discInput = document.getElementById('purReturnDiscount');
                discTypeEl = document.getElementById('purReturnDiscountType');
                discReasonEl = document.getElementById('purReturnDiscountReason');
                reasonsArr = [];
                datalistId = '';
                calcFn = () => updateReturnTotal('purchase');
            } else {
                totalEl = document.getElementById('purchaseTotal');
                discInput = document.getElementById('purchaseDiscount');
                discTypeEl = document.getElementById('purchaseDiscountType');
                discReasonEl = document.getElementById('purchaseDiscountReason');
                reasonsArr = (typeof purchaseDiscountReasons !== 'undefined') ? purchaseDiscountReasons : [];
                datalistId = 'purchaseDiscountReasonsList';
                calcFn = calculatePurchaseTotals;
            }

            if (!totalEl) return;
            let currentTotal = parseFloat(totalEl.innerText) || 0;
            let fraction = currentTotal - Math.floor(currentTotal);

            if (fraction > 0) {
                // التأكد من أن نوع الخصم هو "قيمة ثابتة" لسهولة التسوية
                if (discTypeEl) discTypeEl.value = 'fixed';

                let currentDisc = parseFloat(discInput.value) || 0;
                discInput.value = (currentDisc + fraction).toFixed(2);

                // إضافة السبب "خصم فكة" للقائمة إذا لم يكن موجوداً
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
                            opt.value = 'خصم فكة'; opt.text = 'خصم فكة ✅';
                            discReasonEl.add(opt);
                        }
                    }
                    discReasonEl.value = 'خصم فكة';
                }

                // إعادة طلب الحسابات لتحديث المجمعات النهائية
                calcFn();

                showCustomAlert({
                    type: 'info',
                    titleText: ' تسوية الفكة',
                    msg: `تم خصم مبلغ (<b>${fraction.toFixed(2)}</b>) بنجاح لتصحيح الفاتورة إلى عدد صحيح.`
                });
            } else {
                showCustomAlert({
                    type: 'warning',
                    titleText: '⚠️ لا توجد فكة',
                    msg: 'المبلغ الحالي هو عدد صحيح بالفعل ولا يحتوي على فكة للخصم.'
                });
            }
        }

        // ================= أزرار التنقل السريع (Navigation Logic) =================
        let currentProductNavIndex = -1;
        let currentInvoiceNavIndex = -1;

        // التنقل بين الأصناف
        function navigateProduct(direction) {
            if (productsDB.length === 0) return;
            if (currentProductNavIndex === -1) {
                currentProductNavIndex = productsDB.length - 1;
            } else {
                currentProductNavIndex += direction;
            }
            if (currentProductNavIndex < 0) {
                currentProductNavIndex = 0;
                return alert("⚠️ هذا هو أول صنف في السجل.");
            }
            if (currentProductNavIndex >= productsDB.length) {
                currentProductNavIndex = productsDB.length - 1;
                return alert("⚠️ هذا هو آخر صنف في السجل.");
            }
            fillProductModal(productsDB[currentProductNavIndex]);
        }

        function fillProductModal(p) {
            const preview = document.getElementById('productImagePreview');
            const removeBtn = document.getElementById('removeProductImageBtn');
            if (p.image) {
                preview.style.backgroundImage = `url(${p.image})`;
                preview.innerText = '';
                currentProductImageData = p.image;
                if (removeBtn) removeBtn.classList.remove('hidden');
            } else {
                preview.style.backgroundImage = 'none';
                preview.innerText = '·';
                currentProductImageData = null;
                if (removeBtn) removeBtn.classList.add('hidden');
            }

            document.getElementById('newItemName').value = p.name || '';
            document.getElementById('newItemSysCode').value = p.sysCode || p.id || '';
            document.getElementById('newItemPrice').value = p.price || 0;
            document.getElementById('newItemWholesale').value = p.wholesale || 0;
            document.getElementById('newItemCost').value = p.cost || 0;
            document.getElementById('newItemMinPrice').value = p.minPrice || 0;
            document.getElementById('newItemDiscount').value = p.discount || 0;
            document.getElementById('newItemBarcode').value = p.barcode || '';
            document.getElementById('newItemCode').value = p.code || '';
            document.getElementById('newItemCategory').value = p.category || 'عام';
            document.getElementById('newItemShelf').value = p.shelf || '';
            document.getElementById('newItemStock').value = p.stock || 0;
            document.getElementById('newItemMinStock').value = p.minStock || 0;
            document.getElementById('newItemCostQty').value = p.cost || 0;
            document.getElementById('newItemExpiry').value = p.expiry || '';
            document.getElementById('newItemNotes').value = p.notes || '';

            const tbody = document.getElementById('productUnitsTableBody');
            tbody.innerHTML = '';
            if (p.units && p.units.length > 0) {
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
            } else {
                addProductUnitRow('قطعة');
            }

            // تحديث حالة "الصنف السريع"
            const quickCheck = document.getElementById('isQuickItem');
            if (quickCheck) quickCheck.checked = !!p.isQuick;

            calculateUnitPrices();
        }

        // التنقل بين الفواتير
        function navigateInvoices(direction) {
            const groups = {};
            transactions.filter(t => t.type.includes('بيع') && !t.type.includes('مرتجع') && t.invoiceId).forEach(t => {
                if (!groups[t.invoiceId]) groups[t.invoiceId] = [];
                groups[t.invoiceId].push(t);
            });
            const ids = Object.keys(groups);
            if (ids.length === 0) return alert("⚠️ لا توجد فواتير مبيعات سابقة.");

            if (currentInvoiceNavIndex === -1 && direction === -1) {
                currentInvoiceNavIndex = ids.length - 1;
            } else {
                currentInvoiceNavIndex += direction;
            }

            if (currentInvoiceNavIndex >= ids.length) {
                currentInvoiceNavIndex = -1;
                resetSalesInvoiceStatus();
                return;
            }
            if (currentInvoiceNavIndex < 0) {
                currentInvoiceNavIndex = 0;
                return alert("⚠️ هذه هي أول فاتورة في السجل.");
            }

            const invId = ids[currentInvoiceNavIndex];
            loadInvoiceGroupForView(invId, groups[invId]);
        }

        function loadInvoiceGroupForView(invId, items) {
            // document.getElementById('navInvoiceStatus').innerText = `فاتورة #${invId}`;
            // document.getElementById('navInvoiceStatus').style.color = "#ffc107";
            cart = items.map(it => ({
                name: it.product,
                price: parseFloat(it.price) || 0,
                qty: parseFloat(it.qty) || 0,
                total: parseFloat(it.total) || 0
            }));
            renderCart();
            if (items[0]) document.getElementById('customerName').value = items[0].partner || '';
            toggleInvoiceEditing(false);
        }

        function resetSalesInvoiceStatus() {
            // document.getElementById('navInvoiceStatus').innerText = "جديدة";
            // document.getElementById('navInvoiceStatus').style.color = "var(--gold)";
            cart = [];
            renderCart();
            document.getElementById('customerName').value = "";
            toggleInvoiceEditing(true);
        }

        function toggleInvoiceEditing(enabled) {
            const section = document.getElementById('sales-section');
            const inputs = section.querySelectorAll('input, select');
            const saveBtn = section.querySelector('.btn-save');
            inputs.forEach(el => {
                if (!el.id.includes('Search') && el.id !== 'customerName' && el.id !== 'productSearch') {
                    el.disabled = !enabled;
                }
            });
            document.getElementById('productSearch').disabled = !enabled;
            if (saveBtn) saveBtn.style.display = enabled ? 'block' : 'none';
        }

        // --- فلترة سلة مرتجع البيع ---
        function openPriceAdjustmentModal() {
            if (!checkPermission('products_edit')) return;

            // جلب الأرقام التعريفية للأصناف المحددة من الـ Set
            const selectedIds = Array.from(window.selectedInventoryIds);

            document.getElementById('priceAdjustmentModal').classList.remove('hidden');

            // تعبئة قائمة التصنيفات في الفلتر
            const catSelect = document.getElementById('priceAdjCategory');
            if (catSelect) {
                catSelect.innerHTML = '<option value="all">كافة التصنيفات</option>';
                const cats = [...new Set(productsDB.map(p => p.category).filter(c => c))];
                cats.forEach(c => {
                    catSelect.innerHTML += `<option value="${c}">${c}</option>`;
                });
            }

            loadPriceAdjustmentData(selectedIds);

            // تطبيق إعدادات إخفاء الأعمدة المحفوظة فور الفتح
            if (typeof applyPriceAdjColumnVisibility === 'function') {
                setTimeout(applyPriceAdjColumnVisibility, 100);
            }
        }

        function closePriceAdjustmentModal() {
            document.getElementById('priceAdjustmentModal').classList.add('hidden');
        }

        let priceAdjData = []; // بيانات مؤقتة للتعديل

        function loadPriceAdjustmentData(selectedIds = []) {
            const tbody = document.getElementById('priceAdjustmentTableBody');
            if (!tbody) return;

            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:50px;">â³ جاري فحص ومزامنة البيانات...</td></tr>';

            try {
                // التأكد من أن قاعدة البيانات محملة
                if (!Array.isArray(productsDB) || productsDB.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:50px; color:#ef4444;">⚠️ قاعدة بيانات الأصناف غير متوفرة حالياً، يرجى إعادة المحاولة.</td></tr>';
                    return;
                }

                // دالة جلب المعرفات المختارة (معرفة داخلياً لضمان العمل) من الـ Set
                function getSelectedInventoryIds() {
                    return Array.from(window.selectedInventoryIds);
                }

                // دالة البحث الشامل (Global Search)
                const searchQ = document.getElementById('priceAdjSearch').value.toLowerCase().trim();
                const catQ = document.getElementById('priceAdjCategory').value;
                const selectedIds = getSelectedInventoryIds();

                let targets = [];

                if (selectedIds.length > 0 && !searchQ) {
                    // إذا كان هناك تحديد "ولم يبحث المستخدم عن شيء آخر"، نظهر المحدد فقط
                    targets = productsDB.filter(p => selectedIds.includes(p.id));
                } else if (searchQ.length > 0 || catQ !== 'all') {
                    // إذا كان هناك بحث، نبحث في كل الداتا (12 ألف صنف)
                    targets = productsDB.filter(p => {
                        const nameMatch = String(p.name || '').toLowerCase().includes(searchQ);
                        const codeMatch = String(p.code || '').toLowerCase().includes(searchQ);
                        const barcodeMatch = String(p.barcode || '').toLowerCase().includes(searchQ);
                        const catMatch = (catQ === 'all') || (p.category === catQ);
                        return (nameMatch || codeMatch || barcodeMatch) && catMatch;
                    });
                    if (targets.length > 500) targets = targets.slice(0, 500);
                } else {
                    // غير ذلك: تحميل أول 100 صنف
                    targets = productsDB.slice(0, 100);
                }

                priceAdjData = [];
                const currentWH = (currentUser && currentUser.warehouseName) ? currentUser.warehouseName : 'المخزن الرئيسي';

                targets.forEach(p => {
                    const itemName = p.name || 'صنف غير مسمى';
                    const itemCode = p.code || '';
                    const itemBarcode = p.barcode || '';
                    // حساب رصيد الصنف في كافة المخازن ليتطابق مع (إجمالي المخزون) في التقرير
                    let liveStock = 0;
                    if (typeof warehouses !== 'undefined' && Array.isArray(warehouses)) {
                        warehouses.forEach(w => {
                            liveStock += getWarehouseStock(itemName, w.name);
                        });
                    } else {
                        liveStock = getWarehouseStock(itemName, currentWH);
                    }

                    // الاعتماد على التكلفة المباشرة للصنف لضمان التطابق التام 100% مع شاشة (أرصدة المخازن)
                    const pTrans = transactions.filter(t => t.product === itemName && t.type.includes('شراء'));
                    const liveAvgCost = parseFloat(p.cost) || 0; 
                    const lastPPrice = pTrans.length > 0 ? parseFloat(pTrans[pTrans.length - 1].price) : liveAvgCost;

                    if (!p.units || p.units.length === 0) {
                        // صنف بدون وحدات إضافية
                        priceAdjData.push({
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
                            profitMargin: liveAvgCost > 0 ? (((parseFloat(p.price) || 0) - liveAvgCost) / liveAvgCost * 100).toFixed(1) : 0
                        });
                    } else {
                        // صنف بوحدات متعددة
                        p.units.forEach((u, uIdx) => {
                            const uCost = (liveAvgCost * (u.factor || 1));
                            const uRetail = parseFloat(u.price) || 0;
                            priceAdjData.push({
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
                                stock: liveStock / (u.factor || 1), // الرصيد بوحدة الصنف
                                profitMargin: uCost > 0 ? ((uRetail - uCost) / uCost * 100).toFixed(1) : 0
                            });
                        });
                    }
                });

                renderPriceAdjustmentTable();
                updatePriceAdjStats();

                if (selectedIds.length > 0 && targets.length > 0) {
                showToast(`✅ تم تحميل عدد (${targets.length}) صنف و (${priceAdjData.length}) وحدة بيع`, 'success');
                }
            } catch (err) {
                console.error("Price Adjustment Data Load Error:", err);
                tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:50px; color:#ef4444;">âŒ حدث خطأ أثناء المعالجة: ${err.message}</td></tr>`;
            }
        }

        function renderPriceAdjustmentTable(filteredData = null) {
            const tbody = document.getElementById('priceAdjustmentTableBody');
            if (!tbody) return;

            tbody.innerHTML = '';
            const dataToRender = filteredData || priceAdjData;

            if (dataToRender.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:50px; color:#64748b;">” لم يتم العثور على أي بيانات لعرضها.</td></tr>';
                if (document.getElementById('priceAdjCount')) document.getElementById('priceAdjCount').innerText = '0';
                return;
            }

            let htmlBuffer = [];
            dataToRender.forEach((p) => {
                // البحث عن المحل الفعلي لهذا الصنف في المصفوفة الأصلية
                const originalIndex = priceAdjData.findIndex(item => item.id === p.id && item.unitIndex === p.unitIndex);
                // if (originalIndex === -1) return;

                const isSubUnit = p.unitIndex > 0;
                const isEven = originalIndex % 2 === 0;
                const rowBg = isSubUnit ? 'rgba(255, 255, 255, 0.6)' : (isEven ? 'rgba(39, 174, 96, 0.1)' : 'rgba(197, 160, 89, 0.1)');
                const accentColor = isSubUnit ? '#94a3b8' : (isEven ? '#27ae60' : '#c9a84c');

                // حساب الربح لحظياً
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
                        <td class="col-adj-6" style="font-size:0.8rem; color:#64748b; font-weight:bold; text-align:center;">${p.unit || "قطعة"}</td>
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
            document.getElementById('priceAdjCount').innerText = dataToRender.length;

            // تطبيق إعدادات إظهار/إخفاء الأعمدة المخصصة
            if (typeof applyPriceAdjColumnVisibility === 'function') applyPriceAdjColumnVisibility();
        }

        async function updateRowPriceAdj(adjIndex, field, value) {
            const item = priceAdjData[adjIndex];
            if (item) {
                const newValue = parseFloat(value) || 0;
                item[field] = newValue;

                // تحديث هامش الربح في الداتا
                if (field === 'retail' || field === 'avgBuyPrice') {
                    item.profitMargin = item.avgBuyPrice > 0 ? ((item.retail - item.avgBuyPrice) / item.avgBuyPrice * 100).toFixed(1) : 0;
                }

                renderPriceAdjustmentTable(); // إعادة الرندر لتحديث الأرباح لايف
                updatePriceAdjStats();

                try {
                    // --- الحفظ التلقائي المباشر لضمان عدم ضياع البيانات ---
                    const pInDB = await db.products.get(item.id);
                    if (pInDB) {
                        if (item.unitIndex === -1) {
                            // منتج بدون وحدات
                            if (field === 'retail') pInDB.price = newValue;
                            else if (field === 'wholesale') pInDB.wholesale = newValue;
                            else if (field === 'minPrice') pInDB.minPrice = newValue;
                            else if (field === 'discount') pInDB.discount = newValue;
                            else if (field === 'avgBuyPrice') pInDB.cost = newValue;
                        } else {
                            // منتج بوحدات
                            if (pInDB.units && pInDB.units[item.unitIndex]) {
                                if (field === 'retail') pInDB.units[item.unitIndex].price = newValue;
                                else if (field === 'wholesale') pInDB.units[item.unitIndex].wholesale = newValue;
                                else if (field === 'avgBuyPrice') pInDB.units[item.unitIndex].cost = newValue;

                                // مزامنة الوحدة الأولى مع الكائن الرئيسي
                                if (item.unitIndex === 0) {
                                    if (field === 'retail') pInDB.price = newValue;
                                    else if (field === 'wholesale') pInDB.wholesale = newValue;
                                    else if (field === 'avgBuyPrice') pInDB.cost = newValue;
                                }
                            }
                        }
                        await db.products.put(pInDB);

                        // تحديث المصفوفة العالمية فوراً
                        const updatedProducts = await db.products.toArray();
                        productsDB = updatedProducts;

                        console.log(`✅ Auto-saved item ${item.id} - ${field}: ${newValue}`);
                    }
                } catch (err) {
                    console.error("Auto-save failed:", err);
                }
            }
        }

        function handlePriceAdjSearch() {
            const query = document.getElementById('priceAdjSearch').value.toLowerCase();
            const cat = document.getElementById('priceAdjCategory').value;
            const stockFilter = document.getElementById('priceAdjStockFilter').value; // all, in, out

            const filtered = priceAdjData.filter(p => {
                const nameMatch = p.name.toLowerCase().includes(query) || 
                                 (p.barcode && p.barcode.includes(query)) ||
                                 (p.code && String(p.code).includes(query));

                const catMatch = (cat === 'all' || p.category === cat);

                let stockMatch = true;
                if (stockFilter === 'in') stockMatch = (p.stock > 0);
                else if (stockFilter === 'out') stockMatch = (p.stock <= 0);

                return nameMatch && catMatch && stockMatch;
            });
            renderPriceAdjustmentTable(filtered);
        }

        function applyBulkPriceAdjustment(direction = 1) {
            const inputVal = parseFloat(document.getElementById('priceAdjBulkPercent').value);
            if (isNaN(inputVal) || inputVal <= 0) return alert("⚠️ يرجى إدخال نسبة مئوية صحيحة (مثلاً 5)");

            const percent = inputVal * direction;
            const q = document.getElementById('priceAdjSearch').value.toLowerCase();
            const cat = document.getElementById('priceAdjCategory').value;

            // تطبيق التعديل فقط على العناصر المعروضة حالياً
            if (priceAdjData.length === 0) return alert("âŒ لا توجد أصناف لتعديلها");

            if (!confirm(`⚠️ هل أنت متأكد من تعديل أسعار عدد (${priceAdjData.length}) صنف بنسبة ${percent}%؟`)) return;

            priceAdjData.forEach(p => {
                const factor = 1 + (percent / 100);
                p.retail = Math.round(p.retail * factor * 2) / 2; // تقريب لأقرب 0.50
                p.wholesale = Math.round(p.wholesale * factor * 2) / 2;
                p.minPrice = Math.round(p.minPrice * factor * 2) / 2;
            });

            renderPriceAdjustmentTable();
            updatePriceAdjStats();
            showToast(`✅ تم تطبيق تعديل ${percent}% على الأصناف المعروضة.`, 'success');
        }

        function updatePriceAdjStats() {
            let totalCost = 0;
            let totalSale = 0;
            priceAdjData.forEach(p => {
                // لتجنب تكرار حساب الرصيد للأصناف ذات الوحدات المتعددة، نجمع الوحدة الأساسية فقط
                if (p.unitIndex === -1 || p.unitIndex === 0) {
                    const rowCost = p.avgBuyPrice * p.stock;
                    const rowProfit = (p.retail > 0) ? (p.retail - p.avgBuyPrice) * p.stock : 0;

                    totalCost += rowCost;
                    totalSale += (rowCost + rowProfit);
                }
            });
            document.getElementById('priceAdjTotalCost').innerText = totalCost.toFixed(2);
            document.getElementById('priceAdjTotalSale').innerText = totalSale.toFixed(2);
        }

        async function performActualPriceSaving() {
            const grouped = {};
            priceAdjData.forEach(item => {
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
            productsDB = await db.products.toArray();
            const isCloudReady = (typeof syncProductsToSupabase === 'function' && supabaseClient);
            if (isCloudReady) {
                try { await syncProductsToSupabase(); } catch(e) {}
            }
            // تحديث الواجهات الأخرى
            if (typeof renderInventoryTable === 'function') renderInventoryTable();
        }

        async function savePriceAdjustments() {
            if (!window.enforceSubscriptionCheck('other')) return false;
            if (priceAdjData.length === 0) {
                closePriceAdjustmentModal();
                return;
            }
            closePriceAdjustmentModal(); // إغلاق النافذة فوراً كما طلب المستخدم
            showToast("⏳ جاري حفظ التعديلات في الخلفية...", 'info');

            try {
                // تجميع التعديلات حسب معرف المنتج
                const grouped = {};
                priceAdjData.forEach(item => {
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

                // تحديث المزامنة مع Supabase بأمان
                const isCloudReady = (typeof syncProductsToSupabase === 'function' && supabaseClient);
                if (isCloudReady) {
                    try {
                        toggleStatus('cloud', 'sync');
                        await syncProductsToSupabase();
                    } catch(e) { console.warn("Cloud sync deferred:", e); }
                }

                // أهم سطر: تحديث المصفوفة العالمية فوراً
                productsDB = await db.products.toArray();

                // showLoading(false);
                showToast("✅ تم حفظ كافة تعديلات الأسعار بنجاح!", 'success');

                // تحديث كافة الجداول والواجهات المرتبطة بالأسعار (في الخلفية)
                if (typeof renderInventoryTable === 'function') renderInventoryTable();
                if (typeof renderWarehouseReportTable === 'function') renderWarehouseReportTable();
                if (typeof renderProductsGrid === 'function') renderProductsGrid();
                if (typeof updateInventoryStats === 'function') updateInventoryStats();
                if (typeof updateDashboard === 'function') updateDashboard();

            } catch (error) {
                console.error("Error saving prices:", error);
                // showLoading(false);
                alert("âŒ حدث خطأ أثناء الحفظ: " + error.message);
            }
        }
        // --- تحسين تجربة البحث: التركيز التلقائي عند الكتابة في قسم المخزن ---
        document.addEventListener('keydown', (e) => {
            // التأكد من أننا في قسم المخزن وأن المستخدم لا يكتب في مدخل آخر حالياً
            const activeTab = (typeof openTabs !== 'undefined') ? openTabs.find(t => t.id === activeTabId) : null;
            if (activeTab && activeTab.type === 'inventory') {
                const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

                // إذا لم يكن التركيز على مدخل نصي، وكان المفتاح حرفاً أو رقماً
                if (!isInput && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    const searchInput = document.getElementById('invSearchInput');
                    if (searchInput) {
                        searchInput.focus();
                        // لا نحتاج لإضافة الحرف يدوياً لأن التركيز سيجعل المتصفح يكتبه تلقائياً في المربع
                    }
                }
            }
        });

        // --- تفعيل حقل الباركود (Scanner) ---
        function initBarcodeScannerHandlers() {
            const bcInput = document.getElementById('newItemBarcode');
            if (!bcInput) return;

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
                    const exists = productsDB.find(p => p.barcode === val && p.id !== currentEditingProductId);
                    if (exists) {
                        if (typeof showToast === 'function') {
                            showToast(`⚠️ تنبيه: هذا الباركود مسجل مسبقاً لصنف (${exists.name})`, 'warning');
                        } else {
                            alert(`⚠️ تنبيه: هذا الباركود مسجل مسبقاً لصنف (${exists.name})`);
                        }
                        bcInput.style.border = '2px solid red';
                    } else {
                        bcInput.style.border = '1px solid #ddd';
                    }
                }
            });
        }
        // استدعاء التهيئة عند تحميل الملف
        setTimeout(initBarcodeScannerHandlers, 1000);

        // --- تصدير قائمة تعديل الأسعار إلى إكسيل ---
        function exportPriceAdjToExcel() {
            try {
                if (typeof XLSX === 'undefined') {
                    return alert("❌ مكتبة Excel غير محملة حالياً.");
                }

                // جلب البيانات المعروضة حالياً في الجدول (المفلترة)
                const query = document.getElementById('priceAdjSearch').value.toLowerCase();
                const cat = document.getElementById('priceAdjCategory').value;
                const stockFilter = document.getElementById('priceAdjStockFilter').value;

                // ملاحظة: priceAdjData هي مصفوفة عالمية يتم تعبئتها عند فتح المودال
                const filtered = priceAdjData.filter(p => {
                    const nameMatch = p.name.toLowerCase().includes(query) || 
                                     (p.barcode && p.barcode.includes(query)) ||
                                     (p.code && String(p.code).includes(query));
                    const catMatch = (cat === 'all' || p.category === cat);
                    let stockMatch = true;
                    if (stockFilter === 'in') stockMatch = (p.stock > 0);
                    else if (stockFilter === 'out') stockMatch = (p.stock <= 0);
                    return nameMatch && catMatch && stockMatch;
                });

                if (filtered.length === 0) return alert("❌ لا توجد بيانات لتصديرها حالياً.");

                const exportData = filtered.map((p, index) => ({
                    "م": index + 1,
                    "الكود الداخلي": p.sysCode || p.id,
                    "كود الصنف": p.code || "-",
                    "اسم الصنف": p.name,
                    "الباركود": p.barcode || "",
                    "الوحدة": p.unit || "قطعة",
                    "متوسط التكلفة": p.avgBuyPrice ? p.avgBuyPrice.toFixed(2) : "0.00",
                    "آخر شراء": p.lastBuyPrice ? p.lastBuyPrice.toFixed(2) : "0.00",
                    "سعر الجملة": p.wholesale ? p.wholesale.toFixed(2) : "0.00",
                    "سعر القطاعي": p.retail ? p.retail.toFixed(2) : "0.00",
                    "الربح %": (p.profitMargin || 0) + "%",
                    "أدنى سعر": p.minPrice ? p.minPrice.toFixed(2) : "0.00",
                    "الرصيد": p.stock
                }));

                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "أسعار المخزون");

                const fileName = `تقرير_أسعار_المخزن_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`;
                XLSX.writeFile(wb, fileName);

                showToast("✅ تم تصدير ملف الإكسيل بنجاح", "success");
            } catch (err) {
                console.error("Export Error:", err);
                alert("❌ فشل التصدير: " + err.message);
            }
        }
