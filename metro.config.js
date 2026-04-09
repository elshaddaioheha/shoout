// Learn more https://docs.expo.io/guides/customizing-metro
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// Force Metro to resolve the CJS ("default") condition instead of the ESM
// ("import") condition for packages like zustand that ship `.mjs` files
// containing `import.meta` — which is not valid in a Metro/RN browser bundle.
config.resolver.unstable_conditionNames = ['require', 'default'];

// Also block .mjs from being resolved so Metro never accidentally picks
// an ESM file that contains import.meta.
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== 'mjs'
);

// Firebase v12+ ships @firebase/util with a static `import './postinstall.mjs'`
// inside its CJS entry file. Metro cannot resolve .mjs at runtime, so we
// redirect that specific import to an empty local stub.
const POSTINSTALL_STUB = path.resolve(__dirname, 'stubs/postinstall.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === './postinstall.mjs') {
    return { filePath: POSTINSTALL_STUB, type: 'sourceFile' };
  }
  // Fall back to the default resolver for everything else.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
