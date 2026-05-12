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
Cypress.on('uncaught:exception', (err) => {
  if (
    err.message.includes('ResizeObserver loop limit exceeded') ||
    err.message.includes('Non-Error promise rejection') ||
    err.message.includes('Loading chunk') ||
    err.message.includes('ChunkLoadError') ||
    err.message.includes('NetworkError')
  ) {
    return false;
  }
  return true;
});
