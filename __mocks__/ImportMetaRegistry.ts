// Mock for expo/src/winter/ImportMetaRegistry
// The real implementation calls getBundleUrl() which uses import.meta (ESM-only).
// This no-op stub prevents the Jest CJS environment from crashing.
export const ImportMetaRegistry = {
    get url() {
        return '';
    },
};
