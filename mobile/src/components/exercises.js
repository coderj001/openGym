import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Icon from './Icon';
import { allExercises, BODYPARTS, equipmentOf, exOr, mediaFor } from '../lib/exercises';
import { MUSCLE_NAME, musclesOf } from '../lib/muscles';
import { defaultConfig, modeOf } from '../lib/history';
import { instrFor, t } from '../lib/i18n';
import { useStore } from '../store';
import BodyMap from './BodyMap';
import { AppText, Button, Card, Chip, Header, IconButton, Input, Screen, SectionTitle, useColors } from './ui';

export function ExerciseMedia({ exercise, compact = false, mini = false }) {
  const source = mediaFor(exercise); const colors = useColors(); const height = mini ? 112 : compact ? 180 : 280;
  if (!source) return <View style={[styles.mediaFallback, { height, backgroundColor: colors.surface2 }]}><Icon name="dumbbell" size={44} color={colors.dim} /></View>;
  return <Image source={source} style={[styles.media, { height, backgroundColor: '#fff' }]} contentFit="contain" autoplay />;
}
export function ExerciseRow({ exercise, onPress, accessory, fullName = false }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.exerciseRow, fullName && styles.exerciseRowFullName, { borderBottomColor: colors.border, opacity: pressed ? .6 : 1 }]}>
    <View style={[styles.exerciseIcon, fullName && styles.exerciseIconFullName, { backgroundColor: colors.surface2 }]}><Icon name={exercise.bp === 'cardio' ? 'figureRun' : 'dumbbell'} size={22} color={colors.accent} /></View>
    <View style={styles.exerciseText}><AppText numberOfLines={fullName ? undefined : 1} style={styles.exerciseName}>{exercise.n}</AppText><AppText muted numberOfLines={1} style={styles.exerciseMeta}>{exercise.tg || exercise.bp} · {exercise.eq}</AppText></View>{accessory}
  </Pressable>;
}
export function useExerciseSearch(S, query, muscles) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const qWords = q.split(/\s+/).filter(Boolean);
    const usage = new Map();
    S.workouts.forEach(w => {
      const time = new Date(w.d).getTime() || 0;
      w.entries.forEach(e => {
        const u = usage.get(e.id) || { count: 0, last: 0, routine: 0 };
        u.count++;
        if (time > u.last) u.last = time;
        usage.set(e.id, u);
      });
    });
    S.routines.forEach(r => {
      r.ex.forEach(e => {
        const u = usage.get(e.id) || { count: 0, last: 0, routine: 0 };
        u.routine++;
        usage.set(e.id, u);
      });
    });

    const results = [];
    for (const ex of allExercises(S)) {
      if (muscles.size > 0 && ![...muscles].some(m => musclesOf(ex)[m])) continue;
      
      const tStr = `${ex.n} ${ex.tg} ${ex.eq} ${ex.desc || ''}`.toLowerCase();
      let score = 100;
      if (qWords.length > 0) {
        score = 0;
        let allMatched = true;
        for (const qw of qWords) {
          if (tStr.includes(qw)) {
            score += 10;
            continue;
          }
          // subsequence match (e.g. "rdl" matches "romanian deadlift")
          let i = 0;
          for (const c of tStr) {
            if (c === qw[i]) i++;
            if (i === qw.length) break;
          }
          if (i === qw.length) {
            score += 5;
            continue;
          }
          // 1 typo tolerance for longer words
          if (qw.length >= 3) {
            const tWords = tStr.split(/\s+/).filter(Boolean);
            let typoMatch = false;
            for (const tw of tWords) {
              if (Math.abs(tw.length - qw.length) <= 1) {
                let diff = 0;
                let qIdx = 0, tIdx = 0;
                while (qIdx < qw.length && tIdx < tw.length) {
                  if (qw[qIdx] !== tw[tIdx]) {
                    diff++;
                    if (diff > 1) break;
                    if (qw.length > tw.length) qIdx++;
                    else if (tw.length > qw.length) tIdx++;
                    else { qIdx++; tIdx++; }
                  } else { qIdx++; tIdx++; }
                }
                diff += (qw.length - qIdx) + (tw.length - tIdx);
                if (diff <= 1) { score += 3; typoMatch = true; break; }
                // transposition
                if (qw.length === tw.length && diff === 2) {
                  let bad = [];
                  for (let k = 0; k < tw.length; k++) if (tw[k] !== qw[k]) bad.push(k);
                  if (bad.length === 2 && tw[bad[0]] === qw[bad[1]] && tw[bad[1]] === qw[bad[0]]) {
                    score += 3; typoMatch = true; break;
                  }
                }
              }
            }
            if (typoMatch) continue;
          }
          allMatched = false;
          break;
        }
        if (!allMatched) continue;
      }

      const u = usage.get(ex.id) || { count: 0, last: 0, routine: 0 };
      results.push({ ex, score, u });
    }

    return results.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.u.count !== b.u.count) return b.u.count - a.u.count;
      if (a.u.routine !== b.u.routine) return b.u.routine - a.u.routine;
      if (a.u.last !== b.u.last) return b.u.last - a.u.last;
      return a.ex.n.localeCompare(b.ex.n);
    }).map(r => r.ex);
  }, [S, query, muscles]);
}

