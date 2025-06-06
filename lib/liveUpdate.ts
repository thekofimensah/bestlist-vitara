import { sync, setConfig } from '@capacitor/live-updates';
import { Capacitor } from '@capacitor/core';

export const initializeLiveUpdate = async () => {
  // Only initialize Live Updates on native platforms
  if (Capacitor.isNativePlatform()) {
    try {
      await setConfig({
        appId: '9583de03',
        channel: 'production',
        autoUpdateMethod: 'background'
      });
      await sync();
    } catch (error) {
      console.warn('Live Updates initialization failed:', error);
    }
  }
};
