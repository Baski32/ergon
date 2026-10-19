// @ts-nocheck: el archivo es JavaScript normal, sin tipos de TypeScript.
// Esta línea le dice a Deno que no los revise.
// ==========================================================================
// ERGON — supabase/functions/salud/index.ts
// La función «salud» de Supabase: recibe el sueño de la app Salud del
// iPhone y lo guarda en la tabla «datos», como si lo hubieras apuntado en
// Ergon. Se lo manda un atajo de la app Atajos (Ergon no puede leer Salud
// por sí sola: solo las apps nativas pueden).
//
// Por qué un código propio: el atajo no puede entrar en tu cuenta (no sabe
// tu contraseña, y el pase de la sesión caduca cada hora). Por eso Ergon te
// da un «código de Salud» largo que el atajo manda con cada noche. En la
// base de datos solo se guarda su huella (el código pasado por SHA-256):
// quien viera la tabla no podría usarlo. Y solo sirve para esto, apuntar el
// sueño. Si lo pierdes o lo compartes, se cambia en Archivo y el viejo deja
// de valer.
//
// Qué hace, según la «accion» que le llega:
//  - "crear-codigo" (desde Ergon, con el pase): crea un código nuevo (el de
//                   antes deja de valer) y lo devuelve una sola vez.
//  - "estado"       (desde Ergon, con el pase): si hay código y cuándo llegó
//                   la última noche.
//  - "sueno"        (desde el atajo, con el código en la cabecera
//                   x-codigo-salud): recibe las muestras de «Análisis del
//                   sueño», saca de ellas cada noche y la guarda. Contesta
//                   con una frase para la notificación del atajo.
//
// ÍNDICE
//  1. Ajustes
//  2. Hablar con la base de datos
//  3. Quién pregunta
//  4. El código de Salud
//  5. De las muestras a las noches
//  6. Guardar las noches
//  7. Lo que llega a la función
// ==========================================================================

// ==========================================================================
// 1. AJUSTES
// ==========================================================================

// La dirección del proyecto y su clave secreta (las pone Supabase solas,
// como en las otras funciones).
const url = Deno.env.get("SUPABASE_URL");
const claveSecreta = leerClaveSecreta();

