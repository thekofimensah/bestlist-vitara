import { useState, useEffect, useRef } from 'react';
import { supabase, getSessionOptimized } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [pendingSignInAchievement, setPendingSignInAchievement] = useState(null);
  const isMountedRef = useRef(true);
  
  // Achievement checking function - lazy loaded to avoid circular dependencies
  const getAchievementChecker = () => {
    try {
      // Only import when needed to avoid circular dependencies
      const { useAchievements } = require('./useAchievements');
      const achievementsHook = useAchievements();
      return achievementsHook.checkAchievements || (() => Promise.resolve([]));
    } catch (error) {
      // Silently fail if achievements aren't available
      console.log('🏆 [Auth] Achievement system not available:', error.message);
      return () => Promise.resolve([]);
    }
  };
  
  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clean up global function when component unmounts
      if (window.triggerPendingSignInAchievements) {
        delete window.triggerPendingSignInAchievements;
      }
    };
  }, []);
  
  // Function to trigger pending sign-in achievements (called by App.jsx when loading completes)
  const triggerPendingSignInAchievements = () => {
    if (!pendingSignInAchievement) return;
    
    console.log('🏆 [Auth] App fully loaded - triggering pending sign-in achievements');
    
          setTimeout(async () => {
        try {
          // Check if component is still mounted
          if (!isMountedRef.current || !user) return;
          
          const checkAchievements = getAchievementChecker();
          const achievements = await checkAchievements('sign_in', pendingSignInAchievement);
          
          if (achievements && achievements.length > 0) {
            console.log('🏆 [Auth] Sign-in achievements earned:', achievements);
          }
          
          // Only update state if still mounted
          if (isMountedRef.current) {
            setPendingSignInAchievement(null); // Clear the pending achievement
          }
        } catch (error) {
          console.error('🏆 [Auth] Error in delayed achievement check:', error.message);
        }
      }, 1000); // 1 second after app is fully loaded
  };
  
  // Expose the function for App.jsx to call
  useEffect(() => {
    window.triggerPendingSignInAchievements = triggerPendingSignInAchievements;
    
    return () => {
      // Clean up global function when component unmounts
      if (window.triggerPendingSignInAchievements === triggerPendingSignInAchievements) {
        delete window.triggerPendingSignInAchievements;
      }
    };
  }, [pendingSignInAchievement]);
  
  // Function to schedule sign-in achievements (will be triggered when app loads)
  const triggerSignInAchievements = async (user) => {
    try {
      console.log('🏆 [Auth] Scheduling sign-in achievements for user:', user.email);
      
      const context = {
        user_id: user.id,
        sign_in_time: new Date().toISOString(),
        email: user.email
      };
      
      // Store the context for later triggering when app is fully loaded
      setPendingSignInAchievement(context);
      console.log('🏆 [Auth] Sign-in achievements queued - will trigger after app loads');
      
    } catch (error) {
      console.error('🏆 [Auth] Error scheduling sign-in achievements:', error.message);
    }
  };

  useEffect(() => {
    // Optimized session restoration
    const initializeAuth = async () => {
      try {
        // Use fast session restoration
        const user = await getSessionOptimized();
        setUser(user);
        
        // Load profile in background without blocking
        if (user) {
          fetchUserProfile(user.id); // Don't await - load in background
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
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
          
          // 🏆 Check for sign-in achievements when user signs in
          if (event === 'SIGNED_IN') {
            triggerSignInAchievements(session.user);
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // User doesn't exist in profiles table yet
        console.log('Profile not found for user:', userId);
        setUserProfile(null);
      } else if (!error) {
        setUserProfile(data);
      } else {
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
      }
    } catch (err) {
      console.error('Error fetching user profile:', JSON.stringify({
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
    updateProfile
  };
};