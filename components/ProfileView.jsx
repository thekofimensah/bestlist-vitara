import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, LogOut, Shield, FileText, User, Settings, Search, Bell, List, Heart, Star, Share } from 'lucide-react';
import { signOut } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

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

const ProfileView = ({ onBack }) => {
  const { user, userProfile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || '');
  const [country, setCountry] = useState(userProfile?.country || '');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await updateProfile({ name, country });
    if (!error) {
      setIsEditing(false);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Food Journey',
        text: `Check out my food discoveries on breadcrumbs!`,
        url: window.location.href
      });
    } else {
      console.log('Share my progress');
    }
  };

  // Mock stats - replace with real data from your app
  const userStats = {
    photosTaken: 47,
    listsCreated: 8,
    uniqueIngredients: 124,
    likesReceived: 156,
    totalItems: 89,
    avgRating: 4.2
  };

  if (showSettings) {
    return (
      <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
        {/* Settings Content - Remove duplicate header */}
        <div className="pt-16 px-4 py-6">
          {/* Profile Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile</h3>
            <div className="space-y-3">
              {/* Username */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-base text-gray-900 bg-transparent border-none outline-none placeholder-gray-400"
                      placeholder="Your name"
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

              {/* Country */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full text-base text-gray-900 bg-transparent border-none outline-none placeholder-gray-400"
                      placeholder="Your country"
                    />
                  </div>
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
              <button className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <span className="text-base font-medium text-gray-900">Privacy Policy</span>
                </div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              </button>

              <button className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
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
          <h2 className="text-xl font-semibold text-gray-900">Your Profile</h2>
          <button 
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"
          >
            <Settings className="w-5 h-5 text-gray-700" />
          </button>
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
                {userProfile?.name || user?.email?.split('@')[0] || 'User'}
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
                {user?.email}
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

        {/* Account Management */}
        <div className="bg-white rounded-3xl p-6 shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Account</h3>
          
          <div className="space-y-3">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-base font-medium text-gray-900">Edit Profile</span>
              </div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            </button>

            <button 
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="text-base font-medium text-gray-900">Settings</span>
              </div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            </button>
          </div>
        </div>

        {/* Quick Profile Edit */}
        {isEditing && (
          <div className="bg-white rounded-3xl p-6 shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Edit Profile</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
                  placeholder="Enter your country"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-teal-700 text-white rounded-2xl font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#1F6D5A' }}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

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