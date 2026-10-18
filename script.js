// ==========================================================================
// ERGON — script.js
// Toda la lógica de la app. Los datos se guardan en este dispositivo y, con
// la cuenta abierta, también en la nube (Supabase, bloques 21 a 26).
//
// ÍNDICE
//  1. Datos guardados
//  2. Cita del día
//  3. Hábitos · Reglas, rachas y resumen del día
//  4. Hábitos · Iconos
//  5. Hábitos · Lista de hoy
//  6. Hábitos · Ventana de editar hábito
//  7. Avisos
//  8. Méntor · La conversación
//  9. Méntor · Hábito nuevo
// 10. Méntor · Meta nueva
// 11. Méntor · Bienvenida
// 12. Rituales de mañana y de noche
// 13. Revisión semanal
// 14. Semana
// 15. Constancia
// 16. Mosaico del mes
// 17. Metas · Tarjetas
// 18. Metas · Ventana de editar meta
// 19. Perfil
// 20. Copia de seguridad
// 21. Nube · Cuenta
// 22. Nube · Sincronizar
// 23. Recordatorios
// 24. Consejeros · Conexión
// 25. Consejeros · Las charlas (Méntor y Prometheus)
// 26. Consejeros · Lo que ven de mí
// 27. Prometheus · Estadísticas
// 28. Prometheus · El laboratorio
// 29. Prometheus · Apuntar el sueño
// 30. Prometheus · Apuntar los entrenos
// 31. Barra superior y navegación
// 32. App instalable (service worker)
// 33. Inicio
// ==========================================================================

// ==========================================================================
// 1. DATOS GUARDADOS
// Lo que Ergon guarda en el navegador (localStorage) y las funciones que lo
// guardan. Cada dispositivo (PC, iPhone) tiene sus propios datos; si se ha
// entrado en la cuenta, cada cambio se apunta también para subirlo a la
// nube (apuntarCambio, bloque 22).
// ==========================================================================

// Fecha de hoy como texto, p. ej. "2026-10-12". Es la clave de cada día.
const hoy = new Date().toLocaleDateString("en-CA");

// Registro de todos los días: { "2026-10-12": { idDelHábito: true o cantidad } }
const registro = JSON.parse(localStorage.getItem("ergon-registro")) || {};

// Lo apuntado hoy (el trozo del registro que corresponde a hoy).
const habitosHoy = registro[hoy] || {};

// Lista de hábitos: { id, nombre, icono, frecuencia, dias, vecesSemana,
// medida, objetivo, unidad, limite, inicio, comodin, cambios }
const habitos = JSON.parse(localStorage.getItem("ergon-habitos")) || [];

// Lista de metas: { titulo, area, habito, pasos: [{ texto, completado }],
// victoria (el día en que se cumplió) }
const metas = JSON.parse(localStorage.getItem("ergon-metas")) || [];

// Perfil: { nombre, nacimiento, altura, pesos: [{ fecha, kilos }] }. Todo es
// opcional: lo que no se ha rellenado, no está.
const perfil = JSON.parse(localStorage.getItem("ergon-perfil")) || {};

// Rituales de cada día: { "2026-10-16": { intencion, examen } }
const rituales = JSON.parse(localStorage.getItem("ergon-rituales")) || {};

// Revisiones de cada semana, por el lunes de esa semana:
// { "2026-10-12": { fecha, cumplido, bien, costado, proposito, perfectos, vividos } }
const revisiones = JSON.parse(localStorage.getItem("ergon-revisiones")) || {};

// Recordatorios (bloque 23), los mismos en todos los dispositivos de la
// cuenta: { manana: { activo, hora }, habitos, noche, domingo, zona }. Vacío
// hasta que se activan o se cambian por primera vez.
const recordatorios =
  JSON.parse(localStorage.getItem("ergon-recordatorios")) || {};

// Conversaciones con los consejeros (bloque 25), por su id. consejero:
// con quién es ("mentor" o "prometheus"):
// { "c1760700000000": { id, consejero, creada, actualizada, titulo,
//   mensajes: [{ de: "yo" o "consejero", texto, hora }] } }
const conversaciones =
  JSON.parse(localStorage.getItem("ergon-conversaciones")) || {};

// Ajustes de los consejeros (bloque 26): { compartir, compartirPrometheus }
// (si Méntor y Prometheus ven mis datos; sin ajustar, sí). Los mismos en
// todos los dispositivos.
const ajustesConsejeros =
  JSON.parse(localStorage.getItem("ergon-consejeros")) || {};

// El sueño de cada noche, por el día en que me levanté (bloque 29):
// { "2026-10-16": { acostarse: "23:40", levantarse: "07:30",
//   calidad: "bien", "regular" o "mal" } }
const sueno = JSON.parse(localStorage.getItem("ergon-sueno")) || {};

// Los entrenos, por su id (bloque 30):
// { "e1760700000000": { id, fecha, tipo, minutos, intensidad (1 a 10),
//   ejercicios: [{ nombre, series: [{ repeticiones, kilos }] }], nota,
//   habito (el id del hábito que marcó, o "") } }
const entrenos = JSON.parse(localStorage.getItem("ergon-entrenos")) || {};

// Guarda la lista de hábitos.
function guardarHabitos() {
  localStorage.setItem("ergon-habitos", JSON.stringify(habitos));
  apuntarCambio("ergon-habitos");
}

// Guarda lo apuntado hoy dentro del registro. id: el hábito que ha cambiado
// (en la nube, cada hábito de cada día va en su propia fila).
function guardarRegistro(id) {
  registro[hoy] = habitosHoy;
  localStorage.setItem("ergon-registro", JSON.stringify(registro));
  apuntarCambio("registro:" + hoy + ":" + id);
}

// Guarda la lista de metas.
function guardarMetas() {
  localStorage.setItem("ergon-metas", JSON.stringify(metas));
  apuntarCambio("ergon-metas");
}

// Guarda el perfil.
function guardarPerfil() {
  localStorage.setItem("ergon-perfil", JSON.stringify(perfil));
  apuntarCambio("ergon-perfil");
}

// Guarda los rituales. dia: el día que ha cambiado.
function guardarRituales(dia) {
  localStorage.setItem("ergon-rituales", JSON.stringify(rituales));
  apuntarCambio("ritual:" + dia);
}

// Guarda las revisiones semanales. lunes: la semana que ha cambiado.
function guardarRevisiones(lunes) {
  localStorage.setItem("ergon-revisiones", JSON.stringify(revisiones));
  apuntarCambio("revision:" + lunes);
}

// Guarda los ajustes de los recordatorios.
function guardarRecordatorios() {
  localStorage.setItem("ergon-recordatorios", JSON.stringify(recordatorios));
  apuntarCambio("ergon-recordatorios");
}

// Guarda los ajustes de los consejeros.
function guardarAjustesConsejeros() {
  localStorage.setItem("ergon-consejeros", JSON.stringify(ajustesConsejeros));
  apuntarCambio("ergon-consejeros");
}

// Guarda las conversaciones. id: la que ha cambiado (o se ha borrado).
function guardarConversacion(id) {
  localStorage.setItem("ergon-conversaciones", JSON.stringify(conversaciones));
  apuntarCambio("conversacion:" + id);
}

// Guarda el sueño. dia: la noche que ha cambiado (o se ha borrado).
function guardarSueno(dia) {
  localStorage.setItem("ergon-sueno", JSON.stringify(sueno));
  apuntarCambio("sueno:" + dia);
}

// Guarda los entrenos. id: el que ha cambiado (o se ha borrado).
function guardarEntreno(id) {
  localStorage.setItem("ergon-entrenos", JSON.stringify(entrenos));
  apuntarCambio("entreno:" + id);
}

// ==========================================================================
// 2. CITA DEL DÍA
// Una cita clásica distinta cada día, sacada de citas.json.
// ==========================================================================

// Días que han pasado desde el 1 de enero de 2026. Sirve para elegir la cita.
function numeroDelDia() {
  const inicio = new Date(2026, 0, 1);
  const ahora = new Date();
  const hoyMedianoche = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
  );
  return Math.round((hoyMedianoche - inicio) / 86400000);
}

// Lee citas.json y muestra la cita de hoy. Si falla, muestra una de reserva.
async function mostrarCitaDelDia() {
  const texto = document.getElementById("cita-texto");
  const autor = document.getElementById("cita-autor");

  try {
    const respuesta = await fetch("citas.json");
    const citas = await respuesta.json();

    const cita = citas[numeroDelDia() % citas.length];
    texto.textContent = "«" + cita.texto + "»";
    autor.textContent = "— " + cita.autor + ", " + cita.obra;
  } catch (error) {
    texto.textContent = "«Conócete a ti mismo.»";
    autor.textContent = "— Inscripción del templo de Apolo en Delfos";
  }
}

// ==========================================================================
// 3. HÁBITOS · REGLAS, RACHAS Y RESUMEN DEL DÍA
// Las preguntas que el resto de la app hace sobre los hábitos.
// Cada hábito tiene una frecuencia (cuándo toca: todos los días, días
// concretos o unas veces por semana) y una medida (cómo se cumple).
// Si se edita, sus reglas antiguas se guardan con fecha («cambios»), y los
// días pasados se siguen juzgando con las reglas que tenían.
// ==========================================================================

// Letra de cada día en el orden de getDay(): 0 = domingo, 1 = lunes…
const letrasDias = ["D", "L", "M", "X", "J", "V", "S"];

// Día en que empezó un hábito, como texto "2026-10-12". Los nuevos lo guardan
// en «inicio». Los antiguos no lo tienen: se saca de su id, que lleva dentro
// el momento en que se crearon ("h" + Date.now()).
function inicioDe(habito) {
  if (habito.inicio) {
    return habito.inicio;
  }
  const creado = new Date(Number(habito.id.slice(1)));
  if (isNaN(creado)) {
    return "";
  }
  return creado.toLocaleDateString("en-CA");
}

// Las reglas de un hábito: lo que decide qué días toca y cuándo se cumple.
// Al editarlo, son lo que se guarda para no cambiar el pasado. Los que no
// tiene se rellenan con su valor de siempre (p. ej. "diario"), así dos
// versiones se pueden comparar.
function reglasDe(habito) {
  return {
    frecuencia: habito.frecuencia || "diario",
    dias: habito.dias || [],
    vecesSemana: habito.vecesSemana || 0,
    objetivo: habito.objetivo || 0,
    limite: habito.limite || "minimo",
    comodin: habito.comodin === true,
  };
}

// El hábito tal como era un día ("2026-10-12"). «cambios» guarda, de la más
// antigua a la más nueva, las reglas que tuvo antes de cada edición, cada
// una con el último día en que valió («hasta»). Si ese día es de antes de
// una edición, se usan las reglas de entonces; si no, las de ahora.
function reglasEn(habito, clave) {
  if (!habito.cambios) {
    return habito;
  }

  const cambio = habito.cambios.find(function (c) {
    return clave <= c.hasta;
  });
  if (cambio) {
    // Object.assign copia el hábito en un objeto nuevo ({}) y le pone encima
    // las reglas de entonces. El hábito de verdad no se toca.
    return Object.assign({}, habito, cambio);
  }
  return habito;
}

// ¿Toca este hábito en esta fecha? Antes de su inicio, nunca. Después, los
// diarios (y los antiguos, sin frecuencia) tocan siempre; los de días
// concretos, solo sus días.
function tocaEn(habito, fecha) {
  if (fecha.toLocaleDateString("en-CA") < inicioDe(habito)) {
    return false;
  }

  if (habito.frecuencia === "dias") {
    return habito.dias.includes(fecha.getDay());
  }
  return true;
}

// ¿Está cumplido ese día? Los de cantidad, si llegan al objetivo (o, si es
// un máximo, si se apuntó un número y no se pasa); los de templanza, si no
// hubo recaída; los de casilla, si están marcados.
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

// ¿Hoy ya no tiene remedio? En los de «unas veces por semana», si ya no da
// tiempo a llegar esta semana; en templanza, si hubo recaída; en los de
// «como mucho», si el número apuntado hoy pasa del máximo.
function hoyYaFallado(habito) {
  const valor = habitosHoy[habito.id];

  if (habito.frecuencia === "semanal") {
    const ahora = new Date();
    const hechas = vecesEnSemana(habito, ahora);
    // Días que quedan hasta el domingo, hoy incluido (si hoy ya está hecho, no)
    let quedan = 7 - ((ahora.getDay() + 6) % 7);
    if (estaCumplido(habito, habitosHoy)) {
      quedan--;
    }
    return hechas + quedan < habito.vecesSemana;
  }
  if (habito.medida === "abstencion") {
    return valor === "recaida";
  }
  if (habito.medida === "cantidad" && habito.limite === "maximo") {
    return valor > habito.objetivo;
  }
  return false;
}

// Lunes (a las 00:00) de la semana de una fecha.
function lunesDe(fecha) {
  const lunes = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
  );
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  return lunes;
}

// Cuántas veces se cumplió un hábito en la semana (de lunes a domingo) de una
// fecha.
function vecesEnSemana(habito, fecha) {
  const dia = lunesDe(fecha);
  let veces = 0;

  for (let i = 0; i < 7; i++) {
    const clave = dia.toLocaleDateString("en-CA");
    const habitosDia = registro[clave] || {};
    if (estaCumplido(reglasEn(habito, clave), habitosDia)) {
      veces++;
    }
    dia.setDate(dia.getDate() + 1);
  }

  return veces;
}

// ¿Se llegó a las veces de la semana que empieza ese lunes? Se comparan con
// las veces que tocaban esa semana (las que tenía el hábito su domingo).
function semanaCumplida(habito, lunes) {
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  const reglas = reglasEn(habito, domingo.toLocaleDateString("en-CA"));
  return vecesEnSemana(habito, lunes) >= reglas.vecesSemana;
}

// Racha de los hábitos de «unas veces por semana»: semanas seguidas llegando
// a las veces que tocan. La semana actual suma si ya se ha llegado; si no,
// aún hay tiempo (salvo que ya no dé tiempo: entonces la racha cae a 0).
function calcularRachaSemanas(habito) {
  let racha = 0;
  const lunes = lunesDe(new Date());
  const inicio = inicioDe(habito);

  if (semanaCumplida(habito, lunes)) {
    racha++;
  } else if (hoyYaFallado(habito)) {
    return 0;
  }

  // Semanas anteriores, hacia atrás, hasta la primera que no llegó
  for (let vueltas = 0; vueltas < 520; vueltas++) {
    lunes.setDate(lunes.getDate() - 7);
    const domingo = new Date(lunes);
    domingo.setDate(domingo.getDate() + 6);

    // Semana entera antes de empezar el hábito: ya no hay nada que contar
    if (domingo.toLocaleDateString("en-CA") < inicio) {
      break;
    }

    if (semanaCumplida(habito, lunes)) {
      racha++;
    } else {
      break;
    }
  }

  return racha;
}

// Racha de un hábito: días seguidos cumpliéndolo, contando hacia atrás desde
// hoy (los días de descanso ni suman ni rompen la racha). Con comodín, el
// primer fallo de cada semana tampoco la rompe. En los de «unas veces por
// semana» se cuentan semanas.
function calcularRacha(id) {
  const habito = habitos.find(function (h) {
    return h.id === id;
  });
  if (!habito) {
    return 0;
  }

  if (habito.frecuencia === "semanal") {
    return calcularRachaSemanas(habito);
  }

  let racha = 0;
  const fecha = new Date();
  const inicio = inicioDe(habito);
  // Semanas (el texto de su lunes) en las que ya se ha gastado el comodín
  const comodinesGastados = [];

  // Si hoy aún no está cumplido, se cuenta desde ayer: todavía hay tiempo.
  // Pero si hoy ya no tiene remedio, la racha cae a 0.
  if (!estaCumplido(habito, habitosHoy) && !hoyYaFallado(habito)) {
    fecha.setDate(fecha.getDate() - 1);
  }

  for (let vueltas = 0; vueltas < 3650; vueltas++) {
    const clave = fecha.toLocaleDateString("en-CA");
    const habitosDia = registro[clave] || {};
    // Antes de empezar el hábito ya no hay nada que contar
    if (clave < inicio) {
      break;
    }

    // Las reglas que tenía el hábito ese día
    const reglas = reglasEn(habito, clave);

    if (estaCumplido(reglas, habitosDia)) {
      racha++;
    } else if (tocaEn(reglas, fecha)) {
      // Tocaba y no se cumplió. Con comodín, si esa semana aún no se ha
      // gastado, este día ni suma ni rompe; si no, aquí acaba la racha
      const semana = lunesDe(fecha).toLocaleDateString("en-CA");
      if (reglas.comodin && !comodinesGastados.includes(semana)) {
        comodinesGastados.push(semana);
      } else {
        break;
      }
    }

    fecha.setDate(fecha.getDate() - 1);
  }

  return racha;
}

// ¿Se ha gastado ya el comodín de esta semana? Lo gasta el primer día de la
// semana (de lunes a ayer) que tocaba y no se cumplió; hoy, solo si ya no
// tiene remedio.
function comodinGastado(habito) {
  const fecha = lunesDe(new Date());

  while (fecha.toLocaleDateString("en-CA") < hoy) {
    const clave = fecha.toLocaleDateString("en-CA");
    const reglas = reglasEn(habito, clave);
    if (
      reglas.comodin &&
      tocaEn(reglas, fecha) &&
      !estaCumplido(reglas, registro[clave] || {})
    ) {
      return true;
    }
    fecha.setDate(fecha.getDate() + 1);
  }

  return hoyYaFallado(habito);
}

// Mejor racha y total de días cumplidos, desde el inicio del hábito hasta hoy.
// Lo usan los hábitos de templanza: una recaída no borra lo conseguido.
function mejorRachaYTotal(habito) {
  let mejor = 0;
  let seguidos = 0;
  let total = 0;
  const fecha = new Date(inicioDe(habito) + "T00:00");

  while (fecha.toLocaleDateString("en-CA") <= hoy) {
    const clave = fecha.toLocaleDateString("en-CA");
    const habitosDia = registro[clave] || {};
    const reglas = reglasEn(habito, clave);

    if (tocaEn(reglas, fecha)) {
      if (estaCumplido(reglas, habitosDia)) {
        seguidos++;
        total++;
        if (seguidos > mejor) {
          mejor = seguidos;
        }
      } else {
        seguidos = 0;
      }
    }

    fecha.setDate(fecha.getDate() + 1);
  }

  return { mejor: mejor, total: total };
}

// Número de días en texto: "1 día", "5 días".
function textoDias(numero) {
  if (numero === 1) {
    return "1 día";
  }
  return numero + " días";
}

// Convierte la racha en texto: "", "1 día de racha", "5 días de racha" o, en
// semanas, "3 semanas de racha".
function textoRacha(racha, enSemanas) {
  let unidad = "día";
  let unidades = "días";
  if (enSemanas) {
    unidad = "semana";
    unidades = "semanas";
  }

  if (racha === 0) {
    return "";
  } else if (racha === 1) {
    return "1 " + unidad + " de racha";
  } else {
    return racha + " " + unidades + " de racha";
  }
}

// Nombre de un hábito a partir de su id (lo usan las metas).
function nombreHabito(id) {
  const habito = habitos.find(function (h) {
    return h.id === id;
  });
  if (habito) {
    return habito.nombre;
  }
  return "un hábito eliminado";
}

// Cuántos hábitos tocan un día y cuántos se cumplieron.
// Lo usan la semana y el mosaico.
function resumenDelDia(fecha) {
  const clave = fecha.toLocaleDateString("en-CA");
  const habitosDia = registro[clave] || {};
  let tocan = 0;
  let cumplidos = 0;

  habitos.forEach(function (habito) {
    // Las reglas que tenía el hábito ese día
    const reglas = reglasEn(habito, clave);

    // Los de «unas veces por semana» no tienen días fijos: solo cuentan el día
    // que se hacen (así, un día sin hacerlos no estropea el mosaico)
    if (reglas.frecuencia === "semanal") {
      if (clave <= hoy && estaCumplido(reglas, habitosDia)) {
        tocan++;
        cumplidos++;
      }
      return;
    }

    if (tocaEn(reglas, fecha)) {
      tocan++;
      // Los días que aún no han llegado no cuentan como cumplidos
      if (clave <= hoy && estaCumplido(reglas, habitosDia)) {
        cumplidos++;
      }
    }
  });

  return { tocan: tocan, cumplidos: cumplidos };
}

// ==========================================================================
// 4. HÁBITOS · ICONOS
// Diez iconos clásicos en SVG (los dibujos están en index.html). Cada hábito
// guarda el suyo en «icono»; si no tiene, se elige solo por su nombre.
// ==========================================================================

// Los iconos: su id (el dibujo es #icono-id), su nombre corto, su nombre con
// artículo (para Méntor) y las palabras que lo eligen solas. Las palabras van
// en minúscula y sin tildes, y basta con su principio: «estudi» vale para
// «estudiar» y para «estudio».
// (prettier-ignore: que Prettier no ponga cada palabra en su propia línea)
// prettier-ignore
const iconos = [
  {
    id: "corona",
    corto: "Corona",
    nombre: "la corona de olivo",
    palabras: [
      "correr", "running", "trot", "gimnas", "gym", "entren", "deport",
      "pesas", "flexion", "abdomin", "sentadilla", "nadar", "natacion",
      "futbol", "bici", "ciclis", "ejercic", "camin", "pasos", "andar",
      "yoga", "estir", "boxeo", "crossfit", "calistenia", "muscul", "cardio",
      "pilates", "escalar", "tenis", "padel",
    ],
  },
  {
    id: "pergamino",
    corto: "Pergamino",
    nombre: "el pergamino",
    palabras: [
      "leer", "lectura", "libro", "estudi", "repas", "apunte", "curso",
      "aprend", "idioma", "ingles", "frances", "aleman", "examen",
      "oposicion", "logistic", "clase", "duolingo", "vocabul",
    ],
  },
  {
    id: "anfora",
    corto: "Ánfora",
    nombre: "el ánfora",
    palabras: [
      "agua", "beber", "hidrat", "comer", "comida", "dieta", "fruta",
      "verdura", "cocin", "desayun", "cenar", "proteina", "vitamina",
      "azucar", "dulce", "refresco", "cafe", "alcohol", "cerveza", "vino",
    ],
  },
  {
    id: "lira",
    corto: "Lira",
    nombre: "la lira",
    palabras: [
      "music", "guitarra", "piano", "cantar", "canto", "tocar", "instrument",
      "dibuj", "pint", "arte", "bail", "violin", "componer", "fotograf",
    ],
  },
  {
    id: "buho",
    corto: "Búho",
    nombre: "el búho de Atenea",
    palabras: [
      "medit", "reflexion", "pensar", "filosof", "respir", "mindful",
      "gratitud", "agradec", "rezar", "orar", "silencio", "calma", "estoic",
    ],
  },
  {
    id: "rama",
    corto: "Olivo",
    nombre: "la rama de olivo",
    palabras: [
      "porno", "fumar", "tabaco", "vape", "vapear", "redes", "instagram",
      "tiktok", "twitter", "youtube", "movil", "pantalla", "apuesta",
      "naturaleza", "planta", "jardin",
    ],
  },
  {
    id: "luna",
    corto: "Luna",
    nombre: "la luna",
    palabras: [
      "dorm", "sueno", "acost", "descans", "siesta", "madrug", "despert",
      "levant", "cama", "noche",
    ],
  },
  {
    id: "dracma",
    corto: "Dracma",
    nombre: "la dracma",
    palabras: [
      "ahorr", "dinero", "gast", "invert", "inversion", "bolsa", "finanz",
      "presupuest", "euro", "trading", "cripto",
    ],
  },
  {
    id: "pluma",
    corto: "Pluma",
    nombre: "la pluma y el tintero",
    palabras: [
      "escrib", "diario", "journal", "nota", "carta", "poes", "poema", "blog",
      "redact", "program", "codigo", "novela",
    ],
  },
  {
    id: "columna",
    corto: "Columna",
    nombre: "la columna",
    palabras: [
      "orden", "limpi", "casa", "trabaj", "rutina", "tarea", "organiz",
      "planific",
    ],
  },
];

// Pasa un texto a minúsculas y sin tildes: «Meditación» → «meditacion».
// normalize("NFD") separa cada letra de su tilde y replace borra las tildes.
function sinTildes(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Elige un icono por el nombre del hábito: el primero de la lista que tenga
// una palabra con la que empiece alguna palabra del nombre. Si no hay
// ninguno, la rama de olivo para la templanza y la columna para lo demás.
function sugerirIcono(nombre, medida) {
  // Las palabras del nombre: se corta por todo lo que no sea letra o número
  const palabrasNombre = sinTildes(nombre).split(/[^a-z0-9]+/);

  // some: ¿alguna cumple? Aquí, ¿alguna palabra del icono es el principio
  // de alguna palabra del nombre?
  const encontrado = iconos.find(function (icono) {
    return icono.palabras.some(function (palabra) {
      return palabrasNombre.some(function (palabraNombre) {
        return palabraNombre.startsWith(palabra);
      });
    });
  });

  if (encontrado) {
    return encontrado.id;
  }
  if (medida === "abstencion") {
    return "rama";
  }
  return "columna";
}

// Icono de un hábito: el que se eligió o, si no tiene (los antiguos), el
// que le toca por su nombre.
function iconoDe(habito) {
  return habito.icono || sugerirIcono(habito.nombre, habito.medida);
}

// Los datos de un icono a partir de su id.
function datosIcono(id) {
  return (
    iconos.find(function (icono) {
      return icono.id === id;
    }) || iconos[iconos.length - 1]
  );
}

// Crea el dibujo de un icono, listo para meterlo en la página.
function crearIcono(id) {
  const caja = document.createElement("span");
  caja.classList.add("icono");
  caja.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icono-' +
    id +
    '"></use></svg>';
  return caja;
}

// Rellena «caja» (un fieldset) con los diez iconos para elegir uno. Son
// botones redondos (radio) con el mismo name, así solo se puede marcar uno.
// marcado: el que sale marcado. alElegir (si se pasa): qué hacer al tocar
// uno; se usa «click» y no «change» para que también funcione al tocar el
// que ya estaba marcado.
function crearSelectorIconos(caja, grupo, marcado, alElegir) {
  // Se borran los de la vez anterior (la leyenda se queda)
  caja.querySelectorAll(".icono-opcion").forEach(function (opcion) {
    opcion.remove();
  });

  iconos.forEach(function (icono) {
    const opcion = document.createElement("label");
    opcion.classList.add("icono-opcion");

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = grupo;
    radio.value = icono.id;
    radio.checked = icono.id === marcado;

    if (alElegir) {
      radio.addEventListener("click", function () {
        alElegir(icono.id);
      });
    }

    const nombre = document.createElement("span");
    nombre.textContent = icono.corto;

    opcion.append(radio, crearIcono(icono.id), nombre);
    caja.append(opcion);
  });
}

// ==========================================================================
// 5. HÁBITOS · LISTA DE HOY
// Las fichas de la pantalla Hoy.
// ==========================================================================

// Id del hábito que Méntor acaba de crear: su ficha brilla un momento.
let habitoRecienCreado = null;

// Dibuja una ficha por hábito: casilla o campo de cantidad, icono, nombre,
// detalles, racha y botón de editar.
function mostrarHabitos() {
  const lista = document.getElementById("lista-habitos");
  lista.innerHTML = "";

  // Mensaje si aún no hay hábitos
  if (habitos.length === 0) {
    lista.innerHTML =
      "<li class='sin-habitos'>Aún no tienes ningún hábito. Empieza añadiendo uno.</li>";
  }

  habitos.forEach(function (habito) {
    const item = document.createElement("li");
    const etiqueta = document.createElement("label");

    // Casilla (se marca como hecho), campo de número (cantidad)
    // o botón de recaída (templanza)
    let control;

    if (habito.medida === "cantidad") {
      control = document.createElement("input");
      control.type = "number";
      control.min = "0";
      control.inputMode = "numeric";
      control.placeholder = habito.objetivo.toLocaleString("es-ES");
      control.classList.add("habito-campo");
      if (habitosHoy[habito.id] !== undefined) {
        control.value = habitosHoy[habito.id];
      }

      control.addEventListener("change", function () {
        // Campo vacío: no se apunta nada (0 es un número de verdad)
        if (control.value === "") {
          delete habitosHoy[habito.id];
        } else {
          habitosHoy[habito.id] = Number(control.value);
        }
        guardarRegistro(habito.id);
        actualizarTodo();
      });
    } else if (habito.medida === "abstencion") {
      control = document.createElement("button");
      control.type = "button";
      control.classList.add("habito-recaida");

      if (habitosHoy[habito.id] === "recaida") {
        control.textContent = "Deshacer";
      } else {
        control.textContent = "Recaída";
      }

      control.addEventListener("click", function () {
        if (habitosHoy[habito.id] === "recaida") {
          delete habitosHoy[habito.id];
        } else {
          habitosHoy[habito.id] = "recaida";
        }
        guardarRegistro(habito.id);
        actualizarTodo();
      });
    } else {
      control = document.createElement("input");
      control.type = "checkbox";
      control.checked = habitosHoy[habito.id] === true;

      control.addEventListener("change", function () {
        habitosHoy[habito.id] = control.checked;
        guardarRegistro(habito.id);
        actualizarTodo();
      });
    }

    // Ficha en verde si hoy está cumplido
    if (estaCumplido(habito, habitosHoy)) {
      item.classList.add("hecho");
    }

    // Ficha en terracota si hoy ya no tiene remedio
    if (hoyYaFallado(habito)) {
      item.classList.add("fallado");
    }

    // Icono del hábito, en bronce
    const icono = crearIcono(iconoDe(habito));

    // Nombre y detalles debajo (días, objetivo, comodín y «hoy toca descanso»)
    const nombre = document.createElement("span");
    nombre.textContent = habito.nombre;

    const tocaHoy = tocaEn(habito, new Date());
    const detalles = [];

    if (habito.frecuencia === "dias") {
      const letras = habito.dias.map(function (numero) {
        return letrasDias[numero];
      });
      detalles.push(letras.join(" · "));
    }

    if (habito.frecuencia === "semanal") {
      const hechas = vecesEnSemana(habito, new Date());
      let texto = "Esta semana: " + hechas + " de " + habito.vecesSemana;
      if (hechas >= habito.vecesSemana) {
        texto = texto + ", cumplida";
      }
      detalles.push(texto);
    }

    if (habito.medida === "cantidad") {
      let texto = "Objetivo: ";
      if (habito.limite === "maximo") {
        texto = "Máximo: ";
      }
      detalles.push(
        texto + habito.objetivo.toLocaleString("es-ES") + " " + habito.unidad,
      );
    }

    if (habito.medida === "abstencion") {
      const historial = mejorRachaYTotal(habito);
      detalles.push(
        "Mejor: " +
          textoDias(historial.mejor) +
          " · Total: " +
          textoDias(historial.total),
      );
    }

    if (habito.comodin && comodinGastado(habito)) {
      detalles.push("comodín gastado esta semana");
    }

    if (!tocaHoy) {
      detalles.push("hoy toca descanso");
    }

    if (detalles.length > 0) {
      const textoDetalles = document.createElement("small");
      textoDetalles.classList.add("habito-detalles");
      textoDetalles.textContent = detalles.join(" — ");
      nombre.append(textoDetalles);
    }

    // Si hoy descansa: ficha apagada y sin poder marcarla
    if (!tocaHoy) {
      item.classList.add("descanso");
      control.disabled = true;
    }

    // Racha, con la llama de Prometeo a partir de 7 días (o 4 semanas) y la
    // llama grande a partir de 30 días (o 12 semanas)
    const enSemanas = habito.frecuencia === "semanal";
    const numeroRacha = calcularRacha(habito.id);
    const racha = document.createElement("span");
    racha.classList.add("racha");
    racha.textContent = textoRacha(numeroRacha, enSemanas);

    let minimoLlama = 7;
    let minimoLlamaGrande = 30;
    if (enSemanas) {
      minimoLlama = 4;
      minimoLlamaGrande = 12;
    }

    if (numeroRacha >= minimoLlama) {
      const llama = document.createElement("span");
      llama.classList.add("llama");
      if (numeroRacha >= minimoLlamaGrande) {
        llama.classList.add("llama-grande");
      }
      llama.title =
        "La llama de Prometeo: " + textoRacha(numeroRacha, enSemanas);
      llama.innerHTML =
        '<svg viewBox="0 0 24 32"><use href="#llama"></use></svg>';
      racha.prepend(llama);
    }

    // Botón del lápiz: abre la ventana para editar (o borrar) el hábito
    const botonEditar = document.createElement("button");
    botonEditar.type = "button";
    botonEditar.classList.add("boton-editar");
    botonEditar.title = "Editar hábito";
    botonEditar.setAttribute("aria-label", "Editar «" + habito.nombre + "»");
    botonEditar.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#editar"></use></svg>';

    botonEditar.addEventListener("click", function () {
      abrirVentanaHabito(habito);
    });

    // El que acaba de crear Méntor brilla un momento
    if (habito.id === habitoRecienCreado) {
      item.classList.add("recien-creado");
    }

    // Montar la ficha: el campo de cantidad va a la derecha; la casilla, a la
    // izquierda. El icono, siempre justo antes del nombre. El botón de
    // recaída va fuera de la etiqueta: dentro, tocar el nombre lo pulsaría
    // sin querer.
    if (habito.medida === "cantidad") {
      etiqueta.append(icono, nombre, racha, control);
      item.append(etiqueta, botonEditar);
    } else if (habito.medida === "abstencion") {
      etiqueta.append(icono, nombre, racha);
      item.append(etiqueta, control, botonEditar);
    } else {
      etiqueta.append(control, icono, nombre, racha);
      item.append(etiqueta, botonEditar);
    }
    lista.append(item);
  });

  // Llevar la vista hasta el hábito recién creado (una sola vez)
  const nuevo = lista.querySelector(".recien-creado");
  if (nuevo) {
    nuevo.scrollIntoView({ block: "center" });
    habitoRecienCreado = null;
  }
}

// ==========================================================================
// 6. HÁBITOS · VENTANA DE EDITAR HÁBITO
// Se abre con el lápiz de cada ficha. Cambia el nombre, el icono, los días,
// las veces, el objetivo, el inicio o el comodín, o borra el hábito.
// Cómo se cumple (casilla, cantidad o templanza) no se puede cambiar.
// ==========================================================================

// Piezas de la ventana.
const ventanaHabito = document.getElementById("ventana-habito");
const formHabito = document.getElementById("form-habito");
const campoNombre = document.getElementById("habito-nombre");
const cajaIcono = document.getElementById("habito-icono");
const selectFrecuencia = document.getElementById("habito-frecuencia");
const cajaDias = document.getElementById("habito-dias");
const cajaSemanal = document.getElementById("habito-semanal");
const campoVeces = document.getElementById("habito-veces");
const cajaCantidad = document.getElementById("habito-cantidad");
const selectLimite = document.getElementById("habito-limite");
const campoObjetivo = document.getElementById("habito-objetivo");
const campoUnidad = document.getElementById("habito-unidad");
const cajaTemplanza = document.getElementById("habito-templanza");
const campoInicio = document.getElementById("habito-inicio");
const cajaComodin = document.getElementById("caja-comodin");
const casillaComodin = document.getElementById("habito-comodin");
const errorHabito = document.getElementById("habito-error");

// El hábito que se está editando.
let habitoEditado = null;

// La fecha de inicio no puede ser futura.
campoInicio.max = hoy;

// Muestra los días solo con «Días concretos».
selectFrecuencia.addEventListener("change", function () {
  cajaDias.hidden = selectFrecuencia.value !== "dias";
});

// Abre la ventana con los datos del hábito ya puestos.
function abrirVentanaHabito(habito) {
  habitoEditado = habito;
  const medida = habito.medida || "casilla";
  const frecuencia = habito.frecuencia || "diario";

  campoNombre.value = habito.nombre;
  crearSelectorIconos(cajaIcono, "icono-editar", iconoDe(habito));

  // Frecuencia: los de «unas veces por semana» se quedan así (su racha va en
  // semanas); los demás pueden pasar de todos los días a días concretos
  selectFrecuencia.value = frecuencia;
  selectFrecuencia.disabled = frecuencia === "semanal";
  selectFrecuencia.querySelector("[value='semanal']").disabled =
    frecuencia !== "semanal";

  cajaDias.hidden = frecuencia !== "dias";
  cajaDias.querySelectorAll("input").forEach(function (casilla) {
    casilla.checked = (habito.dias || []).includes(Number(casilla.value));
  });

  cajaSemanal.hidden = frecuencia !== "semanal";
  campoVeces.value = habito.vecesSemana || 3;

  // Cantidad: al menos o como mucho, objetivo y unidad
  cajaCantidad.hidden = medida !== "cantidad";
  selectLimite.value = habito.limite || "minimo";
  campoObjetivo.value = habito.objetivo || "";
  campoUnidad.value = habito.unidad || "";

  // Templanza: desde cuándo se cuenta
  cajaTemplanza.hidden = medida !== "abstencion";
  campoInicio.value = inicioDe(habito);

  // Comodín: no tiene sentido en templanza ni en «unas veces por semana»
  cajaComodin.hidden = medida === "abstencion" || frecuencia === "semanal";
  casillaComodin.checked = habito.comodin === true;

  // Sin fallos de la vez anterior. showModal abre el <dialog> encima de todo
  // y oscurece el fondo
  errorHabito.textContent = "";
  ventanaHabito.showModal();
}

// Guarda las reglas de antes de editar en «cambios», valiendo hasta ayer.
// Si el hábito empezó hoy, no hay días pasados que cuidar; y si ya se editó
// hoy, las reglas de hasta ayer ya están guardadas.
function guardarReglasAntiguas(habito, antes) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - 1);
  const ayer = fecha.toLocaleDateString("en-CA");

  if (inicioDe(habito) > ayer) {
    return;
  }
  if (!habito.cambios) {
    habito.cambios = [];
  }

  const ultimo = habito.cambios[habito.cambios.length - 1];
  if (ultimo && ultimo.hasta === ayer) {
    return;
  }

  antes.hasta = ayer;
  habito.cambios.push(antes);
}

// Al pulsar «Guardar»: comprueba los datos, cambia el hábito y guarda las
// reglas de antes si han cambiado. Si algo falla, lo explica en la propia
// ventana (errorHabito) y no la cierra.
formHabito.addEventListener("submit", function (evento) {
  evento.preventDefault();
  const habito = habitoEditado;
  const medida = habito.medida || "casilla";

  // Nombre (obligatorio)
  const nombre = campoNombre.value.trim();
  if (nombre === "") {
    errorHabito.textContent = "Escribe el nombre del hábito.";
    return;
  }

  // Frecuencia: los días marcados, como números de getDay()
  const frecuencia = selectFrecuencia.value;
  const dias = [];
  cajaDias.querySelectorAll("input:checked").forEach(function (casilla) {
    dias.push(Number(casilla.value));
  });

  if (frecuencia === "dias" && dias.length === 0) {
    errorHabito.textContent = "Elige al menos un día.";
    return;
  }

  // Unas veces por semana: de 1 a 6
  const veces = Number(campoVeces.value);
  if (frecuencia === "semanal" && !(veces >= 1 && veces <= 6)) {
    errorHabito.textContent = "Elige entre 1 y 6 veces por semana.";
    return;
  }

  // Cantidad: el objetivo, mayor que 0
  const objetivo = Number(campoObjetivo.value);
  if (medida === "cantidad" && !(objetivo > 0)) {
    errorHabito.textContent = "Escribe el objetivo de cada día.";
    return;
  }

  // Templanza: el inicio, nunca futuro
  const inicio = campoInicio.value || inicioDe(habito);
  if (medida === "abstencion" && inicio > hoy) {
    errorHabito.textContent = "La fecha de inicio no puede ser futura.";
    return;
  }

  // Las reglas de antes, para saber si cambian
  const antes = reglasDe(habito);

  habito.nombre = nombre;
  habito.icono = cajaIcono.querySelector("input:checked").value;
  habito.frecuencia = frecuencia;

  if (frecuencia === "dias") {
    habito.dias = dias;
  } else {
    delete habito.dias;
  }

  if (frecuencia === "semanal") {
    habito.vecesSemana = veces;
  }

  if (medida === "cantidad") {
    habito.objetivo = objetivo;
    habito.unidad = campoUnidad.value.trim();
    habito.limite = selectLimite.value;
  }

  if (medida === "abstencion") {
    habito.inicio = inicio;
  }

  if (!cajaComodin.hidden) {
    habito.comodin = casillaComodin.checked;
  }

  // JSON.stringify convierte las reglas en texto: si los textos no son
  // iguales, algo ha cambiado y se guardan las de antes
  if (JSON.stringify(antes) !== JSON.stringify(reglasDe(habito))) {
    guardarReglasAntiguas(habito, antes);
  }

  guardarHabitos();
  actualizarTodo();
  ventanaHabito.close();
});

// «Eliminar»: borra el hábito después de preguntar. La función es async
// para poder esperar (await) la respuesta de la ventana de aviso.
document
  .getElementById("habito-eliminar")
  .addEventListener("click", async function () {
    const borrar = await preguntar(
      "¿Eliminar el hábito «" +
        habitoEditado.nombre +
        "»? Se perderán su racha y sus días apuntados.",
      "Eliminar",
      "Cancelar",
    );
    if (borrar) {
      habitos.splice(habitos.indexOf(habitoEditado), 1);
      guardarHabitos();
      actualizarTodo();
      ventanaHabito.close();
    }
  });

// «Cancelar»: cierra sin guardar.
document
  .getElementById("habito-cancelar")
  .addEventListener("click", function () {
    ventanaHabito.close();
  });

// Tocar fuera de la ventana (en el fondo oscuro) también la cierra: ese
// toque le llega al propio <dialog>, no a lo que hay dentro.
function cerrarAlTocarFuera(ventana) {
  ventana.addEventListener("click", function (evento) {
    if (evento.target === ventana) {
      ventana.close();
    }
  });
}

cerrarAlTocarFuera(ventanaHabito);

// ==========================================================================
// 7. AVISOS
// La ventana de aviso de Ergon, en lugar de los alert() y confirm() del
// navegador (que no se pueden decorar y paran toda la página).
// ==========================================================================

// Piezas de la ventana de aviso.
const ventanaAviso = document.getElementById("ventana-aviso");
const textoAviso = document.getElementById("aviso-texto");
const botonAvisoSi = document.getElementById("aviso-si");
const botonAvisoNo = document.getElementById("aviso-no");

// Hace una pregunta en la ventana de aviso y espera la respuesta.
// Devuelve una promesa (Promise): una respuesta que llegará más tarde. Con
// «await preguntar(…)», el código se queda esperando y recibe true (el
// botón del sí) o false (el del no, Escape o tocar fuera).
// Los botones están en un <form method="dialog">: al pulsar uno, la ventana
// se cierra sola y guarda en returnValue el value del botón ("si" o "no").
function preguntar(mensaje, textoSi, textoNo) {
  textoAviso.textContent = mensaje;
  botonAvisoSi.textContent = textoSi;
  botonAvisoNo.textContent = textoNo || "";
  botonAvisoNo.hidden = !textoNo;
  ventanaAviso.returnValue = "";
  ventanaAviso.showModal();

  return new Promise(function (resolver) {
    // { once: true }: este «close» se escucha una sola vez
    ventanaAviso.addEventListener(
      "close",
      function () {
        resolver(ventanaAviso.returnValue === "si");
      },
      { once: true },
    );
  });
}

// Un aviso con un solo botón, «Entendido».
function avisar(mensaje) {
  return preguntar(mensaje, "Entendido");
}

cerrarAlTocarFuera(ventanaAviso);

// ==========================================================================
// 8. MÉNTOR · LA CONVERSACIÓN
// Méntor pregunta y yo respondo, en burbujas como un chat. La misma pantalla
// sirve para varias conversaciones (hábito nuevo, meta nueva, bienvenida y
// revisión semanal): cada una es un objeto con sus preguntas y con lo que
// pasa al terminar. Todavía no es una IA: lo que dice está escrito aquí.
// ==========================================================================

// Cada conversación es un objeto con:
//   saludo:     lo primero que dice Méntor (un texto, una lista de textos o
//               una función que los devuelve)
//   preguntas:  la lista de preguntas, en orden
//   cierre:     lo que dice antes del resumen
//   resumen:    función que devuelve { icono, nombre, lineas } para la
//               tarjeta del final (icono puede ser null)
//   boton:      el texto del botón del final («Crear hábito»…)
//   alTerminar: qué hacer al pulsarlo
//   otroBoton:  (si lo tiene) { texto, alPulsar }: un segundo botón al final
//   salir:      lo que pregunta «Salir» si ya hay algo respondido
//   alSalir:    qué hacer al salir (p. ej. volver a Hoy)
//
// Cada pregunta tiene:
//   clave:     dónde se guarda la respuesta (respuestas.nombre…)
//   texto:     lo que dice Méntor (o una función que lo escribe con lo ya
//              respondido)
//   tipo:      cómo se responde: "texto", "parrafo", "numero", "opciones",
//              "dias", "fecha", "icono" o "lista"
//   cuando:    (si la tiene) función que dice si hay que hacer la pregunta
//   opciones:  (en las de tipo "opciones") los botones, o una función que
//              los devuelve; cada uno puede tener su «cuando»
//   ejemplo:   (en las de escribir) el texto gris del campo
//   inicial:   (en las de escribir) lo que sale ya escrito
//   unidad:    (en las de número) lo que va detrás: «pasos», «kg»…
//   decimales: (en las de número) true si admite decimales, como 72,5
//   largo:     (en las de escribir) cuántas letras como mucho (40 si no)
//   mostrar:   (si la tiene) función que escribe la respuesta en su burbuja
//   vacio:     si se puede dejar sin responder, lo que se ve entonces
//   saltar:    true para que salga un botón con el texto de «vacio»
//   validar:   (si la tiene) función que devuelve el fallo, o "" si está bien

// La conversación que se está teniendo.
let conversacionActual = null;

// Lo respondido hasta ahora: { nombre: "Leer", medida: "casilla", … }
let respuestas = {};

// Clave de la respuesta que se está cambiando (null si ninguna).
let respuestaEditada = null;

// Temporizador de «Méntor está escribiendo…» (para poder cancelarlo).
let temporizadorMentor = null;

// «Salve, Joel.» si el perfil tiene nombre; si no, «Salve.».
function salve() {
  if (perfil.nombre) {
    return "Salve, " + perfil.nombre + ".";
  }
  return "Salve.";
}

// Busca una pregunta de la conversación por su clave.
function preguntaDe(clave) {
  return conversacionActual.preguntas.find(function (pregunta) {
    return pregunta.clave === clave;
  });
}

// Si «algo» es una función, la llama con lo respondido; si no, lo devuelve
// tal cual. Sirve para los textos que cambian según las respuestas.
function segunRespuestas(algo) {
  if (typeof algo === "function") {
    return algo(respuestas);
  }
  return algo;
}

// Las opciones de una pregunta (pueden venir de una función, como la lista
// de hábitos de las metas).
function opcionesDe(pregunta) {
  return segunRespuestas(pregunta.opciones);
}

// ¿Hay que hacer esta pregunta (o mostrar esta opción)? Sí, si no tiene
// «cuando» o si su «cuando» dice que sí.
function hayQue(algo) {
  return !algo.cuando || algo.cuando(respuestas);
}

// Borra las respuestas que ya no valen: las de preguntas que ya no tocan y
// las opciones que ya no se pueden elegir (p. ej. «Unas veces por semana»
// si se cambia a templanza). Va en orden, así lo que depende de una
// respuesta borrada también se borra.
function limpiarRespuestas() {
  conversacionActual.preguntas.forEach(function (pregunta) {
    const valor = respuestas[pregunta.clave];
    if (valor === undefined) {
      return;
    }

    if (!hayQue(pregunta)) {
      delete respuestas[pregunta.clave];
    } else if (pregunta.tipo === "opciones") {
      const sigueValiendo = opcionesDe(pregunta).some(function (opcion) {
        return opcion.valor === valor && hayQue(opcion);
      });
      if (!sigueValiendo) {
        delete respuestas[pregunta.clave];
      }
    }
  });
}

// Convierte lo escrito en un número. Con decimales, la coma vale como punto
// (72,5 → 72.5); sin decimales, los puntos y comas de los miles se quitan
// (10.000 → 10000). Si no es un número, da NaN («no es un número»).
function leerNumero(texto, decimales) {
  if (decimales) {
    return Number(texto.replace(",", "."));
  }
  return Number(texto.replace(/[.,]/g, ""));
}

// Una fecha "2026-10-16" escrita para leer: «16 de octubre de 2026».
function fechaLarga(clave) {
  return new Date(clave + "T00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Texto de mi respuesta en su burbuja: «Todos los días», «10.000 pasos»…
function textoRespuesta(pregunta, valor) {
  if (valor === "" && pregunta.vacio !== undefined) {
    return pregunta.vacio;
  }

  if (pregunta.mostrar) {
    return pregunta.mostrar(valor);
  }

  if (pregunta.tipo === "opciones") {
    const opcion = opcionesDe(pregunta).find(function (o) {
      return o.valor === valor;
    });
    return opcion.texto;
  }

  if (pregunta.tipo === "numero") {
    const unidad = segunRespuestas(pregunta.unidad) || "";
    return (valor.toLocaleString("es-ES") + " " + unidad).trim();
  }

  if (pregunta.tipo === "dias") {
    return valor
      .map(function (numero) {
        return letrasDias[numero];
      })
      .join(" · ");
  }

  if (pregunta.tipo === "lista") {
    return valor.join("\n");
  }

  if (pregunta.tipo === "fecha") {
    return fechaLarga(valor);
  }

  if (pregunta.tipo === "icono") {
    return datosIcono(valor).corto;
  }

  return valor;
}

// Burbuja de Méntor, a la izquierda, con su cara (el dibujo #mentor de
// index.html) al lado.
function burbujaMentor(texto) {
  const burbuja = document.createElement("p");
  burbuja.classList.add("burbuja", "burbuja-mentor");
  burbuja.innerHTML =
    '<svg class="mentor-cara" viewBox="0 0 40 40" aria-hidden="true"><use href="#mentor"></use></svg>';
  burbuja.append(texto);
  return burbuja;
}

// Burbuja con mi respuesta, a la derecha. Es un botón: al tocarla, Méntor
// vuelve a hacer esa pregunta para cambiar la respuesta.
function burbujaMia(pregunta, valor) {
  const burbuja = document.createElement("button");
  burbuja.type = "button";
  burbuja.classList.add("burbuja", "burbuja-mia");
  burbuja.title = "Cambiar esta respuesta";

  if (pregunta.tipo === "icono") {
    burbuja.append(crearIcono(valor));
  }
  burbuja.append(textoRespuesta(pregunta, valor));

  burbuja.addEventListener("click", function () {
    respuestaEditada = pregunta.clave;
    dibujarConversacion(false);
  });
  return burbuja;
}

// La pregunta respondida que va justo antes de «pregunta» (la que cambia
// el botón «Atrás»). Con pregunta = null, la última respondida.
function preguntaAnterior(pregunta) {
  const preguntas = conversacionActual.preguntas;
  let anterior = null;
  for (let i = 0; i < preguntas.length; i++) {
    const otra = preguntas[i];
    if (otra === pregunta) {
      break;
    }
    if (hayQue(otra) && respuestas[otra.clave] !== undefined) {
      anterior = otra;
    }
  }
  return anterior;
}

// Los botones de abajo: «Atrás» (vuelve a la pregunta anterior; en la
// primera no sale) y «Salir».
function crearAtrasYSalir(pregunta) {
  const fila = document.createElement("div");
  fila.classList.add("mentor-acciones");

  const anterior = preguntaAnterior(pregunta);
  if (anterior) {
    const atras = document.createElement("button");
    atras.type = "button";
    atras.textContent = "‹ Atrás";
    atras.addEventListener("click", function () {
      respuestaEditada = anterior.clave;
      dibujarConversacion(false);
    });
    fila.append(atras);
  }

  const salir = document.createElement("button");
  salir.type = "button";
  salir.textContent = "Salir";
  salir.addEventListener("click", salirDeConversacion);
  fila.append(salir);

  return fila;
}

// Crea un botón con su clase y lo que hace al pulsarlo.
function crearBoton(texto, clase, alPulsar) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.classList.add(clase);
  boton.textContent = texto;
  boton.addEventListener("click", alPulsar);
  return boton;
}

// La forma de responder a una pregunta: botones, días, iconos, una lista o
// un campo para escribir. Si ya estaba respondida (al cambiarla), sale lo
// de antes.
function crearControles(pregunta) {
  const zona = document.createElement("div");
  zona.classList.add("mentor-respuesta");

  // Aquí sale el fallo si la respuesta no vale
  const error = document.createElement("p");
  error.classList.add("mentor-error");

  const anterior = respuestas[pregunta.clave];

  // Comprueba la respuesta y, si vale, la guarda; si no, explica por qué.
  // Si se puede dejar vacía (vacio), vacía siempre vale
  function enviar(valor) {
    if (valor === "" && pregunta.vacio !== undefined) {
      responder(pregunta, "");
      return;
    }
    if (pregunta.validar) {
      const fallo = pregunta.validar(valor);
      if (fallo !== "") {
        error.textContent = fallo;
        return;
      }
    }
    responder(pregunta, valor);
  }

  if (pregunta.tipo === "opciones") {
    // Un botón por opción (solo las que tocan); la de antes, marcada
    const botones = document.createElement("div");
    botones.classList.add("mentor-opciones");

    opcionesDe(pregunta).forEach(function (opcion) {
      if (!hayQue(opcion)) {
        return;
      }
      const boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = opcion.texto;
      if (opcion.valor === anterior) {
        boton.classList.add("elegida");
      }
      boton.addEventListener("click", function () {
        enviar(opcion.valor);
      });
      botones.append(boton);
    });

    zona.append(botones);
  } else if (pregunta.tipo === "dias") {
    // Los siete círculos de los días (los mismos de la ventana de editar)
    // y el botón «Listo»
    const caja = document.createElement("div");
    caja.classList.add("habito-dias");
    const elegidos = anterior || [];

    [1, 2, 3, 4, 5, 6, 0].forEach(function (numero) {
      const dia = document.createElement("label");
      const casilla = document.createElement("input");
      casilla.type = "checkbox";
      casilla.value = numero;
      casilla.checked = elegidos.includes(numero);
      dia.append(casilla, letrasDias[numero]);
      caja.append(dia);
    });

    const listo = crearBoton("Listo", "boton-principal", function () {
      const dias = [];
      caja.querySelectorAll("input:checked").forEach(function (casilla) {
        dias.push(Number(casilla.value));
      });
      enviar(dias);
    });

    zona.append(caja, listo);
  } else if (pregunta.tipo === "icono") {
    // Los diez iconos; sale marcado el propuesto y basta con tocar uno
    const caja = document.createElement("div");
    caja.classList.add("selector-iconos");
    const propuesto =
      anterior || sugerirIcono(respuestas.nombre, respuestas.medida);
    crearSelectorIconos(caja, "icono-mentor", propuesto, enviar);
    zona.append(caja);
  } else if (pregunta.tipo === "lista") {
    // Una lista que se va llenando: se escribe un elemento, «Añadir», y al
    // final «Listo». Cada elemento tiene su × para quitarlo
    const elementos = (anterior || []).slice(); // slice: una copia de la lista
    const lista = document.createElement("ol");
    lista.classList.add("mentor-lista");

    function dibujarLista() {
      lista.innerHTML = "";
      elementos.forEach(function (texto, posicion) {
        const item = document.createElement("li");
        item.textContent = texto;
        const quitar = crearBoton("×", "mentor-quitar", function () {
          elementos.splice(posicion, 1);
          dibujarLista();
        });
        quitar.setAttribute("aria-label", "Quitar «" + texto + "»");
        item.append(quitar);
        lista.append(item);
      });
      lista.hidden = elementos.length === 0;
    }
    dibujarLista();

    const formulario = document.createElement("form");
    formulario.classList.add("mentor-escribir");
    const campo = document.createElement("input");
    campo.type = "text";
    campo.maxLength = pregunta.largo || 80;
    campo.placeholder = segunRespuestas(pregunta.ejemplo) || "";
    const anadir = document.createElement("button");
    anadir.type = "submit";
    anadir.classList.add("boton-secundario");
    anadir.textContent = "Añadir";
    formulario.append(campo, anadir);

    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();
      const texto = campo.value.trim();
      if (texto !== "") {
        elementos.push(texto);
        campo.value = "";
        error.textContent = "";
        dibujarLista();
      }
      campo.focus();
    });

    const listo = crearBoton("Listo", "boton-principal", function () {
      // Si quedó algo escrito sin añadir, también cuenta
      const pendiente = campo.value.trim();
      if (pendiente !== "") {
        elementos.push(pendiente);
      }
      enviar(elementos.slice());
    });

    zona.append(lista, formulario, listo);
  } else {
    // Texto, párrafo, número o fecha: un campo para escribir y «Enviar».
    // Va en un <form> para que también se envíe con la tecla Intro.
    // noValidate: que el navegador no frene el envío por su cuenta; así
    // contesta Méntor con su propio mensaje
    const formulario = document.createElement("form");
    formulario.classList.add("mentor-escribir");
    formulario.noValidate = true;

    let campo;
    if (pregunta.tipo === "parrafo") {
      // Un párrafo: un cuadro de varias líneas (Intro hace una línea nueva)
      campo = document.createElement("textarea");
      campo.rows = 3;
      formulario.classList.add("mentor-parrafo");
    } else {
      campo = document.createElement("input");
      if (pregunta.tipo === "fecha") {
        campo.type = "date";
        campo.max = hoy;
      } else {
        // Los números también van en un campo de texto: así se puede
        // escribir «10.000» o «72,5». inputMode elige el teclado del móvil
        campo.type = "text";
        if (pregunta.tipo === "numero" && pregunta.decimales) {
          campo.inputMode = "decimal";
        } else if (pregunta.tipo === "numero") {
          campo.inputMode = "numeric";
        }
      }
    }
    campo.maxLength = pregunta.largo || 40;
    campo.placeholder = segunRespuestas(pregunta.ejemplo) || "";

    if (anterior !== undefined && anterior !== "") {
      campo.value = anterior;
    } else {
      campo.value = segunRespuestas(pregunta.inicial) || "";
    }

    formulario.append(campo);

    // En los números, la unidad detrás: «10000 pasos», «72 kg»
    const unidad = segunRespuestas(pregunta.unidad);
    if (pregunta.tipo === "numero" && unidad) {
      const textoUnidad = document.createElement("span");
      textoUnidad.classList.add("mentor-unidad");
      textoUnidad.textContent = unidad;
      formulario.append(textoUnidad);
    }

    const boton = document.createElement("button");
    boton.type = "submit";
    boton.classList.add("boton-principal");
    boton.textContent = "Enviar";
    formulario.append(boton);

    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();
      let valor = campo.value.trim();
      if (pregunta.tipo === "numero" && valor !== "") {
        valor = leerNumero(valor, pregunta.decimales);
      }
      enviar(valor);
    });

    zona.append(formulario);
  }

  // Botón para no responder («Prefiero no decirlo»)
  if (pregunta.saltar) {
    zona.append(
      crearBoton(pregunta.vacio, "mentor-saltar", function () {
        enviar("");
      }),
    );
  }

  zona.append(error, crearAtrasYSalir(pregunta));
  return zona;
}

// El resumen final: la tarjeta que da la conversación y sus botones.
function crearResumen() {
  const zona = document.createElement("div");
  zona.classList.add("mentor-respuesta");
  const datos = conversacionActual.resumen();

  // La tarjeta: icono (si tiene) y nombre arriba, las líneas debajo
  const tarjeta = document.createElement("div");
  tarjeta.classList.add("mentor-resumen");

  const cabecera = document.createElement("p");
  cabecera.classList.add("mentor-resumen-nombre");
  if (datos.icono) {
    cabecera.append(crearIcono(datos.icono));
  }
  cabecera.append(datos.nombre);
  tarjeta.append(cabecera);

  datos.lineas.forEach(function (linea) {
    const fila = document.createElement("p");
    fila.textContent = linea;
    tarjeta.append(fila);
  });

  zona.append(
    tarjeta,
    crearBoton(
      conversacionActual.boton,
      "boton-principal",
      conversacionActual.alTerminar,
    ),
  );

  const otro = conversacionActual.otroBoton;
  if (otro) {
    zona.append(crearBoton(otro.texto, "boton-secundario", otro.alPulsar));
  }

  zona.append(crearAtrasYSalir(null));
  return zona;
}

// Baja la página hasta el final de la conversación.
function bajarAlFinal() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

// Dibuja la conversación: el saludo, lo ya respondido en burbujas y la
// pregunta que toca con su forma de responder (o el resumen, si ya está
// todo). animar: true para que lo nuevo salga tras «Méntor está
// escribiendo…» (un instante).
function dibujarConversacion(animar) {
  clearTimeout(temporizadorMentor);
  const conversacion = document.getElementById("conversacion");
  conversacion.innerHTML = "";

  // El saludo: uno o varios mensajes (Array.isArray: ¿es una lista?)
  let saludo = segunRespuestas(conversacionActual.saludo);
  if (!Array.isArray(saludo)) {
    saludo = [saludo];
  }
  saludo.forEach(function (texto) {
    conversacion.append(burbujaMentor(texto));
  });

  // Las preguntas que tocan, en orden, hasta la primera sin responder (o la
  // que se está cambiando)
  const preguntas = conversacionActual.preguntas;
  let actual = null;
  for (let i = 0; i < preguntas.length; i++) {
    const pregunta = preguntas[i];
    if (!hayQue(pregunta)) {
      continue;
    }

    const valor = respuestas[pregunta.clave];
    if (valor === undefined || pregunta.clave === respuestaEditada) {
      actual = pregunta;
      break;
    }
    conversacion.append(
      burbujaMentor(segunRespuestas(pregunta.texto)),
      burbujaMia(pregunta, valor),
    );
  }

  // Lo último: la pregunta que toca o, si no queda ninguna, el resumen
  let mensaje;
  let controles;
  if (actual) {
    mensaje = segunRespuestas(actual.texto);
    controles = crearControles(actual);
  } else {
    mensaje = segunRespuestas(conversacionActual.cierre);
    controles = crearResumen();
  }

  // Muestra el mensaje y la forma de responder. En el PC, además, deja el
  // cursor en el campo de escribir (en el móvil no: abriría el teclado)
  function mostrarFinal() {
    conversacion.append(burbujaMentor(mensaje), controles);
    bajarAlFinal();
    const campo = controles.querySelector(
      "textarea, input:not([type=checkbox]):not([type=radio])",
    );
    if (campo && !window.matchMedia("(pointer: coarse)").matches) {
      campo.focus();
    }
  }

  const sinMovimiento = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (!animar || sinMovimiento) {
    mostrarFinal();
    return;
  }

  // «Méntor está escribiendo…»: tres puntos un instante (350 milisegundos)
  const escribiendo = burbujaMentor("");
  escribiendo.classList.add("escribiendo");
  escribiendo.setAttribute("aria-label", "Méntor está escribiendo");
  // insertAdjacentHTML añade los tres puntos al final, sin borrar la cara
  escribiendo.insertAdjacentHTML(
    "beforeend",
    "<span></span><span></span><span></span>",
  );
  conversacion.append(escribiendo);
  bajarAlFinal();

  temporizadorMentor = setTimeout(function () {
    escribiendo.remove();
    mostrarFinal();
  }, 350);
}

// Guarda una respuesta y sigue con la conversación.
function responder(pregunta, valor) {
  respuestas[pregunta.clave] = valor;
  respuestaEditada = null;
  limpiarRespuestas();
  dibujarConversacion(true);
}

// Empieza una conversación desde cero.
function abrirConversacion(conversacion) {
  conversacionActual = conversacion;
  respuestas = {};
  respuestaEditada = null;
  mostrarPantalla("mentor");
  dibujarConversacion(true);
}

// ¿Se está en medio de una conversación con algo ya respondido?
function conversacionEmpezada() {
  return (
    document.body.classList.contains("conversando") &&
    Object.keys(respuestas).length > 0
  );
}

// «Salir»: si ya hay algo respondido, pregunta antes. Luego hace lo que
// diga la conversación (alSalir).
async function salirDeConversacion() {
  if (conversacionEmpezada()) {
    const salir = await preguntar(conversacionActual.salir, "Salir", "Seguir");
    if (!salir) {
      return;
    }
  }
  clearTimeout(temporizadorMentor);
  respuestas = {};
  conversacionActual.alSalir();
}

// ==========================================================================
// 9. MÉNTOR · HÁBITO NUEVO
// Las preguntas para crear un hábito y lo que pasa al terminar. «+ Nuevo
// hábito» (en Hoy) abre esta conversación.
// ==========================================================================

// Las preguntas, en orden (cómo se escribe cada una: bloque 8).
const preguntasHabito = [
  {
    clave: "nombre",
    texto: "¿Qué hábito quieres construir?",
    tipo: "texto",
    ejemplo: "Leer, correr, meditar…",
    validar: function (valor) {
      if (valor === "") {
        return "Dime al menos cómo se llama.";
      }
      return "";
    },
  },
  {
    clave: "medida",
    texto: function (r) {
      return (
        "«" + r.nombre + "», buen propósito. ¿Cómo sabrás que lo has cumplido?"
      );
    },
    tipo: "opciones",
    opciones: [
      { valor: "casilla", texto: "Lo marco como hecho" },
      { valor: "cantidad", texto: "Con una cantidad" },
      { valor: "abstencion", texto: "Es algo que quiero dejar" },
    ],
  },
  {
    clave: "limite",
    texto: "¿Es un mínimo que alcanzar o un máximo que no pasar?",
    tipo: "opciones",
    cuando: function (r) {
      return r.medida === "cantidad";
    },
    opciones: [
      { valor: "minimo", texto: "Al menos (p. ej. 10.000 pasos)" },
      { valor: "maximo", texto: "Como mucho (p. ej. 300 minutos)" },
    ],
  },
  {
    clave: "unidad",
    texto: "¿En qué lo mides?",
    tipo: "texto",
    ejemplo: "pasos, páginas, minutos…",
    vacio: "Sin unidad",
    cuando: function (r) {
      return r.medida === "cantidad";
    },
  },
  {
    clave: "objetivo",
    texto: function (r) {
      if (r.limite === "maximo") {
        return "¿Cuál es el máximo de cada día?";
      }
      return "¿Cuál es tu objetivo de cada día?";
    },
    tipo: "numero",
    unidad: function (r) {
      return r.unidad;
    },
    ejemplo: function (r) {
      if (r.limite === "maximo") {
        return "300";
      }
      return "10000";
    },
    cuando: function (r) {
      return r.medida === "cantidad";
    },
    validar: function (valor) {
      if (!(valor > 0)) {
        return "Necesito un número mayor que 0.";
      }
      return "";
    },
  },
  {
    clave: "frecuencia",
    texto: function (r) {
      if (r.medida === "abstencion") {
        return "¿Qué días cuentan?";
      }
      return "¿Cada cuánto toca?";
    },
    tipo: "opciones",
    opciones: [
      { valor: "diario", texto: "Todos los días" },
      { valor: "dias", texto: "Días concretos" },
      {
        valor: "semanal",
        texto: "Unas veces por semana",
        // La templanza cuenta los días: no puede ser «unas veces por semana»
        cuando: function (r) {
          return r.medida !== "abstencion";
        },
      },
    ],
  },
  {
    clave: "dias",
    texto: "¿Qué días?",
    tipo: "dias",
    cuando: function (r) {
      return r.frecuencia === "dias";
    },
    validar: function (valor) {
      if (valor.length === 0) {
        return "Elige al menos un día.";
      }
      return "";
    },
  },
  {
    clave: "vecesSemana",
    texto: "¿Cuántas veces por semana?",
    tipo: "opciones",
    cuando: function (r) {
      return r.frecuencia === "semanal";
    },
    opciones: [
      { valor: 1, texto: "1 vez" },
      { valor: 2, texto: "2 veces" },
      { valor: 3, texto: "3 veces" },
      { valor: 4, texto: "4 veces" },
      { valor: 5, texto: "5 veces" },
      { valor: 6, texto: "6 veces" },
    ],
  },
  {
    clave: "inicio",
    texto:
      "¿Desde qué día lo cuento? Si ya llevas unos días sin hacerlo, elige el primero.",
    tipo: "fecha",
    inicial: function () {
      return hoy;
    },
    mostrar: function (valor) {
      if (valor === hoy) {
        return "Desde hoy";
      }
      return "Desde el " + fechaLarga(valor);
    },
    cuando: function (r) {
      return r.medida === "abstencion";
    },
    validar: function (valor) {
      if (valor === "" || valor > hoy) {
        return "Elige hoy o un día que ya haya pasado.";
      }
      return "";
    },
  },
  {
    clave: "comodin",
    texto:
      "¿Quieres un comodín? Es un día libre por semana que no rompe la racha.",
    tipo: "opciones",
    cuando: function (r) {
      return r.medida !== "abstencion" && r.frecuencia !== "semanal";
    },
    opciones: [
      { valor: true, texto: "Sí, con comodín" },
      { valor: false, texto: "No, sin comodín" },
    ],
  },
  {
    clave: "icono",
    texto: function (r) {
      const propuesto = datosIcono(sugerirIcono(r.nombre, r.medida));
      return (
        "Por último, su símbolo. Te propongo " +
        propuesto.nombre +
        ", pero elige el que quieras."
      );
    },
    tipo: "icono",
  },
];

// El hábito que sale de las respuestas, con solo las propiedades que necesita.
function habitoDesdeRespuestas() {
  const nuevo = {
    id: "h" + Date.now(),
    nombre: respuestas.nombre,
    icono: respuestas.icono,
    frecuencia: respuestas.frecuencia,
    medida: respuestas.medida,
    inicio: hoy,
  };

  if (nuevo.frecuencia === "dias") {
    nuevo.dias = respuestas.dias;
  }
  if (nuevo.frecuencia === "semanal") {
    nuevo.vecesSemana = respuestas.vecesSemana;
  }
  if (nuevo.medida === "cantidad") {
    nuevo.objetivo = respuestas.objetivo;
    nuevo.unidad = respuestas.unidad;
    nuevo.limite = respuestas.limite;
  }
  if (nuevo.medida === "abstencion") {
    nuevo.inicio = respuestas.inicio;
  }
  if (respuestas.comodin !== undefined) {
    nuevo.comodin = respuestas.comodin;
  }

  return nuevo;
}

// La tarjeta del resumen: cómo queda el hábito.
function resumenHabito() {
  const habito = habitoDesdeRespuestas();
  const lineas = [];

  if (habito.medida === "cantidad") {
    let texto = "Al menos ";
    if (habito.limite === "maximo") {
      texto = "Como mucho ";
    }
    lineas.push(
      (
        texto +
        habito.objetivo.toLocaleString("es-ES") +
        " " +
        habito.unidad
      ).trim(),
    );
  } else if (habito.medida === "abstencion") {
    lineas.push("Templanza: cuento los días sin hacerlo");
  } else {
    lineas.push("Se marca como hecho");
  }

  if (habito.frecuencia === "dias") {
    lineas.push("Los días " + textoRespuesta(preguntaDe("dias"), habito.dias));
  } else if (habito.frecuencia === "semanal") {
    lineas.push(
      textoRespuesta(preguntaDe("vecesSemana"), habito.vecesSemana) +
        " por semana",
    );
  } else {
    lineas.push("Todos los días");
  }

  if (habito.medida === "abstencion") {
    lineas.push(textoRespuesta(preguntaDe("inicio"), habito.inicio));
  }

  if (habito.comodin) {
    lineas.push("Con comodín");
  }

  return { icono: habito.icono, nombre: habito.nombre, lineas: lineas };
}

// «Crear hábito»: lo guarda y vuelve a Hoy, donde su ficha brilla un momento.
function crearHabito() {
  const nuevo = habitoDesdeRespuestas();
  habitos.push(nuevo);
  guardarHabitos();

  respuestas = {};
  habitoRecienCreado = nuevo.id;
  mostrarPantalla("hoy");
  actualizarTodo();
}

// La conversación del hábito nuevo (qué es cada cosa: bloque 8).
const conversacionHabito = {
  saludo: function () {
    return salve() + " Vamos a dar forma a tu nuevo hábito, paso a paso.";
  },
  preguntas: preguntasHabito,
  cierre: "Así queda tu hábito. Si quieres cambiar algo, toca tu respuesta.",
  resumen: resumenHabito,
  boton: "Crear hábito",
  alTerminar: crearHabito,
  salir: "¿Salir sin crear el hábito?",
  alSalir: function () {
    mostrarPantalla("hoy");
  },
};

// El botón «+ Nuevo hábito» de Hoy abre la conversación.
document
  .getElementById("boton-nuevo-habito")
  .addEventListener("click", function () {
    abrirConversacion(conversacionHabito);
  });

// ==========================================================================
// 10. MÉNTOR · META NUEVA
// Las preguntas para crear una meta y lo que pasa al terminar. «+ Nueva
// meta» (en Metas) abre esta conversación. Editarla después, en la ventana
// de editar meta (bloque 18).
// ==========================================================================

// Las preguntas, en orden (cómo se escribe cada una: bloque 8).
const preguntasMeta = [
  {
    clave: "titulo",
    texto: "¿Qué quieres conseguir?",
    tipo: "texto",
    largo: 60,
    ejemplo: "Correr una media maratón…",
    validar: function (valor) {
      if (valor === "") {
        return "Dime qué quieres conseguir.";
      }
      return "";
    },
  },
  {
    clave: "area",
    texto: function (r) {
      return (
        "«" + r.titulo + "». Una gran obra. ¿A qué parte de tu vida pertenece?"
      );
    },
    tipo: "opciones",
    opciones: [
      { valor: "Hábitos", texto: "Hábitos" },
      { valor: "Salud", texto: "Salud" },
      { valor: "Carrera", texto: "Carrera" },
      { valor: "Finanzas", texto: "Finanzas" },
      { valor: "Hobbies", texto: "Hobbies" },
      { valor: "Social", texto: "Social" },
    ],
  },
  {
    clave: "habito",
    texto: "¿Qué hábito te acerca a ella cada día?",
    tipo: "opciones",
    // Solo si ya hay hábitos
    cuando: function () {
      return habitos.length > 0;
    },
    // Una opción por hábito y, al final, «Ninguno» (valor "")
    opciones: function () {
      const lista = habitos.map(function (habito) {
        return { valor: habito.id, texto: habito.nombre };
      });
      lista.push({ valor: "", texto: "Ninguno" });
      return lista;
    },
  },
  {
    clave: "pasos",
    texto:
      "Toda gran obra se levanta piedra a piedra. Escribe los pasos que te llevarán hasta ella, de uno en uno, y pulsa «Listo» al terminar.",
    tipo: "lista",
    ejemplo: "Un paso…",
    validar: function (valor) {
      if (valor.length === 0) {
        return "Añade al menos un paso.";
      }
      return "";
    },
  },
];

// Índice (posición en «metas») de la meta que Méntor acaba de crear: su
// tarjeta brilla un momento.
let metaRecienCreada = null;

// La tarjeta del resumen: cómo queda la meta.
function resumenMeta() {
  const lineas = [respuestas.area];
  if (respuestas.habito) {
    lineas.push("Impulsada por: " + nombreHabito(respuestas.habito));
  }
  lineas.push(
    "Pasos:\n" +
      respuestas.pasos
        .map(function (paso, posicion) {
          return posicion + 1 + ". " + paso;
        })
        .join("\n"),
  );
  return { icono: null, nombre: respuestas.titulo, lineas: lineas };
}

// «Crear meta»: la guarda y vuelve a Metas, donde su tarjeta brilla.
function crearMeta() {
  const pasos = respuestas.pasos.map(function (texto) {
    return { texto: texto, completado: false };
  });

  metas.push({
    titulo: respuestas.titulo,
    area: respuestas.area,
    habito: respuestas.habito || "",
    pasos: pasos,
  });
  guardarMetas();

  respuestas = {};
  metaRecienCreada = metas.length - 1;
  mostrarPantalla("metas");
  actualizarTodo();
}

// La conversación de la meta nueva (qué es cada cosa: bloque 8).
const conversacionMeta = {
  saludo: function () {
    return salve() + " Pensemos juntos en tu próxima meta.";
  },
  preguntas: preguntasMeta,
  cierre: "Así queda tu meta. Si quieres cambiar algo, toca tu respuesta.",
  resumen: resumenMeta,
  boton: "Crear meta",
  alTerminar: crearMeta,
  salir: "¿Salir sin crear la meta?",
  alSalir: function () {
    mostrarPantalla("metas");
  },
};

// El botón «+ Nueva meta» de Metas abre la conversación.
document
  .getElementById("boton-nueva-meta")
  .addEventListener("click", function () {
    abrirConversacion(conversacionMeta);
  });

// ==========================================================================
// 11. MÉNTOR · BIENVENIDA
// La primera vez que se abre Ergon (sin datos), Méntor se presenta, pregunta
// lo básico para el perfil (todo opcional) y propone el primer hábito.
// ==========================================================================

// Las preguntas, en orden (cómo se escribe cada una: bloque 8).
const preguntasBienvenida = [
  {
    clave: "nombre",
    texto: "Para empezar, ¿cómo te llamas?",
    tipo: "texto",
    ejemplo: "Tu nombre",
    vacio: "Prefiero no decirlo",
    saltar: true,
  },
  {
    clave: "nacimiento",
    texto: function (r) {
      let texto = "¿Cuándo naciste?";
      if (r.nombre) {
        texto = "Encantado, " + r.nombre + ". " + texto;
      }
      return texto;
    },
    tipo: "fecha",
    vacio: "Prefiero no decirlo",
    saltar: true,
    validar: function (valor) {
      if (valor > hoy) {
        return "Esa fecha aún no ha llegado.";
      }
      return "";
    },
  },
  {
    clave: "altura",
    texto: "¿Cuánto mides, en centímetros?",
    tipo: "numero",
    unidad: "cm",
    ejemplo: "175",
    vacio: "Prefiero no decirlo",
    saltar: true,
    validar: function (valor) {
      if (!(valor >= 50 && valor <= 250)) {
        return "Escribe tu altura en centímetros, p. ej. 175.";
      }
      return "";
    },
  },
  {
    clave: "peso",
    texto:
      "¿Y cuánto pesas hoy, en kilos? Lo apuntaré con la fecha, para que veas cómo cambia.",
    tipo: "numero",
    unidad: "kg",
    decimales: true,
    ejemplo: "72,5",
    vacio: "Prefiero no decirlo",
    saltar: true,
    validar: function (valor) {
      if (!(valor >= 20 && valor <= 400)) {
        return "Escribe tu peso en kilos, p. ej. 72,5.";
      }
      return "";
    },
  },
];

// ¿Toca la bienvenida? Solo la primera vez: sin perfil guardado, sin
// hábitos y sin metas (en un móvil que ya tiene datos, nunca).
function tocaBienvenida() {
  return (
    localStorage.getItem("ergon-perfil") === null &&
    habitos.length === 0 &&
    metas.length === 0
  );
}

// Guarda en el perfil lo respondido (lo que se dejó vacío, no se guarda).
function guardarPerfilDeBienvenida() {
  if (respuestas.nombre) {
    perfil.nombre = respuestas.nombre;
  }
  if (respuestas.nacimiento) {
    perfil.nacimiento = respuestas.nacimiento;
  }
  if (respuestas.altura) {
    perfil.altura = respuestas.altura;
  }
  if (respuestas.peso) {
    perfil.pesos = [{ fecha: hoy, kilos: respuestas.peso }];
  }
  guardarPerfil();
}

// La tarjeta del resumen: el perfil tal como queda.
function resumenBienvenida() {
  const lineas = [];
  if (respuestas.nacimiento) {
    lineas.push(
      "Nacimiento: " +
        fechaLarga(respuestas.nacimiento) +
        " (" +
        edadDe(respuestas.nacimiento) +
        " años)",
    );
  }
  if (respuestas.altura) {
    lineas.push("Altura: " + respuestas.altura + " cm");
  }
  if (respuestas.peso) {
    lineas.push("Peso: " + respuestas.peso.toLocaleString("es-ES") + " kg");
  }
  if (lineas.length === 0) {
    lineas.push("Sin datos por ahora: puedes añadirlos cuando quieras.");
  }
  return {
    icono: null,
    nombre: respuestas.nombre || "Tu perfil",
    lineas: lineas,
  };
}

// La conversación de bienvenida (qué es cada cosa: bloque 8).
const conversacionBienvenida = {
  saludo: function () {
    const frases = [
      "Salve. Soy Méntor, y te acompañaré en Ergon.",
      "Ergon viene del griego ἔργον, «la obra»: lo que uno construye con su trabajo de cada día. Aquí irás levantando la tuya con hábitos, metas y un poco de filosofía.",
    ];
    if (hayNube()) {
      frases.push(
        "¿Ya usas Ergon en otro dispositivo? Pulsa «Salir» y entra en tu cuenta, en Archivo: tus datos llegarán solos.",
      );
    }
    return frases;
  },
  preguntas: preguntasBienvenida,
  cierre:
    "Todo listo. Puedes cambiarlo cuando quieras en Archivo, en tu perfil. ¿Construimos tu primer hábito?",
  resumen: resumenBienvenida,
  boton: "Crear mi primer hábito",
  alTerminar: function () {
    guardarPerfilDeBienvenida();
    abrirConversacion(conversacionHabito);
  },
  otroBoton: {
    texto: "Empezar sin hábitos",
    alPulsar: function () {
      guardarPerfilDeBienvenida();
      respuestas = {};
      mostrarPantalla("hoy");
      actualizarTodo();
    },
  },
  salir: "¿Saltar la bienvenida? Podrás rellenar tu perfil en Archivo.",
  // Al saltarla se guarda el perfil vacío, para que no vuelva a salir
  alSalir: function () {
    guardarPerfil();
    mostrarPantalla("hoy");
    actualizarTodo();
  },
};

// ==========================================================================
// 12. RITUALES DE MAÑANA Y DE NOCHE
// Por la mañana, la intención del día y cómo he dormido. Por la noche, el
// examen de Séneca: Ergon recuerda sus tres preguntas para responderlas en
// el diario de papel.
// ==========================================================================

// La mañana empieza a las 4 y la noche, a las 20. De madrugada (antes de las
// 4) todavía es la noche del día anterior. Cambia estas horas si quieres.
const horaManana = 4;
const horaNoche = 20;

// Las tres preguntas que Séneca se hacía cada noche (las tomó del filósofo
// Sextio). Están en «Sobre la ira», libro III, capítulo 36.
const preguntasSeneca = [
  "¿Qué mal tuyo has curado hoy?",
  "¿A qué vicio te has resistido?",
  "¿En qué eres mejor?",
];

// ¿Se está cambiando la intención? (al tocarla para corregirla)
let cambiandoIntencion = false;

// ¿Es de noche? (de las 20 a las 4)
function esDeNoche() {
  const hora = new Date().getHours();
  return hora >= horaNoche || hora < horaManana;
}

// El día del que habla el ritual, como "2026-10-16": hoy o, de madrugada,
// el día que se acaba de vivir.
function diaDelRitual() {
  const fecha = new Date();
  if (fecha.getHours() < horaManana) {
    fecha.setDate(fecha.getDate() - 1);
  }
  return fecha.toLocaleDateString("en-CA");
}

// Un párrafo con su clase (para no repetir siempre las mismas tres líneas).
function crearParrafo(texto, clase) {
  const parrafo = document.createElement("p");
  parrafo.classList.add(clase);
  parrafo.textContent = texto;
  return parrafo;
}

// La tarjeta de la mañana: «¿Qué quieres que hoy no se te escape?» con un
// campo, «Guardar» y «Hoy no». escrito: lo que ya había en el campo (para
// no perderlo si la pantalla se vuelve a dibujar mientras se escribe).
function tarjetaManana(ritual, escrito) {
  const tarjeta = document.createElement("form");
  tarjeta.classList.add("ritual", "ritual-intencion");

  let saludo = "Buenos días";
  if (new Date().getHours() >= 14) {
    saludo = "Buenas tardes";
  }
  if (perfil.nombre) {
    saludo = saludo + ", " + perfil.nombre;
  }

  const campo = document.createElement("input");
  campo.type = "text";
  campo.maxLength = 120;
  campo.placeholder = "Una sola frase…";
  campo.value = ritual.intencion || "";
  if (escrito) {
    campo.value = escrito;
  }

  const fila = document.createElement("div");
  fila.classList.add("ritual-fila");
  const guardar = document.createElement("button");
  guardar.type = "submit";
  guardar.classList.add("boton-principal");
  guardar.textContent = "Guardar";
  fila.append(campo, guardar);

  // «Hoy no»: se guarda una intención vacía y la tarjeta no vuelve hoy
  const hoyNo = crearBoton("Hoy no", "ritual-hoy-no", function () {
    ritual.intencion = "";
    cambiandoIntencion = false;
    guardarRitual(ritual);
  });

  tarjeta.append(
    crearParrafo("Intención del día", "ritual-titulo"),
    crearParrafo(
      saludo + ". ¿Qué quieres que hoy no se te escape?",
      "ritual-texto",
    ),
    fila,
    hoyNo,
  );

  tarjeta.addEventListener("submit", function (evento) {
    evento.preventDefault();
    if (campo.value.trim() === "") {
      return;
    }
    ritual.intencion = campo.value.trim();
    cambiandoIntencion = false;
    guardarRitual(ritual);
  });

  return tarjeta;
}

// Un campo de hora con su nombre delante («Me acosté [23:40]»).
function campoHora(texto, nombre, valor) {
  const etiqueta = document.createElement("label");
  etiqueta.classList.add("ritual-hora");
  const campo = document.createElement("input");
  campo.type = "time";
  campo.name = nombre;
  campo.value = valor;
  etiqueta.append(crearParrafo(texto, "ritual-hora-texto"), campo);
  return etiqueta;
}

// La tarjeta del sueño (por la mañana, mientras no se haya apuntado la
// noche): a qué hora me acosté y me levanté y, al tocar «Bien», «Regular»
// o «Mal», se guarda. Las horas vienen puestas como la última noche
// apuntada. horas: lo que ya había en los campos (para no perderlo si la
// pantalla se vuelve a dibujar).
function tarjetaSueno(ritual, dia, horas) {
  const tarjeta = document.createElement("div");
  tarjeta.classList.add("ritual", "ritual-sueno");

  const habituales = horasHabituales();
  const acostarse = campoHora(
    "Me acosté",
    "acostarse",
    horas.acostarse || habituales.acostarse,
  );
  const levantarse = campoHora(
    "Me levanté",
    "levantarse",
    horas.levantarse || habituales.levantarse,
  );
  const filaHoras = document.createElement("div");
  filaHoras.classList.add("ritual-horas");
  filaHoras.append(acostarse, levantarse);

  const error = crearParrafo("", "ventana-error");

  // Los tres botones de cómo dormí: cada uno guarda la noche
  const botones = document.createElement("div");
  botones.classList.add("ritual-calidad");
  calidadesSueno.forEach(function (calidad) {
    botones.append(
      crearBoton(calidad.nombre, "ritual-calidad-boton", function () {
        const noche = {
          acostarse: acostarse.querySelector("input").value,
          levantarse: levantarse.querySelector("input").value,
          calidad: calidad.id,
        };
        const fallo = falloSueno(noche);
        if (fallo) {
          error.textContent = fallo;
          return;
        }
        sueno[dia] = noche;
        guardarSueno(dia);
        actualizarTodo();
      }),
    );
  });

  // «Hoy no»: la tarjeta no vuelve hoy (se apunta en el ritual del día)
  const hoyNo = crearBoton("Hoy no", "ritual-hoy-no", function () {
    ritual.sueno = "no";
    guardarRitual(ritual);
  });

  tarjeta.append(
    crearParrafo("Sueño de anoche", "ritual-titulo"),
    filaHoras,
    crearParrafo("¿Qué tal has dormido?", "ritual-texto"),
    botones,
    error,
    hoyNo,
  );
  return tarjeta;
}

// La tarjeta de la noche: las preguntas de Séneca, la intención de la
// mañana, cómo ha ido el día y «Examen hecho».
function tarjetaNoche(ritual, dia) {
  const tarjeta = document.createElement("div");
  tarjeta.classList.add("ritual", "ritual-noche");

  const lista = document.createElement("ol");
  lista.classList.add("ritual-preguntas");
  preguntasSeneca.forEach(function (pregunta) {
    const item = document.createElement("li");
    item.textContent = pregunta;
    lista.append(item);
  });

  tarjeta.append(
    crearParrafo("Examen de la noche", "ritual-titulo"),
    crearParrafo(
      "Antes de dormir, Séneca repasaba su día con tres preguntas. Respóndelas en tu diario:",
      "ritual-texto",
    ),
    lista,
    crearParrafo("— Séneca, Sobre la ira, III 36", "ritual-fuente"),
  );

  if (ritual.intencion) {
    tarjeta.append(
      crearParrafo(
        "Tu intención de hoy era: «" + ritual.intencion + "»",
        "ritual-recuerdo",
      ),
    );
  }

  // Cómo ha ido el día con los hábitos
  const resumen = resumenDelDia(new Date(dia + "T00:00"));
  if (resumen.tocan > 0) {
    tarjeta.append(
      crearParrafo(
        "Hábitos cumplidos: " + resumen.cumplidos + " de " + resumen.tocan,
        "ritual-recuerdo",
      ),
    );
  }

  tarjeta.append(
    crearBoton("Examen hecho", "boton-principal", function () {
      ritual.examen = true;
      guardarRitual(ritual);
    }),
  );

  return tarjeta;
}

// Guarda el ritual del día y vuelve a dibujar los rituales.
function guardarRitual(ritual) {
  rituales[diaDelRitual()] = ritual;
  guardarRituales(diaDelRitual());
  mostrarRituales();
}

// Lo que hay escrito en un campo de la caja de los rituales ("" si no está).
function valorEnRituales(caja, selector) {
  const campo = caja.querySelector(selector);
  if (campo) {
    return campo.value;
  }
  return "";
}

// Dibuja lo que toca según la hora: por la mañana, la tarjeta de la
// intención (o la intención ya escrita) y la del sueño (o lo que dormí); por
// la noche, el examen (hasta que se marca hecho).
function mostrarRituales() {
  const caja = document.getElementById("ritual");

  // Lo que se estaba escribiendo (al marcar un hábito, todo se vuelve a
  // dibujar y se perdería)
  const escrito = valorEnRituales(caja, ".ritual-intencion input");
  const horas = {
    acostarse: valorEnRituales(caja, '.ritual-sueno [name="acostarse"]'),
    levantarse: valorEnRituales(caja, '.ritual-sueno [name="levantarse"]'),
  };

  caja.innerHTML = "";
  const dia = diaDelRitual();
  const ritual = rituales[dia] || {};

  if (esDeNoche()) {
    if (!ritual.examen) {
      caja.append(tarjetaNoche(ritual, dia));
    }
    caja.hidden = caja.children.length === 0;
    return;
  }

  if (ritual.intencion === undefined || cambiandoIntencion) {
    caja.append(tarjetaManana(ritual, escrito));
  } else if (ritual.intencion !== "") {
    // La intención ya escrita, como recordatorio. Al tocarla, se cambia
    const linea = crearBoton(
      "Intención de hoy: «" + ritual.intencion + "»",
      "recordatorio",
      function () {
        cambiandoIntencion = true;
        mostrarRituales();
      },
    );
    linea.title = "Cambiar la intención";
    caja.append(linea);
  }

  // El sueño de anoche: si ya está, como recordatorio (al tocarlo se abre
  // su ventana para cambiarlo); si no, la tarjeta (salvo «Hoy no»)
  if (sueno[dia]) {
    const linea = crearBoton(
      "Anoche: " + textoNoche(sueno[dia]) + ".",
      "recordatorio",
      function () {
        abrirVentanaSueno(dia);
      },
    );
    linea.title = "Cambiar el sueño de anoche";
    caja.append(linea);
  } else if (ritual.sueno !== "no") {
    caja.append(tarjetaSueno(ritual, dia, horas));
  }

  caja.hidden = caja.children.length === 0;
}

// ==========================================================================
// 13. REVISIÓN SEMANAL
// El domingo (o el lunes, si se pasó), Méntor repasa la semana con sus
// datos y hace tres preguntas. El propósito que sale se recuerda en Hoy
// toda la semana siguiente, y las revisiones se pueden releer en Archivo.
// ==========================================================================

// La semana que se está revisando (el texto de su lunes).
let semanaRevisada = null;

// ¿Se ha dejado la revisión para luego? (hasta que se vuelve a abrir la app)
let revisionAplazada = false;

// El lunes de la semana que toca revisar: el domingo, la de hoy; el lunes,
// la que acaba de terminar. Los demás días, ninguna (null).
function semanaARevisar() {
  const ahora = new Date();
  if (ahora.getDay() === 0) {
    return lunesDe(ahora).toLocaleDateString("en-CA");
  }
  if (ahora.getDay() === 1) {
    const ayer = new Date(ahora);
    ayer.setDate(ayer.getDate() - 1);
    return lunesDe(ayer).toLocaleDateString("en-CA");
  }
  return null;
}

// El lunes de 7 días antes de otro lunes ("2026-10-19" → "2026-10-12").
function lunesAnterior(clave) {
  const lunes = new Date(clave + "T00:00");
  lunes.setDate(lunes.getDate() - 7);
  return lunes.toLocaleDateString("en-CA");
}

// El propósito que salió de la revisión de la semana anterior a «clave»
// ("" si no hubo).
function propositoAnterior(clave) {
  const revision = revisiones[lunesAnterior(clave)];
  if (revision && revision.proposito) {
    return revision.proposito;
  }
  return "";
}

// Los datos de una semana (la que empieza el lunes «clave»), hasta hoy: los
// días perfectos, cómo le ha ido a cada hábito y las metas conseguidas.
function datosDeLaSemana(clave) {
  const lunes = new Date(clave + "T00:00");
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  const claveDomingo = domingo.toLocaleDateString("en-CA");

  // Días vividos y días perfectos (todo cumplido, en oro en el mosaico)
  let vividos = 0;
  let perfectos = 0;
  const fecha = new Date(lunes);
  for (let i = 0; i < 7; i++) {
    if (fecha.toLocaleDateString("en-CA") <= hoy) {
      vividos++;
      if (nivelDelDia(fecha) === 3) {
        perfectos++;
      }
    }
    fecha.setDate(fecha.getDate() + 1);
  }

  // Cada hábito: cuántas veces se cumplió de las que tocaba
  const porHabito = [];
  habitos.forEach(function (habito) {
    let hechos = 0;
    let tocan = 0;

    if (habito.frecuencia === "semanal") {
      // Los semanales: las veces hechas de las que tocaban (sin pasarse)
      tocan = reglasEn(habito, claveDomingo).vecesSemana;
      hechos = Math.min(vecesEnSemana(habito, lunes), tocan);
    } else {
      const dia = new Date(lunes);
      for (let i = 0; i < 7; i++) {
        const claveDia = dia.toLocaleDateString("en-CA");
        const reglas = reglasEn(habito, claveDia);
        if (claveDia <= hoy && tocaEn(reglas, dia)) {
          tocan++;
          if (estaCumplido(reglas, registro[claveDia] || {})) {
            hechos++;
          }
        }
        dia.setDate(dia.getDate() + 1);
      }
    }

    if (tocan > 0) {
      porHabito.push({ nombre: habito.nombre, hechos: hechos, tocan: tocan });
    }
  });

  // Las metas cuya victoria cayó en esta semana
  const victorias = [];
  metas.forEach(function (meta) {
    if (
      meta.victoria &&
      meta.victoria >= clave &&
      meta.victoria <= claveDomingo
    ) {
      victorias.push(meta.titulo);
    }
  });

  return {
    vividos: vividos,
    perfectos: perfectos,
    porHabito: porHabito,
    victorias: victorias,
  };
}

// Lo que dice Méntor al empezar: el saludo y los datos de la semana.
function saludoRevision() {
  const datos = datosDeLaSemana(semanaRevisada);
  const frases = [salve() + " Cerremos juntos la semana."];

  let dias = " días perfectos";
  if (datos.perfectos === 1) {
    dias = " día perfecto";
  }
  frases.push(
    "Esta semana has tenido " +
      datos.perfectos +
      dias +
      " de " +
      datos.vividos +
      ", con todas tus disciplinas cumplidas.",
  );

  // El hábito más constante y el que más ha costado (por proporción)
  if (datos.porHabito.length > 0) {
    let mejor = datos.porHabito[0];
    let peor = datos.porHabito[0];
    datos.porHabito.forEach(function (h) {
      if (h.hechos / h.tocan > mejor.hechos / mejor.tocan) {
        mejor = h;
      }
      if (h.hechos / h.tocan < peor.hechos / peor.tocan) {
        peor = h;
      }
    });

    if (
      mejor === peor ||
      mejor.hechos / mejor.tocan === peor.hechos / peor.tocan
    ) {
      if (peor.hechos === peor.tocan) {
        frases.push(
          "Has cumplido todos tus hábitos cada vez que tocaban. Así se levanta una obra.",
        );
      }
    } else {
      frases.push(
        "Lo más constante: " +
          mejor.nombre +
          " (" +
          mejor.hechos +
          " de " +
          mejor.tocan +
          "). Lo que más te ha costado: " +
          peor.nombre +
          " (" +
          peor.hechos +
          " de " +
          peor.tocan +
          ").",
      );
    }
  }

  if (datos.victorias.length === 1) {
    frases.push(
      "Y has conseguido una meta: «" +
        datos.victorias[0] +
        "». Merece su laurel.",
    );
  } else if (datos.victorias.length > 1) {
    frases.push(
      "Y has conseguido " +
        datos.victorias.length +
        " metas: «" +
        datos.victorias.join("», «") +
        "».",
    );
  }

  const proposito = propositoAnterior(semanaRevisada);
  if (proposito) {
    frases.push("La semana pasada te propusiste: «" + proposito + "».");
  }

  return frases;
}

// Las preguntas, en orden (cómo se escribe cada una: bloque 8).
const preguntasRevision = [
  {
    clave: "cumplido",
    texto: "¿Lo has cumplido?",
    tipo: "opciones",
    // Solo si la semana pasada hubo propósito
    cuando: function () {
      return propositoAnterior(semanaRevisada) !== "";
    },
    opciones: [
      { valor: "Sí", texto: "Sí" },
      { valor: "A medias", texto: "A medias" },
      { valor: "No", texto: "No" },
    ],
  },
  {
    clave: "bien",
    texto: "¿Qué ha ido bien esta semana?",
    tipo: "parrafo",
    largo: 300,
    vacio: "Sin respuesta",
  },
  {
    clave: "costado",
    texto: "¿Y qué te ha costado más? Si sabes por qué, dímelo también.",
    tipo: "parrafo",
    largo: 300,
    vacio: "Sin respuesta",
  },
  {
    clave: "proposito",
    texto:
      "Para terminar, un propósito para la semana que viene: una sola frase, algo que harás distinto.",
    tipo: "texto",
    largo: 120,
    ejemplo: "Acostarme antes de medianoche…",
    vacio: "Sin propósito",
  },
];

// «Semana del 12 de octubre»
function nombreSemana(clave) {
  return (
    "Semana del " +
    new Date(clave + "T00:00").toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
    })
  );
}

// Una línea del resumen: «Ha ido bien: …» (o «Sin respuesta»).
function lineaRevision(titulo, clave) {
  return titulo + ": " + textoRespuesta(preguntaDe(clave), respuestas[clave]);
}

// La tarjeta del resumen: lo respondido.
function resumenRevision() {
  const lineas = [];
  if (respuestas.cumplido !== undefined) {
    lineas.push(lineaRevision("Propósito anterior", "cumplido"));
  }
  lineas.push(
    lineaRevision("Ha ido bien", "bien"),
    lineaRevision("Ha costado", "costado"),
    lineaRevision("Propósito", "proposito"),
  );
  return { icono: null, nombre: nombreSemana(semanaRevisada), lineas: lineas };
}

// «Guardar revisión»: guarda lo respondido y los datos de la semana.
function guardarRevision() {
  const datos = datosDeLaSemana(semanaRevisada);
  revisiones[semanaRevisada] = {
    fecha: hoy,
    cumplido: respuestas.cumplido || "",
    bien: respuestas.bien,
    costado: respuestas.costado,
    proposito: respuestas.proposito,
    perfectos: datos.perfectos,
    vividos: datos.vividos,
  };
  guardarRevisiones(semanaRevisada);

  respuestas = {};
  mostrarPantalla("hoy");
  actualizarTodo();
}

// La conversación de la revisión (qué es cada cosa: bloque 8).
const conversacionRevision = {
  saludo: saludoRevision,
  preguntas: preguntasRevision,
  cierre: "Así queda tu revisión. Si quieres cambiar algo, toca tu respuesta.",
  resumen: resumenRevision,
  boton: "Guardar revisión",
  alTerminar: guardarRevision,
  salir: "¿Salir sin guardar la revisión?",
  alSalir: function () {
    mostrarPantalla("hoy");
  },
};

// Empieza la revisión de la semana que toca.
function abrirRevision() {
  semanaRevisada = semanaARevisar();
  abrirConversacion(conversacionRevision);
}

// En Hoy: el propósito de esta semana (si lo hay) y, el domingo y el lunes,
// la tarjeta para empezar la revisión (si aún no está hecha).
function mostrarRevisionEnHoy() {
  const caja = document.getElementById("revision-hoy");
  caja.innerHTML = "";

  const esteLunes = lunesDe(new Date()).toLocaleDateString("en-CA");
  const proposito = propositoAnterior(esteLunes);
  if (proposito) {
    caja.append(
      crearParrafo(
        "Propósito de la semana: «" + proposito + "»",
        "recordatorio",
      ),
    );
  }

  const clave = semanaARevisar();
  if (clave && !revisiones[clave] && habitos.length > 0 && !revisionAplazada) {
    const tarjeta = document.createElement("div");
    tarjeta.classList.add("ritual", "ritual-revision");

    let texto =
      "Es domingo: buen momento para mirar atrás y decidir cómo será la semana que viene.";
    if (new Date().getDay() === 1) {
      texto =
        "Ayer acabó la semana y aún no la has revisado. ¿La miramos juntos?";
    }

    const botones = document.createElement("div");
    botones.classList.add("ritual-fila");
    botones.append(
      crearBoton("Empezar con Méntor", "boton-principal", abrirRevision),
      crearBoton("Ahora no", "ritual-hoy-no", function () {
        revisionAplazada = true;
        mostrarRevisionEnHoy();
      }),
    );

    tarjeta.append(
      crearParrafo("Revisión de la semana", "ritual-titulo"),
      crearParrafo(texto, "ritual-texto"),
      botones,
    );
    caja.append(tarjeta);
  }

  caja.hidden = caja.children.length === 0;
}

// En Archivo: las revisiones guardadas, de la más nueva a la más antigua.
// Cada una se abre al tocarla (<details>).
function mostrarRevisiones() {
  const lista = document.getElementById("lista-revisiones");
  lista.innerHTML = "";

  // Object.keys: las claves (los lunes); sort las ordena y reverse les da
  // la vuelta, para que la más nueva vaya primero
  const semanas = Object.keys(revisiones).sort().reverse();

  semanas.forEach(function (clave) {
    const revision = revisiones[clave];
    const detalles = document.createElement("details");
    detalles.classList.add("revision");

    const resumen = document.createElement("summary");
    let dias = " días perfectos";
    if (revision.perfectos === 1) {
      dias = " día perfecto";
    }
    resumen.textContent =
      nombreSemana(clave) + " · " + revision.perfectos + dias;
    detalles.append(resumen);

    // Cada línea: [título, respuesta]. Las vacías salen con «—»
    const partes = [];
    if (revision.cumplido) {
      partes.push(["Propósito anterior cumplido", revision.cumplido]);
    }
    partes.push(["Ha ido bien", revision.bien]);
    partes.push(["Ha costado", revision.costado]);
    partes.push(["Propósito", revision.proposito]);

    partes.forEach(function (parte) {
      detalles.append(
        crearParrafo(parte[0] + ": " + (parte[1] || "—"), "revision-linea"),
      );
    });

    lista.append(detalles);
  });

  document.getElementById("seccion-revisiones").hidden = semanas.length === 0;
}

// ==========================================================================
// 14. SEMANA
// Los siete días de esta semana, con el dios de cada día y lo cumplido.
// ==========================================================================

// Símbolo, dios y color (su metal en la alquimia) de cada día, de lunes a domingo.
const diosesSemana = [
  { simbolo: "☽", dios: "la Luna", color: "#8E9AA6" },
  { simbolo: "♂", dios: "Marte", color: "#A23B2A" },
  { simbolo: "☿", dios: "Mercurio", color: "#5E7C8C" },
  { simbolo: "♃", dios: "Júpiter", color: "#6B4C8A" },
  { simbolo: "♀", dios: "Venus", color: "#3F8A7A" },
  { simbolo: "♄", dios: "Saturno", color: "#55555E" },
  { simbolo: "☉", dios: "el Sol", color: "#C9A23A" },
];

// Dibuja la semana actual con cuántos hábitos se cumplieron cada día.
function mostrarHistorial() {
  const contenedor = document.getElementById("semana");
  contenedor.innerHTML = "";

  // Lunes de esta semana
  const lunes = new Date();
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));

  for (let i = 0; i < 7; i++) {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + i);
    const clave = fecha.toLocaleDateString("en-CA");
    const resumen = resumenDelDia(fecha);

    // Casilla del día: verde si se cumplió todo, borde terracota si es hoy, clara si es futuro
    const dia = document.createElement("div");
    dia.classList.add("dia");

    if (resumen.tocan > 0 && resumen.cumplidos === resumen.tocan) {
      dia.classList.add("cumplido");
    }
    if (clave === hoy) {
      dia.classList.add("hoy");
    }
    if (clave > hoy) {
      dia.classList.add("futuro");
    }

    const nombreDia = document.createElement("span");
    nombreDia.classList.add("nombre-dia");
    nombreDia.textContent = fecha.toLocaleDateString("es-ES", {
      weekday: "short",
    });

    // Símbolo y color del dios del día (\uFE0E: que se vea como letra, no como emoji)
    const simbolo = document.createElement("span");
    simbolo.classList.add("simbolo-dia");
    simbolo.textContent = diosesSemana[i].simbolo + "\uFE0E";
    simbolo.style.color = diosesSemana[i].color;
    dia.title = "Día de " + diosesSemana[i].dios;

    // Cumplidos / los que tocaban ese día (— si no tocaba ninguno)
    const marcador = document.createElement("span");

    if (resumen.tocan === 0) {
      marcador.textContent = "—";
    } else {
      marcador.textContent = resumen.cumplidos + "/" + resumen.tocan;
    }

    dia.appendChild(simbolo);
    dia.appendChild(nombreDia);
    dia.appendChild(marcador);
    contenedor.appendChild(dia);
  }
}

// ==========================================================================
// 15. CONSTANCIA
// Cuántas veces se ha cumplido cada hábito en los últimos 30 días.
// ==========================================================================

// Constancia de un hábito: de los últimos 30 días que tocaba, en cuántos se
// cumplió. Hoy solo cuenta si ya está cumplido o ya no tiene remedio (si
// no, aún hay tiempo). Los de «unas veces por semana» cuentan semanas.
function constancia(habito) {
  if (habito.frecuencia === "semanal") {
    return constanciaSemanas(habito);
  }

  let cumplidos = 0;
  let posibles = 0;
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - 29);

  for (let i = 0; i < 30; i++) {
    const clave = fecha.toLocaleDateString("en-CA");
    const reglas = reglasEn(habito, clave);
    const cumplido = estaCumplido(reglas, registro[clave] || {});
    const yaCuenta = clave < hoy || cumplido || hoyYaFallado(habito);

    if (tocaEn(reglas, fecha) && yaCuenta) {
      posibles++;
      if (cumplido) {
        cumplidos++;
      }
    }

    fecha.setDate(fecha.getDate() + 1);
  }

  return { cumplidos: cumplidos, posibles: posibles, enSemanas: false };
}

// Constancia de los de «unas veces por semana»: de las últimas 4 semanas
// (esta incluida, si ya se llegó o ya no da tiempo), cuántas se cumplieron.
function constanciaSemanas(habito) {
  let cumplidos = 0;
  let posibles = 0;
  const lunes = lunesDe(new Date());
  const inicio = inicioDe(habito);

  for (let i = 0; i < 4; i++) {
    const domingo = new Date(lunes);
    domingo.setDate(domingo.getDate() + 6);

    // Solo las semanas desde que empezó el hábito
    if (domingo.toLocaleDateString("en-CA") >= inicio) {
      const cumplida = semanaCumplida(habito, lunes);
      const yaCuenta = i > 0 || cumplida || hoyYaFallado(habito);
      if (yaCuenta) {
        posibles++;
        if (cumplida) {
          cumplidos++;
        }
      }
    }

    lunes.setDate(lunes.getDate() - 7);
  }

  return { cumplidos: cumplidos, posibles: posibles, enSemanas: true };
}

// Dibuja una fila por hábito: icono, nombre, barra y «26 de 30 días».
// Si no hay hábitos, la sección se esconde.
function mostrarConstancia() {
  const lista = document.getElementById("lista-constancia");
  lista.innerHTML = "";
  document.getElementById("seccion-constancia").hidden = habitos.length === 0;

  habitos.forEach(function (habito) {
    const datos = constancia(habito);

    const fila = document.createElement("li");

    const nombre = document.createElement("span");
    nombre.classList.add("constancia-nombre");
    nombre.textContent = habito.nombre;

    // La barra de progreso, la misma de las metas
    const barra = document.createElement("div");
    barra.classList.add("barra");
    const relleno = document.createElement("div");
    relleno.classList.add("barra-relleno");
    if (datos.posibles > 0) {
      relleno.style.width =
        Math.round((datos.cumplidos / datos.posibles) * 100) + "%";
    } else {
      relleno.style.width = "0%";
    }
    barra.append(relleno);

    // «26 de 30 días», «3 de 4 semanas» o, si aún no ha tocado, «empieza hoy»
    const cifra = document.createElement("span");
    cifra.classList.add("constancia-cifra");
    if (datos.posibles === 0) {
      cifra.textContent = "empieza hoy";
    } else if (datos.enSemanas) {
      let semanas = " semanas";
      if (datos.posibles === 1) {
        semanas = " semana";
      }
      cifra.textContent = datos.cumplidos + " de " + datos.posibles + semanas;
    } else {
      cifra.textContent = datos.cumplidos + " de " + textoDias(datos.posibles);
    }

    fila.append(crearIcono(iconoDe(habito)), nombre, cifra, barra);
    lista.append(fila);
  });
}

// ==========================================================================
// 16. MOSAICO DEL MES
// Cada día es una tesela que se colorea según lo cumplido; los perfectos, en oro.
// ==========================================================================

// Mes que se ve en el mosaico (siempre en su día 1). Las flechas lo cambian.
const mesVisible = new Date();
mesVisible.setDate(1);

// Nivel de la tesela: 0 nada, 1 algo, 2 la mitad o más, 3 todo (oro).
function nivelDelDia(fecha) {
  const resumen = resumenDelDia(fecha);
  if (resumen.tocan === 0) {
    return 0;
  }

  const proporcion = resumen.cumplidos / resumen.tocan;
  if (proporcion === 1) {
    return 3;
  } else if (proporcion >= 0.5) {
    return 2;
  } else if (proporcion > 0) {
    return 1;
  }
  return 0;
}

// Dibuja el mosaico del mes que se está viendo.
function mostrarMosaico() {
  const contenedor = document.getElementById("mosaico");
  contenedor.innerHTML = "";

  const anio = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();
  document.getElementById("mosaico-titulo").textContent =
    mesVisible.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  // Días que tiene el mes y huecos hasta su primer día (la semana empieza en lunes)
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();
  const huecos = (new Date(anio, mes, 1).getDay() + 6) % 7;

  for (let i = 0; i < huecos; i++) {
    contenedor.appendChild(document.createElement("span"));
  }

  let perfectos = 0;
  let vividos = 0;

  // Una tesela por día. Los futuros, sin color; los vividos, según su nivel
  for (let dia = 1; dia <= diasDelMes; dia++) {
    const fecha = new Date(anio, mes, dia);
    const clave = fecha.toLocaleDateString("en-CA");

    const tesela = document.createElement("span");
    tesela.classList.add("tesela");
    tesela.textContent = dia;
    tesela.title = fecha.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    if (clave > hoy) {
      tesela.classList.add("futura");
    } else {
      const nivel = nivelDelDia(fecha);
      tesela.classList.add("nivel-" + nivel);
      vividos++;
      if (nivel === 3) {
        perfectos++;
      }
    }
    if (clave === hoy) {
      tesela.classList.add("hoy");
    }

    contenedor.appendChild(tesela);
  }

  // Resumen: días perfectos del mes
  document.getElementById("mosaico-resumen").textContent =
    perfectos + " de " + vividos + " días con todas tus disciplinas cumplidas";
}

// ¿Se está enrollando el pergamino? Mientras dura, las flechas no hacen nada.
let enrollando = false;

// Cambia de mes con la animación del pergamino: la hoja se enrolla, cambia el
// mes y se vuelve a desenrollar. paso: -1 (mes anterior) o 1 (mes siguiente).
async function cambiarMes(paso) {
  if (enrollando) {
    return;
  }

  // Con «reducir movimiento» activado en el móvil, se cambia sin animación
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    mesVisible.setMonth(mesVisible.getMonth() + paso);
    mostrarMosaico();
    return;
  }

  enrollando = true;
  const hoja = document.getElementById("mosaico-hoja");
  const rodillo = document.getElementById("mosaico-rodillo");

  // Hacia delante, la hoja se enrolla hacia arriba; hacia atrás, hacia abajo.
  // clip-path: inset(arriba derecha abajo izquierda) recorta la hoja, y el
  // rodillo va siempre por el borde que se está recortando.
  const abierta = "inset(0 0 0 0)";
  let enrollada = "inset(0 0 100% 0)";
  let bordeAbierto = "100%";
  let bordeEnrollado = "0%";
  if (paso < 0) {
    enrollada = "inset(100% 0 0 0)";
    bordeAbierto = "0%";
    bordeEnrollado = "100%";
  }

  // 1. Enrollar
  const enrollar = { duration: 350, easing: "ease-in", fill: "forwards" };
  const hojaSube = hoja.animate(
    [{ clipPath: abierta }, { clipPath: enrollada }],
    enrollar,
  );
  const rodilloSube = rodillo.animate(
    [
      { top: bordeAbierto, opacity: 1 },
      { top: bordeEnrollado, opacity: 1 },
    ],
    enrollar,
  );
  await rodilloSube.finished;

  // 2. Con la hoja enrollada, cambiar de mes
  mesVisible.setMonth(mesVisible.getMonth() + paso);
  mostrarMosaico();

  // 3. Desenrollar
  const desenrollar = { duration: 450, easing: "ease-out", fill: "forwards" };
  const hojaBaja = hoja.animate(
    [{ clipPath: enrollada }, { clipPath: abierta }],
    desenrollar,
  );
  const rodilloBaja = rodillo.animate(
    [
      { top: bordeEnrollado, opacity: 1 },
      { top: bordeAbierto, opacity: 1 },
    ],
    desenrollar,
  );
  hojaSube.cancel();
  rodilloSube.cancel();
  await rodilloBaja.finished;

  // 4. Quitar las animaciones: la hoja queda abierta y el rodillo, escondido
  hojaBaja.cancel();
  rodilloBaja.cancel();
  enrollando = false;
}

// Flechas para ir al mes anterior y al siguiente.
document.getElementById("mes-anterior").addEventListener("click", function () {
  cambiarMes(-1);
});

document.getElementById("mes-siguiente").addEventListener("click", function () {
  cambiarMes(1);
});

// ==========================================================================
// 17. METAS · TARJETAS
// Objetivos divididos en pasos. Las cumplidas pasan a «Laureles», con su
// corona y el día de la victoria. Las metas nuevas se crean con Méntor
// (bloque 10).
// ==========================================================================

// ¿Está cumplida la meta? Sí, si todos sus pasos están hechos.
// every: ¿lo cumplen todos? (some, en cambio, pregunta si alguno).
function metaCumplida(meta) {
  return meta.pasos.every(function (paso) {
    return paso.completado;
  });
}

// Apunta el día de la victoria cuando una meta pasa a estar cumplida y lo
// borra si deja de estarlo (al desmarcar un paso o añadir uno nuevo).
// Las cumplidas antes de esta lección no tienen fecha: no se inventa.
function apuntarVictoria(meta, estabaCumplida) {
  const cumplida = metaCumplida(meta);
  if (cumplida && !estabaCumplida) {
    meta.victoria = hoy;
  }
  if (!cumplida) {
    delete meta.victoria;
  }
}

// Dibuja las metas: las pendientes arriba y las cumplidas en «Laureles»,
// con su corona y el día de la victoria.
function mostrarMetas() {
  const contenedor = document.getElementById("lista-metas");
  const contenedorCumplidas = document.getElementById("lista-cumplidas");
  const seccionCumplidas = document.getElementById("seccion-cumplidas");
  contenedor.innerHTML = "";
  contenedorCumplidas.innerHTML = "";

  metas.forEach(function (meta, posicion) {
    // 1. Contar los pasos completados
    let hechos = 0;
    meta.pasos.forEach(function (paso) {
      if (paso.completado) {
        hechos++;
      }
    });

    const porcentaje = Math.round((hechos / meta.pasos.length) * 100);
    const cumplida = metaCumplida(meta);

    // 2. Crear las piezas de la tarjeta
    const tarjeta = document.createElement("article");
    tarjeta.classList.add("meta");

    if (cumplida) {
      tarjeta.classList.add("cumplida");
    }

    // La que acaba de crear Méntor brilla un momento
    if (posicion === metaRecienCreada) {
      tarjeta.classList.add("recien-creada");
    }

    const area = document.createElement("span");
    area.classList.add("meta-area");
    area.textContent = meta.area;

    const titulo = document.createElement("h3");
    titulo.textContent = meta.titulo;

    const barra = document.createElement("div");
    barra.classList.add("barra");
    const relleno = document.createElement("div");
    relleno.classList.add("barra-relleno");
    relleno.style.width = porcentaje + "%";
    barra.appendChild(relleno);

    // «5 pasos cumplidos» y «2 de 5 pasos», en singular si solo hay uno
    let pasosCumplidos = meta.pasos.length + " pasos cumplidos";
    let deLosPasos = " de " + meta.pasos.length + " pasos";
    if (meta.pasos.length === 1) {
      pasosCumplidos = "1 paso cumplido";
      deLosPasos = " de 1 paso";
    }

    const progreso = document.createElement("p");
    progreso.classList.add("meta-progreso");
    if (cumplida) {
      progreso.textContent = "Victoria · " + pasosCumplidos;
    } else {
      progreso.textContent = hechos + deLosPasos;
    }

    const vinculo = document.createElement("p");
    vinculo.classList.add("meta-habito");

    if (meta.habito) {
      const racha = calcularRacha(meta.habito);
      const habitoMeta = habitos.find(function (h) {
        return h.id === meta.habito;
      });
      const enSemanas =
        habitoMeta !== undefined && habitoMeta.frecuencia === "semanal";

      let texto = "Impulsada por: " + nombreHabito(meta.habito);
      if (racha > 0) {
        texto = texto + " · " + textoRacha(racha, enSemanas);
      }
      vinculo.textContent = texto;
    }

    // 3. Crear la lista de pasos, cada uno con su casilla
    const listaPasos = document.createElement("ul");
    listaPasos.classList.add("meta-pasos");

    meta.pasos.forEach(function (paso) {
      const item = document.createElement("li");
      const etiqueta = document.createElement("label");

      const casillaPaso = document.createElement("input");
      casillaPaso.type = "checkbox";
      casillaPaso.checked = paso.completado;

      casillaPaso.addEventListener("change", function () {
        const estabaCumplida = metaCumplida(meta);
        paso.completado = casillaPaso.checked;
        apuntarVictoria(meta, estabaCumplida);
        guardarMetas();
        mostrarMetas();
      });

      etiqueta.append(casillaPaso, paso.texto);

      if (paso.completado) {
        item.classList.add("completado");
      }

      item.appendChild(etiqueta);
      listaPasos.appendChild(item);
    });

    // 4. Montar la tarjeta y colocarla en la página

    // Botón del lápiz, en la esquina: abre la ventana para editar o borrar
    const botonEditar = document.createElement("button");
    botonEditar.type = "button";
    botonEditar.classList.add("boton-editar", "meta-editar");
    botonEditar.title = "Editar meta";
    botonEditar.setAttribute("aria-label", "Editar «" + meta.titulo + "»");
    botonEditar.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#editar"></use></svg>';

    botonEditar.addEventListener("click", function () {
      abrirVentanaMeta(meta);
    });

    tarjeta.appendChild(botonEditar);

    if (cumplida) {
      const laurel = document.createElement("div");
      laurel.classList.add("laurel");
      laurel.innerHTML =
        '<svg viewBox="0 0 100 100"><use href="#laurel"></use></svg>';
      tarjeta.appendChild(laurel);

      // El día de la victoria, bajo la corona: «16 de octubre de 2026»
      if (meta.victoria) {
        const fecha = document.createElement("p");
        fecha.classList.add("meta-victoria");
        fecha.textContent = fechaLarga(meta.victoria);
        tarjeta.appendChild(fecha);
      }
    }

    tarjeta.appendChild(area);
    tarjeta.appendChild(titulo);
    tarjeta.appendChild(barra);
    tarjeta.appendChild(progreso);
    tarjeta.appendChild(vinculo);

    if (cumplida) {
      const detalles = document.createElement("details");
      const resumen = document.createElement("summary");
      resumen.textContent = "Ver los pasos";
      detalles.append(resumen, listaPasos);
      tarjeta.appendChild(detalles);
      contenedorCumplidas.appendChild(tarjeta);
    } else {
      tarjeta.appendChild(listaPasos);
      contenedor.appendChild(tarjeta);
    }
  });

  if (metas.length === 0) {
    contenedor.innerHTML =
      "<p class='sin-metas'>No hay metas registradas. Toda gran obra comienza con la primera piedra.</p>";
  } else if (contenedor.children.length === 0) {
    contenedor.innerHTML =
      "<p class='sin-metas'>Todas tus metas están cumplidas. ¿Cuál será la siguiente?</p>";
  }

  seccionCumplidas.hidden = contenedorCumplidas.children.length === 0;

  // Llevar la vista hasta la meta recién creada (una sola vez)
  const nueva = document.querySelector(".meta.recien-creada");
  if (nueva) {
    nueva.scrollIntoView({ block: "center" });
    metaRecienCreada = null;
  }
}

// ==========================================================================
// 18. METAS · VENTANA DE EDITAR META
// El lápiz de cada tarjeta abre esta ventana para cambiar la meta o
// borrarla. (Las nuevas se crean con Méntor, bloque 10.)
// ==========================================================================

// Piezas de la ventana.
const ventanaMeta = document.getElementById("ventana-meta");
const formMeta = document.getElementById("form-meta");
const selectHabito = document.getElementById("meta-habito");
const campoPasos = document.getElementById("meta-pasos");
const errorMeta = document.getElementById("meta-error");

// La meta que se está editando.
let metaEditada = null;

// Rellena el desplegable de hábitos para vincular la meta.
function rellenarSelectHabitos() {
  selectHabito.innerHTML = "<option value=''>Sin hábito vinculado</option>";

  habitos.forEach(function (habito) {
    const opcion = document.createElement("option");
    opcion.value = habito.id;
    opcion.textContent = habito.nombre;
    selectHabito.appendChild(opcion);
  });
}

// Abre la ventana con los datos de la meta. Los pasos van uno por línea.
function abrirVentanaMeta(meta) {
  metaEditada = meta;
  rellenarSelectHabitos();

  document.getElementById("meta-titulo").value = meta.titulo;
  document.getElementById("meta-area").value = meta.area;
  selectHabito.value = meta.habito;
  campoPasos.value = meta.pasos
    .map(function (paso) {
      return paso.texto;
    })
    .join("\n");

  errorMeta.textContent = "";
  ventanaMeta.showModal();
}

// Al pulsar «Guardar»: cada línea del texto es un paso (hace falta al menos
// uno). Los pasos que se quedan igual conservan si estaban hechos.
formMeta.addEventListener("submit", function (event) {
  event.preventDefault();

  const titulo = document.getElementById("meta-titulo").value.trim();
  const area = document.getElementById("meta-area").value;
  const habito = selectHabito.value;
  const lineas = campoPasos.value.trim().split("\n");

  if (titulo === "") {
    errorMeta.textContent = "Escribe qué quieres conseguir.";
    return;
  }

  const pasos = [];
  lineas.forEach(function (linea) {
    const texto = linea.trim();
    if (texto === "") {
      return;
    }

    // ¿Ya existía este paso? Entonces sigue hecho (o sin hacer) como estaba
    let completado = false;
    const antiguo = metaEditada.pasos.find(function (paso) {
      return paso.texto === texto;
    });
    if (antiguo) {
      completado = antiguo.completado;
    }
    pasos.push({ texto: texto, completado: completado });
  });

  if (pasos.length === 0) {
    errorMeta.textContent = "Añade al menos un paso para la meta.";
    return;
  }

  const estabaCumplida = metaCumplida(metaEditada);
  metaEditada.titulo = titulo;
  metaEditada.area = area;
  metaEditada.habito = habito;
  metaEditada.pasos = pasos;
  apuntarVictoria(metaEditada, estabaCumplida);

  guardarMetas();
  mostrarMetas();
  ventanaMeta.close();
});

// «Eliminar»: borra la meta después de preguntar.
document
  .getElementById("meta-eliminar")
  .addEventListener("click", async function () {
    const borrar = await preguntar(
      "¿Eliminar la meta «" + metaEditada.titulo + "»?",
      "Eliminar",
      "Cancelar",
    );
    if (borrar) {
      metas.splice(metas.indexOf(metaEditada), 1);
      guardarMetas();
      mostrarMetas();
      ventanaMeta.close();
    }
  });

// «Cancelar» y tocar fuera: cierran sin guardar.
document.getElementById("meta-cancelar").addEventListener("click", function () {
  ventanaMeta.close();
});

cerrarAlTocarFuera(ventanaMeta);

// ==========================================================================
// 19. PERFIL
// En Archivo: nombre, edad, altura y peso, con el historial del peso. Se
// cambia en la ventana de perfil. Todo es opcional. Lo que necesiten los
// consejeros más adelante, lo preguntarán ellos.
// ==========================================================================

// Piezas de la ventana de perfil.
const ventanaPerfil = document.getElementById("ventana-perfil");
const formPerfil = document.getElementById("form-perfil");
const campoPerfilNombre = document.getElementById("perfil-nombre");
const campoNacimiento = document.getElementById("perfil-nacimiento");
const campoAltura = document.getElementById("perfil-altura");
const campoPeso = document.getElementById("perfil-peso");
const errorPerfil = document.getElementById("perfil-error");

// El nacimiento no puede ser futuro.
campoNacimiento.max = hoy;

// Años cumplidos a partir de la fecha de nacimiento ("2004-10-03").
// Se restan los años y, si este año aún no ha llegado el cumpleaños, uno
// menos.
function edadDe(nacimiento) {
  const hoyFecha = new Date();
  const fecha = new Date(nacimiento + "T00:00");
  let edad = hoyFecha.getFullYear() - fecha.getFullYear();
  const cumpleEsteAno = new Date(
    hoyFecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
  );
  if (hoyFecha < cumpleEsteAno) {
    edad--;
  }
  return edad;
}

// Los pesos apuntados (del más antiguo al más nuevo), o una lista vacía.
function pesosDe() {
  return perfil.pesos || [];
}

// Un número de kilos para leer: 72.5 → «72,5 kg».
function textoKilos(kilos) {
  return kilos.toLocaleString("es-ES") + " kg";
}

// Dibuja el perfil en Archivo y el historial del peso (los 6 últimos, del
// más nuevo al más antiguo, con lo que ha cambiado desde el anterior).
function mostrarPerfil() {
  const datos = document.getElementById("perfil-datos");
  datos.innerHTML = "";

  const lineas = [];
  if (perfil.nombre) {
    lineas.push(["Nombre", perfil.nombre]);
  }
  if (perfil.nacimiento) {
    lineas.push(["Edad", edadDe(perfil.nacimiento) + " años"]);
  }
  if (perfil.altura) {
    lineas.push(["Altura", perfil.altura + " cm"]);
  }
  const pesos = pesosDe();
  if (pesos.length > 0) {
    lineas.push(["Peso", textoKilos(pesos[pesos.length - 1].kilos)]);
  }

  if (lineas.length === 0) {
    datos.append(
      crearParrafo(
        "Aún no has rellenado tu perfil. Todo es opcional.",
        "pie-texto",
      ),
    );
  }

  // Cada dato en una fila: el nombre a la izquierda y el valor a la derecha
  lineas.forEach(function (linea) {
    const fila = document.createElement("p");
    fila.classList.add("perfil-fila");
    const nombre = document.createElement("span");
    nombre.textContent = linea[0];
    const valor = document.createElement("strong");
    valor.textContent = linea[1];
    fila.append(nombre, valor);
    datos.append(fila);
  });

  // Historial del peso
  const historial = document.getElementById("historial-peso");
  historial.innerHTML = "";
  historial.hidden = pesos.length < 2;

  if (pesos.length >= 2) {
    historial.append(crearParrafo("Historial del peso", "perfil-subtitulo"));
    const lista = document.createElement("ul");

    // Desde el último hacia atrás, como mucho 6
    for (let i = pesos.length - 1; i >= 0 && i >= pesos.length - 6; i--) {
      const item = document.createElement("li");
      let texto =
        new Date(pesos[i].fecha + "T00:00").toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }) +
        " · " +
        textoKilos(pesos[i].kilos);

      // La diferencia con el anterior: «(−0,4)» o «(+1,2)». toFixed(1) deja
      // un decimal y evita cosas como 0,40000000001
      if (i > 0) {
        const diferencia = pesos[i].kilos - pesos[i - 1].kilos;
        let signo = "+";
        if (diferencia < 0) {
          signo = "−";
        }
        texto =
          texto +
          " (" +
          signo +
          Math.abs(diferencia).toFixed(1).replace(".", ",") +
          ")";
      }

      item.textContent = texto;

      // × para borrar un peso mal apuntado
      const posicion = i;
      const borrar = crearBoton("×", "perfil-borrar", async function () {
        const si = await preguntar(
          "¿Borrar el peso del " + fechaLarga(pesos[posicion].fecha) + "?",
          "Borrar",
          "Cancelar",
        );
        if (si) {
          pesos.splice(posicion, 1);
          guardarPerfil();
          mostrarPerfil();
        }
      });
      borrar.setAttribute("aria-label", "Borrar este peso");
      item.append(borrar);
      lista.append(item);
    }
    historial.append(lista);
  }
}

// Abre la ventana de perfil con los datos puestos. El peso es el de hoy (si
// ya se apuntó hoy, sale para corregirlo).
function abrirVentanaPerfil() {
  campoPerfilNombre.value = perfil.nombre || "";
  campoNacimiento.value = perfil.nacimiento || "";
  campoAltura.value = perfil.altura || "";

  const pesos = pesosDe();
  const ultimo = pesos[pesos.length - 1];
  if (ultimo && ultimo.fecha === hoy) {
    campoPeso.value = ultimo.kilos.toLocaleString("es-ES");
  } else {
    campoPeso.value = "";
  }

  errorPerfil.textContent = "";
  ventanaPerfil.showModal();
}

// Al pulsar «Guardar»: comprueba los datos y los guarda. Lo que se deja
// vacío se borra del perfil (delete). El peso de hoy se añade al historial
// (o corrige el de hoy, si ya había uno).
formPerfil.addEventListener("submit", function (evento) {
  evento.preventDefault();

  const nombre = campoPerfilNombre.value.trim();
  const nacimiento = campoNacimiento.value;
  const altura = campoAltura.value.trim();
  const peso = campoPeso.value.trim();

  if (nacimiento > hoy) {
    errorPerfil.textContent = "La fecha de nacimiento aún no ha llegado.";
    return;
  }

  const alturaNumero = leerNumero(altura, false);
  if (altura !== "" && !(alturaNumero >= 50 && alturaNumero <= 250)) {
    errorPerfil.textContent = "Escribe la altura en centímetros, p. ej. 175.";
    return;
  }

  const pesoNumero = leerNumero(peso, true);
  if (peso !== "" && !(pesoNumero >= 20 && pesoNumero <= 400)) {
    errorPerfil.textContent = "Escribe el peso en kilos, p. ej. 72,5.";
    return;
  }

  if (nombre) {
    perfil.nombre = nombre;
  } else {
    delete perfil.nombre;
  }

  if (nacimiento) {
    perfil.nacimiento = nacimiento;
  } else {
    delete perfil.nacimiento;
  }

  if (altura) {
    perfil.altura = alturaNumero;
  } else {
    delete perfil.altura;
  }

  if (peso) {
    const pesos = pesosDe();
    const ultimo = pesos[pesos.length - 1];
    if (ultimo && ultimo.fecha === hoy) {
      ultimo.kilos = pesoNumero;
    } else {
      pesos.push({ fecha: hoy, kilos: pesoNumero });
    }
    perfil.pesos = pesos;
  }

  guardarPerfil();
  actualizarTodo();
  ventanaPerfil.close();
});

// Botones de la ventana y de Archivo.
document
  .getElementById("perfil-cancelar")
  .addEventListener("click", function () {
    ventanaPerfil.close();
  });

document
  .getElementById("boton-editar-perfil")
  .addEventListener("click", abrirVentanaPerfil);

cerrarAlTocarFuera(ventanaPerfil);

// ==========================================================================
// 20. COPIA DE SEGURIDAD
// Descargar todos los datos en un archivo y restaurarlos después. Ergon
// recuerda el día de la última copia y avisa si hace una semana o más.
// ==========================================================================

// Datos que entran en la copia.
const claves = [
  "ergon-registro",
  "ergon-habitos",
  "ergon-metas",
  "ergon-perfil",
  "ergon-rituales",
  "ergon-revisiones",
  "ergon-conversaciones",
  "ergon-sueno",
  "ergon-entrenos",
];

// El día de la última copia se guarda aparte, en «ergon-ultima-copia»: no
// va dentro de la copia porque es de este dispositivo. Los recordatorios
// tampoco van, ni los de los consejeros: son ajustes, no datos (y ya los
// guarda la nube).

// Junta los datos en un archivo .json y lo descarga.
function descargarCopia() {
  const copia = { app: "Ergon", fecha: hoy, datos: {} };

  claves.forEach(function (clave) {
    copia.datos[clave] = JSON.parse(localStorage.getItem(clave));
  });

  const archivo = new Blob([JSON.stringify(copia, null, 2)], {
    type: "application/json",
  });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = "ergon-copia-" + hoy + ".json";
  enlace.click();

  // El enlace se borra al cabo de un segundo: si se borra en el acto,
  // Safari a veces no llega a descargar el archivo
  setTimeout(function () {
    URL.revokeObjectURL(enlace.href);
  }, 1000);

  localStorage.setItem("ergon-ultima-copia", hoy);
  mostrarAvisoCopia();
}

// Días que han pasado desde la última copia (null si nunca se ha hecho).
function diasDesdeLaCopia() {
  const ultima = localStorage.getItem("ergon-ultima-copia");
  if (!ultima) {
    return null;
  }
  return Math.round(
    (new Date(hoy + "T00:00") - new Date(ultima + "T00:00")) / 86400000,
  );
}

// Pone «Última copia: hace N días» en Archivo y, en Hoy, el aviso si hace 7
// días o más (o si nunca se ha hecho y ya hay algo que perder).
function mostrarAvisoCopia() {
  const dias = diasDesdeLaCopia();
  const ultimaCopia = document.getElementById("ultima-copia");

  if (dias === null) {
    ultimaCopia.textContent = "Aún no has descargado ninguna copia aquí.";
  } else if (dias === 0) {
    ultimaCopia.textContent = "Última copia: hoy.";
  } else if (dias === 1) {
    ultimaCopia.textContent = "Última copia: ayer.";
  } else {
    ultimaCopia.textContent = "Última copia: hace " + dias + " días.";
  }

  const aviso = document.getElementById("aviso-copia");
  const textoAviso = document.getElementById("aviso-copia-texto");
  const hayDatos = habitos.length > 0 || metas.length > 0;

  aviso.hidden = !hayDatos || (dias !== null && dias < 7);

  if (dias === null) {
    textoAviso.textContent =
      "Aún no has guardado ninguna copia de tus datos. Si borras la app, se pierden.";
  } else {
    textoAviso.textContent =
      "Hace " + dias + " días que no guardas una copia de tus datos.";
  }
}

// Los botones «Descargar copia» (Archivo) y «Hacer copia ahora» (Hoy).
document
  .getElementById("boton-exportar")
  .addEventListener("click", descargarCopia);
document
  .getElementById("aviso-copia-boton")
  .addEventListener("click", descargarCopia);

// «Restaurar copia»: lee el archivo, pide confirmación, sustituye los
// datos y recarga la app.
document
  .getElementById("archivo-importar")
  .addEventListener("change", async function (evento) {
    const archivo = evento.target.files[0];
    evento.target.value = "";
    if (!archivo) {
      return;
    }

    try {
      const copia = JSON.parse(await archivo.text());

      if (copia.app !== "Ergon") {
        throw new Error("El archivo no es una copia de Ergon");
      }

      const seguir = await preguntar(
        "Esto sustituirá tus datos actuales por los de la copia del " +
          fechaLarga(copia.fecha) +
          ". ¿Continuar?",
        "Restaurar",
        "Cancelar",
      );
      if (!seguir) {
        return;
      }

      claves.forEach(function (clave) {
        const valor = copia.datos[clave];
        if (valor === null || valor === undefined) {
          localStorage.removeItem(clave);
        } else {
          localStorage.setItem(clave, JSON.stringify(valor));
        }
      });

      // Los datos ahora son los de esa copia: su día pasa a ser la última copia
      localStorage.setItem("ergon-ultima-copia", copia.fecha);

      // Con la cuenta unida, la copia sustituirá también lo de la nube
      // (bloque 22, sustituirNube)
      if (localStorage.getItem("ergon-usuario-nube")) {
        localStorage.setItem("ergon-sustituir-nube", "sí");
      }

      location.reload();
    } catch (error) {
      avisar("El archivo no es una copia válida de Ergon.");
    }
  });

// ==========================================================================
// 21. NUBE · CUENTA
// Entrar en la cuenta de Supabase con email y contraseña. Supabase es el
// servidor: guarda los datos en una base de datos (tabla «datos») y solo
// deja ver a cada usuario sus propias filas. Aquí se habla con él con
// fetch, sin librerías.
// ==========================================================================

// La dirección del proyecto y su clave publicable. No son secretos: la
// clave solo identifica el proyecto; lo que protege los datos es la
// contraseña y la seguridad por filas de la tabla.
const nube = {
  url: "https://drommbeoqtffrhrtlywo.supabase.co",
  clave: "sb_publishable_aR0M4Xp1c_UQzO1jJ274PQ_TdUQUjMa",
};

// La sesión de este dispositivo (null si no se ha entrado):
// { acceso, renovar, caduca, usuario, email }. «acceso» es el pase que se
// enseña al servidor en cada petición; dura una hora y se renueva solo con
// «renovar». Es de este dispositivo: no va en la copia de seguridad.
let sesion = JSON.parse(localStorage.getItem("ergon-sesion")) || null;

// ¿Está la nube configurada (con dirección y clave)?
function hayNube() {
  return nube.url !== "" && nube.clave !== "";
}

// Guarda (o borra, si es null) la sesión.
function guardarSesion(nueva) {
  sesion = nueva;
  if (nueva) {
    localStorage.setItem("ergon-sesion", JSON.stringify(nueva));
  } else {
    localStorage.removeItem("ergon-sesion");
  }
}

// Convierte la respuesta de Supabase al entrar o renovar en nuestra sesión.
// expires_in: los segundos que dura el pase.
function sesionDe(respuesta) {
  return {
    acceso: respuesta.access_token,
    renovar: respuesta.refresh_token,
    caduca: Date.now() + respuesta.expires_in * 1000,
    usuario: respuesta.user.id,
    email: respuesta.user.email,
  };
}

// Pide un pase nuevo a Supabase. tipo: "password" (entrar con email y
// contraseña) o "refresh_token" (renovar). Devuelve la respuesta ya leída.
async function pedirPase(tipo, datos) {
  const respuesta = await fetch(
    nube.url + "/auth/v1/token?grant_type=" + tipo,
    {
      method: "POST",
      headers: { apikey: nube.clave, "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    },
  );
  const cuerpo = await respuesta.json();
  if (!respuesta.ok) {
    // Error con su código (400: email o contraseña mal; caducado…)
    const error = new Error(cuerpo.error_description || cuerpo.msg || "");
    error.estado = respuesta.status;
    throw error;
  }
  return cuerpo;
}

// La renovación que está en marcha (null si no hay ninguna).
let renovacion = null;

// Si el pase está a punto de caducar (queda menos de un minuto), lo renueva.
// Si dos peticiones lo ven caducado a la vez (p. ej., sincronizar y probar
// un aviso), se renueva una sola vez y las dos esperan a esa renovación: el
// pase para renovar solo vale una vez.
async function renovarSiHaceFalta() {
  if (Date.now() < sesion.caduca - 60000) {
    return;
  }
  if (!renovacion) {
    // finally: al terminar (bien o mal), ya no hay renovación en marcha
    renovacion = renovarPase().finally(function () {
      renovacion = null;
    });
  }
  await renovacion;
}

// Pide un pase nuevo con el de renovar. Si ya no se puede renovar, la
// sesión se cierra.
async function renovarPase() {
  try {
    guardarSesion(
      sesionDe(
        await pedirPase("refresh_token", { refresh_token: sesion.renovar }),
      ),
    );
  } catch (error) {
    // Sin conexión: se deja como está y se vuelve a intentar más tarde
    if (error.estado === undefined) {
      throw error;
    }
    // El servidor dice que no: hay que volver a entrar (lo pendiente se
    // guarda y se subirá al volver)
    cerrarSesionAqui(false);
    throw new Error("sesion");
  }
}

// Una petición a la base de datos (ruta: "/rest/v1/datos?…"), con la clave
// del proyecto (apikey) y el pase de la sesión (Authorization). Devuelve lo
// que conteste el servidor (o null si no contesta nada). Si el servidor
// dice que el pase ya no vale (401), lo renueva y lo intenta otra vez.
async function peticion(metodo, ruta, cuerpo, cabecerasExtra, esReintento) {
  await renovarSiHaceFalta();

  const cabeceras = {
    apikey: nube.clave,
    Authorization: "Bearer " + sesion.acceso,
    "Content-Type": "application/json",
  };
  Object.assign(cabeceras, cabecerasExtra || {});

  const opciones = { method: metodo, headers: cabeceras };
  if (cuerpo !== undefined) {
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(nube.url + ruta, opciones);
  if (respuesta.status === 401 && !esReintento) {
    // Se marca el pase como caducado: renovarSiHaceFalta pedirá uno nuevo
    sesion.caduca = 0;
    return peticion(metodo, ruta, cuerpo, cabecerasExtra, true);
  }
  if (respuesta.status === 401) {
    cerrarSesionAqui(false);
    throw new Error("sesion");
  }
  if (!respuesta.ok) {
    throw new Error(
      "servidor " + respuesta.status + ": " + (await respuesta.text()),
    );
  }

  const texto = await respuesta.text();
  if (texto === "") {
    return null;
  }
  return JSON.parse(texto);
}

// Cierra la sesión en este dispositivo (los datos se quedan aquí).
// olvidar: true al pulsar «Salir»: se olvida también lo pendiente de subir
// y la cuenta con la que se sincronizaba (al volver a entrar se empieza
// como la primera vez). false si la sesión ha caducado: lo pendiente se
// sigue apuntando y se sube al volver a entrar.
function cerrarSesionAqui(olvidar) {
  guardarSesion(null);
  if (olvidar) {
    pendientes = {};
    guardarPendientes();
    localStorage.removeItem("ergon-ultima-bajada");
    localStorage.removeItem("ergon-usuario-nube");
  }
  mostrarCuenta();
  mostrarCharlas();
}

// Piezas de la sección Cuenta (en Archivo).
const formEntrar = document.getElementById("form-entrar");
const errorEntrar = document.getElementById("entrar-error");

// Al pulsar «Entrar»: pide el pase con el email y la contraseña y, si va
// bien, hace la primera sincronización.
formEntrar.addEventListener("submit", async function (evento) {
  evento.preventDefault();
  const email = document.getElementById("entrar-email").value.trim();
  const contrasena = document.getElementById("entrar-contrasena").value;

  if (email === "" || contrasena === "") {
    errorEntrar.textContent = "Escribe tu email y tu contraseña.";
    return;
  }

  errorEntrar.textContent = "Entrando…";
  try {
    guardarSesion(
      sesionDe(
        await pedirPase("password", { email: email, password: contrasena }),
      ),
    );
  } catch (error) {
    if (error.estado === 400) {
      errorEntrar.textContent = "El email o la contraseña no son correctos.";
    } else if (error.estado === undefined) {
      errorEntrar.textContent =
        "Sin conexión. Prueba otra vez cuando tengas internet.";
    } else {
      errorEntrar.textContent =
        "No se ha podido entrar (" + error.message + ").";
    }
    return;
  }

  errorEntrar.textContent = "";
  formEntrar.reset();
  mostrarCuenta();
  mostrarCharlas();
  // Después de sincronizar, lo de los recordatorios y los consejeros
  // (bloques 23 y 24)
  sincronizar().then(revisarAvisos).then(revisarConsejeros);
});

// «Salir»: pregunta, quita los avisos de este dispositivo (si los tenía),
// avisa al servidor (si hay conexión) y cierra la sesión.
document
  .getElementById("boton-salir")
  .addEventListener("click", async function () {
    let texto =
      "¿Salir de tu cuenta en este dispositivo? Tus datos se quedan aquí.";
    if (Object.keys(pendientes).length > 0) {
      texto =
        "Hay cambios que aún no se han subido a la nube y se quedarán solo aquí. ¿Salir de todos modos?";
    }
    if (!(await preguntar(texto, "Salir", "Cancelar"))) {
      return;
    }
    try {
      await quitarAvisosAqui();
      await peticion("POST", "/auth/v1/logout");
    } catch (error) {
      // Sin conexión: da igual, la sesión se cierra aquí igualmente
    }
    cerrarSesionAqui(true);
  });

// «Sincronizar ahora».
document
  .getElementById("boton-sincronizar")
  .addEventListener("click", function () {
    sincronizar();
  });

// Dibuja la sección Cuenta: el formulario para entrar o, si ya se ha
// entrado, el email y cómo va la sincronización. También el puntito de la
// barra de arriba (verde: todo subido; bronce: hay cambios esperando;
// terracota: algo ha fallado) y las secciones Recordatorios y Consejeros,
// que solo se ven con la cuenta abierta.
function mostrarCuenta() {
  mostrarRecordatorios();
  mostrarConsejeros();
  const seccion = document.getElementById("seccion-cuenta");
  const punto = document.getElementById("estado-nube");
  seccion.hidden = !hayNube();
  punto.hidden = !hayNube() || !sesion;
  if (!hayNube()) {
    return;
  }

  formEntrar.hidden = sesion !== null;
  document.getElementById("cuenta-dentro").hidden = sesion === null;
  document.getElementById("boton-datos-apartados").hidden =
    localStorage.getItem("ergon-antes-de-la-nube") === null;

  // El estado: sincronizando, error, cambios esperando o todo guardado
  const estado = document.getElementById("cuenta-estado");
  if (!sesion) {
    estado.textContent = "";
    return;
  }

  document.getElementById("cuenta-email").textContent = sesion.email;
  const esperando = Object.keys(pendientes).length;
  punto.className = "estado-nube";

  if (sincronizando) {
    estado.textContent = "Sincronizando…";
  } else if (ultimoError) {
    estado.textContent = ultimoError;
    punto.classList.add("con-error");
  } else if (esperando > 0) {
    let cambios = " cambios esperan";
    if (esperando === 1) {
      cambios = " cambio espera";
    }
    estado.textContent = esperando + cambios + " para subir a la nube.";
    punto.classList.add("esperando");
  } else {
    let texto = "Todo guardado en la nube.";
    const ultima = localStorage.getItem("ergon-ultima-sincronizacion");
    if (ultima) {
      texto =
        texto +
        " Última vez: " +
        new Date(ultima).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }) +
        ".";
    }
    estado.textContent = texto;
  }
  punto.title = estado.textContent;
}

// ==========================================================================
// 22. NUBE · SINCRONIZAR
// Cómo se mantienen iguales los datos del móvil y del ordenador.
// - En la nube, cada dato es una fila con su «clave»: "ergon-habitos",
//   "ergon-metas", "ergon-perfil", "ergon-recordatorios", "ergon-consejeros",
//   "ritual:2026-10-16",
//   "revision:2026-10-12", "conversacion:c1760700000000" (una por
//   conversación con Méntor), "sueno:2026-10-16" (una por noche),
//   "entreno:e1760700000000" (una por entreno) y, del registro, una fila
//   por hábito y día: "registro:2026-10-16:h123".
//   Así, marcar hábitos distintos en dos dispositivos no se pisa.
// - Cada cambio de aquí se apunta en «pendientes» con su hora. Se sube en
//   cuanto se puede; sin conexión, espera (también si se cierra la app).
// - Al sincronizar, primero se baja lo nuevo de la nube (lo que el servidor
//   recibió después de la última bajada) y luego se sube lo pendiente. Si
//   un mismo dato ha cambiado en los dos sitios, gana el cambio más nuevo.
// ==========================================================================

// Lo pendiente de subir: { clave: hora del cambio (texto ISO) }
let pendientes = JSON.parse(localStorage.getItem("ergon-pendientes")) || {};

// ¿Se está sincronizando ahora? ¿Hay que repetir al terminar?
let sincronizando = false;
let repetirSincronizacion = false;

// El último fallo, para mostrarlo en Cuenta ("" si todo fue bien).
let ultimoError = "";

// Temporizador para subir los cambios un momento después de hacerlos.
let temporizadorSubida = null;

// Guarda la lista de pendientes.
function guardarPendientes() {
  localStorage.setItem("ergon-pendientes", JSON.stringify(pendientes));
}

// Apunta que un dato ha cambiado aquí (lo llaman las funciones de guardar
// del bloque 1). Solo si este dispositivo está unido a una cuenta.
function apuntarCambio(clave) {
  if (localStorage.getItem("ergon-usuario-nube") === null) {
    return;
  }
  pendientes[clave] = new Date().toISOString();
  guardarPendientes();
  programarSubida();
}

// Sincroniza dos segundos después del último cambio (si se marcan varios
// hábitos seguidos, se suben todos de una vez).
function programarSubida() {
  clearTimeout(temporizadorSubida);
  temporizadorSubida = setTimeout(sincronizar, 2000);
  mostrarCuenta();
}

// Una hora en texto convertida en milisegundos, para poder compararlas
// (el servidor y el navegador las escriben de forma distinta).
function momento(texto) {
  return new Date(texto).getTime();
}

// El valor que tiene aquí un dato, por su clave (null si no existe).
function valorLocal(clave) {
  const partes = clave.split(":");

  if (partes[0] === "registro") {
    const dia = registro[partes[1]] || {};
    if (dia[partes[2]] === undefined) {
      return null;
    }
    return dia[partes[2]];
  }
  if (partes[0] === "ritual") {
    return rituales[partes[1]] || null;
  }
  if (partes[0] === "revision") {
    return revisiones[partes[1]] || null;
  }
  if (partes[0] === "conversacion") {
    return conversaciones[partes[1]] || null;
  }
  if (partes[0] === "sueno") {
    return sueno[partes[1]] || null;
  }
  if (partes[0] === "entreno") {
    return entrenos[partes[1]] || null;
  }
  if (clave === "ergon-habitos") {
    return habitos;
  }
  if (clave === "ergon-metas") {
    return metas;
  }
  if (clave === "ergon-perfil") {
    return perfil;
  }
  if (clave === "ergon-recordatorios") {
    return recordatorios;
  }
  if (clave === "ergon-consejeros") {
    return ajustesConsejeros;
  }
  return null;
}

// Cambia el contenido de una lista sin cambiar la lista (habitos y metas
// son const: se vacían y se rellenan).
function reemplazarLista(lista, nueva) {
  lista.length = 0;
  nueva.forEach(function (elemento) {
    lista.push(elemento);
  });
}

// Lo mismo para un objeto: borra sus propiedades y le pone las nuevas.
function reemplazarObjeto(objeto, nuevo) {
  Object.keys(objeto).forEach(function (clave) {
    delete objeto[clave];
  });
  Object.assign(objeto, nuevo);
}

// Pone aquí un dato que llega de la nube. Del registro, el de hoy va a
// habitosHoy (el objeto que usan las fichas de Hoy).
function aplicarFila(fila) {
  const partes = fila.clave.split(":");

  if (partes[0] === "registro") {
    let dia;
    if (partes[1] === hoy) {
      registro[hoy] = habitosHoy;
      dia = habitosHoy;
    } else {
      if (!registro[partes[1]]) {
        registro[partes[1]] = {};
      }
      dia = registro[partes[1]];
    }
    if (fila.valor === null) {
      delete dia[partes[2]];
    } else {
      dia[partes[2]] = fila.valor;
    }
  } else if (partes[0] === "ritual") {
    if (fila.valor === null) {
      delete rituales[partes[1]];
    } else {
      rituales[partes[1]] = fila.valor;
    }
  } else if (partes[0] === "revision") {
    if (fila.valor === null) {
      delete revisiones[partes[1]];
    } else {
      revisiones[partes[1]] = fila.valor;
    }
  } else if (partes[0] === "conversacion") {
    if (fila.valor === null) {
      delete conversaciones[partes[1]];
    } else {
      conversaciones[partes[1]] = fila.valor;
    }
  } else if (partes[0] === "sueno") {
    if (fila.valor === null) {
      delete sueno[partes[1]];
    } else {
      sueno[partes[1]] = fila.valor;
    }
  } else if (partes[0] === "entreno") {
    if (fila.valor === null) {
      delete entrenos[partes[1]];
    } else {
      entrenos[partes[1]] = fila.valor;
    }
  } else if (fila.clave === "ergon-habitos") {
    reemplazarLista(habitos, fila.valor || []);
  } else if (fila.clave === "ergon-metas") {
    reemplazarLista(metas, fila.valor || []);
  } else if (fila.clave === "ergon-perfil") {
    reemplazarObjeto(perfil, fila.valor || {});
  } else if (fila.clave === "ergon-recordatorios") {
    reemplazarObjeto(recordatorios, fila.valor || {});
  } else if (fila.clave === "ergon-consejeros") {
    reemplazarObjeto(ajustesConsejeros, fila.valor || {});
  }
}

// Guarda en este dispositivo todo lo que ha llegado de la nube (sin
// apuntarlo como cambio: ya está en la nube).
function guardarLoBajado() {
  localStorage.setItem("ergon-habitos", JSON.stringify(habitos));
  localStorage.setItem("ergon-registro", JSON.stringify(registro));
  localStorage.setItem("ergon-metas", JSON.stringify(metas));
  localStorage.setItem("ergon-perfil", JSON.stringify(perfil));
  localStorage.setItem("ergon-rituales", JSON.stringify(rituales));
  localStorage.setItem("ergon-revisiones", JSON.stringify(revisiones));
  localStorage.setItem("ergon-recordatorios", JSON.stringify(recordatorios));
  localStorage.setItem("ergon-conversaciones", JSON.stringify(conversaciones));
  localStorage.setItem("ergon-consejeros", JSON.stringify(ajustesConsejeros));
  localStorage.setItem("ergon-sueno", JSON.stringify(sueno));
  localStorage.setItem("ergon-entrenos", JSON.stringify(entrenos));
}

// Un valor convertido en texto con las propiedades en orden alfabético. La
// base de datos guarda las propiedades en otro orden, así que para saber si
// dos valores son iguales se comparan así.
function textoOrdenado(valor) {
  if (Array.isArray(valor)) {
    return "[" + valor.map(textoOrdenado).join(",") + "]";
  }
  if (valor !== null && typeof valor === "object") {
    const claves = Object.keys(valor).sort();
    return (
      "{" +
      claves
        .map(function (clave) {
          return JSON.stringify(clave) + ":" + textoOrdenado(valor[clave]);
        })
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(valor);
}

// Lee de la nube las filas que el servidor recibió después de «desde», de
// 1000 en 1000 (es lo máximo que da de una vez), en orden de llegada.
async function leerFilas(desde) {
  const filas = [];
  let saltar = 0;
  while (true) {
    const pagina = await peticion(
      "GET",
      "/rest/v1/datos?select=clave,valor,actualizado,subido&subido=gt." +
        encodeURIComponent(desde) +
        "&order=subido.asc&limit=1000&offset=" +
        saltar,
    );
    pagina.forEach(function (fila) {
      filas.push(fila);
    });
    if (pagina.length < 1000) {
      return filas;
    }
    saltar += 1000;
  }
}

// Baja lo nuevo de la nube y lo pone aquí, salvo lo que haya cambiado aquí
// después (eso se queda y se subirá). Devuelve true si algo ha cambiado.
async function bajarCambios() {
  const desde = localStorage.getItem("ergon-ultima-bajada");
  // Un minuto de margen hacia atrás, por si algo llegó al servidor justo
  // mientras se bajaba la vez anterior (lo repetido no cambia nada)
  const conMargen = new Date(momento(desde) - 60000).toISOString();
  const filas = await leerFilas(conMargen);

  let hayCambios = false;
  let ultima = desde;

  filas.forEach(function (fila) {
    if (momento(fila.subido) > momento(ultima)) {
      ultima = fila.subido;
    }

    // Si aquí hay un cambio más nuevo, gana el de aquí
    const cambioAqui = pendientes[fila.clave];
    if (cambioAqui && momento(cambioAqui) >= momento(fila.actualizado)) {
      return;
    }
    delete pendientes[fila.clave];

    // Si ya es igual, no hace falta tocar nada
    if (textoOrdenado(valorLocal(fila.clave)) === textoOrdenado(fila.valor)) {
      return;
    }
    aplicarFila(fila);
    hayCambios = true;
  });

  if (hayCambios) {
    guardarLoBajado();
  }
  guardarPendientes();
  localStorage.setItem("ergon-ultima-bajada", ultima);
  return hayCambios;
}

// Sube lo pendiente (de 500 en 500). «Prefer: resolution=merge-duplicates»
// le dice al servidor que, si la fila ya existe, la sustituya (upsert).
async function subirCambios() {
  const claves = Object.keys(pendientes);
  for (let i = 0; i < claves.length; i += 500) {
    const trozo = claves.slice(i, i + 500);
    const filas = trozo.map(function (clave) {
      return {
        usuario: sesion.usuario,
        clave: clave,
        valor: valorLocal(clave),
        actualizado: pendientes[clave],
      };
    });

    await peticion("POST", "/rest/v1/datos", filas, {
      Prefer: "resolution=merge-duplicates,return=minimal",
    });

    // Fuera de pendientes, salvo lo que haya vuelto a cambiar mientras subía
    filas.forEach(function (fila) {
      if (pendientes[fila.clave] === fila.actualizado) {
        delete pendientes[fila.clave];
      }
    });
    guardarPendientes();
  }
}

// Apunta como pendiente todo lo que hay en este dispositivo (para subirlo
// entero a la nube).
function apuntarTodo() {
  const ahora = new Date().toISOString();
  pendientes["ergon-habitos"] = ahora;
  pendientes["ergon-metas"] = ahora;
  pendientes["ergon-perfil"] = ahora;
  pendientes["ergon-recordatorios"] = ahora;
  pendientes["ergon-consejeros"] = ahora;
  Object.keys(registro).forEach(function (fecha) {
    Object.keys(registro[fecha]).forEach(function (id) {
      pendientes["registro:" + fecha + ":" + id] = ahora;
    });
  });
  Object.keys(rituales).forEach(function (dia) {
    pendientes["ritual:" + dia] = ahora;
  });
  Object.keys(revisiones).forEach(function (lunes) {
    pendientes["revision:" + lunes] = ahora;
  });
  Object.keys(conversaciones).forEach(function (id) {
    pendientes["conversacion:" + id] = ahora;
  });
  Object.keys(sueno).forEach(function (dia) {
    pendientes["sueno:" + dia] = ahora;
  });
  Object.keys(entrenos).forEach(function (id) {
    pendientes["entreno:" + id] = ahora;
  });
  guardarPendientes();
}

// Guarda aparte los datos de este dispositivo (antes de sustituirlos por
// los de la nube), por si acaso. Se pueden descargar desde Cuenta.
function apartarDatosLocales() {
  const copia = { app: "Ergon", fecha: hoy, datos: {} };
  claves.forEach(function (clave) {
    copia.datos[clave] = JSON.parse(localStorage.getItem(clave));
  });
  localStorage.setItem("ergon-antes-de-la-nube", JSON.stringify(copia));
}

// La primera vez que este dispositivo se une a la cuenta:
// - si la nube está vacía, se sube todo lo de aquí;
// - si la nube ya tiene datos (de otro dispositivo) y aquí no hay, se traen;
// - si hay en los dos sitios, se pregunta con cuáles quedarse. Si son los
//   de la cuenta, los de aquí se guardan aparte, por si acaso.
async function primeraSincronizacion() {
  const filas = await leerFilas("1970-01-01T00:00:00Z");

  if (filas.length === 0) {
    localStorage.setItem("ergon-usuario-nube", sesion.usuario);
    apuntarTodo();
    await subirCambios();
    // La próxima bajada empieza desde el principio: así no depende de la
    // hora de este dispositivo (lo repetido no cambia nada)
    localStorage.setItem("ergon-ultima-bajada", "1970-01-01T00:00:00Z");
    return false;
  }

  if (habitos.length > 0 || metas.length > 0) {
    const traer = await preguntar(
      "Tu cuenta ya tiene datos de otro dispositivo, y este tiene los suyos. ¿Con cuáles te quedas? Si eliges los de la cuenta, los de aquí se guardan aparte, por si acaso.",
      "Los de la cuenta",
      "Los de este dispositivo",
    );

    if (!traer) {
      // Segunda pregunta, porque esto borra lo que hay en la cuenta (y así
      // Escape o tocar fuera nunca lo hace sin querer)
      const subir = await preguntar(
        "¿Seguro? Lo que hay en la cuenta se sustituirá por lo de este dispositivo.",
        "Sí, usar los de este dispositivo",
        "Cancelar",
      );
      if (!subir) {
        cerrarSesionAqui(true);
        return false;
      }
      localStorage.setItem("ergon-usuario-nube", sesion.usuario);
      await sustituirNube();
      localStorage.setItem("ergon-ultima-bajada", "1970-01-01T00:00:00Z");
      return false;
    }

    apartarDatosLocales();
  }

  // Vaciar lo de aquí y poner lo de la nube
  reemplazarLista(habitos, []);
  reemplazarLista(metas, []);
  reemplazarObjeto(registro, {});
  reemplazarObjeto(habitosHoy, {});
  reemplazarObjeto(perfil, {});
  reemplazarObjeto(rituales, {});
  reemplazarObjeto(revisiones, {});
  reemplazarObjeto(recordatorios, {});
  reemplazarObjeto(conversaciones, {});
  reemplazarObjeto(ajustesConsejeros, {});
  reemplazarObjeto(sueno, {});
  reemplazarObjeto(entrenos, {});

  let ultima = filas[0].subido;
  filas.forEach(function (fila) {
    aplicarFila(fila);
    if (momento(fila.subido) > momento(ultima)) {
      ultima = fila.subido;
    }
  });
  guardarLoBajado();

  localStorage.setItem("ergon-usuario-nube", sesion.usuario);
  localStorage.setItem("ergon-ultima-bajada", ultima);
  pendientes = {};
  guardarPendientes();
  return true;
}

// Restaurar una copia con la cuenta unida: se borra todo lo de la nube y se
// sube la copia entera (lo pide la copia de seguridad antes de recargar).
async function sustituirNube() {
  await peticion(
    "DELETE",
    "/rest/v1/datos?usuario=eq." + encodeURIComponent(sesion.usuario),
  );
  localStorage.removeItem("ergon-sustituir-nube");
  apuntarTodo();
  await subirCambios();
}

// Sincroniza: primero baja, luego sube. Si ya se está sincronizando, lo
// repite al acabar. Si falla (sin conexión), lo pendiente sigue esperando.
async function sincronizar() {
  if (!hayNube() || !sesion) {
    return;
  }
  if (sincronizando) {
    repetirSincronizacion = true;
    return;
  }

  sincronizando = true;
  clearTimeout(temporizadorSubida);
  mostrarCuenta();

  try {
    let hayCambios = false;
    const unido = localStorage.getItem("ergon-usuario-nube");

    if (unido !== sesion.usuario) {
      hayCambios = await primeraSincronizacion();
    } else if (localStorage.getItem("ergon-sustituir-nube")) {
      await sustituirNube();
    } else {
      hayCambios = await bajarCambios();
      await subirCambios();
    }

    localStorage.setItem(
      "ergon-ultima-sincronizacion",
      new Date().toISOString(),
    );
    ultimoError = "";
    if (hayCambios) {
      actualizarTodo();
    }
  } catch (error) {
    if (error.message === "sesion") {
      ultimoError = "";
      errorEntrar.textContent =
        "Tu sesión ha caducado: vuelve a entrar. Lo que hayas cambiado se subirá entonces.";
    } else if (error instanceof TypeError) {
      // fetch da TypeError cuando no hay conexión
      ultimoError = "Sin conexión: los cambios se subirán cuando vuelva.";
    } else {
      ultimoError = "No se ha podido sincronizar (" + error.message + ").";
    }
  }

  sincronizando = false;
  mostrarCuenta();

  if (repetirSincronizacion) {
    repetirSincronizacion = false;
    sincronizar();
  }
}

// Volver a sincronizar al recuperar la conexión.
window.addEventListener("online", sincronizar);

// «Descargar los datos de antes» (los que se guardaron aparte al traer los
// de la cuenta).
document
  .getElementById("boton-datos-apartados")
  .addEventListener("click", function () {
    const archivo = new Blob([localStorage.getItem("ergon-antes-de-la-nube")], {
      type: "application/json",
    });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = "ergon-antes-de-la-nube.json";
    enlace.click();
    setTimeout(function () {
      URL.revokeObjectURL(enlace.href);
    }, 1000);
  });

// ==========================================================================
// 23. RECORDATORIOS
// Avisos en el móvil a la hora elegida, aunque Ergon esté cerrada. No los
// envía la app sino el servidor (la función «recordatorios» de Supabase, en
// supabase/functions): por eso hace falta la cuenta.
// - Al pulsar «Activar avisos», el navegador pide permiso y da una
//   «suscripción»: la dirección a la que el servicio de avisos (el de Apple,
//   en el iPhone) entrega los avisos de este dispositivo. Se guarda en la
//   tabla «suscripciones» de la nube.
// - Los ajustes (cuáles y a qué hora) son un dato más, «ergon-recordatorios»,
//   y se sincronizan: son los mismos en todos los dispositivos.
// - Cada 5 minutos, el servidor mira si toca alguno y si hace falta (p. ej.,
//   si quedan hábitos sin marcar) y lo envía. sw.js lo enseña.
// ==========================================================================

// Los cuatro recordatorios, en el orden en que se ven: su nombre en los
// ajustes, su título, cuándo avisa y la hora de siempre.
const tiposRecordatorio = [
  {
    tipo: "manana",
    nombre: "Intención de la mañana",
    cuando: "Si aún no la has escrito.",
    hora: "08:00",
  },
  {
    tipo: "habitos",
    nombre: "Hábitos sin marcar",
    cuando: "Los que te queden por hoy.",
    hora: "21:00",
  },
  {
    tipo: "noche",
    nombre: "Examen de la noche",
    cuando: "Si aún no lo has hecho.",
    hora: "22:30",
  },
  {
    tipo: "domingo",
    nombre: "Revisión del domingo",
    cuando: "Si aún no has repasado la semana.",
    hora: "18:00",
  },
];

// Lo que se está haciendo o lo que acaba de pasar («Activando…»,
// «Enviado…»). "" si nada.
let mensajeAvisos = "";

// ¿Puede este navegador recibir avisos? En el iPhone, solo si Ergon se ha
// abierto desde la pantalla de inicio (y con iOS 16.4 o posterior).
function puedeAvisar() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// ¿Es un iPhone o un iPad?
function esIphone() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

// La zona horaria de este dispositivo, p. ej. "Europe/Madrid". El servidor
// la necesita para saber qué hora es aquí.
function zonaDeAqui() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Rellena lo que falte de los ajustes con lo de siempre y pone la zona
// horaria de aquí. Se llama antes de guardarlos: el servidor solo envía
// los recordatorios que están en los ajustes.
function completarRecordatorios() {
  tiposRecordatorio.forEach(function (tipo) {
    if (!recordatorios[tipo.tipo]) {
      recordatorios[tipo.tipo] = { activo: true, hora: tipo.hora };
    }
  });
  recordatorios.zona = zonaDeAqui();
}

// La clave pública de los avisos (llega en base64url: letras, números, «-»
// y «_») convertida en bytes, que es como la pide el navegador. atob
// convierte el base64 normal (con «+» y «/») en texto, una letra por byte.
function bytesDeClave(texto) {
  const base64 = texto.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), function (letra) {
    return letra.charCodeAt(0);
  });
}

// Llama a la función «recordatorios» del servidor, con el pase de la sesión.
function llamarFuncion(cuerpo) {
  return peticion("POST", "/functions/v1/recordatorios", cuerpo);
}

// La clave pública de los avisos. Se pide al servidor una vez y se guarda:
// así, al pulsar «Activar avisos» no hay que esperarla (el iPhone quiere
// que todo pase justo después de pulsar).
async function claveDeAvisos() {
  let clave = localStorage.getItem("ergon-clave-avisos");
  if (!clave) {
    clave = (await llamarFuncion({ accion: "clave" })).clave;
    localStorage.setItem("ergon-clave-avisos", clave);
  }
  return clave;
}

// Da la suscripción de este dispositivo al servidor y la recuerda aquí (en
// «ergon-avisos-aqui», solo su dirección: es de este dispositivo).
async function guardarSuscripcion(suscripcion) {
  // toJSON la convierte en { endpoint, keys: { p256dh, auth } }
  const datos = suscripcion.toJSON();
  await peticion(
    "POST",
    "/rest/v1/suscripciones",
    {
      usuario: sesion.usuario,
      endpoint: datos.endpoint,
      p256dh: datos.keys.p256dh,
      auth: datos.keys.auth,
    },
    { Prefer: "resolution=merge-duplicates,return=minimal" },
  );
  localStorage.setItem("ergon-avisos-aqui", datos.endpoint);
}

// Borra del servidor la suscripción de una dirección.
function borrarSuscripcion(endpoint) {
  return peticion(
    "DELETE",
    "/rest/v1/suscripciones?endpoint=eq." + encodeURIComponent(endpoint),
  );
}

// Un error convertido en mensaje. inicio: lo que no se ha podido hacer.
function textoDeError(error, inicio) {
  if (error.message === "sesion") {
    return "Tu sesión ha caducado: vuelve a entrar.";
  }
  if (error instanceof TypeError) {
    return "Sin conexión. Prueba otra vez cuando tengas internet.";
  }
  return inicio + " (" + error.message + ").";
}

// «Activar avisos en este dispositivo»: el permiso, la suscripción y los
// ajustes.
async function activarAvisos() {
  mensajeAvisos = "Activando…";
  mostrarRecordatorios();

  try {
    // 1. El permiso: el navegador pregunta «¿Permitir notificaciones?»
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      mensajeAvisos = "";
      mostrarRecordatorios();
      return;
    }

    // 2. La suscripción, con la clave pública del servidor. Si ya había una
    // (de otra vez), se quita antes: podría ser de otra clave
    const clave = await claveDeAvisos();
    const trabajador = await navigator.serviceWorker.ready;
    const anterior = await trabajador.pushManager.getSubscription();
    if (anterior) {
      await anterior.unsubscribe();
    }
    const suscripcion = await trabajador.pushManager.subscribe({
      // Cada aviso se enseña (el iPhone no deja avisos «invisibles»)
      userVisibleOnly: true,
      applicationServerKey: bytesDeClave(clave),
    });

    // 3. Al servidor, con los ajustes (y la zona horaria de aquí)
    await guardarSuscripcion(suscripcion);
    completarRecordatorios();
    guardarRecordatorios();
    mensajeAvisos =
      "Avisos activados. Pulsa «Probar aviso» para ver cómo llegan.";
  } catch (error) {
    mensajeAvisos = textoDeError(error, "No se han podido activar los avisos");
  }
  mostrarRecordatorios();
}

// Quita los avisos de este dispositivo: la suscripción se borra del
// navegador y del servidor. Lo usan «Quitar de este dispositivo» y «Salir».
async function quitarAvisosAqui() {
  const endpoint = localStorage.getItem("ergon-avisos-aqui");
  if (!endpoint) {
    return;
  }
  localStorage.removeItem("ergon-avisos-aqui");

  const trabajador = await navigator.serviceWorker.ready;
  const suscripcion = await trabajador.pushManager.getSubscription();
  if (suscripcion) {
    await suscripcion.unsubscribe();
  }
  // Sin conexión, esto falla; da igual: la suscripción ya no existe y el
  // servidor la borrará al ver que el aviso no llega
  await borrarSuscripcion(endpoint);
}

// «Probar aviso»: el servidor envía uno solo a este dispositivo.
async function probarAviso() {
  mensajeAvisos = "Enviando un aviso de prueba…";
  mostrarRecordatorios();

  try {
    const respuesta = await llamarFuncion({
      accion: "prueba",
      endpoint: localStorage.getItem("ergon-avisos-aqui"),
    });
    if (respuesta.enviados > 0) {
      mensajeAvisos = "Enviado: te llegará en unos segundos.";
    } else {
      mensajeAvisos =
        "El aviso no ha llegado a este dispositivo. Prueba a quitar los avisos y a activarlos otra vez.";
    }
  } catch (error) {
    mensajeAvisos = textoDeError(
      error,
      "No se ha podido enviar el aviso de prueba",
    );
  }
  mostrarRecordatorios();
}

// Al abrir la app con la cuenta abierta (después de sincronizar):
// - si este dispositivo tiene los avisos activados, comprueba que su
//   suscripción sigue viva (el navegador a veces la cambia) y se la vuelve a
//   dar al servidor. Si se ha perdido (p. ej., se quitó el permiso en los
//   ajustes), se dan por quitados. Si se ha cambiado de zona horaria (de
//   viaje), se actualiza;
// - si no, deja preparada la clave pública para activarlos al momento.
async function revisarAvisos() {
  if (!hayNube() || !sesion || !puedeAvisar()) {
    return;
  }

  try {
    const endpoint = localStorage.getItem("ergon-avisos-aqui");
    if (!endpoint) {
      await claveDeAvisos();
      return;
    }

    const trabajador = await navigator.serviceWorker.ready;
    const suscripcion = await trabajador.pushManager.getSubscription();
    if (!suscripcion || Notification.permission !== "granted") {
      await quitarAvisosAqui();
    } else {
      if (suscripcion.endpoint !== endpoint) {
        await borrarSuscripcion(endpoint);
      }
      await guardarSuscripcion(suscripcion);
      if (recordatorios.zona && recordatorios.zona !== zonaDeAqui()) {
        completarRecordatorios();
        guardarRecordatorios();
      }
    }
  } catch (error) {
    // Sin conexión: ya se hará la próxima vez
  }
  mostrarRecordatorios();
}

// Cambia un recordatorio (cambio: { activo } o { hora }) y lo guarda.
function cambiarRecordatorio(tipo, cambio) {
  completarRecordatorios();
  Object.assign(recordatorios[tipo], cambio);
  guardarRecordatorios();
  dibujarListaRecordatorios();
}

// Una fila de la lista: la casilla con el nombre y cuándo avisa y, a la
// derecha, la hora. tipo: uno de tiposRecordatorio.
function crearFilaRecordatorio(tipo) {
  const fila = document.createElement("div");
  fila.classList.add("recordatorio-fila");
  fila.dataset.tipo = tipo.tipo;

  const casilla = document.createElement("input");
  casilla.type = "checkbox";
  casilla.addEventListener("change", function () {
    cambiarRecordatorio(tipo.tipo, { activo: casilla.checked });
  });

  const nombre = document.createElement("span");
  nombre.classList.add("recordatorio-nombre");
  nombre.textContent = tipo.nombre;
  const cuando = document.createElement("span");
  cuando.classList.add("recordatorio-cuando");
  cuando.textContent = tipo.cuando;
  const textos = document.createElement("span");
  textos.append(nombre, cuando);

  // La etiqueta envuelve la casilla y los textos: tocar el nombre también
  // la marca
  const etiqueta = document.createElement("label");
  etiqueta.append(casilla, textos);

  const hora = document.createElement("input");
  hora.type = "time";
  hora.setAttribute("aria-label", "Hora: " + tipo.nombre);
  hora.addEventListener("change", function () {
    // En el iPhone se puede borrar la hora: entonces se deja la que había
    if (hora.value === "") {
      hora.value = (recordatorios[tipo.tipo] || tipo).hora;
      return;
    }
    cambiarRecordatorio(tipo.tipo, { hora: hora.value });
  });

  fila.append(etiqueta, hora);
  return fila;
}

// Pone al día las cuatro filas. Se crean la primera vez; después solo se
// cambian sus valores (si se volvieran a crear al sincronizar mientras se
// elige una hora, el selector se cerraría).
function dibujarListaRecordatorios() {
  const caja = document.getElementById("lista-recordatorios");
  if (caja.children.length === 0) {
    tiposRecordatorio.forEach(function (tipo) {
      caja.append(crearFilaRecordatorio(tipo));
    });
  }

  tiposRecordatorio.forEach(function (tipo) {
    const fila = caja.querySelector('[data-tipo="' + tipo.tipo + '"]');
    const casilla = fila.querySelector('input[type="checkbox"]');
    const hora = fila.querySelector('input[type="time"]');
    // Sin ajustes todavía, los de siempre
    const ajuste = recordatorios[tipo.tipo] || {
      activo: true,
      hora: tipo.hora,
    };

    casilla.checked = ajuste.activo;
    if (document.activeElement !== hora) {
      hora.value = ajuste.hora;
    }
    hora.disabled = !ajuste.activo;
  });
}

// Dibuja la sección Recordatorios (en Archivo), solo con la cuenta abierta:
// la lista, la nota si aquí no se puede (iPhone sin instalar, permiso
// bloqueado), cómo está este dispositivo y sus botones.
function mostrarRecordatorios() {
  const seccion = document.getElementById("seccion-recordatorios");
  seccion.hidden = !hayNube() || !sesion;
  if (seccion.hidden) {
    return;
  }

  const activados = localStorage.getItem("ergon-avisos-aqui") !== null;
  const nota = document.getElementById("avisos-nota");

  nota.textContent = "";
  if (!puedeAvisar()) {
    if (esIphone()) {
      nota.textContent =
        "En el iPhone, los avisos solo llegan con Ergon en la pantalla de inicio: en Safari, pulsa Compartir → «Añadir a pantalla de inicio» y abre Ergon desde allí (hace falta iOS 16.4 o posterior). Desde aquí puedes elegir los recordatorios igualmente.";
    } else {
      nota.textContent =
        "Este navegador no puede recibir avisos. Desde aquí puedes elegir los recordatorios igualmente.";
    }
  } else if (Notification.permission === "denied") {
    nota.textContent =
      "Los avisos están bloqueados para Ergon. Para activarlos, permite las notificaciones en los ajustes (en el iPhone: Ajustes → Notificaciones → Ergon).";
  }
  nota.hidden = nota.textContent === "";

  // Los botones: activar o, si ya está, probar y quitar
  const sePuede = puedeAvisar() && Notification.permission !== "denied";
  document.getElementById("boton-activar-avisos").hidden =
    !sePuede || activados;
  document.getElementById("boton-probar-aviso").hidden = !sePuede || !activados;
  document.getElementById("boton-quitar-avisos").hidden = !activados;

  let estado = mensajeAvisos;
  if (estado === "" && activados) {
    estado = "Avisos activados en este dispositivo.";
  }
  document.getElementById("avisos-estado").textContent = estado;

  dibujarListaRecordatorios();
}

// Los botones de la sección.
document
  .getElementById("boton-activar-avisos")
  .addEventListener("click", activarAvisos);
document
  .getElementById("boton-probar-aviso")
  .addEventListener("click", probarAviso);
document
  .getElementById("boton-quitar-avisos")
  .addEventListener("click", async function () {
    try {
      await quitarAvisosAqui();
    } catch (error) {
      // Sin conexión: aquí ya están quitados (ver quitarAvisosAqui)
    }
    mensajeAvisos = "Avisos quitados de este dispositivo.";
    mostrarRecordatorios();
  });

// ==========================================================================
// 24. CONSEJEROS · CONEXIÓN
// Méntor y Prometheus (y, más adelante, los especialistas) contestan con la
// IA de Claude. La app no habla con Claude directamente: habla con la función
// «consejero» del servidor (supabase/functions/consejero), que guarda la
// clave de la API. Así la clave nunca está en este archivo, que cualquiera
// puede leer. La función también pone un límite de mensajes al día y lleva
// la cuenta de lo gastado.
// ==========================================================================

// Cómo va el día, según el servidor: { listo, nombre, motor, hoy, limite,
// coste, consejeros: [{ nombre, motor }] }. null mientras no se sabe.
let usoConsejeros = null;

// El último fallo al hablar con la función ("" si ninguno), la última
// respuesta de la prueba y si se está probando ahora.
let errorConsejeros = "";
let respuestaPrueba = "";
let probandoConsejero = false;

// Llama a la función «consejero» con el pase de la sesión. Si dice que no,
// su explicación (en castellano) pasa a ser el mensaje del error.
async function llamarConsejero(cuerpo) {
  try {
    return await peticion("POST", "/functions/v1/consejero", cuerpo);
  } catch (error) {
    // peticion avisa de los fallos como «servidor 429: {"error": "…"}»
    const partes = /^servidor (\d+): ([\s\S]*)$/.exec(error.message);
    if (!partes) {
      throw error;
    }
    let explicacion = "";
    try {
      explicacion = JSON.parse(partes[2]).error || "";
    } catch (otroError) {
      // No era JSON: se queda sin explicación
    }
    if (explicacion === "" && partes[1] === "404") {
      explicacion = "Falta desplegar la función «consejero» en Supabase.";
    }
    // La función que hay en Supabase es de antes de este consejero
    if (explicacion === "No conozco a ese consejero.") {
      explicacion =
        "Falta desplegar en Supabase la versión nueva de la función «consejero».";
    }
    if (explicacion === "") {
      explicacion = "El servidor ha fallado (" + partes[1] + ").";
    }
    throw new Error(explicacion);
  }
}

// Manda una conversación a un consejero ("mentor" o "prometheus") y
// devuelve su respuesta. mensajes: [{ de: "yo" o "consejero", texto }].
// contexto: el resumen de mis datos (bloque 26), o "" si no se comparten.
// Lo usan las charlas (bloque 25).
async function hablarConConsejero(consejero, mensajes, contexto) {
  const respuesta = await llamarConsejero({
    accion: "hablar",
    consejero: consejero,
    mensajes: mensajes,
    contexto: contexto || "",
  });
  usoConsejeros = respuesta.uso;
  return respuesta.texto;
}

// Un error convertido en mensaje para la sección (los del servidor ya
// vienen explicados).
function textoErrorConsejero(error) {
  if (error.message === "sesion") {
    return "Tu sesión ha caducado: vuelve a entrar.";
  }
  if (error instanceof TypeError) {
    return "Sin conexión. Prueba otra vez cuando tengas internet.";
  }
  return error.message;
}

// Al abrir la app con la cuenta abierta (después de sincronizar): pregunta
// cómo va el día, para enseñarlo en Archivo.
async function revisarConsejeros() {
  if (!hayNube() || !sesion) {
    return;
  }
  try {
    usoConsejeros = await llamarConsejero({ accion: "uso" });
    errorConsejeros = "";
  } catch (error) {
    errorConsejeros = textoErrorConsejero(error);
  }
  mostrarConsejeros();
}

// Los consejeros con su motor, en una frase: «Méntor y Prometheus · Claude
// Sonnet 5.5» si usan el mismo; si no, «Méntor (Claude Sonnet 5.5) y
// Prometheus (Claude Opus 5.5)». Si el servidor no manda la lista (la
// función de antes de la lección 45), el consejero que contestó.
function textoConsejeros(uso) {
  const lista = uso.consejeros || [{ nombre: uso.nombre, motor: uso.motor }];
  const mismoMotor = lista.every(function (consejero) {
    return consejero.motor === lista[0].motor;
  });
  const nombres = lista.map(function (consejero) {
    if (mismoMotor) {
      return consejero.nombre;
    }
    return consejero.nombre + " (" + consejero.motor + ")";
  });
  if (mismoMotor) {
    return enFrase(nombres) + " · " + lista[0].motor;
  }
  return enFrase(nombres);
}

// Dinero en texto: "0,03 $" (o "menos de 0,01 $" si es muy poco).
function textoDolares(cantidad) {
  if (cantidad > 0 && cantidad < 0.005) {
    return "menos de 0,01 $";
  }
  return (
    cantidad.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " $"
  );
}

// «Probar la conexión»: un saludo a Méntor. Su respuesta sale debajo.
async function probarConsejero() {
  probandoConsejero = true;
  errorConsejeros = "";
  respuestaPrueba = "";
  mostrarConsejeros();

  try {
    respuestaPrueba = await hablarConConsejero("mentor", [
      {
        de: "yo",
        texto:
          "Salve, Méntor. Es una prueba de conexión desde Ergon: preséntate en una o dos frases.",
      },
    ]);
  } catch (error) {
    errorConsejeros = textoErrorConsejero(error);
  }

  probandoConsejero = false;
  mostrarConsejeros();

  // Que se vea la respuesta (en el móvil puede quedar más abajo)
  if (respuestaPrueba) {
    document
      .getElementById("consejeros-respuesta")
      .scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// Dibuja la sección Consejeros (en Archivo), solo con la cuenta abierta:
// cómo va el día (o qué falta) y la respuesta de la prueba.
function mostrarConsejeros() {
  const seccion = document.getElementById("seccion-consejeros");
  seccion.hidden = !hayNube() || !sesion;
  if (seccion.hidden) {
    return;
  }

  let estado = "";
  if (probandoConsejero) {
    estado = "Méntor está escribiendo…";
  } else if (errorConsejeros) {
    estado = errorConsejeros;
  } else if (usoConsejeros && !usoConsejeros.listo) {
    estado =
      "Falta la clave de Claude: añádela en Supabase (Edge Functions → Secrets) con el nombre ANTHROPIC_API_KEY.";
  } else if (usoConsejeros) {
    // «Méntor y Prometheus · Claude Sonnet 5.5 · Hoy: 3 de 30 mensajes
    // (0,04 $).» (el límite es entre todos)
    let mensajes = " mensajes";
    if (usoConsejeros.limite === 1) {
      mensajes = " mensaje";
    }
    estado =
      textoConsejeros(usoConsejeros) +
      " · Hoy: " +
      usoConsejeros.hoy +
      " de " +
      usoConsejeros.limite +
      mensajes;
    if (usoConsejeros.coste > 0) {
      estado = estado + " (" + textoDolares(usoConsejeros.coste) + ")";
    }
    estado = estado + ".";
  }
  document.getElementById("consejeros-estado").textContent = estado;
  mostrarUsoCharla();

  document.getElementById("boton-probar-consejero").disabled =
    probandoConsejero;

  // La respuesta, en una burbuja de Méntor con su cara (bloque 8)
  const caja = document.getElementById("consejeros-respuesta");
  caja.innerHTML = "";
  if (respuestaPrueba) {
    caja.append(burbujaMentor(respuestaPrueba));
  }
  caja.hidden = respuestaPrueba === "";
}

document
  .getElementById("boton-probar-consejero")
  .addEventListener("click", probarConsejero);

// ==========================================================================
// 25. CONSEJEROS · LAS CHARLAS
// Hablar con un consejero con mis palabras: con Méntor en su pestaña y con
// Prometheus en la suya (la vista «Hablar» del laboratorio). Las dos
// charlas funcionan igual, así que el código es el mismo para las dos: lo
// que cambia de una a otra está en su «sala» (abajo). Cada conversación se
// guarda (en «conversaciones», bloque 1, con el consejero con el que es) y
// se sincroniza, así se puede seguir en el móvil o en el ordenador y releer
// después. Las respuestas llegan de Claude a través del servidor
// (hablarConConsejero, bloque 24). Cada sala tiene dos vistas: la
// conversación abierta (con el campo para escribir) y la lista de las
// conversaciones guardadas.
// ==========================================================================

// Las salas. Cada una tiene:
//  - consejero y nombre: con quién se habla ("mentor", «Méntor»).
//  - raiz: su caja en la página. Sus piezas se buscan dentro por su clase
//    (función pieza), así las dos salas usan las mismas clases.
//  - saludo: lo primero que dice (lo pone la app; no se guarda).
//  - burbuja: cómo se dibujan sus mensajes (con su cara).
//  - resumen: el resumen de mis datos que recibe con cada mensaje (bloque
//    26), si lo comparto.
//  - sugerencias: preguntas para empezar con un toque (o ninguna).
//  - Y cómo va la charla: la conversación abierta (abierta: su id, o null
//    si es una nueva aún sin mensajes); si ya se ha elegido una (elegida:
//    en la lista, con «+ Nueva» o al escribir; mientras no, se abre la de
//    hoy: si hoy ya se habló con él, aquí o en otro dispositivo, se sigue
//    esa; si no, una nueva); si se está viendo la lista (viendoLista); la
//    conversación que espera la respuesta (esperando: su id, o null) y el
//    último fallo (error: { id, texto }, o null).
const salas = {
  mentor: {
    consejero: "mentor",
    nombre: "Méntor",
    raiz: document.querySelector('[data-pantalla="charla"]'),
    saludo: function () {
      return salve() + " ¿De qué quieres hablar?";
    },
    burbuja: burbujaMentor,
    resumen: resumenParaConsejeros,
    sugerencias: [],
    abierta: null,
    elegida: false,
    viendoLista: false,
    esperando: null,
    error: null,
  },
  prometheus: {
    consejero: "prometheus",
    nombre: "Prometheus",
    raiz: document.getElementById("lab-vista-charla"),
    saludo: function () {
      let hola = "Hola.";
      if (perfil.nombre) {
        hola = "Hola, " + perfil.nombre + ".";
      }
      return (
        hola +
        " Soy Prometheus: leo tus datos y busco lo que dicen. ¿Qué quieres analizar?"
      );
    },
    burbuja: burbujaPrometheus,
    resumen: resumenParaPrometheus,
    sugerencias: [
      "¿Cómo estoy durmiendo?",
      "¿Qué días me cuestan más y por qué puede ser?",
      "¿Cómo voy en el gimnasio?",
      "Analiza mi última semana",
    ],
    abierta: null,
    elegida: false,
    viendoLista: false,
    esperando: null,
    error: null,
  },
};

// Una pieza de una sala, por su clase: pieza(sala, "charla") es la caja de
// la conversación de esa sala.
function pieza(sala, clase) {
  return sala.raiz.querySelector("." + clase);
}

// El campo para escribir de una sala.
function campoDe(sala) {
  return pieza(sala, "charla-escribir").querySelector("textarea");
}

// Con quién es una conversación (las de antes de la lección 45 no lo
// decían todas: eran con Méntor).
function consejeroDe(conversacion) {
  return conversacion.consejero || "mentor";
}

// Las conversaciones de una sala (las de su consejero).
function conversacionesDe(sala) {
  return Object.values(conversaciones).filter(function (conversacion) {
    return consejeroDe(conversacion) === sala.consejero;
  });
}

// La conversación de hoy más reciente de una sala (su id), o null si hoy no
// ha habido.
function conversacionDeHoy(sala) {
  let reciente = null;
  conversacionesDe(sala).forEach(function (conversacion) {
    const dia = new Date(conversacion.actualizada).toLocaleDateString("en-CA");
    if (
      dia === hoy &&
      (!reciente || conversacion.actualizada > reciente.actualizada)
    ) {
      reciente = conversacion;
    }
  });
  if (reciente) {
    return reciente.id;
  }
  return null;
}

// El título de una conversación: el principio de mi primer mensaje
// (cortado en una palabra, con «…» si sigue).
function tituloDe(texto) {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= 40) {
    return limpio;
  }
  const corte = limpio.slice(0, 40).replace(/\s+\S*$/, "");
  return corte + "…";
}

// Una burbuja con lo que yo he escrito, a la derecha (como mis respuestas
// del bloque 8, pero sin poder tocarla para cambiarla).
function burbujaYo(texto) {
  const burbuja = document.createElement("p");
  burbuja.classList.add("burbuja", "burbuja-mia");
  burbuja.textContent = texto;
  return burbuja;
}

// Una burbuja de Prometheus, a la izquierda, con su cara: la llama de
// Prometeo (el símbolo «llama» de index.html) en un círculo oscuro.
function burbujaPrometheus(texto) {
  const burbuja = document.createElement("p");
  burbuja.classList.add("burbuja", "burbuja-prometheus");
  burbuja.innerHTML =
    '<svg class="prometheus-cara" viewBox="0 0 40 40" aria-hidden="true"><use href="#llama" x="11" y="6" width="18" height="26"></use></svg>';
  burbuja.append(texto);
  return burbuja;
}

// «Méntor está escribiendo…»: la burbuja del consejero con tres puntos
// (como en el bloque 8, pero hasta que llega la respuesta).
function burbujaEscribiendo(sala) {
  const burbuja = sala.burbuja("");
  burbuja.classList.add("escribiendo");
  burbuja.setAttribute("aria-label", sala.nombre + " está escribiendo");
  burbuja.insertAdjacentHTML(
    "beforeend",
    "<span></span><span></span><span></span>",
  );
  return burbuja;
}

// Un aviso dentro de la conversación (un fallo, o que el consejero no llegó
// a contestar) con el botón «Reintentar».
function avisoCharla(sala, texto, id) {
  const aviso = document.createElement("div");
  aviso.classList.add("charla-fallo");
  aviso.append(
    crearParrafo(texto, "charla-fallo-texto"),
    crearBoton("Reintentar", "charla-reintentar", function () {
      pedirRespuesta(sala, id);
    }),
  );
  return aviso;
}

// Las preguntas para empezar (solo en una conversación nueva): al tocar
// una, se envía tal cual.
function sugerenciasDe(sala) {
  const caja = document.createElement("div");
  caja.classList.add("charla-sugerencias");
  sala.sugerencias.forEach(function (texto) {
    caja.append(
      crearBoton(texto, "charla-sugerencia", function () {
        if (sala.esperando === null) {
          enviarACharla(sala, texto);
        }
      }),
    );
  });
  return caja;
}

// Dibuja la conversación abierta de una sala: el día, el saludo (lo pone
// la app, no se guarda), los mensajes y, al final, los puntos de
// «escribiendo» o el aviso de un fallo. En una nueva, las sugerencias.
function dibujarCharla(sala) {
  const caja = pieza(sala, "charla");
  caja.innerHTML = "";
  const conversacion = conversaciones[sala.abierta];

  // El día en que empezó (solo si ya tiene mensajes)
  if (conversacion) {
    caja.append(
      crearParrafo(
        new Date(conversacion.creada).toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        "charla-fecha",
      ),
    );
  }

  caja.append(sala.burbuja(sala.saludo()));

  if (!conversacion) {
    if (sala.sugerencias.length > 0) {
      caja.append(sugerenciasDe(sala));
    }
    return;
  }

  conversacion.mensajes.forEach(function (mensaje) {
    if (mensaje.de === "yo") {
      caja.append(burbujaYo(mensaje.texto));
    } else {
      caja.append(sala.burbuja(mensaje.texto));
    }
  });

  const ultimo = conversacion.mensajes[conversacion.mensajes.length - 1];
  if (sala.esperando === conversacion.id) {
    caja.append(burbujaEscribiendo(sala));
  } else if (sala.error && sala.error.id === conversacion.id) {
    caja.append(avisoCharla(sala, sala.error.texto, conversacion.id));
  } else if (ultimo && ultimo.de === "yo") {
    // Se cerró la app antes de que contestara (o en otro dispositivo)
    caja.append(
      avisoCharla(
        sala,
        sala.nombre + " no llegó a contestar.",
        conversacion.id,
      ),
    );
  }
}

// Dibuja la lista de conversaciones guardadas de una sala, de la más
// reciente a la más antigua: el título, el día y cuántos mensajes; tocar
// una la abre y la × la borra.
function dibujarListaCharlas(sala) {
  const caja = pieza(sala, "lista-charlas");
  caja.innerHTML = "";

  caja.append(
    crearBoton("+ Nueva conversación", "boton-nuevo", function () {
      abrirCharla(sala, null);
    }),
  );

  const lista = conversacionesDe(sala).sort(function (a, b) {
    if (a.actualizada > b.actualizada) {
      return -1;
    }
    return 1;
  });

  if (lista.length === 0) {
    caja.append(
      crearParrafo(
        "Aún no has hablado con " + sala.nombre + ".",
        "charla-vacia",
      ),
    );
    return;
  }

  lista.forEach(function (conversacion) {
    const fila = document.createElement("div");
    fila.classList.add("charla-fila");

    const dia = new Date(conversacion.actualizada).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    let mensajes = conversacion.mensajes.length + " mensajes";
    if (conversacion.mensajes.length === 1) {
      mensajes = "1 mensaje";
    }

    const abrir = document.createElement("button");
    abrir.type = "button";
    abrir.classList.add("charla-abrir");
    abrir.append(
      crearParrafo(conversacion.titulo, "charla-titulo"),
      crearParrafo(dia + " · " + mensajes, "charla-detalle"),
    );
    abrir.addEventListener("click", function () {
      abrirCharla(sala, conversacion.id);
    });

    const borrar = crearBoton("×", "charla-borrar", async function () {
      const seguro = await preguntar(
        "¿Borrar la conversación «" +
          conversacion.titulo +
          "»? Se borrará también en tus otros dispositivos.",
        "Borrar",
        "Cancelar",
      );
      if (!seguro) {
        return;
      }
      delete conversaciones[conversacion.id];
      guardarConversacion(conversacion.id);
      if (sala.abierta === conversacion.id) {
        sala.abierta = null;
      }
      mostrarSala(sala);
    });
    borrar.setAttribute("aria-label", "Borrar la conversación");

    fila.append(abrir, borrar);
    caja.append(fila);
  });
}

// Dibuja una sala: sin cuenta, lo que falta; con cuenta, la lista o la
// conversación abierta con el campo para escribir.
function mostrarSala(sala) {
  const conCuenta = hayNube() && sesion !== null;
  pieza(sala, "charla-sin-cuenta").hidden = conCuenta;
  pieza(sala, "charla-barra").hidden = !conCuenta || sala.viendoLista;
  pieza(sala, "lista-charlas").hidden = !conCuenta || !sala.viendoLista;
  pieza(sala, "charla").hidden = !conCuenta || sala.viendoLista;
  pieza(sala, "charla-escribir").hidden = !conCuenta || sala.viendoLista;
  pieza(sala, "charla-pie").hidden = !conCuenta || sala.viendoLista;
  if (!conCuenta) {
    return;
  }

  // Si la conversación abierta se ha borrado (aquí o en otro dispositivo)
  if (sala.abierta && !conversaciones[sala.abierta]) {
    sala.abierta = null;
  }
  if (!sala.elegida) {
    sala.abierta = conversacionDeHoy(sala);
  }

  // «‹ Conversaciones (3)»
  const cuantas = conversacionesDe(sala).length;
  let textoLista = "‹ Conversaciones";
  if (cuantas > 0) {
    textoLista = textoLista + " (" + cuantas + ")";
  }
  pieza(sala, "charla-ver-lista").textContent = textoLista;

  // Mientras el consejero contesta, no se puede enviar otro mensaje
  pieza(sala, "charla-escribir").querySelector("button").disabled =
    sala.esperando !== null;
  mostrarUsoCharla();

  if (sala.viendoLista) {
    dibujarListaCharlas(sala);
  } else {
    dibujarCharla(sala);
  }
}

// Dibuja todas las salas (al cambiar algo: al entrar en la cuenta, al
// llegar conversaciones de la nube…).
function mostrarCharlas() {
  Object.values(salas).forEach(mostrarSala);
}

// Debajo del campo de cada sala, cuántos mensajes van hoy (lo dice el
// servidor, y el límite es entre todos los consejeros; lo llama también
// mostrarConsejeros, cada vez que cambia).
function mostrarUsoCharla() {
  let uso = "";
  if (usoConsejeros && usoConsejeros.listo) {
    uso =
      "Hoy: " +
      usoConsejeros.hoy +
      " de " +
      usoConsejeros.limite +
      " mensajes.";
  }
  Object.values(salas).forEach(function (sala) {
    pieza(sala, "charla-uso").textContent = uso;
  });
}

// Baja hasta el final de la página al momento (al entrar en una charla,
// sin la animación de bajarAlFinal).
function irAlFinal() {
  window.scrollTo(0, document.body.scrollHeight);
}

// Abre en una sala una conversación (id) o una nueva (null).
function abrirCharla(sala, id) {
  sala.abierta = id;
  sala.elegida = true;
  sala.viendoLista = false;
  mostrarSala(sala);
  irAlFinal();
  enfocarCampoCharla(sala);
}

// En el PC, deja el cursor en el campo para escribir (en el móvil no:
// abriría el teclado sin querer).
function enfocarCampoCharla(sala) {
  if (!window.matchMedia("(pointer: coarse)").matches && sesion) {
    campoDe(sala).focus({ preventScroll: true });
  }
}

// ¿Se está viendo esta sala ahora? (para bajar al final al llegar la
// respuesta solo si se está mirando): su pantalla y su caja, a la vista.
function salaALaVista(sala) {
  return !sala.raiz.closest(".pantalla").hidden && !sala.raiz.hidden;
}

// Pide al consejero la respuesta a una conversación (cuando el último
// mensaje es mío). Mientras, salen los tres puntos; si falla, el aviso con
// «Reintentar». Se puede cambiar de pestaña mientras tanto.
async function pedirRespuesta(sala, id) {
  sala.esperando = id;
  sala.error = null;
  mostrarSala(sala);
  bajarAlFinal();

  try {
    const mensajes = conversaciones[id].mensajes.map(function (mensaje) {
      return { de: mensaje.de, texto: mensaje.texto };
    });
    // Con el resumen de mis datos, si los comparto con él (bloque 26)
    let contexto = "";
    if (compartirDatos(sala.consejero)) {
      contexto = sala.resumen();
    }
    const texto = await hablarConConsejero(sala.consejero, mensajes, contexto);

    // Puede que se haya borrado mientras tanto
    const conversacion = conversaciones[id];
    if (conversacion) {
      const ahora = new Date().toISOString();
      conversacion.mensajes.push({
        de: "consejero",
        texto: texto,
        hora: ahora,
      });
      conversacion.actualizada = ahora;
      guardarConversacion(id);
    }
  } catch (error) {
    sala.error = { id: id, texto: textoErrorConsejero(error) };
  }

  sala.esperando = null;
  mostrarSala(sala);
  mostrarConsejeros();
  if (sala.abierta === id && !sala.viendoLista && salaALaVista(sala)) {
    bajarAlFinal();
  }
}

// Envía lo escrito: se añade a la conversación abierta de la sala (o crea
// una nueva, con su consejero) y se pide la respuesta. Al escribir en una,
// queda elegida: aunque llegue otra más reciente de otro dispositivo, se
// sigue en esta.
function enviarACharla(sala, texto) {
  const ahora = new Date().toISOString();
  let conversacion = conversaciones[sala.abierta];

  if (!conversacion) {
    const id = "c" + Date.now();
    conversacion = {
      id: id,
      consejero: sala.consejero,
      creada: ahora,
      actualizada: ahora,
      titulo: tituloDe(texto),
      mensajes: [],
    };
    conversaciones[id] = conversacion;
    sala.abierta = id;
  }
  sala.elegida = true;

  conversacion.mensajes.push({ de: "yo", texto: texto, hora: ahora });
  conversacion.actualizada = ahora;
  guardarConversacion(conversacion.id);
  pedirRespuesta(sala, conversacion.id);
}

// El campo para escribir crece con el texto (hasta unas seis líneas).
function ajustarCampoCharla(sala) {
  const campo = campoDe(sala);
  campo.style.height = "auto";
  // scrollHeight: el alto del texto con su relleno; se le suma el borde
  const bordes = campo.offsetHeight - campo.clientHeight;
  campo.style.height = Math.min(campo.scrollHeight + bordes, 160) + "px";
}

// Conecta los botones y el campo de una sala. En el PC, Intro envía y
// Mayúsculas + Intro hace una línea nueva; en el móvil, Intro hace una
// línea nueva y se envía con el botón.
function conectarSala(sala) {
  const campo = campoDe(sala);
  const formulario = pieza(sala, "charla-escribir");

  campo.addEventListener("input", function () {
    ajustarCampoCharla(sala);
  });

  campo.addEventListener("keydown", function (evento) {
    const esMovil = window.matchMedia("(pointer: coarse)").matches;
    if (evento.key === "Enter" && !evento.shiftKey && !esMovil) {
      evento.preventDefault();
      formulario.requestSubmit();
    }
  });

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();
    const texto = campo.value.trim();
    if (texto === "" || sala.esperando !== null) {
      return;
    }
    campo.value = "";
    ajustarCampoCharla(sala);
    enviarACharla(sala, texto);
  });

  // «‹ Conversaciones» y «+ Nueva»
  pieza(sala, "charla-ver-lista").addEventListener("click", function () {
    sala.viendoLista = true;
    mostrarSala(sala);
    window.scrollTo(0, 0);
  });
  pieza(sala, "charla-nueva").addEventListener("click", function () {
    abrirCharla(sala, null);
  });

  // «Lo que ve…» (bloque 26)
  pieza(sala, "charla-ve").addEventListener("click", function () {
    abrirContexto(sala);
  });

  // Sin cuenta: «Ir a Archivo» lleva a entrar
  pieza(sala, "charla-ir-a-cuenta").addEventListener("click", function () {
    mostrarPantalla("archivo");
  });
}

Object.values(salas).forEach(conectarSala);

// ==========================================================================
// 26. CONSEJEROS · LO QUE VEN DE MÍ
// Para que los consejeros aconsejen sabiendo cómo voy, cada mensaje lleva
// un resumen de mis datos de Ergon escrito en texto; cada uno, el de su
// ámbito. Méntor: el día y la hora, mi nombre y mi edad, los hábitos (con
// sus reglas, su racha, su constancia y cómo van hoy), las metas, los
// rituales de hoy y la última revisión semanal. Prometheus: los números
// (las cifras de los hábitos, el peso, el sueño y los entrenos). Lo
// calcula la app en el momento, con las mismas funciones que dibujan las
// pantallas. Se puede ver tal cual («Lo que ve…», debajo de cada charla) y
// dejar de compartir, con cada consejero por separado.
// ==========================================================================

// Los días de la semana en plural, por getDay() (0 = domingo): «los
// lunes, miércoles y viernes».
const diasEnPlural = [
  "domingos",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábados",
];

// Dónde se guarda, en los ajustes de los consejeros, si uno ve mis datos:
// el de Méntor, en «compartir» (lección 42); el de los demás, con su
// nombre detrás («compartirPrometheus»).
function claveCompartir(consejero) {
  if (consejero === "mentor") {
    return "compartir";
  }
  return "compartir" + conMayuscula(consejero);
}

// ¿Ve un consejero mis datos? (si no se ha tocado su ajuste, sí; sin decir
// cuál, Méntor)
function compartirDatos(consejero) {
  return ajustesConsejeros[claveCompartir(consejero || "mentor")] !== false;
}

// Una lista en una frase: ["a", "b", "c"] → «a, b y c».
function enFrase(lista) {
  if (lista.length <= 1) {
    return lista.join("");
  }
  return lista.slice(0, -1).join(", ") + " y " + lista[lista.length - 1];
}

// Un número con sus puntos de miles: 10000 → «10.000».
function numero(cantidad) {
  return cantidad.toLocaleString("es-ES");
}

// Las reglas de un hábito en palabras: «al menos 10.000 pasos, todos los
// días», «los lunes, miércoles y viernes, con comodín»…
function reglasEnTexto(habito) {
  const partes = [];

  if (habito.medida === "cantidad") {
    let limite = "al menos ";
    if (habito.limite === "maximo") {
      limite = "como mucho ";
    }
    partes.push(
      (limite + numero(habito.objetivo) + " " + (habito.unidad || "")).trim(),
    );
  } else if (habito.medida === "abstencion") {
    partes.push("templanza: algo que quiere dejar");
  }

  if (habito.frecuencia === "dias") {
    // Ordenados empezando por el lunes
    const dias = (habito.dias || [])
      .slice()
      .sort(function (a, b) {
        return ((a + 6) % 7) - ((b + 6) % 7);
      })
      .map(function (dia) {
        return diasEnPlural[dia];
      });
    partes.push("los " + enFrase(dias));
  } else if (habito.frecuencia === "semanal") {
    if (habito.vecesSemana === 1) {
      partes.push("1 vez por semana");
    } else {
      partes.push(habito.vecesSemana + " veces por semana");
    }
  } else if (habito.medida !== "abstencion") {
    partes.push("todos los días");
  }

  if (habito.comodin) {
    partes.push("con comodín: un fallo a la semana no rompe la racha");
  }
  return partes.join(", ");
}

// Cómo va hoy un hábito: «hoy hecho», «hoy descansa», «hoy: 4.000 de
// 10.000 pasos»…
function hoyEnTexto(habito) {
  const valor = habitosHoy[habito.id];

  if (habito.medida === "abstencion") {
    if (valor === "recaida") {
      return "hoy ha recaído";
    }
    return "hoy, de momento, sin recaer";
  }
  if (habito.frecuencia !== "semanal" && !tocaEn(habito, new Date())) {
    return "hoy descansa";
  }
  if (habito.medida === "cantidad") {
    if (valor === undefined) {
      return "hoy aún no ha apuntado nada";
    }
    const unidad = habito.unidad ? " " + habito.unidad : "";
    if (habito.limite === "maximo") {
      if (valor > habito.objetivo) {
        return "hoy: " + numero(valor) + unidad + ", se ha pasado del máximo";
      }
      return "hoy: " + numero(valor) + unidad + ", dentro del máximo";
    }
    if (valor >= habito.objetivo) {
      return "hoy: " + numero(valor) + unidad + ", cumplido";
    }
    return "hoy: " + numero(valor) + " de " + numero(habito.objetivo) + unidad;
  }
  if (estaCumplido(habito, habitosHoy)) {
    return "hoy hecho";
  }
  return "hoy aún sin hacer";
}

// Una línea por hábito: nombre, reglas, racha, constancia y cómo va hoy.
function habitoEnTexto(habito) {
  const partes = [];

  if (inicioDe(habito) > hoy) {
    return (
      "- " +
      habito.nombre +
      " (" +
      reglasEnTexto(habito) +
      "): empieza el " +
      fechaLarga(inicioDe(habito))
    );
  }

  if (habito.medida === "abstencion") {
    const datos = mejorRachaYTotal(habito);
    partes.push(
      "lleva " +
        textoDias(calcularRacha(habito.id)) +
        " seguidos sin recaer (su mejor racha: " +
        textoDias(datos.mejor) +
        "; en total, " +
        textoDias(datos.total) +
        " sin recaer)",
    );
  } else if (habito.frecuencia === "semanal") {
    const racha = calcularRacha(habito.id);
    let semanas = racha + " semanas";
    if (racha === 1) {
      semanas = "1 semana";
    }
    partes.push("racha: " + semanas);
    partes.push(
      "esta semana: " +
        vecesEnSemana(habito, new Date()) +
        " de " +
        habito.vecesSemana,
    );
  } else {
    partes.push("racha: " + textoDias(calcularRacha(habito.id)));
  }

  // La constancia (como en Hoy): de los últimos 30 días (o 4 semanas)
  if (habito.medida !== "abstencion") {
    const datos = constancia(habito);
    if (datos.posibles > 0) {
      let periodo = "últimos 30 días que tocaba: ";
      if (datos.enSemanas) {
        periodo = "últimas 4 semanas: ";
      }
      partes.push(periodo + datos.cumplidos + " de " + datos.posibles);
    }
  }

  if (habito.comodin && comodinGastado(habito)) {
    partes.push("comodín ya gastado esta semana");
  }
  partes.push(hoyEnTexto(habito));

  return (
    "- " +
    habito.nombre +
    " (" +
    reglasEnTexto(habito) +
    "): " +
    partes.join("; ")
  );
}

// Una línea por meta pendiente (pasos hechos, el siguiente y el hábito que
// la impulsa) y, al final, las últimas cumplidas.
function metasEnTexto() {
  const lineas = [];
  const pendientes = metas.filter(function (meta) {
    return !metaCumplida(meta);
  });
  const cumplidas = metas.filter(metaCumplida);

  pendientes.forEach(function (meta) {
    const hechos = meta.pasos.filter(function (paso) {
      return paso.completado;
    }).length;
    const siguiente = meta.pasos.find(function (paso) {
      return !paso.completado;
    });

    let linea = "- «" + meta.titulo + "»";
    if (meta.area) {
      linea = linea + " (" + meta.area + ")";
    }
    linea = linea + ": " + hechos + " de " + meta.pasos.length + " pasos";
    if (siguiente) {
      linea = linea + "; siguiente paso: «" + siguiente.texto + "»";
    }
    if (meta.habito) {
      linea =
        linea + "; la impulsa el hábito «" + nombreHabito(meta.habito) + "»";
    }
    lineas.push(linea);
  });

  // Las cumplidas: las 5 más recientes (las que no tienen fecha, al final)
  cumplidas
    .sort(function (a, b) {
      return (b.victoria || "").localeCompare(a.victoria || "");
    })
    .slice(0, 5)
    .forEach(function (meta) {
      let linea = "- Cumplida: «" + meta.titulo + "»";
      if (meta.victoria) {
        linea = linea + ", el " + fechaLarga(meta.victoria);
      }
      lineas.push(linea);
    });

  return lineas;
}

// La primera línea de los resúmenes: el día y la hora («Ahora: viernes,
// 16 de octubre de 2026, 10:30.»).
function lineaAhora(ahora) {
  return (
    "Ahora: " +
    ahora.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }) +
    ", " +
    ahora.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }) +
    "."
  );
}

// El resumen entero, en texto, tal como le llega a Méntor.
function resumenParaConsejeros() {
  const ahora = new Date();
  const lineas = [];

  lineas.push(lineaAhora(ahora));

  // Quién es (sin el peso)
  const quien = [];
  if (perfil.nombre) {
    quien.push("Se llama " + perfil.nombre);
  }
  if (perfil.nacimiento) {
    quien.push("tiene " + edadDe(perfil.nacimiento) + " años");
  }
  if (quien.length > 0) {
    lineas.push(enFrase(quien) + ".");
  }

  // Los hábitos y cómo va el día
  lineas.push("");
  if (habitos.length === 0) {
    lineas.push("Hábitos: aún no tiene ninguno.");
  } else {
    const dia = resumenDelDia(ahora);
    lineas.push(
      "Hábitos (de los " +
        dia.tocan +
        " que tocan hoy, lleva hechos " +
        dia.cumplidos +
        "):",
    );
    habitos.forEach(function (habito) {
      lineas.push(habitoEnTexto(habito));
    });

    // Días perfectos (todos los hábitos que tocaban) de los últimos 30
    let perfectos = 0;
    const fecha = new Date();
    for (let i = 0; i < 30; i++) {
      fecha.setDate(fecha.getDate() - 1);
      if (nivelDelDia(fecha) === 3) {
        perfectos++;
      }
    }
    lineas.push("Días perfectos en los últimos 30 días: " + perfectos + ".");
  }

  // Las metas
  lineas.push("");
  const lineasMetas = metasEnTexto();
  if (lineasMetas.length === 0) {
    lineas.push("Metas: aún no tiene ninguna.");
  } else {
    lineas.push("Metas:");
    lineasMetas.forEach(function (linea) {
      lineas.push(linea);
    });
  }

  // Los rituales de hoy (la intención; de noche, también el examen)
  lineas.push("");
  const ritual = rituales[diaDelRitual()] || {};
  if (ritual.intencion === undefined) {
    lineas.push("Intención del día: aún no la ha escrito.");
  } else if (ritual.intencion === "") {
    lineas.push("Intención del día: hoy ha preferido no escribirla.");
  } else {
    lineas.push("Intención del día: «" + ritual.intencion + "».");
  }
  if (esDeNoche()) {
    if (ritual.examen) {
      lineas.push(
        "Examen de la noche (las preguntas de Séneca, en su diario de papel): ya lo ha hecho.",
      );
    } else {
      lineas.push(
        "Examen de la noche (las preguntas de Séneca, en su diario de papel): aún no.",
      );
    }
  }

  // La última revisión semanal
  const semanas = Object.keys(revisiones).sort();
  if (semanas.length > 0) {
    const lunes = semanas[semanas.length - 1];
    const revision = revisiones[lunes];
    lineas.push("");
    lineas.push(
      "Última revisión semanal (" + nombreSemana(lunes).toLowerCase() + "):",
    );
    if (revision.cumplido) {
      lineas.push("- ¿Cumplió el propósito anterior? " + revision.cumplido);
    }
    if (revision.bien) {
      lineas.push("- Lo que fue bien: «" + revision.bien + "»");
    }
    if (revision.costado) {
      lineas.push("- Lo que costó: «" + revision.costado + "»");
    }
    if (revision.proposito) {
      lineas.push(
        "- Su propósito para la semana siguiente: «" + revision.proposito + "»",
      );
    }
  }

  return lineas.join("\n");
}

// ---------- El resumen para Prometheus ----------

// Una fecha corta con su día de la semana: "2026-10-16" → «vie, 16 oct».
function fechaConDia(clave) {
  return new Date(clave + "T00:00").toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// «1 noche», «6 noches».
function textoNoches(cantidad) {
  if (cantidad === 1) {
    return "1 noche";
  }
  return cantidad + " noches";
}

// Cómo le fue un día con los hábitos, para ponerlo junto a la noche de
// antes: «ese día cumplió 5 de 6 hábitos» (hoy: «hoy, de momento, 2 de 6
// hábitos»).
function diaEnTexto(clave) {
  const resumen = resumenDelDia(new Date(clave + "T00:00"));
  if (resumen.tocan === 0) {
    return "ese día no tocaba ningún hábito";
  }
  const cuenta = resumen.cumplidos + " de " + resumen.tocan + " hábitos";
  if (clave === hoy) {
    return "hoy, de momento, " + cuenta;
  }
  return "ese día cumplió " + cuenta;
}

// Una línea por hábito con las cifras del laboratorio: sus reglas, su
// constancia, su racha, su récord y el total (en templanza, los días sin
// recaer).
function habitoEnNumeros(habito) {
  if (inicioDe(habito) > hoy) {
    return (
      "- " +
      habito.nombre +
      " (" +
      reglasEnTexto(habito) +
      "): empieza el " +
      fechaLarga(inicioDe(habito))
    );
  }

  const datos = numerosDe(habito);
  const partes = [];
  if (habito.medida === "abstencion") {
    partes.push("lleva " + textoDias(datos.racha) + " sin recaer");
    partes.push("récord: " + textoDias(datos.record));
    partes.push("en total, " + textoDias(datos.total) + " sin recaer");
  } else {
    if (datos.posibles > 0) {
      let periodo = " días que tocaba, en los últimos 30";
      if (datos.enSemanas) {
        periodo = " semanas, en las últimas 4";
      }
      partes.push(
        "constancia: " +
          textoPorcentaje(datos.porcentaje) +
          " (" +
          datos.cumplidos +
          " de " +
          datos.posibles +
          periodo +
          ")",
      );
    }
    partes.push("racha: " + textoDuracion(datos.racha, datos.enSemanas));
    partes.push("récord: " + textoDuracion(datos.record, datos.enSemanas));
    let total = textoDias(datos.total);
    if (datos.enSemanas) {
      total = datos.total + " veces";
      if (datos.total === 1) {
        total = "1 vez";
      }
    }
    partes.push("en total: " + total);
  }

  return (
    "- " +
    habito.nombre +
    " (" +
    reglasEnTexto(habito) +
    "): " +
    partes.join("; ")
  );
}

// Un entreno en una línea: el día, el tipo, los minutos, la intensidad,
// cada ejercicio con sus series y la nota.
function entrenoEnTexto(entreno) {
  let texto =
    "- " +
    fechaConDia(entreno.fecha) +
    ": " +
    nombreTipo(entreno.tipo).toLowerCase();
  if (entreno.minutos) {
    texto += ", " + entreno.minutos + " min";
  }
  texto +=
    ", intensidad " +
    entreno.intensidad +
    " (" +
    textoIntensidad(entreno.intensidad) +
    ")";
  entreno.ejercicios.forEach(function (ejercicio) {
    let series = "sin series apuntadas";
    if (ejercicio.series.length > 0) {
      series = ejercicio.series.map(textoSerie).join(", ");
    }
    texto += ". " + ejercicio.nombre + ": " + series;
  });
  if (entreno.nota) {
    texto += ". Nota: «" + entreno.nota + "»";
  }
  return texto + ".";
}

// El resumen para Prometheus: los números. Las cifras de los hábitos (las
// del laboratorio), el peso, cada noche de sueño (con cómo le fue ese día
// con los hábitos, para que pueda ver si van juntos), los entrenos con sus
// series y el progreso de cada ejercicio. Para que no sea demasiado largo:
// las noches de las últimas 4 semanas, los entrenos de las últimas 8 (30
// como mucho), los 20 últimos pesos y los 8 ejercicios más recientes, con
// sus 6 últimas sesiones.
function resumenParaPrometheus() {
  const ahora = new Date();
  const datos = estadisticas();
  const lineas = [lineaAhora(ahora)];

  // Quién es: nombre, edad y altura
  const quien = [];
  if (perfil.nombre) {
    quien.push("se llama " + perfil.nombre);
  }
  if (perfil.nacimiento) {
    quien.push("tiene " + edadDe(perfil.nacimiento) + " años");
  }
  if (perfil.altura) {
    quien.push("mide " + perfil.altura + " cm");
  }
  if (quien.length > 0) {
    lineas.push(conMayuscula(enFrase(quien)) + ".");
  }

  // Los hábitos, con las cifras del laboratorio
  lineas.push("");
  if (habitos.length === 0) {
    lineas.push("Hábitos: aún no tiene ninguno.");
  } else {
    lineas.push(
      "Hábitos (hoy lleva " +
        datos.hoy.cumplidos +
        " de " +
        datos.hoy.tocan +
        " de los que tocan; en las cifras, hoy no cuenta: aún hay tiempo):",
    );
    habitos.forEach(function (habito) {
      lineas.push(habitoEnNumeros(habito));
    });

    // Los últimos 30 días frente a los 30 de antes
    const treinta = datos.treinta;
    if (treinta.ahora.contados > 0) {
      let linea =
        "Últimos 30 días: " +
        treinta.ahora.perfectos +
        " días perfectos (todo lo que tocaba) de " +
        treinta.ahora.contados +
        " y " +
        textoPorcentaje(
          porcentaje(treinta.ahora.cumplidos, treinta.ahora.tocan),
        ) +
        " de lo que tocaba";
      if (treinta.antes.contados > 0) {
        linea +=
          ". Los 30 de antes: " +
          treinta.antes.perfectos +
          " de " +
          treinta.antes.contados +
          " y " +
          textoPorcentaje(
            porcentaje(treinta.antes.cumplidos, treinta.antes.tocan),
          );
      }
      lineas.push(linea + ".");
    }

    // Semana a semana y la semana tipo
    if (datos.semanas.length > 0) {
      lineas.push(
        "Semana a semana (lo cumplido de lo que tocaba, por el lunes de cada semana; la última va hasta ayer): " +
          datos.semanas
            .map(function (semana) {
              return (
                fechaCorta(semana.lunes) +
                " " +
                textoPorcentaje(semana.porcentaje)
              );
            })
            .join(", ") +
          ".",
      );
    }
    const dias = datos.dias.filter(function (dia) {
      return dia.porcentaje !== null;
    });
    if (dias.length > 0) {
      lineas.push(
        "Cada día de la semana, en las últimas 8 semanas: " +
          dias
            .map(function (dia) {
              return dia.nombre + " " + textoPorcentaje(dia.porcentaje);
            })
            .join(", ") +
          ".",
      );
    }
  }

  // El peso
  lineas.push("");
  const pesos = datos.peso.pesos;
  if (pesos.length === 0) {
    lineas.push("Peso: aún no ha apuntado ninguno.");
  } else {
    lineas.push(
      "Peso (del más antiguo al más nuevo): " +
        pesos
          .slice(-20)
          .map(function (apunte) {
            return fechaCorta(apunte.fecha) + ": " + textoKilos(apunte.kilos);
          })
          .join("; ") +
        ".",
    );
    if (pesos.length > 1) {
      const primero = datos.peso.primero;
      const ultimo = datos.peso.ultimo;
      const dias = Math.round(
        (new Date(ultimo.fecha + "T00:00") -
          new Date(primero.fecha + "T00:00")) /
          86400000,
      );
      lineas.push(
        "Del primero al último: " +
          textoDiferencia(ultimo.kilos - primero.kilos) +
          " en " +
          textoDias(dias) +
          ".",
      );
    }
  }

  // El sueño: cada noche, con cómo le fue el día
  lineas.push("");
  const noches = nochesRecientes(28);
  if (noches.length === 0) {
    lineas.push("Sueño: aún no ha apuntado ninguna noche.");
  } else {
    lineas.push(
      "Sueño (cada noche va por el día en que se levantó; las de las últimas 4 semanas, de la más antigua a la más nueva):",
    );
    const sinApuntar = [];
    noches.forEach(function (noche) {
      if (noche.minutos === null) {
        sinApuntar.push(fechaCorta(noche.dia));
        return;
      }
      lineas.push(
        "- " +
          fechaConDia(noche.dia) +
          ": de " +
          noche.noche.acostarse +
          " a " +
          noche.noche.levantarse +
          " (" +
          textoHoras(noche.minutos) +
          "), durmió " +
          noche.noche.calidad +
          "; " +
          diaEnTexto(noche.dia),
      );
    });
    if (sinApuntar.length > 0) {
      lineas.push("Noches sin apuntar: " + sinApuntar.join(", ") + ".");
    }
    const semana = datos.sueno.semana;
    const antes = datos.sueno.antes;
    if (semana.media !== null) {
      let linea =
        "Media de los últimos 7 días: " +
        textoHoras(semana.media) +
        " (" +
        textoNoches(semana.noches) +
        ")";
      if (antes.media !== null) {
        linea +=
          "; de los 7 anteriores: " +
          textoHoras(antes.media) +
          " (" +
          textoNoches(antes.noches) +
          ")";
      }
      lineas.push(linea + ".");
    }
  }

  // Los entrenos de las últimas 8 semanas y cuántos cada semana
  lineas.push("");
  const todos = entrenosOrdenados();
  const lunes = lunesDe(ahora);
  const desde = fechaMas(lunes, -49).toLocaleDateString("en-CA");
  const recientes = todos.filter(function (entreno) {
    return entreno.fecha >= desde;
  });
  if (todos.length === 0) {
    lineas.push("Entrenos: aún no ha apuntado ninguno.");
  } else if (recientes.length === 0) {
    lineas.push(
      "Entrenos: ninguno en las últimas 8 semanas (el último, el " +
        fechaLarga(todos[0].fecha) +
        ").",
    );
  } else {
    lineas.push(
      "Entrenos de las últimas 8 semanas (del más reciente al más antiguo; la intensidad va del 1 al 10; cada serie, kilos × repeticiones):",
    );
    recientes.slice(0, 30).forEach(function (entreno) {
      lineas.push(entrenoEnTexto(entreno));
    });
    const semanas = [];
    for (let i = 7; i >= 0; i--) {
      const inicio = fechaMas(lunes, -7 * i);
      const suma = entrenosDeLaSemana(inicio);
      let texto =
        fechaCorta(inicio.toLocaleDateString("en-CA")) + ": " + suma.cuantos;
      if (suma.minutos > 0) {
        texto += " (" + suma.minutos + " min)";
      }
      semanas.push(texto);
    }
    lineas.push(
      "Entrenos por semana (por el lunes de cada semana; la última es esta): " +
        semanas.join(", ") +
        ".",
    );
  }

  // El progreso de cada ejercicio
  const ejercicios = nombresEjercicios().slice(0, 8);
  if (ejercicios.length > 0) {
    lineas.push("");
    lineas.push(
      "Progreso en el gimnasio (la mejor serie de cada sesión: más kilos o, con los mismos kilos, más repeticiones; de la más antigua a la más nueva):",
    );
    ejercicios.forEach(function (nombre) {
      lineas.push(
        "- " +
          nombre +
          ": " +
          historialEjercicio(nombre)
            .slice(-6)
            .map(function (sesion) {
              return fechaCorta(sesion.fecha) + " " + textoSerie(sesion.mejor);
            })
            .join("; "),
      );
    });
  }

  return lineas.join("\n");
}

// La ventana «Lo que ve…»: el resumen que recibe un consejero, tal cual, y
// la casilla para compartirlo o no. La abre «Lo que ve Méntor» o «Lo que ve
// Prometheus», debajo de cada charla (bloque 25).
const ventanaContexto = document.getElementById("ventana-contexto");
const casillaCompartir = document.getElementById("compartir-datos");

// La sala cuya ventana está abierta (salas.mentor o salas.prometheus).
let salaContexto = null;

// Pone en la ventana el nombre del consejero y su resumen (o que no se
// comparte nada).
function mostrarContexto() {
  const sala = salaContexto;
  const compartir = compartirDatos(sala.consejero);
  document.getElementById("contexto-titulo").textContent =
    "Lo que ve " + sala.nombre;
  document.getElementById("contexto-explicacion").textContent =
    "Con cada mensaje, " +
    sala.nombre +
    " recibe este resumen de tus datos de Ergon. Lo prepara la app en el momento; no ve nada más.";
  document.getElementById("compartir-texto").textContent =
    "Compartir mis datos con " + sala.nombre;
  casillaCompartir.checked = compartir;

  const texto = document.getElementById("contexto-texto");
  if (compartir) {
    texto.textContent = sala.resumen();
  } else {
    texto.textContent =
      "No compartes tus datos: " + sala.nombre + " solo ve lo que le escribes.";
  }
}

// Abre la ventana con lo que ve el consejero de una sala.
function abrirContexto(sala) {
  salaContexto = sala;
  mostrarContexto();
  ventanaContexto.showModal();
}

// La casilla: se guarda para ese consejero (y se sincroniza).
casillaCompartir.addEventListener("change", function () {
  ajustesConsejeros[claveCompartir(salaContexto.consejero)] =
    casillaCompartir.checked;
  guardarAjustesConsejeros();
  mostrarContexto();
});

cerrarAlTocarFuera(ventanaContexto);

// ==========================================================================
// 27. PROMETHEUS · ESTADÍSTICAS
// Los números de la pestaña Prometheus. Salen de los mismos datos y de las
// mismas funciones que el resto de la app (racha, constancia, resumen del
// día…), así siempre cuadran con lo que se ve en Hoy y en el mosaico.
// Aquí solo se calcula; el bloque 28 lo dibuja.
// ==========================================================================

// Los días de la semana, de lunes a domingo: el nombre y su abreviatura.
const diasLab = [
  { nombre: "lunes", corto: "Lun" },
  { nombre: "martes", corto: "Mar" },
  { nombre: "miércoles", corto: "Mié" },
  { nombre: "jueves", corto: "Jue" },
  { nombre: "viernes", corto: "Vie" },
  { nombre: "sábado", corto: "Sáb" },
  { nombre: "domingo", corto: "Dom" },
];

// La fecha de unos días antes (número negativo) o después, a las 00:00:
// fechaMas(fecha, -1) es el día anterior.
function fechaMas(fecha, dias) {
  const nueva = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
  );
  nueva.setDate(nueva.getDate() + dias);
  return nueva;
}

// Qué parte de un total es un número, en tanto por ciento y redondeado.
// Si el total es 0 no hay nada que medir: devuelve null.
function porcentaje(parte, total) {
  if (total === 0) {
    return null;
  }
  return Math.round((parte / total) * 100);
}

// Un tanto por ciento para leer: «87 %» (con un espacio que no se parte
// en dos líneas,  ), o «—» si no hay dato.
function textoPorcentaje(valor) {
  if (valor === null) {
    return "—";
  }
  return valor + " %";
}

// Días o semanas en texto: «1 día», «19 días», «1 semana», «3 semanas».
function textoDuracion(cantidad, enSemanas) {
  if (enSemanas) {
    if (cantidad === 1) {
      return "1 semana";
    }
    return cantidad + " semanas";
  }
  return textoDias(cantidad);
}

// Una fecha corta para las gráficas: "2026-10-03" → «3 oct».
function fechaCorta(clave) {
  return new Date(clave + "T00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

// Lo que ha cambiado un peso, con su signo: «−0,7 kg», «+0,4 kg» o «sin
// cambios». Se redondea a una décima (como se apunta).
function textoDiferencia(kilos) {
  const redondo = Math.round(kilos * 10) / 10;
  if (redondo === 0) {
    return "sin cambios";
  }
  // El espacio antes de «kg» no se parte en dos líneas (\u00A0). «−» es el
  // signo menos de verdad (más largo que el guion «-»)
  const texto = textoKilos(Math.abs(redondo)).replace(" ", "\u00A0");
  if (redondo > 0) {
    return "+" + texto;
  }
  return "−" + texto;
}

// Suma unos días seguidos: desde «desde» y durante «dias» días. Hoy no
// cuenta (aún hay tiempo), ni los días en que no tocaba nada. Devuelve lo
// que tocaba, lo cumplido, los días perfectos y los días que contaron.
function sumarDias(desde, dias) {
  const suma = { tocan: 0, cumplidos: 0, perfectos: 0, contados: 0 };

  for (let i = 0; i < dias; i++) {
    const fecha = fechaMas(desde, i);
    if (fecha.toLocaleDateString("en-CA") < hoy) {
      const resumen = resumenDelDia(fecha);
      if (resumen.tocan > 0) {
        suma.tocan += resumen.tocan;
        suma.cumplidos += resumen.cumplidos;
        suma.contados++;
        if (resumen.cumplidos === resumen.tocan) {
          suma.perfectos++;
        }
      }
    }
  }

  return suma;
}

// Los últimos 30 días (sin hoy) y los 30 de antes, para compararlos.
function ultimos30() {
  const ahora = new Date();
  return {
    ahora: sumarDias(fechaMas(ahora, -30), 30),
    antes: sumarDias(fechaMas(ahora, -60), 30),
  };
}

// Las últimas 12 semanas (de lunes a domingo), de la más antigua a la de
// ahora, con lo que tocaba y lo cumplido. La de ahora cuenta hasta ayer y
// va «en curso». No salen las semanas de antes del primer hábito, ni la de
// ahora si aún no tiene ningún día (los lunes).
function semanasRecientes() {
  const semanas = [];
  const esteLunes = lunesDe(new Date());

  for (let i = 11; i >= 0; i--) {
    const lunes = fechaMas(esteLunes, -7 * i);
    const suma = sumarDias(lunes, 7);
    semanas.push({
      lunes: lunes.toLocaleDateString("en-CA"),
      tocan: suma.tocan,
      cumplidos: suma.cumplidos,
      porcentaje: porcentaje(suma.cumplidos, suma.tocan),
      enCurso: i === 0,
    });
  }

  // findIndex busca la primera semana con datos; slice se queda con esa y
  // las siguientes
  const primera = semanas.findIndex(function (semana) {
    return semana.tocan > 0;
  });
  if (primera === -1) {
    return [];
  }
  return semanas.slice(primera).filter(function (semana) {
    return semana.tocan > 0 || !semana.enCurso;
  });
}

// Cada día de la semana (de lunes a domingo) en las últimas 8 semanas, sin
// hoy: lo que tocaba, lo cumplido y el tanto por ciento.
function semanaTipo() {
  const dias = diasLab.map(function (dia) {
    return {
      nombre: dia.nombre,
      corto: dia.corto,
      tocan: 0,
      cumplidos: 0,
    };
  });
  const desde = fechaMas(new Date(), -56);

  for (let i = 0; i < 56; i++) {
    const fecha = fechaMas(desde, i);
    const resumen = resumenDelDia(fecha);
    // getDay() da 0 el domingo; (+ 6) % 7 lo pasa a 0 = lunes … 6 = domingo
    const dia = dias[(fecha.getDay() + 6) % 7];
    dia.tocan += resumen.tocan;
    dia.cumplidos += resumen.cumplidos;
  }

  dias.forEach(function (dia) {
    dia.porcentaje = porcentaje(dia.cumplidos, dia.tocan);
  });
  return dias;
}

// Los días de la semana que mejor van y los que más cuestan (de los que
// tienen datos; si empatan, todos los empatados). Si hay menos de dos
// días con datos o todos van igual, no hay ni mejores ni peores: listas
// vacías.
function mejorYPeorDia(dias) {
  const conDatos = dias.filter(function (dia) {
    return dia.porcentaje !== null;
  });
  const porcentajes = conDatos.map(function (dia) {
    return dia.porcentaje;
  });
  const maximo = Math.max(...porcentajes);
  const minimo = Math.min(...porcentajes);

  if (conDatos.length < 2 || maximo === minimo) {
    return { mejores: [], peores: [] };
  }
  return {
    mejores: conDatos.filter(function (dia) {
      return dia.porcentaje === maximo;
    }),
    peores: conDatos.filter(function (dia) {
      return dia.porcentaje === minimo;
    }),
  };
}

// Unos días de la semana en una frase: «el miércoles» o «el miércoles y el
// domingo».
function losDias(lista) {
  return enFrase(
    lista.map(function (dia) {
      return "el " + dia.nombre;
    }),
  );
}

// La racha más larga de las que siguen vivas: { habito, racha, enSemanas }
// (o null si no hay ninguna). Las de «unas veces por semana» van en
// semanas: para compararlas con las demás, cada semana vale 7 días.
function rachaMasLarga() {
  let mejor = null;

  habitos.forEach(function (habito) {
    const racha = calcularRacha(habito.id);
    const enSemanas = habito.frecuencia === "semanal";
    let enDias = racha;
    if (enSemanas) {
      enDias = racha * 7;
    }
    if (racha > 0 && (!mejor || enDias > mejor.enDias)) {
      mejor = {
        habito: habito,
        racha: racha,
        enSemanas: enSemanas,
        enDias: enDias,
      };
    }
  });

  return mejor;
}

// La mejor racha de los de «unas veces por semana», en semanas: recorre las
// semanas desde la de su inicio. La de ahora suma si ya se ha llegado; si
// aún no, no corta la racha (todavía hay tiempo).
function mejorRachaSemanas(habito) {
  let mejor = 0;
  let seguidas = 0;
  const lunes = lunesDe(new Date(inicioDe(habito) + "T00:00"));
  const esteLunes = lunesDe(new Date()).toLocaleDateString("en-CA");

  while (lunes.toLocaleDateString("en-CA") <= esteLunes) {
    if (semanaCumplida(habito, lunes)) {
      seguidas++;
      mejor = Math.max(mejor, seguidas);
    } else if (lunes.toLocaleDateString("en-CA") !== esteLunes) {
      seguidas = 0;
    }
    lunes.setDate(lunes.getDate() + 7);
  }

  return mejor;
}

// Cuántos días se ha cumplido un hábito desde su inicio hasta hoy (con las
// reglas que tenía cada día). En templanza, los días sin recaer.
function totalCumplidos(habito) {
  let total = 0;
  const fecha = new Date(inicioDe(habito) + "T00:00");

  while (fecha.toLocaleDateString("en-CA") <= hoy) {
    const clave = fecha.toLocaleDateString("en-CA");
    if (estaCumplido(reglasEn(habito, clave), registro[clave] || {})) {
      total++;
    }
    fecha.setDate(fecha.getDate() + 1);
  }

  return total;
}

// Los números de un hábito: su constancia (la misma de Hoy), su racha, su
// récord (la mejor racha) y cuántas veces se ha cumplido en total.
function numerosDe(habito) {
  const datos = constancia(habito);
  const racha = calcularRacha(habito.id);
  const mejorYTotal = mejorRachaYTotal(habito);

  // El récord nunca es menor que la racha de ahora (la de ahora cuenta el
  // comodín; mejorRachaYTotal, no)
  let record = Math.max(mejorYTotal.mejor, racha);
  if (habito.frecuencia === "semanal") {
    record = Math.max(mejorRachaSemanas(habito), racha);
  }

  return {
    porcentaje: porcentaje(datos.cumplidos, datos.posibles),
    cumplidos: datos.cumplidos,
    posibles: datos.posibles,
    enSemanas: datos.enSemanas,
    racha: racha,
    record: record,
    total: totalCumplidos(habito),
  };
}

// Los pesos apuntados, de la fecha más antigua a la más nueva (sort con
// localeCompare ordena los textos "2026-10-03" como fechas), y el primero,
// el penúltimo y el último.
function datosPeso() {
  const pesos = pesosDe()
    .slice()
    .sort(function (a, b) {
      return a.fecha.localeCompare(b.fecha);
    });

  return {
    pesos: pesos,
    primero: pesos[0] || null,
    anterior: pesos[pesos.length - 2] || null,
    ultimo: pesos[pesos.length - 1] || null,
  };
}

// Las noches de los últimos «dias» días (hoy incluido: cada noche va por
// el día en que me levanté), de la más antigua a la más nueva, con los
// minutos dormidos (null si no está apuntada). No salen las del principio
// sin apuntar.
function nochesRecientes(dias) {
  const noches = [];
  for (let i = dias - 1; i >= 0; i--) {
    const dia = fechaMas(new Date(), -i).toLocaleDateString("en-CA");
    const noche = sueno[dia] || null;
    let minutos = null;
    if (noche) {
      minutos = minutosDormidos(noche.acostarse, noche.levantarse);
    }
    noches.push({ dia: dia, noche: noche, minutos: minutos });
  }

  const primera = noches.findIndex(function (noche) {
    return noche.minutos !== null;
  });
  if (primera === -1) {
    return [];
  }
  return noches.slice(primera);
}

// Lo dormido de media en unos días seguidos (desde «desde», durante «dias»
// días): { media (en minutos, o null si no hay ninguna noche), noches }.
function mediaSueno(desde, dias) {
  let total = 0;
  let noches = 0;
  for (let i = 0; i < dias; i++) {
    const dia = fechaMas(desde, i).toLocaleDateString("en-CA");
    const noche = sueno[dia];
    if (noche && dia <= hoy) {
      total += minutosDormidos(noche.acostarse, noche.levantarse);
      noches++;
    }
  }

  let media = null;
  if (noches > 0) {
    media = Math.round(total / noches);
  }
  return { media: media, noches: noches };
}

// Los entrenos de la semana que empieza un lunes: cuántos y cuántos
// minutos en total.
function entrenosDeLaSemana(lunes) {
  const desde = lunes.toLocaleDateString("en-CA");
  const hasta = fechaMas(lunes, 6).toLocaleDateString("en-CA");
  let cuantos = 0;
  let minutos = 0;
  Object.values(entrenos).forEach(function (entreno) {
    if (entreno.fecha >= desde && entreno.fecha <= hasta) {
      cuantos++;
      minutos += entreno.minutos || 0;
    }
  });
  return { cuantos: cuantos, minutos: minutos };
}

// El nombre de un ejercicio, preparado para compararlo con otros: sin
// mayúsculas, sin tildes y sin espacios de más («Press  de Banca» y «press
// de banca» son el mismo).
function claveEjercicio(nombre) {
  return sinTildes(nombre).trim().replace(/\s+/g, " ");
}

// Los ejercicios usados, sin repetir, del más reciente al más antiguo (con
// el nombre tal como se escribió la última vez).
function nombresEjercicios() {
  const vistos = {};
  const nombres = [];
  entrenosOrdenados().forEach(function (entreno) {
    entreno.ejercicios.forEach(function (ejercicio) {
      const clave = claveEjercicio(ejercicio.nombre);
      if (!vistos[clave]) {
        vistos[clave] = true;
        nombres.push(ejercicio.nombre);
      }
    });
  });
  return nombres;
}

// ¿Es la serie «a» mejor que la «b»? Más kilos o, con los mismos kilos,
// más repeticiones (sin kilos cuentan como 0: peso del cuerpo).
function esMejorSerie(a, b) {
  const kilosA = a.kilos || 0;
  const kilosB = b.kilos || 0;
  if (kilosA !== kilosB) {
    return kilosA > kilosB;
  }
  return a.repeticiones > b.repeticiones;
}

// La mejor serie de un ejercicio (null si no tiene series).
function mejorSerie(ejercicio) {
  let mejor = null;
  ejercicio.series.forEach(function (serie) {
    if (!mejor || esMejorSerie(serie, mejor)) {
      mejor = serie;
    }
  });
  return mejor;
}

// Una serie para leer: «80 kg × 6» o, sin kilos, «6 repeticiones».
function textoSerie(serie) {
  if (serie.kilos) {
    return textoKilos(serie.kilos) + " × " + serie.repeticiones;
  }
  return textoRepeticiones(serie.repeticiones);
}

// «1 repetición», «12 repeticiones».
function textoRepeticiones(cantidad) {
  if (cantidad === 1) {
    return "1 repetición";
  }
  return cantidad + " repeticiones";
}

// Cómo ha ido un ejercicio, de la sesión más antigua a la más nueva:
// [{ fecha, mejor: la mejor serie de ese día }]. Si sale dos veces en un
// mismo entreno, cuenta la mejor.
function historialEjercicio(nombre) {
  const clave = claveEjercicio(nombre);
  const sesiones = [];

  entrenosOrdenados()
    .reverse()
    .forEach(function (entreno) {
      let mejor = null;
      entreno.ejercicios.forEach(function (ejercicio) {
        if (claveEjercicio(ejercicio.nombre) === clave) {
          const suya = mejorSerie(ejercicio);
          if (suya && (!mejor || esMejorSerie(suya, mejor))) {
            mejor = suya;
          }
        }
      });
      if (mejor) {
        sesiones.push({ fecha: entreno.fecha, mejor: mejor });
      }
    });

  return sesiones;
}

// La última mejora: en el último entreno de gimnasio, el primer ejercicio
// cuya mejor serie supera a la de la vez anterior. { nombre, ahora, antes }
// o null si no hay ninguna.
function ultimaMejora() {
  const ultimo = entrenosOrdenados().find(function (entreno) {
    return entreno.tipo === "gimnasio" && entreno.ejercicios.length > 0;
  });
  if (!ultimo) {
    return null;
  }

  for (let i = 0; i < ultimo.ejercicios.length; i++) {
    const nombre = ultimo.ejercicios[i].nombre;
    const sesiones = historialEjercicio(nombre);
    const ahora = sesiones[sesiones.length - 1];
    const antes = sesiones[sesiones.length - 2];
    if (
      antes &&
      ahora.fecha === ultimo.fecha &&
      esMejorSerie(ahora.mejor, antes.mejor)
    ) {
      return { nombre: nombre, ahora: ahora.mejor, antes: antes.mejor };
    }
  }
  return null;
}

// Todas las estadísticas juntas (las usan las gráficas y las señales).
function estadisticas() {
  const dias = semanaTipo();
  const ahora = new Date();
  const esteLunes = lunesDe(ahora);
  return {
    hoy: resumenDelDia(ahora),
    treinta: ultimos30(),
    semanas: semanasRecientes(),
    dias: dias,
    extremos: mejorYPeorDia(dias),
    racha: rachaMasLarga(),
    peso: datosPeso(),
    sueno: {
      noches: nochesRecientes(14),
      semana: mediaSueno(fechaMas(ahora, -6), 7),
      antes: mediaSueno(fechaMas(ahora, -13), 7),
    },
    entrenos: {
      estaSemana: entrenosDeLaSemana(esteLunes),
      pasada: entrenosDeLaSemana(fechaMas(esteLunes, -7)),
      lista: entrenosOrdenados(),
    },
    mejora: ultimaMejora(),
  };
}

// Las señales: frases cortas sobre los números, que van pasando arriba del
// laboratorio.
function senalesDe(datos) {
  const lista = [];

  if (habitos.length > 0) {
    if (datos.hoy.tocan === 0) {
      lista.push("Hoy no te toca ninguna disciplina.");
    } else if (datos.hoy.cumplidos === datos.hoy.tocan) {
      lista.push("Hoy lo llevas todo cumplido: día perfecto.");
    } else {
      let disciplinas = " disciplinas.";
      if (datos.hoy.tocan === 1) {
        disciplinas = " disciplina.";
      }
      lista.push(
        "Hoy llevas " +
          datos.hoy.cumplidos +
          " de " +
          datos.hoy.tocan +
          disciplinas,
      );
    }
  }

  if (datos.racha) {
    lista.push(
      "Tu racha más larga: «" +
        datos.racha.habito.nombre +
        "», " +
        textoDuracion(datos.racha.racha, datos.racha.enSemanas) +
        ".",
    );
  }

  const treinta = datos.treinta.ahora;
  if (treinta.contados > 0) {
    lista.push(
      "Constancia de los últimos " +
        textoDias(treinta.contados) +
        ": " +
        textoPorcentaje(porcentaje(treinta.cumplidos, treinta.tocan)) +
        ".",
    );
    lista.push(
      "Días perfectos en los últimos " +
        textoDias(treinta.contados) +
        ": " +
        treinta.perfectos +
        ".",
    );
  }

  const mejores = datos.extremos.mejores;
  const peores = datos.extremos.peores;
  if (mejores.length > 0) {
    let inicio = "Tu mejor día de la semana: ";
    if (mejores.length > 1) {
      inicio = "Tus mejores días de la semana: ";
    }
    lista.push(
      inicio +
        losDias(mejores) +
        " (" +
        textoPorcentaje(mejores[0].porcentaje) +
        ").",
    );

    let peor = "El que más te cuesta: ";
    if (peores.length > 1) {
      peor = "Los que más te cuestan: ";
    }
    lista.push(
      peor +
        losDias(peores) +
        " (" +
        textoPorcentaje(peores[0].porcentaje) +
        ").",
    );
  }

  if (sueno[hoy]) {
    lista.push("Anoche: " + textoNoche(sueno[hoy]) + ".");
  }
  if (datos.sueno.semana.noches >= 2) {
    lista.push(
      "Sueño de la última semana: " +
        textoHoras(datos.sueno.semana.media) +
        " de media (" +
        datos.sueno.semana.noches +
        " noches).",
    );
  }

  const semana = datos.entrenos.estaSemana;
  if (semana.cuantos > 0) {
    let texto = "Esta semana llevas " + semana.cuantos + " entrenos";
    if (semana.cuantos === 1) {
      texto = "Esta semana llevas 1 entreno";
    }
    if (semana.minutos > 0) {
      texto += " (" + semana.minutos + " min)";
    }
    lista.push(texto + ".");
  }

  if (datos.mejora) {
    lista.push(
      datos.mejora.nombre +
        ": " +
        textoSerie(datos.mejora.ahora) +
        ", mejor que la vez anterior (" +
        textoSerie(datos.mejora.antes) +
        ").",
    );
  }

  const peso = datos.peso;
  if (peso.ultimo && peso.anterior) {
    lista.push(
      "Peso: " +
        textoKilos(peso.ultimo.kilos) +
        ", " +
        textoDiferencia(peso.ultimo.kilos - peso.anterior.kilos) +
        " desde el " +
        fechaCorta(peso.anterior.fecha) +
        ".",
    );
  } else if (peso.ultimo) {
    lista.push(
      "Peso: " +
        textoKilos(peso.ultimo.kilos) +
        " (" +
        fechaCorta(peso.ultimo.fecha) +
        ").",
    );
  }

  if (lista.length === 0) {
    lista.push("Apunta tus hábitos unos días y aquí irán saliendo señales.");
  }
  return lista;
}

// ==========================================================================
// 28. PROMETHEUS · EL LABORATORIO
// Dibuja la pestaña Prometheus con los números del bloque 27: el anillo de
// hoy, las cifras, las columnas de cada semana, las barras de la semana
// tipo, el peso, el sueño, los entrenos, el progreso en el gimnasio y cada
// disciplina. Las columnas y los puntos enseñan su dato al pasar por
// encima o al tocarlos, y las gráficas tienen sus datos también en una
// tabla («Ver los datos»). Al final, las dos vistas de la pestaña: los
// datos y hablar con Prometheus (la charla es la del bloque 25). El estilo
// futurista está en style.css, bloque 21.
// ==========================================================================

// El cuadrito con el dato de una columna o de un punto.
const datoLab = document.getElementById("lab-dato");

// Largo de la línea del anillo de hoy: el de una circunferencia de radio 52
// (2 · π · radio).
const largoAnillo = 2 * Math.PI * 52;

// Las señales que van pasando, cuál toca ahora y el temporizador que las
// cambia cada 5 segundos (null si están paradas).
let senales = [];
let senalActual = 0;
let temporizadorSenales = null;

// Enseña el dato de un elemento (su data-dato) en el cuadrito, encima de
// él. Math.max y Math.min lo dejan siempre dentro de la pantalla.
function mostrarDato(elemento) {
  datoLab.textContent = elemento.dataset.dato;
  datoLab.hidden = false;

  const caja = elemento.getBoundingClientRect();
  const ancho = datoLab.offsetWidth;
  let izquierda = caja.left + caja.width / 2 - ancho / 2;
  izquierda = Math.max(8, Math.min(izquierda, window.innerWidth - ancho - 8));

  datoLab.style.left = izquierda + "px";
  datoLab.style.top = caja.top - datoLab.offsetHeight - 8 + "px";
}

// Esconde el cuadrito.
function esconderDato() {
  datoLab.hidden = true;
}

// Prepara un elemento (una columna, un punto) para enseñar su dato: con el
// ratón al pasar por encima, en el móvil al tocarlo y con el teclado al
// llegar a él. aria-label hace que un lector de pantalla lo lea igual.
function conectarDato(elemento, texto) {
  elemento.dataset.dato = texto;
  elemento.setAttribute("aria-label", texto);
  elemento.addEventListener("pointerenter", function () {
    mostrarDato(elemento);
  });
  elemento.addEventListener("click", function () {
    mostrarDato(elemento);
  });
  elemento.addEventListener("focus", function () {
    mostrarDato(elemento);
  });
  elemento.addEventListener("pointerleave", esconderDato);
  elemento.addEventListener("blur", esconderDato);
}

// Al bajar por la pantalla, el cuadrito se quedaría flotando: se esconde.
window.addEventListener("scroll", esconderDato, { passive: true });

// Rellena una tabla: una fila de títulos y una fila por dato. Todo con
// textContent (como texto, nunca como HTML).
function rellenarTabla(tabla, titulos, filas) {
  tabla.innerHTML = "";

  const cabecera = tabla.createTHead().insertRow();
  titulos.forEach(function (titulo) {
    const celda = document.createElement("th");
    celda.textContent = titulo;
    cabecera.append(celda);
  });

  const cuerpo = tabla.createTBody();
  filas.forEach(function (fila) {
    const linea = cuerpo.insertRow();
    fila.forEach(function (dato) {
      linea.insertCell().textContent = dato;
    });
  });
}

// Una línea de la rejilla de una gráfica, a una altura (en %) y con su
// número a la izquierda.
function lineaRejilla(altura, texto) {
  const linea = document.createElement("span");
  linea.classList.add("lab-eje");
  linea.style.bottom = altura + "%";
  const numero = document.createElement("span");
  numero.textContent = texto;
  linea.append(numero);
  return linea;
}

// Un mensaje en lugar de una gráfica («Aún no hay…»).
function sinGrafica(contenedor, texto) {
  contenedor.innerHTML = "";
  contenedor.append(crearParrafo(texto, "lab-nota"));
}

// Hoy: el anillo se llena con lo cumplido (stroke-dashoffset es la parte
// de la línea que queda sin pintar), el tanto por ciento en el centro y, al
// lado, cuántas van y cuáles quedan.
function dibujarHoy(resumen) {
  let parte = 0;
  if (resumen.tocan > 0) {
    parte = resumen.cumplidos / resumen.tocan;
  }

  const relleno = document.getElementById("lab-anillo-relleno");
  relleno.style.strokeDasharray = largoAnillo;
  relleno.style.strokeDashoffset = largoAnillo * (1 - parte);
  // Vacío no se ve (si no, el borde redondo dejaría un punto arriba)
  relleno.classList.toggle("vacio", parte === 0);

  const centro = document.getElementById("lab-hoy-porcentaje");
  const cuenta = document.getElementById("lab-hoy-cuenta");
  const quedan = document.getElementById("lab-hoy-quedan");

  if (resumen.tocan === 0) {
    centro.textContent = "—";
    cuenta.textContent = "Hoy no te toca ninguna disciplina.";
    quedan.textContent = "";
    return;
  }

  centro.textContent = textoPorcentaje(Math.round(parte * 100));
  let disciplinas = " disciplinas cumplidas";
  if (resumen.tocan === 1) {
    disciplinas = " disciplina cumplida";
  }
  cuenta.textContent = resumen.cumplidos + " de " + resumen.tocan + disciplinas;

  // Las que tocan hoy y aún se pueden hacer (sin las de «unas veces por
  // semana», que no tienen día fijo)
  const pendientes = habitos.filter(function (habito) {
    return (
      habito.frecuencia !== "semanal" &&
      tocaEn(habito, new Date()) &&
      !estaCumplido(habito, habitosHoy) &&
      !hoyYaFallado(habito)
    );
  });
  if (pendientes.length === 0) {
    quedan.textContent = "No te queda nada por hoy.";
  } else {
    const nombres = pendientes.map(function (habito) {
      return habito.nombre;
    });
    quedan.textContent = "Te quedan: " + enFrase(nombres) + ".";
  }
}

// Una cifra: su nombre, el número, un detalle y, si lo hay, lo que ha
// cambiado («▲ 3 más…»). sentido: "sube" (a mejor, verde), "baja" (a peor,
// rojo) o "igual" (sin color: así se usa también en el peso, donde subir
// o bajar no es ni bueno ni malo).
function crearCifra(nombre, valor, detalle, cambio, sentido) {
  const cifra = document.createElement("div");
  cifra.classList.add("lab-cifra");
  cifra.append(
    crearParrafo(nombre, "lab-cifra-nombre"),
    crearParrafo(valor, "lab-cifra-valor"),
    crearParrafo(detalle, "lab-cifra-detalle"),
  );
  if (cambio) {
    const linea = crearParrafo(cambio, "lab-cifra-cambio");
    linea.classList.add(sentido);
    cifra.append(linea);
  }
  return cifra;
}

// Lo que ha cambiado una cifra frente a otra anterior, con su flecha:
// { texto, sentido }. singular y plural son la unidad que va detrás del
// número (« punto», « puntos»; en los días perfectos, nada) y «frente»,
// con qué se compara («los 30 días anteriores»).
function cambioFrente(ahora, antes, singular, plural, frente) {
  const diferencia = ahora - antes;
  if (diferencia === 0) {
    return { texto: "= igual que " + frente, sentido: "igual" };
  }

  let unidad = plural;
  if (Math.abs(diferencia) === 1) {
    unidad = singular;
  }
  if (diferencia > 0) {
    return {
      texto: "▲ " + diferencia + unidad + " más que " + frente,
      sentido: "sube",
    };
  }
  return {
    texto: "▼ " + -diferencia + unidad + " menos que " + frente,
    sentido: "baja",
  };
}

// Las seis cifras: días perfectos, constancia, mejor racha, peso, sueño y
// entrenos.
function dibujarCifras(datos) {
  const caja = document.getElementById("lab-cifras");
  caja.innerHTML = "";
  const ahora = datos.treinta.ahora;
  const antes = datos.treinta.antes;

  // 1. Días perfectos (y constancia) de los últimos 30 días; si aún no
  // hay 30, los que haya. Se comparan con los 30 de antes, si los hay
  if (ahora.contados === 0) {
    caja.append(
      crearCifra("Días perfectos", "—", "aún sin días que contar"),
      crearCifra("Constancia", "—", "aún sin días que contar"),
    );
  } else {
    let cambioPerfectos = null;
    let cambioConstancia = null;
    const constanciaAhora = porcentaje(ahora.cumplidos, ahora.tocan);
    if (antes.contados > 0) {
      cambioPerfectos = cambioFrente(
        ahora.perfectos,
        antes.perfectos,
        "",
        "",
        "los 30 días anteriores",
      );
      cambioConstancia = cambioFrente(
        constanciaAhora,
        porcentaje(antes.cumplidos, antes.tocan),
        " punto",
        " puntos",
        "los 30 días anteriores",
      );
    }
    caja.append(
      crearCifra(
        "Días perfectos",
        String(ahora.perfectos),
        "de los últimos " + textoDias(ahora.contados),
        cambioPerfectos && cambioPerfectos.texto,
        cambioPerfectos && cambioPerfectos.sentido,
      ),
      crearCifra(
        "Constancia",
        textoPorcentaje(constanciaAhora),
        "de lo que tocaba, últimos " + textoDias(ahora.contados),
        cambioConstancia && cambioConstancia.texto,
        cambioConstancia && cambioConstancia.sentido,
      ),
    );
  }

  // 2. La racha más larga de las que siguen vivas
  if (datos.racha) {
    caja.append(
      crearCifra(
        "Mejor racha viva",
        textoDuracion(datos.racha.racha, datos.racha.enSemanas),
        datos.racha.habito.nombre,
      ),
    );
  } else {
    caja.append(crearCifra("Mejor racha viva", "—", "aún ninguna"));
  }

  // 3. El último peso y lo que ha cambiado desde el anterior
  const peso = datos.peso;
  if (peso.ultimo) {
    let cambio = null;
    if (peso.anterior) {
      cambio =
        textoDiferencia(peso.ultimo.kilos - peso.anterior.kilos) +
        " desde el " +
        fechaCorta(peso.anterior.fecha);
    }
    caja.append(
      crearCifra(
        "Peso",
        textoKilos(peso.ultimo.kilos),
        "el " + fechaCorta(peso.ultimo.fecha),
        cambio,
        "igual",
      ),
    );
  } else {
    caja.append(crearCifra("Peso", "—", "aún sin apuntar"));
  }

  // 4. El sueño de media en la última semana, frente a la anterior (sin
  // color: dormir más no siempre es mejor)
  const sueno7 = datos.sueno.semana;
  const suenoAntes = datos.sueno.antes;
  if (sueno7.media === null) {
    caja.append(crearCifra("Sueño", "—", "aún sin apuntar"));
  } else {
    let cambio = null;
    if (suenoAntes.media !== null) {
      cambio = cambioFrente(
        sueno7.media,
        suenoAntes.media,
        " min",
        " min",
        "la semana anterior",
      ).texto;
    }
    let noches = " noches";
    if (sueno7.noches === 1) {
      noches = " noche";
    }
    caja.append(
      crearCifra(
        "Sueño",
        textoHoras(sueno7.media),
        "de media, última semana (" + sueno7.noches + noches + ")",
        cambio,
        "igual",
      ),
    );
  }

  // 5. Los entrenos de esta semana, frente a la pasada (también sin color)
  if (datos.entrenos.lista.length === 0) {
    caja.append(crearCifra("Entrenos", "—", "aún sin apuntar"));
    return;
  }
  const semana = datos.entrenos.estaSemana;
  const pasada = datos.entrenos.pasada;
  let detalle = "esta semana";
  if (semana.minutos > 0) {
    detalle = "esta semana, " + semana.minutos + " min";
  }
  let cambioEntrenos = null;
  if (pasada.cuantos > 0 || semana.cuantos > 0) {
    cambioEntrenos = cambioFrente(
      semana.cuantos,
      pasada.cuantos,
      "",
      "",
      "la semana pasada",
    ).texto;
  }
  caja.append(
    crearCifra(
      "Entrenos",
      String(semana.cuantos),
      detalle,
      cambioEntrenos,
      "igual",
    ),
  );
}

// Dibuja una gráfica de columnas (la usan «Semana a semana» y el sueño).
// columnas: [{ altura (en %, de 0 a 100; null si no hay dato), numero (el
// texto de encima: solo se enseña en la última), etiqueta (la de debajo),
// dato (lo que se ve al tocarla), apagada (más clara) }]. rejilla: las
// líneas, [{ altura, texto }]. Si hay más de 7 columnas, las etiquetas de
// debajo van una sí y una no (contando desde la última): si no, no caben.
function dibujarColumnas(contenedor, columnas, rejilla) {
  contenedor.innerHTML = "";

  const grafica = document.createElement("div");
  grafica.classList.add("lab-grafica");
  rejilla.forEach(function (linea) {
    grafica.append(lineaRejilla(linea.altura, linea.texto));
  });

  const fila = document.createElement("div");
  fila.classList.add("lab-columnas-fila");
  const etiquetas = document.createElement("div");
  etiquetas.classList.add("lab-columnas-etiquetas");

  columnas.forEach(function (columna, i) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.classList.add("lab-columna");
    boton.classList.toggle("apagada", Boolean(columna.apagada));

    if (columna.altura !== null) {
      const barra = document.createElement("span");
      barra.classList.add("lab-columna-barra");
      barra.style.height = columna.altura + "%";
      boton.append(barra);

      // El número encima, solo en la última (las demás, al tocarlas)
      if (i === columnas.length - 1 && columna.numero) {
        const numero = document.createElement("span");
        numero.classList.add("lab-columna-valor");
        numero.style.bottom = columna.altura + "%";
        numero.textContent = columna.numero;
        boton.append(numero);
      }
    }

    conectarDato(boton, columna.dato);
    fila.append(boton);

    const etiqueta = document.createElement("span");
    if (columnas.length <= 7 || (columnas.length - 1 - i) % 2 === 0) {
      etiqueta.textContent = columna.etiqueta;
    }
    etiquetas.append(etiqueta);
  });

  grafica.append(fila);
  contenedor.append(grafica, etiquetas);
}

// Semana a semana: una columna por semana, de 0 a 100 %, con la rejilla a
// 0, 50 y 100 %. La de ahora va más clara (está en curso).
function dibujarSemanas(semanas) {
  const contenedor = document.getElementById("lab-semanas");
  const tabla = document.getElementById("lab-semanas-tabla");

  if (semanas.length === 0) {
    sinGrafica(contenedor, "Aún no hay semanas que mostrar.");
    tabla.innerHTML = "";
    return;
  }

  dibujarColumnas(
    contenedor,
    semanas.map(function (semana) {
      let dato =
        nombreSemana(semana.lunes) +
        ": " +
        textoPorcentaje(semana.porcentaje) +
        " (" +
        semana.cumplidos +
        " de " +
        semana.tocan +
        ")";
      if (semana.enCurso) {
        dato += " · en curso, hasta ayer";
      }
      return {
        altura: semana.porcentaje || 0,
        numero: textoPorcentaje(semana.porcentaje),
        etiqueta: fechaCorta(semana.lunes),
        dato: dato,
        apagada: semana.enCurso,
      };
    }),
    [
      { altura: 100, texto: "100 %" },
      { altura: 50, texto: "50 %" },
      { altura: 0, texto: "0 %" },
    ],
  );

  // La misma información, en la tabla de «Ver los datos»
  rellenarTabla(
    tabla,
    ["Semana", "Cumplido", "De lo que tocaba"],
    semanas.map(function (semana) {
      let nombre = "del " + fechaCorta(semana.lunes);
      if (semana.enCurso) {
        nombre += " (en curso)";
      }
      return [
        nombre,
        textoPorcentaje(semana.porcentaje),
        semana.cumplidos + " de " + semana.tocan,
      ];
    }),
  );
}

// Un texto con la primera letra en mayúscula: «noche del…» → «Noche del…».
function conMayuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// El sueño: una columna por noche de las últimas 2 semanas (por el día en
// que me levanté). La altura son las horas; la rejilla marca 0, 8 y el
// tope (10 h, o más si alguna noche pasa de 10). Arriba, la media de la
// última semana y lo de anoche.
function dibujarSueno(datosSueno) {
  const contenedor = document.getElementById("lab-sueno");
  const resumen = document.getElementById("lab-sueno-resumen");
  const tabla = document.getElementById("lab-sueno-tabla");
  const noches = datosSueno.noches;
  document.getElementById("lab-sueno-datos").hidden = noches.length === 0;

  if (noches.length === 0) {
    resumen.textContent =
      "Aún no has apuntado ninguna noche. Apúntala con «+ Sueño» o por la mañana, en Hoy.";
    contenedor.innerHTML = "";
    tabla.innerHTML = "";
    return;
  }

  let texto = "";
  if (datosSueno.semana.media !== null) {
    texto =
      "Media de la última semana: " + textoHoras(datosSueno.semana.media) + ".";
  }
  if (sueno[hoy]) {
    texto += " Anoche: " + textoNoche(sueno[hoy]) + ".";
  }
  resumen.textContent = texto.trim();

  // El tope de la gráfica, en minutos: 10 h o la noche más larga, redondeada
  // a la hora de arriba
  let tope = 10 * 60;
  noches.forEach(function (noche) {
    if (noche.minutos !== null) {
      tope = Math.max(tope, Math.ceil(noche.minutos / 60) * 60);
    }
  });

  dibujarColumnas(
    contenedor,
    noches.map(function (noche) {
      const nombre = conMayuscula(nombreNoche(noche.dia));
      if (noche.minutos === null) {
        return {
          altura: null,
          etiqueta: String(new Date(noche.dia + "T00:00").getDate()),
          dato: nombre + ": sin apuntar",
        };
      }
      return {
        altura: (noche.minutos / tope) * 100,
        numero: textoHorasCorto(noche.minutos),
        etiqueta: String(new Date(noche.dia + "T00:00").getDate()),
        dato:
          nombre +
          ": " +
          textoNoche(noche.noche) +
          " (" +
          noche.noche.acostarse +
          "–" +
          noche.noche.levantarse +
          ")",
      };
    }),
    [
      { altura: 100, texto: tope / 60 + " h" },
      { altura: ((8 * 60) / tope) * 100, texto: "8 h" },
      { altura: 0, texto: "0 h" },
    ],
  );

  rellenarTabla(
    tabla,
    ["Noche", "Me acosté", "Me levanté", "Horas", "Cómo"],
    noches
      .filter(function (noche) {
        return noche.noche !== null;
      })
      .map(function (noche) {
        return [
          "al " + fechaCorta(noche.dia),
          noche.noche.acostarse,
          noche.noche.levantarse,
          textoHoras(noche.minutos),
          noche.noche.calidad,
        ];
      }),
  );
}

// Los entrenos: cuántos van esta semana y los 6 últimos. Al tocar uno, se
// abre su ventana para verlo, cambiarlo o borrarlo.
function dibujarEntrenos(datosEntrenos) {
  const resumen = document.getElementById("lab-entrenos-resumen");
  const lista = document.getElementById("lab-entrenos");
  lista.innerHTML = "";

  if (datosEntrenos.lista.length === 0) {
    resumen.textContent = "Aún no has apuntado ningún entreno.";
    return;
  }

  const semana = datosEntrenos.estaSemana;
  let texto = "Esta semana: " + semana.cuantos + " entrenos";
  if (semana.cuantos === 1) {
    texto = "Esta semana: 1 entreno";
  }
  if (semana.minutos > 0) {
    texto += ", " + semana.minutos + " min";
  }
  resumen.textContent = texto + ".";

  datosEntrenos.lista.slice(0, 6).forEach(function (entreno) {
    const partes = [
      new Date(entreno.fecha + "T00:00").toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    ];
    if (entreno.minutos) {
      partes.push(entreno.minutos + " min");
    }
    partes.push("intensidad " + entreno.intensidad);
    if (entreno.ejercicios.length === 1) {
      partes.push("1 ejercicio");
    } else if (entreno.ejercicios.length > 1) {
      partes.push(entreno.ejercicios.length + " ejercicios");
    }

    const boton = crearBoton("", "lab-entreno", function () {
      abrirVentanaEntreno(entreno.id);
    });
    boton.append(
      crearParrafo(nombreTipo(entreno.tipo), "lab-entreno-tipo"),
      crearParrafo(partes.join(" · "), "lab-entreno-detalle"),
    );
    const fila = document.createElement("li");
    fila.append(boton);
    lista.append(fila);
  });
}

// El ejercicio que se está viendo en «Progreso en el gimnasio» (se
// recuerda al volver a dibujar).
let ejercicioElegido = "";

// Progreso en el gimnasio: para el ejercicio elegido, una línea con la
// mejor serie de cada sesión (los kilos; si nunca lleva kilos, las
// repeticiones) y, arriba, la última frente a la anterior.
function dibujarProgreso() {
  const selector = document.getElementById("lab-ejercicio");
  const resumen = document.getElementById("lab-progreso-resumen");
  const contenedor = document.getElementById("lab-progreso");
  const nombres = nombresEjercicios();
  contenedor.innerHTML = "";
  selector.parentElement.hidden = nombres.length === 0;

  if (nombres.length === 0) {
    resumen.textContent =
      "Cuando apuntes entrenos de gimnasio con ejercicios, aquí verás cómo progresa cada uno.";
    return;
  }

  // Si el elegido ya no existe (o aún no hay ninguno), el más reciente
  const elegido = nombres.find(function (nombre) {
    return claveEjercicio(nombre) === claveEjercicio(ejercicioElegido);
  });
  ejercicioElegido = elegido || nombres[0];

  selector.innerHTML = "";
  nombres.forEach(function (nombre) {
    const opcion = document.createElement("option");
    opcion.value = nombre;
    opcion.textContent = nombre;
    selector.append(opcion);
  });
  selector.value = ejercicioElegido;

  const sesiones = historialEjercicio(ejercicioElegido);
  const ultima = sesiones[sesiones.length - 1];
  if (sesiones.length === 1) {
    resumen.textContent =
      "Una sesión (" +
      fechaCorta(ultima.fecha) +
      "): " +
      textoSerie(ultima.mejor) +
      ". Con la siguiente verás la línea.";
    return;
  }

  const anterior = sesiones[sesiones.length - 2];
  resumen.textContent =
    "Mejor serie el " +
    fechaCorta(ultima.fecha) +
    ": " +
    textoSerie(ultima.mejor) +
    " (la vez anterior, " +
    textoSerie(anterior.mejor) +
    ").";

  // Con kilos, la línea va en kilos; sin kilos nunca, en repeticiones
  const conKilos = sesiones.some(function (sesion) {
    return sesion.mejor.kilos;
  });
  let textoValor = textoRepeticiones;
  let margen = 1;
  if (conKilos) {
    textoValor = textoKilos;
    margen = 2.5;
  }
  dibujarLinea(
    contenedor,
    sesiones.map(function (sesion) {
      let valor = sesion.mejor.repeticiones;
      if (conKilos) {
        valor = sesion.mejor.kilos || 0;
      }
      return {
        fecha: sesion.fecha,
        valor: valor,
        dato: fechaLarga(sesion.fecha) + ": " + textoSerie(sesion.mejor),
      };
    }),
    textoValor,
    margen,
  );
}

// Tu semana tipo: una barra por día de la semana, con su número al final.
// El mejor día (o los mejores, si empatan) va en el color del fuego;
// debajo, una nota con los mejores y los que más cuestan.
function dibujarDias(dias, extremos) {
  const contenedor = document.getElementById("lab-dias");
  const nota = document.getElementById("lab-dias-nota");
  contenedor.innerHTML = "";

  dias.forEach(function (dia) {
    const fila = document.createElement("div");
    fila.classList.add("lab-barra-fila");
    fila.classList.toggle("mejor", extremos.mejores.includes(dia));

    const pista = document.createElement("span");
    pista.classList.add("lab-barra-pista");
    const relleno = document.createElement("span");
    relleno.classList.add("lab-barra-relleno");
    relleno.style.width = (dia.porcentaje || 0) + "%";
    pista.append(relleno);

    fila.append(
      crearParrafo(dia.corto, "lab-barra-dia"),
      pista,
      crearParrafo(textoPorcentaje(dia.porcentaje), "lab-barra-valor"),
    );
    contenedor.append(fila);
  });

  if (extremos.mejores.length > 0) {
    let mejor = "Tu mejor día es ";
    if (extremos.mejores.length > 1) {
      mejor = "Tus mejores días son ";
    }
    let peor = " y el que más te cuesta, ";
    if (extremos.peores.length > 1) {
      peor = " y los que más te cuestan, ";
    }
    nota.textContent =
      mejor + losDias(extremos.mejores) + peor + losDias(extremos.peores) + ".";
  } else {
    nota.textContent =
      "Con unas semanas más de datos verás qué días te cuestan más.";
  }
}

// Dibuja una línea en el tiempo (la usan el peso y el progreso de cada
// ejercicio). puntos: [{ fecha, valor, dato }], de más antiguo a más
// nuevo; cada uno va a la izquierda o a la derecha según su fecha. Debajo
// de la línea, el área sombreada; en cada punto, un botón que enseña su
// dato al tocarlo, y el último con su número (textoValor lo escribe:
// «75,5 kg»). margenMinimo: cuánto deja como poco por encima del máximo y
// por debajo del mínimo, para que la línea no toque los bordes. El dibujo
// es un SVG de 100 × 100 que se estira a todo el ancho
// (preserveAspectRatio "none"); los puntos y los números van encima, en
// HTML, con left y top en %.
function dibujarLinea(contenedor, puntos, textoValor, margenMinimo) {
  contenedor.innerHTML = "";

  // De qué valor a qué valor va la gráfica (nunca por debajo de 0)
  const valores = puntos.map(function (punto) {
    return punto.valor;
  });
  const maximo = Math.max(...valores);
  const minimo = Math.min(...valores);
  const margen = Math.max(margenMinimo, (maximo - minimo) * 0.15);
  const arriba = Math.round((maximo + margen) * 10) / 10;
  const abajo = Math.max(0, Math.round((minimo - margen) * 10) / 10);

  // Las fechas, en milisegundos, para colocar cada punto según su día
  // (|| 1: por si acaso, que nunca se divida entre 0)
  const primero = new Date(puntos[0].fecha + "T00:00").getTime();
  const ultimo = new Date(puntos[puntos.length - 1].fecha + "T00:00").getTime();
  const tiempo = ultimo - primero || 1;

  // Dónde va cada punto, en % del ancho (x) y del alto (y, 0 arriba)
  const sitios = puntos.map(function (punto) {
    const momento = new Date(punto.fecha + "T00:00").getTime();
    return {
      x: ((momento - primero) / tiempo) * 100,
      y: ((arriba - punto.valor) / (arriba - abajo)) * 100,
    };
  });

  // El SVG: el área (la línea y las dos esquinas de abajo) y la línea
  const trazo = sitios
    .map(function (sitio) {
      return sitio.x + "," + sitio.y;
    })
    .join(" ");
  contenedor.innerHTML =
    '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
    '<polygon class="lab-linea-area" points="' +
    trazo +
    ' 100,100 0,100" />' +
    '<polyline class="lab-linea-trazo" points="' +
    trazo +
    '" />' +
    "</svg>";

  contenedor.append(
    lineaRejilla(100, numero(arriba)),
    lineaRejilla(0, numero(abajo)),
  );

  // Un punto por dato; con muchos (más de 15), solo se ve el último, pero
  // todos se pueden tocar
  sitios.forEach(function (sitio, i) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.classList.add("lab-punto");
    if (i === sitios.length - 1) {
      boton.classList.add("ultimo");
    }
    if (sitios.length <= 15 || i === sitios.length - 1) {
      boton.classList.add("visible");
    }
    boton.style.left = sitio.x + "%";
    boton.style.top = sitio.y + "%";
    boton.append(document.createElement("span"));
    conectarDato(boton, puntos[i].dato);
    contenedor.append(boton);
  });

  // El número del último junto a su punto: debajo si la línea llega bajando
  // (así no la tapa) y encima si llega subiendo. Y las fechas de los
  // extremos, debajo de la gráfica
  const fin = puntos[puntos.length - 1];
  const penultimo = puntos[puntos.length - 2];
  const valor = crearParrafo(textoValor(fin.valor), "lab-punto-valor");
  valor.style.top = sitios[sitios.length - 1].y + "%";
  if (fin.valor < penultimo.valor) {
    valor.classList.add("debajo");
  }
  const fechaFinal = crearParrafo(fechaCorta(fin.fecha), "lab-linea-fecha");
  fechaFinal.classList.add("final");
  contenedor.append(
    valor,
    crearParrafo(fechaCorta(puntos[0].fecha), "lab-linea-fecha"),
    fechaFinal,
  );
}

// El peso: el resumen (del primero al último), la tabla de «Ver los datos»
// y, con dos pesos o más, la línea.
function dibujarPeso(peso) {
  const resumen = document.getElementById("lab-peso-resumen");
  const contenedor = document.getElementById("lab-peso");
  const datos = document.getElementById("lab-peso-datos");
  contenedor.innerHTML = "";
  datos.hidden = peso.pesos.length === 0;

  rellenarTabla(
    document.getElementById("lab-peso-tabla"),
    ["Fecha", "Peso", "Cambio"],
    peso.pesos.map(function (apunte, i) {
      let cambio = "—";
      if (i > 0) {
        cambio = textoDiferencia(apunte.kilos - peso.pesos[i - 1].kilos);
      }
      return [fechaCorta(apunte.fecha), textoKilos(apunte.kilos), cambio];
    }),
  );

  if (peso.pesos.length === 0) {
    resumen.textContent = "Aún no has apuntado ningún peso.";
    return;
  }
  if (peso.pesos.length === 1) {
    resumen.textContent =
      "Un peso apuntado: " +
      textoKilos(peso.ultimo.kilos) +
      " el " +
      fechaCorta(peso.ultimo.fecha) +
      ". Apunta otro día para ver la línea.";
    return;
  }

  resumen.textContent =
    "De " +
    textoKilos(peso.primero.kilos) +
    " (" +
    fechaCorta(peso.primero.fecha) +
    ") a " +
    textoKilos(peso.ultimo.kilos) +
    " (" +
    fechaCorta(peso.ultimo.fecha) +
    "): " +
    textoDiferencia(peso.ultimo.kilos - peso.primero.kilos) +
    ".";

  dibujarLinea(
    contenedor,
    peso.pesos.map(function (apunte) {
      return {
        fecha: apunte.fecha,
        valor: apunte.kilos,
        dato: fechaLarga(apunte.fecha) + ": " + textoKilos(apunte.kilos),
      };
    }),
    textoKilos,
    0.5,
  );
}

// Cada disciplina: icono, nombre, constancia (número y barra) y, debajo,
// racha, récord y total.
function dibujarDisciplinas() {
  const lista = document.getElementById("lab-disciplinas");
  lista.innerHTML = "";

  habitos.forEach(function (habito) {
    const datos = numerosDe(habito);
    const fila = document.createElement("li");
    fila.classList.add("lab-disciplina");

    const medidor = document.createElement("div");
    medidor.classList.add("lab-medidor");
    const relleno = document.createElement("span");
    relleno.style.width = (datos.porcentaje || 0) + "%";
    medidor.append(relleno);

    // En templanza, el total son días sin recaer; en los semanales, veces
    let total = "En total: " + textoDias(datos.total);
    if (datos.enSemanas) {
      total = "En total: " + datos.total + " veces";
      if (datos.total === 1) {
        total = "En total: 1 vez";
      }
    }
    const cifras =
      "Racha: " +
      textoDuracion(datos.racha, datos.enSemanas) +
      " · Récord: " +
      textoDuracion(datos.record, datos.enSemanas) +
      " · " +
      total;

    fila.append(
      crearIcono(iconoDe(habito)),
      crearParrafo(habito.nombre, "lab-disciplina-nombre"),
      crearParrafo(textoPorcentaje(datos.porcentaje), "lab-disciplina-cifra"),
      medidor,
      crearParrafo(cifras, "lab-disciplina-detalle"),
    );
    lista.append(fila);
  });
}

// Pone la señal que toca en su caja (con la animación de entrar) y pasa a
// la siguiente; al llegar a la última, vuelve a la primera (% es el resto
// de la división).
function pasarSenal() {
  const caja = document.getElementById("lab-senal");
  caja.innerHTML = "";
  if (senales.length === 0) {
    return;
  }
  if (senalActual >= senales.length) {
    senalActual = 0;
  }

  caja.append(crearParrafo(senales[senalActual], "lab-senal"));
  document.getElementById("lab-senal-cuenta").textContent =
    senalActual + 1 + "/" + senales.length;
  senalActual = (senalActual + 1) % senales.length;
}

// Empiezan a pasar las señales (al entrar en la pestaña), desde la primera.
function iniciarSenales() {
  pararSenales();
  senalActual = 0;
  pasarSenal();
  temporizadorSenales = setInterval(pasarSenal, 5000);
}

// Se paran (al salir de la pestaña).
function pararSenales() {
  clearInterval(temporizadorSenales);
  temporizadorSenales = null;
}

// Dibuja todo el laboratorio. Sin hábitos, las secciones de hábitos se
// esconden y sale el aviso; el peso, el sueño y los entrenos se ven
// siempre.
function mostrarPrometheus() {
  const datos = estadisticas();
  const hayHabitos = habitos.length > 0;

  document.getElementById("lab-vacio").hidden = hayHabitos;
  document.querySelectorAll(".lab-de-habitos").forEach(function (seccion) {
    seccion.hidden = !hayHabitos;
  });

  dibujarHoy(datos.hoy);
  dibujarCifras(datos);
  dibujarSemanas(datos.semanas);
  dibujarDias(datos.dias, datos.extremos);
  dibujarPeso(datos.peso);
  dibujarSueno(datos.sueno);
  dibujarEntrenos(datos.entrenos);
  dibujarProgreso();
  dibujarDisciplinas();
  senales = senalesDe(datos);
}

// Los botones de apuntar, arriba del laboratorio: el sueño (bloque 29), un
// entreno (bloque 30) y el peso (en la ventana del perfil, bloque 19).
// (Los dos primeros, dentro de una función: así no reciben el evento del
// clic como si fuera el día o el entreno que abrir.)
document
  .getElementById("boton-apuntar-sueno")
  .addEventListener("click", function () {
    abrirVentanaSueno();
  });
document
  .getElementById("boton-apuntar-entreno")
  .addEventListener("click", function () {
    abrirVentanaEntreno();
  });
document
  .getElementById("boton-apuntar-peso")
  .addEventListener("click", abrirVentanaPerfil);

// Al elegir otro ejercicio en «Progreso en el gimnasio», su línea.
document
  .getElementById("lab-ejercicio")
  .addEventListener("change", function (evento) {
    ejercicioElegido = evento.target.value;
    dibujarProgreso();
  });

// La vista del laboratorio que se está viendo: "datos" o "charla" (hablar
// con Prometheus). Al abrir la app, los datos; luego se recuerda mientras
// la app sigue abierta.
let vistaLab = "datos";

// Enseña la vista elegida del laboratorio e ilumina su botón (aria-pressed
// le dice al lector de pantalla cuál está pulsado). En la de hablar, la
// charla empieza abajo, en lo último que se ha dicho (bloque 25); las
// señales solo pasan en la de los datos.
function mostrarVistaLab() {
  const enCharla = vistaLab === "charla";
  document.getElementById("lab-vista-datos").hidden = enCharla;
  document.getElementById("lab-vista-charla").hidden = !enCharla;
  document.querySelectorAll(".lab-vista").forEach(function (boton) {
    const activa = boton.dataset.vista === vistaLab;
    boton.classList.toggle("activa", activa);
    boton.setAttribute("aria-pressed", String(activa));
  });
  esconderDato();

  if (enCharla) {
    pararSenales();
    mostrarSala(salas.prometheus);
    irAlFinal();
    enfocarCampoCharla(salas.prometheus);
  } else {
    iniciarSenales();
    window.scrollTo(0, 0);
  }
}

// Los botones «Datos» y «Hablar».
document.querySelectorAll(".lab-vista").forEach(function (boton) {
  boton.addEventListener("click", function () {
    vistaLab = boton.dataset.vista;
    mostrarVistaLab();
  });
});

// ==========================================================================
// 29. PROMETHEUS · APUNTAR EL SUEÑO
// Cada noche se guarda por el día en que me levanté: a qué hora me acosté,
// a qué hora me levanté y cómo dormí. Se apunta en la tarjeta de la mañana
// (bloque 12) o en su ventana («+ Sueño» en Prometheus, o al tocar lo de
// anoche en Hoy), que sirve también para cambiarla o borrarla.
// ==========================================================================

// Cómo se puede dormir: su id (lo que se guarda) y su nombre.
const calidadesSueno = [
  { id: "bien", nombre: "Bien" },
  { id: "regular", nombre: "Regular" },
  { id: "mal", nombre: "Mal" },
];

// Minutos dormidos entre dos horas ("23:40" y "07:30"). Si la de levantarse
// es más temprana que la de acostarse, entre medias pasó la medianoche: se
// suma un día entero (1440 minutos).
function minutosDormidos(acostarse, levantarse) {
  const a = acostarse.split(":");
  const l = levantarse.split(":");
  let minutos =
    Number(l[0]) * 60 + Number(l[1]) - (Number(a[0]) * 60 + Number(a[1]));
  if (minutos <= 0) {
    minutos += 1440;
  }
  return minutos;
}

// Unos minutos en horas: «7 h 50 min», «8 h» o «45 min».
function textoHoras(minutos) {
  const horas = Math.floor(minutos / 60);
  const resto = Math.round(minutos % 60);
  if (horas === 0) {
    return resto + " min";
  }
  if (resto === 0) {
    return horas + " h";
  }
  return horas + " h " + resto + " min";
}

// Lo mismo, más corto (para encima de una columna): «7 h 50» u «8 h».
function textoHorasCorto(minutos) {
  const horas = Math.floor(minutos / 60);
  const resto = Math.round(minutos % 60);
  if (resto === 0) {
    return horas + " h";
  }
  return horas + " h " + String(resto).padStart(2, "0");
}

// Una noche en una frase: «7 h 50 min, dormiste bien».
function textoNoche(noche) {
  return (
    textoHoras(minutosDormidos(noche.acostarse, noche.levantarse)) +
    ", dormiste " +
    noche.calidad
  );
}

// El nombre de una noche por el día en que me levanté: «noche del 15 al 16
// de octubre» (o «del 31 de octubre al 1 de noviembre»).
function nombreNoche(dia) {
  const despues = new Date(dia + "T00:00");
  const antes = fechaMas(despues, -1);
  const mesDespues = despues.toLocaleDateString("es-ES", { month: "long" });
  if (antes.getMonth() === despues.getMonth()) {
    return (
      "noche del " +
      antes.getDate() +
      " al " +
      despues.getDate() +
      " de " +
      mesDespues
    );
  }
  return (
    "noche del " +
    antes.getDate() +
    " de " +
    antes.toLocaleDateString("es-ES", { month: "long" }) +
    " al " +
    despues.getDate() +
    " de " +
    mesDespues
  );
}

// Las horas de siempre: las de la última noche apuntada o, si no hay
// ninguna, las 23:30 y las 7:30.
function horasHabituales() {
  const dias = Object.keys(sueno).sort();
  if (dias.length === 0) {
    return { acostarse: "23:30", levantarse: "07:30" };
  }
  const ultima = sueno[dias[dias.length - 1]];
  return { acostarse: ultima.acostarse, levantarse: ultima.levantarse };
}

// Qué le falta a una noche para poder guardarla ("" si está bien).
function falloSueno(noche) {
  if (!noche.acostarse || !noche.levantarse) {
    return "Pon a qué hora te acostaste y te levantaste.";
  }
  if (!noche.calidad) {
    return "Elige cómo dormiste.";
  }
  if (minutosDormidos(noche.acostarse, noche.levantarse) > 16 * 60) {
    return "Revisa las horas: salen más de 16 horas de sueño.";
  }
  return "";
}

// Piezas de la ventana del sueño.
const ventanaSueno = document.getElementById("ventana-sueno");
const formSueno = document.getElementById("form-sueno");
const campoSuenoDia = document.getElementById("sueno-dia");
const campoAcostarse = document.getElementById("sueno-acostarse");
const campoLevantarse = document.getElementById("sueno-levantarse");
const textoSuenoDuracion = document.getElementById("sueno-duracion");
const errorSueno = document.getElementById("sueno-error");
const botonBorrarSueno = document.getElementById("sueno-eliminar");

// La calidad elegida en la ventana ("" si ninguna).
function calidadElegida() {
  const marcada = formSueno.querySelector('[name="sueno-calidad"]:checked');
  if (marcada) {
    return marcada.value;
  }
  return "";
}

// Debajo de las horas, cuánto salen: «Dormiste 7 h 50 min.»
function mostrarDuracionSueno() {
  if (campoAcostarse.value && campoLevantarse.value) {
    textoSuenoDuracion.textContent =
      "Dormiste " +
      textoHoras(minutosDormidos(campoAcostarse.value, campoLevantarse.value)) +
      ".";
  } else {
    textoSuenoDuracion.textContent = "";
  }
}

// Pone en la ventana la noche de un día: la apuntada o, si aún no lo está,
// las horas de siempre y sin calidad. «Borrar» solo sale si ya existe.
function rellenarVentanaSueno(dia) {
  const noche = sueno[dia];
  const horas = noche || horasHabituales();

  campoSuenoDia.value = dia;
  campoAcostarse.value = horas.acostarse;
  campoLevantarse.value = horas.levantarse;
  formSueno
    .querySelectorAll('[name="sueno-calidad"]')
    .forEach(function (opcion) {
      opcion.checked = Boolean(noche) && opcion.value === noche.calidad;
    });
  botonBorrarSueno.hidden = !noche;
  errorSueno.textContent = "";
  mostrarDuracionSueno();
}

// Abre la ventana con la noche de un día (si no se dice cuál, la de esta
// mañana: el día del ritual, que de madrugada aún es el anterior).
function abrirVentanaSueno(dia) {
  campoSuenoDia.max = hoy;
  rellenarVentanaSueno(dia || diaDelRitual());
  ventanaSueno.showModal();
}

// Al cambiar el día se carga esa noche; al cambiar una hora, la duración.
campoSuenoDia.addEventListener("change", function () {
  if (campoSuenoDia.value) {
    rellenarVentanaSueno(campoSuenoDia.value);
  }
});
campoAcostarse.addEventListener("input", mostrarDuracionSueno);
campoLevantarse.addEventListener("input", mostrarDuracionSueno);

// «Guardar»: comprueba la noche, la guarda y vuelve a dibujar todo.
formSueno.addEventListener("submit", function (evento) {
  evento.preventDefault();
  const dia = campoSuenoDia.value;
  if (!dia || dia > hoy) {
    errorSueno.textContent = "Elige el día en que te levantaste (hoy o antes).";
    return;
  }

  const noche = {
    acostarse: campoAcostarse.value,
    levantarse: campoLevantarse.value,
    calidad: calidadElegida(),
  };
  const fallo = falloSueno(noche);
  if (fallo) {
    errorSueno.textContent = fallo;
    return;
  }

  sueno[dia] = noche;
  guardarSueno(dia);
  ventanaSueno.close();
  actualizarTodo();
});

// «Borrar»: pregunta antes y borra esa noche.
botonBorrarSueno.addEventListener("click", async function () {
  const dia = campoSuenoDia.value;
  const borrar = await preguntar(
    "¿Borrar el sueño de la " + nombreNoche(dia) + "?",
    "Borrar",
    "Cancelar",
  );
  if (!borrar) {
    return;
  }
  delete sueno[dia];
  guardarSueno(dia);
  ventanaSueno.close();
  actualizarTodo();
});

document
  .getElementById("sueno-cancelar")
  .addEventListener("click", function () {
    ventanaSueno.close();
  });

cerrarAlTocarFuera(ventanaSueno);

// ==========================================================================
// 30. PROMETHEUS · APUNTAR LOS ENTRENOS
// Cada entreno guarda el día, el tipo, los minutos, la intensidad (del 1 al
// 10), una nota y, en los de gimnasio, los ejercicios con sus series
// (repeticiones y kilos). Puede marcar también un hábito de casilla (el
// del gimnasio), para no apuntarlo dos veces. Se apunta, se cambia y se
// borra en su ventana («+ Entreno» en Prometheus, o al tocar uno de la
// lista).
// ==========================================================================

// Los tipos de entreno: su id (lo que se guarda) y su nombre.
const tiposEntreno = [
  { id: "gimnasio", nombre: "Gimnasio" },
  { id: "correr", nombre: "Correr" },
  { id: "caminar", nombre: "Caminar" },
  { id: "bici", nombre: "Bici" },
  { id: "nadar", nombre: "Nadar" },
  { id: "deporte", nombre: "Deporte de equipo" },
  { id: "otro", nombre: "Otro" },
];

// El nombre de un tipo: "gimnasio" → «Gimnasio».
function nombreTipo(id) {
  const tipo = tiposEntreno.find(function (t) {
    return t.id === id;
  });
  if (tipo) {
    return tipo.nombre;
  }
  return "Entreno";
}

// Cómo de duro fue, en palabras: 1–3 suave, 4–6 media, 7–8 dura y 9–10 al
// límite.
function textoIntensidad(intensidad) {
  if (intensidad <= 3) {
    return "suave";
  }
  if (intensidad <= 6) {
    return "media";
  }
  if (intensidad <= 8) {
    return "dura";
  }
  return "al límite";
}

// Los entrenos de más nuevo a más antiguo (por día y, el mismo día, por
// cuándo se apuntaron: el id lleva dentro ese momento).
function entrenosOrdenados() {
  return Object.values(entrenos).sort(function (a, b) {
    if (a.fecha !== b.fecha) {
      return b.fecha.localeCompare(a.fecha);
    }
    return b.id.localeCompare(a.id);
  });
}

// Los hábitos que puede marcar un entreno: los de casilla (los antiguos,
// sin «medida», también lo son).
function habitosDeCasilla() {
  return habitos.filter(function (habito) {
    return !habito.medida || habito.medida === "casilla";
  });
}

// Marca un hábito de casilla como hecho un día. El de hoy va a habitosHoy
// (el objeto que usan las fichas de Hoy).
function marcarHabito(id, fecha) {
  if (fecha === hoy) {
    habitosHoy[id] = true;
    guardarRegistro(id);
    return;
  }
  if (!registro[fecha]) {
    registro[fecha] = {};
  }
  registro[fecha][id] = true;
  localStorage.setItem("ergon-registro", JSON.stringify(registro));
  apuntarCambio("registro:" + fecha + ":" + id);
}

// Piezas de la ventana del entreno.
const ventanaEntreno = document.getElementById("ventana-entreno");
const formEntreno = document.getElementById("form-entreno");
const campoEntrenoFecha = document.getElementById("entreno-fecha");
const campoEntrenoTipo = document.getElementById("entreno-tipo");
const campoEntrenoMinutos = document.getElementById("entreno-minutos");
const campoIntensidad = document.getElementById("entreno-intensidad");
const textoIntensidadElegida = document.getElementById(
  "entreno-intensidad-texto",
);
const cajaEjercicios = document.getElementById("entreno-ejercicios");
const listaEjercicios = document.getElementById("entreno-lista-ejercicios");
const botonCopiarEntreno = document.getElementById("entreno-copiar");
const campoEntrenoHabito = document.getElementById("entreno-habito");
const campoEntrenoNota = document.getElementById("entreno-nota");
const errorEntreno = document.getElementById("entreno-error");
const botonBorrarEntreno = document.getElementById("entreno-eliminar");

// El entreno que se está cambiando (su id), o null si es uno nuevo.
let entrenoEditado = null;

// Los ejercicios de la ventana mientras se escriben, como texto:
// [{ nombre, series: [{ repeticiones, kilos }] }]
let ejerciciosVentana = [];

// Un ejercicio vacío, con una serie vacía.
function ejercicioVacio() {
  return { nombre: "", series: [{ repeticiones: "", kilos: "" }] };
}

// Los ejercicios del último entreno de gimnasio (o null si no hay), como
// texto para la ventana. Si se está cambiando un entreno, otro que no sea
// ese.
function ejerciciosDelUltimo() {
  const ultimo = entrenosOrdenados().find(function (entreno) {
    return (
      entreno.tipo === "gimnasio" &&
      entreno.id !== entrenoEditado &&
      entreno.ejercicios.length > 0
    );
  });
  if (!ultimo) {
    return null;
  }
  return ejerciciosComoTexto(ultimo.ejercicios);
}

// Unos ejercicios guardados (con números) pasados a texto, para la ventana.
function ejerciciosComoTexto(ejercicios) {
  return ejercicios.map(function (ejercicio) {
    return {
      nombre: ejercicio.nombre,
      series: ejercicio.series.map(function (serie) {
        let kilos = "";
        if (serie.kilos !== null) {
          kilos = serie.kilos.toLocaleString("es-ES");
        }
        return { repeticiones: String(serie.repeticiones), kilos: kilos };
      }),
    };
  });
}

// Lee de la ventana lo escrito en los ejercicios (antes de volver a
// dibujarlos, para no perder nada).
function leerEjercicios() {
  ejerciciosVentana = [];
  cajaEjercicios.querySelectorAll(".ejercicio").forEach(function (caja) {
    const series = [];
    caja.querySelectorAll(".serie").forEach(function (fila) {
      series.push({
        repeticiones: fila.querySelector(".serie-repeticiones").value,
        kilos: fila.querySelector(".serie-kilos").value,
      });
    });
    ejerciciosVentana.push({
      nombre: caja.querySelector(".ejercicio-nombre").value,
      series: series,
    });
  });
}

// Un campo pequeño para una serie (repeticiones o kilos).
function campoSerie(clase, valor, modo, ejemplo, nombre) {
  const campo = document.createElement("input");
  campo.type = "text";
  campo.classList.add(clase);
  campo.value = valor;
  campo.inputMode = modo;
  campo.placeholder = ejemplo;
  campo.setAttribute("aria-label", nombre);
  return campo;
}

// Dibuja los ejercicios de la ventana: cada uno con su nombre (que sugiere
// los ya usados, con la lista «entreno-lista-ejercicios»), sus series
// (repeticiones × kilos) y los botones para añadir o quitar. Cada botón
// lee primero lo escrito y luego cambia la lista.
function dibujarEjercicios() {
  cajaEjercicios.innerHTML = "";

  ejerciciosVentana.forEach(function (ejercicio, i) {
    const caja = document.createElement("fieldset");
    caja.classList.add("ejercicio");

    const nombre = document.createElement("input");
    nombre.type = "text";
    nombre.classList.add("ejercicio-nombre");
    nombre.value = ejercicio.nombre;
    nombre.maxLength = 40;
    nombre.placeholder = "Ejercicio (p. ej., press de banca)";
    nombre.setAttribute("list", "entreno-lista-ejercicios");
    nombre.setAttribute("aria-label", "Nombre del ejercicio " + (i + 1));

    const quitar = crearBoton("×", "ejercicio-quitar", function () {
      leerEjercicios();
      ejerciciosVentana.splice(i, 1);
      dibujarEjercicios();
    });
    quitar.setAttribute("aria-label", "Quitar este ejercicio");

    const cabecera = document.createElement("div");
    cabecera.classList.add("ejercicio-cabecera");
    cabecera.append(nombre, quitar);

    const series = document.createElement("ol");
    series.classList.add("series");
    ejercicio.series.forEach(function (serie, j) {
      const fila = document.createElement("li");
      fila.classList.add("serie");
      const quitarSerie = crearBoton("×", "serie-quitar", function () {
        leerEjercicios();
        ejerciciosVentana[i].series.splice(j, 1);
        dibujarEjercicios();
      });
      quitarSerie.setAttribute("aria-label", "Quitar la serie " + (j + 1));
      fila.append(
        crearParrafo(String(j + 1), "serie-numero"),
        campoSerie(
          "serie-repeticiones",
          serie.repeticiones,
          "numeric",
          "reps",
          "Repeticiones de la serie " + (j + 1),
        ),
        crearParrafo("×", "serie-por"),
        campoSerie(
          "serie-kilos",
          serie.kilos,
          "decimal",
          "kg",
          "Kilos de la serie " + (j + 1),
        ),
        crearParrafo("kg", "serie-unidad"),
        quitarSerie,
      );
      series.append(fila);
    });

    // «+ Serie» copia la última (lo normal es repetir el mismo peso)
    const nuevaSerie = crearBoton("+ Serie", "serie-nueva", function () {
      leerEjercicios();
      const lista = ejerciciosVentana[i].series;
      const ultima = lista[lista.length - 1] || { repeticiones: "", kilos: "" };
      lista.push({ repeticiones: ultima.repeticiones, kilos: ultima.kilos });
      dibujarEjercicios();
    });

    caja.append(cabecera, series, nuevaSerie);
    cajaEjercicios.append(caja);
  });

  // «Copiar el último entreno» solo si hay uno y aún no se ha escrito nada
  const vacia = ejerciciosVentana.every(function (ejercicio) {
    return ejercicio.nombre.trim() === "";
  });
  botonCopiarEntreno.hidden = !vacia || ejerciciosDelUltimo() === null;
}

// Los ejercicios solo salen en los entrenos de gimnasio.
function mostrarSeccionEjercicios() {
  document.getElementById("entreno-seccion-ejercicios").hidden =
    campoEntrenoTipo.value !== "gimnasio";
}

// La intensidad elegida, en número y en palabras: «7 · dura».
function mostrarIntensidad() {
  textoIntensidadElegida.textContent =
    campoIntensidad.value +
    " · " +
    textoIntensidad(Number(campoIntensidad.value));
}

// Rellena la lista de hábitos que puede marcar el entreno («Ninguno» y los
// de casilla) y deja elegido el que toque.
function rellenarHabitosEntreno(elegido) {
  campoEntrenoHabito.innerHTML = "";
  const ninguno = document.createElement("option");
  ninguno.value = "";
  ninguno.textContent = "Ninguno";
  campoEntrenoHabito.append(ninguno);
  habitosDeCasilla().forEach(function (habito) {
    const opcion = document.createElement("option");
    opcion.value = habito.id;
    opcion.textContent = habito.nombre;
    campoEntrenoHabito.append(opcion);
  });
  campoEntrenoHabito.value = elegido;
}

// Las sugerencias del nombre del ejercicio: los ya usados.
function rellenarNombresEjercicios() {
  listaEjercicios.innerHTML = "";
  nombresEjercicios().forEach(function (nombre) {
    const opcion = document.createElement("option");
    opcion.value = nombre;
    listaEjercicios.append(opcion);
  });
}

// Abre la ventana: con un entreno para cambiarlo (su id) o vacía para uno
// nuevo. El nuevo empieza hoy, del tipo y la intensidad del último, con un
// ejercicio vacío y marcando el hábito del deporte (el de la corona), si
// hay uno de casilla.
function abrirVentanaEntreno(id) {
  const entreno = entrenos[id] || null;
  entrenoEditado = null;
  if (entreno) {
    entrenoEditado = entreno.id;
  }
  const ultimo = entrenosOrdenados()[0];

  campoEntrenoFecha.max = hoy;
  errorEntreno.textContent = "";
  botonBorrarEntreno.hidden = !entreno;
  let titulo = "Entreno nuevo";
  if (entreno) {
    titulo = "Editar entreno";
  }
  document.getElementById("entreno-titulo").textContent = titulo;

  if (entreno) {
    campoEntrenoFecha.value = entreno.fecha;
    campoEntrenoTipo.value = entreno.tipo;
    campoEntrenoMinutos.value = entreno.minutos || "";
    campoIntensidad.value = entreno.intensidad;
    campoEntrenoNota.value = entreno.nota;
    rellenarHabitosEntreno(entreno.habito);
    ejerciciosVentana = ejerciciosComoTexto(entreno.ejercicios);
  } else {
    campoEntrenoFecha.value = hoy;
    campoEntrenoTipo.value = (ultimo && ultimo.tipo) || "gimnasio";
    campoEntrenoMinutos.value = "";
    campoIntensidad.value = (ultimo && ultimo.intensidad) || 6;
    campoEntrenoNota.value = "";
    const deporte = habitosDeCasilla().find(function (habito) {
      return iconoDe(habito) === "corona";
    });
    rellenarHabitosEntreno((deporte && deporte.id) || "");
    ejerciciosVentana = [ejercicioVacio()];
  }

  if (ejerciciosVentana.length === 0) {
    ejerciciosVentana = [ejercicioVacio()];
  }
  rellenarNombresEjercicios();
  mostrarSeccionEjercicios();
  mostrarIntensidad();
  dibujarEjercicios();
  ventanaEntreno.showModal();
}

// Pasa los ejercicios escritos a números y comprueba que estén bien.
// Devuelve { ejercicios } o { fallo }. Se saltan los ejercicios y las
// series que estén vacíos del todo; los kilos se pueden dejar vacíos (con
// el peso del cuerpo: se guardan como null).
function ejerciciosEscritos() {
  const ejercicios = [];

  for (let i = 0; i < ejerciciosVentana.length; i++) {
    const ejercicio = ejerciciosVentana[i];
    const nombre = ejercicio.nombre.trim();
    const series = [];

    for (let j = 0; j < ejercicio.series.length; j++) {
      const serie = ejercicio.series[j];
      const repeticiones = serie.repeticiones.trim();
      const kilos = serie.kilos.trim();
      if (repeticiones === "" && kilos === "") {
        continue;
      }
      const donde =
        "«" + (nombre || "Ejercicio " + (i + 1)) + "», serie " + (j + 1);
      const numeroRepeticiones = leerNumero(repeticiones, false);
      if (
        !Number.isInteger(numeroRepeticiones) ||
        numeroRepeticiones < 1 ||
        numeroRepeticiones > 100
      ) {
        return { fallo: donde + ": las repeticiones van de 1 a 100." };
      }
      let numeroKilos = null;
      if (kilos !== "") {
        numeroKilos = leerNumero(kilos, true);
        if (isNaN(numeroKilos) || numeroKilos < 0 || numeroKilos > 500) {
          return { fallo: donde + ": los kilos van de 0 a 500." };
        }
      }
      series.push({ repeticiones: numeroRepeticiones, kilos: numeroKilos });
    }

    if (nombre === "" && series.length > 0) {
      return { fallo: "Ponle nombre al ejercicio " + (i + 1) + "." };
    }
    if (nombre !== "") {
      ejercicios.push({ nombre: nombre, series: series });
    }
  }

  return { ejercicios: ejercicios };
}

// Al cambiar el tipo, salen o se esconden los ejercicios; al mover la
// intensidad, cambia su número.
campoEntrenoTipo.addEventListener("change", mostrarSeccionEjercicios);
campoIntensidad.addEventListener("input", mostrarIntensidad);

// «+ Ejercicio» añade uno vacío y pone el cursor en su nombre.
document
  .getElementById("entreno-nuevo-ejercicio")
  .addEventListener("click", function () {
    leerEjercicios();
    ejerciciosVentana.push(ejercicioVacio());
    dibujarEjercicios();
    const nombres = cajaEjercicios.querySelectorAll(".ejercicio-nombre");
    nombres[nombres.length - 1].focus();
  });

// «Copiar el último entreno»: pone los ejercicios y las series del último
// entreno de gimnasio, para cambiar solo lo que haya cambiado.
botonCopiarEntreno.addEventListener("click", function () {
  ejerciciosVentana = ejerciciosDelUltimo();
  dibujarEjercicios();
});

// «Guardar»: comprueba todo, guarda el entreno, marca el hábito (si se ha
// elegido uno) y vuelve a dibujar todo.
formEntreno.addEventListener("submit", function (evento) {
  evento.preventDefault();
  leerEjercicios();

  const fecha = campoEntrenoFecha.value;
  if (!fecha || fecha > hoy) {
    errorEntreno.textContent = "Elige el día del entreno (hoy o antes).";
    return;
  }

  let minutos = null;
  if (campoEntrenoMinutos.value.trim() !== "") {
    minutos = leerNumero(campoEntrenoMinutos.value.trim(), false);
    if (!Number.isInteger(minutos) || minutos < 1 || minutos > 600) {
      errorEntreno.textContent =
        "Los minutos van de 1 a 600 (o déjalos vacíos).";
      return;
    }
  }

  let ejercicios = [];
  if (campoEntrenoTipo.value === "gimnasio") {
    const leidos = ejerciciosEscritos();
    if (leidos.fallo) {
      errorEntreno.textContent = leidos.fallo;
      return;
    }
    ejercicios = leidos.ejercicios;
  }

  const id = entrenoEditado || "e" + Date.now();
  entrenos[id] = {
    id: id,
    fecha: fecha,
    tipo: campoEntrenoTipo.value,
    minutos: minutos,
    intensidad: Number(campoIntensidad.value),
    ejercicios: ejercicios,
    nota: campoEntrenoNota.value.trim(),
    habito: campoEntrenoHabito.value,
  };
  guardarEntreno(id);

  if (campoEntrenoHabito.value) {
    marcarHabito(campoEntrenoHabito.value, fecha);
  }

  ventanaEntreno.close();
  actualizarTodo();
});

// «Borrar»: pregunta antes y borra el entreno (el hábito que marcó se
// queda marcado: se puede desmarcar en Hoy).
botonBorrarEntreno.addEventListener("click", async function () {
  const entreno = entrenos[entrenoEditado];
  const borrar = await preguntar(
    "¿Borrar el entreno de " +
      nombreTipo(entreno.tipo).toLowerCase() +
      " del " +
      fechaLarga(entreno.fecha) +
      "?",
    "Borrar",
    "Cancelar",
  );
  if (!borrar) {
    return;
  }
  delete entrenos[entrenoEditado];
  guardarEntreno(entrenoEditado);
  ventanaEntreno.close();
  actualizarTodo();
});

// «Cancelar». Esta ventana no se cierra al tocar fuera: se perdería lo
// escrito por un toque sin querer.
document
  .getElementById("entreno-cancelar")
  .addEventListener("click", function () {
    ventanaEntreno.close();
  });

// ==========================================================================
// 31. BARRA SUPERIOR Y NAVEGACIÓN
// Arriba, el nombre de la pantalla y la fecha. Abajo, los botones:
// Hoy · Mosaico · Méntor · Prometheus · Metas · Archivo.
// ==========================================================================

const pantallas = document.querySelectorAll(".pantalla");
const botonesNavegacion = document.querySelectorAll(".navegacion button");
const tituloPantalla = document.getElementById("titulo-pantalla");

// Pone la fecha de hoy en la barra de arriba, p. ej. «vie, 16 oct».
function mostrarFecha() {
  document.getElementById("fecha-hoy").textContent =
    new Date().toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
}

// Muestra una pantalla, ilumina su botón, pone su nombre en la barra de
// arriba y la recuerda para la próxima vez.
function mostrarPantalla(nombre) {
  pantallas.forEach(function (pantalla) {
    pantalla.hidden = pantalla.dataset.pantalla !== nombre;
  });

  // La conversación con Méntor no tiene botón abajo: su título es este (si
  // la pantalla tiene botón, el bucle de abajo lo cambia)
  tituloPantalla.textContent = "Méntor";

  botonesNavegacion.forEach(function (boton) {
    const esLaActiva = boton.dataset.destino === nombre;
    boton.classList.toggle("activa", esLaActiva);

    // El título de la barra es el texto del botón de la pantalla activa
    if (esLaActiva) {
      tituloPantalla.textContent = boton.textContent;
    }
  });

  // Mientras se habla con Méntor, la barra de abajo se esconde (la clase
  // «conversando» del body lo hace en style.css)
  document.body.classList.toggle("conversando", nombre === "mentor");

  // En Prometheus, toda la app se vuelve el laboratorio: la clase
  // «en-prometheus» del body oscurece el fondo y las barras (style.css,
  // bloque 21), y la franja de la hora del móvil (theme-color) pasa a
  // oscura. Las señales solo van pasando mientras se ven los datos (las
  // pone en marcha mostrarVistaLab, abajo)
  const enPrometheus = nombre === "prometheus";
  document.body.classList.toggle("en-prometheus", enPrometheus);
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute("content", enPrometheus ? "#090C10" : "#F4F1EA");
  esconderDato();
  if (!enPrometheus) {
    pararSenales();
  }

  // La conversación no se recuerda: al volver a abrir la app, se empieza en
  // la pantalla de antes
  if (nombre !== "mentor") {
    localStorage.setItem("ergon-pantalla", nombre);
  }

  // La pestaña Méntor empieza abajo, en lo último que se ha dicho (bloque
  // 25); Prometheus, en la vista que estaba (bloque 28); las demás, arriba
  if (nombre === "charla") {
    mostrarSala(salas.mentor);
    irAlFinal();
    enfocarCampoCharla(salas.mentor);
  } else if (enPrometheus) {
    mostrarVistaLab();
  } else {
    window.scrollTo(0, 0);
  }
}

// Cada botón de la barra abre su pantalla. En el PC la barra se ve también
// durante una conversación con Méntor: si ya hay algo respondido, pregunta
// antes de salir.
botonesNavegacion.forEach(function (boton) {
  boton.addEventListener("click", async function () {
    if (conversacionEmpezada()) {
      const salir = await preguntar(
        conversacionActual.salir,
        "Salir",
        "Seguir",
      );
      if (!salir) {
        return;
      }
      respuestas = {};
    }
    mostrarPantalla(boton.dataset.destino);
  });
});

// ==========================================================================
// 32. APP INSTALABLE (SERVICE WORKER)
// sw.js guarda una copia de la app para poder instalarla y usarla sin conexión.
// ==========================================================================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// ==========================================================================
// 33. INICIO
// Lo que pasa al abrir la app.
// ==========================================================================

// Vuelve a dibujar todo. Se llama cada vez que cambia algo.
function actualizarTodo() {
  mostrarCuenta();
  mostrarCharlas();
  mostrarRituales();
  mostrarRevisionEnHoy();
  mostrarHabitos();
  mostrarHistorial();
  mostrarConstancia();
  mostrarMosaico();
  mostrarPrometheus();
  mostrarMetas();
  mostrarPerfil();
  mostrarRevisiones();
  mostrarAvisoCopia();
}

// Al abrir: dibujar todo y poner la cita y la fecha. La primera vez (sin
// datos), la bienvenida de Méntor; si no, la última pantalla usada.
actualizarTodo();
mostrarCitaDelDia();
mostrarFecha();

if (tocaBienvenida()) {
  abrirConversacion(conversacionBienvenida);
} else {
  mostrarPantalla(localStorage.getItem("ergon-pantalla") || "hoy");
}

// Con la cuenta abierta, sincronizar nada más abrir y, después, revisar los
// avisos de este dispositivo (bloque 23) y cómo van los consejeros (24).
sincronizar().then(revisarAvisos).then(revisarConsejeros);

// En el iPhone, la app puede quedarse abierta de fondo y volver horas
// después. Al volver (visibilitychange): si ya es otro día, se recarga para
// que «hoy» sea hoy; si es el mismo, se vuelven a dibujar los rituales (por
// si ha llegado la noche) y se sincroniza.
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState !== "visible") {
    return;
  }
  if (new Date().toLocaleDateString("en-CA") !== hoy) {
    location.reload();
  } else {
    mostrarRituales();
    mostrarRevisionEnHoy();
    // Por si se ha cambiado algo en otro dispositivo mientras tanto
    sincronizar();
  }
});
