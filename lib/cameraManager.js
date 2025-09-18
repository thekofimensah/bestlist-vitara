/**
 * Simplified Camera Manager
 * Manages camera lifecycle with clear on/off conditions
 */

class CameraManager {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.isActive = false;
    this.facingMode = 'user';
    this.flashEnabled = false;
    this.listeners = [];
    this.startPromise = null;
    this.stopPromise = null;
    
    // Simple state tracking
    this.state = {
      isStarting: false,
      isActive: false,
      error: null,
      videoReady: false,
      facingMode: 'user',
      flashEnabled: false
    };
    
    // Bind methods
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.restart = this.restart.bind(this);
    this.captureImage = this.captureImage.bind(this);
    this.toggleFlash = this.toggleFlash.bind(this);
    this.flipCamera = this.flipCamera.bind(this);
  }

  /**
   * Initialize with video element
   */
  initialize(videoElement) {
    console.log('📷 [CameraManager] Initializing with video element');
    this.videoElement = videoElement;
    this.notifyListeners('initialized');
  }

  /**
   * Start camera with simple promise-based approach
   */
  async start() {
    // If already starting or active, return existing promise or resolve
    if (this.startPromise) {
      console.log('📷 [CameraManager] Already starting, returning existing promise');
      return this.startPromise;
    }
    
    if (this.state.isActive && this.stream) {
      console.log('📷 [CameraManager] Camera already active');
      return Promise.resolve();
    }
    
    // If currently stopping, wait for it to complete
    if (this.stopPromise) {
      console.log('📷 [CameraManager] Waiting for stop to complete before starting');
      await this.stopPromise;
    }
    
    console.log('📷 [CameraManager] Starting camera');
    
    this.startPromise = this._doStart();
    
    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }
  
  async _doStart() {
    try {
      // Update state
      this.state.isStarting = true;
      this.state.error = null;
      this.notifyListeners('starting');
      
      // Request camera
      const constraints = {
        video: {
          facingMode: this.state.facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      
      console.log('📷 [CameraManager] Requesting camera with constraints:', constraints);
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set up video element
      if (this.videoElement && this.stream) {
        this.videoElement.srcObject = this.stream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video element timeout'));
          }, 5000);
          
          const handleLoadedMetadata = () => {
            clearTimeout(timeout);
            console.log('📷 [CameraManager] Video metadata loaded');
            resolve();
          };
          
          if (this.videoElement.readyState >= 2) {
            clearTimeout(timeout);
            resolve();
          } else {
            this.videoElement.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
          }
        });
        
        // Play video
        await this.videoElement.play();
        
        console.log('✅ [CameraManager] Camera started successfully');
        
        // Update state
        this.state.isStarting = false;
        this.state.isActive = true;
        this.state.videoReady = true;
        this.notifyListeners('started');
        
        // Set up flash if rear camera
        if (this.state.facingMode === 'environment') {
          await this.setupFlash();
        }
      }
    } catch (error) {
      console.error('❌ [CameraManager] Failed to start camera:', error);
      
      // Clean up on error
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      // Update state
      this.state.isStarting = false;
      this.state.isActive = false;
      this.state.videoReady = false;
      this.state.error = this.getErrorMessage(error);
      
      this.notifyListeners('error', { error: this.state.error });
      
      throw error;
    }
  }

  /**
   * Stop camera with proper cleanup
   */
  async stop() {
    // If already stopping, return existing promise
    if (this.stopPromise) {
      console.log('📷 [CameraManager] Already stopping, returning existing promise');
      return this.stopPromise;
    }
    
    // If not active, nothing to stop
    if (!this.state.isActive && !this.stream) {
      console.log('📷 [CameraManager] Camera not active, nothing to stop');
      return Promise.resolve();
    }
    
    console.log('📷 [CameraManager] Stopping camera');
    
    this.stopPromise = this._doStop();
    
    try {
      await this.stopPromise;
    } finally {
      this.stopPromise = null;
    }
  }
  
  async _doStop() {
    try {
      // Update state immediately
      this.state.isActive = false;
      this.state.videoReady = false;
      this.notifyListeners('stopping');
      
      // Stop all tracks
      if (this.stream) {
        const tracks = this.stream.getTracks();
        console.log(`📷 [CameraManager] Stopping ${tracks.length} tracks`);
        
        tracks.forEach(track => {
          try {
            track.stop();
            console.log(`📷 [CameraManager] Stopped track: ${track.kind}`);
          } catch (e) {
            console.warn('📷 [CameraManager] Error stopping track:', e);
          }
        });
        
        this.stream = null;
      }
      
      // Clear video element
      if (this.videoElement) {
        try {
          this.videoElement.pause();
          this.videoElement.srcObject = null;
          this.videoElement.load(); // Reset video element
        } catch (e) {
          console.warn('📷 [CameraManager] Error clearing video element:', e);
        }
      }
      
      // Reset flash
      this.state.flashEnabled = false;
      
      console.log('✅ [CameraManager] Camera stopped successfully');
      this.notifyListeners('stopped');
      
    } catch (error) {
      console.error('❌ [CameraManager] Error during stop:', error);
      // Still mark as stopped even if there was an error
      this.state.isActive = false;
      this.state.videoReady = false;
      this.notifyListeners('stopped');
    }
  }

  /**
   * Restart camera (stop then start)
   */
  async restart() {
    console.log('📷 [CameraManager] Restarting camera');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure cleanup
    await this.start();
  }

  /**
   * Toggle flash on/off
   */
  async toggleFlash() {
    if (!this.stream || this.state.facingMode !== 'environment') {
      console.log('📷 [CameraManager] Cannot toggle flash - no stream or front camera');
      return false;
    }
    
    try {
      const videoTrack = this.stream.getVideoTracks()[0];
      if (!videoTrack) return false;
      
      const capabilities = videoTrack.getCapabilities();
      if (!capabilities.torch) {
        console.log('📷 [CameraManager] Torch not supported');
        return false;
      }
      
      const newState = !this.state.flashEnabled;
      await videoTrack.applyConstraints({
        advanced: [{ torch: newState }]
      });
      
      this.state.flashEnabled = newState;
      console.log(`📷 [CameraManager] Flash ${newState ? 'enabled' : 'disabled'}`);
      this.notifyListeners('flashToggled', { enabled: newState });
      
      return newState;
    } catch (error) {
      console.error('📷 [CameraManager] Flash toggle failed:', error);
      return false;
    }
  }
  
  /**
   * Setup flash for rear camera
   */
  async setupFlash() {
    if (!this.stream) return;
    
    try {
      const videoTrack = this.stream.getVideoTracks()[0];
      if (!videoTrack) return;
      
      const capabilities = videoTrack.getCapabilities();
      if (capabilities.torch) {
        // Ensure flash is off initially
        await videoTrack.applyConstraints({
          advanced: [{ torch: false }]
        });
        this.state.flashEnabled = false;
        console.log('📷 [CameraManager] Flash capability detected and initialized');
      }
    } catch (error) {
      console.warn('📷 [CameraManager] Flash setup failed:', error);
    }
  }

  /**
   * Flip between front and rear camera
   */
  async flipCamera() {
    console.log('📷 [CameraManager] Flipping camera');
    
    const newFacingMode = this.state.facingMode === 'user' ? 'environment' : 'user';
    this.state.facingMode = newFacingMode;
    
    // Restart with new facing mode
    await this.restart();
    
    this.notifyListeners('cameraFlipped', { facingMode: newFacingMode });
  }

  /**
   * Capture image from video stream
   */
  captureImage() {
    if (!this.videoElement || !this.state.videoReady) {
      console.error('📷 [CameraManager] Cannot capture - video not ready');
      return null;
    }
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;
      
      const ctx = canvas.getContext('2d');
      
      // Mirror image if front camera
      if (this.state.facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(this.videoElement, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/webp', 0.92);
      console.log('📷 [CameraManager] Image captured');
      
      return dataUrl;
    } catch (error) {
      console.error('📷 [CameraManager] Capture failed:', error);
      return null;
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (error.name === 'NotAllowedError') {
      return 'Camera permission denied. Please allow camera access.';
    } else if (error.name === 'NotFoundError') {
      return 'No camera found on this device.';
    } else if (error.name === 'NotReadableError') {
      return 'Camera is already in use by another app.';
    } else if (error.name === 'OverconstrainedError') {
      return 'Camera does not support the requested settings.';
    } else {
      return `Camera error: ${error.message || 'Unknown error'}`;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback(event, { ...data, state: this.getState() });
      } catch (error) {
        console.error('📷 [CameraManager] Listener error:', error);
      }
    });
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Destroy and clean up
   */
  async destroy() {
    console.log('📷 [CameraManager] Destroying camera manager');
    await this.stop();
    this.listeners = [];
    this.videoElement = null;
  }
}

// Export singleton instance
const cameraManager = new CameraManager();
export default cameraManager;