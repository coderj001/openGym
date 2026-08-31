import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import Icon from '../components/Icon';
import { useStore } from '../store';
import { effectiveRoutine, lastBW, streakWeeks, workoutVolume } from '../lib/history';
import { best1RM } from '../lib/onerm';
import { EXIDX } from '../lib/exercises';
import { loadOfWorkouts, MUSCLE_NAME, rankOf } from '../lib/muscles';
import { DAYS, fmtDate, fmtNum, isoOf, todayISO, uid, weekKey } from '../lib/format';
import { addStarterPlan } from '../lib/plans';
import { t } from '../lib/i18n';
import Chart from '../components/Chart';
import { AppText, Button, Card, Chip, Header, IconButton, Input, Progress, Screen, useColors } from '../components/ui';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const heatmapEntrance = FadeIn.duration(150).easing(Easing.bezier(0.23, 1, 0.32, 1));
const HOME_WIDGETS = [
  { id: 'schedule', icon: 'calendar', title: 'Week schedule' },
  { id: 'bodyweight', icon: 'scale', title: 'Body weight' },
  { id: 'streak', icon: 'flame', title: 'Week streak' },
  { id: 'records', icon: 'trophy', title: 'Personal records' },
  { id: 'muscles', icon: 'arm-flex', title: 'Muscle balance' },
  { id: 'recent', icon: 'history', title: 'Recent workouts' },
  { id: 'volume', icon: 'chart-line', title: 'Volume trend' },
  { id: 'next', icon: 'calendar-arrow-right', title: 'Next workout' },
  { id: 'weight-change', icon: 'trending-up', title: 'Body weight change' },
];

export function homeWidgetIds(S) {
  const allowed = new Set(HOME_WIDGETS.map(widget => widget.id));
  const stored = Array.isArray(S.homeWidgets) ? S.homeWidgets : HOME_WIDGETS.map(widget => widget.id);
  return [...new Set(stored)].filter(id => allowed.has(id));
}

export function homeRecords(S) {
  return [...new Set((S.workouts || []).flatMap(workout => (workout.entries || []).map(entry => entry.id)))].map(id => ({ id, record: best1RM(S, id) })).filter(item => item.record).sort((a, b) => b.record.est - a.record.est || (b.record.d || '').localeCompare(a.record.d || '')).slice(0, 3);
}

export function nextPlannedWorkout(S, today = todayISO()) {
  const date = new Date(`${today}T12:00:00`);
  for (let offset = 1; offset <= 7; offset++) { date.setDate(date.getDate() + 1); const d = isoOf(date); const routine = effectiveRoutine(S, d); if (routine) return { d, routine }; }
  return null;
}

export function bodyWeightChange(S, now = Date.now()) {
  const dateOf = entry => entry.t || new Date(`${entry.d}T12:00:00`).getTime();
  const entries = (S.bodyweight || []).filter(entry => dateOf(entry) >= now - 30 * 86400000).sort((a, b) => dateOf(a) - dateOf(b));
  if (!entries.length) return null;
  const current = entries.at(-1);
  return { current, delta: entries.length > 1 ? current.w - entries[0].w : null };
}

// -- Week view (existing) --
const WeekView = React.memo(function WeekView({ weekDays, today, done, S, colors, setOverrideDay, highlightDate }) {
  return (
    <View style={styles.week}>
      {weekDays.map(({ date, iso }) => {
        const planned = effectiveRoutine(S, iso);
        return (
          <Pressable key={iso} onPress={() => setOverrideDay(iso)} style={styles.day}>
            <AppText muted style={{ fontSize: 11 }}>{t(DAYS[date.getDay()])}</AppText>
            <View style={[styles.dayNumber, iso === today && { backgroundColor: colors.accent }]}>
              <AppText style={{ fontWeight: '800', color: iso === today && !colors.dark ? '#000' : colors.text }}>{date.getDate()}</AppText>
            </View>
            <Animated.View key={iso === highlightDate ? `highlight-${iso}` : iso} entering={iso === highlightDate ? heatmapEntrance : undefined} style={[styles.dot, { backgroundColor: done.has(iso) ? colors.orange : planned ? colors.accent : colors.surface2 }]} />
          </Pressable>
        );
      })}
    </View>
  );
});

