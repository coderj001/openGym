const { resolveExerciseMedia } = require('./mediaResolver');

test('includes GIF media by default', () => {
  const resolveRequest = jest.fn();
  const context = { resolveRequest };

  resolveExerciseMedia(context, './exerciseMedia', 'android');

  expect(resolveRequest).toHaveBeenCalledWith(context, './exerciseMedia', 'android');
});

test('excludes GIF media only when disabled', () => {
  const resolveRequest = jest.fn();
  const context = { resolveRequest };

  resolveExerciseMedia(context, './exerciseMedia', 'android', false);

  expect(resolveRequest).toHaveBeenCalledWith(context, './exerciseMedia.noGifs', 'android');
});
