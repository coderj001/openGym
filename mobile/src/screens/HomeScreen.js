import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '../store';
import { effectiveRoutine, lastBW, streakWeeks } from '../lib/history';
import { DAYS, fmtDate, fmtNum, isoOf, todayISO, uid, weekKey } from '../lib/format';
import { addStarterPlan } from '../lib/plans';
import { t } from '../lib/i18n';
import Chart from '../components/Chart';
import { AppText, Button, Card, Chip, Header, IconButton, Input, Screen, useColors } from '../components/ui';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// -- Week view (existing) --
function WeekView({ weekDays, today, done, S, colors, setOverrideDay }) {
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
            <View style={[styles.dot, { backgroundColor: done.has(iso) ? colors.orange : planned ? colors.accent : colors.surface2 }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

// -- Month view --
function MonthView({ today, done, colors }) {
  const ref = new Date(`${today}T12:00:00`);
  const year = ref.getFullYear();
  const month = ref.getMonth();
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
              <View style={[
                styles.monthDot,
                worked && { backgroundColor: colors.orange },
                isToday && !worked && { backgroundColor: colors.accent },
              ]}>
                <AppText style={[
                  { fontSize: 11, fontWeight: '600' },
                  { color: (worked || isToday) ? (colors.dark ? '#fff' : '#000') : colors.muted },
                ]}>{date.getDate()}</AppText>
              </View>
            </View>
          );
        })}
      </View>
      <AppText muted style={{ fontSize: 12, textAlign: 'center', marginTop: 6 }}>
        {MONTH_NAMES[month]} {year} · {[...done].filter(d => d.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).length} {t('workouts')}
      </AppText>
    </View>
  );
}

