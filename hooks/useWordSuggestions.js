import { useState, useCallback, useMemo } from 'react';

// Cache for AI-generated word suggestions
const suggestionCache = new Map();
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export const useWordSuggestions = () => {
  const [cachedSuggestions, setCachedSuggestions] = useState(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Convert AI format to component format
  const convertAIToComponentFormat = useCallback((aiSuggestions, rating = null) => {
    if (!aiSuggestions) return [];

    const suggestions = [];
    let idCounter = 1;

    // Determine which word set to use based on rating
    // Rating 1-2: negative review words, Rating 3+: positive review words
    const useNegativeWords = rating !== null && rating <= 2;
    
    const categories = ['productSpecific', 'valueQuality', 'wouldI', 'intensity'];
    const categoryLabels = {
      productSpecific: 'Product-Specific',
      valueQuality: 'Value & Quality',
      wouldI: 'Would I...?',
      intensity: 'Intensity'
    };

    categories.forEach(categoryKey => {
      const categoryData = aiSuggestions[categoryKey];
      if (!categoryData) return;

      const wordsToUse = useNegativeWords 
        ? categoryData.negativeReviewWords 
        : categoryData.positiveReviewWords;

      if (!wordsToUse || !Array.isArray(wordsToUse)) return;

      wordsToUse.forEach(wordPair => {
        if (!wordPair.main || !wordPair.opposite) return;

        suggestions.push({
          id: `ai-${categoryKey}-${idCounter++}`,
          label: wordPair.main,
          category: categoryLabels[categoryKey],
          variations: {
            original: wordPair.main,
            synonyms: [], // AI doesn't provide synonyms in this format
            enhanced: wordPair.main,
            opposite: wordPair.opposite
          }
        });
      });
    });

    return suggestions;
  }, []);



  // Get suggestions with caching (AI only, no fallback)
  const getSuggestions = useCallback(async (aiResult = null, rating = null) => {
    // Only proceed if we have AI word suggestions and sufficient product identification
    if (!aiResult?.wordSuggestions) {
      console.log('📝 [WordSuggestions] No AI word suggestions available');
      setCachedSuggestions(null);
      return null;
    }

    // Check if product is sufficiently identified
    if (!aiResult.productName || aiResult.certainty < 40) {
      console.log('📝 [WordSuggestions] Insufficient product identification:', {
        productName: aiResult.productName,
        certainty: aiResult.certainty
      });
      setCachedSuggestions(null);
      return null;
    }

    // Generate cache key based on product info
    const cacheKey = `${aiResult.productName}-${aiResult.category || 'unknown'}-${rating || 'norating'}`;

    // Check cache first
    const cached = suggestionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
      console.log('📝 [WordSuggestions] Using cached suggestions for:', cacheKey);
      setCachedSuggestions(cached.suggestions);
      return cached.suggestions;
    }

    setIsLoadingSuggestions(true);

    try {
      console.log('📝 [WordSuggestions] Processing AI-generated suggestions');
      const aiSuggestions = convertAIToComponentFormat(aiResult.wordSuggestions, rating);
      
      if (aiSuggestions.length > 0) {
        // Cache the AI suggestions
        suggestionCache.set(cacheKey, {
          suggestions: aiSuggestions,
          timestamp: Date.now(),
          source: 'ai'
        });
        
        setCachedSuggestions(aiSuggestions);
        console.log('📝 [WordSuggestions] Successfully converted AI suggestions:', aiSuggestions.length, 'items');
        return aiSuggestions;
      } else {
        console.log('📝 [WordSuggestions] No valid AI suggestions after conversion');
        setCachedSuggestions(null);
        return null;
      }
      
    } catch (error) {
      console.error('📝 [WordSuggestions] Error processing AI suggestions:', error);
      setCachedSuggestions(null);
      return null;
      
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [convertAIToComponentFormat]);

  // Remove duplicate suggestions
  const removeDuplicates = useCallback((suggestions) => {
    const seen = new Set();
    return suggestions.filter(suggestion => {
      const key = suggestion.label.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, []);

  // Get filtered suggestions based on already used words
  const getFilteredSuggestions = useCallback((suggestions, usedWords = []) => {
    const usedSet = new Set(usedWords.map(word => word.toLowerCase()));
    return suggestions.filter(suggestion => 
      !usedSet.has(suggestion.label.toLowerCase())
    );
  }, []);

  // Clear cache (useful for testing or manual refresh)
  const clearCache = useCallback(() => {
    suggestionCache.clear();
    setCachedSuggestions(null);
    console.log('📝 [WordSuggestions] Cache cleared');
  }, []);

  // Get cache stats (for debugging)
  const getCacheStats = useCallback(() => {
    const entries = Array.from(suggestionCache.entries());
    const validEntries = entries.filter(([_, data]) => 
      Date.now() - data.timestamp < CACHE_EXPIRY_MS
    );
    
    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries: entries.length - validEntries.length,
      sources: validEntries.reduce((acc, [_, data]) => {
        acc[data.source] = (acc[data.source] || 0) + 1;
        return acc;
      }, {})
    };
  }, []);

  return {
    getSuggestions,
    cachedSuggestions,
    isLoadingSuggestions,
    removeDuplicates,
    getFilteredSuggestions,
    clearCache,
    getCacheStats
  };
};
