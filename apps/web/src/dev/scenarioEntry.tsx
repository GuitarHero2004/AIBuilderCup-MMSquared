// Independent Vite development entry; production index.html does not import this walkthrough.
if (import.meta.env.DEV) {
  void import('./mountScenarioPreview');
} else {
  document.getElementById('root')!.textContent = 'This preview is available in development only.';
}
