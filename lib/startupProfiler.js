// startupProfiler.js
// Lightweight startup instrumentation for Capacitor apps

import { Capacitor } from '@capacitor/core';

let initialized = false;

const formatMB = (n) => `${(n / (1024 * 1024)).toFixed(2)} MB`;

export function initStartupProfiler(options = {}) {
  if (initialized) return () => {};
  initialized = true;
  
  console.log('🔍 [Profiler] Startup profiler initialized');

  const config = {
    logThresholdBytes: 200 * 1024, // 200KB
    summaryDelayMs: 8000,
    enableFetchProbe: true,
    enableBridgeProbe: false, // Disabled to prevent startup blocking
    enableImageProbe: true,
    enablePrefsProbe: false, // Disabled to prevent startup blocking
    enableFsProbe: false, // Disabled to prevent startup blocking
    ...options,
  };

  const state = {
    startTs: performance.now?.() || Date.now(),
    bridgePayloads: [], // {plugin, method, size}
    fetches: [], // {url, size, contentType}
    images: [], // {src, naturalWidth, naturalHeight}
    prefsWrites: [], // {key, size}
    fsWrites: [], // {path, size}
  };

  // Bridge probe (non-blocking, async logging)
  let restoreBridge = null;
  try {
    const orig = Capacitor?.toNative;
    if (config.enableBridgeProbe && orig && !window.__BRIDGE_PROBE__) {
      window.__BRIDGE_PROBE__ = true;
      Capacitor.toNative = (msg) => {
        // Call original immediately, don't block
        const result = orig.call(Capacitor, msg);
        
        // Log asynchronously after the call
        setTimeout(() => {
          try {
            const size = JSON.stringify(msg?.data ?? msg).length;
            if (size >= config.logThresholdBytes) {
              const plugin = msg?.pluginId || msg?.plugin || 'unknown';
              const method = msg?.methodName || msg?.method || 'unknown';
              state.bridgePayloads.push({ plugin, method, size });
              console.log(`[Profiler] Bridge ${plugin}.${method} ${formatMB(size)}`);
            }
          } catch (_) {}
        }, 0);
        
        return result;
      };
      restoreBridge = () => { Capacitor.toNative = orig; };
    }
  } catch (_) {}

  // Fetch/XMLHttpRequest probe
  let restoreFetch = null;
  let restoreXHR = null;
  try {
    if (config.enableFetchProbe) {
      // fetch
      const origFetch = window.fetch;
      if (origFetch) {
        window.fetch = async (input, init) => {
          const res = await origFetch(input, init);
          try {
            const clone = res.clone();
            const buf = await clone.arrayBuffer();
            const size = buf.byteLength;
            if (size >= config.logThresholdBytes) {
              state.fetches.push({ url: typeof input === 'string' ? input : (input?.url || 'unknown'), size, contentType: res.headers?.get?.('content-type') || '' });
              console.log(`[Profiler] fetch ${typeof input === 'string' ? input : (input?.url || 'unknown')} ${formatMB(size)}`);
            }
          } catch (_) {}
          return res;
        };
        restoreFetch = () => { window.fetch = origFetch; };
      }
      // XHR
      const OrigXHR = window.XMLHttpRequest;
      if (OrigXHR) {
        function ProbedXHR() {
          const xhr = new OrigXHR();
          let url = '';
          const origOpen = xhr.open;
          xhr.open = function(method, u) { url = u || ''; return origOpen.apply(xhr, arguments); };
          xhr.addEventListener('loadend', function() {
            try {
              const size = xhr.response?.byteLength || (typeof xhr.responseText === 'string' ? xhr.responseText.length : 0);
              if (size >= config.logThresholdBytes) {
                state.fetches.push({ url, size, contentType: xhr.getResponseHeader && xhr.getResponseHeader('content-type') });
                console.log(`[Profiler] xhr ${url} ${formatMB(size)}`);
              }
            } catch(_) {}
          });
          return xhr;
        }
        window.XMLHttpRequest = ProbedXHR;
        restoreXHR = () => { window.XMLHttpRequest = OrigXHR; };
      }
    }
  } catch (_) {}

  // Image probe: watch large images when they load
  let restoreImg = null;
  try {
    if (config.enableImageProbe) {
      const OrigImage = window.Image;
      function ProbedImage(width, height) {
        const img = new OrigImage(width, height);
        img.addEventListener('load', () => {
          try {
            const w = img.naturalWidth || 0;
            const h = img.naturalHeight || 0;
            // Heuristic byte estimate: rgba 4 bytes per pixel (upper bound for texture)
            const estBytes = w * h * 4;
            if (estBytes >= config.logThresholdBytes) {
              state.images.push({ src: img.currentSrc || img.src, naturalWidth: w, naturalHeight: h, estBytes });
              console.log(`[Profiler] image ${img.currentSrc || img.src} ~${formatMB(estBytes)}`);
            }
          } catch (_) {}
        }, { once: true });
        return img;
      }
      window.Image = ProbedImage;
      restoreImg = () => { window.Image = OrigImage; };
    }
  } catch (_) {}

  // Preferences/Filesystem probes
  let restorePrefs = null;
  let restoreFs = null;
  try {
    if (config.enablePrefsProbe) {
      const { Preferences } = require('@capacitor/preferences');
      const origSet = Preferences?.set;
      if (origSet) {
        Preferences.set = async (opts) => {
          const size = typeof opts?.value === 'string' ? opts.value.length : 0;
          if (size >= config.logThresholdBytes) {
            state.prefsWrites.push({ key: opts?.key, size });
            console.log(`[Profiler] pref ${opts?.key} ${formatMB(size)}`);
          }
          return origSet(opts);
        };
        restorePrefs = () => { Preferences.set = origSet; };
      }
    }
  } catch (_) {}
  try {
    if (config.enableFsProbe) {
      const { Filesystem } = require('@capacitor/filesystem');
      const origWrite = Filesystem?.writeFile;
      if (origWrite) {
        Filesystem.writeFile = async (opts) => {
          const size = typeof opts?.data === 'string' ? opts.data.length : 0;
          if (size >= config.logThresholdBytes) {
            state.fsWrites.push({ path: opts?.path, size });
            console.log(`[Profiler] fs ${opts?.path} ${formatMB(size)}`);
          }
          return origWrite(opts);
        };
        restoreFs = () => { Filesystem.writeFile = origWrite; };
      }
    }
  } catch (_) {}

  // Simple periodic check (less intrusive)
  setTimeout(() => {
    try {
      const mem = window.performance?.memory;
      const domCount = document.querySelectorAll('*').length;
      const imgCount = document.querySelectorAll('img').length;
      if (mem) {
        console.log(`[Profiler] +30s check: JS ${Math.round(mem.usedJSHeapSize/(1024*1024))}MB, DOM ${domCount}el, ${imgCount}img`);
      }
    } catch (_) {}
  }, 30000);

  // Summary after delay
  const summaryTimer = setTimeout(() => {
    const elapsed = (performance.now?.() || Date.now()) - state.startTs;
    try {
      const mem = window.performance && performance.memory ? {
        usedJSHeapSize: formatMB(performance.memory.usedJSHeapSize || 0),
        totalJSHeapSize: formatMB(performance.memory.totalJSHeapSize || 0),
        jsHeapSizeLimit: formatMB(performance.memory.jsHeapSizeLimit || 0),
      } : null;
      // Count DOM elements that might consume graphics memory
      const domStats = {
        totalElements: document.querySelectorAll('*').length,
        images: document.querySelectorAll('img').length,
        videos: document.querySelectorAll('video').length,
        canvases: document.querySelectorAll('canvas').length,
        iframes: document.querySelectorAll('iframe').length,
      };
      
      console.log('[Profiler] Startup summary', JSON.stringify({
        elapsedMs: Math.round(elapsed),
        bridgePayloads: state.bridgePayloads,
        fetches: state.fetches.slice(0, 50),
        images: state.images.slice(0, 50),
        prefsWrites: state.prefsWrites,
        fsWrites: state.fsWrites,
        memory: mem,
        domStats,
      }));
    } catch (_) {}
  }, config.summaryDelayMs);

  // Return teardown
  return function teardown() {
    try { clearTimeout(summaryTimer); } catch(_) {}
    try { restoreBridge && restoreBridge(); } catch(_) {}
    try { restoreFetch && restoreFetch(); } catch(_) {}
    try { restoreXHR && restoreXHR(); } catch(_) {}
    try { restoreImg && restoreImg(); } catch(_) {}
    try { restorePrefs && restorePrefs(); } catch(_) {}
    try { restoreFs && restoreFs(); } catch(_) {}
    initialized = false;
  };
}


