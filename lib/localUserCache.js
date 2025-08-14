import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const AVATAR_KEY = (userId) => `local_avatar_url_${userId}`;
const STATS_KEY = (userId) => `local_user_stats_${userId}`;
const BASIC_PROFILE_KEY = (userId) => `local_basic_profile_${userId}`;

export const saveAvatarUrl = async (userId, url) => {
  if (!userId || !url) return;
  try {
    await Preferences.set({ key: AVATAR_KEY(userId), value: url });
  } catch (_) {}
};

export const getAvatarUrl = async (userId) => {
  if (!userId) return null;
  try {
    const { value } = await Preferences.get({ key: AVATAR_KEY(userId) });
    return value || null;
  } catch (_) { return null; }
};

export const saveStatsLocal = async (userId, stats) => {
  if (!userId || !stats) return;
  try {
    await Preferences.set({ key: STATS_KEY(userId), value: JSON.stringify(stats) });
  } catch (_) {}
};

export const getStatsLocal = async (userId) => {
  if (!userId) return null;
  try {
    const { value } = await Preferences.get({ key: STATS_KEY(userId) });
    return value ? JSON.parse(value) : null;
  } catch (_) { return null; }
};

export const saveBasicProfile = async (userId, profile) => {
  if (!userId || !profile) return;
  try {
    const payload = {
      display_name: profile.display_name || null,
      username: profile.username || null,
      email: profile.email || null,
      updated_at: Date.now()
    };
    await Preferences.set({ key: BASIC_PROFILE_KEY(userId), value: JSON.stringify(payload) });
  } catch (_) {}
};

export const getBasicProfile = async (userId) => {
  if (!userId) return null;
  try {
    const { value } = await Preferences.get({ key: BASIC_PROFILE_KEY(userId) });
    return value ? JSON.parse(value) : null;
  } catch (_) { return null; }
};

// Utility to persist a base64 image to a local file and return a usable URL
export const persistBase64Image = async (base64Data, path) => {
  try {
    await Filesystem.writeFile({ path, data: base64Data, directory: Directory.Data });
    const uri = await Filesystem.getUri({ path, directory: Directory.Data });
    // In web, return the data URL; in native, return the file URI
    return Capacitor.isNativePlatform() ? uri.uri : `data:image/webp;base64,${base64Data}`;
  } catch (e) {
    return `data:image/webp;base64,${base64Data}`;
  }
};


