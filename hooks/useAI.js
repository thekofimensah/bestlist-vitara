import { useState, useCallback } from 'react';
import { trackAIRequest } from '../lib/performanceTracking';
import { safeFetch, isOffline } from '../lib/onlineDetection';
import { supabase } from '../lib/supabase';

export const useAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [abortController, setAbortController] = useState(null);

  // Compress image for optimal AI analysis (targeting max 80KB)
  const compressImageForAI = useCallback(async (file) => {
    const imageCompression = (await import('browser-image-compression')).default;

    return await imageCompression(file, {
      maxSizeMB: 0.08,              // Target max 80KB
      maxWidthOrHeight: 768,        // Reduced resolution for AI (sufficient for analysis)
      useWebWorker: true,
      fileType: 'image/jpeg',       // JPEG is more efficient than WebP for AI
      initialQuality: 0.65,         // Lower quality for aggressive compression
      alwaysKeepResolution: false   // Allow aggressive resizing
    });
  }, []);

  const analyzeImage = useCallback(async (imageFile, location = null) => {
    if (isOffline()) {
      throw new Error('AI analysis requires internet connection');
    }

    // Cancel any existing request
    if (abortController) {
      console.log('🤖 [AI] Cancelling previous request');
      abortController.abort();
    }

    // Create new abort controller for this request
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    setIsProcessing(true);
    setError(null);
    setResult(null);

    let totalBackoffDelayMs = 0;

    const makeRequest = async (attempt = 1, maxAttempts = 3) => {
      const startTime = Date.now();
      console.log(`🤖 [AI] Starting analysis attempt ${attempt}/${maxAttempts}`);

      try {
        const prepStart = Date.now();

        // Check if image is already optimally compressed
        let compressedFile = imageFile;

        // Only compress if the image is larger than our target or not JPEG
        if (imageFile.size > 82000 || !imageFile.type.includes('jpeg')) {
          console.log(`🤖 [AI] Image needs compression: ${Math.round(imageFile.size / 1024)}KB`);
          compressedFile = await compressImageForAI(imageFile);
        } else {
          console.log(`🤖 [AI] Image already optimally compressed: ${Math.round(imageFile.size / 1024)}KB`);
        }

        // Convert compressed image to base64 for Edge Function
        const imageArrayBuffer = await compressedFile.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));

        console.log(`🤖 [AI] Final image size for Edge Function: ${Math.round(compressedFile.size / 1024)}KB (${compressedFile.size} bytes), location: ${location || 'none'}`);

        const prep_time_ms = Date.now() - prepStart;

        // Call the Supabase Edge Function instead of Gemini directly
        const sendStart = Date.now();
        const { data, error } = await supabase.functions.invoke('analyze-image', {
          body: {
            imageData: base64Image,
            imageType: compressedFile.type || imageFile.type,
            location,
            originalSize: imageFile.size
          }
        });
        const ttfb_ms = Date.now() - sendStart;

        if (error) {
          console.error(`🤖 [AI] Edge Function error:`, error);
          
          // Extract specific status code and error details
          let errorMessage = error.message || 'Edge Function error';
          let statusCode = 'unknown';
          
          if (error.context) {
            statusCode = error.context.status || 'unknown';
            console.error(`🤖 [AI] HTTP Status Code: ${statusCode}`);
            
            // Try to extract more detailed error message from response body
            try {
              const errorResponse = await error.context.json();
              if (errorResponse.error) {
                errorMessage = errorResponse.error;
                console.error(`🤖 [AI] Detailed error from Edge Function:`, errorResponse.error);
              }
            } catch (parseError) {
              console.warn(`🤖 [AI] Could not parse error response body:`, parseError.message);
            }
          }
          
          throw new Error(`AI analysis failed (HTTP ${statusCode}): ${errorMessage}`);
        }

        const elapsed = Date.now() - startTime;

        console.log(`🤖 [AI] Response received in ${elapsed}ms`);
        console.log('🤖 [AI] Edge Function response:', JSON.stringify(data, null, 2));

        if (!data) {
          throw new Error('No response data from Edge Function');
        }

        // Check if we got an error response from the Edge Function
        if (data.error) {
          throw new Error(data.error);
        }

        // Auto-cancel rules: low confidence or missing essential fields
        const confidence = data.certainty / 100; // Convert back to decimal
        const hasName = Boolean(data.productName);
        if (!hasName || confidence < 0.4) {
          const reason = !hasName ? 'missing product name' : `low confidence (${data.certainty}%)`;
          console.warn(`🤖 [AI] Auto-cancelling due to ${reason}`);
          throw new Error(`AI result not reliable: ${reason}`);
        }

        const timingBreakdown = {
          prep_time_ms,
          ttfb_ms,
          response_json_time_ms: 0, // Edge Function handles this
          result_parse_time_ms: 0,  // Edge Function handles this
          total_elapsed_ms: elapsed,
          retries_count: attempt - 1,
          backoff_total_ms: totalBackoffDelayMs,
          timeout_ms: 30000 // Edge Function timeout
        };

        const enrichedResult = {
          ...data,
          __ai_timings: timingBreakdown,
          __compressed_size: compressedFile.size
        };

        console.log(`🤖 [AI] Analysis completed in ${elapsed}ms`);
        console.log('🤖 [AI] Final result:', JSON.stringify(enrichedResult, null, 2));

        setResult(enrichedResult);
        return enrichedResult;

      } catch (err) {
        const elapsed = Date.now() - startTime;

        // Handle cancellation/abort errors
        if (err.name === 'AbortError') {
          console.log(`🤖 [AI] Request cancelled after ${elapsed}ms`);
          throw new Error('Request cancelled');
        }

        console.error(
          `🤖 [AI] Error on attempt ${attempt}: ` +
            JSON.stringify(
              {
                name: err.name,
                message: err.message,
                elapsed: elapsed + 'ms',
              },
              null,
              2
            )
        );

        // Retry on network errors or server issues
        const isRetryableError = (
          err.message.includes('network') ||
          err.message.includes('connection') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('ENOTFOUND') ||
          err.message.includes('timeout')
        );

        if (isRetryableError && attempt < maxAttempts) {
          const delay = Math.min(1500 * Math.pow(2, attempt - 1), 8000);
          console.log(`🤖 [AI] Network error, retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          totalBackoffDelayMs += delay;
          return makeRequest(attempt + 1, maxAttempts);
        }

        throw err;
      }
    };

    try {
      // Track AI request performance using existing system
      // Determine source from filename or capturedImage context
      let source = 'camera'; // default
      if (imageFile.name?.includes('upload') || imageFile.name?.includes('gallery')) {
        source = 'gallery';
      } else if (imageFile.name?.includes('retry-camera')) {
        source = 'camera';
      } else if (imageFile.name?.includes('retry-gallery')) {
        source = 'gallery';
      }

      // Track AI request with actual compressed size sent to Edge Function
      const ai = await trackAIRequest(
        async () => await makeRequest(),
        imageFile.size,
        imageFile.type || 'unknown',
        source,
        location
      );

      setResult(ai);
      console.log('✅ [AI] Final status: success');
      return ai;
    } catch (err) {
      // Don't log errors for cancelled requests
      if (err.message !== 'Request cancelled') {
        console.error(
          '❌ [AI] Analysis failed: ' +
            JSON.stringify(
              {
                message: err.message,
                name: err.name,
                attempts: '3 attempts made',
                // Extract status code from error message if available
                statusCode: err.message.includes('HTTP ') ? err.message.match(/HTTP (\d+)/)?.[1] : 'unknown'
              },
              null,
              2
            )
        );

        // Provide more specific error messages
        let userFriendlyError = err.message;
        
        // Extract status code for more specific error handling
        const statusMatch = err.message.match(/HTTP (\d+)/);
        const statusCode = statusMatch ? parseInt(statusMatch[1]) : null;
        
        if (err.message.includes('timeout')) {
          userFriendlyError = 'Analysis timed out - please try again';
        } else if (err.message.includes('network') || err.message.includes('connection')) {
          userFriendlyError = 'Network error - check your connection and try again';
        } else if (err.message.includes('API key')) {
          userFriendlyError = 'AI service not configured';
        } else if (err.message.includes('Invalid JSON')) {
          userFriendlyError = 'AI response error - please try again';
        } else if (statusCode) {
          // Provide status-specific error messages
          if (statusCode === 400) {
            userFriendlyError = 'Invalid request - please check your image and try again';
          } else if (statusCode === 401) {
            userFriendlyError = 'Authentication failed - please refresh and try again';
          } else if (statusCode === 403) {
            userFriendlyError = 'Access denied - please check your permissions';
          } else if (statusCode === 404) {
            userFriendlyError = 'AI service not found - please try again later';
          } else if (statusCode === 429) {
            userFriendlyError = 'Too many requests - please wait a moment and try again';
          } else if (statusCode >= 500) {
            userFriendlyError = 'Server error - please try again later';
          } else {
            userFriendlyError = `Server error (${statusCode}) - please try again`;
          }
        }

        setError(userFriendlyError);
      }

      // Return fallback data on error
      const fallbackResult = {
        productName: '',
        species: '',
        certainty: 0,
        tags: [],
        productType: ''
      };
      console.log('ℹ️ [AI] Returning fallback result due to error');
      return fallbackResult;
    } finally {
      setIsProcessing(false);
      setAbortController(null);
      console.log('🧹 [AI] Processing flag cleared');
    }
  }, [compressImageForAI, abortController]);

  // Function to cancel any ongoing request
  const cancelRequest = useCallback(() => {
    if (abortController) {
      console.log('🤖 [AI] Manually cancelling request');
      abortController.abort();
      setAbortController(null);
      setIsProcessing(false);
      setError(null);
    }
  }, [abortController]);

  return { analyzeImage, isProcessing, error, result, cancelRequest };
};
