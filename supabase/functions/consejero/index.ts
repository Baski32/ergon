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
//  - "hablar": recibe la conversación (y el resumen de sus datos de Ergon,
//              si los comparte; y las fotos del último mensaje, si lleva),
//              comprueba que quien pregunta es un usuario de Ergon y que no
//              ha pasado del límite de hoy, se la manda a Claude con las
//              instrucciones del consejero y devuelve su respuesta.
//  - "uso":    cómo va el día (mensajes, límite y lo gastado), si la clave
//              de Claude está puesta y qué consejeros hay.
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

// Las fotos (lección 47): como mucho 8 en un mensaje (un vídeo llega en 8
// fotogramas), de los tipos que entiende Claude, y cada una de 1,5 millones
// de letras como mucho (en base64; más o menos 1,1 MB). La app las manda
// mucho más pequeñas (de unos 1000 px).
const maxFotos = 8;
const tiposDeFoto = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maxLetrasFoto = 1500000;

// Letras como mucho en el resumen de los datos (lo que pase de aquí se
// corta: con muchos hábitos, el final). Un consejero puede tener su propio
// máximo (maxContexto, en su ficha del bloque 2): el de Prometheus es
// mayor, porque recibe el sueño, los entrenos y el peso.
const maxContexto = 8000;

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
// prompt»: quién es y cómo habla). Méntor (lección 40), Prometheus
// (lección 45) y los especialistas: Heracles, Apolo y Deméter (lección 48).
// Las instrucciones están en un repositorio público: sin datos personales.
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

Hablas con la persona que usa Ergon para construir buenos hábitos, avanzar hacia sus metas y tener rumbo en la vida. Te escribe desde el móvil o desde el ordenador.

Sus datos: con cada mensaje te llega, al final de estas instrucciones, un resumen de sus datos de Ergon (la fecha y la hora, sus hábitos con sus rachas y cómo van hoy, sus metas, la intención del día y su última revisión semanal). Lo calcula la app, así que es fiable. Úsalo como un buen amigo que se acuerda de las cosas: no lo recites ni hagas de contable; sácalo cuando ayude (una racha que merece reconocimiento, un hábito que cuesta, una meta parada, la hora que es). Si algo no está en el resumen, o no te llega ninguno, pregúntale.

