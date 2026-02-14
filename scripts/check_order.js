
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', '1019') // Ensure this is a string if that's how it's stored
        .single();

    if (error) console.error(error);
    else console.log(order);
}

check();
