import fs from 'fs';
import path from 'path';
import { buildDemoState } from './demoSeed';
import { effortSummary, effortWeeks, effortHistogram, hasEffort, displayScale, avgRir, rirOf, isHardSet, MIN_RATED, HARD_RIR } from './effort';
import { effortOf, modeOf } from './history';

const S = buildDemoState();
const eachSet = fn => S.workouts.forEach(w => w.entries.forEach(e => e.sets.forEach(s => fn(s, w, e))));
const sum = effortSummary(S, 0);

describe('mobile demo seed', () => {
  it('writes demo-backup.json for testing and manual import', () => {
    const filePath = path.resolve(__dirname, '../../demo-backup.json');
    fs.writeFileSync(filePath, JSON.stringify(S, null, 2));
    expect(fs.existsSync(filePath)).toBe(true);
  });
  it('rates enough of the history to clear every guard in the effort stats', () => {
    expect(hasEffort(S)).toBe(true);
    expect(sum.done).toBeGreaterThan(400);
    expect(sum.rated).toBeGreaterThan(MIN_RATED * 20);
    expect(sum.avg).not.toBeNull();
    expect(sum.hardPct).not.toBeNull();
    expect(sum.hardPct).toBeGreaterThan(0.3);
    expect(sum.hardPct).toBeLessThan(0.9);
  });

  it('leaves coverage partial', () => {
    const cov = sum.rated / sum.done;
    expect(cov).toBeGreaterThan(0.7);
    expect(cov).toBeLessThan(0.95);
  });

  it('never rates a set without reps', () => {
    eachSet((s, w, e) => {
      if (rirOf(s) != null) expect(modeOf({ ...(e.target || {}), id: e.id })).toBe('reps');
    });
  });

  it('leaves one exercise unrated throughout', () => {
    const rated = {};
    eachSet((s, w, e) => { rated[e.id] = (rated[e.id] || 0) + (rirOf(s) != null ? 1 : 0); });
    const ids = Object.keys(rated);
    expect(ids.filter(id => rated[id] === 0)).toEqual(['0605']);
    ids.filter(id => id !== '0605').forEach(id => {
      const sessions = S.workouts.filter(w => {
        const en = w.entries.find(e => e.id === id);
        return en && avgRir(en.sets.filter(s => s.done)) != null;
      });
      expect(sessions.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('labels aggregates in the correct scale', () => {
    expect(effortOf(S)).toBe('rir');
    expect(displayScale(S)).toBe('rir');
  });

  it('is deterministic', () => {
    const b = buildDemoState();
    const flat = st => st.workouts.map(w => w.entries.map(e => e.sets.map(s => `${s.w}x${s.r}/${s.rir ?? ''}/${s.rpe ?? ''}`).join(',')).join('|')).join(';');
    expect(flat(b)).toBe(flat(S));
  });
});
