'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import AppLayout from '@/components/AppLayout'

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/signin')
                return
            }
            setUser(user)
            setLoading(false)
        }
        getUser()
    }, [router])

    if (loading) {
        return (
            <AppLayout>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Loading...</p>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <div>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
                    Welcome to MindMesh AIverse
                </h1>
                <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '40px' }}>
                    Your intelligent career companion powered by AI agents
                </p>

                {/* Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    <StatCard title="Profile Strength" value="Not Started" color="#ef4444" />
                    <StatCard title="Active Goals" value="0" color="#f59e0b" />
                    <StatCard title="Skills Tracked" value="0" color="#3b82f6" />
                    <StatCard title="Applications" value="0" color="#10b981" />
                </div>

                {/* Getting Started */}
                <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                        🚀 Get Started
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <ActionCard
                            title="Complete Your Profile"
                            description="Help our AI agents understand your background and goals"
                            action="Start Onboarding"
                            onClick={() => router.push('/onboarding')}
                        />
                        <ActionCard
                            title="Explore Career Paths"
                            description="Discover trajectories tailored to your interests"
                            action="Explore"
                            onClick={() => router.push('/explore')}
                            disabled
                        />
                        <ActionCard
                            title="Assess Your Skills"
                            description="Identify gaps and get personalized recommendations"
                            action="Start Assessment"
                            onClick={() => router.push('/skills')}
                            disabled
                        />
                    </div>
                </div>

                {/* Agent Status */}
                <div style={{ marginTop: '40px', backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                        🤖 Active Agents
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                        <AgentBadge name="Mentor" status="ready" />
                        <AgentBadge name="Reflection" status="ready" />
                        <AgentBadge name="Trajectory" status="ready" />
                        <AgentBadge name="Onboarding" status="waiting" />
                        <AgentBadge name="Skill Gap" status="inactive" />
                        <AgentBadge name="Resume Coach" status="inactive" />
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>{title}</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color }}>{value}</p>
        </div>
    )
}

function ActionCard({ title, description, action, onClick, disabled }: {
    title: string
    description: string
    action: string
    onClick: () => void
    disabled?: boolean
}) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            opacity: disabled ? 0.5 : 1,
        }}>
            <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{title}</h3>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>{description}</p>
            </div>
            <button
                onClick={onClick}
                disabled={disabled}
                style={{
                    padding: '8px 16px',
                    backgroundColor: disabled ? '#d1d5db' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                }}
            >
                {action}
            </button>
        </div>
    )
}

function AgentBadge({ name, status }: { name: string; status: 'ready' | 'waiting' | 'inactive' }) {
    const colors = {
        ready: '#10b981',
        waiting: '#f59e0b',
        inactive: '#9ca3af',
    }

    return (
        <div style={{
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            textAlign: 'center',
        }}>
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: colors[status],
                margin: '0 auto 8px',
            }} />
            <p style={{ fontSize: '14px', fontWeight: '500' }}>{name}</p>
            <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>{status}</p>
        </div>
    )
}
