'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import AppLayout from '@/components/AppLayout'

type OnboardingStep = 'background' | 'goals' | 'resume' | 'complete'

interface ProfileData {
    education: any[]
    workExperience: any[]
    skills: {
        technical: any[]
        soft: any[]
    }
    goals: {
        shortTerm: any
        longTerm: any
    }
    inferredAttributes: any[]
    conflicts: any[]
    confidenceScore: number
    gaps: string[]
}

const initialProfile: ProfileData = {
    education: [],
    workExperience: [],
    skills: { technical: [], soft: [] },
    goals: { shortTerm: null, longTerm: null },
    inferredAttributes: [],
    conflicts: [],
    confidenceScore: 0,
    gaps: []
}

export default function OnboardingPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [step, setStep] = useState<OnboardingStep>('background')
    const [loading, setLoading] = useState(false)
    const [agentThinking, setAgentThinking] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [education, setEducation] = useState('')
    const [experience, setExperience] = useState('')
    const [skills, setSkills] = useState('')
    const [goals, setGoals] = useState('')
    const [resumeText, setResumeText] = useState('')

    // Agent state
    const [profile, setProfile] = useState<ProfileData>(initialProfile)

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

    const runExtraction = useCallback(async () => {
        if (!user || (!education && !experience && !skills && !goals && !resumeText)) return

        setAgentThinking(true)
        setError(null)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            const res = await fetch('/api/onboarding/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    education,
                    experience,
                    skills,
                    goals,
                    resumeText,
                }),
            })

            const data = await res.json()
            if (res.ok && data.profile) {
                setProfile(data.profile)
            } else {
                console.error('Extraction error:', data.error)
                setError(data.error || 'The agent failed to interpret this input.')
            }
        } catch (err) {
            console.error('Incremental extraction error:', err)
            setError('Connection error or rate limit hit.')
        } finally {
            setAgentThinking(false)
        }
    }, [user, education, experience, skills, goals, resumeText])

    // Debounced extraction
    useEffect(() => {
        if (step === 'complete' || !education && !experience && !skills && !goals && !resumeText) return

        const timer = setTimeout(() => {
            runExtraction()
        }, 2500)
        return () => clearTimeout(timer)
    }, [education, experience, skills, goals, resumeText, runExtraction, step])

    const handleSubmit = async () => {
        setLoading(true)
        await runExtraction()
        setStep('complete')
        setLoading(false)
    }

    if (!user) {
        return <AppLayout><div style={{ padding: '40px' }}>Loading...</div></AppLayout>
    }

    if (step === 'complete') {
        return (
            <AppLayout>
                <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center' }}>
                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>✨</div>
                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>
                        Profile Genesis Complete
                    </h1>
                    <p style={{ fontSize: '18px', color: '#4b5563', marginBottom: '40px', lineHeight: '1.6' }}>
                        Your initial belief state has been constructed. The Core Mentor Agent is now ready to guide you based on this mental model.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            padding: '14px 32px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            transition: 'transform 0.2s'
                        }}
                    >
                        Enter the AIverse
                    </button>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <div style={{ display: 'flex', height: 'calc(100vh - 80px)', margin: '-40px' }}>

                {/* Left Panel: Onboarding Form */}
                <div style={{ flex: '0 0 60%', padding: '40px', overflowY: 'auto', borderRight: '1px solid #e5e7eb' }}>
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <header style={{ marginBottom: '40px' }}>
                            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                                Profile Genesis Surface
                            </h1>
                            <p style={{ color: '#6b7280' }}>Help us construct your agentic mental model.</p>
                        </header>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
                            {['background', 'goals', 'resume'].map((s, idx) => (
                                <div key={s} style={{ flex: 1 }}>
                                    <div style={{
                                        height: '4px',
                                        backgroundColor: step === s ? '#2563eb' : (['background', 'goals', 'resume'].indexOf(step) > idx ? '#10b981' : '#e5e7eb'),
                                        borderRadius: '2px',
                                        marginBottom: '8px'
                                    }} />
                                    <span style={{ fontSize: '12px', fontWeight: '500', color: step === s ? '#2563eb' : '#9ca3af', textTransform: 'capitalize' }}>
                                        {s}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {step === 'background' && (
                            <section>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>📚 Background & Expertise</h2>
                                <FormField label="Education" value={education} onChange={setEducation} placeholder="Degree, University, Year..." />
                                <FormField label="Experience" value={experience} onChange={setExperience} placeholder="Roles, companies, or projects..." rows={5} />
                                <FormField label="Key Skills (Manual)" value={skills} onChange={setSkills} placeholder="Skills you definitely want to highlight..." />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                                    <button onClick={() => setStep('goals')} style={nextBtnStyle}>Next: Goals →</button>
                                </div>
                            </section>
                        )}

                        {step === 'goals' && (
                            <section>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>🎯 Interests & Direction</h2>
                                <FormField label="Career Goals" value={goals} onChange={setGoals} placeholder="What are you aiming for in the next 1-3 years?" rows={6} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                                    <button onClick={() => setStep('background')} style={backBtnStyle}>← Back</button>
                                    <button onClick={() => setStep('resume')} style={nextBtnStyle}>Next: Resume →</button>
                                </div>
                            </section>
                        )}

                        {step === 'resume' && (
                            <section>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>📄 Artifacts & Links</h2>
                                <FormField label="Resume Content" value={resumeText} onChange={setResumeText} placeholder="Paste your resume text here..." rows={12} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                                    <button onClick={() => setStep('goals')} style={backBtnStyle}>← Back</button>
                                    <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
                                        {loading ? 'Finalizing...' : 'Confirm Profile & Genesis ✨'}
                                    </button>
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                {/* Right Panel: Live Profile Summary */}
                <div style={{ flex: '1', backgroundColor: '#f9fafb', padding: '40px', overflowY: 'auto' }}>
                    <div style={{ position: 'sticky', top: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>AI Understanding You</h2>
                            {agentThinking && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#2563eb' }}>
                                    <div className="spinner" /> Thinking...
                                </div>
                            )}
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b', marginBottom: '4px' }}>Profiling Error</h3>
                                <p style={{ fontSize: '12px', color: '#b91c1c' }}>{error}</p>
                            </div>
                        )}

                        {profile.confidenceScore > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                {/* Conflicts Alert */}
                                {profile.conflicts.length > 0 && (
                                    <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', padding: '16px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#9a3412', marginBottom: '8px' }}>⚠️ Consistency Alerts</h3>
                                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#c2410c' }}>
                                            {profile.conflicts.map((c, i) => <li key={i}>{c.description}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {/* Overall Confidence */}
                                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '14px', color: '#6b7280' }}>Profile Confidence</span>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: getConfidenceColor(profile.confidenceScore) }}>{profile.confidenceScore}%</span>
                                    </div>
                                    <div style={{ height: '6px', backgroundColor: '#f3f4f6', borderRadius: '3px' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${profile.confidenceScore}%`,
                                            backgroundColor: getConfidenceColor(profile.confidenceScore),
                                            borderRadius: '3px',
                                            transition: 'width 0.5s ease'
                                        }} />
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <SummarySection title="🎓 Inferred Education" items={profile.education.map(e => ({
                                    main: e.degree,
                                    sub: `${e.institution} (${e.year})`,
                                    conf: e.confidence,
                                    source: e.source,
                                    reason: e.reasoning
                                }))} />

                                <SummarySection title="💼 Work Identity" items={profile.workExperience.map(w => ({
                                    main: w.title,
                                    sub: w.company,
                                    conf: w.confidence,
                                    source: w.source,
                                    reason: w.reasoning
                                }))} />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Technical Base</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {profile.skills.technical.map((s, i) => (
                                                <div key={i} style={{
                                                    fontSize: '11px',
                                                    padding: '4px 8px',
                                                    backgroundColor: s.source === 'explicit' ? '#ebf5ff' : '#f0fdf4',
                                                    color: s.source === 'explicit' ? '#1e40af' : '#166534',
                                                    borderRadius: '4px',
                                                    border: '1px solid transparent'
                                                }}>
                                                    {s.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Soft Skills</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {profile.skills.soft.map((s, i) => (
                                                <div key={i} style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                                                    {s.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Inferred Attributes */}
                                {profile.inferredAttributes.length > 0 && (
                                    <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '16px', border: '1px solid #dbeafe' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '12px' }}>Agent Inferences</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {profile.inferredAttributes.map((attr, i) => (
                                                <div key={i} style={{ fontSize: '13px' }}>
                                                    <span style={{ fontWeight: '600' }}>{attr.attribute}:</span> {attr.value}
                                                    <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '2px' }}>{attr.reasoning}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        ) : (
                            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#9ca3af', textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
                                <p>Start typing on the left.<br />The agent will begin understanding you in real-time.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid #2563eb;
                    border-top: 2px solid transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </AppLayout>
    )
}

function FormField({ label, value, onChange, placeholder, rows = 3 }: any) {
    return (
        <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outlineColor: '#2563eb',
                    transition: 'border-color 0.2s',
                    lineHeight: '1.5'
                }}
            />
        </div>
    )
}

function SummarySection({ title, items }: { title: string, items: any[] }) {
    if (items.length === 0) return null
    return (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>{title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map((item, i) => (
                    <div key={i} style={{ borderLeft: `3px solid ${getConfidenceColor(item.conf)}`, paddingLeft: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600' }}>{item.main}</div>
                            <span style={{
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: item.source === 'explicit' ? '#f3f4f6' : '#ecfdf5',
                                color: item.source === 'explicit' ? '#6b7280' : '#10b981'
                            }}>
                                {item.source}
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.sub}</div>
                        {item.reason && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', fontStyle: 'italic' }}>"{item.reason}"</div>}
                    </div>
                ))}
            </div>
        </div>
    )
}

function getConfidenceColor(score: number) {
    if (score >= 80) return '#10b981'
    if (score >= 50) return '#f59e0b'
    return '#ef4444'
}

const nextBtnStyle = {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
}

const backBtnStyle = {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
}

const submitBtnStyle = {
    padding: '10px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
}
