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
//  7. Méntor · Conversación para crear un hábito
//  8. Semana
//  9. Constancia
// 10. Mosaico del mes
// 11. Metas · Tarjetas
// 12. Metas · Ventana de meta
// 13. Copia de seguridad
// 14. Barra superior y navegación
// 15. App instalable (service worker)
// 16. Inicio
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

  // showModal abre el <dialog> encima de todo y oscurece el fondo
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
// reglas de antes si han cambiado.
formHabito.addEventListener("submit", function (evento) {
  evento.preventDefault();
  const habito = habitoEditado;
  const medida = habito.medida || "casilla";

  // Nombre (obligatorio)
  const nombre = campoNombre.value.trim();
  if (nombre === "") {
    return;
  }

  // Frecuencia: los días marcados, como números de getDay()
  const frecuencia = selectFrecuencia.value;
  const dias = [];
  cajaDias.querySelectorAll("input:checked").forEach(function (casilla) {
    dias.push(Number(casilla.value));
  });

  if (frecuencia === "dias" && dias.length === 0) {
    alert("Elige al menos un día.");
    return;
  }

  // Unas veces por semana: de 1 a 6
  const veces = Number(campoVeces.value);
  if (frecuencia === "semanal" && !(veces >= 1 && veces <= 6)) {
    alert("Elige entre 1 y 6 veces por semana.");
    return;
  }

  // Cantidad: el objetivo, mayor que 0
  const objetivo = Number(campoObjetivo.value);
  if (medida === "cantidad" && !(objetivo > 0)) {
    alert("Escribe el objetivo de cada día.");
    return;
  }

  // Templanza: el inicio, nunca futuro
  const inicio = campoInicio.value || inicioDe(habito);
  if (medida === "abstencion" && inicio > hoy) {
    alert("La fecha de inicio no puede ser futura.");
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

// «Eliminar»: borra el hábito después de preguntar.
document
  .getElementById("habito-eliminar")
  .addEventListener("click", function () {
    if (
      confirm(
        "¿Eliminar el hábito «" +
          habitoEditado.nombre +
          "»? Se perderán su racha y sus días apuntados.",
      )
    ) {
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
// 7. MÉNTOR · CONVERSACIÓN PARA CREAR UN HÁBITO
// Méntor pregunta y yo respondo, en burbujas como un chat. Solo pregunta lo
// que toca según lo ya respondido. Todavía no es una IA: sus preguntas
// están escritas aquí abajo, como una lista de datos.
// ==========================================================================

// Las preguntas, en orden. Cada una tiene:
//   clave:    dónde se guarda la respuesta (respuestas.nombre, respuestas.medida…)
//   texto:    lo que dice Méntor (o una función que lo escribe con lo ya respondido)
//   tipo:     cómo se responde: "texto", "numero", "opciones", "dias", "fecha" o "icono"
//   cuando:   (si la tiene) función que dice si hay que hacer esta pregunta
//   opciones: (en las de tipo "opciones") los botones; cada uno puede tener su «cuando»
//   ejemplo:  (en las de escribir) el texto gris del campo
//   vacio:    (en las de escribir) qué se ve si se envía sin escribir nada
//   validar:  (si la tiene) función que devuelve el fallo, o "" si todo está bien
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

// Lo respondido hasta ahora: { nombre: "Leer", medida: "casilla", … }
let respuestas = {};

// Clave de la respuesta que se está cambiando (null si ninguna).
let respuestaEditada = null;

// Temporizador de «Méntor está escribiendo…» (para poder cancelarlo).
let temporizadorMentor = null;

// Busca una pregunta por su clave.
function preguntaDe(clave) {
  return preguntasHabito.find(function (pregunta) {
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
  preguntasHabito.forEach(function (pregunta) {
    const valor = respuestas[pregunta.clave];
    if (valor === undefined) {
      return;
    }

    if (!hayQue(pregunta)) {
      delete respuestas[pregunta.clave];
    } else if (pregunta.tipo === "opciones") {
      const sigueValiendo = pregunta.opciones.some(function (opcion) {
        return opcion.valor === valor && hayQue(opcion);
      });
      if (!sigueValiendo) {
        delete respuestas[pregunta.clave];
      }
    }
  });
}

// Texto de mi respuesta en su burbuja: «Todos los días», «10.000 pasos»…
function textoRespuesta(pregunta, valor) {
  if (pregunta.tipo === "opciones") {
    const opcion = pregunta.opciones.find(function (o) {
      return o.valor === valor;
    });
    return opcion.texto;
  }

  if (pregunta.tipo === "numero") {
    const unidad = respuestas.unidad || "";
    return (valor.toLocaleString("es-ES") + " " + unidad).trim();
  }

  if (pregunta.tipo === "dias") {
    return valor
      .map(function (numero) {
        return letrasDias[numero];
      })
      .join(" · ");
  }

  if (pregunta.tipo === "fecha") {
    if (valor === hoy) {
      return "Desde hoy";
    }
    return (
      "Desde el " +
      new Date(valor + "T00:00").toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }

  if (pregunta.tipo === "icono") {
    return datosIcono(valor).corto;
  }

  if (valor === "" && pregunta.vacio) {
    return pregunta.vacio;
  }
  return valor;
}

// Burbuja de Méntor, a la izquierda.
function burbujaMentor(texto) {
  const burbuja = document.createElement("p");
  burbuja.classList.add("burbuja", "burbuja-mentor");
  burbuja.textContent = texto;
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
  let anterior = null;
  for (let i = 0; i < preguntasHabito.length; i++) {
    const otra = preguntasHabito[i];
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
  salir.addEventListener("click", salirDeMentor);
  fila.append(salir);

  return fila;
}

// La forma de responder a una pregunta: botones, días, iconos o un campo
// para escribir. Si ya estaba respondida (al cambiarla), sale lo de antes.
function crearControles(pregunta) {
  const zona = document.createElement("div");
  zona.classList.add("mentor-respuesta");

  // Aquí sale el fallo si la respuesta no vale
  const error = document.createElement("p");
  error.classList.add("mentor-error");

  const anterior = respuestas[pregunta.clave];

  // Comprueba la respuesta y, si vale, la guarda; si no, explica por qué
  function enviar(valor) {
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

    pregunta.opciones.forEach(function (opcion) {
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

    const listo = document.createElement("button");
    listo.type = "button";
    listo.classList.add("boton-principal");
    listo.textContent = "Listo";
    listo.addEventListener("click", function () {
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
  } else {
    // Texto, número o fecha: un campo para escribir y el botón «Enviar».
    // Va en un <form> para que también se envíe con la tecla Intro.
    const formulario = document.createElement("form");
    formulario.classList.add("mentor-escribir");
    // noValidate: que el navegador no frene el envío por su cuenta (p. ej. con
    // un 0 en el objetivo); así contesta Méntor con su propio mensaje
    formulario.noValidate = true;

    const campo = document.createElement("input");
    if (pregunta.tipo === "numero") {
      campo.type = "number";
      campo.min = "1";
      campo.inputMode = "numeric";
    } else if (pregunta.tipo === "fecha") {
      campo.type = "date";
      campo.max = hoy;
    } else {
      campo.type = "text";
      campo.maxLength = 40;
    }
    campo.placeholder = segunRespuestas(pregunta.ejemplo) || "";

    if (anterior !== undefined) {
      campo.value = anterior;
    } else if (pregunta.tipo === "fecha") {
      campo.value = hoy;
    }

    formulario.append(campo);

    // En el objetivo, la unidad detrás del número: «10000 pasos»
    if (pregunta.tipo === "numero" && respuestas.unidad) {
      const unidad = document.createElement("span");
      unidad.classList.add("mentor-unidad");
      unidad.textContent = respuestas.unidad;
      formulario.append(unidad);
    }

    const boton = document.createElement("button");
    boton.type = "submit";
    boton.classList.add("boton-principal");
    boton.textContent = "Enviar";
    formulario.append(boton);

    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();
      let valor = campo.value.trim();
      if (pregunta.tipo === "numero") {
        valor = Number(valor);
      }
      enviar(valor);
    });

    zona.append(formulario);
  }

  zona.append(error, crearAtrasYSalir(pregunta));
  return zona;
}

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

// El resumen final: cómo queda el hábito y el botón «Crear hábito».
function crearResumen() {
  const zona = document.createElement("div");
  zona.classList.add("mentor-respuesta");
  const habito = habitoDesdeRespuestas();

  // Las líneas del resumen
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

  // La tarjeta: icono y nombre arriba, las líneas debajo
  const tarjeta = document.createElement("div");
  tarjeta.classList.add("mentor-resumen");

  const cabecera = document.createElement("p");
  cabecera.classList.add("mentor-resumen-nombre");
  cabecera.append(crearIcono(habito.icono), habito.nombre);
  tarjeta.append(cabecera);

  lineas.forEach(function (linea) {
    const fila = document.createElement("p");
    fila.textContent = linea;
    tarjeta.append(fila);
  });

  const crear = document.createElement("button");
  crear.type = "button";
  crear.classList.add("boton-principal");
  crear.textContent = "Crear hábito";
  crear.addEventListener("click", crearHabito);

  zona.append(tarjeta, crear, crearAtrasYSalir(null));
  return zona;
}

// Baja la página hasta el final de la conversación.
function bajarAlFinal() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

// Dibuja la conversación: lo ya respondido, en burbujas, y la pregunta que
// toca con su forma de responder (o el resumen, si ya está todo).
// animar: true para que la pregunta nueva salga tras «Méntor está
// escribiendo…» (un instante).
function dibujarConversacion(animar) {
  clearTimeout(temporizadorMentor);
  const conversacion = document.getElementById("conversacion");
  conversacion.innerHTML = "";

  conversacion.append(
    burbujaMentor(
      "Salve. Soy Méntor. Vamos a dar forma a tu nuevo hábito, paso a paso.",
    ),
  );

  // Las preguntas que tocan, en orden, hasta la primera sin responder (o la
  // que se está cambiando)
  let actual = null;
  for (let i = 0; i < preguntasHabito.length; i++) {
    const pregunta = preguntasHabito[i];
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
    mensaje =
      "Así queda tu hábito. Si quieres cambiar algo, toca tu respuesta.";
    controles = crearResumen();
  }

  // Muestra el mensaje y la forma de responder. En el PC, además, deja el
  // cursor en el campo de escribir (en el móvil no: abriría el teclado)
  function mostrarFinal() {
    conversacion.append(burbujaMentor(mensaje), controles);
    bajarAlFinal();
    const campo = controles.querySelector(
      "input:not([type=checkbox]):not([type=radio])",
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
  escribiendo.innerHTML = "<span></span><span></span><span></span>";
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

// Abre la conversación desde cero.
function abrirMentor() {
  respuestas = {};
  respuestaEditada = null;
  mostrarPantalla("mentor");
  dibujarConversacion(true);
}

// «Salir»: vuelve a Hoy (si ya hay algo respondido, pregunta antes).
function salirDeMentor() {
  const hayAlgo = Object.keys(respuestas).length > 0;
  if (hayAlgo && !confirm("¿Salir sin crear el hábito?")) {
    return;
  }
  clearTimeout(temporizadorMentor);
  mostrarPantalla("hoy");
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

// El botón «Nuevo hábito» de Hoy abre la conversación.
document
  .getElementById("boton-nuevo-habito")
  .addEventListener("click", abrirMentor);

// ==========================================================================
// 8. SEMANA
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
// 9. CONSTANCIA
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
// 10. MOSAICO DEL MES
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
// 11. METAS · TARJETAS
// Objetivos divididos en pasos. Las cumplidas pasan a «Laureles», con su
// corona y el día de la victoria.
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

  metas.forEach(function (meta) {
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
        fecha.textContent = new Date(
          meta.victoria + "T00:00",
        ).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
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
}

// ==========================================================================
// 12. METAS · VENTANA DE META
// La misma ventana sirve para crear una meta («Nueva meta») y para editarla
// (el lápiz de cada tarjeta).
// ==========================================================================

// Piezas de la ventana.
const ventanaMeta = document.getElementById("ventana-meta");
const formMeta = document.getElementById("form-meta");
const selectHabito = document.getElementById("meta-habito");
const campoPasos = document.getElementById("meta-pasos");
const botonEliminarMeta = document.getElementById("meta-eliminar");

// La meta que se está editando (null si es una nueva).
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

// Abre la ventana: vacía para una meta nueva (meta = null) o con los datos
// de la meta para editarla. Los pasos van uno por línea.
function abrirVentanaMeta(meta) {
  metaEditada = meta;
  rellenarSelectHabitos();
  formMeta.reset();

  const tituloVentana = document.getElementById("ventana-meta-titulo");
  const botonGuardar = document.getElementById("meta-guardar");
  const editar = meta !== null;

  // «Eliminar» y la nota de los pasos, solo al editar
  botonEliminarMeta.hidden = !editar;
  document.getElementById("meta-nota").hidden = !editar;

  if (!editar) {
    tituloVentana.textContent = "Nueva meta";
    botonGuardar.textContent = "Agregar meta";
  } else {
    tituloVentana.textContent = "Editar meta";
    botonGuardar.textContent = "Guardar";
    document.getElementById("meta-titulo").value = meta.titulo;
    document.getElementById("meta-area").value = meta.area;
    selectHabito.value = meta.habito;
    campoPasos.value = meta.pasos
      .map(function (paso) {
        return paso.texto;
      })
      .join("\n");
  }

  ventanaMeta.showModal();
}

// Al pulsar «Agregar meta» o «Guardar»: cada línea del texto es un paso
// (hace falta al menos uno). Al editar, los pasos que se quedan igual
// conservan si estaban hechos.
formMeta.addEventListener("submit", function (event) {
  event.preventDefault();

  const titulo = document.getElementById("meta-titulo").value.trim();
  const area = document.getElementById("meta-area").value;
  const habito = selectHabito.value;
  const lineas = campoPasos.value.trim().split("\n");

  const pasos = [];
  lineas.forEach(function (linea) {
    const texto = linea.trim();
    if (texto === "") {
      return;
    }

    // ¿Ya existía este paso? Entonces sigue hecho (o sin hacer) como estaba
    let completado = false;
    if (metaEditada) {
      const antiguo = metaEditada.pasos.find(function (paso) {
        return paso.texto === texto;
      });
      if (antiguo) {
        completado = antiguo.completado;
      }
    }
    pasos.push({ texto: texto, completado: completado });
  });

  if (pasos.length === 0) {
    alert("Por favor, añade al menos un paso para la meta.");
    return;
  }

  if (metaEditada) {
    const estabaCumplida = metaCumplida(metaEditada);
    metaEditada.titulo = titulo;
    metaEditada.area = area;
    metaEditada.habito = habito;
    metaEditada.pasos = pasos;
    apuntarVictoria(metaEditada, estabaCumplida);
  } else {
    metas.push({ titulo: titulo, area: area, habito: habito, pasos: pasos });
  }

  guardarMetas();
  mostrarMetas();
  ventanaMeta.close();
});

// «Eliminar»: borra la meta después de preguntar.
botonEliminarMeta.addEventListener("click", function () {
  if (
    confirm(
      "¿Estás seguro de que deseas eliminar la meta «" +
        metaEditada.titulo +
        "»?",
    )
  ) {
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

// El botón «Nueva meta» abre la ventana vacía.
document
  .getElementById("boton-nueva-meta")
  .addEventListener("click", function () {
    abrirVentanaMeta(null);
  });

// ==========================================================================
// 13. COPIA DE SEGURIDAD
// Descargar todos los datos en un archivo y restaurarlos después. Ergon
// recuerda el día de la última copia y avisa si hace una semana o más.
// ==========================================================================

// Datos que entran en la copia.
const claves = ["ergon-registro", "ergon-habitos", "ergon-metas"];

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

      if (
        !confirm(
          "Esto sustituirá tus datos actuales por los de la copia del " +
            copia.fecha +
            ". ¿Continuar?",
        )
      ) {
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
      alert("El archivo no es una copia válida de Ergon.");
    }
  });

// ==========================================================================
// 14. BARRA SUPERIOR Y NAVEGACIÓN
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

// Cada botón de la barra abre su pantalla.
botonesNavegacion.forEach(function (boton) {
  boton.addEventListener("click", function () {
    mostrarPantalla(boton.dataset.destino);
  });
});

// ==========================================================================
// 15. APP INSTALABLE (SERVICE WORKER)
// sw.js guarda una copia de la app para poder instalarla y usarla sin conexión.
// ==========================================================================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// ==========================================================================
// 16. INICIO
// Lo que pasa al abrir la app.
// ==========================================================================

// Vuelve a dibujar todo. Se llama cada vez que cambia algo.
function actualizarTodo() {
  mostrarHabitos();
  mostrarHistorial();
  mostrarConstancia();
  mostrarMosaico();
  mostrarMetas();
  mostrarAvisoCopia();
}

// Al abrir: dibujar todo, poner la cita y la fecha y abrir la última
// pantalla usada.
actualizarTodo();
mostrarCitaDelDia();
mostrarFecha();
mostrarPantalla(localStorage.getItem("ergon-pantalla") || "hoy");
