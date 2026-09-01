import React, { useEffect } from 'react';
import renderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEF, STORAGE_KEY, StoreProvider, normalizeState, updateState, useStore, useStoreActions, useStoreSelector } from './store';

function Probe({ onReady }) {
  const { ready, update } = useStore();
  useEffect(() => { if (ready) onReady(update); }, [ready, update, onReady]);
  return null;
}

test('defaults effort to off while preserving legacy RIR settings', () => {
  expect(DEF.effort).toBe('none');
  expect(normalizeState({}).effort).toBe('none');
  expect(normalizeState({ showRir: true }).effort).toBe('rir');
});

test('selectors skip unrelated state updates', async () => {
  AsyncStorage.getItem.mockResolvedValue(null);
  const renders = jest.fn();
  let update;
  function SelectorProbe() {
    const restSec = useStoreSelector(state => state.restSec);
    const actions = useStoreActions();
    renders(restSec);
    useEffect(() => { if (actions.ready) update = actions.update; }, [actions.ready, actions.update]);
    return null;
  }
  let component;
  await renderer.act(async () => {
    component = renderer.create(<StoreProvider><SelectorProbe /></StoreProvider>);
    await Promise.resolve();
  });
  const count = renders.mock.calls.length;
  renderer.act(() => update(state => { state.unit = 'lb'; }));
  expect(renders).toHaveBeenCalledTimes(count);
  renderer.act(() => update(state => { state.restSec = 120; }));
  expect(renders).toHaveBeenCalledTimes(count + 1);
  renderer.act(() => component.unmount());
});

test('updates structurally share untouched branches', () => {
  const workouts = [{ id: 'history' }];
  const routines = [{ id: 'routine' }];
  const current = { workouts, routines, active: { cur: 0, entries: [] } };
  const next = updateState(current, state => { state.active.cur = 1; });

  expect(next).not.toBe(current);
  expect(next.active).not.toBe(current.active);
  expect(next.workouts).toBe(workouts);
  expect(next.routines).toBe(routines);
  expect(current.active.cur).toBe(0);
  expect(next.active.cur).toBe(1);
});

test('keeps concise mutating callbacks compatible', () => {
  const current = { routines: [] };
  const next = updateState(current, state => state.routines.push({ id: 'routine' }));
  expect(next.routines).toEqual([{ id: 'routine' }]);
});

test('rapid updates persist latest state in one write', async () => {
  jest.useFakeTimers();
  AsyncStorage.setItem.mockClear();
  let update;
  let component;
  await renderer.act(async () => {
    component = renderer.create(<StoreProvider><Probe onReady={value => { update = value; }} /></StoreProvider>);
    await Promise.resolve();
  });

  renderer.act(() => {
    update(state => { state.restSec = 60; });
    update(state => { state.restSec = 120; });
  });
  renderer.act(() => { jest.advanceTimersByTime(500); });
  await renderer.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
  expect(JSON.parse(AsyncStorage.setItem.mock.calls[0][1]).restSec).toBe(120);
  renderer.act(() => component.unmount());
  jest.useRealTimers();
});
