import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Notifications } from './src/lib/native';
import { StoreProvider, useStore } from './src/store';
import { TimerProvider } from './src/timers';
import { palette } from './src/theme';
import { Loading } from './src/components/ui';
import HomeScreen from './src/screens/HomeScreen';
import PlanScreen from './src/screens/PlanScreen';
import RoutineEditScreen from './src/screens/RoutineEditScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import StatsScreen from './src/screens/StatsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { syncReminders } from './src/lib/reminders';

Notifications?.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const TAB_ICONS = { Home: 'home', Plan: 'clipboard-text', Workout: 'dumbbell', Stats: 'chart-line', Library: 'book-open-variant' };
function MainTabs() {
  const { S } = useStore(); const colors = palette(S);
  return <Tabs.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: route.name === 'Workout' && S.active ? colors.orange : colors.accent, tabBarInactiveTintColor: colors.dim, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 70, paddingBottom: 9, paddingTop: 6 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '700' }, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={TAB_ICONS[route.name]} size={size} color={color} /> })}>
    <Tabs.Screen name="Home" component={HomeScreen} /><Tabs.Screen name="Plan" component={PlanScreen} /><Tabs.Screen name="Workout" component={WorkoutScreen} options={{ tabBarBadge: S.active ? '•' : undefined, tabBarBadgeStyle: { backgroundColor: colors.orange } }} /><Tabs.Screen name="Stats" component={StatsScreen} /><Tabs.Screen name="Library" component={LibraryScreen} />
  </Tabs.Navigator>;
}
function AppShell() {
  const { S, ready } = useStore();
  useEffect(() => { if (ready && S.reminder?.on) syncReminders(S).catch(() => {}); }, [ready, S.reminder?.on, S.reminder?.time, JSON.stringify(S.week)]);
  if (!ready) return <Loading />; const colors = palette(S); const base = colors.dark ? DarkTheme : DefaultTheme; const theme = { ...base, dark: colors.dark, colors: { ...base.colors, primary: colors.accent, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border, notification: colors.orange } };
  return <><StatusBar style={colors.dark ? 'light' : 'dark'} /><NavigationContainer theme={theme}><TimerProvider><Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}><Stack.Screen name="Main" component={MainTabs} /><Stack.Screen name="RoutineEdit" component={RoutineEditScreen} /><Stack.Screen name="History" component={HistoryScreen} /><Stack.Screen name="Settings" component={SettingsScreen} /></Stack.Navigator></TimerProvider></NavigationContainer></>;
}
export default function App() { return <StoreProvider><AppShell /></StoreProvider>; }
