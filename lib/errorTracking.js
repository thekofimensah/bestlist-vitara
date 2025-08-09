import { supabase } from './supabase';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';

let deviceSnapshot = null;
const ERROR_DEBOUNCE_MS = 15000; // 15s per-user per-signature aggregation window

// In-memory debounce map: signature -> { lastAtMs, pendingCount }
const errorDebounceMap = new Map();

const buildSignature = (row) => {
  const userId = row.user_id || 'anon';
  const name = row.error_name || 'Error';
  const msg = (row.error_message || '').slice(0, 160);
  const comp = row.component || 'global';
  const api = row.api_endpoint || '';
  const code = row.http_status || row.error_code || '';
  return `${userId}|${comp}|${name}|${msg}|${api}|${code}`;
};
const getDeviceSnapshot = async () => {
  if (deviceSnapshot) return deviceSnapshot;
  try {
    const [deviceInfo, appInfo] = await Promise.all([
      Device.getInfo().catch(() => ({})),
      App.getInfo().catch(() => ({})),
    ]);
    deviceSnapshot = {
      platform: deviceInfo?.platform || null,
      os_version: deviceInfo?.osVersion || null,
      device_model: deviceInfo?.model || null,
      is_virtual: deviceInfo?.isVirtual ?? null,
      app_version: appInfo?.version || null,
    };
  } catch {}
  return deviceSnapshot;
};

export const logErrorEvent = async (payload = {}) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    const device = await getDeviceSnapshot();
    const context = {
      url: typeof window !== 'undefined' ? window.location?.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      ...payload.context,
    };
    const row = {
      user_id: user?.id || null,
      component: payload.component || null,
      screen: payload.screen || null,
      route: payload.route || null,
      error_name: payload.error_name || null,
      error_message: payload.error_message || null,
      error_code: payload.error_code || null,
      stack: payload.stack || null,
      severity: payload.severity || 'error',
      api_endpoint: payload.api_endpoint || null,
      http_status: payload.http_status || null,
      http_method: payload.http_method || null,
      request_id: payload.request_id || null,
      context,
      ...device,
    };
    // Debounce/aggregate per signature
    const signature = buildSignature(row);
    const now = Date.now();
    const bucket = errorDebounceMap.get(signature);
    if (!bucket) {
      errorDebounceMap.set(signature, { lastAtMs: now, pendingCount: 0 });
      await supabase.from('error_events').insert([{ ...row, count: 1 }]);
    } else {
      if (now - bucket.lastAtMs < ERROR_DEBOUNCE_MS) {
        bucket.pendingCount += 1;
        // Lazy schedule a flush right after window elapses
        const wait = ERROR_DEBOUNCE_MS - (now - bucket.lastAtMs) + 10;
        const scheduledKey = `${signature}__scheduled`;
        if (!errorDebounceMap.has(scheduledKey)) {
          errorDebounceMap.set(scheduledKey, true);
          setTimeout(async () => {
            try {
              const b = errorDebounceMap.get(signature);
              if (b && b.pendingCount > 0) {
                await supabase.from('error_events').insert([{ ...row, count: b.pendingCount }]);
                b.lastAtMs = Date.now();
                b.pendingCount = 0;
              }
            } finally {
              errorDebounceMap.delete(scheduledKey);
            }
          }, Math.max(50, wait));
        }
      } else {
        bucket.lastAtMs = now;
        bucket.pendingCount = 0;
        await supabase.from('error_events').insert([{ ...row, count: 1 }]);
      }
    }
  } catch (e) {
    // avoid recursive logging loops
    console.warn('Failed to log error event', e);
  }
};

// Global listeners
export const installGlobalErrorTracking = () => {
  if (typeof window === 'undefined') return;
  // Uncaught exceptions
  window.addEventListener('error', (event) => {
    const err = event.error || {};
    logErrorEvent({
      component: 'global',
      error_name: err.name || 'Error',
      error_message: err.message || String(event.message || 'Unknown error'),
      stack: err.stack || null,
      severity: 'fatal',
    });
  });
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || {};
    logErrorEvent({
      component: 'global',
      error_name: reason.name || 'UnhandledRejection',
      error_message: reason.message || String(reason),
      stack: reason.stack || null,
      severity: 'error',
    });
  });

  // Monkey-patch global fetch to auto-track failed HTTP calls (covers Supabase under the hood)
  if (typeof window.fetch === 'function' && !window.__fetchPatchedForErrorTracking) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      try {
        const res = await originalFetch(input, init);
        if (!res.ok) {
          logErrorEvent({
            component: 'fetch',
            api_endpoint: typeof input === 'string' ? input : input?.url,
            http_status: res.status,
            http_method: init?.method || 'GET',
            severity: 'warn',
          });
        }
        return res;
      } catch (e) {
        logErrorEvent({
          component: 'fetch',
          api_endpoint: typeof input === 'string' ? input : input?.url,
          http_status: null,
          http_method: init?.method || 'GET',
          error_name: e?.name,
          error_message: e?.message,
          stack: e?.stack,
          severity: 'error',
        });
        throw e;
      }
    };
    window.__fetchPatchedForErrorTracking = true;
  }

  // Patch console.error to auto-log any explicit error reports across the app
  if (!window.__consoleErrorPatchedForErrorTracking && typeof console !== 'undefined') {
    const originalConsoleError = console.error.bind(console);
    console.error = (...args) => {
      try {
        // Try to find an Error-like object in args
        const errObj = args.find((a) => a && typeof a === 'object' && (a.stack || a.message));
        const first = args[0];
        logErrorEvent({
          component: 'console',
          error_name: errObj?.name || 'ConsoleError',
          error_message: errObj?.message || (typeof first === 'string' ? first : 'console.error'),
          stack: errObj?.stack || null,
          severity: 'error',
          context: { args: args.slice(1) },
        });
      } catch {}
      originalConsoleError(...args);
    };
    window.__consoleErrorPatchedForErrorTracking = true;
  }
};

// Fetch wrapper to auto-track failed API calls
export const trackedFetch = async (input, init = {}) => {
  try {
    const res = await fetch(input, init);
    if (!res.ok) {
      logErrorEvent({
        component: 'fetch',
        api_endpoint: typeof input === 'string' ? input : input?.url,
        http_status: res.status,
        http_method: init?.method || 'GET',
        severity: 'warn',
      });
    }
    return res;
  } catch (e) {
    logErrorEvent({
      component: 'fetch',
      api_endpoint: typeof input === 'string' ? input : input?.url,
      http_status: null,
      http_method: init?.method || 'GET',
      error_name: e?.name,
      error_message: e?.message,
      stack: e?.stack,
      severity: 'error',
    });
    throw e;
  }
};


