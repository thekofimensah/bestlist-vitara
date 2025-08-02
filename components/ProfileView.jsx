import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, LogOut, Shield, FileText, Settings, Search, Bell, List, Heart, Star, Share, User } from 'lucide-react';
import { signOut, supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useUserStats } from '../hooks/useUserStats';
import LoadingSpinner from '../ui/LoadingSpinner';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import AchievementsGallery from './gamification/AchievementsGallery';

const StatCard = ({ icon, value, label }) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DCEFE9' }}>
          {icon}
        </div>
      </div>
      <div className="text-xl font-semibold text-gray-900 mb-1" style={{ color: '#1E1F1E' }}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs font-medium text-gray-500">
        {label}
      </div>
    </div>
  );
};

const ProfileView = ({ onBack, isRefreshing = false }) => {
  const { user, userProfile, updateProfile } = useAuth();
  
  // Debug user profile
  console.log('🔍 [ProfileView] User profile debug:', JSON.stringify({
    user: user ? { id: user.id, email: user.email } : null,
    userProfile,
    hasUsername: !!userProfile?.username,
    hasDisplayName: !!userProfile?.display_name
  }, null, 2));
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const { stats, loading: statsLoading, error: statsError } = useUserStats();
  
  // Debug logging
  console.log('🔍 [ProfileView] Debug info:', JSON.stringify({
    userId: user?.id,
    userProfile,
    stats,
    statsLoading,
    statsError
  }, null, 2));

  const handleSave = async () => {
    setLoading(true);
    // Bio update functionality would go here
    setLoading(false);
  };

  const handleSignOut = async () => {
    try {
      console.log('🚪 Signing out...');
      const { error } = await signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
      } else {
        console.log('✅ Signed out successfully');
        // The auth listener in the parent app should handle the redirect
      }
    } catch (error) {
      console.error('❌ Sign out exception:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Food Journey',
                  text: `Check out ${userProfile?.username ? `@${userProfile.username}` : 'my'}'s food discoveries on breadcrumbs!`,
        url: window.location.href
      });
    } else {
      console.log('Share my progress');
    }
  };

  // Use real stats from database with fallbacks
  const userStats = {
    photosTaken: stats?.photosTaken || 0,
    listsCreated: stats?.listsCreated || 0,
    uniqueIngredients: stats?.uniqueIngredients || 0,
    likesReceived: stats?.likesReceived || 0,
    totalItems: stats?.totalItems || 0,
    avgRating: stats?.avgRating || 0
  };

  if (showPrivacyPolicy) {
    return <PrivacyPolicy onBack={() => setShowPrivacyPolicy(false)} />;
  }

  if (showTermsOfService) {
    return <TermsOfService onBack={() => setShowTermsOfService(false)} />;
  }

  if (showSettings) {
    return (
      <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
        {/* Settings Content - Remove duplicate header */}
        <div className="pt-16 px-4 py-6">
          {/* Profile Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile</h3>
            <div className="space-y-3">
              {/* Username (read-only) */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block">Username</label>
                    <p className="text-base text-gray-900">
                      {userProfile?.username ? `${userProfile.username}` : 'Username not set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Bio</label>
                    <input
                      type="text"
                      value={userProfile?.bio || ''}
                      onChange={(e) => {
                        // Update bio functionality would go here
                      }}
                      className="w-full text-base text-gray-900 bg-transparent border-none outline-none placeholder-gray-400"
                      placeholder="Tell people about yourself"
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="text-teal-700 text-sm font-medium"
                    style={{ color: '#1F6D5A' }}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block">Email</label>
                    <p className="text-base text-gray-900">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* App Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">App Settings</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setShowPrivacyPolicy(true)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <span className="text-base font-medium text-gray-900">Privacy Policy</span>
                </div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              </button>

              <button 
                onClick={() => setShowTermsOfService(true)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="text-base font-medium text-gray-900">Terms of Service</span>
                </div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              </button>
            </div>
          </div>

          {/* Sign Out */}
          <button 
            onClick={handleSignOut}
            className="w-full bg-red-50 border border-red-100 rounded-2xl p-4"
          >
            <span className="text-base font-medium text-red-600">Sign Out</span>
          </button>
        </div>

        {/* Fixed Settings Header */}
        <div className="fixed top-0 left-0 right-0 bg-stone-50 z-20 pt-8 pb-4" style={{ backgroundColor: '#F6F6F4' }}>
          <div className="px-4 flex items-center justify-between">
            <button
              onClick={() => setShowSettings(false)}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
            <div className="w-10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-stone-50 z-20 pt-8 pb-4" style={{ backgroundColor: '#F6F6F4' }}>
        <div className="px-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
                        <h2 className="text-xl font-semibold text-gray-900">
                {userProfile?.username ? `@${userProfile.username}` : 'Your Profile'}
              </h2>
          <div className="flex gap-2">
            {/* Debug Force Refresh Button */}
            <button
              onClick={async () => {
                console.log('🔍 [ProfileView] Debug: Force refresh - clearing all state');
                await signOut();
                // Force page reload to clear all React state
                window.location.reload();
              }}
              className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shadow-sm"
              title="Debug: Force Refresh"
            >
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {/* Debug Sign Out Button */}
            <button
              onClick={async () => {
                console.log('🔍 [ProfileView] Debug: Force sign out');
                await signOut();
              }}
              className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shadow-sm"
              title="Debug: Force Sign Out"
            >
              <LogOut className="w-5 h-5 text-red-600" />
            </button>
            
            {/* Debug Test Query Button */}
            <button
              // Replace the onClick handler in ProfileView.jsx line 264-299 with this:

              onClick={async () => {
                console.log('🔍 [ProfileView] Debug: Testing MULTIPLE approaches');
                
                // Test 1: Basic fetch to Supabase (like before)
                try {
                  console.log('🔍 [ProfileView] Test 1: Basic fetch to Supabase...');
                  const start1 = Date.now();
                  const response = await fetch('https://jdadigamrbeenkxdkwer.supabase.co/rest/v1/lists?select=count&limit=1', {
                    headers: {
                      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI',
                      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI'
                    }
                  });
                  const data = await response.text();
                  const duration1 = Date.now() - start1;
                  console.log('🔍 [ProfileView] Test 1 result:', { 
                    duration: duration1 + 'ms',
                    status: response.status,
                    data: data.substring(0, 100) + '...'
                  });
                } catch (err) {
                  console.error('🔍 [ProfileView] Test 1 error:', err);
                }
                
                // Test 2: Python-style approach (lists then items)
                try {
                  console.log('🔍 [ProfileView] Test 2: Python-style (lists then items)...');
                  const start2 = Date.now();
                  
                  // Step 1: Get lists (like Python does)
                  const listsResponse = await fetch('https://jdadigamrbeenkxdkwer.supabase.co/rest/v1/lists?select=*&user_id=eq.a71aeac4-f8bb-407d-ae58-02582d3b6221&order=created_at.desc', {
                    headers: {
                      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI',
                      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI'
                    }
                  });
                  const listsData = await listsResponse.json();
                  console.log('🔍 [ProfileView] Lists found:', listsData?.length || 0);
                  
                  // Step 2: Get items (like Python does)  
                  if (listsData && listsData.length > 0) {
                    const listIds = listsData.map(l => l.id);
                    const itemsResponse = await fetch(`https://jdadigamrbeenkxdkwer.supabase.co/rest/v1/items?select=*&list_id=in.(${listIds.join(',')})`, {
                      headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI'
                      }
                    });
                    const itemsData = await itemsResponse.json();
                    console.log('🔍 [ProfileView] Items found:', itemsData?.length || 0);
                  }
                  
                  const duration2 = Date.now() - start2;
                  console.log('🔍 [ProfileView] Test 2 result:', { 
                    duration: duration2 + 'ms',
                    listsCount: listsData?.length || 0
                  });
                } catch (err) {
                  console.error('🔍 [ProfileView] Test 2 error:', err);
                }
                
                // Test 3: Supabase client simple query
                try {
                  console.log('🔍 [ProfileView] Test 3: Supabase client simple...');
                  const start3 = Date.now();
                  const { data, error } = await supabase
                    .from('lists')
                    .select('count')
                    .limit(1);
                  const duration3 = Date.now() - start3;
                  console.log('🔍 [ProfileView] Test 3 result:', { 
                    duration: duration3 + 'ms',
                    data, 
                    error 
                  });
                } catch (err) {
                  console.error('🔍 [ProfileView] Test 3 error:', err);
                }
                
                // Test 4: Supabase client JOIN query (the problematic one)
                try {
                  console.log('🔍 [ProfileView] Test 4: Supabase client JOIN query...');
                  const start4 = Date.now();
                  const { data, error } = await supabase
                    .from('lists')
                    .select(`
                      id,
                      name,
                      color,
                      created_at,
                      items (
                        id,
                        name,
                        image_url,
                        rating,
                        is_stay_away,
                        created_at,
                        notes
                      )
                    `)
                    .eq('user_id', 'a71aeac4-f8bb-407d-ae58-02582d3b6221')
                    .order('created_at', { ascending: false })
                    .order('created_at', { referencedTable: 'items', ascending: false });
                  const duration4 = Date.now() - start4;
                  console.log('🔍 [ProfileView] Test 4 result:', { 
                    duration: duration4 + 'ms',
                    listsCount: data?.length || 0,
                    error 
                  });
                } catch (err) {
                  console.error('🔍 [ProfileView] Test 4 error:', err);
                }
              }}
              className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shadow-sm"
              title="Debug: Test Query"
            >
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
            
            <button 
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"
            >
              <Settings className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-20 px-4 pb-6 space-y-6">
        {/* Hero Profile Card */}
        <div 
          className="bg-white rounded-t-3xl rounded-b-2xl p-6 shadow-lg"
          style={{ 
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            borderBottomLeftRadius: '24px',
            borderBottomRightRadius: '24px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.06)'
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-21 h-21 rounded-full border-3 border-white overflow-hidden relative"
              style={{ 
                width: '84px', 
                height: '84px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <button 
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100"
              >
                <Camera className="w-3 h-3 text-gray-600" />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2" style={{ color: '#1E1F1E' }}>
                {userProfile?.username ? `@${userProfile.username}` : userProfile?.display_name || user?.email?.split('@')[0] || 'User'}
              </h2>
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="px-3 py-1 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: '#DCEFE9' }}
                >
                  <span className="text-sm">🍽️</span>
                  <span className="text-xs font-medium text-teal-700">Food Explorer</span>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-500">
                {userProfile?.bio || ''}
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-semibold text-teal-700 mb-1" style={{ color: '#1F6D5A' }}>
              {userStats.totalItems}
            </div>
            <div className="text-sm font-medium text-gray-500">Total Items</div>
          </div>
        </div>

        {/* Stats Dashboard */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : statsError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-600">Failed to load statistics</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard 
              icon={<Camera className="w-7 h-7 text-teal-700" style={{ color: '#1F6D5A' }} />}
              value={userStats.photosTaken}
              label="Photos Taken"
            />
            <StatCard 
              icon={<List className="w-7 h-7 text-teal-700" style={{ color: '#1F6D5A' }} />}
              value={userStats.listsCreated}
              label="Lists Created"
            />
            <StatCard 
              icon={<Star className="w-7 h-7 text-teal-700" style={{ color: '#1F6D5A' }} />}
              value={userStats.avgRating}
              label="Avg Rating"
            />
            <StatCard 
              icon={<Heart className="w-7 h-7 text-teal-700" style={{ color: '#1F6D5A' }} />}
              value={userStats.likesReceived}
              label="Likes Received"
            />
          </div>
        )}





        {/* Achievements Gallery */}
        <AchievementsGallery userId={user?.id} />

        {/* Share CTA */}
        <button
          onClick={handleShare}
          className="w-full h-13 bg-teal-700 text-white rounded-full font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200 hover:bg-teal-800 active:scale-95"
          style={{ backgroundColor: '#1F6D5A', height: '52px' }}
        >
          <Share className="w-5 h-5" />
          Share My Food Journey
        </button>
      </div>
    </div>
  );
};

export default ProfileView;