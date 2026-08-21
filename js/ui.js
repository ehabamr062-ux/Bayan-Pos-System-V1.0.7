        window.openNewBayanWindow = function() {
    try {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            if (ipcRenderer) {
                ipcRenderer.invoke('open-new-window');
                return;
            }
        }
    } catch (e) {
        console.warn("Electron IPC unavailable, opening fallback window:", e);
    }
    window.open(window.location.href, '_blank');
};

function updateSubscriptionUI(hwid, plan, daysLeft) {
            const hwidEl = document.getElementById('modalSubHwid');
            const planEl = document.getElementById('modalSubPlan');
            const countEl = document.getElementById('modalSubCountdown');
            const displayHwid = document.getElementById('displayHwid');

            const startDateEl = document.getElementById('modalSubStartDate');
            const daysUsedEl = document.getElementById('modalSubDaysUsed');
            const transferPhoneEl = document.getElementById('modalSubTransferPhone');

            if (displayHwid) displayHwid.innerText = hwid;

            // تمييز كارت الباقة النشط
            const oldPlan = window.currentBayanPlanUIState || 'باقة نسخة المجانية';
            window.currentBayanPlanUIState = plan;

            // إذا انتقل المستخدم من النسخة المجانية إلى باقة مدفوعة، نسجل تاريخ بداية الاشتراك الفعلي
            if (oldPlan === 'باقة نسخة المجانية' && plan !== 'باقة نسخة المجانية') {
                setStore('bayan_paid_start_date', new Date().toISOString());
            }
            // إذا كان المستخدم أصلاً على باقة مدفوعة ولم نسجل تاريخ البدء بعد
            if (plan !== 'باقة نسخة المجانية' && !getStore('bayan_paid_start_date')) {
                setStore('bayan_paid_start_date', new Date().toISOString());
            }

            document.querySelectorAll('.plan-card').forEach(card => card.classList.remove('active-plan'));
            const activeCard = document.getElementById('plan-' + plan);
            if (activeCard) activeCard.classList.add('active-plan');

            if (!hwidEl || !planEl || !countEl) return;

            // عرض أول 8 أرقام من HWID
            hwidEl.innerText = String(hwid).substring(0, 8);
            planEl.innerText = plan;

            // حساب تاريخ التفعيل والأيام المستخدمة
            const installDateStr = getStore('bayan_install_date');
            if (installDateStr) {
                const installDate = new Date(installDateStr);
                if (startDateEl) startDateEl.innerText = installDate.toLocaleDateString('ar-EG');

                const today = new Date();
                const diffTime = Math.abs(today - installDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (daysUsedEl) daysUsedEl.innerText = diffDays + " يوم";
            }

            // استرجاع رقم التحويل
            if (transferPhoneEl) {
                transferPhoneEl.value = getStore('bayan_sub_transfer_phone') || "";
            }

            if (daysLeft <= 0) {
                countEl.innerText = "🛑 انتهى الاشتراك";
                countEl.style.color = '#ef4444';
            } else {
                countEl.innerText = `متبقي ${daysLeft} يوم`;
                if (daysLeft < 7) {
                    countEl.style.color = '#ef4444'; 
                    countEl.innerHTML += ' <span style="animation: blinkingSub 1s infinite alternate; display: inline-block;">⚠️</span>';

                    // إظهار تنبيه في الإشعارات
                    if (daysLeft <= 3) {
                        showToast(`⚠️ تنبيه: اشتراكك (${plan}) سينتهي خلال ${daysLeft} أيام!`, "warning");
                    }
                } else {
                    countEl.style.color = '#10b981'; 
                }
            }
        }

        // إظهار نافذة باقتك المنبثقة
        window.showPackageFeatures = function(planName) {
            const modal = document.getElementById('packageFeaturesModal');
            const list = document.getElementById('featPlanList');
            const nameEl = document.getElementById('featPlanName');
            const iconEl = document.getElementById('featPlanIcon');
            const descEl = document.getElementById('featPlanDescription');

            if (!modal || !list) return;

            // إعادة ضبط التبويبات للوضع الافتراضي (المميزات)
            switchPackageTab('features');

            let icon = "🚀";
            let commonItems = [
                "إدارة مبيعات ومشتريات احترافية",
                "نظام مخازن وحسابات متكامل",
                "تقارير أرباح وخسائر دقيقة",
                "دعم فني وتحديثات مستمرة",
                "أرشفة سحابية وحماية بيانات",
                "<span style='color: #22c55e; font-weight: bold;'>✨ ميزة الذكاء الاصطناعي 🤖</span>"
            ];
            let extraItems = [];

            if (planName === 'باقة نسخة المجانية') {
                icon = "🌱";
                extraItems = ["<span style='color:#ef4444; font-weight:bold;'>✖ محدودة بـ 200 فاتورة فقط للتجربة</span>"];
            } else if (planName === 'الباقة الشهرية') {
                icon = "⚙️";
                extraItems = ["✔ عدد فواتير غير محدود", "✔ دعم فني متميز"];
            } else if (planName === 'الباقة السنوية') {
                icon = "🚀";
                extraItems = ["✔ نسخ احتياطي سحابي تلقائي", "✔ دعم فني VIP وأولوية قصوى"];
            } else if (planName === 'الباقة مدى الحياة') {
                icon = "👑";
                extraItems = ["✔ امتلاك البرنامج للأبد", "✔ دعم فني شامل مدى الحياة"];
            }

            nameEl.innerText = planName;
            iconEl.innerText = icon;
            if (descEl) descEl.innerHTML = `باقة <b>${planName}</b> تمنحك الوصول للميزات التالية:`;

            list.innerHTML = '';
            [...commonItems, ...extraItems].forEach(item => {
                const li = document.createElement('li');
                li.style.display = "flex";
                li.style.alignItems = "center";
                li.style.gap = "10px";
                li.style.padding = "10px";
                li.style.background = "#f8fafc";
                li.style.borderRadius = "10px";
                li.style.fontSize = "0.9rem";
                li.style.border = "1px solid #e2e8f0";

                const isLimit = item.includes('✖');
                li.innerHTML = `<span style="color: ${isLimit ? '#ef4444' : '#3b82f6'}; font-size: 1.1rem; font-weight:bold;">${isLimit ? '✖' : '✔'}</span> ${item}`;
                list.appendChild(li);
            });

            // حساب الإحصائيات لتبويب الاستهلاك
            calculateUsageStats(planName);

            modal.classList.remove('hidden');
        };

        window.switchPackageTab = function(tab) {
            const btnFeat = document.getElementById('tabFeatures');
            const btnUsage = document.getElementById('tabUsage');
            const contentFeat = document.getElementById('contentFeatures');
            const contentUsage = document.getElementById('contentUsage');

            if (!btnFeat || !btnUsage) return;

            if (tab === 'features') {
                // تلوين تبويب المميزات بالأخضر (بناءً على طلبك الجديد)
                btnFeat.classList.add('active');
                btnFeat.style.background = "#10b981";
                btnFeat.style.color = "white";
                btnFeat.style.boxShadow = "0 4px 10px rgba(16, 185, 129, 0.3)";

                btnUsage.classList.remove('active');
                btnUsage.style.background = "transparent";
                btnUsage.style.color = "#64748b";
                btnUsage.style.boxShadow = "none";

                if(contentFeat) contentFeat.classList.remove('hidden');
                if(contentUsage) contentUsage.classList.add('hidden');
            } else {
                // تلوين تبويب الاستهلاك بالأزرق
                btnUsage.classList.add('active');
                btnUsage.style.background = "#3b82f6";
                btnUsage.style.color = "white";
                btnUsage.style.boxShadow = "0 4px 10px rgba(59, 130, 246, 0.3)";

                btnFeat.classList.remove('active');
                btnFeat.style.background = "transparent";
                btnFeat.style.color = "#64748b";
                btnFeat.style.boxShadow = "none";

                if(contentFeat) contentFeat.classList.add('hidden');
                if(contentUsage) contentUsage.classList.remove('hidden');
            }
        };

        function calculateUsageStats(planName) {
            if (typeof transactions === 'undefined') return;

            const paidStartDateStr = getStore('bayan_paid_start_date');
            let filteredTransactions = transactions;

            if (planName === 'باقة نسخة المجانية') {
                // للنسخة المجانية: نعرض العمليات التي تمت قبل بداية أي اشتراك مدفوع (إن وجد) لضمان استقلالها
                if (paidStartDateStr) {
                    const startDate = new Date(paidStartDateStr);
                    filteredTransactions = transactions.filter(t => {
                        const tDate = new Date(t.dateISO || t.date);
                        return tDate < startDate;
                    });
                }
            } else {
                // للباقات المدفوعة: نعرض فقط العمليات التي تمت منذ بداية الاشتراك الفعلي
                if (paidStartDateStr) {
                    const startDate = new Date(paidStartDateStr);
                    filteredTransactions = transactions.filter(t => {
                        const tDate = new Date(t.dateISO || t.date);
                        return tDate >= startDate;
                    });
                }
            }

            // تجميع الفواتير حسب النوع (معرف فريد لكل فاتورة) من القائمة المفلترة
            const salesInvoices = new Set(filteredTransactions.filter(t => t.type && t.type.includes('بيع') && !t.type.includes('مرتجع') && t.invoiceId).map(t => t.invoiceId)).size;
            const purchaseInvoices = new Set(filteredTransactions.filter(t => t.type && t.type.includes('شراء') && !t.type.includes('مرتجع') && t.invoiceId).map(t => t.invoiceId)).size;
            const returnInvoices = new Set(filteredTransactions.filter(t => t.type && t.type.includes('مرتجع') && t.invoiceId).map(t => t.invoiceId)).size;
            const financialOps = filteredTransactions.filter(t => (t.type && (t.type.includes('قبض') || t.type.includes('صرف'))) && t.invoiceId).length;
            const otherOps = filteredTransactions.filter(t => (t.type && (t.type.includes('تسوية') || t.type.includes('تحويل'))) && t.invoiceId).length;

            const totalUsed = salesInvoices + purchaseInvoices + returnInvoices + financialOps + otherOps;
            const limit = (planName === 'باقة نسخة المجانية') ? 200 : Infinity;

            if(document.getElementById('usageTotalCount')) document.getElementById('usageTotalCount').innerText = totalUsed;
            const remainEl = document.getElementById('usageRemaining');
            const percentText = document.getElementById('usagePercentText');
            const progressBar = document.getElementById('usageProgressBar');

            if (limit === Infinity) {
                if(remainEl) { remainEl.innerText = "∞ (غير محدود)"; remainEl.style.color = "#10b981"; }
                if(percentText) percentText.innerText = "0%";
                if(progressBar) progressBar.style.width = "0%";
            } else {
                const remaining = Math.max(0, limit - totalUsed);
                if(remainEl) {
                    remainEl.innerText = remaining;
                    remainEl.style.color = remaining > 10 ? "#10b981" : "#ef4444";
                }

                const percent = Math.min(100, Math.round((totalUsed / limit) * 100));
                if(percentText) percentText.innerText = percent + "%";
                if(progressBar) {
                    progressBar.style.width = percent + "%";
                    progressBar.style.background = percent > 90 ? "#ef4444" : (percent > 70 ? "#f59e0b" : "#3b82f6");
                }
            }

            // ملء الجدول التفصيلي
            const detailsBody = document.getElementById('usageDetailsBody');
            if(detailsBody) {
                detailsBody.innerHTML = `
                    <tr><td style="padding:10px; border-bottom:1px solid #eee;">🛒 فواتير المبيعات</td><td style="text-align:center; font-weight:bold;">${salesInvoices}</td></tr>
                    <tr><td style="padding:10px; border-bottom:1px solid #eee;">🧺 فواتير المشتريات</td><td style="text-align:center; font-weight:bold;">${purchaseInvoices}</td></tr>
                    <tr><td style="padding:10px; border-bottom:1px solid #eee;">🔄 المرتجعات</td><td style="text-align:center; font-weight:bold;">${returnInvoices}</td></tr>
                    <tr><td style="padding:10px; border-bottom:1px solid #eee;">💵 سندات (قبض/صرف)</td><td style="text-align:center; font-weight:bold;">${financialOps}</td></tr>
                    <tr><td style="padding:10px;">⚖️ عمليات أخرى</td><td style="text-align:center; font-weight:bold;">${otherOps}</td></tr>
                `;
            }
        }

        // تجديد الاشتراك للمتجر من بوابة المطور
        async function renewStoreSubscription(phone) {
            if (!confirm(`هل تريد تجديد الاشتراك للمتجر (${phone}) لمدة 30 يوم إضافية؟`)) return;
            try {
                // 1. جلب التاريخ المتاح فى السيرفر
                const { data, error: fetchError } = await supabaseClient
                    .from(PRIMARY_TABLE)
                    .select('expiry_date')
                    .eq('phone', phone)
                    .single();

                if (fetchError) throw fetchError;

                let currentExpiry = new Date(data.expiry_date);
                // إذا كان الاشتراك منتهى بالفعل، نبدأ التجديد من تاريخ اليوم
                if (currentExpiry < new Date()) currentExpiry = new Date();

                const newExpiry = new Date(currentExpiry);
                newExpiry.setDate(newExpiry.getDate() + 30);

                const { error } = await supabaseClient
                    .from(PRIMARY_TABLE)
                    .update({ 
                        expiry_date: newExpiry.toISOString(),
                        status: 'active'
                    })
                    .eq('phone', phone);

                if (error) throw error;
                showToast("✅ تم تجديد الاشتراك بنجاح (30 يوم إضافي).");
                updateRemoteIndex();
            } catch (err) {
                alert("❌ فشل عملية التجديد: " + err.message);
            }
        }

        // تحديث شريط التنبيه القديم بصورة صامتة
        function updateTrialUINotification(days) {
            let banner = document.getElementById('trialStatusBanner');
            if (banner) {
                banner.innerHTML = `🎁 نسخة تجريبية: باقي ${days} يوم على انتهاء التجربة. للتفعيل اتصل بـ 01099195060`;
            }
        }

        async function handleCloudRegistration() {
            const name = document.getElementById('regShopName').value.trim();
            const phone = document.getElementById('regShopPhone').value.trim();

            if (!name || !phone) return alert("❌ يرجى إدخال الاسم ورقم الهاتف للمتابعة.");
            if (phone.length < 10) return alert("❌ يرجى إدخال رقم هاتف صحيح (10 أو 11 رقم).");

            showToast("⏳ جاري إنشاء هويتك السحابية...", "info");

            const hwid = await getUniqueHWID();
            const success = await startFreeTrial(phone, name, hwid);
            if (success) {
                document.getElementById('cloudRegistrationModal').style.display = 'none';
                // تحديث البيانات في إعدادات المؤسسة بالمرة
                if (document.getElementById('shopName')) document.getElementById('shopName').value = name;
                if (document.getElementById('shopPhone1')) document.getElementById('shopPhone1').value = phone;
                saveData(); // حفظ محلي
                location.reload(); // إعادة تحميل للتفعيل الشامل
            }
        }

        // تم إزالة شاشة التعطيل (Kill Switch)
        function showKillScreen(msg) {
            console.log("Kill screen ignored: " + msg);
        }

        async function startFreeTrial(phone, name, hwid) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30); // 30 يوم تجربة مجانية

            showToast("🎉 تم تفعيل النسخة التجريبية (30 يوم) بنجاح!", "success");
            setStore('bayan_user_phone', phone);
            if (window.LicenseService) {
                await window.LicenseService.saveLicenseLocally('باقة نسخة المجانية', expiryDate.toISOString());
            }
            return true;
        }

        // جلب الإعلانات العامة من المطور عمران
        async function fetchAdminAnnouncements() {
            if (!supabaseClient) return;
            try {
                const { data } = await supabaseClient
                    .from('announcements')
                    .select('message')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (data && data[0]) {
                    const bar = document.getElementById('admin-announcement-bar');
                    const marquee = document.getElementById('admin-marquee');
                    if (bar && marquee) {
                        bar.style.display = 'block';
                        marquee.innerText = data[0].message;
                    }
                }
            } catch (err) { console.warn("تعذر جلب إعلانات السحابة."); }
        }

        // --- وظائف لوحة التحكم السحابية (Cloud Panel Functions) ---

        function saveCloudSettings() {
            const url = document.getElementById('supabase_url_input').value.trim();
            const key = document.getElementById('supabase_key_input').value.trim();

            if(!url || !key) return alert("برجاء إدخال الرابط والمفتاح أولاً!");

            setStore('supabase_url', url);
            setStore('supabase_key', key);

            alert("تم حفظ إعدادات السحابة بنجاح! سيتم إعادة تشغيل الربط الآن ✅");
            location.reload(); 
        }

        async function checkDevAccess() {
            // الدخول مباشر لبوابة المطور بدون كلمة سر
            switchSection('dev-dashboard-section');
            showToast("مرحباً بك.. بوابة التحكم مفتوحة.");
            updateRemoteIndex(); 
        }

        async function updateRemoteIndex() {
            if (!supabaseClient) {
                alert("❌ لم يتم تهيئة Supabase. تأكد من إعدادات الربط أولاً.");
                return;
            }

            try {
                showToast("⏳ جاري جلب قاعدة بيانات المشتركين...");
                const { data, error } = await supabaseClient
                    .from(PRIMARY_TABLE)
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const tbody = document.getElementById('devStoresTableBody');
                const badge = document.getElementById('storeCountBadge');
                tbody.innerHTML = '';
                if (badge) badge.innerText = data.length;

                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:50px;">لا توجد متاجر مسجلة حالياً.</td></tr>';
                    return;
                }

data.forEach(store => {
                    const statusColor = store.status === 'blocked' ? '#f87171' : (store.status === 'expired' ? '#fbbf24' : '#4ade80');
                    const statusText = store.status === 'blocked' ? 'محظور 🛑' : (store.status === 'expired' ? 'منتهي ⏳' : 'نشط ✅');

                    const tr = document.createElement('tr');
                    tr.style.background = "rgba(255,255,255,0.03)";
                    tr.style.marginBottom = "8px";

                    tr.innerHTML = `
                        <td style="padding:15px; border-radius: 12px 0 0 12px;">
                            <div style="font-weight:bold; color:#fff; font-size:1.1rem;">${store.store_name || 'بدون اسم'}</div>
                            <div style="color:#38bdf8; font-family:monospace;">📱 ${store.phone}</div>
                            <div style="color:#64748b; font-family:monospace; font-size: 0.7rem; opacity: 0.8;">🆔 HWID: ${store.hwid || '---'}</div>
                            <div style="color:var(--accent-gold); font-size: 0.75rem; font-weight:bold;">📅 انتهاء: ${new Date(store.expiry_date).toLocaleDateString('ar-EG')}</div>
                        </td>
                        <td style="padding:15px; font-size:0.85rem; color:#94a3b8;">
                            📄 فواتير: ${store.bill_count || 0} | 📦 أصناف: ${store.product_count || 0}<br>
                            ⭐ الباقة: ${store.plan || 'باقة تجريبية'}<br>
                            📅 آخر نشاط: ${new Date(store.last_active || store.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td style="padding:15px; text-align:center;">
                            <span style="background-color: ${statusColor}22; color: ${statusColor}; padding: 6px 12px; border-radius: 50px; font-size: 0.8rem; font-weight: bold; border: 1px solid ${statusColor}44;">
                                ${statusText}
                            </span>
                        </td>
                        <td style="padding:15px; text-align:center; border-radius: 0 12px 12px 0;">
                            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; max-width:200px;">
                                <button onclick="updateStoreStatus('${store.phone}', 'active')" style="background:#059669; color:white; border:none; width:35px; height:35px; border-radius:10px; cursor:pointer;" title="تفعيل">✅</button>
                                <button onclick="updateStoreStatus('${store.phone}', 'blocked')" style="background:#b91c1c; color:white; border:none; width:35px; height:35px; border-radius:10px; cursor:pointer;" title="حظر">🛑</button>
                                <button onclick="renewStoreSubscription('${store.phone}')" style="background:var(--accent-gold); color:#1a1a1a; border:none; width:35px; height:35px; border-radius:10px; cursor:pointer; font-weight:bold;" title="تجديد شهر (+30 يوم)">🔄</button>
                                <button onclick="showAdminNoteModal('${store.phone}')" style="background:#6366f1; color:white; border:none; width:35px; height:35px; border-radius:10px; cursor:pointer;" title="رسالة إدارية">✍️</button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
                showToast("✅ تم التزامن مع السحابة بنجاح.");
            } catch (err) {
                console.error("Fetch Error:", err);
                alert("❌ فشل تحديث البيانات: " + err.message);
            }
        }

        async function updateStoreStatus(phone, newStatus) {
            if (!confirm(`تأكيد تغيير حالة المتجر (${phone}) إلى [${newStatus}]؟`)) return;
            try {
                const { error } = await supabaseClient
                    .from(PRIMARY_TABLE)
                    .update({ status: newStatus })
                    .eq('phone', phone);
                if (error) throw error;
                showToast("✅ تم تحديث الحالة سحابياً.");
                updateRemoteIndex();
            } catch (err) {
                alert("❌ فشل التحديث: " + err.message);
            }
        }

        async function showAdminNoteModal(phone) {
            const note = await showCustomPrompt("✍️ أدخل الرسالة الإدارية التي ستظهر للمستخدم عند الدخول:");
            if (note === null) return;
            try {
                const { error } = await supabaseClient
                    .from(PRIMARY_TABLE)
                    .update({ admin_note: note })
                    .eq('phone', phone);
                if (error) throw error;
                showToast("🚀 تم إرسال الملاحظة بنجاح.");
            } catch (err) {
                alert("❌ فشل الإرسال: " + err.message);
            }
        }

        // دالة "تبليغ المطور" - معطلة ومحذوفة للتوافق مع العمل محلياً بالكامل
        async function silentDevPing(phone, name) {
            // معطلة محلياً 100%
        }

        async function registerOnCloud() {
            const shopName = document.getElementById('shopName')?.value.trim();
            const shopPhone = document.getElementById('shopPhone1')?.value.trim();

            if(!shopName || !shopPhone) {
                return alert("❌ برجاء إدخال (اسم المحل) و (الموبايل الأساسي) في تبويب بيانات المؤسسة أولاً!");
            }

            try {
                showToast("جاري التفعيل المحلي... ⏳", "info");

                const hwid = await getUniqueHWID();
                const success = await startFreeTrial(shopPhone, shopName, hwid);
                if (success) {
                    showToast("🎉 تم التفعيل محلياً بنجاح!", "success");
                    return true;
                }
            } catch (e) {
                console.error("❌ خطأ في التفعيل المحلي:", e);
                alert("❌ فشل التفعيل: " + e.message);
            }
            return false;
        }

        // دالة نسخ النصوص للحافظة
        function initConfirmModalHandlers() {
            const yesBtn = document.getElementById('confirmYesBtn');
            const noBtn = document.getElementById('confirmNoBtn');
            const backBtn = document.getElementById('confirmBackBtn');

            if (yesBtn) {
                yesBtn.onclick = function () {
                    if (!pendingCloseSection) return;

                    if (pendingCloseSection === 'ALL_OVERALL_RELOAD') {
                        // حفظ الكل وإعادة التحميل - لمحاكاة الـ Refresh
                        // هنا نكتفي بالقول أنه من الصعب تقنياً حفظ الكل في دورة واحدة وإعادة التحميل،
                        // لذا سنعرض رسالة تخبره بضرورة الحفظ اليدوي أو مجرد إعادة تحميل
                        location.reload();
                        return;
                    }

                    const tab = openTabs.find(t => t.id === pendingCloseSection);
                    if (!tab) { closeConfirmModal(); return; }

                    let saved = false;
                    if (tab.type === 'sales') saved = saveBill();
                    else if (tab.type === 'purchase') saved = savePurchase();
                    else if (tab.type === 'receipt') saved = saveReceipt();
                    else if (tab.type === 'disbursement') saved = saveDisbursement();
                    else if (tab.type === 'sales-return') saved = saveSalesReturn();
                    else if (tab.type === 'purchase-return') saved = savePurchaseReturn();
                    else if (tab.type === 'adjustment') saved = saveAdjustment();
                    else saved = true;

                    if (saved) {
                        actuallyCloseTab(pendingCloseSection);
                        closeConfirmModal();
                    }
                };
            }

            if (noBtn) {
                noBtn.onclick = function () {
                    if (pendingCloseSection === 'ALL_OVERALL_RELOAD') {
                        location.reload();
                    } else if (pendingCloseSection) {
                        actuallyCloseTab(pendingCloseSection);
                    }
                    closeConfirmModal();
                };
            }

            if (backBtn) {
                backBtn.onclick = function () {
                    closeConfirmModal();
                };
            }
        }

        function closeConfirmModal() {
            const modal = document.getElementById('confirmModal');
            if (modal) modal.classList.add('hidden');
            pendingCloseSection = null;
        }

        function showCloseWarning(tabId) {
            const modal = document.getElementById('confirmModal');
            if (modal) {
                let label = 'الفاتورة';
                if (tabId === 'ALL_OVERALL_RELOAD') {
                    label = 'كافة التبويبات والمتابعة في التحديث';
                } else {
                    const tab = openTabs.find(t => t.id === (tabId || pendingCloseSection));
                    label = tab ? (tab.label || tab.type) : 'الفاتورة';
                }
                const msgEl = modal.querySelector('p');
                if (msgEl) msgEl.innerText = `هل تريد حفظ ${label}؟`;
                modal.classList.remove('hidden');
            }
        }

        // حماية البيانات عند تحديث المتصفح (Refresh) أو الإغلاق
        window.onbeforeunload = function (e) {
            if (hasAnyUnsavedData()) {
                const msg = "⚠️ تنبيه: لديك بيانات غير محفوظة في بعض التبويبات. هل تريد المغادرة حقاً؟";
                e.returnValue = msg;
                return msg;
            }
        };

        function hasAnyUnsavedData() {
            // التحقق من كافة التبويبات المفتوحة
            for (const tab of openTabs) {
                const state = tabStates[tab.id];
                const type = tab.type;
                const isActive = (activeTabId === tab.id);

                if (isActive) {
                    if (type === 'sales' && cart.length > 0) return true;
                    if (type === 'purchase' && purchaseCart.length > 0) return true;
                    if (type === 'sales-return' && returnCart.length > 0) return true;
                    if (type === 'purchase-return' && purReturnCart.length > 0) return true;
                    if (type === 'adjustment' && adjCart.length > 0) return true;
                    if (type === 'receipt' || type === 'disbursement') {
                        const amId = (type === 'receipt') ? 'receiptAmount' : 'disburseAmount';
                        const el = document.getElementById(amId);
                        if (el && parseFloat(el.value) > 0) return true;
                    }
                } else if (state) {
                    if (state.cart && state.cart.length > 0) return true;
                    if ((type === 'receipt' || type === 'disbursement') && parseFloat(state.amount) > 0) return true;
                }
            }
            return false;
        }

        // استدعاء التهيئة عند تحميل المستند
        document.addEventListener('DOMContentLoaded', () => {
            try { initConfirmModalHandlers(); } catch(e) {}
            try { initLicense(); } catch(e) {}
            try { loadSettings(); } catch(e) {} // إعادة تفعيل تحميل الإعدادات لإصلاح العطل

            // تحميل شعار المؤسسة (Logo Loading)
            try {
                const savedLogo = getStore('bayan_business_logo');
                if (savedLogo) {
                    setTimeout(() => updateLogoDisplays(savedLogo), 100);
                }
            } catch(e) {}

            // تحميل خلفية المحل المخصصة (Wallpaper)
            try { loadWallpaper(); } catch(e) {}

            // تهيئة أعمدة المخازن
            try {
                if (typeof applyInventoryColumnVisibility === 'function') {
                    applyInventoryColumnVisibility();
                }
            } catch(e) {}

            // تهيئة أعمدة الفواتير
            try {
                if (typeof initInvoicesColumns === 'function') initInvoicesColumns();
            } catch(e) {}
        });

        // ================= وظائف مركز التقارير (Reports Logic) =================
        function showPLReport() {
            let totalSales = 0;
            let totalCost = 0;
            let totalExpenses = 0;
            let totalReceiptsOther = 0;

            // 1. حساب المبيعات والتكلفة من العمليات
            transactions.forEach(t => {
                if (t.type && t.type.includes('بيع') && !t.type.includes('مرتجع')) {
                    totalSales += parseFloat(t.total) || 0;
                    // استخدام الربح المحفوظ مباشرةً إن وُجد (يراعي الوحدات الفرعية)
                    if (t.profit !== undefined && t.profit !== null && t.profit !== '') {
                        totalCost += (parseFloat(t.total) || 0) - (parseFloat(t.profit) || 0);
                    } else {
                        // احتياطي: حساب من تكلفة المنتج الأساسية
                        const p = productsDB.find(prod => prod.name === t.product);
                        const cost = p ? (parseFloat(p.cost) || 0) : 0;
                        totalCost += cost * (parseFloat(t.qty) || 0);
                    }
                }
                if (t.type === 'قبض' && !t.isSale) {
                    totalReceiptsOther += parseFloat(t.total) || 0;
                }
                if (t.type === 'صرف') {
                    totalExpenses += parseFloat(t.total) || 0;
                }
            });

            const grossProfit = totalSales - totalCost;
            const netProfit = grossProfit + totalReceiptsOther - totalExpenses;

            const html = `
                <div style="text-align:right; padding:10px;">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:15px;">
                        <div style="padding:15px; background:#e8f5e9; border-radius:10px; border-right:5px solid #2e7d32;">
                            <label style="color:#2e7d32; display:block; margin-bottom:5px;">💰 إجمالي المبيعات</label>
                            <span style="font-size:1.5rem; font-weight:bold;">${totalSales.toLocaleString()} ج.م</span>
                        </div>
                        <div style="padding:15px; background:#fff3e0; border-radius:10px; border-right:5px solid #ef6c00;">
                            <label style="color:#ef6c00; display:block; margin-bottom:5px;">📉 إجمالي التكلفة</label>
                            <span style="font-size:1.5rem; font-weight:bold;">${totalCost.toLocaleString()} ج.م</span>
                        </div>
                        <div style="padding:15px; background:#ffebee; border-radius:10px; border-right:5px solid #c62828;">
                            <label style="color:#c62828; display:block; margin-bottom:5px;">💸 إجمالي المصروفات</label>
                            <span style="font-size:1.5rem; font-weight:bold;">${totalExpenses.toLocaleString()} ج.م</span>
                        </div>
                        <div style="padding:15px; background:#e3f2fd; border-radius:10px; border-right:5px solid #1565c0;">
                            <label style="color:#1565c0; display:block; margin-bottom:5px;">💵 مقبوضات أخرى</label>
                            <span style="font-size:1.5rem; font-weight:bold;">${totalReceiptsOther.toLocaleString()} ج.م</span>
                        </div>
                    </div>
                    <div style="margin-top:20px; padding:20px; background:linear-gradient(135deg, #c5a059, #8c6a24); color:white; border-radius:12px; text-align:center;">
                        <div style="font-size:1.1rem; opacity:0.9;">الربح الصافي النهائي</div>
                        <div style="font-size:2.5rem; font-weight:900;">${netProfit.toLocaleString()} ج.م</div>
                    </div>
                </div>
            `;

            showCustomAlert({
                title: "📊 تقرير تحليل المبيعات الشامل",
                message: html,
                icon: "💰",
                type: "info"
            });
        }

        function showInventoryBalanceReport() {
            let totalQty = 0;
            let totalValue = 0;
            let categories = {};

            productsDB.forEach(p => {
                const qty = parseFloat(p.qty) || 0;
                const cost = parseFloat(p.cost) || 0;
                totalQty += qty;
                totalValue += qty * cost;

                if (p.category) {
                    if (!categories[p.category]) categories[p.category] = { qty: 0, val: 0 };
                    categories[p.category].qty += qty;
                    categories[p.category].val += qty * cost;
                }
            });

            const html = `
                <div style="text-align:right;">
                    <div style="display:flex; justify-content:space-around; margin:20px 0; background:var(--bg-color); padding:15px; border-radius:10px;">
                        <div>
                            <div style="color:var(--text-secondary);">إجمالي القطع</div>
                            <div style="font-size:1.8rem; font-weight:bold; color:var(--accent-gold);">${totalQty.toLocaleString()}</div>
                        </div>
                        <div style="border-left:1px solid var(--border-color);"></div>
                        <div>
                            <div style="color:var(--text-secondary);">إجمالي القيمة المالية</div>
                            <div style="font-size:1.8rem; font-weight:bold; color:var(--main-green);">${totalValue.toLocaleString()} ج.م</div>
                        </div>
                    </div>
                    <h4 style="margin-bottom:10px;">🏠 أرصدة الفروع والمخازن المشتركة:</h4>
                    <div style="max-height:250px; overflow-y:auto; border:1px solid var(--border-color); border-radius:12px; margin-bottom:20px; box-shadow:0 4px 15px rgba(0,0,0,0.05);">
                        <table style="width:100%; border-collapse:collapse; background:#ffffff;">
                            <thead style="background:#f8fafc; border-bottom:2px solid var(--gold);">
                                <tr>
                                    <th style="padding:12px; text-align:right;">المخزن / الفرع</th>
                                    <th style="padding:12px;">الأصناف</th>
                                    <th style="padding:12px;">الكمية</th>
                                    <th style="padding:12px;">القيمة المالية (تكلفة)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${warehouses.map(w => {
                                    let iCount = 0, qSum = 0, vSum = 0;
                                    productsDB.forEach(p => {
                                        const wStock = getWarehouseStock(p.name, w.name);
                                        if (wStock !== 0) {
                                            iCount++; 
                                            qSum += wStock; 
                                            vSum += (wStock * (parseFloat(p.cost) || 0));
                                        }
                                    });
                                    return `
                                    <tr style="border-bottom:1px solid #f1f5f9; transition:0.3s; cursor:default;">
                                        <td style="padding:12px; font-weight:bold; color:#2c3e50;">${w.name} ${currentUser && currentUser.warehouseName === w.name ? '<span style="color:var(--main-green); font-size:0.75rem;">(نشط)</span>' : ''}</td>
                                        <td style="padding:12px; text-align:center;">${iCount}</td>
                                        <td style="padding:12px; text-align:center; color:var(--main-green); font-weight:bold;">${qSum}</td>
                                        <td style="padding:12px; text-align:center; color:var(--main-blue); font-weight:bold;">${vSum.toLocaleString()} ج.م</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <h4 style="margin-bottom:10px;">📦 تحليل المخزون الكلي حسب التصنيف:</h4>
                    <div style="max-height:200px; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px;">
                        ${Object.keys(categories).length > 0 ?
                    `<table style="width:100%; border-collapse:collapse;">
                                <thead style="background:var(--table-header-bg);">
                                    <tr><th style="padding:8px; text-align:right;">التصنيف</th><th style="padding:8px;">الكمية</th><th style="padding:8px;">القيمة</th></tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(categories).map(([name, data]) => `
                                        <tr style="border-bottom:1px solid var(--border-color);">
                                            <td style="padding:8px;">${name}</td>
                                            <td style="padding:8px; text-align:center;">${data.qty}</td>
                                            <td style="padding:8px; text-align:center;">${data.val.toLocaleString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>` :
                    `<p style="padding:15px; text-align:center;">لا توجد بيانات تصنيفات</p>`
                }
                    </div>
                </div>
            `;

            showCustomAlert({
                title: "🧱 تقرير رصيد المخزن الكلي",
                message: html,
                icon: "🧱",
                type: "success"
            });
        }

        function switchSection(sectionType, fromTab = false, tabId = null) {
            if (typeof closeAllSearchPopups === 'function') closeAllSearchPopups();

            // إذا كان التبويب النشط حالياً هو الحاسبة والتبويب الجديد ليس الحاسبة، نخفي الحاسبة
            if (activeTabId === 'calculator' && sectionType !== 'calculator') {
                const modal = document.getElementById('royalCalculator');
                if (modal && modal.classList.contains('visible')) {
                    modal.classList.remove('visible');
                }
            }

            if (sectionType === 'calculator') {
                restoreCalculator();
                return;
            }

            // التحقق من الصلاحيات الصارمة لكل الأقسام
            if (sectionType === 'settings') {
                if (!checkPermission('general_settings')) return;
            } else if (sectionType === 'sales') {
                if (typeof hasPermission === 'function' && !hasPermission('docs_add')) {
                    if (typeof showToast === 'function') showToast('⛔ عذراً، لا تمتلك صلاحية للوصول لنقطة البيع', 'error');
                    return;
                }
            } else if (sectionType === 'purchase') {
                if (typeof hasPermission === 'function' && !hasPermission('docs_purchase')) {
                    if (typeof showToast === 'function') showToast('⛔ عذراً، لا تمتلك صلاحية للوصول لقسم المشتريات', 'error');
                    return;
                }
            } else if (sectionType === 'sales-return' || sectionType === 'purchase-return') {
                if (typeof hasPermission === 'function' && !hasPermission('docs_return')) {
                    if (typeof showToast === 'function') showToast('⛔ عذراً، لا تمتلك صلاحية للوصول لقسم المرتجعات', 'error');
                    return;
                }
            } else if (sectionType === 'history' || sectionType === 'invoices' || sectionType === 'item-history') {
                if (typeof hasPermission === 'function' && !hasPermission('docs_view')) {
                    if (typeof showToast === 'function') showToast('⛔ عذراً، لا تمتلك صلاحية لعرض سجل الفواتير والحركات', 'error');
                    return;
                }
            } else if (sectionType === 'inventory' || sectionType === 'warehouse-report' || sectionType === 'product-inquiry') {
                if (typeof hasPermission === 'function' && !hasPermission('stock_view') && !hasPermission('stock_add')) {
                    if (typeof showToast === 'function') showToast('⛔ عذراً، لا تمتلك صلاحية للوصول لقسم المخازن والبضاعة', 'error');
                    return;
                }
            } else if (sectionType === 'adjustment') {
                if (typeof hasPermission === 'function' && !hasPermission('stock_edit') && !hasPermission('stock_transfer')) {
                    if (typeof showToast === 'function') showToast('⛔ عذراً، لا تمتلك صلاحية للتسويات والتحويلات المخزنية', 'error');
                    return;
                }
            } else if (sectionType === 'accounts' || sectionType === 'statement') {
                if (typeof hasPermission === 'function' && !hasPermission('accounts_view')) {
                    if (typeof showToast === 'function') showToast('⛔ عذراً، لا تمتلك صلاحية للوصول لقسم الحسابات', 'error');
                    return;
                }
            } else if (sectionType === 'receipt' || sectionType === 'disbursement') {
                if (typeof hasPermission === 'function' && !hasPermission('accounts_add')) {
                    if (typeof showToast === 'function') showToast('⛔ عذراً، لا تمتلك صلاحية لسندات القبض والصرف', 'error');
                    return;
                }
            } else if (sectionType === 'analysis') {
                if (typeof hasPermission === 'function' && !hasPermission('general_profits')) {
                    if (typeof showToast === 'function') showToast('⛔ عذراً، لا تمتلك صلاحية لرؤية التحليلات والأرباح', 'error');
                    return;
                }
            } else if (sectionType === 'daily-report' || sectionType === 'reports-hub' || sectionType === 'treasury-audit') {
                if (typeof hasPermission === 'function' && !hasPermission('general_reports')) {
                    if (typeof showToast === 'function') showToast('⛔ عذراً، لا تمتلك صلاحية للوصول لقسم التقارير المالية', 'error');
                    return;
                }
            }

            // 1. حفظ الحالة الحالية للتبويب النشط حالياً قبل الانتقال
            saveCurrentTabState();

            if (typeof applyPermissions === 'function') {
                applyPermissions();
            }

            let targetTab;

            // إذا كان الطلب فتح تبويب جديد (نقرة من الداشبورد مثلاً)
            if (!fromTab && !tabId) {
                // الأقسام التي تدعم تعدد النوافذ
                const multiInstanceSections = [
                    'sales', 'purchase', 'receipt', 'disbursement',
                    'sales-return', 'purchase-return', 'inventory',
                    'accounts', 'daily-report', 'history', 'invoices',
                    'analysis', 'item-history', 'adjustment', 'reports-hub', 'warehouse-report', 'price-tracking', 'product-inquiry', 'ai-assistant', 'statement', 'treasury-audit'
                ];

                // التحقق من صلاحية كل قسم بشكل مستقل ودقيق
                if (sectionType === 'sales') {
                    if (!checkPermission('docs_add')) return;
                } else if (sectionType === 'purchase') {
                    if (!checkPermission('docs_purchase')) return;
                } else if (sectionType === 'sales-return' || sectionType === 'purchase-return') {
                    if (!checkPermission('docs_return')) return;
                } else if (sectionType === 'receipt' || sectionType === 'disbursement') {
                    if (!checkPermission('accounts_add')) return;
                } else if (sectionType === 'adjustment') {
                    if (!checkPermission('stock_edit') && !checkPermission('stock_transfer')) return;
                } else if (['inventory', 'warehouse-report', 'product-inquiry'].includes(sectionType)) {
                    if (!checkPermission('stock_view')) return;
                } else if (['accounts', 'statement'].includes(sectionType)) {
                    if (!checkPermission('accounts_view')) return;
                } else if (['analysis'].includes(sectionType)) {
                    if (!checkPermission('general_profits')) return;
                } else if (['daily-report', 'reports-hub', 'treasury-audit'].includes(sectionType)) {
                    if (!checkPermission('general_reports')) return;
                } else if (['history', 'invoices', 'item-history'].includes(sectionType)) {
                    if (!checkPermission('docs_view')) return;
                }

                if (multiInstanceSections.includes(sectionType)) {
                    // التحقق من وجود تبويب مفتوح مسبقاً من نفس النوع
                    const existingTab = openTabs.find(t => t.type === sectionType);
                    if (existingTab) {
                        targetTab = existingTab;
                    } else {
                        // إدارة العداد التلقائي
                        if (!tabCounters[sectionType]) tabCounters[sectionType] = 0;
                        tabCounters[sectionType]++;

                        const newId = sectionType + '_' + Date.now();
                        const labels = {
                            'sales': 'فاتورة بيع', 'purchase': 'توريد شراء',
                            'receipt': 'سند قبض', 'disbursement': 'سند صرف',
                            'sales-return': 'مرتجع بيع', 'purchase-return': 'مرتجع شراء',
                            'inventory': 'المخازن', 'accounts': 'الحسابات',
                            'daily-report': 'تقرير الحركة اليومية', 'history': 'الحركة',
                            'invoices': 'الفواتير', 'analysis': 'تحليل المبيعات',
                            'item-history': 'حركة صنف', 'adjustment': 'تسوية',
                            'reports-hub': 'مركز التقارير', 'warehouse-report': 'أرصدة المخازن',
                            'price-tracking': 'متابعة الأسعار', 'product-inquiry': 'استعلام الأصناف', 'ai-assistant': '🤖 مساعد بيان',
                            'statement': 'كشف حساب', 'treasury-audit': '💰 مراجعة الخزينة'
                        };

                        targetTab = {
                            id: newId,
                            type: sectionType,
                            label: `${labels[sectionType] || sectionType} ${tabCounters[sectionType]}`
                        };
                        openTabs.push(targetTab);
                    }
                } else {
                    // الأقسام الوحيدة
                    targetTab = openTabs.find(t => t.type === sectionType);
                    if (!targetTab) {
                        targetTab = { id: sectionType, type: sectionType, label: null };
                        openTabs.push(targetTab);
                    }
                }
            } else {
                // الانتقال لتبويب موجود بالفعل
                targetTab = openTabs.find(t => t.id === (tabId || sectionType));
            }

            if (!targetTab) return;

            activeTabId = targetTab.id;

            // إخفاء الكل
            document.querySelectorAll('.section-view').forEach(s => s.classList.add('hidden'));

            // إظهار القسم المطلوب وإعادة تحميل حالته
            const sectionEl = document.getElementById(targetTab.type + '-section');
            if (sectionEl) sectionEl.classList.remove('hidden');

            renderTabs();
            updateTabUI(targetTab.id);

            // 🔥 تأجيل تنفيذ رسم الجداول الثقيلة (Asynchronous Deferring)
            // لضمان استجابة الواجهة فوراً (Zero Delay) دون تجميد المتصفح
            setTimeout(() => {
                // تحميل بيانات التبويب المستهدف
                restoreTabState(targetTab.id, targetTab.type);
                if (typeof window.syncReceiptDisburseCheckboxes === 'function') {
                    window.syncReceiptDisburseCheckboxes();
                }
                if (typeof updateHeaderPartnerInfo === 'function') updateHeaderPartnerInfo();

                // منطق خاص لكل قسم أساسي
                if (targetTab.type === 'dashboard') {
                    if (typeof updateDashboard === 'function') updateDashboard();
                    if (typeof updateDashboardPermissions === 'function') updateDashboardPermissions();
                }
                if (targetTab.type === 'treasury-audit') {
                    if (typeof initTreasuryAuditSection === 'function') initTreasuryAuditSection();
                }
                if (targetTab.type === 'settings') { 
                    loadSettings(); 
                    renderUsersTable(); 
                    renderTrashTable(); 
                    renderWarehousesTable();
                    updateSettingsWarehouseSelect();
                    if (typeof renderPaymentMethodsSettings === 'function') renderPaymentMethodsSettings();
                }
                if (['sales', 'purchase', 'sales-return', 'purchase-return', 'receipt', 'disbursement'].includes(targetTab.type)) {
                    if (typeof populatePaymentMethodSelects === 'function') populatePaymentMethodSelects();
                    if (targetTab.type === 'sales' && typeof loadPinnedPriceLevel === 'function') loadPinnedPriceLevel();
                }
                if (targetTab.type === 'inventory') {
                    renderInventoryTable();
                    setTimeout(() => {
                        const searchInput = document.getElementById('invSearchInput');
                        if (searchInput) {
                            searchInput.focus();
                            searchInput.select(); // تحديد النص الموجود (إن وجد) لمسحه عند الكتابة
                        }
                    }, 100);
                }
                if (targetTab.type === 'accounts') renderAccountsTable();
                if (targetTab.type === 'statement') {
                    if (typeof initStatementSection === 'function') initStatementSection();
                }

                // --- تحديث التاريخ والوقت تلقائياً عند فتح الأقسام المالية ---
                const now = new Date();
                const todayNow = now.toLocaleDateString('en-CA');
                const timeNow = now.toTimeString().slice(0, 5);

                const sectionsWithDateTime = [
                    { s: 'sales', d: 'salesDate', t: 'salesTime' },
                    { s: 'purchase', d: 'purchaseDate', t: 'purchaseTime' },
                    { s: 'receipt', d: 'receiptDate', t: 'receiptTime' },
                    { s: 'disbursement', d: 'disburseDate', t: 'disburseTime' },
                    { s: 'sales-return', d: 'salesReturnDate', t: 'salesReturnTime' },
                    { s: 'purchase-return', d: 'purReturnDate', t: 'purReturnTime' },
                    { s: 'adjustment', d: 'adjDate', t: 'adjTime' },
                    { s: 'history', d: 'historyDateFrom', t: 'historyDateTo' },
                    { s: 'analysis', d: 'anDateFrom', t: 'anDateTo' },
                    { s: 'invoices', d: 'invoicesDateFrom', t: 'invoicesDateTo' },
                    { s: 'daily-report', d: 'reportDateFrom', t: 'reportDateTo' }
                ];

                sectionsWithDateTime.forEach(config => {
                    if (targetTab.type === config.s) {
                        const dEl = document.getElementById(config.d);
                        const tEl = document.getElementById(config.t);
                        const secSaved = window.savedSectionDateFilters ? window.savedSectionDateFilters[targetTab.type] : null;
                        // تحديث أوفلاين/افتراضي فقط إذا لم يكن هناك تاريخ أو فلتر محفوظ سابقاً
                        if (!tabStates[targetTab.id]?.periodFilter && !tabStates[targetTab.id]?.dateFrom && !secSaved) {
                            if (dEl && !dEl.value) dEl.value = todayNow;
                            if (tEl && !tEl.value) tEl.value = todayNow;
                        }

                        // تحديث أرقام الفواتير (رقم ف) عند الفتح لأول مرة
                        if (config.s === 'sales') {
                            const count = typeof getNextSequence === 'function' ? getNextSequence('بيع') : 1;
                            if (document.getElementById('salesBadgeID')) document.getElementById('salesBadgeID').innerText = count;
                            if (typeof renderQuickItems === 'function') renderQuickItems(); // تحديث الأصناف السريعة تلقائياً
                        }
                        if (config.s === 'sales-return') {
                            const count = typeof getNextSequence === 'function' ? getNextSequence('مرتجع بيع') : 1;
                            if (document.getElementById('salesReturnBadgeID')) document.getElementById('salesReturnBadgeID').innerText = count;
                        }
                        if (config.s === 'purchase-return') {
                            const count = typeof getNextSequence === 'function' ? getNextSequence('مرتجع شراء') : 1;
                            if (document.getElementById('purReturnBadgeID')) document.getElementById('purReturnBadgeID').innerText = count;
                        }
                        if (config.s === 'purchase') {
                            const count = typeof getNextSequence === 'function' ? getNextSequence('شراء') : 1;
                            if (document.getElementById('purchaseBadgeID')) document.getElementById('purchaseBadgeID').innerText = count;
                        }
                        if (config.s === 'adjustment') {
                            const count = typeof getNextSequence === 'function' ? getNextSequence('تسوية') : 1;
                            if (document.getElementById('adjBadgeID')) document.getElementById('adjBadgeID').innerText = count;
                        }

                        // تركيز تلقائي على البحث عند فتح قسم البيع
                        if (config.s === 'sales') {
                            setTimeout(() => {
                                const ps = document.getElementById('productSearch');
                                if (ps) ps.focus();
                            }, 50);
                        }

                        // --- تلقائياً فتح نافذة البحث عند فتح أقسام المرتجعات ---
                        if (config.s === 'sales-return' || config.s === 'purchase-return') {
                            setTimeout(() => {
                                const modal = document.getElementById('searchInvoiceModal');
                                if (modal) {
                                    // تصفير النافذة قبل الفتح لضمان عدم بقاء بيانات قديمة
                                    if (typeof resetSearchInvoiceModal === 'function') resetSearchInvoiceModal();

                                    modal.classList.remove('hidden');
                                    // تعيين التاريخ الافتراضي للبحث (اختياري، مثلاً اليوم)
                                    document.getElementById('searchInvoiceDateFrom').value = todayNow;
                                    document.getElementById('searchInvoiceDateTo').value = todayNow;
                                }
                            }, 100);
                        }
                    }
                });

                if (targetTab.type === 'invoices') renderInvoicesTable();
                if (targetTab.type === 'analysis') {
                    const anVal = document.getElementById('anPeriodFilter')?.value;
                    if (anVal && typeof applyAnalysisPeriodFilter === 'function' && anVal !== 'custom') {
                        applyAnalysisPeriodFilter(anVal);
                    } else {
                        renderAnalysisTable();
                    }
                }
                if (targetTab.type === 'warehouse-report') {
                    const wrVal = document.getElementById('wrPeriodFilter')?.value || 'total';
                    if (typeof applyWarehouseReportPeriodFilter === 'function') applyWarehouseReportPeriodFilter(wrVal);
                    else renderWarehouseReportTable();
                }
                if (targetTab.type === 'history') {
                    const hVal = document.getElementById('historyPeriodFilter')?.value;
                    if (hVal && typeof applyHistoryPeriodFilter === 'function' && hVal !== 'custom') {
                        applyHistoryPeriodFilter(hVal);
                    } else {
                        renderHistoryTable();
                    }
                }
                if (targetTab.type === 'daily-report') generateDailyReport();
                if (targetTab.type === 'statement') {
                    const selVal = document.getElementById('stmtAccountSelector') ? document.getElementById('stmtAccountSelector').value.trim() : '';
                    if (selVal && typeof loadSelectedAccountStatement === 'function') {
                        loadSelectedAccountStatement();
                    } else if (typeof generateAccountStatement === 'function') {
                        generateAccountStatement(null);
                    }
                }
            }, 10);
        }

        function saveCurrentTabState() {
            if (!activeTabId || activeTabId === 'dashboard') return;

            const currentTab = openTabs.find(t => t.id === activeTabId);
            if (!currentTab) return;

            // حفظ بيانات البيع
            if (currentTab.type === 'sales') {
                const salesMethodSelect = document.getElementById('sales-sectionPaymentMethodSelect') || document.getElementById('salesPaymentMethodSelect');
                tabStates[activeTabId] = {
                    cart: [...cart],
                    customer: document.getElementById('customerName').value,
                    received: document.getElementById('tenderedAmount').value,
                    discount: document.getElementById('discountInput').value,
                    discountType: document.getElementById('discountType').value,
                    tax: document.getElementById('taxInput').value,
                    taxType: document.getElementById('taxType').value,
                    total: currentTotal,
                    date: document.getElementById('salesDate').value,
                    time: document.getElementById('salesTime').value,
                    method: salesMethodSelect ? salesMethodSelect.value : (document.querySelector('#sales-section .payment-methods .method-btn.selected')?.innerText || 'نقدي')
                };
            }
            // حفظ بيانات المشتريات
            if (currentTab.type === 'purchase') {
                const purMethodSelect = document.getElementById('purchase-sectionPaymentMethodSelect') || document.getElementById('purchasePaymentMethodSelect');
                tabStates[activeTabId] = {
                    cart: [...purchaseCart],
                    supplier: document.getElementById('supplierName').value,
                    received: document.getElementById('purchasePaid').value,
                    discount: document.getElementById('purchaseDiscount')?.value || 0,
                    discountType: document.getElementById('purchaseDiscountType')?.value || 'val',
                    tax: document.getElementById('purchaseTax')?.value || 0,
                    taxType: document.getElementById('purchaseTaxType')?.value || 'val',
                    total: purchaseCart.reduce((s, i) => s + (i.price * i.qty), 0),
                    date: document.getElementById('purchaseDate').value,
                    time: document.getElementById('purchaseTime').value,
                    method: purMethodSelect ? purMethodSelect.value : 'نقدي'
                };
            }
            // حفظ بيانات المرتجعات (بيع)
            if (currentTab.type === 'sales-return') {
                tabStates[activeTabId] = {
                    cart: [...returnCart],
                    partner: document.getElementById('salesReturnPartnerDisplay') ? document.getElementById('salesReturnPartnerDisplay').innerText : '---',
                    invoice: document.getElementById('salesReturnInvoiceDisplay') ? document.getElementById('salesReturnInvoiceDisplay').innerText : '---',
                    reason: document.getElementById('salesReturnReason') ? document.getElementById('salesReturnReason').value : '',
                    date: document.getElementById('salesReturnDate') ? document.getElementById('salesReturnDate').value : '',
                    time: document.getElementById('salesReturnTime') ? document.getElementById('salesReturnTime').value : '',
                    discount: document.getElementById('salesReturnDiscount') ? document.getElementById('salesReturnDiscount').value : 0,
                    tax: document.getElementById('salesReturnTax') ? document.getElementById('salesReturnTax').value : 0
                };
            }
            // حفظ بيانات المرتجعات (شراء)
            if (currentTab.type === 'purchase-return') {
                tabStates[activeTabId] = {
                    cart: [...purReturnCart],
                    partner: document.getElementById('purReturnPartnerDisplay') ? document.getElementById('purReturnPartnerDisplay').innerText : '---',
                    invoice: document.getElementById('purReturnInvoiceDisplay') ? document.getElementById('purReturnInvoiceDisplay').innerText : '---',
                    reason: document.getElementById('purReturnReason') ? document.getElementById('purReturnReason').value : '',
                    date: document.getElementById('purReturnDate') ? document.getElementById('purReturnDate').value : '',
                    time: document.getElementById('purReturnTime') ? document.getElementById('purReturnTime').value : '',
                    discount: document.getElementById('purReturnDiscount') ? document.getElementById('purReturnDiscount').value : 0,
                    tax: document.getElementById('purReturnTax') ? document.getElementById('purReturnTax').value : 0
                };
            }
            // حفظ بيانات التسوية
            if (currentTab.type === 'adjustment') {
                tabStates[activeTabId] = {
                    cart: [...adjCart],
                    date: document.getElementById('adjDate') ? document.getElementById('adjDate').value : '',
                    time: document.getElementById('adjTime') ? document.getElementById('adjTime').value : ''
                };
            }
            // حفظ بيانات السندات (قبض/صرف)
            if (currentTab.type === 'receipt') {
                tabStates[activeTabId] = {
                    id: document.getElementById('receiptID').value,
                    date: document.getElementById('receiptDate').value,
                    time: document.getElementById('receiptTime').value,
                    customer: document.getElementById('receiptCustomer').value,
                    amount: document.getElementById('receiptAmount').value,
                    notes: document.getElementById('receiptNotes').value,
                    type: document.getElementById('receiptType') ? document.getElementById('receiptType').value : 'أخرى',
                    balance: document.getElementById('receiptAccountBalance') ? document.getElementById('receiptAccountBalance').innerText : '0.00'
                };
            }
            if (currentTab.type === 'disbursement') {
                tabStates[activeTabId] = {
                    id: document.getElementById('disburseID').value,
                    date: document.getElementById('disburseDate').value,
                    time: document.getElementById('disburseTime').value,
                    payee: document.getElementById('disbursePayee').value,
                    amount: document.getElementById('disburseAmount').value,
                    notes: document.getElementById('disburseNotes').value,
                    type: document.getElementById('disburseType') ? document.getElementById('disburseType').value : 'أخرى',
                    balance: document.getElementById('disburseAccountBalance') ? document.getElementById('disburseAccountBalance').innerText : '0.00'
                };
            }
            if (currentTab.type === 'product-inquiry') {
                const activeItem = document.querySelector('.inquiry-product-item.active');
                tabStates[activeTabId] = {
                    searchQuery: document.getElementById('inquirySearchInput') ? document.getElementById('inquirySearchInput').value : '',
                    selectedId: activeItem ? activeItem.id.replace('inquiry-item-', '') : null
                };
            }
            if (currentTab.type === 'statement') {
                tabStates[activeTabId] = {
                    ...(tabStates[activeTabId] || {}),
                    accountName: document.getElementById('stmtAccountSelector') ? document.getElementById('stmtAccountSelector').value.trim() : ''
                };
            }

            // حفظ فلاتر الفترة والتواريخ المخصصة لكل قسم تقارير بشكل مستقل
            const dateFilterConfigs = [
                { type: 'invoices', periodId: 'invoicesPeriodFilter', fromId: 'invoicesDateFrom', toId: 'invoicesDateTo' },
                { type: 'analysis', periodId: 'anPeriodFilter', fromId: 'anDateFrom', toId: 'anDateTo' },
                { type: 'history', periodId: 'historyPeriodFilter', fromId: 'historyDateFrom', toId: 'historyDateTo' },
                { type: 'warehouse-report', periodId: 'wrPeriodFilter', fromId: 'wrStartDate', toId: 'wrEndDate' },
                { type: 'daily-report', periodId: 'dailyReportPeriodFilter', fromId: 'reportDateFrom', toId: 'reportDateTo' },
                { type: 'statement', periodId: 'stmtPeriodFilter', fromId: 'stmtDateFrom', toId: 'stmtDateTo' }
            ];

            const curDateConfig = dateFilterConfigs.find(c => c.type === currentTab.type);
            if (curDateConfig) {
                const pEl = document.getElementById(curDateConfig.periodId);
                const fEl = document.getElementById(curDateConfig.fromId);
                const tEl = document.getElementById(curDateConfig.toId);
                const filterStateObj = {
                    periodFilter: pEl ? pEl.value : null,
                    dateFrom: fEl ? fEl.value : null,
                    dateTo: tEl ? tEl.value : null
                };
                tabStates[activeTabId] = {
                    ...(tabStates[activeTabId] || {}),
                    ...filterStateObj
                };
                if (!window.savedSectionDateFilters) window.savedSectionDateFilters = {};
                window.savedSectionDateFilters[currentTab.type] = filterStateObj;
            }
        }

        function restoreTabState(tabId, type) {
            if (typeof closeAllSearchPopups === 'function') closeAllSearchPopups();
            const state = tabStates[tabId];

                        if (type === 'product-inquiry') {
                if (state) {
                    document.getElementById('inquirySearchInput').value = state.searchQuery || '';
                    if (typeof handleInquirySearch === 'function') handleInquirySearch(state.searchQuery || '');
                    if (state.selectedId) {
                        setTimeout(() => {
                            if (typeof selectProductForInquiry === 'function') selectProductForInquiry(Number(state.selectedId));
                        }, 50);
                    }
                } else {
                    document.getElementById('inquirySearchInput').value = '';
                    const emptyState = document.getElementById('inquiryEmptyState');
                    const detailsContent = document.getElementById('inquiryDetailsContent');
                    if (emptyState) emptyState.classList.remove('hidden');
                    if (detailsContent) detailsContent.classList.add('hidden');
                    if (typeof handleInquirySearch === 'function') handleInquirySearch('');
                }
            }

            if (type === 'sales') {
                if (state) {
                    cart = state.cart;
                    document.getElementById('customerName').value = state.customer;
                    document.getElementById('tenderedAmount').value = state.received;
                    document.getElementById('discountInput').value = state.discount;
                    if (state.discountType) document.getElementById('discountType').value = state.discountType;
                    document.getElementById('taxInput').value = state.tax || 0;
                    if (state.taxType) document.getElementById('taxType').value = state.taxType;
                    if (state.date) document.getElementById('salesDate').value = state.date;
                    if (state.time) document.getElementById('salesTime').value = state.time;

                    // استعادة طريقة الدفع بدقة
                    if (state.method) {
                        const salesMethodSelect = document.getElementById('sales-sectionPaymentMethodSelect') || document.getElementById('salesPaymentMethodSelect');
                        if (salesMethodSelect) {
                            salesMethodSelect.value = state.method;
                            if (typeof selectMethod === 'function') selectMethod(salesMethodSelect);
                        }
                        document.querySelectorAll('#sales-section .payment-methods .method-btn').forEach(btn => {
                            btn.classList.toggle('selected', btn.innerText.includes(state.method));
                        });
                    }

                    updateActiveTabTitle(state.customer, 'بيع');
                } else {
                    cart = [];
                    document.getElementById('customerName').value = '';
                    document.getElementById('tenderedAmount').value = '';
                    document.getElementById('discountInput').value = '0';
                    document.getElementById('taxInput').value = '0';
                    // تعيين التاريخ والوقت الحالي للتبويب الجديد
                    const now = new Date();
                    document.getElementById('salesDate').value = now.toLocaleDateString('en-CA');
                    document.getElementById('salesTime').value = now.toTimeString().slice(0, 5);
                }
                renderCart();
            }

            if (type === 'purchase') {
                if (state) {
                    purchaseCart = state.cart;
                    document.getElementById('supplierName').value = state.supplier;
                    document.getElementById('purchasePaid').value = state.received;
                    if (document.getElementById('purchaseDiscount')) document.getElementById('purchaseDiscount').value = state.discount || 0;
                    if (document.getElementById('purchaseDiscountType') && state.discountType) document.getElementById('purchaseDiscountType').value = state.discountType;
                    if (document.getElementById('purchaseTax')) document.getElementById('purchaseTax').value = state.tax || 0;
                    if (document.getElementById('purchaseTaxType') && state.taxType) document.getElementById('purchaseTaxType').value = state.taxType;
                    if (state.date) document.getElementById('purchaseDate').value = state.date;
                    if (state.time) document.getElementById('purchaseTime').value = state.time;

                    if (state.method) {
                        const purMethodSelect = document.getElementById('purchase-sectionPaymentMethodSelect') || document.getElementById('purchasePaymentMethodSelect');
                        if (purMethodSelect) {
                            purMethodSelect.value = state.method;
                            if (typeof selectMethod === 'function') selectMethod(purMethodSelect);
                        }
                    }

                    updateActiveTabTitle(state.supplier, 'شراء');
                } else {
                    purchaseCart = [];
                    document.getElementById('supplierName').value = '';
                    document.getElementById('purchasePaid').value = '';
                    const now = new Date();
                    document.getElementById('purchaseDate').value = now.toLocaleDateString('en-CA');
                    document.getElementById('purchaseTime').value = now.toTimeString().slice(0, 5);
                }
                renderPurchaseCart_Finalized_V3();
            }

            if (type === 'sales-return') {
                if (state) {
                    returnCart = state.cart;
                    document.getElementById('salesReturnPartnerDisplay').innerText = state.partner;
                    const invDisp = document.getElementById('salesReturnInvoiceDisplay');
                    if (invDisp) invDisp.innerText = state.invoice;
                    document.getElementById('salesReturnReason').value = state.reason;
                    if (state.date) document.getElementById('salesReturnDate').value = state.date;
                    if (state.time) document.getElementById('salesReturnTime').value = state.time;
                    if (state.discount) document.getElementById('salesReturnDiscount').value = state.discount;
                    if (state.tax) document.getElementById('salesReturnTax').value = state.tax;
                    updateActiveTabTitle(state.partner, 'م.بيع');
                } else {
                    returnCart = [];
                    document.getElementById('salesReturnPartnerDisplay').innerText = '---';
                    const invDisp = document.getElementById('salesReturnInvoiceDisplay');
                    if (invDisp) invDisp.innerText = '---';
                    document.getElementById('salesReturnReason').value = 'تالف';
                    const now = new Date();
                    document.getElementById('salesReturnDate').value = now.toLocaleDateString('en-CA');
                    document.getElementById('salesReturnTime').value = now.toTimeString().slice(0, 5);
                }
                renderReturnCart();
            }

            if (type === 'purchase-return') {
                if (state) {
                    purReturnCart = state.cart;
                    document.getElementById('purReturnPartnerDisplay').innerText = state.partner;
                    const invDisp = document.getElementById('purReturnInvoiceDisplay');
                    if (invDisp) invDisp.innerText = state.invoice;
                    document.getElementById('purReturnReason').value = state.reason;
                    if (state.date) document.getElementById('purReturnDate').value = state.date;
                    if (state.time) document.getElementById('purReturnTime').value = state.time;
                    if (state.discount) document.getElementById('purReturnDiscount').value = state.discount;
                    if (state.tax) document.getElementById('purReturnTax').value = state.tax;
                    updateActiveTabTitle(state.partner, 'م.شراء');
                } else {
                    purReturnCart = [];
                    document.getElementById('purReturnPartnerDisplay').innerText = '---';
                    const invDisp = document.getElementById('purReturnInvoiceDisplay');
                    if (invDisp) invDisp.innerText = '---';
                    document.getElementById('purReturnReason').value = 'تالف';
                    const now = new Date();
                    document.getElementById('purReturnDate').value = now.toLocaleDateString('en-CA');
                    document.getElementById('purReturnTime').value = now.toTimeString().slice(0, 5);
                }
                renderPurReturnCart();
            }

            if (type === 'adjustment') {
                if (state) {
                    adjCart = state.cart;
                    if (state.date) document.getElementById('adjDate').value = state.date;
                    if (state.time) document.getElementById('adjTime').value = state.time;
                } else {
                    adjCart = [];
                    const now = new Date();
                    document.getElementById('adjDate').value = now.toLocaleDateString('en-CA');
                    document.getElementById('adjTime').value = now.toTimeString().slice(0, 5);
                }
                renderAdjTable();
            }

            if (type === 'receipt') {
                if (state) {
                    document.getElementById('receiptID').value = state.id;
                    document.getElementById('receiptDate').value = state.date;
                    if (document.getElementById('receiptTime')) document.getElementById('receiptTime').value = state.time || '';
                    document.getElementById('receiptCustomer').value = state.customer;
                    document.getElementById('receiptAmount').value = state.amount;
                    document.getElementById('receiptNotes').value = state.notes;
                    if (document.getElementById('receiptType')) document.getElementById('receiptType').value = state.type || 'أخرى';
                    if (document.getElementById('receiptAccountBalance')) document.getElementById('receiptAccountBalance').innerText = state.balance || '0.00';
                } else {
                    document.getElementById('receiptID').value = getNextSequence('قبض');
                    const now = new Date();
                    document.getElementById('receiptDate').value = now.toLocaleDateString('en-CA');
                    if (document.getElementById('receiptTime')) document.getElementById('receiptTime').value = now.toTimeString().slice(0, 5);
                    document.getElementById('receiptCustomer').value = '';
                    document.getElementById('receiptAmount').value = '';
                    document.getElementById('receiptNotes').value = '';
                    if (document.getElementById('receiptAccountBalance')) document.getElementById('receiptAccountBalance').innerText = '0.00';
                }
            }

            if (type === 'disbursement') {
                if (state) {
                    document.getElementById('disburseID').value = state.id;
                    document.getElementById('disburseDate').value = state.date;
                    if (document.getElementById('disburseTime')) document.getElementById('disburseTime').value = state.time || '';
                    document.getElementById('disbursePayee').value = state.payee;
                    document.getElementById('disburseAmount').value = state.amount;
                    document.getElementById('disburseNotes').value = state.notes;
                    if (document.getElementById('disburseType')) document.getElementById('disburseType').value = state.type || 'أخرى';
                    if (document.getElementById('disburseAccountBalance')) document.getElementById('disburseAccountBalance').innerText = state.balance || '0.00';
                } else {
                    document.getElementById('disburseID').value = getNextSequence('صرف');
                    const now = new Date();
                    document.getElementById('disburseDate').value = now.toLocaleDateString('en-CA');
                    if (document.getElementById('disburseTime')) document.getElementById('disburseTime').value = now.toTimeString().slice(0, 5);
                    document.getElementById('disbursePayee').value = '';
                    document.getElementById('disburseAmount').value = '';
                    document.getElementById('disburseNotes').value = '';
                    if (document.getElementById('disburseAccountBalance')) document.getElementById('disburseAccountBalance').innerText = '0.00';
                }
            }
            if (type === 'price-tracking') {
                if (typeof initPriceTracking === 'function') initPriceTracking();
            }
            if (type === 'statement') {
                const stmtInput = document.getElementById('stmtAccountSelector');
                const savedAcc = (state && state.accountName) ? state.accountName : '';
                if (stmtInput) {
                    stmtInput.value = savedAcc;
                }
                if (savedAcc && typeof loadSelectedAccountStatement === 'function') {
                    loadSelectedAccountStatement();
                } else if (typeof generateAccountStatement === 'function') {
                    generateAccountStatement(null);
                }
            }
                        if (type === 'product-inquiry') {
                setTimeout(() => {
                    const searchInput = document.getElementById('inquirySearchInput');
                    if (searchInput) searchInput.focus();
                }, 100);
            }
            // استعادة فلاتر الفترة والتواريخ المخصصة المحفوظة للقسم
            const dateFilterConfigs = [
                { type: 'invoices', periodId: 'invoicesPeriodFilter', fromId: 'invoicesDateFrom', toId: 'invoicesDateTo' },
                { type: 'analysis', periodId: 'anPeriodFilter', fromId: 'anDateFrom', toId: 'anDateTo' },
                { type: 'history', periodId: 'historyPeriodFilter', fromId: 'historyDateFrom', toId: 'historyDateTo' },
                { type: 'warehouse-report', periodId: 'wrPeriodFilter', fromId: 'wrStartDate', toId: 'wrEndDate' },
                { type: 'daily-report', periodId: 'dailyReportPeriodFilter', fromId: 'reportDateFrom', toId: 'reportDateTo' },
                { type: 'statement', periodId: 'stmtPeriodFilter', fromId: 'stmtDateFrom', toId: 'stmtDateTo' }
            ];

            const curDateConfig = dateFilterConfigs.find(c => c.type === type);
            const savedState = (state && (state.periodFilter !== undefined || state.dateFrom))
                ? state
                : (window.savedSectionDateFilters ? window.savedSectionDateFilters[type] : null);

            if (curDateConfig && savedState) {
                const pEl = document.getElementById(curDateConfig.periodId);
                const fEl = document.getElementById(curDateConfig.fromId);
                const tEl = document.getElementById(curDateConfig.toId);
                if (pEl && savedState.periodFilter !== undefined && savedState.periodFilter !== null) {
                    pEl.value = savedState.periodFilter;
                }
                if (fEl && savedState.dateFrom) fEl.value = savedState.dateFrom;
                if (tEl && savedState.dateTo) tEl.value = savedState.dateTo;

                // التوافق مع إظهار حقول التاريخ المخصص في الأقسام ذات الحقول المخفية
                if (type === 'warehouse-report') {
                    const customContainer = document.getElementById('wrCustomDateContainer');
                    if (customContainer) {
                        if (savedState.periodFilter === 'custom') customContainer.classList.remove('hidden');
                        else customContainer.classList.add('hidden');
                    }
                } else if (type === 'history') {
                    const customDatesDiv = document.getElementById('historyCustomDates');
                    if (customDatesDiv) {
                        if (savedState.periodFilter === 'custom') {
                            customDatesDiv.style.opacity = '1';
                            customDatesDiv.style.pointerEvents = 'auto';
                        }
                    }
                }
            }
        }

        function renderTabs() {
            const tabBar = document.getElementById('tabBar');
            if (!tabBar) return;

            const sectionsLocal = {
                'dashboard': '🏠 الرئيسية',
                'sales': '🛒 البيع',
                'purchase': '🚐 المشتريات',
                'inventory': '📦 المخازن',
                'accounts': '📂 الحسابات',
                'analysis': '📊 التحليل',
                'receipt': '💰 القبض',
                'disbursement': '💸 الصرف',
                'daily-report': '🗓️ التقارير',
                'history': '📜 الحركة',
                'invoices': '📄 الفواتير',
                'sales-return': '🔄 مرتجع بيع',
                'purchase-return': '🔄 مرتجع شراء',
                'settings': '⚙️ الإعدادات',
                'adjustment': '⚖️ تسوية',
                'reports-hub': '📈 مركز التقارير',
                'price-tracking': '💰 الأسعار',
                'product-inquiry': '🔍 استعلام',
                'ai-assistant': '🤖 مساعد'
            };

            tabBar.innerHTML = '';

            // 1. حاوية التبويبات المرنة القابلة للسحب والترتيب
            const listWrapper = document.createElement('div');
            listWrapper.id = 'tabBarList';
            listWrapper.className = 'tab-bar-list';

            openTabs.forEach(tab => {
                const tabEl = document.createElement('div');
                tabEl.className = 'app-tab-item' + (tab.id === activeTabId ? ' active' : '');
                tabEl.id = 'tab-' + tab.id;
                tabEl.setAttribute('data-type', tab.type); 
                tabEl.onclick = () => switchSection(tab.type, true, tab.id);

                const label = document.createElement('span');
                label.className = 'app-tab-title';
                label.innerText = tab.label || sectionsLocal[tab.type] || tab.type;
                tabEl.appendChild(label);

                if (tab.type !== 'dashboard') {
                    const closeBtn = document.createElement('span');
                    closeBtn.className = 'app-tab-close';
                    closeBtn.innerHTML = '&times;';
                    closeBtn.title = 'إغلاق التبويب';
                    closeBtn.onclick = (e) => {
                        e.stopPropagation();
                        closeTab(tab.id, e);
                    };
                    tabEl.appendChild(closeBtn);
                }

                listWrapper.appendChild(tabEl);
            });

            tabBar.appendChild(listWrapper);

            // 2. زر إضافة تبويب جديد (+) الثابت دائماً على اليسار Sticky Add Button
            const addBtn = document.createElement('div');
            addBtn.className = 'app-tab-add';
            addBtn.title = 'فتح نافذة جديدة';
            addBtn.innerHTML = '+';
            addBtn.onclick = () => showQuickNav();
            tabBar.appendChild(addBtn);

            // التمرير التلقائي لرؤية التبويب النشط
            setTimeout(() => {
                const activeEl = listWrapper.querySelector('.app-tab-item.active');
                if (activeEl && typeof activeEl.scrollIntoView === 'function') {
                    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                }
            }, 50);

            if (typeof initTabSortable === 'function') initTabSortable();
        }

        let tabSortableInstance = null;
        function initTabSortable() {
            try {
                const el = document.getElementById('tabBarList');
                if (!el || typeof Sortable === 'undefined') return;

                if (tabSortableInstance && typeof tabSortableInstance.destroy === 'function') {
                    try { tabSortableInstance.destroy(); } catch(e) {}
                    tabSortableInstance = null;
                }

                if (typeof Sortable === 'function') {
                    tabSortableInstance = new Sortable(el, {
                        animation: 180,
                        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
                        draggable: ".app-tab-item:not(#tab-dashboard)",
                        ghostClass: "sortable-tab-ghost",
                        chosenClass: "sortable-tab-chosen",
                        dragClass: "sortable-tab-drag",
                        direction: 'horizontal',
                        delay: 0,
                        touchStartThreshold: 3,
                        onMove: function (evt) {
                            if (evt.related && evt.related.id === 'tab-dashboard') {
                                return false;
                            }
                        },
                        onEnd: function (evt) {
                            const newOrder = [];
                            const items = el.querySelectorAll('.app-tab-item');
                            items.forEach(item => {
                                const idStr = item.id.replace('tab-', '');
                                const tab = openTabs.find(t => String(t.id) === String(idStr));
                                if (tab) newOrder.push(tab);
                            });

                            if (newOrder.length === openTabs.length) {
                                openTabs = newOrder;
                            }
                        }
                    });
                }
            } catch(e) {
                console.warn("Tab sortable warning:", e);
            }
        }

        function showQuickNav() {
            document.getElementById('quickNavModal').classList.remove('hidden');
        }

        function updateTabUI(activeId) {
            document.querySelectorAll('.app-tab-item').forEach(t => t.classList.remove('active'));
            const activeTab = document.getElementById('tab-' + activeId);
            if (activeTab) {
                activeTab.classList.add('active');
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
            }
        }

        function closeTab(tabId, event) {
            if (event) event.stopPropagation();
            if (tabId === 'dashboard') return;

            const currentTab = openTabs.find(t => t.id === tabId);
            if (!currentTab) return;

            const financialTypes = ['sales', 'purchase', 'receipt', 'disbursement', 'sales-return', 'purchase-return', 'adjustment'];
            if (financialTypes.includes(currentTab.type)) {
                let hasData = false;
                const state = tabStates[tabId];
                const type = currentTab.type;

                if (activeTabId === tabId) {
                    if (type === 'sales' && (cart.length > 0 || document.getElementById('customerName').value.trim() !== '')) hasData = true;
                    if (type === 'purchase' && (purchaseCart.length > 0 || document.getElementById('supplierName').value.trim() !== '')) hasData = true;
                    if (type === 'sales-return' && returnCart.length > 0) hasData = true;
                    if (type === 'purchase-return' && purReturnCart.length > 0) hasData = true;
                    if (type === 'adjustment' && adjCart.length > 0) hasData = true;

                    if (type === 'receipt' || type === 'disbursement') {
                        const amId = (type === 'receipt') ? 'receiptAmount' : 'disburseAmount';
                        const partnerId = (type === 'receipt') ? 'receiptCustomer' : 'disbursePayee';
                        if (parseFloat(document.getElementById(amId).value) > 0 || document.getElementById(partnerId).value.trim() !== '') hasData = true;
                    }
                } else if (state) {
                    if (state.cart && state.cart.length > 0) hasData = true;
                    if ((type === 'receipt' || type === 'disbursement') && parseFloat(state.amount) > 0) {
                        hasData = true;
                    }
                }

                if (hasData) {
                    pendingCloseSection = tabId;
                    showCloseWarning(tabId);
                    return;
                }
            }
            actuallyCloseTab(tabId);
        }

        function actuallyCloseTab(tabId) {
            if (tabId === 'calculator') {
                const modal = document.getElementById('royalCalculator');
                if (modal) modal.classList.remove('visible');
            }
            const index = openTabs.findIndex(t => t.id === tabId);
            if (index > -1) {
                const isActive = (activeTabId === tabId);
                openTabs.splice(index, 1);
                delete tabStates[tabId];
                renderTabs();
                if (isActive) {
                    const nextIndex = Math.max(0, index - 1);
                    const nextTab = openTabs[nextIndex] || openTabs[0];
                    if (nextTab) {
                        switchSection(nextTab.type, true, nextTab.id);
                    }
                }
            }
        }
        window.closeTab = closeTab;
        window.actuallyCloseTab = actuallyCloseTab;

        function closeCurrentSectionTab(sectionType) {
            const tabToClose = openTabs.find(t => t.id === activeTabId && t.type === sectionType) || 
                               openTabs.find(t => t.type === sectionType) ||
                               openTabs.find(t => t.id === sectionType);
            if (tabToClose) {
                actuallyCloseTab(tabToClose.id);
            } else {
                if (typeof switchSection === 'function') switchSection('dashboard');
            }
        }
        window.closeCurrentSectionTab = closeCurrentSectionTab;

        function showCloseWarning() {
            document.getElementById('confirmModal').classList.remove('hidden');
        }

        function hideCloseWarning() {
            document.getElementById('confirmModal').classList.add('hidden');
            pendingCloseSection = null;
        }

        function initConfirmModal() {
            const backBtn = document.getElementById('confirmBackBtn');
            const noBtn = document.getElementById('confirmNoBtn');
            const yesBtn = document.getElementById('confirmYesBtn');

            if (backBtn) backBtn.onclick = hideCloseWarning;

            if (noBtn) {
                noBtn.onclick = () => {
                    actuallyCloseTab(pendingCloseSection);
                    hideCloseWarning();
                };
            }

            if (yesBtn) {
                yesBtn.onclick = () => {
                    if (pendingCloseSection) {
                        const tabToSave = openTabs.find(t => t.id === pendingCloseSection);
                        if (tabToSave) {
                            switchSection(tabToSave.type, false, tabToSave.id);
                            let saved = false;
                            const type = tabToSave.type;
                            if (type === 'sales') saved = saveBill();
                            else if (type === 'purchase') saved = savePurchase();
                            else if (type === 'sales-return') saved = saveSalesReturn();
                            else if (type === 'purchase-return') saved = savePurchaseReturn();
                            else if (type === 'adjustment') saved = saveAdjustment();
                            else if (type === 'receipt') saved = saveReceipt();
                            else if (type === 'disbursement') saved = saveDisbursement();
                            if (saved) {
                                actuallyCloseTab(pendingCloseSection);
                                hideCloseWarning();
                            } else {
                                hideCloseWarning();
                            }
                        }
                    }
                };
            }
        }

        // ================= نظام الترخيص والاشتراك (Bayan License System) =================
        function toggleSubscriptionModal(show) {
            const modal = document.getElementById('subscriptionModal');
            if (!modal) return;
            if (show) modal.classList.remove('hidden');
            else modal.classList.add('hidden');
        }

        // --- وظائف شعار المؤسسة (Logo System) ---
        function triggerLogoUpload() {
            document.getElementById('logoInputHidden').click();
        }

        function handleLogoUpload(input) {
            const file = input.files[0];
            if (!file) return;

            // التأكد من حجم الملف (اختياري)
            if (file.size > 2 * 1024 * 1024) {
                alert("حجم الصورة كبير جداً، يفضل أقل من 2 ميجابايت.");
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                const base64 = e.target.result;
                try {
                    setStore('bayan_business_logo', base64);
                    updateLogoDisplays(base64);
                    // عرض تنبيه نجاح (إذا كانت الدالة موجودة)
                    if (typeof showToast === 'function') showToast("تم تحديث الشعار بنجاح ✅");
                    else alert("تم تحديث شعار المؤسسة بنجاح ✅");
                } catch (err) {
                    alert("عذراً، مساحة التخزين ممتلئة. حاول استخدام صورة أصغر حجماً.");
                }
            };
            reader.readAsDataURL(file);
        }

        function updateLogoDisplays(src) {
            const headerLogo = document.getElementById('headerLogo');
            const placeholder = document.getElementById('logoPlaceholder');
            const dashboardLogo = document.getElementById('dashboardLogoDisplay');
            const settingsPreview = document.getElementById('settingsLogoPreview');

            if (src) {
                if (headerLogo) {
                    headerLogo.src = src;
                    headerLogo.style.display = 'block';
                }
                if (placeholder) placeholder.style.display = 'none';

                if (dashboardLogo) {
                    dashboardLogo.style.backgroundImage = `url(${src})`;
                    dashboardLogo.innerHTML = '';
                }

                if (settingsPreview) {
                    settingsPreview.style.backgroundImage = `url(${src})`;
                    settingsPreview.innerHTML = '';
                }
            }
        }

        // --- نظام مغير الخلفيات (Wallpaper Logic) المطوّر ---
        function toggleWallpaperMenu() {
            const menu = document.getElementById('wallpaperMenu');
            if (!menu) return;

            const isVisible = menu.classList.contains('visible');

            if (!isVisible) {
                menu.classList.remove('hidden');
                menu.classList.add('visible');
                // التأكد من تطبيق الحالة النشطة عند الفتح
                const saved = getStore('bayan_wallpaper');
                if (saved) updateWallpaperActiveState(saved);
            } else {
                menu.classList.remove('visible');
                menu.classList.add('hidden');
            }
        }

        async function changeWallpaper(url, isCustom = false) {
            const body = document.body;

            if (!url || url === 'none') {
                body.style.backgroundImage = 'none';
                body.style.background = '';
                body.classList.remove('has-wallpaper');
                setStore('bayan_wallpaper', 'none');
                removeStore('bayan_wallpaper_type');
            } else {
                if (url.startsWith('linear-gradient') || url.startsWith('radial-gradient')) {
                    body.style.backgroundImage = url;
                } else if (url.startsWith('custom_')) {
                    try {
                        const custom = await db.wallpapers.where('name').equals(url).first();
                        if (custom) body.style.backgroundImage = `url('${custom.data}')`;
                    } catch (e) { console.error(e); }
                } else {
                    body.style.backgroundImage = `url('${url}')`;
                }
                body.style.backgroundSize = 'cover';
                body.style.backgroundAttachment = 'fixed';
                body.style.backgroundPosition = 'center';
                body.classList.add('has-wallpaper');
                setStore('bayan_wallpaper', url);
                setStore('bayan_wallpaper_type', isCustom ? 'custom' : 'preset');
            }

            // إخفاء القائمة بعد الاختيار
            const menu = document.getElementById('wallpaperMenu');
            if (menu) {
                menu.classList.remove('visible');
                menu.classList.add('hidden');
            }

            // تنبيه نجاح
            if (typeof showToast === 'function') showToast("تم تحديث مظهر البرنامج بنجاح ✨", "success");

            // تحديث العلامة النشطة
            updateWallpaperActiveState(url);
        }

        function updateWallpaperActiveState(url) {
            document.querySelectorAll('.wp-option').forEach(opt => {
                opt.classList.remove('active');
                // التحقق من الخلفية (سواء كانت صورة مدمجة أو Base64)
                if (opt.style.backgroundImage && opt.style.backgroundImage.includes(url.substring(0, 50))) {
                    opt.classList.add('active');
                }
            });
        }

        async function loadCustomWallpapersToGallery() {
            const grid = document.getElementById('customWallpapersGrid');
            if (!grid) return;
            
            try {
                grid.innerHTML = '';
                const customWps = await db.wallpapers.where('name').startsWith('custom_').toArray();
                if (customWps.length === 0) {
                    grid.style.display = 'none';
                    return;
                }
                grid.style.display = 'grid';
                
                customWps.forEach(wp => {
                    const div = document.createElement('div');
                    div.className = 'wp-item-card';
                    div.style.background = `url('${wp.data}') center/cover`;
                    div.onclick = () => changeWallpaper(wp.name, true);
                    
                    const label = document.createElement('div');
                    label.className = 'wp-label';
                    label.style.background = 'rgba(0,0,0,0.6)';
                    label.innerHTML = `مخصصة <span onclick="event.stopPropagation(); deleteCustomWallpaper('${wp.name}')" style="color: #f43f5e; float: left; cursor: pointer; padding: 0 5px;">✖</span>`;
                    
                    div.appendChild(label);
                    grid.appendChild(div);
                });
            } catch (e) {
                console.error("Error loading custom wallpapers:", e);
            }
        }

        async function deleteCustomWallpaper(name) {
            try {
                await db.wallpapers.where('name').equals(name).delete();
                // If it was the current wallpaper, reset it
                if (getStore('bayan_wallpaper') === name) {
                    changeWallpaper('none');
                }
                await loadCustomWallpapersToGallery();
                if (typeof showToast === 'function') showToast("تم حذف الخلفية بنجاح", "success");
            } catch (e) {
                console.error("Error deleting custom wallpaper:", e);
            }
        }

        async function uploadCustomWallpaper(event) {
            const file = event.target.files[0];
            if (!file) return;

            // التحقق من حجم الملف (يفضل أقل من 2 ميجا لتجنب مشاكل الذاكرة)
            if (file.size > 2 * 1024 * 1024) {
                return showToast("⚠️ حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميجابايت.", "error");
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Data = e.target.result;
                try {
                    // حفظ في IndexedDB مع الاحتفاظ بالخلفيات السابقة
                    const customId = 'custom_' + Date.now();
                    await db.wallpapers.add({ name: customId, data: base64Data });

                    // إضافة للمطهر فوراً باستخدام الـ ID وليس الـ Base64
                    changeWallpaper(customId, true);
                    
                    // تحديث قائمة الخلفيات המخصصة
                    await loadCustomWallpapersToGallery();
                    
                    showToast("✅ تم رفع وحفظ الخلفية المخصصة بنجاح", "success");
                } catch (err) {
                    console.error("فشل حفظ الخلفية:", err);
                    showToast("❌ حدث خطأ أثناء حفظ الصورة محلياً.", "error");
                }
            };
            reader.readAsDataURL(file);
        }

        async function loadWallpaper() {
            const type = getStore('bayan_wallpaper_type');
            let saved = getStore('bayan_wallpaper');

            // تحديث معرض الخلفيات المخصصة
            await loadCustomWallpapersToGallery();

            // 🌟 الإلزام التلقائي: إذا لم يكن لدى العميل أي خلفية مختارة (أول مرة يفتح)، نطبق خلفية الطبيعة الجبلية تلقائياً
            if (!saved || saved === 'none') {
                saved = 'media/wallpapers/mountains.jpg';
                setStore('bayan_wallpaper', saved);
                setStore('bayan_wallpaper_type', 'preset');
            }

            if (type === 'custom' && saved) {
                try {
                    const custom = await db.wallpapers.where('name').equals(saved).first();
                    if (custom) {
                        document.body.style.backgroundImage = `url('${custom.data}')`;
                        document.body.classList.add('has-wallpaper');
                        return;
                    } else if (saved.startsWith('data:image')) {
                        document.body.style.backgroundImage = `url('${saved}')`;
                        document.body.classList.add('has-wallpaper');
                        return;
                    }
                } catch(e) { console.error("Error loading custom wallpaper:", e); }
            }

            // في حالة الفشل أو النوع Preset، نستخدم الرابط المحفوظ
            if (saved && saved !== 'none') {
                if (saved.startsWith('linear-gradient') || saved.startsWith('radial-gradient')) {
                    document.body.style.backgroundImage = saved;
                } else {
                    document.body.style.backgroundImage = `url('${saved}')`;
                }
                document.body.classList.add('has-wallpaper');
            }
        }

        async function initLicense() {
            if (!getStore('bayan_install_date')) {
                setStore('bayan_install_date', new Date().toISOString());
            }

            // تهيئة رقم الجهاز الحديث
            const hwid = await getUniqueHWID();

            // تحديث العرض في قسم "حول النظام" المطور
            const mainHwidEl = document.getElementById('displayHwid');
            if (mainHwidEl) mainHwidEl.innerText = hwid;

            // تحديث العرض القديم (Machine ID) للتوافق
            const display = document.getElementById('displayMachineId');
            if (display) display.innerText = hwid;

            // checkAccess(); removed redundant call

            // تحديث قائمة التصنيفات في المخزن عند البداية لضمان عمل الفلتر
            setTimeout(() => {
                if(typeof updateCategoryFilterOptions === 'function') updateCategoryFilterOptions();
            }, 1500);
        }

        // --- توليد رقم فريد للجهاز (Machine ID) ---
        function getMachineId() {
            return getStore('bayan_hwid') || 'LOCAL_DEVICE';
        }

        function requestActivation(plan, price) {
            const currentPlan = window.getBayanPlan();
            
            const tiers = { 'باقة نسخة المجانية': 0, 'الباقة الشهرية': 1, 'الباقة السنوية': 2, 'الباقة مدى الحياة': 3 };
            const curTier = tiers[currentPlan] || 0;
            const newTier = tiers[plan] || 0;

            if (curTier === 3) {
                if (typeof showToast === 'function') showToast("أنت تمتلك النسخة مدى الحياة بالفعل! لا حاجة للاشتراك.", "warning");
                else alert("أنت تمتلك النسخة مدى الحياة بالفعل! لا حاجة للاشتراك.");
                return;
            }

            if (newTier < curTier) {
                if (typeof showToast === 'function') showToast(`أنت مشترك حالياً في باقة أعلى (${currentPlan}). لا يمكن الرجوع لباقة أقل.`, "error");
                else alert(`أنت مشترك حالياً في باقة أعلى (${currentPlan}). لا يمكن الرجوع لباقة أقل.`);
                return;
            }

            if (newTier === curTier && curTier !== 0) {
                // If they try to subscribe to the same plan, ask for confirmation
                const conf = confirm(`أنت مشترك في "${currentPlan}" بالفعل. هل تريد تجديد الاشتراك أو الاشتراك مرة أخرى؟`);
                if (!conf) return;
            }

            const mId = getMachineId();
            const shopName = document.getElementById('shopName')?.value.trim();
            const phone = document.getElementById('shopPhone1')?.value.trim();
            
            if (!shopName || !phone) {
                if (typeof showToast === 'function') showToast("⚠️ روح سجل بيانات المحل (الاسم ورقم الهاتف) في قسم الإعدادات الأول عشان نقدر نرسل طلب الاشتراك.", "error");
                else alert("⚠️ روح سجل بيانات المحل (الاسم ورقم الهاتف) في قسم الإعدادات الأول عشان نقدر نرسل طلب الاشتراك.");
                return;
            }

            const version = window.appVersion || '2.0.0';

            const message = `السلام عليكم\nأريد الاشتراك في Bayan POS\n\nاسم المحل: ${shopName}\nMachine ID: ${mId}\nرقم الهاتف: ${phone}\nالباقة: ${plan}\nإصدار البرنامج: ${version}\n\nتم تحويل المبلغ.`;
            
            const whatsappUrl = `https://wa.me/201006825905?text=${encodeURIComponent(message)}`;

            // Populate Modal
            const elPlanName = document.getElementById('payModalPlanName');
            const elPrice = document.getElementById('payModalPrice');
            const elTransferPhone = document.getElementById('payModalTransferPhone');
            const btnProceed = document.getElementById('proceedToWhatsappBtn');
            
            if (elPlanName) elPlanName.innerText = plan;
            if (elPrice) elPrice.innerText = price;
            
            const transferPhone = getStore('bayan_sub_transfer_phone');
            if (elTransferPhone) {
                if (transferPhone) {
                    elTransferPhone.innerText = transferPhone;
                    elTransferPhone.style.color = '#10b981'; // green if registered
                } else {
                    elTransferPhone.innerText = 'غير مسجل';
                    elTransferPhone.style.color = '#ef4444'; // red if not
                }
            }

            if (btnProceed) {
                btnProceed.onclick = function() {
                    window.open(whatsappUrl, '_blank');
                    document.getElementById('paymentConfirmModal').classList.add('hidden');
                };
            }

            const payModal = document.getElementById('paymentConfirmModal');
            if (payModal) {
                payModal.classList.remove('hidden');
            } else {
                // Fallback
                if(confirm(`هل أنت متأكد من المتابعة للاشتراك في ${plan}؟`)) window.open(whatsappUrl, '_blank');
            }
        }

        // --- تبديل ستايلات الطباعة ---
        function setPrintStyle(style) {
            setStore('bayan_print_style', style);
            if (typeof showToast === 'function') showToast(`تم ضبط نمط الطباعة على: ${style} ✅`);
            else alert(`تم تغيير نمط الطباعة إلى ${style} بنجاح ✅`);
        }

        function savePrintSettings() {
            const printSettings = {
                paperSize: document.getElementById('printPaperSize').value,
                copies: document.getElementById('printCopies').value,
                showLogo: document.getElementById('printShowLogo').checked,
                showCompanyInfo: document.getElementById('printShowCompanyInfo').checked,
                showTaxID: document.getElementById('printShowTaxID').checked
            };
            setStore('bayan_print_settings', JSON.stringify(printSettings));
            if (typeof showToast === 'function') showToast("تم حفظ خيارات الطباعة والتصميم بنجاح 🖨️");
            else alert("تم حفظ خيارات الطباعة والتصميم بنجاح 🖨️");
        }

        function loadPrintSettings() {
            const saved = getStore('bayan_print_settings');
            if (saved) {
                const s = JSON.parse(saved);
                if (document.getElementById('printPaperSize')) document.getElementById('printPaperSize').value = s.paperSize || '80mm';
                if (document.getElementById('printCopies')) document.getElementById('printCopies').value = s.copies || 1;
                if (document.getElementById('printShowLogo')) document.getElementById('printShowLogo').checked = s.showLogo !== false;
                if (document.getElementById('printShowCompanyInfo')) document.getElementById('printShowCompanyInfo').checked = s.showCompanyInfo !== false;
                if (document.getElementById('printShowTaxID')) document.getElementById('printShowTaxID').checked = s.showTaxID || false;
            }
        }

        function updateActiveTabTitle(nameValue, baseLabel) {
            if (!activeTabId || activeTabId === 'dashboard') return;

            const tab = openTabs.find(t => t.id === activeTabId);
            if (!tab) return;

            const sectionType = activeTabId.split('_')[0];
            let icon = '';
            let labelText = '';

            // قاموس الأيقونات والتسميات المختصرة لضمان "شياكة" الواجهة
            const icons = {
                'sales': { icon: '🛒', labelText: 'بيع: ' },
                'purchase': { icon: '📦', labelText: 'شراء: ' },
                'sales-return': { icon: '🔄', labelText: 'م.بيع: ' },
                'purchase-return': { icon: '📤', labelText: 'م.شراء: ' },
                'receipt': { icon: '💵', labelText: 'قبض: ' },
                'disbursement': { icon: '💸', labelText: 'صرف: ' }
            };

            const config = icons[sectionType];
            if (config) {
                icon = config.icon;
                labelText = config.labelText;
            } else {
                // إذا لم يكن قسماً مدعوماً من الاختصارات، نخرج
                return;
            }

            // قص الاسم إذا زاد عن 10 حروف لاختصار المساحة بجودة عالية
            let name = (nameValue || '').trim();
            if (name.length > 10) name = name.substring(0, 10) + '..';

            if (name && name !== '---' && name !== 'عميل نقدي' && name !== 'مورد عام') {
                tab.label = `${icon} ${labelText}${name}`;
            } else {
                // العودة للحالة العادية مع رقم التبويب (مثل: بيع 1)
                const tabNum = tab.id.split('_')[1] ? (openTabs.filter(t => t.type === sectionType).indexOf(tab) + 1) : '';
                const defaultLabels = {
                    'sales': 'بيع', 'purchase': 'شراء', 'sales-return': 'مرتجع بيع', 
                    'purchase-return': 'مرتجع شراء', 'receipt': 'سند قبض', 'disbursement': 'سند صرف'
                };
                tab.label = `${icon} ${defaultLabels[sectionType] || sectionType} ${tabNum}`;
            }

            renderTabs();
        }

        // --- نظام تصميم نماذج الطباعة الاحترافي ---
        let currentSelectedTemplateType = 'فاتورة المبيعات';
        let currentSelectedTemplateId = '0010 - 80mm';

        function selectTemplateType(el, typeName) {
            document.querySelectorAll('.template-type-item').forEach(item => {
                item.classList.remove('active');
                item.style.background = 'transparent';
                item.style.color = 'inherit';
            });
            el.classList.add('active');
            el.style.background = '#3498db';
            el.style.color = 'white';
            currentSelectedTemplateType = typeName;
            updatePrintPreview();
        }

        function selectPrintTemplate(el, templateId) {
            document.querySelectorAll('.template-item').forEach(item => {
                item.classList.remove('active');
                item.style.background = 'transparent';
                item.style.color = 'inherit';
            });
            el.classList.add('active');
            el.style.background = '#3498db';
            el.style.color = 'white';
            currentSelectedTemplateId = templateId;
            updatePrintPreview();
        }

        function updatePrintPreview() {
            const preview = document.getElementById('invoiceLivePreview');
            if (!preview) return;

            // 1. تحديث مقاس المعاينة (العرض)
            const tid = currentSelectedTemplateId.toLowerCase();
            if (tid.includes('a4')) preview.style.width = '450px';
            else if (tid.includes('a5')) preview.style.width = '380px';
            else if (tid.includes('57mm')) preview.style.width = '240px';
            else preview.style.width = '320px'; // الافتراضي 80mm

            // 2. تطبيق سمات التصميم بناءاً على الرقم (0010, 0020, إلخ)
            preview.style.border = '1px solid #ddd'; // تصفير افتراضي
            preview.style.borderRadius = '0';
            preview.style.boxShadow = 'none';

            const headerBox = preview.querySelector('div[style*="border-bottom"]');
            if (currentSelectedTemplateId.includes('0020')) {
                preview.style.border = '2px double #333';
                if (headerBox) headerBox.style.borderBottom = '5px double #333';
            } else if (currentSelectedTemplateId.includes('0030')) {
                preview.style.padding = '8px 4px';
                if (headerBox) headerBox.style.borderBottom = '1px solid #999';
            } else if (currentSelectedTemplateId.includes('0050')) {
                preview.style.borderRadius = '15px';
                preview.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                if (headerBox) headerBox.style.background = '#fcfcfc';
            }

            // 3. تحديث محتوى المعاينة حسب النوع
            const contentArea = preview.querySelector('div:last-child'); // منطقة المحتوى المتغيرة (فوق التذييل أو الجدول)
            const dynamicContent = preview.querySelector('div[style*="border-bottom-style: dashed"], table, div[style*="border-top: 1.5px solid"], div[style*="border-top: 1.5px solid #333"]');

            if (currentSelectedTemplateType === 'أرصدة المخازن') {
                // عرض معاينة مبسطة لتقرير المخازن
                preview.innerHTML = `
                    <div style="padding: 15px;">
                        <div style="border-bottom: 2px solid #5e3370; text-align: center; padding-bottom: 10px; margin-bottom: 15px;">
                            <h2 style="margin: 0; font-size: 1.2rem; color: #5e3370;" id="prevShopName">بَيَان POS</h2>
                            <div style="font-size: 0.8rem; opacity: 0.7;">🧱 تقرير أرصدة المخازن (معاينة)</div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 15px;">
                            <div style="border: 1px solid #eee; padding: 10px; border-radius: 8px; font-size: 0.8rem;">
                                🏠 المخزن الرئيسي<br>
                                📦 الأصناف: <b>25</b> | 🔢 الكمية: <b>1393</b><br>
                                <span style="font-weight: 900; color: #2c3e50;">22,704 ج.م</span>
                            </div>
                            <div style="border: 1px solid #eee; padding: 10px; border-radius: 8px; font-size: 0.8rem; background: #fbfbfb;">
                                🏠 مخزن الفرع 11<br>
                                📦 الأصناف: <b>0</b> | 🔢 الكمية: <b>0</b><br>
                                <span style="font-weight: 900; color: #2c3e50;">0 ج.م</span>
                            </div>
                        </div>

                        <div style="background: linear-gradient(135deg, #5e3370, #2c3e50); color: white; padding: 15px; border-radius: 12px; text-align: center; margin-bottom: 15px;">
                            <div style="font-size: 0.75rem; opacity: 0.9;">🌍 الإجمالي العام للبضاعة</div>
                            <div style="font-size: 1.5rem; font-weight: 900;">22,704 ج.م</div>
                        </div>

                        <div style="text-align: center; border-top: 1px dashed #ddd; padding-top: 10px;">
                            <div id="prevFooterMsg" style="font-size: 0.75rem; color: #555; white-space: pre-wrap;">رسالة تذييل التقرير...</div>
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=BayanPOS-InventoryReport" style="margin-top: 10px; width: 50px;">
                        </div>
                    </div>
                `;
            } else {
                // استعادة شكل الفاتورة الافتراضي
                preview.innerHTML = `
                    <div style="padding: 15px;">
                        <div style="border-bottom: 2px solid #333; text-align: center; padding-bottom: 10px; margin-bottom: 15px;">
                            <h2 style="margin: 0; font-size: 1.2rem;" id="prevShopName">بَيَان POS</h2>
                            <div style="font-size: 0.8rem; opacity: 0.7;">نموذج معاينة المستندات</div>
                        </div>

                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 12px; border-bottom: 1px dashed #eee; padding-bottom: 8px;">
                            <div>التاريخ: 2024-03-25<br>الوقت: 04:23 PM</div>
                            <div style="text-align: left;">رقم المستند: 1001<br>المستخدم: مدير النظام</div>
                        </div>

                        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; direction: rtl; text-align: right;">
                            <thead style="background: #f1f1f1;">
                                <tr>
                                    <th style="border: 1px solid #ccc; padding: 4px;">الصنف</th>
                                    <th style="border: 1px solid #ccc; padding: 4px; text-align: center;">ك</th>
                                    <th style="border: 1px solid #ccc; padding: 4px; text-align: left;">إجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="border: 1px solid #eee; padding: 4px;">صنف تجريبي 1</td>
                                    <td style="border: 1px solid #eee; padding: 4px; text-align: center;">2</td>
                                    <td style="border: 1px solid #eee; padding: 4px; text-align: left;">100.0</td>
                                </tr>
                            </tbody>
                        </table>

                        <div style="margin-top: 12px; border-top: 1.5px solid #333; padding-top: 8px;">
                            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1rem; background: #f9f9f9; padding: 4px;">
                                <span>صافي المطلوب</span>
                                <span style="border-right: 3px solid #333; padding-right: 8px;">100.00 ج.م</span>
                            </div>
                        </div>

                        <div style="text-align: center; margin-top: 15px; border-top: 1px dashed #ddd; padding-top: 10px;">
                            <div id="prevFooterMsg" style="font-size: 0.75rem; color: #555; white-space: pre-wrap;">رسالة تذييل الفاتورة تظهر هنا...</div>
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=BayanPOS-Invoice" style="margin-top: 10px; width: 50px;">
                        </div>
                    </div>
                `;
            }

            // 4. تحديث البيانات (الاسم والرسائل)
            const shopNameVal = document.getElementById('shopName') ? document.getElementById('shopName').value : '';
            const prevShopName = document.getElementById('prevShopName');
            if (prevShopName) prevShopName.innerText = shopNameVal || 'بَيَان POS لخدمات المنشآت';

            const footerVal = document.getElementById('printFooterMsg') ? document.getElementById('printFooterMsg').value : '';
            const prevFooter = document.getElementById('prevFooterMsg');
            if (prevFooter) prevFooter.innerText = footerVal || 'سيتم طباعة رسالتك هنا في تذييل الفاتورة';

            if (typeof showToast === 'function') showToast(`جاري معاينة: ${currentSelectedTemplateType} ✅`);
        }

        function refreshPinnedVisuals() {
            const saved = getStore('bayan_print_template_choice');
            let pinnedTemplate = '80mm Standard';
            if (saved) {
                const s = JSON.parse(saved);
                pinnedTemplate = s.template || '80mm Standard';
            }
            document.querySelectorAll('.template-item').forEach(item => {
                item.innerHTML = item.innerHTML.replace(' <span class="pinned-icon">📌</span>', '');
                const onclickAttr = item.getAttribute('onclick') || '';
                if (onclickAttr.includes("'" + pinnedTemplate + "'") || onclickAttr.includes('"' + pinnedTemplate + '"')) {
                    item.innerHTML += ' <span class="pinned-icon">📌</span>';
                }
            });
        }

        function savePrintTemplateSettings() {
            const settings = {
                type: currentSelectedTemplateType,
                template: currentSelectedTemplateId
            };
            setStore('bayan_print_template_choice', JSON.stringify(settings));
            refreshPinnedVisuals();
            if (typeof showToast === 'function') showToast("تم تثبيت التصميم المختار بنجاح 📌");
            else alert("تم تثبيت التصميم المختار بنجاح 📌");
        }

        // --- وظائف Sidebar التصميم ---

        function addToUserTemplates() {
            let userTemplates = JSON.parse(getStore('bayan_user_templates') || '[]');
            const exists = userTemplates.find(t => t.type === currentSelectedTemplateType && t.id === currentSelectedTemplateId);

            if (exists) {
                showToast("هذا التصميم موجود بالفعل في 'تصميماتي' ⚠️");
                return;
            }

            userTemplates.push({
                type: currentSelectedTemplateType,
                id: currentSelectedTemplateId,
                addedAt: new Date().toLocaleString('ar-EG')
            });

            setStore('bayan_user_templates', JSON.stringify(userTemplates));
            showToast("تمت الإضافة إلى 'تصميماتي' بنجاح! ➕");
        }

        function deleteSelectedTemplate() {
            let userTemplates = JSON.parse(getStore('bayan_user_templates') || '[]');
            const initialLength = userTemplates.length;

            userTemplates = userTemplates.filter(t => !(t.type === currentSelectedTemplateType && t.id === currentSelectedTemplateId));

            if (userTemplates.length === initialLength) {
                showToast("هذا التصميم ليس من ضمن 'تصميماتي' الخاصة ⚠️");
                return;
            }

            setStore('bayan_user_templates', JSON.stringify(userTemplates));
            showToast("تم حذف التصميم من 'تصميماتي' 🗑️");
        }

        function showTemplatesFolder() {
            const modal = document.getElementById('templatesFolderModal');
            const list = document.getElementById('userTemplatesList');
            const userTemplates = JSON.parse(getStore('bayan_user_templates') || '[]');

            list.innerHTML = '';

            if (userTemplates.length === 0) {
                list.innerHTML = '<div style="grid-column: 1/3; text-align: center; color: #666; padding: 20px;">لا توجد تصميمات مضافة حالياً 📂</div>';
            } else {
                userTemplates.forEach((t, index) => {
                    const card = document.createElement('div');
                    card.style.cssText = 'background: #f8f9fa; border: 1px solid #ddd; padding: 12px; border-radius: 8px; position: relative;';
                    card.innerHTML = `
                        <div style="font-weight: bold; font-size: 0.9rem; color: var(--main-blue);">${t.type}</div>
                        <div style="font-family: monospace; font-size: 0.8rem; margin: 4px 0;">ID: ${t.id}</div>
                        <div style="font-size: 0.7rem; color: #999;">أضيف في: ${t.addedAt}</div>
                        <button onclick="applySavedTemplate('${t.type}', '${t.id}')" style="margin-top: 8px; width: 100%; padding: 5px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">تفعيل هذا التصميم</button>
                    `;
                    list.appendChild(card);
                });
            }

            modal.classList.remove('hidden');
        }

        function applySavedTemplate(type, id) {
            // محاكاة اختيار من القوائم
            currentSelectedTemplateType = type;
            currentSelectedTemplateId = id;
            updatePrintPreview();
            document.getElementById('templatesFolderModal').classList.add('hidden');
            showToast(`تم تفعيل التصميم المختار: ${type}`);
        }

        function toggleTemplateEditor(show) {
            const editor = document.getElementById('quickTemplateEditor');
            if (show) editor.classList.remove('hidden');
            else editor.classList.add('hidden');
        }

        window.showNotificationsModal = function(activeTab = 'products') {
            const today = new Date();
            const allLowStock = productsDB.filter(p => (parseFloat(p.stock) || 0) <= (parseFloat(p.minStock) || 5));
            
            // فحص تواريخ الصلاحية
            const allExpiring = productsDB.filter(p => {
                if (!p.expiry) return false;
                const exp = new Date(p.expiry);
                if (isNaN(exp.getTime())) return false;
                exp.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                return diffDays <= 30;
            });

            const allDebtAccounts = accounts.filter(a => {
                const debit = parseFloat(a.debit) || 0;
                const credit = parseFloat(a.credit) || 0;
                const balance = debit - credit;
                const isRemindActive = (a.remind === true || a.remind === 'true');
                return (a.type === 'client' || a.type === 'mixed') && balance > 0 && isRemindActive;
            });

            // العملاء المتأخرين (رصيد > 0 وآخر عملية من أكثر من 30 يوم)
            const allDelayed = accounts.filter(a => {
                const balance = (parseFloat(a.debit) || 0) - (parseFloat(a.credit) || 0);
                if (!((a.type === 'client' || a.type === 'mixed') && balance > 0)) return false;
                const isRemindActive = (a.remind === true || a.remind === 'true');
                if (!isRemindActive) return false;
                const lastTrans = transactions.filter(t => t.partnerId === a.id || t.account === a.name).sort((x, y) => new Date(y.date || y.timestamp) - new Date(x.date || x.timestamp))[0];
                if (!lastTrans) return true;
                const lastDate = new Date(lastTrans.date || lastTrans.timestamp);
                const diffDays = Math.ceil((today - lastDate) / (1000 * 60 * 60 * 24));
                return diffDays > 30;
            });

            // تقسيم البضاعة والصلاحية والحسابات إلى نشط ومستلم
            const activeLowStock = allLowStock.filter(p => !window.acknowledgedLowStock.includes(p.id));
            const archivedLowStock = allLowStock.filter(p => window.acknowledgedLowStock.includes(p.id));

            const activeExpiring = allExpiring.filter(p => !window.acknowledgedExpiry.includes(p.id));
            const archivedExpiring = allExpiring.filter(p => window.acknowledgedExpiry.includes(p.id));

            const activeDebt = allDebtAccounts.filter(a => !window.acknowledgedDebt.includes(a.id));
            const archivedDebt = allDebtAccounts.filter(a => window.acknowledgedDebt.includes(a.id));

            const activeDelayed = allDelayed.filter(a => !window.acknowledgedDelayed.includes(a.id));
            const archivedDelayed = allDelayed.filter(a => window.acknowledgedDelayed.includes(a.id));

            const activeProductsTotal = activeLowStock.length + activeExpiring.length;
            const activeAccountsTotal = activeDebt.length + activeDelayed.length;
            const totalActiveCount = activeProductsTotal + activeAccountsTotal;
            const totalArchivedCount = archivedLowStock.length + archivedExpiring.length + archivedDebt.length + archivedDelayed.length;

            const createRows = (items, type, isArchived) => items.map(item => {
                const isProd = type === 'low-stock';
                const isExpiry = type === 'expiry';
                const isDelayed = type === 'delayed';
                const name = item.name;
                let value = "";
                let extra = "";

                if (isProd) {
                    value = `<span style="font-size:1.1rem; font-weight:900; color:#ef4444; direction:ltr; display:inline-block;">${item.stock}</span> <span style="font-size:0.75rem; color:#64748b;">(الحد: ${item.minStock || 5})</span>`;
                } else if (isExpiry) {
                    const exp = new Date(item.expiry);
                    exp.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                    if (diffDays <= 0) {
                        value = `<span style="font-size:0.82rem; font-weight:900; color:#dc2626; background:#fee2e2; padding:3px 8px; border-radius:6px; display:inline-block;">❌ منتهي الصلاحية</span>`;
                        extra = `<br><span style="font-size:0.75rem; color:#dc2626; font-weight:bold;">انتهى بتاريخ ${item.expiry} (منذ ${Math.abs(diffDays)} يوم)</span>`;
                    } else {
                        value = `<span style="font-size:0.82rem; font-weight:900; color:#d97706; background:#fef3c7; padding:3px 8px; border-radius:6px; display:inline-block;">⏳ قارب على الانتهاء</span>`;
                        extra = `<br><span style="font-size:0.75rem; color:#d97706; font-weight:bold;">ينتهي خلال ${diffDays} يوم (بتاريخ ${item.expiry})</span>`;
                    }
                } else {
                    const balance = (parseFloat(item.debit) || 0) - (parseFloat(item.credit) || 0);
                    value = `<span style="font-size:1.05rem; font-weight:900; color:#e11d48; direction:ltr; display:inline-block;">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`;
                    if (isDelayed) {
                        const lastTrans = transactions.filter(t => t.partnerId === item.id || t.account === item.name).sort((x, y) => new Date(y.date || y.timestamp) - new Date(x.date || x.timestamp))[0];
                        if (lastTrans) {
                            const lastDate = new Date(lastTrans.date || lastTrans.timestamp);
                            const diffDays = Math.ceil((today - lastDate) / (1000 * 60 * 60 * 24));
                            extra = `<br><span style="font-size:0.75rem; color:#b45309; font-weight:bold;">⏳ متأخر منذ ${diffDays} يوم</span>`;
                        } else {
                            extra = `<br><span style="font-size:0.75rem; color:#dc2626; font-weight:bold;">⏳ متأخر عن السداد (لا توجد دفعات)</span>`;
                        }
                    }
                }

                return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 14px; font-weight: bold; color: #1e293b; text-align: right;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:1.2rem;">${isProd ? '📦' : (isExpiry ? '📅' : (isDelayed ? '⚠️' : '💳'))}</span>
                            <div>
                                <div style="font-weight:900; font-size:0.95rem; color:#0f172a;">${name}</div>
                                ${extra}
                            </div>
                        </div>
                    </td>
                    <td style="padding: 12px 14px; font-weight: 900; text-align: center;">${value}</td>
                    <td style="padding: 12px 14px; text-align: center;">
                        ${!isArchived ? `
                            <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                                ${(!isProd && !isExpiry) ? `<button class="tool-btn" style="background:#3b82f6; color:white; border-radius:8px; border:none; padding: 6px 12px; font-weight:800; font-size:0.8rem; cursor:pointer;" onclick="openStatementFromNotify('${item.id}')" title="عرض كشف حساب العميل">📄 كشف</button>` : ''}
                                <button class="tool-btn" style="background:linear-gradient(135deg, #10b981, #059669); color:white; border-radius:8px; padding: 6px 14px; font-size: 0.8rem; font-weight: 900; border: none; cursor: pointer; display:flex; align-items:center; gap:4px; box-shadow:0 2px 6px rgba(16,185,129,0.3);" 
                                        onclick="acknowledgeNotification('${type}', ${(isProd || isExpiry) ? item.id : `'${item.id}'` }, '${activeTab}')" title="تأكيد الاستلام ونقله لسجل الاستلام">
                                    <span style="font-size:0.9rem;">✔️</span> استلام
                                </button>
                            </div>
                        ` : `
                            <div style="display:flex; gap:8px; justify-content:center; align-items:center;">
                                <span style="color: #10b981; font-weight: 900; font-size: 0.85rem;">✔️ مستلم</span>
                                <button class="tool-btn" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; border-radius:8px; padding:4px 10px; font-size:0.75rem; font-weight:bold; cursor:pointer;" onclick="unacknowledgeNotification('${type}', ${(isProd || isExpiry) ? item.id : `'${item.id}'` })" title="إعادة التنبيه إلى القائمة النشطة">إعادة 🔄</button>
                            </div>
                        `}
                    </td>
                </tr>`;
            }).join('');

            const existingModal = document.getElementById('notifyModal');
            const modalContent = `
                <div class="glass-card-premium" style="background: #ffffff; border: 1px solid #e2e8f0; padding: 0; border-radius: 22px; width: 780px; max-width: 95%; max-height: 88vh; overflow: hidden; box-shadow: 0 30px 70px rgba(15, 23, 42, 0.2); display: flex; flex-direction: column; direction: rtl; font-family: inherit;">

                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; color: white;">
                        <h3 style="margin:0; font-size: 1.25rem; font-weight: 900; display: flex; align-items: center; gap: 10px; color: #f8fafc;">
                            <span style="font-size: 1.4rem;">🔔</span> مركز إدارة التنبيهات ونواقص البضاعة والصلاحيات
                        </h3>
                        <button onclick="document.getElementById('notifyModal').remove()" style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">&times;</button>
                    </div>

                    <!-- Custom Tabs (4 تبويبات مخصصة) -->
                    <div style="display: flex; background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; overflow-x: auto;">
                        <div onclick="showNotificationsModal('products')" style="flex: 1; min-width: 130px; padding: 14px 8px; text-align: center; cursor: pointer; font-weight: 900; font-size: 0.92rem; transition: 0.25s; border-bottom: 3px solid ${activeTab === 'products' ? '#10b981' : 'transparent'}; color: ${activeTab === 'products' ? '#047857' : '#64748b'}; background: ${activeTab === 'products' ? 'rgba(16, 185, 129, 0.08)' : 'transparent'};">
                            📦 البضاعة والصلاحية <span style="background:${activeProductsTotal > 0 ? '#ef4444' : '#e2e8f0'}; color:${activeProductsTotal > 0 ? '#fff' : '#64748b'}; font-size:0.75rem; padding:2px 7px; border-radius:12px; margin-right:4px;">${activeProductsTotal}</span>
                        </div>
                        <div onclick="showNotificationsModal('accounts')" style="flex: 1; min-width: 130px; padding: 14px 8px; text-align: center; cursor: pointer; font-weight: 900; font-size: 0.92rem; transition: 0.25s; border-bottom: 3px solid ${activeTab === 'accounts' ? '#3b82f6' : 'transparent'}; color: ${activeTab === 'accounts' ? '#1d4ed8' : '#64748b'}; background: ${activeTab === 'accounts' ? 'rgba(59, 130, 246, 0.08)' : 'transparent'};">
                            💳 تنبيهات الحسابات <span style="background:${activeAccountsTotal > 0 ? '#ef4444' : '#e2e8f0'}; color:${activeAccountsTotal > 0 ? '#fff' : '#64748b'}; font-size:0.75rem; padding:2px 7px; border-radius:12px; margin-right:4px;">${activeAccountsTotal}</span>
                        </div>
                        <div onclick="showNotificationsModal('archived')" style="flex: 1; min-width: 130px; padding: 14px 8px; text-align: center; cursor: pointer; font-weight: 900; font-size: 0.92rem; transition: 0.25s; border-bottom: 3px solid ${activeTab === 'archived' ? '#f59e0b' : 'transparent'}; color: ${activeTab === 'archived' ? '#b45309' : '#64748b'}; background: ${activeTab === 'archived' ? 'rgba(245, 158, 11, 0.08)' : 'transparent'};">
                            📁 سجل الاستلام <span style="background:#e2e8f0; color:#475569; font-size:0.75rem; padding:2px 7px; border-radius:12px; margin-right:4px;">${totalArchivedCount}</span>
                        </div>
                        <div onclick="showNotificationsModal('cloud')" style="flex: 1; min-width: 140px; padding: 14px 8px; text-align: center; cursor: pointer; font-weight: 900; font-size: 0.92rem; transition: 0.25s; border-bottom: 3px solid ${activeTab === 'cloud' ? '#8b5cf6' : 'transparent'}; color: ${activeTab === 'cloud' ? '#6d28d9' : '#64748b'}; background: ${activeTab === 'cloud' ? 'rgba(139, 92, 246, 0.08)' : 'transparent'};">
                            ☁️ الإشعارات السحابية ${window.latestCloudAnnouncement && window.latestCloudAnnouncement.active ? '<span style="background:#ef4444; width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:3px;"></span>' : ''}
                        </div>
                    </div>

                    <!-- Content Area -->
                    <div style="padding: 20px 24px; flex: 1; overflow-y: auto; background: #fff; min-height: 280px;">
                        ${activeTab === 'products' ? `
                            ${(activeProductsTotal === 0) ? `
                                <div style="text-align: center; padding: 45px 20px; color: #64748b;">
                                    <div style="font-size: 3.2rem; margin-bottom: 12px;">🎉</div>
                                    <div style="font-weight: 900; font-size: 1.15rem; color: #0f172a;">مخزون البضاعة والصلاحيات مكتمل ومستقر!</div>
                                    <div style="font-size: 0.88rem; margin-top: 5px; color: #64748b;">لا توجد أصناف وصلت للحد الأدنى للنواقص أو أوشكت صلاحيتها على الانتهاء.</div>
                                </div>
                            ` : `
                                <div style="margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:0.85rem; font-weight:800; color:#475569;">الأصناف التي قاربت على النفاد أو قريبة الانتهاء:</span>
                                    <button onclick="acknowledgeAllProductsNotifications()" style="padding: 6px 14px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 900; font-size: 0.8rem; cursor: pointer;">✔️ استلام جميع تنبيهات البضاعة</button>
                                </div>
                                <table class="report-table" style="width:100%; border-collapse:collapse; color: #1e293b;">
                                    <thead>
                                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                            <th style="text-align:right; padding:10px 12px; color: #475569; font-weight: 900;">اسم الصنف</th>
                                            <th style="padding:10px 12px; color: #475569; font-weight: 900; text-align:center;">الحالة / الرصيد</th>
                                            <th style="padding:10px 12px; color: #475569; font-weight: 900; text-align:center;">تأكيد الاستلام</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${createRows(activeLowStock, 'low-stock', false)}
                                        ${createRows(activeExpiring, 'expiry', false)}
                                    </tbody>
                                </table>
                            `}
                        ` : activeTab === 'accounts' ? `
                            ${(activeAccountsTotal === 0) ? `
                                <div style="text-align: center; padding: 45px 20px; color: #64748b;">
                                    <div style="font-size: 3.2rem; margin-bottom: 12px;">✅</div>
                                    <div style="font-weight: 900; font-size: 1.15rem; color: #0f172a;">حسابات العملاء منتظمة!</div>
                                    <div style="font-size: 0.88rem; margin-top: 5px; color: #64748b;">لا توجد تنبيهات ديون نشطة أو حسابات متأخرة مسجلة للتذكير.</div>
                                </div>
                            ` : `
                                <div style="margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:0.85rem; font-weight:800; color:#475569;">العملاء الذين عليهم مديونيات أو متأخرين عن السداد:</span>
                                    <button onclick="acknowledgeAllAccountsNotifications()" style="padding: 6px 14px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 900; font-size: 0.8rem; cursor: pointer;">✔️ استلام جميع تنبيهات الحسابات</button>
                                </div>
                                <table class="report-table" style="width:100%; border-collapse:collapse; color: #1e293b;">
                                    <thead>
                                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                            <th style="text-align:right; padding:10px 12px; color: #475569; font-weight: 900;">اسم الحساب / العميل</th>
                                            <th style="padding:10px 12px; color: #475569; font-weight: 900; text-align:center;">المبلغ المستحق</th>
                                            <th style="padding:10px 12px; color: #475569; font-weight: 900; text-align:center;">الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${createRows(activeDebt, 'debt', false)}
                                        ${createRows(activeDelayed, 'delayed', false)}
                                    </tbody>
                                </table>
                            `}
                        ` : activeTab === 'archived' ? `
                            ${(totalArchivedCount === 0) ? `
                                <div style="text-align: center; padding: 45px 20px; color: #64748b;">
                                    <div style="font-size: 3.2rem; margin-bottom: 12px;">📁</div>
                                    <div style="font-weight: 900; font-size: 1.1rem; color: #0f172a;">سجل الاستلام فارغ</div>
                                    <div style="font-size: 0.85rem; margin-top: 5px; color: #64748b;">لم يتم وضع علامة استلام على أي تنبيه حتى الآن.</div>
                                </div>
                            ` : `
                                <table class="report-table" style="width:100%; border-collapse:collapse; color: #334155;">
                                    <thead>
                                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                            <th style="text-align:right; padding:10px 12px; color: #475569; font-weight: 900;">البيان المستلم</th>
                                            <th style="padding:10px 12px; color: #475569; font-weight: 900; text-align:center;">القيمة</th>
                                            <th style="padding:10px 12px; color: #475569; font-weight: 900; text-align:center;">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${createRows(archivedLowStock, 'low-stock', true)}
                                        ${createRows(archivedExpiring, 'expiry', true)}
                                        ${createRows(archivedDebt, 'debt', true)}
                                        ${createRows(archivedDelayed, 'delayed', true)}
                                    </tbody>
                                </table>
                            `}
                        ` : `
                            <!-- محتوى تبويب الإشعارات السحابية (عرض كافة الإشعارات والرسائل السحابية التاريخية) -->
                            <div style="padding: 10px 0; display:flex; flex-direction:column; gap:16px;">
                                ${(window.cloudAnnouncementsHistory && window.cloudAnnouncementsHistory.length > 0) ? `
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:8px;">
                                        <span style="font-size:0.85rem; font-weight:800; color:#475569;">سجل الرسائل والتحديثات السحابية الواردة (${window.cloudAnnouncementsHistory.length}):</span>
                                        <button onclick="if (typeof window.checkCloudAnnouncements === 'function') { window.checkCloudAnnouncements(); setTimeout(() => showNotificationsModal('cloud'), 800); }" style="padding: 6px 14px; background: #8b5cf6; color: white; border: none; border-radius: 8px; font-weight: 800; font-size: 0.8rem; cursor: pointer; box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);">🔄 تحديث وفحص الرسائل الآن</button>
                                    </div>
                                    ${window.cloudAnnouncementsHistory.map((item, idx) => {
                                        const annNumber = item.id ? item.id : (idx + 1);
                                        const dateFormatted = item.receivedAt ? new Date(item.receivedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
                                        return `
                                        <div style="background: linear-gradient(135deg, #1e113a, #0f172a); border: 2px solid ${item.active ? 'rgba(212, 175, 55, 0.7)' : 'rgba(255, 255, 255, 0.15)'}; border-radius: 20px; padding: 22px 25px; color: white; box-shadow: 0 10px 25px rgba(0,0,0,0.25); position:relative;">
                                            <div style="position:absolute; top:18px; left:20px; display:flex; gap:8px; align-items:center;">
                                                <span style="background: rgba(255,255,255,0.15); color: #fde047; font-size: 0.75rem; font-weight: 900; padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(253, 224, 71, 0.4);">
                                                    #${annNumber}
                                                </span>
                                                ${item.active ? '<span style="background:#10b981; color:#fff; font-size:0.75rem; font-weight:900; padding:3px 10px; border-radius:20px; box-shadow: 0 2px 6px rgba(16,185,129,0.3);">نشط حالياً ⚡</span>' : '<span style="background:rgba(255,255,255,0.12); color:#cbd5e1; font-size:0.72rem; font-weight:700; padding:3px 10px; border-radius:20px;">أرشيف سابق 📁</span>'}
                                            </div>
                                            
                                            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
                                                <div style="width: 46px; height: 46px; background: linear-gradient(135deg, #d4af37, #b45309); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.35);">
                                                    ${item.icon || '📢'}
                                                </div>
                                                <div>
                                                    <h4 style="margin: 0; font-size: 1.18rem; font-weight: 900; color: #fde047;">${item.title || 'إشعار سحابي'}</h4>
                                                    <p style="margin: 3px 0 0; font-size: 0.78rem; color: #94a3b8; font-weight: bold;">
                                                        رسالة مباشرة من فريق التطوير ${dateFormatted ? `• 📅 ${dateFormatted}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div style="background: rgba(255,255,255,0.06); border-radius: 14px; padding: 16px 18px; font-size: 0.95rem; line-height: 1.8; font-weight: 700; color: #f8fafc; margin-bottom: 14px; border: 1px solid rgba(255,255,255,0.08); white-space: pre-line;">
                                                ${item.message || 'لا توجد تفاصيل.'}
                                            </div>

                                            ${item.link ? `
                                                <div style="text-align:left;">
                                                    <button onclick="window.open('${item.link}', '_blank')" style="padding: 8px 18px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 10px; font-weight: 900; font-size:0.85rem; cursor: pointer; box-shadow: 0 3px 8px rgba(16,185,129,0.3);">
                                                        ${item.linkText || 'معرفة التفاصيل 🔗'}
                                                    </button>
                                                </div>
                                            ` : ''}
                                        </div>`;
                                    }).join('')}
                                ` : `
                                    <div style="text-align: center; padding: 45px 20px; color: #64748b;">
                                        <div style="font-size: 3.2rem; margin-bottom: 12px;">☁️</div>
                                        <div style="font-weight: 900; font-size: 1.15rem; color: #0f172a;">لا توجد رسائل سحابية حالياً</div>
                                        <div style="font-size: 0.88rem; margin-top: 6px; color: #64748b;">جميع التحديثات والتهاني المباشرة من فريق التطوير ستظهر لك وتتراكم هنا فور نشرها.</div>
                                        <button onclick="if (typeof window.checkCloudAnnouncements === 'function') { window.checkCloudAnnouncements(); setTimeout(() => showNotificationsModal('cloud'), 1000); }" style="margin-top: 15px; padding: 8px 18px; background: #8b5cf6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">🔄 فحص الرسائل السحابية الآن</button>
                                    </div>
                                `}
                            </div>
                        `}
                    </div>

                    <!-- Footer -->
                    <div style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            ${(activeTab === 'products' && activeProductsTotal > 0) ? `
                                <button onclick="acknowledgeAllProductsNotifications()" style="padding: 9px 18px; background: #10b981; color: white; border: none; border-radius: 9px; font-weight: 900; cursor: pointer; font-size:0.85rem;">
                                    <span>✔️</span> استلام جميع تنبيهات البضاعة والصلاحيات
                                </button>
                            ` : (activeTab === 'accounts' && activeAccountsTotal > 0) ? `
                                <button onclick="acknowledgeAllAccountsNotifications()" style="padding: 9px 18px; background: #3b82f6; color: white; border: none; border-radius: 9px; font-weight: 900; cursor: pointer; font-size:0.85rem;">
                                    <span>✔️</span> استلام جميع تنبيهات الحسابات
                                </button>
                            ` : (activeTab === 'archived' && totalArchivedCount > 0) ? `
                                <button onclick="resetAcknowledgedNotifications()" style="padding: 9px 18px; background: #ef4444; color: white; border: none; border-radius: 9px; font-weight: 900; cursor: pointer; font-size:0.85rem;">
                                    <span>🔄</span> استعادة جميع التنبيهات للنشط
                                </button>
                            ` : ''}
                        </div>
                        <button onclick="document.getElementById('notifyModal').remove()" style="padding: 9px 28px; background: #0f172a; color: white; border: none; border-radius: 9px; font-weight: 900; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#0f172a'">إغلاق</button>
                    </div>
                </div>
            `;

             if (existingModal) {
                existingModal.innerHTML = modalContent;
            } else {
                const fullModal = `<div id="notifyModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); backdrop-filter: blur(10px); display:flex; align-items:center; justify-content:center; z-index:99999; animation: fadeIn 0.2s ease;">${modalContent}</div>`;
                document.body.insertAdjacentHTML('beforeend', fullModal);
            }
        };

        window.openStatementFromNotify = function(accountId) {
            const notifyModal = document.getElementById('notifyModal');
            if (notifyModal) notifyModal.remove();

            if (typeof switchSection === 'function') {
                switchSection('accounts');
            }

            window.selectedAccountID = accountId;
            if (typeof renderAccountsTable === 'function') {
                renderAccountsTable();
            }
            if (typeof generateAccountStatement === 'function') {
                generateAccountStatement(accountId);
            }
        };

        function adjustInvoiceFont(part, val) {
            const preview = document.getElementById('invoiceLivePreview');
            if (!preview) return;

            if (part === 'header') {
                const header = preview.querySelector('div[style*="font-weight: 900"]');
                if (header) header.style.fontSize = (val/10) + 'rem';
            } else if (part === 'table') {
                const table = preview.querySelector('table');
                if (table) table.style.fontSize = (val/16) + 'rem';
            }
        }

        function loadPrintTemplateChoice() {
            const saved = getStore('bayan_print_template_choice');
            if (saved) {
                const s = JSON.parse(saved);
                currentSelectedTemplateType = s.type || 'فاتورة المبيعات';
                currentSelectedTemplateId = s.template || '0010 - 80mm';
            }
            // تمييز العناصر المختارة في القوائم
            document.querySelectorAll('.template-type-item').forEach(item => {
                if (item.innerText === currentSelectedTemplateType) {
                    item.classList.add('active');
                    item.style.background = '#3498db';
                    item.style.color = 'white';
                } else {
                    item.classList.remove('active');
                    item.style.background = 'transparent';
                    item.style.color = 'inherit';
                }
            });
            document.querySelectorAll('.template-item').forEach(item => {
                const onclickAttr = item.getAttribute('onclick') || '';
                if (onclickAttr.includes("'" + currentSelectedTemplateId + "'")) {
                    item.classList.add('active');
                    item.style.background = '#3498db';
                    item.style.color = 'white';
                } else {
                    item.classList.remove('active');
                    item.style.background = 'transparent';
                    item.style.color = 'inherit';
                }
            });
            refreshPinnedVisuals();
            updatePrintPreview();
        }
        // تكرار الحماية السحابية (تم النقل للأعلى للتوحيد)
        function showLockScreen(message) {
            let lockOverlay = document.getElementById('bayanLockScreen');
            if (!lockOverlay) {
                lockOverlay = document.createElement('div');
                lockOverlay.id = 'bayanLockScreen';
                lockOverlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.9); backdrop-filter: blur(10px);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    z-index: 1000000; color: white; text-align: center; font-family: 'Cairo', sans-serif;
                `;
                document.body.appendChild(lockOverlay);
            }

            lockOverlay.innerHTML = `
                <div style="background: white; color: #333; padding: 40px; border-radius: 20px; box-shadow: 0 0 50px rgba(0,0,0,0.5); border-top: 5px solid #c0392b;">
                    <div style="font-size: 5rem; margin-bottom: 20px;">🛡️</div>
                    <h2 style="margin-bottom: 20px; font-weight: 900;">بَيَان - حماية النظام</h2>
                    <p style="font-size: 1.2rem; margin-bottom: 30px; line-height: 1.6;">${message}</p>
                    <button onclick="location.reload()" style="background: #27ae60; color: white; border: none; padding: 12px 30px; border-radius: 10px; font-size: 1.1rem; font-weight: bold; cursor: pointer;">🔄 تحديث الحالة</button>
                    <div style="margin-top: 20px; font-size: 0.8rem; color: #888;">Hardware ID: <span id="lock-hwid">---</span></div>
                </div>
            `;
            getUniqueHWID().then(id => {
                const idEl = document.getElementById('lock-hwid');
                if (idEl) idEl.innerText = id;
            });
        }

        function checkLocalAccess() {
            const isSubscribed = window.activeLicense && window.activeLicense.isValid && window.activeLicense.plan !== 'باقة نسخة المجانية';
            const trialBanner = document.getElementById('trialBanner');
            const subModal = document.getElementById('subscriptionModal');
            const closeBtn = document.getElementById('closeSubBtn');

            if (isSubscribed) {
                if (trialBanner) trialBanner.classList.add('hidden');
                if (subModal) subModal.classList.add('hidden');
                return true;
            }

            const installDateStr = getStore('bayan_install_date');
            if (!installDateStr) {
                setStore('bayan_install_date', new Date().toISOString());
                return true;
            }

            const diffDays = Math.floor((new Date() - new Date(installDateStr)) / (1000 * 60 * 60 * 24));
            const timeExpired = diffDays >= 30;

            if (timeExpired) {
                showLockScreen("انتهت الفترة التجريبية.. تواصل مع عمرو إيهاب 01099195060");
                return false;
            } else {
                if (trialBanner) {
                    trialBanner.classList.remove('hidden');
                    const label = document.getElementById('trialDaysLeft');
                    if (label) {
                        label.innerHTML = `⏳ باقي لك <strong style="color:var(--accent-gold);">${Math.max(0, 30 - diffDays)}</strong> يوم في الفترة التجريبية المجانية.`;
                    }
                }
                return true;
            }
        }


        // تم حذف الدوال المكررة لضمان عمل النسخة الذهبية الجديدة

        // --- دالة جلب التاريخ والوقت للعملية ---
        function showProfessionalModal(content, maxWidth = '950px') {
            let modal = document.getElementById('detailsOverlay');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'detailsOverlay';
                modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:12000; display:flex; align-items:center; justify-content:center;";
                document.body.appendChild(modal);
            }
            modal.innerHTML = `
                <div class="modal-draggable-content" style="background:white; width:95%; max-width:${maxWidth}; border-radius:15px; overflow:hidden; box-shadow:0 15px 50px rgba(0,0,0,0.3); animation: slideUp 0.3s ease-out; position: relative;">
                    ${content}
                </div>
            `;
            modal.classList.remove('hidden');

            // تفعيل السحب للنافذة الجديدة
            const contentDiv = modal.querySelector('.modal-draggable-content');
            if (contentDiv) makeElementDraggable(contentDiv);
        }

        function makeElementDraggable(el) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            // البحث عن الهيدر (أول ديف داخلي غالباً يكون هو الهيدر الملون)
            const header = el.querySelector('div[style*="background"]');
            if (header) {
                header.style.cursor = 'move';
                header.onmousedown = dragMouseDown;
            } else {
                el.onmousedown = dragMouseDown;
            }

            function dragMouseDown(e) {
                e = e || window.event;
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

                e.preventDefault();
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;

                const parent = el.parentElement;
                if (parent && parent.style.display === 'flex') {
                    parent.style.display = 'block';
                    el.style.position = 'absolute';
                    const rect = el.getBoundingClientRect();
                    el.style.top = rect.top + 'px';
                    el.style.left = rect.left + 'px';
                    el.style.transform = 'none';
                    el.style.margin = '0';
                }
            }

            function elementDrag(e) {
                e = e || window.event;
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                el.style.top = (el.offsetTop - pos2) + "px";
                el.style.left = (el.offsetLeft - pos1) + "px";
            }

            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
            }
        }
        window.makeElementDraggable = makeElementDraggable;

        function closeCustomModal() {
            const modal = document.getElementById('detailsOverlay');
            if (modal) modal.classList.add('hidden');
        }

        async function printBillFromData(invoiceId, type = '') {
            if (typeof viewInvoiceItems === 'function') {
                viewInvoiceItems(invoiceId, type, true);
            } else if (typeof printInvoice === 'function') {
                const items = transactions.filter(t => t.invoiceId == invoiceId);
                if (items.length === 0) return alert("لا تتوفر بيانات لهذه الفاتورة.");
                const head = items[0];
                let partnerName = head.partner || head.customer || '';
                let prevBal = 0;
                if (partnerName && !window.isGenericCashPartner(partnerName)) {
                    if (typeof getHistoricalPartnerBalance === 'function') {
                        prevBal = getHistoricalPartnerBalance(partnerName, head.invoiceId || head.id);
                    } else if (typeof getAccountBalance === 'function') {
                        prevBal = getAccountBalance(partnerName, head.invoiceId || head.id);
                    }
                }
                const totalAmt = parseFloat(head.total || 0);
                const paidAmt = parseFloat(head.paidAmount || head.paid || 0);
                const deferredAmt = parseFloat(head.deferred !== undefined ? head.deferred : (totalAmt - paidAmt));
                printInvoice({
                    invoiceNumber: head.invoiceId || head.id,
                    invoiceType: head.type || 'بيع',
                    date: head.dateISO || head.date || '',
                    time: head.timeISO || '',
                    cashier: head.user || head.cashier || '',
                    customer: partnerName || 'عميل نقدي',
                    items: items.map(it => ({
                        name: it.product || it.name,
                        qty: parseFloat(it.qty || 1),
                        price: parseFloat(it.price || 0),
                        unit: it.unit || 'قطعة'
                    })),
                    totalAmount: totalAmt,
                    paid: paidAmt,
                    deferred: deferredAmt,
                    prevBalance: prevBal,
                    currentBalance: prevBal + deferredAmt,
                    docType: (head.type && head.type.includes('شراء')) ? 'purchase' : 'sales'
                });
            }
            if (typeof closeCustomModal === 'function') closeCustomModal();
        }


        // دالة كشف الحساب السريع من شاشة البيع بدون مغادرة الصفحة
        async function openQuickCustomerInfo() {
            const customerNameInput = document.getElementById('customerName');
            const name = customerNameInput ? customerNameInput.value.trim() : '';

            if (!name || name === '---' || name === 'عميل نقدي') {
                return showCustomAlert({
                    type: 'warning',
                    titleText: '⚠️ تنبيه',
                    msg: 'يرجى اختيار عميل أولاً لعرض كشف الحساب السريع.'
                });
            }

            const acc = accounts.find(a => a.name === name);
            if (!acc) return alert("العميل غير موجود في سجل الحسابات.");

            const bal = getAccountBalance(name);
            const lastTrans = transactions.filter(t => t.partner === name).reverse().slice(0, 5);

            let transRows = lastTrans.map(t => `
                <tr style="font-size: 0.85rem;">
                    <td>${t.date}</td>
                    <td>${t.type}</td>
                    <td style="font-weight:bold;">${(parseFloat(t.total) || parseFloat(t.price) || 0).toFixed(2)}</td>
                    <td style="color: ${t.paidAmount > 0 ? 'green' : 'red'};">${(parseFloat(t.paidAmount) || 0).toFixed(2)}</td>
                </tr>
            `).join('');

            if (transRows === '') transRows = '<tr><td colspan="4" style="text-align:center; padding:10px;">لا توجد حركات سابقة</td></tr>';

            // معالجة العناوين والهواتف المتعددة (إذا وجد فاصل | أو ,)
            const addresses = acc.address ? acc.address.split(/[|,]/).map(s => s.trim()).filter(s => s) : [];
            const mobiles = acc.mobile ? acc.mobile.split(/[|,]/).map(s => s.trim()).filter(s => s) : [];

            let multiInfo = '';
            if (addresses.length > 1 || mobiles.length > 1) {
                multiInfo = `
                <div style="background:#fff3e0; padding:10px; border-radius:8px; margin-bottom:15px; border:1px solid #ffe0b2;">
                    <label style="font-size:0.8rem; font-weight:bold; color:#e67e22;">📍 اختر العنوان/الهاتف للطباعة:</label>
                    <select id="selectedAddress" onchange="currentSessionSelectedAddress = this.value" style="width:100%; margin-top:5px; padding:5px; border:1px solid #ddd; border-radius:4px;">
                        <option value="">-- اختر عنواناً للطباعة --</option>
                        ${addresses.map(addr => `<option value="${addr}" ${currentSessionSelectedAddress === addr ? 'selected' : ''}>${addr}</option>`).join('')}
                        ${mobiles.map(m => `<option value="${m}" ${currentSessionSelectedAddress === m ? 'selected' : ''}>هاتف: ${m}</option>`).join('')}
                    </select>
                </div>`;
            }

            const content = `
                <div style="direction:rtl; text-align:right; padding:15px; font-family:sans-serif;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid var(--main-blue); padding-bottom:10px; margin-bottom:15px;">
                        <h2 style="margin:0; color:var(--main-blue);">👤 ملف العميل السريع</h2>
                        <span style="background:var(--box-red); color:white; padding:4px 12px; border-radius:15px; font-weight:bold; font-size:1.1rem;">${bal.toFixed(2)} ج.م</span>
                    </div>

                    ${multiInfo}

                    <p style="margin-bottom:10px; font-weight:bold; color:#555;">📋 آخر 5 حركات مسجلة:</p>
                    <table style="width:100%; border-collapse:collapse; margin-bottom:20px; text-align:center;">
                        <thead style="background:#eee;">
                            <tr><th style="padding:6px; border:1px solid #ddd;">التاريخ</th><th style="padding:6px; border:1px solid #ddd;">العملية</th><th style="padding:6px; border:1px solid #ddd;">المبلغ</th><th style="padding:6px; border:1px solid #ddd;">مدفوع</th></tr>
                        </thead>
                        <tbody>${transRows}</tbody>
                    </table>

                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button onclick="closeCustomModal()" style="padding:8px 30px; background:#636e72; color:white; border:none; border-radius:8px; cursor:pointer;">إغلاق</button>
                        <button onclick="switchSection('accounts'); document.getElementById('accountsSearch').value='${name}'; renderAccountsTable(); closeCustomModal();" 
                            style="padding:8px 30px; background:var(--main-blue); color:white; border:none; border-radius:8px; cursor:pointer;">📂 ملف العميل الكامل</button>
                    </div>
                </div>
            `;

            showProfessionalModal(content);
        }

        window.renderCustomInvoiceModal = function(tx, autoPrint = false) {
            let typeName = 'فاتورة مبيعات';
            let typeColor = '#27ae60';
            let isTransfer = false, isReturn = false, isPurchase = false, isAdjustment = false;
            let isReceipt = false, isDisburse = false;
            
            let tType = String(tx.type || '').toLowerCase();
            if (tType === 'sale_return' || tType.includes('مرتجع بيع') || tType.includes('مرتجع مبيعات')) {
                typeName = 'مرتجع مبيعات'; typeColor = '#e67e22'; isReturn = true;
            } else if (tType === 'purchase_return' || tType.includes('مرتجع شراء') || tType.includes('مرتجع مشتريات')) {
                typeName = 'مرتجع مشتريات'; typeColor = '#d35400'; isReturn = true; isPurchase = true;
            } else if (tType === 'sale' || tType === 'بيع' || (tType.includes('بيع') && !tType.includes('مرتجع'))) {
                typeName = 'فاتورة مبيعات'; typeColor = '#27ae60';
            } else if (tType === 'purchase' || tType === 'شراء' || (tType.includes('شراء') && !tType.includes('مرتجع')) || (tType.includes('مشتريات') && !tType.includes('مرتجع'))) {
                typeName = 'فاتورة مشتريات'; typeColor = '#2980b9'; isPurchase = true;
            } else if (tType.includes('transfer') || tType.includes('تحويل') || tType === 'stock') {
                typeName = 'إذن تحويل مخزني'; typeColor = '#16a085'; isTransfer = true;
            } else if (tType.includes('adjustment') || tType.includes('تسوية') || tType.includes('جرد')) {
                typeName = 'محضر تسوية مخزنية'; typeColor = '#d97706'; isAdjustment = true;
            } else if (tType === 'receipt' || tType.includes('قبض')) {
                typeName = 'سند استلام نقدية (قبض)'; typeColor = '#8e44ad'; isReceipt = true;
            } else if (tType === 'payment' || tType === 'disburse' || tType.includes('صرف') || tType.includes('دفع')) {
                typeName = 'سند صرف نقدية'; typeColor = '#c0392b'; isDisburse = true;
            }
            
            let isFinancial = isReceipt || isDisburse;
            let items = tx.items || tx.products || tx.cart || tx.details || [];

            // تصفية أسطر الهيدر المالي الوهمية الخالية من أسماء الأصناف
            if (Array.isArray(items) && items.length > 1) {
                items = items.filter(i => {
                    const n = (i.name || i.product || i.productName || '').trim();
                    const q = parseFloat(i.qty || i.quantity || 0);
                    if ((!n || n === 'صنف غير محدد') && q === 0) return false;
                    return true;
                });
            }

            const hasVariants = !isFinancial && (
                items.some(i => (i.size || i.selectedSize || i.color || i.selectedColor)) ||
                (typeof document !== 'undefined' && document.body.classList.contains('bayan-variants-enabled'))
            );

            let itemsHtml = '';
            let grandTotal = 0;
            
            items.forEach(item => {
                let name = item.name || '';
                let qty = parseFloat(item.qty || item.quantity || 0);
                let unit = item.selectedUnit ? (typeof item.selectedUnit === 'object' ? item.selectedUnit.unitName : item.selectedUnit) : (item.unit || '');
                let price = parseFloat(item.price || item.costPrice || item.purchasePrice || 0);
                let total = parseFloat(item.total != null ? item.total : (price * qty));
                grandTotal += total;
                
                let itemSize = item.size || item.selectedSize || '';
                let itemColor = item.color || item.selectedColor || '';
                let sizeBadge = itemSize ? `<span style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; padding:2px 8px; border-radius:6px; font-weight:900; font-size:0.82rem;">${itemSize}</span>` : `<span style="color:#cbd5e1;">-</span>`;
                let colorBadge = itemColor ? `<span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:2px 8px; border-radius:6px; font-weight:900; font-size:0.82rem;">${itemColor}</span>` : `<span style="color:#cbd5e1;">-</span>`;

                let method = tx.method || tx.paymentMethod || 'نقدي';
                let cashier = tx.user || tx.cashier || '-';
                
                itemsHtml += `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:12px; text-align:right; font-weight:bold; color:#334155;">${name}</td>
                        ${!isFinancial ? `
                            ${hasVariants ? `
                                <td style="padding:12px; text-align:center;">${sizeBadge}</td>
                                <td style="padding:12px; text-align:center;">${colorBadge}</td>
                            ` : ''}
                            <td style="padding:12px; text-align:center; color:#475569; font-weight:bold;">${qty} ${unit}</td>
                            <td style="padding:12px; text-align:center; color:#475569;">${price.toFixed(2)} ج.م</td>
                        ` : `
                            <td style="padding:12px; text-align:center; color:#475569;">${method}</td>
                            <td style="padding:12px; text-align:center; color:#475569;">${cashier}</td>
                        `}
                        <td style="padding:12px; text-align:center; font-weight:bold; color:#1e293b;">${total.toFixed(2)} ج.م</td>
                    </tr>
                `;
            });
            
            let existing = document.getElementById('customViewModalOverlay');
            if (existing) existing.remove();
            
            let modal = document.createElement('div');
            modal.id = 'customViewModalOverlay';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px);
                z-index: 11000; display: flex; align-items: center; justify-content: center;
                direction: rtl; font-family: 'Cairo', sans-serif;
            `;
            
            let methodVal = String(tx.method || tx.paymentMethod || '').trim();
            let paidVal = parseFloat(tx.paidAmount != null ? tx.paidAmount : (tx.paid != null ? tx.paid : 0));
            if (isNaN(paidVal)) paidVal = 0;
            
            // التحقق من الآجل سواء من اسم طريقة الدفع أو من وجود دين ومتبقي حقيقي
            let isDeferred = methodVal.includes('آجل') || methodVal.includes('أجل') || methodVal.includes('ذمم') || methodVal.includes('deferred') || methodVal.includes('credit');
            let remainingVal = 0;

            if (isDeferred) {
                remainingVal = parseFloat(tx.deferred != null ? tx.deferred : (tx.remaining != null ? tx.remaining : (grandTotal - paidVal)));
                if (isNaN(remainingVal) || remainingVal < 0) remainingVal = Math.max(0, grandTotal - paidVal);
            } else {
                let recordedRemaining = parseFloat(tx.deferred != null ? tx.deferred : (tx.remaining != null ? tx.remaining : 0));
                if (recordedRemaining > 0.001) {
                    isDeferred = true;
                    remainingVal = recordedRemaining;
                } else if (paidVal > 0 && grandTotal > paidVal && (grandTotal - paidVal) > 0.001) {
                    isDeferred = true;
                    remainingVal = grandTotal - paidVal;
                } else {
                    remainingVal = 0;
                    paidVal = grandTotal; // نقدي خالص
                }
            }

            let displayMethod = '';
            if (isDeferred) {
                if (paidVal > 0.001 && remainingVal > 0.001) {
                    displayMethod = '⏳ آجل (سداد جزئي)';
                } else {
                    displayMethod = '⏳ آجل (ذمم)';
                }
            } else if (methodVal.includes('تحويل') || methodVal.includes('بنك') || methodVal.includes('شبكة') || methodVal.includes('فيزا') || methodVal.includes('شيك')) {
                displayMethod = methodVal.includes('شيك') ? '🏦 شيك بنكي' : '🏦 بنك / تحويل';
            } else {
                displayMethod = '💵 نقدي (كاش)';
            }
            
            let modalContent = `
                <div style="background: white; width: ${hasVariants ? '760px' : '680px'}; max-width: 95%; max-height: 90vh; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(255,255,255,0.4);">
                    <div style="background: linear-gradient(135deg, ${typeColor}, #2c3e50); padding: 20px 25px; color: white; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3 style="margin: 0; font-size: 1.3rem; font-weight: 900;">${typeName} #${tx.invoiceId || tx.invoiceNumber || tx.id}</h3>
                            <p style="margin: 5px 0 0; font-size: 0.85rem; opacity: 0.85;">📅 التاريخ والوقت: ${tx.date || tx.timestamp || '-'}</p>
                        </div>
                        <button onclick="document.getElementById('customViewModalOverlay').remove()" style="background: rgba(0,0,0,0.2); border: none; color: white; font-size: 1.5rem; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight:bold;">&times;</button>
                    </div>
                    
                    <div style="padding: 25px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 16px; border: 1px solid #e2e8f0; font-size:0.9rem;">
                            ${isTransfer ? `
                                <div><b style="color: #64748b; font-size: 0.85rem;">📦 مخزن المصدر:</b> <span style="font-weight: 800; color: #1e293b;">${tx.sourceWarehouse || tx.fromWarehouse || tx.from || '-'}</span></div>
                                <div><b style="color: #64748b; font-size: 0.85rem;">🏁 مخزن الوجهة:</b> <span style="font-weight: 800; color: #1e293b;">${tx.warehouse || tx.toWarehouse || tx.to || '-'}</span></div>
                            ` : isAdjustment ? `
                                <div><b style="color: #64748b; font-size: 0.85rem;">⚖️ نوع العملية:</b> <span style="font-weight: 800; color: #1e293b;">تسوية مخزن</span></div>
                                <div><b style="color: #64748b; font-size: 0.85rem;">👤 الطرف/الجهة:</b> <span style="font-weight: 800; color: #1e293b;">${tx.customer || tx.partner || tx.account || 'جرد مخزني'}</span></div>
                            ` : `
                                <div><b style="color: #64748b; font-size: 0.85rem;">👤 ${isPurchase ? 'المورد/الحساب' : 'العميل/الحساب'}:</b> <span style="font-weight: 800; color: #1e293b;">${tx.customer || tx.partner || tx.account || tx.supplier || (isPurchase ? 'مورد نقدي' : 'عميل نقدي')}</span></div>
                                <div><b style="color: #64748b; font-size: 0.85rem;">💳 طريقة الدفع:</b> <span style="font-weight: 800; color: #1e293b;">${displayMethod}</span></div>
                            `}
                            <div><b style="color: #64748b; font-size: 0.85rem;">👤 المستخدم المسؤول:</b> <span style="font-weight: 800; color: #1e293b;">${tx.cashier || tx.user || '-'}</span></div>
                            ${tx.notes ? `<div style="grid-column: span 2;"><b style="color: #64748b; font-size: 0.85rem;">📝 ملاحظات:</b> <span style="font-weight: 800; color: #1e293b;">${tx.notes}</span></div>` : ''}
                        </div>
                        
                        <div style="border: 1px solid #e2e8f0; border-radius: 16px; overflow-y: auto; max-height: 260px; background: white;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                                <thead style="background: #f1f5f9;">
                                    <tr>
                                        <th style="padding:12px; text-align:right; font-size:0.8rem; color:#475569; font-weight:900;">${isFinancial ? 'البيان' : 'الصنف'}</th>
                                        ${!isFinancial ? `
                                            ${hasVariants ? `
                                                <th style="padding:12px; text-align:center; font-size:0.8rem; color:#475569; width:80px; font-weight:900;">المقاس</th>
                                                <th style="padding:12px; text-align:center; font-size:0.8rem; color:#475569; width:80px; font-weight:900;">اللون</th>
                                            ` : ''}
                                            <th style="padding:12px; text-align:center; font-size:0.8rem; color:#475569; width:100px; font-weight:900;">الكمية</th>
                                            <th style="padding:12px; text-align:center; font-size:0.8rem; color:#475569; width:110px; font-weight:900;">السعر</th>
                                        ` : `
                                            <th style="padding:12px; text-align:center; font-size:0.8rem; color:#475569; width:150px; font-weight:900;">طريقة الدفع</th>
                                            <th style="padding:12px; text-align:center; font-size:0.8rem; color:#475569; width:150px; font-weight:900;">بواسطة</th>
                                        `}
                                        <th style="padding:12px; text-align:center; font-size:0.8rem; color:#475569; width:130px; font-weight:900;">${isFinancial ? 'المبلغ' : 'الإجمالي'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml || '<tr><td colspan="' + (hasVariants ? '6' : '4') + '" style="text-align:center; padding:20px; color:#94a3b8;">لا توجد أصناف</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; padding: 12px 10px; border-top: 1px solid #f1f5f9; background: #fafafa; border-radius: 12px;">
                            ${(() => {
                                let pName = tx.customer || tx.partner || tx.account || tx.supplier || '';
                                if (pName && !window.isGenericCashPartner(pName) && typeof getAccountBalance === 'function') {
                                    const curBal = getAccountBalance(pName);
                                    const balColor = curBal > 0.01 ? '#e74c3c' : (curBal < -0.01 ? '#27ae60' : '#475569');
                                    const balLabel = curBal > 0.01 ? `مديونية عليه (${curBal.toFixed(2)} ج.م)` : (curBal < -0.01 ? `رصيد له (${Math.abs(curBal).toFixed(2)} ج.م)` : 'خالص (0.00 ج.م)');
                                    return `
                                        <div style="background: #ffffff; border: 1.5px dashed ${balColor}; padding: 6px 14px; border-radius: 12px; display: flex; flex-direction: column; justify-content: center;">
                                            <span style="font-size:0.78rem; color:#64748b; font-weight:bold;">👤 رصيد الحساب الإجمالي المتبقي:</span>
                                            <div style="font-size:1.1rem; font-weight:900; color:${balColor};">${balLabel}</div>
                                        </div>
                                    `;
                                }
                                return '<div></div>';
                            })()}
                            <div style="display: flex; justify-content: flex-end; gap: 20px; align-items: center;">
                                <div>
                                    <span style="font-size:0.8rem; color:#64748b; font-weight:bold;">${isFinancial ? 'إجمالي المبلغ:' : 'إجمالي الفاتورة:'}</span>
                                    <div style="font-size:1.3rem; font-weight:900; color:#1e293b;">${grandTotal.toFixed(2)} ج.م</div>
                                </div>
                                ${!isTransfer && !isAdjustment && !isFinancial ? `
                                    <div>
                                        <span style="font-size:0.8rem; color:#64748b; font-weight:bold;">المدفوع:</span>
                                        <div style="font-size:1.3rem; font-weight:900; color:#27ae60;">${paidVal.toFixed(2)} ج.م</div>
                                    </div>
                                    <div>
                                        <span style="font-size:0.8rem; color:#64748b; font-weight:bold;">المتبقي من الفاتورة:</span>
                                        <div style="font-size:1.3rem; font-weight:900; color:#e74c3c;">${remainingVal.toFixed(2)} ج.م</div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer Actions -->
                    <div style="padding: 20px 25px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <button onclick="document.getElementById('customViewModalOverlay').remove()" style="padding: 10px 25px; background: white; border: 2px solid #cbd5e1; border-radius: 12px; font-weight: bold; color: #64748b; cursor: pointer; transition: 0.2s;">إغلاق ❌</button>
                        <div style="display: flex; gap: 10px;">
                            <button id="customPrintBtn" style="padding: 10px 25px; background: #3b82f6; border: none; border-radius: 12px; font-weight: 900; color: white; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 8px;">🖨️ طباعة المستند</button>
                        </div>
                    </div>
                </div>
            `;
            
            modal.innerHTML = modalContent;
            document.body.appendChild(modal);
            
            const executePrint = function() {
                if (isTransfer) {
                    const shopName    = document.getElementById('shopName')?.value || 'بـيـان POS';
                    const shopAddress = document.getElementById('shopAddress')?.value || '';
                    const shopPhone   = document.getElementById('shopPhone1')?.value || '';
                    const footerMsg   = document.getElementById('printFooterMsg')?.value || 'شكراً لزيارتكم!';
                    
                    let wFrom = 'المخزن الرئيسي';
                    let wTo = 'مخزن فرعي';
                    if (tx.partner && tx.partner.includes('->')) {
                        const parts = tx.partner.split('->');
                        wFrom = parts[0].trim();
                        wTo = parts[1].trim();
                    }
                    
                    let date = tx.dateISO ? (tx.dateISO + ' ' + (tx.timeISO || '')) : (tx.date || '-');
                    
                    let rowsHtml = '';
                    let totalValue = 0;
                    items.forEach((item, idx) => {
                        const qty = parseFloat(item.qty || item.quantity || 0);
                        const price = parseFloat(item.price || item.costPrice || item.purchasePrice || 0);
                        const total = qty * price;
                        totalValue += total;
                        rowsHtml += `
                            <tr>
                                <td>${idx + 1}</td>
                                <td style="text-align:right;">${item.name}</td>
                                <td>${qty} ${item.unit || ''}</td>
                                <td>${price.toFixed(2)}</td>
                                <td>${total.toFixed(2)}</td>
                            </tr>
                        `;
                    });

                    const content = `
                        <div class="print-container" style="direction:rtl; font-family:Cairo, sans-serif; padding: 20px;">
                            <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                                <h1 style="margin:0;">${shopName}</h1>
                                ${shopAddress ? `<div style="font-size:12px; color:#555; margin-top:2px;">${shopAddress}</div>` : ''}
                                ${shopPhone ? `<div style="font-size:12px; color:#555; margin-top:2px;">هاتف: ${shopPhone}</div>` : ''}
                                <h2 style="margin:5px 0; background:#000; color:#fff; display:inline-block; padding:5px 20px; border-radius:5px;">إذن تحويل مخزني</h2>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 20px; font-weight:bold;">
                                <div>من مخزن: <span style="text-decoration:underline;">${wFrom}</span></div>
                                <div>إلى مخزن: <span style="text-decoration:underline;">${wTo}</span></div>
                                <div>التاريخ: ${date}</div>
                            </div>
                            <table style="width:100%; border-collapse:collapse; text-align:center;" border="1">
                                <thead>
                                    <tr style="background:#f0f0f0;">
                                        <th>م</th>
                                        <th>الصنف</th>
                                        <th>الكمية</th>
                                        <th>سعر التحويل</th>
                                        <th>الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>${rowsHtml}</tbody>
                                <tfoot>
                                    <tr style="font-weight:bold; background:#f0f0f0;">
                                        <td colspan="4">إجمالي قيمة التحويل</td>
                                        <td>${totalValue.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                            <div style="margin-top:50px; display:flex; justify-content:space-between;">
                                <div style="text-align:center;">توقيع أمين المخزن (المصدر)<br><br>...........................</div>
                                <div style="text-align:center;">توقيع المستلم (الوجهة)<br><br>...........................</div>
                            </div>
                            <div style="text-align:center; margin-top:30px; border-top:1px dashed #000; padding-top:10px; font-size:12px;">
                                <div style="font-weight:bold;">${footerMsg}</div>
                                <div>نظام بيان POS - مبيعات متكامل</div>
                            </div>
                        </div>
                    `;
                    
                    let receiptArea = document.getElementById('receipt-area');
                    if (!receiptArea) {
                        receiptArea = document.createElement('div');
                        receiptArea.id = 'receipt-area';
                        document.body.appendChild(receiptArea);
                    }
                    receiptArea.innerHTML = content;
                    window.print();
                } else if (isAdjustment) {
                    const shopName    = document.getElementById('shopName')?.value || 'بـيـان POS';
                    const shopAddress = document.getElementById('shopAddress')?.value || '';
                    const shopPhone   = document.getElementById('shopPhone1')?.value || '';
                    const footerMsg   = document.getElementById('printFooterMsg')?.value || 'شكراً لزيارتكم!';
                    
                    let date = tx.dateISO ? (tx.dateISO + ' ' + (tx.timeISO || '')) : (tx.date || '-');
                    
                    let rowsHtml = '';
                    items.forEach((item, idx) => {
                        const qty = parseFloat(item.qty || item.quantity || 0);
                        const price = parseFloat(item.price || item.costPrice || item.purchasePrice || 0);
                        rowsHtml += `
                            <tr>
                                <td>${idx + 1}</td>
                                <td style="text-align:right;">${item.name}</td>
                                <td>${qty} ${item.unit || ''}</td>
                                <td>${price.toFixed(2)}</td>
                            </tr>
                        `;
                    });

                    const content = `
                        <div class="print-container" style="direction:rtl; font-family:Cairo, sans-serif; padding: 20px;">
                            <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                                <h1 style="margin:0;">${shopName}</h1>
                                ${shopAddress ? `<div style="font-size:12px; color:#555; margin-top:2px;">${shopAddress}</div>` : ''}
                                ${shopPhone ? `<div style="font-size:12px; color:#555; margin-top:2px;">هاتف: ${shopPhone}</div>` : ''}
                                <h2 style="margin:5px 0; background:#000; color:#fff; display:inline-block; padding:5px 20px; border-radius:5px;">إذن تسوية مخزنية</h2>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 20px; font-weight:bold;">
                                <div>التاريخ: ${date}</div>
                            </div>
                            <table style="width:100%; border-collapse:collapse; text-align:center;" border="1">
                                <thead>
                                    <tr style="background:#f0f0f0;">
                                        <th>م</th>
                                        <th>الصنف</th>
                                        <th>الكمية الفعلية</th>
                                        <th>السعر</th>
                                    </tr>
                                </thead>
                                <tbody>${rowsHtml}</tbody>
                            </table>
                            <div style="margin-top:50px; display:flex; justify-content:space-between;">
                                <div style="text-align:center;">توقيع أمين المخزن:<br><br>...........................</div>
                            </div>
                            <div style="text-align:center; margin-top:30px; border-top:1px dashed #000; padding-top:10px; font-size:12px;">
                                <div style="font-weight:bold;">${footerMsg}</div>
                                <div>نظام بيان POS - مبيعات متكامل</div>
                            </div>
                        </div>
                    `;
                    
                    let receiptArea = document.getElementById('receipt-area');
                    if (!receiptArea) {
                        receiptArea = document.createElement('div');
                        receiptArea.id = 'receipt-area';
                        document.body.appendChild(receiptArea);
                    }
                    receiptArea.innerHTML = content;
                    window.print();
                } else if (tx.type.includes('قبض') || tx.type.includes('صرف')) {
                    const isReceipt = tx.type.includes('قبض');
                    let savedPosSettings = {};
                    try { savedPosSettings = JSON.parse(getStore('pos_settings') || '{}'); } catch(e) {}
                    const shopName = savedPosSettings.name || (document.getElementById('shopName') ? document.getElementById('shopName').value : 'مؤسستي');
                    const footerMsg = savedPosSettings.printFooterMsg || (document.getElementById('printFooterMsg') ? document.getElementById('printFooterMsg').value : 'شكراً لتعاملكم معنا!');
                    const id = tx.invoiceId || tx.id || '-';
                    const date = tx.dateISO || (tx.date ? tx.date.split(' ')[0] : new Date().toLocaleDateString('en-CA'));
                    const partnerName = tx.partner || 'غير محدد';
                    const amount = parseFloat(tx.total || tx.paidAmount || tx.price) || 0;

                    let balBefore = 0, balAfter = 0;
                    if (typeof window.getAccountBalance === 'function') {
                        const currentBalance = window.getAccountBalance(partnerName);
                        // الحركة محفوظة مسبقاً فالرصيد الحالي هو الرصيد بعد الحركة
                        balAfter = currentBalance;
                        if (isReceipt) {
                            balBefore = currentBalance + amount;
                        } else {
                            balBefore = currentBalance - amount;
                        }
                    }

                    const formatMoney = (num) => {
                        const isNeg = num < 0;
                        const formatted = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        return isNeg ? `-${formatted}` : formatted;
                    };

                    const title = isReceipt ? 'سند قبض نقدية' : 'سند صرف نقدية';
                    const actionLabel = isReceipt ? 'وصلنا من السيد:' : 'صرف للسيد:';
                    const amountLabel = isReceipt ? 'المبلغ المقبوض:' : 'المبلغ المنصرف:';
                    const col1Label = isReceipt ? 'الرصيد السابق' : 'كان له';
                    const col2Label = isReceipt ? 'المبلغ المقبوض' : 'المنصرف';
                    const col3Label = isReceipt ? 'المتبقي عليه' : 'المتبقي له';
                    const sign2Label = isReceipt ? 'الختم والاعتماد' : 'المدير المالي';
                    
                    const htmlContent = `
                        <html dir="rtl" lang="ar">
                        <head>
                            <meta charset="utf-8">
                            <title>${title} #${id} - ${shopName}</title>
                            <style>
                                @page { margin: 0; size: 80mm auto; }
                                *, *::before, *::after { box-sizing: border-box !important; }
                                html, body {
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    width: 100% !important;
                                    max-width: 80mm !important;
                                    background: #fff !important;
                                    color: #000 !important;
                                    font-family: 'Cairo', 'Segoe UI', Arial, sans-serif !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }
                                .receipt-card {
                                    width: 72mm;
                                    margin: 0 auto;
                                    padding: 3mm 2mm;
                                    text-align: center;
                                }
                                .shop-header {
                                    font-size: 19px;
                                    font-weight: 900;
                                    margin-bottom: 5px;
                                    color: #000;
                                }
                                .doc-badge {
                                    font-size: 14px;
                                    font-weight: 900;
                                    border: 2px solid #000;
                                    display: inline-block;
                                    padding: 2px 14px;
                                    border-radius: 4px;
                                    margin-bottom: 8px;
                                }
                                .meta-row {
                                    display: flex;
                                    justify-content: space-between;
                                    font-size: 12px;
                                    font-weight: 800;
                                    border-bottom: 1.5px solid #000;
                                    padding-bottom: 5px;
                                    margin-bottom: 8px;
                                }
                                .box-info {
                                    border: 1.5px solid #000;
                                    border-radius: 6px;
                                    padding: 8px;
                                    margin-bottom: 10px;
                                    text-align: right;
                                    font-size: 13px;
                                    font-weight: 700;
                                }
                                .amount-container {
                                    margin-top: 6px;
                                    text-align: center;
                                    font-size: 13px;
                                    font-weight: 900;
                                }
                                .amount-val {
                                    font-size: 22px;
                                    font-weight: 900;
                                    border: 2px solid #000;
                                    display: inline-block;
                                    padding: 2px 12px;
                                    border-radius: 6px;
                                    margin-top: 3px;
                                    font-family: 'Segoe UI', Arial, sans-serif;
                                    direction: ltr !important;
                                }
                                .summary-table {
                                    width: 100%;
                                    border-collapse: collapse;
                                    margin-bottom: 12px;
                                    border: 1.5px solid #000;
                                }
                                .summary-table th {
                                    border: 1px solid #000;
                                    padding: 4px 2px;
                                    font-size: 10px;
                                    font-weight: 900;
                                    background: #f1f5f9;
                                }
                                .summary-table td {
                                    border: 1px solid #000;
                                    padding: 6px 2px;
                                    font-size: 12px;
                                    font-weight: 900;
                                    text-align: center;
                                    font-family: 'Segoe UI', Arial, sans-serif;
                                    direction: ltr !important;
                                    white-space: nowrap;
                                }
                                .sign-grid {
                                    display: grid;
                                    grid-template-columns: 1fr 1fr;
                                    gap: 15px;
                                    margin-top: 20px;
                                    font-size: 12px;
                                    font-weight: 800;
                                }
                                .sign-line {
                                    border-top: 1.5px solid #000;
                                    padding-top: 4px;
                                    text-align: center;
                                }
                                .footer-text {
                                    margin-top: 15px;
                                    border-top: 1px dashed #000;
                                    padding-top: 8px;
                                    font-size: 11px;
                                    font-weight: 700;
                                    color: #333;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="receipt-card">
                                <div class="shop-header">${shopName}</div>
                                <div class="doc-badge">${title}</div>
                                <div class="meta-row">
                                    <span>رقم: ${id}</span>
                                    <span>التاريخ: ${date}</span>
                                </div>

                                <div class="box-info">
                                    <div>${actionLabel} <b style="font-size:14px; font-weight:900;">${partnerName}</b></div>
                                    <div class="amount-container">
                                        <div>${amountLabel}</div>
                                        <div class="amount-val">${formatMoney(amount)}</div>
                                    </div>
                                </div>

                                <table class="summary-table">
                                    <thead>
                                        <tr>
                                            <th style="width:33%;">${col1Label}</th>
                                            <th style="width:34%;">${col2Label}</th>
                                            <th style="width:33%;">${col3Label}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>${formatMoney(balBefore)}</td>
                                            <td>${formatMoney(amount)}</td>
                                            <td>${formatMoney(balAfter)}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div class="sign-grid">
                                    <div class="sign-line">توقيع المستلم</div>
                                    <div class="sign-line">${sign2Label}</div>
                                </div>

                                <div class="footer-text">
                                    <div>${footerMsg}</div>
                                    <div style="font-size:9px; color:#666; margin-top:3px;">نظام بَيَان POS المتكامل</div>
                                </div>
                            </div>
                            <script>
                                window.onload = function() {
                                    window.focus();
                                    setTimeout(function() {
                                        window.print();
                                        setTimeout(function() { window.close(); }, 500);
                                    }, 200);
                                };
                            <\/script>
                        </body>
                        </html>
                    `;

                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                        printWindow.document.write(htmlContent);
                        printWindow.document.close();
                    } else {
                        let receiptArea = document.getElementById('receipt-area');
                        if (!receiptArea) {
                            receiptArea = document.createElement('div');
                            receiptArea.id = 'receipt-area';
                            document.body.appendChild(receiptArea);
                        }
                        receiptArea.innerHTML = htmlContent;
                        window.print();
                    }
                } else {
                    if (typeof printInvoice === 'function') {
                        let printType = tx.type || 'بيع';
                        if (printType === 'sale') printType = 'بيع';
                        if (printType === 'purchase') printType = 'شراء';
                        
                        let printDocType = 'sales';
                        if (isPurchase) printDocType = 'purchase';
                        if (isReturn) {
                            printDocType = 'sales'; // توحيد المرتجعات تحت طابع المبيعات الرسمي
                        }

                        // فصل التاريخ والوقت بدقة وبصيغة سليمة
                        let printDate = '';
                        let printTime = '';
                        if (tx.dateISO) {
                            printDate = tx.dateISO;
                            printTime = tx.timeISO || '';
                        } else if (tx.date) {
                            if (tx.date.includes(' ')) {
                                const parts = tx.date.split(' ');
                                printDate = parts[0];
                                printTime = parts[1] ? parts[1].substring(0, 5) : '';
                            } else {
                                printDate = tx.date;
                            }
                        }

                        let prevBal = 0;
                        let partnerName = tx.customer || tx.partner || '';
                        if (partnerName && !window.isGenericCashPartner(partnerName)) {
                            if (typeof getHistoricalPartnerBalance === 'function') {
                                prevBal = getHistoricalPartnerBalance(partnerName, tx.invoiceId || tx.invoiceNumber || tx.id);
                            } else if (typeof getAccountBalance === 'function') {
                                prevBal = getAccountBalance(partnerName, tx.invoiceId || tx.invoiceNumber || tx.id);
                            }
                        }

                        printInvoice({
                            invoiceNumber: tx.invoiceId || tx.invoiceNumber || tx.id,
                            invoiceType: tx.method || printType,
                            date: printDate,
                            time: printTime,
                            cashier: tx.cashier || tx.user || '',
                            customer: tx.customer || tx.partner || 'عميل نقدي',
                            items: items,
                            totalAmount: grandTotal,
                            paid: paidVal,
                            deferred: grandTotal - paidVal,
                            prevBalance: prevBal,
                            currentBalance: prevBal + (grandTotal - paidVal),
                            docType: printDocType
                        });
                    } else {
                        alert('خطأ: محرك الطباعة غير متوفر!');
                    }
                }
            };

            if (autoPrint) {
                executePrint();
                return;
            }

            existing = document.getElementById('customViewModalOverlay');
            if (existing) existing.remove();
            
            modal = document.createElement('div');
            modal.id = 'customViewModalOverlay';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px);
                z-index: 11000; display: flex; align-items: center; justify-content: center;
            `;
            
            modal.innerHTML = modalContent;
            document.body.appendChild(modal);
            
            document.getElementById('customPrintBtn').onclick = executePrint;
        };

        function selectHistoryRow(idx) {
            selectedHistoryIndex = idx;
            renderHistoryTable();
        }

        function selectInvoiceRow(idx) {
            selectedInvoiceIndex = idx;
            renderInvoicesTable();
        }

        function shareSelectedInvoice(platform) {
            const activeIdx = (activeTabId && activeTabId.startsWith('invoices') ? selectedInvoiceIndex : selectedHistoryIndex);

            if (activeIdx === null || activeIdx === undefined) {
                return showCustomAlert({
                    type: 'warning',
                    titleText: '⚠️ تنبيه',
                    msg: 'يرجى تحديد العملية من الجدول أولاً للمشاركة.'
                });
            }

            const t = transactions[activeIdx];
            const text = `📄 تفاصيل ${t.type}\n🔢 رقم العملية: ${t.invoiceId || '-'}\n📅 التاريخ: ${t.date}\n👤 الطرف: ${t.partner || 'بدون'}\n💰 المبلغ: ${parseFloat(t.total || t.price || 0).toFixed(2)} ج.م\n📝 البيان: ${t.product || '-'}\n\nتم الإرسال عبر تطبيق بيان POS ✨`;

            let url = '';
            if (platform === 'wa') {
                url = `https://wa.me/?text=${encodeURIComponent(text)}`;
            } else if (platform === 'tg') {
                url = `https://t.me/share/url?url=${encodeURIComponent('https://t.me')}&text=${encodeURIComponent(text)}`;
            }

            if (url) window.open(url, '_blank');
            try { toggleShareMenu('invoicesShareMenu'); } catch(e){}
        }

        function printSelectedInvoice() {
            const activeIdx = (activeTabId && activeTabId.startsWith('invoices') ? selectedInvoiceIndex : selectedHistoryIndex);

            if (activeIdx === null || activeIdx === undefined) {
                return showCustomAlert({
                    type: 'warning',
                    titleText: '⚠️ تنبيه',
                    msg: 'يرجى تحديد (الضغط على) العملية من الجدول أولاً لطباعتها.'
                });
            }
            
            const t = transactions[activeIdx];
            if (t.invoiceId) {
                if (typeof viewInvoiceItems === 'function') {
                    // Pass autoPrint = true
                    viewInvoiceItems(t.invoiceId, t.type, true);
                }
            } else {
                // Single transaction (Receipt, Disbursement, etc.)
                window.renderCustomInvoiceModal({
                    ...t,
                    id: t.id || t.invoiceId || Math.floor(Math.random() * 10000),
                    items: [{
                        name: t.product || t.type,
                        qty: 1,
                        unit: '-',
                        price: t.total || t.price || 0,
                        total: t.total || t.price || 0
                    }],
                    paid: t.paidAmount || t.total || 0,
                    partner: t.partner || '-'
                }, true);
            }
            
            try { toggleShareMenu('invoicesShareMenu'); } catch(e){}
        }

        function viewSelectedInvoice() {
            const activeIdx = (activeTabId && activeTabId.startsWith('invoices') ? selectedInvoiceIndex : selectedHistoryIndex);

            if (activeIdx === null || activeIdx === undefined) {
                return showCustomAlert({
                    type: 'warning',
                    titleText: '⚠️ تنبيه',
                    msg: 'يرجى تحديد (الضغط على) العملية من الجدول أولاً لعرضها.'
                });
            }
            const t = transactions[activeIdx];
            if (t.invoiceId) {
                if (typeof viewInvoiceItems === 'function') {
                    viewInvoiceItems(t.invoiceId, t.type);
                }
            } else {
                // لو عملية مالية بدون رقم فاتورة (حركة فردية)
                window.renderCustomInvoiceModal({
                    ...t,
                    id: t.id || t.invoiceId || Math.floor(Math.random() * 10000),
                    items: [{
                        name: t.product || t.type,
                        qty: 1,
                        unit: '-',
                        price: t.total || t.price || 0,
                        total: t.total || t.price || 0
                    }],
                    paid: t.paidAmount || t.total || 0,
                    partner: t.partner || '-'
                });
            }
        }

        // دالة التعديل السريع برقم الفاتورة
        window.quickEditByNumber = function() {
            const settings = JSON.parse(getStore('pos_settings') || '{}');
            const canEditHistory = !!settings.allowHistoryEdit;
            if (!canEditHistory) {
                return showCustomAlert({
                    type: 'error',
                    titleText: '🚫 صلاحية ملغاة',
                    msg: 'عذراً، صلاحية تعديل السجل (Edit History) غير مفعلة في الإعدادات.'
                });
            }

            const input = document.getElementById('quickEditInvoiceId');
            if (!input) return;
            const invId = input.value.trim();

            if (!invId) {
                showToast("⚠️ يرجى إدخال رقم الفاتورة أولاً", "warning");
                input.focus();
                return;
            }

            // البحث عن الفاتورة في قاعدة البيانات
            const found = transactions.find(t => t.invoiceId == invId);

            if (found) {
                let cleanType = '';
                const typeStr = found.type;
                if (typeStr.includes('بيع') && !typeStr.includes('مرتجع')) cleanType = 'بيع';
                else if (typeStr.includes('شراء') && !typeStr.includes('مرتجع')) cleanType = 'شراء';
                else if (typeStr.includes('مرتجع بيع')) cleanType = 'مرتجع بيع';
                else if (typeStr.includes('مرتجع شراء')) cleanType = 'مرتجع شراء';
                else if (typeStr.includes('قبض')) cleanType = 'قبض';
                else if (typeStr.includes('صرف')) cleanType = 'صرف';

                if (window.editTransaction) {
                    window.editTransaction(invId, cleanType);
                    input.value = '';
                }
            } else {
                showCustomAlert({
                    type: 'error',
                    titleText: '❌ غير موجود',
                    msg: `لم يتم العثور على فاتورة بالرقم (#${invId}).`
                });
            }
        };

        function editSelectedInvoice() {
            const activeIdx = (activeTabId.startsWith('invoices') ? selectedInvoiceIndex : selectedHistoryIndex);

            if (activeIdx === null || activeIdx === undefined || activeIdx === -1) {
                return showCustomAlert({
                    type: 'warning',
                    titleText: '⚠️ تنبيه',
                    msg: 'يرجى تحديد (الضغط على) العملية من الجدول أولاً لبدء التعديل.'
                });
            }

            const t = transactions[activeIdx];
            if (!t || !t.invoiceId) {
                showToast("⚠️ لا يمكن تعديل هذه الحركة مباشرة", "error");
                return;
            }

            let cleanType = '';
            const typeStr = t.type;
            if (typeStr.includes('بيع') && !typeStr.includes('مرتجع')) cleanType = 'بيع';
            else if (typeStr.includes('شراء') && !typeStr.includes('مرتجع')) cleanType = 'شراء';
            else if (typeStr.includes('مرتجع بيع')) cleanType = 'مرتجع بيع';
            else if (typeStr.includes('مرتجع شراء')) cleanType = 'مرتجع شراء';
            else if (typeStr.includes('تسوية')) cleanType = 'تسوية';
            else if (typeStr.includes('قبض')) cleanType = 'قبض';
            else if (typeStr.includes('صرف')) cleanType = 'صرف';
            else if (typeStr.includes('تحويل')) cleanType = 'تحويل';

            if (window.editTransaction) {
                window.editTransaction(t.invoiceId, cleanType);
            }
        }

        function deleteSelectedInvoice() {
            const activeIdx = (activeTabId.startsWith('invoices') ? selectedInvoiceIndex : selectedHistoryIndex);

            if (activeIdx === null || activeIdx === undefined) {
                return showCustomAlert({
                    type: 'warning',
                    titleText: '⚠️ تنبيه',
                    msg: 'يرجى تحديد (الضغط على) العملية من الجدول أولاً لتتمكن من حذفها.'
                });
            }

            deleteTransaction(activeIdx);
        }

        function printIndividualTransaction(idx) {
            const t = transactions[idx];
            if (!t) return;
            if (t.type.includes('بيع') || t.type.includes('شراء') || t.type.includes('مرتجع')) {
                if (t.invoiceId && typeof viewInvoiceItems === 'function') {
                    viewInvoiceItems(t.invoiceId, t.type, true);
                } else if (t.invoiceId && typeof printBillFromData === 'function') {
                    printBillFromData(t.invoiceId, t.type);
                } else {
                    alert("لا يمكن طباعة هذا البند بشكل مستقل (لا يوجد رقم فاتورة)");
                }
            } else if (t.type.includes('قبض')) {
                document.getElementById('receiptID').value = t.invoiceId || '-';
                document.getElementById('receiptDate').value = t.dateISO;
                document.getElementById('receiptCustomer').value = t.partner;
                document.getElementById('receiptAmount').value = t.price;
                document.getElementById('receiptNotes').value = t.product;
                printReceiptData();
            } else if (t.type.includes('صرف')) {
                document.getElementById('disburseID').value = t.invoiceId || '-';
                document.getElementById('disburseDate').value = t.dateISO;
                document.getElementById('disbursePayee').value = t.partner;
                document.getElementById('disburseAmount').value = t.price;
                document.getElementById('disburseNotes').value = t.product;
                printDisbursementData();
            } else {
                if (typeof showToast === 'function') {
                    showToast("تم إرسال طلب الطباعة للطابعة الافتراضية...", "success");
                }
            }
        }

        let loginClockInterval = null;
        function updateLoginClock() {
            const timeEl = document.getElementById('loginTime');
            const dateEl = document.getElementById('loginDate');
            if(timeEl && dateEl) {
                const now = new Date();
                timeEl.textContent = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
                dateEl.textContent = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }
        }

        function initLogin() {
            if (loginClockInterval) clearInterval(loginClockInterval);
            updateLoginClock();
            loginClockInterval = setInterval(updateLoginClock, 1000);
            
            document.body.classList.add('is-logged-out'); // إخفاء عناصر النظام
            const modal = document.getElementById('loginModal');
            const uSelect = document.getElementById('loginUsernameInput');
            const wSelect = document.getElementById('loginWarehouseSelect');
            const standardForm = document.getElementById('standardLoginForm');
            const setupForm = document.getElementById('firstTimeSetupForm');



            // إخفاء كافة الأقسام تماماً لحماية الخصوصية قبل تسجيل الدخول
            document.querySelectorAll('.section-view').forEach(s => s.classList.add('hidden'));

            // إظهار شريط الخلفيات والويدجت فقط في شاشة تسجيل الدخول
            const wpBar = document.getElementById('quickWpBar');
            const infoWidget = document.getElementById('quickInfoWidget');
            if (wpBar) wpBar.classList.remove('hidden');
            if (infoWidget) infoWidget.classList.remove('hidden');

            if (users.length === 0) {
                // شاشة إعداد المالك لأول مرة
                if (standardForm) standardForm.classList.add('hidden');
                if (setupForm) setupForm.classList.remove('hidden');
                setTimeout(() => {
                    const setupInput = document.getElementById('setupAdminName');
                    if (setupInput) setupInput.focus();
                }, 200);
            } else {
                // شاشة تسجيل الدخول المعتادة
                if (standardForm) standardForm.classList.remove('hidden');
                if (setupForm) setupForm.classList.add('hidden');

                if (uSelect) {
                    uSelect.innerHTML = '<option value="" disabled selected>-- اختر مستخدم --</option>' + 
                        users.map(u => '<option value="' + u.name + '">' + u.name + ' (' + (u.role === 'admin' ? 'مدير' : 'كاشير') + ')</option>').join('');

                    uSelect.onchange = () => {
                       document.getElementById('loginPinInput').focus();
                    };
                }
            }

            if (wSelect) {
                wSelect.innerHTML = warehouses.map(w => '<option value="' + w.name + '">' + w.name + '</option>').join('');
            }

            modal.classList.remove('hidden'); 
            modal.style.display = 'flex';

            // إضافة مستمع لزر الإنتر في كافة خانات الدخول لسرعة العمل
            [uSelect, wSelect, document.getElementById('loginPinInput')].forEach(el => {
                if (el) {
                    el.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            attemptLogin();
                        }
                    });
                }
            });
        }

        function toggleLoginPassword() {
            togglePinVisibility('loginPinInput', document.getElementById('eyeIcon'));
        }

        function togglePinVisibility(inputId, btn) {
            const input = document.getElementById(inputId);
            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                input.style.letterSpacing = '2px';
                if (btn) btn.innerText = '🙈';
            } else {
                input.type = 'password';
                input.style.letterSpacing = inputId === 'loginPinInput' ? '5px' : '10px';
                if (btn) btn.innerText = '👁️';
            }
        }

        function attemptLogin() {
            try {
                const username = document.getElementById('loginUsernameInput').value.trim();
                const pin = document.getElementById('loginPinInput').value;
                const errorMsgEl = document.getElementById('loginErrorMsg');

                if (errorMsgEl) {
                    errorMsgEl.innerText = '';
                    errorMsgEl.style.display = 'none';
                }


                if (!username) {
                    if (errorMsgEl) {
                        errorMsgEl.innerText = "⚠️ يرجى اختيار مستخدم أو كتابة الاسم يدوياً";
                        errorMsgEl.style.display = 'block';
                    } else {
                        alert("يرجى اختيار مستخدم أو كتابة الاسم يدوياً");
                    }
                    return;
                }

                // البحث عن المستخدم بالاسم في قاعدة البيانات
                const foundUser = (typeof users !== 'undefined' && Array.isArray(users)) 
                    ? users.find(u => u.name === username) 
                    : null;

                if (!foundUser) {
                    if (errorMsgEl) {
                        errorMsgEl.innerText = "❌ اسم المستخدم غير موجود بالنظام!";
                        errorMsgEl.style.display = 'block';
                    } else {
                        alert("❌ اسم المستخدم غير موجود بالنظام!");
                    }
                    return;
                }

                if (foundUser.isFrozen) {
                    const frozenMsg = `🚫 تم تجميد حساب الموظف (${foundUser.name}) من قبل مدير النظام. يرجى مراجعته.`;
                    if (errorMsgEl) {
                        errorMsgEl.innerText = frozenMsg;
                        errorMsgEl.style.display = 'block';
                    }
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert({
                            type: 'error',
                            titleText: '❄️ الحساب مجمّد',
                            msg: frozenMsg
                        });
                    }
                    return;
                }

                if (pin === foundUser.pin) {
                    const whName = document.getElementById('loginWarehouseSelect').value || 'المخزن الرئيسي';
                    // ✅ أمان: نحفظ في IndexedDB - الدور والصلاحيات تُحمَّل من DB لا من localStorage
                    currentUser = { ...foundUser, warehouseName: whName };
                    // نحفظ فقط pin + warehouseName في localStorage (لا نحفظ role أو permissions)
                    setStore('pos_session_user', JSON.stringify({ pin: foundUser.pin, warehouseName: whName }));

                    document.getElementById('loginModal').classList.add('hidden');
                    document.body.classList.remove('is-logged-out'); // إظهار عناصر البرنامج
                    document.getElementById('currentUserDisplay').innerHTML = `<span style="opacity: 0.8;">👤</span><span>${currentUser.name} (${currentUser.role === 'admin' ? 'مدير' : 'موظف'})</span>`;
                    document.getElementById('currentWarehouseName').innerText = `📦 ${whName}`;
                    document.getElementById('loginUsernameInput').value = '';
                    document.getElementById('loginPinInput').value = '';
                    selectedLoginUser = null;

                    // إخفاء أدوات شاشة تسجيل الدخول بعد النجاح في الدخول
                    const wpBar = document.getElementById('quickWpBar');
                    const infoWidget = document.getElementById('quickInfoWidget');
                    if (wpBar) wpBar.classList.add('hidden');
                    if (infoWidget) infoWidget.classList.add('hidden');

                    // توجيه المستخدم لشاشة البيع إذا كان الخيار مفعلاً ويملك الصلاحية، وإلا للوحة التحكم
                    const posSettings = JSON.parse(getStore('pos_settings') || '{}');
                    const directToSales = posSettings.directToSalesOnLogin !== undefined ? !!posSettings.directToSalesOnLogin : true;

                    const canSell = (typeof hasPermission === 'function')
                        ? hasPermission('docs_add')
                        : (currentUser.role === 'admin' || (currentUser.permissions && currentUser.permissions.docs && currentUser.permissions.docs.add));

                    if (directToSales && canSell && typeof switchSection === 'function') {
                        switchSection('sales');
                        setTimeout(() => {
                            const searchEl = document.getElementById('productSearch') || document.getElementById('itemSearch') || document.getElementById('salesSearch');
                            if (searchEl) {
                                searchEl.focus();
                                if (typeof searchEl.select === 'function') searchEl.select();
                            }
                        }, 250);
                    } else if (typeof switchSection === 'function') {
                        switchSection('dashboard');
                    }
                    updateNotifications();
                } else {
                    if (errorMsgEl) {
                        errorMsgEl.innerText = "❌ رمز المرور غير صحيح!";
                        errorMsgEl.style.display = 'block';
                    } else {
                        alert("❌ رمز المرور غير صحيح!");
                    }
                    document.getElementById('loginPinInput').value = '';
                }
            } catch (err) {
                console.error("Error during attemptLogin:", err);
                const errorMsgEl = document.getElementById('loginErrorMsg');
                if (errorMsgEl) {
                    errorMsgEl.innerText = "❌ حدث خطأ غير متوقع أثناء تسجيل الدخول!";
                    errorMsgEl.style.display = 'block';
                }
            }
        }

        // =========================================================================
        // 💳 محرك تسجيل الدخول الفوري بكروت NFC / RFID
        // =========================================================================
        function attemptNfcLogin(cardUid) {
            if (!cardUid) return false;
            const uid = String(cardUid).trim();
            if (!uid) return false;

            // البحث عن الموظف المرتبط بهذا الكارت
            const foundUser = (typeof users !== 'undefined' && Array.isArray(users)) 
                ? users.find(u => u.nfcUid && String(u.nfcUid).trim().toLowerCase() === uid.toLowerCase()) 
                : null;

            const errorMsgEl = document.getElementById('loginErrorMsg');

            if (!foundUser) {
                if (errorMsgEl) {
                    errorMsgEl.innerText = `❌ كارت NFC (${uid}) غير مسجل لأي موظف بالنظام!`;
                    errorMsgEl.style.display = 'block';
                }
                if (typeof showToast === 'function') showToast(`❌ كارت NFC غير مسجل: ${uid}`, 'error');
                return false;
            }

            if (foundUser.isFrozen) {
                const frozenMsg = `🚫 تم تجميد حساب الموظف (${foundUser.name}) من قبل مدير النظام. يرجى مراجعته.`;
                if (errorMsgEl) {
                    errorMsgEl.innerText = frozenMsg;
                    errorMsgEl.style.display = 'block';
                }
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert({
                        type: 'error',
                        titleText: '❄️ الحساب مجمّد',
                        msg: frozenMsg
                    });
                }
                return false;
            }

            const whName = (document.getElementById('loginWarehouseSelect') && document.getElementById('loginWarehouseSelect').value) 
                ? document.getElementById('loginWarehouseSelect').value 
                : 'المخزن الرئيسي';

            currentUser = { ...foundUser, warehouseName: whName };
            if (typeof setStore === 'function') {
                setStore('pos_session_user', JSON.stringify({ pin: foundUser.pin, warehouseName: whName }));
            }

            const loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.add('hidden');
            document.body.classList.remove('is-logged-out');
            
            const userDisplay = document.getElementById('currentUserDisplay');
            if (userDisplay) {
                userDisplay.innerHTML = `<span style="opacity: 0.8;">👤</span><span>${currentUser.name} (${currentUser.role === 'admin' ? 'مدير' : 'موظف'})</span>`;
            }
            const whDisplay = document.getElementById('currentWarehouseName');
            if (whDisplay) whDisplay.innerText = `📦 ${whName}`;

            if (document.getElementById('loginUsernameInput')) document.getElementById('loginUsernameInput').value = '';
            if (document.getElementById('loginPinInput')) document.getElementById('loginPinInput').value = '';

            const wpBar = document.getElementById('quickWpBar');
            const infoWidget = document.getElementById('quickInfoWidget');
            if (wpBar) wpBar.classList.add('hidden');
            if (infoWidget) infoWidget.classList.add('hidden');

            // توجيه المستخدم لشاشة البيع إذا كان الخيار مفعلاً ويملك الصلاحية، وإلا للوحة التحكم
            const posSettingsNfc = JSON.parse(getStore('pos_settings') || '{}');
            const directToSalesNfc = posSettingsNfc.directToSalesOnLogin !== undefined ? !!posSettingsNfc.directToSalesOnLogin : true;

            const canSellNfc = (typeof hasPermission === 'function')
                ? hasPermission('docs_add')
                : (currentUser.role === 'admin' || (currentUser.permissions && currentUser.permissions.docs && currentUser.permissions.docs.add));

            if (directToSalesNfc && canSellNfc && typeof switchSection === 'function') {
                switchSection('sales');
                setTimeout(() => {
                    const searchEl = document.getElementById('productSearch') || document.getElementById('itemSearch') || document.getElementById('salesSearch');
                    if (searchEl) {
                        searchEl.focus();
                        if (typeof searchEl.select === 'function') searchEl.select();
                    }
                }, 250);
            } else if (typeof switchSection === 'function') {
                switchSection('dashboard');
            }
            if (typeof updateNotifications === 'function') updateNotifications();

            if (typeof showToast === 'function') showToast(`💳 أهلاً بك: ${currentUser.name} (تم الدخول بكارت NFC ✨)`, 'success');
            if (typeof logAuditAction === 'function') logAuditAction('تسجيل دخول NFC', `الموظف: ${currentUser.name}, UID: ${uid}`);
            return true;
        }

        // دالة فتح نافذة تسجيل الدخول السريع بكارت NFC
        function openQuickNfcLoginModal() {
            const modal = document.getElementById('nfcRegistrationModal');
            if (!modal) return;
            
            // تغيير النصوص لتكون مخصصة لتسجيل الدخول
            const titleEl = modal.querySelector('h3');
            const descEl = modal.querySelector('p');
            const inputEl = document.getElementById('nfcManualUidInput');
            const confirmBtn = modal.querySelector('button[onclick*="saveManualNfcUid"]');

            if (titleEl) titleEl.innerText = "⚡ الدخول الفوري بكارت NFC";
            if (descEl) descEl.innerText = "مرر كارت الموظف أمام قارئ الجهاز الآن، أو اكتب رمز الكارت ثم اضغط دخول.";
            if (inputEl) {
                inputEl.value = '';
                inputEl.placeholder = "مرر الكارت أو اكتب UID هنا...";
            }

            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            setTimeout(() => { if (inputEl) inputEl.focus(); }, 150);
        }

        window.openQuickNfcLoginModal = openQuickNfcLoginModal;
        let nfcGlobalBuffer = '';
        let lastNfcKeyTimestamp = 0;

        window.addEventListener('keydown', (e) => {
            const currentTime = Date.now();
            const isLoginOpen = document.getElementById('loginModal') && !document.getElementById('loginModal').classList.contains('hidden');
            const isNfcModalOpen = document.getElementById('nfcRegistrationModal') && !document.getElementById('nfcRegistrationModal').classList.contains('hidden');

            // إذا كان المستخدم يكتب ببطء شديد يتم تصفير البافر (لقراءة الكروت السريعة من القارئ)
            if (currentTime - lastNfcKeyTimestamp > 120) {
                nfcGlobalBuffer = '';
            }
            lastNfcKeyTimestamp = currentTime;

            if (e.key === 'Enter') {
                if (nfcGlobalBuffer.length >= 3) {
                    const scannedUid = nfcGlobalBuffer.trim();
                    nfcGlobalBuffer = '';

                    // 1. إذا كانت نافذة تسجيل كارت موظف مفتوحة
                    if (isNfcModalOpen || window.isListeningForNfcRegistration) {
                        e.preventDefault();
                        if (typeof saveManualNfcUid === 'function') saveManualNfcUid(scannedUid);
                        return;
                    }

                    // 2. إذا كانت شاشة تسجيل الدخول مفتوحة
                    if (isLoginOpen) {
                        e.preventDefault();
                        attemptNfcLogin(scannedUid);
                        return;
                    }
                }
                nfcGlobalBuffer = '';
                return;
            }

            if (e.key && e.key.length === 1) {
                nfcGlobalBuffer += e.key;
            }
        }, true);

        function logout() {
            const unsaved = (typeof window.checkUnsavedDataInAllTabs === 'function') 
                ? window.checkUnsavedDataInAllTabs() 
                : null;

            if (unsaved && unsaved.hasUnsaved) {
                // التنقل والرجوع التلقائي للتبويب المعلق
                switchSection(unsaved.tabType, true, unsaved.tabId);

                if (typeof showCustomAlert === 'function') {
                    showCustomAlert({
                        titleText: '⚠️ تنبيه أمان: بيانات غير محفوظة!',
                        msg: `تنبيه: لا يمكن تسجيل الخروج لأن هناك بيانات غير محفوظة في (${unsaved.tabLabel}).\n\n📌 السبب: ${unsaved.reason}.\n\nيرجى حفظ الفاتورة/المستند أولاً أو إفراغ البيانات قبل تسجيل الخروج.`,
                        type: 'warning'
                    });
                } else {
                    alert(`⚠️ تنبيه أمان: توجد بيانات غير محفوظة في (${unsaved.tabLabel}).\n${unsaved.reason}.\n\nيرجى حفظ البيانات أولاً.`);
                }
                return;
            }

            performLogout();
        }

        async function performLogout() {
            const settings = JSON.parse(getStore('pos_settings') || '{}');
            if (settings.autoBackup) {
                if (typeof window.executeAutoBackupToFile === 'function') {
                    await window.executeAutoBackupToFile(false);
                }
            }
            currentUser = null;
            removeStore('pos_session_user');
            document.body.classList.add('is-logged-out'); // إخفاء كافة العناصر
            document.getElementById('loginModal').classList.remove('hidden');
            initLogin();
        }

        /**
         * تحديث ظهور العناصر في لوحة التحكم بناءً على الصلاحيات
         */
        function updateDashboardPermissions() {
            const tiles = document.querySelectorAll('#dashboard-section [data-perm]');
            tiles.forEach(tile => {
                const perm = tile.getAttribute('data-perm');
                if (hasPermission(perm)) {
                    tile.style.display = '';
                } else {
                    tile.style.display = 'none';
                }
            });
        }

        // Consolidated Wallpaper Function (Moved to line 1392)

        // --- نظام اختصارات الكيبورد الموحد (Unified Global Keyboard Shortcuts) ---
        window.addEventListener('keydown', function(event) {
            // 0. التنقل السريع بين الأصناف بـ Ctrl + السهم (داخل كارت الصنف)
            const itemModal = document.getElementById('newItemModal');
            if (itemModal && !itemModal.classList.contains('hidden') && event.ctrlKey) {
                if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    if (typeof navigateProduct === 'function') navigateProduct(1);
                    return;
                } else if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    if (typeof navigateProduct === 'function') navigateProduct(-1);
                    return;
                }
            }

            // 1. منطق زر ESC الذكي (إغلاق النوافذ أو الأقسام)
            if (event.key === 'Escape') {
                // فحص النوافذ المنبثقة المفتوحة والظاهرة فعلياً (Modals & Menus) لإغلاقها
                const modals = [
                    'royalCalculator', 'confirmModal', 'alertModal', 'newItemModal', 'newAccountModal', 
                    'quickNavModal', 'profitModal', 'priceAdjustmentModal', 
                    'wallpaperMenu', 'subscriptionModal', 'cloudRegistrationModal',
                    'transferModal', 'loginModal', 'searchInvoiceModal', 'selectReturnItemsModal',
                    'statementModal', 'dailyReportModal', 'inventoryModal', 'permissionsModal',
                    'unitSelectionModal', 'invoiceShareMenu', 'stmtShareMenu', 
                    'salesInvoiceShareMenu', 'salesShareMenu', 'purShareMenu', 'invoiceItemsModal',
                    'trashModal', 'backupModal', 'settingsModal', 'expenseModal', 'revenueModal'
                ];

                let modalClosed = false;
                for (const modalId of modals) {
                    const el = document.getElementById(modalId);
                    // فحص دقيق: هل العنصر موجود، وهل هو ظاهر فعلياً للمستخدم؟
                    if (el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.classList.contains('visible'))) {
                        if (!el.classList.contains('hidden') && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden') {

                            // إغلاق المودال مع مراعاة الحالة الخاصة لمنع إغلاق شاشة الدخول الإجبارية
                            if (modalId === 'loginModal') return; 

                            if (modalId === 'royalCalculator') {
                                if (typeof toggleCalculator === 'function') toggleCalculator();
                            }
                            else if (modalId === 'confirmModal') {
                                if (typeof hideCloseWarning === 'function') hideCloseWarning();
                                else el.classList.add('hidden');
                            }
                            else if (modalId === 'alertModal') el.classList.add('hidden');
                            else if (modalId === 'wallpaperMenu' || modalId.includes('ShareMenu') || modalId === 'subscriptionModal') {
                                el.classList.remove('visible');
                                el.classList.add('hidden');
                            }
                            else el.classList.add('hidden');

                            modalClosed = true;
                            break; 
                        }
                    }
                }

                if (modalClosed) return;

                // إذا لم يكن هناك مودال مفتوح، نقوم بإغلاق التبويب النشط (القسم الحالي)
                if (typeof activeTabId !== 'undefined' && activeTabId && activeTabId !== 'dashboard') {
                    if (typeof closeTab === 'function') {
                        closeTab(activeTabId);
                        event.preventDefault(); 
                    }
                }
                return;
            }

            // --- أزرار الاختصارات الوظيفية (F-Keys) ---
            if (!currentUser) return; // منع الاختصارات قبل تسجيل الدخول

            // الحصول على القسم النشط حالياً لضمان توجيه الاختصار للمكان الصحيح
            const activeSection = document.querySelector('.section-view:not(.hidden)');
            const activeSectionId = activeSection ? activeSection.id : 'dashboard';

            // تجميع وتوحيد كافة الاختصارات من أقسام النظام المختلفة
            if (event.key === 'F1') {
                event.preventDefault();
                if (typeof switchSection === 'function') switchSection('dashboard');
            } else if (event.key === 'F2') {
                event.preventDefault();
                if (typeof switchSection === 'function') switchSection('sales');
            } else if (event.key === 'F3') {
                event.preventDefault();
                if (typeof switchSection === 'function') switchSection('purchase');
            } else if (event.key === 'F4') {
                event.preventDefault();
                if (activeSectionId === 'sales-section') {
                    if (typeof printBill === 'function') printBill();
                } else if (activeSectionId === 'purchase-section') {
                    if (typeof printPurchaseBill === 'function') printPurchaseBill();
                } else if (activeSectionId === 'sales-return-section') {
                    if (typeof printReturnReceipt === 'function') printReturnReceipt('sales');
                } else if (activeSectionId === 'purchase-return-section') {
                    if (typeof printReturnReceipt === 'function') printReturnReceipt('purchase');
                } else {
                    window.print();
                }
            } else if (event.key === 'F6') {
                event.preventDefault();
                if (typeof switchSection === 'function') switchSection('settings');
                setTimeout(() => {
                    if (typeof openSettingsTab === 'function') openSettingsTab('business-profile');
                }, 100);
            } else if (event.key === 'F7') {
                event.preventDefault();
                if (typeof toggleCalculator === 'function') toggleCalculator();
            } else if (event.key === 'F9') {
                event.preventDefault();
                const isAccountModal = !document.getElementById('newAccountModal')?.classList.contains('hidden');
                const isItemModal = !document.getElementById('newItemModal')?.classList.contains('hidden');

                if (isAccountModal) {
                    if (typeof saveAccount === 'function') saveAccount(false);
                } else if (isItemModal) {
                    if (typeof saveNewItem === 'function') saveNewItem('save');
                } else if (activeSectionId === 'sales-section') {
                    if (typeof saveBill === 'function') saveBill();
                } else if (activeSectionId === 'purchase-section') {
                    if (typeof savePurchase === 'function') savePurchase();
                } else if (activeSectionId === 'sales-return-section') {
                    if (typeof saveSalesReturn === 'function') saveSalesReturn();
                } else if (activeSectionId === 'purchase-return-section') {
                    if (typeof savePurchaseReturn === 'function') savePurchaseReturn();
                } else if (activeSectionId === 'receipt-section') {
                    if (typeof saveReceipt === 'function') saveReceipt(true);
                } else if (activeSectionId === 'disbursement-section') {
                    if (typeof saveDisbursement === 'function') saveDisbursement(true);
                } else if (activeSectionId === 'adjustment-section') {
                    if (typeof saveAdjustment === 'function') saveAdjustment();
                }
            } else if (event.key === 'F10') {
                event.preventDefault();
                const isAccountModal = !document.getElementById('newAccountModal')?.classList.contains('hidden');
                const isItemModal = !document.getElementById('newItemModal')?.classList.contains('hidden');

                if (isAccountModal) {
                    if (typeof closeNewAccountModal === 'function') closeNewAccountModal();
                    else document.getElementById('newAccountModal').classList.add('hidden');
                } else if (isItemModal) {
                    if (typeof closeNewItemModal === 'function') closeNewItemModal();
                    else document.getElementById('newItemModal').classList.add('hidden');
                } else if (activeSectionId === 'sales-section') {
                    if (typeof resetBill === 'function') resetBill();
                } else if (activeSectionId === 'purchase-section') {
                    if (typeof resetPurchase === 'function') resetPurchase();
                } else if (activeSectionId === 'sales-return-section') {
                    if (typeof resetReturn === 'function') resetReturn();
                } else if (activeSectionId === 'purchase-return-section') {
                    if (typeof resetPurReturn === 'function') resetPurReturn();
                } else if (activeSectionId === 'receipt-section') {
                    if (typeof resetReceipt === 'function') resetReceipt();
                } else if (activeSectionId === 'disbursement-section') {
                    if (typeof resetDisbursement === 'function') resetDisbursement();
                }
            } else if (event.key === 'F12') {
                event.preventDefault();
                if (activeSectionId === 'receipt-section') {
                    if (typeof saveReceipt === 'function') saveReceipt(true);
                } else if (activeSectionId === 'disbursement-section') {
                    if (typeof saveDisbursement === 'function') saveDisbursement(true);
                } else if (activeSectionId === 'adjustment-section') {
                    if (typeof saveAdjustment === 'function') saveAdjustment();
                }
            }
        });

    // ================= الآلة الحاسبة الملكية (Bayan Royal Calculator Logic) =================
    let calcExpression = "";
    let calcHistory = [];
    let isCalcHistoryLoaded = false; // تتبع حالة التحميل

    window.toggleMaximizeCalculator = function() {
        const modal = document.getElementById('royalCalculator');
        const btn = document.getElementById('maximizeCalcBtn');
        if (!modal) return;

        modal.classList.toggle('maximized');
        if (modal.classList.contains('maximized')) {
            modal.style.top = '';
            modal.style.left = '';
            modal.style.transform = '';
            if (btn) btn.innerText = '🔳';
        } else {
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
            if (btn) btn.innerText = '🔲';
        }
    };

    function toggleCalculator() {
        const modal = document.getElementById('royalCalculator');
        const bubble = document.getElementById('calcBubble');
        if (!modal) return;

        // تحميل السجل فقط عند الفتح لأول مرة لضمان اكتمال تجهيز قاعدة البيانات
        if (!isCalcHistoryLoaded) {
            calcHistory = JSON.parse(getStore('bayan_calc_history') || '[]');
            isCalcHistoryLoaded = true;
        }

        modal.classList.toggle('visible');
        if (modal.classList.contains('visible')) {
            bubble.classList.remove('visible');
            calcClear();
            renderCalcHistory();
            makeDraggable(modal, document.getElementById('calcHeader'));

            let existingTab = openTabs.find(t => t.id === 'calculator');
            if (!existingTab) {
                openTabs.push({ id: 'calculator', type: 'calculator', label: '🧮 الحاسبة' });
            }
            activeTabId = 'calculator';
            renderTabs();
        } else {
            openTabs = openTabs.filter(t => t.id !== 'calculator');
            if (activeTabId === 'calculator') {
                activeTabId = 'dashboard';
            }
            renderTabs();
        }
    }

    function minimizeCalculator() {
        const modal = document.getElementById('royalCalculator');
        const bubble = document.getElementById('calcBubble');
        modal.classList.remove('visible');
        bubble.classList.add('visible');
        makeDraggable(bubble, bubble);

        if (activeTabId === 'calculator') {
            activeTabId = 'dashboard';
        }
        renderTabs();
    }

    function restoreCalculator() {
        const modal = document.getElementById('royalCalculator');
        const bubble = document.getElementById('calcBubble');
        bubble.classList.remove('visible');
        modal.classList.add('visible');
        makeDraggable(modal, document.getElementById('calcHeader'));

        let existingTab = openTabs.find(t => t.id === 'calculator');
        if (!existingTab) {
            openTabs.push({ id: 'calculator', type: 'calculator', label: '🧮 الحاسبة' });
        }
        activeTabId = 'calculator';
        renderTabs();
    }

    // دالة السحب والإفلات العالمية (Ultra-Fast Draggable Logic)
    function makeDraggable(el, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            if (el.classList.contains('maximized')) return;
            e = e || window.event;
            // e.preventDefault(); // تم التعطيل للسماح بلمس الأزرار
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;

            // منع تحديد النصوص أثناء السحب
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'move';
        }

        function elementDrag(e) {
            e = e || window.event;
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            // سحب فوري بدون أي تأخير (Zero Latency) لإحساس بالخفة التامة
            el.style.top = (el.offsetTop - pos2) + "px";
            el.style.left = (el.offsetLeft - pos1) + "px";
            el.style.bottom = "auto"; 
            el.style.right = "auto";
            el.style.margin = "0";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            // إعادة السماح بتحديد النصوص
            document.body.style.userSelect = 'auto';
            document.body.style.cursor = 'default';
        }
    }

    function calcAppend(val) {
        const current = document.getElementById('calc-current');
        const prev = document.getElementById('calc-prev');

        if (val === '%' && calcExpression === "") return;

        // منع تكرار العمليات الحسابية المتتالية
        const lastChar = calcExpression.slice(-1);
        const ops = ['+', '-', '*', '/', '%'];
        if (ops.includes(val) && ops.includes(lastChar)) {
            calcExpression = calcExpression.slice(0, -1) + val;
        } else {
            calcExpression += val;
        }

        current.innerText = calcExpression || "0";
    }

    function calcClear() {
        calcExpression = "";
        document.getElementById('calc-current').innerText = "0";
        document.getElementById('calc-prev').innerText = "";
    }

    function calcDelete() {
        calcExpression = calcExpression.slice(0, -1);
        document.getElementById('calc-current').innerText = calcExpression || "0";
    }

    // ✅ أمان: محلل رياضي آمن يمنع Code Injection في بيئة Electron
    // eval() خطير في Electron لأنه يملك صلاحيات Node.js (قراءة/حذف ملفات)
    function safeMathEval(expr) {
        // السماح فقط بالأرقام والعمليات الرياضية الأساسية والأقواس والنقطة العشرية
        if (!/^[\d\s\+\-\*\/\.\(\)]+$/.test(expr)) {
            throw new Error('تعبير غير مسموح به');
        }
        // تنفيذ آمن داخل نطاق محدود بدون وصول للـ globals
        return Function('"use strict"; return (' + expr + ')')();
    }

    function calcResult() {
        const current = document.getElementById('calc-current');
        const prev = document.getElementById('calc-prev');
        if (calcExpression === "") return;

        try {
            // استبدال الرموز للعرض الصحيح قبل الحساب
            let finalExpr = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
            const result = safeMathEval(finalExpr);

            // إضافة للسجل
            const historyItem = { expr: calcExpression, res: result, time: new Date().toLocaleTimeString('ar-EG') };
            calcHistory.unshift(historyItem);
            if (calcHistory.length > 20) calcHistory.pop();
            setStore('bayan_calc_history', JSON.stringify(calcHistory));

            prev.innerText = calcExpression + " =";
            current.innerText = result;
            calcExpression = result.toString();
            renderCalcHistory();
        } catch (e) {
            current.innerText = "Error";
            setTimeout(calcClear, 1000);
        }
    }

    function loadCalcHistory() {
        try {
            const stored = getStore('bayan_calc_history');
            calcHistory = stored ? JSON.parse(stored) : [];
        } catch (e) {
            calcHistory = [];
        }
    }

    function toggleCalcHistory() {
        const area = document.getElementById('calcHistoryArea');
        if (!area) return;

        loadCalcHistory();
        renderCalcHistory();
        area.classList.toggle('visible');
    }

    function clearCalcHistory() {
        if (confirm("هل أنت متأكد من مسح سجل العمليات بالكامل؟")) {
            calcHistory = [];
            setStore('bayan_calc_history', JSON.stringify(calcHistory));
            renderCalcHistory();
            if (typeof showToast === 'function') showToast("🗑️ تم تصفير السجل بنجاح", "info");
        }
    }

    function renderCalcHistory() {
        const area = document.getElementById('calcHistoryArea');
        if (!area) return;
        
        if (!calcHistory || calcHistory.length === 0) {
            area.innerHTML = '<div style="color:#94a3b8; font-size:0.9rem; text-align:center; padding:15px; font-weight:bold;">📭 لا يوجد سجل عمليات محفوظة حتى الآن</div>';
            return;
        }

        area.innerHTML = calcHistory.map((item, idx) => `
            <div class="history-item" onclick="useCalcHistory(${idx})" title="اضغط لاستخدام هذه النتيجة">
                <span style="color: #cbd5e1; font-weight: 700; font-size: 0.9rem;">${item.expr}</span>
                <span style="color: #38bdf8; font-weight: 900; font-size: 1.1rem;">= ${item.res}</span>
            </div>
        `).join('');
    }

    function useCalcHistory(idx) {
        const item = calcHistory[idx];
        if (item) {
            calcExpression = item.res.toString();
            document.getElementById('calc-current').innerText = calcExpression;
            document.getElementById('calc-prev').innerText = item.expr + " =";
        }
    }

    function copyCalcResult() {
        const current = document.getElementById('calc-current');
        const display = document.getElementById('calcDisplay');
        if (!current || current.innerText === "0" || current.innerText === "") return;

        const textToCopy = current.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            // تفعيل الوميض الأخضر
            if (display) {
                display.classList.add('copied');
                setTimeout(() => display.classList.remove('copied'), 400);
            }
            showToast("✅ تم نسخ الرقم: " + textToCopy, "success");
        }).catch(err => {
            console.error('فشل النسخ: ', err);
        });
    }

    // دعم لوحة المفاتيح للآلة الحاسبة
    window.addEventListener('keydown', (e) => {
        const modal = document.getElementById('royalCalculator');
        if (!modal || !modal.classList.contains('visible')) return;

        if (e.key >= '0' && e.key <= '9') calcAppend(e.key);
        if (e.key === '+') calcAppend('+');
        if (e.key === '-') calcAppend('-');
        if (e.key === '*') calcAppend('*');
        if (e.key === '/') { e.preventDefault(); calcAppend('/'); }
        if (e.key === '.') calcAppend('.');
        if (e.key === '%') calcAppend('%');
        if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); calcResult(); }
        if (e.key === 'Backspace') calcDelete();
        if (e.key === 'Escape') toggleCalculator();
    });

        window.selectSetupBusinessType = function(type) {
            const types = ['clothing', 'supermarket'];
            types.forEach(t => {
                const card = document.getElementById(`setupBiz_${t}`);
                const radio = card ? card.querySelector('input[type="radio"]') : null;
                if (card) {
                    if (t === type) {
                        card.style.background = 'rgba(16, 185, 129, 0.18)';
                        card.style.border = '2px solid #10b981';
                        card.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.3)';
                        if (radio) radio.checked = true;
                    } else {
                        card.style.background = 'rgba(255, 255, 255, 0.05)';
                        card.style.border = '1.5px solid rgba(255, 255, 255, 0.2)';
                        card.style.boxShadow = 'none';
                        if (radio) radio.checked = false;
                    }
                }
            });
        };

        window.executeFirstTimeSetup = async function() {
            const name = document.getElementById('setupAdminName').value.trim();
            const pin = document.getElementById('setupAdminPin').value.trim();
            const pinConfirm = document.getElementById('setupAdminPinConfirm').value.trim();

            if (!name) return alert("❌ يرجى إدخال اسم المدير المسؤول!");
            if (!pin) return alert("❌ يرجى إدخال رمز المرور السري!");
            if (pin.length < 4) return alert("❌ يجب أن يتكون رمز المرور من 4 أرقام على الأقل!");
            if (pin !== pinConfirm) return alert("❌ رمز المرور غير متطابق!");

            // استخراج نوع النشاط التجاري المختار
            const selectedBizRadio = document.querySelector('input[name="setupBusinessType"]:checked');
            const selectedBizType = selectedBizRadio ? selectedBizRadio.value : 'clothing';

            try {
                // حفظ نوع النشاط في إعدادات النظام pos_settings وتكييف الأقسام
                let posSettings = {};
                try {
                    posSettings = JSON.parse(getStore('pos_settings') || '{}');
                } catch(e) {}

                posSettings.businessType = selectedBizType;
                posSettings.enableVariantsMatrix = (selectedBizType === 'clothing');

                const allKnownSections = [
                    'sales', 'sales-return', 'receipt', 'disbursement', 'daily-report',
                    'invoices', 'accounts', 'inventory', 'product-inquiry', 'treasury',
                    'statement', 'calculator', 'analysis', 'new-account', 'new-item',
                    'price-tracking', 'ai-assistant', 'shortcuts', 'adjustment',
                    'history', 'price-mgmt', 'transfer', 'warehouse-report', 'purchase', 'purchase-return'
                ];
                const activeClothingSections = ['sales', 'sales-return', 'receipt', 'disbursement', 'daily-report', 'invoices', 'accounts', 'inventory', 'statement'];

                posSettings.visibleDashboardSections = {};
                if (selectedBizType === 'clothing') {
                    allKnownSections.forEach(s => {
                        posSettings.visibleDashboardSections[s] = activeClothingSections.includes(s);
                    });
                } else {
                    allKnownSections.forEach(s => {
                        posSettings.visibleDashboardSections[s] = true;
                    });
                }

                setStore('pos_settings', JSON.stringify(posSettings));

                // مزامنة واجهة الإعدادات
                const businessTypeSelect = document.getElementById('settingBusinessType');
                if (businessTypeSelect) businessTypeSelect.value = selectedBizType;
                const enableVariantsChk = document.getElementById('enableVariantsMatrix');
                if (enableVariantsChk) enableVariantsChk.checked = (selectedBizType === 'clothing');

                // تطبيق الواجهة فوراً وتحديث كارت الهوية
                if (typeof applyBusinessTypeUI === 'function') {
                    applyBusinessTypeUI();
                }

                // إضافة المستخدم الأول كأدمن
                const newUser = { id: 1, name: name, pin: pin, role: 'admin' };
                await db.users.add(newUser);
                users.push(newUser);

                // إتمام تسجيل الدخول للمستخدم الجديد
                currentUser = { ...newUser, warehouseName: 'المخزن الرئيسي' };
                // ✅ أمان: نحفظ فقط pin + warehouseName (لا role أو permissions)
                setStore('pos_session_user', JSON.stringify({ pin: newUser.pin, warehouseName: 'المخزن الرئيسي' }));

                // تعبئة بيانات كارت النجاح
                const bizNames = {
                    clothing: 'ملابس وأحذية وشنط 👕',
                    supermarket: 'سوبر ماركت ومواد غذائية 🛒'
                };
                document.getElementById('displayAdminName').innerText = name;
                document.getElementById('displayAdminPin').innerText = pin;
                const displayBizEl = document.getElementById('displayAdminBusinessType');
                if (displayBizEl) displayBizEl.innerText = bizNames[selectedBizType] || selectedBizType;

                document.getElementById('currentUserDisplay').innerHTML = `<span style="opacity: 0.8;">👤</span><span>${currentUser.name} (مدير)</span>`;
                document.getElementById('currentWarehouseName').innerText = `📦 المخزن الرئيسي`;

                // إظهار نافذة النجاح
                const successModal = document.getElementById('setupSuccessModal');
                if (successModal) {
                    successModal.classList.remove('hidden');
                } else {
                    alert("🎉 تم إنشاء حساب المالك وتفعيل نظام بَيَان بنجاح!\nالاسم: " + name + "\nرمز المرور: " + pin + "\nنوع النشاط: " + (bizNames[selectedBizType] || selectedBizType));
                    closeSetupSuccessAndEnter();
                }
            } catch (e) {
                console.error(e);
                alert("❌ حدث خطأ أثناء تفعيل النظام!");
            }
        };

        window.toggleSetupPassword = function(inputId, btn) {
            const input = document.getElementById(inputId);
            if (!input) return;
            if (input.type === 'password') {
                input.type = 'text';
                input.style.letterSpacing = 'normal';
                btn.innerText = '🙈';
            } else {
                input.type = 'password';
                input.style.letterSpacing = '2px';
                btn.innerText = '👁️';
            }
        };

        window.downloadCredentialsImage = function() {
            const card = document.getElementById('setupSuccessCard');
            if (typeof html2canvas === 'function') {
                // Hide buttons before screenshot to make it look clean
                html2canvas(card, {
                    backgroundColor: '#0f172a',
                    scale: 2
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = 'Bayan_POS_Credentials.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }).catch(err => {
                    console.error("Failed to generate image:", err);
                    alert("⚠️ فشل توليد الصورة، يرجى تصوير الشاشة يدوياً.");
                });
            } else {
                alert("⚠️ أداة حفظ الصور غير جاهزة حالياً، يرجى تصوير الشاشة يدوياً.");
            }
        };

        window.closeSetupSuccessAndEnter = function() {
            const successModal = document.getElementById('setupSuccessModal');
            if (successModal) successModal.classList.add('hidden');
            
            document.getElementById('loginModal').classList.add('hidden');
            document.body.classList.remove('is-logged-out');
            
            // إخفاء ويدجت الخلفية
            const wpBar = document.getElementById('quickWpBar');
            const infoWidget = document.getElementById('quickInfoWidget');
            if (wpBar) wpBar.classList.add('hidden');
            if (infoWidget) infoWidget.classList.add('hidden');

            const posSettingsSetup = JSON.parse(getStore('pos_settings') || '{}');
            const directToSalesSetup = posSettingsSetup.directToSalesOnLogin !== undefined ? !!posSettingsSetup.directToSalesOnLogin : true;

            const canSellSetup = (typeof hasPermission === 'function')
                ? hasPermission('docs_add')
                : (currentUser && (currentUser.role === 'admin' || (currentUser.permissions && currentUser.permissions.docs && currentUser.permissions.docs.add)));

            if (directToSalesSetup && canSellSetup && typeof switchSection === 'function') {
                switchSection('sales');
                setTimeout(() => {
                    const searchEl = document.getElementById('productSearch') || document.getElementById('itemSearch') || document.getElementById('salesSearch');
                    if (searchEl) {
                        searchEl.focus();
                        if (typeof searchEl.select === 'function') searchEl.select();
                    }
                }, 250);
            } else if (typeof switchSection === 'function') {
                switchSection('dashboard');
            }
            updateNotifications();
        };

        // ================= ربط مستمعات الفلاتر الزمنية لحفظ حالة التصفية التلقائية للأقسام =================
        const bindDateFilterListeners = function() {
            const configs = [
                { type: 'invoices', periodId: 'invoicesPeriodFilter', fromId: 'invoicesDateFrom', toId: 'invoicesDateTo' },
                { type: 'analysis', periodId: 'anPeriodFilter', fromId: 'anDateFrom', toId: 'anDateTo' },
                { type: 'history', periodId: 'historyPeriodFilter', fromId: 'historyDateFrom', toId: 'historyDateTo' },
                { type: 'warehouse-report', periodId: 'wrPeriodFilter', fromId: 'wrStartDate', toId: 'wrEndDate' },
                { type: 'daily-report', periodId: 'dailyReportPeriodFilter', fromId: 'reportDateFrom', toId: 'reportDateTo' },
                { type: 'statement', periodId: 'stmtPeriodFilter', fromId: 'stmtDateFrom', toId: 'stmtDateTo' }
            ];

            const saveState = (cfg) => {
                const p = document.getElementById(cfg.periodId)?.value || null;
                const f = document.getElementById(cfg.fromId)?.value || null;
                const t = document.getElementById(cfg.toId)?.value || null;
                if (!window.savedSectionDateFilters) window.savedSectionDateFilters = {};
                window.savedSectionDateFilters[cfg.type] = { periodFilter: p, dateFrom: f, dateTo: t };
            };

            configs.forEach(cfg => {
                [cfg.periodId, cfg.fromId, cfg.toId].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.addEventListener('change', () => saveState(cfg));
                    }
                });
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindDateFilterListeners);
        } else {
            bindDateFilterListeners();
        }

