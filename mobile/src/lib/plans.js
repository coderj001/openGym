import { starterRoutines } from './starter';
export function addStarterPlan(state) {
  const [push, pull, legs] = starterRoutines();
  state.routines.push(push, pull, legs);
  state.week[1] = push.id; state.week[3] = pull.id; state.week[5] = legs.id;
  return [push, pull, legs];
}
