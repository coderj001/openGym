import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '../store';
import { cleanupSg, exLine, supersetUnits } from '../lib/history';
import { exOr } from '../lib/exercises';
import { uid } from '../lib/format';
import { POLICY_DESC, POLICY_NAME, POLICIES_FOR } from '../lib/progression';
import { t } from '../lib/i18n';
import { encodeWorkoutShare } from '../lib/workoutShare';
import QRCode from 'react-native-qrcode-svg';
import { ExerciseConfig, ExercisePicker, ExerciseRow } from '../components/exercises';
import { AppText, Button, Card, Chip, Header, IconButton, Input, Screen, SectionTitle, useColors } from '../components/ui';

export default function RoutineEditScreen({ navigation, route }) {
  const { S, update } = useStore(); const colors = useColors(); const id = route.params.id; const routine = S.routines.find(item => item.id === id);
  const [picker, setPicker] = useState(false); const [selected, setSelected] = useState(null); const [index, setIndex] = useState(null); const [qr, setQr] = useState(null);
  if (!routine) return <Screen><AppText>{t('Routine not found')}</AppText></Screen>;
  const edit = fn => update(state => fn(state.routines.find(item => item.id === id).ex));
  const move = (at, direction) => edit(list => { const target = at + direction; if (target < 0 || target >= list.length) return; [list[at], list[target]] = [list[target], list[at]]; cleanupSg(list); });
  const toggleSuperset = at => edit(list => { if (at < 1) return; const current = list[at], previous = list[at - 1]; if (current.sg && previous.sg === current.sg) delete current.sg; else { const group = previous.sg || `sg${uid()}`; previous.sg = group; current.sg = group; } cleanupSg(list); });
  const removeRoutine = () => Alert.alert(t('Delete routine?'), t('The routine and its exercises will be removed.'), [{ text: t('Cancel') }, { text: t('Delete'), style: 'destructive', onPress: () => { update(state => { state.routines = state.routines.filter(item => item.id !== id); Object.keys(state.week).forEach(day => { if (state.week[day] === id) delete state.week[day]; }); Object.keys(state.dayPlan).forEach(day => { if (state.dayPlan[day] === id) delete state.dayPlan[day]; }); }); navigation.goBack(); } }]);
  const shareRoutine = () => { try { setQr(encodeWorkoutShare({ name: routine.name, entries: routine.ex })); } catch (error) { Alert.alert(t('Unable to share routine'), error.message); } };
  const units = supersetUnits(routine.ex); const supersetIndexes = new Set(units.filter(unit => unit.length > 1).flat());
  return <Screen><Header title={t('Edit routine')} left={<IconButton name="chevron-left" onPress={() => navigation.goBack()} />} right={<IconButton name="qrcode" onPress={shareRoutine} />} /><Input value={routine.name} onChangeText={name => update(state => { state.routines.find(item => item.id === id).name = name; })} style={{ fontSize: 20, fontWeight: '800' }} />
    <SectionTitle>{t('Progression')}</SectionTitle><Card><View style={styles.chips}>{POLICIES_FOR.reps.map(policy => <Chip key={policy} title={t(POLICY_NAME[policy])} active={(routine.prog || 'linear') === policy} onPress={() => update(state => { state.routines.find(item => item.id === id).prog = policy; })} />)}</View><AppText muted style={{ marginTop: 10, lineHeight: 19 }}>{t(POLICY_DESC[routine.prog || 'linear'])}</AppText></Card>
    <SectionTitle>{t('Exercises')}</SectionTitle>{routine.ex.length ? <Card style={{ paddingVertical: 0 }}>{routine.ex.map((config, at) => { const exercise = exOr(config.id); const linked = supersetIndexes.has(at); return <View key={`${config.id}-${at}`} style={[styles.exercise, linked && { borderLeftColor: colors.accent, borderLeftWidth: 3 }]}><ExerciseRow exercise={exercise} onPress={() => { setSelected(exercise); setIndex(at); }} accessory={<View style={styles.actions}>{at > 0 ? <IconButton name="link-variant" size={17} color={config.sg && routine.ex[at - 1]?.sg === config.sg ? colors.accent : colors.muted} onPress={() => toggleSuperset(at)} style={styles.smallButton} /> : null}<IconButton name="chevron-up" size={17} disabled={at === 0} onPress={() => move(at, -1)} style={styles.smallButton} /><IconButton name="chevron-down" size={17} disabled={at === routine.ex.length - 1} onPress={() => move(at, 1)} style={styles.smallButton} /></View>} /><AppText muted style={{ fontSize: 12, marginTop: -17, marginBottom: 8, marginLeft: 52 }}>{exLine(config, S.unit)}</AppText></View>; })}</Card> : <Card><AppText muted style={{ textAlign: 'center' }}>{t('No exercises yet — add your first one.')}</AppText></Card>}
    <AppText dim style={{ fontSize: 12, lineHeight: 18 }}>{t('Use the link button to superset an exercise with the one above.')}</AppText><Button title={t('Add exercise')} icon="plus" primary onPress={() => setPicker(true)} /><Button title={t('Delete routine')} danger onPress={removeRoutine} />
    <ExercisePicker visible={picker} onClose={() => setPicker(false)} onPick={exercise => { setPicker(false); setSelected(exercise); setIndex(null); }} />
    <ExerciseConfig exercise={selected} initial={index === null ? null : routine.ex[index]} visible={!!selected} onClose={() => setSelected(null)} onSave={config => { if (index === null) edit(list => list.push({ id: selected.id, ...config })); else edit(list => { const sg = list[index].sg; list[index] = { id: selected.id, ...config, ...(sg ? { sg } : {}) }; }); setSelected(null); }} onDelete={index === null ? null : () => { edit(list => { list.splice(index, 1); cleanupSg(list); }); setSelected(null); }} />
    <Modal transparent visible={!!qr} animationType="fade" onRequestClose={() => setQr(null)}><View style={styles.overlay}><View style={[styles.dialog, styles.qrDialog, { backgroundColor: colors.surface }]}><AppText style={{ fontWeight: '800', fontSize: 22 }}>{t('Share routine')}</AppText><AppText muted style={{ textAlign: 'center' }}>{t('Scan this code in openGym to save or start this routine.')}</AppText>{qr ? <View style={styles.qr}><QRCode value={qr} size={230} /></View> : null}<Button title={t('Done')} primary onPress={() => setQr(null)} /></View></View></Modal>
  </Screen>;
}
const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, exercise: { paddingLeft: 4 }, actions: { flexDirection: 'row', gap: 4 }, smallButton: { width: 30, height: 30, borderRadius: 8 }, overlay: { flex: 1, backgroundColor: '#000b', justifyContent: 'center', padding: 22 }, dialog: { borderRadius: 20, padding: 18, gap: 12 }, qrDialog: { alignItems: 'center' }, qr: { padding: 12, backgroundColor: '#fff', borderRadius: 14 } });
