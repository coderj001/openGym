# Routine JSON Schema

This document defines the JSON schema that AI tools must follow to generate a valid workout plan for openGym.

---

## Top-level shape

```json
{
  "routines": [ Routine ],
  "week": { "1": 0, "3": 1, "5": 2 }
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `routines` | `Routine[]` | yes | 1–7 items |
| `week` | `object` | no | Maps day-of-week number → routine index (0-based) |

### `week` day numbers

`0` = Sunday, `1` = Monday, `2` = Tuesday, `3` = Wednesday, `4` = Thursday, `5` = Friday, `6` = Saturday.

Example — Mon / Wed / Fri schedule mapped to the first three routines:

```json
"week": { "1": 0, "3": 1, "5": 2 }
```

---

## Routine

```json
{
  "name": "Push Day",
  "ex": [ ExerciseEntry ]
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | `string` | yes | Non-empty, max 80 characters |
| `ex` | `ExerciseEntry[]` | yes | 1–30 items |

---

## ExerciseEntry

```json
{
  "id": "0025",
  "sets": 4,
  "reps": 8,
  "weight": 60
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `id` | `string` | yes | Must be a valid exercise ID from the exercise database |
| `sets` | `integer` | yes | 1–10 |
| `reps` | `integer` | yes | 1–100 |
| `weight` | `number` | yes | 0–10000 (kg or lb, matches the user's unit setting). Use `0` when the weight is unknown. |

### Timed and cardio exercises

For exercises that use time instead of reps, the parser also accepts:

| Field | Type | Description |
|-------|------|-------------|
| `sec` | `number` | Work duration in seconds (for timed holds, e.g. planks) |
| `min` | `number` | Duration in minutes (for cardio) |
| `speed` | `number` | Speed in km/h (for cardio only) |

When `sec` is present, `reps` is ignored. When `min` is present, `reps` and `sec` are ignored.

---

## Full example

```json
{
  "routines": [
    {
      "name": "Push Day",
      "ex": [
        { "id": "0025", "sets": 4, "reps": 8,  "weight": 60 },
        { "id": "0047", "sets": 3, "reps": 10, "weight": 45 },
        { "id": "0426", "sets": 3, "reps": 10, "weight": 20 },
        { "id": "0334", "sets": 3, "reps": 12, "weight": 10 },
        { "id": "0241", "sets": 3, "reps": 12, "weight": 25 }
      ]
    },
    {
      "name": "Pull Day",
      "ex": [
        { "id": "2330", "sets": 4, "reps": 10, "weight": 50 },
        { "id": "0027", "sets": 4, "reps": 8,  "weight": 50 },
        { "id": "1323", "sets": 3, "reps": 10, "weight": 45 },
        { "id": "0031", "sets": 3, "reps": 10, "weight": 30 }
      ]
    },
    {
      "name": "Leg Day",
      "ex": [
        { "id": "0043", "sets": 4, "reps": 8,  "weight": 70 },
        { "id": "0085", "sets": 3, "reps": 10, "weight": 60 },
        { "id": "0739", "sets": 3, "reps": 12, "weight": 120 },
        { "id": "0605", "sets": 4, "reps": 15, "weight": 60 }
      ]
    }
  ],
  "week": { "1": 0, "3": 1, "5": 2 }
}
```

---

## Exercise IDs

Exercise IDs are four-digit zero-padded strings (e.g. `"0025"`). The app ships with a built-in exercise database. Each exercise has:

| Field | Description |
|-------|-------------|
| `id` | Unique ID, four-digit string |
| `n` | Exercise name |
| `bp` | Body part (`chest`, `back`, `waist`, `legs`, `shoulders`, `arms`, `cardio`, …) |
| `eq` | Equipment (`barbell`, `dumbbell`, `cable`, `body weight`, `machine`, …) |
| `tg` | Primary target muscle |
| `mg` | Minor muscle group |

> [!IMPORTANT]
> You must only use IDs that exist in the exercise database. An unknown ID causes the import to fail with an error. The AI plan prompt sent by the app includes a list of valid IDs to pick from.

---

## Validation rules

The app applies these checks when it imports a JSON plan. A violation throws an error and rejects the whole payload.

- `routines` must be an array with 1–7 items.
- Every routine must have a non-empty `name` string.
- Every routine must have an `ex` array with 1–30 items.
- Every exercise entry must have an `id` that exists in the exercise database.
- `sets` is clamped to 1–10 (out-of-range values are silently clamped, not rejected).
- `reps` is clamped to 1–100.
- `weight` is clamped to 0–10000.
- `week` values must be integers 0–6 (day) mapping to a valid routine index.

---

## AI prompt guidance

When you ask an AI to generate a plan, include:

1. The goal (e.g. strength, hypertrophy, fat loss).
2. The experience level (beginner / intermediate / advanced).
3. The number of training days per week.
4. Any extra context (injuries, equipment limits, preferences).

The app's built-in AI plan screen builds this prompt automatically and shows the valid exercise ID list. Paste the AI response — raw JSON only, no markdown fences — directly into the import field.
