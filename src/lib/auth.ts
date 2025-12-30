// src/lib/auth.ts

/**
 * Temporary user resolver.
 *
 * This abstracts user identity so that:
 * - We can build agent + Notion pipelines now
 * - Supabase Auth can be integrated later
 * - No downstream refactoring is required
 */
export async function getCurrentUserId(): Promise<string> {
    // TEMPORARY user ID
    // Simulates an authenticated user
    return "user_demo_001";
}
