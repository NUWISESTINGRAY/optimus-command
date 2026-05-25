
-- Enable required extensions
create extension if not exists vector;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Augment documents
alter table public.documents
  add column if not exists source text default 'manual',
  add column if not exists source_url text,
  add column if not exists summary text,
  add column if not exists auto boolean default false;

-- Knowledge topics watchlist
create table if not exists public.knowledge_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  query text not null,
  frequency text not null default 'daily',
  active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.knowledge_topics enable row level security;
drop policy if exists "Users manage own topics" on public.knowledge_topics;
create policy "Users manage own topics" on public.knowledge_topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Document chunks with embeddings (1536-dim openai/text-embedding-3-small)
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null,
  chunk_idx int not null default 0,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
alter table public.document_chunks enable row level security;
drop policy if exists "Users manage own chunks" on public.document_chunks;
create policy "Users manage own chunks" on public.document_chunks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists document_chunks_document_idx
  on public.document_chunks(document_id);

-- Semantic search function (security definer, scoped by user_id)
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  _user_id uuid default auth.uid()
)
returns table (
  document_id uuid,
  title text,
  source text,
  source_url text,
  chunk text,
  similarity float
)
language sql stable security definer set search_path = public as $$
  select
    d.id as document_id,
    d.title,
    d.source,
    d.source_url,
    c.content as chunk,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where c.user_id = _user_id
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count
$$;

-- Storage bucket for knowledge uploads
insert into storage.buckets (id, name, public) values ('knowledge-uploads', 'knowledge-uploads', false)
  on conflict (id) do nothing;

drop policy if exists "Users upload own knowledge files" on storage.objects;
create policy "Users upload own knowledge files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'knowledge-uploads' and auth.uid()::text = (storage.foldername(name))[1]
  );
drop policy if exists "Users read own knowledge files" on storage.objects;
create policy "Users read own knowledge files" on storage.objects
  for select to authenticated using (
    bucket_id = 'knowledge-uploads' and auth.uid()::text = (storage.foldername(name))[1]
  );
drop policy if exists "Users delete own knowledge files" on storage.objects;
create policy "Users delete own knowledge files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'knowledge-uploads' and auth.uid()::text = (storage.foldername(name))[1]
  );
