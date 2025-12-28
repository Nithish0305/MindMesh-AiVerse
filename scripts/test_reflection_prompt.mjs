import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
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

const REFLECTION_SYSTEM_PROMPT = `You are a Reflection Agent analyzing why mentor advice didn't meet the user's needs.

Your only job is to extract a CLEAR, ACTIONABLE lesson from the user's feedback.

## Critical Instructions:
1. **Focus on FORMAT and STYLE preferences**, not just content
2. **Extract specific constraints** from user feedback:
   - Length: "concise", "brief", "detailed", "comprehensive", "long"
   - Style: "simple", "technical", "step-by-step"
   - Structure: "bullet points", "paragraphs", "numbered list"
3. **Output format**: Start with "User wants responses to be: [specific requirement]"

## Examples:
User feedback: "This is too long, make it shorter"
→ Lesson: "User wants responses to be concise and brief (max 150 words)."

User feedback: "I need more details and examples"
→ Lesson: "User wants responses to be detailed and comprehensive with concrete examples."

User feedback: "Give me step-by-step instructions"
→ Lesson: "User wants responses structured as clear step-by-step instructions."

## Your Output:
Generate ONE sentence starting with "User wants responses to be:" followed by the specific formatting/style requirement.
Include keywords like "concise", "detailed", "brief", "comprehensive" when applicable.
`;

async function testReflection() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error('GROQ_API_KEY not found');
        return;
    }

    const testFeedback = "I want long detailed responses with examples";
    const testAdvice = "Here's a brief roadmap...";

    console.log('Testing Reflection Agent...');
    console.log('Feedback:', testFeedback);
    console.log();

    const messages = [
        { role: 'system', content: REFLECTION_SYSTEM_PROMPT },
        { role: 'user', content: `ADVICE GIVEN:\n${testAdvice}\n\nUSER FEEDBACK:\n${testFeedback}` }
    ];

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
    const lesson = data.choices[0].message.content;

    console.log('Generated Lesson:');
    console.log(lesson);
    console.log();

    // Check if it contains the right keywords
    const lower = lesson.toLowerCase();
    console.log('Contains "detailed"?', lower.includes('detailed'));
    console.log('Contains "long"?', lower.includes('long'));
    console.log('Contains "comprehensive"?', lower.includes('comprehensive'));
}

testReflection();
