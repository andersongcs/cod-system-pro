import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const templates = [
    {
        id: 'confirmation',
        content: `🛍️ *{greeting}*

Hemos recibido tu pedido #{orderNumber} por un valor de *{total}*.

📦 *Productos:*
{items}

📍 *Dirección de entrega:*
{address}

💰 *Forma de pago:* Contra entrega

⚠️ *IMPORTANTE:* Para evitar gastos logísticos innecesarios y asegurar que el repartidor te encuentre en casa, *confirma solo si estás 100% seguro/a de recibir el pedido y realizar el pago en efectivo.*

Al confirmar, reservaremos tu producto y activaremos el envío de inmediato. 🚛

Por favor, confirma tu pedido respondiendo con el número de una opción:

1️⃣ *CONFIRMAR* (Para enviar ahora)
2️⃣ *CANCELAR* (No enviar)

Responde *1* o *2*👇`,
        variables: ["greeting", "orderNumber", "total", "items", "address"]
    },
    {
        id: 'confirmed',
        name: 'Pedido Confirmado',
        content: `✅ Pedido confirmado com sucesso! Logo enviaremos o rastreio.`,
        variables: ["nome_cliente", "numero_pedido"]
    },
    {
        id: 'cancelled',
        name: 'Pedido Cancelado',
        content: `❌ Pedido cancelado e estornado na loja com sucesso.`,
        variables: ["nome_cliente", "numero_pedido"]
    },
    {
        id: 'address_update',
        name: 'Atualizar Endereço',
        content: `📍 Por favor, envie o novo endereço completo nesta conversa.`,
        variables: ["nome_cliente", "numero_pedido"]
    }
];

async function restoreTemplates() {
    console.log('Restoring templates...');

    for (const template of templates) {
        // Check if exists first to avoid overwriting if user has one already (though clean DB implies none)
        const { data: existing } = await supabase
            .from('message_templates')
            .select('id')
            .eq('id', template.id)
            .maybeSingle();

        if (!existing) {
            const { error } = await supabase
                .from('message_templates')
                .insert(template);

            if (error) {
                console.error(`Error restoring ${template.id}:`, error.message);
            } else {
                console.log(`Restored: ${template.name}`);
            }
        } else {
            console.log(`Skipped (already exists): ${template.name}`);
        }
    }

    console.log('Done!');
}

restoreTemplates();
