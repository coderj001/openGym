import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useStore } from '../store';
import { exOr } from '../lib/exercises';
import { fmtDate, fmtDur, fmtMonth, fmtNum } from '../lib/format';
import { advancedSetsSummary, filterWorkouts, historyMonths, setLabel, workoutVolume } from '../lib/history';
import { t } from '../lib/i18n';
import { levelsOf, loadOfWorkouts } from '../lib/muscles';
import BodyMap from '../components/BodyMap';
import { AppText, Button, Card, Chip, Header, IconButton, Screen, SectionTitle, useColors } from '../components/ui';

export default function HistoryScreen({ navigation, route }) {
  const { S, update } = useStore();
  const colors = useColors();
  const [selected, setSelected] = useState(null);
  const [month, setMonth] = useState(() => S.workouts[S.workouts.length - 1]?.d.slice(0, 7) || null);
  const [routine, setRoutine] = useState(null);
  const workouts = useMemo(() => [...S.workouts].reverse(), [S.workouts]);
  const months = useMemo(() => historyMonths(workouts), [workouts]);
  const filtered = useMemo(() => filterWorkouts(workouts, month, routine), [workouts, month, routine]);
  const routines = useMemo(() => [...new Set(filterWorkouts(workouts, month).map(workout => workout.name))].sort(), [workouts, month]);
  const monthIndex = months.indexOf(month);

  useEffect(() => {
    if (route.params?.workoutId) setSelected(S.workouts.find(item => item.id === route.params.workoutId) || null);
  }, [route.params?.workoutId, S.workouts]);
  useEffect(() => {
    if (!months.length) setMonth(null);
    else if (!months.includes(month)) setMonth(months[0]);
  }, [months, month]);

  const moveMonth = direction => {
    const next = months[monthIndex + direction];
    if (!next) return;
    setMonth(next);
    setRoutine(null);
  };
  const remove = workout => Alert.alert(t('Delete workout?'), t('This workout will be removed from your history.'), [
    { text: t('Cancel') },
    { text: t('Delete'), style: 'destructive', onPress: () => {
      update(state => { state.workouts = state.workouts.filter(item => item.id !== workout.id); });
      setSelected(null);
    } },
  ]);
  const subtitle = filtered.length === S.workouts.length
    ? t('{0} workouts', S.workouts.length)
    : `${filtered.length} / ${S.workouts.length} ${t('workouts')}`;

  return <Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
    <Header title={t('History')} subtitle={subtitle} left={<IconButton name="chevron-left" onPress={() => navigation.goBack()} />} />
    {months.length ? <View style={styles.filters}>
      <View style={styles.monthNav}>
        <IconButton name="chevron-left" disabled={monthIndex >= months.length - 1} onPress={() => moveMonth(1)} accessibilityLabel={t('Previous month')} />
        <AppText style={styles.month}>{fmtMonth(month)}</AppText>
        <IconButton name="chevron-right" disabled={monthIndex <= 0} onPress={() => moveMonth(-1)} accessibilityLabel={t('Next month')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
        <Chip title={t('All')} active={!routine} onPress={() => setRoutine(null)} />
        {routines.map(name => <Chip key={name} title={name} active={routine === name} onPress={() => setRoutine(routine === name ? null : name)} />)}
      </ScrollView>
    </View> : null}
    <FlatList
      data={filtered}
      keyExtractor={workout => workout.id}
      initialNumToRender={15}
      windowSize={5}
      maxToRenderPerBatch={8}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Card><AppText muted style={{ textAlign: 'center' }}>{t('No workouts yet.')}</AppText></Card>}
      renderItem={({ item: workout }) => {
        const summary = advancedSetsSummary(workout);
        return <Pressable onPress={() => setSelected(workout)}><Card><View style={styles.between}>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontWeight: '800', fontSize: 17 }}>{workout.name}</AppText>
            <AppText muted style={{ marginTop: 3 }}>{fmtDate(workout.d, true)} · {fmtDur(workout.duration || workout.end - workout.start)} · {summary.total} {t('sets')}{summary.text ? ` (${summary.text})` : ''}</AppText>
          </View>
          <AppText style={{ color: colors.accent, fontWeight: '800' }}>{fmtNum(workoutVolume(workout))} {S.unit}</AppText>
        </View></Card></Pressable>;
      }}
    />
    <WorkoutDetail workout={selected} close={() => setSelected(null)} remove={() => remove(selected)} unit={S.unit} body={S.body} />
  </Screen>;
}

function WorkoutDetail({ workout, close, remove, unit, body }) {
  const levels = useMemo(() => levelsOf(loadOfWorkouts(workout ? [workout] : [])), [workout]);
  if (!workout) return null;
  const showMap = Object.values(levels).some(Boolean);
  return <Modal visible animationType="slide" onRequestClose={close}><Screen>
    <Header title={workout.name} subtitle={`${fmtDate(workout.d, true)} · ${fmtDur(workout.duration || workout.end - workout.start)}`} left={<IconButton name="close" onPress={close} />} />
    {showMap ? <Card><SectionTitle style={styles.mapTitle}>{t('What this session hits')}</SectionTitle><BodyMap body={body} levels={levels} compact /></Card> : null}
    {workout.bw ? <Card><AppText muted>{t('Body weight')}</AppText><AppText style={{ fontSize: 24, fontWeight: '800' }}>{fmtNum(workout.bw)} {unit}</AppText></Card> : null}
    {workout.entries.map((entry, index) => <Card key={`${entry.id}-${index}`}>
      <AppText style={{ textTransform: 'capitalize', fontWeight: '800', fontSize: 18 }}>{exOr(entry.id).n}</AppText>
      <AppText muted style={{ marginTop: 7, lineHeight: 21 }}>{entry.sets.filter(set => set.done).map(set => setLabel(entry.id, set, entry.target, unit)).join('  ·  ')}</AppText>
    </Card>)}
    <Button title={t('Delete workout')} danger onPress={remove} />
  </Screen></Modal>;
}

const styles = StyleSheet.create({
  filters: { gap: 10, marginBottom: 12 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 17, textTransform: 'capitalize' },
  chips: { gap: 8, paddingRight: 16 },
  list: { gap: 12, paddingBottom: 120 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  mapTitle: { marginTop: 0, marginBottom: 8, textAlign: 'center' },
});
