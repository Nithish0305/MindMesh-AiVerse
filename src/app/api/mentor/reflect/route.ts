import { NextRequest, NextResponse } from 'next/server'
import { REFLECTION_SYSTEM_PROMPT } from '@/lib/mentor/prompts'
import {
    storeMemory,
} from '@/lib/mentor/memory'
import { callLLM } from '@/lib/ai/llm'
import { getServerUser, createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { message, previousAdvice } = body

        if (!message || !previousAdvice) {
            return NextResponse.json(
                { error: 'Message and previousAdvice are required' },
                { status: 400 }
            )
        }

        // Auth (same as respond route)
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Call Reflection Agent
        const messages = [
            {
                role: 'system' as const,
                content: REFLECTION_SYSTEM_PROMPT,
            },
            {
                role: 'user' as const,
                content: `ADVICE GIVEN:\n${previousAdvice}\n\nUSER FEEDBACK:\n${message}`,
            },
        ]

        console.log('Running Reflection Agent...')
        const llmResponse = await callLLM(messages)

        if (llmResponse.error) {
            console.error('Reflection failed:', llmResponse.error)
            // Fallback: Store raw feedback if AI reflection fails
            const lesson = `User reported dissatisfaction: ${message}`
            await storeMemory(user.id, lesson, { type: 'reflection', outcome: 'failure' }, supabaseClient)
            return NextResponse.json({ success: true, reflection: lesson })
        }

        const lesson = llmResponse.content

        // Store Reflection Memory
        await storeMemory(user.id, lesson, {
            type: 'reflection',
            outcome: 'failure', // This is triggered by negative feedback
            source_feedback: message,
        }, supabaseClient)

        console.log('Reflection stored:', lesson)

        return NextResponse.json({
            success: true,
            reflection: lesson,
        })

    } catch (error) {
        console.error('Reflection API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