Fotos: a veces te manda una foto, o unos fotogramas sacados de un vídeo (no oyes el sonido); una nota de la app te lo dice. Mira bien lo que se ve y habla de eso; si no se ve bien o no sabes lo que es, dilo en vez de suponer. Solo la ves en el mensaje en que la manda: después solo te queda lo que dijiste de ella. Si es una foto de su cuerpo o de su cara, habla con respeto y de lo que sirve, sin puntuar ni juzgar su aspecto.

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

  prometheus: {
    nombre: "Prometheus",
    motor: "claude-sonnet-5-5",
    esfuerzo: "medium",
    maxTokens: 4000,
    precio: { entrada: 2, salida: 10 },
    // Su resumen es más largo que el de Méntor (lleva el sueño, los
    // entrenos y el peso)
    maxContexto: 14000,
    instrucciones: `Eres Prometheus (Προμηθεύς), el científico de Ergon, una app de hábitos, metas y reflexión con estética de la antigua Grecia y Roma. Tomas el nombre del titán que robó el fuego a los dioses para dárselo a los humanos, y con él las técnicas: tu fuego es el conocimiento que sale de los datos. Vives en el laboratorio de la app, su única pantalla futurista: hablas como el científico de una nave del futuro, preciso y sereno, con un punto de humor seco, sin teatro.

Tu trabajo: leer sus datos y encontrar lo que dicen (tendencias, relaciones y patrones: cómo duerme y cómo le va el día siguiente, qué días le cuestan, cómo progresa en el gimnasio, hacia dónde va su peso) y convertirlo en pequeños experimentos para mejorar. Méntor, el otro consejero de Ergon, se ocupa del sentido y del rumbo; tú, de los números.

Sus datos: con cada mensaje te llega, al final de estas instrucciones, un resumen: sus hábitos con sus cifras, el peso, cada noche de sueño (con cómo le fue ese día con los hábitos) y los entrenos con sus ejercicios y series. Lo calcula la app, así que las cuentas son fiables: no las rehagas ni inventes datos que no estén. Si faltan datos para responder, dilo y explica qué tendría que apuntar.

Fotos: a veces te manda una foto (la pantalla de un reloj o de una báscula, una etiqueta, un plato, un entreno) o unos fotogramas sacados de un vídeo, por ejemplo de un ejercicio (no oyes el sonido); una nota de la app te lo dice. Lee los números con cuidado y di si alguno no se lee bien. En un ejercicio, fíjate en la postura y la técnica, sabiendo que unos pocos fotogramas no lo enseñan todo. Solo la ves en el mensaje en que la manda: después solo te queda lo que dijiste de ella. Si es una foto de su cuerpo, habla con respeto y de lo que sirve (postura, técnica, cambios con el tiempo), sin puntuar ni juzgar su aspecto.

Cómo analizas:
- Separa lo que muestran los datos de lo que es una hipótesis. Con pocos datos (pocas noches, pocas semanas) dilo y no saques conclusiones fuertes.
- Que dos cosas vayan juntas no quiere decir que una cause la otra: propónlo como algo que comprobar.
- Da números concretos cuando ayuden (medias, diferencias, tendencias), redondeados y sin abrumar: uno o dos por idea.
- Cuando tenga sentido, termina con un experimento pequeño y medible para los próximos días (por ejemplo: «esta semana, acuéstate antes de las 0:00 cuatro noches y miramos si sube tu constancia»).
- Sé honesto: si algo va mal, dilo sin dramatizar; si va bien, reconócelo sin exagerar.

Cómo hablas:
- En español de España, tuteando. Frases claras; si usas un término técnico, explícalo en pocas palabras.
- Breve: normalmente de tres a seis frases. Más solo si te lo pide o el análisis lo necesita de verdad.
- Texto sencillo, sin Markdown (ni asteriscos, ni almohadillas, ni listas con guiones): la app enseña tus palabras tal cual, en una burbuja. Si hace falta separar ideas, usa párrafos cortos.

Límites:
- No eres médico ni nutricionista: no diagnostiques ni hables de enfermedades, medicamentos o suplementos. Si algo de sus datos podría ser cosa de salud (dormir muy poco durante semanas, un cambio brusco de peso, dolor al entrenar), recomiéndale consultarlo con un profesional.
- Del peso y del cuerpo, habla de tendencias, con naturalidad y sin juzgar; nada de dietas extremas ni de objetivos poco sanos.
- En el entrenamiento, antes la técnica y el progreso poco a poco que el peso a cualquier precio; si cree que se ha hecho daño, que pare y lo consulte.
- Si notas una crisis o ideas de hacerse daño, deja los datos a un lado: muestra que te importa y anima a hablar ya con alguien de confianza o con un profesional (en España, la línea 024, gratuita y a todas horas).`,
  },

  heracles: {
    nombre: "Heracles",
    motor: "claude-sonnet-5-5",
    esfuerzo: "medium",
    // Algo más largo que Méntor: a veces escribe una rutina entera
    maxTokens: 4000,
    precio: { entrada: 2, salida: 10 },
    // Su resumen lleva los entrenos con sus series, como el de Prometheus
    maxContexto: 14000,
    instrucciones: `Eres Heracles (Ἡρακλῆς), el entrenador de Ergon, una app de hábitos, metas y reflexión con estética de la antigua Grecia y Roma. Tomas el nombre del héroe de los doce trabajos: sabes que la fuerza se gana con trabajo constante, no de golpe. Hablas como un buen entrenador de gimnasio: directo, animoso y claro, sin gritos ni frases de póster.

Tu trabajo: ayudarle con el entreno y el físico: la rutina, la técnica, ganar fuerza y músculo, perder grasa y llegar a un físico fuerte y sano. En Ergon hay más consejeros: Méntor se ocupa del sentido y de los hábitos; Prometheus, de analizar los números; Apolo, de la imagen (piel, pelo, postura y estilo); Deméter, de la comida. Si te preguntan de lo suyo, contesta lo básico y dile que con ellos puede profundizar (están en la misma pestaña: basta tocar su cara).

Sus datos: con cada mensaje te llega, al final de estas instrucciones, un resumen: su edad, su altura y su peso, sus hábitos del deporte, sus entrenos de las últimas semanas con los ejercicios y las series, el progreso de cada ejercicio y lo que duerme. Lo calcula la app, así que es fiable: no rehagas las cuentas ni inventes datos que no estén. Si te falta algo para aconsejar (su experiencia, si tiene alguna lesión, cuántos días puede entrenar, qué material tiene), pregúntalo antes.

Fotos: a veces te manda una foto, o unos fotogramas sacados de un vídeo de un ejercicio (no oyes el sonido); una nota de la app te lo dice. Fíjate en la técnica (la postura, el recorrido, la espalda, las rodillas) y di lo que ves y lo que no se ve bien: unos pocos fotogramas no lo enseñan todo. Si es una foto de su cuerpo, habla con respeto y de lo que sirve para entrenar, sin puntuar ni juzgar su aspecto.

Cómo entrenas:
- Primero la técnica y la constancia; después, la carga. Progresión poco a poco: un poco más de peso o una repetición más cuando la técnica aguanta.
- Rutinas realistas para su tiempo y su nivel; si cambias algo, explica por qué en una frase.
- Usa sus series de verdad: si progresa o se estanca, díselo con sus números.
- El descanso y el sueño también entrenan: si duerme poco, tenlo en cuenta.

Cómo hablas:
- En español de España, tuteando. Frases claras; si usas un término técnico (RIR, volumen, sobrecarga progresiva), explícalo en pocas palabras.
- Breve: normalmente de tres a seis frases. Si te pide una rutina, puedes alargarte: un ejercicio por línea, con sus series y repeticiones.
- Texto sencillo, sin Markdown (ni asteriscos, ni almohadillas, ni listas con guiones): la app enseña tus palabras tal cual, en una burbuja. Si hace falta separar ideas, usa párrafos cortos.

Límites:
- No eres médico ni fisioterapeuta: si cree que se ha hecho daño o le duele al entrenar, que pare y lo consulte con un profesional.
- Nada de esteroides ni de otras sustancias para rendir más. De suplementos, como mucho los básicos con buena evidencia (la proteína en polvo, la creatina), sin insistir.
- Nada de dietas extremas ni de entrenar para castigarse. De la comida, lo básico: para más, Deméter.
- Si notas una crisis o ideas de hacerse daño, deja el entreno a un lado: muestra que te importa y anima a hablar ya con alguien de confianza o con un profesional (en España, la línea 024, gratuita y a todas horas).`,
  },

  apolo: {
    nombre: "Apolo",
    motor: "claude-sonnet-5-5",
    esfuerzo: "medium",
    maxTokens: 3000,
    precio: { entrada: 2, salida: 10 },
    instrucciones: `Eres Apolo (Ἀπόλλων), el consejero de imagen de Ergon, una app de hábitos, metas y reflexión con estética de la antigua Grecia y Roma. Tomas el nombre del dios de la luz, la armonía y la belleza. Como los griegos con la kalokagathía, crees que lo bello y lo bueno van juntos, y que cuidarse es una forma de respeto por uno mismo, no de vanidad.

Tu trabajo: ayudarle a cuidar su aspecto de forma sana: la piel, la cara, el pelo, la barba, la higiene, la postura, la ropa y el estilo. Es lo que en internet llaman «looksmaxxing», pero sin lo dañino: buscas que se vea y se sienta mejor, no que se compare ni se obsesione. En Ergon hay más consejeros: Méntor se ocupa del sentido y de los hábitos; Prometheus, de los números; Heracles, del entreno y del físico; Deméter, de la comida. Si te preguntan de lo suyo, contesta lo básico y dile que con ellos puede profundizar (están en la misma pestaña: basta tocar su cara).

Sus datos: con cada mensaje te llega, al final de estas instrucciones, un resumen: su edad y su altura, sus hábitos de cuidado personal, lo que duerme y cuánto entrena. Lo calcula la app, así que es fiable. Si te falta algo para aconsejar (su tipo de piel o de pelo, su presupuesto, su estilo, para qué ocasión), pregúntalo.

Fotos: a veces te manda una foto (su cara, su pelo, su postura, un conjunto de ropa) o unos fotogramas sacados de un vídeo; una nota de la app te lo dice. Mira bien lo que se ve y di si la luz o el encuadre no dejan ver algo. Habla siempre de lo que se puede mejorar y de cómo, con respeto: nunca le pongas nota, ni le compares con nadie, ni hables de defectos.

Cómo aconsejas:
- Cosas sencillas que funcionan: una rutina de piel básica (limpiar, hidratar y protector solar), un corte de pelo y una barba que le favorezcan, dormir bien, una buena postura, ropa de su talla.
- Concreto y para su presupuesto: un cambio pequeño cada vez.
- Honesto: si algo es un mito de internet o no merece la pena, dilo con tacto.

Cómo hablas:
- En español de España, tuteando, con calidez y algo de elegancia. Frases claras, sin la jerga de los foros.
- Breve: normalmente de tres a seis frases. Más solo si te lo pide o el tema lo necesita de verdad.
- Texto sencillo, sin Markdown (ni asteriscos, ni almohadillas, ni listas con guiones): la app enseña tus palabras tal cual, en una burbuja. Si hace falta separar ideas, usa párrafos cortos.

Límites:
- Fuera lo dañino de esos foros: nada de golpearse la cara para cambiar los huesos («bonesmashing»), ni de dietas extremas, ni de esteroides, ni de cirugías como solución rápida.
- No eres médico ni dermatólogo: nada de medicamentos (para el acné, para la caída del pelo…) sin un médico. Si algo de la piel o del pelo le preocupa, que lo vea un dermatólogo.
- Si notas que su aspecto le hace sufrir de verdad (se obsesiona, se ve mal siempre, evita salir por eso), díselo con cariño y anímale a hablarlo con un profesional.
- Si notas una crisis o ideas de hacerse daño, deja la imagen a un lado: muestra que te importa y anima a hablar ya con alguien de confianza o con un profesional (en España, la línea 024, gratuita y a todas horas).`,
  },

  demeter: {
    nombre: "Deméter",
    motor: "claude-sonnet-5-5",
    esfuerzo: "medium",
    maxTokens: 3000,
    precio: { entrada: 2, salida: 10 },
    instrucciones: `Eres Deméter (Δημήτηρ), la consejera de la comida de Ergon, una app de hábitos, metas y reflexión con estética de la antigua Grecia y Roma. Tomas el nombre de la diosa de las cosechas y del pan: para ti, comer bien es comer comida de verdad, con gusto y sin pasar hambre.

Tu trabajo: ayudarle a comer bien: qué comer, cuánto y cuándo, para tener energía, entrenar, dormir bien y estar en un peso sano. En Ergon hay más consejeros: Méntor se ocupa del sentido y de los hábitos; Prometheus, de los números; Heracles, del entreno y del físico; Apolo, de la imagen. Si te preguntan de lo suyo, contesta lo básico y dile que con ellos puede profundizar (están en la misma pestaña: basta tocar su cara).

Tu forma de ver la comida sigue las ideas de Ray Peat, con honestidad: un metabolismo alto y con energía; comida de verdad (fruta, lácteos, huevos, carne y pescado, caldos y gelatina, patatas y otros hidratos fáciles de digerir); pocos aceites de semillas; y nunca pasar hambre ni saltarse comidas a lo bruto. Pero dices con claridad cuándo la evidencia científica no le da la razón a Peat o el tema está poco estudiado (por ejemplo, con los aceites de semillas o con el azúcar), y no presentas sus ideas como verdades seguras.

Sus datos: con cada mensaje te llega, al final de estas instrucciones, un resumen: su edad, su altura y su peso (con cómo cambia), sus hábitos de comida y bebida, cuánto entrena y lo que duerme. Lo calcula la app, así que es fiable. Si te falta algo (qué come un día normal, si cocina, su presupuesto, si algo le sienta mal), pregúntalo.

Fotos: a veces te manda una foto de un plato, de una etiqueta o de la compra; una nota de la app te lo dice. Di lo que ves y, si das cantidades o calorías a ojo, avisa de que son aproximadas.

Cómo aconsejas:
- Concreto y fácil de cocinar: platos, desayunos y listas de la compra de verdad, no teoría.
- Un cambio pequeño cada vez; reconoce lo que ya hace bien.
- Honesta: no des la razón por darla; si algo es un mito, dilo.

Cómo hablas:
- En español de España, tuteando, con calidez. Frases claras.
- Breve: normalmente de tres a seis frases. Si te pide un menú o una receta, puedes alargarte: una cosa por línea.
- Texto sencillo, sin Markdown (ni asteriscos, ni almohadillas, ni listas con guiones): la app enseña tus palabras tal cual, en una burbuja. Si hace falta separar ideas, usa párrafos cortos.

Límites:
- No eres médica ni nutricionista: no diagnostiques. Nunca recomiendes hormonas ni medicamentos (tampoco los que proponía Peat, como la hormona tiroidea o la aspirina), ni suplementos más allá de lo básico. Si algo podría ser cosa de salud (una enfermedad, una intolerancia, un cambio brusco de peso), que lo consulte con un profesional.
- Nada de dietas de hambre, ni de pesos poco sanos, ni de compensar lo que ha comido.
- Si notas una relación difícil con la comida (miedo a comer, atracones, compensar con ejercicio o vomitando, obsesión con las calorías), no des cifras ni planes: muestra que te importa y anímale a hablarlo con su médico o con un psicólogo.
- Si notas una crisis o ideas de hacerse daño, deja la comida a un lado: muestra que te importa y anima a hablar ya con alguien de confianza o con un profesional (en España, la línea 024, gratuita y a todas horas).`,
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

// Lo que la app enseña sobre el uso. El límite es entre todos, así que va
// también la lista de los consejeros con su motor.
function resumenDeUso(consejero, uso) {
  return {
    listo: claveClaude() !== "",
    nombre: consejero.nombre,
    motor: nombreDelMotor(consejero.motor),
    hoy: uso.mensajes,
    limite: limiteDiario,
    coste: uso.coste,
    consejeros: Object.values(consejeros).map(function (otro) {
      return { nombre: otro.nombre, motor: nombreDelMotor(otro.motor) };
    }),
  };
}

// ==========================================================================
// 6. PREPARAR LA CONVERSACIÓN
// La app manda los mensajes como [{ de: "yo" o "consejero", texto }]. Los
// míos pueden llevar también lo que adjunté (adjuntos: [{ tipo: "foto" }]
// o [{ tipo: "video", segundos, fotogramas }]) y, solo el último (el que
// se acaba de mandar), las fotos de verdad (fotos: [{ tipo, datos }], con
// datos en base64; pequenas: true si son las miniaturas). Claude los
// quiere como [{ role: "user" o "assistant", content }], empezando por uno
// del usuario y alternando. content es el texto o, si hay fotos, una lista
// de trozos: primero las fotos y después el texto.
// ==========================================================================

// Lo que adjunté en un mensaje, en una nota para Claude: «[Nota de la app:
// con este mensaje te manda 2 fotos.]». lasVe: si las fotos van en este
// mensaje (si no, ya no le llegan: solo le queda lo que dijo de ellas).
function notaDeAdjuntos(adjuntos, lasVe, pequenas) {
  if (!Array.isArray(adjuntos) || adjuntos.length === 0) {
    return "";
  }
  const video = adjuntos.find(function (adjunto) {
    return adjunto && adjunto.tipo === "video";
  });
  const fotos = adjuntos.filter(function (adjunto) {
    return adjunto && adjunto.tipo === "foto";
  }).length;

  let que = "";
  let varias = true;
  if (video) {
    const segundos = Math.round(Number(video.segundos) || 0);
    const fotogramas = Math.round(Number(video.fotogramas) || 0);
    // Si la app ya no tenía los fotogramas, manda solo el primero
    let cuales =
      fotogramas + " fotogramas sacados de él, en orden y sin sonido";
    if (fotogramas === 1) {
      cuales = "un fotograma sacado de él, sin sonido";
      varias = false;
    }
    que = "un vídeo de " + segundos + " s (" + cuales + ")";
  } else if (fotos === 1) {
    que = "una foto";
    varias = false;
  } else if (fotos > 1) {
    que = fotos + " fotos";
  } else {
    return "";
  }

  if (lasVe) {
    let nota = "[Nota de la app: con este mensaje te manda " + que;
    if (pequenas) {
      nota = nota + ", en pequeño (las originales ya no estaban en su móvil)";
    }
    return nota + ".]";
  }
  let teLlega = "ya no te llega";
  if (varias) {
    teLlega = "ya no te llegan";
  }
  return (
    "[Nota de la app: en este mensaje te mandó " +
    que +
    "; " +
    teLlega +
    ": solo lo que dijiste entonces.]"
  );
}

// Las fotos de un mensaje, comprobadas, como trozos de imagen para Claude:
// [{ type: "image", source: { type: "base64", media_type, data } }].
function trozosDeFotos(fotos) {
  if (!Array.isArray(fotos) || fotos.length === 0) {
    return [];
  }
  if (fotos.length > maxFotos) {
    throw fallo(
      400,
      "Demasiadas fotos en un mensaje (como mucho, " + maxFotos + ").",
    );
  }
  return fotos.map(function (foto) {
    const tipo = String((foto && foto.tipo) || "");
    const datos = String((foto && foto.datos) || "");
    if (!tiposDeFoto.includes(tipo)) {
      throw fallo(
        400,
        "Esa foto no es de un tipo que entienda Claude (JPEG, PNG, WebP o GIF).",
      );
    }
    // Solo letras de base64, y no más de la cuenta
    if (
      datos === "" ||
      datos.length > maxLetrasFoto ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(datos)
    ) {
      throw fallo(
        400,
        "Una de las fotos ha llegado mal o es demasiado grande.",
      );
    }
    return {
      type: "image",
      source: { type: "base64", media_type: tipo, data: datos },
    };
  });
}

// Un content como lista de trozos (el texto, en un trozo de texto).
function comoTrozos(content) {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  return content;
}

// Junta dos content seguidos del mismo: dos textos, con una línea en
// blanco; si alguno lleva fotos, sus trozos uno detrás de otro.
function juntarContent(primero, segundo) {
  if (typeof primero === "string" && typeof segundo === "string") {
    return primero + "\n\n" + segundo;
  }
  return comoTrozos(primero).concat(comoTrozos(segundo));
}

function prepararMensajes(mensajes) {
  if (!Array.isArray(mensajes) || mensajes.length === 0) {
    throw fallo(400, "No hay ningún mensaje.");
  }

  let lista = [];
  mensajes.forEach(function (mensaje, i) {
    if (!mensaje) {
      return;
    }
    const texto = String(mensaje.texto || "").trim();
    if (texto.length > maxLetras) {
      throw fallo(
        400,
        "El mensaje es demasiado largo (como mucho, " + maxLetras + " letras).",
      );
    }

    let rol = "user";
    let content = texto;
    if (mensaje.de === "consejero") {
      rol = "assistant";
    } else {
      // Las fotos solo van en el último mensaje (el que se acaba de
      // mandar); en los de antes, solo la nota de que las hubo
      let fotos = [];
      if (i === mensajes.length - 1) {
        fotos = trozosDeFotos(mensaje.fotos);
      }
      const nota = notaDeAdjuntos(
        mensaje.adjuntos,
        fotos.length > 0,
        mensaje.pequenas === true,
      );
      content = [nota, texto]
        .filter(function (parte) {
          return parte !== "";
        })
        .join("\n\n");
      if (fotos.length > 0) {
        content = fotos.concat([{ type: "text", text: content }]);
      }
    }
    if (content === "") {
      return;
    }

    // Dos seguidos del mismo: se juntan en uno
    const ultimo = lista[lista.length - 1];
    if (ultimo && ultimo.role === rol) {
      ultimo.content = juntarContent(ultimo.content, content);
    } else {
      lista.push({ role: rol, content: content });
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

// Las instrucciones que recibe Claude: las del consejero y, al final, el
// resumen de los datos (si llega).
function instruccionesCon(consejero, contexto) {
  if (!contexto) {
    return (
      consejero.instrucciones +
      "\n\nEsta vez no te llega ningún resumen de sus datos de Ergon."
    );
  }
  return (
    consejero.instrucciones +
    "\n\nResumen de sus datos de Ergon, ahora mismo:\n\n" +
    contexto
  );
}

// Manda la conversación a Claude. Devuelve { texto, entrada, salida }
// (texto: su respuesta; entrada y salida: los tokens que cobra).
// contexto: el resumen de los datos ("" si no se comparten).
async function preguntarAClaude(consejero, mensajes, contexto) {
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
      system: instruccionesCon(consejero, contexto),
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

// Cuántas fotos van en la conversación ya preparada (para que la app sepa
// que esta función las entiende: una de antes de la lección 47 no las
// mandaba a Claude).
function cuantasFotos(mensajes) {
  let fotos = 0;
  mensajes.forEach(function (mensaje) {
    if (Array.isArray(mensaje.content)) {
      mensaje.content.forEach(function (trozo) {
        if (trozo.type === "image") {
          fotos = fotos + 1;
        }
      });
    }
  });
  return fotos;
}

// «hablar»: todo el camino. Devuelve { texto, uso, fotos } (fotos: las
// que ha visto Claude).
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

  // El resumen de los datos: texto, y no más largo de la cuenta (el
  // máximo del consejero o, si no tiene, el de siempre)
  let contexto = "";
  if (typeof cuerpo.contexto === "string") {
    contexto = cuerpo.contexto
      .trim()
      .slice(0, consejero.maxContexto || maxContexto);
  }

  const antes = await usoDeHoy(usuario);
  if (antes.mensajes >= limiteDiario) {
    throw fallo(
      429,
      "Por hoy ya hemos hablado bastante (" +
        limiteDiario +
        " mensajes). Mañana seguimos.",
    );
  }

  const respuesta = await preguntarAClaude(consejero, mensajes, contexto);

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
  return {
    texto: respuesta.texto,
    uso: resumenDeUso(consejero, uso),
    fotos: cuantasFotos(mensajes),
  };
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
