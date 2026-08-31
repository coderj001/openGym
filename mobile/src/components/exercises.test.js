import React from 'react';
import renderer from 'react-test-renderer';

const mockStartAnimating = jest.fn();
const mockStopAnimating = jest.fn();

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Image: React.forwardRef(function Image(props, ref) {
    React.useImperativeHandle(ref, () => ({ startAnimating: mockStartAnimating, stopAnimating: mockStopAnimating }));
    return <View testID="exercise-image" />;
  }) };
});
jest.mock('../lib/exercises', () => ({ mediaFor: jest.fn(() => 1) }));
jest.mock('./ui', () => ({ useColors: () => ({ surface2: '#eee', dim: '#999' }) }));

import { Image } from 'expo-image';
import { ExerciseMedia } from './exercises';

test('plays and pauses exercise media only when tapped', () => {
  let tree;
  renderer.act(() => { tree = renderer.create(<ExerciseMedia exercise={{ gif: 'first.gif' }} />); });
  expect(tree.root.findByType(Image).props.autoplay).toBe(false);
  expect(tree.root.findByProps({ testID: 'exercise-media-play' })).toBeTruthy();

  renderer.act(() => tree.root.findByProps({ accessibilityLabel: 'Play exercise animation' }).props.onPress());
  expect(mockStartAnimating).toHaveBeenCalledTimes(1);
  expect(tree.root.findByType(Image).props.autoplay).toBe(true);
  expect(tree.root.findAllByProps({ testID: 'exercise-media-play' })).toHaveLength(0);

  renderer.act(() => tree.root.findByProps({ accessibilityLabel: 'Pause exercise animation' }).props.onPress());
  expect(mockStopAnimating).toHaveBeenCalledTimes(1);
  expect(tree.root.findByType(Image).props.autoplay).toBe(false);

  renderer.act(() => tree.update(<ExerciseMedia exercise={{ gif: 'second.gif' }} />));
  expect(tree.root.findByType(Image).props.autoplay).toBe(false);
});
