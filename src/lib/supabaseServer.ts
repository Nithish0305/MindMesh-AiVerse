/**
 * Server-side Supabase client for API routes
 * 
 * This client is used in API routes where we need to access Supabase
 * with the user's session. It handles cookies properly for server-side requests.
 * 
 * FUTURE-PROOFING NOTES:
 * - Can be extended to support service role key for admin operations
 * - Cookie handling may need updates for different deployment environments
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for server-side use (API routes, server components)
 * This client respects the user's session from cookies
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key) => {
          return cookieStore.get(key)?.value ?? null
        },
        setItem: (key, value) => {
          try {
            cookieStore.set(key, value, { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
          } catch {
            // Ignore errors (e.g. when called from a Server Component where cookies are read-only)
          }
        },
        removeItem: (key) => {
          try {
            cookieStore.set(key, '', { path: '/', maxAge: 0 })
          } catch {
            // Ignore errors
          }
        },
      },
    },
  })
}

/**
 * Gets the current user from the server-side Supabase session
 * Returns null if not authenticated
 */
export async function getServerUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

