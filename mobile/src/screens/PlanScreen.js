import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '../store';
import { DAYN, exCount, uid } from '../lib/format';
import { addStarterPlan } from '../lib/plans';
import { t } from '../lib/i18n';
import { AppText, Button, Card, Header, IconButton, Row, Screen, SectionTitle, useColors } from '../components/ui';

export default function PlanScreen({ navigation }) {
  const { S, update } = useStore(); const colors = useColors(); const [day, setDay] = useState(null);
  const add = () => { const id = uid(); update(state => state.routines.push({ id, name: t('New routine'), emoji: 'dumbbell', prog: 'linear', ex: [] })); navigation.navigate('RoutineEdit', { id }); };
  return <Screen><Header title={t('Plan')} subtitle={t('Your weekly routine')} right={<IconButton name="plus" onPress={add} />} /><SectionTitle>{t('Week schedule')}</SectionTitle><Card style={{ paddingVertical: 0 }}>{[1, 2, 3, 4, 5, 6, 0].map(value => { const routine = S.routines.find(item => item.id === S.week[value]); return <Row key={value} title={t(DAYN[value])} onPress={() => setDay(value)}>{routine ? <View style={[styles.tag, { backgroundColor: `${colors.accent}25` }]}><AppText style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>{routine.name}</AppText></View> : <AppText muted>{t('Rest')}</AppText>}</Row>; })}</Card>
    <View style={styles.heading}><SectionTitle style={{ marginTop: 0 }}>{t('Routines')}</SectionTitle><Button compact title={t('New')} icon="plus" onPress={add} /></View>
    {S.routines.length ? <Card style={{ paddingVertical: 0 }}>{S.routines.map(routine => <Row key={routine.id} icon="dumbbell" title={routine.name} subtitle={exCount(routine.ex.length)} onPress={() => navigation.navigate('RoutineEdit', { id: routine.id })} />)}</Card> : <Card><AppText muted style={{ textAlign: 'center', marginBottom: 12 }}>{t('No routines yet. Create one or load the starter plan.')}</AppText><Button title={t('Load starter plan (Push / Pull / Legs)')} icon="creation" primary onPress={() => update(addStarterPlan)} /></Card>}
    <Modal transparent visible={day !== null} animationType="fade" onRequestClose={() => setDay(null)}><View style={styles.overlay}><View style={[styles.dialog, { backgroundColor: colors.surface }]}><AppText style={{ fontSize: 22, fontWeight: '800' }}>{day !== null ? t(DAYN[day]) : ''}</AppText><Pressable style={styles.choice} onPress={() => { update(state => { delete state.week[day]; }); setDay(null); }}><MaterialCommunityIcons name="weather-night" size={22} color={colors.muted} /><AppText>{t('Rest')}</AppText></Pressable>{S.routines.map(routine => <Pressable key={routine.id} style={styles.choice} onPress={() => { update(state => { state.week[day] = routine.id; }); setDay(null); }}><MaterialCommunityIcons name="dumbbell" size={22} color={colors.accent} /><AppText>{routine.name}</AppText></Pressable>)}<Button title={t('Cancel')} onPress={() => setDay(null)} /></View></View></Modal>
  </Screen>;
}
const styles = StyleSheet.create({ tag: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }, overlay: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: '#000a' }, dialog: { padding: 18, borderRadius: 18, gap: 8 }, choice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 } });
