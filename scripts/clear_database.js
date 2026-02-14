import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function clearDatabase() {
    console.log('\n⚠️  ATENÇÃO: Esta operação irá DELETAR TODOS OS DADOS do banco de dados!\n');
    console.log('Tabelas que serão limpas:');
    console.log('  - orders (pedidos)');
    console.log('  - items (itens dos pedidos)');
    console.log('  - shopify_configs (configurações Shopify)');
    console.log('  - message_templates (templates de mensagens)');
    console.log('\n⚠️  Esta ação NÃO PODE SER DESFEITA!\n');

    const confirmation1 = await question('Digite "LIMPAR" para continuar: ');

    if (confirmation1 !== 'LIMPAR') {
        console.log('❌ Operação cancelada.');
        rl.close();
        process.exit(0);
    }

    const confirmation2 = await question('Tem certeza absoluta? Digite "SIM" para confirmar: ');

    if (confirmation2 !== 'SIM') {
        console.log('❌ Operação cancelada.');
        rl.close();
        process.exit(0);
    }

    console.log('\n🗑️  Iniciando limpeza do banco de dados...\n');

    try {
        // Delete items first (foreign key constraint)
        console.log('Deletando items...');
        const { error: itemsError } = await supabase
            .from('items')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (itemsError) {
            console.error('❌ Erro ao deletar items:', itemsError);
        } else {
            console.log('✅ Items deletados');
        }

        // Delete orders
        console.log('Deletando orders...');
        const { error: ordersError } = await supabase
            .from('orders')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (ordersError) {
            console.error('❌ Erro ao deletar orders:', ordersError);
        } else {
            console.log('✅ Orders deletados');
        }

        // Optional: Ask if user wants to delete configs and templates
        console.log('\n⚠️  Deseja também deletar configurações e templates?');
        const deleteConfigs = await question('Digite "SIM" para deletar configurações Shopify e templates: ');

        if (deleteConfigs === 'SIM') {
            // Delete shopify configs
            console.log('Deletando shopify_configs...');
            const { error: configsError } = await supabase
                .from('shopify_configs')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (configsError) {
                console.error('❌ Erro ao deletar shopify_configs:', configsError);
            } else {
                console.log('✅ Shopify configs deletados');
            }

            // Delete message templates
            console.log('Deletando message_templates...');
            const { error: templatesError } = await supabase
                .from('message_templates')
                .delete()
                .neq('id', 'never-match'); // Delete all

            if (templatesError) {
                console.error('❌ Erro ao deletar message_templates:', templatesError);
            } else {
                console.log('✅ Message templates deletados');
            }
        } else {
            console.log('⏭️  Configurações e templates mantidos');
        }

        console.log('\n✅ Limpeza do banco de dados concluída com sucesso!\n');

    } catch (err) {
        console.error('\n❌ Erro durante a limpeza:', err);
        process.exit(1);
    } finally {
        rl.close();
        process.exit(0);
    }
}

console.log('═══════════════════════════════════════════════════════');
console.log('   🗑️  LIMPEZA DO BANCO DE DADOS - OrderFlow Pro');
console.log('═══════════════════════════════════════════════════════');

clearDatabase();
