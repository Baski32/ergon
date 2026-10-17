-- ==========================================================================
-- ERGON — supabase/consejeros.sql (lección 40)
-- Lo que necesita la función «consejero» en la base de datos: la cuenta de
-- lo que se habla cada día con los consejeros. Se pega entero en Supabase →
-- SQL Editor → New query → Run. Se puede ejecutar más de una vez.
--
-- ÍNDICE
--  1. Uso de los consejeros
--  2. Sumar un mensaje
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. USO DE LOS CONSEJEROS
-- Una fila por usuario y día: cuántos mensajes, cuántos tokens (lo que le
-- llega a Claude y lo que escribe) y lo que han costado, en dólares. Con
-- ella, la función pone el límite de cada día y la app enseña el gasto.
-- Sin políticas: la app no la ve; solo la función (con su clave secreta).
-- --------------------------------------------------------------------------

create table if not exists public.uso_consejeros (
  usuario uuid not null references auth.users on delete cascade,
  dia date not null,
  mensajes int not null default 0,
  entrada int not null default 0,
  salida int not null default 0,
  coste numeric(10, 6) not null default 0,
  primary key (usuario, dia)
);

alter table public.uso_consejeros enable row level security;
revoke all on public.uso_consejeros from anon, authenticated;
grant select, insert, update on public.uso_consejeros to service_role;

-- --------------------------------------------------------------------------
-- 2. SUMAR UN MENSAJE
-- Una función de la base de datos: suma un mensaje (con sus tokens y su
-- coste) al día de un usuario y devuelve cómo queda, p. ej.
-- {"mensajes": 3, "coste": 0.031}. Si es el primero del día, crea la fila
-- («on conflict … do update»: si ya existe, la suma). Como lo hace la base
-- de datos de una vez, dos mensajes a la vez no se pisan.
-- --------------------------------------------------------------------------

create or replace function public.sumar_uso(
  p_usuario uuid,
  p_dia date,
  p_entrada int,
  p_salida int,
  p_coste numeric
)
returns jsonb
language sql
set search_path = ''
as $$
  insert into public.uso_consejeros as uso (usuario, dia, mensajes, entrada, salida, coste)
  values (p_usuario, p_dia, 1, p_entrada, p_salida, p_coste)
  on conflict (usuario, dia) do update
    set mensajes = uso.mensajes + 1,
        entrada = uso.entrada + excluded.entrada,
        salida = uso.salida + excluded.salida,
        coste = uso.coste + excluded.coste
  returning jsonb_build_object('mensajes', uso.mensajes, 'coste', uso.coste);
$$;

-- Solo la puede usar la función (nadie desde la app)
revoke execute on function public.sumar_uso(uuid, date, int, int, numeric) from public, anon, authenticated;
grant execute on function public.sumar_uso(uuid, date, int, int, numeric) to service_role;
