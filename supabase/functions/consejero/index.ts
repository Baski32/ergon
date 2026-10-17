// @ts-nocheck: el archivo es JavaScript normal, sin tipos de TypeScript.
// Esta línea le dice a Deno que no los revise.
// ==========================================================================
// ERGON — supabase/functions/consejero/index.ts
// La función «consejero» de Supabase: el servidor intermedio entre Ergon y
// la IA de Claude.
//
// Por qué hace falta: para hablar con Claude hace falta una clave de la API,
// y quien la tenga puede gastar en tu cuenta. Si estuviera en script.js,
// cualquiera podría leerla (el código de una web es público). Por eso se
// queda aquí, en el servidor, como secreto de Supabase (ANTHROPIC_API_KEY),
// y la app solo habla con esta función.
//
// Qué hace, según la «accion» que le llega (siempre con el pase del usuario):
//  - "hablar": recibe la conversación, comprueba que quien pregunta es un
//              usuario de Ergon y que no ha pasado del límite de hoy, se la
//              manda a Claude con las instrucciones del consejero y devuelve
//              su respuesta.
//  - "uso":    cómo va el día (mensajes, límite y lo gastado) y si la clave
//              de Claude está puesta.
//
// ÍNDICE
//  1. Ajustes
//  2. Los consejeros
//  3. Hablar con la base de datos
//  4. Quién pregunta
//  5. El uso de cada día
//  6. Preparar la conversación
//  7. Hablar con Claude
//  8. Lo que llega a la función
// ==========================================================================

// ==========================================================================
// 1. AJUSTES
// ==========================================================================

// La dirección del proyecto y su clave secreta (para la tabla del uso). Las
// pone Supabase solas, como en la función «recordatorios».
const url = Deno.env.get("SUPABASE_URL");
const claveSecreta = leerClaveSecreta();

