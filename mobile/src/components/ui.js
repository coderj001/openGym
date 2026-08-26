import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch as NativeSwitch, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { palette } from '../theme';

export const useColors = () => palette(useStore().S);
export function Screen({ children, scroll = true, contentStyle, testID }) {
  const colors = useColors();
  const body = scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, contentStyle]}>{children}</ScrollView> : <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>;
  return <SafeAreaView testID={testID} edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>{body}</SafeAreaView>;
}
export function Loading() { const colors = useColors(); return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.accent} size="large" /></View>; }
export function Header({ title, subtitle, left, right }) {
  const colors = useColors();
  return <View style={styles.header}>{left}<View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.text }]}>{title}</Text>{subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}</View>{right}</View>;
}
export function Card({ children, style }) { const c = useColors(); return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</View>; }
export function SectionTitle({ children, style }) { const c = useColors(); return <Text style={[styles.section, { color: c.muted }, style]}>{children}</Text>; }
export function AppText({ children, muted, dim, style, numberOfLines }) { const c = useColors(); return <Text numberOfLines={numberOfLines} style={[styles.text, { color: dim ? c.dim : muted ? c.muted : c.text }, style]}>{children}</Text>; }
export function Button({ title, onPress, icon, danger, primary, disabled, compact, style }) {
  const c = useColors(); const bg = danger ? c.danger : primary ? c.accent : c.surface2;
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, compact && styles.buttonCompact, { backgroundColor: bg, opacity: disabled ? .35 : pressed ? .7 : 1 }, style]}>
    {icon ? <MaterialCommunityIcons name={icon} size={18} color={primary && !c.dark ? '#000' : '#fff'} /> : null}
    <Text style={[styles.buttonText, { color: primary && !c.dark ? '#000' : danger || primary || c.dark ? '#fff' : c.text }]}>{title}</Text>
  </Pressable>;
}
export function IconButton({ name, onPress, color, size = 22, disabled, style, accessibilityLabel }) { const c = useColors(); return <Pressable accessibilityLabel={accessibilityLabel} disabled={disabled} onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.iconButton, { backgroundColor: c.surface2, opacity: disabled ? .3 : pressed ? .6 : 1 }, style]}><MaterialCommunityIcons name={name} size={size} color={color || c.text} /></Pressable>; }
export function Input({ style, ...props }) { const c = useColors(); return <TextInput placeholderTextColor={c.dim} {...props} style={[styles.input, { color: c.text, backgroundColor: c.surface2, borderColor: c.border }, style]} />; }
export function Row({ title, subtitle, icon, onPress, children, danger, style }) {
  const c = useColors(); const inner = <><View style={[styles.rowIcon, { backgroundColor: c.surface2 }]}>{icon ? <MaterialCommunityIcons name={icon} size={21} color={danger ? c.danger : c.accent} /> : null}</View><View style={{ flex: 1 }}><AppText style={{ fontWeight: '600' }}>{title}</AppText>{subtitle ? <AppText muted style={{ fontSize: 12, marginTop: 2 }}>{subtitle}</AppText> : null}</View>{children}{onPress ? <MaterialCommunityIcons name="chevron-right" size={22} color={c.dim} /> : null}</>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { borderBottomColor: c.border, opacity: pressed ? .65 : 1 }, style]}>{inner}</Pressable> : <View style={[styles.row, { borderBottomColor: c.border }, style]}>{inner}</View>;
}
export function Toggle({ value, onValueChange, disabled }) { const c = useColors(); return <NativeSwitch disabled={disabled} value={value} onValueChange={onValueChange} trackColor={{ true: c.accent }} />; }
export function Chip({ title, active, onPress }) { const c = useColors(); return <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? c.accent : c.surface2 }]}><Text style={{ color: active && !c.dark ? '#000' : c.text, fontWeight: '600', fontSize: 13 }}>{title}</Text></Pressable>; }
export function Progress({ value, color }) { const c = useColors(); return <View style={[styles.progress, { backgroundColor: c.surface2 }]}><View style={{ flex: Math.max(0, Math.min(1, value || 0)), backgroundColor: color || c.accent, borderRadius: 3 }} /><View style={{ flex: Math.max(0, 1 - Math.min(1, value || 0)) }} /></View>; }

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 12 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { minHeight: 56, flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 4 }, title: { fontSize: 30, fontWeight: '800', letterSpacing: -.8 }, subtitle: { fontSize: 14, marginTop: 2 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14 }, section: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: .8, marginTop: 8, marginHorizontal: 4 }, text: { fontSize: 16 },
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, buttonCompact: { minHeight: 36, paddingHorizontal: 12 }, buttonText: { fontSize: 15, fontWeight: '700' },
  iconButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, input: { minHeight: 46, borderWidth: StyleSheet.hairlineWidth, borderRadius: 11, paddingHorizontal: 12, fontSize: 16 },
  row: { minHeight: 58, paddingVertical: 9, flexDirection: 'row', gap: 10, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth }, rowIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: 18, minHeight: 36, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' }, progress: { height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' },
});
