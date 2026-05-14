import './commands';
import 'cypress-real-events';

// ─── Global Console Error Tracking ───────────────────────────────────────────
Cypress.on('window:before:load', (win) => {
  win.__consoleErrors__ = [];
  const originalError = win.console.error.bind(win.console);
  win.console.error = (...args) => {
    win.__consoleErrors__.push(args.join(' '));
    originalError(...args);
  };
});

// ─── Uncaught Exception Handler ───────────────────────────────────────────────
// Only suppress known benign browser/bundler noise — do NOT suppress broad patterns
// like 'NetworkError' or 'Non-Error promise rejection' which can mask real failures.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver loop limit exceeded')) return false;
  if (err.message.includes('Loading chunk') || err.message.includes('ChunkLoadError')) return false;
  return true;
});
