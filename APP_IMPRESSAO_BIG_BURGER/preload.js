const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('BigBurgerApp', {
  printReceipt: (html) => ipcRenderer.invoke('bigburger-print-receipt', html),
  printers: () => ipcRenderer.invoke('bigburger-list-printers'),
  savePrinterSettings: (data) => ipcRenderer.invoke('bigburger-save-printer-settings', data),
  loadPrinterSettings: () => ipcRenderer.invoke('bigburger-load-printer-settings')
});
