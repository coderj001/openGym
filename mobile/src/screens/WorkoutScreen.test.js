
import { nextIncompleteSet } from './WorkoutScreen';

test('finds the next incomplete set without flattening supersets', () => {
  const entries = [
    { sets: [{ done: true }] },
    { sets: [{ done: true }, { done: false }] },
    { sets: [{ done: false }] },
  ];
  expect(nextIncompleteSet(entries, [[0, 1], [2]], 0)).toEqual({ entryIndex: 1, setIndex: 1 });
  expect(nextIncompleteSet(entries, [[0, 1], [2]], 1)).toEqual({ entryIndex: 2, setIndex: 0 });
});

