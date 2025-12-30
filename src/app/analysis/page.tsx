'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle,
  Zap,
  BarChart3,
  ArrowLeft,
} from 'lucide-react'
import {
  analyzeCareerPatterns,
  calculateInterviewStats,
  calculateApplicationStats,
  type CareerAnalysis,
} from '@/lib/analysis'

export default function AnalysisPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<CareerAnalysis | null>(null)
  const [interviewStats, setInterviewStats] = useState<any>(null)
  const [applicationStats, setApplicationStats] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalysis()
  }, [])

  const fetchAnalysis = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Fetch interview history
      const { data: interviews } = await supabase
        .from('interview_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Fetch application history
      const { data: applications } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Fetch career profile
      const { data: profile } = await supabase
        .from('career_profile')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Format data for analysis
      const formattedInterviews = (interviews || []).map((i: any) => ({
        score: i.score || 0,
        date: i.created_at,
        role: 'Interview',
        strengths: [],
        weaknesses: [],
      }))

      const formattedApplications = (applications || []).map((a: any) => {
        let outcome: 'offer' | 'rejected' | 'pending' | undefined
        if (a.status === 'rejected') outcome = 'rejected'
        else if (a.status === 'offer') outcome = 'offer'
        else outcome = 'pending'
        
        return {
          company: a.company || 'Unknown',
          role: a.job_title || 'Unknown',
          status: (a.status || 'applied') as 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected',
          outcome,
          date: a.created_at,
        }
      })

      const userProfile = {
        skills: profile?.skills || [],
        targetRoles: profile?.bio ? [profile.bio] : [],
        experience: '5 years', // Default
      }

      // Calculate stats
      const intStats = calculateInterviewStats(formattedInterviews)
      const appStats = calculateApplicationStats(formattedApplications)
      setInterviewStats(intStats)
      setApplicationStats(appStats)

      // Get AI analysis
      if (formattedInterviews.length > 0 || formattedApplications.length > 0) {
        const aiAnalysis = await analyzeCareerPatterns(
          formattedInterviews,
          formattedApplications,
          userProfile
        )
        setAnalysis(aiAnalysis)
      } else {
        setError('No interview or application data available for analysis')
      }
    } catch (err) {
      console.error('Error fetching analysis:', err)
      setError('Failed to load analysis')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight">Career Analysis</h2>
            <p className="text-muted-foreground">Loading your analysis...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight">Career Analysis</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">Career Analysis</h2>
          <p className="text-muted-foreground">AI-powered pattern analysis and recommendations</p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-600/10">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-base text-foreground mb-4">{analysis?.summary}</p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        {interviewStats && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {interviewStats.averageScore}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Average Interview Score</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {interviewStats.totalInterviews}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Total Interviews</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
        {applicationStats && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {applicationStats.acceptanceRate}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Acceptance Rate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {applicationStats.totalApplications}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Applications</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Patterns */}
      {analysis?.patterns && analysis.patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Key Patterns Identified
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.patterns.map((pattern, i) => (
              <div key={i} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                <p className="text-sm text-foreground">{pattern}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      {analysis?.strengths && analysis.strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.strengths.map((strength, i) => (
              <div key={i} className="flex gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-900 dark:text-green-100">{strength}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weaknesses */}
      {analysis?.weaknesses && analysis.weaknesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.weaknesses.map((weakness, i) => (
              <div key={i} className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-900 dark:text-amber-100">{weakness}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Root Causes */}
      {analysis?.rootCauses && analysis.rootCauses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              Root Causes
            </CardTitle>
            <CardDescription>Why these patterns are happening</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.rootCauses.map((cause, i) => (
              <div key={i} className="flex gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <span className="font-semibold text-orange-700 dark:text-orange-300 flex-shrink-0">
                  {i + 1}.
                </span>
                <p className="text-sm text-orange-900 dark:text-orange-100">{cause}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis?.recommendations && analysis.recommendations.length > 0 && (
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-600/10">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Recommended Action Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {analysis.recommendations.map((rec, i) => {
              const isPriority = rec.toLowerCase().includes('priority')
              return (
                <div
                  key={i}
                  className={`flex gap-3 p-3 rounded-lg border ${
                    isPriority
                      ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                      : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {isPriority && (
                    <Badge variant="destructive" className="flex-shrink-0 h-fit">
                      Priority
                    </Badge>
                  )}
                  <p
                    className={`text-sm ${
                      isPriority
                        ? 'text-red-900 dark:text-red-100'
                        : 'text-blue-900 dark:text-blue-100'
                    }`}
                  >
                    {rec}
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Action Plan */}
      {analysis?.actionPlan && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-50">
              <CardTitle className="text-base">This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-6">
              {analysis.actionPlan.thisMonth.map((item, i) => (
                <div key={i} className="flex gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded">
                  <span className="font-semibold text-blue-700 dark:text-blue-300 flex-shrink-0">
                    □
                  </span>
                  <p className="text-sm text-blue-900 dark:text-blue-100">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-100 to-purple-50">
              <CardTitle className="text-base">Next Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-6">
              {analysis.actionPlan.nextMonth.map((item, i) => (
                <div key={i} className="flex gap-2 p-2 bg-purple-50 dark:bg-purple-950 rounded">
                  <span className="font-semibold text-purple-700 dark:text-purple-300 flex-shrink-0">
                    □
                  </span>
                  <p className="text-sm text-purple-900 dark:text-purple-100">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex gap-2">
        <Button onClick={fetchAnalysis} variant="outline" className="w-full h-11">
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>
    </div>
  )
}
