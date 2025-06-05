import { initialize } from '@capacitor/live-updates';

export const initializeLiveUpdate = () => {
  initialize({
    appId: 'your-appflow-id',
    channel: 'production',
    autoUpdateMethod: 'background',
    maxStoreAgeInDays: 30,
  });
};
