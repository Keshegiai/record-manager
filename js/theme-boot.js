// Runs synchronously in <head> so the saved appearance is applied before first paint.
// chrome.storage is the source of truth; localStorage is only a cached mirror.
(() => {
  let theme = 'system';
  let glass = 'on';
  try {
    theme = localStorage.getItem('rm-theme') || 'system';
    glass = localStorage.getItem('rm-glass') === 'off' ? 'off' : 'on';
  } catch {
    // Storage unavailable — use defaults.
  }
  const dark = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.glass = glass;
  if (new URLSearchParams(location.search).get('mode') === 'window') root.dataset.mode = 'window';
})();
