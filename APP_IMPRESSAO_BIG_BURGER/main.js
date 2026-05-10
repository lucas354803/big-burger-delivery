const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, 'config.json');
let mainWindow;

const printerSettingsPath = path.join(app.getPath('userData'), 'printer-settings.json');
function loadPrinterSettings(){
  try{return JSON.parse(fs.readFileSync(printerSettingsPath,'utf8'));}catch(e){return {};}
}
function savePrinterSettings(data){
  try{fs.writeFileSync(printerSettingsPath, JSON.stringify(data,null,2)); return true;}catch(e){console.error(e); return false;}
}

function loadConfig() {
  const fallback = {
    siteUrl: 'https://big-burger-delivery-rho.vercel.app/admin',
    printerName: 'PERTO Printer TEC',
    silent: true,
    paperWidthMm: 80,
    openDevTools: false
  };
  try {
    return { ...fallback, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  } catch (err) {
    console.error('Erro config.json:', err.message);
    return fallback;
  }
}

function getSiteUrl() {
  const cfg = loadConfig();
  const u = String(cfg.siteUrl || '').trim() || 'https://big-burger-delivery-rho.vercel.app/admin';
  return u.startsWith('http') ? u : 'https://' + u;
}

function getMergedPrintConfig() {
  return { ...loadConfig(), ...loadPrinterSettings() };
}

function getPrintOptions() {
  const cfg = getMergedPrintConfig();
  const widthMm = Number(cfg.paperWidthMm || cfg.papel || 80);
  const opts = {
    silent: cfg.silent !== false,
    printBackground: true,
    margins: { marginType: 'none' },
    pageSize: { width: widthMm <= 60 ? 58000 : 80000, height: 297000 }
  };
  const printer = String(cfg.printerName || cfg.qzImpressora || '').trim();
  if (printer) opts.deviceName = printer;
  return opts;
}

function printHtml(html) {
  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      show: false,
      width: 420,
      height: 900,
      backgroundColor: '#ffffff',
      webPreferences: { contextIsolation: true, nodeIntegration: false, webSecurity: false }
    });
    printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    printWin.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        const opts = getPrintOptions();
        console.log('Imprimindo direto:', opts.deviceName || '(padrao)', 'silent=', opts.silent);
        printWin.webContents.print(opts, (success, reason) => {
          if (!success) console.error('Falha ao imprimir:', reason);
          printWin.close();
          resolve({ success, reason: reason || '' });
        });
      }, 700);
    });
  });
}

function createWindow() {
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    autoHideMenuBar: true,
    backgroundColor: '#050505',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });
  const cfg = getMergedPrintConfig();
  console.log('Abrindo sistema:', getSiteUrl());
  console.log('Arquivo de config permanente:', printerSettingsPath);
  console.log('Impressora:', String(cfg.printerName || cfg.qzImpressora || '').trim() || '(padrao do Windows)');
  console.log('Impressao silenciosa:', cfg.silent !== false);
  mainWindow.loadURL(getSiteUrl()).catch((err) => dialog.showErrorBox('Erro ao abrir sistema', err.message));
  if (cfg.openDevTools) mainWindow.webContents.openDevTools();
}

ipcMain.handle('bigburger-print-receipt', async (event, html) => {
  if (!html || typeof html !== 'string') return { success: false, reason: 'HTML da comanda vazio' };
  return await printHtml(html);
});

ipcMain.handle('bigburger-list-printers', async () => {
  if (!mainWindow) return [];
  return await mainWindow.webContents.getPrintersAsync();
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

ipcMain.handle('bigburger-save-printer-settings', async (event, data) => savePrinterSettings(data));
ipcMain.handle('bigburger-load-printer-settings', async () => loadPrinterSettings());
