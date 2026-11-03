// Runs synchronously in <head> so the saved theme is applied before first paint.
// The real source of truth is chrome.storage; this is only a cached mirror.
try {
  const theme = localStorage.getItem('rm-theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {
  // Storage unavailable — fall back to the system theme.
}
