import { useState, useCallback } from 'react';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const useAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

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

    setIsProcessing(true);
    setError(null);
    
    const makeRequest = async (attempt = 1, maxAttempts = 3) => {
      const startTime = Date.now();
      console.log(`🤖 [AI] Starting analysis attempt ${attempt}/${maxAttempts}`);
      
      // Progressive timeout: 20s for first attempt, 30s for retries
      const timeoutMs = attempt === 1 ? 20000 : 30000;
      try {
        const base64Image = await encodeImageToBase64(imageFile);
        console.log(`🤖 [AI] Image encoded (${base64Image.length} chars), location: ${location || 'none'}`);
        
        // Simplified prompt - no JSON format instructions needed
        const prompt = `
Identify the product in the image.${location ? `

LOCATION CONTEXT: This photo was taken in ${location}. Use this location information to:
- Prioritize brands and products commonly sold in ${location}
- Consider local/regional brands, store chains, and specialties specific to this area
- Account for regional product variations, labeling, and naming conventions
- Focus on products that would realistically be found in restaurants, grocery stores, markets, or shops in ${location}` : ''}

Focus on food and beverage products, household items, and consumer goods. Default to english.`;

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
                  description: "Product name"
                },
                brand: {
                  type: "STRING", 
                  description: "Brand/manufacturer name"
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
              required: ["name", "brand", "category", "confidence", "description", "product", "tags"],
              propertyOrdering: ["name", "brand", "category", "confidence", "description", "product", "tags", "allergens"]
            }
          }
        };

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(timeoutMs) // Progressive timeout
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          const elapsed = Date.now() - startTime;
          
          console.error(`🤖 [AI] API Error (${elapsed}ms):`, {
            status: response.status,
            statusText: response.statusText,
            attempt,
            timeout: timeoutMs,
            errorText: errorText.substring(0, 500) // Truncate long errors
          });
          
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

        const result = await response.json();
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const elapsed = Date.now() - startTime;
        
        console.log(`🤖 [AI] Response received in ${elapsed}ms`);
        
        if (!responseText) {
          console.error('🤖 [AI] Empty response from Gemini:', result);
          throw new Error('No response text from AI');
        }

        // Parse the guaranteed valid JSON response (no cleanup needed!)
        let aiData;
        try {
          aiData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('🤖 [AI] JSON parse error:', parseError);
          console.error('🤖 [AI] Raw response text:', responseText.substring(0, 500));
          throw new Error('Invalid JSON response from AI');
        }

        // Return data in the format expected by the app
        const aiResult = {
          productName: aiData.product || aiData.name || 'Unknown Product',
          brand: aiData.brand || '',
          category: aiData.category || '',
          species: aiData.description || 'Unknown',
          certainty: Math.round((aiData.confidence || 0) * 100),
          tags: aiData.tags || ['Untagged'],
          productType: aiData.category || 'Unknown',
          allergens: aiData.allergens || []
        };

        console.log(`🤖 [AI] Analysis completed in ${elapsed}ms`);
        console.log('🤖 [AI] Structured response:', JSON.stringify(aiData, null, 2));
        console.log('🤖 [AI] Formatted result:', JSON.stringify(aiResult, null, 2));

        return aiResult;
      } catch (err) {
        const elapsed = Date.now() - startTime;
        
        // Handle timeout errors specifically
        if (err.name === 'AbortError' || err.message.includes('timeout')) {
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
        console.error(`🤖 [AI] Error on attempt ${attempt}:`, {
          name: err.name,
          message: err.message,
          elapsed: elapsed + 'ms'
        });
        
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
      return await makeRequest();
    } catch (err) {
      console.error('🤖 [AI] Analysis failed:', {
        message: err.message,
        name: err.name,
        attempts: '3 attempts made'
      });
      
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
      
      // Return fallback data on error
      const fallbackResult = {
        productName: '',
        species: '',
        certainty: 0,
        tags: [],
        productType: ''
      };
      return fallbackResult;
    } finally {
      setIsProcessing(false);
    }
  }, [encodeImageToBase64]);

  return { analyzeImage, isProcessing, error };
};
