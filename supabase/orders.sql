-- Tabela de pedidos do checkout próprio (PIX via PixGate).
-- Rode uma vez no Lovable Cloud (SQL / peça ao Lovable para aplicar esta migration).

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  status text not null default 'PENDING', -- PENDING | PAID | CANCELLED | REVERSED
  transaction_id text unique,              -- id da cobrança na PixGate
  amount numeric(12, 2) not null,
  shipping_id text not null,
  shipping_price numeric(12, 2) not null default 0,
  items jsonb not null,                    -- [{ id, name, quantity, unit_price }]
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_document text not null,
  address jsonb not null                   -- { zipcode, street, number, neighborhood, complement, city, state }
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Só o servidor (service role) lê e grava; nenhum acesso público.
alter table public.orders enable row level security;
