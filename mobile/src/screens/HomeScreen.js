import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Icon from '../components/Icon';
import { useStoreActions, useStoreSelector } from '../store';
import { effectiveRoutine, lastBW, streakWeeks, workoutVolume } from '../lib/history';
import { best1RM } from '../lib/onerm';
import { loadOfWorkouts, rankOf } from '../lib/muscles';
import { fmtDate, isoOf, todayISO, uid, weekKey } from '../lib/format';
import { addStarterPlan } from '../lib/plans';
import { t } from '../lib/i18n';
import { AppText, Button, Card, Header, IconButton, Screen, useColors } from '../components/ui';

import ScheduleCard from './home/ScheduleCard';
import BodyweightCard from './home/BodyweightCard';
import StreakCard from './home/StreakCard';
import RecordsCard from './home/RecordsCard';
import MusclesCard from './home/MusclesCard';
import RecentCard from './home/RecentCard';
import VolumeCard from './home/VolumeCard';
import NextCard from './home/NextCard';
import WeightChangeCard from './home/WeightChangeCard';
import WeightModal from './home/WeightModal';
import HomeEditor from './home/HomeEditor';

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
  return [...new Set((S.workouts || []).flatMap(workout => (workout.entries || []).map(entry => entry.id)))]
    .map(id => ({ id, record: best1RM(S, id) }))
    .filter(item => item.record)
    .sort((a, b) => b.record.est - a.record.est || (b.record.d || '').localeCompare(a.record.d || ''))
    .slice(0, 3);
}

export function nextPlannedWorkout(S, today = todayISO()) {
  const date = new Date(`${today}T12:00:00`);
  for (let offset = 1; offset <= 7; offset++) {
    date.setDate(date.getDate() + 1);
    const d = isoOf(date);
    const routine = effectiveRoutine(S, d);
    if (routine) return { d, routine };
  }
  return null;
}

export function bodyWeightChange(S, now = Date.now()) {
  const dateOf = entry => entry.t || new Date(`${entry.d}T12:00:00`).getTime();
  const entries = (S.bodyweight || [])
    .filter(entry => dateOf(entry) >= now - 30 * 86400000)
    .sort((a, b) => dateOf(a) - dateOf(b));
  if (!entries.length) return null;
  const current = entries.at(-1);
  return { current, delta: entries.length > 1 ? current.w - entries[0].w : null };
}

