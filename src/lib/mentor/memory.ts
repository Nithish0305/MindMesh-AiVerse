/**
 * Memory Helper Functions for Core Mentor Agent
 * 
 * These functions handle reading and writing mentor-related memories to Supabase.
 * 
 * EXPECTED MEMORY TABLE SCHEMA (Phase 1):
 * Table name: 'memories' (plural) - falls back to 'memory' (singular) if needed
 * - id: uuid (primary key)
 * - user_id: uuid (foreign key to auth.users)
 * - content: text (the actual memory content)
 * - metadata: jsonb (optional, stores type, context, etc.)
 * - created_at: timestamp with time zone
 * 
 * FUTURE-PROOFING NOTES:
 * - Phase 3 will add reflection capabilities that will analyze these memories
 * - Metadata can store: type ('mentor_advice' | 'user_input' | 'reflection'), context, etc.
 * - The memory table should have RLS policies allowing users to read/write their own memories
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/lib/supabaseClient'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export interface Memory {
  id: string
  user_id: string
  content: string
  metadata?: {
    type?: 'mentor_advice' | 'user_input' | 'reflection' | 'trajectory' | 'user_profile'
    context?: string
    // Trajectory-specific fields (Phase 4)
    decision_context?: string
    trajectories_count?: number
    // Profile-specific fields (Phase 6)
    profile_data?: unknown
    confidence_score?: number
    [key: string]: unknown
  }
  created_at: string
}

/**
 * Phase 4: Trajectory data structure
 * Represents a simulated future career path
 */
export interface Trajectory {
  name: string
  assumptions: string[]
  shortTermOutcomes: string[]
  longTermOutcomes: string[]
  risks: string[]
  effortLevel: 'low' | 'medium' | 'high'
  confidence: 'low' | 'medium' | 'high'
}

/**
 * Fetches recent relevant memories for a user
 * Used to provide context to the mentor agent
 * 
 * @param userId - The user's ID
 * @param limit - Maximum number of memories to fetch (default: 8)
 * @param customClient - Optional Supabase client (authenticated) to use
 * @returns Array of recent memories
 */
export async function fetchRecentMemories(
  userId: string,
  limit: number = 8,
  customClient?: SupabaseClient
): Promise<Memory[]> {
  try {
    // Use custom client if provided, otherwise default to browser client
    // If strict server client is needed, it should be passed as customClient
    const client = customClient || defaultClient

    // Backward compatibility check: if the 3rd arg matches the old usage, handle it?
    // For now, we update the signature assuming manual passing of client in API routes.

    // Try 'memories' first (Phase 1 standard), fallback to 'memory' if needed
    let data, error
    const result = await client
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    data = result.data
    error = result.error

    // If 'memories' table doesn't exist, try 'memory' (singular)
    if (error && error.message?.includes('relation') && error.message?.includes('does not exist')) {
      const fallbackResult = await client
        .from('memory')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      data = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      console.error('Error fetching memories:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception fetching memories:', error)
    return []
  }
}

/**
 * Stores a new memory entry
 * Used to save mentor advice and user interactions
 * 
 * @param userId - The user's ID
 * @param content - The memory content (advice, input, etc.)
 * @param metadata - Optional metadata (type, context, etc.)
 * @param customClient - Optional Supabase client (authenticated) to use
 * @returns The created memory or null on error
 */
export async function storeMemory(
  userId: string,
  content: string,
  metadata?: Memory['metadata'],
  customClient?: SupabaseClient
): Promise<Memory | null> {
  try {
    const client = customClient || defaultClient

    // Try 'memories' first (Phase 1 standard), fallback to 'memory' if needed
    let result = await client
      .from('memories')
      .insert({
        user_id: userId,
        content,
        metadata: metadata || { type: 'mentor_advice' },
      })
      .select()
      .single()

    // If 'memories' table doesn't exist, try 'memory' (singular)
    if (result.error && result.error.message?.includes('relation') && result.error.message?.includes('does not exist')) {
      result = await client
        .from('memory')
        .insert({
          user_id: userId,
          content,
          metadata: metadata || { type: 'mentor_advice' },
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Error storing memory:', result.error)
      return null
    }

    return result.data
  } catch (error) {
    console.error('Exception storing memory:', error)
    return null
  }
}

/**
 * Formats memories for inclusion in LLM prompt
 * Converts memory array into a readable context string
 * 
 * @param memories - Array of memories to format
 * @returns Formatted string for prompt inclusion
 */
export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (memories.length === 0) {
    return 'No past memories available. This appears to be an early conversation.'
  }

  // Separate reflections from standard interactions
  const reflections = memories.filter(m => m.metadata?.type === 'reflection')
  const history = memories.filter(m => m.metadata?.type !== 'reflection')

  let formattedContext = ''

  // 1. Prioritize Reflections (Lessons Learned)
  if (reflections.length > 0) {
    const reflectionsText = reflections
      .map(m => `- [LESSON LEARNED]: ${m.content}`)
      .join('\n')
    formattedContext += `## PAST MISTAKES & LESSONS (CRITICAL)\n${reflectionsText}\n\n`
  }

  // 2. Standard Conversation History
  const historyText = history
    .reverse() // Show oldest first for chronological context
    .map((mem) => {
      const date = new Date(mem.created_at).toLocaleDateString()
      const type = mem.metadata?.type || 'unknown'
      const label = type === 'mentor_advice' ? 'Mentor' : 'User'
      return `[${date}] ${label}: ${mem.content}`
    })
    .join('\n')

  formattedContext += `## RECENT CONVERSATION HISTORY\n${historyText}`

  return formattedContext
}

