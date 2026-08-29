import React, { useState } from 'react';
import { Alert, Modal, ScrollView, Share, StyleSheet, View, Linking } from 'react-native';
import { useStore, DEF } from '../store';
import { ACCENTS } from '../lib/format';
import { addStarterPlan } from '../lib/plans';
import { buildDemoState } from '../lib/demoSeed';
import { exportBackup, pickAppExport, pickBackup } from '../lib/backup';
import { mergeImport } from '../lib/import-csv';
import { syncReminders } from '../lib/reminders';
import { effortOf } from '../lib/history';
import { LANGS, t } from '../lib/i18n';
import { buildAiPrompt, parseAiPlan } from '../lib/aiPlan';
import { EXIDX } from '../lib/exercises';
import { AppText, Button, Card, Chip, Header, IconButton, Input, Row, Screen, SectionTitle, Toggle, useColors } from '../components/ui';

export default function SettingsScreen({ navigation }) {
  const { S, update, replaceState } = useStore(); const colors = useColors(); const [message, setMessage] = useState('');
  const notify = value => { setMessage(value); setTimeout(() => setMessage(''), 2400); };
  const importData = async () => { try { const value = await pickBackup(); if (!value) return; Alert.alert(t('Import backup?'), t('This replaces all current data with the backup file.'), [{ text: t('Cancel') }, { text: t('Import'), style: 'destructive', onPress: () => { replaceState(value); notify(t('Backup imported')); } }]); } catch (error) { notify(`${t('Import failed')}: ${error.message}`); } };
  const importApp = async () => { try { const parsed = await pickAppExport(S.unit); if (!parsed) return; const count = parsed.kind === 'bodyweight' ? parsed.bodyweight.length : parsed.workouts.length; Alert.alert(t('Import from {0}?', parsed.source || t('another app')), t('{0} entries found. Existing dates will not be duplicated.', count), [{ text: t('Cancel') }, { text: t('Import'), onPress: () => { update(state => { mergeImport(state, parsed); }); notify(t('Import complete')); } }]); } catch (error) { notify(`${t('Import failed')}: ${error.message}`); } };
  const toggleReminder = async value => { const next = { ...S, reminder: { ...S.reminder, on: value } }; try { const allowed = await syncReminders(next); if (!allowed) return notify(t('Notification permission was not granted')); update(state => { state.reminder.on = value; }); } catch { notify(t('Could not change notification settings')); } };
  const loadDemo = () => { Alert.alert(t('Load demo data?'), t('This replaces all current data with 12 weeks of sample workouts and weight history.'), [{ text: t('Cancel') }, { text: t('Load demo data'), onPress: () => { replaceState(buildDemoState()); notify(t('Demo data loaded')); } }]); };
  const reset = () => Alert.alert(t('Reset everything?'), t('Deletes your plan, workouts and body weight on this device. This cannot be undone.'), [{ text: t('Cancel') }, { text: t('Delete everything'), style: 'destructive', onPress: () => replaceState(DEF) }]);
  return <Screen><Header title={t('Settings')} left={<IconButton name="chevron-left" onPress={() => navigation.goBack()} />} />{message ? <Card style={{ backgroundColor: `${colors.accent}22` }}><AppText style={{ color: colors.accent, textAlign: 'center', fontWeight: '700' }}>{message}</AppText></Card> : null}
    <SectionTitle>{t('Your data')}</SectionTitle><Card style={{ paddingVertical: 0 }}><Row icon="lock" title={t('All data stays on this phone')} subtitle={t('No account, no cloud — export a backup anytime.')} /></Card>
    <SectionTitle>{t('General')}</SectionTitle><Card><AppText muted style={styles.label}>{t('Language')}</AppText><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{Object.entries(LANGS).map(([value, label]) => <Chip key={value} title={label} active={(S.lang || 'en') === value} onPress={() => update(state => { state.lang = value; })} />)}</ScrollView><AppText muted style={styles.label}>{t('Weight unit')}</AppText><View style={styles.chips}>{['kg', 'lb'].map(value => <Chip key={value} title={value} active={S.unit === value} onPress={() => update(state => { state.unit = value; })} />)}</View><AppText dim style={{ fontSize: 12 }}>{t('Switching units changes labels only; logged values are not converted.')}</AppText></Card>
    <SectionTitle>{t('During a workout')}</SectionTitle><Card><AppText muted style={styles.label}>{t('Rest timer')}</AppText><View style={styles.chips}>{[60, 90, 120, 150, 180].map(value => <Chip key={value} title={`${value}s`} active={S.restSec === value} onPress={() => update(state => { state.restSec = value; })} />)}</View><Row icon="weather-sunny" title={t('Keep screen awake')}><Toggle value={S.keepAwake !== false} onValueChange={value => update(state => { state.keepAwake = value; })} /></Row><Row icon="history" title={t('Show previous performance')} subtitle={t('Show the last completed sets beside each exercise.')}><Toggle value={S.showPrevious === true} onValueChange={value => update(state => { state.showPrevious = value; })} /></Row><Row icon="bell" title={t('Sounds')}><Toggle value={!!S.sound} onValueChange={value => update(state => { state.sound = value; })} /></Row><AppText muted style={styles.label}>{t('Effort per set')}</AppText><View style={styles.chips}>{['none', 'rir', 'rpe'].map(value => <Chip key={value} title={value === 'none' ? t('Off') : value.toUpperCase()} active={effortOf(S) === value} onPress={() => update(state => { state.effort = value; delete state.showRir; })} />)}</View></Card>
    <SectionTitle>{t('Notifications')}</SectionTitle><Card><Row icon="calendar-clock" title={t('Workout day reminder')} subtitle={t('Uses only local notifications on planned days.')}><Toggle value={!!S.reminder?.on} onValueChange={toggleReminder} /></Row>{S.reminder?.on ? <><AppText muted style={styles.label}>{t('Reminder time (24-hour)')}</AppText><Input value={S.reminder.time || '08:00'} onChangeText={value => update(state => { state.reminder.time = value; })} placeholder="08:00" /></> : null}</Card>
    <SectionTitle>{t('Appearance')}</SectionTitle><Card><AppText muted style={styles.label}>{t('Theme')}</AppText><View style={styles.chips}>{['dark', 'light'].map(value => <Chip key={value} title={t(value === 'dark' ? 'Dark' : 'Light')} active={S.theme === value} onPress={() => update(state => { state.theme = value; })} />)}</View><AppText muted style={styles.label}>{t('Body diagram')}</AppText><View style={styles.chips}>{['male', 'female'].map(value => <Chip key={value} title={t(value === 'male' ? 'Male' : 'Female')} active={S.body === value} onPress={() => update(state => { state.body = value; })} />)}</View><AppText muted style={styles.label}>{t('Accent color')}</AppText><View style={styles.swatches}>{Object.entries(ACCENTS).map(([name, color]) => <View key={name} style={[styles.swatchRing, S.accent === name && { borderColor: colors.text }]}><View onTouchEnd={() => update(state => { state.accent = name; })} style={[styles.swatch, { backgroundColor: color }]} /></View>)}</View></Card>
    <SectionTitle>{t('Data')}</SectionTitle><Card style={{ paddingVertical: 0 }}><Row icon="creation" title={t('Load starter plan (PPL)')} onPress={() => { update(addStarterPlan); notify(t('Starter plan loaded — Mon Push · Wed Pull · Fri Legs')); }} /><Row icon="database" title={t('Load demo data')} subtitle={t('Populates 12 weeks of workouts & body weight')} onPress={loadDemo} /><Row icon="swap-horizontal" title={t('Import from another app')} subtitle={t('FitNotes, Strong, Hevy, or Apple Health')} onPress={importApp} /><Row icon="upload" title={t('Import backup')} onPress={importData} /><Row icon="download" title={t('Export backup (JSON)').replace('JSON', 'ZIP')} onPress={() => exportBackup(S).then(() => notify(t('Backup exported'))).catch(error => notify(error.message))} /><Row icon="trash-can" danger title={t('Reset everything')} onPress={reset} /></Card><SectionTitle>{t('AI Plan')}</SectionTitle>
    <AiPlanSection state={S} onLoad={plan => { update(state => { state.routines.push(...plan.routines); Object.assign(state.week, plan.week); }); notify(t('AI plan loaded!')); }} />
    <AppText dim style={{ textAlign: 'center', marginTop: 12, lineHeight: 20, paddingBottom: 24 }}>
      openGym · {t('free & open source (AGPL v3)')}{'\n'}
      {t('Offline-first · no account · no server')}{'\n\n'}
      <AppText onPress={() => Linking.openURL('https://github.com/coderj001/openGym/issues')} style={{ textDecorationLine: 'underline', color: colors.accent }}>
        {t('Found a bug? Report an issue on GitHub')}
      </AppText>
    </AppText>
  </Screen>;
}
const styles = StyleSheet.create({ label: { fontSize: 13, fontWeight: '700', marginTop: 5 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 }, swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, swatchRing: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', padding: 3 }, swatch: { flex: 1, borderRadius: 14 } });


const GOALS = ['Lose fat', 'Build muscle', 'Get stronger', 'Improve endurance', 'Stay active'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DAYS_OPTIONS = ['2', '3', '4', '5', '6'];

function AiPlanSection({ state, onLoad }) {
  const colors = useColors();
  const [goal, setGoal] = useState('Build muscle');
  const [level, setLevel] = useState('Beginner');
  const [days, setDays] = useState('3');
  const [historyWeeks, setHistoryWeeks] = useState(4);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState('prompt');
  const [json, setJson] = useState('');
  const [plan, setPlan] = useState(null);

  const sharePrompt = async () => {
    const prompt = buildAiPrompt({ goal, level, days: Number(days), notes: notes.trim(), state, historyWeeks });
    try {
      await Share.share({ message: prompt });
      setStep('paste');
    } catch { /* user cancelled */ }
  };

  const reviewPlan = () => {
    try {
      setPlan(parseAiPlan(json, state.exWeights));
      setStep('preview');
    } catch (err) {
      Alert.alert(t('Could not load plan'), err.message);
    }
  };

  const importPlan = () => {
    onLoad(plan);
    setJson('');
    setPlan(null);
    setStep('prompt');
  };

  return (
    <Card>
      <AppText style={{ fontWeight: '800', fontSize: 16, marginBottom: 4 }}>✨ {t('Generate with AI')}</AppText>
      <AppText muted style={{ lineHeight: 19, marginBottom: 12 }}>
        {t('Answer a few questions, copy the prompt, paste it into ChatGPT or Gemini, then paste the result back here.')}
      </AppText>

      {step === 'prompt' ? <>
        <AppText muted style={aiStyles.label}>{t('Goal')}</AppText>
        <View style={aiStyles.chips}>{GOALS.map(g => <Chip key={g} title={t(g)} active={goal === g} onPress={() => setGoal(g)} />)}</View>

        <AppText muted style={aiStyles.label}>{t('Experience')}</AppText>
        <View style={aiStyles.chips}>{LEVELS.map(l => <Chip key={l} title={t(l)} active={level === l} onPress={() => setLevel(l)} />)}</View>

        <AppText muted style={aiStyles.label}>{t('Days per week')}</AppText>
        <View style={aiStyles.chips}>{DAYS_OPTIONS.map(d => <Chip key={d} title={d} active={days === d} onPress={() => setDays(d)} />)}</View>

        <AppText muted style={aiStyles.label}>{t('Workout history to include')}</AppText>
        <View style={aiStyles.chips}>{[0, 1, 4, 12].map(value => <Chip key={value} title={value === 0 ? t('None') : `${value}w`} active={historyWeeks === value} onPress={() => setHistoryWeeks(value)} />)}</View>
        <AppText dim style={{ fontSize: 12 }}>{historyWeeks ? t('Your selected workout history and current routines are included in the shared prompt.') : t('Only your current routines are included in the shared prompt.')}</AppText>

        <AppText muted style={[aiStyles.label, { marginTop: 12 }]}>{t('Anything else? (optional)')}</AppText>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder={t('e.g. no equipment, focus on upper body…')}
          style={{ marginTop: 4 }}
        />

        <Button title={t('Copy prompt & open AI')} icon="creation" primary onPress={sharePrompt} style={{ marginTop: 14 }} />
      </> : step === 'paste' ? <>
        <AppText muted style={{ lineHeight: 19, marginBottom: 8 }}>
          {t('Paste the JSON your AI returned below, then review it.')}
        </AppText>
        <Input
          value={json}
          onChangeText={setJson}
          placeholder={'{\n  "routines": […]\n}'}
          multiline
          numberOfLines={6}
          style={{ fontFamily: 'monospace', fontSize: 13, minHeight: 120, textAlignVertical: 'top' }}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Button title={t('Back')} onPress={() => { setStep('prompt'); setJson(''); }} style={{ flex: 1 }} />
          <Button title={t('Review plan')} icon="check" primary disabled={!json.trim()} onPress={reviewPlan} style={{ flex: 1 }} />
        </View>
      </> : <>
        <AppText style={{ fontWeight: '800', fontSize: 16 }}>{t('Review generated plan')}</AppText>
        {plan.routines.map(routine => <View key={routine.id} style={aiStyles.preview}>
          <AppText style={{ fontWeight: '800' }}>{routine.name}</AppText>
          {routine.ex.map((item, index) => <AppText key={`${item.id}-${index}`} muted>{EXIDX[item.id]?.n || item.id} · {item.sets} × {item.reps}{item.weight ? ` · ${item.weight} ${state.unit}` : ''}</AppText>)}
        </View>)}
        <AppText dim style={{ fontSize: 12 }}>{t('Importing adds these routines and updates their scheduled days. Existing routines and workout history remain.')}</AppText>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Button title={t('Back')} onPress={() => setStep('paste')} style={{ flex: 1 }} />
          <Button title={t('Import plan')} icon="check" primary onPress={importPlan} style={{ flex: 1 }} />
        </View>
      </>}
    </Card>
  );
}
const aiStyles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preview: { gap: 3, paddingVertical: 7 },
});
