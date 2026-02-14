import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const reminderTemplates = [
    {
        id: 'first_reminder',
        name: 'Primeiro Lembrete (2h)',
        content: `👋 *Hola {{nome_cliente}}*

Te recordamos que aún no has confirmado tu pedido #{{numero_pedido}}.

Por favor, confirma tu pedido para que podamos procesarlo y enviarlo lo antes posible.

Responde *1* para Confirmar, *2* para Cancelar o *3* para Corregir Dirección.`,
        variables: ['nome_cliente', 'numero_pedido']
    },
    {
        id: 'second_reminder',
        name: 'Segundo Lembrete (6h - Urgente)',
        content: `⚠️ *Hola {{nome_cliente}}*

Tu pedido #{{numero_pedido}} aún no ha sido confirmado.

⏰ *IMPORTANTE:* Si no confirmas tu pedido en las próximas horas, será cancelado automáticamente.

Responde *1* para Confirmar, *2* para Cancelar o *3* para Corregir Dirección.`,
        variables: ['nome_cliente', 'numero_pedido']
    }
];

async function seedReminderTemplates() {
    console.log('Seeding reminder templates...');

    try {
        for (const template of reminderTemplates) {
            const { error } = await supabase
                .from('message_templates')
                .upsert(template, { onConflict: 'id' });

            if (error) {
                console.error(`Error inserting template ${template.id}:`, error);
            } else {
                console.log(`✅ Template ${template.id} inserted/updated`);
            }
        }

        console.log('\n✅ All reminder templates seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

seedReminderTemplates();
