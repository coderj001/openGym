const { getDefaultConfig } = require('expo/metro-config');
const { resolveExerciseMedia } = require('./scripts/mediaResolver');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => resolveExerciseMedia(
  context,
  moduleName,
  platform,
  process.env.EXPO_PUBLIC_ALLOW_GIF === 'true',
);

module.exports = config;
