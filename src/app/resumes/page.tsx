'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppLayout from '@/components/AppLayout'
import type { Memory } from '@/lib/mentor/memory'

export default function MyResumesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Memory[]>([])

  useEffect(() => {
    const load = async () => {
      setError(null)
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }

      // Fetch latest 25 memories for the user and filter in client
      // Try 'memories' then fallback to 'memory'
      try {
        const res = await supabase
          .from('memories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(25)

        if (res.error && res.error.message?.includes('does not exist')) {
          const fb = await supabase
            .from('memory')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(25)
          if (fb.error) throw fb.error
          setItems((fb.data || []) as any)
        } else if (res.error) {
          throw res.error
        } else {
          setItems((res.data || []) as any)
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load resumes')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const resumeMemories = items.filter(m => m.metadata?.type === 'user_profile' && m.metadata?.context === 'resume_parser' && m.metadata?.profile_data)

  return (
    <AppLayout>
      <div style={{ maxWidth: 900 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>My Resumes</h1>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>Parsed resumes saved to your account. Click any item to preview details.</p>

        {loading && <div>Loading...</div>}
        {error && (
          <div style={{ padding: 12, background: '#fee', color: '#b91c1c', borderRadius: 6 }}>{error}</div>
        )}

        {!loading && !error && resumeMemories.length === 0 && (
          <div style={{ padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6 }}>
            No resumes found yet. Try parsing one on the Resume page.
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {resumeMemories.map((m) => {
            const profile: any = m.metadata?.profile_data || {}
            const created = new Date(m.created_at).toLocaleString()
            return (
              <details key={m.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <strong>{profile.fullName || 'Unnamed'}</strong>
                    <span style={{ color: '#6b7280', marginLeft: 8 }}>{profile.email || 'No email'}</span>
                  </span>
                  <span style={{ color: '#6b7280' }}>{created}</span>
                </summary>
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span><strong>Skills:</strong> {Array.isArray(profile.skills) ? profile.skills.length : 0}</span>
                    {profile.phone && <span><strong>Phone:</strong> {profile.phone}</span>}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>Preview JSON:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', background: '#f9fafb', border: '1px solid #e5e7eb', padding: 10, borderRadius: 6 }}>
                      {JSON.stringify(profile, null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
