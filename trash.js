
/**
 * نظام سلة المحذوفات الذكية - بَيَان POS
 * إدارة العناصر المحذوفة مؤقتاً وإمكانية استعادتها
 */

const trashManager = {
    // جلب كافة المحذوفات من قاعدة البيانات
    async loadTrash() {
        try {
            window.trashBin = await db.trash.toArray();
            // Parse originalData if it's stringified
            window.trashBin = window.trashBin.map(t => {
                if (typeof t.originalData === 'string') {
                    t.originalData = JSON.parse(t.originalData);
                }
                return t;
            });
            this.renderTrashTable();
        } catch (error) {
            console.error("خطأ في تحميل سلة المحذوفات:", error);
        }
    },

    /**
     * نقل عنصر إلى سلة المحذوفات
     */
    async moveToTrash(data, type, label) {
        const trashItem = {
            type: type,
            label: label,
            originalData: data,
            deletedAt: new Date().toISOString(),
            deletedBy: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : 'نظام آلي'
        };

        try {
            await db.trash.add(trashItem);
            await this.loadTrash();
            showToast(`🗑️ تم نقل "${label}" إلى سلة المحذوفات`, "info");
        } catch (error) {
            console.error("فشل النقل للسلة:", error);
            showToast("❌ فشل نقل العنصر لسلة المحذوفات", "error");
        }
    },

    // عرض جدول المحذوفات في الإعدادات
    renderTrashTable() {
        const tbody = document.getElementById('trashTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        if (window.trashBin.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">📭 سلة المحذوفات فارغة حالياً</td></tr>`;
            return;
        }

        // ترتيب من الأحدث للأقدم
        const sortedTrash = [...window.trashBin].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

        sortedTrash.forEach(item => {
            const tr = document.createElement('tr');
            
            let typeLabel = '';
            let icon = '';
            switch(item.type) {
                case 'product': typeLabel = 'صنف / منتج'; icon = '📦'; break;
                case 'transaction': typeLabel = 'فاتورة / عملية'; icon = '📄'; break;
                case 'account': typeLabel = 'حساب / عميل'; icon = '👤'; break;
                default: typeLabel = 'غير معروف'; icon = '❓';
            }

            const deleteDate = new Date(item.deletedAt).toLocaleString('ar-EG');

            tr.innerHTML = `
                <td style="padding:15px; font-weight:bold; color:#1e293b;">${icon} ${typeLabel}</td>
                <td style="font-weight:600;">${item.label || '---'}</td>
                <td style="font-weight:600; color:#475569;">👤 ${item.deletedBy || 'غير معروف'}</td>
                <td style="color:#64748b; font-size:0.8rem;">${deleteDate}</td>
                <td style="text-align:center;">
                    <div style="display:flex; gap:8px; justify-content:center;">
                        <button onclick="trashManager.restore(${item.id})" class="action-btn" style="background:#22c55e; color:white; border:none; padding:6px 12px; border-radius:8px; font-size:0.75rem; cursor:pointer;" title="استعادة">🔄 استعادة</button>
                        <button onclick="trashManager.permanentDelete(${item.id})" class="action-btn" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:8px; font-size:0.75rem; cursor:pointer;" title="حذف نهائي">🗑️ حذف نهائي</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    /**
     * استعادة عنصر من سلة المحذوفات
     */
    async restore(id) {
        const item = window.trashBin.find(x => x.id === id);
        if (!item) {
            alert("⚠️ لم يتم العثور على العنصر في السلة!");
            return;
        }

        try {
            const data = item.originalData;
            
            if (item.type === 'product') {
                await db.products.put(data);
                window.productsDB = await db.products.toArray();
                if (typeof renderInventoryTable === 'function') renderInventoryTable();
            } else if (item.type === 'transaction') {
                if (Array.isArray(data)) {
                    await db.transactions.bulkAdd(data);
                } else if (data.items) {
                    await db.transactions.bulkAdd(data.items);
                } else {
                    await db.transactions.add(data);
                }
                transactions = await db.transactions.toArray();
                if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
            } else if (item.type === 'account') {
                await db.accounts.put(data);
                window.accounts = await db.accounts.toArray();
                if (typeof renderAccountsTable === 'function') renderAccountsTable();
            }

            // الحذف من السلة بعد الاستعادة الناجحة
            await db.trash.delete(id);
            await this.loadTrash();

            showToast(`✅ تم استعادة "${item.label}" بنجاح`, "success");
        } catch (error) {
            console.error("فشل الاستعادة:", error);
            alert("❌ فشل استعادة العنصر: " + error.message);
        }
    },

    /**
     * حذف نهائي لعنصر واحد
     */
    async permanentDelete(id) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert({
                type: 'warning',
                titleText: '🗑️ تأكيد الحذف النهائي',
                msg: 'هل أنت متأكد من حذف هذا العنصر نهائياً؟ <b>لا يمكن الاستعادة بعدها!</b>',
                confirmText: 'نعم، حذف نهائي',
                cancelText: 'تراجع',
                showCancel: true,
                onConfirm: async () => {
                    try {
                        await db.trash.delete(id);
                        await this.loadTrash();
                        showToast("🗑️ تم الحذف النهائي بنجاح", "info");
                    } catch (error) {
                        console.error("فشل الحذف النهائي:", error);
                    }
                }
            });
        } else {
            if (!confirm("🚨 هل أنت متأكد من حذف هذا العنصر نهائياً؟ لا يمكن الاستعادة بعدها!")) return;
            try {
                await db.trash.delete(id);
                await this.loadTrash();
                showToast("🗑️ تم الحذف النهائي بنجاح", "info");
            } catch (error) {
                console.error("فشل الحذف النهائي:", error);
            }
        }
    },

    /**
     * إفراغ السلة بالكامل
     */
    async emptyTrash() {
        if (trashBin.length === 0) return showToast("السلة فارغة بالفعل", "info");
        
        if (typeof showCustomAlert === 'function') {
            showCustomAlert({
                type: 'error',
                titleText: '🚨 إفراغ السلة بالكامل',
                msg: '<p style="font-weight:bold; color:#b91c1c;">هل أنت متأكد من إفراغ سلة المحذوفات بالكامل؟</p><p style="font-size:0.9rem; margin-top:5px;">سيتم حذف كافة العناصر بشكل نهائي ولا يمكن التراجع عن هذه الخطوة.</p>',
                confirmText: 'نعم، إفراغ السلة 🧹',
                cancelText: 'إلغاء 🛡️',
                showCancel: true,
                onConfirm: async () => {
                    try {
                        await db.trash.clear();
                        await this.loadTrash();
                        showToast("🧹 تم إفراغ السلة بنجاح", "success");
                    } catch (error) {
                        console.error("فشل إفراغ السلة:", error);
                    }
                }
            });
        } else {
            if (!confirm("🚨 هل أنت متأكد من إفراغ سلة المحذوفات بالكامل؟\nسيتم حذف كافة العناصر نهائياً!")) return;
            try {
                await db.trash.clear();
                await this.loadTrash();
                showToast("🧹 تم إفراغ السلة بنجاح", "success");
            } catch (error) {
                console.error("فشل إفراغ السلة:", error);
            }
        }
    }
};

// جعل الوظائف متاحة عالمياً للأزرار في HTML
window.emptyTrash = () => trashManager.emptyTrash();
window.renderTrashTable = () => trashManager.renderTrashTable();
window.trashManager = trashManager;

// تحميل البيانات عند بدء التشغيل
document.addEventListener('DOMContentLoaded', () => {
    // ننتظر قليلاً لضمان تحميل Dexie وقاعدة البيانات
    setTimeout(() => {
        if (typeof trashManager !== 'undefined') trashManager.loadTrash();
    }, 1000);
});
