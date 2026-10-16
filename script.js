// ==========================================================================
// ERGON — script.js
// Toda la lógica de la app. Los datos se guardan solo en este dispositivo.
//
// ÍNDICE
//  1. Datos guardados
//  2. Cita del día
//  3. Hábitos · Reglas, rachas y resumen del día
//  4. Hábitos · Lista de hoy
//  5. Hábitos · Formulario de hábito nuevo
//  6. Semana
//  7. Mosaico del mes
//  8. Metas
//  9. Copia de seguridad
// 10. Navegación entre pantallas
// 11. App instalable (service worker)
// 12. Inicio
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

// Lista de hábitos: { id, nombre, frecuencia, dias, medida, objetivo, unidad }
const habitos = JSON.parse(localStorage.getItem("ergon-habitos")) || [];

// Lista de metas: { titulo, area, habito, pasos: [{ texto, completado }] }
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
// Cada hábito tiene una frecuencia (cuándo toca) y una medida (cómo se cumple).
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

// ¿Hoy ya no tiene remedio? En templanza, si hubo recaída; en los de
// «como mucho», si el número apuntado hoy pasa del máximo.
function hoyYaFallado(habito) {
  const valor = habitosHoy[habito.id];

  if (habito.medida === "abstencion") {
    return valor === "recaida";
  }
  if (habito.medida === "cantidad" && habito.limite === "maximo") {
    return valor > habito.objetivo;
  }
  return false;
}

// Días seguidos cumpliendo un hábito, contando hacia atrás desde hoy.
// Los días de descanso ni suman ni rompen la racha.
function calcularRacha(id) {
  const habito = habitos.find(function (h) {
    return h.id === id;
  });
  if (!habito) {
    return 0;
  }

  let racha = 0;
  const fecha = new Date();
  const inicio = inicioDe(habito);

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

    if (estaCumplido(habito, habitosDia)) {
      racha++;
    } else if (tocaEn(habito, fecha)) {
      break;
    }

    fecha.setDate(fecha.getDate() - 1);
  }

  return racha;
}