function leerClaveSecreta() {
  const nuevas = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (nuevas) {
    return JSON.parse(nuevas).default;
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

// La clave de la API de Claude: la pones tú en Supabase (Edge Functions →
// Secrets) con el nombre ANTHROPIC_API_KEY. Se lee en cada petición: así,
// si la cambias, vale al momento.
function claveClaude() {
  return Deno.env.get("ANTHROPIC_API_KEY") || "";
}

// Mensajes al día por usuario, entre todos los consejeros. Protege tu
// saldo si algo va mal (un error que repite peticiones, alguien con tu
// contraseña…). Súbelo si se te queda corto.
const limiteDiario = 30;

// Cuántos mensajes de la conversación se mandan como mucho (los últimos):
// cuanto más larga, más cuesta cada respuesta.
const maxMensajes = 20;

// Letras como mucho en cada mensaje.
const maxLetras = 2000;

// El día del contador, con la hora de España: se reinicia a medianoche.
const zonaDelContador = "Europe/Madrid";

// Permisos para que el navegador pueda llamar a la función (CORS, como en
// «recordatorios»).
const cabecerasCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// La respuesta de la función: datos en JSON, con los permisos de CORS.
function contestar(datos, estado) {
  return new Response(JSON.stringify(datos), {
    status: estado || 200,
    headers: Object.assign(
      { "Content-Type": "application/json" },
      cabecerasCors,
    ),
  });
}

// Un fallo con su código HTTP y su explicación para la app.
function fallo(estado, explicacion) {
  const error = new Error(explicacion);
  error.estado = estado;
  return error;
}

// ==========================================================================
// 2. LOS CONSEJEROS
// Cada uno con su nombre, su «motor» (el modelo de Claude que usa: se
// cambia aquí sin tocar nada más), cuánto piensa, lo largo que puede
// contestar, lo que cuesta su motor y sus instrucciones (el «system
// prompt»: quién es y cómo habla). Prometheus y los especialistas se
// añadirán aquí (lección 43).
// ==========================================================================

const consejeros = {
  mentor: {
    nombre: "Méntor",
    motor: "claude-sonnet-5-5",
    // Cuánto piensa antes de contestar: "low", "medium" o "high" (más:
    // respuestas mejor pensadas, pero más lentas y caras)
    esfuerzo: "medium",
    // Lo más largo que puede ser su respuesta, en tokens (trozos de unas
    // pocas letras), contando también lo que piensa
    maxTokens: 3000,
    // Dólares por millón de tokens que cobra Claude por este motor (lo que
    // le llega y lo que escribe), según su web en octubre de 2026
    precio: { entrada: 2, salida: 10 },
    instrucciones: `Eres Méntor, el consejero de Ergon, una app de hábitos, metas y reflexión con estética de la antigua Grecia y Roma. Tomas el nombre del amigo de Odiseo cuya figura adoptó Atenea para guiar a Telémaco: acompañas, no mandas.

Hablas con la persona que usa Ergon para construir buenos hábitos, avanzar hacia sus metas y tener rumbo en la vida. Te escribe desde el móvil o desde el ordenador. Por ahora no ves sus datos de Ergon (hábitos, rachas, metas): si te hacen falta, pregúntale.

Cómo hablas:
- En español de España, tuteando, con calidez y serenidad. Frases claras, sin jerga.
- Breve: normalmente de dos a cinco frases. Más solo si te lo pide o el tema lo necesita de verdad.
- Texto sencillo, sin Markdown (ni asteriscos, ni almohadillas, ni listas con guiones): la app enseña tus palabras tal cual, en una burbuja. Si hace falta separar ideas, usa párrafos cortos.
- Puedes recordar a los clásicos (Séneca, Marco Aurelio, Epicteto, Aristóteles, Epicuro…) cuando una idea suya ilumine de verdad lo que se habla, como mucho una vez por respuesta. No inventes citas: si no estás seguro de las palabras exactas, cuenta la idea sin comillas.

Cómo aconsejas:
- Primero entiende: si no sabes lo bastante, haz una pregunta antes de aconsejar.
- Sé honesto: no des la razón por darla. Si ves una excusa o un plan poco realista, dilo con tacto y propón algo mejor.
- Concreto y práctico: un paso pequeño que se pueda dar hoy vale más que un discurso.
- Respeta sus decisiones: propones, no ordenas.
- Celebra lo conseguido sin exagerar.

Límites:
- No eres médico ni psicólogo: no diagnostiques. Si se habla de salud, recomienda consultar a un profesional cuando haga falta.
- Si notas una crisis o ideas de hacerse daño, deja a un lado los hábitos: muestra que te importa y anima a hablar ya con alguien de confianza o con un profesional (en España, la línea 024, gratuita y a todas horas).`,
  },
};

// El nombre de un motor para enseñarlo: "claude-sonnet-5-5" → "Claude
// Sonnet 5.5".
function nombreDelMotor(motor) {
  const palabras = [];
  const numeros = [];
  motor.split("-").forEach(function (trozo) {
    if (isNaN(trozo)) {
      palabras.push(trozo.charAt(0).toUpperCase() + trozo.slice(1));
    } else {
      numeros.push(trozo);
    }
  });
  return palabras.join(" ") + " " + numeros.join(".");
}

// ==========================================================================
// 3. HABLAR CON LA BASE DE DATOS
// Como en «recordatorios», con la clave secreta.
// ==========================================================================

// Una petición a la base de datos (ruta: "uso_consejeros?…" o
// "rpc/sumar_uso"). Devuelve lo que conteste (o null si no contesta nada).
async function baseDeDatos(metodo, ruta, cuerpo) {
  const opciones = {
    method: metodo,
    headers: {
      apikey: claveSecreta,
      Authorization: "Bearer " + claveSecreta,
      "Content-Type": "application/json",
    },
  };
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

// ==========================================================================
// 4. QUIÉN PREGUNTA
// Solo los usuarios de Ergon (los que tienen cuenta en tu proyecto) pueden
// usar la función. Supabase dice quién es a partir de su pase.
// ==========================================================================

// Devuelve el id del usuario o lanza un fallo 401 si el pase no vale.
async function usuarioDe(peticion) {
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
// 5. EL USO DE CADA DÍA
// La tabla «uso_consejeros» guarda, por usuario y día, los mensajes, los
// tokens y lo que han costado (en dólares). Puedes mirarla en Table Editor.
// ==========================================================================

// El día de hoy en la zona del contador ("2026-10-17").
function hoyEnEspana() {
  return new Date().toLocaleDateString("en-CA", { timeZone: zonaDelContador });
}

// Cómo va hoy un usuario: { mensajes, coste }.
async function usoDeHoy(usuario) {
  const filas = await baseDeDatos(
    "GET",
    "uso_consejeros?select=mensajes,coste&usuario=eq." +
      usuario +
      "&dia=eq." +
      hoyEnEspana(),
  );
  if (filas.length === 0) {
    return { mensajes: 0, coste: 0 };
  }
  return { mensajes: filas[0].mensajes, coste: Number(filas[0].coste) };
}

// Suma un mensaje con sus tokens y su coste. La suma la hace la base de
// datos (función sumar_uso de consejeros.sql), así dos mensajes a la vez
// no se pisan. Devuelve cómo queda el día: { mensajes, coste }.
async function sumarUso(usuario, entrada, salida, coste) {
  const total = await baseDeDatos("POST", "rpc/sumar_uso", {
    p_usuario: usuario,
    p_dia: hoyEnEspana(),
    p_entrada: entrada,
    p_salida: salida,
    p_coste: coste,
  });
  return { mensajes: total.mensajes, coste: Number(total.coste) };
}

// Lo que la app enseña sobre el uso.
function resumenDeUso(consejero, uso) {
  return {
    listo: claveClaude() !== "",
    nombre: consejero.nombre,
    motor: nombreDelMotor(consejero.motor),
    hoy: uso.mensajes,
    limite: limiteDiario,
    coste: uso.coste,
  };
}

// ==========================================================================
// 6. PREPARAR LA CONVERSACIÓN
// La app manda los mensajes como [{ de: "yo" o "consejero", texto }].
// Claude los quiere como [{ role: "user" o "assistant", content }],
// empezando por uno del usuario y alternando.
// ==========================================================================

function prepararMensajes(mensajes) {
  if (!Array.isArray(mensajes) || mensajes.length === 0) {
    throw fallo(400, "No hay ningún mensaje.");
  }

  let lista = [];
  mensajes.forEach(function (mensaje) {
    const texto = String((mensaje && mensaje.texto) || "").trim();
    if (texto === "") {
      return;
    }
    if (texto.length > maxLetras) {
      throw fallo(
        400,
        "El mensaje es demasiado largo (como mucho, " + maxLetras + " letras).",
      );
    }
    let rol = "user";
    if (mensaje.de === "consejero") {
      rol = "assistant";
    }
    // Dos seguidos del mismo: se juntan en uno
    const ultimo = lista[lista.length - 1];
    if (ultimo && ultimo.role === rol) {
      ultimo.content = ultimo.content + "\n\n" + texto;
    } else {
      lista.push({ role: rol, content: texto });
    }
  });

  // Solo los últimos, y empezando por uno del usuario (los saludos del
  // consejero que pone la app al principio no hacen falta)
  lista = lista.slice(-maxMensajes);
  while (lista.length > 0 && lista[0].role !== "user") {
    lista.shift();
  }

  if (lista.length === 0 || lista[lista.length - 1].role !== "user") {
    throw fallo(400, "El último mensaje tiene que ser tuyo.");
  }
  return lista;
}

// ==========================================================================
// 7. HABLAR CON CLAUDE
// Una petición a la API de Claude (Messages) con fetch, como las de la
// app a Supabase. La clave va en la cabecera x-api-key.
// ==========================================================================

// Convierte un fallo de Claude en una explicación para la app.
function explicarFallo(estado, mensaje) {
  if (estado === 401) {
    return "La clave de Claude no es válida. Revisa el secreto ANTHROPIC_API_KEY en Supabase.";
  }
  if (estado === 402 || /credit balance/i.test(mensaje)) {
    return "No queda saldo en tu cuenta de Claude: añade crédito en platform.claude.com.";
  }
  if (/specified API usage limits/i.test(mensaje)) {
    return "Has llegado al límite de gasto que pusiste en la consola de Claude.";
  }
  if (estado === 429) {
    return "Claude ha recibido demasiadas peticiones seguidas: prueba otra vez en un minuto.";
  }
  if (estado === 529 || estado >= 500) {
    return "Claude está saturado ahora mismo: prueba otra vez en un momento.";
  }
  return "Claude no ha aceptado la petición (" + estado + ": " + mensaje + ").";
}

// Manda la conversación a Claude. Devuelve { texto, entrada, salida }
// (texto: su respuesta; entrada y salida: los tokens que cobra).
async function preguntarAClaude(consejero, mensajes) {
  const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": claveClaude(),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: consejero.motor,
      max_tokens: consejero.maxTokens,
      system: consejero.instrucciones,
      messages: mensajes,
      output_config: { effort: consejero.esfuerzo },
    }),
  });

  const datos = await respuesta.json();
  if (!respuesta.ok) {
    const mensaje = (datos.error && datos.error.message) || "";
    console.error("Claude contestó " + respuesta.status + ":", mensaje);
    throw fallo(502, explicarFallo(respuesta.status, mensaje));
  }

  // La respuesta llega en trozos (content): lo que ha pensado (thinking)
  // y lo que escribe (text). Solo se queda lo que escribe
  const texto = datos.content
    .filter(function (trozo) {
      return trozo.type === "text";
    })
    .map(function (trozo) {
      return trozo.text;
    })
    .join("")
    .trim();

  return {
    texto: texto,
    entrada: datos.usage.input_tokens,
    salida: datos.usage.output_tokens,
  };
}

