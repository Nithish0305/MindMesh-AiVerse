
import { NextResponse } from 'next/server'
import { callLLM } from '@/lib/ai/llm'
import { MENTOR_SYSTEM_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request) {
    try {
        const { messages } = await req.json()

        // Ensure we're using the correct system prompt
        const contextMessages = [
            { role: 'system' as const, content: MENTOR_SYSTEM_PROMPT },
            ...messages
        ]


        const response = await callLLM("chat", contextMessages)

        if (response.error) {
            console.error('AI Error:', response.error)
            throw new Error(response.error)
        }

        // Return standard message format expected by frontend
        return NextResponse.json({
            role: 'assistant',
            content: response.content
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to fetch AI response' }, { status: 500 })
    }
}
