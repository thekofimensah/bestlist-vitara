# Supabase Edge Functions

This directory contains Supabase Edge Functions for the BestList app.

## Functions

### analyze-image
Handles AI-powered product analysis using Gemini API.

**Features:**
- Receives image data from client
- Compresses images for optimal AI processing
- Calls Gemini API server-side for product identification
- Returns structured product data

**Environment Variables Required:**
- `GEMINI_API_KEY`: Your Google Gemini API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### search-places
Handles Google Places API calls for location search functionality.

**Features:**
- Receives search queries and optional coordinates
- Uses Google Places API (New) with fallback to legacy API
- Returns structured place data with names, addresses, coordinates, and types
- Location bias support for better local results

**Environment Variables Required:**
- `GOOGLE_PLACES_API_KEY`: Your Google Places API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Deployment

### 1. Set Environment Variables

In your Supabase dashboard:
1. Go to Project Settings → Edge Functions
2. Add the following secrets:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### 2. Deploy the Function

Using Supabase CLI:
```bash
##START DOCKER FIRST##
# Deploy specific function
supabase functions deploy analyze-image

# Or deploy all functions
supabase functions deploy
```

### 3. Test the Function

You can test the function using the Supabase CLI:
```bash
supabase functions serve analyze-image --no-verify-jwt
```

## Security Notes

- The Gemini API key is now stored server-side only
- Client-side code no longer exposes API credentials
- All AI processing happens securely on Supabase servers
- Image compression reduces bandwidth and API costs

## Development

To develop locally:
```bash
##START DOCKER FIRST##
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve
```

## Troubleshooting

**Common Issues:**

1. **"Gemini API key not configured"**
   - Check that `GEMINI_API_KEY` is set in your Supabase secrets

2. **"Server misconfigured"**
   - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct

3. **Image compression fails**
   - The function falls back to original image if compression fails
   - Check the logs for compression error details

4. **Function timeout**
   - Edge Functions have a 30-second timeout
   - Large images may need additional optimization
