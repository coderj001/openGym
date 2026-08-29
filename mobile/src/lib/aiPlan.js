import { uid } from './format';
import { EXIDX } from './exercises';

const setSummary = set => set.min != null ? `${set.min}min@${set.speed || 0}` : set.sec != null ? `${set.sec}s@${set.w || 0}` : `${set.w || 0}x${set.r || 0}`;

export function aiContext(state, weeks = 4, now = new Date()) {
  const routines = (state?.routines || []).slice(0, 10).map(routine => `${routine.name}: ${(routine.ex || []).slice(0, 12).map(item => `${item.id} ${EXIDX[item.id]?.n || item.id} ${item.sets || 1}x${item.reps || item.sec || item.min || 0}@${item.weight || 0}`).join(', ')}`);
  if (!weeks) {
    return `CURRENT PLAN\n${routines.join('\n') || 'None'}`;
  }
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - weeks * 7);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const workouts = (state?.workouts || []).filter(workout => workout.d >= cutoffIso).slice(-24).map(workout => `${workout.d} ${workout.name}: ${(workout.entries || []).map(entry => `${entry.id} ${EXIDX[entry.id]?.n || entry.id} [${(entry.sets || []).filter(set => set.done && set.kind !== 'w').map(setSummary).join(',')}]`).join('; ')}`);
  return `CURRENT PLAN\n${routines.join('\n') || 'None'}\n\nRECENT ${weeks}-WEEK WORKOUT HISTORY (${state?.unit || 'kg'})\n${workouts.join('\n') || 'None'}`;
}

// Build the prompt the user copies into any LLM.
export function buildAiPrompt({ goal, level, days, notes, state, historyWeeks = 4 }) {
  const guidance = historyWeeks
    ? 'Use their current plan and completed workout history below to make conservative, practical progression suggestions.'
    : 'Use their current plan below if available to make practical suggestions.';

  return `You are a personal trainer. Generate the next ${days}-day-per-week gym workout plan for someone whose goal is ${goal} and experience level is ${level}.${notes ? ` Extra context: ${notes}.` : ''}

${guidance} Do not claim to diagnose injuries or medical conditions.

${aiContext(state, historyWeeks)}

Return ONLY valid JSON in this exact shape — no markdown, no explanation:
{
  "routines": [
    {
      "name": "Day name",
      "ex": [
        { "id": "<exercise_id>", "sets": 3, "reps": 10, "weight": 0 }
      ]
    }
  ],
  "week": { "1": 0, "3": 1, "5": 2 }
}

Rules:
- Use ONLY exercise IDs from this list (id → name):
${Object.values(EXIDX).slice(0, 120).map(e => `  ${e.id}: ${e.n}`).join('\n')}
- "week" maps day-of-week numbers (0=Sun, 1=Mon … 6=Sat) to the routine index (0-based).
- Assign ${days} routines, spread across the week sensibly.
- Keep sets 3-5 and reps 5-15.
- Suggest a starting weight from the history when appropriate; otherwise use 0.`;
}

const bounded = (value, fallback, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
};

// Validate + transform the LLM JSON into store routines + week map.
export function parseAiPlan(raw, knownWeights = {}) {
  let parsed;
  try {
    if (typeof raw !== 'string' || raw.length > 1000000) throw new Error();
    // Strip accidental markdown fences
    parsed = JSON.parse(raw.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim());
  } catch {
    throw new Error('Not valid JSON. Make sure you pasted the full response.');
  }

  if (!Array.isArray(parsed.routines) || !parsed.routines.length || parsed.routines.length > 7) {
    throw new Error('The response must contain between 1 and 7 routines.');
  }

  const routines = parsed.routines.map((r, i) => {
    if (typeof r.name !== 'string' || !r.name.trim()) throw new Error(`Routine ${i + 1} has no name.`);
    if (!Array.isArray(r.ex) || !r.ex.length || r.ex.length > 30) throw new Error(`Routine "${r.name}" must contain between 1 and 30 exercises.`);
    const ex = r.ex.map((e, j) => {
      if (!e.id || !EXIDX[e.id]) throw new Error(`Routine "${r.name}", exercise ${j + 1}: unknown id "${e.id}".`);
      return {
        id: e.id,
        sets: bounded(e.sets, 3, 1, 10),
        reps: bounded(e.reps, 10, 1, 100),
        weight: bounded(e.weight, 0, 0, 10000) || bounded(knownWeights[e.id]?.w, 0, 0, 10000),
      };
    });
    return { id: uid(), name: r.name.trim().slice(0, 80), ex };
  });

  const week = {};
  if (parsed.week && typeof parsed.week === 'object' && !Array.isArray(parsed.week)) {
    Object.entries(parsed.week).forEach(([day, idx]) => {
      const dayNumber = Number(day);
      const routine = routines[Number(idx)];
      if (Number.isInteger(dayNumber) && dayNumber >= 0 && dayNumber <= 6 && routine) week[dayNumber] = routine.id;
    });
  }

  return { routines, week };
}