// -- Month view --
const MonthView = React.memo(function MonthView({ today, done, colors, highlightDate }) {
  const ref = new Date(`${today}T12:00:00`);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthWorkoutCount = useMemo(() => [...done].filter(d => d.startsWith(monthPrefix)).length, [done, monthPrefix]);
  // days in month grid, starting Monday
  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // 0=Mon
    const total = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [year, month]);

  return (
    <View>
      <View style={styles.monthHeader}>
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
          <AppText key={d} muted style={styles.monthDayLabel}>{d}</AppText>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {days.map((date, i) => {
          if (!date) return <View key={`e${i}`} style={styles.monthCell} />;
          const iso = isoOf(date);
          const isToday = iso === today;
          const worked = done.has(iso);
          return (
            <View key={iso} style={styles.monthCell}>
              <Animated.View key={iso === highlightDate ? `highlight-${iso}` : iso} entering={iso === highlightDate ? heatmapEntrance : undefined} style={[
                styles.monthDot,
                worked && { backgroundColor: colors.orange },
                isToday && !worked && { backgroundColor: colors.accent },
              ]}>
                <AppText style={[
                  { fontSize: 11, fontWeight: '600' },
                  { color: (worked || isToday) ? (colors.dark ? '#fff' : '#000') : colors.muted },
                ]}>{date.getDate()}</AppText>
              </Animated.View>
            </View>
          );
        })}
      </View>
      <AppText muted style={{ fontSize: 12, textAlign: 'center', marginTop: 6 }}>
        {MONTH_NAMES[month]} {year} · {monthWorkoutCount} {t('workouts')}
      </AppText>
    </View>
  );
});

// -- Year view --
const YearView = React.memo(function YearView({ today, done, colors, highlightDate }) {
  const year = new Date(`${today}T12:00:00`).getFullYear();
  const countPerDay = useMemo(() => {
    const map = {};
    done.forEach(iso => { if (iso.startsWith(year)) map[iso] = (map[iso] || 0) + 1; });
    return map;
  }, [done, year]);

  return (
    <View style={styles.yearGrid}>
      {MONTH_NAMES.map((name, mi) => {
        const daysInMonth = new Date(year, mi + 1, 0).getDate();
        return (
          <View key={name} style={styles.yearMonth}>
            <AppText muted style={{ fontSize: 10, fontWeight: '700', marginBottom: 3 }}>{name}</AppText>
            <View style={styles.yearDots}>
              {Array.from({ length: daysInMonth }, (_, d) => {
                const iso = `${year}-${String(mi + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`;
                const worked = !!countPerDay[iso];
                const isToday = iso === today;
                return (
                  <Animated.View key={iso === highlightDate ? `highlight-${iso}` : iso} entering={iso === highlightDate ? heatmapEntrance : undefined} style={[
                    styles.yearDot,
                    worked && { backgroundColor: colors.orange },
                    isToday && !worked && { backgroundColor: colors.accent },
                    !worked && !isToday && { backgroundColor: colors.surface2 },
                  ]} />
                );
              })}
            </View>
          </View>
        );
      })}
      <AppText muted style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
        {year} · {Object.keys(countPerDay).length} {t('workout days')}
      </AppText>
    </View>
  );
});

