// Setup file for vitest
// Ensure window.setInterval and window.clearInterval are available
// This is needed because jsdom doesn't always expose these on window
if (typeof window !== 'undefined') {
  // Store references to the global timer functions
  const globalSetInterval = globalThis.setInterval;
  const globalClearInterval = globalThis.clearInterval;
  
  // Ensure window has these functions
  Object.defineProperty(window, 'setInterval', {
    writable: true,
    configurable: true,
    value: globalSetInterval,
  });
  
  Object.defineProperty(window, 'clearInterval', {
    writable: true,
    configurable: true,
    value: globalClearInterval,
  });
}
