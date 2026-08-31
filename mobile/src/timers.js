import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './components/Icon';
import { Haptics, useSoundPlayer } from './lib/native';
import { useColors } from './components/ui';
import { useStore } from './store';
import { shadows, spacing, type } from './theme';

const TimerActionsContext = createContext(null);
const TimerStateContext = createContext(null);
export function TimerProvider({ children }) {
  const [rest, setRest] = useState(null);
  const [now, setNow] = useState(Date.now());
  const { S } = useStore();
  const player = useSoundPlayer(require('../assets/beep.wav'));
  useEffect(() => {
    if (!rest) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [rest]);
  const left = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  useEffect(() => {
    if (rest && left === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (S.sound) { player.seekTo(0); player.play(); }
      setRest(null);
    }
  }, [left, rest, S.sound, player]);
  const startRest = useCallback(seconds => setRest({ total: seconds, endsAt: Date.now() + seconds * 1000 }), []);
  const addRest = useCallback(seconds => setRest(value => value ? { total: Math.max(1, value.total + seconds), endsAt: value.endsAt + seconds * 1000 } : null), []);
  const stopRest = useCallback(() => setRest(null), []);
  const actions = useMemo(() => ({ startRest, addRest, stopRest }), [startRest, addRest, stopRest]);
  const state = useMemo(() => ({ rest, left }), [rest, left]);
  return <TimerActionsContext.Provider value={actions}><TimerStateContext.Provider value={state}>{children}<TimerBanner /></TimerStateContext.Provider></TimerActionsContext.Provider>;
}
export const useTimers = () => useContext(TimerActionsContext);
function TimerBanner() {
  const colors = useColors(); const { rest, left } = useContext(TimerStateContext); const { addRest, stopRest } = useTimers();
  if (!rest) return null;
  return <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Icon name="timer-outline" size={20} color={colors.orange} />
    <Text style={[styles.label, { color: colors.text }]}>Rest {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Subtract 15 seconds" onPress={() => addRest(-15)}><Text style={[styles.action, { color: colors.accent }]}>−15</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Add 15 seconds" onPress={() => addRest(15)}><Text style={[styles.action, { color: colors.accent }]}>+15</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Stop rest timer" onPress={stopRest}><Icon name="close" size={21} color={colors.muted} /></Pressable>
  </View>;
}
const styles = StyleSheet.create({ banner: { position: 'absolute', zIndex: 50, bottom: 86, left: spacing.md, right: spacing.md, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: spacing.md, boxShadow: shadows.floating }, label: { flex: 1, fontWeight: '800', fontSize: type.body }, action: { fontWeight: '800' } });
