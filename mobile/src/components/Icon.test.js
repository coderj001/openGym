import React from 'react';
import renderer from 'react-test-renderer';
import Icon from './Icon';

test('renders stored emoji routine icons', () => {
  let tree;
  renderer.act(() => { tree = renderer.create(<Icon name="💪" />); });
  expect(tree.toJSON().children).toEqual(['💪']);
});
