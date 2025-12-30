import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // Edge middleware can only refresh cookies, not create Supabase clients
    // Auth checks are delegated to server components via checkAuth() helper
    return NextResponse.next({
        request: {
            headers: request.headers,
        },
    })
}
