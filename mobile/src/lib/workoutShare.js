const PREFIX = 'opengym:w:';
const MODES = new Set(['reps', 'time', 'cardio']);

const number = (value, fallback, minimum = 0, maximum = 10000) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
};

const packEntry = entry => [
  entry.id,
  number(entry.sets, 3, 1, 99),
  MODES.has(entry.mode) ? entry.mode : '',
  number(entry.reps, 10),
  number(entry.weight, 0),
  number(entry.sec, 45),
  number(entry.min, 20),
  number(entry.speed, 8),
  entry.bodyweight ? 1 : 0,
  entry.side ? 1 : 0,
];

export function encodeWorkoutShare(plan) {
  const name = String(plan?.name || 'Shared workout').trim().slice(0, 80) || 'Shared workout';
  const entries = (plan?.entries || []).map(packEntry);
  if (!entries.length) throw new Error('Add at least one exercise.');
  const value = `${PREFIX}${JSON.stringify({ v: 1, n: name, e: entries })}`;
  if (value.length > 2300) throw new Error('This workout is too large to share as one QR code.');
  return value;
}

export function decodeWorkoutShare(value, knownIds) {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) throw new Error('This is not an openGym workout QR code.');
  let payload;
  try { payload = JSON.parse(value.slice(PREFIX.length)); } catch { throw new Error('This workout QR code is invalid.'); }
  if (payload?.v !== 1 || !Array.isArray(payload.e) || !payload.e.length || payload.e.length > 50) throw new Error('This workout QR code is invalid.');
  const entries = payload.e.map(item => {
    if (!Array.isArray(item) || typeof item[0] !== 'string' || !knownIds.has(item[0])) throw new Error('This workout includes an exercise unavailable on this device.');
    return {
      id: item[0], sets: number(item[1], 3, 1, 99), mode: MODES.has(item[2]) ? item[2] : undefined,
      reps: number(item[3], 10), weight: number(item[4], 0), sec: number(item[5], 45),
      min: number(item[6], 20), speed: number(item[7], 8), bodyweight: item[8] === 1, side: item[9] === 1,
    };
  });
  return { name: String(payload.n || 'Shared workout').trim().slice(0, 80) || 'Shared workout', entries };
}
