
import fs from 'fs';
import path from 'path';

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

async function callGroq(messages, apiKey, model) {
    console.log('Sending request to Groq...');
    console.log('Model:', model);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model,
            messages,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    console.log('Raw Groq Response:', JSON.stringify(data, null, 2));
    return data;
}

async function main() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error('No GROQ_API_KEY found in environment');
        return;
    }

    const messages = [
        { role: 'user', content: 'Say "Hello Groq"' }
    ];

    const chatModel = process.env.CHAT_MODEL || 'llama-3.1-8b-instant';
    const planningModel = process.env.PLANNING_MODEL || 'llama-3.1-70b-versatile';

    const models = [chatModel, planningModel];

    for (const model of models) {
        if (!model) continue;
        console.log(`\nTesting model: ${model}...`);
        try {
            const data = await callGroq(messages, apiKey, model);
            if (data.choices?.[0]?.message?.content?.trim()) {
                console.log(`SUCCESS! Model ${model} returned content.`);
                console.log('Content:', data.choices[0].message.content);
            } else {
                console.log(`Model ${model} returned valid response but empty content.`);
            }
        } catch (error) {
            console.log(`Model ${model} failed:`, error.message.split('\n')[0]);
        }
    }
}

main();
