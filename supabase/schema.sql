-- ============================================================
-- Esquema de la base de datos de Espou Manager en Supabase.
-- Ejecuta TODO esto en: Panel de Supabase → SQL Editor → New query → Run.
-- Se puede ejecutar varias veces sin error.
-- ============================================================

-- Tabla clave-valor: cada módulo guarda su bloque de datos aquí.
create table if not exists public.kv (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);

-- Seguridad a nivel de fila.
alter table public.kv enable row level security;

-- POLÍTICAS PERMISIVAS (sin autenticación todavía).
-- ⚠️ Cualquiera con la URL y la anon key puede leer/escribir.
--    Antes de exponerlo en internet, añade login y restringe estas políticas.
drop policy if exists "kv_select" on public.kv;
drop policy if exists "kv_insert" on public.kv;
drop policy if exists "kv_update" on public.kv;
drop policy if exists "kv_delete" on public.kv;

create policy "kv_select" on public.kv for select using (true);
create policy "kv_insert" on public.kv for insert with check (true);
create policy "kv_update" on public.kv for update using (true) with check (true);
create policy "kv_delete" on public.kv for delete using (true);

-- Tiempo real: añade la tabla a la publicación solo si no está ya.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kv'
  ) then
    alter publication supabase_realtime add table public.kv;
  end if;
end $$;

-- Fuerza a la API REST a recargar el esquema (evita el 404 "table not found").
notify pgrst, 'reload schema';
