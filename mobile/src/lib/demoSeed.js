import { isoOf, uid } from './format';
import { starterRoutines } from './starter';
import { modeOf } from './history';

// Starting weight and weekly increment per exercise of the starter plan (kg).
const PROG = {
  '0025': [60, 1.25], '0047': [45, 1], '0426': [20, 0.5], '0334': [10, 0.25], '0241': [25, 0.75], '0251': [0, 0],
  '2330': [50, 1.25], '0027': [50, 1], '1323': [45, 1], '0031': [30, 0.5], '0313': [12, 0.3],
  '0043': [70, 1.5], '0085': [60, 1.25], '0739': [120, 3], '0585': [45, 1], '0586': [40, 1], '0605': [60, 1.5],
};
const WEEKS = 12;
const BW_FROM = 82.4, BW_TO = 78.3;
const TARGET_W = 77;
const DELOAD_WEEK = 5;

const weekTarget = wk =>
  wk === DELOAD_WEEK ? 4.5
    : wk < DELOAD_WEEK ? 2.8 - wk * 0.3
      : 2.6 - (wk - DELOAD_WEEK - 1) * 0.26;

const EASY = new Set(['0043', '0085', '0739', '0585', '0586']);
const NEVER_RATED = '0605';
const UNRATED = 0.1;
const RPE_UNTIL = 3;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const round = (w, step) => Math.round(w / step) * step;
const at = (date, h, m) => { const d = new Date(date); d.setHours(h, m, 0, 0); return d.getTime(); };
const monday = date => { const d = new Date(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(12, 0, 0, 0); return +d; };

export function buildDemoState() {
  const rnd = rng(20260723);
  const [push, pull, legs] = starterRoutines();
  const byWeekday = { 1: push, 3: pull, 5: legs };

  const nowH = new Date().getHours();
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - WEEKS * 7);

  const workouts = [];
  const bodyweight = [];
  const exWeights = {};
  const best = {};

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    const iso = isoOf(day);
    const weekIdx = Math.floor((day - start) / (7 * 86400000));
    const p = Math.min(1, weekIdx / WEEKS);

    if (day.getDay() === 1 || day.getDay() === 4) {
      const w = BW_FROM + (BW_TO - BW_FROM) * p + (rnd() - 0.5) * 0.7;
      bodyweight.push({ d: iso, w: Math.round(w * 10) / 10, t: at(day, 7, 30) });
    }

    const routine = byWeekday[day.getDay()];
    if (!routine) continue;
    if (rnd() < 0.09) continue;
    if (iso === isoOf(today) && nowH < 18) continue;

    const prs = [];
    const blockWk = Math.round((monday(day) - monday(start)) / (7 * 86400000));
    const rir0 = weekTarget(blockWk);
    const scale = blockWk < RPE_UNTIL ? 'rpe' : 'rir';
    const entries = routine.ex.map((cfg, exIdx) => {
      const [base, inc] = PROG[cfg.id] || [20, 0.5];
      const step = base >= 40 ? 2.5 : 1.25;
      const back = blockWk === DELOAD_WEEK ? 0.88 : 1;
      const w = base ? Math.max(step, round((base + inc * weekIdx) * back, step)) : 0;
      const rateable = modeOf(cfg) === 'reps' && cfg.id !== NEVER_RATED;
      const sets = [];
      for (let i = 0; i < cfg.sets; i++) {
        const drop = i === cfg.sets - 1 && rnd() < 0.55 ? (rnd() < 0.4 ? 2 : 1) : 0;
        const s = { w, r: Math.max(4, cfg.reps - drop), done: true };
        const rir = clamp(round(rir0
          + (cfg.sets - 1 - i) * 0.6
          - exIdx * 0.12
          + (EASY.has(cfg.id) ? 1.2 : 0)
          - (drop ? 0.5 : 0)
          + (rnd() - 0.5), 0.5), 0, 6);
        if (rateable && rnd() > UNRATED) {
          if (scale === 'rpe') s.rpe = clamp(10 - rir, 6, 10);
          else s.rir = rir;
        }
        sets.push(s);
      }
      if (w > (best[cfg.id] || 0)) { best[cfg.id] = w; prs.push(cfg.id); }
      exWeights[cfg.id] = { w: Math.max(w, exWeights[cfg.id]?.w || 0), d: iso };
      return { id: cfg.id, sets, topW: w || null };
    });

    const bw = bodyweight.length ? bodyweight[bodyweight.length - 1].w : BW_FROM;
    const startMs = at(day, 18, 5 + Math.floor(rnd() * 25));
    const w = {
      id: uid(), d: iso, start: startMs, end: startMs + (46 + Math.floor(rnd() * 26)) * 60000,
      routineId: routine.id, name: routine.name, bw,
      entries,
      prs: weekIdx === 0 ? [] : prs,
    };
    w.vol = entries.reduce((v, e) => v + e.sets.reduce((n, s) => n + s.w * s.r, 0), 0);
    workouts.push(w);
  }

  const dayPlan = {};
  const tIso = isoOf(today);
  if (!byWeekday[today.getDay()] && !workouts.some(w => w.d === tIso)) {
    const order = [push, pull, legs];
    const lastName = workouts.length ? workouts[workouts.length - 1].name : legs.name;
    dayPlan[tIso] = order[(order.findIndex(r => r.name === lastName) + 1) % order.length].id;
  }

  return {
    routines: [push, pull, legs],
    week: { 1: push.id, 3: pull.id, 5: legs.id },
    dayPlan,
    workouts,
    bodyweight,
    exWeights,
    targetW: TARGET_W,
    effort: 'rir',
  };
}
