const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const child_process = require('child_process');
const os = require('os');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0a0a0c', // Primary application background color
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Inter-Process Communication (IPC) Handlers for Native OS Integration

// --- File Integrity Module ---
ipcMain.handle('hash-file', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile']
    });
    
    if (canceled || filePaths.length === 0) {
        return { success: false, error: 'User canceled' };
    }
    
    const filePath = filePaths[0];
    const stat = fs.statSync(filePath);
    
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const hash256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const hash1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');
        const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
        
        return { 
            success: true, 
            filename: path.basename(filePath),
            filesize: stat.size,
            sha256: hash256,
            sha1: hash1,
            md5: md5
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// --- Network Diagnostics Module (Ping / Interface Enumeration) ---
ipcMain.handle('network-scan', async (event, targetIp) => {
    return new Promise((resolve) => {
        if (!targetIp) {
            // Retrieve local network interfaces if no specific target is provided
            const interfaces = os.networkInterfaces();
            return resolve({ success: true, interfaces, hostname: os.hostname() });
        }

        const isWin = process.platform === 'win32';
        const cmd = isWin ? `ping -n 4 ${targetIp}` : `ping -c 4 ${targetIp}`;
        
        child_process.exec(cmd, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, error: error.message, output: stdout || stderr });
                return;
            }
            resolve({ success: true, output: stdout });
        });
    });
});

// --- Cryptography Module (AES-256-GCM) ---
ipcMain.handle('encrypt-text', (event, { text, password }) => {
    try {
        const salt = crypto.randomBytes(16);
        const iv = crypto.randomBytes(12);
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        
        // Format: salt:iv:authTag:encryptedText
        const result = `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
        return { success: true, result };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('decrypt-text', (event, { encryptedData, password }) => {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 4) throw new Error('Invalid format. Expected salt:iv:authTag:ciphertext');
        
        const [saltHex, ivHex, authTagHex, cipherTextHex] = parts;
        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(cipherTextHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return { success: true, result: decrypted };
    } catch (err) {
        return { success: false, error: 'Decryption failed: ' + err.message };
    }
});
