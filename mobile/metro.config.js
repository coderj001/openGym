const { getDefaultConfig } = require('expo/metro-config');
const { resolveExerciseMedia } = require('./scripts/mediaResolver');

const config = getDefaultConfig(__dirname);

// ponytail: this bundles 126 MB of GIFs. Set EXPO_PUBLIC_ALLOW_GIF=false to build without offline exercise media.
config.resolver.resolveRequest = (context, moduleName, platform) => resolveExerciseMedia(
  context,
  moduleName,
  platform,
  process.env.EXPO_PUBLIC_ALLOW_GIF !== 'false',
);

module.exports = config;
