
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Briefcase, Map as MapIcon, Users, BarChart, LogOut, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Jobs', href: '/jobs', icon: Briefcase },
        { name: 'Plan', href: '/plan', icon: BarChart },
        { name: 'Interview', href: '/interview', icon: Users },
        { name: 'Analysis', href: '/analysis', icon: TrendingUp },
        { name: 'Map', href: '/map', icon: MapIcon },
        { name: 'Network', href: '/network', icon: Users },
        { name: 'History', href: '/history', icon: LayoutDashboard },
    ]

    const handleSignOut = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full">
            <div className="container flex h-16 items-center">
                <Link href="/" className="mr-6 flex items-center space-x-2 font-bold text-xl text-primary">
                    <span className="hidden sm:inline-block">MindMesh</span>
                </Link>
                <div className="flex items-center space-x-6 text-sm font-medium">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "transition-colors hover:text-foreground/80 flex items-center gap-2",
                                pathname === item.href ? "text-foreground" : "text-foreground/60"
                            )}
                        >
                            {/* <item.icon className="h-4 w-4" /> */}
                            {item.name}
                        </Link>
                    ))}
                </div>
                <div className="ml-auto flex items-center space-x-4">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleSignOut}
                        disabled={loading}
                        className="gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </nav>
    )
}
