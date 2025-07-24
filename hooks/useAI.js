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
      try {
        const base64Image = await encodeImageToBase64(imageFile);
        
        const prompt = `
Identify the product in the image.${location ? `

LOCATION CONTEXT: This photo was taken in ${location}. Use this location information to:
- Prioritize brands and products commonly sold in ${location}
- Consider local/regional brands, store chains, and specialties specific to this area
- Account for regional product variations, labeling, and naming conventions
- Focus on products that would realistically be found in grocery stores, markets, or shops in ${location}
- If applicable, consider local food regulations, import restrictions, or regional preferences that affect product availability` : ''}

Provide your response as a JSON object with the following fields:
- name: Product name (string)
- brand: Brand/manufacturer name (string)
- category: Product category (e.g., Dairy, Beverages, Snacks, Frozen Foods, Pantry Items) (string)
- confidence: Your confidence in the identification (number between 0 and 1, e.g., 0.85) (number)
- description: A concise, distinguishing description that helps identify this specific product variant. Focus on key differentiating features like flavor, type, size, dietary attributes, or unique characteristics that would help distinguish it from similar products. Keep it under 15 words and be specific (e.g., "Organic whole milk" vs "Chocolate chip cookies with sea salt" vs "Fat-free Greek yogurt"). IMPORTANT:This should describe the product, not the image.
- product: A string with three parts/ There should not be repeat words:
    1. Brand (if it exists, otherwise leave blank)
    2. Quantifiers (e.g., 'fat free', 'organic', 'chocolate', 'red', 'large', etc.) (if it exists, otherwise leave blank)
    3. What it is (e.g., 'milk', 'cheese', 'cookies')
  Example: "Trader Joe's organic fat free milk" After creating the product, clean it up to remove repitions or unhelpful parts.
- tags: Array of focused tags for filtering and categorization. Looking at the "category", decide what are the most important distinction of products within this category. Choose 3-4 relevant tags that would help users filter and understand this product. Include: dietary restrictions (vegan, gluten-free, dairy-free, etc.), health attributes (organic, low-sugar, high-protein, etc.), flavor profiles (chocolate, vanilla, spicy, sweet, etc.), dietary lifestyles (keto, paleo, etc.), product characteristics (artisanal, imported, premium, etc.), and meal context (breakfast, snack, dessert, etc.). AVOID: storage requirements (refrigerated, frozen), sizes/quantities (8oz, 900ml, large), basic categories that duplicate the category field (dairy, beverages), and overly generic terms (food, product, item, fresh).
- allergens: Array of allergens if mentioned and take the description field, and infer allergens from that. (array of strings, optional)
If you cannot identify the product with reasonable confidence, return a JSON object with a field 'error' explaining why (e.g., 'Image unclear', 'No product detected').
Focus on food and beverage products, household items, and consumer goods.`;

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
          }]
        };

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(15000) // 15s timeout for retries
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          
          // Handle 503 overload errors with retry
          if (response.status === 503 && attempt < maxAttempts) {
            const delay = attempt === 1 ? 2000 : 3000; // Tight backoff: 2s, then 3s
            console.log(`AI overloaded, retrying in ${delay/1000}s... (attempt ${attempt}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeRequest(attempt + 1, maxAttempts);
          }
          
          console.error('AI API Error:', response.status, errorText);
          throw new Error(`AI analysis failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!responseText) {
          throw new Error('No response from AI');
        }

        // Parse JSON response
        const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(cleanedResponse);

        if (aiData.error) {
          throw new Error(aiData.error);
        }

        // Return data in the format expected by the app
        const aiResult = {
          productName: aiData.product || aiData.name || 'Unknown Product',
          brand: aiData.brand || '',
          category: aiData.category || aiData.type || '',
          species: aiData.description || 'Unknown',
          certainty: Math.round((aiData.confidence || 0) * 100),
          tags: aiData.tags || ['Untagged'],
          productType: aiData.category || 'Unknown',
          allergens: aiData.allergens || []
        };

        console.log('🤖 [AI] Raw AI response from server:', JSON.stringify(aiData, null, 2));
        console.log('🤖 [AI] Formatted result for app:', JSON.stringify(aiResult, null, 2));

        return aiResult;
      } catch (err) {
        // If it's a retry attempt and still failing, bubble up the error
        if (attempt >= maxAttempts || !err.message.includes('503')) {
          throw err;
        }
        // This shouldn't happen as 503 is handled above, but just in case
        throw err;
      }
    };
    
    try {
      return await makeRequest();
    } catch (err) {
      console.error('AI Analysis failed:', err.message);
      setError(err.message);
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
