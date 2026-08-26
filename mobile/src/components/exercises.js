import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { allExercises, BODYPARTS, exOr, mediaFor } from '../lib/exercises';
import { defaultConfig, modeOf } from '../lib/history';
import { instrFor, t } from '../lib/i18n';
import { useStore } from '../store';
import { AppText, Button, Card, Chip, Header, IconButton, Input, Screen, SectionTitle, useColors } from './ui';

export function ExerciseMedia({ exercise, compact = false }) {
  const source = mediaFor(exercise); const colors = useColors();
  if (!source) return <View style={[styles.mediaFallback, { height: compact ? 150 : 230, backgroundColor: colors.surface2 }]}><MaterialCommunityIcons name="dumbbell" size={44} color={colors.dim} /></View>;
  return <Image source={source} style={[styles.media, { height: compact ? 180 : 280, backgroundColor: '#fff' }]} contentFit="contain" autoplay />;
}
export function ExerciseRow({ exercise, onPress, accessory, fullName = false }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.exerciseRow, fullName && styles.exerciseRowFullName, { borderBottomColor: colors.border, opacity: pressed ? .6 : 1 }]}>
    <View style={[styles.exerciseIcon, fullName && styles.exerciseIconFullName, { backgroundColor: colors.surface2 }]}><MaterialCommunityIcons name={exercise.bp === 'cardio' ? 'run' : 'dumbbell'} size={22} color={colors.accent} /></View>
    <View style={styles.exerciseText}><AppText numberOfLines={fullName ? undefined : 1} style={styles.exerciseName}>{exercise.n}</AppText><AppText muted numberOfLines={1} style={styles.exerciseMeta}>{exercise.tg || exercise.bp} · {exercise.eq}</AppText></View>{accessory}
  </Pressable>;
}
export function ExercisePicker({ visible, onClose, onPick }) {
  const { S } = useStore(); const [query, setQuery] = useState(''); const [part, setPart] = useState('');
  useEffect(() => { if (visible) { setQuery(''); setPart(''); } }, [visible]);
  const list = useMemo(() => { const q = query.trim().toLowerCase(); return allExercises(S).filter(exercise => (!part || exercise.bp === part) && (!q || `${exercise.n} ${exercise.tg} ${exercise.eq}`.toLowerCase().includes(q))); }, [S, query, part]);
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
    <Header title={t('Exercises')} subtitle={t('{0} exercises', list.length)} left={<IconButton name="close" onPress={onClose} />} />
    <Input value={query} onChangeText={setQuery} placeholder={t('Search…')} autoCorrect={false} />
    <ScrollView horizontal style={styles.pickerFilters} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerFilterContent}><Chip title={t('All')} active={!part} onPress={() => setPart('')} />{BODYPARTS.map(value => <Chip key={value} title={t(value)} active={part === value} onPress={() => setPart(value)} />)}</ScrollView>
    <FlatList data={list} keyExtractor={item => item.id} initialNumToRender={20} keyboardShouldPersistTaps="handled" renderItem={({ item }) => <ExerciseRow exercise={item} onPress={() => onPick(item)} />} />
  </Screen></Modal>;
}
export function ExerciseDetail({ exercise, visible, onClose, footer }) {
  const ex = exercise ? exOr(exercise.id) : null;
  return <Modal visible={visible && !!ex} animationType="slide" onRequestClose={onClose}><Screen>
    <Header title={ex?.n || ''} left={<IconButton name="close" onPress={onClose} />} />
    {ex ? <><ExerciseMedia exercise={ex} /><View style={styles.tags}><Chip title={t(ex.tg || ex.bp)} active /><Chip title={t(ex.eq)} /></View>{ex.mg ? <AppText muted>{t('Also works:')} {t(ex.mg)}</AppText> : null}<SectionTitle>{t('Instructions')}</SectionTitle><Card>{instrFor(ex).map((step, index) => <View key={index} style={styles.step}><AppText style={{ fontWeight: '800', width: 24 }}>{index + 1}</AppText><AppText style={{ flex: 1, lineHeight: 22 }}>{step}</AppText></View>)}</Card>{footer}</> : null}
  </Screen></Modal>;
}
export function ExerciseConfig({ exercise, initial, visible, onClose, onSave, onDelete }) {
  const [config, setConfig] = useState(null); const colors = useColors();
  useEffect(() => { if (exercise && visible) setConfig({ ...defaultConfig(exercise.id), ...(initial || {}) }); }, [exercise, initial, visible]);
  if (!exercise || !config) return null;
  const mode = modeOf({ ...config, id: exercise.id });
  const field = (key, label, fallback) => <View style={{ flex: 1 }}><AppText muted style={styles.fieldLabel}>{label}</AppText><Input keyboardType="decimal-pad" value={String(config[key] ?? fallback)} onChangeText={value => setConfig(current => ({ ...current, [key]: Number(value.replace(',', '.')) || 0 }))} /></View>;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.overlay}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.dialog, { backgroundColor: colors.surface }]}>
    <Header title={exercise.n} right={<IconButton name="close" onPress={onClose} />} />
    <SectionTitle>{t('Logging mode')}</SectionTitle><View style={styles.tags}>{['reps', 'time', 'cardio'].map(value => <Chip key={value} title={t(value === 'reps' ? 'Reps' : value === 'time' ? 'Timed hold' : 'Cardio')} active={mode === value} onPress={() => setConfig({ ...defaultConfig(exercise.id, value), mode: value })} />)}</View>
    <View style={styles.fields}>{field('sets', t('Sets'), 3)}{mode === 'reps' && field('reps', t('Reps'), 10)}{mode === 'time' && field('sec', t('Seconds'), 45)}{mode === 'cardio' && field('min', t('Duration (min)'), 20)}{mode === 'cardio' && field('speed', t('Speed (km/h)'), 8)}{mode !== 'cardio' && field('weight', config.bodyweight ? t('Added weight') : t('Weight'), 0)}</View>
    {mode !== 'cardio' ? <><Pressable style={styles.option} onPress={() => setConfig(value => ({ ...value, bodyweight: !value.bodyweight }))}><MaterialCommunityIcons name={config.bodyweight ? 'checkbox-marked' : 'checkbox-blank-outline'} color={colors.accent} size={24} /><AppText>{t('Bodyweight exercise')}</AppText></Pressable>{mode === 'reps' ? <Pressable style={styles.option} onPress={() => setConfig(value => ({ ...value, side: !value.side }))}><MaterialCommunityIcons name={config.side ? 'checkbox-marked' : 'checkbox-blank-outline'} color={colors.accent} size={24} /><AppText>{t('Log total reps across both sides')}</AppText></Pressable> : null}</> : null}
    <Button title={t('Save')} primary onPress={() => onSave(config)} />{onDelete ? <Button title={t('Remove exercise')} danger onPress={onDelete} /> : null}
  </ScrollView></View></Modal>;
}
const styles = StyleSheet.create({ media: { width: '100%', borderRadius: 16 }, mediaFallback: { width: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, exerciseRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth }, exerciseRowFullName: { paddingVertical: 12, alignItems: 'flex-start' }, exerciseIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, exerciseIconFullName: { marginTop: 1 }, exerciseText: { flex: 1, minWidth: 0 }, exerciseName: { fontWeight: '700', textTransform: 'capitalize', lineHeight: 21 }, exerciseMeta: { fontSize: 12, textTransform: 'capitalize', marginTop: 3 }, pickerFilters: { flexGrow: 0, height: 48 }, pickerFilterContent: { gap: 8, paddingVertical: 6, alignItems: 'center' }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, step: { flexDirection: 'row', gap: 8, marginBottom: 12 }, overlay: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 16 }, dialog: { borderRadius: 20, padding: 16, gap: 12, maxHeight: '90%' }, fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, fieldLabel: { fontSize: 12, marginBottom: 5 }, option: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42 } });
