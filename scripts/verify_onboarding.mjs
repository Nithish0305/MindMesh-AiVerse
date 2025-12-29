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

const PROMPT_FILE = 'src/lib/mentor/onboarding-prompt.ts';

async function testExtraction() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('No OPENROUTER_API_KEY found');
        return;
    }

    // Read the prompt
    const promptContent = fs.readFileSync(path.resolve(process.cwd(), PROMPT_FILE), 'utf-8');
    const promptMatch = promptContent.match(/export const ONBOARDING_AGENT_PROMPT = `([\s\S]*)`/);
    const prompt = promptMatch ? promptMatch[1] : '';

    if (!prompt) {
        console.error('Failed to extract prompt from file');
        return;
    }

    const userInput = `
EDUCATION:
Data science

WORK EXPERIENCE:
AI driven marketAing analyst

SKILLS:
(None provided)

CAREER GOALS:
(None provided)
`.trim();

    console.log('Testing Profile Extraction...');

    const messages = [
        { role: 'system', content: prompt },
        { role: 'user', content: userInput }
    ];

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3-8b-instruct:free',
                messages,
                response_format: { type: 'json_object' }
            }),
        });

        const data = await response.json();
        if (data.error) {
            console.error('OpenRouter Error:', JSON.stringify(data.error, null, 2));
            return;
        }
        if (!data.choices) {
            console.error('Unexpected Response Structure:', JSON.stringify(data, null, 2));
            return;
        }
        const content = data.choices[0].message.content;
        console.log('\n--- AGENT RESPONSE ---\n');
        console.log(content);

        const profile = JSON.parse(content);

        console.log('\n--- VERIFICATION CHECKLIST ---');
        console.log('1. Has confidenceScore?', !!profile.confidenceScore);
        console.log('2. Education has source/confidence?', profile.education?.[0]?.source && profile.education?.[0]?.confidence !== undefined);
        console.log('3. WorkExp has source/confidence?', profile.workExperience?.[0]?.source && profile.workExperience?.[0]?.confidence !== undefined);
        console.log('4. Skills has source/confidence?', profile.skills?.technical?.[0]?.source && profile.skills?.technical?.[0]?.confidence !== undefined);
        console.log('5. Inferred attributes present?', profile.inferredAttributes?.length > 0);

        if (profile.confidenceScore > 0) {
            console.log('\n✅ Verification Script Completed Successfully.');
        } else {
            console.log('\n❌ Verification Failed: Empty profile or missing fields.');
        }

    } catch (error) {
        console.error('Verification error:', error);
    }
}

testExtraction();
