import React, { useEffect } from 'react';
import renderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY, StoreProvider, useStore } from './store';

function Probe({ onReady }) {
  const { ready, update } = useStore();
  useEffect(() => { if (ready) onReady(update); }, [ready, update, onReady]);
  return null;
}

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
