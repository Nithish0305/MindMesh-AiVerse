import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Mock env
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            content.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
                }
            });
        }
    } catch (e) {
        console.error('Failed to load .env.local', e);
    }
}

loadEnv();

// --- Inline Logic from memory.ts ---
function formatMemoriesForPrompt(memories) {
    if (memories.length === 0) {
        return 'No past memories available.';
    }

    const reflections = memories.filter(m => m.metadata?.type === 'reflection');
    const history = memories.filter(m => m.metadata?.type !== 'reflection');

    let formattedContext = '';

    if (reflections.length > 0) {
        const reflectionsText = reflections
            .map(m => `- [LESSON LEARNED]: ${m.content}`)
            .join('\n');
        formattedContext += `## PAST MISTAKES & LESSONS (CRITICAL)\n${reflectionsText}\n\n`;
    }

    const historyText = history
        .reverse()
        .map((mem) => {
            const date = new Date(mem.created_at).toLocaleDateString();
            const type = mem.metadata?.type || 'unknown';
            const label = type === 'mentor_advice' ? 'Mentor' : 'User';
            return `[${date}] ${label}: ${mem.content}`;
        })
        .join('\n');

    formattedContext += `## RECENT CONVERSATION HISTORY\n${historyText}`;
    return formattedContext;
}

// --- Inline Logic from llm.ts (Simplified) ---
async function callLLM(messages) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return { error: 'No GROQ_API_KEY' };

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            return { error: data.error?.message || 'Groq API Error' };
        }
        return { content: data.choices[0].message.content };
    } catch (err) {
        return { error: err.message };
    }
}

const CORE_MENTOR_SYSTEM_PROMPT = `You are a long-term career mentor who has been working with this user over time. Your role is to provide adaptive, grounded career advice that evolves with the user's journey.

## CRITICAL: LEARNING FROM MISTAKES
- You have access to "Legacy Lessons" from past mistakes in the "PAST MISTAKES & LESSONS" section.
- **YOU MUST PRIORITIZE THESE LESSONS ABOVE ALL ELSE.**
- If a lesson says to "be concise" or "shorten response", you MUST output a very short response.
`;

async function testFlow() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 0. Get a valid user ID (most recent memory)
    console.log('0. Finding active user...');
    const { data: recentMem } = await supabase
        .from('memories')
        .select('user_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!recentMem) {
        console.error('No memories found at all. Cannot reproduce.');
        return;
    }

    const userId = recentMem.user_id;
    console.log(`Using User ID: ${userId}`);

    // 1. Fetch memories
    console.log('1. Fetching memories...');
    const { data: memories, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(8);

    if (error) {
        console.error('Fetch failed:', error);
        return;
    }

    console.log(`Found ${memories.length} memories.`);

    console.log('2. Formatting memories...');
    let memoryContext;
    try {
        memoryContext = formatMemoriesForPrompt(memories);
        console.log('Context (truncated):', memoryContext.substring(0, 300) + '...');
    } catch (e) {
        console.error('Formatting failed:', e);
        return;
    }

    console.log('3. Calling LLM...');
    const messages = [
        {
            role: 'system',
            content: `${CORE_MENTOR_SYSTEM_PROMPT}\n\n${memoryContext}`,
        },
        {
            role: 'user',
            content: 'Debug Test Question',
        },
    ];

    const result = await callLLM(messages);
    if (result.error) {
        console.error('LLM Failed:', result.error);
    } else {
        console.log('LLM Success (truncated):', result.content.substring(0, 100));
    }
}

testFlow();
