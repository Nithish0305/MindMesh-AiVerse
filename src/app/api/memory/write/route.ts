import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Memory write endpoint - will evolve into agentic memory management
// Uses admin client to bypass RLS for now (Phase 1)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('memories')
      .insert([
        { 
          content: 'Test memory from MindMesh Phase 1',
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Memory stored successfully',
      data
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

