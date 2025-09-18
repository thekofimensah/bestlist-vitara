// Supabase Edge Function: analyze-image
// Handles AI-powered product analysis using Gemini API
// Receives image data, processes it, and returns structured product information

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Import browser-image-compression for server-side image processing
const imageCompression = await import('https://esm.sh/browser-image-compression@2.0.2')

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // Parse request body
    const { imageData, imageType, location, originalSize } = await req.json() as {
      imageData?: string
      imageType?: string
      location?: string
      originalSize?: number
    }

    if (!imageData || !imageType) {
      return new Response(JSON.stringify({ error: 'Missing image data or type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    console.log(`🤖 [Edge Function] Starting analysis for ${imageType} image (${originalSize} bytes)`)

    // Convert base64 to blob for compression
    const imageBlob = new Uint8Array(atob(imageData).split('').map(c => c.charCodeAt(0)))
    const originalFile = new File([imageBlob], 'image.jpg', { type: imageType })

    // Compress image for optimal AI analysis (targeting max 80KB)
    let compressedFile = originalFile

    // Only compress if the image is larger than our target or not JPEG
    if (originalFile.size > 82000 || !originalFile.type.includes('jpeg')) {
      console.log(`🤖 [Edge Function] Image needs compression: ${Math.round(originalFile.size / 1024)}KB`)

      try {
        compressedFile = await imageCompression.default(originalFile, {
          maxSizeMB: 0.08,              // Target max 80KB
          maxWidthOrHeight: 768,        // Reduced resolution for AI (sufficient for analysis)
          useWebWorker: false,          // Web workers not available in Deno
          fileType: 'image/jpeg',       // JPEG is more efficient than WebP for AI
          initialQuality: 0.65,         // Lower quality for aggressive compression
          alwaysKeepResolution: false   // Allow aggressive resizing
        })
      } catch (compressionError) {
        console.warn('🤖 [Edge Function] Compression failed, using original:', compressionError)
        compressedFile = originalFile
      }
    } else {
      console.log(`🤖 [Edge Function] Image already optimally compressed: ${Math.round(originalFile.size / 1024)}KB`)
    }

    // Convert compressed image to base64 for Gemini API
    const compressedArrayBuffer = await compressedFile.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(compressedArrayBuffer)))

    console.log(`🤖 [Edge Function] Final image size for AI: ${Math.round(compressedFile.size / 1024)}KB (${compressedFile.size} bytes), location: ${location || 'none'}`)

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

Brand field rules (MUST follow):
- If no real brand/manufacturer name is clearly visible, return an EMPTY string for brand.
- If you see generic placeholders like "unbranded", "generic", "store brand", "house brand", "brandless", "unknown", "n/a", etc., return an EMPTY string for brand.
- Do not fabricate brand names.

Description field rules (MUST follow):
- For mass-produced items: provide a concise one line factual description of what the product is.
- For specialty/artisanal products: include fascinating details that would delight and surprise readers about the product itself - unexpected origins, remarkable production secrets, surprising historical connections, or extraordinary characteristics that make people say "I had no idea!" DO NOT describe packaging, bottle colors, label designs, or visual elements visible in the image. Focus exclusively on the product content, ingredients, production methods, or usage experience that would be relevant to someone considering this product. For cheese for example, what makes this specific cheese different from similar cheeses, the most interesting facts about it.

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
- intensity_pairs: 2 pairs, SAME list for both sentiments; each pair as "not too X:too X" (e.g., "not too strong:too strong, not too sweet:too sweet")`

    // Make the Gemini API request
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
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error(`🤖 [Edge Function] Gemini API Error (${geminiResponse.status}): ${errorText}`)
      throw new Error(`AI analysis failed: ${geminiResponse.status} - ${errorText.substring(0, 200)}`)
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    console.log('🤖 [Edge Function] Gemini response received')
    console.log('🤖 [Edge Function] EXTRACTED TEXT:', responseText)

    if (!responseText) {
      console.error('🤖 [Edge Function] Empty response from Gemini:', JSON.stringify(geminiData, null, 2))
      throw new Error('No response text from AI')
    }

    // Parse the guaranteed valid JSON response
    let aiData
    try {
      aiData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('🤖 [Edge Function] JSON parse error:', parseError)
      console.error('🤖 [Edge Function] Raw response text:', responseText.substring(0, 500))
      throw new Error('Invalid JSON response from AI')
    }

    console.log('🤖 [Edge Function] Structured AI response:', JSON.stringify(aiData, null, 2))

    // Normalize product naming for consistency across AI variations
    const normalizeProductName = (brand: string, product: string, name: string) => {
      const clean = (s: string) => (s || '').replace(/\s+/g, ' ').trim()
      const baseRaw = clean(product || name || '')
      if (!baseRaw && !brand) return 'Unknown Product'

      // 1) Cut trailing descriptive clauses: after 'with ...', parentheses, or extra comma sections
      let core = baseRaw
        .replace(/\bwith\b.*$/i, '')
        .replace(/\([^)]*\)/g, '')
        .trim()

      // 2) Keep only the first comma section (e.g., remove ", plastic free, vegan")
      if (core.includes(',')) {
        core = core.split(',')[0].trim()
      }

      // 3) Remove common marketing qualifiers at the end (if present)
      const bannedSuffixes = [
        'plastic free', 'vegan', 'eco friendly', 'eco-friendly', 'zero waste',
        'natural', 'cruelty free', 'cruelty-free', 'sustainable', 'biodegradable',
        'organic', 'non gmo', 'non-gmo', 'gluten free', 'gluten-free'
      ]
      bannedSuffixes.forEach((phrase) => {
        const re = new RegExp(`(?:,?\s*${phrase})+$`, 'i')
        core = core.replace(re, '').trim()
      })

      // 4) Collapse double spaces and trim punctuation
      core = core.replace(/\s{2,}/g, ' ').replace(/[\s,.;-]+$/g, '').trim()

      // 5) Ensure brand appears exactly once at the front
      const startsWithBrand = brand && new RegExp(`^${brand}[^a-z0-9]?`, 'i').test(core)
      const finalName = clean(startsWithBrand ? core : `${brand ? brand + ' ' : ''}${core}`)

      // 6) Cap length to a sane limit to avoid overflow
      return finalName.length > 80 ? finalName.slice(0, 77).trim() + '…' : finalName
    }

    // Normalize brand: treat generic/placeholder terms as empty to avoid false positives
    const rawBrand = (aiData.brand || '').trim()
    const brandDeny = new Set(['unbranded','generic','store brand','house brand','brandless','unknown','n/a','na','none','unspecified','not specified'])
    const brand = brandDeny.has(rawBrand.toLowerCase()) ? '' : rawBrand
    const normalizedName = (aiData.name && aiData.name.trim())
      ? aiData.name.trim()
      : normalizeProductName(brand, aiData.product, aiData.name)

    // Parse the new format word suggestions and add manual fields
    const parseWordPairs = (pairString: string) => {
      if (!pairString) return []
      return pairString.split(',').map(pair => {
        const [main, opposite] = pair.split(':').map(s => s.trim())
        return { main, opposite }
      }).filter(pair => pair.main && pair.opposite)
    }

    // Add manual value/quality and would-I fields
    const vq_pos = "good value:poor value,high quality:low quality,worth it:not worth it,natural:artificial"
    const vq_neg = "overpriced:affordable,low quality:high quality,not worth it:worth it,artificial:natural"
    const wi_pos = "would recommend:wouldn't recommend,would buy again:wouldn't buy again,would repurchase:wouldn't repurchase"
    const wi_neg = "wouldn't recommend:would recommend,wouldn't buy again:would buy again,wouldn't repurchase:would repurchase"

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
      intensity: {
        positiveReviewWords: parseWordPairs(aiData.intensity_pairs),
        negativeReviewWords: parseWordPairs(aiData.intensity_pairs).map(pair => ({
          main: pair.opposite,
          opposite: pair.main // Swap for negative reviews: "too X" first
        })),
        wouldI: {
            positiveReviewWords: parseWordPairs(wi_pos),
            negativeReviewWords: parseWordPairs(wi_neg)
          } 
      }
    }

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
      wordSuggestions: wordSuggestions,
      __compressed_size: compressedFile.size,
      __ai_timings: {
        compression_time_ms: 0, // We'll track this properly later
        api_time_ms: 0,
        total_time_ms: Date.now() - Date.now() // Placeholder
      }
    }

    console.log('🤖 [Edge Function] Analysis completed successfully')
    console.log('🤖 [Edge Function] Normalized product name:', normalizedName)
    console.log('🤖 [Edge Function] Final result:', JSON.stringify(aiResult, null, 2))

    // Auto-cancel rules: low confidence or missing essential fields
    const confidence = typeof aiData.confidence === 'number' ? aiData.confidence : 0
    const hasName = Boolean(aiData.name)
    if (!hasName || confidence < 0.4) {
      const reason = !hasName ? 'missing product name' : `low confidence (${Math.round(confidence * 100)}%)`
      console.warn(`🤖 [Edge Function] Auto-cancelling due to ${reason}`)
      throw new Error(`AI result not reliable: ${reason}`)
    }

    return new Response(JSON.stringify(aiResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error: any) {
    console.error('❌ [Edge Function] Analysis failed:', error.message)
    console.error('❌ [Edge Function] Error details:', JSON.stringify({
      message: error.message,
      name: error.name,
      stack: error.stack
    }, null, 2))

    // Provide more specific error messages
    let userFriendlyError = error.message
    if (error.message.includes('timeout')) {
      userFriendlyError = 'Analysis timed out - please try again'
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      userFriendlyError = 'Network error - check your connection and try again'
    } else if (error.message.includes('API key')) {
      userFriendlyError = 'AI service not configured'
    } else if (error.message.includes('Invalid JSON')) {
      userFriendlyError = 'AI response error - please try again'
    }

    return new Response(JSON.stringify({
      error: userFriendlyError,
      fallbackResult: {
        productName: '',
        species: '',
        certainty: 0,
        tags: [],
        productType: ''
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})
