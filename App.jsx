import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthView from './components/AuthView';
import MainScreen from './components/MainScreen';
import { AchievementProvider } from './hooks/useGlobalAchievements';
import AchievementSystem from './components/gamification/AchievementSystem';

// Mock user data
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Always authenticated for UI demo
  const [loading, setLoading] = useState(false);

  // Mock auth context
  const authContext = {
    user: mockUser,
    userProfile: mockUserProfile,
    loading: false,
    updateProfile: async (updates) => {
      console.log('Mock: updateProfile called with:', updates);
      return { data: { ...mockUserProfile, ...updates }, error: null };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center" style={{ backgroundColor: '#F6F6F4' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <AchievementProvider>
      <div className="App">
        <MainScreen />
        <AchievementSystem />
      </div>
    </AchievementProvider>
  );
}

export default App;