const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  saveFile: async (data) => {
    const filePath = await ipcRenderer.invoke('show-save-dialog');
    if (filePath) {
      return await ipcRenderer.invoke('write-file', filePath, data);
    }
    return false;
  },
  loadFile: async () => {
    const filePath = await ipcRenderer.invoke('show-open-dialog');
    if (filePath) {
      return await ipcRenderer.invoke('read-file', filePath);
    }
    return null;
  },
  exportCSV: async (data) => {
    const filePath = await ipcRenderer.invoke('show-export-dialog');
    if (filePath) {
      return await ipcRenderer.invoke('write-file', filePath, data);
    }
    return false;
  },
  importCSV: async () => {
    const filePath = await ipcRenderer.invoke('show-import-dialog');
    if (filePath) {
      return await ipcRenderer.invoke('read-file', filePath);
    }
    return null;
  },
  
  // Menu event listeners
  onMenuSaveFile: (callback) => ipcRenderer.on('menu-save-file', () => callback()),
  onMenuLoadFile: (callback) => ipcRenderer.on('menu-load-file', () => callback()),
  onMenuExportCsv: (callback) => ipcRenderer.on('menu-export-csv', () => callback()),
  onMenuImportCsv: (callback) => ipcRenderer.on('menu-import-csv', () => callback()),
  onShowAbout: (callback) => ipcRenderer.on('show-about', () => callback()),
  
  // Platform info
  platform: process.platform
});
