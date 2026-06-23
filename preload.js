const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Expose file operation capabilities
  hashFile: () => ipcRenderer.invoke('hash-file'),
  
  // Expose network and system diagnostic capabilities
  networkScan: (targetIp) => ipcRenderer.invoke('network-scan', targetIp),
  portScan: (targetIp, ports) => ipcRenderer.invoke('port-scan', { targetIp, ports }),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  getProcesses: () => ipcRenderer.invoke('get-processes'),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  checkPasswordLeak: (password) => ipcRenderer.invoke('check-password-leak', password),
  
  // Expose cryptography capabilities
  encryptText: (text, password) => ipcRenderer.invoke('encrypt-text', { text, password }),
  decryptText: (encryptedData, password) => ipcRenderer.invoke('decrypt-text', { encryptedData, password })
});
