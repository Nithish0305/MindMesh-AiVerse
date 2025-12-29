/**
 * Onboarding Agent API Route
 * 
 * POST /api/onboarding/extract
 * 
 * Extracts structured profile data from raw onboarding inputs
 */

import { NextRequest, NextResponse } from 'next/server'
import { ONBOARDING_AGENT_PROMPT } from '@/lib/mentor/onboarding-prompt'
import { storeMemory } from '@/lib/mentor/memory'
import { callLLM } from '@/lib/ai/llm'
import { getServerUser, createServerSupabaseClient } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { education, experience, skills, goals, resumeText } = body

        // Validate input - require at least ONE field for incremental extraction
        if (!education && !experience && !skills && !goals && !resumeText) {
            return NextResponse.json(
                { error: 'Please provide at least one field (education, experience, skills, goals, or resume)' },
                { status: 400 }
            )
        }

        // Authentication
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
            console.log('Onboarding API: Authentication failed')
            return NextResponse.json(
                { error: 'Unauthorized - please sign in' },
                { status: 401 }
            )
        }

        console.log('Onboarding API: User authenticated:', user.email)
        const userId = user.id

        // Construct input for Onboarding Agent
        const userInput = `
EDUCATION:
${education}

WORK EXPERIENCE:
${experience}

SKILLS:
${skills}

CAREER GOALS:
${goals}

${resumeText ? `RESUME:\n${resumeText}` : ''}
`.trim()

        // Call Onboarding Agent
        console.log('Onboarding API: Calling Onboarding Agent...')
        const messages = [
            { role: 'system' as const, content: ONBOARDING_AGENT_PROMPT },
            { role: 'user' as const, content: userInput },
        ]

        const llmResponse = await callLLM(messages)

        if (llmResponse.error) {
            console.error('Onboarding API: LLM error:', llmResponse.error)
            return NextResponse.json(
                { error: 'Failed to extract profile', details: llmResponse.error },
                { status: 500 }
            )
        }

        // Parse JSON response
        let profileData
        try {
            const content = llmResponse.content.trim()
            console.log('Onboarding API: Raw LLM response length:', content.length)

            // Try multiple extraction strategies
            let jsonString = content

            // Strategy 1: Extract JSON from markdown code blocks
            const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
            if (codeBlockMatch) {
                jsonString = codeBlockMatch[1]
                console.log('Extracted from code block')
            }
            // Strategy 2: Find first { to last }
            else {
                const firstBrace = content.indexOf('{')
                const lastBrace = content.lastIndexOf('}')
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonString = content.substring(firstBrace, lastBrace + 1)
                    console.log('Extracted by brace matching')
                }
            }

            profileData = JSON.parse(jsonString)
            console.log('Onboarding API: Profile extracted successfully')
        } catch (parseError) {
            console.error('Onboarding API: JSON parse error:', parseError)
            console.error('Raw content:', llmResponse.content.substring(0, 500))

            return NextResponse.json({
                error: 'Failed to parse profile data',
                details: 'The AI returned invalid JSON. Please try again or simplify your inputs.',
                parseError: parseError instanceof Error ? parseError.message : 'Unknown'
            }, { status: 500 })
        }

        // Store profile as memory
        const profileSummary = `Profile Genesis: ${profileData.education?.length || 0} education entries, ${profileData.workExperience?.length || 0} work experiences, ${profileData.skills?.technical?.length || 0} technical skills. Overall Confidence: ${profileData.confidenceScore}%. ${profileData.conflicts?.length ? `Detected ${profileData.conflicts.length} potential conflicts.` : ''}`

        await storeMemory(userId, profileSummary, {
            type: 'user_profile',
            context: 'onboarding',
            profile_data: profileData,
            confidence_score: profileData.confidenceScore,
        }, supabaseClient)

        console.log('Onboarding API: Profile stored as memory')

        // Return profile data
        return NextResponse.json({
            profile: profileData,
            success: true,
        })

    } catch (error) {
        console.error('Onboarding API error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

export async function GET() {
    return NextResponse.json({
        error: 'Method not allowed. Use POST to submit onboarding data.'
    }, { status: 405 })
}
