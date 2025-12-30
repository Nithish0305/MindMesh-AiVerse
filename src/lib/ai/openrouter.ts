
import OpenAI from 'openai'

const openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'https://mindmesh.app', // Required by OpenRouter
        'X-Title': 'MindMesh', // Required by OpenRouter
    },
    dangerouslyAllowBrowser: true // Only if needed client side, but we are using it server side mainly
})

export async function chatCompletion(messages: any[], model: string = 'mistralai/mistral-7b-instruct', options: any = {}) {
    // If no key is present, return mock response to prevent crash in demo
    if (!process.env.OPENROUTER_API_KEY) {
        return {
            choices: [
                {
                    message: {
                        content: "[Mock AI Response] I am ready to help you with your career planning. (Add OpenAI Key to .env.local to enable real AI)",
                        role: 'assistant'
                    }
                }
            ]
        }
    }

    return await openrouter.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
        ...options,
    })
}
