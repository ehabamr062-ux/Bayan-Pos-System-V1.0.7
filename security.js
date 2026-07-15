/**
 * Bayan POS Security Enhancements
 * Anti-Inspect, Anti-Copy, Anti-DevTools
 */
(function() {
    // 1. منع قائمة السياق (كليك يمين)
    document.addEventListener('contextmenu', function(e) {
        // السماح بها فقط داخل حقول الإدخال
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });

    // 2. منع اختصارات لوحة المفاتيح
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }

        // Ctrl+S (Save As)
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+P (Print) - نمنع الطباعة من الكيبورد إذا لم تكن مقصودة من النظام
        if (e.ctrlKey && e.keyCode === 80) {
            e.preventDefault();
            return false;
        }

        // منع التحديد (Ctrl+A) والنسخ (Ctrl+C) إلا داخل حقول الإدخال
        if (e.ctrlKey && (e.keyCode === 65 || e.keyCode === 67)) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                return false;
            }
        }
    });

    // 3. منع التحديد بالماوس (CSS)
    const style = document.createElement('style');
    style.innerHTML = `
        body, .main-content, .sidebar, .card, .btn, span, p, h1, h2, h3, h4, h5, h6, label, div {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }
        
        /* استثناء حقول الإدخال لكي يستطيع الكتابة وتحديد النص داخلها */
        input, textarea, select {
            -webkit-user-select: auto !important;
            -moz-user-select: auto !important;
            -ms-user-select: auto !important;
            user-select: auto !important;
        }
    `;
    document.head.appendChild(style);


    // 5. منع سحب وإسقاط الصور والنصوص
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });

})();
