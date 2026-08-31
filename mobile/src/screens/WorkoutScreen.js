import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import Icon from '../components/Icon';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, Haptics, useCameraPermissions, useSoundPlayer, useWorkoutWakeLock } from '../lib/native';
import { useStore } from '../store';
import { addExerciseToActive, createActiveWorkout, finishActiveWorkout } from '../lib/workouts';
import { EFFORT, advancedSetsSummary, copyPreviousSets, effortOf, isBw, modeOf, previousPerformance, setLabel, setsDoneActive, supersetUnits, unitOf } from '../lib/history';
import { effectiveRoutine, lastBW } from '../lib/history';
import { allExercises, exOr } from '../lib/exercises';
import { decodeWorkoutShare, encodeWorkoutShare } from '../lib/workoutShare';
import { fmtDate, fmtDur, fmtNum, fmtVol, todayISO, uid } from '../lib/format';
import { t } from '../lib/i18n';
import { overlay, radius, spacing, type } from '../theme';
import { useRestTimer, useTimers } from '../timers';
import { ExerciseConfig, ExerciseDetail, ExerciseMedia, ExercisePicker } from '../components/exercises';
import BodyMap from '../components/BodyMap';
import { loadOfWorkouts } from '../lib/muscles';
import { AppText, Button, Card, Header, IconButton, Input, Progress, Screen, SectionTitle, useColors } from '../components/ui';

