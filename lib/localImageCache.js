// Lightweight local image cache using Capacitor Filesystem + Preferences
// Goal: return a local file URL for a remote image when available; otherwise
// use remote and cache in background. Keeps complexity low.

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const INDEX_KEY = 'local_image_cache_index_v1';
let cacheIndex = null; // Map<string, string> remoteUrl -> localPath
let loadingIndexPromise = null;

const ensureIndexLoaded = async () => {
  if (cacheIndex) return cacheIndex;
  if (!loadingIndexPromise) {
    loadingIndexPromise = Preferences.get({ key: INDEX_KEY })
      .then(({ value }) => {
        try {
          const parsed = value ? JSON.parse(value) : {};
          cacheIndex = new Map(Object.entries(parsed));
        } catch (_) {
          cacheIndex = new Map();
        }
        return cacheIndex;
      })
      .catch(() => {
        cacheIndex = new Map();
        return cacheIndex;
      });
  }
  return loadingIndexPromise;
};

const persistIndex = async () => {
  if (!cacheIndex) return;
  const obj = Object.fromEntries(cacheIndex.entries());
  await Preferences.set({ key: INDEX_KEY, value: JSON.stringify(obj) });
};

const hashString = (input) => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

export const getCachedLocalUrl = async (remoteUrl) => {
  if (!remoteUrl) return null;
  const index = await ensureIndexLoaded();
  const path = index.get(remoteUrl);
  if (!path) return null;
  try {
    // Verify the file still exists
    await Filesystem.stat({ path, directory: Directory.Data });
    // Resolve to a file:// URI and convert for webview
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Data });
    return Capacitor.convertFileSrc?.(uri) || uri;
  } catch (_) {
    // stale mapping
    index.delete(remoteUrl);
    await persistIndex();
    return null;
  }
};

export const cacheRemoteImage = async (remoteUrl, userId) => {
  if (!remoteUrl || !userId) return null;
  try {
    const res = await fetch(remoteUrl, { mode: 'cors', cache: 'force-cache' });
    const blob = await res.blob();
    const base64 = await blobToBase64(blob);
    const ext = (blob.type && blob.type.split('/')[1]) || 'jpg';
    const folder = userId || 'common';
    const dirPath = `images/${folder}`;
    const filename = `${dirPath}/${hashString(remoteUrl)}.${ext}`;
    try {
      await Filesystem.mkdir({ path: dirPath, directory: Directory.Data, recursive: true });
    } catch (_) {}
    await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Data });
    const index = await ensureIndexLoaded();
    index.set(remoteUrl, filename);
    await persistIndex();
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Data });
    return Capacitor.convertFileSrc?.(uri) || uri;
  } catch (err) {
    console.warn('localImageCache: failed to cache', err?.message || err);
    return null;
  }
};

// Convenience: try cached first; if missing, start background cache
export const getLocalFirstUrl = async (remoteUrl, userId, onCached) => {
  const existing = await getCachedLocalUrl(remoteUrl);
  if (existing) return existing;
  // Start background cache; notify when ready
  cacheRemoteImage(remoteUrl, userId || 'common').then((local) => {
    if (local && typeof onCached === 'function') onCached(local);
  });
  return null;
};

// Remove a cached image (used after item/post deletion)
export const removeCachedImage = async (remoteUrl) => {
  try {
    await ensureIndexLoaded();
    const path = cacheIndex.get(remoteUrl);
    if (!path) return;
    await Filesystem.deleteFile({ path, directory: Directory.Data });
    cacheIndex.delete(remoteUrl);
    await persistIndex();
  } catch (err) {
    // ignore
  }
};


