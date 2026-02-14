import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function runMigration() {
    try {
        console.log('Running message_templates migration...');

        const sql = fs.readFileSync('./supabase/migration_message_templates.sql', 'utf8');

        // Split by semicolon and execute each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            console.log('Executing:', statement.substring(0, 50) + '...');
            const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
            if (error) {
                console.error('Error:', error);
            }
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

runMigration();
