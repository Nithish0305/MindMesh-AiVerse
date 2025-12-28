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

async function callHuggingFace(messages, apiKey, model) {
    console.log('Sending request to Hugging Face...');
    console.log('Model:', model);

    // Convert messages to prompt for simple models if needed, 
    // but most Instruct models on HF support /chat/completions style via TGI or similar, 
    // or we use the specific task URL. 
    // For simplicity, let's try the serverless inference API default structure.

    // Note: standardized chat/completions is supported by some endpoints.
    // We'll try the OpenAI-compatible endpoint if available, or the standard query.

    // OpenAI Compatible Endpoint on new Router
    const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 500,
            stream: false
        })
    });

    if (!response.ok) {
        // If /v1/chat/completions fails (404), likely model doesn't support it or endpoint differs.
        console.log(`OpenAI compatible endpoint failed (${response.status}), trying standard task API...`);
        // Fallback to standard text-generation task
        // This requires converting messages to a single string prompt.
        // For test, just use last user message.
        const lastMsg = messages[messages.length - 1].content;

        const response2 = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: `[INST] ${lastMsg} [/INST]`,
                parameters: { max_new_tokens: 200 }
            })
        });

        if (!response2.ok) {
            const err = await response2.text();
            throw new Error(`HF Standard API Error: ${response2.status} ${err}`);
        }

        const data = await response2.json();
        console.log('HF Standard Response:', JSON.stringify(data, null, 2));
        // Standard API returns array: [{ generated_text: "..." }]
        return data[0]?.generated_text || data;
    }

    const data = await response.json();
    console.log('HF OpenAI-Compatible Response:', JSON.stringify(data, null, 2));
    return data.choices?.[0]?.message?.content;
}

async function main() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
        console.error('No HUGGINGFACE_API_KEY found in environment');
        return;
    }

    const messages = [
        { role: 'user', content: 'Say "Hello World"' }
    ];

    const models = [
        'mistralai/Mistral-7B-Instruct-v0.3',
        'meta-llama/Meta-Llama-3-8B-Instruct'
    ];

    for (const model of models) {
        console.log(`\nTesting model: ${model}...`);
        try {
            const result = await callHuggingFace(messages, apiKey, model);
            if (result) {
                console.log(`SUCCESS! Model ${model} returned content.`);
                // console.log('Content:', result);
                return; // Success
            }
        } catch (error) {
            console.log(`Model ${model} failed:`, error.message);
        }
    }

    console.log('\nAll HF models failed.');
}

main();
