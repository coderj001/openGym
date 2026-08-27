import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useStore } from '../store';
import { exOr } from '../lib/exercises';
import { fmtDate, fmtDur, fmtNum } from '../lib/format';
import { advancedSetsSummary, setLabel, setsDone, workoutVolume } from '../lib/history';
import { t } from '../lib/i18n';
import { AppText, Button, Card, Header, IconButton, Screen, useColors } from '../components/ui';

export default function HistoryScreen({ navigation, route }) {
  const { S, update } = useStore(); const colors = useColors(); const [selected, setSelected] = useState(null);
  useEffect(() => { if (route.params?.workoutId) setSelected(S.workouts.find(item => item.id === route.params.workoutId) || null); }, [route.params?.workoutId]);
  const remove = workout => Alert.alert(t('Delete workout?'), t('This workout will be removed from your history.'), [{ text: t('Cancel') }, { text: t('Delete'), style: 'destructive', onPress: () => { update(state => { state.workouts = state.workouts.filter(item => item.id !== workout.id); }); setSelected(null); } }]);
  return <Screen><Header title={t('History')} subtitle={t('{0} workouts', S.workouts.length)} left={<IconButton name="chevron-left" onPress={() => navigation.goBack()} />} />{S.workouts.length ? [...S.workouts].reverse().map(workout => { const summary = advancedSetsSummary(workout); return <Pressable key={workout.id} onPress={() => setSelected(workout)}><Card><View style={styles.between}><View style={{ flex: 1 }}><AppText style={{ fontWeight: '800', fontSize: 17 }}>{workout.name}</AppText><AppText muted style={{ marginTop: 3 }}>{fmtDate(workout.d, true)} · {fmtDur(workout.duration || workout.end - workout.start)} · {summary.total} {t('sets')}{summary.text ? ` (${summary.text})` : ''}</AppText></View><AppText style={{ color: colors.accent, fontWeight: '800' }}>{fmtNum(workoutVolume(workout))} {S.unit}</AppText></View></Card></Pressable>; }) : <Card><AppText muted style={{ textAlign: 'center' }}>{t('No workouts yet.')}</AppText></Card>}
    <WorkoutDetail workout={selected} close={() => setSelected(null)} remove={() => remove(selected)} unit={S.unit} />
  </Screen>;
}
function WorkoutDetail({ workout, close, remove, unit }) { if (!workout) return null; return <Modal visible animationType="slide" onRequestClose={close}><Screen><Header title={workout.name} subtitle={`${fmtDate(workout.d, true)} · ${fmtDur(workout.duration || workout.end - workout.start)}`} left={<IconButton name="close" onPress={close} />} />{workout.bw ? <Card><AppText muted>{t('Body weight')}</AppText><AppText style={{ fontSize: 24, fontWeight: '800' }}>{fmtNum(workout.bw)} {unit}</AppText></Card> : null}{workout.entries.map((entry, index) => <Card key={`${entry.id}-${index}`}><AppText style={{ textTransform: 'capitalize', fontWeight: '800', fontSize: 18 }}>{exOr(entry.id).n}</AppText><AppText muted style={{ marginTop: 7, lineHeight: 21 }}>{entry.sets.filter(set => set.done).map(set => setLabel(entry.id, set, entry.target)).join('  ·  ')}</AppText></Card>)}<Button title={t('Delete workout')} danger onPress={remove} /></Screen></Modal>; }
const styles = StyleSheet.create({ between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 } });
