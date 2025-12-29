'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AppLayout from '@/components/AppLayout'
import { useRouter } from 'next/navigation'
import { Trajectory } from '@/lib/mentor/memory'

export default function TrajectoryPage() {
  const router = useRouter()
  const [userReady, setUserReady] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trajectories, setTrajectories] = useState<Trajectory[]>([])

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }
      setUserReady(true)
    }
    check()
  }, [router])

  const simulate = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError(null)
    setTrajectories([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/mentor/trajectory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: input })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate trajectories')
      setTrajectories(data.trajectories || [])
      setInput('')
    } catch (e: any) {
      setError(e.message || 'Error simulating trajectories')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 900 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Trajectory Simulator</h1>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>Describe a decision or goal, and we will simulate 2-3 plausible career paths.</p>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder="e.g., Should I pivot to data engineering or double down on frontend?"
          style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}
          disabled={!userReady || loading}
        />
        <div style={{ marginTop: 10 }}>
          <button onClick={simulate} disabled={!userReady || loading || !input.trim()} style={{ padding: '8px 12px', background: '#9333ea', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Simulating...' : 'Simulate Paths'}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: 10, background: '#fee', color: '#b91c1c', borderRadius: 6 }}>{error}</div>
        )}

        {trajectories.length > 0 && (
          <div style={{ marginTop: 20 }}>
            {trajectories.map((t, idx) => (
              <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>{idx + 1}. {t.name}</h3>
                <div style={{ marginTop: 8 }}>
                  <strong>Assumptions:</strong>
                  <ul>
                    {t.assumptions.map((a, i) => (<li key={i}>{a}</li>))}
                  </ul>
                  <strong>Short-Term (6-12 months):</strong>
                  <ul>
                    {t.shortTermOutcomes.map((o, i) => (<li key={i}>{o}</li>))}
                  </ul>
                  <strong>Long-Term (2-5 years):</strong>
                  <ul>
                    {t.longTermOutcomes.map((o, i) => (<li key={i}>{o}</li>))}
                  </ul>
                  <strong>Risks:</strong>
                  <ul>
                    {t.risks.map((r, i) => (<li key={i}>{r}</li>))}
                  </ul>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    <span><strong>Effort:</strong> {t.effortLevel}</span>
                    <span><strong>Confidence:</strong> {t.confidence}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
