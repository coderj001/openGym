import renderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

import WorkoutScreen, { nextIncompleteSet } from './WorkoutScreen';
import { StoreProvider } from '../store';
import { TimerProvider } from '../timers';

test('finds the next incomplete set without flattening supersets', () => {
  const entries = [
    { sets: [{ done: true }] },
    { sets: [{ done: true }, { done: false }] },
    { sets: [{ done: false }] },
  ];
  expect(nextIncompleteSet(entries, [[0, 1], [2]], 0)).toEqual({ entryIndex: 1, setIndex: 1 });
  expect(nextIncompleteSet(entries, [[0, 1], [2]], 1)).toEqual({ entryIndex: 2, setIndex: 0 });
});

test('renders an active superset without first-session guidance', async () => {
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
    active: { name: 'Superset', start: Date.now(), cur: 0, entries: [
      { id: '0001', sg: 'pair', target: { mode: 'reps' }, plan: { kind: 'first', why: ['Nothing logged yet — this session sets the baseline.'] }, sets: [{ w: 50, r: 8, done: false }] },
      { id: '0002', sg: 'pair', target: { mode: 'reps' }, plan: { kind: 'first', why: ['Nothing logged yet — this session sets the baseline.'] }, sets: [{ w: 40, r: 10, done: false }] },
    ] },
  }));
  let component;
  await renderer.act(async () => {
    component = renderer.create(<StoreProvider><TimerProvider><WorkoutScreen navigation={{ navigate: jest.fn(), setParams: jest.fn() }} route={{ params: {} }} /></TimerProvider></StoreProvider>);
    await Promise.resolve();
  });
  expect(component.toJSON()).toBeTruthy();
  expect(JSON.stringify(component.toJSON())).not.toContain('Nothing logged yet');
  renderer.act(() => component.unmount());
});
