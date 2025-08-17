import React, { useState, useEffect, useCallback } from 'react';

import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

const useUserTracking = () => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  // Session tracking (separate from sign-in count)
  const INACTIVITY_MS = 15 * 60 * 1000; // 15 minutes
  const TICK_MS = 5000; // accumulate every 5s
  const FLUSH_MS = 60000; // send to server once per minute


  // Refs/state for session lifecycle
  const sessionIdRef = React.useRef(null);
  const sessionStartedAtRef = React.useRef(null);
  const isForegroundRef = React.useRef(false);
  const lastTickAtRef = React.useRef(null);
  const lastInteractionAtRef = React.useRef(null);
  const lastFlushAtRef = React.useRef(0);
  const foregroundSecondsRef = React.useRef(0);
  const activeSecondsRef = React.useRef(0);

  const prefKey = (key) => (user?.id ? `${key}_${user.id}` : key);

  const nowIso = () => new Date().toISOString();
  const nowMs = () => Date.now();

  // Get comprehensive device info
  const getDeviceInfo = useCallback(async () => {
    try {
      const [deviceInfo, appInfo] = await Promise.all([
        Device.getInfo(),
        App.getInfo()
      ]);

      const userAgent = navigator.userAgent;
      const language = navigator.language || navigator.userLanguage;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const screen = {
        width: window.screen.width,
        height: window.screen.height,
        density: window.devicePixelRatio
      };

      return {
        // Device basics
        platform: deviceInfo.platform,
        osVersion: deviceInfo.osVersion,
        model: deviceInfo.model,
        manufacturer: deviceInfo.manufacturer,
        isVirtual: deviceInfo.isVirtual,
        
        // App info
        appVersion: appInfo.version,
        appBuild: appInfo.build,
        appId: appInfo.id,
        appName: appInfo.name,
        
        // Browser/Web info
        userAgent,
        language,
        timezone,
        screen,
        
        // Platform detection
        isNative: Capacitor.isNativePlatform(),
        isWeb: !Capacitor.isNativePlatform(),
        
        // Additional web info
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency,
        
        // Memory info (if available)
        ...(navigator.deviceMemory && { deviceMemory: navigator.deviceMemory }),
        ...(navigator.connection && { 
          connection: {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
          }
        })
      };
    } catch (error) {
      console.error('❌ Error getting device info:', error);
      return {
        platform: 'unknown',
        userAgent: navigator.userAgent,
        language: navigator.language || 'unknown',
        timezone: 'unknown',
        error: error.message
      };
    }
  }, []);

  // Log app version
  const logAppVersion = useCallback(async (deviceInfo) => {
    try {
      const { error } = await supabase
        .from('app_versions')
        .insert([{
          version: deviceInfo.appVersion || '1.0.0',
          platform: deviceInfo.platform,
          os_version: deviceInfo.osVersion,
          timestamp: new Date().toISOString(),
        }]);
      
      if (error) {
        console.error('❌ Failed to log app version:', error);
      } else {
        console.log('📊 App version logged');
      }
    } catch (error) {
      console.error('❌ Error logging app version:', error);
    }
  }, []);

  // Update user metadata
  const updateUserMetadata = useCallback(async (deviceInfo) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          user_agent: deviceInfo.userAgent,
          device_info: deviceInfo,
          language: deviceInfo.language,
          timezone: deviceInfo.timezone,
          sign_in_count: 1, // This should be incremented on each sign in
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('❌ Failed to update user metadata:', error);
      } else {
        console.log('📊 User metadata updated');
      }
    } catch (error) {
      console.error('❌ Error updating user metadata:', error);
    }
  }, [user]);

  // ---------- Session storage helpers ----------
  const getStored = async (key) => (await Preferences.get({ key })).value;
  const setStored = async (key, value) => Preferences.set({ key, value });
  const removeStored = async (key) => Preferences.remove({ key });

  // ---------- Session DB operations ----------
  const insertSession = useCallback(async () => {
    if (!user?.id) return null;
    try {
      const deviceInfo = await getDeviceInfo();
      const startedAt = nowIso();
      const { data, error } = await supabase
        .from('user_sessions')
        .insert([
          {
            user_id: user.id,
            started_at: startedAt,
            total_foreground_seconds: 0,
            total_active_seconds: 0,
            platform: deviceInfo.platform || null,
            os_version: deviceInfo.osVersion || null,
            app_version: deviceInfo.appVersion || null,
            device_model: deviceInfo.model || null,
            is_virtual: deviceInfo.isVirtual ?? null,
          },
        ])
        .select('id, started_at')
        .single();
      if (error) throw error;
      return { id: data.id, startedAt: data.started_at };
    } catch (e) {
      console.error('❌ insertSession error:', JSON.stringify({
        message: e.message,
        name: e.name,
        details: e.details,
        hint: e.hint,
        code: e.code,
        fullError: e
      }, null, 2));
      
      // Log error to Supabase error_events table
      try {
        await supabase.from('error_events').insert({
          error_type: 'user_tracking_session_insert',
          error_message: JSON.stringify({
            message: e.message,
            name: e.name,
            details: e.details,
            hint: e.hint,
            code: e.code,
            user_id: user?.id,
            function: 'insertSession'
          }),
          platform: Capacitor.isNativePlatform() ? 'native' : 'web',
          os_version: navigator?.userAgent || null,
          user_id: user?.id
        });
      } catch (logError) {
        console.error('❌ Failed to log error to Supabase:', logError);
      }
      
      return null;
    }
  }, [user, getDeviceInfo]);

  const updateSessionTotals = useCallback(async (finalize = false) => {
    const sessionId = sessionIdRef.current;
    if (!user?.id || !sessionId) return;
    try {
      const updates = {
        total_foreground_seconds: Math.floor(foregroundSecondsRef.current),
        total_active_seconds: Math.floor(activeSecondsRef.current),
        updated_at: nowIso(),
      };
      if (finalize) {
        updates.ended_at = nowIso();
      }
      const { error } = await supabase
        .from('user_sessions')
        .update(updates)
        .eq('id', sessionId)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (e) {
      console.error('❌ updateSessionTotals error:', JSON.stringify({
        message: e.message,
        name: e.name,
        details: e.details,
        hint: e.hint,
        code: e.code,
        fullError: e
      }, null, 2));
      
      // Log error to Supabase error_events table
      try {
        await supabase.from('error_events').insert({
          error_type: 'user_tracking_session_update',
          error_message: JSON.stringify({
            message: e.message,
            name: e.name,
            details: e.details,
            hint: e.hint,
            code: e.code,
            user_id: user?.id,
            session_id: sessionIdRef.current,
            function: 'updateSessionTotals',
            finalize: finalize
          }),
          platform: Capacitor.isNativePlatform() ? 'native' : 'web',
          os_version: navigator?.userAgent || null,
          user_id: user?.id
        });
      } catch (logError) {
        console.error('❌ Failed to log error to Supabase:', logError);
      }
    }
  }, [user]);

  // ---------- Session lifecycle ----------
  const startNewSession = useCallback(async () => {
    const created = await insertSession();
    if (!created) return;
    sessionIdRef.current = created.id;
    sessionStartedAtRef.current = created.startedAt;
    foregroundSecondsRef.current = 0;
    activeSecondsRef.current = 0;
    lastTickAtRef.current = nowMs();
    lastFlushAtRef.current = 0;
    await setStored(prefKey('session_last_seen_at'), String(nowMs()));
    await setStored(prefKey('session_current_id'), sessionIdRef.current);
  }, [insertSession]);

  const resumeOrStartSession = useCallback(async () => {
    const lastSeenStr = await getStored(prefKey('session_last_seen_at'));
    const lastSeen = lastSeenStr ? Number(lastSeenStr) : 0;
    const gap = nowMs() - lastSeen;
    const existingId = await getStored(prefKey('session_current_id'));
    if (!existingId || gap >= INACTIVITY_MS) {
      // If we had a previous session and user was inactive long enough, finalize it before starting a new one
      if (existingId && gap >= INACTIVITY_MS) {
        sessionIdRef.current = existingId;
        await updateSessionTotals(true);
        await removeStored(prefKey('session_current_id'));
      }
      await startNewSession();
    } else {
      // Resume existing session
      sessionIdRef.current = existingId;
      sessionStartedAtRef.current = (await getStored(prefKey('session_started_at'))) || null;
      lastTickAtRef.current = nowMs();
    }
    await setStored(prefKey('session_last_seen_at'), String(nowMs()));
  }, [INACTIVITY_MS, startNewSession]);

  const endSessionIfAny = useCallback(async () => {
    if (!sessionIdRef.current) return;
    await updateSessionTotals(true);
    // Clear session refs but keep last seen for inactivity threshold
    sessionIdRef.current = null;
    sessionStartedAtRef.current = null;
    await removeStored(prefKey('session_current_id'));
  }, [updateSessionTotals]);

  // ---------- Foreground tracking ----------
  const handleAppState = useCallback(async (state) => {
    if (!user?.id) return;
    if (state.isActive) {
      isForegroundRef.current = true;
      lastTickAtRef.current = nowMs();
      lastInteractionAtRef.current = nowMs();
      await resumeOrStartSession();
    } else {
      isForegroundRef.current = false;
      await setStored(prefKey('session_last_seen_at'), String(nowMs()));
      await updateSessionTotals(false);
    }
  }, [resumeOrStartSession, updateSessionTotals, user?.id]);

  // Periodic accumulation and flush
  useEffect(() => {
    if (!user?.id) return;
    let tickTimer = null;
    let flushTimer = null;

    const tick = async () => {
      const now = nowMs();
      if (isForegroundRef.current && sessionIdRef.current && lastTickAtRef.current) {
        const deltaSec = (now - lastTickAtRef.current) / 1000;
        foregroundSecondsRef.current += deltaSec;
        // Consider user "active" if they returned in the last INACTIVITY window's first minute; simplified proxy
        if (lastInteractionAtRef.current && (now - lastInteractionAtRef.current) <= 60000) {
          activeSecondsRef.current += deltaSec;
        }
      }
      lastTickAtRef.current = now;
    };

    const schedule = () => {
      tickTimer = setInterval(tick, TICK_MS);
      flushTimer = setInterval(() => updateSessionTotals(false), FLUSH_MS);
    };

    // Stop timers when app goes to background to prevent network requests
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('📊 [useUserTracking] App backgrounded - stopping timers');
        if (tickTimer) clearInterval(tickTimer);
        if (flushTimer) clearInterval(flushTimer);
        // Final flush before stopping
        updateSessionTotals(false);
      } else if (document.visibilityState === 'visible' && user?.id) {
        console.log('📊 [useUserTracking] App foregrounded - restarting timers');
        schedule();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    schedule();
    
    return () => {
      if (tickTimer) clearInterval(tickTimer);
      if (flushTimer) clearInterval(flushTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, updateSessionTotals]);

  // App lifecycle listeners
  useEffect(() => {
    if (!user?.id) return;
    const sub = App.addListener('appStateChange', handleAppState);
    // Web fallback
    const onVis = async () => {
      if (document.visibilityState === 'visible') {
        await handleAppState({ isActive: true });
      } else {
        await handleAppState({ isActive: false });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      sub && sub.remove();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user?.id, handleAppState]);

  // Kick off session when hook mounts and app is active
  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      // Heuristic: assume active on mount; App listener will reconcile
      await resumeOrStartSession();
      isForegroundRef.current = true;
      lastTickAtRef.current = nowMs();
      lastInteractionAtRef.current = nowMs();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Increment sign in count
  const incrementSignInCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get current count
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('sign_in_count')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching current sign in count:', JSON.stringify({
          message: fetchError.message,
          name: fetchError.name,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code,
          fullError: fetchError
        }, null, 2));
        
        // Log error to Supabase error_events table
        try {
          await supabase.from('error_events').insert({
            error_type: 'user_tracking_signin_fetch',
            error_message: JSON.stringify({
              message: fetchError.message,
              name: fetchError.name,
              details: fetchError.details,
              hint: fetchError.hint,
              code: fetchError.code,
              user_id: user?.id,
              function: 'incrementSignInCount'
            }),
            platform: Capacitor.isNativePlatform() ? 'native' : 'web',
            os_version: navigator?.userAgent || null,
            user_id: user?.id
          });
        } catch (logError) {
          console.error('❌ Failed to log error to Supabase:', logError);
        }
        
        return;
      }

      const currentCount = currentUser?.sign_in_count || 0;
      const newCount = currentCount + 1;

      const { error } = await supabase
        .from('users')
        .update({
          sign_in_count: newCount,
          last_sign_in_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Failed to increment sign in count:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
        
        // Log error to Supabase error_events table
        try {
          await supabase.from('error_events').insert({
            error_type: 'user_tracking_signin_update',
            error_message: JSON.stringify({
              message: error.message,
              name: error.name,
              details: error.details,
              hint: error.hint,
              code: error.code,
              user_id: user?.id,
              function: 'incrementSignInCount'
            }),
            platform: Capacitor.isNativePlatform() ? 'native' : 'web',
            os_version: navigator?.userAgent || null,
            user_id: user?.id
          });
        } catch (logError) {
          console.error('❌ Failed to log error to Supabase:', logError);
        }
      } else {
        console.log(`📊 Sign in count: ${newCount}`);
      }
    } catch (error) {
      console.error('❌ Error incrementing sign in count:', JSON.stringify({
        message: error.message,
        name: error.name,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
      
      // Log error to Supabase error_events table
      try {
        await supabase.from('error_events').insert({
          error_type: 'user_tracking_signin_exception',
          error_message: JSON.stringify({
            message: error.message,
            name: error.name,
            details: error.details,
            hint: error.hint,
            code: error.code,
            user_id: user?.id,
            function: 'incrementSignInCount'
          }),
          platform: Capacitor.isNativePlatform() ? 'native' : 'web',
          os_version: navigator?.userAgent || null,
          user_id: user?.id
        });
      } catch (logError) {
        console.error('❌ Failed to log error to Supabase:', logError);
      }
    }
  }, [user]);

  // Track user session and device info
  const trackUserSession = useCallback(async () => {
    if (!user?.id || isTracking) return;

    setIsTracking(true);
    
    try {
      const deviceInfo = await getDeviceInfo();
      
      // Log app version
      await logAppVersion(deviceInfo);
      
      // Update user metadata
      await updateUserMetadata(deviceInfo);
      
      // Increment sign in count
      await incrementSignInCount();
      
      console.log('📊 User tracking completed');
      
    } catch (error) {
      console.error('❌ Error tracking user session:', JSON.stringify({
        message: error.message,
        name: error.name,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
      
      // Log error to Supabase error_events table
      try {
        await supabase.from('error_events').insert({
          error_type: 'user_tracking_session_track',
          error_message: JSON.stringify({
            message: error.message,
            name: error.name,
            details: error.details,
            hint: error.hint,
            code: error.code,
            user_id: user?.id,
            function: 'trackUserSession'
          }),
          platform: Capacitor.isNativePlatform() ? 'native' : 'web',
          os_version: navigator?.userAgent || null,
          user_id: user?.id
        });
      } catch (logError) {
        console.error('❌ Failed to log error to Supabase:', logError);
      }
    } finally {
      setIsTracking(false);
    }
  }, [user, isTracking, getDeviceInfo, logAppVersion, updateUserMetadata, incrementSignInCount]);

  // Auto-track when user signs in (only once per session)
  useEffect(() => {
    if (user?.id && !isTracking) {
      // Check if we've already tracked this session
      const sessionKey = `tracked_session_${user.id}`;
      const hasTracked = sessionStorage.getItem(sessionKey);
      
      if (!hasTracked) {
        console.log('🔍 [Tracking] Starting new session tracking for user:', user.id);
        trackUserSession();
        // Mark this session as tracked
        sessionStorage.setItem(sessionKey, 'true');
      } else {
        console.log('🔍 [Tracking] Session already tracked for user:', user.id);
      }
    }
  }, [user?.id, trackUserSession, isTracking]);

  // Manual debug function for testing
  const debugUserTracking = useCallback(async () => {
    console.log('🔍 [Debug] Starting manual user tracking...');
    const deviceInfo = await getDeviceInfo();
    console.log('🔍 [Debug] Device info:', JSON.stringify(deviceInfo, null, 2));
    
    if (user?.id) {
      await logAppVersion(deviceInfo);
      await updateUserMetadata(deviceInfo);
      await incrementSignInCount();
      console.log('🔍 [Debug] Tracking completed for user:', user.id);
    } else {
      console.log('🔍 [Debug] No user logged in');
    }
  }, [user, getDeviceInfo, logAppVersion, updateUserMetadata, incrementSignInCount]);

  // Expose debug function globally for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.debugUserTracking = debugUserTracking;
    }
  }, [debugUserTracking]);

  // Clear session tracking when user signs out
  useEffect(() => {
    if (!user?.id) {
      // Clear all session tracking when user signs out
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('tracked_session_')) {
          sessionStorage.removeItem(key);
          console.log('🔍 [Tracking] Cleared session tracking for:', key);
        }
      });
    }
  }, [user?.id]);

  return {
    trackUserSession,
    getDeviceInfo,
    isTracking,
    debugUserTracking
  };
};

export default useUserTracking;