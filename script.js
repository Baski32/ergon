// ==========================================================================
// ERGON — script.js
// Toda la lógica de la app. Los datos se guardan solo en este dispositivo.
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
// 21. Barra superior y navegación
// 22. App instalable (service worker)
// 23. Inicio
// ==========================================================================

// ==========================================================================
// 1. DATOS GUARDADOS
// Lo que Ergon guarda en el navegador (localStorage) y las funciones que lo
// guardan. Cada dispositivo (PC, iPhone) tiene sus propios datos.
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

// Guarda la lista de hábitos.
function guardarHabitos() {
  localStorage.setItem("ergon-habitos", JSON.stringify(habitos));
}

// Guarda lo apuntado hoy dentro del registro.
function guardarRegistro() {
  registro[hoy] = habitosHoy;
  localStorage.setItem("ergon-registro", JSON.stringify(registro));
}

// Guarda la lista de metas.
function guardarMetas() {
  localStorage.setItem("ergon-metas", JSON.stringify(metas));
}

// Guarda el perfil.
function guardarPerfil() {
  localStorage.setItem("ergon-perfil", JSON.stringify(perfil));
}

// Guarda los rituales.
function guardarRituales() {
  localStorage.setItem("ergon-rituales", JSON.stringify(rituales));
}

// Guarda las revisiones semanales.
function guardarRevisiones() {
  localStorage.setItem("ergon-revisiones", JSON.stringify(revisiones));
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
        guardarRegistro();
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
        guardarRegistro();
        actualizarTodo();
      });
    } else {
      control = document.createElement("input");
      control.type = "checkbox";
      control.checked = habitosHoy[habito.id] === true;

      control.addEventListener("change", function () {
        habitosHoy[habito.id] = control.checked;
        guardarRegistro();
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
  saludo: [
    "Salve. Soy Méntor, y te acompañaré en Ergon.",
    "Ergon viene del griego ἔργον, «la obra»: lo que uno construye con su trabajo de cada día. Aquí irás levantando la tuya con hábitos, metas y un poco de filosofía.",
  ],
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
// Por la mañana, la intención del día. Por la noche, el examen de Séneca:
// Ergon recuerda sus tres preguntas para responderlas en el diario de papel.
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
  tarjeta.classList.add("ritual");

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
  guardarRituales();
  mostrarRituales();
}

// Dibuja lo que toca según la hora: por la mañana, la tarjeta de la
// intención (o la intención ya escrita); por la noche, el examen (hasta que
// se marca hecho).
function mostrarRituales() {
  const caja = document.getElementById("ritual");

  // Lo que se estaba escribiendo en la intención (al marcar un hábito, todo
  // se vuelve a dibujar y se perdería)
  const campoAnterior = caja.querySelector("input");
  let escrito = "";
  if (campoAnterior) {
    escrito = campoAnterior.value;
  }

  caja.innerHTML = "";
  const dia = diaDelRitual();
  const ritual = rituales[dia] || {};

  if (esDeNoche()) {
    if (!ritual.examen) {
      caja.append(tarjetaNoche(ritual, dia));
    }
  } else if (ritual.intencion === undefined || cambiandoIntencion) {
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
  guardarRevisiones();

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
];

// El día de la última copia se guarda aparte, en «ergon-ultima-copia»: no
// va dentro de la copia porque es de este dispositivo.

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

      location.reload();
    } catch (error) {
      avisar("El archivo no es una copia válida de Ergon.");
    }
  });

// ==========================================================================
// 21. BARRA SUPERIOR Y NAVEGACIÓN
// Arriba, el nombre de la pantalla y la fecha. Abajo, los botones:
// Hoy · Mosaico · Metas · Archivo.
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

  // La conversación no se recuerda: al volver a abrir la app, se empieza en
  // la pantalla de antes
  if (nombre !== "mentor") {
    localStorage.setItem("ergon-pantalla", nombre);
  }
  window.scrollTo(0, 0);
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
// 22. APP INSTALABLE (SERVICE WORKER)
// sw.js guarda una copia de la app para poder instalarla y usarla sin conexión.
// ==========================================================================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// ==========================================================================
// 23. INICIO
// Lo que pasa al abrir la app.
// ==========================================================================

// Vuelve a dibujar todo. Se llama cada vez que cambia algo.
function actualizarTodo() {
  mostrarRituales();
  mostrarRevisionEnHoy();
  mostrarHabitos();
  mostrarHistorial();
  mostrarConstancia();
  mostrarMosaico();
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

// En el iPhone, la app puede quedarse abierta de fondo y volver horas
// después. Al volver (visibilitychange): si ya es otro día, se recarga para
// que «hoy» sea hoy; si es el mismo, se vuelven a dibujar los rituales (por
// si ha llegado la noche).
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState !== "visible") {
    return;
  }
  if (new Date().toLocaleDateString("en-CA") !== hoy) {
    location.reload();
  } else {
    mostrarRituales();
    mostrarRevisionEnHoy();
  }
});
