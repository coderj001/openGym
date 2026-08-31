import { ACCENTS } from './lib/format';
import { palette } from './theme';

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map(value => Number.parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground, background) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

test('accent foregrounds meet WCAG AA contrast', () => {
  Object.entries(ACCENTS).forEach(([accent, color]) => {
    expect(contrast(palette({ accent, theme: 'dark' }).onAccent, color)).toBeGreaterThanOrEqual(4.5);
  });
});
