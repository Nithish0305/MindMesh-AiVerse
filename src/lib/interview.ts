/**
 * Interview Preparation Library
 * 
 * Handles:
 * - Interview question generation based on job role
 * - STAR method guidance
 * - Interview feedback and scoring
 * - Mock interview tracking
 */

export interface InterviewQuestion {
  id: string
  category: 'behavioral' | 'technical' | 'situational' | 'role_specific'
  question: string
  role: string
  company?: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface InterviewResponse {
  questionId: string
  userAnswer: string
  feedback?: string
  score?: number // 0-100
  strengths?: string[]
  improvements?: string[]
  timestamp: string
}

export interface MockInterview {
  id: string
  userId: string
  jobTitle: string
  company: string
  position: 'target' | 'practice' | 'scheduled'
  questions: InterviewQuestion[]
  responses: InterviewResponse[]
  overallScore?: number
  completedAt?: string
  createdAt: string
}

export interface InterviewFeedback {
  score: number
  strengths: string[]
  improvements: string[]
  starMethodRating: number // 0-100
  confidenceRating: number // 0-100
  recommendedFocus: string[]
  summary: string
}

/**
 * Generate interview questions based on job role and difficulty
 */
export function generateInterviewQuestions(
  jobTitle: string,
  company: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): InterviewQuestion[] {
  const baseQuestions = {
    behavioral: [
      { question: "Tell me about a time you had to work with a difficult team member. How did you handle it?", difficulty: 'easy' },
      { question: "Describe a situation where you had to learn something new quickly. What was it and how did you approach it?", difficulty: 'medium' },
      { question: "Tell me about a project where you took on a leadership role. What challenges did you face?", difficulty: 'hard' },
      { question: "Give an example of when you failed and what you learned from it.", difficulty: 'medium' },
      { question: "Describe a time you had to make a difficult decision with incomplete information.", difficulty: 'hard' },
    ],
    technical: [
      { question: "Walk me through your approach to solving a complex technical problem.", difficulty: 'medium' },
      { question: "How do you stay current with new technologies in your field?", difficulty: 'easy' },
      { question: "Describe the architecture of a recent project you built.", difficulty: 'hard' },
      { question: "How would you optimize a slow database query?", difficulty: 'hard' },
      { question: "Explain a technical concept from your field to a non-technical person.", difficulty: 'medium' },
    ],
    situational: [
      { question: `How would you prioritize if you had multiple urgent tasks from different stakeholders at ${company}?`, difficulty: 'medium' },
      { question: `What would you do if you disagreed with your manager's technical approach at ${company}?`, difficulty: 'hard' },
      { question: `How would you handle if a deadline was impossible to meet at ${company}?`, difficulty: 'medium' },
      { question: `Describe how you would onboard to a large ${jobTitle} role?`, difficulty: 'medium' },
      { question: `What would you do if you realized you made a critical mistake in production?`, difficulty: 'hard' },
    ],
    role_specific: [
      { question: `What aspects of a ${jobTitle} role excite you most?`, difficulty: 'easy' },
      { question: `How would you approach your first 30 days as a ${jobTitle} at ${company}?`, difficulty: 'medium' },
      { question: `What ${jobTitle} skills do you want to develop further?`, difficulty: 'medium' },
      { question: `How do you measure success in a ${jobTitle} role?`, difficulty: 'medium' },
      { question: `What do you know about ${company}'s tech stack and how does it align with your skills?`, difficulty: 'hard' },
    ],
  }

  const selected: InterviewQuestion[] = []
  const categories: Array<'behavioral' | 'technical' | 'situational' | 'role_specific'> = ['behavioral', 'technical', 'situational', 'role_specific']

  categories.forEach((category) => {
    const questions = baseQuestions[category as keyof typeof baseQuestions]
    const filtered = questions.filter((q) => q.difficulty === difficulty || difficulty === 'medium')
    const picked = filtered[Math.floor(Math.random() * filtered.length)]

    if (picked) {
      selected.push({
        id: `${category}-${Math.random().toString(36).substr(2, 9)}`,
        category: category as any,
        question: picked.question,
        role: jobTitle,
        company: company,
        difficulty: picked.difficulty as any,
      })
    }
  })

  return selected
}

/**
 * Generate AI-powered interview questions based on job role
 */
export async function generateAIInterviewQuestions(
  jobTitle: string,
  company: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  numQuestions: number = 4
): Promise<InterviewQuestion[]> {
  try {
    const response = await fetch('/api/interview/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTitle, company, difficulty, numQuestions }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate questions')
    }

    const data = await response.json()
    return data.questions.map((q: any, index: number) => ({
      id: `ai-${index}-${Math.random().toString(36).substr(2, 9)}`,
      category: q.category,
      question: q.question,
      role: jobTitle,
      company: company,
      difficulty: q.difficulty,
    }))
  } catch (error) {
    console.error('AI question generation failed, falling back to predefined questions:', error)
    // Fallback to predefined questions
    return generateInterviewQuestions(jobTitle, company, difficulty)
  }
}

/**
 * Evaluate an interview response using STAR method
 */
