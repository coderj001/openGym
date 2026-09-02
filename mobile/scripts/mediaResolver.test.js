const { resolveExerciseMedia } = require('./mediaResolver');

test('excludes GIF media unless explicitly enabled', () => {
  const resolveRequest = jest.fn();
  const context = { resolveRequest };

  resolveExerciseMedia(context, './exerciseMedia', 'android', false);

  expect(resolveRequest).toHaveBeenCalledWith(context, './exerciseMedia.noGifs', 'android');
});

test('keeps GIF media when enabled', () => {
  const resolveRequest = jest.fn();
  const context = { resolveRequest };

  resolveExerciseMedia(context, './exerciseMedia', 'android', true);

  expect(resolveRequest).toHaveBeenCalledWith(context, './exerciseMedia', 'android');
});
