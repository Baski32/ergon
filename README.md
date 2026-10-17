# Ergon

> *ἔργον* (érgon): «la obra», lo que uno construye con su trabajo.

**Ergon** es mi app personal de hábitos y metas, con estética de la antigua Grecia y Roma. La estoy programando yo mismo, paso a paso, mientras aprendo desarrollo web.

🔗 **Pruébala:** https://baski32.github.io/ergon/

## Qué hace

- **Hábitos** diarios, de días concretos (por ejemplo, L-X-V), de unas veces por semana (por ejemplo, 3 veces, con la racha en semanas) o por cantidad (por ejemplo, al menos 10.000 pasos o como mucho 300 minutos), con rachas que respetan los días de descanso y la llama de Prometeo.
- **Iconos clásicos** en SVG para cada hábito (corona de olivo, pergamino, ánfora, lira, búho, rama de olivo, luna, dracma, pluma y tintero, columna). Se eligen solos por el nombre del hábito y se pueden cambiar a mano.
- **Méntor**: los hábitos y las metas nuevos se crean conversando con Méntor, que pregunta paso a paso (solo lo que toca) y muestra un resumen antes de crearlos. La primera vez da la bienvenida y pregunta lo básico para el perfil. Y en su pestaña se puede hablar con él con tus palabras: contesta con la IA de Claude, y las conversaciones se guardan y se sincronizan.
- **Rituales**: por la mañana, la intención del día; por la noche, el examen de Séneca (sus tres preguntas, para responderlas en el diario).
- **Revisión semanal** el domingo con Méntor: los datos de la semana, tres preguntas y un propósito que se recuerda toda la semana siguiente.
- **Perfil** opcional (nombre, edad, altura y peso con su historial).
- **Editar hábitos** sin perder la racha: las reglas antiguas se guardan con fecha y los días pasados se siguen juzgando con ellas.
- **Constancia** de los últimos 30 días de cada hábito y **comodín** opcional: un día libre por semana que no rompe la racha.
- **Templanza**: hábitos para dejar algo. Cuentan los días sin hacerlo, con la mejor racha y el total, para que una recaída no borre lo conseguido.
- **Semana** con el símbolo y el color del dios de cada día (☽ ♂ ☿ ♃ ♀ ♄ ☉).
- **Mosaico del mes** sobre pergamino: cada día es una tesela que se colorea según los hábitos cumplidos, y en oro los días perfectos.
- **Metas** divididas en pasos, con barra de progreso, vinculadas a un hábito y editables.
- **Laureles**: las metas cumplidas reciben su corona de laurel y la fecha de la victoria.
- **Cita del día** de filósofos clásicos (Marco Aurelio, Séneca, Epicteto, Aristóteles…), con la obra de la que procede.
- **Copia de seguridad** para descargar y restaurar los datos, con aviso si hace una semana o más de la última.
- **Cuenta y sincronización** (opcional): al entrar con email y contraseña, los datos se guardan también en la nube y son los mismos en el móvil y en el ordenador. Sin conexión, los cambios esperan y se suben al volver.
- **Recordatorios** en el móvil aunque la app esté cerrada: intención de la mañana, hábitos sin marcar, examen de la noche y revisión del domingo, cada uno a su hora y solo si hace falta.
- **Pestañas** con navegación inferior pensada para el móvil y barra lateral en el ordenador.
- **Avisos propios** con el estilo de la app, en lugar de los del navegador.
- **Instalable en el móvil** como una app (PWA) y funciona sin conexión.

Sin cuenta, los datos se guardan solo en el navegador de cada dispositivo. Con cuenta, también en la nube, donde cada usuario solo puede ver los suyos.

## Tecnología

- HTML, CSS y JavaScript, sin librerías.
- `localStorage` para guardar los datos.
- [Supabase](https://supabase.com) para la cuenta y la nube, con `fetch` y sin librerías: base de datos Postgres con seguridad por filas (RLS).
- Recordatorios con Web Push (claves VAPID): una *Edge Function* de Supabase en Deno decide y envía los avisos, y `pg_cron` la llama cada 5 minutos. El SQL y la función están en la carpeta `supabase/`.
- La IA de Claude (su API) a través de otra *Edge Function*, `consejero`: la clave de la API se guarda como secreto en el servidor, nunca en la app, y hay un límite de mensajes al día.
- Dibujos en SVG (laurel, llama, iconos) y animaciones con CSS.
- Ventanas con el elemento `<dialog>` y avisos con promesas (`async` / `await`).
- PWA: `manifest.json` y un *service worker* para instalarla y usarla sin conexión.
- Publicada con GitHub Pages.
- Fuentes: Cinzel y EB Garamond.

## Hoja de ruta

- [x] Tracker de hábitos
- [x] Metas
- [x] Publicación en internet y pestañas
- [x] Instalable en el móvil (PWA)
- [x] Tipos de hábito: días concretos, cantidad y templanza
- [x] Tipos de hábito: X veces por semana
- [x] Iconos clásicos para cada hábito
- [x] Editar hábitos y metas
- [x] Constancia de 30 días, comodín semanal y aviso de copia
- [x] Conversación con Méntor para crear hábitos (sin IA)
- [x] Crear metas con Méntor y avisos propios
- [x] Bienvenida y perfil
- [x] Rituales de mañana y noche y revisión semanal
- [x] Diseño de escritorio
- [x] Sincronización entre dispositivos
- [x] Recordatorios en el móvil
- [x] Hablar con Méntor (Μέντωρ) con la IA de Claude
- [ ] Consejeros que leen mis datos y Prometheus (Προμηθεύς)

## Sobre el proyecto

Ergon nace de un objetivo personal: construir buenos hábitos y tener rumbo, y aprender a programar construyendo la herramienta que me ayuda a conseguirlo.
