// Fixed First-in-World Achievement Logic
// Replace the checkGlobalFirstAchievement function with this improved version

const checkGlobalFirstAchievement = useCallback(async (achievement, context) => {
  const { criteria } = achievement;
  
  if (criteria.type !== 'global_first') return null;

  try {
    let query;
    const sanitize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const isLikelyPackagedProduct = () => {
      // Must have a brand to be considered a real product
      const brand = context.ai_brand; // Only AI-detected brand qualifies
      if (!brand || sanitize(brand).length < 2) return false;
      // Heuristics to exclude dishes/meals
      const name = sanitize(context.ai_product_name || context.product_name);
      const dishWords = ['plate', 'bowl', 'soup', 'salad', 'pizza', 'pasta', 'ravioli', 'ramen', 'steak', 'sandwich'];
      if (dishWords.some((w) => name.includes(` ${w} `) || name.endsWith(` ${w}`) || name.startsWith(`${w} `))) {
        return false;
      }
      return true;
    };
    
    if (criteria.scope === 'product' && context.ai_product_name) {
      // Check if anyone else has the same AI-identified packaged product
      // Only consider packaged products with a brand
      const minConfidenceOk = typeof context.ai_confidence === 'number' ? context.ai_confidence >= 0.6 : true;
      if (!isLikelyPackagedProduct() || !minConfidenceOk || context.user_product_name) {
        console.log('🏆 [GlobalFirst/Product] Skipping due to validation', {
          isLikelyPackaged: isLikelyPackagedProduct(),
          minConfidenceOk,
          hasUserProductName: !!context.user_product_name
        });
        return null;
      }
      
      // IMPROVED: Check if this user has already earned this achievement for this product
      const existingUserAchievement = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('achievement_id', achievement.id)
        .limit(1);
        
      if (existingUserAchievement.data && existingUserAchievement.data.length > 0) {
        console.log('🏆 [GlobalFirst/Product] User already has this achievement');
        return null;
      }
      
      // IMPROVED: Use exact matching instead of partial matching
      const normalizedName = sanitize(context.ai_product_name);
      const brand = (context.ai_brand || '').trim();
      
      console.log('🏆 [GlobalFirst/Product] Checking for exact match', { 
        brand, 
        normalizedName, 
        rawName: context.ai_product_name 
      });
      
      // Check if this EXACT product (exact normalized name + brand) exists ANYWHERE already
      query = supabase
        .from('items')
        .select('id, ai_product_name, ai_brand, created_at')
        .eq('ai_brand', brand)
        .not('image_url', 'is', null);
      
      const { data: existingItems, error: queryError } = await query;
      
      if (queryError) throw queryError;
      
      // IMPROVED: Manual exact matching after fetching to avoid ILIKE issues
      const exactMatches = existingItems.filter(item => {
        const itemNormalizedName = sanitize(item.ai_product_name || '');
        return itemNormalizedName === normalizedName;
      });
      
      console.log('🏆 [GlobalFirst/Product] Search results', {
        totalWithBrand: existingItems.length,
        exactMatches: exactMatches.length,
        existingProducts: exactMatches.map(item => ({
          id: item.id,
          name: item.ai_product_name,
          normalized: sanitize(item.ai_product_name || ''),
          created: item.created_at
        }))
      });
      
      // If any exact matches exist, this is NOT a first in world
      if (exactMatches.length > 0) {
        console.log('🏆 [GlobalFirst/Product] Not first in world - exact matches found');
        return null;
      }
      
    } else if (criteria.scope === 'country' && context.location) {
      // Country logic remains the same...
      const country = extractCountryFromLocation(context.location);
      console.log('🏆 [GlobalFirst/Country] Tokens', { raw: context.location, country });
      if (!country) return null;
      
      const { data: userLists } = await supabase
        .from('lists')
        .select('id')
        .eq('user_id', user.id);
      
      if (!userLists || userLists.length === 0) return null;
      
      const userListIds = userLists.map(list => list.id);
      console.log('🏆 [GlobalFirst/Country] Lists in scope', userListIds.length);
      
      console.log('🏆 [GlobalFirst/Country] Query location ILIKE', `%${country}%`);
      query = supabase
        .from('items')
        .select('id')
        .in('list_id', userListIds)
        .ilike('location', `%${country}%`)
        .not('image_url', 'is', null);
    } else {
      console.log('🏆 [GlobalFirst] Unsupported scope or missing context');
      return null;
    }

    // Award the achievement if this is truly first
    console.log('🏆 [GlobalFirst] This appears to be a genuine first!');
    const result = await awardAchievement(achievement.id, { context });
    if (result?.success) {
      return { 
        achievement, 
        awarded: true, 
        isGlobalFirst: criteria.scope === 'global', // Only global scope is truly "global first"
        count: result.count,
        isRepeatable: true
      };
    }
  } catch (error) {
    console.error('Error checking global first achievement:', JSON.stringify({
        message: error.message,
        name: error.name,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
  }
  
  return null;
}, [user?.id, awardAchievement]);
