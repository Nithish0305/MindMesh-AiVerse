/**
 * LLM Integration for Core Mentor Agent
 * 
 * This module provides a simple interface to call LLM APIs.
 * Currently supports OpenAI-compatible APIs (including OpenRouter).
 * 
 * FUTURE-PROOFING NOTES:
 * - Can be extended to support multiple providers
 * - Error handling can be enhanced with retry logic
 * - Streaming support can be added in future phases
 */

interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LLMResponse {
  content: string
  error?: string
}

/**
 * Calls an LLM API to generate a response
 * 
 * Supports:
 * - OpenAI API (if OPENAI_API_KEY is set)
 * - OpenRouter API (if OPENROUTER_API_KEY is set)
 * 
 * Falls back to a mock response if no API key is configured
 * 
 * @param messages - Array of messages in conversation format
 * @param model - Model identifier (default: gpt-3.5-turbo or openrouter default)
 * @returns LLM response content
 */
export async function callLLM(
  messages: LLMMessage[],
  model?: string
): Promise<LLMResponse> {
  // Check for keys
  const groqKey = process.env.GROQ_API_KEY
  const openRouterKey = process.env.OPENROUTER_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  // If no API keys, return mock response
  if (!groqKey && !openRouterKey && !openaiKey) {
    return {
      content:
        '[Mock Response] I understand you need career guidance. To enable real AI responses, please add GROQ_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY to your .env.local file.',
    }
  }

  try {
    // Prefer Groq (fastest/cheapest usually)
    if (groqKey) {
      return await callGroq(messages, groqKey, model)
    }

    // Then OpenRouter
    if (openRouterKey) {
      return await callOpenRouter(messages, openRouterKey, model)
    }

    // Fall back to OpenAI
    if (openaiKey) {
      return await callOpenAI(messages, openaiKey, model)
    }
  } catch (error) {
    console.error('LLM API error:', error)
    return {
      content: 'I encountered an error processing your request. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  return {
    content: 'LLM service is not configured. Please add an API key.',
  }
}

/**
 * Calls Groq API with retry logic for rate limits
 */
async function callGroq(
  messages: LLMMessage[],
  apiKey: string,
  model?: string
): Promise<LLMResponse> {
  const maxRetries = 3

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          // Use Llama 3.1 8B Instant by default as it is fast and capable
          model: model || 'llama-3.1-8b-instant',
          messages,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()

        // Check if it's a rate limit error
        if (response.status === 429 && attempt < maxRetries) {
          console.log(`Rate limit hit, retrying in ${2 ** attempt}s...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** attempt)))
          continue
        }

        throw new Error(`Groq API error: ${errorText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('No content in Groq response')
      }

      return { content }
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
    }
  }

  throw new Error('Max retries exceeded')
}

/**
 * Calls OpenRouter API
 */
async function callOpenRouter(
  messages: LLMMessage[],
  apiKey: string,
  model?: string
): Promise<LLMResponse> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://mindmesh.app',
      'X-Title': 'MindMesh',
    },
    body: JSON.stringify({
      model: model || 'google/gemini-2.0-flash-exp:free',
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${error}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content in OpenRouter response')
  }

  return { content }
}

/**
 * Calls OpenAI API
 */
async function callOpenAI(
  messages: LLMMessage[],
  apiKey: string,
  model?: string
): Promise<LLMResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-3.5-turbo',
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content in OpenAI response')
  }

  return { content }
}

