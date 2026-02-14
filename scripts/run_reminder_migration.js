import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Supabase Key:', supabaseKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Running reminder fields migration...');

    try {
        // Use the SQL editor approach - we'll add columns directly
        const { data, error } = await supabase
            .from('orders')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Cannot connect to orders table:', error);
            console.log('\n⚠️  Please run this SQL manually in Supabase Dashboard > SQL Editor:');
            console.log(`
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS first_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS second_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_awaiting_response 
ON orders(status, message_sent_at) 
WHERE status = 'awaiting_response';
            `);
            process.exit(1);
        }

        console.log('✅ Connection successful!');
        console.log('\n⚠️  Please run the migration SQL manually in Supabase Dashboard > SQL Editor');
        console.log('The SQL is in: supabase/migration_reminders.sql');
        process.exit(0);
    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

runMigration();
