const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Expose file operation capabilities
  hashFile: () => ipcRenderer.invoke('hash-file'),
  
  // Networking
  networkScan: (targetIp) => ipcRenderer.invoke('network-scan', targetIp),
  
  // Expose cryptography capabilities
  encryptText: (text, password) => ipcRenderer.invoke('encrypt-text', { text, password }),
  decryptText: (encryptedData, password) => ipcRenderer.invoke('decrypt-text', { encryptedData, password })
});
