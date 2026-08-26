import { ACCENTS } from './lib/format';

export function palette(state) {
  const dark = state.theme !== 'light';
  return {
    dark,
    accent: ACCENTS[state.accent] || ACCENTS.lime,
    bg: dark ? '#000000' : '#f2f2f7',
    surface: dark ? '#1c1c1e' : '#ffffff',
    surface2: dark ? '#2c2c2e' : '#e5e5ea',
    text: dark ? '#ffffff' : '#111111',
    muted: dark ? '#a1a1a6' : '#6c6c70',
    dim: dark ? '#636366' : '#8e8e93',
    border: dark ? '#38383a' : '#d1d1d6',
    danger: '#ff453a', orange: '#ff9f0a', blue: '#0a84ff', yellow: '#ffd60a',
  };
}