export function evaluateSTARMethod(
  answer: string
): { score: number; feedback: string; starBreakdown: Record<string, string> } {
  const text = answer.toLowerCase()

  const starElements = {
    situation: text.includes('situation') || text.includes('background') || text.includes('was working') || text.includes('team'),
    task: text.includes('task') || text.includes('responsible') || text.includes('my goal') || text.includes('needed to'),
    action: text.includes('did') || text.includes('implemented') || text.includes('built') || text.includes('created') || text.includes('performed'),
    result: text.includes('result') || text.includes('outcome') || text.includes('improved') || text.includes('learned') || text.includes('succeeded'),
  }

  const score = (Object.values(starElements).filter(Boolean).length / 4) * 100

  const feedback = `
STAR Method Analysis:
- Situation: ${starElements.situation ? '✓ Present' : '✗ Missing - Set the context'}
- Task: ${starElements.task ? '✓ Present' : '✗ Missing - Explain your responsibility'}
- Action: ${starElements.action ? '✓ Present' : '✗ Missing - Describe what you did'}
- Result: ${starElements.result ? '✓ Present' : '✗ Missing - Share the outcome & impact'}
  `.trim()

  return {
    score: Math.round(score),
    feedback,
    starBreakdown: {
      situation: starElements.situation ? '✓' : '✗',
      task: starElements.task ? '✓' : '✗',
      action: starElements.action ? '✓' : '✗',
      result: starElements.result ? '✓' : '✗',
    },
  }
}

/**
 * Score an interview response
 */
export function scoreInterviewResponse(answer: string, question: InterviewQuestion): InterviewFeedback {
  const starEval = evaluateSTARMethod(answer)

  // Basic scoring factors
  const answerLength = answer.split(' ').length
  const lengthScore = answerLength > 50 && answerLength < 300 ? 20 : answerLength > 20 ? 15 : 5

  const hasMetrics = /\d+%|\$\d+|increased|decreased|improved/.test(answer)
  const metricsScore = hasMetrics ? 20 : 10

  const hasConflict = /disagree|challenge|difficult|problem|overcome|failed/.test(answer)
  const conflictScore = hasConflict ? 20 : 10

  const baseScore = starEval.score + lengthScore + metricsScore + conflictScore

  return {
    score: Math.min(Math.round(baseScore / 3.7), 100),
    strengths: [
      starEval.score >= 75 ? 'Strong STAR method structure' : undefined,
      hasMetrics ? 'Used quantifiable results' : undefined,
      hasConflict ? 'Showed problem-solving ability' : undefined,
      answerLength > 80 ? 'Provided substantial detail' : undefined,
    ].filter(Boolean) as string[],
    improvements: [
      starEval.score < 75 ? 'Add more STAR structure' : undefined,
      !hasMetrics ? 'Include specific metrics or numbers' : undefined,
      answerLength < 50 ? 'Provide more specific examples' : undefined,
      question.difficulty === 'hard' && baseScore < 70 ? 'Dig deeper into complexity' : undefined,
    ].filter(Boolean) as string[],
    starMethodRating: starEval.score,
    confidenceRating: answerLength > 100 ? 75 : 50,
    recommendedFocus: [
      'Practice the STAR method framework',
      'Use specific metrics in answers',
      'Prepare real examples from experience',
      'Practice clear, concise communication',
    ],
    summary: `Your answer scored ${Math.min(Math.round(baseScore / 3.7), 100)}/100. ${starEval.score < 75 ? 'Focus on strengthening your STAR structure.' : 'Good response! Keep practicing to improve consistency.'}`,
  }
}

/**
 * AI-powered answer evaluation
 */
export async function evaluateAnswerWithAI(
  answer: string,
  question: InterviewQuestion
): Promise<InterviewFeedback> {
  try {
    const response = await fetch('/api/interview/evaluate-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer, question: question.question }),
    })

    if (!response.ok) {
      throw new Error('Failed to evaluate answer')
    }

    const data = await response.json()
    return {
      score: data.score,
      strengths: data.strengths,
      improvements: data.improvements,
      starMethodRating: data.starMethodRating,
      confidenceRating: data.starMethodRating, // Use same as STAR rating
      recommendedFocus: [
        'Practice the STAR method framework',
        'Use specific metrics in answers',
        'Prepare real examples from experience',
      ],
      summary: data.summary,
    }
  } catch (error) {
    console.error('AI evaluation failed, falling back to rule-based scoring:', error)
    // Fallback to rule-based scoring
    return scoreInterviewResponse(answer, question)
  }
}

/**
 * Calculate overall mock interview score
 */
export function calculateMockInterviewScore(responses: InterviewResponse[]): {
  overallScore: number
  categoryScores: Record<string, number>
  recommendations: string[]
} {
  const scores = responses.map((r) => r.score || 0).filter((s) => s > 0)

  if (scores.length === 0) {
    return {
      overallScore: 0,
      categoryScores: {},
      recommendations: ['Complete all interview questions to calculate score'],
    }
  }

  const overallScore = Math.round(scores.reduce((a, b) => a + b) / scores.length)

  return {
    overallScore,
    categoryScores: {},
    recommendations: [
      overallScore >= 80 ? 'Excellent! You\'re ready for interviews.' : undefined,
      overallScore >= 70 ? 'Good foundation. Practice a few more rounds.' : undefined,
      overallScore < 70 ? 'Keep practicing. Focus on STAR method and specific examples.' : undefined,
      'Record yourself answering and listen back for clarity and pace',
      'Practice with a friend or mentor for live feedback',
    ].filter(Boolean) as string[],
  }
}
