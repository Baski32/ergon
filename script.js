// ---------- CITAS ----------

function numeroDelDia() {
    const inicio = new Date(2026, 0, 1);
    const ahora = new Date();
    const hoyMedianoche = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    return Math.round((hoyMedianoche - inicio) / 86400000);
}

async function mostrarCitaDelDia() {
    const texto = document.getElementById("cita-texto");
    const autor = document.getElementById("cita-autor");

    try {
        const respuesta = await fetch("citas.json");
        const citas = await respuesta.json();

        const cita = citas[numeroDelDia() % citas.length];
        texto.textContent = "«" + cita.texto + "»";
        autor.textContent = "— " + cita.autor + ", " + cita.obra;
    }   catch(error) {
        texto.textContent = "«Conócete a ti mismo.»";
        autor.textContent = "— Inscripción del templo de Apolo en Delfos";
    }
}


// ---------- HÁBITOS ----------

const hoy = new Date().toLocaleDateString("en-CA");

const registro = JSON.parse(localStorage.getItem("ergon-registro")) || {};
const habitosHoy = registro[hoy] || {};

const habitos = JSON.parse(localStorage.getItem("ergon-habitos")) || [];

function guardarHabitos() {
    localStorage.setItem("ergon-habitos", JSON.stringify(habitos));
}

function mostrarHabitos() {
    const lista = document.getElementById("lista-habitos");
    lista.innerHTML = "";

    if (habitos.length === 0) {
        lista.innerHTML = "<li class='sin-habitos'>Aún no tienes ningún hábito. Empieza añadiendo uno.</li>";
    }
    
    habitos.forEach(function (habito, posicion) {
        const item = document.createElement("li");
        const etiqueta = document.createElement("label");

        const casilla = document.createElement("input");
        casilla.type = "checkbox";
        casilla.checked = habitosHoy[habito.id] === true;

        const nombre = document.createElement("span");
        nombre.textContent = habito.nombre;

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
            llama.innerHTML = '<svg viewBox="0 0 24 32"><use href="#llama"></use></svg>';
            racha.prepend(llama);
        }

        casilla.addEventListener("change", function () {
            habitosHoy[habito.id] = casilla.checked;
            registro[hoy] = habitosHoy;
            localStorage.setItem("ergon-registro", JSON.stringify(registro));
            actualizarTodo();
        });

        const botonEliminar = document.createElement("button");
        botonEliminar.classList.add("habito-eliminar");
        botonEliminar.textContent = "×";
        botonEliminar.title = "Eliminar hábito";

        botonEliminar.addEventListener("click", function(){
            if (confirm("¿Eliminar el hábito «" + habito.nombre + "»?")) {
                habitos.splice(posicion, 1);
                guardarHabitos();
                actualizarTodo();
            }
        });

        etiqueta.append(casilla, nombre, racha);
        item.append(etiqueta, botonEliminar);
        lista.append(item);
    });
}

const formHabito = document.getElementById("form-habito");

formHabito.addEventListener("submit", function(evento) {
    evento.preventDefault();

    const nombre = document.getElementById("habito-nombre").value.trim();
    if (nombre === "") {
        return;
    }   

    habitos.push({ id: "h" + Date.now(), nombre: nombre});
    guardarHabitos();
    actualizarTodo();
    formHabito.reset();
});

function calcularRacha(nombre) {
    let racha = 0;
    const fecha = new Date();
    
    if (habitosHoy[nombre] !== true) {
        fecha.setDate(fecha.getDate() - 1);
    }

    while (true) {
        const clave = fecha.toLocaleDateString("en-CA");
        const habitosDia = registro[clave];

        if (habitosDia && habitosDia[nombre] === true) {
            racha++;
            fecha.setDate(fecha.getDate() - 1);
        } else {
            break;
        }
    }

    return racha;
}

function textoRacha(racha) {
    if (racha === 0) {
        return "";
    } else if (racha === 1) {
        return "1 día de racha";
    } else {
        return racha + " días de racha";
    }
}

function nombreHabito(id) {
    const habito = habitos.find(function (h) {
        return h.id === id;
    });
    if (habito) {
        return habito.nombre;
    }
    return "un hábito eliminado";
}

const diosesSemana = [
    { simbolo: "☽", dios: "la Luna", color: "#8E9AA6" },
    { simbolo: "♂", dios: "Marte", color: "#A23B2A" },
    { simbolo: "☿", dios: "Mercurio", color: "#5E7C8C" },
    { simbolo: "♃", dios: "Júpiter", color: "#6B4C8A" },
    { simbolo: "♀", dios: "Venus", color: "#3F8A7A" },
    { simbolo: "♄", dios: "Saturno", color: "#55555E" },
    { simbolo: "☉", dios: "el Sol", color: "#C9A23A" }
];

function mostrarHistorial() {
    const contenedor = document.getElementById("semana");
    contenedor.innerHTML = "";

    const lunes = new Date();
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));

    for (let i = 0; i < 7; i++) {
        const fecha = new Date(lunes);
        fecha.setDate(lunes.getDate() + i);
        const clave = fecha.toLocaleDateString("en-CA");
        const habitosDia = registro[clave] || {};

        let cumplidos = 0;
        habitos.forEach(function (habito) {
            if (habitosDia[habito.id] === true) {
                cumplidos++;
            }
        });

        const dia = document.createElement("div");
        dia.classList.add("dia");

        if (habitos.length > 0 && cumplidos === habitos.length) {
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
        nombreDia.textContent = fecha.toLocaleDateString("es-ES", { weekday: "short" });


        const simbolo = document.createElement("span");
        simbolo.classList.add("simbolo-dia");
        simbolo.textContent = diosesSemana[i].simbolo + "\uFE0E";
        simbolo.style.color = diosesSemana[i].color;
        dia.title = "Día de " + diosesSemana[i].dios;

        const marcador = document.createElement("span");
        marcador.textContent = cumplidos + "/" + habitos.length;

        dia.appendChild(simbolo);
        dia.appendChild(nombreDia);
        dia.appendChild(marcador);
        contenedor.appendChild(dia);
    }
}

