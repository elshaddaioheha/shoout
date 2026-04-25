import type { ConfigContext, ExpoConfig } from '@expo/config';
import fs from 'node:fs';
import path from 'node:path';

export default ({ config }: ConfigContext): ExpoConfig => {
  const buildProfile = process.env.EAS_BUILD_PROFILE?.trim();
  const isProductionBuild = buildProfile === 'production';
  const sentryOrganization = process.env.SENTRY_ORG?.trim();
  const sentryProject = process.env.SENTRY_PROJECT?.trim();
  const localGoogleServicesCandidates = [
    path.resolve(__dirname, 'google-services.json'),
    path.resolve(__dirname, '..', 'google-services.json'),
  ];
  const localGoogleServicesFile = localGoogleServicesCandidates.find((candidate) => fs.existsSync(candidate));
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || localGoogleServicesFile;
  const stripeMerchantIdentifier = process.env.STRIPE_MERCHANT_IDENTIFIER?.trim() || 'merchant.com.shoouts';
  const requiredPlugins: Array<string | [string, Record<string, unknown>]> = [
    'expo-router',
    'expo-font',
    'expo-splash-screen',
    'expo-notifications',
    '@react-native-google-signin/google-signin',
    ['@stripe/stripe-react-native', { merchantIdentifier: stripeMerchantIdentifier }],
    'expo-image',
  ];
  const basePlugins = config.plugins ?? [];
  const missingPlugins = requiredPlugins.filter(
    (requiredPlugin) =>
      !basePlugins.some((plugin: any) => {
        const requiredPluginName = Array.isArray(requiredPlugin) ? requiredPlugin[0] : requiredPlugin;
        const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
        return pluginName === requiredPluginName;
      })
  );
  const plugins = [...basePlugins, ...missingPlugins].flatMap((plugin: any) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;

    if (pluginName !== '@sentry/react-native/expo') {
      return [plugin];
    }

    if (!isProductionBuild) {
      return [];
    }

    const sentryPluginConfig = {
      ...(sentryOrganization ? { organization: sentryOrganization } : {}),
      ...(sentryProject ? { project: sentryProject } : {}),
    };

    if (Object.keys(sentryPluginConfig).length === 0) {
      return [plugin];
    }

    return [['@sentry/react-native/expo', sentryPluginConfig]];
  });

  return {
    ...config,
    name: config.name || "Shoouts",
    slug: config.slug || "shoouts",
    runtimeVersion: config.version || "1.0.1",
    plugins,
    extra: {
      ...config.extra,
      sentryEnabled: isProductionBuild,
    },
    android: {
      ...config.android,
      package: "com.shoouts",
      ...(googleServicesFile
        ? {
            // On EAS, this is the temporary file path from the file secret.
            // Locally, it uses the repo-level file only when it actually exists.
            googleServicesFile,
          }
        : {}),
    },
    // Same for iOS when you need it:
    // ios: {
    //   ...config.ios,
    //   googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || "./GoogleService-Info.plist",
    // }
  };
};