// -- Year view --
function YearView({ today, done, colors }) {
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
                  <View key={d} style={[
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
}

export default function HomeScreen({ navigation }) {
  const { S, update } = useStore(); const colors = useColors();
  const [weightOpen, setWeightOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [value, setValue] = useState('');
  const [overrideDay, setOverrideDay] = useState(null);
  const [calView, setCalView] = useState('week'); // 'week' | 'month' | 'year'
  const today = todayISO(); const routine = effectiveRoutine(S, today); const bw = lastBW(S);
  const weekDays = useMemo(() => { const date = new Date(); const monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, index) => { const item = new Date(monday); item.setDate(monday.getDate() + index); return { date: item, iso: isoOf(item) }; }); }, [today]);
  const done = useMemo(() => new Set(S.workouts.map(w => w.d)), [S.workouts]);
  const weekCount = S.workouts.filter(workout => weekKey(workout.d) === weekKey(today)).length;
  const openWeight = goal => { const current = goal ? S.targetW : bw?.w; setValue(String(current || (S.unit === 'kg' ? 75 : 165))); goal ? setGoalOpen(true) : setWeightOpen(true); };
  const saveWeight = goal => { const number = Number(value.replace(',', '.')); if (!(number > 0)) return; update(state => { if (goal) state.targetW = number; else { const current = state.bodyweight.find(item => item.d === today); if (current) { current.w = number; current.t = Date.now(); } else state.bodyweight.push({ id: uid(), d: today, t: Date.now(), w: number }); } }); goal ? setGoalOpen(false) : setWeightOpen(false); };
  const start = () => navigation.navigate('Workout', { routineId: routine?.id || null, requestStart: Date.now() });
  return <Screen>
    <Header title="openGym" subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} right={<IconButton name="cog" onPress={() => navigation.navigate('Settings')} accessibilityLabel={t('Settings')} />} />
    <Card>
      <View style={styles.calHeader}>
        <AppText style={{ fontWeight: '700' }}>
          {calView === 'week' ? t('This week') : calView === 'month' ? MONTH_NAMES[new Date().getMonth()] + ' ' + new Date().getFullYear() : String(new Date().getFullYear())}
        </AppText>
        <View style={styles.calTabs}>
          {['week','month','year'].map(v => (
            <Pressable key={v} onPress={() => setCalView(v)} style={[styles.calTab, calView === v && { backgroundColor: colors.accent }]}>
              <AppText style={{ fontSize: 12, fontWeight: '700', color: calView === v ? (colors.dark ? '#fff' : '#000') : colors.muted }}>
                {v === 'week' ? t('W') : v === 'month' ? t('M') : t('Y')}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
      {calView === 'week' && <WeekView weekDays={weekDays} today={today} done={done} S={S} colors={colors} setOverrideDay={setOverrideDay} />}
      {calView === 'month' && <MonthView today={today} done={done} colors={colors} />}
      {calView === 'year' && <YearView today={today} done={done} colors={colors} />}
      <Pressable onPress={S.active ? () => navigation.navigate('Workout') : start} style={[styles.today, { borderTopColor: colors.border }]}><View style={[styles.bigIcon, { backgroundColor: S.active ? colors.orange : routine ? colors.accent : colors.surface2 }]}><MaterialCommunityIcons name={S.active ? 'timer-outline' : routine ? 'dumbbell' : 'weather-night'} size={23} color={routine || S.active ? '#fff' : colors.muted} /></View><View style={{ flex: 1 }}><AppText muted style={{ fontSize: 12 }}>{t('Today')}</AppText><AppText style={{ fontWeight: '800' }}>{S.active ? `${S.active.name} — ${t('in progress')}` : routine?.name || t('Rest day')}</AppText></View><AppText style={{ color: colors.accent, fontWeight: '800' }}>{S.active ? t('Resume') : routine ? t('Start') : '+'}</AppText></Pressable>
    </Card>
    {!S.routines.length && !S.active ? <Card><AppText style={{ fontSize: 22, fontWeight: '800' }}>{t('Welcome!')}</AppText><AppText muted style={{ lineHeight: 21, marginVertical: 8 }}>{t('Set up your weekly routine to get going — or load a ready-made Push / Pull / Legs plan.')}</AppText><Button title={t('Load starter plan (PPL)')} icon="creation" primary onPress={() => update(addStarterPlan)} /><View style={{ height: 8 }} /><Button title={t('Build my own plan')} onPress={() => navigation.navigate('Plan')} /></Card> : null}
    <Card><View style={styles.between}><AppText style={{ fontSize: 20, fontWeight: '800' }}>{t('Body weight')}</AppText><View style={{ flexDirection: 'row', gap: 8 }}><Button compact title={S.targetW ? fmtNum(S.targetW) : t('Goal')} onPress={() => openWeight(true)} /><Button compact title={t('Log')} icon="plus" onPress={() => openWeight(false)} /></View></View>{bw ? <><AppText style={{ fontSize: 30, fontWeight: '800', marginTop: 10 }}>{fmtNum(bw.w)} <AppText muted>{S.unit}</AppText></AppText><AppText dim style={{ fontSize: 12 }}>{fmtDate(bw.d, true)}{S.targetW ? ` · ${t('Goal')} ${fmtNum(S.targetW)} ${S.unit}` : ''}</AppText><Chart points={S.bodyweight.slice(-30).map(item => ({ y: item.w }))} unit={S.unit} height={120} /></> : <AppText muted style={{ marginTop: 12 }}>{t('No entries yet — log your weight to start the curve.')}</AppText>}</Card>
    <Card><View style={styles.between}><View><AppText style={{ fontSize: 21, fontWeight: '800' }}>🔥 {t('{0} week streak', streakWeeks(S))}</AppText><AppText muted style={{ marginTop: 4 }}>{weekCount} {t('this week')} · {t('{0} workouts total', S.workouts.length)}</AppText></View><MaterialCommunityIcons name="calendar-month" size={28} color={colors.muted} /></View></Card>
    <Modal transparent visible={!!overrideDay} animationType="fade" onRequestClose={() => setOverrideDay(null)}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.surface }]}><AppText style={{ fontSize: 21, fontWeight: '800' }}>{overrideDay ? fmtDate(overrideDay, true) : ''}</AppText><Button title={t('Use weekly schedule')} onPress={() => { update(state => { delete state.dayPlan[overrideDay]; }); setOverrideDay(null); }} /><Button title={t('Rest day')} onPress={() => { update(state => { state.dayPlan[overrideDay] = 'rest'; }); setOverrideDay(null); }} />{S.routines.map(item => <Button key={item.id} title={item.name} onPress={() => { update(state => { state.dayPlan[overrideDay] = item.id; }); setOverrideDay(null); }} />)}<Button title={t('Cancel')} onPress={() => setOverrideDay(null)} /></View></View></Modal>
    <WeightModal visible={weightOpen} title={t('Log body weight')} value={value} setValue={setValue} unit={S.unit} close={() => setWeightOpen(false)} save={() => saveWeight(false)} />
    <WeightModal visible={goalOpen} title={t('Body weight goal')} value={value} setValue={setValue} unit={S.unit} close={() => setGoalOpen(false)} save={() => saveWeight(true)} />
  </Screen>;
}
function WeightModal({ visible, title, value, setValue, unit, close, save }) { const colors = useColors(); return <Modal transparent visible={visible} animationType="fade" onRequestClose={close}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.surface }]}><AppText style={{ fontSize: 21, fontWeight: '800' }}>{title}</AppText><Input autoFocus keyboardType="decimal-pad" value={value} onChangeText={setValue} /><AppText muted>{unit}</AppText><Button title={t('Save')} primary onPress={save} /><Button title={t('Cancel')} onPress={close} /></View></View></Modal>; }
const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 5 },
  dayNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  today: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 12 },
  bigIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
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
