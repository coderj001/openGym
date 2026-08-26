import { useMemo } from 'react';

const silentPlayer = { play() {}, seekTo() { return Promise.resolve(); } };
const useSilentPlayer = () => useMemo(() => silentPlayer, []);
const useNoopWakeLock = () => {};

let audio;
let haptics;
let keepAwake;
let notifications;
let camera;

try { audio = require('expo-audio'); } catch {}
try { haptics = require('expo-haptics'); } catch {}
try { keepAwake = require('expo-keep-awake'); } catch {}
try { notifications = require('expo-notifications'); } catch {}
try { camera = require('expo-camera'); } catch {}

export const useSoundPlayer = audio?.useAudioPlayer || useSilentPlayer;
export const useWorkoutWakeLock = keepAwake?.useKeepAwake || useNoopWakeLock;
export const Haptics = haptics || {
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
  impactAsync: () => Promise.resolve(),
  notificationAsync: () => Promise.resolve(),
};
export const Notifications = notifications || null;
export const CameraView = camera?.CameraView || null;
export const useCameraPermissions = camera?.useCameraPermissions || (() => [{ granted: false, canAskAgain: false }, async () => ({ granted: false })]);
