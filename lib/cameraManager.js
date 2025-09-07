/**
 * Centralized Camera Management Service
 * 
 * Handles all camera operations with proper state management and race condition prevention.
 * Ensures camera is only active when visible and needed, with automatic cleanup.
 */

class CameraManager {
  constructor() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('📷 [CameraManager] Not in browser environment, skipping initialization');
      return;
    }
    
    // Core state
    this.isInitialized = false;
    this.isStarting = false;
    this.isActive = false;
    this.isVisible = true;
    this.facingMode = 'environment';
    this.flashEnabled = false;
    
    // Error state
    this.error = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    // DOM references
    this.videoElement = null;
    this.streamRef = null;
    
    // Timing and debouncing
    this.startTimeout = null;
    this.retryTimeout = null;
    this.visibilityTimeout = null;
    this.lastOperationTime = 0;
    this.minOperationInterval = 500; // Minimum 500ms between operations
    
    // State tracking for conditions
    this.conditions = {
      appActive: false,
      cameraVisible: true,
      modalOpen: false,
      capturing: false,
      hasImage: false
    };
    
    // Event listeners
    this.listeners = new Set();
    this.visibilityObserver = null;
    
    // Bind methods
    this.handleAppVisibilityChange = this.handleAppVisibilityChange.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleForceRestart = this.handleForceRestart.bind(this);
    
    console.log('📷 [CameraManager] Initialized');
  }

  /**
   * Initialize the camera manager with required DOM elements
   */
  async initialize(videoElement, containerElement) {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('📷 [CameraManager] Not in browser environment, cannot initialize');
      return;
    }
    
    if (this.isInitialized) {
      console.log('📷 [CameraManager] Already initialized');
      return;
    }

    this.videoElement = videoElement;
    
    // Set up visibility observer for the camera container
    if (containerElement) {
      this.setupVisibilityObserver(containerElement);
    }
    
    // Set up app visibility listener
    document.addEventListener('visibilitychange', this.handleAppVisibilityChange);
    
    // Listen for custom events
    window.addEventListener('camera:reset', this.handleReset);
    window.addEventListener('camera:force-restart', this.handleForceRestart);
    
    this.isInitialized = true;
    console.log('📷 [CameraManager] Initialization complete');
  }

  /**
   * Set up intersection observer for camera visibility
   */
  setupVisibilityObserver(containerElement) {
    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      console.log('📷 [CameraManager] IntersectionObserver not available, skipping visibility detection');
      return;
    }
    
    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
    }

    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const isVisible = entry.isIntersecting;
        
        console.log('📷 [CameraManager] Visibility changed:', isVisible);
        
        if (!isVisible && this.isActive) {
          // Camera scrolled out of view - stop immediately
          console.log('📷 [CameraManager] Camera out of view - stopping immediately');
          this.updateCondition('cameraVisible', false);
          this.stopCamera();
        } else if (isVisible && !this.isActive) {
          // Camera scrolled into view - start with debounce
          console.log('📷 [CameraManager] Camera in view - scheduling start');
          this.updateCondition('cameraVisible', true);
          this.scheduleStart(300); // Debounce visibility changes
        }
      },
      {
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '0px 0px -50px 0px' // Stop camera 50px before it goes out of view
      }
    );

    this.visibilityObserver.observe(containerElement);
  }

  /**
   * Handle app visibility changes (background/foreground)
   */
  handleAppVisibilityChange() {
    const isVisible = document.visibilityState === 'visible';
    console.log('📷 [CameraManager] App visibility changed:', isVisible);
    
    if (isVisible) {
      // App came to foreground - clear any errors and try to restart if needed
      setTimeout(() => {
        this.clearError();
        this.evaluateAndStart();
      }, 500);
    } else {
      // App went to background - stop camera to save battery
      console.log('📷 [CameraManager] App backgrounded - stopping camera');
      this.stopCamera();
    }
  }

  /**
   * Update a condition and evaluate if camera should start/stop
   */
  updateCondition(key, value) {
    if (!this.isInitialized) {
      console.log(`📷 [CameraManager] Condition update ignored - not initialized: ${key} = ${value}`);
      return;
    }
    
    const oldValue = this.conditions[key];
    this.conditions[key] = value;
    
    console.log(`📷 [CameraManager] Condition updated: ${key} = ${value} (was ${oldValue})`);
    
    // Evaluate if we should start or stop based on new conditions
    this.evaluateConditions();
  }

  /**
   * Evaluate all conditions and start/stop camera accordingly
   */
  evaluateConditions() {
    const shouldBeActive = this.shouldCameraBeActive();
    
    console.log('📷 [CameraManager] Evaluating conditions:', {
      shouldBeActive,
      currentlyActive: this.isActive,
      conditions: this.conditions
    });
    
    if (shouldBeActive && !this.isActive && !this.isStarting) {
      this.scheduleStart(100);
    } else if (!shouldBeActive && this.isActive) {
      this.stopCamera();
    }
  }

  /**
   * Determine if camera should be active based on all conditions
   */
  shouldCameraBeActive() {
    const { appActive, cameraVisible, modalOpen, capturing, hasImage } = this.conditions;
    
    const shouldBeActive = appActive && 
                          cameraVisible && 
                          !modalOpen && 
                          !capturing && 
                          !hasImage &&
                          document.visibilityState === 'visible';
    
    return shouldBeActive;
  }

  /**
   * Schedule camera start with debouncing and race condition prevention
   */
  scheduleStart(delay = 0) {
    // Clear any existing timeout
    if (this.startTimeout) {
      clearTimeout(this.startTimeout);
      this.startTimeout = null;
    }

    // Prevent rapid operations
    const now = Date.now();
    const timeSinceLastOp = now - this.lastOperationTime;
    if (timeSinceLastOp < this.minOperationInterval) {
      const additionalDelay = this.minOperationInterval - timeSinceLastOp;
      delay = Math.max(delay, additionalDelay);
      console.log(`📷 [CameraManager] Adding ${additionalDelay}ms delay to prevent rapid operations`);
    }

    this.startTimeout = setTimeout(() => {
      this.startTimeout = null;
      this.evaluateAndStart();
    }, delay);
  }

  /**
   * Evaluate conditions and start camera if appropriate
   */
  async evaluateAndStart() {
    if (!this.shouldCameraBeActive()) {
      console.log('📷 [CameraManager] Start cancelled - conditions not met');
      return;
    }

    if (this.isStarting || this.isActive) {
      console.log('📷 [CameraManager] Start cancelled - already starting or active');
      return;
    }

    await this.startCamera();
  }

  /**
   * Start the camera with progressive fallback constraints
   */
  async startCamera() {
    // Check if camera APIs are available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('📷 [CameraManager] Camera APIs not available');
      this.error = 'Camera not supported on this device';
      this.notifyListeners('error', { error: this.error });
      return;
    }
    
    if (this.isStarting || this.isActive) {
      console.log('📷 [CameraManager] Start ignored - already starting or active');
      return;
    }

    console.log(`📷 [CameraManager] Starting camera (attempt ${this.retryCount + 1}/${this.maxRetries + 1})`);
    
    this.isStarting = true;
    this.lastOperationTime = Date.now();
    this.clearError();
    
    // Clear any retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    try {
      // Clean up any existing stream first
      await this.cleanupStream();
      
      // Progressive constraint sets for maximum compatibility
      const constraintSets = [
        // High quality with exact facing mode and torch
        {
          video: {
            facingMode: { exact: this.facingMode },
            torch: this.flashEnabled,
            width: { ideal: 1080, min: 720 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 24 },
            aspectRatio: { ideal: 1.0 }
          }
        },
        // High quality with exact facing mode, no torch
        {
          video: {
            facingMode: { exact: this.facingMode },
            width: { ideal: 1080, min: 720 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 24 }
          }
        },
        // Flexible facing mode
        {
          video: {
            facingMode: this.facingMode,
            width: { ideal: 1080, min: 720 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30 }
          }
        },
        // Basic constraints
        {
          video: {
            facingMode: this.facingMode,
            width: { ideal: 720 },
            height: { ideal: 720 }
          }
        },
        // Minimal constraints
        {
          video: true
        }
      ];

      let stream = null;
      let lastError = null;

      // Try each constraint set
      for (let i = 0; i < constraintSets.length; i++) {
        try {
          console.log(`📷 [CameraManager] Trying constraint set ${i + 1}/${constraintSets.length}`);
          stream = await navigator.mediaDevices.getUserMedia(constraintSets[i]);
          console.log(`📷 [CameraManager] Success with constraint set ${i + 1}`);
          break;
        } catch (err) {
          console.warn(`📷 [CameraManager] Constraint set ${i + 1} failed:`, err.message);
          lastError = err;
          continue;
        }
      }

      if (!stream) {
        throw lastError || new Error('All camera constraint sets failed');
      }

      // Set up video element
      if (this.videoElement) {
        await this.setupVideoElement(stream);
      }

      this.streamRef = stream;
      this.isActive = true;
      this.retryCount = 0;
      this.error = null;
      
      console.log('📷 [CameraManager] Camera started successfully');
      this.notifyListeners('started', { facingMode: this.facingMode });

    } catch (err) {
      console.error('📷 [CameraManager] Camera start failed:', err);
      
      const errorMessage = this.getErrorMessage(err);
      this.error = errorMessage;
      
      // Retry logic with exponential backoff
      if (this.retryCount < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 5000);
        console.log(`📷 [CameraManager] Retrying in ${delay}ms (attempt ${this.retryCount + 1}/${this.maxRetries})`);
        
        this.retryCount++;
        this.retryTimeout = setTimeout(() => {
          this.retryTimeout = null;
          if (this.shouldCameraBeActive()) {
            this.startCamera();
          }
        }, delay);
      } else {
        console.error('📷 [CameraManager] Camera start failed after all retries');
        this.notifyListeners('error', { error: errorMessage });
      }
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Set up video element with proper event handlers
   */
  async setupVideoElement(stream) {
    return new Promise((resolve, reject) => {
      const video = this.videoElement;
      
      // Set video properties
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('autoplay', '');

      // Set up event handlers
      const handleLoadedMetadata = () => {
        console.log('📷 [CameraManager] Video metadata loaded');
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        
        video.play()
          .then(() => {
            console.log('📷 [CameraManager] Video playback started');
            this.notifyListeners('ready');
            resolve();
          })
          .catch(playError => {
            console.warn('📷 [CameraManager] Video play failed:', playError);
            // Try again after a short delay
            setTimeout(() => {
              video.play().catch(() => {
                console.warn('📷 [CameraManager] Second play attempt failed');
              });
            }, 100);
            resolve(); // Don't fail the whole process for play issues
          });
      };

      const handleError = (e) => {
        console.error('📷 [CameraManager] Video element error:', e);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        reject(new Error('Video element failed to load'));
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);

      // Assign the stream
      video.srcObject = stream;
    });
  }

  /**
   * Stop the camera and clean up all resources
   */
  async stopCamera() {
    if (!this.isActive && !this.isStarting) {
      return;
    }

    console.log('📷 [CameraManager] Stopping camera');
    
    this.lastOperationTime = Date.now();
    
    // Clear any pending timeouts
    if (this.startTimeout) {
      clearTimeout(this.startTimeout);
      this.startTimeout = null;
    }
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Clean up stream
    await this.cleanupStream();
    
    // Clean up video element
    if (this.videoElement) {
      try {
        this.videoElement.pause();
        this.videoElement.srcObject = null;
        this.videoElement.load();
      } catch (e) {
        console.warn('📷 [CameraManager] Error cleaning video element:', e);
      }
    }

    this.isActive = false;
    this.isStarting = false;
    
    console.log('📷 [CameraManager] Camera stopped');
    this.notifyListeners('stopped');
  }

  /**
   * Clean up media stream and tracks
   */
  async cleanupStream() {
    if (this.streamRef) {
      try {
        const tracks = this.streamRef.getTracks();
        console.log(`📷 [CameraManager] Stopping ${tracks.length} media tracks`);
        
        for (const track of tracks) {
          try {
            track.stop();
          } catch (e) {
            console.warn('📷 [CameraManager] Error stopping track:', e);
          }
        }
        
        // Wait a bit for tracks to fully stop
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) {
        console.warn('📷 [CameraManager] Error cleaning up stream:', e);
      }
      
      this.streamRef = null;
    }
  }

  /**
   * Toggle flash/torch
   */
  async toggleFlash() {
    if (!this.isInitialized || !this.isActive || !this.streamRef) {
      console.warn('📷 [CameraManager] Cannot toggle flash - camera not initialized or not active');
      return false;
    }

    try {
      const videoTrack = this.streamRef.getVideoTracks()[0];
      if (videoTrack && 'torch' in videoTrack.getCapabilities()) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !this.flashEnabled }]
        });
        this.flashEnabled = !this.flashEnabled;
        console.log('📷 [CameraManager] Flash toggled:', this.flashEnabled);
        this.notifyListeners('flashToggled', { enabled: this.flashEnabled });
        return true;
      }
    } catch (error) {
      console.log('📷 [CameraManager] Torch not supported on this device');
    }
    
    return false;
  }

  /**
   * Flip camera (front/back)
   */
  async flipCamera() {
    if (!this.isInitialized || this.isStarting) {
      console.warn('📷 [CameraManager] Cannot flip camera - not initialized or currently starting');
      return;
    }

    console.log('📷 [CameraManager] Flipping camera');
    
    const newMode = this.facingMode === 'environment' ? 'user' : 'environment';
    this.facingMode = newMode;
    
    // Stop current stream and restart with new facing mode
    await this.stopCamera();
    
    // Wait a bit before restarting
    setTimeout(() => {
      if (this.shouldCameraBeActive()) {
        this.startCamera();
      }
    }, 800);
  }

  /**
   * Capture image from current video stream
   */
  captureImage() {
    if (!this.isInitialized || !this.isActive || !this.videoElement) {
      throw new Error('Camera not initialized or not ready for capture');
    }

    const video = this.videoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/png');
  }

  /**
   * Handle reset event (from pull-to-refresh)
   */
  handleReset() {
    console.log('📷 [CameraManager] Reset requested');
    
    // Clear all errors and retry counts
    this.clearError();
    this.retryCount = 0;
    
    // Force restart if conditions are met
    if (this.shouldCameraBeActive()) {
      this.forceRestart();
    }
  }

  /**
   * Handle force restart event
   */
  handleForceRestart() {
    console.log('📷 [CameraManager] Force restart requested');
    this.forceRestart();
  }

  /**
   * Force restart the camera
   */
  async forceRestart() {
    console.log('📷 [CameraManager] Force restarting camera');
    
    // Stop current camera
    await this.stopCamera();
    
    // Clear error state
    this.clearError();
    this.retryCount = 0;
    
    // Wait a bit then restart
    setTimeout(() => {
      if (this.shouldCameraBeActive()) {
        this.startCamera();
      }
    }, 1200);
  }


  /**
   * Clear error state
   */
  clearError() {
    this.error = null;
    this.retryCount = 0;
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Camera access denied. Please allow camera access in your browser settings.';
      case 'NotFoundError':
        return 'No camera found. Please connect a camera and try again.';
      case 'NotReadableError':
        return 'Camera is being used by another application.';
      case 'OverconstrainedError':
        return 'Camera constraints not supported by your device.';
      default:
        return `Camera error: ${error.message || 'Unknown error'}`;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of events
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (e) {
        console.warn('📷 [CameraManager] Listener error:', e);
      }
    });
  }

  /**
   * Get current camera state
   */
  getState() {
    return {
      isActive: this.isActive,
      isStarting: this.isStarting,
      facingMode: this.facingMode,
      flashEnabled: this.flashEnabled,
      error: this.error,
      conditions: { ...this.conditions }
    };
  }

  /**
   * Cleanup and destroy the camera manager
   */
  async destroy() {
    console.log('📷 [CameraManager] Destroying');
    
    // Stop camera
    await this.stopCamera();
    
    // Clear all timeouts
    if (this.startTimeout) clearTimeout(this.startTimeout);
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    if (this.visibilityTimeout) clearTimeout(this.visibilityTimeout);
    
    // Disconnect observers
    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleAppVisibilityChange);
    window.removeEventListener('camera:reset', this.handleReset);
    window.removeEventListener('camera:force-restart', this.handleForceRestart);
    
    // Clear listeners
    this.listeners.clear();
    
    this.isInitialized = false;
    console.log('📷 [CameraManager] Destroyed');
  }
}

// Create singleton instance
const cameraManager = new CameraManager();

export default cameraManager;
