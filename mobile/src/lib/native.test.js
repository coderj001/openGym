describe('optional native modules', () => {
  it('does not block app startup when an installed client lacks them', () => {
    jest.resetModules();
    jest.doMock('expo-audio', () => { throw new Error('missing ExpoAudio'); });
    jest.doMock('expo-haptics', () => { throw new Error('missing ExpoHaptics'); });
    jest.doMock('expo-keep-awake', () => { throw new Error('missing ExpoKeepAwake'); });
    jest.doMock('expo-notifications', () => { throw new Error('missing ExpoNotifications'); });
    let native;
    expect(() => jest.isolateModules(() => { native = require('./native'); })).not.toThrow();
    expect(native.Notifications).toBeNull();
    expect(native.Haptics.notificationAsync()).resolves.toBeUndefined();
  });
});
