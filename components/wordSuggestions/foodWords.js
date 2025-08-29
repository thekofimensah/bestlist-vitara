// Food-related word database with progressive levels
// Each word has: base, +, ++, -, --
export const FOOD_WORDS = {
  // Common food adjectives
  good: {
    base: 'good',
    positive: ['good', 'tasty', 'delicious'],
    negative: ['good', 'okay', 'bland']
  },
  delicious: {
    base: 'delicious',
    positive: ['delicious', 'amazing', 'phenomenal'],
    negative: ['delicious', 'good', 'okay']
  },
  fresh: {
    base: 'fresh',
    positive: ['fresh', 'crisp', 'perfect'],
    negative: ['fresh', 'stale', 'old']
  },
  hot: {
    base: 'hot',
    positive: ['hot', 'steaming', 'scalding'],
    negative: ['hot', 'warm', 'lukewarm']
  },
  cold: {
    base: 'cold',
    positive: ['cold', 'chilled', 'frozen'],
    negative: ['cold', 'room temp', 'warm']
  },
  sweet: {
    base: 'sweet',
    positive: ['sweet', 'rich', 'decadent'],
    negative: ['sweet', 'mild', 'bitter']
  },
  savory: {
    base: 'savory',
    positive: ['savory', 'flavorful', 'robust'],
    negative: ['savory', 'bland', 'tasteless']
  },
  crispy: {
    base: 'crispy',
    positive: ['crispy', 'crunchy', 'perfect'],
    negative: ['crispy', 'soft', 'soggy']
  },
  juicy: {
    base: 'juicy',
    positive: ['juicy', 'succulent', 'tender'],
    negative: ['juicy', 'dry', 'tough']
  },
  creamy: {
    base: 'creamy',
    positive: ['creamy', 'smooth', 'silky'],
    negative: ['creamy', 'thick', 'grainy']
  },
  spicy: {
    base: 'spicy',
    positive: ['spicy', 'hot', 'fiery'],
    negative: ['spicy', 'mild', 'bland']
  },
  rich: {
    base: 'rich',
    positive: ['rich', 'decadent', 'luxurious'],
    negative: ['rich', 'light', 'watery']
  },
  tender: {
    base: 'tender',
    positive: ['tender', 'succulent', 'melt-in-mouth'],
    negative: ['tender', 'tough', 'chewy']
  },
  aromatic: {
    base: 'aromatic',
    positive: ['aromatic', 'fragrant', 'scented'],
    negative: ['aromatic', 'mild', 'odorless']
  },
  authentic: {
    base: 'authentic',
    positive: ['authentic', 'traditional', 'genuine'],
    negative: ['authentic', 'generic', 'artificial']
  },
  flavorful: {
    base: 'flavorful',
    positive: ['flavorful', 'tasty', 'delicious'],
    negative: ['flavorful', 'bland', 'tasteless']
  },
  smooth: {
    base: 'smooth',
    positive: ['smooth', 'creamy', 'silky'],
    negative: ['smooth', 'rough', 'grainy']
  }
};

// Helper function to get word levels
export const getWordLevels = (word) => {
  const lowerWord = word.toLowerCase();
  return FOOD_WORDS[lowerWord] || null;
};

// Helper function to get progressive word based on level
export const getProgressiveWord = (baseWord, level) => {
  const wordData = getWordLevels(baseWord);
  if (!wordData) return baseWord;

  if (level > 0 && level <= wordData.positive.length) {
    return wordData.positive[level - 1];
  } else if (level < 0 && Math.abs(level) <= wordData.negative.length) {
    return wordData.negative[Math.abs(level) - 1];
  }

  return baseWord;
};
