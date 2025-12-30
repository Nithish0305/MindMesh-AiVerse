'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { 
  Lightbulb, Zap, Target, Send, ChevronDown, ChevronUp, 
  Star, TrendingUp, AlertCircle, CheckCircle, Repeat2, ArrowLeft 
} from 'lucide-react'
import {
  generateInterviewQuestions,
  generateAIInterviewQuestions,
  scoreInterviewResponse,
  evaluateAnswerWithAI,
  calculateMockInterviewScore,
  type InterviewQuestion,
  type InterviewResponse,
} from '@/lib/interview'

export default function InterviewPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'setup' | 'interview' | 'results'>('setup')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [numQuestions, setNumQuestions] = useState(4)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [responses, setResponses] = useState<InterviewResponse[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [feedback, setFeedback] = useState<any>(null)
  const [expandedFeedback, setExpandedFeedback] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleStartInterview = async () => {
    if (!jobTitle || !company) {
      alert('Please enter job title and company')
      return
    }

    setLoading(true)
    try {
      // Use AI to generate questions
      const generatedQuestions = await generateAIInterviewQuestions(jobTitle, company, difficulty, numQuestions)
      setQuestions(generatedQuestions)
      setResponses([])
      setCurrentQuestionIndex(0)
      setCurrentAnswer('')
      setMode('interview')
    } catch (error) {
      console.error('Failed to start interview:', error)
      alert('Failed to generate questions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) {
      alert('Please provide an answer')
      return
    }

    setLoading(true)
    try {
      const currentQuestion = questions[currentQuestionIndex]
      // Use AI to evaluate the answer
      const feedbackData = await evaluateAnswerWithAI(currentAnswer, currentQuestion)

      const newResponse: InterviewResponse = {
        questionId: currentQuestion.id,
        userAnswer: currentAnswer,
        feedback: feedbackData.summary,
        score: feedbackData.score,
        strengths: feedbackData.strengths,
        improvements: feedbackData.improvements,
        timestamp: new Date().toISOString(),
      }

      const updatedResponses = [...responses, newResponse]
      setResponses(updatedResponses)
      setFeedback(feedbackData)
      setCurrentAnswer('')
    } catch (error) {
      console.error('Failed to evaluate answer:', error)
      alert('Failed to evaluate answer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setCurrentAnswer('')
      setFeedback(null)
      setExpandedFeedback(false)
    } else {
      setMode('results')
    }
  }

  const handleSaveResults = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('Please sign in to save results')
        return
      }

      // Format questions and responses for storage
      const interviewData = questions.map((q, i) => {
        const response = responses[i]
        return {
          q: q.question,
          a: response?.userAnswer || '',
          feedback: response?.feedback || '',
          score: response?.score || 0,
        }
      })

      console.log('Saving interview data:', {
        user_id: user.id,
        questions: interviewData,
        score: interviewScore.overallScore,
      })

      const { error } = await supabase.from('interview_logs').insert({
        user_id: user.id,
        questions: interviewData,
        score: interviewScore.overallScore,
      })

      if (error) {
        console.error('Error saving interview:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        alert(`Failed to save results: ${error.message || 'Unknown error'}`)
      } else {
        alert('Interview results saved successfully!')
      }
    } catch (error) {
      console.error('Error saving results:', error)
      alert('Failed to save results. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const interviewScore = calculateMockInterviewScore(responses)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">Interview Preparation</h2>
          <p className="text-muted-foreground">AI-powered mock interviews with STAR method guidance and real-time feedback.</p>
        </div>
      </div>

      {/* Setup Mode */}
      {mode === 'setup' && (
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-600/10">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Schedule Mock Interview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4">
              {/* Quick Start Templates */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { role: 'Senior Frontend Engineer', company: 'TechNova' },
                  { role: 'Full Stack Developer', company: 'Startup XYZ' },
                  { role: 'Product Manager', company: 'Big Tech' },
                  { role: 'Data Scientist', company: 'FinTech' },
                ].map((template) => (
                  <button
                    key={template.role}
                    onClick={() => {
                      setJobTitle(template.role)
                      setCompany(template.company)
                    }}
                    className="p-3 text-left border rounded-lg hover:border-primary hover:bg-primary/5 transition"
                  >
                    <div className="font-medium text-sm">{template.role}</div>
                    <div className="text-xs text-muted-foreground">{template.company}</div>
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Title</label>
                <Input
                  placeholder="e.g. Senior Software Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Company</label>
                <Input
                  placeholder="e.g. Google, Startup Name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty Level</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`px-4 py-2 rounded-lg border transition capitalize ${
                        difficulty === level
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-muted-foreground hover:border-primary'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Questions</label>
                <div className="flex gap-2">
                  {[4, 6, 8, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumQuestions(num)}
                      className={`px-4 py-2 rounded-lg border transition ${
                        numQuestions === num
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-muted-foreground hover:border-primary'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid gap-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium text-blue-900">STAR Method Guidance</p>
                    <p className="text-blue-700">AI will evaluate your use of Situation, Task, Action, Result in answers</p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex gap-2">
                  <Zap className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium text-green-900">Real-time Feedback</p>
                    <p className="text-green-700">Get instant scoring and improvement suggestions after each answer</p>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={handleStartInterview} size="lg" className="w-full h-11" disabled={loading}>
              {loading ? 'Generating AI Questions...' : 'Start Interview'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Interview Mode */}
      {mode === 'interview' && currentQuestion && (
        <div className="space-y-6">
          {/* Progress Bar */}
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Question Card */}
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-600/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{currentQuestion.question}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{currentQuestion.category}</Badge>
                    <Badge variant={
                      currentQuestion.difficulty === 'hard' ? 'destructive' :
                      currentQuestion.difficulty === 'medium' ? 'secondary' :
                      'outline'
                    }>
                      {currentQuestion.difficulty}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* STAR Method Guide */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs font-medium text-amber-900 mb-2">💡 Use the STAR Method:</p>
                <ul className="text-xs text-amber-800 space-y-1">
                  <li><strong>S</strong>ituation - Set the context</li>
                  <li><strong>T</strong>ask - Describe your responsibility</li>
                  <li><strong>A</strong>ction - Explain what you did</li>
                  <li><strong>R</strong>esult - Share the outcome & impact</li>
                </ul>
              </div>

              {/* Answer Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Answer</label>
                <Textarea
                  placeholder="Type your answer here... (aim for 100-200 words)"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
                <div className="text-xs text-muted-foreground">
                  Word count: {currentAnswer.split(/\s+/).filter(w => w.length > 0).length}
                </div>
              </div>

              {/* Feedback */}
              {feedback && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Score: {feedback.score}/100</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{feedback.summary}</p>
                    </div>
                    <button
                      onClick={() => setExpandedFeedback(!expandedFeedback)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {expandedFeedback ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {expandedFeedback && (
                    <div className="space-y-3 bg-muted/30 p-3 rounded-lg">
                      {/* STAR Breakdown */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">STAR Method: {feedback.starMethodRating}/100</p>
                        <div className="flex gap-1">
                          {Object.entries(feedback.starBreakdown).map(([key, value]) => (
                            <div key={key} className="flex-1 text-center">
                              <div className="text-xs font-medium capitalize">{key}</div>
                              <div className={value === '✓' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                {String(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strengths */}
                      {feedback.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-1">✓ Strengths:</p>
                          <ul className="text-xs text-green-700 space-y-0.5">
                            {feedback.strengths.map((s: string, i: number) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Improvements */}
                      {feedback.improvements.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Improvements:</p>
                          <ul className="text-xs text-amber-700 space-y-0.5">
                            {feedback.improvements.map((imp: string, i: number) => (
                              <li key={i}>• {imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {!feedback ? (
                  <Button onClick={handleSubmitAnswer} className="flex-1 h-11" disabled={loading}>
                    <Send className="h-4 w-4 mr-2" />
                    {loading ? 'AI Evaluating...' : 'Submit Answer'}
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => {
                      setCurrentAnswer('')
                      setFeedback(null)
                    }} variant="outline" className="flex-1 h-11" disabled={loading}>
                      <Repeat2 className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <Button onClick={handleNextQuestion} className="flex-1 h-11" disabled={loading}>
                      {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Mode */}
      {mode === 'results' && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card className="border-primary/20 shadow-lg overflow-hidden">
            <div className="relative h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500">
              <div
                className="h-full bg-green-600"
                style={{ width: `${Math.max(interviewScore.overallScore * 1.25, 100)}%` }}
              />
            </div>
            <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-600/10">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Interview Results
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="text-center">
                <div className="text-6xl font-bold text-primary mb-2">
                  {interviewScore.overallScore}
                  <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <p className="text-muted-foreground">
                  {interviewScore.overallScore >= 80 ? '🎉 Excellent! You\'re interview ready!' :
                   interviewScore.overallScore >= 70 ? '👍 Good foundation. Keep practicing!' :
                   '💪 Keep improving. You\'ve got this!'}
                </p>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Recommendations</h3>
                <div className="space-y-2">
                  {interviewScore.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Question Breakdown */}
              <div className="space-y-3 border-t pt-6">
                <h3 className="font-semibold text-sm">Question Breakdown</h3>
                <div className="space-y-2">
                  {questions.map((q, i) => {
                    const response = responses[i]
                    const score = response?.score || 0
                    return (
                      <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{q.category}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{q.question}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">{score}</div>
                          <div className="text-xs text-muted-foreground">/100</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    setMode('setup')
                    setCurrentQuestionIndex(0)
                    setResponses([])
                  }}
                  variant="outline"
                  className="flex-1 h-11"
                  disabled={loading}
                >
                  <Repeat2 className="h-4 w-4 mr-2" />
                  Practice Again
                </Button>
                <Button onClick={handleSaveResults} className="flex-1 h-11" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Results'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
