'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

interface LayoutProps {
    children: React.ReactNode
}

export default function AppLayout({ children }: LayoutProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()

        // Listen for auth state changes (sign in, sign out, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (_event === 'SIGNED_OUT') {
                router.push('/signin')
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/signin')
    }

    const navItems = [
        { label: '🏠 Dashboard', path: '/dashboard', icon: '🏠' },
        { label: '👤 Profile', path: '/onboarding', icon: '👤' },
        { label: '🎯 Goals', path: '/explore', icon: '🎯' },
        { label: '⚡ Skills', path: '/skills', icon: '⚡' },
        { label: '📄 Resume', path: '/resume', icon: '📄' },
        { label: '📚 My Resumes', path: '/resumes', icon: '📚' },
        { label: '🤝 Network', path: '/network', icon: '🤝' },
        { label: '💼 Jobs', path: '/jobs', icon: '💼' },
        { label: '🎤 Interview', path: '/interview', icon: '🎤' },
        { label: '📊 Trajectory', path: '/trajectory', icon: '📊' },
        { label: '💬 Mentor', path: '/mentor', icon: '💬' },
    ]

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            {/* Sidebar */}
            <aside
                style={{
                    width: '250px',
                    backgroundColor: '#1f2937',
                    color: 'white',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                        MindMesh AIverse
                    </h2>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
                        Your Career Companion
                    </p>
                </div>

                <nav style={{ flex: 1 }}>
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                marginBottom: '8px',
                                backgroundColor: pathname === item.path ? '#374151' : 'transparent',
                                color: pathname === item.path ? 'white' : '#d1d5db',
                                border: 'none',
                                borderRadius: '6px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: pathname === item.path ? '600' : '400',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                if (pathname !== item.path) {
                                    e.currentTarget.style.backgroundColor = '#374151'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (pathname !== item.path) {
                                    e.currentTarget.style.backgroundColor = 'transparent'
                                }
                            }}
                        >
                            {item.icon} {item.label.split(' ')[1]}
                        </button>
                    ))}
                </nav>

                {user && (
                    <div style={{ borderTop: '1px solid #374151', paddingTop: '16px' }}>
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                            {user.email}
                        </p>
                        <button
                            onClick={handleSignOut}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '14px',
                                cursor: 'pointer',
                            }}
                        >
                            Sign Out
                        </button>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '40px', overflow: 'auto' }}>
                {children}
            </main>
        </div>
    )
}
