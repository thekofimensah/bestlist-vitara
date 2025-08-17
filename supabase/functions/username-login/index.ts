// Supabase Edge Function: username-login
// Signs in a user using username + password without exposing email to the client
// Response: { access_token, refresh_token }

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, password } = await req.json() as { username?: string; password?: string }
    const u = (username || '').trim().toLowerCase()
    const p = (password || '')

    if (!u || !p) {
      return new Response(JSON.stringify({ error: 'Missing username or password' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || serviceKey

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })

    // Resolve profile by username (public table), then look up auth user to get email
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, username')
      .eq('username', u)
      .maybeSingle()

    if (profileError || !profile?.id) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Get email via Admin API (avoids exposing via public RLS)
    const { data: userAdmin, error: adminErr } = await admin.auth.admin.getUserById(profile.id)
    const email = userAdmin?.user?.email || null
    if (adminErr || !email) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Perform password sign-in and return tokens
    const { data, error } = await anon.auth.signInWithPassword({ email, password: p })
    if (error || !data?.session?.access_token || !data?.session?.refresh_token) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const resBody = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    }
    return new Response(JSON.stringify(resBody), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})


