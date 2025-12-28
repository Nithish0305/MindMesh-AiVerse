/**
 * Core Mentor Agent API Route
 * 
 * POST /api/mentor/respond
 * 
 * Accepts user input, fetches relevant memories, generates adaptive career advice,
 * and stores the mentor's response as memory.
 * 
 * FUTURE-PROOFING NOTES:
 * - Phase 3 will add reflection capabilities that analyze conversation patterns
 * - Error handling can be enhanced with retry logic
 * - Rate limiting can be added for production
 */

import { NextRequest, NextResponse } from 'next/server'
import { CORE_MENTOR_SYSTEM_PROMPT } from '@/lib/mentor/prompts'
import {
  fetchRecentMemories,
  storeMemory,
  formatMemoriesForPrompt,
} from '@/lib/mentor/memory'
import { callLLM } from '@/lib/ai/llm'
import { getServerUser, createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabaseClient'

import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message } = body

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    // Get user from session (try Authorization header first, then cookie-based server session)
    let user = null
    let supabaseClient = null

    const authHeader = req.headers.get('Authorization')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      // Create a client with the user's token for RLS
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      })
      const { data: { user: headerUser } } = await supabaseClient.auth.getUser()
      user = headerUser
    }

    if (!user) {
      // Fallback to cookie-based session
      supabaseClient = await getServerUser().then(() => createServerSupabaseClient())
      const { data: { user: methodUser } } = await supabaseClient.auth.getUser()
      user = methodUser
    }

    if (!user || !supabaseClient) {
      console.log('Authentication failed: No user found')
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }
    console.log('User authenticated:', user.email)

    const userId = user.id

    // Step 1: Fetch recent relevant memories 
    const memories = await fetchRecentMemories(userId, 8, supabaseClient)
    const memoryContext = formatMemoriesForPrompt(memories)

    console.log('===== MEMORY CONTEXT =====')
    console.log(memoryContext.substring(0, 500))
    console.log('===== END CONTEXT =====')

    // Step 2: Store user input as memory
    await storeMemory(userId, message, {
      type: 'user_input',
      context: 'mentor_conversation',
    }, supabaseClient)

    // Step 3: Construct prompt with system prompt, memory context, and user input
    const messages = [
      {
        role: 'system' as const,
        content: `${CORE_MENTOR_SYSTEM_PROMPT}\n\n${memoryContext}`,
      },
      {
        role: 'user' as const,
        content: message,
      },
    ]

    // Step 4: Call LLM to generate mentor response
    const llmResponse = await callLLM(messages)
    console.log('LLM Response:', llmResponse)

    if (llmResponse.error) {
      return NextResponse.json(
        { error: 'Failed to generate mentor response', details: llmResponse.error },
        { status: 500 }
      )
    }

    let mentorResponse = llmResponse.content

    // Step 4.5: POST-PROCESS VALIDATION - Enforce lessons if present
    const reflections = memories.filter(m => m.metadata?.type === 'reflection')
    if (reflections.length > 0) {
      console.log('Validating response against', reflections.length, 'lessons')

      // Check if response acknowledges the lesson
      const hasAcknowledgment = mentorResponse.includes('📌') ||
        mentorResponse.toLowerCase().includes('past feedback') ||
        mentorResponse.toLowerCase().includes('learning from')

      if (!hasAcknowledgment) {
        console.log('Response missing lesson acknowledgment - prepending')
        const latestLesson = reflections[0].content
        mentorResponse = `📌 Learning from past feedback: ${latestLesson.substring(0, 100)}...\n\nHere's my adapted approach:\n\n${mentorResponse}`
      }

      // Check for length constraints in LATEST reflection only
      // (Reflections are ordered by created_at DESC, so [0] is most recent)
      const latestReflection = reflections[0]
      const reflectionLower = latestReflection.content.toLowerCase()

      const needsConcise = reflectionLower.includes('concise') ||
        reflectionLower.includes('shorter') ||
        reflectionLower.includes('brief')

      const needsDetailed = reflectionLower.includes('long') ||
        reflectionLower.includes('detailed') ||
        reflectionLower.includes('comprehensive') ||
        reflectionLower.includes('more information') ||
        reflectionLower.includes('more detail')

      // Only enforce truncation if concise is requested AND detailed is NOT requested
      if (needsConcise && !needsDetailed) {
        const wordCount = mentorResponse.split(/\s+/).length
        const maxWords = 150

        if (wordCount > maxWords) {
          console.log(`Response too long (${wordCount} words), truncating to ${maxWords}`)
          const words = mentorResponse.split(/\s+/)
          mentorResponse = words.slice(0, maxWords).join(' ') + '...\n\n[Response shortened based on your feedback for brevity]'
        }
      } else if (needsDetailed) {
        console.log('Detailed response requested - no length limit applied')
      }
    }

    // Step 5: Store mentor advice as memory
    await storeMemory(userId, mentorResponse, {
      type: 'mentor_advice',
      context: 'mentor_conversation',
      user_input: message, // Store the user input that triggered this advice
    }, supabaseClient)

    // Step 6: Return mentor response
    return NextResponse.json({
      response: mentorResponse,
      success: true,
    })
  } catch (error) {
    console.error('Mentor API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/mentor', req.url))
}

