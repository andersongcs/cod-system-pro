-- Create orders table
create table public.orders (
  id uuid not null default gen_random_uuid(),
  shopify_order_id text not null,
  order_number text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address jsonb not null default '{}'::jsonb,
  total_value numeric not null default 0,
  currency text not null default 'COP',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  message_sent_at timestamptz,
  response_received_at timestamptz,
  timeline jsonb not null default '[]'::jsonb,
  shopify_tags text[] default array[]::text[],
  
  constraint orders_pkey primary key (id)
);

-- Create items table
create table public.items (
  id uuid not null default gen_random_uuid(),
  order_id uuid not null,
  name text not null,
  quantity integer not null default 1,
  price numeric not null default 0,
  sku text,
  variant text,
  
  constraint items_pkey primary key (id),
  constraint items_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade
);

-- Search index for orders
create index orders_shopify_order_id_idx on public.orders(shopify_order_id);
create index orders_customer_phone_idx on public.orders(customer_phone);
create index orders_status_idx on public.orders(status);

-- Enable RLS
alter table public.orders enable row level security;
alter table public.items enable row level security;

-- Policies (for development/public access - MODIFY FOR PRODUCTION)
-- Allowing anon access for the purpose of the demo/shadcn template context
create policy "Allow public read access" on public.orders for select using (true);
create policy "Allow public insert access" on public.orders for insert with check (true);
create policy "Allow public update access" on public.orders for update using (true);

create policy "Allow public read access" on public.items for select using (true);
create policy "Allow public insert access" on public.items for insert with check (true);
create policy "Allow public update access" on public.items for update using (true);

-- Create shopify_configs table
create table public.shopify_configs (
  id uuid not null default gen_random_uuid(),
  shop_url text not null,
  access_token text not null,
  webhook_secret text,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint shopify_configs_pkey primary key (id)
);

-- Enable RLS for shopify_configs
alter table public.shopify_configs enable row level security;

-- Policies for shopify_configs (dev/public for now)
create policy "Allow public read access" on public.shopify_configs for select using (true);
create policy "Allow public insert access" on public.shopify_configs for insert with check (true);
create policy "Allow public update access" on public.shopify_configs for update using (true);
