import { useState, useCallback } from 'react';
import { trackAIRequest } from '../lib/performanceTracking';
import { safeFetch, isOffline } from '../lib/onlineDetection';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const useAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [abortController, setAbortController] = useState(null);

  const encodeImageToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Resize to max 1024px preserving aspect ratio
        const maxSize = 1024;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with quality compression
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
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
    
    const makeRequest = async (attempt = 1, maxAttempts = 3) => {
      const startTime = Date.now();
      console.log(`🤖 [AI] Starting analysis attempt ${attempt}/${maxAttempts}`);
      
      // Progressive timeout: 20s for first attempt, 30s for retries
      const timeoutMs = attempt === 1 ? 20000 : 30000;
      try {
        const base64Image = await encodeImageToBase64(imageFile);
        console.log(`🤖 [AI] Image encoded (${base64Image.length} chars), location: ${location || 'none'}`);
        
        // Expert prompt to produce a canonical, human-style product name
        const prompt = `

You are a product identification expert. Your job is to identify consumer products from images with high accuracy. Identify the on-pack product and produce a single, canonical product name people would naturally use when referring to it in conversation or search.

CRITICAL: If you cannot clearly see a recognizable product, set confidence less than 0.5. Do NOT guess or hallucinate products.

If the 

Rules for the name field (MUST follow):
1) Structure: [Brand] [Core product] [Variant/essential qualifiers]
   - Include brand only if clearly visible. If unsure, DO NOT GUESS a brand and set this to an empty string.
   - "Core product" is the primary noun phrase (e.g., Toothpaste Tablets, Whole Milk, Dark Roast Coffee).
   - "Variant/essential qualifiers" include only intrinsic, distinguishing details like flavor, strength, fat %, roast level, SPF, form (tablets/powder/liquid), decaf, alcohol %, or other regulated style descriptors.
2) Exclude marketing/packaging/ethos claims: plastic free, eco-friendly, zero-waste, cruelty-free, sustainable, BPA-free, non‑GMO, gluten-free (unless it is the legally defining style), etc.
3) Exclude pack/count/size/weight unless it’s the defining variant (e.g., "2%" or "4%" milk fat IS allowed).
4) Remove long ingredient/benefit lists (e.g., "with Aloe Vera, Tea Tree and Xylitol"). Keep it short and canonical.
5) Language: English. Use Title Case. No emojis. No trailing punctuation. Max 80 chars.


Additional guidance${location ? ` (photo taken in ${location})` : ''}:
- Prefer brands and variants common to the region; avoid unlikely guesses.
- If the object is food/drink or consumer goods, use retail naming conventions.

Brand field rules (MUST follow):
- If no real brand/manufacturer name is clearly visible, return an EMPTY string for brand.
- If you see generic placeholders like "unbranded", "generic", "store brand", "house brand", "brandless", "unknown", "n/a", etc., return an EMPTY string for brand.
- Do not fabricate brand names.

Return JSON using the schema. Ensure the name field adheres to the rules exactly.`;

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
          // Configure structured output using responseSchema
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                name: {
                  type: "STRING",
                  description: "Canonical human-style product name following rules: [Brand] [Variant/essential qualifiers] [Core product] ; exclude marketing/packaging/ethos claims; Title Case; English; <= 80 chars."
                },
                brand: {
                  type: "STRING", 
                  description: "Brand/manufacturer name; return empty string if not clearly visible or if only a generic placeholder (unbranded/generic/store brand/brandless). Do not guess."
                },
                category: {
                  type: "STRING",
                  description: "Product category (e.g., Dairy, Beverages, Snacks, Frozen Foods, Pantry Items)"
                },
                confidence: {
                  type: "NUMBER",
                  description: "Confidence in the identification (between 0 and 1)"
                },
                description: {
                  type: "STRING",
                  description: "A concise, distinguishing description that helps identify this specific product variant. Focus on key differentiating features like flavor, type, size, dietary attributes, or unique characteristics. Keep it under 15 words and be specific."
                },
                product: {
                  type: "STRING", 
                  description: "A string with three parts: Brand (if exists), Quantifiers (e.g., 'fat free', 'organic', 'chocolate'), What it is (e.g., 'milk', 'cheese', 'cookies'). Clean up to remove repetitions. Must be in clear language describing exactly what the product is."
                },
                tags: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  description: "Array of 3-4 focused tags for filtering. Include dietary restrictions, health attributes, flavor profiles, dietary lifestyles, product characteristics, and meal context. Avoid storage requirements, sizes, basic categories."
                },
                allergens: {
                  type: "ARRAY", 
                  items: { type: "STRING" },
                  description: "Array of allergens if mentioned or inferred from description"
                }
              },
              required: ["name", "brand", "category", "confidence", "description", "tags"],
              propertyOrdering: ["name", "brand", "product", "category", "confidence", "description", "tags", "allergens"]
            }
          }
        };

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

        const json = await response.json();
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
        try {
          aiData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('🤖 [AI] JSON parse error: ' + JSON.stringify({ message: parseError.message, name: parseError.name }, null, 2));
          console.error('🤖 [AI] Raw response text: ' + responseText.substring(0, 500));
          throw new Error('Invalid JSON response from AI');
        }

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

        // Return data in the format expected by the app
        const aiResult = {
          productName: normalizedName,
          brand: brand,
          category: aiData.category || '',
          species: aiData.description || 'Unknown',
          certainty: Math.round((aiData.confidence || 0) * 100),
          tags: aiData.tags || ['Untagged'],
          productType: aiData.category || 'Unknown',
          allergens: aiData.allergens || []
        };

        console.log(`🤖 [AI] Analysis completed in ${elapsed}ms`);
        console.log('🤖 [AI] Structured response:', JSON.stringify(aiData, null, 2));
        console.log('🤖 [AI] Normalized product name:', JSON.stringify({ brand, nameField: aiData.name, productField: aiData.product, normalizedName }, null, 2));
        console.log('🤖 [AI] Formatted result:', JSON.stringify(aiResult, null, 2));

        // Auto-cancel rules: low confidence or missing essential fields
        const confidence = typeof aiData.confidence === 'number' ? aiData.confidence : 0;
        const hasName = Boolean(aiData.product || aiData.name);
        if (!hasName || confidence < 0.4) {
          const reason = !hasName ? 'missing product name' : `low confidence (${Math.round(confidence * 100)}%)`;
          console.warn(`🤖 [AI] Auto-cancelling due to ${reason}`);
          throw new Error(`AI result not reliable: ${reason}`);
        }

        setResult(aiResult);
        return aiResult;
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
          return makeRequest(attempt + 1, maxAttempts);
        }
        
        throw err;
      }
    };
    
    try {
      // Track AI request performance using existing system
      const source = imageFile.name?.includes('upload') ? 'gallery' : 'camera';
      
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
  }, [encodeImageToBase64, abortController]);

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
