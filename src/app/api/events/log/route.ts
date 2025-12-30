import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { category, action, context } = body || {}

    if (typeof category !== 'string' || typeof action !== 'string') {
      return NextResponse.json({ error: 'category and action are required strings' }, { status: 400 })
    }
    if (context && typeof context !== 'object') {
      return NextResponse.json({ error: 'context must be an object when provided' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('events')
      .insert({ user_id: user.id, category, action, context })
      .select('id, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to log event' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id, created_at: data.created_at })
  } catch (e) {
    console.error('Events log error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
