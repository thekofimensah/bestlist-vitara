// Static mock suggestions for Phase 1 testing
// Structure: categories with priority and per-word variations

export const SUGGESTION_CATEGORIES = [
  { key: 'specific', label: 'Specific', priority: 1 },
  { key: 'meta', label: 'Meta', priority: 2 },
  { key: 'outcome', label: 'Outcome', priority: 3 },
  { key: 'functional', label: 'Functional', priority: 4 }
];

// Each suggestion: { id, label, variations: { original, synonyms: [2], enhanced, opposite } }
export const MOCK_SUGGESTIONS = {
  specific: [
    {
      id: 'crisp',
      label: 'crisp',
      variations: {
        original: 'crisp',
        synonyms: ['crunchy', 'snappy'],
        enhanced: 'perfectly crisp',
        opposite: 'not crisp'
      }
    },
    {
      id: 'juicy',
      label: 'juicy',
      variations: {
        original: 'juicy',
        synonyms: ['succulent', 'moist'],
        enhanced: 'super juicy',
        opposite: 'dry'
      }
    },
    {
      id: 'tender',
      label: 'tender',
      variations: {
        original: 'tender',
        synonyms: ['soft', 'delicate'],
        enhanced: 'melt-in-your-mouth tender',
        opposite: 'tough'
      }
    },
    {
      id: 'aromatic',
      label: 'aromatic',
      variations: {
        original: 'aromatic',
        synonyms: ['fragrant', 'perfumed'],
        enhanced: 'deeply aromatic',
        opposite: 'flat aroma'
      }
    }
  ],
  meta: [
    {
      id: 'worth-it',
      label: 'worth it',
      variations: {
        original: 'worth it',
        synonyms: ['good value', 'fair price'],
        enhanced: 'absolutely worth it',
        opposite: 'not worth it'
      }
    },
    {
      id: 'overrated',
      label: 'overrated',
      variations: {
        original: 'overrated',
        synonyms: ['overhyped', 'meh'],
        enhanced: 'seriously overrated',
        opposite: 'underrated'
      }
    },
    {
      id: 'authentic',
      label: 'authentic',
      variations: {
        original: 'authentic',
        synonyms: ['true to style', 'classic'],
        enhanced: 'remarkably authentic',
        opposite: 'inauthentic'
      }
    }
  ],
  outcome: [
    {
      id: 'buy-again',
      label: 'would buy again',
      variations: {
        original: 'would buy again',
        synonyms: ['repeat buy', 'getting this again'],
        enhanced: 'definitely buying again',
        opposite: 'would not buy again'
      }
    },
    {
      id: 'recommend',
      label: 'recommend',
      variations: {
        original: 'recommend',
        synonyms: ['tell friends', 'worth a try'],
        enhanced: 'highly recommend',
        opposite: 'do not recommend'
      }
    },
    {
      id: 'skip',
      label: 'skip next time',
      variations: {
        original: 'skip next time',
        synonyms: ['pass on it', 'not again'],
        enhanced: 'definitely skipping next time',
        opposite: 'get it again'
      }
    }
  ],
  functional: [
    {
      id: 'portion',
      label: 'portion size',
      variations: {
        original: 'portion size',
        synonyms: ['generous', 'small portion'],
        enhanced: 'perfect portion size',
        opposite: 'portion felt off'
      }
    },
    {
      id: 'service-speed',
      label: 'quick service',
      variations: {
        original: 'quick service',
        synonyms: ['fast', 'prompt'],
        enhanced: 'blazingly fast service',
        opposite: 'slow service'
      }
    },
    {
      id: 'pricey',
      label: 'pricey',
      variations: {
        original: 'pricey',
        synonyms: ['expensive', 'costly'],
        enhanced: 'pretty pricey',
        opposite: 'great value'
      }
    }
  ]
};


