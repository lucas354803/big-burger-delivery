let bigBurgerInstallPrompt = null;

function showInstallButton() {
  const btn = document.getElementById('installAppBtn');
  if (btn && bigBurgerInstallPrompt) btn.classList.add('show');
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  bigBurgerInstallPrompt = event;
  showInstallButton();
});

window.addEventListener('appinstalled', () => {
  bigBurgerInstallPrompt = null;
  const btn = document.getElementById('installAppBtn');
  if (btn) btn.classList.remove('show');
});

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('installAppBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      if (!bigBurgerInstallPrompt) return;
      bigBurgerInstallPrompt.prompt();
      await bigBurgerInstallPrompt.userChoice;
      bigBurgerInstallPrompt = null;
      btn.classList.remove('show');
    });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => { reg.update && reg.update(); }).catch(console.error);
    caches?.keys?.().then(keys => Promise.all(keys.filter(k => k.includes('bigburger-pwa')).map(k => caches.delete(k)))).catch(() => null);
  }
});
