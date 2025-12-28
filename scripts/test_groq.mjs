import fs from 'fs';
import path from 'path';

// Minimal implementation of env loading
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
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: messages
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq API Error: ${response.status} ${err}`);
    }

    const data = await response.json();
    console.log('Groq Response:', JSON.stringify(data, null, 2));
    return data.choices?.[0]?.message?.content;
}

async function main() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error('No GROQ_API_KEY found in environment');
        return;
    }

    const messages = [
        { role: 'user', content: 'Say "Hello World"' }
    ];

    // Common Groq models: llama-3.1-8b-instant, mixtral-8x7b-32768
    const models = [
        'llama-3.1-8b-instant',
        'llama-3.2-11b-vision-preview'
    ];
    for (const model of models) {
        console.log(`\nTesting model: ${model}...`);
        try {
            const result = await callGroq(messages, apiKey, model);
            if (result) {
                console.log(`SUCCESS! Model ${model} returned content.`);
                console.log('Content:', result);
                return; // Success
            }
        } catch (error) {
            console.log(`Model ${model} failed:`, error.message);
        }
    }

    console.log('\nAll Groq models failed.');
}

main();
