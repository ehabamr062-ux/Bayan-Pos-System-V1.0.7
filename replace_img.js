const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const imgIcons = {
  'nav_price_tracking': '<img src="https://img.icons8.com/color/48/price-tag.png" alt="icon" style="width: 28px; height: 28px;">',
  'nav_invoices': '<img src="https://img.icons8.com/color/48/invoice.png" alt="icon" style="width: 28px; height: 28px;">',
  'nav_accounts': '<img src="https://img.icons8.com/color/48/group.png" alt="icon" style="width: 28px; height: 28px;">',
  'nav_inventory': '<img src="https://img.icons8.com/color/48/open-box.png" alt="icon" style="width: 28px; height: 28px;">',
  'nav_product_inquiry': '<img src="https://img.icons8.com/color/48/search--v1.png" alt="icon" style="width: 28px; height: 28px;">',
  'nav_ai': '<img src="https://img.icons8.com/color/48/robot-2.png" alt="icon" style="width: 28px; height: 28px;">',
  'تحليل مبيعات': '<img src="https://img.icons8.com/color/48/combo-chart.png" alt="icon" style="width: 36px; height: 36px;">',
  'تقرير الحركة اليومية': '<img src="https://img.icons8.com/color/48/line-chart.png" alt="icon" style="width: 36px; height: 36px;">',
  'إضافة حساب جديد': '<img src="https://img.icons8.com/color/48/add-user-group-man-man.png" alt="icon" style="width: 32px; height: 32px;">',
  'إضافة صنف جديد': '<img src="https://img.icons8.com/color/48/add-property.png" alt="icon" style="width: 32px; height: 32px;">',
  'app_settings': '<img src="https://img.icons8.com/color/48/settings--v1.png" alt="icon" style="width: 32px; height: 32px;">',
  'nav_receipt': '<img src="https://img.icons8.com/color/48/receive-cash.png" alt="icon" style="width: 36px; height: 36px;">',
  'nav_sales': '<img src="https://img.icons8.com/color/48/add-shopping-cart--v1.png" alt="icon" style="width: 36px; height: 36px;">',
  'nav_disbursement': '<img src="https://img.icons8.com/color/48/pay-date.png" alt="icon" style="width: 36px; height: 36px;">',
  'nav_return_sale': '<img src="https://img.icons8.com/color/48/return-purchase.png" alt="icon" style="width: 36px; height: 36px;">',
  'nav_return_purchase': '<img src="https://img.icons8.com/color/48/purchase-order.png" alt="icon" style="width: 36px; height: 36px;">',
  'nav_purchases': '<img src="https://img.icons8.com/color/48/shopping-basket-2.png" alt="icon" style="width: 36px; height: 36px;">',
  'nav_adjust': '<img src="https://img.icons8.com/color/48/scales.png" alt="icon" style="width: 36px; height: 36px;">',
  'nav_history': '<img src="https://img.icons8.com/color/48/order-history.png" alt="icon" style="width: 36px; height: 36px;">',
  'أرصدة المخازن': '<img src="https://img.icons8.com/color/48/warehouse-1.png" alt="icon" style="width: 36px; height: 36px;">',
  'تحويل المخزون': '<img src="https://img.icons8.com/color/48/truck--v1.png" alt="icon" style="width: 36px; height: 36px;">'
};

// Replace back to images
Object.keys(imgIcons).forEach(key => {
  let regex;
  if (key.startsWith('nav_') || key.startsWith('app_')) {
    regex = new RegExp('<span class=\"icon\">.*?<\/span>\\s*<span class=\"label\"[^>]*data-i18n=\"' + key + '\".*?>', 'g');
  } else {
    regex = new RegExp('<span class=\"icon\"[^>]*>.*?<\/span>\\s*<span class=\"label\"[^>]*>' + key + '<\/span>', 'g');
  }
  
  html = html.replace(regex, (match) => {
    return match.replace(/<span class=\"icon\"[^>]*>.*?<\/span>/, `<span class="icon">${imgIcons[key]}</span>`);
  });
});

// Fix special item (إدارة الأسعار والمخازن)
html = html.replace(/<span class=\"icon\" style=\"margin-bottom: 5px;\">.*?<\/span>\s*<span[^>]*>إدارة\s*الأسعار<br>والمخازن<\/span>/, 
  `<span class="icon" style="margin-bottom: 5px;"><img src="https://img.icons8.com/color/48/money-circulation.png" style="width: 32px; height: 32px;" alt="icon"></span>
                        <span style="font-weight: 900; color: var(--gold); font-size: 0.82rem; line-height: 1.3;">إدارة
                            الأسعار<br>والمخازن</span>`
);

fs.writeFileSync('index.html', html);
console.log('Images applied.');
