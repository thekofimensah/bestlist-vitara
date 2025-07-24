// Utility to build an item object for saving (single or bulk)
export function buildItem({
  // Preserve ID if editing
  id,
  
  // AI Metadata
  ai_product_name,
  ai_brand,
  ai_category,
  ai_confidence,
  ai_description,
  ai_tags,
  ai_allergens,
  ai_lookup_status,
  
  // User Overrides
  user_product_name,
  user_description,
  user_tags,
  
  // Detailed Breakdown (flexible object)
  detailed_breakdown,
  
  // Rarity, Location, Price
  rarity,
  place_name,
  latitude,
  longitude,
  price,
  currency_code,
  
  // Photo Metadata
  photo_date_time,
  photo_location_source,
  
  // Core item fields (some are legacy/being replaced)
  productName, // Legacy: use user_product_name or ai_product_name
  category, // Legacy: use ai_category
  species,     // Legacy: use user_description or ai_description
  certainty,   // Legacy: use ai_confidence
  tags,        // Legacy: use user_tags or ai_tags
  image,
  rating,
  notes,
  location,
  place,
  qualityOverview,
  is_stay_away,
  date = new Date().toLocaleDateString(),
  ...rest
}) {
  const itemData = {
    // Return a clean object with all fields for Supabase
    // If a user-provided value exists, use it; otherwise, fallback to AI
    name: user_product_name || productName, // Main display name
    category: ai_category || category, // Use AI category primarily
    notes,
    rating,
    is_stay_away,
    image_url: image, // Ensure field name matches Supabase
    
    // AI Metadata - properly extract from aiMetadata or direct params
    ai_product_name: ai_product_name || productName,
    ai_brand: ai_brand,
    ai_category: ai_category || category,
    ai_confidence: ai_confidence || certainty,
    ai_description: ai_description || qualityOverview,
    ai_tags: ai_tags || (Array.isArray(tags) ? tags : []),
    ai_allergens: ai_allergens || [],
    ai_lookup_status: ai_lookup_status || 'success',
    
    // User Overrides
    user_product_name: user_product_name,
    user_description: user_description || qualityOverview,
    user_tags: user_tags || (Array.isArray(tags) ? tags : []),
    
    // New, structured fields
    detailed_breakdown: detailed_breakdown || {},
    rarity: rarity || 1,
    place_name: place_name || place,
    location: location,
    latitude: latitude,
    longitude: longitude,
    price: price,
    currency_code: currency_code,
    
    // Photo Metadata
    photo_date_time: photo_date_time,
    photo_location_source: photo_location_source,

    // Keep legacy fields for now for compatibility
    species: user_description || qualityOverview || species,
    certainty: ai_confidence || certainty,
    tags: user_tags || tags || [],
    
    ...rest // Keep any other properties
  };

  // Add ID if provided (for editing)
  if (id) {
    itemData.id = id;
  }

  return itemData;
} 