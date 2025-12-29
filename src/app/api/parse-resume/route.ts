import { NextResponse } from 'next/server'
import { callLLM } from '@/lib/ai/llm'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { storeMemory } from '@/lib/mentor/memory'

export async function POST(req: Request) {
  try {
    const { resumeText } = await req.json()

    if (!resumeText || typeof resumeText !== 'string') {
      return NextResponse.json({ error: 'Resume text is required' }, { status: 400 })
    }

    const prompt = `Parse the following resume text and extract structured information. Return a JSON object with these fields:\n- fullName: full name of the candidate\n- email: email address\n- phone: phone number\n- education: education summary (university, degree, field)\n- skills: array of technical skills\n- experience: professional experience summary\n\nResume Text:\n${resumeText}\n\nReturn ONLY valid JSON, no markdown or extra text.`

    const llm = await callLLM([
      { role: 'system', content: 'You are a strict JSON extractor. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ])

    if (llm.error) {
      return NextResponse.json({ error: 'LLM error', details: llm.error }, { status: 500 })
    }

    let parsed: any = {}
    try {
      // Try to extract JSON from content
      const content = llm.content.trim()
      const match = content.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match ? match[0] : content)
    } catch (err) {
      parsed = { extractedText: llm.content, parseError: 'Invalid JSON returned by model' }
    }

    // Try to persist parsed profile as a memory if the user is authenticated
    let stored = false
    try {
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const summary = `Resume parsed: name=${parsed.fullName ?? 'n/a'}, email=${parsed.email ?? 'n/a'}, skills=${Array.isArray(parsed.skills) ? parsed.skills.length : 0}`
        const mem = await storeMemory(
          user.id,
          summary,
          {
            type: 'user_profile',
            context: 'resume_parser',
            profile_data: parsed,
          },
          supabase
        )
        stored = !!mem
      }
    } catch (persistErr) {
      // Non-fatal: if we cannot store, just return parsed data
      console.warn('Resume parser: could not persist to Supabase:', persistErr)
    }

    return NextResponse.json({ ...parsed, stored })
  } catch (error) {
    console.error('Parse resume API error:', error)
    return NextResponse.json({ error: 'Failed to parse resume' }, { status: 500 })
  }
}
