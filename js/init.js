
// ================= نظام بَيَان POS - نقطة الانطلاق (Initialization) =================
// يتم استدعاء هذه الدالة بعد تحميل كافة الملفات المعيارية (Modules)

loadData().then(async () => {
    // 1. تحميل الخلفية المخصصة
    if (typeof loadWallpaper === 'function') {
        await loadWallpaper();
    }
    
    // 2. تحديث التوجيهات بناءً على حالة المستخدم
    if (currentUser) {
        console.log(`👤 أهلاً بك مجدداً: ${currentUser.name}`);
        if (typeof updateNotifications === 'function') updateNotifications();
    } else {
        if (typeof initLogin === 'function') initLogin();
    }

    console.log("🚀 نظام بَيَان المتكامل جاهز للعمل بنجاح!");
});
