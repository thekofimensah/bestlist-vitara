import { useState, useCallback } from 'react';
import { trackAIRequest } from '../lib/performanceTracking';
import { safeFetch, isOffline } from '../lib/onlineDetection';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

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
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

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
      
      // Progressive timeout: 20s for first attempt, 30s for retries
      const timeoutMs = attempt === 1 ? 20000 : 30000;
      try {
        const prepStart = Date.now();
        
        // Check if image is already optimally compressed (from MainScreen.jsx)
        let compressedFile = imageFile;
        
        // Only compress if the image is larger than our target or not JPEG
        if (imageFile.size > 82000 || !imageFile.type.includes('jpeg')) { // 80KB + small buffer
          console.log(`🤖 [AI] Image needs compression: ${Math.round(imageFile.size / 1024)}KB`);
          compressedFile = await compressImageForAI(imageFile);
        } else {
          console.log(`🤖 [AI] Image already optimally compressed: ${Math.round(imageFile.size / 1024)}KB`);
        }
        
        const imageArrayBuffer = await compressedFile.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));
        
        console.log(`🤖 [AI] Final image size for AI: ${Math.round(compressedFile.size / 1024)}KB (${compressedFile.size} bytes), location: ${location || 'none'}`);
        
        // Expert prompt to produce a canonical, human-style product name and word suggestions
        const prompt = `You are a product identification expert. Your job is to identify consumer products from images with high accuracy. Identify the on-pack product and produce a single, canonical product name people would naturally use when referring to it in conversation or search.

CRITICAL: If you cannot clearly see a recognizable product, set confidence less than 0.5. Do NOT guess or hallucinate products.

Rules for the name field (MUST follow):
1) Structure: [Brand] [Core product] [Variant/essential qualifiers]
   - Include brand only if clearly visible. If unsure, DO NOT GUESS a brand and set this to an empty string.
   - "Core product" is the primary noun phrase (e.g., Toothpaste Tablets, Whole Milk, Dark Roast Coffee).
   - "Variant/essential qualifiers" include only intrinsic, distinguishing details like flavor, strength, fat %, roast level, SPF, form (tablets/powder/liquid), decaf, alcohol %, or other regulated style descriptors.
2) Exclude marketing/packaging/ethos claims: plastic free, eco-friendly, zero-waste, cruelty-free, sustainable, BPA-free, non-GMO, gluten-free (unless it is the legally defining style), etc.
3) Exclude pack/count/size/weight unless it's the defining variant (e.g., "2%" milk fat IS allowed).
4) Remove long ingredient/benefit lists (e.g., "with Aloe Vera, Tea Tree and Xylitol"). Keep it short and canonical.
5) Language: English. Use Title Case. No emojis. No trailing punctuation. Max 80 chars.

Additional guidance${location ? ` (photo taken in ${location})` : ''}:
- Prefer brands and variants common to the region; avoid unlikely guesses.
- If the object is food/drink or consumer goods, use retail naming conventions.

Brand field rules (MUST follow):
- If no real brand/manufacturer name is clearly visible, return an EMPTY string for brand.
- If you see generic placeholders like "unbranded", "generic", "store brand", "house brand", "brandless", "unknown", "n/a", etc., return an EMPTY string for brand.
- Do not fabricate brand names.

---

### Word Suggestion Generation Task
Generate descriptive words that users would naturally choose to describe this product in reviews. Focus on the MOST COMMON ways people describe this type of product.

Generate TWO SETS of word pairs for each category:

1. **Positive Review Words** - Words people use in positive reviews (3+ stars):
   - Main word: positive descriptor (e.g., "good", "delicious", "would recommend")
   - Negative version: add appropriate prefix "not" (e.g., "not good", "not delicious", "wouldn't recommend")

2. **Negative Review Words** - Words people use in negative reviews (1-2 stars):
   - Main word: negative descriptor (can include "not" forms of the positive descriptor if common, e.g., "terrible", "not fresh", "bland")
   - Positive opposite: the positive counterpart (e.g., "great", "fresh", "flavorful")

Generate these pairs for these **4 categories**:

1. **Product-Specific** (6-8 pairs per set) → Words describing the actual experience of using/consuming the product. Focus on sensations, feelings, and interactions while using it. Examples:
   - Positive set: How it feels during use, how it interacts with you, immediate sensations, lasting effects
   - Negative set: Difficulties during use, unpleasant interactions, unwanted sensations, problematic effects

2. **Intensity ("Too...")** (2 pairs) → Common "too" phrases used in both positive and negative reviews. Examples:
   - Positive set: {"not too strong" ↔ "too strong"}, {"not too heavy" ↔ "too heavy"}
   - Negative set: {"not too strong" ↔ "too strong"}, {"not too heavy" ↔ "too heavy"}
   Note: Use the EXACT SAME "too" words for both positive and negative reviews - people use "too X" vs "not too X" regardless of review sentiment

IMPORTANT: 
- All words within each category must be DIFFERENT from each other
- Choose words that people ACTUALLY use in product reviews
- For negative versions of positive words, prioritize using "not" as the prefix if possible:
  * General words: use "not" (e.g., "not good", "not fresh")
  * "Would I..." words: use "wouldn't" (e.g., "wouldn't recommend")
- For negative review words, use natural negative expressions:
  * Can be specific negative words (e.g., "terrible", "bland")
  * Can be "not" forms if that's how people commonly express it (e.g., "not fresh")
- Keep words simple and commonly used andunderstood

FORMAT (MUST follow exactly):

Word suggestion keys (each is a single comma-separated list of **pairs** in the form "A:B"):
- ps_pos (Product-Specific, positive set): 6–8 pairs, "positive:negative" (e.g., "fresh:not fresh, flavorful:bland")
- ps_neg (Product-Specific, negative set): 6–8 pairs, "negative:positive" (e.g., "stale:fresh, bland:flavorful")
- intensity_pairs: 2 pairs, SAME list for both sentiments; each pair as "not too X:too X" (e.g., "not too strong:too strong, not too sweet:too sweet")`;

        const requestBody = {
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                name: { 
                  type: 'STRING', 
                  description: 'Canonical human-style product name following rules: [Brand] [Core product] [Variant/essential qualifiers] ; exclude marketing/packaging/ethos claims; Title Case; English; <= 80 chars.' 
                },
                brand: { 
                  type: 'STRING', 
                  description: 'Brand/manufacturer name; return empty string if not clearly visible or if only a generic placeholder (unbranded/generic/store brand/brandless). Do not guess.' 
                },
                category: { 
                  type: 'STRING', 
                  description: 'Product category (e.g., Dairy, Beverages, Snacks, Frozen Foods, Pantry Items)' 
                },
                confidence: { 
                  type: 'NUMBER', 
                  description: 'Confidence in the identification (between 0 and 1)' 
                },
                description: { 
                  type: 'STRING', 
                  description: 'For mass-produced items: provide a concise factual description of what the product is. For specialty/artisanal products: include fascinating details that would delight and surprise readers about the product itself - unexpected origins, remarkable production secrets, surprising historical connections, or extraordinary characteristics that make people say "I had no idea!" DO NOT describe packaging, bottle colors, label designs, or visual elements visible in the image. Focus exclusively on the product content, ingredients, production methods, or usage experience that would be relevant to someone considering this product.' 
                },
                tags: { 
                  type: 'ARRAY', 
                  items: { type: 'STRING' }, 
                  description: '3-4 focused tags.' 
                },
                allergens: { 
                  type: 'ARRAY', 
                  items: { type: 'STRING' }, 
                  description: 'Array of allergens if mentioned or inferred.' 
                },
                ps_pos: {
                  type: 'STRING',
                  description: 'Product-Specific positive pairs: 6-8 pairs as "positive:negative" (e.g., "fresh:not fresh,flavorful:bland, good:not good, strong: not strong")'
                },
                ps_neg: {
                  type: 'STRING', 
                  description: 'Product-Specific negative pairs: 6-8 pairs as "negative:positive" (e.g., "stale:fresh,bland:flavorful")'
                },
                intensity_pairs: {
                  type: 'STRING',
                  description: 'Intensity pairs: 2 pairs as "not too X:too X" (e.g., "not too strong:too strong,not too sweet:too sweet")'
                }
              },
              required: ['name', 'brand', 'category', 'confidence', 'description', 'tags', 'ps_pos', 'ps_neg', 'intensity_pairs']
            }
          }
    };
        const prep_time_ms = Date.now() - prepStart;

        const sendStart = Date.now();
        const response = await safeFetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: newAbortController.signal // Add abort signal for cancellation
          }
        );
        const ttfb_ms = Date.now() - sendStart;

        if (!response.ok) {
          const errorText = await response.text();
          const elapsed = Date.now() - startTime;
          
          console.error(
            `🤖 [AI] API Error (${elapsed}ms): ` +
              JSON.stringify(
                {
                  status: response.status,
                  statusText: response.statusText,
                  attempt,
                  timeout: timeoutMs,
                  errorText: errorText.substring(0, 500), // Truncate long errors
                },
                null,
                2
              )
          );
          
          // Handle different error types with specific retry logic
          if (response.status === 503 && attempt < maxAttempts) {
            // Server overload - exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
            console.log(`🤖 [AI] Server overload (503), retrying in ${delay/1000}s... (attempt ${attempt}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeRequest(attempt + 1, maxAttempts);
          }
          
          if (response.status === 429 && attempt < maxAttempts) {
            // Rate limit - longer backoff
            const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
            console.log(`🤖 [AI] Rate limited (429), retrying in ${delay/1000}s... (attempt ${attempt}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeRequest(attempt + 1, maxAttempts);
          }
          
          if (response.status >= 500 && attempt < maxAttempts) {
            // Server errors - moderate backoff
            const delay = Math.min(1500 * Math.pow(2, attempt - 1), 10000);
            console.log(`🤖 [AI] Server error (${response.status}), retrying in ${delay/1000}s... (attempt ${attempt}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeRequest(attempt + 1, maxAttempts);
          }
          
          // Non-retryable error
          throw new Error(`AI analysis failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const jsonStart = Date.now();
        const json = await response.json();
        const response_json_time_ms = Date.now() - jsonStart;
        const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        const elapsed = Date.now() - startTime;
        
        console.log(`🤖 [AI] Response received in ${elapsed}ms`);
        console.log('🤖 [AI] RAW API RESPONSE:', JSON.stringify(json, null, 2));
        console.log('🤖 [AI] EXTRACTED TEXT:', responseText);
        
        if (!responseText) {
          console.error('🤖 [AI] Empty response from Gemini: ' + JSON.stringify(json, null, 2));
          throw new Error('No response text from AI');
        }

        // Parse the guaranteed valid JSON response (no cleanup needed!)
        let aiData;
        const innerParseStart = Date.now();
        try {
          aiData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('🤖 [AI] JSON parse error: ' + JSON.stringify({ message: parseError.message, name: parseError.name }, null, 2));
          console.error('🤖 [AI] Raw response text: ' + responseText.substring(0, 500));
          throw new Error('Invalid JSON response from AI');
        }
        const result_parse_time_ms = Date.now() - innerParseStart;

        // Normalize product naming for consistency across AI variations
        const normalizeProductName = (brand, product, name) => {
          const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
          const baseRaw = clean(product || name || '');
          if (!baseRaw && !brand) return 'Unknown Product';

          // 1) Cut trailing descriptive clauses: after 'with ...', parentheses, or extra comma sections
          let core = baseRaw
            .replace(/\bwith\b.*$/i, '')
            .replace(/\([^)]*\)/g, '')
            .trim();

          // 2) Keep only the first comma section (e.g., remove ", plastic free, vegan")
          if (core.includes(',')) {
            core = core.split(',')[0].trim();
          }

          // 3) Remove common marketing qualifiers at the end (if present)
          const bannedSuffixes = [
            'plastic free', 'vegan', 'eco friendly', 'eco-friendly', 'zero waste',
            'natural', 'cruelty free', 'cruelty-free', 'sustainable', 'biodegradable',
            'organic', 'non gmo', 'non-gmo', 'gluten free', 'gluten-free'
          ];
          bannedSuffixes.forEach((phrase) => {
            const re = new RegExp(`(?:,?\s*${phrase})+$`, 'i');
            core = core.replace(re, '').trim();
          });

          // 4) Collapse double spaces and trim punctuation
          core = core.replace(/\s{2,}/g, ' ').replace(/[\s,.;-]+$/g, '').trim();

          // 5) Ensure brand appears exactly once at the front
          const startsWithBrand = brand && new RegExp(`^${brand}[^a-z0-9]?`, 'i').test(core);
          const finalName = clean(startsWithBrand ? core : `${brand ? brand + ' ' : ''}${core}`);

          // 6) Cap length to a sane limit to avoid overflow
          return finalName.length > 80 ? finalName.slice(0, 77).trim() + '…' : finalName;
        };

        // Normalize brand: treat generic/placeholder terms as empty to avoid false positives
        const rawBrand = (aiData.brand || '').trim();
        const brandDeny = new Set(['unbranded','generic','store brand','house brand','brandless','unknown','n/a','na','none','unspecified','not specified']);
        const brand = brandDeny.has(rawBrand.toLowerCase()) ? '' : rawBrand;
        const normalizedName = (aiData.name && aiData.name.trim())
          ? aiData.name.trim()
          : normalizeProductName(brand, aiData.product, aiData.name);

        // Parse the new format word suggestions and add manual fields
        const parseWordPairs = (pairString) => {
          if (!pairString) return [];
          return pairString.split(',').map(pair => {
            const [main, opposite] = pair.split(':').map(s => s.trim());
            return { main, opposite };
          }).filter(pair => pair.main && pair.opposite);
        };

        // Add manual value/quality and would-I fields
        const vq_pos = "good value:poor value,high quality:low quality,worth it:not worth it,natural:artificial";
        const vq_neg = "overpriced:affordable,low quality:high quality,not worth it:worth it,artificial:natural";
        const wi_pos = "would recommend:wouldn't recommend,would buy again:wouldn't buy again,would repurchase:wouldn't repurchase";
        const wi_neg = "wouldn't recommend:would recommend,wouldn't buy again:would buy again,wouldn't repurchase:would repurchase";

        // Convert to the format expected by useWordSuggestions
        const wordSuggestions = {
          productSpecific: {
            positiveReviewWords: parseWordPairs(aiData.ps_pos),
            negativeReviewWords: parseWordPairs(aiData.ps_neg)
          },
          valueQuality: {
            positiveReviewWords: parseWordPairs(vq_pos),
            negativeReviewWords: parseWordPairs(vq_neg)
          },
          wouldI: {
            positiveReviewWords: parseWordPairs(wi_pos),
            negativeReviewWords: parseWordPairs(wi_neg)
          },
          intensity: {
            positiveReviewWords: parseWordPairs(aiData.intensity_pairs),
            negativeReviewWords: parseWordPairs(aiData.intensity_pairs).map(pair => ({
              main: pair.opposite,
              opposite: pair.main
            })) // Swap for negative reviews: "too X" first
          }
        };

        // Return data in the format expected by the app
        const aiResult = {
          productName: normalizedName,
          brand: brand,
          category: aiData.category || '',
          species: aiData.description || 'Unknown',
          certainty: Math.round((aiData.confidence || 0) * 100),
          tags: aiData.tags || ['Untagged'],
          productType: aiData.category || 'Unknown',
          allergens: aiData.allergens || [],
          wordSuggestions: wordSuggestions
        };

        console.log(`🤖 [AI] Analysis completed in ${elapsed}ms`);
        console.log('🤖 [AI] Structured response:', JSON.stringify(aiData, null, 2));
        console.log('🤖 [AI] Normalized product name:', JSON.stringify({ brand, nameField: aiData.name, normalizedName }, null, 2));
        console.log('🤖 [AI] Word suggestions parsed:', JSON.stringify(wordSuggestions, null, 2));
        console.log('🤖 [AI] Formatted result:', JSON.stringify(aiResult, null, 2));

        // Auto-cancel rules: low confidence or missing essential fields
        const confidence = typeof aiData.confidence === 'number' ? aiData.confidence : 0;
        const hasName = Boolean(aiData.name);
        if (!hasName || confidence < 0.4) {
          const reason = !hasName ? 'missing product name' : `low confidence (${Math.round(confidence * 100)}%)`;
          console.warn(`🤖 [AI] Auto-cancelling due to ${reason}`);
          throw new Error(`AI result not reliable: ${reason}`);
        }

        const timingBreakdown = {
          prep_time_ms,
          ttfb_ms,
          response_json_time_ms,
          result_parse_time_ms,
          total_elapsed_ms: elapsed,
          retries_count: attempt - 1,
          backoff_total_ms: totalBackoffDelayMs,
          timeout_ms: timeoutMs
        };

        const enrichedResult = { 
          ...aiResult, 
          __ai_timings: timingBreakdown,
          __compressed_size: compressedFile.size // Track actual size sent to Gemini
        };
        setResult(enrichedResult);
        return enrichedResult;
      } catch (err) {
        const elapsed = Date.now() - startTime;
        
        // Handle cancellation/abort errors
        if (err.name === 'AbortError') {
          console.log(`🤖 [AI] Request cancelled after ${elapsed}ms`);
          throw new Error('Request cancelled');
        }
        
        // Handle timeout errors specifically
        if (err.message.includes('timeout')) {
          console.error(`🤖 [AI] Timeout after ${elapsed}ms (attempt ${attempt}/${maxAttempts})`);
          
          if (attempt < maxAttempts) {
            const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
            console.log(`🤖 [AI] Retrying after timeout in ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            totalBackoffDelayMs += delay;
            return makeRequest(attempt + 1, maxAttempts);
          } else {
            throw new Error(`AI analysis timed out after ${maxAttempts} attempts (${elapsed}ms total)`);
          }
        }
        
        // Handle other errors
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
          err.name === 'TypeError' && err.message.includes('fetch') ||
          err.message.includes('network') ||
          err.message.includes('connection') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('ENOTFOUND')
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
      
      // Track AI request with actual compressed size sent to Gemini
      const ai = await trackAIRequest(
        async () => await makeRequest(),
        imageFile.size, // Will be updated with compressed size in makeRequest
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
              },
              null,
              2
            )
        );
        
        // Provide more specific error messages
        let userFriendlyError = err.message;
        if (err.message.includes('timeout')) {
          userFriendlyError = 'Analysis timed out - please try again';
        } else if (err.message.includes('network') || err.message.includes('connection')) {
          userFriendlyError = 'Network error - check your connection and try again';
        } else if (err.message.includes('API key')) {
          userFriendlyError = 'AI service not configured';
        } else if (err.message.includes('Invalid JSON')) {
          userFriendlyError = 'AI response error - please try again';
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
      setAbortController(null); // Clear the abort controller
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
