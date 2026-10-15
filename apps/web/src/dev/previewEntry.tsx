// Separate Vite development entry. Production index.html does not import this module.
if (import.meta.env.DEV) {
  void import('./mountQuotationPreview');
} else {
  document.getElementById('root')!.textContent = 'This preview is available in development only.';
}
