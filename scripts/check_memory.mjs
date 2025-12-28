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

async function checkMemories() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase credentials (need SUPABASE_SERVICE_ROLE_KEY in .env.local)');
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Fetching recent memories...');

    const { data: memories, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching memories:', error.message);
        return;
    }

    if (memories.length === 0) {
        console.log('No memories found.');
        return;
    }

    console.log('\n--- Recent Memories ---');
    memories.forEach((mem, index) => {
        console.log(`\n[${index + 1}] ID: ${mem.id}`);
        console.log(`Created: ${new Date(mem.created_at).toLocaleString()}`);
        console.log(`Type: ${mem.metadata?.type || 'unknown'}`);
        console.log(`Content: ${mem.content.substring(0, 100)}${mem.content.length > 100 ? '...' : ''}`);
        console.log('---');
    });
}

checkMemories();
