import { decodeWorkoutShare, encodeWorkoutShare } from './workoutShare';

describe('workout QR sharing', () => {
  const knownIds = new Set(['bench-press', 'running']);
  const plan = { name: 'Upper body', entries: [
    { id: 'bench-press', sets: 4, reps: 8, weight: 60, mode: 'reps' },
    { id: 'running', sets: 1, min: 30, speed: 9, mode: 'cardio' },
  ] };

  it('round-trips a shareable workout plan with safe defaults', () => {
    expect(decodeWorkoutShare(encodeWorkoutShare(plan), knownIds)).toMatchObject({
      name: 'Upper body',
      entries: [
        { id: 'bench-press', sets: 4, reps: 8, weight: 60, mode: 'reps', bodyweight: false },
        { id: 'running', sets: 1, min: 30, speed: 9, mode: 'cardio', bodyweight: false },
      ],
    });
  });

  it('rejects unrelated codes and unavailable exercises', () => {
    expect(() => decodeWorkoutShare('https://example.com', knownIds)).toThrow('not an openGym');
    expect(() => decodeWorkoutShare(encodeWorkoutShare({ ...plan, entries: [{ id: 'missing', sets: 3 }] }), knownIds)).toThrow('unavailable');
  });
});
