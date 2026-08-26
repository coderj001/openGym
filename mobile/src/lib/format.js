import { dateLocale, t } from './i18n';

export const todayISO = () => isoOf(new Date());
export const isoOf = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const DAYN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const ACCENTS = { lime: '#30d158', sky: '#0a84ff', orange: '#ff9f0a', violet: '#bf5af2', pink: '#ff375f', red: '#ff453a', teal: '#40c8e0', gold: '#ffd60a' };
export const fmtNum = value => (Math.round((Number(value) || 0) * 10) / 10).toLocaleString(dateLocale());
export const fmtDate = (iso, long = false) => new Date(`${iso}T12:00:00`).toLocaleDateString(dateLocale(), long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
export const fmtDur = ms => { const minutes = Math.floor((ms || 0) / 60000); return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`; };
export const durPart = ms => ms >= 60000 ? [fmtDur(ms)] : [];
export const fmtVol = (value, unit) => `${fmtNum(value)} ${unit}`;
export const exCount = count => t(count === 1 ? '{0} exercise' : '{0} exercises', count);
export function weekKey(iso) {
  const date = new Date(`${iso}T12:00:00`);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day + 3);
  const jan4 = new Date(date.getFullYear(), 0, 4);
  const week = 1 + Math.round(((date - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-${week}`;
}
