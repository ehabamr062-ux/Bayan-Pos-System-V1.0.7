const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The corrupted block is around dm-mid-group up to nav_adjust. Let's just do a clean regex replace from "dm-mid-group" down to "آلة حاسبة".
const fixedHTML = `                <div class="dm-mid-group">
                    <div class="dm-mid-tile blue" onclick="openNewAccountModal()" data-perm="accounts_add">
                        <span class="icon"><img src="https://img.icons8.com/color/48/add-user-group-man-man.png" alt="icon" style="width: 32px; height: 32px;"></span>
                        <span class="label">إضافة حساب جديد</span>
                    </div>
                    <div class="dm-mid-tile blue" onclick="openNewItemModal()" data-perm="stock_add">
                        <span class="icon"><img src="https://img.icons8.com/color/48/add-property.png" alt="icon" style="width: 32px; height: 32px;"></span>
                        <span class="label">إضافة صنف جديد</span>
                    </div>
                    <div class="dm-mid-tile"
                        style="background: linear-gradient(135deg, #1e293b, #0f172a); border: 2px solid var(--gold); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; transition: 0.3s; border-radius: 15px; padding: 10px; text-align: center;"
                        onclick="openPriceAdjustmentModal()" data-perm="stock_edit">
                        <span class="icon" style="margin-bottom: 5px;"><img src="https://img.icons8.com/color/48/money-circulation.png" style="width: 32px; height: 32px;" alt="icon"></span>
                        <span style="font-weight: 900; color: var(--gold); font-size: 0.82rem; line-height: 1.3;">إدارة
                            الأسعار<br>والمخازن</span>
                    </div>
                    <div class="dm-mid-tile blue" onclick="switchSection('settings')" data-perm="general_settings">
                        <span class="icon"><img src="https://img.icons8.com/color/48/settings--v1.png" alt="icon" style="width: 32px; height: 32px;"></span>
                        <span class="label" data-i18n="sidebar_settings" data-i18n="app_settings">الإعدادات</span>
                    </div>

                </div>
            </div>

            <div class="dm-section-title" style="padding-right: 0; text-align: center; margin-right: 0;">حدد نوع المستند
            </div>


            <!-- الشبكة الكبيرة: العمليات الأساسية -->
            <div class="dm-main-grid">
                <div class="dm-action-tile dm-btn-receipt" onclick="switchSection('receipt')" data-perm="docs_add">
                    <span class="icon"><img src="https://img.icons8.com/color/48/receive-cash.png" alt="icon" style="width: 36px; height: 36px;"></span>
                    <span class="label" data-i18n="nav_receipt">قبض</span>
                </div>
                <div class="dm-action-tile dm-btn-sale" onclick="switchSection('sales')" data-perm="docs_add">
                    <span class="icon"><img src="https://img.icons8.com/color/48/add-shopping-cart--v1.png" alt="icon" style="width: 36px; height: 36px;"></span>
                    <span class="label" data-i18n="nav_sales">بيع</span>
                </div>
                <div class="dm-action-tile dm-btn-pay" onclick="switchSection('disbursement')" data-perm="docs_add">
                    <span class="icon"><img src="https://img.icons8.com/color/48/pay-date.png" alt="icon" style="width: 36px; height: 36px;"></span>
                    <span class="label" data-i18n="nav_disbursement">صرف</span>
                </div>

                <div class="dm-action-tile dm-btn-rsell" onclick="switchSection('sales-return')" data-perm="docs_add">
                    <span class="icon"><img src="https://img.icons8.com/color/48/return-purchase.png" alt="icon" style="width: 36px; height: 36px;"></span>
                    <span class="label" data-i18n="nav_return_sale">مرتجع بيع</span>
                </div>

                <div class="dm-action-tile dm-btn-rpur" onclick="switchSection('purchase-return')" data-perm="docs_add">
                    <span class="icon"><img src="https://img.icons8.com/color/48/purchase-order.png" alt="icon" style="width: 36px; height: 36px;"></span>
                    <span class="label" data-i18n="nav_return_purchase">مرتجع شراء</span>
                </div>

                <div class="dm-action-tile dm-btn-pur" onclick="switchSection('purchase')" data-perm="docs_add">
                    <span class="icon"><img src="https://img.icons8.com/color/48/shopping-basket-2.png" alt="icon" style="width: 36px; height: 36px;"></span>
                    <span class="label" data-i18n="nav_purchases">شراء</span>
                </div>

                <div class="dm-action-tile dm-btn-adjust" onclick="switchSection('adjustment')" data-perm="stock_edit">
                    <span class="icon"><img src="https://img.icons8.com/color/48/scales.png" alt="icon" style="width: 36px; height: 36px;"></span>
                    <span class="label" data-i18n="nav_adjust">تسوية مخزن</span>
                </div>

                <div class="dm-action-tile dm-btn-history" onclick="switchSection('history')" data-perm="docs_view">
                    <span class="icon"><img src="https://img.icons8.com/color/48/order-history.png" alt="icon" style="width: 36px; height: 36px;"></span>
                    <span class="label" data-i18n="nav_history">حركة صنف</span>
                </div>

                <div class="dm-action-tile" style="background:#5e3370; color:white; border: 1px solid #3e214a;"
                    onclick="switchSection('warehouse-report')" data-perm="stock_view">
                    <span class="icon"><img src="https://img.icons8.com/color/48/warehouse.png" alt="icon" style="width: 36px; height: 36px;"></span>
                    <span class="label">أرصدة المخازن</span>
                </div>

                <div class="dm-action-tile"
                    style="background:#1a4d2e; color:white; border: 1px solid #0b2e13; margin-top: 30px;"
                    onclick="openTransferModal()" data-perm="stock_transfer">
                    <span class="icon"><img src="https://img.icons8.com/color/48/truck--v1.png" alt="icon" style="width: 36px; height: 36px;"></span>
                    <span class="label">تحويل المخزون</span>
                </div>

                <div class="dm-action-tile"
                    style="background: linear-gradient(135deg, #0f172a, #1e293b); border: 1px solid rgba(14, 165, 233, 0.4); grid-column: span 1; margin-top: 30px; border-radius: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.3);"
                    onclick="toggleCalculator()">`;

// Look for the corrupted block by searching for <div class="dm-mid-group"> and the calculator tile
const startIdx = html.indexOf('<div class="dm-mid-group">');
const endIdx = html.indexOf('<div class="dm-action-tile"', html.indexOf('onclick="toggleCalculator()"') - 200);

if (startIdx !== -1 && endIdx !== -1) {
    html = html.substring(0, startIdx) + fixedHTML + html.substring(html.indexOf('onclick="toggleCalculator()"') + 28);
    fs.writeFileSync('index.html', html);
    console.log('Restored successfully');
} else {
    console.log('Could not find markers');
}
