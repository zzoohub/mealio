const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * Restricts JitPack to only resolve com.github.* packages,
 * preventing it from blocking builds when JitPack is down.
 */
function withJitpackFix(config) {
  return withProjectBuildGradle(config, (conf) => {
    conf.modResults.contents = conf.modResults.contents.replace(
      /maven\s*\{\s*url\s*'https:\/\/www\.jitpack\.io'\s*\}/,
      [
        "exclusiveContent {",
        '            forRepository { maven { url = uri("https://www.jitpack.io") } }',
        '            filter { includeGroupByRegex("com\\\\.github\\\\..*") }',
        "        }",
      ].join("\n"),
    );
    return conf;
  });
}

module.exports = withJitpackFix;