function leerClaveSecreta() {
  const nuevas = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (nuevas) {
    return JSON.parse(nuevas).default;
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

// La hora de España: con ella se sabe de qué día es cada noche y a qué
// hora te acostaste.
const zona = "Europe/Madrid";

// Dos trozos de sueño separados por menos de esto son la misma noche (te
// levantaste un rato); con más, son dos (p. ej., una siesta).
const pausaMaxima = 2 * 60 * 60 * 1000;

// Lo que dura una noche como poco y como mucho: menos de 2 horas es una
// siesta; más de 16, un fallo de los datos.
const nocheMinima = 2 * 60 * 60 * 1000;
const nocheMaxima = 16 * 60 * 60 * 1000;

// Solo se guardan las noches de la última semana (el atajo manda las de
// los últimos días).
const diasAtras = 7;

// Muestras como mucho en cada envío.
const maxMuestras = 3000;

// Permisos para que el navegador pueda llamar a la función (CORS). El atajo
// no los necesita, pero Ergon sí (para crear el código).
const cabecerasCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-codigo-salud",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// La respuesta para Ergon: datos en JSON.
function contestar(datos, estado) {
  return new Response(JSON.stringify(datos), {
    status: estado || 200,
    headers: Object.assign(
      { "Content-Type": "application/json" },
      cabecerasCors,
    ),
  });
}

// La respuesta para el atajo: una frase (la enseña en una notificación).
function contestarTexto(texto, estado) {
  return new Response(texto, {
    status: estado || 200,
    headers: Object.assign(
      { "Content-Type": "text/plain; charset=utf-8" },
      cabecerasCors,
    ),
  });
}

// Un fallo con su código HTTP y su explicación.
function fallo(estado, explicacion) {
  const error = new Error(explicacion);
  error.estado = estado;
  return error;
}

// ==========================================================================
// 2. HABLAR CON LA BASE DE DATOS
// Como en las otras funciones, con la clave secreta. preferencias: la
// cabecera «Prefer» (p. ej., para sustituir una fila si ya existe).
// ==========================================================================

async function baseDeDatos(metodo, ruta, cuerpo, preferencias) {
  const opciones = {
    method: metodo,
    headers: {
      apikey: claveSecreta,
      Authorization: "Bearer " + claveSecreta,
      "Content-Type": "application/json",
    },
  };
  if (preferencias) {
    opciones.headers.Prefer = preferencias;
  }
  if (cuerpo !== undefined) {
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(url + "/rest/v1/" + ruta, opciones);
  if (!respuesta.ok) {
    const texto = await respuesta.text();
    // Sin la tabla de los códigos: falta ejecutar salud.sql
    if (texto.includes("claves_salud")) {
      throw fallo(
        500,
        "Falta crear la tabla «claves_salud»: ejecuta supabase/salud.sql en Supabase (SQL Editor).",
      );
    }
    throw new Error("base de datos " + respuesta.status + ": " + texto);
  }
  const texto = await respuesta.text();
  if (texto === "") {
    return null;
  }
  return JSON.parse(texto);
}

// ==========================================================================
// 3. QUIÉN PREGUNTA
// Desde Ergon, con el pase de la sesión (como en «consejero»). Desde el
// atajo, con el código de Salud (bloque 4).
// ==========================================================================

// El id del usuario de un pase, o un fallo 401 si no vale.
async function usuarioDelPase(peticion) {
  const respuesta = await fetch(url + "/auth/v1/user", {
    headers: {
      apikey: peticion.headers.get("apikey") || claveSecreta,
      Authorization: peticion.headers.get("Authorization") || "",
    },
  });
  if (!respuesta.ok) {
    throw fallo(401, "Hace falta entrar en la cuenta.");
  }
  return (await respuesta.json()).id;
}

// ==========================================================================
// 4. EL CÓDIGO DE SALUD
// «ergon-» y cinco grupos de cuatro letras y números al azar (100 bits:
// imposible de adivinar). Sin letras que se confundan (0 y o, 1 y l).
// ==========================================================================

const letrasCodigo = "abcdefghijkmnpqrstuvwxyz23456789";

function codigoNuevo() {
  const azar = new Uint8Array(20);
  crypto.getRandomValues(azar);
  let codigo = "ergon";
  azar.forEach(function (numero, i) {
    if (i % 4 === 0) {
      codigo += "-";
    }
    codigo += letrasCodigo[numero % letrasCodigo.length];
  });
  return codigo;
}

// La huella de un código: SHA-256 en hexadecimal. Es lo único que se
// guarda (sin espacios ni mayúsculas, por si se copió así).
async function huellaDe(codigo) {
  const bytes = new TextEncoder().encode(codigo.trim().toLowerCase());
  const resumen = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(resumen))
    .map(function (byte) {
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
}

// La fila del código de un usuario (o null si no tiene).
async function filaDelUsuario(usuario) {
  const filas = await baseDeDatos(
    "GET",
    "claves_salud?select=usuario,huella,creada,ultima&usuario=eq." + usuario,
  );
  return filas[0] || null;
}

// Lo que Ergon enseña: { codigo: si hay uno, creada, ultima }.
function estadoDe(fila) {
  if (!fila) {
    return { codigo: false, creada: null, ultima: null };
  }
  return { codigo: true, creada: fila.creada, ultima: fila.ultima };
}

// Crea un código nuevo para un usuario (sustituye al de antes).
async function crearCodigo(usuario) {
  const codigo = codigoNuevo();
  const fila = {
    usuario: usuario,
    huella: await huellaDe(codigo),
    creada: new Date().toISOString(),
    ultima: null,
  };
  await baseDeDatos(
    "POST",
    "claves_salud",
    fila,
    "resolution=merge-duplicates",
  );
  return { codigo: codigo, estado: estadoDe(fila) };
}

// La fila del código que manda el atajo, o un fallo 401 si no vale.
async function filaDelCodigo(codigo) {
  if (!codigo) {
    throw fallo(401, "Falta el código de Salud en el atajo (x-codigo-salud).");
  }
  const filas = await baseDeDatos(
    "GET",
    "claves_salud?select=usuario,huella,creada,ultima&huella=eq." +
      (await huellaDe(codigo)),
  );
  if (filas.length === 0) {
    throw fallo(
      401,
      "Ese código de Salud no vale: copia el de Ergon (Archivo → Sueño desde Salud).",
    );
  }
  return filas[0];
}

// ==========================================================================
// 5. DE LAS MUESTRAS A LAS NOCHES
// Salud guarda el sueño en trozos («muestras»): en cama, dormido (o sus
// fases: principal, profundo, REM) y despierto, cada uno con su principio y
// su final. El atajo los manda en líneas de texto: «inicio|fin|valor».
// Aquí se juntan en noches: de cuándo te acostaste a cuándo te levantaste
// y, si hay datos de un reloj, cuánto dormiste de verdad.
// ==========================================================================

// Las partes de una fecha en la hora de España: { dia, hora, minuto… }.
function partesEnEspana(milisegundos) {
  const partes = {};
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date(milisegundos))
    .forEach(function (parte) {
      partes[parte.type] = parte.value;
    });
  return partes;
}

// El día ("2026-10-19") y la hora ("07:15") de un momento, en España.
function diaEnEspana(milisegundos) {
  const p = partesEnEspana(milisegundos);
  return p.year + "-" + p.month + "-" + p.day;
}

function horaEnEspana(milisegundos) {
  const p = partesEnEspana(milisegundos);
  return p.hour + ":" + p.minute;
}

// Una fecha del atajo, en milisegundos (o null si no se entiende). Vienen
// en ISO 8601, con la zona («2026-10-19T07:15:00+02:00»); si no la traen,
// son de la hora de España.
function leerFecha(texto) {
  const limpio = String(texto || "").trim();
  if (/(Z|[+-]\d\d:?\d\d)$/.test(limpio)) {
    const momento = Date.parse(limpio);
    return isNaN(momento) ? null : momento;
  }
  const partes =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(limpio);
  if (!partes) {
    return null;
  }
  // Como si fuera UTC y, luego, se le quita lo que España va por delante
  const comoUtc = Date.UTC(
    Number(partes[1]),
    Number(partes[2]) - 1,
    Number(partes[3]),
    Number(partes[4]),
    Number(partes[5]),
    Number(partes[6] || 0),
  );
  const p = partesEnEspana(comoUtc);
  const enEspana = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return comoUtc - (enEspana - comoUtc);
}

// Qué es una muestra según su valor: "cama", "despierto" o "dormido" (las
// fases cuentan como dormido). Salud lo escribe en el idioma del iPhone
// («En cama», «Despierto»…) o, a veces, como número (0 en cama, 2
// despierto; los demás, dormido).
function tipoDe(valor) {
  const texto = String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  if (texto === "0" || texto.includes("cama") || texto.includes("bed")) {
    return "cama";
  }
  if (texto === "2" || texto.includes("despiert") || texto.includes("awake")) {
    return "despierto";
  }
  return "dormido";
}

// Las muestras que manda el atajo, ya leídas: [{ inicio, fin, tipo }] (en
// milisegundos). Admite texto («inicio|fin|valor», una por línea) o una
// lista ([{ inicio, fin, valor }]). Las que no se entienden se saltan.
function leerMuestras(muestras) {
  let lista = [];
  if (Array.isArray(muestras)) {
    lista = muestras;
  } else if (typeof muestras === "string") {
    lista = muestras.split(/\r?\n/).map(function (linea) {
      const trozos = linea.split("|");
      return { inicio: trozos[0], fin: trozos[1], valor: trozos[2] };
    });
  }
  if (lista.length > maxMuestras) {
    throw fallo(400, "Demasiadas muestras de una vez (" + lista.length + ").");
  }

  const leidas = [];
  lista.forEach(function (muestra) {
    if (!muestra) {
      return;
    }
    const inicio = leerFecha(muestra.inicio);
    const fin = leerFecha(muestra.fin);
    if (inicio === null || fin === null || fin <= inicio) {
      return;
    }
    leidas.push({ inicio: inicio, fin: fin, tipo: tipoDe(muestra.valor) });
  });
  return leidas;
}

// Cuántos minutos suman unos trozos, sin contar dos veces lo que se pisa
// (el iPhone y el reloj pueden apuntar el mismo rato).
function minutosSinRepetir(trozos) {
  const ordenados = trozos.slice().sort(function (a, b) {
    return a.inicio - b.inicio;
  });
  let total = 0;
  let desde = null;
  let hasta = null;
  ordenados.forEach(function (trozo) {
    if (hasta === null || trozo.inicio > hasta) {
      if (hasta !== null) {
        total += hasta - desde;
      }
      desde = trozo.inicio;
      hasta = trozo.fin;
    } else {
      hasta = Math.max(hasta, trozo.fin);
    }
  });
  if (hasta !== null) {
    total += hasta - desde;
  }
  return Math.round(total / 60000);
}

// Junta las muestras en noches. Cada noche va por el día en que te
// levantaste (como en Ergon); si ese día hay dos trozos (la noche y una
// siesta), se queda con el más largo. Devuelve [{ dia, acostarse,
// levantarse, dormido }] (dormido: minutos dormidos de verdad, o null si
// solo hay «en cama», como con el iPhone solo).
function nochesDe(muestras) {
  const ordenadas = muestras.slice().sort(function (a, b) {
    return a.inicio - b.inicio;
  });

  // Trozos seguidos: si una muestra empieza antes de 2 horas después de
  // que acabe lo anterior, es la misma noche
  const trozos = [];
  ordenadas.forEach(function (muestra) {
    const actual = trozos[trozos.length - 1];
    if (actual && muestra.inicio <= actual.fin + pausaMaxima) {
      actual.fin = Math.max(actual.fin, muestra.fin);
      actual.muestras.push(muestra);
    } else {
      trozos.push({
        inicio: muestra.inicio,
        fin: muestra.fin,
        muestras: [muestra],
      });
    }
  });

  const hoy = diaEnEspana(Date.now());
  const primerDia = diaEnEspana(Date.now() - diasAtras * 86400000);
  const porDia = {};
  trozos.forEach(function (trozo) {
    const dura = trozo.fin - trozo.inicio;
    const dia = diaEnEspana(trozo.fin);
    if (dura < nocheMinima || dura > nocheMaxima) {
      return;
    }
    if (dia > hoy || dia < primerDia) {
      return;
    }
    if (porDia[dia] && porDia[dia].fin - porDia[dia].inicio >= dura) {
      return;
    }
    porDia[dia] = trozo;
  });

  return Object.keys(porDia)
    .sort()
    .map(function (dia) {
      const trozo = porDia[dia];
      const dormidas = trozo.muestras.filter(function (muestra) {
        return muestra.tipo === "dormido";
      });
      let dormido = null;
      if (dormidas.length > 0) {
        dormido = minutosSinRepetir(dormidas);
      }
      return {
        dia: dia,
        acostarse: horaEnEspana(trozo.inicio),
        levantarse: horaEnEspana(trozo.fin),
        dormido: dormido,
      };
    });
}

// ==========================================================================
// 6. GUARDAR LAS NOCHES
// Cada noche, en su fila «sueno:<día>» de la tabla «datos», con
// fuente: "salud". Lo que apuntaste a mano manda: esa noche no se toca. Si
// ya habías dicho cómo dormiste (en la tarjeta de la mañana), se conserva.
// Ergon la baja al abrirse o al volver a él, como cualquier cambio.
// ==========================================================================

// Minutos en texto: «7 h 35 min», «8 h» o «45 min».
function textoHoras(minutos) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) {
    return resto + " min";
  }
  if (resto === 0) {
    return horas + " h";
  }
  return horas + " h " + resto + " min";
}

// Minutos entre dos horas ("23:40" y "07:15"), pasando la medianoche si
// hace falta.
function minutosEntre(acostarse, levantarse) {
  const a = acostarse.split(":").map(Number);
  const l = levantarse.split(":").map(Number);
  let minutos = l[0] * 60 + l[1] - (a[0] * 60 + a[1]);
  if (minutos <= 0) {
    minutos += 1440;
  }
  return minutos;
}

// El nombre de una noche por el día en que te levantaste: «la noche del 18
// al 19 de octubre».
function nombreNoche(dia) {
  const despues = new Date(dia + "T12:00:00Z");
  const antes = new Date(despues.getTime() - 86400000);
  const mes = function (fecha) {
    return fecha.toLocaleDateString("es-ES", {
      month: "long",
      timeZone: "UTC",
    });
  };
  if (mes(antes) === mes(despues)) {
    return (
      "la noche del " +
      antes.getUTCDate() +
      " al " +
      despues.getUTCDate() +
      " de " +
      mes(despues)
    );
  }
  return (
    "la noche del " +
    antes.getUTCDate() +
    " de " +
    mes(antes) +
    " al " +
    despues.getUTCDate() +
    " de " +
    mes(despues)
  );
}

// Guarda las noches de un usuario y devuelve la frase para el atajo.
async function guardarNoches(usuario, noches) {
  if (noches.length === 0) {
    return "No he encontrado ninguna noche en Salud de los últimos días. ¿Tienes activado el horario de sueño?";
  }

  // Lo que ya hay en la nube de esas noches
  const claves = noches.map(function (noche) {
    return '"sueno:' + noche.dia + '"';
  });
  const existentes = await baseDeDatos(
    "GET",
    "datos?select=clave,valor&usuario=eq." +
      usuario +
      "&clave=in.(" +
      claves.join(",") +
      ")",
  );
  const antes = {};
  existentes.forEach(function (fila) {
    antes[fila.clave] = fila.valor;
  });

  const filas = [];
  const frases = [];
  let deSalud = 0;
  noches.forEach(function (noche) {
    const clave = "sueno:" + noche.dia;
    const anterior = antes[clave];
    const nombre = nombreNoche(noche.dia);

    if (anterior && anterior.fuente !== "salud") {
      frases.push(
        conMayuscula(nombre) + " ya la habías apuntado a mano: no la cambio.",
      );
      return;
    }

    const valor = {
      acostarse: noche.acostarse,
      levantarse: noche.levantarse,
      dormido: noche.dormido,
      fuente: "salud",
    };
    if (anterior && anterior.calidad) {
      valor.calidad = anterior.calidad;
    }
    deSalud++;

    let detalle =
      textoHoras(minutosEntre(noche.acostarse, noche.levantarse)) + " en cama";
    if (noche.dormido !== null) {
      detalle = textoHoras(noche.dormido) + " dormido";
    }
    frases.push(
      conMayuscula(nombre) +
        ": de " +
        noche.acostarse +
        " a " +
        noche.levantarse +
        " (" +
        detalle +
        ").",
    );

    if (JSON.stringify(anterior) !== JSON.stringify(valor)) {
      filas.push({
        usuario: usuario,
        clave: clave,
        valor: valor,
        actualizado: new Date().toISOString(),
      });
    }
  });

  if (filas.length > 0) {
    await baseDeDatos("POST", "datos", filas, "resolution=merge-duplicates");
  }

  // La notificación del atajo: cada noche, de la más nueva (la de esta
  // mañana) a la más antigua, y si ha llegado alguna a Ergon
  let texto = frases.reverse().join(" ");
  if (deSalud > 0) {
    texto += " Ya está en Ergon.";
  }
  return texto;
}

// «la noche…» → «La noche…».
function conMayuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ==========================================================================
// 7. LO QUE LLEGA A LA FUNCIÓN
// ==========================================================================

Deno.serve(async function (peticion) {
  // La pregunta del navegador antes de llamar (CORS): sí, puede
  if (peticion.method === "OPTIONS") {
    return new Response("ok", { headers: cabecerasCors });
  }

  let cuerpo = {};
  try {
    cuerpo = await peticion.json();
  } catch (error) {
    // Sin cuerpo o sin JSON: se queda vacío
  }

  // Desde el atajo: el sueño, con el código. Contesta con una frase
  if (cuerpo.accion === "sueno") {
    try {
      const fila = await filaDelCodigo(peticion.headers.get("x-codigo-salud"));
      const noches = nochesDe(leerMuestras(cuerpo.muestras));
      const texto = await guardarNoches(fila.usuario, noches);
      await baseDeDatos(
        "POST",
        "claves_salud",
        Object.assign({}, fila, { ultima: new Date().toISOString() }),
        "resolution=merge-duplicates",
      );
      return contestarTexto(texto);
    } catch (error) {
      if (!error.estado) {
        console.error(error);
      }
      return contestarTexto(
        error.estado ? error.message : "Ha fallado algo: " + error.message,
        error.estado || 500,
      );
    }
  }

  // Desde Ergon: con el pase de la sesión
  try {
    const usuario = await usuarioDelPase(peticion);
    if (cuerpo.accion === "crear-codigo") {
      return contestar(await crearCodigo(usuario));
    }
    if (cuerpo.accion === "estado") {
      return contestar(estadoDe(await filaDelUsuario(usuario)));
    }
    return contestar({ error: "Acción desconocida." }, 400);
  } catch (error) {
    if (error.estado) {
      return contestar({ error: error.message }, error.estado);
    }
    console.error(error);
    return contestar({ error: error.message }, 500);
  }
});
