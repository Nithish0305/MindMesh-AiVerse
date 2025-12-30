import { NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/ai/openrouter'
import { INTERVIEW_QUESTION_GENERATOR_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request) {
  try {
    const { jobTitle, company, difficulty, numQuestions = 4 } = await req.json()

    const userPrompt = `Generate exactly ${numQuestions} interview questions for:
Job Title: ${jobTitle}
Company: ${company}
Difficulty Level: ${difficulty}

Important: Generate EXACTLY ${numQuestions} questions with a good mix of categories (behavioral, technical, situational, role-specific).
Remember: Return ONLY the JSON array, no markdown formatting.`

    const messages = [
      { role: 'system', content: INTERVIEW_QUESTION_GENERATOR_PROMPT },
      { role: 'user', content: userPrompt },
    ]

    const response = await chatCompletion(messages)
    const content = response.choices[0].message.content

    // Clean up the response - remove markdown code blocks if present
    let cleanedContent = content.trim()
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/```json?\n?/g, '').replace(/```\n?/g, '')
    }

    const questions = JSON.parse(cleanedContent)

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error generating interview questions:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}
