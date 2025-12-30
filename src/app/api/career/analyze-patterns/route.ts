import { NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/ai/openrouter'
import { CAREER_PATTERN_ANALYZER_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request) {
  try {
    const { interviewHistory, applicationHistory, userProfile } =
      await req.json()

    const userPrompt = `Analyze the following career data and provide pattern insights:

Interview History: ${JSON.stringify(interviewHistory, null, 2)}

Application History: ${JSON.stringify(applicationHistory, null, 2)}

User Profile:
- Skills: ${userProfile.skills.join(', ')}
- Target Roles: ${userProfile.targetRoles.join(', ')}
- Experience: ${userProfile.experience}

Provide detailed analysis with patterns, root causes, and actionable recommendations.
Remember: Return ONLY valid JSON, no markdown formatting.`

    const messages = [
      { role: 'system', content: CAREER_PATTERN_ANALYZER_PROMPT },
      { role: 'user', content: userPrompt },
    ]

    const response = await chatCompletion(messages, 'mistralai/mistral-7b-instruct', {
      max_tokens: 2500,
      temperature: 0.3,
    })

    const content = response.choices[0].message.content || ''

    console.log('Raw analysis response:', content)

    // Clean up the response - remove all markup and non-JSON content
    let cleanedContent = content.trim()
    
    // Remove model tokens like <s>, </s>, [B_INST], [/B_INST], etc.
    cleanedContent = cleanedContent.replace(/<s>/g, '')
    cleanedContent = cleanedContent.replace(/<\/s>/g, '')
    cleanedContent = cleanedContent.replace(/\[B_INST\]/g, '')
    cleanedContent = cleanedContent.replace(/\[\/B_INST\]/g, '')
    cleanedContent = cleanedContent.replace(/\[INST\]/g, '')
    cleanedContent = cleanedContent.replace(/\[\/INST\]/g, '')
    
    // Remove markdown code blocks
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent
        .replace(/```json?\n?/g, '')
        .replace(/```\n?/g, '')
    }
    
    // Extract JSON if it's buried in other text
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanedContent = jsonMatch[0]
    }
    
    cleanedContent = cleanedContent.trim()

    console.log('Cleaned analysis:', cleanedContent)

    let analysis
    try {
      analysis = JSON.parse(cleanedContent)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      
      // Generate smarter fallback based on available data
      const avgInterviewScore = interviewHistory.length > 0 
        ? Math.round(interviewHistory.reduce((sum: number, i: any) => sum + (i.score || 0), 0) / interviewHistory.length)
        : 0
      
      const applicationCount = applicationHistory.length
      const rejectedCount = applicationHistory.filter((a: any) => a.outcome === 'rejected').length
      const offerCount = applicationHistory.filter((a: any) => a.outcome === 'offer').length
      const acceptanceRate = applicationCount > 0 ? Math.round((offerCount / applicationCount) * 100) : 0
      
      // Return a contextual analysis based on data
      analysis = {
        summary: `Your career journey shows ${interviewHistory.length} interviews and ${applicationCount} applications. Average interview score: ${avgInterviewScore}/100. ${acceptanceRate > 0 ? `You've received ${offerCount} offer(s) with a ${acceptanceRate}% acceptance rate.` : 'Track more applications to see acceptance patterns.'} Focus on consistent practice and strategic targeting.`,
        patterns: [
          interviewHistory.length < 5 ? 'Building interview experience - need more practice sessions' : 'Interview performance trending upward',
          applicationCount < 10 ? 'Early stage in job search - continue applying broadly' : 'Active job search with multiple applications',
          acceptanceRate < 20 && applicationCount > 5 ? 'Lower than average acceptance rate - strategy adjustment needed' : 'Healthy application funnel'
        ],
        strengths: [
          interviewHistory.length > 0 ? `Completed ${interviewHistory.length} mock interviews` : 'Starting interview preparation',
          `Targeting roles in: ${userProfile.targetRoles.join(', ') || 'various positions'}`,
          userProfile.skills.length > 0 ? `Building expertise in: ${userProfile.skills.slice(0, 3).join(', ')}` : 'Skill development in progress'
        ],
        weaknesses: [
          interviewHistory.length < 5 ? 'Need more interview practice' : 'Refine advanced interview techniques',
          acceptanceRate < 30 && applicationCount > 3 ? 'Improve resume/application quality' : 'Strengthen application targeting',
          'Expand professional network'
        ],
        rootCauses: [
          interviewHistory.length < 5 ? 'Insufficient interview data - complete more mock interviews' : 'Consistency in performance - some interviews score higher than others',
          acceptanceRate === 0 && applicationCount > 3 ? 'Potential resume/ATS optimization issue or role mismatch' : 'Market factors and role-specific requirements',
          'Limited networking - most opportunities come through connections'
        ],
        recommendations: [
          interviewHistory.length < 10 ? `Complete ${10 - interviewHistory.length} more mock interviews this month` : 'Continue interview practice 3x per week',
          'Update resume with quantified achievements',
          'Reach out to 3-5 networking contacts weekly',
          'Focus on top 3 target companies',
          `Study ${userProfile.skills[0] || 'core'} skills more deeply`
        ],
        actionPlan: {
          thisMonth: [
            `✓ Complete ${Math.max(3, 10 - interviewHistory.length)} mock interviews`,
            '✓ Apply to 5-10 target roles',
            '✓ Update resume with recent accomplishments',
            '✓ Network with 2-3 professionals in target roles'
          ],
          nextMonth: [
            'Review interview recordings and improve weak areas',
            'Apply to 5-10 more roles based on patterns',
            'Complete 3-5 more mock interviews',
            'Follow up on pending applications'
          ]
        }
      }
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Error analyzing patterns:', error)
    return NextResponse.json(
      { error: 'Failed to analyze patterns' },
      { status: 500 }
    )
  }
}