// «hablar»: todo el camino. Devuelve { texto, uso }.
async function hablar(usuario, cuerpo) {
  const consejero = consejeros[cuerpo.consejero];
  if (!consejero) {
    throw fallo(400, "No conozco a ese consejero.");
  }
  if (claveClaude() === "") {
    throw fallo(
      503,
      "Falta la clave de Claude: añádela en Supabase (Edge Functions → Secrets) con el nombre ANTHROPIC_API_KEY.",
    );
  }

  const mensajes = prepararMensajes(cuerpo.mensajes);

  const antes = await usoDeHoy(usuario);
  if (antes.mensajes >= limiteDiario) {
    throw fallo(
      429,
      "Por hoy ya hemos hablado bastante (" +
        limiteDiario +
        " mensajes). Mañana seguimos.",
    );
  }

  const respuesta = await preguntarAClaude(consejero, mensajes);

  // Lo que ha costado: tokens × precio por millón
  const coste =
    (respuesta.entrada * consejero.precio.entrada +
      respuesta.salida * consejero.precio.salida) /
    1000000;
  const uso = await sumarUso(
    usuario,
    respuesta.entrada,
    respuesta.salida,
    coste,
  );

  if (respuesta.texto === "") {
    throw fallo(
      502,
      consejero.nombre +
        " se ha quedado pensando: prueba a escribirle otra vez.",
    );
  }
  return { texto: respuesta.texto, uso: resumenDeUso(consejero, uso) };
}

// ==========================================================================
// 8. LO QUE LLEGA A LA FUNCIÓN
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

    const usuario = await usuarioDe(peticion);

    if (cuerpo.accion === "uso") {
      const consejero = consejeros[cuerpo.consejero || "mentor"];
      if (!consejero) {
        throw fallo(400, "No conozco a ese consejero.");
      }
      return contestar(resumenDeUso(consejero, await usoDeHoy(usuario)));
    }
    if (cuerpo.accion === "hablar") {
      return contestar(await hablar(usuario, cuerpo));
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
