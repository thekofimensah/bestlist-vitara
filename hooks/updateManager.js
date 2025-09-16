// updateManager.js
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';

const VERSION_KEY = 'CURRENT_APP_VERSION';
const VERSION_HISTORY_KEY = 'VERSION_HISTORY';
const VERSION_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/updates/version.json`;
const UPDATE_DIR = 'updates';
const INDEX_FILE = 'index.html';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const MAX_VERSION_HISTORY = 2; // Keep only 2 previous versions

export async function checkForUpdate() {
  try {
    // Check for local update first
    try {
      const localUpdatePath = await Filesystem.getUri({
        path: `${UPDATE_DIR}/${INDEX_FILE}`,
        directory: Directory.Data,
      });
      
      // Set local update path if it exists
      if (localUpdatePath.uri) {
        Capacitor.setServerBasePath(localUpdatePath.uri);
        return; // Exit early if local update is found
      }
    } catch (error) {
      console.log('[Update] No local update found, proceeding with remote update check');
    }

    // Guard: On native without streaming download support, skip remote update to avoid OOM from large bridge payloads
    const isNative = Capacitor.isNativePlatform?.();
    const canDownloadNatively = isNative && typeof Filesystem.downloadFile === 'function';
    if (isNative && !canDownloadNatively) {
      console.log('[Update] Skipping remote update on native (no streaming download support)');
      return;
    }

    const res = await fetch(VERSION_URL);
    if (!res.ok) throw new Error(`Failed to fetch version: ${res.status}`);
    
    const remote = await res.json();
    const { version, hash, url } = remote;

    const { value: localVersion } = await Preferences.get({ key: VERSION_KEY });
    if (!localVersion) {
      // First time running, set initial version
      await Preferences.set({ key: VERSION_KEY, value: version });
      await Preferences.set({ key: VERSION_HISTORY_KEY, value: JSON.stringify([version]) });
      return;
    }

    if (localVersion === version) return;

    // Start update process
    const success = await downloadUpdateFiles(url);
    if (success) {
      // Update version history
      const { value: versionHistoryStr } = await Preferences.get({ key: VERSION_HISTORY_KEY });
      const versionHistory = versionHistoryStr ? JSON.parse(versionHistoryStr) : [];
      versionHistory.push(version);
      await Preferences.set({ key: VERSION_HISTORY_KEY, value: JSON.stringify(versionHistory) });
      
      // Update current version
      await Preferences.set({ key: VERSION_KEY, value: version });
      
      // Cleanup old versions
      await cleanupOldVersions();
      
      notifyUserToReload();
      await logVersionToSupabase(version);
    }
  } catch (err) {
    console.error('[Update] Failed to check or apply update:', JSON.stringify({
      message: err.message,
      name: err.name,
      details: err.details,
      hint: err.hint,
      code: err.code,
      fullError: err
    }, null, 2));
    await logErrorToSupabase('check_update', err.message);
  }
}

async function downloadUpdateFiles(baseUrl, retryCount = 0) {
  try {
    // Create updates directory if it doesn't exist
    await Filesystem.mkdir({
      path: UPDATE_DIR,
      directory: Directory.Data,
      recursive: true
    });

    // Download the entire bundle
    const bundleRes = await fetch(`${baseUrl}assets.json`);
    if (!bundleRes.ok) throw new Error(`Failed to fetch assets.json: ${bundleRes.status}`);
    
    const assets = await bundleRes.json();
    if (!assets || !assets.files) throw new Error('Invalid assets.json format');

    const isNative = Capacitor.isNativePlatform?.();
    const canDownloadNatively = isNative && typeof Filesystem.downloadFile === 'function';

    // Download each file in the bundle
    for (const file of assets.files) {
      const destPath = `${UPDATE_DIR}/${file}`;
      if (canDownloadNatively) {
        // Ensure nested directories exist
        const parts = file.split('/');
        if (parts.length > 1) {
          const nestedDir = `${UPDATE_DIR}/${parts.slice(0, -1).join('/')}`;
          try {
            await Filesystem.mkdir({ path: nestedDir, directory: Directory.Data, recursive: true });
          } catch (_) {}
        }
        await Filesystem.downloadFile({
          url: `${baseUrl}${file}`,
          path: destPath,
          directory: Directory.Data,
        });
      } else {
        const fileRes = await fetch(`${baseUrl}${file}`);
        if (!fileRes.ok) throw new Error(`Failed to fetch ${file}: ${fileRes.status}`);
        const fileContent = await fileRes.text();
        if (!fileContent) throw new Error(`Empty file: ${file}`);
        if (fileContent.length < 10) throw new Error(`Suspiciously small file: ${file}`);
        await Filesystem.writeFile({
          path: destPath,
          data: fileContent,
          directory: Directory.Data,
        });
      }
    }

    return true;
  } catch (e) {
    console.warn(`[Update] Error downloading files (attempt ${retryCount + 1}/${MAX_RETRIES}):`, e);
    
    if (retryCount < MAX_RETRIES - 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
      return downloadUpdateFiles(baseUrl, retryCount + 1);
    }

    // If all retries failed, clean up and log error
    await cleanupFailedUpdate();
    await logErrorToSupabase('download_update', e.message);
    return false;
  }
}

async function cleanupFailedUpdate() {
  try {
    await Filesystem.rmdir({
      path: UPDATE_DIR,
      directory: Directory.Data,
      recursive: true
    });
  } catch (e) {
    console.warn('[Update] Failed to cleanup failed update:', e);
  }
}

async function cleanupOldVersions() {
  try {
    // Get version history
    const { value: versionHistoryStr } = await Preferences.get({ key: VERSION_HISTORY_KEY });
    const versionHistory = versionHistoryStr ? JSON.parse(versionHistoryStr) : [];
    
    // Keep only the last MAX_VERSION_HISTORY versions
    if (versionHistory.length > MAX_VERSION_HISTORY) {
      const versionsToRemove = versionHistory.slice(0, versionHistory.length - MAX_VERSION_HISTORY);
      
      for (const version of versionsToRemove) {
        try {
          await Filesystem.rmdir({
            path: `${UPDATE_DIR}/${version}`,
            directory: Directory.Data,
            recursive: true
          });
          console.log(`[Update] Removed old version: ${version}`);
        } catch (e) {
          console.warn(`[Update] Failed to remove version ${version}:`, e);
        }
      }
      
      // Update version history
      const newHistory = versionHistory.slice(-MAX_VERSION_HISTORY);
      await Preferences.set({ 
        key: VERSION_HISTORY_KEY, 
        value: JSON.stringify(newHistory) 
      });
    }
  } catch (e) {
    console.warn('[Update] Failed to cleanup old versions:', e);
  }
}

function notifyUserToReload() {
  if (confirm('A new version is ready. Restart now?')) {
    window.location.reload();
  }
}

async function logVersionToSupabase(version) {
  try {
    const deviceInfo = await Device.getInfo();
    const { error } = await supabase
      .from('app_versions')
      .insert([{
        version,
        platform: deviceInfo.platform,
        os_version: deviceInfo.osVersion,
        timestamp: new Date().toISOString(),
      }]);
    
    if (error) throw error;
  } catch (e) {
    console.warn('[Update] Failed to log version to Supabase:', e);
    await logErrorToSupabase('log_version', e.message);
  }
}

async function logErrorToSupabase(errorType, errorMessage) {
  // Skip error logging when offline
  if (navigator.onLine === false) {
    console.log('🌐 [UpdateManager] Skipping error logging - device is offline');
    return;
  }
  
  try {
    const deviceInfo = await Device.getInfo();
    const { error } = await supabase
      .from('app_errors')
      .insert([{
        error_type: errorType,
        error_message: errorMessage,
        platform: deviceInfo.platform,
        os_version: deviceInfo.osVersion,
        timestamp: new Date().toISOString(),
      }]);
    
    if (error) throw error;
  } catch (e) {
    console.warn('[Update] Failed to log error to Supabase:', e);
  }
}