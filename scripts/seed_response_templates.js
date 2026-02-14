import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const responseTemplates = [
    {
        id: 'confirmed',
        name: 'Resposta - Pedido Confirmado',
        content: `✅ Pedido confirmado com sucesso! Logo enviaremos o rastreio.`,
        variables: []
    },
    {
        id: 'cancelled',
        name: 'Resposta - Pedido Cancelado',
        content: `❌ Pedido cancelado e estornado na loja com sucesso.`,
        variables: []
    },
    {
        id: 'address_update',
        name: 'Resposta - Solicitar Novo Endereço',
        content: `📍 Por favor, envie o novo endereço completo nesta conversa.`,
        variables: []
    }
];

async function seedResponseTemplates() {
    console.log('Seeding response templates...');

    try {
        for (const template of responseTemplates) {
            const { error } = await supabase
                .from('message_templates')
                .upsert(template, { onConflict: 'id' });

            if (error) {
                console.error(`Error inserting template ${template.id}:`, error);
            } else {
                console.log(`✅ Template ${template.id} inserted/updated`);
            }
        }

        console.log('\n✅ All response templates seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

seedResponseTemplates();
