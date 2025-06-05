import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, LogOut, Shield, FileText, User } from 'lucide-react';
import { signOut } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const ProfileView = ({ onBack }) => {
  const { user, userProfile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || '');
  const [country, setCountry] = useState(userProfile?.country || '');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-pink-50 to-blue-100">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <motion.div 
          className="bg-gradient-to-r from-pink-400 via-orange-400 to-yellow-400 p-6 pb-8"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <motion.button
              onClick={onBack}
              className="p-2 bg-white/20 rounded-full"
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="text-white" size={20} />
            </motion.button>
            <h1 className="text-xl font-bold text-white">Profile</h1>
            <div className="w-10"></div>
          </div>

          {/* Profile Picture */}
          <div className="text-center">
            <motion.div 
              className="relative inline-block mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="text-white" size={40} />
                )}
              </div>
              <motion.button 
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"
                whileTap={{ scale: 0.9 }}
              >
                <Camera className="text-gray-600" size={16} />
              </motion.button>
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-1">
              {userProfile?.name || 'User'}
            </h2>
            <p className="text-white/80 text-sm">{user?.email}</p>
          </div>
        </motion.div>

        {/* Profile Form */}
        <div className="p-6">
          <motion.div
            className="space-y-6"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Personal Information */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Personal Information</h3>
                <motion.button
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-pink-400 to-orange-400 text-white rounded-xl font-medium text-sm"
                  whileTap={{ scale: 0.95 }}
                >
                  {loading ? 'Saving...' : (isEditing ? 'Save' : 'Edit')}
                </motion.button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-60"
                    placeholder="Enter your name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-60"
                    placeholder="Enter your country"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Account</h3>
              <div className="space-y-3">
                <motion.button
                  className="w-full flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <Shield className="text-gray-600 mr-3" size={20} />
                  <span className="text-gray-800 font-medium">Privacy Policy</span>
                </motion.button>
                
                <motion.button
                  className="w-full flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <FileText className="text-gray-600 mr-3" size={20} />
                  <span className="text-gray-800 font-medium">Terms of Service</span>
                </motion.button>
                
                <motion.button
                  onClick={handleSignOut}
                  className="w-full flex items-center p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <LogOut className="text-red-600 mr-3" size={20} />
                  <span className="text-red-600 font-medium">Sign Out</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;