// ---------- MOSAICO DEL MES ----------

const mesVisible = new  Date();
mesVisible.setDate(1);

function nivelDelDia(clave) {
    const habitosDia = registro[clave] || {};
    if (habitos.length === 0) {
        return 0;
    }

    let cumplidos = 0;
    habitos.forEach(function (habito) {
        if (habitosDia[habito.id] === true) {
            cumplidos++;
        }
    });

    const proporcion = cumplidos / habitos.length;
    if (proporcion === 1) {
        return 3;
    }   else if (proporcion >= 0.5) {
        return 2;
    }   else if (proporcion > 0) {
        return 1;
    }
    return 0;
}

function mostrarMosaico() {
    const contenedor = document.getElementById("mosaico");
    contenedor.innerHTML = "";

    const anio = mesVisible.getFullYear();
    const mes = mesVisible.getMonth();
    document.getElementById("mosaico-titulo").textContent = mesVisible.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    
    const diasDelMes = new Date(anio, mes + 1, 0).getDate();
    const huecos = (new Date(anio, mes, 1).getDay() + 6) % 7;

    for (let i = 0; i < huecos; i++) {
        contenedor.appendChild(document.createElement("span"));
    }

    let perfectos = 0;
    let vividos = 0;

    for (let dia = 1; dia <= diasDelMes; dia++) {
        const fecha = new Date(anio, mes, dia);
        const clave = fecha.toLocaleDateString("en-CA");

        const tesela = document.createElement("span");
        tesela.classList.add("tesela");
        tesela.textContent = dia;
        tesela.title = fecha.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long"});

        if (clave > hoy) {
            tesela.classList.add("futura");
        } else {
            const nivel = nivelDelDia(clave);
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

    document.getElementById("mosaico-resumen").textContent =  perfectos + " de " + vividos + " días con todas tus disciplinas cumplidas";
}

document.getElementById("mes-anterior").addEventListener("click", function() {
    mesVisible.setMonth(mesVisible.getMonth() - 1);
    mostrarMosaico();
});

document.getElementById("mes-siguiente").addEventListener("click", function() {
    mesVisible.setMonth(mesVisible.getMonth() + 1);
    mostrarMosaico();
});




// ---------- METAS ----------


const metas = JSON.parse(localStorage.getItem("ergon-metas")) || [];

function guardarMetas() {
    localStorage.setItem("ergon-metas", JSON.stringify(metas));
}

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
            progreso.textContent = "Victoria · " + meta.pasos.length + " pasos cumplidos";
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
            if (confirm("¿Estás seguro de que deseas eliminar la meta «" + meta.titulo + "»?")) {
                metas.splice(posicion, 1);
                guardarMetas();
                mostrarMetas();
            }
        });

        tarjeta.appendChild(botonEliminar);

        if (cumplida) {
            const laurel = document.createElement("div");
            laurel.classList.add("laurel");
            laurel.innerHTML = '<svg viewBox="0 0 100 100"><use href="#laurel"></use></svg>';
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
        contenedor.innerHTML = "<p class='sin-metas'>No hay metas registradas. Toda gran obra comienza con la primera piedra.</p>";
    } else if (contenedor.children.length === 0) {
        contenedor.innerHTML = "<p class='sin-metas'>Todas tus metas están cumplidas. ¿Cuál será la siguiente?</p>";
    }

    seccionCumplidas.hidden = contenedorCumplidas.children.length === 0;
}

const formMeta = document.getElementById("form-meta");

const selectHabito = document.getElementById("meta-habito");

function rellenarSelectHabitos() {
    selectHabito.innerHTML = "<option value=''>Sin hábito vinculado</option>";

    habitos.forEach(function (habito) {
        const opcion = document.createElement("option");
        opcion.value = habito.id;
        opcion.textContent = habito.nombre;
        selectHabito.appendChild(opcion);
    });
}

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

// ---------- COPIA DE SEGURIDAD ----------

const claves = ["ergon-registro", "ergon-habitos", "ergon-metas"];

document.getElementById("boton-exportar").addEventListener("click", function() {
    const copia = { app: "Ergon", fecha: hoy, datos: {} };

    claves.forEach(function (clave) {
        copia.datos[clave] = JSON.parse(localStorage.getItem(clave));
    });

    const archivo = new Blob([JSON.stringify(copia, null, 2)], { type: "application/json"});
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = "ergon-copia-" + hoy + ".json";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
}); 

document.getElementById("archivo-importar").addEventListener("change", async function (evento) {
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
        
        if (!confirm("Esto sustituirá tus datos actuales por los de la copia del " + copia.fecha + ". ¿Continuar?")) {
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
    } catch(error) {
        alert("El archivo no es una copia válida de Ergon.");
    }
});

// ---------- NAVEGACIÓN ----------

const pantallas = document.querySelectorAll(".pantalla");
const botonesNavegacion = document.querySelectorAll(".navegacion button");

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

botonesNavegacion.forEach(function (boton) {
    boton.addEventListener("click", function () {
        mostrarPantalla(boton.dataset.destino);
    });
});

// ---------- INICIO ----------


function actualizarTodo() {
    mostrarHabitos();
    mostrarHistorial();
    mostrarMosaico();
    rellenarSelectHabitos();
    mostrarMetas();
}

actualizarTodo();
mostrarCitaDelDia();
mostrarPantalla(localStorage.getItem("ergon-pantalla") || "hoy");