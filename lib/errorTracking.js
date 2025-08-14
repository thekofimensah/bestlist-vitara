import { supabase } from './supabase';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';

let deviceSnapshot = null;
const safeStringify = (obj) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    try {
      const shallow = {};
      for (const k in (obj || {})) shallow[k] = obj[k];
      return JSON.stringify(shallow);
    } catch {
      return String(obj);
    }
  }
};
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
    // Guard: avoid recursive loops and noisy logs
    const isErrorEventsEndpoint = typeof row.api_endpoint === 'string' && row.api_endpoint.includes('/rest/v1/error_events');
    if ((payload.component === 'fetch' || payload.component === 'console') && isErrorEventsEndpoint) {
      return; // never log failures targeting error_events itself
    }
    // Debounce/aggregate per signature
    const signature = buildSignature(row);
    const now = Date.now();
    const bucket = errorDebounceMap.get(signature);
    // Helper: robust insert with fallback if 'count' column missing (stale schema cache)
    const robustInsert = async (payloadRow, label) => {
      const { error } = await supabase.from('error_events').insert([payloadRow]);
      if (!error) {
        console.log(`✅ [error_events] ${label} inserted`);
        return;
      }
      const summary = { message: error.message, code: error.code, details: error.details, hint: error.hint };
      console.error(`❌ [error_events] ${label} failed`, safeStringify(summary));
      // Retry without 'count' if schema cache doesn't have it yet
      if (error.code === 'PGRST204' && typeof error.message === 'string' && error.message.includes("'count'")) {
        try {
          const retryRow = { ...payloadRow };
          delete retryRow.count;
          console.warn('↻ [error_events] Retrying insert without count column');
          const { error: retryError } = await supabase.from('error_events').insert([retryRow]);
          if (retryError) {
            console.error('❌ [error_events] Retry failed', safeStringify({
              message: retryError.message,
              code: retryError.code,
              details: retryError.details,
              hint: retryError.hint,
            }));
          } else {
            console.log('✅ [error_events] Retry inserted without count');
          }
        } catch (e) {
          console.error('❌ [error_events] Retry exception', safeStringify({ message: e?.message }));
        }
      }
    };

    if (!bucket) {
      errorDebounceMap.set(signature, { lastAtMs: now, pendingCount: 0 });
      await robustInsert({ ...row, count: 1 }, 'Insert (count=1)');
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
                await robustInsert({ ...row, count: b.pendingCount }, `Flush (count=${b.pendingCount})`);
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
        await robustInsert({ ...row, count: 1 }, 'Insert (count=1)');
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
      const url = typeof input === 'string' ? input : input?.url;
      const method = init?.method || 'GET';
      const isErrorEvents = typeof url === 'string' && url.includes('/rest/v1/error_events');
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const isTarget = typeof url === 'string' && (url.includes('/rest/v1/likes') || url.includes('/rest/v1/error_events'));
      if (isTarget) {
        try {
          const redactedHeaders = (() => {
            try {
              const hdrs = init?.headers ? { ...init.headers } : {};
              // Redact sensitive fields
              const redact = (k) => (k || '').toString().toLowerCase();
              const out = {};
              Object.keys(hdrs).forEach((k) => {
                const key = redact(k);
                if (key === 'authorization' || key === 'apikey' || key === 'api-key' || key === 'cookie') {
                  out[k] = 'REDACTED';
                } else {
                  out[k] = hdrs[k];
                }
              });
              return out;
            } catch { return null; }
          })();
          const bodyPreview = typeof init?.body === 'string' ? (init.body.length > 512 ? init.body.slice(0, 512) + '…' : init.body) : init?.body || null;
          console.log('🌐 [HTTP] →', method, url, safeStringify({
            headers: redactedHeaders,
            body: bodyPreview
          }));
        } catch {}
      }
      try {
        const res = await originalFetch(input, init);
        if (isTarget) {
          try {
            const cloned = res.clone();
            let preview = '';
            try { preview = await cloned.text(); } catch {}
            if (preview && preview.length > 512) preview = preview.slice(0, 512) + '…';
            console.log('🌐 [HTTP] ←', method, url, safeStringify({ status: res.status, ok: res.ok, preview }));
          } catch {}
        }
        if (!res.ok) {
          if (!isErrorEvents) {
            logErrorEvent({
              component: 'fetch',
              api_endpoint: typeof input === 'string' ? input : input?.url,
              http_status: res.status,
              http_method: init?.method || 'GET',
              severity: 'warn',
            });
          }
        }
        return res;
      } catch (e) {
        if (isTarget) {
          console.log('🌐 [HTTP] ×', method, url, safeStringify({ error: e?.message || String(e) }));
        }
        if (!isErrorEvents && !isOffline) {
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
        }
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
      const url = typeof input === 'string' ? input : input?.url;
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (!(typeof url === 'string' && url.includes('/rest/v1/error_events')) && !isOffline) {
        logErrorEvent({
          component: 'fetch',
          api_endpoint: url,
          http_status: res.status,
          http_method: init?.method || 'GET',
          severity: 'warn',
        });
      }
    }
    return res;
  } catch (e) {
    const url = typeof input === 'string' ? input : input?.url;
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!(typeof url === 'string' && url.includes('/rest/v1/error_events')) && !isOffline) {
      logErrorEvent({
        component: 'fetch',
        api_endpoint: url,
        http_status: null,
        http_method: init?.method || 'GET',
        error_name: e?.name,
        error_message: e?.message,
        stack: e?.stack,
        severity: 'error',
      });
    }
    throw e;
  }
};


