// @ts-nocheck: el archivo es JavaScript normal, sin tipos de TypeScript.
// Esta línea le dice a Deno que no los revise.
// ==========================================================================
// ERGON — supabase/functions/recordatorios/index.ts
// La función «recordatorios» de Supabase (una Edge Function). Este código no
// corre en el navegador sino en el servidor de Supabase, con Deno (un primo
// de Node que entiende JavaScript y TypeScript). Por eso puede enviar avisos
// al móvil aunque Ergon esté cerrada. Está escrito en JavaScript normal: el
// .ts es solo porque Supabase lo pide así.
//
// Qué hace, según la «accion» que le llega:
//  - "clave":  da la clave pública de los avisos (la app la necesita para
//              activarlos). La primera vez, crea el par de claves.
//  - "enviar": mira a quién le toca un recordatorio ahora y se lo envía. Lo
//              llama la base de datos cada 5 minutos (pg_cron, ver
//              supabase/recordatorios.sql).
//  - "prueba": envía un aviso de prueba al dispositivo que lo pide.
//
// ÍNDICE
//  1. Ajustes
//  2. Hablar con la base de datos
//  3. Claves de los avisos (VAPID)
//  4. Fechas y horas en la zona del usuario
//  5. Reglas de los hábitos (las mismas que en script.js)
//  6. Los cuatro recordatorios
//  7. Enviar un aviso
//  8. Enviar los recordatorios que tocan
//  9. Aviso de prueba
// 10. Lo que llega a la función
// ==========================================================================

// web-push: la librería que cifra el aviso y se lo da al servicio de avisos
// del móvil (el de Apple en el iPhone, el de Google en Chrome…). «npm:» le
// dice a Deno que la traiga de npm.
import webpush from "npm:web-push@3.6.7";

// ==========================================================================
// 1. AJUSTES
// ==========================================================================

// La dirección del proyecto. Supabase la pone sola en Deno.env.
const url = Deno.env.get("SUPABASE_URL");

// La clave secreta: deja a la función leer y escribir todas las tablas (se
// salta la seguridad por filas). Supabase también la pone sola y nunca sale
// del servidor. Los proyectos nuevos la tienen en SUPABASE_SECRET_KEYS (un
// diccionario de claves; la que se usa se llama «default»); los antiguos,
// en SUPABASE_SERVICE_ROLE_KEY.
const claveSecreta = leerClaveSecreta();

