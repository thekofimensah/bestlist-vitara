import { useState, useCallback, useEffect } from 'react';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

const useUserTracking = () => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);

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
        console.error('❌ Error fetching current sign in count:', fetchError);
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
        console.error('❌ Failed to increment sign in count:', error);
      } else {
        console.log(`📊 Sign in count: ${newCount}`);
      }
    } catch (error) {
      console.error('❌ Error incrementing sign in count:', error);
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
      console.error('❌ Error tracking user session:', error);
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