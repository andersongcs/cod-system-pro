# Limpeza do Banco de Dados

## ⚠️ ATENÇÃO

Este script deleta **TODOS OS DADOS** do banco de dados. Use com extremo cuidado!

## Como usar

```bash
node clear_database.js
```

## O que será deletado

Por padrão:
- ✅ Todos os pedidos (`orders`)
- ✅ Todos os itens dos pedidos (`items`)

Opcional (você será perguntado):
- ⚠️ Configurações Shopify (`shopify_configs`)
- ⚠️ Templates de mensagens (`message_templates`)

## Proteções

O script possui dupla confirmação:
1. Digite `LIMPAR` para continuar
2. Digite `SIM` para confirmar

## Quando usar

- Antes de colocar o sistema em produção (limpar dados de teste)
- Para resetar o sistema completamente
- Para remover pedidos antigos de desenvolvimento

## ⚠️ IMPORTANTE

Esta operação **NÃO PODE SER DESFEITA**. Certifique-se de fazer backup antes se necessário.

## Backup antes de limpar

```bash
# Criar backup
node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const backup = async () => {
    const { data: orders } = await supabase.from('orders').select('*, items(*)');
    fs.writeFileSync('backup-orders.json', JSON.stringify(orders, null, 2));
    console.log('Backup salvo em backup-orders.json');
};

backup();
" --input-type=module
```
