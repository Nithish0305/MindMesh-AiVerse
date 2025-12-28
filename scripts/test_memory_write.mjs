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

async function testWrite() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Use a hardcoded user ID from the previous check_memory output (if available)
    // or a placeholder if we just want to test if the table accepts writes.
    // The User ID from the logs was: 3466dffb-9ace-4752-8fa6-3f3cb4474975
    const userId = '3466dffb-9ace-4752-8fa6-3f3cb4474975';

    console.log(`Attempting to write test memory for user ${userId}...`);

    const { data, error } = await supabase
        .from('memories')
        .insert({
            user_id: userId,
            content: 'Debug Test Memory Script - Direct Write',
            metadata: { type: 'debug' }
        })
        .select()
        .single();

    if (error) {
        console.error('Write failed:', error.message);
        if (error.code) console.error('Error code:', error.code);
    } else {
        console.log('Write SUCCESS!');
        console.log('New Memory ID:', data.id);
    }
}

testWrite();
