// --- 0. Trash Helper ---

function addToTrash(type, data, desc) {
    const trashItem = {
        type: type,
        label: desc,
        originalData: JSON.parse(JSON.stringify(data)),
        deletedAt: new Date().toISOString(),
        deletedBy: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : 'نظام آلي'
    };

    if (typeof db !== 'undefined' && db.trash) {
        db.trash.add(trashItem).then(() => {
            if (typeof trashManager !== 'undefined') trashManager.loadTrash();
        });
    } else {
        // Fallback to legacy array if DB is not ready
        if (typeof trashBin === 'undefined') window.trashBin = [];
        trashBin.push({ ...trashItem, id: Date.now() });
        saveData();
    }
}

// --- 1. General Settings Logic ---

async function saveSettings() {
    const currentSettings = JSON.parse(getStore('pos_settings') || '{}');
    
    // 1. Phone Validation Logic
    const p1 = document.getElementById('shopPhone1').value.trim();
    const p2 = document.getElementById('shopPhone2').value.trim();
    const p3 = document.getElementById('shopPhone3').value.trim();
    const p4 = document.getElementById('shopPhone4').value.trim();

    const isNumeric = (str) => /^\d+$/.test(str);

    // Validate Mobile 1 (Primary)
    if (p1 && (p1.length !== 11 || !isNumeric(p1))) {
        return showToast("⚠️ الموبايل الأساسي يجب أن يكون 11 رقم بالضبط", "error");
    }
    // Validate WhatsApp
    if (p4 && (p4.length !== 11 || !isNumeric(p4))) {
        return showToast("⚠️ رقم واتساب يجب أن يكون 11 رقم بالضبط", "error");
    }
    // Validate Additional Phone
    if (p2 && (p2.length !== 11 || !isNumeric(p2))) {
        return showToast("⚠️ الهاتف الإضافي يجب أن يكون 11 رقم بالضبط", "error");
    }
    // Validate Landline
    if (p3 && (p3.length !== 10 || !isNumeric(p3))) {
        return showToast("⚠️ الخط الأرضي يجب أن يكون 10 أرقام بالضبط (كود المحافظة + الرقم)", "error");
    }

    const settings = {
        ...currentSettings,
        name: document.getElementById('shopName').value,
        phones: [p1, p2, p3, p4],
        address: document.getElementById('shopAddress').value,
        autoBackup: document.getElementById('autoBackupSetting').checked,
        autoBackupInterval: document.getElementById('autoBackupInterval').value,
        printFooterMsg: document.getElementById('printFooterMsg').value,
        // Financial Settings
        currencySymbol: document.getElementById('appCurrencySymbol').value || "ج.م",
        currencyName: document.getElementById('appCurrencyName').value || "جنيه مصري",
        taxPercent: parseFloat(document.getElementById('appTaxPercent').value) || 0,
        taxEnabled: document.getElementById('appTaxEnabled').checked,
        allowBackdating: document.getElementById('allowBackdating').checked,
        allowHistoryEdit: document.getElementById('allowHistoryEdit').checked
    };
    setStore('pos_settings', JSON.stringify(settings));

    // ✅ أمان: حفظ Gemini API Key في IndexedDB (لا يظهر في F12)
    const geminiKey = document.getElementById('geminiApiKeyInput').value.trim();
    try {
        if (typeof db !== 'undefined' && db.settings) {
            await db.settings.put({ id: 'gemini_key', value: geminiKey });
            removeStore('bayan_gemini_key'); // حذف القديم
        }
    } catch(e) {
        setStore('bayan_gemini_key', geminiKey); // fallback
    }
    const quickInput = document.getElementById('aiQuickApiKeyInput');
    if (quickInput) quickInput.value = geminiKey;

    // Apply permissions immediately
    applyPermissions();

    // Update App Title (Preserving the Rocket Emoji)
    if (settings.name) {
        const titleEl = document.getElementById('appTitle');
        if (titleEl) titleEl.innerHTML = '🚀 ' + settings.name;
    }

    await saveData();
    showToast("✅ تم حفظ جميع الإعدادات بنجاح!", "success");
}

