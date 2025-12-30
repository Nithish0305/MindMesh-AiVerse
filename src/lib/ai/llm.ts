/**
 * Groq-only LLM integration
 * Safe against deprecations
 */

export type LLMTask = "chat" | "planning" | "simulation"

interface LLMMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface LLMResponse {
  content: string
  error?: string
}

export async function callLLM(
  task: LLMTask,
  messages: LLMMessage[]
): Promise<LLMResponse> {
  return callGroq(task, messages)
}

async function callGroq(
  task: LLMTask,
  messages: LLMMessage[]
): Promise<LLMResponse> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return {
      content: "",
      error: "Missing GROQ_API_KEY",
    }
  }

  let model = process.env.CHAT_MODEL || "llama-3.1-8b-instant"

  if (task === "planning") {
    model = process.env.PLANNING_MODEL || "llama-3.1-70b-versatile"
  } else if (task === "simulation") {
    model = process.env.SIMULATOR_MODEL || "llama-3.1-70b-versatile"
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Groq API error (${response.status}): ${errorText}`
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error("Empty Groq response")
    }

    return { content }
  } catch (error) {
    console.error("Groq error:", error)
    return {
      content: "",
      error:
        error instanceof Error
          ? error.message
          : "Unknown Groq error",
    }
  }
}
