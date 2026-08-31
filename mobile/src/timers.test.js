import React, { useEffect } from 'react';
import renderer from 'react-test-renderer';
import { TimerProvider, useRestTimer, useTimers } from './timers';

jest.mock('./store', () => ({ useStore: () => ({ S: { sound: false } }) }));

function Probe({ onChange }) {
  const state = useRestTimer();
  const actions = useTimers();
  useEffect(() => onChange({ state, actions }), [state, actions, onChange]);
  return null;
}

test('keeps the rest timer state available to the inline controls', () => {
  let timer;
  let component;
  renderer.act(() => { component = renderer.create(<TimerProvider><Probe onChange={value => { timer = value; }} /></TimerProvider>); });

  renderer.act(() => timer.actions.startRest(90));
  expect(timer.state.rest.total).toBe(90);

  renderer.act(() => timer.actions.addRest(-15));
  expect(timer.state.rest.total).toBe(75);

  renderer.act(() => timer.actions.stopRest());
  expect(timer.state.rest).toBeNull();
  renderer.act(() => component.unmount());
});