function loadSettings() {
    const settings = JSON.parse(getStore('pos_settings') || '{}');
    
    if (settings.name) {
        document.getElementById('shopName').value = settings.name;
        const titleEl = document.getElementById('appTitle');
        if (titleEl) titleEl.innerHTML = '🚀 ' + settings.name;
    }
    if (settings.address) document.getElementById('shopAddress').value = settings.address;
    if (settings.printFooterMsg) document.getElementById('printFooterMsg').value = settings.printFooterMsg;
    if (settings.phones) {
        document.getElementById('shopPhone1').value = settings.phones[0] || '';
        document.getElementById('shopPhone2').value = settings.phones[1] || '';
        document.getElementById('shopPhone3').value = settings.phones[2] || '';
        document.getElementById('shopPhone4').value = settings.phones[3] || '';
    }
    if (settings.fontSize) {
        window.currentFontSize = settings.fontSize;
        if (typeof applyFontSize === 'function') {
            applyFontSize(window.currentFontSize);
        } else {
            const display = document.getElementById('currentFontSizeDisplay');
            if (display) display.innerText = window.currentFontSize + 'px';
            const slider = document.getElementById('globalScaleSlider');
            if (slider) slider.value = window.currentFontSize;
        }
    }
    if (settings.autoBackup !== undefined) document.getElementById('autoBackupSetting').checked = settings.autoBackup;
    if (settings.autoBackupInterval !== undefined) document.getElementById('autoBackupInterval').value = settings.autoBackupInterval;

    // Load Financial Settings
    if (settings.currencySymbol) document.getElementById('appCurrencySymbol').value = settings.currencySymbol;
    if (settings.currencyName) document.getElementById('appCurrencyName').value = settings.currencyName;
    if (settings.taxPercent !== undefined) document.getElementById('appTaxPercent').value = settings.taxPercent;
    if (settings.taxEnabled !== undefined) document.getElementById('appTaxEnabled').checked = settings.taxEnabled;
    if (settings.allowBackdating !== undefined) document.getElementById('allowBackdating').checked = settings.allowBackdating;
    if (settings.allowHistoryEdit !== undefined) document.getElementById('allowHistoryEdit').checked = settings.allowHistoryEdit;

    // ✅ أمان: قراءة Gemini Key من IndexedDB أولاً
    const geminiInput = document.getElementById('geminiApiKeyInput');
    const quickInput2 = document.getElementById('aiQuickApiKeyInput');
    (async () => {
        let geminiKey = '';
        try {
            if (typeof db !== 'undefined' && db.settings) {
                const stored = await db.settings.get('gemini_key');
                if (stored && stored.value) geminiKey = stored.value;
            }
        } catch(e) {}
        // Fallback للنظام القديم
        if (!geminiKey) {
            const oldKey = getStore('bayan_gemini_key');
            if (oldKey) geminiKey = oldKey;
        }
        if (geminiInput) geminiInput.value = geminiKey;
        if (quickInput2) quickInput2.value = geminiKey;
    })();

    // Apply Logic Constraints based on Permissions
    applyPermissions();
}

