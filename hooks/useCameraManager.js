import { useEffect, useRef, useState, useCallback } from 'react';
import cameraManager from '../lib/cameraManager';

/**
 * Simplified React hook for camera management
 * 
 * @param {Object} videoRef - React ref to video element
 * @param {Object} options - Configuration options
 * @param {boolean} options.shouldBeActive - Whether camera should be active
 * @returns {Object} Camera state and control functions
 */
export const useCameraManager = (videoRef, options = {}) => {
  const { shouldBeActive = true, defaultFacingMode } = options;
  
  // Track camera state
  const [state, setState] = useState(cameraManager.getState());
  const [isRestarting, setIsRestarting] = useState(false);
  
  // Track if we've initialized
  const initializeRef = useRef(false);
  const cleanupRef = useRef(false);
  
  // Initialize camera manager with video element
  useEffect(() => {
    if (!videoRef?.current || initializeRef.current) {
      return;
    }
    
    console.log('📷 [useCameraManager] Initializing camera manager');
    cameraManager.initialize(videoRef.current);
    // Apply default facing mode if provided
    if (defaultFacingMode === 'environment' || defaultFacingMode === 'user') {
      cameraManager.setFacingMode(defaultFacingMode);
    }
    initializeRef.current = true;
  }, [videoRef]);
  
  // Listen to camera events
  useEffect(() => {
    const handleCameraEvent = (event, data) => {
      console.log(`📷 [useCameraManager] Event: ${event}`, data);
      setState(data.state);
      
      // Clear restarting flag when camera starts or errors
      if (event === 'started' || event === 'error') {
        setIsRestarting(false);
      }
    };
    
    const unsubscribe = cameraManager.addEventListener(handleCameraEvent);
    
    // Get initial state
    setState(cameraManager.getState());
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Handle camera activation based on shouldBeActive prop
  useEffect(() => {
    if (!initializeRef.current) {
      return;
    }
    
    const handleActivation = async () => {
      try {
        if (shouldBeActive && !state.isActive && !state.isStarting) {
          console.log('📷 [useCameraManager] Activating camera (shouldBeActive=true)');
          await cameraManager.start();
        } else if (!shouldBeActive && (state.isActive || state.isStarting)) {
          console.log('📷 [useCameraManager] Deactivating camera (shouldBeActive=false)');
          await cameraManager.stop();
        }
      } catch (error) {
        console.error('📷 [useCameraManager] Activation error:', error);
      }
    };
    
    handleActivation();
  }, [shouldBeActive, state.isActive, state.isStarting]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!cleanupRef.current) {
        cleanupRef.current = true;
        console.log('📷 [useCameraManager] Component unmounting - stopping camera');
        // Use synchronous stop to avoid issues during unmount
        cameraManager.stop().catch(error => {
          console.warn('📷 [useCameraManager] Error stopping camera during unmount:', error);
        });
      }
    };
  }, []);
  
  // Control functions
  const toggleFlash = useCallback(async () => {
    try {
      return await cameraManager.toggleFlash();
    } catch (error) {
      console.error('📷 [useCameraManager] Flash toggle error:', error);
      return false;
    }
  }, []);
  
  const flipCamera = useCallback(async () => {
    try {
      setIsRestarting(true);
      await cameraManager.flipCamera();
    } catch (error) {
      console.error('📷 [useCameraManager] Flip camera error:', error);
      setIsRestarting(false);
    }
  }, []);
  
  const captureImage = useCallback(() => {
    try {
      return cameraManager.captureImage();
    } catch (error) {
      console.error('📷 [useCameraManager] Capture error:', error);
      return null;
    }
  }, []);
  
  const forceRestart = useCallback(async () => {
    try {
      console.log('📷 [useCameraManager] Force restart requested');
      setIsRestarting(true);
      await cameraManager.restart();
    } catch (error) {
      console.error('📷 [useCameraManager] Restart error:', error);
      setIsRestarting(false);
    }
  }, []);
  
  return {
    // State
    isActive: state.isActive,
    isStarting: state.isStarting,
    videoReady: state.videoReady,
    error: state.error,
    facingMode: state.facingMode,
    flashEnabled: state.flashEnabled,
    isRestarting,
    
    // Control functions
    toggleFlash,
    flipCamera,
    captureImage,
    forceRestart
  };
};