// Mejor racha y total de días cumplidos, desde el inicio del hábito hasta hoy.
// Lo usan los hábitos de templanza: una recaída no borra lo conseguido.
function mejorRachaYTotal(habito) {
  let mejor = 0;
  let seguidos = 0;
  let total = 0;
  const fecha = new Date(inicioDe(habito) + "T00:00");

  while (fecha.toLocaleDateString("en-CA") <= hoy) {
    const habitosDia = registro[fecha.toLocaleDateString("en-CA")] || {};

    if (tocaEn(habito, fecha)) {
      if (estaCumplido(habito, habitosDia)) {
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

// Convierte la racha en texto: "", "1 día de racha", "5 días de racha".
function textoRacha(racha) {
  if (racha === 0) {
    return "";
  } else if (racha === 1) {
    return "1 día de racha";
  } else {
    return racha + " días de racha";
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
    if (tocaEn(habito, fecha)) {
      tocan++;
      // Los días que aún no han llegado no cuentan como cumplidos
      if (clave <= hoy && estaCumplido(habito, habitosDia)) {
        cumplidos++;
      }
    }
  });

  return { tocan: tocan, cumplidos: cumplidos };
}

// ==========================================================================
// 4. HÁBITOS · LISTA DE HOY
// Las fichas de la pantalla Hoy.
// ==========================================================================

// Dibuja una ficha por hábito: casilla o campo de cantidad, nombre,
// detalles, racha y botón de borrar.
function mostrarHabitos() {
  const lista = document.getElementById("lista-habitos");
  lista.innerHTML = "";

  // Mensaje si aún no hay hábitos
  if (habitos.length === 0) {
    lista.innerHTML =
      "<li class='sin-habitos'>Aún no tienes ningún hábito. Empieza añadiendo uno.</li>";
  }

  habitos.forEach(function (habito, posicion) {
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

    // Nombre y detalles debajo (días, objetivo y «hoy toca descanso»)
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

    // Racha, con la llama de Prometeo a partir de 7 días
    const dias = calcularRacha(habito.id);
    const racha = document.createElement("span");
    racha.classList.add("racha");
    racha.textContent = textoRacha(dias);

    if (dias >= 7) {
      const llama = document.createElement("span");
      llama.classList.add("llama");
      if (dias >= 30) {
        llama.classList.add("llama-grande");
      }
      llama.title = "La llama de Prometeo: " + dias + " días seguidos";
      llama.innerHTML =
        '<svg viewBox="0 0 24 32"><use href="#llama"></use></svg>';
      racha.prepend(llama);
    }

    // Botón × para borrar el hábito
    const botonEliminar = document.createElement("button");
    botonEliminar.classList.add("habito-eliminar");
    botonEliminar.textContent = "×";
    botonEliminar.title = "Eliminar hábito";

    botonEliminar.addEventListener("click", function () {
      if (confirm("¿Eliminar el hábito «" + habito.nombre + "»?")) {
        habitos.splice(posicion, 1);
        guardarHabitos();
        actualizarTodo();
      }
    });

    // Montar la ficha: el campo de cantidad va a la derecha; la casilla, a la
    // izquierda. El botón de recaída va fuera de la etiqueta: dentro, tocar el
    // nombre lo pulsaría sin querer.
    if (habito.medida === "cantidad") {
      etiqueta.append(nombre, racha, control);
      item.append(etiqueta, botonEliminar);
    } else if (habito.medida === "abstencion") {
      etiqueta.append(nombre, racha);
      item.append(etiqueta, control, botonEliminar);
    } else {
      etiqueta.append(control, nombre, racha);
      item.append(etiqueta, botonEliminar);
    }
    lista.append(item);
  });
}

// ==========================================================================
// 5. HÁBITOS · FORMULARIO DE HÁBITO NUEVO
// Nombre, cuándo toca (frecuencia) y cómo se cumple (medida).
// ==========================================================================

// Piezas del formulario.
const formHabito = document.getElementById("form-habito");
const selectFrecuencia = document.getElementById("habito-frecuencia");
const cajaDias = document.getElementById("habito-dias");
const selectMedida = document.getElementById("habito-medida");
const cajaCantidad = document.getElementById("habito-cantidad");
const cajaTemplanza = document.getElementById("habito-templanza");
const campoInicio = document.getElementById("habito-inicio");

// La fecha de inicio empieza en hoy y no puede ser futura.
campoInicio.value = hoy;
campoInicio.max = hoy;

// Muestra los días solo si se elige «Días concretos».
selectFrecuencia.addEventListener("change", function () {
  cajaDias.hidden = selectFrecuencia.value !== "dias";
});

// Muestra el objetivo solo con «Se cumple con una cantidad» y la fecha de
// inicio solo con «Es algo que quiero dejar».
selectMedida.addEventListener("change", function () {
  cajaCantidad.hidden = selectMedida.value !== "cantidad";
  cajaTemplanza.hidden = selectMedida.value !== "abstencion";
});

// Al pulsar «Añadir hábito»: lee el formulario, comprueba que esté
// completo, crea el hábito y lo guarda.
formHabito.addEventListener("submit", function (evento) {
  evento.preventDefault();

  // Nombre (obligatorio)
  const nombre = document.getElementById("habito-nombre").value.trim();
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

  // Medida: objetivo y unidad, si es por cantidad
  const medida = selectMedida.value;
  const objetivo = Number(document.getElementById("habito-objetivo").value);
  const unidad = document.getElementById("habito-unidad").value.trim();
    const limite = document.getElementById("habito-limite").value;

  if (medida === "cantidad" && objetivo <= 0) {
    alert("Escribe el objetivo de cada día.");
    return;
  }

  // Templanza: desde qué día se cuenta
  const inicio = campoInicio.value || hoy;

  if (medida === "abstencion" && inicio > hoy) {
    alert("La fecha de inicio no puede ser futura.");
    return;
  }

  // Crear el hábito solo con las propiedades que necesita
  const nuevo = {
    id: "h" + Date.now(),
    nombre: nombre,
    frecuencia: frecuencia,
    medida: medida,
    inicio: hoy,
  };

  if (frecuencia === "dias") {
    nuevo.dias = dias;
  }

  if (medida === "cantidad") {
    nuevo.objetivo = objetivo;
    nuevo.unidad = unidad;
        nuevo.limite = limite;
  }

  if (medida === "abstencion") {
    nuevo.inicio = inicio;
  }

  // Guardar, volver a dibujar y dejar el formulario limpio
  habitos.push(nuevo);

  guardarHabitos();
  actualizarTodo();
  formHabito.reset();
  cajaDias.hidden = true;
  cajaCantidad.hidden = true;
  cajaTemplanza.hidden = true;
  campoInicio.value = hoy;
});

// ==========================================================================
// 6. SEMANA
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
// 7. MOSAICO DEL MES
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

// Flechas para ir al mes anterior y al siguiente.
document.getElementById("mes-anterior").addEventListener("click", function () {
  mesVisible.setMonth(mesVisible.getMonth() - 1);
  mostrarMosaico();
});

document.getElementById("mes-siguiente").addEventListener("click", function () {
  mesVisible.setMonth(mesVisible.getMonth() + 1);
  mostrarMosaico();
});

// ==========================================================================
// 8. METAS
// Objetivos divididos en pasos. Las cumplidas pasan a «Laureles».
// ==========================================================================

// Dibuja las metas: las pendientes arriba y las cumplidas en «Laureles»,
// con su corona.
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
    const cumplida = hechos === meta.pasos.length;

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

    const progreso = document.createElement("p");
    progreso.classList.add("meta-progreso");
    if (cumplida) {
      progreso.textContent =
        "Victoria · " + meta.pasos.length + " pasos cumplidos";
    } else {
      progreso.textContent = hechos + " de " + meta.pasos.length + " pasos";
    }

    const vinculo = document.createElement("p");
    vinculo.classList.add("meta-habito");

    if (meta.habito) {
      const racha = calcularRacha(meta.habito);
      let texto = "Impulsada por: " + nombreHabito(meta.habito);
      if (racha === 1) {
        texto = texto + " · 1 día seguido";
      } else if (racha > 1) {
        texto = texto + " · " + racha + " días seguidos";
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
        paso.completado = casillaPaso.checked;
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

    const botonEliminar = document.createElement("button");
    botonEliminar.classList.add("meta-eliminar");
    botonEliminar.textContent = "×";
    botonEliminar.title = "Eliminar meta";

    botonEliminar.addEventListener("click", function () {
      if (
        confirm(
          "¿Estás seguro de que deseas eliminar la meta «" + meta.titulo + "»?",
        )
      ) {
        metas.splice(posicion, 1);
        guardarMetas();
        mostrarMetas();
      }
    });

    tarjeta.appendChild(botonEliminar);

    if (cumplida) {
      const laurel = document.createElement("div");
      laurel.classList.add("laurel");
      laurel.innerHTML =
        '<svg viewBox="0 0 100 100"><use href="#laurel"></use></svg>';
      tarjeta.appendChild(laurel);
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

// Piezas del formulario de metas.
const formMeta = document.getElementById("form-meta");
const selectHabito = document.getElementById("meta-habito");

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

// Al pulsar «Agregar meta»: cada línea del texto es un paso
// (hace falta al menos uno).
formMeta.addEventListener("submit", function (event) {
  event.preventDefault();

  const titulo = document.getElementById("meta-titulo").value.trim();
  const area = document.getElementById("meta-area").value;
  const habito = selectHabito.value;
  const lineas = document.getElementById("meta-pasos").value.trim().split("\n");

  const pasos = [];
  lineas.forEach(function (linea) {
    const texto = linea.trim();
    if (texto !== "") {
      pasos.push({ texto: texto, completado: false });
    }
  });

  if (pasos.length === 0) {
    alert("Por favor, añade al menos un paso para la meta.");
    return;
  }

  metas.push({ titulo: titulo, area: area, habito: habito, pasos: pasos });
  guardarMetas();
  mostrarMetas();
  formMeta.reset();
});

// ==========================================================================
// 9. COPIA DE SEGURIDAD
// Descargar todos los datos en un archivo y restaurarlos después.
// ==========================================================================

// Datos que entran en la copia.
const claves = ["ergon-registro", "ergon-habitos", "ergon-metas"];

// «Descargar copia»: junta los datos en un archivo .json.
document
  .getElementById("boton-exportar")
  .addEventListener("click", function () {
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
    URL.revokeObjectURL(enlace.href);
  });

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

      location.reload();
    } catch (error) {
      alert("El archivo no es una copia válida de Ergon.");
    }
  });

// ==========================================================================
// 10. NAVEGACIÓN ENTRE PANTALLAS
// La barra de abajo: Hoy · Mosaico · Metas · Archivo.
// ==========================================================================

const pantallas = document.querySelectorAll(".pantalla");
const botonesNavegacion = document.querySelectorAll(".navegacion button");

// Muestra una pantalla, ilumina su botón y la recuerda para la próxima vez.
function mostrarPantalla(nombre) {
  pantallas.forEach(function (pantalla) {
    pantalla.hidden = pantalla.dataset.pantalla !== nombre;
  });

  botonesNavegacion.forEach(function (boton) {
    boton.classList.toggle("activa", boton.dataset.destino === nombre);
  });

  localStorage.setItem("ergon-pantalla", nombre);
  window.scrollTo(0, 0);
}

// Cada botón de la barra abre su pantalla.
botonesNavegacion.forEach(function (boton) {
  boton.addEventListener("click", function () {
    mostrarPantalla(boton.dataset.destino);
  });
});

// ==========================================================================
// 11. APP INSTALABLE (SERVICE WORKER)
// sw.js guarda una copia de la app para poder instalarla y usarla sin conexión.
// ==========================================================================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// ==========================================================================
// 12. INICIO
// Lo que pasa al abrir la app.
// ==========================================================================

// Vuelve a dibujar todo. Se llama cada vez que cambia algo.
function actualizarTodo() {
  mostrarHabitos();
  mostrarHistorial();
  mostrarMosaico();
  rellenarSelectHabitos();
  mostrarMetas();
}

// Al abrir: dibujar todo, poner la cita y abrir la última pantalla usada.
actualizarTodo();
mostrarCitaDelDia();
mostrarPantalla(localStorage.getItem("ergon-pantalla") || "hoy");
