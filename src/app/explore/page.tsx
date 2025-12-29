'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import AppLayout from '@/components/AppLayout'

export default function ExplorePage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)

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

    if (!user) {
        return <AppLayout><div style={{ padding: '40px' }}>Loading...</div></AppLayout>
    }

    return (
        <AppLayout>
            <div>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
                    🎯 Explore Career Paths
                </h1>
                <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '30px' }}>
                    Discover career trajectories tailored to your interests (Coming Soon)
                </p>

                <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚧</div>
                    <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                        Under Construction
                    </h2>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                        The Goal Discovery Agent is being built. Check back soon!
                    </p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </AppLayout>
    )
}
