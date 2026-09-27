function resolveExerciseMedia(context, moduleName, platform, allowGifs = true) {
  return context.resolveRequest(context, moduleName === './exerciseMedia' && !allowGifs ? './exerciseMedia.noGifs' : moduleName, platform);
}

module.exports = { resolveExerciseMedia };
