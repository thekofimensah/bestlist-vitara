// Mock data for UI-only version

export const mockUser = {
  id: 'mock-user-id',
  email: 'user@example.com'
};

export const mockUserProfile = {
  id: 'mock-user-id',
  username: 'foodlover',
  display_name: 'Food Lover',
  avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  bio: 'Exploring the world one bite at a time'
};

export const mockLists = [
  {
    id: '1',
    name: 'Coffee Favorites',
    color: '#1F6D5A',
    created_at: '2024-01-15T10:00:00Z',
    items: [
      {
        id: 'item1',
        name: 'Ethiopian Single Origin',
        image_url: 'https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg?auto=compress&cs=tinysrgb&w=400',
        rating: 5,
        notes: 'Amazing floral notes with bright acidity',
        created_at: '2024-01-15T10:00:00Z',
        is_stay_away: false
      },
      {
        id: 'item2',
        name: 'Colombian Dark Roast',
        image_url: 'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=400',
        rating: 4,
        notes: 'Rich and bold, perfect for mornings',
        created_at: '2024-01-14T10:00:00Z',
        is_stay_away: false
      }
    ],
    stayAways: [
      {
        id: 'item3',
        name: 'Bitter Blend',
        image_url: 'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=400',
        rating: 2,
        notes: 'Too bitter for my taste',
        created_at: '2024-01-13T10:00:00Z',
        is_stay_away: true
      }
    ]
  },
  {
    id: '2',
    name: 'Dessert Discoveries',
    color: '#FF6B9D',
    created_at: '2024-01-10T10:00:00Z',
    items: [
      {
        id: 'item4',
        name: 'Chocolate Croissant',
        image_url: 'https://images.pexels.com/photos/2067396/pexels-photo-2067396.jpeg?auto=compress&cs=tinysrgb&w=400',
        rating: 5,
        notes: 'Perfectly flaky and buttery',
        created_at: '2024-01-10T10:00:00Z',
        is_stay_away: false
      }
    ],
    stayAways: []
  }
];

export const mockFeedPosts = [
  {
    id: 'post1',
    user: {
      name: 'Sarah Chen',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    image: 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'Artisan Sourdough',
    description: 'Found this amazing bakery in downtown. The crust is perfect!',
    rating: 5,
    verdict: 'LOVE',
    tags: ['bakery', 'sourdough', 'artisan'],
    snippet: 'Perfect crust and amazing flavor',
    likes: 24,
    comments: 8,
    location: 'Downtown Bakery, San Francisco',
    created_at: '2024-01-15T14:30:00Z',
    user_liked: false
  },
  {
    id: 'post2',
    user: {
      name: 'Mike Rodriguez',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    image: 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'Matcha Latte',
    description: 'Creamy and not too sweet. Perfect balance of earthy matcha.',
    rating: 4,
    verdict: 'LOVE',
    tags: ['matcha', 'latte', 'cafe'],
    snippet: 'Perfect matcha balance',
    likes: 15,
    comments: 3,
    location: 'Green Tea Cafe, Portland',
    created_at: '2024-01-15T12:15:00Z',
    user_liked: true
  }
];

export const mockNotifications = [
  {
    id: 'notif1',
    type: 'like',
    profiles: {
      username: 'sarah_chen',
      avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    created_at: '2024-01-15T14:00:00Z',
    read: false,
    reference_id: 'post1'
  },
  {
    id: 'notif2',
    type: 'comment',
    profiles: {
      username: 'mike_rodriguez',
      avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    created_at: '2024-01-15T13:30:00Z',
    read: false,
    reference_id: 'post2'
  }
];

export const mockAchievements = [
  {
    id: 'ach1',
    achievements: {
      name: 'First Bite',
      description: 'Saved your first item',
      icon: '🍽️',
      rarity: 'common'
    },
    earned_at: '2024-01-15T10:00:00Z',
    count: 1
  },
  {
    id: 'ach2',
    achievements: {
      name: 'Explorer',
      description: 'Discovered 10 items',
      icon: '🗺️',
      rarity: 'rare'
    },
    earned_at: '2024-01-14T15:30:00Z',
    count: 1
  }
];

export const mockCurrencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
];