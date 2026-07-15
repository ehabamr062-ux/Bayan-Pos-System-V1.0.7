const fs = require('fs');

const file = 'index.html';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// Remove the corrupted lines from 738 to 768 (0-indexed 737 to 767)
const safeReplacement = `                    <div class="dm-mid-tile blue" onclick="switchSection('settings')" data-perm="general_settings">
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
                </div>`;

const newHtmlStr = lines.slice(0, 737).join('\n') + '\n' + safeReplacement + '\n' + lines.slice(768).join('\n');

fs.writeFileSync(file, newHtmlStr);
console.log('Fixed completely!');
