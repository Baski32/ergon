-- ==========================================================================
-- ERGON — supabase/recordatorios.sql (lección 39)
-- Lo que necesitan los recordatorios en la base de datos. Se pega entero en
-- Supabase → SQL Editor → New query → Run. Se puede ejecutar más de una
-- vez: lo que ya existe no se repite.
--
-- ÍNDICE
--  1. Extensiones
--  2. Suscripciones (los dispositivos con avisos)
--  3. Avisos del día (lo que ya se ha decidido hoy)
--  4. Claves de los avisos
--  5. La función también lee la tabla «datos»
--  6. Cada 5 minutos, llamar a la función
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. EXTENSIONES
-- pg_cron hace tareas a horas fijas (como un despertador de la base de
-- datos) y pg_net le deja hacer peticiones web (llamar a la función).
-- --------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
create extension if not exists pg_net with schema extensions;

-- --------------------------------------------------------------------------
-- 2. SUSCRIPCIONES
-- Una fila por cada dispositivo donde se han activado los avisos: la
-- dirección de su servicio de avisos (endpoint) y sus dos claves para
-- cifrarlos (p256dh y auth). La app guarda y borra las suyas; la función
-- las lee todas.
-- --------------------------------------------------------------------------

create table if not exists public.suscripciones (
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  creada timestamptz not null default now(),
  primary key (usuario, endpoint)
);

-- Seguridad por filas: cada usuario, solo las suyas (como en «datos»)
alter table public.suscripciones enable row level security;

drop policy if exists "ver mis suscripciones" on public.suscripciones;
create policy "ver mis suscripciones" on public.suscripciones
  for select to authenticated using ((select auth.uid()) = usuario);

drop policy if exists "crear mis suscripciones" on public.suscripciones;
create policy "crear mis suscripciones" on public.suscripciones
  for insert to authenticated with check ((select auth.uid()) = usuario);

drop policy if exists "cambiar mis suscripciones" on public.suscripciones;
create policy "cambiar mis suscripciones" on public.suscripciones
  for update to authenticated
  using ((select auth.uid()) = usuario)
  with check ((select auth.uid()) = usuario);

drop policy if exists "borrar mis suscripciones" on public.suscripciones;
create policy "borrar mis suscripciones" on public.suscripciones
  for delete to authenticated using ((select auth.uid()) = usuario);

revoke all on public.suscripciones from anon;
grant select, insert, update, delete on public.suscripciones to authenticated;
grant select, insert, update, delete on public.suscripciones to service_role;

-- --------------------------------------------------------------------------
-- 3. AVISOS DEL DÍA
-- Lo que la función ya ha decidido cada día, para no repetirlo cada 5
-- minutos. «texto»: el aviso que se envió, o vacío (null) si no hizo falta
-- (p. ej., ya estaban todos los hábitos). Puedes mirarla en Table Editor.
-- Sin políticas: la app no la ve; solo la función (con su clave secreta).
-- --------------------------------------------------------------------------

create table if not exists public.avisos_del_dia (
  usuario uuid not null references auth.users on delete cascade,
  tipo text not null,
  dia date not null,
  texto text,
  hora timestamptz not null default now(),
  primary key (usuario, tipo, dia)
);

alter table public.avisos_del_dia enable row level security;
revoke all on public.avisos_del_dia from anon, authenticated;
grant select, insert, update, delete on public.avisos_del_dia to service_role;

-- --------------------------------------------------------------------------
-- 4. CLAVES DE LOS AVISOS
-- El par de claves VAPID: la función lo crea la primera vez y lo guarda
-- aquí (una sola fila). La privada firma los avisos, así que nadie más que
-- la función puede leer esta tabla. No borres esta fila: los dispositivos
-- se suscribieron con esta clave y tendrías que activar los avisos otra vez
-- en cada uno.
-- --------------------------------------------------------------------------

create table if not exists public.claves_push (
  id int primary key default 1 check (id = 1),
  publica text not null,
  privada text not null
);

alter table public.claves_push enable row level security;
revoke all on public.claves_push from anon, authenticated;
grant select, insert on public.claves_push to service_role;

-- --------------------------------------------------------------------------
-- 5. LA FUNCIÓN TAMBIÉN LEE LA TABLA «DATOS»
-- Para saber qué hábitos quedan, si se ha escrito la intención… Solo lee.
-- --------------------------------------------------------------------------

grant select on public.datos to service_role;

-- --------------------------------------------------------------------------
-- 6. CADA 5 MINUTOS, LLAMAR A LA FUNCIÓN
-- '*/5 * * * *' significa «cada 5 minutos» (minuto, hora, día, mes, día de
-- la semana). La función decide si toca algún recordatorio. Va con la
-- clave publicable, la misma de script.js (no es secreta). Si ya existe
-- una tarea con este nombre, se sustituye.
-- --------------------------------------------------------------------------

select cron.schedule(
  'ergon-recordatorios',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://drommbeoqtffrhrtlywo.supabase.co/functions/v1/recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_aR0M4Xp1c_UQzO1jJ274PQ_TdUQUjMa'
    ),
    body := '{"accion": "enviar"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
