
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function update() {
    const { data, error } = await supabase
        .from('orders')
        .update({ customer_phone: '554491684928' }) // Connected number (self-test)
        .eq('order_number', '1019')
        .select();

    if (error) console.error(error);
    else console.log('Updated:', data);
}

update();