function applyPermissions() {
    const settings = JSON.parse(getStore('pos_settings') || '{}');
    const canBackdate = !!settings.allowBackdating;
    const canEditHistory = !!settings.allowHistoryEdit;

    // 1. Control Date & Time fields
    const dateInputs = [
        'salesDate', 'salesTime', 'purchaseDate', 'purchaseTime',
        'receiptDate', 'receiptTime', 'disburseDate', 'disburseTime',
        'salesReturnDate', 'salesReturnTime', 'purReturnDate', 'purReturnTime',
        'adjDate', 'adjTime', 'transferDate', 'transferTime'
    ];

    dateInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.readOnly = !canBackdate;
            el.style.opacity = canBackdate ? "1" : "0.7";
            el.style.pointerEvents = canBackdate ? "auto" : "none";
        }
    });

    // 2. Control Edit/Delete buttons in history tables
    let styleEl = document.getElementById('permissions-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'permissions-style';
        document.head.appendChild(styleEl);
    }

    if (!canEditHistory) {
        styleEl.textContent = `
            .history-table .btn-edit-row, 
            .history-table .btn-delete-row, 
            .history-table [onclick*="editSelectedInvoice"], 
            .history-table [onclick*="deleteSelectedInvoice"], 
            .history-table [onclick*="editTransaction"] {
                display: none !important;
            }
        `;
    } else {
        styleEl.textContent = '';
    }
}

