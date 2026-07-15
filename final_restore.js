const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const mainGridStr = `<div class="dm-main-grid">
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
                    <span class="icon"><img src="https://img.icons8.com/color/48/warehouse-1.png" alt="icon" style="width: 36px; height: 36px;"></span>
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

let startPattern = '<div class="dm-main-grid">';
let endPattern = 'onclick="toggleCalculator()">';

let startIdx = html.indexOf(startPattern);
let endIdx = html.indexOf(endPattern, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    html = html.substring(0, startIdx) + mainGridStr + html.substring(endIdx + endPattern.length);
    fs.writeFileSync('index.html', html);
    console.log('Restored main grid successfully');
} else {
    console.log('Could not find markers');
}
