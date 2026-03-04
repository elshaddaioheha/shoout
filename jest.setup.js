/**
 * Jest setup shim for Expo projects.
 *
 * Expo's winter runtime (runtime.native.ts) installs polyfills lazily via
 * Object.defineProperty getters. One of those polyfills is `structuredClone`,
 * which on first access tries to require() ImportMetaRegistry.ts — a file that
 * uses `import.meta` (ESM-only). This crashes Jest's CommonJS environment.
 *
 * We pre-populate all the globals that Expo's winter runtime would install,
 * so the lazy getters never fire.
 */

// Ensure structuredClone exists (Node 17+ has it natively; Jest may run on older)
if (typeof global.structuredClone === 'undefined') {
    global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Stub __ExpoImportMetaRegistry so Expo's installGlobal getter short-circuits
if (typeof global.__ExpoImportMetaRegistry === 'undefined') {
    Object.defineProperty(global, '__ExpoImportMetaRegistry', {
        value: { url: '' },
        configurable: true,
        writable: true,
    });
}

// Stub URL / URLSearchParams if needed (Node 10+)
if (typeof global.URL === 'undefined') {
    const { URL, URLSearchParams } = require('url');
    global.URL = URL;
    global.URLSearchParams = URLSearchParams;
}
