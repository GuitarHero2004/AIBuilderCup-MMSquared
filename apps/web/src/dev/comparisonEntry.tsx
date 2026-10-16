// Independent Vite development entry; production index.html never imports this walkthrough.
if (import.meta.env.DEV) {
  void import('./mountComparisonPreview');
} else {
  document.getElementById('root')!.textContent = 'This preview is available in development only.';
}
