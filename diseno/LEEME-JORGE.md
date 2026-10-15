# Klumbus · Guía para aplicar el diseño final

Esta guía explica cómo dejar Klumbus con la apariencia final. Va con 6 archivos más.

## 1. Archivos

| Archivo | Para qué sirve |
|---|---|
| `klumbus-estilos.css` | **Fuente de verdad.** Colores, letra, medidas, sombras y todas las piezas: botones, campos, pestañas, tarjetas, asientos, boleto, y también menú lateral, tablas, estados, avisos y ventanas para los paneles. |
| `klumbus-app-movil.html` | Cómo se ve cada pantalla en **celular** (hasta 767 px). Se abre en el navegador sin internet. |
| `klumbus-web-pc.html` | Cómo se ve cada pantalla en **computador** (desde 768 px). |
| `klumbus-logo-fondo-oscuro.svg` | Logo con letras blancas, para el encabezado y el pie de página negros. |
| `klumbus-logo.svg` | Logo con letras oscuras, para fondos claros (correos, PDF del boleto). |
| `klumbus-icono.svg` | Ícono solo, para el favicon y el ícono de la app. |

Si un valor no está en `klumbus-estilos.css`, búscalo en el código de los dos HTML: cada medida está ahí.

## 2. Cómo trabajar

1. Crea la rama `rediseno-final`.
2. Copia los archivos a la carpeta `/diseno` en la raíz del proyecto.
3. Importa `klumbus-estilos.css` de forma global y carga Poppins (las instrucciones están arriba del archivo). Si el proyecto usa Tailwind, al final del archivo está la configuración.
4. Trabaja **una pantalla a la vez**. Al terminar cada una, manda dos capturas (celular y PC) junto al diseño para compararlas. No sigas con la siguiente sin visto bueno.
5. Cambia **solo la apariencia**. No toques la lógica, las APIs, los precios, el cálculo de tasas ni el flujo de compra.

## 3. Orden de las pantallas públicas (tienen diseño)

1. **Inicio (landing):** todas las secciones actuales, en este orden:
   - hero
   - buscador: solo ida / ida y vuelta, origen, destino, fecha, hora de salida, pasajeros
   - tu pasaje en 4 pasos
   - destinos populares
   - terminales aliadas
   - rutas disponibles
   - ¿Por qué Klumbus?
   - footer
2. **Asientos:**
   - Sillas en SVG. La forma está en el CSS.
   - Se ve un piso a la vez, con pestañas.
   - En celular el bus va vertical, con una barra blanca fija abajo.
   - En PC el bus va acostado, con el frente a la izquierda, y el resumen negro a la derecha.
   - **Se elimina la forma redonda del bus.**
3. **Resultados:**
   - tira de fechas con el precio de cada día
   - chips para ordenar
   - tarjetas con línea de tiempo
   - filtros: a la izquierda en PC, en un botón en celular
4. **Datos y pago:**
   - Pasos 1, 2 y 3 en tarjetas.
   - Total y botón Pagar: fijos abajo en celular, en la tarjeta negra a la derecha en PC.
   - Se mantiene la ventana de "Revisa antes de pagar".
5. **Boleto:** parte negra con horas, datos, corte perforado y QR. Botones Descargar y Compartir.
6. **Ingresar y Registro:**
   - Fondo negro y formulario en tarjeta oscura.
   - En PC, a la izquierda, la foto del bus completa, sin recortar.
7. **Bienvenida (solo celular, solo en la primera visita):**
   - El logo se forma con partículas en un canvas y sale el lema.
   - A los 4 segundos pasa sola al Inicio.
   - El código está en `klumbus-app-movil.html` (busca "Logo de partículas").
   - Guarda en el navegador que ya la vio, para no mostrarla otra vez.

## 4. Páginas internas (todavía no tienen diseño dibujado)

Son Mis boletos, Perfil, Panel de cooperativa, Panel de administración, reportes, liquidaciones, configuración y las demás. Se arman **solo** con las piezas de la sección "PÁGINAS INTERNAS" de `klumbus-estilos.css`:

| Pieza | Clase |
|---|---|
| Estructura | `kb-app` = menú lateral negro `kb-sidebar` + contenido `kb-main` sobre fondo gris |
| Opción activa del menú | amarilla con texto negro |
| Título de página | `kb-topbar` |
| Números del día | `kb-stats` / `kb-stat` |
| Listados | `kb-table` dentro de `kb-table-wrap`; los montos van alineados a la derecha |
| Estados | `kb-status--ok` (pagado/activo), `--wait` (pendiente), `--error` (anulado/rechazado), `--off` (inactivo) |
| Búsqueda y filtros | `kb-toolbar` + `kb-search` + `kb-chip` |
| Confirmar acciones | `kb-modal` |
| Guardado o error | `kb-toast` |
| Pestañas de sección | `kb-subnav` |
| Activar / desactivar | `kb-switch` |
| Listas vacías | `kb-empty` |
| Gráficas | negro para la serie principal, amarillo para la comparación. Nunca azul. |

Si una página necesita algo que no existe en el archivo, **pregunta antes de inventarlo**. Lo diseñamos y lo agregamos al CSS para que quede igual en todo el sitio.

## 5. Reglas que no se negocian

- **Cero azul** en todo el sitio: enlaces, radios, checkboxes, focos y gráficas.
- **Amarillo `#FDD514`** solo para la acción principal de cada pantalla, y siempre con texto negro.
- **Letra Poppins** en todo el sitio. Nada en cursiva.
- **Encabezado** siempre negro, con el logo de letras blancas.
- **Esquinas:**
  - tarjetas: 24 px
  - botones y campos: 16 px
  - pestañas: 14 px
- **Campos:** fondo gris sin borde; al escribir, borde negro.
- **Altura mínima:** 54 px en campos y 56 px en botones, para que se puedan tocar con el dedo.
- **Datos de prueba:** quitar todo lo que diga "PRUEBA" en la parte pública.
- **Fotos de destinos:** las nuevas llegan después. Deja el espacio igual al diseño.
- **Corte entre celular y PC:** 768 px. Revisa también 1024 px y 1440 px.

## 6. Si usas Claude Code

Pégale esto dentro del proyecto:

> En /diseno están los archivos del diseño final de Klumbus. Lee primero LEEME-JORGE.md y klumbus-estilos.css. Aplica klumbus-estilos.css de forma global. Ajusta la apariencia de cada pantalla actual para que quede idéntica a klumbus-app-movil.html (celular, hasta 767 px) y klumbus-web-pc.html (PC, desde 768 px): colores, tamaños, radios, sombras y espaciados exactos. No cambies lógica, rutas, llamadas a la API, precios ni textos legales. Las páginas internas sin diseño se arman solo con las clases de la sección PÁGINAS INTERNAS. Trabaja una pantalla a la vez, empezando por Inicio, y espera mi visto bueno antes de seguir.
