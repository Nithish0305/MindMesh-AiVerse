
import { NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/ai/openrouter'
import { MENTOR_SYSTEM_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request) {
    try {
        const { messages } = await req.json()

        const contextMessages = [
            { role: 'system', content: MENTOR_SYSTEM_PROMPT },
            ...messages
        ]

        const response = await chatCompletion(contextMessages)
        // Handle both mock structure and real openai structure
        const message = response.choices[0].message

        return NextResponse.json(message)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to fetch AI response' }, { status: 500 })
    }
}
