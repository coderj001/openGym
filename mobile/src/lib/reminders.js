import { Platform } from 'react-native';
import { Notifications } from './native';

export async function syncReminders(state) {
  if (!Notifications) return !state.reminder?.on;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!state.reminder?.on) return true;
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('workout-reminders', { name: 'Workout reminders', importance: Notifications.AndroidImportance.DEFAULT });
  const [hour, minute] = (state.reminder.time || '08:00').split(':').map(Number);
  const planned = Object.keys(state.week).filter(day => state.week[day]);
  await Promise.all(planned.map(day => Notifications.scheduleNotificationAsync({
    content: { title: 'openGym', body: 'A workout is planned for today.', sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: Number(day) + 1, hour, minute, channelId: 'workout-reminders' },
  })));
  return true;
}