export function ExercisePicker({ visible, onClose, onPick }) {
  const { S } = useStore(); const colors = useColors(); const [query, setQuery] = useState(''); const [muscles, setMuscles] = useState(new Set()); const [showMap, setShowMap] = useState(false); const [equipment, setEquipment] = useState('');
  useEffect(() => { if (visible) { setQuery(''); setMuscles(new Set()); setEquipment(''); setShowMap(false); } }, [visible]);
  const base = useExerciseSearch(S, query, muscles);
  const equipmentOptions = equipmentOf(base); const activeEquipment = equipmentOptions.includes(equipment) ? equipment : ''; const list = activeEquipment ? base.filter(exercise => exercise.eq === activeEquipment) : base;
  const toggleMuscle = value => { setMuscles(prev => { const next = new Set(prev); next.has(value) ? next.delete(value) : next.add(value); return next; }); setEquipment(''); };
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
    <Header title={t('Exercises')} subtitle={t('{0} exercises', list.length)} left={<IconButton name="close" onPress={onClose} />} />
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}><Input style={{ flex: 1 }} value={query} onChangeText={setQuery} placeholder={t('Search…')} autoCorrect={false} /><IconButton name={showMap ? 'filter-remove' : 'filter'} onPress={() => setShowMap(v => !v)} color={(muscles.size > 0 || activeEquipment) ? colors.accent : undefined} /></View>
    <FlatList data={list} keyExtractor={item => item.id} initialNumToRender={20} keyboardShouldPersistTaps="handled" ListHeaderComponent={<>{muscles.size > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerFilterContent} style={{ flexGrow: 0, marginBottom: 8 }}>{[...muscles].map(m => <Chip key={m} title={`× ${t(MUSCLE_NAME[m])}`} active onPress={() => toggleMuscle(m)} />)}</ScrollView> : null}{showMap ? <Card style={styles.muscleCard}><AppText muted style={{ fontSize: 12 }}>{t('Tap muscles to filter — multiple selections show exercises matching any')}</AppText><BodyMap body={S.body} selected={muscles} onMuscle={toggleMuscle} />{equipmentOptions.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.pickerFilterContent, { marginTop: 8 }]}><Chip title={t('Any equipment')} active={!activeEquipment} onPress={() => setEquipment('')} />{equipmentOptions.map(value => <Chip key={value} title={t(value)} active={activeEquipment === value} onPress={() => setEquipment(value)} />)}</ScrollView> : null}</Card> : null}</>} renderItem={({ item }) => <ExerciseRow exercise={item} onPress={() => onPick(item)} />} />
  </Screen></Modal>;
}
export function ExerciseDetail({ exercise, visible, onClose, footer }) {
  const ex = exercise ? exOr(exercise.id) : null;
  return <Modal visible={visible && !!ex} animationType="slide" onRequestClose={onClose}><Screen>
    {/* ponytail: titleStyle capitalize keeps raw dataset lowercase while presenting proper title case */}
    <Header title={ex?.n || ''} titleStyle={{ textTransform: 'capitalize' }} left={<IconButton name="close" onPress={onClose} />} />
    {ex ? <><ExerciseMedia exercise={ex} /><View style={styles.tags}><Chip title={t(ex.tg || ex.bp)} active /><Chip title={t(ex.eq)} /></View>{ex.mg ? <AppText muted>{t('Also works:')} {t(ex.mg)}</AppText> : null}<SectionTitle>{t('Instructions')}</SectionTitle><Card>{instrFor(ex).map((step, index) => <View key={index} style={styles.step}><AppText style={{ fontWeight: '800', width: 24 }}>{index + 1}</AppText><AppText style={{ flex: 1, lineHeight: 22 }}>{step}</AppText></View>)}</Card>{footer}</> : null}
  </Screen></Modal>;
}
function ConfigStepper({ label, value, onChange, step = 1, min = 0, suffix = '' }) {
  const colors = useColors(); const num = Number(value) || 0;
  const dec = () => onChange(Math.max(min, Math.round((num - step) * 10) / 10));
  const inc = () => onChange(Math.round((num + step) * 10) / 10);
  return <View style={styles.stepperField}>
    <AppText muted style={styles.fieldLabel}>{label}</AppText>
    <View style={[styles.stepperRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} onPress={dec} disabled={num <= min} style={({ pressed }) => [styles.stepperBtn, { opacity: num <= min ? 0.3 : pressed ? 0.6 : 1 }]}><Icon name="minus" size={20} color={colors.text} /></Pressable>
      <TextInput keyboardType="decimal-pad" selectTextOnFocus value={String(value ?? min)} onChangeText={text => onChange(Number(text.replace(',', '.')) || 0)} style={[styles.stepperInput, { color: colors.text }]} />
      {suffix ? <AppText dim style={styles.stepperSuffix}>{suffix}</AppText> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} onPress={inc} style={({ pressed }) => [styles.stepperBtn, { opacity: pressed ? 0.6 : 1 }]}><Icon name="plus" size={20} color={colors.text} /></Pressable>
    </View>
  </View>;
}
export function ExerciseConfig({ exercise, initial, visible, onClose, onSave, onDelete }) {
  const { S } = useStore(); const [config, setConfig] = useState(null); const colors = useColors();
  useEffect(() => { if (exercise && visible) setConfig({ ...defaultConfig(exercise.id), ...(initial || {}) }); }, [exercise, initial, visible]);
  if (!exercise || !config) return null;
  const mode = modeOf({ ...config, id: exercise.id });
  const updateField = (key, val) => setConfig(current => ({ ...current, [key]: val }));
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
      <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          <Header title={exercise.n} titleStyle={{ textTransform: 'capitalize' }} right={<IconButton name="close" onPress={onClose} />} />
          <ExerciseMedia exercise={exercise} mini />
          <SectionTitle>{t('Logging mode')}</SectionTitle>
          <View style={styles.tags}>{['reps', 'time', 'cardio'].map(value => <Chip key={value} title={t(value === 'reps' ? 'Reps' : value === 'time' ? 'Timed hold' : 'Cardio')} active={mode === value} onPress={() => setConfig({ ...defaultConfig(exercise.id, value), mode: value })} />)}</View>
          <View style={styles.fields}>
            <ConfigStepper label={t('Sets')} value={config.sets ?? (mode === 'cardio' ? 1 : 3)} onChange={val => updateField('sets', val)} step={1} min={1} />
            {mode === 'reps' && <ConfigStepper label={t('Reps')} value={config.reps ?? 10} onChange={val => updateField('reps', val)} step={config.side ? 2 : 1} min={1} />}
            {mode === 'time' && <ConfigStepper label={t('Seconds')} value={config.sec ?? 45} onChange={val => updateField('sec', val)} step={5} min={5} suffix="s" />}
            {mode === 'cardio' && <ConfigStepper label={t('Duration')} value={config.min ?? 20} onChange={val => updateField('min', val)} step={5} min={1} suffix="min" />}
            {mode === 'cardio' && <ConfigStepper label={t('Speed')} value={config.speed ?? 8} onChange={val => updateField('speed', val)} step={0.5} min={0} suffix="km/h" />}
            {mode !== 'cardio' && <ConfigStepper label={config.bodyweight ? t('Added weight') : t('Weight')} value={config.weight ?? 0} onChange={val => updateField('weight', val)} step={2.5} min={0} suffix={S.unit} />}
          </View>
          {mode !== 'cardio' ? <><Pressable style={styles.option} onPress={() => setConfig(value => ({ ...value, bodyweight: !value.bodyweight }))}><Icon name={config.bodyweight ? 'checkCircle' : 'circle'} color={colors.accent} size={24} /><AppText>{t('Bodyweight exercise')}</AppText></Pressable>{mode === 'reps' ? <Pressable style={styles.option} onPress={() => setConfig(value => ({ ...value, side: !value.side }))}><Icon name={config.side ? 'checkCircle' : 'circle'} color={colors.accent} size={24} /><AppText>{t('Log total reps across both sides')}</AppText></Pressable> : null}</> : null}
          <Button title={t('Save')} primary onPress={() => onSave(config)} />{onDelete ? <Button title={t('Remove exercise')} danger onPress={onDelete} /> : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({ media: { width: '100%', borderRadius: 16 }, mediaFallback: { width: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, exerciseRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth }, exerciseRowFullName: { paddingVertical: 12, alignItems: 'flex-start' }, exerciseIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, exerciseIconFullName: { marginTop: 1 }, exerciseText: { flex: 1, minWidth: 0 }, exerciseName: { fontWeight: '700', textTransform: 'capitalize', lineHeight: 21 }, exerciseMeta: { fontSize: 12, textTransform: 'capitalize', marginTop: 3 }, pickerFilters: { flexGrow: 0, height: 48 }, pickerFilterContent: { gap: 8, paddingVertical: 6, alignItems: 'center' }, muscleCard: { gap: 6, marginBottom: 8 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, step: { flexDirection: 'row', gap: 8, marginBottom: 12 }, overlay: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 16 }, dialog: { borderRadius: 20, padding: 16, maxHeight: '90%' }, fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, fieldLabel: { fontSize: 12, marginBottom: 5 }, stepperField: { flex: 1, minWidth: 130 }, stepperRow: { height: 44, flexDirection: 'row', alignItems: 'center', borderRadius: 11, borderWidth: StyleSheet.hairlineWidth }, stepperBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }, stepperInput: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 16, padding: 0 }, stepperSuffix: { fontSize: 11, marginRight: 4 }, option: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42 } });
