// Supabase Edge Function: search-places
// Handles Google Places API calls for location search functionality
// Receives search queries and returns structured place data

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')

    if (!googlePlacesApiKey) {
      return new Response(JSON.stringify({ error: 'Google Places API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // Parse request body
    const { query, latitude, longitude } = await req.json() as {
      query?: string
      latitude?: number
      longitude?: number
    }

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or empty search query' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    console.log(`🔍 [Edge Function] Searching for places: "${query}"`);
    console.log(`🔍 [Edge Function] Location bias: ${latitude ? `lat:${latitude}, lon:${longitude}` : 'none'}`);

    // Try the new Google Places API (New) first
    try {
      const url = `https://places.googleapis.com/v1/places:searchText`;

      const requestBody: any = {
        textQuery: query,
        maxResultCount: 6
      };

      // Add location bias if coordinates are provided
      if (latitude !== undefined && longitude !== undefined) {
        requestBody.locationBias = {
          circle: {
            center: {
              latitude: latitude,
              longitude: longitude
            },
            radius: 50000 // 50km radius
          }
        };
      }

      console.log('🔍 [Edge Function] New API request:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googlePlacesApiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.primaryType'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🔍 [Edge Function] New API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [Edge Function] New API response:', JSON.stringify(data, null, 2));

        if (data.places && data.places.length > 0) {
          const results = data.places.map((place: any) => ({
            name: place.displayName?.text || 'Unknown Place',
            display: place.formattedAddress || 'Address not available',
            lat: place.location?.latitude,
            lon: place.location?.longitude,
            types: place.types || [],
            primaryType: place.primaryType
          })).filter((r: any) => r.lat && r.lon);

          console.log(`🔍 [Edge Function] New API found ${results.length} places`);
          return new Response(JSON.stringify({
            results,
            apiUsed: 'new'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      console.log('🔍 [Edge Function] New API failed or returned no results, trying legacy API...');
    } catch (newApiError) {
      console.warn('🔍 [Edge Function] New API error:', newApiError);
    }

    // Fallback to legacy Text Search API
    try {
      const types = 'restaurant|cafe|bakery|supermarket|grocery_or_supermarket|meal_takeaway|food';
      let legacyUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=${types}&key=${googlePlacesApiKey}`;

      // Add location parameter if coordinates are provided
      if (latitude !== undefined && longitude !== undefined) {
        legacyUrl += `&location=${latitude},${longitude}&radius=50000`;
      }

      console.log('🔍 [Edge Function] Legacy API URL:', legacyUrl.replace(googlePlacesApiKey, '[API_KEY]'));

      const legacyResponse = await fetch(legacyUrl);
      const legacyData = await legacyResponse.json();

      console.log('🔍 [Edge Function] Legacy API response status:', legacyResponse.status);
      console.log('🔍 [Edge Function] Legacy API response:', JSON.stringify(legacyData, null, 2));

      if (legacyData.status === 'OK' && legacyData.results && legacyData.results.length > 0) {
        const results = legacyData.results.slice(0, 6).map((result: any) => ({
          name: result.name,
          display: result.formatted_address,
          lat: result.geometry?.location?.lat,
          lon: result.geometry?.location?.lng,
          types: result.types || [],
          rating: result.rating
        })).filter((r: any) => r.lat && r.lon);

        console.log(`🔍 [Edge Function] Legacy API found ${results.length} places`);
        return new Response(JSON.stringify({
          results,
          apiUsed: 'legacy'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } else {
        console.log('🔍 [Edge Function] Legacy API returned no results');
      }
    } catch (legacyError) {
      console.error('🔍 [Edge Function] Legacy API error:', legacyError);
    }

    // If both APIs fail or return no results
    console.log('🔍 [Edge Function] Both APIs failed or returned no results');
    return new Response(JSON.stringify({
      results: [],
      apiUsed: 'none'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('❌ [Edge Function] Unexpected error:', error.message);
    console.error('❌ [Edge Function] Error details:', JSON.stringify({
      message: error.message,
      name: error.name,
      stack: error.stack
    }, null, 2));

    return new Response(JSON.stringify({
      error: 'Internal server error',
      results: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
})
