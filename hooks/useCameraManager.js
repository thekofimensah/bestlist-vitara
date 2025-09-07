import { useEffect, useRef, useState } from 'react';
import cameraManager from '../lib/cameraManager';

/**
 * React hook for camera management integration
 */
export const useCameraManager = (videoRef, containerRef, options = {}) => {
  const [state, setState] = useState(cameraManager.getState());
  const [videoReady, setVideoReady] = useState(false);
  const initializeRef = useRef(false);

  // Initialize camera manager
  useEffect(() => {
    if (!videoRef.current || !containerRef.current || initializeRef.current) {
      return;
    }

    const initialize = async () => {
      try {
        await cameraManager.initialize(videoRef.current, containerRef.current);
        initializeRef.current = true;
        console.log('📷 [useCameraManager] Camera manager initialized');
      } catch (error) {
        console.error('📷 [useCameraManager] Initialization failed:', error);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      if (initializeRef.current) {
        cameraManager.destroy();
        initializeRef.current = false;
      }
    };
  }, [videoRef, containerRef]);

  // Listen to camera manager events
  useEffect(() => {
    const handleCameraEvent = (event, data) => {
      console.log('📷 [useCameraManager] Event:', event, data);
      
      switch (event) {
        case 'started':
          setState(cameraManager.getState());
          break;
        case 'ready':
          setVideoReady(true);
          setState(cameraManager.getState());
          break;
        case 'stopped':
          setVideoReady(false);
          setState(cameraManager.getState());
          break;
        case 'error':
          setState(cameraManager.getState());
          break;
        case 'flashToggled':
          setState(cameraManager.getState());
          break;
      }
    };

    const removeListener = cameraManager.addEventListener(handleCameraEvent);
    
    return removeListener;
  }, []);

  // Update camera manager conditions based on props
  useEffect(() => {
    if (options.appActive !== undefined) {
      cameraManager.updateCondition('appActive', options.appActive);
    }
  }, [options.appActive]);

  useEffect(() => {
    if (options.modalOpen !== undefined) {
      cameraManager.updateCondition('modalOpen', options.modalOpen);
    }
  }, [options.modalOpen]);

  useEffect(() => {
    if (options.capturing !== undefined) {
      cameraManager.updateCondition('capturing', options.capturing);
    }
  }, [options.capturing]);

  useEffect(() => {
    if (options.hasImage !== undefined) {
      cameraManager.updateCondition('hasImage', options.hasImage);
    }
  }, [options.hasImage]);

  // Camera control functions with safety checks
  const toggleFlash = () => {
    if (!initializeRef.current) {
      console.warn('📷 [useCameraManager] toggleFlash called before initialization');
      return false;
    }
    return cameraManager.toggleFlash();
  };
  
  const flipCamera = () => {
    if (!initializeRef.current) {
      console.warn('📷 [useCameraManager] flipCamera called before initialization');
      return;
    }
    return cameraManager.flipCamera();
  };
  
  const captureImage = () => {
    if (!initializeRef.current) {
      console.warn('📷 [useCameraManager] captureImage called before initialization');
      throw new Error('Camera manager not initialized');
    }
    return cameraManager.captureImage();
  };
  
  const forceRestart = () => {
    if (!initializeRef.current) {
      console.warn('📷 [useCameraManager] forceRestart called before initialization');
      return;
    }
    return cameraManager.forceRestart();
  };


  return {
    // State
    isActive: state.isActive,
    isStarting: state.isStarting,
    videoReady,
    error: state.error,
    facingMode: state.facingMode,
    flashEnabled: state.flashEnabled,
    
    // Controls
    toggleFlash,
    flipCamera,
    captureImage,
    forceRestart,
    
    // Manager instance (for advanced usage)
    manager: cameraManager
  };
};

export default useCameraManager;
