-- Create message_templates table
create table public.message_templates (
  id text primary key,
  name text not null,
  content text not null,
  variables text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.message_templates enable row level security;

-- Policies (public access for development)
create policy "Allow public read access" on public.message_templates for select using (true);
create policy "Allow public insert access" on public.message_templates for insert with check (true);
create policy "Allow public update access" on public.message_templates for update using (true);

-- Insert default templates
insert into public.message_templates (id, name, content, variables) values
(
  'confirmation',
  'Mensagem de Confirmação',
  'Olá {{nome_cliente}}! 👋

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

Aguardamos sua resposta!',
  array['nome_cliente', 'numero_pedido', 'itens', 'endereco', 'valor_total']
),
(
  'confirmed',
  'Pedido Confirmado',
  '✅ Pedido confirmado com sucesso! Logo enviaremos o rastreio.',
  array[]::text[]
),
(
  'cancelled',
  'Pedido Cancelado',
  '❌ Pedido cancelado conforme solicitado.',
  array[]::text[]
),
(
  'address_update',
  'Atualização de Endereço',
  '{{nome_cliente}}, por favor envie seu novo endereço completo:

📍 Rua, número e complemento
🏙️ Cidade e estado
📮 CEP

Aguardamos sua resposta para atualizar o pedido #{{numero_pedido}}.',
  array['nome_cliente', 'numero_pedido']
);
