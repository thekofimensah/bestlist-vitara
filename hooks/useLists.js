import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useLists = (userId) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false); // Guard against multiple fetches
  const [retryCount, setRetryCount] = useState(0);
  const [connectionError, setConnectionError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Helper function to apply custom ordering from localStorage
  const applyCustomOrder = (allLists) => {
    if (!userId || !allLists || allLists.length === 0) return allLists;
    
    try {
      const savedOrder = localStorage.getItem(`listOrder_${userId}`);
      if (!savedOrder) return allLists;
      
      const orderIds = JSON.parse(savedOrder);
      console.log(`[useLists] Applying custom order:`, orderIds);
      
      // Sort lists according to saved order, with unordered lists at the end
      const orderedLists = [];
      const unorderedLists = [];
      
      // First, add lists in the saved order
      orderIds.forEach(id => {
        const list = allLists.find(l => l.id === id);
        if (list) orderedLists.push(list);
      });
      
      // Then add any lists not in the saved order
      allLists.forEach(list => {
        if (!orderIds.includes(list.id)) {
          unorderedLists.push(list);
        }
      });
      
      return [...orderedLists, ...unorderedLists];
    } catch (error) {
      console.error('[useLists] Error applying custom order:', error);
      return allLists;
    }
  };

  useEffect(() => {
    if (userId) {
      fetchLists(false);
    } else {
      // When userId is null (user signed out), reset state
      setLists([]);
      setLoading(false);
    }
  }, [userId]);



  const fetchLists = async (background = false, attemptNumber = 0) => {
    if (!userId) return;
    
    // Allow refresh even if fetch is in progress (for pull-to-refresh)
    if (isFetching && !isRetrying && background) {
      console.log('[useLists] Fetch already in progress, skipping...');
      return;
    }
    
    setIsFetching(true);
    if (!background) setLoading(true);
    if (attemptNumber > 0) setIsRetrying(true);
    
    const start = Date.now();
    console.log('🔍 [useLists] === FETCH LISTS ATTEMPT START ===');
    console.log('🔍 [useLists] userId:', userId);
    console.log('🔍 [useLists] background mode:', background);
    console.log('🔍 [useLists] attempt number:', attemptNumber);
    console.log('🔍 [useLists] Current timestamp:', new Date().toISOString());
    
    // Log call stack to understand what triggered this
    const stack = new Error().stack;
    const callerLine = stack.split('\n')[3]; // Get the calling function
    console.log('🔍 [useLists] Called from:', callerLine?.trim() || 'unknown');
    
    // Log current lists state
    console.log('🔍 [useLists] Current lists count:', lists.length);
    console.log('🔍 [useLists] isFetching state:', isFetching);
    
    // Log memory usage if available
    if (performance.memory) {
      console.log('🔍 [useLists] Memory usage:', {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      });
    }
    
    // Log network connection info if available
    if (navigator.connection) {
      console.log('🔍 [useLists] Network info:', {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      });
    }
    
    console.log('🔍 [useLists] Starting Supabase query...');
    
    try {
      // Add timeout protection - increase to 60 seconds for high-latency connections
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('🚨 [useLists] TIMEOUT: Aborting query after 60 seconds');
        controller.abort();
      }, 60000); // Increased from 30s to 60s to match database timeout
      
      console.log('🔍 [useLists] About to execute Supabase query...');
      
      // For high-latency connections, skip debug operations on retry
      if (!background && retryCount === 0) {
        console.log('🔍 [supabase] Starting simplified health check...');
        
        // Simple health check
        try {
          const healthStart = Date.now();
          const { data: healthData, error: healthError } = await supabase
            .from('lists')
            .select('id')
            .limit(1);
          const healthEnd = Date.now();
          
          console.log('🔍 [supabase] Health check result:', JSON.stringify({
            success: !healthError,
            time: healthEnd - healthStart + 'ms',
            error: healthError
          }, null, 2));
        } catch (healthErr) {
          console.log('🔍 [supabase] Health check failed:', JSON.stringify(healthErr, null, 2));
        }
      } else if (retryCount > 0) {
        console.log('🔍 [useLists] RETRY MODE: Skipping debug operations for faster query');
      }
      
      // Use simplified query for retries
      let queryBuilder = supabase.from('lists').select('*').eq('user_id', userId);
      
      // Only add ORDER BY on first attempt - it might be causing slowness
      if (retryCount === 0) {
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
      } else {
        console.log('🔍 [useLists] RETRY MODE: Removing ORDER BY for faster query');
      }
      
      let { data: listsData, error: listsError } = await queryBuilder.abortSignal(controller.signal);
        
      clearTimeout(timeoutId);
      
      const afterLists = Date.now();
      console.log('🔍 [useLists] Query completed!');
      console.log(`🔍 [useLists] Lists fetched in ${afterLists - start}ms`);
      console.log('🔍 [useLists] listsData type:', typeof listsData);
      console.log('🔍 [useLists] listsData length:', listsData?.length || 'null/undefined');
      console.log('🔍 [useLists] listsError:', JSON.stringify(listsError, null, 2));
      
      if (listsData) {
        console.log('🔍 [useLists] Lists preview:', listsData.slice(0, 2).map(list => ({
          id: list.id,
          name: list.name,
          created_at: list.created_at
        })));
      }

      if (listsError) throw listsError;

      // No automatic default list creation - users will create their first list manually

      if (listsData && listsData.length > 0) {
        console.log('🔍 [useLists] Starting OPTIMIZED single-query approach...');
        
        // OPTIMIZATION: Single query to get all items for all lists at once
        const singleQueryStart = Date.now();
        
        // Simplified query for retries - no ORDER BY
        let itemsQueryBuilder = supabase
          .from('items')
          .select('*')
          .in('list_id', listsData.map(list => list.id));
          
        // Only add ORDER BY on first attempt, simplify for retries
        if (attemptNumber === 0) {
          console.log('🔍 [useLists] Using standard items query with ORDER BY');
        } else {
          console.log(`🔍 [useLists] RETRY MODE (attempt ${attemptNumber}): Items query without ORDER BY for speed`);
        }
        
        const { data: allItemsData, error: allItemsError } = await itemsQueryBuilder;
        
        const singleQueryEnd = Date.now();
        console.log(`🔍 [useLists] SINGLE QUERY for all items completed in ${singleQueryEnd - singleQueryStart}ms: ${allItemsData?.length || 0} total items`);
        
        if (allItemsError) {
          console.error('🚨 [useLists] Error in single query:', JSON.stringify(allItemsError, null, 2));
          throw allItemsError;
        }
        
        // Group items by list_id in memory (much faster than multiple queries)
        const itemsByListId = {};
        if (allItemsData) {
          allItemsData.forEach(item => {
            if (!itemsByListId[item.list_id]) {
              itemsByListId[item.list_id] = [];
            }
            itemsByListId[item.list_id].push(item);
          });
        }
        
        // Build lists with their items
        const allListsWithItems = listsData.map(list => {
          const listItems = itemsByListId[list.id] || [];
          
          // Sort in memory instead of database
          const sortedItems = listItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          // OPTIMIZATION: Delay image loading to reduce initial load time
          const optimizedItems = sortedItems.filter(item => !item.is_stay_away);
          const optimizedStayAways = sortedItems.filter(item => item.is_stay_away);
          
          console.log(`🔍 [useLists] "${list.name}": ${optimizedItems.length} items, ${optimizedStayAways.length} stay-aways`);
          
          return {
            ...list,
            items: optimizedItems,
            stayAways: optimizedStayAways
          };
        });
        
        const orderedLists = applyCustomOrder(allListsWithItems);
        setLists(orderedLists);
        
        const afterItems = Date.now();
        console.log(`🔍 [useLists] OPTIMIZED: Total time ${afterItems - afterLists}ms (single query + memory processing)`);
      } else {
        console.log('🔍 [useLists] No lists found, setting empty array');
        setLists([]);
      }
      
      console.log('🔍 [useLists] === FETCH LISTS DEBUG END ===');
      
    } catch (error) {
      const errorTime = Date.now();
      console.log('🚨 [useLists] === ERROR DEBUG START ===');
      console.log('🚨 [useLists] Error occurred at:', new Date().toISOString());
      console.log('🚨 [useLists] Time elapsed when error occurred:', errorTime - start, 'ms');
      console.log('🚨 [useLists] Error type:', error.constructor.name);
      console.log('🚨 [useLists] Error name:', error.name);
      console.log('🚨 [useLists] Error message:', error.message);
      
      if (error.name === 'AbortError') {
        console.log('🚨 [useLists] Fetch aborted due to timeout (60 seconds)');
        console.log('🚨 [useLists] This suggests the database query is hanging due to high latency');
        
        // For pull-to-refresh, don't retry automatically - let user try again
        if (background) {
          console.log('🔄 [useLists] Background fetch aborted - allowing manual retry');
          setConnectionError({
            message: 'Request timed out - pull down to try again',
            code: error.code,
            fatal: false
          });
          setIsFetching(false);
          setIsRetrying(false);
          if (!background) setLoading(false);
          return;
        }
        
        // Calculate exponential backoff delay: 2^attempt * 1000ms, max 30 seconds
        const baseDelay = Math.min(Math.pow(2, attemptNumber) * 1000, 30000);
        const jitterDelay = baseDelay + (Math.random() * 2000); // Add jitter
        
        console.log(`🔄 [useLists] Retrying after timeout (attempt ${attemptNumber + 1})`);
        console.log(`🔄 [useLists] Will retry in ${Math.round(jitterDelay/1000)}s with exponential backoff`);
        
        // Update retry state
        setRetryCount(attemptNumber + 1);
        setConnectionError({
          message: 'Database timeout - retrying...',
          code: error.code,
          attempt: attemptNumber + 1,
          nextRetryIn: Math.round(jitterDelay/1000)
        });
        
        setIsFetching(false); // Reset fetching state
        setTimeout(() => {
          fetchLists(true, attemptNumber + 1); // Retry in background mode
        }, jitterDelay);
        return Promise.resolve();
      } else {
        console.error('🚨 [useLists] Database error details:', JSON.stringify({
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
        
        // Check if this is a retryable error type
        const isRetryableError = (
          error.code === '57014' || // Statement timeout
          error.code === '08003' || // Connection does not exist
          error.code === '08006' || // Connection failure
          error.code === '53300' || // Too many connections
          error.message?.includes('timeout') ||
          error.message?.includes('network') ||
          error.message?.includes('connection') ||
          error.message?.includes('canceling statement')
        );
        
        if (isRetryableError) {
          // Calculate exponential backoff delay
          const baseDelay = Math.min(Math.pow(2, attemptNumber) * 1000, 30000);
          const jitterDelay = baseDelay + (Math.random() * 2000);
          
          console.log(`🔄 [useLists] Retryable error detected (attempt ${attemptNumber + 1})`);
          console.log(`🔄 [useLists] Will retry in ${Math.round(jitterDelay/1000)}s...`);
          
          // Log specific error analysis
          if (error.code === '57014') {
            console.log('🚨 [useLists] STATEMENT TIMEOUT detected - will retry with exponential backoff');
            console.log('🚨 [useLists] Possible causes: high latency, missing indexes, large dataset');
          }
          
          // Update retry state
          setRetryCount(attemptNumber + 1);
          setConnectionError({
            message: error.message,
            code: error.code,
            attempt: attemptNumber + 1,
            nextRetryIn: Math.round(jitterDelay/1000)
          });
          
          setIsFetching(false);
          setTimeout(() => {
            fetchLists(true, attemptNumber + 1);
          }, jitterDelay);
          return Promise.resolve();
        } else {
          console.log('🚨 [useLists] Non-retryable error, stopping attempts');
          setConnectionError({
            message: error.message,
            code: error.code,
            fatal: true
          });
        }
      }
      
      console.log('🚨 [useLists] === ERROR DEBUG END ===');
    } finally {
      // Only reset states if we're not retrying
      if (!isRetrying || connectionError?.fatal) {
        setIsFetching(false);
        setIsRetrying(false);
        if (!background) setLoading(false);
      }
      
      const finalTime = Date.now();
      console.log(`🔍 [useLists] Total fetch operation time: ${finalTime - start}ms`);
      
      if (connectionError?.fatal) {
        console.log('🔍 [useLists] Finished with fatal error - no more retries');
      } else if (isRetrying) {
        console.log('🔍 [useLists] Will retry soon...');
      } else {
        console.log('🔍 [useLists] Finished loading lists successfully');
        setConnectionError(null); // Clear any previous errors on success
        setRetryCount(0); // Reset retry count on success
      }
    }
    
    // Return success/failure for await support
    return { success: !connectionError?.fatal, error: connectionError };
  };

  // Preload function for authentication flow
  const preloadLists = async () => {
    if (!userId) {
      console.log('[useLists] No userId for preload, skipping...');
      return;
    }
    
    if (isFetching) {
      console.log('[useLists] Already fetching, skipping preload...');
      return;
    }
    
    console.log('[useLists] Preloading lists during authentication...');
    await fetchLists(true); // background = true to prevent loading state
  };

  // Lazy load items for a specific list
  const loadListItems = async (listId) => {
    if (!userId) return;
    
    console.log(`[useLists] Lazy loading items for list ${listId}...`);
    
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false });
        
      if (itemsError) throw itemsError;
      
      const items = itemsData?.filter(item => !item.is_stay_away) || [];
      const stayAways = itemsData?.filter(item => item.is_stay_away) || [];
      
      // Update the specific list with its items
      setLists(prev => prev.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            items,
            stayAways,
            _itemsLoaded: true
          };
        }
        return list;
      }));
      
      console.log(`[useLists] Loaded ${items.length} items and ${stayAways.length} stay-aways for list ${listId}`);
    } catch (error) {
      console.error(`[useLists] Error loading items for list ${listId}:`, error);
    }
  };

  // Background load remaining lists (5+)
  const loadRemainingLists = async () => {
    if (!userId) return;
    
    if (isFetching) {
      console.log('[useLists] Already fetching, skipping background load...');
      return;
    }
    
    // Find lists that haven't been loaded yet
    const unloadedLists = lists.filter(list => 
      list.items.length === 0 && 
      list.stayAways.length === 0 && 
      !list._itemsLoaded
    );
    
    if (unloadedLists.length === 0) {
      console.log('[useLists] No unloaded lists found for background loading');
      return;
    }
    
    console.log(`[useLists] Background loading ${unloadedLists.length} remaining lists...`);
    
    // Load items for each unloaded list
    for (const list of unloadedLists) {
      await loadListItems(list.id);
      // Small delay between requests to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`[useLists] Finished background loading remaining lists`);
  };

  const addItemToList = async (listIds, item, isStayAway = false) => {
    if (!userId) return { data: null, error: new Error('No user ID') };
    
    console.log('🔧 addItemToList called with:', JSON.stringify({
      listIds,
      itemName: item.name,
      isStayAway
    }));

    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a clean object for the database with correct column names
    const dbItem = {
      // Core fields - use existing name if available, otherwise fall back
      name: item.name || item.user_product_name || item.productName,
      image_url: item.image_url || item.image,
      rating: item.rating,
      notes: item.notes || '',
      is_stay_away: isStayAway,
      
      // AI Metadata
      ai_product_name: item.ai_product_name,
      ai_brand: item.ai_brand,
      ai_category: item.ai_category,
      ai_confidence: item.ai_confidence,
      ai_description: item.ai_description,
      ai_tags: item.ai_tags,
      ai_allergens: item.ai_allergens,
      ai_lookup_status: item.ai_lookup_status,
      
      // User Overrides
      user_product_name: item.user_product_name,
      user_description: item.user_description,
      user_tags: item.user_tags,
      
      // New structured fields
      detailed_breakdown: item.detailed_breakdown,
      rarity: item.rarity,
      place_name: item.place_name || item.place,
      location: item.location,
      latitude: item.latitude,
      longitude: item.longitude,
      price: item.price,
      currency_code: item.currency_code,
      
      // Photo Metadata
      photo_date_time: item.photo_date_time,
      photo_location_source: item.photo_location_source,
      
      // Legacy fields for compatibility
      category: item.category,
      species: item.species || item.user_description || item.qualityOverview,
      certainty: item.certainty || item.ai_confidence,
      tags: item.tags || item.user_tags,
    };

    // Remove undefined/null fields to avoid database issues
    Object.keys(dbItem).forEach(key => {
      if (dbItem[key] === undefined || dbItem[key] === null) {
        delete dbItem[key];
      }
    });

    console.log('🔧 Cleaned dbItem for database:', Object.keys(dbItem));

    // Optimistic update
    const optimisticItem = {
      ...item,
      id: tempId,
      _isOptimistic: true
    };

    setLists(prev => prev.map(list => {
      if (listIds.includes(list.id)) {
        return {
          ...list,
          items: isStayAway ? list.items : [...list.items, optimisticItem],
          stayAways: isStayAway ? [...list.stayAways, optimisticItem] : list.stayAways
        };
      }
      return list;
    }));

    // Background database operations
    try {
      const insertPromises = listIds.map(async (listId) => {
        const { data, error } = await supabase
          .from('items')
          .insert([{ ...dbItem, list_id: listId }])
          .select()
          .single();

        if (error) throw error;
        return { listId, data };
      });

      const results = await Promise.all(insertPromises);
      console.log('✅ Database insert successful for all lists');
      
      // Replace optimistic items with real data
      setLists(prev => prev.map(list => {
        const result = results.find(r => r.listId === list.id);
        if (result) {
          return {
            ...list,
            items: isStayAway 
              ? list.items 
              : list.items.map(i => i.id === tempId ? result.data : i),
            stayAways: isStayAway 
              ? list.stayAways.map(i => i.id === tempId ? result.data : i)
              : list.stayAways
          };
        }
        return list;
      }));
      
      // Return the first result's data (or all results if multiple lists)
      return { data: results.length === 1 ? results[0].data : results.map(r => r.data), error: null };
      
    } catch (error) {
      console.error('Error adding item:', JSON.stringify({ message: error.message, details: error.details, hint: error.hint, code: error.code }, null, 2));
      
      // Rollback optimistic update on error
      setLists(prev => prev.map(list => {
        if (listIds.includes(list.id)) {
          return {
            ...list,
            items: list.items.filter(i => i.id !== tempId),
            stayAways: list.stayAways.filter(i => i.id !== tempId)
          };
        }
        return list;
      }));
      
      return { data: null, error };
    }
  };

  const updateItemInList = async (listIds, updatedItem, isStayAway = false) => {
    console.log('🔧 updateItemInList called with:', JSON.stringify({
      listIds,
      itemId: updatedItem?.id,
      isStayAway
    }, null, 2));

    if (!updatedItem?.id) {
      console.error('❌ Missing item id for update');
      return;
    }

    try {
      // Explicitly map fields for the update - ensure valid UUID for list_id
      const validListId = Array.isArray(listIds) && listIds.length > 0 && listIds[0] ? listIds[0] : null;
      
      const itemToUpdate = {
        name: updatedItem.user_product_name || updatedItem.name || updatedItem.productName,
        image_url: updatedItem.image_url || updatedItem.image,
        rating: updatedItem.rating,
        notes: updatedItem.notes || '',
        is_stay_away: isStayAway,
        ai_product_name: updatedItem.ai_product_name,
        ai_brand: updatedItem.ai_brand,
        ai_category: updatedItem.ai_category,
        ai_confidence: updatedItem.ai_confidence,
        ai_description: updatedItem.ai_description,
        ai_tags: updatedItem.ai_tags,
        ai_allergens: updatedItem.ai_allergens,
        ai_lookup_status: updatedItem.ai_lookup_status,
        user_product_name: updatedItem.user_product_name,
        user_description: updatedItem.user_description,
        user_tags: updatedItem.user_tags,
        detailed_breakdown: updatedItem.detailed_breakdown,
        rarity: updatedItem.rarity,
        place_name: updatedItem.place_name,
        location: updatedItem.location,
        latitude: updatedItem.latitude,
        longitude: updatedItem.longitude,
        price: updatedItem.price,
        currency_code: updatedItem.currency_code,
        photo_date_time: updatedItem.photo_date_time,
        photo_location_source: updatedItem.photo_location_source,
        category: updatedItem.category,
        species: updatedItem.user_description || updatedItem.species,
        certainty: updatedItem.ai_confidence || updatedItem.certainty,
        tags: updatedItem.user_tags || updatedItem.tags || [],
        updated_at: new Date().toISOString(), // Explicitly set updated timestamp
      };

      // Only add list_id if we have a valid one
      if (validListId) {
        itemToUpdate.list_id = validListId;
      }

      // Remove undefined/null keys so they don't overwrite existing data in Supabase
      Object.keys(itemToUpdate).forEach(key => {
        if (itemToUpdate[key] === undefined || itemToUpdate[key] === null) {
          delete itemToUpdate[key];
        }
      });

      console.log('🔧 Updating item with data:', JSON.stringify(itemToUpdate, null, 2));

      // Create the updated item with the new data for immediate UI update
      const optimisticUpdatedItem = {
        ...updatedItem,
        ...itemToUpdate,
        id: updatedItem.id, // Ensure ID is preserved
        updated_at: new Date().toISOString(),
        _justUpdated: true // Temporary flag for visual feedback
      };

      console.log('⚡ Applying optimistic update immediately...');

      // Provide haptic feedback for the update
      if (navigator.vibrate) {
        navigator.vibrate(30); // Short, subtle vibration
      }

      // OPTIMISTIC UPDATE - Update UI immediately for instant feedback
      setLists(prevLists =>
        prevLists.map(list => {
          // Check if this list contains the item being updated
          const hasItemInItems = list.items.some(item => item.id === updatedItem.id);
          const hasItemInStayAways = list.stayAways.some(item => item.id === updatedItem.id);
          
          if (hasItemInItems || hasItemInStayAways) {
            let newItems = list.items.filter(item => item.id !== updatedItem.id);
            let newStayAways = list.stayAways.filter(item => item.id !== updatedItem.id);
            
            // Add the updated item to the correct category
            if (isStayAway) {
              newStayAways.push(optimisticUpdatedItem);
              // Sort by rating then by date
              newStayAways.sort((a, b) => {
                if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
                return new Date(b.created_at) - new Date(a.created_at);
              });
            } else {
              newItems.push(optimisticUpdatedItem);
              // Sort by rating then by date
              newItems.sort((a, b) => {
                if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
                return new Date(b.created_at) - new Date(a.created_at);
              });
            }
            
            return { ...list, items: newItems, stayAways: newStayAways };
          }
          return list;
        })
      );

      // Now perform the database update in the background
      try {
        const { data, error } = await supabase
          .from('items')
          .update(itemToUpdate)
          .eq('id', updatedItem.id)
          .select()
          .single();

        if (error) throw error;

                 console.log('✅ Item successfully updated in database');

         // Update with the actual database response (in case there are any differences)
         setLists(prevLists =>
           prevLists.map(list => {
             const hasItemInItems = list.items.some(item => item.id === updatedItem.id);
             const hasItemInStayAways = list.stayAways.some(item => item.id === updatedItem.id);
             
             if (hasItemInItems || hasItemInStayAways) {
               let newItems = list.items.filter(item => item.id !== updatedItem.id);
               let newStayAways = list.stayAways.filter(item => item.id !== updatedItem.id);
               
               if (isStayAway) {
                 newStayAways.push(data);
                 newStayAways.sort((a, b) => {
                   if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
                   return new Date(b.created_at) - new Date(a.created_at);
                 });
               } else {
                 newItems.push(data);
                 newItems.sort((a, b) => {
                   if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
                   return new Date(b.created_at) - new Date(a.created_at);
                 });
               }
               
               return { ...list, items: newItems, stayAways: newStayAways };
             }
             return list;
           })
         );

         // Clear the visual feedback flag after a short delay
         setTimeout(() => {
           setLists(prevLists =>
             prevLists.map(list => ({
               ...list,
               items: list.items.map(item => 
                 item.id === updatedItem.id ? { ...item, _justUpdated: false } : item
               ),
               stayAways: list.stayAways.map(item => 
                 item.id === updatedItem.id ? { ...item, _justUpdated: false } : item
               )
             }))
           );
         }, 1000); // Clear the flash after 1 second
      } catch (dbError) {
        // If database update fails, revert the optimistic update
        console.error('❌ Database update failed, reverting optimistic update');
        
        setLists(prevLists =>
          prevLists.map(list => {
            const hasItemInItems = list.items.some(item => item.id === updatedItem.id);
            const hasItemInStayAways = list.stayAways.some(item => item.id === updatedItem.id);
            
            if (hasItemInItems || hasItemInStayAways) {
              // Revert by putting the original item back
              let newItems = list.items.filter(item => item.id !== updatedItem.id);
              let newStayAways = list.stayAways.filter(item => item.id !== updatedItem.id);
              
              // Put the original item back where it was
              if (updatedItem.is_stay_away) {
                newStayAways.push(updatedItem);
              } else {
                newItems.push(updatedItem);
              }
              
              return { ...list, items: newItems, stayAways: newStayAways };
            }
            return list;
          })
        );
        
        throw dbError; // Re-throw the error
      }
    } catch (error) {
      console.error('Error updating item:', JSON.stringify({ message: error.message, details: error.details, hint: error.hint, code: error.code }, null, 2));
      throw error;
    }
  };

  const createList = async (name, color) => {
    console.log('🔧 createList called with:', JSON.stringify({ name, color, userId }));
    
    if (!userId) {
      console.error('❌ No userId provided to createList');
      // Throw an error to ensure the calling function can catch it
      throw new Error('User is not authenticated.');
    }

    try {
      console.log('🔧 Attempting to create list in Supabase...');
      
      // First test if we can access the lists table
      console.log('🔧 Testing lists table access...');
      const testQuery = await supabase.from('lists').select('count').limit(1);
      console.log('🔧 Table access test result:', testQuery);
      
      const { data, error } = await supabase
        .from('lists')
        .insert([{
          user_id: userId,
          name: name,
          color: color || '#1F6D5A'
        }])
        .select()
        .single();

      console.log('🔧 Supabase response:', JSON.stringify({ data, error }, null, 2));

      if (error) {
        console.error('❌ Supabase error:', JSON.stringify(error, null, 2));
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        // Do not re-throw the error here, let the caller handle it if needed
        return null;
      }

      console.log('✅ List created successfully:', JSON.stringify(data, null, 2));

      // Add to local state with empty items and stayAways
      const newList = {
        ...data,
        items: [],
        stayAways: []
      };

      setLists(prev => applyCustomOrder([newList, ...prev]));
      console.log('✅ List added to local state');
      return newList;
    } catch (error) {
      console.error('❌ Error creating list:', JSON.stringify({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
      // Do not re-throw the error here, let the caller handle it if needed
      return null;
    }
  };

  const reorderLists = async (newOrderedLists) => {
    console.log('🔧 reorderLists called with:', newOrderedLists.map(l => ({ id: l.id, name: l.name })));
    
    if (!userId) {
      console.error('❌ No userId provided to reorderLists');
      return;
    }

    try {
      // Update local state immediately for responsive UI
      setLists(newOrderedLists);
      
      // Store custom order in localStorage
      const listOrder = newOrderedLists.map(list => list.id);
      localStorage.setItem(`listOrder_${userId}`, JSON.stringify(listOrder));
      console.log('✅ Lists reordered successfully in localStorage');
      
    } catch (error) {
      console.error('❌ Error reordering lists:', error);
      // Revert local state on error
      refreshLists(true);
      throw error;
    }
  };

  const refreshLists = async (background = true) => {
    if (userId) {
      // Reset error state for fresh attempt
      setConnectionError(null);
      setRetryCount(0);
      return fetchLists(background, 0);
    }
    return Promise.resolve();
  };

  return {
    lists,
    loading,
    addItemToList,
    updateItemInList,
    refreshLists,
    createList,
    reorderLists,
    preloadLists,
    loadListItems,
    loadRemainingLists,
    // Retry state for UI feedback
    retryCount,
    connectionError,
    isRetrying
  };
};