-- ============================================================
--  Esquema para el tablero de anuncios (Supabase / Postgres)
--  Ejecutar UNA SOLA VEZ en: proyecto de Supabase → SQL Editor → New query → Run
-- ============================================================

create table if not exists announcements (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  event_date date,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists videos (
  id bigint generated always as identity primary key,
  url text not null,
  title text,
  youtube_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists birthdays (
  id bigint generated always as identity primary key,
  name text not null,
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  photo_url text,
  created_at timestamptz not null default now()
);

-- la pantalla muestra el versículo automático del día (igual que antes).
create table if not exists verse (
  id smallint primary key default 1 check (id = 1),
  text text,
  reference text,
  updated_at timestamptz not null default now()
);

-- ---------- Videos con los que arranca la lista la primera vez ----------
insert into videos (url, title, youtube_id)
select * from (values
  ('https://youtu.be/l_6e2-ZsKpE?si=xs_rXl1LzbHlgNFi', null::text, 'l_6e2-ZsKpE'),
  ('https://youtu.be/NaAGVg86AG0?si=Nuscp4WmvAojRjit', null::text, 'NaAGVg86AG0')
) as v(url, title, youtube_id)
where not exists (select 1 from videos);

-- ---------- Seguridad (RLS) ----------


alter table announcements enable row level security;
alter table videos enable row level security;
alter table birthdays enable row level security;
alter table verse enable row level security;

create policy "anon full access" on announcements for all using (true) with check (true);
create policy "anon full access" on videos for all using (true) with check (true);
create policy "anon full access" on birthdays for all using (true) with check (true);
create policy "anon full access" on verse for all using (true) with check (true);

-- ---------- Tiempo real ----------
-- Permite que anuncios.html se actualice solo, al instante, cuando el editor
-- guarda algo desde cualquier computadora (sin recargar la página).
alter publication supabase_realtime add table announcements, videos, birthdays, verse;

-- ---------- Storage (imágenes) ----------
-- IMPORTANTE: antes de correr estas 3 políticas, crea el bucket a mano:
-- Storage → New bucket → nombre exacto  imagenes  → marcar "Public bucket".
create policy "anon read imagenes" on storage.objects for select using (bucket_id = 'imagenes');
create policy "anon insert imagenes" on storage.objects for insert with check (bucket_id = 'imagenes');
create policy "anon delete imagenes" on storage.objects for delete using (bucket_id = 'imagenes');
