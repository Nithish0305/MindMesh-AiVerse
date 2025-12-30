import { NextResponse } from 'next/server'
import { callLLM } from '@/lib/ai/llm'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { resumeText } = await req.json()

    if (typeof resumeText !== 'string' || resumeText.trim().length < 10) {
      return NextResponse.json({ error: 'Valid resume text is required' }, { status: 400 })
    }
    console.log('API received resume text length:', resumeText.length)
    console.log('API received resume text preview:', resumeText.substring(0, 100))

    const prompt = `Parse the following resume text and extract structured information. Return a JSON object with these fields:
- fullName: full name of the candidate
- email: email address
- phone: phone number
- education: education summary (university, degree, field)
- skills: array of technical skills
- experience: professional experience summary

Resume Text:
${resumeText}

Return ONLY valid JSON, no markdown or extra text.`


    const response = await callLLM(
      "planning",
      [
        { role: 'user', content: prompt }
      ]
    )

    if (response.error) {
      throw new Error(response.error)
    }

    let parsedData: any = {}

    const contentStr = response.content || ''
    console.log('AI response content length:', contentStr.length)
    console.log('AI response preview:', contentStr.substring(0, 100))

    if (!contentStr) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 422 })
    }

    try {
      // Try to extract JSON from the response
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: try to parse the entire content
        parsedData = JSON.parse(contentStr)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      // Return whatever we can extract
      parsedData = {
        extractedText: contentStr,
        parseError: 'Could not parse AI response as JSON'
      }
    }

    // Attempt to persist for authenticated users
    let stored = false
    try {
      const supabase = await createServerSupabase()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('Auth check:', { hasUser: !!user, userError })
      if (user) {
        const { error: insertError } = await supabase
          .from('resumes')
          .insert({
            user_id: user.id,
            data: parsedData,
            raw_text: resumeText
          })
        console.log('Insert result:', { insertError })
        if (!insertError) stored = true
      }
    } catch (e) {
      // swallow persist errors; return parsing result regardless
      console.warn('Resume persist warning:', e)
    }

    return NextResponse.json({ ...parsedData, stored })
  } catch (error) {
    console.error('Resume parsing error:', error)
    return NextResponse.json(
      { error: 'Failed to parse resume' },
      { status: 500 }
    )
  }
}
