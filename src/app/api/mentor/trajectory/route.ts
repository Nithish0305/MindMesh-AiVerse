/**
 * Phase 4: Trajectory Agent API Route
 * 
 * POST /api/mentor/trajectory
 * 
 * Simulates multiple future career paths, compares outcomes, and explains trade-offs.
 * Uses existing mentor advice + reflection memory for context-aware simulation.
 * 
 * FUTURE-PROOFING NOTES:
 * - Phase 5 could add confidence scoring based on historical accuracy
 * - Phase 6 could enable multi-step simulation (trajectory chains)
 * - This enables the system to "reason about futures, not just react"
 */

import { NextRequest, NextResponse } from 'next/server'
import { TRAJECTORY_SYSTEM_PROMPT } from '@/lib/mentor/prompts'
import {
    fetchRecentMemories,
    storeMemory,
    formatMemoriesForPrompt,
    Trajectory,
} from '@/lib/mentor/memory'
import { callLLM } from '@/lib/ai/llm'
import { getServerUser, createServerSupabaseClient } from '@/lib/supabaseServer'
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

        // Authentication (same pattern as mentor/respond)
        let user = null
        let supabaseClient = null

        const authHeader = req.headers.get('Authorization')
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
                global: { headers: { Authorization: `Bearer ${token}` } }
            })
            const { data: { user: headerUser } } = await supabaseClient.auth.getUser()
            user = headerUser
        }

        if (!user) {
            supabaseClient = await getServerUser().then(() => createServerSupabaseClient())
            const { data: { user: methodUser } } = await supabaseClient.auth.getUser()
            user = methodUser
        }

        if (!user || !supabaseClient) {
            console.log('Trajectory API: Authentication failed')
            return NextResponse.json(
                { error: 'Unauthorized - please sign in' },
                { status: 401 }
            )
        }

        console.log('Trajectory API: User authenticated:', user.email)
        const userId = user.id

        // Step 1: Fetch recent memories for context
        // Fetch more memories to get better pattern matching
        const memories = await fetchRecentMemories(userId, 12, supabaseClient)
        const memoryContext = formatMemoriesForPrompt(memories)

        console.log('Trajectory API: Fetched', memories.length, 'memories for context')

        // Step 2: Construct trajectory simulation prompt
        const messages = [
            {
                role: 'system' as const,
                content: `${TRAJECTORY_SYSTEM_PROMPT}\n\n## CONTEXT FROM PAST INTERACTIONS\n${memoryContext}`,
            },
            {
                role: 'user' as const,
                content: `Decision/Question: ${message}\n\nPlease generate 2-3 trajectory options based on the context above.`,
            },
        ]

        // Step 3: Call LLM to generate trajectories
        console.log('Trajectory API: Calling LLM for trajectory simulation')
        const llmResponse = await callLLM(messages)

        if (llmResponse.error) {
            console.error('Trajectory API: LLM error:', llmResponse.error)
            return NextResponse.json(
                { error: 'Failed to generate trajectories', details: llmResponse.error },
                { status: 500 }
            )
        }

        // Step 4: Parse trajectory JSON
        let trajectories: Trajectory[] = []
        try {
            // Extract JSON from response (LLM might wrap it in markdown)
            const content = llmResponse.content
            const jsonMatch = content.match(/\[[\s\S]*\]/)

            if (jsonMatch) {
                trajectories = JSON.parse(jsonMatch[0])
            } else {
                // Fallback: try parsing entire content
                trajectories = JSON.parse(content)
            }

            console.log('Trajectory API: Successfully parsed', trajectories.length, 'trajectories')
        } catch (parseError) {
            console.error('Trajectory API: Failed to parse JSON:', parseError)
            // Return raw text if JSON parsing fails
            return NextResponse.json({
                trajectories: [],
                rawResponse: llmResponse.content,
                error: 'Failed to parse trajectory JSON, returning raw response'
            })
        }

        // Step 5: Store trajectory analysis as memory
        // This enables future reflection on "paths suggested vs paths taken"
        const trajectorySummary = trajectories.map(t => t.name).join(', ')
        await storeMemory(userId, `Trajectory Analysis: ${trajectorySummary}`, {
            type: 'trajectory',
            decision_context: message,
            trajectories_count: trajectories.length,
            context: 'trajectory_simulation',
        }, supabaseClient)

        console.log('Trajectory API: Stored trajectory memory')

        // Step 6: Return trajectories
        return NextResponse.json({
            trajectories,
            decisionContext: message,
            success: true,
        })

    } catch (error) {
        console.error('Trajectory API error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

// Handle GET requests
export async function GET(req: NextRequest) {
    return NextResponse.json({
        error: 'Method not allowed. Use POST to request trajectory simulation.'
    }, { status: 405 })
}
