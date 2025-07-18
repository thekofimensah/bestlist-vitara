import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('=== SUPABASE CLIENT INITIALIZATION ===');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);
console.log('Key first 20 chars:', supabaseAnonKey?.substring(0, 20));

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ MISSING SUPABASE CREDENTIALS!');
  console.error('URL:', supabaseUrl);
  console.error('Key:', supabaseAnonKey);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log('✅ Supabase client created:', supabase);

// Auth helpers
export const signInWithEmail = async (email, password) => {
  console.log('🔑 STARTING SIGN IN');
  console.log('Email:', email);
  console.log('Password length:', password.length);
  console.log('Supabase client exists:', !!supabase);
  
  try {
    console.log('📤 Making sign in request to Supabase...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    console.log('📥 Sign in response received:');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', JSON.stringify(error, null, 2));
    
    if (error) {
      console.log('Error details:');
      console.log('- Message:', error.message);
      console.log('- Status:', error.status);
      console.log('- Code:', error.code || error.error_code);
    }
    
    return { data, error };
  } catch (networkError) {
    console.error('💥 SIGN IN NETWORK ERROR:', networkError);
    return { data: null, error: networkError };
  }
};

export const signUpWithEmail = async (email, password, name) => {
  console.log('🚀 STARTING SIGN UP');
  console.log('Email:', email);
  console.log('Password length:', password.length);
  console.log('Name:', name);
  console.log('Supabase client exists:', !!supabase);
  console.log('Supabase auth exists:', !!supabase.auth);
  
  try {
    console.log('📤 Making request to Supabase...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    });
    
    console.log('📥 Supabase response received:');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', JSON.stringify(error, null, 2));
    
    if (error) {
      console.log('Error details:');
      console.log('- Message:', error.message);
      console.log('- Status:', error.status);
      console.log('- Code:', error.code || error.error_code);
    }
    
    return { data, error };
  } catch (networkError) {
    console.error('💥 NETWORK ERROR:', networkError);
    return { data: null, error: networkError };
  }
};

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  return { data, error };
};

export const signInWithFacebook = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: window.location.origin
    }
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Database helpers
export const getUserLists = async (userId) => {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const getListItems = async (listId) => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const createList = async (userId, name, color) => {
  const { data, error } = await supabase
    .from('lists')
    .insert([{ user_id: userId, name, color }])
    .select()
    .single();
  return { data, error };
};

export const addItemToList = async (listId, item) => {
  const { data, error } = await supabase
    .from('items')
    .insert([{ list_id: listId, ...item }])
    .select()
    .single();
  return { data, error };
};

export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

export const uploadPhotoWithOwner = async (filePath, file) => {
  const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : supabase.auth.user();
  if (!user) throw new Error('User not authenticated');
  const { data, error } = await supabase.storage.from('photos').upload(filePath, file, {
    upsert: false,
    metadata: { owner: user.id }
  });
  return { data, error };
};

export const deleteItemFromList = async (itemId) => {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId);
  return { error };
};