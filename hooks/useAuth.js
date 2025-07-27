import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
          
          // If profile doesn't exist and this is a sign-in event, try to create it
          if (event === 'SIGNED_IN' && !userProfile) {
            console.log('User signed in but no profile found, checking if we can create one...');
            // This handles cases where users confirmed email later
            // We don't have their original username here, so we'll just wait for them to complete setup
          }
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
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
      console.error('Error fetching user profile:', err);
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