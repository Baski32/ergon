-- ==========================================================================
-- ERGON — supabase/datos.sql (lección 37, ya ejecutado)
-- La tabla «datos», donde la nube guarda todo lo de Ergon. Está aquí para
-- tenerla apuntada (por si algún día hay que montar el proyecto otra vez):
-- no hace falta volver a ejecutarla.
--
-- ÍNDICE
--  1. La tabla
--  2. «subido»: la hora a la que llegó cada fila
--  3. Seguridad por filas (cada usuario, solo lo suyo)
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. LA TABLA
-- Una fila por dato, con su «clave»: "ergon-habitos", "ritual:2026-10-16",
-- "registro:2026-10-16:h123"… «valor» es el dato en JSON (jsonb);
-- «actualizado», cuándo cambió en el dispositivo; «subido», cuándo llegó.
-- --------------------------------------------------------------------------

create table if not exists public.datos (
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  clave text not null,
  valor jsonb,
  actualizado timestamptz not null,
  subido timestamptz not null default now(),
  primary key (usuario, clave)
);

-- Para leer rápido «lo de este usuario subido después de…»
create index if not exists datos_por_subida on public.datos (usuario, subido);

-- --------------------------------------------------------------------------
-- 2. «SUBIDO»
-- Lo pone el servidor, no el dispositivo (los relojes de los dispositivos
-- no siempre coinciden). Un disparador (trigger) lo cambia en cada fila que
-- se crea o se cambia.
-- --------------------------------------------------------------------------

create or replace function public.marcar_subido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.subido := now();
  return new;
end;
$$;

drop trigger if exists marcar_subido on public.datos;
create trigger marcar_subido
  before insert or update on public.datos
  for each row execute function public.marcar_subido();

-- --------------------------------------------------------------------------
-- 3. SEGURIDAD POR FILAS
-- La clave publicable está en script.js, a la vista de todos: lo que
-- protege los datos es esto. Cada usuario solo ve, crea, cambia y borra
-- sus propias filas, y sin entrar (anon) no se ve nada.
-- --------------------------------------------------------------------------

alter table public.datos enable row level security;

drop policy if exists "ver mis datos" on public.datos;
create policy "ver mis datos" on public.datos
  for select to authenticated using ((select auth.uid()) = usuario);

drop policy if exists "crear mis datos" on public.datos;
create policy "crear mis datos" on public.datos
  for insert to authenticated with check ((select auth.uid()) = usuario);

drop policy if exists "cambiar mis datos" on public.datos;
create policy "cambiar mis datos" on public.datos
  for update to authenticated
  using ((select auth.uid()) = usuario)
  with check ((select auth.uid()) = usuario);

drop policy if exists "borrar mis datos" on public.datos;
create policy "borrar mis datos" on public.datos
  for delete to authenticated using ((select auth.uid()) = usuario);

revoke all on public.datos from anon;
grant select, insert, update, delete on public.datos to authenticated;
