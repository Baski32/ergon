-- ==========================================================================
-- ERGON — supabase/salud.sql (lección 46)
-- Lo que necesita la función «salud» en la base de datos: el código de
-- Salud de cada usuario (su huella) y permiso para escribir en «datos». Se
-- pega entero en Supabase → SQL Editor → New query → Run. Se puede
-- ejecutar más de una vez.
--
-- ÍNDICE
--  1. Los códigos de Salud
--  2. La función también escribe en «datos»
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. LOS CÓDIGOS DE SALUD
-- Una fila por usuario: la huella de su código (el código pasado por
-- SHA-256: con la huella no se puede sacar el código), cuándo se creó y
-- cuándo llegó la última noche. Sin políticas: la app no la ve; solo la
-- función (con su clave secreta).
-- --------------------------------------------------------------------------

create table if not exists public.claves_salud (
  usuario uuid primary key references auth.users on delete cascade,
  huella text not null unique,
  creada timestamptz not null default now(),
  ultima timestamptz
);

alter table public.claves_salud enable row level security;
revoke all on public.claves_salud from anon, authenticated;
grant select, insert, update, delete on public.claves_salud to service_role;

-- --------------------------------------------------------------------------
-- 2. LA FUNCIÓN TAMBIÉN ESCRIBE EN «DATOS»
-- Para guardar cada noche como «sueno:<día>», igual que la app. La de los
-- recordatorios solo leía (recordatorios.sql); esta también crea y cambia.
-- --------------------------------------------------------------------------

grant select, insert, update on public.datos to service_role;
