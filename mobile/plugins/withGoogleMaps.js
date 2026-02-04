const {
  withAppDelegate,
  withPodfile,
  withInfoPlist,
} = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");

function withGoogleMaps(config, { apiKey }) {
  if (!apiKey) return config;

  // 1. Set GMSApiKey in Info.plist
  config = withInfoPlist(config, (conf) => {
    conf.modResults.GMSApiKey = apiKey;
    return conf;
  });

  // 2. Add Google Maps import + init to AppDelegate
  config = withAppDelegate(config, (conf) => {
    let contents = conf.modResults.contents;

    // Add import (use @main as anchor since Expo 55 uses it instead of @UIApplicationMain)
    const importResult = mergeContents({
      tag: "google-maps-import",
      src: contents,
      newSrc: [
        "#if canImport(GoogleMaps)",
        "import GoogleMaps",
        "#endif",
      ].join("\n"),
      anchor: /@main/,
      offset: 0,
      comment: "//",
    });
    contents = importResult.contents;

    // Add GMSServices.provideAPIKey before super.application call
    const initResult = mergeContents({
      tag: "google-maps-init",
      src: contents,
      newSrc: [
        "#if canImport(GoogleMaps)",
        `GMSServices.provideAPIKey("${apiKey}")`,
        "#endif",
      ].join("\n"),
      anchor:
        /\bsuper\.application\(\w+?, didFinishLaunchingWithOptions: \w+?\)/,
      offset: 0,
      comment: "//",
    });
    contents = initResult.contents;

    conf.modResults.contents = contents;
    return conf;
  });

  // 3. Add Google Maps CocoaPod
  config = withPodfile(config, (conf) => {
    const result = mergeContents({
      tag: "google-maps-pod",
      src: conf.modResults.contents,
      newSrc:
        "  pod 'react-native-maps/Google', :path => File.dirname(`node --print \"require.resolve('react-native-maps/package.json')\"`)\n",
      anchor: /use_native_modules/,
      offset: 0,
      comment: "#",
    });
    conf.modResults.contents = result.contents;
    return conf;
  });

  return config;
}

module.exports = withGoogleMaps;