function Elapsed({ start }) { const [text, setText] = useState('0:00'); useEffect(() => { const tick = () => { const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000)); setText(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`); }; tick(); const id = setInterval(tick, 1000); return () => clearInterval(id); }, [start]); return <AppText muted>{text}</AppText>; }
function ActiveWakeLock() { useWorkoutWakeLock('opengym-workout'); return null; }

export default function WorkoutScreen({ navigation, route }) {
  const { S, update } = useStore(); const active = S.active; const [summary, setSummary] = useState(null); const [startId, setStartId] = useState(undefined); const [startPlan, setStartPlan] = useState(null); const [weight, setWeight] = useState('');
  useEffect(() => { if (!active && !summary && route.params?.requestStart) { setStartId(route.params.routineId ?? null); setStartPlan(null); setWeight(String(lastBW(S)?.w || '')); navigation.setParams({ requestStart: null }); } }, [route.params?.requestStart, active, summary]);
  const begin = () => { const bodyweight = Number(weight.replace(',', '.')); if (!(bodyweight > 0)) return; update(state => { state.active = createActiveWorkout(state, startId, bodyweight, startPlan); }); setStartId(undefined); setStartPlan(null); };
  if (!active) {
    if (summary) return <FinishSummary workout={summary} onDone={() => { setSummary(null); navigation.navigate('Home', { highlightDate: summary.d }); }} />;
    return <StartChooser open={(id, plan = null) => { setStartId(id); setStartPlan(plan); setWeight(String(lastBW(S)?.w || '')); }} startId={startId} weight={weight} setWeight={setWeight} begin={begin} close={() => { setStartId(undefined); setStartPlan(null); }} />;
  }
  return <>{S.keepAwake !== false ? <ActiveWakeLock /> : null}<ActiveWorkout onFinished={setSummary} /></>;
}
function StartChooser({ open, startId, weight, setWeight, begin, close }) {
  const { S } = useStore(); const colors = useColors(); const [builder, setBuilder] = useState(false); const [scanner, setScanner] = useState(false); const [scannedPlan, setScannedPlan] = useState(null); const today = effectiveRoutine(S, todayISO()); const others = S.routines.filter(routine => routine.id !== today?.id); const knownIds = useMemo(() => new Set(allExercises(S).map(exercise => exercise.id)), [S]);
  return <Screen><Header title={t('Start workout')} subtitle={today ? t('today is {0}', today.name) : t('rest day, but no one’s stopping you')} />{today ? <Card style={{ borderColor: colors.accent }}><SectionTitle>{t("Today's plan")}</SectionTitle><AppText style={{ fontSize: 25, fontWeight: '800', marginVertical: 12 }}>{today.name}</AppText><Button title={t('Start {0}', today.name)} icon="play" primary onPress={() => open(today.id)} /></Card> : null}<SectionTitle>{t('Other routines')}</SectionTitle>{others.map(routine => <Card key={routine.id}><View style={styles.between}><View><AppText style={{ fontWeight: '800', fontSize: 18 }}>{routine.name}</AppText><AppText muted>{t('{0} exercises', routine.ex.length)}</AppText></View><Button compact title={t('Start')} onPress={() => open(routine.id)} /></View></Card>)}<SectionTitle>{t('Quick start')}</SectionTitle><Button title={t('Freestyle workout (pick as you go)')} icon="shuffle-variant" onPress={() => open(null)} /><Button title={t('Create workout to share')} icon="qrcode" onPress={() => setBuilder(true)} /><Button title={t('Scan workout QR')} icon="qrcode-scan" onPress={() => setScanner(true)} />
    <Modal transparent visible={startId !== undefined} animationType="fade" onRequestClose={close}><View style={styles.overlay}><View style={[styles.dialog, { backgroundColor: colors.surface }]}><AppText style={{ fontWeight: '800', fontSize: 22 }}>{t('Body weight')}</AppText><AppText muted>{t('Log your current weight before starting')}</AppText><Input keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder={S.unit} /><Button title={t('Start workout')} icon="play" primary disabled={!(Number(weight.replace(',', '.')) > 0)} onPress={begin} /><Button title={t('Cancel')} onPress={close} /></View></View></Modal>
    <ShareWorkoutBuilder visible={builder} onClose={() => setBuilder(false)} />
    <WorkoutScanner visible={scanner} knownIds={knownIds} onClose={() => setScanner(false)} onFound={plan => { setScanner(false); setScannedPlan(plan); }} />
    <ScannedPlan plan={scannedPlan} onClose={() => setScannedPlan(null)} onStart={() => { const plan = scannedPlan; setScannedPlan(null); open(null, plan); }} />
  </Screen>;
}
function ShareWorkoutBuilder({ visible, onClose }) {
  const { S, update } = useStore(); const colors = useColors(); const [plan, setPlan] = useState({ name: 'Shared workout', entries: [] }); const [picker, setPicker] = useState(false); const [configEx, setConfigEx] = useState(null); const [qr, setQr] = useState(null);
  useEffect(() => { if (visible) { setPlan({ name: 'Shared workout', entries: [] }); setQr(null); } }, [visible]);
  const showQr = () => { try { setQr(encodeWorkoutShare(plan)); } catch (error) { Alert.alert(t('Unable to share workout'), error.message); } };
  const saveToCatalog = () => {
    update(state => state.routines.push({ id: uid(), name: plan.name, emoji: 'dumbbell', prog: 'linear', ex: plan.entries }));
    Alert.alert(t('Saved to catalog'), t('{0} was added to your routines.', plan.name));
    onClose();
  };
  if (!visible) return null;
  return <Modal visible animationType="slide" onRequestClose={onClose}><Screen><Header title={t('Create workout to share')} subtitle={t('Build a plan for someone else to scan')} left={<IconButton name="close" onPress={onClose} />} /><Input value={plan.name} onChangeText={name => setPlan(value => ({ ...value, name }))} placeholder={t('Workout name')} />{plan.entries.map((entry, index) => { const exercise = exOr(entry.id); return <Card key={`${entry.id}-${index}`}><View style={styles.between}><View style={{ flex: 1 }}><AppText style={{ fontWeight: '800', textTransform: 'capitalize' }}>{exercise.n}</AppText><AppText muted>{entry.sets} {t('sets')} · {entry.mode || 'reps'}</AppText></View><IconButton name="close" accessibilityLabel={t('Remove exercise')} onPress={() => setPlan(value => ({ ...value, entries: value.entries.filter((_, itemIndex) => itemIndex !== index) }))} /></View></Card>; })}<Button title={t('Add exercise')} icon="plus" onPress={() => setPicker(true)} /><Button title={t('Share workout')} icon="qrcode" primary disabled={!plan.entries.length} onPress={showQr} /><Button title={t('Save to routines')} icon="content-save" disabled={!plan.entries.length} onPress={saveToCatalog} />
    <ExercisePicker visible={picker} onClose={() => setPicker(false)} onPick={exercise => { setConfigEx(exercise); }} /><ExerciseConfig exercise={configEx} visible={!!configEx} onClose={() => setConfigEx(null)} onSave={config => { setPlan(value => ({ ...value, entries: [...value.entries, { ...config, id: configEx.id }] })); setConfigEx(null); setPicker(false); }} />
    <Modal transparent visible={!!qr} animationType="fade" onRequestClose={() => setQr(null)}><View style={styles.overlay}><View style={[styles.dialog, styles.qrDialog, { backgroundColor: colors.surface }]}><AppText style={{ fontWeight: '800', fontSize: 22 }}>{t('Share workout')}</AppText><AppText muted style={{ textAlign: 'center' }}>{t('Scan this code in openGym to start this workout.')}</AppText>{qr ? <View style={styles.qr}><QRCode value={qr} size={230} /></View> : null}<Button title={t('Done')} primary onPress={() => { setQr(null); onClose(); }} /></View></View></Modal>
  </Screen></Modal>;
}
function WorkoutScanner({ visible, knownIds, onClose, onFound }) {
  const colors = useColors(); const [permission, requestPermission] = useCameraPermissions(); const [scanning, setScanning] = useState(true);
  useEffect(() => { if (visible) setScanning(true); }, [visible]);
  if (!visible) return null;
  const scan = ({ data }) => { if (!scanning) return; try { onFound(decodeWorkoutShare(data, knownIds)); } catch (error) { setScanning(false); Alert.alert(t('Unable to scan workout'), error.message, [{ text: t('Try again'), onPress: () => setScanning(true) }]); } };
  return <Modal visible animationType="slide" onRequestClose={onClose}><View style={[styles.scanner, { backgroundColor: colors.bg }]}><Header title={t('Scan workout QR')} subtitle={t('Point your camera at an openGym workout QR code')} left={<IconButton name="close" onPress={onClose} />} />{!CameraView ? <Card><AppText>{t('Camera scanning is unavailable in this app build.')}</AppText></Card> : !permission?.granted ? <Card><AppText style={{ marginBottom: 12 }}>{t('Camera permission is needed to scan a workout QR code.')}</AppText><Button title={t('Allow camera')} primary onPress={requestPermission} /></Card> : <CameraView style={styles.camera} onBarcodeScanned={scanning ? scan : undefined} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} />}</View></Modal>;
}
function ScannedPlan({ plan, onClose, onStart }) {
  const { update } = useStore();
  const colors = useColors();
  if (!plan) return null;
  const saveToCatalog = () => {
    update(state => state.routines.push({ id: uid(), name: plan.name, emoji: 'dumbbell', prog: 'linear', ex: plan.entries }));
    Alert.alert(t('Saved to catalog'), t('{0} was added to your routines.', plan.name));
    onClose();
  };
  return <Modal visible animationType="slide" onRequestClose={onClose}><Screen><Header title={plan.name} subtitle={t('Shared workout')} left={<IconButton name="close" onPress={onClose} />} /><Card style={{ borderColor: colors.accent }}><AppText muted>{t('Review the workout before starting.')}</AppText>{plan.entries.map((entry, index) => <View key={`${entry.id}-${index}`} style={styles.sharedEntry}><AppText style={{ fontWeight: '700', textTransform: 'capitalize' }}>{exOr(entry.id).n}</AppText><AppText muted>{entry.sets} {t('sets')} · {entry.mode || 'reps'}</AppText></View>)}</Card><Button title={t('Save to routines')} icon="content-save" onPress={saveToCatalog} /><Button title={t('Start workout')} icon="play" primary onPress={onStart} /><Button title={t('Cancel')} onPress={onClose} /></Screen></Modal>;
}
const achievementEntrance = FadeIn.duration(180).easing(Easing.bezier(0.23, 1, 0.32, 1));
function FinishSummary({ workout, onDone }) {
  const { S } = useStore(); const colors = useColors(); const load = loadOfWorkouts([workout]); const muscles = new Set(Object.entries(load).filter(([, value]) => value > 0).map(([muscle]) => muscle)); const summary = advancedSetsSummary(workout);
  return <Screen><Header title={t('Workout complete!')} subtitle={workout.name} /><Animated.View entering={achievementEntrance}><Card style={styles.summaryHero}><Icon name="trophy" size={48} color={colors.accent} /><AppText style={styles.summaryTitle}>{t('Great work!')}</AppText></Card></Animated.View><View style={styles.summaryGrid}><Card style={styles.summaryTile}><AppText muted>{t('Duration')}</AppText><AppText style={styles.summaryValue}>{fmtDur(workout.duration || workout.end - workout.start)}</AppText></Card><Card style={styles.summaryTile}><AppText muted>{t('Volume')}</AppText><AppText style={styles.summaryValue}>{fmtVol(workout.vol, S.unit)}</AppText></Card><Card style={styles.summaryTile}><AppText muted>{t('Sets')}</AppText><AppText style={styles.summaryValue}>{summary.total}</AppText>{summary.text ? <AppText dim style={{ fontSize: 11, marginTop: 1 }}>{summary.text}</AppText> : null}</Card><Card style={styles.summaryTile}><AppText muted>{t('PRs')}</AppText><AppText style={styles.summaryValue}>{workout.prs.length || '—'}</AppText></Card></View>{workout.prs.length || workout.e1prs?.length ? <Card><SectionTitle>{t('Records')}</SectionTitle>{workout.prs.map(id => <View key={id} style={styles.summaryRow}><Icon name="trophy" size={16} color={colors.accent} /><AppText style={{ flex: 1 }}>{t('New PR:')} {exOr(id).n}</AppText></View>)}{(workout.e1prs || []).map(record => <View key={record.id} style={styles.summaryRow}><Icon name="chart-line" size={16} color={colors.accent} /><AppText style={{ flex: 1 }}>{t('Best estimated 1RM:')} {exOr(record.id).n} · {fmtNum(record.est)} {S.unit}</AppText></View>)}</Card> : null}<Card><SectionTitle>{t('What you just trained')}</SectionTitle><BodyMap body={S.body} selected={muscles} /></Card><Button title={t('Nice!')} primary onPress={onDone} /></Screen>;
}
function ActiveWorkout({ onFinished }) {
  const { S, update, replaceState } = useStore(); const colors = useColors(); const { startRest, stopRest } = useTimers(); const player = useSoundPlayer(require('../../assets/beep.wav')); const [picker, setPicker] = useState(false); const [copyUndo, setCopyUndo] = useState(null); const [configEx, setConfigEx] = useState(null); const [detail, setDetail] = useState(null); const [work, setWork] = useState(null); const [setMenu, setSetMenu] = useState(null); const [tray, setTray] = useState(null);
  const A = S.active; const units = supersetUnits(A.entries); const current = Math.min(A.cur, Math.max(0, A.entries.length - 1)); const unit = unitOf(units, current); const unitIndex = units.findIndex(item => item.includes(current)); const total = A.entries.reduce((sum, entry) => sum + entry.sets.length, 0); const done = setsDoneActive(A); const nextRestSet = units.slice(unitIndex).flatMap(entryIndex => A.entries[entryIndex].sets.map((set, setIndex) => ({ entryIndex, setIndex, set }))).find(({ set }) => !set.done); const nextRestLabel = nextRestSet ? `${exOr(A.entries[nextRestSet.entryIndex].id).n} · ${t('Set {0}', nextRestSet.setIndex + 1)}/${A.entries[nextRestSet.entryIndex].sets.length}` : null;
  // ponytail: previous performance only depends on exercise id and mode; extend this key if that changes.
  const previousKey = A.entries.map(entry => `${entry.id}:${modeOf({ ...entry.target, id: entry.id })}`).join('|');
  const previousByEntry = useMemo(() => S.showPrevious ? A.entries.map(entry => previousPerformance(S, entry.id, entry.target, S.unit)) : [], [S.showPrevious, S.workouts, S.unit, previousKey]);
  const mutateEntry = (entryIndex, fn) => update(state => fn(state.active.entries[entryIndex]));
  const copyPrevious = entryIndex => {
    const entry = A.entries[entryIndex];
    const previous = previousByEntry[entryIndex];
    if (!previous?.compatible) return;
    const fields = ['w', 'r', 'sec', 'min', 'speed'];
    const before = entry.sets.map((set, index) => set.done || set.kind || set.fail ? null : { index, values: Object.fromEntries(fields.map(field => [field, set[field]])) }).filter(Boolean);
    mutateEntry(entryIndex, current => { current.sets = copyPreviousSets(current.sets, previous.sets, modeOf(current.target)); });
    setCopyUndo({ entryIndex, sets: before });
  };
  const undoCopy = () => {
    if (!copyUndo) return;
    mutateEntry(copyUndo.entryIndex, current => copyUndo.sets.forEach(({ index, values }) => {
      const set = current.sets[index];
      if (!set || set.done || set.kind || set.fail) return;
      Object.entries(values).forEach(([field, value]) => { if (value === undefined) delete set[field]; else set[field] = value; });
    }));
    setCopyUndo(null);
  };
  const toggle = (entryIndex, setIndex) => {
    const wasDone = A.entries[entryIndex].sets[setIndex].done;
    mutateEntry(entryIndex, entry => { entry.sets[setIndex].done = !entry.sets[setIndex].done; });
    if (!wasDone) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); if (S.sound) { player.seekTo(0); player.play(); } const entryAfter = A.entries[entryIndex]; const allEntry = entryAfter.sets.every((set, index) => index === setIndex ? true : set.done); const allWorkout = A.entries.every((entry, ei) => entry.sets.every((set, si) => ei === entryIndex && si === setIndex ? true : set.done)); if (allWorkout) stopRest(); else if (!allEntry || unit[unit.length - 1] === entryIndex) startRest(S.restSec); }
  };
  const finish = () => { if (!done) return Alert.alert(t('Nothing logged'), t('Complete at least one set first.')); Alert.alert(t('Finish workout?'), t('{0} sets completed', done), [{ text: t('Cancel') }, { text: t('Finish'), onPress: () => { const next = JSON.parse(JSON.stringify(S)); const workout = finishActiveWorkout(next); replaceState(next); stopRest(); if (S.sound) { player.seekTo(0); player.play(); } if (workout) onFinished(workout); } }]); };
  const discard = () => Alert.alert(t('Discard workout?'), t('The sets you logged in this session will be lost.'), [{ text: t('Cancel') }, { text: t('Discard'), style: 'destructive', onPress: () => { update(state => { state.active = null; }); stopRest(); } }]);
  return <Screen><Header title={A.name} subtitle={`${Math.floor(done)}/${total} ${t('sets')}`} left={<IconButton name="close" onPress={discard} />} right={<IconButton name="check" color={colors.accent} onPress={finish} />} /><View style={styles.elapsed}><Elapsed start={A.start} /><AppText muted>{unit.length > 1 ? t('Superset {0} / {1}', unitIndex + 1, units.length) : t('Exercise {0} / {1}', unitIndex + 1, units.length)}</AppText></View><Progress value={total ? done / total : 0} />
    <RestDock nextRestLabel={nextRestLabel} />
    {copyUndo ? <Card style={styles.copyUndo}><View style={styles.between}><AppText muted>{t('Previous values applied')}</AppText><Button compact title={t('Undo')} onPress={undoCopy} /></View></Card> : null}
    {A.entries.length ? unit.map(entryIndex => <EntryBlock key={entryIndex} entryIndex={entryIndex} previous={previousByEntry[entryIndex]} onToggle={setIndex => toggle(entryIndex, setIndex)} mutate={fn => mutateEntry(entryIndex, fn)} onDetail={() => setDetail(exOr(A.entries[entryIndex].id))} onWork={(setIndex, seconds) => setWork({ entryIndex, setIndex, seconds, started: Date.now() })} onSetMenu={(setIndex, set) => setSetMenu({ entryIndex, setIndex, set })} onTray={setTray} onCopyPrevious={() => copyPrevious(entryIndex)} />) : <Card><AppText muted style={{ textAlign: 'center' }}>{t('Freestyle workout — add your first exercise.')}</AppText></Card>}
    <View style={styles.nav}><Button title={t('Prev')} icon="chevron-left" disabled={unitIndex <= 0} onPress={() => update(state => { state.active.cur = units[unitIndex - 1][0]; })} style={{ flex: 1 }} /><Button title={t('Next')} disabled={unitIndex < 0 || unitIndex >= units.length - 1} onPress={() => update(state => { state.active.cur = units[unitIndex + 1][0]; })} style={{ flex: 1 }} /></View><Button title={t('Add exercise')} icon="plus" onPress={() => setPicker(true)} /><Button title={done === total && total ? t('Finish workout') : t('Finish workout early')} primary={done === total && total > 0} onPress={finish} />
    <ExercisePicker visible={picker} onClose={() => setPicker(false)} onPick={exercise => { setConfigEx(exercise); }} /><ExerciseConfig exercise={configEx} visible={!!configEx} onClose={() => setConfigEx(null)} onSave={config => { update(state => addExerciseToActive(state, configEx, config)); setConfigEx(null); setPicker(false); }} /><ExerciseDetail exercise={detail} visible={!!detail} onClose={() => setDetail(null)} /><WorkTimer work={work} close={() => setWork(null)} complete={elapsed => { if (!work) return; mutateEntry(work.entryIndex, entry => { entry.sets[work.setIndex].sec = elapsed; }); if (!A.entries[work.entryIndex].sets[work.setIndex].done) toggle(work.entryIndex, work.setIndex); setWork(null); }} />
    <NumberTray tray={tray} close={() => setTray(null)} />
    <SetMenu target={setMenu} close={() => setSetMenu(null)} updateEntry={(entryIndex, fn) => { mutateEntry(entryIndex, fn); setSetMenu(null); }} S={S} />
  </Screen>;
}

function RestDock({ nextRestLabel }) {
  const colors = useColors(); const { rest, left } = useRestTimer(); const { addRest, stopRest } = useTimers();
  if (!rest) return null;
  return <View style={[styles.restDock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.restDockRow}><Icon name="timer-outline" size={20} color={colors.orange} /><View style={{ flex: 1 }}><AppText muted style={styles.restLabel}>{t('Rest')}</AppText><AppText style={styles.restTime}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Subtract 15 seconds" onPress={() => addRest(-15)} style={[styles.restAction, { backgroundColor: colors.surface2 }]}><AppText style={{ color: colors.accent, fontWeight: '800' }}>−15</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Add 15 seconds" onPress={() => addRest(15)} style={[styles.restAction, { backgroundColor: colors.surface2 }]}><AppText style={{ color: colors.accent, fontWeight: '800' }}>+15</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Stop rest timer" onPress={stopRest} style={styles.restDone}><AppText style={{ color: colors.muted, fontWeight: '800' }}>{t('Done')}</AppText></Pressable></View>
    {nextRestLabel ? <AppText muted numberOfLines={1} style={styles.restNext}>{nextRestLabel}</AppText> : null}
  </View>;
}
function NumberTray({ tray, close }) {
  const colors = useColors();
  const [val, setVal] = useState(0);
  const [typing, setTyping] = useState(false);
  useEffect(() => { if (tray) { setVal(tray.value === undefined ? 0 : tray.value); setTyping(false); } }, [tray]);
  if (!tray) return null;

  const commit = (v) => { setVal(v); if (tray.onChange) tray.onChange(v); };
  const adjust = (delta) => commit(Math.max(0, Math.round((val + delta) * 10) / 10));

  return <Modal transparent visible animationType="fade" onRequestClose={close}><Pressable style={[styles.overlay, { justifyContent: 'flex-end', padding: 0 }]} onPress={close}><View style={[styles.dialog, { backgroundColor: colors.surface, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 40 }]} onStartShouldSetResponder={() => true}>
    <View style={styles.between}>
      <AppText style={{ fontWeight: '800', fontSize: 18, textTransform: 'capitalize' }}>{t(tray.type)}</AppText>
      <AppText muted>{tray.suffix}</AppText>
    </View>
    {typing ? (
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Input autoFocus keyboardType="decimal-pad" value={String(val)} onChangeText={text => commit(Number(text.replace(',', '.')) || 0)} style={{ flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '800' }} />
        <Button title={t('Done')} primary onPress={close} />
      </View>
    ) : (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 20 }}>
          <View>
            <Button compact title={`- ${tray.step * 4}`} onPress={() => adjust(-tray.step * 4)} style={{ marginBottom: 10 }} />
            <Button title={`- ${tray.step}`} onPress={() => adjust(-tray.step)} />
          </View>
          <AppText style={{ fontSize: 64, fontWeight: '800' }}>{val}</AppText>
          <View>
            <Button compact title={`+ ${tray.step * 4}`} onPress={() => adjust(tray.step * 4)} style={{ marginBottom: 10 }} />
            <Button title={`+ ${tray.step}`} onPress={() => adjust(tray.step)} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button style={{ flex: 1 }} title={t('Type custom')} icon="keyboard" onPress={() => setTyping(true)} />
          <Button style={{ flex: 1 }} title={t('Done')} primary onPress={close} />
        </View>
      </>
    )}
  </View></Pressable></Modal>;
}

function SetMenu({ target, close, updateEntry, S }) {
  const colors = useColors();
  const [warmupMode, setWarmupMode] = useState(false);
  const [warmupWeight, setWarmupWeight] = useState(0);
  useEffect(() => { if (target && target.set.w) setWarmupWeight(target.set.w); else setWarmupWeight(0); setWarmupMode(false); }, [target]);

  if (!target) return null;
  const { entryIndex, setIndex, set } = target;

  const saveWarmup = (weightNum) => {
    updateEntry(entryIndex, entry => {
      entry.sets[setIndex].kind = 'w';
      if (weightNum !== undefined) entry.sets[setIndex].w = weightNum;
    });
  };

  const addDropSet = () => {
    updateEntry(entryIndex, entry => {
      const current = entry.sets[setIndex];
      const drop = { ...current, w: Math.round((current.w || 0) * 0.8), r: undefined, kind: 'd', done: false, fail: false };
      entry.sets.splice(setIndex + 1, 0, drop);
    });
  };

  const markAmrap = () => {
    updateEntry(entryIndex, entry => {
      entry.sets[setIndex].kind = entry.sets[setIndex].kind === 'a' ? undefined : 'a';
      if (entry.sets[setIndex].kind === 'a') entry.sets[setIndex].r = undefined;
    });
  };

  const toggleFail = () => {
    updateEntry(entryIndex, entry => {
      const s = entry.sets[setIndex];
      s.fail = !s.fail;
      if (s.fail && effortOf(S) === 'rir') s.rir = 0;
      if (s.fail && effortOf(S) === 'rpe') s.rpe = 10;
    });
  };

  if (warmupMode) {
    const plannedWeight = set.w || 0;
    return <Modal transparent visible animationType="fade" onRequestClose={close}><Pressable style={[styles.overlay, { justifyContent: 'flex-end', padding: 0 }]} onPress={close}><View style={[styles.dialog, { backgroundColor: colors.surface, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 40 }]} onStartShouldSetResponder={() => true}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <IconButton name="chevron-left" onPress={() => setWarmupMode(false)} />
        <AppText style={{ fontWeight: '800', fontSize: 18 }}>{t('Warm-up weight')}</AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 20 }}>
         <Button title="- 2.5" onPress={() => setWarmupWeight(Math.max(0, warmupWeight - 2.5))} />
         <AppText style={{ fontSize: 52, fontWeight: '800' }}>{warmupWeight}</AppText>
         <Button title="+ 2.5" onPress={() => setWarmupWeight(warmupWeight + 2.5)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Button style={{ flex: 1 }} title={t('Bar (20)')} onPress={() => setWarmupWeight(20)} />
        {plannedWeight > 20 ? <Button style={{ flex: 1 }} title={t('50% ({0})', Math.round(plannedWeight * 0.5))} onPress={() => setWarmupWeight(Math.round(plannedWeight * 0.5))} /> : null}
      </View>
      <Button primary title={t('Save')} onPress={() => saveWarmup(warmupWeight)} />
    </View></Pressable></Modal>;
  }

  return <Modal transparent visible animationType="fade" onRequestClose={close}><Pressable style={styles.overlay} onPress={close}><View style={[styles.dialog, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
    <AppText style={{ fontWeight: '800', fontSize: 18, marginBottom: 8 }}>{t('Set {0}', setIndex + 1)}</AppText>
    
    <AppText muted style={{ fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('Before lifting')}</AppText>
    <Button title={t('Mark as warm-up')} icon="fire" primary={set.kind === 'w'} onPress={() => {
      if (set.kind === 'w') { updateEntry(entryIndex, e => e.sets[setIndex].kind = undefined); }
      else setWarmupMode(true);
    }} />
    <Button title={t('Make AMRAP')} icon="infinity" primary={set.kind === 'a'} onPress={markAmrap} />

    <AppText muted style={{ fontSize: 12, marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('After lifting')}</AppText>
    <Button title={t('Add drop set')} icon="arrow-down-right" onPress={addDropSet} />
    <Button title={t('Reached failure')} icon="skull-crossbones" primary={!!set.fail} onPress={toggleFail} danger={!!set.fail} />
  </View></Pressable></Modal>;
}

const EntryBlock = React.memo(function EntryBlock({ entryIndex, previous, onToggle, mutate, onDetail, onWork, onSetMenu, onTray, onCopyPrevious }) {
  const { S } = useStore(); const colors = useColors(); const entry = S.active.entries[entryIndex]; const exercise = exOr(entry.id); const mode = modeOf({ ...entry.target, id: entry.id }); const effort = EFFORT[effortOf(S)]; const bodyweight = isBw({ ...entry.target, id: entry.id });
  const change = (setIndex, key, value) => mutate(item => { item.sets[setIndex][key] = value === undefined ? undefined : Math.max(0, Math.round(value * 10) / 10); });
  const addSet = () => mutate(item => { const last = item.sets[item.sets.length - 1] || {}; item.sets.push({ ...last, done: false }); }); const remove = () => mutate(item => { if (item.sets.length > 1) item.sets.pop(); });
  return <View style={{ gap: 10 }}><ExerciseMedia exercise={exercise} compact /><View style={styles.between}><Pressable onPress={onDetail} style={{ flex: 1 }}><AppText style={{ fontSize: 21, fontWeight: '800', textTransform: 'capitalize' }}>{exercise.n}</AppText><AppText muted style={{ textTransform: 'capitalize' }}>{exercise.tg || exercise.bp} · {exercise.eq}</AppText></Pressable><IconButton name="information-outline" onPress={onDetail} /></View>{previous ? <Card style={styles.previousCard}><View style={styles.between}><AppText muted style={{ fontSize: 12 }}>{t('Last session')} · {fmtDate(previous.d, true)}</AppText>{previous.compatible ? <Button compact title={t('Use last values')} onPress={onCopyPrevious} /> : null}</View><AppText muted numberOfLines={2} style={{ marginTop: 6 }}>{previous.labels.join('  ·  ')}</AppText>{!previous.compatible ? <AppText dim style={{ fontSize: 12, marginTop: 4 }}>{t('Different exercise mode — values cannot be copied.')}</AppText> : null}</Card> : null}{entry.plan?.why && entry.plan.kind !== 'off' ? <Card style={{ backgroundColor: `${colors.accent}18` }}><AppText style={{ color: colors.accent, fontSize: 13 }}>{t(...entry.plan.why)}</AppText></Card> : null}<Card style={{ paddingVertical: 8 }}>{entry.sets.map((set, setIndex) => <View key={setIndex} style={[styles.setRow, { borderBottomColor: colors.border, opacity: set.done ? .55 : 1 }]}><Pressable onPress={() => onSetMenu(setIndex, set)} style={[styles.setNumberBtn, { backgroundColor: colors.surface2 }]} accessibilityLabel={t('Set options')}><AppText style={{ fontWeight: '800', color: set.fail ? colors.danger : colors.text, fontSize: 15 }}>{set.kind === 'w' ? 'W' : set.kind === 'd' ? 'D' : set.kind === 'a' ? 'A' : setIndex + 1}</AppText><Icon name="dots-horizontal" size={12} color={colors.dim} style={{ marginTop: -2 }} /></Pressable>{mode === 'cardio' ? <><SetField onTray={onTray} type="time" step={5} value={set.min} suffix="min" onChange={value => change(setIndex, 'min', value)} /><SetField onTray={onTray} type="speed" step={1} value={set.speed} suffix="km/h" onChange={value => change(setIndex, 'speed', value)} /></> : mode === 'time' ? <><SetField onTray={onTray} type="time" step={5} value={set.sec} suffix="s" onChange={value => change(setIndex, 'sec', value)} />{!bodyweight || set.w > 0 ? <SetField onTray={onTray} type="weight" step={2.5} value={set.w} suffix={S.unit} onChange={value => change(setIndex, 'w', value)} /> : null}<IconButton name="play" disabled={set.done} onPress={() => onWork(setIndex, set.sec || 45)} style={styles.check} /></> : <>{!bodyweight || set.w > 0 ? <SetField onTray={onTray} type="weight" step={2.5} value={set.w} suffix={S.unit} onChange={value => change(setIndex, 'w', value)} /> : null}<SetField onTray={onTray} type="reps" step={1} value={set.r} suffix={set.kind === 'a' ? 'reps (AMRAP)' : 'reps'} onChange={value => change(setIndex, 'r', value)} placeholder={set.kind === 'a' || set.kind === 'd' ? '?' : undefined} />{effort ? <SetField onTray={onTray} type="effort" step={1} value={set[effort.f] ?? ''} suffix={effort.hd} onChange={value => change(setIndex, effort.f, Math.min(effort.max, value))} /> : null}</>}<IconButton name={set.done ? 'check-circle' : 'checkbox-blank-circle-outline'} color={set.done ? colors.accent : colors.muted} onPress={() => onToggle(setIndex)} style={styles.check} /></View>)}<View style={styles.nav}><Button compact title={t('Remove set')} disabled={entry.sets.length <= 1} onPress={remove} style={{ flex: 1 }} /><Button compact title={t('Add set')} icon="plus" onPress={addSet} style={{ flex: 1 }} /></View></Card></View>;
});
function SetField({ value, suffix, onChange, placeholder, type = 'reps', step = 1, onTray }) { const colors = useColors(); return <Pressable onPress={() => onTray({ value, suffix, onChange, type, step })} style={[styles.setField, { backgroundColor: colors.surface2 }]}><AppText style={[styles.setInput, { color: colors.text, opacity: value === undefined ? 0.3 : 1 }]}>{value === undefined ? (placeholder || '-') : value}</AppText><AppText dim style={{ fontSize: 9 }}>{suffix}</AppText></Pressable>; }
function WorkTimer({ work, close, complete }) { const colors = useColors(); const [left, setLeft] = useState(0); useEffect(() => { if (!work) return undefined; setLeft(work.seconds); const id = setInterval(() => setLeft(Math.max(0, Math.ceil((work.started + work.seconds * 1000 - Date.now()) / 1000))), 250); return () => clearInterval(id); }, [work]); useEffect(() => { if (work && left === 0 && Date.now() >= work.started + work.seconds * 1000) complete(work.seconds); }, [left, work]); if (!work) return null; const elapsed = Math.max(1, work.seconds - left); return <Modal transparent visible animationType="fade"><View style={styles.overlay}><View style={[styles.dialog, { backgroundColor: colors.surface, alignItems: 'center' }]}><AppText muted>{t('Timed set')}</AppText><AppText style={{ fontSize: 64, fontWeight: '800' }}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</AppText><Button title={t('Finish set')} primary onPress={() => complete(elapsed)} style={{ width: '100%' }} /><Button title={t('Cancel')} onPress={close} style={{ width: '100%' }} /></View></View></Modal>; }
const styles = StyleSheet.create({ restDock: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: spacing.sm, gap: spacing.xs }, restDockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, restLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: .5 }, restTime: { fontSize: 22, fontWeight: '800' }, restAction: { minWidth: 44, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }, restDone: { minWidth: 44, minHeight: 40, alignItems: 'center', justifyContent: 'center' }, restNext: { marginLeft: 28, fontSize: 12 }, summaryHero: { alignItems: 'center', gap: 6, paddingVertical: spacing.xl }, summaryTitle: { fontSize: type.heading, fontWeight: '800' }, summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, summaryTile: { width: '48%', gap: spacing.xs }, summaryValue: { fontSize: type.subheading, fontWeight: '800' }, summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.sm }, previousCard: { padding: 10 }, copyUndo: { padding: spacing.sm }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, elapsed: { flexDirection: 'row', justifyContent: 'space-between' }, nav: { flexDirection: 'row', gap: spacing.sm, marginTop: 6 }, setRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: StyleSheet.hairlineWidth }, setNumberBtn: { width: 32, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xs, borderRadius: radius.sm }, setField: { flex: 1, minWidth: 56, borderRadius: 9, alignItems: 'center', paddingVertical: spacing.xs }, setInput: { minWidth: 48, textAlign: 'center', fontWeight: '800', fontSize: 17, padding: 0 }, check: { width: 38, height: 38 }, overlay: { flex: 1, backgroundColor: overlay.scrim, justifyContent: 'center', padding: 22 }, dialog: { borderRadius: radius.xl, padding: 18, gap: spacing.md }, qrDialog: { alignItems: 'center' }, qr: { padding: spacing.md, backgroundColor: '#fff', borderRadius: 14 }, scanner: { flex: 1, padding: spacing.lg, gap: spacing.md }, camera: { flex: 1, minHeight: 360, borderRadius: radius.xl, overflow: 'hidden' }, sharedEntry: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#8886' } });
