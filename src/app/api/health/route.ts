import { NextResponse } from 'next/server'

// Health check endpoint for monitoring and validation
export async function GET() {
  return NextResponse.json({ ok: true })
}

