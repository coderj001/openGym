 Performance Audit — openGym Mobile

 ### The Big Wins (high impact, safe)

 1. The monolithic state object triggers full-tree re-renders on every tap

 This is the single biggest performance problem. useStore() returns the entire S object, and every component that calls it
 re-renders on any state change — logging a set re-renders the HomeScreen calendar, the Plan tab, the Stats tab, the
 Library tab, and every bottom tab icon. The useMemo on value in StoreProvider depends on S, so every setState call
 creates a new context value and every consumer re-renders.

 Fix: Split StoreContext into selectors or separate contexts by concern (active workout vs. routines vs. settings vs.
 history). The cheapest version: a useSelector(fn) pattern using useSyncExternalStore or a ref + subscription model, so
 each component only re-renders when its slice actually changes. This is the single change that would make the biggest
 difference during a workout session, where taps happen every few seconds.

 2. structuredClone of the entire state on every mutation

 The update callback clones the full state (including every workout in history — potentially thousands of objects) via
 structuredClone, then the producer mutates it, then it's serialized to JSON for AsyncStorage. For a user with 500
 workouts, each containing 5 entries with 3-4 sets, that's cloning and serializing ~50K objects on every set toggle tap.

 Fix: Use Immer (already the mental model — the producer pattern is Immer's API) or move to a structural sharing approach.
 Immer's produce only copies the paths that change. Alternatively, separate hot state (active workout) from cold state
 (history, routines) so the clone only touches the active workout during a session.

 3. exercises-data.js is 867KB parsed at startup

 This file is a single giant array literal. It's loaded, parsed, and indexed into EXIDX (a full Object.fromEntries + map
 over ~800 exercises) on module import — blocking the JS thread during app launch.

 Fix: Ship it as a JSON asset loaded with require() (Metro handles JSON efficiently and it's already parsed by the native
 JSON parser, which is faster than the JS parser for data). Or lazy-load it: the exercise index is only needed when the
 user opens the exercise picker or starts a workout, not at app boot. A getEXIDX() lazy accessor would defer the cost.

 4. BodyMap.js is 50KB of inline SVG path data re-parsed on every render

 The PATHS constant is a deeply nested object with thousands of characters of SVG path strings. It's fine as static data,
 but Figure creates new onPress closures and style arrays on every render for every muscle group path.

 Fix: Extract Figure into React.memo (it already is a function component, just add the memo wrapper). The path data
 doesn't change; only selected, levels, and colors do. Memoizing Figure would prevent SVG re-rendering when unrelated
 state changes.

 5. exerciseMedia.js (98KB) loaded eagerly

 Maps exercise GIF filenames to require() calls. Every require(asset) in React Native registers the asset at import time.
 This runs at startup even though media is only needed when viewing an exercise.

 Fix: Lazy-load this module. Replace the top-level import with a dynamic require() inside mediaFor().

 ### Medium Wins (moderate impact, easy)

 6. FlatList in HistoryScreen and ExercisePicker lacks getItemLayout

 Without it, RN can't jump to offsets or estimate scroll position, causing layout thrashing on large lists. History can
 have hundreds of items.

 Fix: Add getItemLayout with a fixed row height estimate. Both lists already have consistent row heights.

 7. previousPerformance called per-exercise during active workout render

 When showPrevious is on, every EntryBlock calls previousPerformance, which scans all workouts looking for the last
 matching entry. With 500 workouts, that's a linear scan per exercise per render.

 Fix: Memoize previous performance per exercise ID at the ActiveWorkout level (compute once when the active workout loads,
 not on every re-render).

 8. done Set recomputed on every render in HomeScreen

 const done = useMemo(() => new Set(S.workouts.map(w => w.d)), [S.workouts]) — looks memoized, but because S.workouts is a
 new clone on every state change (from the structuredClone in update), this rebuilds on every mutation, even ones that
 don't touch workouts.

 Fix: This is a downstream symptom of problem #1/#2. Solving the selector pattern fixes it for free. Alternatively, use a
 ref-stable workout array that only changes identity when workouts actually change.

 9. The palette() function is cheap but called correctly

 The useMemo in StoreProvider correctly keys on S.theme and S.accent — this is already well-optimized. No change needed.

 10. Tab screens mounted eagerly by default

 @react-navigation/bottom-tabs mounts all tab screens on first render. Every tab's component tree runs even if the user
 never visits it.

 Fix: Set lazy: true in the tab navigator's screenOptions. This is a one-line change that defers mounting the Stats,
 Library, and Plan tabs until first visit.

 ### Low Priority (small gains or speculative)

 11. JSON.stringify for save + structuredClone = double serialization cost. If you switch to Immer, you could produce the
 next state and stringify in one pass using a custom replacer, but this is marginal.

 12. The timer interval (250ms) in TimerProvider and WorkTimer causes quarterly-second re-renders. This is intentional for
 smooth countdown display. Could use requestAnimationFrame for smoother animation with fewer React re-renders (update a
 ref, re-render only on second boundaries), but the current approach is fine.

 13. useExerciseSearch re-derives usage stats from all workouts on every render where S.workouts reference changes. Same
 downstream issue as #8 — stable references fix it.

 ### Recommended Priority Order

 ┌──────────┬────────────────────────────────────────────────────────┬───────────┬───────────────────────────────────────┐
 │ Priority │ Issue                                                  │ Effort    │ Impact                                │
 ├──────────┼────────────────────────────────────────────────────────┼───────────┼───────────────────────────────────────┤
 │ 1        │ Lazy tabs (lazy: true)                                 │ 1 line    │ Medium — faster tab switch, less      │
 │          │                                                        │           │ memory                                │
 ├──────────┼────────────────────────────────────────────────────────┼───────────┼───────────────────────────────────────┤
 │ 2        │ React.memo on BodyMap, Figure, EntryBlock, WeekView,   │ ~10 lines │ Medium — stops cascade re-renders     │
 │          │ MonthView, YearView                                    │           │                                       │
 ├──────────┼────────────────────────────────────────────────────────┼───────────┼───────────────────────────────────────┤
 │ 3        │ Lazy-load exercises-data.js + exerciseMedia.js         │ ~20 lines │ High — faster cold start              │
 ├──────────┼────────────────────────────────────────────────────────┼───────────┼───────────────────────────────────────┤
 │ 4        │ Selector pattern for store (replace useStore() →       │ ~100      │ High — eliminates most unnecessary    │
 │          │ useSelector(s => s.active))                            │ lines     │ re-renders                            │
 ├──────────┼────────────────────────────────────────────────────────┼───────────┼───────────────────────────────────────┤
 │ 5        │ Immer or surgical clone for update()                   │ ~30 lines │ High — removes O(n) clone of full     │
 │          │                                                        │           │ history on every tap                  │
 ├──────────┼────────────────────────────────────────────────────────┼───────────┼───────────────────────────────────────┤
 │ 6        │ getItemLayout on FlatLists                             │ ~10 lines │ Low-medium — smoother scrolling in    │
 │          │                                                        │           │ history                               │
 └──────────┴────────────────────────────────────────────────────────┴───────────┴───────────────────────────────────────┘

 Items 1-3 are safe, mechanical changes with zero behavior risk. Item 4 is the highest-impact single change but requires
 touching every screen. Item 5 pairs naturally with 4.
