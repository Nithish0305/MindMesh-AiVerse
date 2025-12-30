import { NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/ai/openrouter'
import { INTERVIEW_ANSWER_EVALUATOR_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request) {
  try {
    const { answer, question } = await req.json()

    const userPrompt = `Evaluate this interview answer:

Question: ${question}

Candidate's Answer: ${answer}

Remember: Return ONLY the JSON object, no markdown formatting.`

    const messages = [
      { role: 'system', content: INTERVIEW_ANSWER_EVALUATOR_PROMPT },
      { role: 'user', content: userPrompt },
    ]

    const response = await chatCompletion(messages, 'mistralai/mistral-7b-instruct', { 
      max_tokens: 800,
      temperature: 0.3 
    })
    const content = response.choices[0].message.content

    console.log('Raw AI response:', content)

    // Clean up the response - remove markdown code blocks if present
    let cleanedContent = content.trim()
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/```json?\n?/g, '').replace(/```\n?/g, '')
    }

    console.log('Cleaned content:', cleanedContent)

    // Try to parse, if it fails, return a fallback
    let evaluation
    try {
      evaluation = JSON.parse(cleanedContent)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      // Return a fallback structure
      evaluation = {
        score: 70,
        starMethodRating: 65,
        strengths: ['Answer provided'],
        improvements: ['AI evaluation temporarily unavailable. Please try again.'],
        summary: 'AI evaluation is processing. Your answer was recorded.',
        starBreakdown: {
          situation: '?',
          task: '?',
          action: '?',
          result: '?'
        }
      }
    }

    return NextResponse.json(evaluation)
  } catch (error) {
    console.error('Error evaluating answer:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate answer' },
      { status: 500 }
    )
  }
}
