import { supabase } from './supabase';

// Global image loading tracker
let activeImageLoads = new Set();
let imageLoadStartTime = null;

// Track different phases of feed loading
export const trackFeedPhase = (viewType, phase, data = {}) => {
  const timestamp = performance.now();
  console.log(`🎯 [${viewType.toUpperCase()}] Phase: ${phase}`, JSON.stringify({
    ...data,
    timestamp: `${timestamp.toFixed(2)}ms since page load`
  }));
};

// Track when images start/finish loading for a view
export const trackImageLoadingPhase = (viewType, phase, imageCount = 0) => {
  if (phase === 'start' && imageCount > 0) {
    imageLoadStartTime = performance.now();
    console.log(`🖼️ [${viewType.toUpperCase()}] Image loading started: ${imageCount} images`);
  } else if (phase === 'complete' && imageLoadStartTime) {
    const loadTime = performance.now() - imageLoadStartTime;
    console.log(`🖼️ [${viewType.toUpperCase()}] All images loaded:`, JSON.stringify({
      loadTime: `${loadTime.toFixed(2)}ms`,
      imageCount: imageCount
    }));
    imageLoadStartTime = null;
  }
};

// Track feed request performance (data fetching only)
export const trackFeedRequest = async (viewType, requestType, requestFunction, batchSize, offset = 0) => {
  const startTime = performance.now();
  
  console.log(`📊 [${viewType.toUpperCase()}] Starting ${requestType} request (batch: ${batchSize}, offset: ${offset})`);
  
  try {
    const result = await requestFunction();
    const loadTime = performance.now() - startTime;
    
    // Get current user for analytics
    const user = (await supabase.auth.getUser()).data.user;
    
    // Enhanced but conservative network detection (no false WiFi)
    const getNetworkInfo = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      const effectiveType = connection?.effectiveType || 'unknown'; // 'slow-2g'|'2g'|'3g'|'4g'
      const downlink = typeof connection?.downlink === 'number' ? connection.downlink : null; // Mbps
      const rtt = typeof connection?.rtt === 'number' ? connection.rtt : null; // ms
      // Only trust explicit type === 'wifi' if provided; otherwise never assume wifi
      const explicitType = connection?.type === 'wifi' ? 'wifi' : (connection?.type || null);

      // Classify speed for logging (not stored in DB to avoid schema change)
      const classifySpeed = (etype, dl) => {
        if (etype === 'slow-2g' || etype === '2g') return 'very-slow';
        if (etype === '3g') return 'slow';
        if (etype === '4g') {
          if (dl != null) {
            if (dl >= 10) return 'fast';
            if (dl >= 2) return 'good';
            return 'slow';
          }
          return 'good';
        }
        // Unknown: fallback by downlink
        if (dl != null) {
          if (dl >= 10) return 'fast';
          if (dl >= 2) return 'good';
          if (dl > 0) return 'slow';
        }
        return 'unknown';
      };

      return {
        type: explicitType || effectiveType || 'unknown',
        effectiveType,
        downlink,
        rtt,
        speed: classifySpeed(effectiveType, downlink)
      };
    };
    
    const networkInfo = getNetworkInfo();
    
    // Log request metrics with enhanced info
    console.log(`📊 [${viewType.toUpperCase()}] ${requestType} completed:`, JSON.stringify({
      loadTime: `${loadTime.toFixed(2)}ms`,
      batchSize: batchSize,
      offset: offset,
      itemsReturned: result?.data?.length || 0,
      connectionType: networkInfo.type,
      effectiveType: networkInfo.effectiveType,
      downlink: networkInfo.downlink ? `${networkInfo.downlink}Mbps` : 'unknown',
      connectionSpeed: networkInfo.speed,
      deviceMemory: navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'unknown',
      userId: user?.id?.substring(0, 8) || 'anonymous'
    }));
    
    // Prepare metrics for Supabase
    const metricsData = {
      user_id: user?.id || null,
      view_type: viewType,
      request_type: requestType, // 'initial_load', 'load_more', 'refresh'
      load_time_ms: Math.round(loadTime),
      batch_size: batchSize,
      pagination_offset: offset,
      items_returned: result?.data?.length || 0,
      timestamp: new Date().toISOString(),
      platform: 'web',
      connection_type: networkInfo.type,
      connection_speed: networkInfo.speed,
      device_memory: navigator.deviceMemory || null,
    };
    
    // Persist metrics to Supabase
    try {
      await supabase.from('feed_performance_metrics').insert(metricsData);
      console.log(`📊 [${viewType.toUpperCase()}] Metrics saved to database`);
    } catch (dbError) {
      console.warn(`📊 [${viewType.toUpperCase()}] Failed to save metrics:`, dbError.message);
    }
    
    return result;
  } catch (error) {
    const loadTime = performance.now() - startTime;
    // Graceful network error handling: avoid spamming logs on app close/offline
    const msg = (error && error.message) || '';
    const isNetwork = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('TypeError');
    if (!isNetwork) {
      console.error(`📊 [${viewType.toUpperCase()}] ${requestType} failed:`, JSON.stringify({
        error: msg,
        loadTime: `${loadTime.toFixed(2)}ms`,
        batchSize: batchSize,
        offset: offset
      }));
    } else {
      console.warn(`📊 [${viewType.toUpperCase()}] ${requestType} network issue: ${msg}`);
    }
    throw error;
  }
};

