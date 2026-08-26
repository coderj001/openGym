import React from 'react';
import renderer from 'react-test-renderer';
import App from './App';

describe('<App />', () => {
  it('renders without crashing', async () => {
    let component;
    await renderer.act(async () => {
      component = renderer.create(<App />);
      await Promise.resolve();
    });
    expect(component.toJSON()).toBeTruthy();
    renderer.act(() => component.unmount());
  });
});
