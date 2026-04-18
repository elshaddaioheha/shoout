import fs from 'node:fs';
import path from 'node:path';
import { ExpoConfig, ConfigContext } from 'expo/config';

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
  const plugins = (config.plugins ?? []).flatMap((plugin: any) => {
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
