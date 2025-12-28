import { createInterface } from 'readline';
import fs from 'fs';
import path from 'path';

// Minimal implementation of env loading since we can't depend on next.js here
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

async function callOpenRouter(messages, apiKey, model) {
    console.log('Sending request to OpenRouter...');
    console.log('Model:', model || 'mistralai/mistral-7b-instruct:free');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://mindmesh.app',
            'X-Title': 'MindMesh',
        },
        body: JSON.stringify({
            model: model || 'mistralai/mistral-7b-instruct:free',
            messages,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    console.log('Raw OpenRouter Response:', JSON.stringify(data, null, 2));
    return data;
}

async function main() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('No OPENROUTER_API_KEY found in environment');
        return;
    }

    const messages = [
        { role: 'user', content: 'Say "Hello World"' }
    ];

    const models = [
        'qwen/qwen-2-7b-instruct:free',
        'microsoft/phi-3-mini-128k-instruct:free',
        'meta-llama/llama-3.1-8b-instruct:free',
        'openchat/openchat-7b:free',
        'gryphe/mythomax-l2-13b:free',
        'mistralai/mistral-7b-instruct:free', // Put this last as we know it returns empty
    ];

    for (const model of models) {
        console.log(`\nTesting model: ${model}...`);
        try {
            const data = await callOpenRouter(messages, apiKey, model);
            if (data.choices?.[0]?.message?.content?.trim()) {
                console.log(`SUCCESS! Model ${model} returned content.`);
                console.log('Content:', data.choices[0].message.content);
                return;
            }
            console.log(`Model ${model} returned valid response but empty content or missing structure.`);
        } catch (error) {
            console.log(`Model ${model} failed:`, error.message.split('\n')[0]);
        }
    }

    console.log('\nAll models failed.');
}

main();