// --- 2. User Management Logic ---

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    users.forEach((u, idx) => {
        const isSuperAdmin = (u.id === 1);
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 800; color: #1e293b;">${u.name}</td>
                <td style="font-family: monospace; letter-spacing: 1px;">${(u.role === 'admin' && !isSuperAdmin) ? '****' : u.pin}</td>
                <td>
                    <span class="role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}" 
                          style="padding: 5px 12px; border-radius: 50px; font-size: 0.75rem; font-weight: 900; background: ${u.role === 'admin' ? '#ebfbee' : '#f1f5f9'}; color: ${u.role === 'admin' ? '#1e8449' : '#475569'}; border: 1px solid ${u.role === 'admin' ? '#c3e6cb' : '#e2e8f0'};">
                        ${u.role === 'admin' ? '⭐ مدير نظام' : '🔹 موظف كاشير'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-delete-row" style="color: #6366f1; background: #eef2ff;" onclick="editUser(${idx})" title="تعديل">✏️</button>
                        ${!isSuperAdmin ? `<button class="btn-delete-row" style="color: #ef4444; background: #fef2f2;" onclick="deleteUser(${idx})" title="حذف">🗑️</button>` : '<span title="لا يمكن حذف المدير الرئيسي">🛡️</span>'}
                    </div>
                </td>
            </tr>
        `;
    });
}

function addUser() {
    const name = document.getElementById('newUserName').value.trim();
    const pin = document.getElementById('newUserPin').value.trim();
    const role = document.getElementById('newUserRole').value;

    if (!name || !pin) return showToast("⚠️ يرجى إدخال اسم المستخدم ورمز الدخول", "error");

    const permissions = {
        docs: {
            add: document.getElementById('perm_docs_add').checked,
            purchase_price: document.getElementById('perm_docs_purchase_price').checked,
            edit: document.getElementById('perm_docs_edit').checked,
            delete: document.getElementById('perm_docs_delete').checked,
            view: document.getElementById('perm_docs_view').checked
        },
        stock: {
            add: document.getElementById('perm_stock_add').checked,
            edit: document.getElementById('perm_stock_edit').checked,
            delete: document.getElementById('perm_stock_delete').checked,
            transfer: document.getElementById('perm_stock_transfer').checked,
            view: document.getElementById('perm_stock_view').checked
        },
        accounts: {
            add: document.getElementById('perm_acc_add').checked,
            edit: document.getElementById('perm_acc_edit').checked,
            delete: document.getElementById('perm_acc_delete').checked,
            statement: document.getElementById('perm_acc_statement').checked,
            view: document.getElementById('perm_acc_view').checked
        },
        general: {
            reports: document.getElementById('perm_gen_reports').checked,
            profits: document.getElementById('perm_gen_profits').checked,
            settings: document.getElementById('perm_gen_settings').checked,
            users: document.getElementById('perm_gen_users').checked
        }
    };

    const newUser = { 
        id: window.editingUserId || Date.now(), 
        name, 
        pin, 
        role, 
        permissions 
    };

    if (window.editingUserId) {
        const idx = users.findIndex(u => u.id === window.editingUserId);
        if (idx !== -1) users[idx] = newUser;
        window.editingUserId = null;
        showToast("✅ تم تحديث بيانات المستخدم بنجاح", "success");
    } else {
        if (users.some(u => u.name === name)) return showToast("🚫 اسم المستخدم موجود بالفعل!", "error");
        users.push(newUser);
        showToast("✅ تم إضافة المستخدم الجديد بنجاح", "success");
    }

    saveData();
    renderUsersTable();
    resetUserForm();
    
    if (typeof logAuditAction === 'function') logAuditAction(window.editingUserId ? 'تحديث مستخدم' : 'إضافة مستخدم جديد', `الاسم: ${newUser.name}, الدور: ${newUser.role}`);
    if (typeof syncUsersToCloud === 'function') syncUsersToCloud();
}

function toggleAdminPermsUI(role) {
    const container = document.getElementById('permPanelsContainer');
    const msg = document.getElementById('adminFullAccessMsg');
    if (!container || !msg) return;
    if (role === 'admin') {
        container.style.display = 'none';
        msg.style.display = 'block';
    } else {
        container.style.display = 'block';
        msg.style.display = 'none';
    }
}

window.editingUserId = null;
function editUser(idx) {
    const u = users[idx];
    window.editingUserId = u.id;
    document.getElementById('newUserName').value = u.name;
    document.getElementById('newUserPin').value = u.pin;
    document.getElementById('newUserRole').value = u.role;
    toggleAdminPermsUI(u.role);

    const p = u.permissions || {};
    if (p.docs) {
        document.getElementById('perm_docs_add').checked = !!p.docs.add;
        document.getElementById('perm_docs_purchase_price').checked = !!p.docs.purchase_price;
        document.getElementById('perm_docs_edit').checked = !!p.docs.edit;
        document.getElementById('perm_docs_delete').checked = !!p.docs.delete;
        document.getElementById('perm_docs_view').checked = !!p.docs.view;
    }
    if (p.stock) {
        document.getElementById('perm_stock_add').checked = !!p.stock.add;
        document.getElementById('perm_stock_edit').checked = !!p.stock.edit;
        document.getElementById('perm_stock_delete').checked = !!p.stock.delete;
        document.getElementById('perm_stock_transfer').checked = !!p.stock.transfer;
        document.getElementById('perm_stock_view').checked = !!p.stock.view;
    }
    if (p.accounts) {
        document.getElementById('perm_acc_add').checked = !!p.accounts.add;
        document.getElementById('perm_acc_edit').checked = !!p.accounts.edit;
        document.getElementById('perm_acc_delete').checked = !!p.accounts.delete;
        document.getElementById('perm_acc_statement').checked = !!p.accounts.statement;
        document.getElementById('perm_acc_view').checked = !!p.accounts.view;
    }
    if (p.general) {
        document.getElementById('perm_gen_reports').checked = !!p.general.reports;
        document.getElementById('perm_gen_profits').checked = !!p.general.profits;
        document.getElementById('perm_gen_settings').checked = !!p.general.settings;
        document.getElementById('perm_gen_users').checked = !!p.general.users;
    }
    
    showToast("✏️ جاري تعديل بيانات " + u.name, "info");
}

function resetUserForm() {
    window.editingUserId = null;
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserPin').value = '';
    document.getElementById('newUserRole').value = 'user';
    document.querySelectorAll('.permissions-container input[type="checkbox"]').forEach(chk => {
        chk.checked = chk.id.includes('view') || chk.id.includes('reports') || chk.id.includes('add');
    });
}

function deleteUser(idx) {
    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
        const u = users[idx];
        if (typeof addToTrash === 'function') addToTrash('user', u, `مستخدم: ${u.name}`);
        const deletedName = u.name;
        users.splice(idx, 1);
        saveData();
        renderUsersTable();
        if (typeof trashManager !== 'undefined' && trashManager.renderTrashTable) trashManager.renderTrashTable();

        if (typeof logAuditAction === 'function') logAuditAction('حذف مستخدم', `الاسم: ${deletedName}`);
        if (typeof syncUsersToCloud === 'function') syncUsersToCloud();
    }
}

function switchPermTab(panelId, btn) {
    // تحديث الأزرار
    document.querySelectorAll('.perm-tab').forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = '#64748b';
        t.style.boxShadow = 'none';
    });
    
    // تحديث الألواح
    document.querySelectorAll('.perm-panel').forEach(p => {
        p.style.display = 'none';
    });

    // تفعيل المختار
    if (btn) {
        btn.classList.add('active');
        btn.style.background = 'white';
        btn.style.color = '#1e293b';
        btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.05)';
    }
    
    const target = document.getElementById('perm-panel-' + panelId);
    if (target) {
        target.style.display = 'grid';
    }
}

function checkPermission(action) {
    // ✅ أمان: التحقق من صحة المستخدم عبر مصفوفة users المحملة من IndexedDB
    // لا نثق بالبيانات المخزنة في localStorage مباشرة لأن أي شخص يستطيع تعديلها
    if (!currentUser) return false;

    // إعادة التحقق من الـ PIN مقابل مصفوفة users الحقيقية من IndexedDB
    if (typeof users !== 'undefined' && users.length > 0) {
        const pin = currentUser.pin;
        const realUser = users.find(u => u.pin === pin);
        if (!realUser) {
            // الـ PIN لا يطابق أي مستخدم حقيقي → رفض الوصول وتسجيل خروج
            currentUser = null;
            removeStore('pos_session_user');
            return false;
        }
        // نستخدم بيانات المستخدم الحقيقية من IndexedDB (ليس من localStorage)
        if (realUser.role === 'admin') return true;

        if (!realUser.permissions) {
            showCustomAlert({
                type: 'error',
                titleText: '⚠️ تنبيه أمني',
                msg: 'هذا الحساب لا يمتلك صلاحيات محددة. يرجى مراجعة المدير.'
            });
            return false;
        }

        const parts = action.split('_');
        const module = parts[0];
        const perm = parts.slice(1).join('_');
        const userPerms = realUser.permissions[module];
        if (userPerms && userPerms[perm]) return true;

        showCustomAlert({
            type: 'error',
            titleText: '🚫 وصول مرفوض',
            msg: 'عذراً، ليس لديك صلاحية للقيام بهذا الإجراء (' + (action.replace('_', ' ')) + '). يرجى مراجعة مدير النظام.'
        });
        return false;
    }

    // Fallback: لو مصفوفة users لم تُحمَّل بعد، نعتمد على currentUser المحمل في الذاكرة
    if (currentUser.role === 'admin') return true;

    if (!currentUser.permissions) {
        showCustomAlert({
            type: 'error',
            titleText: '⚠️ تنبيه أمني',
            msg: 'هذا الحساب لا يمتلك صلاحيات محددة. يرجى مراجعة المدير.'
        });
        return false;
    }

    const parts = action.split('_');
    const module = parts[0];
    const perm = parts.slice(1).join('_');
    const userPerms = currentUser.permissions[module];
    if (userPerms && userPerms[perm]) return true;

    showCustomAlert({
        type: 'error',
        titleText: '🚫 وصول مرفوض',
        msg: 'عذراً، ليس لديك صلاحية للقيام بهذا الإجراء (' + (action.replace('_', ' ')) + '). يرجى مراجعة مدير النظام.'
    });
    return false;
}

function hasPermission(action) {
    if (!currentUser) return false;
    // ✅ أمان: التحقق من الـ PIN مقابل مصفوفة users من IndexedDB
    if (typeof users !== 'undefined' && users.length > 0) {
        const realUser = users.find(u => u.pin === currentUser.pin);
        if (!realUser) return false;
        if (realUser.role === 'admin') return true;
        if (!realUser.permissions) return false;
        const parts = action.split('_');
        const module = parts[0];
        const perm = parts.slice(1).join('_');
        const userPerms = realUser.permissions[module];
        return !!(userPerms && userPerms[perm]);
    }
    // Fallback لو users لم تُحمَّل بعد
    if (currentUser.role === 'admin') return true;
    if (!currentUser.permissions) return false;
    const parts = action.split('_');
    const module = parts[0];
    const perm = parts.slice(1).join('_');
    const userPerms = currentUser.permissions[module];
    return !!(userPerms && userPerms[perm]);
}

// --- 3. Warehouse Management Logic ---

function openWarehouseModal() {
    document.getElementById('warehouseModal').classList.remove('hidden');
    document.getElementById('warehouseModalTitle').innerText = ' إضافة مخزن جديد';
    document.getElementById('editWarehouseId').value = '';
    document.getElementById('warehouseName').value = '';
    document.getElementById('warehouseAddress').value = '';
}

function editWarehouse(idx) {
    const w = warehouses[idx];
    document.getElementById('warehouseModal').classList.remove('hidden');
    document.getElementById('warehouseModalTitle').innerText = ' تعديل مخزن';
    document.getElementById('editWarehouseId').value = idx;
    document.getElementById('warehouseName').value = w.name;
    document.getElementById('warehouseAddress').value = w.address || '';
}

function saveWarehouse() {
    const name = document.getElementById('warehouseName').value;
    const address = document.getElementById('warehouseAddress').value;
    const id = document.getElementById('editWarehouseId').value;

    if (!name) return alert("يرجى كتابة اسم المخزن");

    if (id !== '') {
        const w = warehouses[id];
        const oldName = w.name;
        w.name = name; 
        w.address = address;

        if (currentUser && currentUser.warehouseName === oldName) {
            currentUser.warehouseName = name;
            setStore('pos_session_user', JSON.stringify(currentUser));
            if (document.getElementById('currentWarehouseName')) {
                document.getElementById('currentWarehouseName').innerText = ` ${name}`;
            }
        }

        let updatedCount = 0;
        transactions.forEach(t => {
            let changed = false;
            if (t.warehouse === oldName) {
                t.warehouse = name;
                changed = true;
            }
            if (t.sourceWarehouse === oldName) {
                t.sourceWarehouse = name;
                changed = true;
            }
            if (t.partner && typeof t.partner === 'string') {
                const parts = t.partner.split(' -> ');
                if (parts.length === 2) {
                    let fromW = parts[0].trim();
                    let toW = parts[1].trim();
                    let partnerChanged = false;
                    if (fromW === oldName) {
                        fromW = name;
                        partnerChanged = true;
                    }
                    if (toW === oldName) {
                        toW = name;
                        partnerChanged = true;
                    }
                    if (partnerChanged) {
                        t.partner = `${fromW} -> ${toW}`;
                        changed = true;
                    }
                } else if (t.partner === oldName) {
                    t.partner = name;
                    changed = true;
                }
            }
            if (changed) {
                updatedCount++;
            }
        });
    } else {
        warehouses.push({ id: Date.now(), name, address });
    }
    saveData();
    renderWarehousesTable();
    document.getElementById('warehouseModal').classList.add('hidden');
    if (typeof renderInventoryTable === 'function') renderInventoryTable();
}

function renderWarehousesTable() {
    const tbody = document.getElementById('warehousesTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    warehouses.forEach((w, idx) => {
        tbody.innerHTML += `<tr><td>${w.name}</td><td>${w.address || '-'}</td><td><button class="btn-save" style="padding:5px;" onclick="editWarehouse(${idx})">✍️ تعديل</button></td></tr>`;
    });
    updateSettingsWarehouseSelect();
    updateWarehousesSummaryBoard();
}

function updateSettingsWarehouseSelect() {
    const select = document.getElementById('settingsActiveWarehouseSelect');
    if (!select) return;
    select.innerHTML = warehouses.map(w => `<option value="${w.name}" ${currentUser && currentUser.warehouseName === w.name ? 'selected' : ''}>${w.name}</option>`).join('');
}

function applyWarehouseSwitchFromSettings() {
    const val = document.getElementById('settingsActiveWarehouseSelect').value;
    if (currentUser) {
        currentUser.warehouseName = val;
        // ✅ أمان: نحفظ pin فقط (لا role أو permissions)
        setStore('pos_session_user', JSON.stringify({ pin: currentUser.pin, warehouseName: val }));
        const whHeader = document.getElementById('currentWarehouseName');
        if (whHeader) whHeader.innerText = ` 📦 ${val}`;
        showToast(`تم تغيير المستودع النشط إلى: ${val}`, "success");
        updateWarehousesSummaryBoard();
        
        // تحديث كافة الجداول لعرض بيانات المخزن الجديد فوراً
        if (typeof renderInventoryTable === 'function') renderInventoryTable();
        if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
        if (typeof renderPOSCart === 'function') renderPOSCart();
    }
}

function updateWarehousesSummaryBoard() {
    const board = document.getElementById('warehousesSummaryBoard');
    if (!board) return;
    board.innerHTML = '';

    warehouses.forEach(w => {
        let itemsCount = 0;
        let totalQty = 0;
        let totalValue = 0;

        productsDB.forEach(p => {
            if (typeof getWarehouseStock === 'function') {
                const stockInWarehouse = getWarehouseStock(p.name, w.name);
                if (stockInWarehouse !== 0) {
                    itemsCount++;
                    totalQty += stockInWarehouse;
                    totalValue += (stockInWarehouse * (parseFloat(p.cost) || 0));
                }
            }
        });

        const div = document.createElement('div');
        div.style = `background: white; padding: 15px; border-radius: 12px; border: 1px solid rgba(201,168,76,0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.05); transition: 0.3s; cursor: pointer; border-right: 4px solid var(--gold);`;
        div.innerHTML = `
            <div style="font-weight: bold; color: #2c3e50; font-size: 1rem; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                 ${w.name}
                ${currentUser && currentUser.warehouseName === w.name ? '<span style="background:var(--main-green); color:white; font-size:0.6rem; padding:2px 6px; border-radius:10px; font-weight:normal;">المستخدم حالياً</span>' : ''}
            </div>
            <hr style="border:0; border-top:1px solid #eee; margin-bottom:10px;">
            <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="font-size: 0.85rem; color: #666; display: flex; justify-content: space-between;">
                    <span> عدد الأصناف:</span>
                    <span style="font-weight: bold; color:#000;">${itemsCount}</span>
                </div>
                <div style="font-size: 0.85rem; color: #666; display: flex; justify-content: space-between;">
                    <span> إجمالي الكمية:</span>
                    <span style="font-weight: bold; color:#2ecc71;">${totalQty}</span>
                </div>
                <div style="font-size: 0.85rem; color: #666; display: flex; justify-content: space-between; border-top: 1px dashed #eee; padding-top: 5px; margin-top: 5px;">
                    <span> قيمة المخزن (تكلفة):</span>
                    <span style="font-weight: bold; color:var(--main-blue);">${totalValue.toFixed(2)}</span>
                </div>
            </div>
        `;
        board.appendChild(div);
    });
}

// --- 4. Aesthetics & Theme Logic ---

function changeLanguage(lang) {
    window.currentLanguage = lang;
    const settings = JSON.parse(getStore('pos_settings') || '{}');

    if (lang === 'ar') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
    } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = lang;
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key === 'app_title' && settings.name) return;

        if (window.translations && window.translations[lang] && window.translations[lang][key]) {
            if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                el.placeholder = window.translations[lang][key];
            } else {
                el.innerText = window.translations[lang][key];
            }
        }
    });

    settings.language = lang;
    setStore('pos_settings', JSON.stringify(settings));

    const select = document.getElementById('appLanguageSelect');
    if (select) select.value = lang;
}

/**
 * دالة تصفير قاعدة البيانات بالكامل (Reset Database)
 * تقوم بحذف كافة البيانات من Dexie ومسح الإعدادات مع الحفاظ على هوية الجهاز
 */
async function confirmFullReset() {
    if (typeof showCustomAlert !== 'function') {
        alert("وظيفة التنبيهات المخصصة غير متوفرة.");
        return;
    }

    showCustomAlert({
        type: 'error',
        titleText: '🚨 تحذير نهائي خطير',
        msg: `
            <div style="text-align: right; color: #b91c1c;">
                <p style="font-weight: 900; font-size: 1.1rem; margin-bottom: 10px;">هل أنت متأكد من رغبتك في تدمير كافة البيانات؟</p>
                <p style="font-size: 0.9rem; margin-bottom: 20px; color: #475569;">لا يمكن استعادة البيانات بعد هذه الخطوة نهائياً إلا إذا كنت تملك نسخة احتياطية خارجية.</p>
                <label style="font-weight: bold; color: #1e293b;">🔐 للأمان، يرجى إدخال رمز الدخول (PIN) لتأكيد العملية:</label>
                <input type="password" id="resetPinInput" placeholder="****" 
                    style="width: 100%; padding: 12px; margin-top: 10px; border-radius: 10px; border: 2px solid #cbd5e1; text-align: center; font-size: 1.5rem; letter-spacing: 5px; outline: none; transition: 0.3s;"
                    onfocus="this.style.borderColor='#e11d48'">
            </div>
        `,
        confirmText: 'تدمير كافة البيانات 💣',
        cancelText: 'إلغاء 🛡️',
        showCancel: true,
        onConfirm: async () => {
            const pinInput = document.getElementById('resetPinInput');
            const pin = pinInput ? pinInput.value.trim() : '';

            if (!pin) {
                return showToast("❌ تم إلغاء العملية: يجب إدخال الرمز السري.", "error");
            }
            
            if (typeof currentUser !== 'undefined' && currentUser.pin !== pin) {
                return showToast("❌ رمز الدخول غير صحيح، تم إلغاء العملية.", "error");
            }

            showToast("⏳ جاري تصفير قاعدة البيانات... يرجى عدم إغلاق المتصفح", "info");

            try {
                // 1. مسح جداول البيانات فقط من Dexie (نحافظ على جدول settings الذي يحتوي HWID + الترخيص + مفتاح AI)
                const tables = ['products', 'transactions', 'accounts', 'users', 'trash', 'auditLogs', 'wallpapers'];
                if (typeof db !== 'undefined') {
                    for (const table of tables) {
                        if (db[table]) await db[table].clear();
                    }
                }

                // 2. مسح localStorage بالكامل (البيانات الحساسة في IndexedDB settings الآن)
                clearStore();

                showToast("✅ تم تصفير النظام بنجاح. سيتم إعادة تحميل الصفحة الآن.", "success");
                
                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } catch (error) {
                console.error("فشل تصفير قاعدة البيانات:", error);
                showToast("❌ حدث خطأ أثناء تصفير البيانات: " + error.message, "error");
            }
        }
    });
}

async function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    setStore('pos_theme', isDark ? 'dark' : 'light');

    const themeBtn = document.querySelector('.theme-toggle-btn');
    if (themeBtn) {
        themeBtn.innerText = isDark ? '☀️ ' : '';
    }
    await saveData();
}

function changeAppColor(color) {
    document.documentElement.style.setProperty('--main-green', color);
    const settings = JSON.parse(getStore('pos_settings') || '{}');
    settings.mainColor = color;
    setStore('pos_settings', JSON.stringify(settings));
}



