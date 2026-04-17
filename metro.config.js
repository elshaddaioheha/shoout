// Learn more https://docs.expo.io/guides/customizing-metro
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);
const lucideCompatPath = path.resolve(__dirname, 'components/lucide-react-native.tsx');

// Some dependencies expose ESM-only `exports` entries that include `import.meta`.
// Metro's classic web bundle is not emitted as a module script, so keep legacy
// resolution to prefer CommonJS-compatible entry points.
config.resolver.unstable_enablePackageExports = false;

// Platform-specific module resolution:
// - React Native: force CJS to avoid import.meta in dependencies like zustand
// - Web: prefer browser/CJS so Metro's classic bundle does not include raw import.meta
config.resolver.unstable_conditionNames =
  process.env.EXPO_OS === 'web' || process.env.RN_PLATFORM === 'web'
    ? ['browser', 'require', 'default']
    : ['require', 'default'];

// Firebase v12+ ships @firebase/util with a static `import './postinstall.mjs'`
// inside its CJS entry file. Metro cannot resolve .mjs at runtime, so we
// redirect that specific import to an empty local stub.
const POSTINSTALL_STUB = path.resolve(__dirname, 'stubs/postinstall.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'lucide-react-native') {
    return { filePath: lucideCompatPath, type: 'sourceFile' };
  }
  if (moduleName === './postinstall.mjs') {
    return { filePath: POSTINSTALL_STUB, type: 'sourceFile' };
  }
  // Fall back to the default resolver for everything else.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

