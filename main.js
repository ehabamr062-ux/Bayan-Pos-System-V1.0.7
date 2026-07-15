const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048 --expose-gc');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow;
let isQuitting = false;
const LICENSE_SECRET = 'BAYAN_POS_SECRET_KEY_2026';

function createWindow() {
    Menu.setApplicationMenu(null); // إلغاء القوائم الافتراضية

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#0f172a',
        webPreferences: {
            nodeIntegration: true,        // مطلوب لاستخدام require() في الكود الحالي (IPC)
            contextIsolation: false,      // يمنع preload scripts من التدخل في الصفحة
            devTools: false               // تعطيل أدوات المطور أساسياً
        },
        icon: path.join(__dirname, 'media', 'bayan_logo.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // منع اختصارات لوحة المفاتيح الخاصة بالـ Console والـ Reload
    mainWindow.webContents.on('before-input-event', (event, input) => {
        const key = input.key.toLowerCase();
        
        // منع F12 و Ctrl+Shift+I و Ctrl+Shift+J و Ctrl+Shift+C
        if (
            input.key === 'F12' || 
            (input.control && input.shift && (key === 'i' || key === 'j' || key === 'c'))
        ) {
            event.preventDefault();
            return;
        }

        // منع إعادة التحميل العادية F5 أو Ctrl+R
        if (input.key === 'F5' || (input.control && key === 'r')) {
            mainWindow.webContents.reload();
            event.preventDefault();
            return;
        }

        // F11 للشاشة الكاملة
        if (input.key === 'F11') {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
            event.preventDefault();
            return;
        }
    });

    // 🔒 الطبقة الدفاعية القوية: إغلاق أدوات المطور فوراً في حال فتحها بأي وسيلة
    mainWindow.webContents.on('devtools-opened', () => {
        mainWindow.webContents.closeDevTools();
    });

    // منع قائمة الزر الأيمن (كليك يمين)
    mainWindow.webContents.on('context-menu', (e) => {
        e.preventDefault();
    });

    // إدارة الإغلاق التلقائي وعمل النسخ الاحتياطي
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.webContents.send('trigger-backup-before-quit');
            setTimeout(() => {
                isQuitting = true;
                app.quit();
            }, 2000);
        }
    });

    // إدارة التحميلات الآمنة
    mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
        item.setSaveDialogOptions({
            defaultPath: path.join(app.getPath('desktop'), item.getFilename())
        });
        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                console.log('Download is interrupted but can be resumed');
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    console.log('Download is paused');
                }
            }
        });
        item.once('done', (event, state) => {
            if (state === 'completed') {
                console.log('Download successfully');
            } else {
                console.log('Download failed: ' + state);
            }
        });
    });
}

// تهيئة التطبيق
app.whenReady().then(() => {
    createWindow();
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// قنوات الاتصال (IPC)
ipcMain.on('save-backup-and-quit', (event, backupData) => {
    try {
        const desktopDir = app.getPath('desktop');
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '_');
        const backupPath = path.join(desktopDir, 'backup_pos_' + timestamp + '.json');
        
        fs.writeFileSync(backupPath, backupData, 'utf-8');
        console.log('Backup saved to', backupPath);
    } catch (err) {
        console.error('Failed to save backup:', err);
    } finally {
        isQuitting = true;
        app.quit();
    }
});

ipcMain.on('quit-directly', () => {
    isQuitting = true;
    app.quit();
});

// فتح الروابط الخارجية بأمان مع التحقق من الـ Protocol
ipcMain.handle('open-url', async (event, url) => {
    try {
        // ✅ أمان: السماح فقط بـ http و https و mailto ومنع أي بروتوكول آخر قد ينفّذ أوامر نظام
        const parsedUrl = new URL(url);
        const allowedProtocols = ['http:', 'https:', 'mailto:'];
        if (!allowedProtocols.includes(parsedUrl.protocol)) {
            console.error('⚠️ محاولة فتح رابط غير مسموح: ' + url);
            return false;
        }
        await shell.openExternal(parsedUrl.href);
    } catch (err) {
        console.error('Failed to open URL:', err);
    }
    return true;
});

// تشفير وتوقيع التراخيص
ipcMain.handle('generate-license-signature', (event, plan, expiry, machineId) => {
    try {
        const dataString = plan + '_' + expiry + '_' + machineId;
        return crypto.createHmac('sha256', LICENSE_SECRET).update(dataString).digest('hex').substring(0, 16).toUpperCase();
    } catch (err) {
        console.error('Failed to generate signature:', err);
        return '';
    }
});

ipcMain.handle('verify-license-signature', (event, plan, expiry, machineId, userSig) => {
    try {
        const dataString = plan + '_' + expiry + '_' + machineId;
        const expectedSig = crypto.createHmac('sha256', LICENSE_SECRET).update(dataString).digest('hex').substring(0, 16).toUpperCase();
        return userSig === expectedSig;
    } catch (err) {
        console.error('Failed to verify signature in Main Process:', err);
        return false;
    }
});

ipcMain.handle('hash-activation-payload', (event, payload) => {
    try {
        return crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex').substring(0, 16).toUpperCase();
    } catch (err) {
        console.error('Failed to hash activation payload:', err);
        return '';
    }
});