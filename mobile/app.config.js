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

export default { expo: appConfig };
