import { useState, useEffect } from 'react';
import { supabase, getSessionOptimized, createUserProfile, getOfflineSession, signInOffline } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  

  useEffect(() => {
    // Optimized session restoration with offline fallback
    const initializeAuth = async () => {
      try {
        // First try online session restoration
        const user = await getSessionOptimized();
        if (user) {
          setUser(user);
          setIsOffline(false);
          
          // Load profile in background without blocking
          fetchUserProfile(user.id); // Don't await - load in background
          return;
        }
        
        // If no online session, try offline authentication
        console.log('🔌 [useAuth] No online session, checking offline...');
        const offlineResult = await signInOffline();
        
        if (offlineResult.data?.user) {
          setUser(offlineResult.data.user);
          setIsOffline(offlineResult.data.isOffline || false);
          console.log('🔌 [useAuth] Using offline session for user:', offlineResult.data.user.id);
          
          // Try to load cached profile data
          // Note: Full profile sync will happen when network is restored
        } else {
          console.log('🔌 [useAuth] No offline session available');
          setUser(null);
          setIsOffline(false);
        }
        
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
        setIsOffline(false);
      } finally {
        // Stop loading immediately to prevent UI blocking
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Load profile in background without blocking auth state update
          fetchUserProfile(session.user.id);
          
          // If profile doesn't exist and this is a sign-in event, try to create it
          if (event === 'SIGNED_IN' && !userProfile) {
            console.log('User signed in but no profile found, checking if we can create one...');
            // This handles cases where users confirmed email later
            // We don't have their original username here, so we'll just wait for them to complete setup
          }
        } else {
          setUserProfile(null);
        }
        
        // Auth state changes should not affect loading state
        // setLoading(false); // Removed to prevent interference
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      console.log('🔍 [useAuth] Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // Profile not found - this shouldn't happen if signup worked correctly
        console.error('❌ [useAuth] Profile not found for user:', userId, '- this indicates signup failed to create profile');
        setUserProfile(null);
      } else if (!error) {
        console.log('✅ [useAuth] Profile found:', data);
        setUserProfile(data);
      } else {
        console.error('❌ [useAuth] Error fetching user profile:', error);
        setUserProfile(null);
      }
    } catch (err) {
      console.error('❌ [useAuth] Exception fetching user profile:', JSON.stringify({
        message: err.message,
        name: err.name,
        details: err.details,
        hint: err.hint,
        code: err.code,
        fullError: err
      }, null, 2));
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return { error: 'No user logged in' };
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (!error) {
        setUserProfile(data);
      }
      
      return { data, error };
    } catch (err) {
      return { error: err.message };
    }
  };

  return {
    user,
    userProfile,
    loading,
    isOffline,
    updateProfile,
    refetchProfile: () => user?.id ? fetchUserProfile(user.id) : null
  };
};