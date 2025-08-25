// Mock useAuth hook for UI-only version
export const useAuth = () => {
  const mockUser = {
    id: 'mock-user-id',
    email: 'user@example.com'
  };

  const mockUserProfile = {
    id: 'mock-user-id',
    username: 'foodlover',
    display_name: 'Food Lover',
    avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    bio: 'Exploring the world one bite at a time'
  };

  const updateProfile = async (updates) => {
    console.log('Mock: updateProfile called with:', updates);
    return { data: { ...mockUserProfile, ...updates }, error: null };
  };

  return {
    user: mockUser,
    userProfile: mockUserProfile,
    loading: false,
    updateProfile
  };
};