/**
 * Minimal UI for Core Mentor Agent Interaction
 * 
 * This is a basic interface for testing the mentor agent.
 * No styling polish - focus is on functional flow.
 * 
 * FUTURE-PROOFING NOTES:
 * - Phase 3+ can enhance this with better UX, chat history, etc.
 * - This page assumes user authentication is handled elsewhere
 * - For now, userId is hardcoded for testing (should come from auth in production)
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

import { User } from '@supabase/supabase-js'
import { Trajectory } from '@/lib/mentor/memory'

export default function MentorPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [response, setResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  // Phase 4: Trajectory state
  const [trajectories, setTrajectories] = useState<Trajectory[]>([])
  const [showTrajectories, setShowTrajectories] = useState(false)

  // Get user from Supabase auth
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }
      setUser(user)
    }
    getUser()
  }, [router])

  // State for feedback loop
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'yes' | 'no' | null>(null)
  const [feedbackText, setFeedbackText] = useState('')

  // ... (useEffect for auth)

  const handleFeedbackClick = (type: 'yes' | 'no') => {
    setFeedbackType(type)
  }

  const submitFeedback = async () => {
    if (!feedbackType) return
    setFeedbackSent(true)

    try {
      // Force refresh session to ensure valid token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // Only call reflection/recording API if there is text or if it's negative
      // Or if it's positive, we still want to record the "success" signal
      if (feedbackType === 'no' || feedbackText.trim() || feedbackType === 'yes') {
        await fetch('/api/mentor/reflect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            message: feedbackText || (feedbackType === 'no' ? 'User indicated not helpful.' : 'User indicated helpful.'),
            previousAdvice: response,
            outcome: feedbackType === 'yes' ? 'success' : 'failure'
          }),
        })
      }
    } catch (err) {
      console.error('Feedback error:', err)
    }
  }

  // Phase 4: Trajectory request handler
  const handleTrajectoryRequest = async () => {
    console.log('🚀 Trajectory Request: Starting...')
    if (!input.trim() || loading || !user) {
      console.log('❌ Trajectory Request: Blocked', { input: input.trim(), loading, user: !!user })
      return
    }

    console.log('✅ Trajectory Request: Proceeding with input:', input)
    setLoading(true)
    setError(null)
    setResponse(null)
    setTrajectories([])
    setShowTrajectories(false)

    try {
      console.log('🔐 Getting auth session...')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Authentication session lost. Please reload or sign in again.')
      }

      console.log('📡 Calling trajectory API...')
      const res = await fetch('/api/mentor/trajectory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: input,
        }),
      })

      console.log('📥 API Response status:', res.status)
      const data = await res.json()
      console.log('📥 API Response data:', data)

      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to generate trajectories')
      }

      console.log('✅ Setting trajectories:', data.trajectories?.length || 0)
      setTrajectories(data.trajectories || [])
      setShowTrajectories(true)
      setInput('')
    } catch (err) {
      console.error('❌ Trajectory error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      console.log('🏁 Trajectory Request: Complete')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !user) return

    setLoading(true)
    setError(null)
    setResponse(null)
    // Reset feedback state for new request
    setFeedbackSent(false)
    setFeedbackType(null)
    setFeedbackText('')

    try {
      // Refresh session before request to avoid stale 401s
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Authentication session lost. Please reload or sign in again.')
      }

      const res = await fetch('/api/mentor/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: input,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMessage = data.error || 'Failed to get mentor response'
        const errorDetails = data.details ? ` (${data.details})` : ''
        throw new Error(errorMessage + errorDetails)
      }

      setResponse(data.response)
      setInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Core Mentor Agent</h1>
      <p>Ask your career mentor for advice.</p>

      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your mentor a question..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px',
          }}
        >
          {loading ? 'Thinking...' : 'Ask Mentor'}
        </button>

        {/* Phase 4: Trajectory Request Button */}
        <button
          type="button"
          onClick={handleTrajectoryRequest}
          disabled={loading || !input.trim()}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#9333ea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Simulating...' : 'Simulate Paths'}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00',
          }}
        >
          <strong>Error:</strong> {error}
          <br />
          <span style={{ fontSize: '12px', color: '#900' }}>
            (Please try again. If persistent, check console logs.)
          </span>
        </div>
      )}

      {response && (
        <div
          style={{
            marginTop: '20px',
            padding: '20px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        >
          <h3>Mentor Response:</h3>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {response}
          </p>

          {/* Phase 3: Feedback Loop */}
          <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
            {!feedbackSent ? (
              <>
                {!feedbackType ? (
                  <>
                    <p style={{ fontSize: '14px', marginBottom: '10px' }}>Did this help?</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleFeedbackClick('yes')}
                        style={{ background: '#e6fffa', border: '1px solid #38b2ac', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => handleFeedbackClick('no')}
                        style={{ background: '#fff5f5', border: '1px solid #e53e3e', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        No
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ fontSize: '14px', marginBottom: '5px' }}>
                      {feedbackType === 'yes' ? 'Great! What was most helpful?' : 'Sorry! How can we improve?'}
                    </p>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Optional feedback..."
                      style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <div>
                      <button
                        onClick={submitFeedback}
                        style={{ background: '#3182ce', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}
                      >
                        Submit Feedback
                      </button>
                      <button
                        onClick={() => setFeedbackType(null)}
                        style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: '12px', color: 'green', marginTop: '5px' }}>Thanks for your feedback!</p>
            )}
          </div>
        </div>
      )}

      {/* Phase 4: Trajectory Display */}
      {showTrajectories && trajectories.length > 0 && (
        <div
          style={{
            marginTop: '20px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            border: '2px solid #9333ea',
            borderRadius: '4px',
          }}
        >
          <h3 style={{ color: '#9333ea' }}>📊 Career Path Simulation</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Based on your history and reflections, here are {trajectories.length} possible trajectories:
          </p>

          {trajectories.map((traj, index) => (
            <div
              key={index}
              style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
              }}
            >
              <h4 style={{ marginBottom: '10px', color: '#1f2937' }}>
                {index + 1}. {traj.name}
              </h4>

              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <p><strong>Assumptions:</strong></p>
                <ul style={{ marginLeft: '20px' }}>
                  {traj.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>

                <p style={{ marginTop: '10px' }}><strong>Short-Term (6-12 months):</strong></p>
                <ul style={{ marginLeft: '20px' }}>
                  {traj.shortTermOutcomes.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>

                <p style={{ marginTop: '10px' }}><strong>Long-Term (2-5 years):</strong></p>
                <ul style={{ marginLeft: '20px' }}>
                  {traj.longTermOutcomes.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>

                <p style={{ marginTop: '10px' }}><strong>Risks:</strong></p>
                <ul style={{ marginLeft: '20px' }}>
                  {traj.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>

                <div style={{ marginTop: '10px', display: 'flex', gap: '15px', fontSize: '13px' }}>
                  <span>
                    <strong>Effort:</strong>
                    <span style={{
                      padding: '2px 8px',
                      marginLeft: '5px',
                      borderRadius: '3px',
                      backgroundColor: traj.effortLevel === 'high' ? '#fee2e2' : traj.effortLevel === 'medium' ? '#fef3c7' : '#d1fae5',
                      color: traj.effortLevel === 'high' ? '#991b1b' : traj.effortLevel === 'medium' ? '#92400e' : '#065f46'
                    }}>
                      {traj.effortLevel}
                    </span>
                  </span>
                  <span>
                    <strong>Confidence:</strong>
                    <span style={{
                      padding: '2px 8px',
                      marginLeft: '5px',
                      borderRadius: '3px',
                      backgroundColor: traj.confidence === 'high' ? '#d1fae5' : traj.confidence === 'medium' ? '#fef3c7' : '#fee2e2',
                      color: traj.confidence === 'high' ? '#065f46' : traj.confidence === 'medium' ? '#92400e' : '#991b1b'
                    }}>
                      {traj.confidence}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!user && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
          Loading user session...
        </div>
      )}

      <div style={{ marginTop: '40px', fontSize: '14px', color: '#666' }}>
        <p>
          <strong>Note:</strong> This is a minimal UI for Phase 2. Enhanced UX will be added in later phases.
        </p>

        {user && (
          <p>
            <strong>Signed in as:</strong> {user.email}
          </p>
        )}
      </div>
    </main>
  )
}

