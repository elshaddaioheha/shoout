import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: config.name || "Shoouts",
    slug: config.slug || "shouuts",
    android: {
      ...config.android,
      package: "com.shoouts",
      // When building on EAS, this uses the temporary file path from the file secret.
      // Locally, it falls back to the repo-level file outside the Expo app folder.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "../google-services.json",
    },
    // Same for iOS when you need it:
    // ios: {
    //   ...config.ios,
    //   googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || "./GoogleService-Info.plist",
    // }
  };
};
