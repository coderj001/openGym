import { ACCENTS } from './lib/format';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
export const type = { caption: 12, label: 13, body: 16, headline: 18, subheading: 20, title: 22, heading: 24, largeTitle: 30 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 };
export const overlay = { scrim: '#000a' };
export const shadows = { floating: '0 4px 12px rgba(0, 0, 0, 0.3)' };

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map(value => Number.parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function foregroundFor(background) {
  const value = luminance(background);
  return (value + 0.05) / 0.05 >= 1.05 / (value + 0.05) ? '#000000' : '#ffffff';
}

export function palette(state) {
  const dark = state.theme !== 'light';
  const accent = ACCENTS[state.accent] || ACCENTS.lime;
  const danger = '#ff453a';
  return {
    dark,
    accent,
    onAccent: foregroundFor(accent),
    bg: dark ? '#000000' : '#f2f2f7',
    surface: dark ? '#1c1c1e' : '#ffffff',
    surface2: dark ? '#2c2c2e' : '#e5e5ea',
    text: dark ? '#ffffff' : '#111111',
    muted: dark ? '#a1a1a6' : '#6c6c70',
    dim: dark ? '#636366' : '#8e8e93',
    border: dark ? '#38383a' : '#d1d1d6',
    danger,
    onDanger: foregroundFor(danger),
    orange: '#ff9f0a', blue: '#0a84ff', yellow: '#ffd60a',
  };
}
