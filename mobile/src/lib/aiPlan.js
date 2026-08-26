import { uid } from './format';
import { EXIDX } from './exercises';

// Build the prompt the user copies into any LLM.
export function buildAiPrompt({ goal, level, days, notes }) {
  return `You are a personal trainer. Generate a ${days}-day-per-week gym workout plan for someone whose goal is ${goal} and experience level is ${level}.${notes ? ` Extra context: ${notes}.` : ''}

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
- Keep sets 3-5, reps 5-15. weight always 0.`;
}

// Validate + transform the LLM JSON into store routines + week map.
export function parseAiPlan(raw) {
  let parsed;
  try {
    // Strip accidental markdown fences
    parsed = JSON.parse(raw.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim());
  } catch {
    throw new Error('Not valid JSON. Make sure you pasted the full response.');
  }

  if (!Array.isArray(parsed.routines) || !parsed.routines.length) {
    throw new Error('Missing "routines" array in the response.');
  }

  const routines = parsed.routines.map((r, i) => {
    if (!r.name) throw new Error(`Routine ${i + 1} has no name.`);
    const ex = (r.ex || []).map((e, j) => {
      if (!e.id || !EXIDX[e.id]) throw new Error(`Routine "${r.name}", exercise ${j + 1}: unknown id "${e.id}".`);
      return { id: e.id, sets: Number(e.sets) || 3, reps: Number(e.reps) || 10, weight: 0 };
    });
    if (!ex.length) throw new Error(`Routine "${r.name}" has no exercises.`);
    return { id: uid(), name: r.name, ex };
  });

  // Build week map: original indices → new routine ids
  const week = {};
  if (parsed.week && typeof parsed.week === 'object') {
    Object.entries(parsed.week).forEach(([day, idx]) => {
      const routine = routines[Number(idx)];
      if (routine) week[day] = routine.id;
    });
  }

  return { routines, week };
}
