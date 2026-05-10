const { contextBridge, ipcRenderer } = require('electron');

const api = {
  printReceipt: (html) => ipcRenderer.invoke('bigburger-print-receipt', html),
  printers: () => ipcRenderer.invoke('bigburger-list-printers'),
  savePrinterSettings: (data) => ipcRenderer.invoke('bigburger-save-printer-settings', data),
  loadPrinterSettings: () => ipcRenderer.invoke('bigburger-load-printer-settings')
};

contextBridge.exposeInMainWorld('BigBurgerApp', api);
contextBridge.exposeInMainWorld('bigburgerAPI', api);