export default function HomeScreen({ navigation, route }) {
  const S = useStoreSelector(state => ({
    routines: state.routines,
    activeName: state.active?.name || null,
    bodyweight: state.bodyweight,
    workouts: state.workouts,
    week: state.week,
    dayPlan: state.dayPlan,
    unit: state.unit,
    targetW: state.targetW,
    body: state.body,
    homeWidgets: state.homeWidgets,
  }));
  const { update } = useStoreActions();
  const colors = useColors();

  const [weightOpen, setWeightOpen] = useState(false);
  const [highlightDate, setHighlightDate] = useState(null);

  useEffect(() => {
    if (route.params?.highlightDate) {
      setHighlightDate(route.params.highlightDate);
      navigation.setParams({ highlightDate: undefined });
    }
  }, [navigation, route.params?.highlightDate]);

  useEffect(() => {
    if (!highlightDate) return undefined;
    const timeout = setTimeout(() => setHighlightDate(null), 200);
    return () => clearTimeout(timeout);
  }, [highlightDate]);

  const [goalOpen, setGoalOpen] = useState(false);
  const [value, setValue] = useState('');
  const [overrideDay, setOverrideDay] = useState(null);
  const [calView, setCalView] = useState('week'); // 'week' | 'month' | 'year'
  const [editHome, setEditHome] = useState(false);

  const today = todayISO();
  const routine = effectiveRoutine(S, today);
  const bw = lastBW(S);
  const visibleWidgets = homeWidgetIds(S);

  const weekDays = useMemo(() => {
    const date = new Date();
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const item = new Date(monday);
      item.setDate(monday.getDate() + index);
      return { date: item, iso: isoOf(item) };
    });
  }, [today]);

  const done = useMemo(() => new Set(S.workouts.map(w => w.d)), [S.workouts]);

  const weekCount = useMemo(
    () => S.workouts.filter(w => weekKey(w.d) === weekKey(today)).length,
    [S.workouts, today]
  );

  const records = useMemo(
    () => (visibleWidgets.includes('records') ? homeRecords(S) : []),
    [S.workouts, visibleWidgets.includes('records')]
  );

  const muscleLoad = useMemo(
    () => (visibleWidgets.includes('muscles') ? loadOfWorkouts(S.workouts.slice(-12)) : {}),
    [S.workouts, visibleWidgets.includes('muscles')]
  );

  const muscleBalance = useMemo(() => rankOf(muscleLoad), [muscleLoad]);
  const maxMuscleLoad = muscleBalance.worked.length ? muscleLoad[muscleBalance.worked[0]] : 1;

  const recentWorkouts = useMemo(
    () => (visibleWidgets.includes('recent') ? S.workouts.slice(-3).reverse() : []),
    [S.workouts, visibleWidgets.includes('recent')]
  );

  const volumePoints = useMemo(
    () => (visibleWidgets.includes('volume') ? S.workouts.slice(-8).map(workout => ({ y: workoutVolume(workout) })) : []),
    [S.workouts, visibleWidgets.includes('volume')]
  );

  const nextWorkout = useMemo(
    () => (visibleWidgets.includes('next') ? nextPlannedWorkout(S, today) : null),
    [S.routines, S.week, S.dayPlan, today, visibleWidgets.includes('next')]
  );

  const weightChange = useMemo(
    () => (visibleWidgets.includes('weight-change') ? bodyWeightChange(S) : null),
    [S.bodyweight, visibleWidgets.includes('weight-change')]
  );

  const streak = useMemo(
    () => (visibleWidgets.includes('streak') ? streakWeeks(S) : 0),
    [S.workouts, visibleWidgets.includes('streak')]
  );

  const openWeight = goal => {
    const current = goal ? S.targetW : bw?.w;
    setValue(String(current || (S.unit === 'kg' ? 75 : 165)));
    if (goal) {
      setGoalOpen(true);
    } else {
      setWeightOpen(true);
    }
  };

  const saveWeight = goal => {
    const number = Number(value.replace(',', '.'));
    if (!(number > 0)) return;
    update(state => {
      if (goal) {
        state.targetW = number;
      } else {
        const current = state.bodyweight.find(item => item.d === today);
        if (current) {
          current.w = number;
          current.t = Date.now();
        } else {
          state.bodyweight.push({ id: uid(), d: today, t: Date.now(), w: number });
        }
      }
    });
    if (goal) {
      setGoalOpen(false);
    } else {
      setWeightOpen(false);
    }
  };

  const start = () => navigation.navigate('Workout', { routineId: routine?.id || null, requestStart: Date.now() });

  const toggleWidget = id => update(state => {
    const widgets = homeWidgetIds(state);
    state.homeWidgets = widgets.includes(id) ? widgets.filter(item => item !== id) : [...widgets, id];
  });

  const moveWidget = (id, direction) => update(state => {
    const widgets = homeWidgetIds(state);
    const at = widgets.indexOf(id);
    const next = at + direction;
    if (at < 0 || next < 0 || next >= widgets.length) return;
    [widgets[at], widgets[next]] = [widgets[next], widgets[at]];
    state.homeWidgets = widgets;
  });

  const renderWidget = id => {
    switch (id) {
      case 'schedule':
        return (
          <ScheduleCard
            calView={calView}
            setCalView={setCalView}
            weekDays={weekDays}
            today={today}
            done={done}
            S={S}
            colors={colors}
            setOverrideDay={setOverrideDay}
            highlightDate={highlightDate}
          />
        );
      case 'bodyweight':
        return (
          <BodyweightCard
            bw={bw}
            targetW={S.targetW}
            unit={S.unit}
            bodyweight={S.bodyweight}
            openWeight={openWeight}
          />
        );
      case 'streak':
        return (
          <StreakCard
            streak={streak}
            weekCount={weekCount}
            totalWorkouts={S.workouts.length}
            colors={colors}
          />
        );
      case 'records':
        return (
          <RecordsCard
            records={records}
            unit={S.unit}
            colors={colors}
            onPress={() => navigation.navigate('Stats')}
          />
        );
      case 'muscles':
        return (
          <MusclesCard
            muscleBalance={muscleBalance}
            muscleLoad={muscleLoad}
            maxMuscleLoad={maxMuscleLoad}
            colors={colors}
            onPress={() => navigation.navigate('Stats')}
          />
        );
      case 'recent':
        return (
          <RecentCard
            recentWorkouts={recentWorkouts}
            unit={S.unit}
            colors={colors}
            onSelectWorkout={workoutId => navigation.navigate('History', { workoutId })}
          />
        );
      case 'volume':
        return (
          <VolumeCard
            volumePoints={volumePoints}
            unit={S.unit}
            colors={colors}
            onPress={() => navigation.navigate('Stats')}
          />
        );
      case 'next':
        return (
          <NextCard
            nextWorkout={nextWorkout}
            colors={colors}
            onStart={routineId => navigation.navigate('Workout', { routineId, requestStart: Date.now() })}
            onPlan={() => navigation.navigate('Plan')}
          />
        );
      case 'weight-change':
        return (
          <WeightChangeCard
            weightChange={weightChange}
            unit={S.unit}
            colors={colors}
            onPress={() => navigation.navigate('Stats')}
          />
        );
      default:
        return null;
    }
  };

  const welcome = !S.routines.length && !S.activeName ? (
    <Card>
      <AppText style={{ fontSize: 22, fontWeight: '800' }}>{t('Welcome!')}</AppText>
      <AppText muted style={{ lineHeight: 21, marginVertical: 8 }}>
        {t('Set up your weekly routine to get going — or load a ready-made Push / Pull / Legs plan.')}
      </AppText>
      <Button title={t('Load starter plan (PPL)')} icon="creation" primary onPress={() => update(addStarterPlan)} />
      <View style={{ height: 8 }} />
      <Button title={t('Build my own plan')} onPress={() => navigation.navigate('Plan')} />
    </Card>
  ) : null;

  const todayButton = (
    <Card style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={S.activeName ? t('Resume workout') : routine ? t('Start workout') : t('Rest day')}
        onPress={S.activeName ? () => navigation.navigate('Workout') : start}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.6 : 1 }]}
      >
        <View
          style={[
            styles.bigIcon,
            { backgroundColor: S.activeName ? colors.orange : routine ? colors.accent : colors.surface2 },
          ]}
        >
          <Icon
            name={S.activeName ? 'timer-outline' : routine ? 'dumbbell' : 'weather-night'}
            size={23}
            color={routine || S.activeName ? '#fff' : colors.muted}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppText muted style={{ fontSize: 12 }}>{t('Today')}</AppText>
          <AppText style={{ fontWeight: '800' }}>
            {S.activeName ? `${S.activeName} — ${t('in progress')}` : routine?.name || t('Rest day')}
          </AppText>
        </View>
        <AppText style={{ color: colors.accent, fontWeight: '800' }}>
          {S.activeName ? t('Resume') : routine ? t('Start') : '+'}
        </AppText>
      </Pressable>
    </Card>
  );

  return (
    <Screen>
      <Header
        title="openGym"
        subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        right={
          <View style={styles.headerActions}>
            <IconButton name="pencil" onPress={() => setEditHome(true)} accessibilityLabel={`${t('Edit')} ${t('Home')}`} />
            <IconButton name="cog" onPress={() => navigation.navigate('Settings')} accessibilityLabel={t('Settings')} />
          </View>
        }
      />
      {todayButton}
      {visibleWidgets.map(id => (
        <React.Fragment key={id}>
          {renderWidget(id)}
          {id === 'schedule' ? welcome : null}
        </React.Fragment>
      ))}
      {!visibleWidgets.includes('schedule') ? welcome : null}
      <Modal transparent visible={!!overrideDay} animationType="fade" onRequestClose={() => setOverrideDay(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <AppText style={{ fontSize: 21, fontWeight: '800' }}>{overrideDay ? fmtDate(overrideDay, true) : ''}</AppText>
            <Button
              title={t('Use weekly schedule')}
              onPress={() => {
                update(state => {
                  delete state.dayPlan[overrideDay];
                });
                setOverrideDay(null);
              }}
            />
            <Button
              title={t('Rest day')}
              onPress={() => {
                update(state => {
                  state.dayPlan[overrideDay] = 'rest';
                });
                setOverrideDay(null);
              }}
            />
            {S.routines.map(item => (
              <Button
                key={item.id}
                title={item.name}
                onPress={() => {
                  update(state => {
                    state.dayPlan[overrideDay] = item.id;
                  });
                  setOverrideDay(null);
                }}
              />
            ))}
            <Button title={t('Cancel')} onPress={() => setOverrideDay(null)} />
          </View>
        </View>
      </Modal>
      <WeightModal
        visible={weightOpen}
        title={t('Log body weight')}
        value={value}
        setValue={setValue}
        unit={S.unit}
        close={() => setWeightOpen(false)}
        save={() => saveWeight(false)}
      />
      <WeightModal
        visible={goalOpen}
        title={t('Body weight goal')}
        value={value}
        setValue={setValue}
        unit={S.unit}
        close={() => setGoalOpen(false)}
        save={() => saveWeight(true)}
      />
      <HomeEditor
        visible={editHome}
        close={() => setEditHome(false)}
        widgetIds={visibleWidgets}
        toggleWidget={toggleWidget}
        moveWidget={moveWidget}
        homeWidgets={HOME_WIDGETS}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  overlay: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 18, padding: 18, gap: 12 },
});