export default function HomeScreen({ navigation, route }) {
  const { S, update } = useStore(); const colors = useColors();
  const [weightOpen, setWeightOpen] = useState(false);
  const [highlightDate, setHighlightDate] = useState(null);
  useEffect(() => { if (route.params?.highlightDate) { setHighlightDate(route.params.highlightDate); navigation.setParams({ highlightDate: undefined }); } }, [navigation, route.params?.highlightDate]);
  useEffect(() => { if (!highlightDate) return undefined; const timeout = setTimeout(() => setHighlightDate(null), 200); return () => clearTimeout(timeout); }, [highlightDate]);
  const [goalOpen, setGoalOpen] = useState(false);
  const [value, setValue] = useState('');
  const [overrideDay, setOverrideDay] = useState(null);
  const [calView, setCalView] = useState('week'); // 'week' | 'month' | 'year'
  const [editHome, setEditHome] = useState(false);
  const today = todayISO(); const routine = effectiveRoutine(S, today); const bw = lastBW(S);
  const weekDays = useMemo(() => { const date = new Date(); const monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, index) => { const item = new Date(monday); item.setDate(monday.getDate() + index); return { date: item, iso: isoOf(item) }; }); }, [today]);
  const done = useMemo(() => new Set(S.workouts.map(w => w.d)), [S.workouts]);
  const weekCount = useMemo(() => S.workouts.filter(w => weekKey(w.d) === weekKey(today)).length, [S.workouts, today]);
  const records = useMemo(() => homeRecords(S), [S.workouts]);
  const muscleLoad = useMemo(() => loadOfWorkouts(S.workouts.slice(-12)), [S.workouts]); const muscleBalance = useMemo(() => rankOf(muscleLoad), [muscleLoad]); const maxMuscleLoad = muscleBalance.worked.length ? muscleLoad[muscleBalance.worked[0]] : 1;
  const recentWorkouts = useMemo(() => [...S.workouts].reverse().slice(0, 3), [S.workouts]);
  const volumePoints = useMemo(() => S.workouts.slice(-8).map(workout => ({ y: workoutVolume(workout) })), [S.workouts]);
  const nextWorkout = useMemo(() => nextPlannedWorkout(S, today), [S.routines, S.week, S.dayPlan, today]);
  const weightChange = useMemo(() => bodyWeightChange(S), [S.bodyweight]);
  const openWeight = goal => { const current = goal ? S.targetW : bw?.w; setValue(String(current || (S.unit === 'kg' ? 75 : 165))); goal ? setGoalOpen(true) : setWeightOpen(true); };
  const saveWeight = goal => { const number = Number(value.replace(',', '.')); if (!(number > 0)) return; update(state => { if (goal) state.targetW = number; else { const current = state.bodyweight.find(item => item.d === today); if (current) { current.w = number; current.t = Date.now(); } else state.bodyweight.push({ id: uid(), d: today, t: Date.now(), w: number }); } }); goal ? setGoalOpen(false) : setWeightOpen(false); };
  const start = () => navigation.navigate('Workout', { routineId: routine?.id || null, requestStart: Date.now() });
  const visibleWidgets = homeWidgetIds(S);
  const toggleWidget = id => update(state => { const widgets = homeWidgetIds(state); state.homeWidgets = widgets.includes(id) ? widgets.filter(item => item !== id) : [...widgets, id]; });
  const moveWidget = (id, direction) => update(state => { const widgets = homeWidgetIds(state); const at = widgets.indexOf(id); const next = at + direction; if (at < 0 || next < 0 || next >= widgets.length) return; [widgets[at], widgets[next]] = [widgets[next], widgets[at]]; state.homeWidgets = widgets; });
  const widgetCards = {
    schedule: <Card><View style={styles.calHeader}><AppText style={{ fontWeight: '700' }}>{calView === 'week' ? t('This week') : calView === 'month' ? MONTH_NAMES[new Date().getMonth()] + ' ' + new Date().getFullYear() : String(new Date().getFullYear())}</AppText><View style={styles.calTabs}>{['week','month','year'].map(v => <Pressable key={v} onPress={() => setCalView(v)} style={[styles.calTab, calView === v && { backgroundColor: colors.accent }]}><AppText style={{ fontSize: 12, fontWeight: '700', color: calView === v ? (colors.dark ? '#fff' : '#000') : colors.muted }}>{v === 'week' ? t('W') : v === 'month' ? t('M') : t('Y')}</AppText></Pressable>)}</View></View>{calView === 'week' && <WeekView weekDays={weekDays} today={today} done={done} S={S} colors={colors} setOverrideDay={setOverrideDay} highlightDate={highlightDate} />}{calView === 'month' && <MonthView today={today} done={done} colors={colors} highlightDate={highlightDate} />}{calView === 'year' && <YearView today={today} done={done} colors={colors} highlightDate={highlightDate} />}<Pressable onPress={S.active ? () => navigation.navigate('Workout') : start} style={[styles.today, { borderTopColor: colors.border }]}><View style={[styles.bigIcon, { backgroundColor: S.active ? colors.orange : routine ? colors.accent : colors.surface2 }]}><Icon name={S.active ? 'timer-outline' : routine ? 'dumbbell' : 'weather-night'} size={23} color={routine || S.active ? '#fff' : colors.muted} /></View><View style={{ flex: 1 }}><AppText muted style={{ fontSize: 12 }}>{t('Today')}</AppText><AppText style={{ fontWeight: '800' }}>{S.active ? `${S.active.name} — ${t('in progress')}` : routine?.name || t('Rest day')}</AppText></View><AppText style={{ color: colors.accent, fontWeight: '800' }}>{S.active ? t('Resume') : routine ? t('Start') : '+'}</AppText></Pressable></Card>,
    bodyweight: <Card><View style={styles.between}><AppText style={{ fontSize: 20, fontWeight: '800' }}>{t('Body weight')}</AppText><View style={{ flexDirection: 'row', gap: 8 }}><Button compact title={S.targetW ? fmtNum(S.targetW) : t('Goal')} onPress={() => openWeight(true)} /><Button compact title={t('Log')} icon="plus" onPress={() => openWeight(false)} /></View></View>{bw ? <><AppText style={{ fontSize: 30, fontWeight: '800', marginTop: 10 }}>{fmtNum(bw.w)} <AppText muted>{S.unit}</AppText></AppText><AppText dim style={{ fontSize: 12 }}>{fmtDate(bw.d, true)}{S.targetW ? ` · ${t('Goal')} ${fmtNum(S.targetW)} ${S.unit}` : ''}</AppText><Chart points={S.bodyweight.slice(-30).map(item => ({ y: item.w }))} unit={S.unit} height={120} /></> : <AppText muted style={{ marginTop: 12 }}>{t('No entries yet — log your weight to start the curve.')}</AppText>}</Card>,
    streak: <Card><View style={styles.between}><View><AppText style={{ fontSize: 21, fontWeight: '800' }}>🔥 {t('{0} week streak', streakWeeks(S))}</AppText><AppText muted style={{ marginTop: 4 }}>{weekCount} {t('this week')} · {t('{0} workouts total', S.workouts.length)}</AppText></View><Icon name="calendar-month" size={28} color={colors.muted} /></View></Card>,
    records: <Pressable accessibilityRole="button" accessibilityLabel={t('View exercise progress')} onPress={() => navigation.navigate('Stats')}><Card><View style={styles.between}><AppText style={styles.cardTitle}>{t('Personal records')}</AppText><Icon name="trophy" size={24} color={colors.accent} /></View>{records.length ? records.map(({ id, record }) => <View key={id} style={[styles.recordRow, { borderTopColor: colors.border }]}><View style={{ flex: 1 }}><AppText style={{ fontWeight: '800' }}>{EXIDX[id]?.n || t('Unknown exercise')}</AppText><AppText muted style={{ fontSize: 12 }}>{fmtNum(record.w)} × {record.r} · {fmtDate(record.d, true)}</AppText></View><AppText style={{ color: colors.accent, fontWeight: '800' }}>{fmtNum(record.est)} {S.unit}</AppText></View>) : <AppText muted style={{ marginTop: 10 }}>{t('Finish reps-based sets to start tracking records.')}</AppText>}</Card></Pressable>,
    muscles: <Pressable accessibilityRole="button" accessibilityLabel={t('View muscle balance')} onPress={() => navigation.navigate('Stats')}><Card><View style={styles.between}><View><AppText style={styles.cardTitle}>{t('Muscle balance')}</AppText><AppText muted style={{ fontSize: 12 }}>{t('Last 12 workouts · by sets worked')}</AppText></View><Icon name="arm-flex" size={25} color={colors.accent} /></View>{muscleBalance.worked.length ? <View style={styles.muscleList}>{muscleBalance.worked.slice(0, 4).map(muscle => <View key={muscle} style={styles.muscleRow}><AppText style={{ width: 88, fontSize: 13 }}>{t(MUSCLE_NAME[muscle])}</AppText><View style={{ flex: 1 }}><Progress value={muscleLoad[muscle] / maxMuscleLoad} /></View><AppText muted style={{ width: 28, textAlign: 'right', fontSize: 12 }}>{fmtNum(muscleLoad[muscle])}</AppText></View>)}</View> : <AppText muted style={{ marginTop: 10 }}>{t('Finish a workout to see your training balance.')}</AppText>}</Card></Pressable>,
    recent: <Card><View style={styles.between}><AppText style={styles.cardTitle}>{t('Recent workouts')}</AppText><Icon name="history" size={24} color={colors.accent} /></View>{recentWorkouts.length ? recentWorkouts.map(workout => <Pressable key={workout.id} accessibilityRole="button" accessibilityLabel={`${workout.name}, ${fmtDate(workout.d, true)}`} onPress={() => navigation.navigate('History', { workoutId: workout.id })} style={({ pressed }) => [styles.recentRow, { borderTopColor: colors.border, opacity: pressed ? .6 : 1 }]}><View style={{ flex: 1 }}><AppText style={{ fontWeight: '800' }}>{workout.name}</AppText><AppText muted style={{ fontSize: 12 }}>{fmtDate(workout.d, true)} · {workout.entries.length} {t('exercises')}</AppText></View><AppText style={{ color: colors.accent, fontWeight: '800' }}>{fmtNum(workoutVolume(workout))} {S.unit}</AppText><Icon name="chevron-right" size={18} color={colors.muted} /></Pressable>) : <AppText muted style={{ marginTop: 10 }}>{t('Your finished workouts will appear here.')}</AppText>}</Card>,
    volume: <Pressable accessibilityRole="button" accessibilityLabel={t('View volume progress')} onPress={() => navigation.navigate('Stats')}><Card><View style={styles.between}><View><AppText style={styles.cardTitle}>{t('Volume trend')}</AppText><AppText muted style={{ fontSize: 12 }}>{t('Last 8 workouts')}</AppText></View><Icon name="chart-line" size={24} color={colors.accent} /></View>{volumePoints.length ? <><Chart points={volumePoints} unit={S.unit} height={90} /><AppText muted style={{ fontSize: 12 }}>{t('Latest')}: {fmtNum(volumePoints[volumePoints.length - 1].y)} {S.unit}</AppText></> : <AppText muted style={{ marginTop: 10 }}>{t('Finish a workout to track your training volume.')}</AppText>}</Card></Pressable>,
    next: <Card><View style={styles.between}><View><AppText style={styles.cardTitle}>{t('Next workout')}</AppText><AppText muted style={{ fontSize: 12 }}>{nextWorkout ? fmtDate(nextWorkout.d, true) : t('No workout scheduled')}</AppText></View><Icon name="calendar-arrow-right" size={24} color={colors.accent} /></View>{nextWorkout ? <View style={[styles.nextRow, { borderTopColor: colors.border }]}><View style={{ flex: 1 }}><AppText style={{ fontWeight: '800' }}>{nextWorkout.routine.name}</AppText><AppText muted style={{ fontSize: 12 }}>{nextWorkout.routine.ex.length} {t('exercises')}</AppText></View><Button compact primary title={t('Start')} onPress={() => navigation.navigate('Workout', { routineId: nextWorkout.routine.id, requestStart: Date.now() })} /></View> : <Button compact title={t('Plan workouts')} onPress={() => navigation.navigate('Plan')} />}</Card>,
    'weight-change': <Pressable accessibilityRole="button" accessibilityLabel={t('View body weight progress')} onPress={() => navigation.navigate('Stats')}><Card><View style={styles.between}><View><AppText style={styles.cardTitle}>{t('Body weight change')}</AppText><AppText muted style={{ fontSize: 12 }}>{t('Last 30 days')}</AppText></View><Icon name="trending-up" size={24} color={colors.accent} /></View>{weightChange ? weightChange.delta == null ? <AppText muted style={{ marginTop: 12 }}>{t('Log another weigh-in to see your change.')}</AppText> : <View style={styles.changeRow}><View><AppText style={{ fontSize: 30, fontWeight: '800', color: colors.accent }}>{weightChange.delta > 0 ? '+' : ''}{fmtNum(weightChange.delta)} {S.unit}</AppText><AppText muted style={{ fontSize: 12 }}>{fmtNum(weightChange.current.w)} {S.unit} · {fmtDate(weightChange.current.d, true)}</AppText></View><Icon name={weightChange.delta > 0 ? 'trending-up' : weightChange.delta < 0 ? 'trending-down' : 'minus'} size={30} color={colors.accent} /></View> : <AppText muted style={{ marginTop: 12 }}>{t('Log your body weight to start tracking change.')}</AppText>}</Card></Pressable>,
  };
  const welcome = !S.routines.length && !S.active ? <Card><AppText style={{ fontSize: 22, fontWeight: '800' }}>{t('Welcome!')}</AppText><AppText muted style={{ lineHeight: 21, marginVertical: 8 }}>{t('Set up your weekly routine to get going — or load a ready-made Push / Pull / Legs plan.')}</AppText><Button title={t('Load starter plan (PPL)')} icon="creation" primary onPress={() => update(addStarterPlan)} /><View style={{ height: 8 }} /><Button title={t('Build my own plan')} onPress={() => navigation.navigate('Plan')} /></Card> : null;
  return <Screen>
    <Header title="openGym" subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} right={<View style={styles.headerActions}><IconButton name="pencil" onPress={() => setEditHome(true)} accessibilityLabel={`${t('Edit')} ${t('Home')}`} /><IconButton name="cog" onPress={() => navigation.navigate('Settings')} accessibilityLabel={t('Settings')} /></View>} />
    {visibleWidgets.map(id => <React.Fragment key={id}>{widgetCards[id]}{id === 'schedule' ? welcome : null}</React.Fragment>)}
    {!visibleWidgets.includes('schedule') ? welcome : null}
    <Modal transparent visible={!!overrideDay} animationType="fade" onRequestClose={() => setOverrideDay(null)}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.surface }]}><AppText style={{ fontSize: 21, fontWeight: '800' }}>{overrideDay ? fmtDate(overrideDay, true) : ''}</AppText><Button title={t('Use weekly schedule')} onPress={() => { update(state => { delete state.dayPlan[overrideDay]; }); setOverrideDay(null); }} /><Button title={t('Rest day')} onPress={() => { update(state => { state.dayPlan[overrideDay] = 'rest'; }); setOverrideDay(null); }} />{S.routines.map(item => <Button key={item.id} title={item.name} onPress={() => { update(state => { state.dayPlan[overrideDay] = item.id; }); setOverrideDay(null); }} />)}<Button title={t('Cancel')} onPress={() => setOverrideDay(null)} /></View></View></Modal>
    <WeightModal visible={weightOpen} title={t('Log body weight')} value={value} setValue={setValue} unit={S.unit} close={() => setWeightOpen(false)} save={() => saveWeight(false)} />
    <WeightModal visible={goalOpen} title={t('Body weight goal')} value={value} setValue={setValue} unit={S.unit} close={() => setGoalOpen(false)} save={() => saveWeight(true)} />
    <HomeEditor visible={editHome} close={() => setEditHome(false)} widgetIds={visibleWidgets} toggleWidget={toggleWidget} moveWidget={moveWidget} />
  </Screen>;
}
function WeightModal({ visible, title, value, setValue, unit, close, save }) { const colors = useColors(); return <Modal transparent visible={visible} animationType="fade" onRequestClose={close}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.surface }]}><AppText style={{ fontSize: 21, fontWeight: '800' }}>{title}</AppText><Input autoFocus keyboardType="decimal-pad" value={value} onChangeText={setValue} /><AppText muted>{unit}</AppText><Button title={t('Save')} primary onPress={save} /><Button title={t('Cancel')} onPress={close} /></View></View></Modal>; }
function HomeEditor({ visible, close, widgetIds, toggleWidget, moveWidget }) {
  const colors = useColors(); const widgets = [...widgetIds, ...HOME_WIDGETS.map(widget => widget.id).filter(id => !widgetIds.includes(id))];
  return <Modal visible={visible} animationType="slide" onRequestClose={close}><Screen><Header title={`${t('Edit')} ${t('Home')}`} left={<IconButton name="close" onPress={close} />} />{widgets.map(id => { const widget = HOME_WIDGETS.find(item => item.id === id); const shown = widgetIds.includes(id); const position = widgetIds.indexOf(id); return <View key={id} style={[styles.widgetRow, { borderBottomColor: colors.border }]}><Pressable accessibilityRole="checkbox" accessibilityLabel={t(widget.title)} accessibilityState={{ checked: shown }} onPress={() => toggleWidget(id)} style={({ pressed }) => [styles.widgetToggle, { opacity: pressed ? .6 : 1 }]}><View style={[styles.widgetIcon, { backgroundColor: colors.surface2 }]}><Icon name={widget.icon} size={20} color={colors.accent} /></View><AppText style={{ flex: 1, fontWeight: '700' }}>{t(widget.title)}</AppText><Icon name={shown ? 'check-circle' : 'checkbox-blank-circle-outline'} size={23} color={shown ? colors.accent : colors.dim} /></Pressable><View style={styles.widgetActions}><IconButton name="arrowUp" disabled={!shown || position === 0} onPress={() => moveWidget(id, -1)} accessibilityLabel={t('Previous')} /><IconButton name="arrowDown" disabled={!shown || position === widgetIds.length - 1} onPress={() => moveWidget(id, 1)} accessibilityLabel={t('Next')} /></View></View>; })}</Screen></Modal>;
}
const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 5 },
  dayNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  today: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 12 },
  bigIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 20, fontWeight: '800' },
  recordRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  muscleList: { gap: 8, marginTop: 14 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  recentRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8 },
  nextRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 10 },
  changeRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  headerActions: { flexDirection: 'row', gap: 8 },
  widgetRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  widgetToggle: { minHeight: 52, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  widgetIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  widgetActions: { flexDirection: 'row', gap: 4 },
  overlay: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 18, padding: 18, gap: 12 },
  // calendar toggle header
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calTabs: { flexDirection: 'row', gap: 4 },
  calTab: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  // month grid
  monthHeader: { flexDirection: 'row', marginBottom: 4 },
  monthDayLabel: { flex: 1, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '14.28%', alignItems: 'center', paddingVertical: 2 },
  monthDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  // year heatmap
  yearGrid: { gap: 8 },
  yearMonth: {},
  yearDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  yearDot: { width: 7, height: 7, borderRadius: 2 },
});
