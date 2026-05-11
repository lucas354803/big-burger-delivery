const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('BigBurgerApp', {
  printReceipt: (html) => ipcRenderer.invoke('bigburger-print-receipt', html),
  printers: () => ipcRenderer.invoke('bigburger-list-printers')
});