// Track AI lookup performance
export const trackAIRequest = async (requestFunction, imageSize, imageFormat, source, location) => {
  const startTime = performance.now();
  
  console.log(`🤖 [AI] Starting AI analysis (${Math.round(imageSize / 1024)}KB ${imageFormat} from ${source})`);
  
  try {
    const result = await requestFunction();
    const loadTime = performance.now() - startTime;
    
    // Log AI metrics
    console.log(`🤖 [AI] Analysis completed:`, JSON.stringify({
      loadTime: `${loadTime.toFixed(2)}ms`,
      imageSize: `${Math.round(imageSize / 1024)}KB`,
      imageFormat,
      source,
      location: location || 'unknown',
      success: true,
      productDetected: !!result?.productName,
      confidence: result?.certainty || 0
    }));
    
    // Get current user for analytics
    const user = (await supabase.auth.getUser()).data.user;
    
    // Prepare AI metrics for Supabase
    const aiMetricsData = {
      user_id: user?.id || null,
      lookup_time_ms: Math.round(loadTime),
      image_size_bytes: imageSize,
      image_format: imageFormat,
      source: source, // 'camera' or 'gallery'
      success: true,
      product_detected: !!result?.productName,
      confidence_score: result?.certainty || null,
      location: location || null,
      platform: 'web',
      created_at: new Date().toISOString()
    };
    
    // Store AI metrics in database
    try {
      await supabase.from('ai_performance_metrics').insert(aiMetricsData);
      console.log(`🤖 [AI] Metrics saved to database`);
    } catch (dbError) {
      console.warn(`🤖 [AI] Failed to save AI metrics:`, dbError.message);
    }
    
    return result;
  } catch (error) {
    const loadTime = performance.now() - startTime;
    
    console.error(`🤖 [AI] Analysis failed:`, JSON.stringify({
      error: error.message,
      loadTime: `${loadTime.toFixed(2)}ms`,
      imageSize: `${Math.round(imageSize / 1024)}KB`,
      source
    }));
    
    // Get current user for error analytics
    const user = (await supabase.auth.getUser()).data.user;
    
    // Log failed AI request
    const failedAIMetrics = {
      user_id: user?.id || null,
      lookup_time_ms: Math.round(loadTime),
      image_size_bytes: imageSize,
      image_format: imageFormat,
      source: source,
      success: false,
      error_message: error.message,
      error_code: error.name,
      product_detected: false,
      location: location || null,
      platform: 'web',
      created_at: new Date().toISOString()
    };
    
    try {
      await supabase.from('ai_performance_metrics').insert(failedAIMetrics);
    } catch (dbError) {
      console.warn(`🤖 [AI] Failed to save error metrics:`, dbError.message);
    }
    
    throw error;
  }
};
