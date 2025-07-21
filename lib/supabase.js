import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase config check:');
console.log('  - URL exists:', !!supabaseUrl);
console.log('  - URL value:', supabaseUrl);
console.log('  - Key exists:', !!supabaseAnonKey);
console.log('  - Key preview:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log('✅ Supabase client created successfully');

// Auth helpers
export const signInWithEmail = async (email, password) => {
  console.log('📤 Supabase signIn request:', JSON.stringify({ email, hasPassword: !!password }));
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  console.log('📥 Supabase signIn FULL response:', JSON.stringify({ data, error }, null, 2));
  
  if (data) {
    console.log('✅ SignIn data details:');
    console.log('  - User:', data.user ? JSON.stringify({
      id: data.user.id,
      email: data.user.email,
      email_confirmed_at: data.user.email_confirmed_at
    }) : 'null');
    console.log('  - Session:', data.session ? 'EXISTS' : 'null');
  }
  
  if (error) {
    console.log('❌ SignIn error details:', JSON.stringify({
      message: error.message,
      status: error.status,
      code: error.code || error.error_code,
      name: error.name,
      details: error.details,
      hint: error.hint,
      full_error: error
    }, null, 2));
  }
  
  return { data, error };
};

export const signUpWithEmail = async (email, password, name) => {
  console.log('📤 Supabase signUp request:', JSON.stringify({ email, hasPassword: !!password, name }));
  
  // Test Supabase connection first
  try {
    const testConnection = await supabase.from('lists').select('count').limit(1);
    console.log('🔗 Supabase connection test:', testConnection.error ? 'FAILED' : 'SUCCESS');
  } catch (connError) {
    console.log('🔗 Supabase connection test: NETWORK ERROR', connError.message);
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name
      }
    }
  });
  
  console.log('📥 Supabase signUp FULL response:', JSON.stringify({ data, error }, null, 2));
  
  if (data) {
    console.log('✅ Data object details:');
    console.log('  - User:', data.user ? JSON.stringify({
      id: data.user.id,
      email: data.user.email,
      email_confirmed_at: data.user.email_confirmed_at,
      created_at: data.user.created_at
    }) : 'null');
    console.log('  - Session:', data.session ? 'EXISTS' : 'null');
  }
  
  if (error) {
    console.log('❌ Error details:', JSON.stringify({
      message: error.message,
      status: error.status,
      code: error.code || error.error_code,
      name: error.name,
      details: error.details,
      hint: error.hint,
      full_error: error
    }, null, 2));
  }
  
  return { data, error };
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