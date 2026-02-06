import "dotenv/config";
import config from "./app.json";

const appConfig = config.expo;

// Replace the placeholder with the actual env value
appConfig.plugins = appConfig.plugins.map((plugin) => {
  if (Array.isArray(plugin) && plugin[0] === "./plugins/withGoogleMaps") {
    return [
      "./plugins/withGoogleMaps",
      { apiKey: process.env.GOOGLE_MAP_API_KEY },
    ];
  }
  return plugin;
});

// Add EAS project ID
appConfig.extra = {
  ...appConfig.extra,
  eas: {
    projectId: "3ccd67e8-81bb-43b2-af35-2e1b5450ba2e",
  },
};

// Standard encryption declaration (no export compliance needed)
appConfig.ios = {
  ...appConfig.ios,
  infoPlist: {
    ...appConfig.ios?.infoPlist,
    ITSAppUsesNonExemptEncryption: false,
  },
};

export default { expo: appConfig };
