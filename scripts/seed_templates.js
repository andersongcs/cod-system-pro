import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const defaultTemplates = [
    {
        id: 'confirmation',
        name: 'Mensagem de Confirmação',
        content: `Olá {{nome_cliente}}! 👋

Recebemos seu pedido #{{numero_pedido}} e gostaríamos de confirmar as informações:

📦 *Itens:*
{{itens}}

📍 *Endereço de entrega:*
{{endereco}}

💰 *Valor total:* {{valor_total}}

Por favor, confirme seu pedido respondendo:

✅ *1* - Confirmar pedido
❌ *2* - Cancelar pedido
📍 *3* - Atualizar endereço

Aguardamos sua resposta!`,
        variables: ['nome_cliente', 'numero_pedido', 'itens', 'endereco', 'valor_total']
    },
    {
        id: 'confirmed',
        name: 'Pedido Confirmado',
        content: '✅ Pedido confirmado com sucesso! Logo enviaremos o rastreio.',
        variables: []
    },
    {
        id: 'cancelled',
        name: 'Pedido Cancelado',
        content: '❌ Pedido cancelado conforme solicitado.',
        variables: []
    },
    {
        id: 'address_update',
        name: 'Atualização de Endereço',
        content: `{{nome_cliente}}, por favor envie seu novo endereço completo:

📍 Rua, número e complemento
🏙️ Cidade e estado
📮 CEP

Aguardamos sua resposta para atualizar o pedido #{{numero_pedido}}.`,
        variables: ['nome_cliente', 'numero_pedido']
    }
];

async function seedTemplates() {
    try {
        console.log('Seeding message templates...');

        const { data, error } = await supabase
            .from('message_templates')
            .upsert(defaultTemplates, { onConflict: 'id' });

        if (error) {
            console.error('Error seeding templates:', error);
        } else {
            console.log('Templates seeded successfully!');
        }
    } catch (err) {
        console.error('Seed failed:', err);
    }
}

seedTemplates();
