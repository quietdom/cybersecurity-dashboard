const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Expose file operation capabilities
  hashFile: () => ipcRenderer.invoke('hash-file'),
  
  // Expose network and system diagnostic capabilities
  networkScan: (targetIp) => ipcRenderer.invoke('network-scan', targetIp),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  checkPasswordLeak: (password) => ipcRenderer.invoke('check-password-leak', password),
  
  // Expose cryptography capabilities
  encryptText: (text, password) => ipcRenderer.invoke('encrypt-text', { text, password }),
  decryptText: (encryptedData, password) => ipcRenderer.invoke('decrypt-text', { encryptedData, password })
});
