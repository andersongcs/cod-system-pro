-- Create shopify_configs table (if not exists)
create table if not exists public.shopify_configs (
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
