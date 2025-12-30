/**
 * Career Pattern Analysis Library
 * 
 * Analyzes interview performance and job application outcomes
 * to identify patterns and generate recommendations.
 */

export interface InterviewRecord {
  score: number
  date: string
  role: string
  company?: string
  strengths?: string[]
  weaknesses?: string[]
}

export interface ApplicationRecord {
  company: string
  role: string
  status: 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected'
  outcome?: 'rejected' | 'pending' | 'offer'
  stage?: string
  date: string
  notes?: string
}

export interface UserCareerProfile {
  skills: string[]
  targetRoles: string[]
  experience: string
  currentRole?: string
}

export interface CareerAnalysis {
  summary: string
  patterns: string[]
  strengths: string[]
  weaknesses: string[]
  rootCauses: string[]
  recommendations: string[]
  actionPlan: {
    thisMonth: string[]
    nextMonth: string[]
  }
}

/**
 * Fetch career pattern analysis from AI
 */
export async function analyzeCareerPatterns(
  interviewHistory: InterviewRecord[],
  applicationHistory: ApplicationRecord[],
  userProfile: UserCareerProfile
): Promise<CareerAnalysis> {
  try {
    const response = await fetch('/api/career/analyze-patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interviewHistory,
        applicationHistory,
        userProfile,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to analyze patterns')
    }

    const data = await response.json()
    return data.analysis
  } catch (error) {
    console.error('Pattern analysis failed:', error)
    // Return a default analysis if AI fails
    return getDefaultAnalysis(interviewHistory, applicationHistory)
  }
}

/**
 * Get default analysis when AI fails
 */
function getDefaultAnalysis(
  interviewHistory: InterviewRecord[],
  applicationHistory: ApplicationRecord[]
): CareerAnalysis {
  const avgInterviewScore =
    interviewHistory.length > 0
      ? Math.round(
          interviewHistory.reduce((sum, r) => sum + r.score, 0) /
            interviewHistory.length
        )
      : 0

  const rejectionCount = applicationHistory.filter(
    (a) => a.outcome === 'rejected'
  ).length
  const rejectionRate =
    applicationHistory.length > 0
      ? Math.round((rejectionCount / applicationHistory.length) * 100)
      : 0

  return {
    summary: `You've completed ${interviewHistory.length} interviews with an average score of ${avgInterviewScore}/100. You have a ${rejectionRate}% rejection rate.`,
    patterns: [
      `Average interview score: ${avgInterviewScore}/100`,
      `Total applications: ${applicationHistory.length}`,
      `Rejections: ${rejectionCount}`,
    ],
    strengths: [
      'You are actively practicing interviews',
      'You are applying to jobs',
    ],
    weaknesses: [
      'Continue to monitor interview performance trends',
      'Focus on improving areas of consistent difficulty',
    ],
    rootCauses: [
      'Need more interview data to identify patterns',
      'Need more application data to identify trends',
    ],
    recommendations: [
      'Complete more mock interviews to gather data',
      'Track application outcomes for pattern analysis',
      'Focus on weaker interview areas',
    ],
    actionPlan: {
      thisMonth: [
        'Complete 5 more mock interviews',
        'Apply to 5-10 target roles',
        'Review and update your resume',
      ],
      nextMonth: [
        'Analyze patterns from interviews',
        'Focus practice on weak areas',
        'Continue steady application pace',
      ],
    },
  }
}

/**
 * Calculate simple statistics from interview history
 */
export function calculateInterviewStats(
  interviews: InterviewRecord[]
): {
  averageScore: number
  highestScore: number
  lowestScore: number
  totalInterviews: number
  trend: 'improving' | 'declining' | 'stable'
} {
  if (interviews.length === 0) {
    return {
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalInterviews: 0,
      trend: 'stable',
    }
  }

  const scores = interviews.map((i) => i.score)
  const averageScore = Math.round(scores.reduce((a, b) => a + b) / scores.length)
  const highestScore = Math.max(...scores)
  const lowestScore = Math.min(...scores)

  // Calculate trend from last 3 interviews
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  if (interviews.length >= 3) {
    const recent = scores.slice(-3)
    const recentAvg = recent.reduce((a, b) => a + b) / recent.length
    const older = scores.slice(0, -3)
    const olderAvg = older.reduce((a, b) => a + b) / older.length
    if (recentAvg > olderAvg + 5) trend = 'improving'
    else if (recentAvg < olderAvg - 5) trend = 'declining'
  }

  return {
    averageScore,
    highestScore,
    lowestScore,
    totalInterviews: interviews.length,
    trend,
  }
}

/**
 * Calculate application success metrics
 */
export function calculateApplicationStats(
  applications: ApplicationRecord[]
): {
  totalApplications: number
  acceptanceRate: number
  rejectionRate: number
  pendingRate: number
  averageTimeToReply: number
} {
  if (applications.length === 0) {
    return {
      totalApplications: 0,
      acceptanceRate: 0,
      rejectionRate: 0,
      pendingRate: 0,
      averageTimeToReply: 0,
    }
  }

  const accepted = applications.filter((a) => a.outcome === 'offer').length
  const rejected = applications.filter((a) => a.outcome === 'rejected').length
  const pending = applications.filter((a) => a.outcome === 'pending').length

  return {
    totalApplications: applications.length,
    acceptanceRate: Math.round((accepted / applications.length) * 100),
    rejectionRate: Math.round((rejected / applications.length) * 100),
    pendingRate: Math.round((pending / applications.length) * 100),
    averageTimeToReply: 7, // Placeholder - would calculate from dates
  }
}
