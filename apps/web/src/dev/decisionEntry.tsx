// Development entry only. The production application does not import this walkthrough.
if (import.meta.env.DEV) {
  void import('./mountDecisionPreview');
} else {
  document.getElementById('root')!.textContent = 'This preview is available in development only.';
}
