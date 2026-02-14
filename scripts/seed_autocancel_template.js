import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const autoCancelTemplate = {
    id: 'auto_cancelled',
    name: 'Auto-Cancelamento (24h)',
    content: `❌ *Hola {{nome_cliente}}*

Tu pedido #{{numero_pedido}} ha sido cancelado automáticamente por falta de confirmación.

Si deseas realizar un nuevo pedido, visita nuestra tienda:
{{url_loja}}

¡Gracias por tu interés! 🛍️`,
    variables: ['nome_cliente', 'numero_pedido', 'url_loja']
};

async function seedAutoCancelTemplate() {
    console.log('Seeding auto-cancel template...');

    try {
        const { error } = await supabase
            .from('message_templates')
            .upsert(autoCancelTemplate, { onConflict: 'id' });

        if (error) {
            console.error('Error inserting template:', error);
            process.exit(1);
        }

        console.log('✅ Auto-cancel template inserted/updated');
        process.exit(0);
    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

seedAutoCancelTemplate();