function leerClaveSecreta() {
  const nuevas = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (nuevas) {
    return JSON.parse(nuevas).default;
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

// Quién envía los avisos: el servicio de avisos de Apple lo exige, y tiene
// que ser una web (https://…) o un email (mailto:…).
const remitente = "https://baski32.github.io/ergon/";

// Cuánto tiempo guarda el servicio de avisos un aviso si el móvil está
// apagado o sin conexión: 3 horas (en segundos). Después ya no tiene sentido.
const duracionAviso = 3 * 60 * 60;

// Un recordatorio se envía si su hora pasó hace menos de esto (en minutos).
// Así, si el servidor se para un rato, al volver no envía avisos viejos.
const margenMinutos = 60;

// La zona horaria si la app no ha dicho otra.
const zonaPorDefecto = "Europe/Madrid";

// Permisos para que el navegador (la app, desde otra dirección: GitHub
// Pages o Live Server) pueda llamar a la función. Es lo que se llama CORS:
// antes de llamar, el navegador pregunta (con una petición OPTIONS) si
// puede, y estas cabeceras le dicen que sí.
const cabecerasCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// La respuesta de la función: datos en JSON, con los permisos de CORS.
// estado: el código HTTP (200 si todo va bien).
function contestar(datos, estado) {
  return new Response(JSON.stringify(datos), {
    status: estado || 200,
    headers: Object.assign(
      { "Content-Type": "application/json" },
      cabecerasCors,
    ),
  });
}

// ==========================================================================
// 2. HABLAR CON LA BASE DE DATOS
// Igual que la app (bloque 21 de script.js), con fetch y sin librerías,
// pero con la clave secreta en vez del pase de un usuario.
// ==========================================================================

// Una petición a una tabla (ruta: "suscripciones?select=…"). Devuelve lo
// que conteste la base de datos (o null si no contesta nada).
async function baseDeDatos(metodo, ruta, cuerpo, cabecerasExtra) {
  const cabeceras = {
    apikey: claveSecreta,
    Authorization: "Bearer " + claveSecreta,
    "Content-Type": "application/json",
  };
  Object.assign(cabeceras, cabecerasExtra || {});

  const opciones = { method: metodo, headers: cabeceras };
  if (cuerpo !== undefined) {
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(url + "/rest/v1/" + ruta, opciones);
  if (!respuesta.ok) {
    throw new Error(
      "base de datos " + respuesta.status + ": " + (await respuesta.text()),
    );
  }

  const texto = await respuesta.text();
  if (texto === "") {
    return null;
  }
  return JSON.parse(texto);
}

// Una lista de claves para el filtro «in» de la base de datos, ya preparada
// para ir en la dirección: ("ergon-habitos","ritual:2026-10-17"). Las
// comillas hacen falta porque las claves llevan «:».
function listaDeClaves(claves) {
  const conComillas = claves.map(function (clave) {
    return '"' + clave + '"';
  });
  return encodeURIComponent("(" + conComillas.join(",") + ")");
}

// ==========================================================================
// 3. CLAVES DE LOS AVISOS (VAPID)
// Un par de claves: la pública la usa el móvil al activar los avisos; la
// privada firma cada aviso, y así el servicio de avisos sabe que viene de
// Ergon y no de otro. Se crean la primera vez y se guardan en la tabla
// «claves_push», que solo puede leer esta función.
// ==========================================================================

// Las claves, una vez leídas (para no leerlas en cada aviso).
let claves = null;

// Lee las claves (o las crea, la primera vez) y se las da a web-push.
async function clavesVapid() {
  if (claves) {
    return claves;
  }

  const ruta = "claves_push?select=publica,privada&id=eq.1";
  let filas = await baseDeDatos("GET", ruta);

  if (filas.length === 0) {
    const nuevas = webpush.generateVAPIDKeys();
    // «ignore-duplicates»: si otra llamada las ha creado a la vez, se quedan
    // las suyas. Por eso después se vuelven a leer
    await baseDeDatos(
      "POST",
      "claves_push",
      { id: 1, publica: nuevas.publicKey, privada: nuevas.privateKey },
      { Prefer: "resolution=ignore-duplicates,return=minimal" },
    );
    filas = await baseDeDatos("GET", ruta);
  }

  claves = filas[0];
  webpush.setVapidDetails(remitente, claves.publica, claves.privada);
  return claves;
}

// ==========================================================================
// 4. FECHAS Y HORAS EN LA ZONA DEL USUARIO
// El servidor no está en España: su reloj va en UTC. Para saber qué hora es
// para Joel se usa su zona horaria («Europe/Madrid»), que la app guarda con
// los ajustes de los recordatorios. Los días van como texto: "2026-10-17".
// ==========================================================================

// La fecha y la hora de ahora en una zona horaria:
// { dia: "2026-10-17", minutos: 1290 (las 21:30), diaSemana: 6 }
// (diaSemana como getDay(): 0 = domingo, 1 = lunes…).
function ahoraEn(zona) {
  let formato;
  try {
    formato = new Intl.DateTimeFormat("en-CA", {
      timeZone: zona || zonaPorDefecto,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch (error) {
    // Una zona que no existe: la de por defecto
    return ahoraEn(zonaPorDefecto);
  }

  // formatToParts trocea la fecha: [{ type: "year", value: "2026" }, …]
  const partes = {};
  formato.formatToParts(new Date()).forEach(function (parte) {
    partes[parte.type] = parte.value;
  });

  const dia = partes.year + "-" + partes.month + "-" + partes.day;
  return {
    dia: dia,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
    diaSemana: fechaDe(dia).getUTCDay(),
  };
}

// Un día ("2026-10-17") como fecha, a mediodía en UTC: así, sumar y restar
// días nunca se lía con los cambios de hora.
function fechaDe(dia) {
  return new Date(dia + "T12:00:00Z");
}

// El día que hay unos días antes o después de otro ("2026-10-17", -1 →
// "2026-10-16").
function sumarDias(dia, dias) {
  const fecha = fechaDe(dia);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

// El lunes de la semana de un día.
function lunesDe(dia) {
  return sumarDias(dia, -((fechaDe(dia).getUTCDay() + 6) % 7));
}

// Una hora en texto ("21:30") en minutos desde medianoche (1290).
function minutosDe(hora) {
  const partes = hora.split(":");
  return Number(partes[0]) * 60 + Number(partes[1]);
}

// ==========================================================================
// 5. REGLAS DE LOS HÁBITOS
// Las mismas preguntas que hace la app (bloque 3 de script.js), pero con
// los días como texto. Si cambias allí cómo se cumple un hábito, cámbialo
// también aquí.
// ==========================================================================

// Día en que empezó un hábito. Los antiguos, sin «inicio», lo llevan en el
// id ("h" + Date.now()).
function inicioDe(habito) {
  if (habito.inicio) {
    return habito.inicio;
  }
  const creado = new Date(Number(habito.id.slice(1)));
  if (isNaN(creado)) {
    return "";
  }
  return creado.toISOString().slice(0, 10);
}

// El hábito con las reglas que tenía un día (ver reglasEn en script.js).
function reglasEn(habito, dia) {
  if (!habito.cambios) {
    return habito;
  }
  const cambio = habito.cambios.find(function (c) {
    return dia <= c.hasta;
  });
  if (cambio) {
    return Object.assign({}, habito, cambio);
  }
  return habito;
}

// ¿Toca este hábito este día?
function tocaEn(habito, dia) {
  if (dia < inicioDe(habito)) {
    return false;
  }
  if (habito.frecuencia === "dias") {
    return habito.dias.includes(fechaDe(dia).getUTCDay());
  }
  return true;
}

// ¿Está cumplido ese día? habitosDia: lo apuntado ese día ({ id: valor }).
function estaCumplido(habito, habitosDia) {
  const valor = habitosDia[habito.id];

  if (habito.medida === "cantidad") {
    if (habito.limite === "maximo") {
      return valor !== undefined && valor <= habito.objetivo;
    }
    return valor >= habito.objetivo;
  }
  if (habito.medida === "abstencion") {
    return valor !== "recaida";
  }
  return valor === true;
}

// Cuántas veces se cumplió en la semana (de lunes a domingo) de un día.
// registro: { "2026-10-17": { id: valor } }.
function vecesEnSemana(habito, dia, registro) {
  let veces = 0;
  let otroDia = lunesDe(dia);
  for (let i = 0; i < 7; i++) {
    if (estaCumplido(reglasEn(habito, otroDia), registro[otroDia] || {})) {
      veces++;
    }
    otroDia = sumarDias(otroDia, 1);
  }
  return veces;
}

// Los hábitos que hoy quedan por hacer: tocan hoy y no están cumplidos.
// Fuera quedan los de templanza (se cumplen solos si no hay recaída), los de
// «como mucho» que ya se han pasado (ya no tienen remedio) y los de «unas
// veces por semana» si esta semana ya se ha llegado.
function habitosPendientes(habitos, registro, dia) {
  const habitosDia = registro[dia] || {};

  return habitos.filter(function (habito) {
    const reglas = reglasEn(habito, dia);

    if (!tocaEn(reglas, dia) || reglas.medida === "abstencion") {
      return false;
    }
    if (estaCumplido(reglas, habitosDia)) {
      return false;
    }
    if (
      reglas.medida === "cantidad" &&
      reglas.limite === "maximo" &&
      habitosDia[habito.id] > reglas.objetivo
    ) {
      return false;
    }
    if (reglas.frecuencia === "semanal") {
      return vecesEnSemana(habito, dia, registro) < reglas.vecesSemana;
    }
    return true;
  });
}

// Unos nombres en una frase: "Leer", "Leer y Meditar", "Leer, Correr y
// Meditar" o, si son más de cuatro, "Leer, Correr, Meditar y 2 más".
// Delante de una palabra que suena «i» (Inglés, hidratarse), «y» pasa a
// ser «e»: «Leer e Inglés».
function frase(nombres) {
  if (nombres.length === 1) {
    return nombres[0];
  }
  if (nombres.length > 4) {
    return (
      nombres.slice(0, 3).join(", ") + " y " + (nombres.length - 3) + " más"
    );
  }

  const ultimo = nombres[nombres.length - 1];
  let y = " y ";
  // h opcional + i o í, sin otra vocal detrás («hielo» suena «ie»: va con y)
  if (/^h?[ií](?![aeiouáéíóú])/i.test(ultimo)) {
    y = " e ";
  }
  return nombres.slice(0, -1).join(", ") + y + ultimo;
}

// ==========================================================================
// 6. LOS CUATRO RECORDATORIOS
// Cada uno tiene su nombre en los ajustes («manana», «habitos», «noche» y
// «domingo») y una función que mira los datos del usuario y devuelve el
// aviso { titulo, texto } o null si no hace falta (p. ej., ya ha escrito su
// intención).
// ==========================================================================

// La mañana empieza a las 4 (como en script.js): un examen recordado a las
// 00:30 es el del día que se acaba de vivir.
const horaManana = 4;

// El saludo según la hora: «Buenos días», «Buenas tardes» o «Buenas noches»,
// con el nombre si lo hay.
function saludo(ahora, perfil) {
  let texto = "Buenos días";
  if (ahora.minutos >= 20 * 60) {
    texto = "Buenas noches";
  } else if (ahora.minutos >= 14 * 60) {
    texto = "Buenas tardes";
  }
  if (perfil.nombre) {
    texto = texto + ", " + perfil.nombre;
  }
  return texto;
}

const recordatorios = {
  // La intención de la mañana, si aún no la ha escrito (ni ha dicho «Hoy no»)
  manana: function (datos, ahora) {
    const ritual = datos.valores["ritual:" + ahora.dia] || {};
    if (ritual.intencion !== undefined) {
      return null;
    }
    return {
      titulo: "Intención del día",
      texto:
        saludo(ahora, datos.perfil) + ". ¿Qué quieres que hoy no se te escape?",
    };
  },

  // Los hábitos que le quedan por hoy
  habitos: function (datos, ahora) {
    const pendientes = habitosPendientes(
      datos.habitos,
      datos.registro,
      ahora.dia,
    );
    if (pendientes.length === 0) {
      return null;
    }

    const nombres = pendientes.map(function (habito) {
      return habito.nombre;
    });
    let cuantos = "Te quedan " + pendientes.length + " hábitos";
    if (pendientes.length === 1) {
      cuantos = "Te queda 1 hábito";
    }
    return {
      titulo: "Hábitos de hoy",
      texto: cuantos + " por hoy: " + frase(nombres) + ".",
    };
  },

  // El examen de la noche, si aún no lo ha marcado hecho
  noche: function (datos, ahora, ajuste) {
    let dia = ahora.dia;
    if (minutosDe(ajuste.hora) < horaManana * 60) {
      dia = sumarDias(dia, -1);
    }
    const ritual = datos.valores["ritual:" + dia] || {};
    if (ritual.examen === true) {
      return null;
    }
    return {
      titulo: "Examen de la noche",
      texto:
        "Antes de dormir, Séneca se preguntaba: ¿qué mal tuyo has curado hoy?",
    };
  },

  // La revisión de la semana, los domingos, si aún no la ha hecho
  domingo: function (datos, ahora) {
    if (ahora.diaSemana !== 0) {
      return null;
    }
    if (datos.valores["revision:" + lunesDe(ahora.dia)]) {
      return null;
    }
    return {
      titulo: "Revisión de la semana",
      texto: "Es domingo: Méntor te espera para repasar la semana.",
    };
  },
};

// ==========================================================================
// 7. ENVIAR UN AVISO
// ==========================================================================

// Envía un aviso ({ tipo, titulo, texto }) a unas suscripciones (los
// dispositivos donde se han activado los avisos). Las que el servicio de
// avisos da por muertas (404 o 410: se borró la app o se quitaron los
// permisos) se borran de la tabla. Devuelve a cuántas ha llegado.
async function enviarAviso(suscripciones, aviso) {
  await clavesVapid();
  let enviados = 0;

  // for…of recorre la lista como forEach, pero deja usar await dentro
  for (const suscripcion of suscripciones) {
    try {
      await webpush.sendNotification(
        {
          endpoint: suscripcion.endpoint,
          keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
        },
        JSON.stringify(aviso),
        // urgency "high": que llegue ya, aunque el móvil esté ahorrando batería
        { TTL: duracionAviso, urgency: "high" },
      );
      enviados++;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await baseDeDatos(
          "DELETE",
          "suscripciones?usuario=eq." +
            suscripcion.usuario +
            "&endpoint=eq." +
            encodeURIComponent(suscripcion.endpoint),
        );
      } else {
        // Otro fallo: se apunta en los registros de la función (Logs)
        console.error(
          "No se ha podido enviar el aviso:",
          error.statusCode,
          error.body || error.message,
        );
      }
    }
  }

  return enviados;
}

// ==========================================================================
// 8. ENVIAR LOS RECORDATORIOS QUE TOCAN
// Cada 5 minutos: para cada usuario con avisos activados, se miran sus
// ajustes; si la hora de algún recordatorio acaba de pasar, se leen sus
// datos y se decide si hace falta. Lo decidido se apunta en «avisos_del_dia»
// para no repetirlo en las siguientes vueltas (ni dos veces si dos llamadas
// coinciden).
// ==========================================================================

// Los datos de un usuario que hacen falta para decidir los recordatorios de
// un día: hábitos, perfil, rituales de hoy y de ayer, revisión de la semana
// y lo apuntado en el registro desde el lunes.
async function datosDe(usuario, dia) {
  const lunes = lunesDe(dia);
  const claves = [
    "ergon-habitos",
    "ergon-perfil",
    "ritual:" + dia,
    "ritual:" + sumarDias(dia, -1),
    "revision:" + lunes,
  ];

  const filas = await baseDeDatos(
    "GET",
    "datos?select=clave,valor&usuario=eq." +
      usuario +
      "&clave=in." +
      listaDeClaves(claves),
  );
  // Las filas del registro de esta semana: sus claves van de
  // "registro:<lunes>" a "registro:<lunes siguiente>" (en orden alfabético)
  const delRegistro = await baseDeDatos(
    "GET",
    "datos?select=clave,valor&usuario=eq." +
      usuario +
      "&clave=gte." +
      encodeURIComponent("registro:" + lunes) +
      "&clave=lt." +
      encodeURIComponent("registro:" + sumarDias(lunes, 7)),
  );

  // { clave: valor }
  const valores = {};
  filas.forEach(function (fila) {
    valores[fila.clave] = fila.valor;
  });

  // { "2026-10-17": { idDelHábito: valor } }, como en la app. Un valor null
  // es un dato borrado
  const registro = {};
  delRegistro.forEach(function (fila) {
    const partes = fila.clave.split(":");
    if (fila.valor === null) {
      return;
    }
    if (!registro[partes[1]]) {
      registro[partes[1]] = {};
    }
    registro[partes[1]][partes[2]] = fila.valor;
  });

  return {
    valores: valores,
    registro: registro,
    habitos: valores["ergon-habitos"] || [],
    perfil: valores["ergon-perfil"] || {},
  };
}

// Los recordatorios de un usuario. ajustes: los de la app
// ({ manana: { activo, hora }, …, zona }). Devuelve cuántos avisos han
// llegado.
async function recordatoriosDe(usuario, ajustes, suscripciones) {
  const ahora = ahoraEn(ajustes.zona);

  // 1. Los que tocan ahora: activados y con su hora pasada hace menos del
  // margen (el del domingo, solo los domingos)
  let tocan = Object.keys(recordatorios).filter(function (tipo) {
    const ajuste = ajustes[tipo];
    if (!ajuste || !ajuste.activo || !ajuste.hora) {
      return false;
    }
    if (tipo === "domingo" && ahora.diaSemana !== 0) {
      return false;
    }
    const pasados = ahora.minutos - minutosDe(ajuste.hora);
    return pasados >= 0 && pasados < margenMinutos;
  });
  if (tocan.length === 0) {
    return 0;
  }

  // 2. Fuera los que ya se decidieron hoy
  const hechos = await baseDeDatos(
    "GET",
    "avisos_del_dia?select=tipo&usuario=eq." + usuario + "&dia=eq." + ahora.dia,
  );
  tocan = tocan.filter(function (tipo) {
    return !hechos.some(function (hecho) {
      return hecho.tipo === tipo;
    });
  });
  if (tocan.length === 0) {
    return 0;
  }

  // 3. Cada uno: se decide, se apunta y, si hace falta, se envía
  const datos = await datosDe(usuario, ahora.dia);
  let enviados = 0;

  for (const tipo of tocan) {
    const aviso = recordatorios[tipo](datos, ahora, ajustes[tipo]);
    let texto = null;
    if (aviso) {
      aviso.tipo = tipo;
      texto = aviso.texto;
    }

    // Se apunta antes de enviar. Si ya estaba apuntado (otra llamada a la
    // vez), la base de datos no devuelve nada y no se envía otra vez
    const apuntado = await baseDeDatos(
      "POST",
      "avisos_del_dia",
      { usuario: usuario, tipo: tipo, dia: ahora.dia, texto: texto },
      { Prefer: "resolution=ignore-duplicates,return=representation" },
    );
    if (apuntado.length > 0 && aviso) {
      enviados += await enviarAviso(suscripciones, aviso);
    }
  }

  return enviados;
}

// La vuelta de cada 5 minutos. Devuelve { usuarios, enviados }.
async function enviarRecordatorios() {
  const suscripciones = await baseDeDatos(
    "GET",
    "suscripciones?select=usuario,endpoint,p256dh,auth",
  );
  if (suscripciones.length === 0) {
    return { usuarios: 0, enviados: 0 };
  }

  // Los usuarios, sin repetir (un Set es una lista sin repetidos)
  const usuarios = Array.from(
    new Set(
      suscripciones.map(function (suscripcion) {
        return suscripcion.usuario;
      }),
    ),
  );

  // Los ajustes de los recordatorios de esos usuarios (una fila cada uno)
  const filas = await baseDeDatos(
    "GET",
    "datos?select=usuario,valor&clave=eq.ergon-recordatorios&usuario=in.(" +
      usuarios.join(",") +
      ")",
  );

  let enviados = 0;
  for (const fila of filas) {
    if (!fila.valor) {
      continue;
    }
    const suyas = suscripciones.filter(function (suscripcion) {
      return suscripcion.usuario === fila.usuario;
    });
    // Si falla con uno, se sigue con los demás
    try {
      enviados += await recordatoriosDe(fila.usuario, fila.valor, suyas);
    } catch (error) {
      console.error("Recordatorios de " + fila.usuario + ":", error.message);
    }
  }

  return { usuarios: filas.length, enviados: enviados };
}

// ==========================================================================
// 9. AVISO DE PRUEBA
// «Probar aviso» en la app: un aviso solo para ese dispositivo.
// ==========================================================================

// peticion: lo que ha llegado (con el pase del usuario en Authorization).
// endpoint: la dirección de avisos de ese dispositivo.
async function enviarPrueba(peticion, endpoint) {
  // ¿Quién lo pide? Se le pregunta a Supabase con su pase
  const respuesta = await fetch(url + "/auth/v1/user", {
    headers: {
      apikey: peticion.headers.get("apikey") || claveSecreta,
      Authorization: peticion.headers.get("Authorization") || "",
    },
  });
  if (!respuesta.ok) {
    return contestar({ error: "Hace falta entrar en la cuenta." }, 401);
  }
  const usuario = (await respuesta.json()).id;

  // Solo si ese dispositivo es suyo
  const suyas = await baseDeDatos(
    "GET",
    "suscripciones?select=usuario,endpoint,p256dh,auth&usuario=eq." +
      usuario +
      "&endpoint=eq." +
      encodeURIComponent(endpoint || ""),
  );

  const enviados = await enviarAviso(suyas, {
    tipo: "prueba",
    titulo: "Ergon",
    texto: "Así te llegarán los recordatorios.",
  });
  return contestar({ enviados: enviados });
}

// ==========================================================================
// 10. LO QUE LLEGA A LA FUNCIÓN
// Deno.serve recibe cada petición y devuelve la respuesta.
// ==========================================================================

Deno.serve(async function (peticion) {
  // La pregunta del navegador antes de llamar (CORS): sí, puede
  if (peticion.method === "OPTIONS") {
    return new Response("ok", { headers: cabecerasCors });
  }

  try {
    let cuerpo = {};
    try {
      cuerpo = await peticion.json();
    } catch (error) {
      // Sin cuerpo o sin JSON: se queda vacío
    }

    if (cuerpo.accion === "clave") {
      return contestar({ clave: (await clavesVapid()).publica });
    }
    if (cuerpo.accion === "enviar") {
      return contestar(await enviarRecordatorios());
    }
    if (cuerpo.accion === "prueba") {
      return await enviarPrueba(peticion, cuerpo.endpoint);
    }
    return contestar({ error: "Acción desconocida." }, 400);
  } catch (error) {
    console.error(error);
    return contestar({ error: error.message }, 500);
  }
});
