import '@testing-library/jest-dom/vitest';

// jsdom 24 does not implement URL.createObjectURL / revokeObjectURL.
// Shim them for tests that exercise Blob URL creation (e.g. exportSession).
if (typeof URL.createObjectURL !== 'function') {
  let counter = 0;
  URL.createObjectURL = () => `blob:jsdom/${++counter}`;
  URL.revokeObjectURL = () => {};
}
