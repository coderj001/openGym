import React, { useEffect } from 'react';
import renderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../lib/history', () => {
  const actual = jest.requireActual('../lib/history');
  return { ...actual, previousPerformance: jest.fn(actual.previousPerformance) };
});

import WorkoutScreen, { nextIncompleteSet } from './WorkoutScreen';
import { StoreProvider, useStore } from '../store';
import { TimerProvider } from '../timers';
import { previousPerformance } from '../lib/history';

test('finds the next incomplete set without flattening supersets', () => {
  const entries = [
    { sets: [{ done: true }] },
    { sets: [{ done: true }, { done: false }] },
    { sets: [{ done: false }] },
  ];
  expect(nextIncompleteSet(entries, [[0, 1], [2]], 0)).toEqual({ entryIndex: 1, setIndex: 1 });
  expect(nextIncompleteSet(entries, [[0, 1], [2]], 1)).toEqual({ entryIndex: 2, setIndex: 0 });
});

function Probe({ onReady }) {
  const { ready, update } = useStore();
  useEffect(() => { if (ready) onReady(update); }, [ready, update, onReady]);
  return null;
}

test('does not rescan previous performance when a set changes', async () => {
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
    showPrevious: true,
    workouts: [{ d: '2026-03-01', entries: [
      { id: '0001', target: { mode: 'reps' }, sets: [{ w: 50, r: 8, done: true }] },
      { id: '0002', target: { mode: 'reps' }, sets: [{ w: 40, r: 10, done: true }] },
    ] }],
    active: { name: 'Test', start: Date.now(), cur: 0, entries: [
      { id: '0001', target: { mode: 'reps' }, sets: [{ w: 50, r: 8, done: false }] },
      { id: '0002', target: { mode: 'reps' }, sets: [{ w: 40, r: 10, done: false }] },
    ] },
  }));
  previousPerformance.mockClear();
  let update;
  let component;
  await renderer.act(async () => {
    component = renderer.create(<StoreProvider><TimerProvider><Probe onReady={value => { update = value; }} /><WorkoutScreen navigation={{ navigate: jest.fn(), setParams: jest.fn() }} route={{ params: {} }} /></TimerProvider></StoreProvider>);
    await Promise.resolve();
  });

  const calls = previousPerformance.mock.calls.length;
  expect(calls).toBe(2);
  renderer.act(() => update(state => { state.active.entries[0].sets[0].done = true; }));
  expect(previousPerformance).toHaveBeenCalledTimes(calls);
  renderer.act(() => component.unmount());
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
