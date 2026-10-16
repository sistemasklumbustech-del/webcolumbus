import { listarRutasDisponibles, obtenerEstadisticasPublicas } from "@/lib/api";
import { REFERENCIA, rutasReales } from "@/lib/portada-datos";
import { TablaRutasReferencia } from "./TablaRutasReferencia";

/**
 * Fase 7-portada (07-ago-2026) -- llena la portada con contenido real,
 * en vez de dejarla vacia. "Rutas disponibles" (no "populares" --
 * decision del director, ver DOCUMENTO_MAESTRO.md) porque hoy no
 * existen datos reales de demanda -- mostrar "populares" sin datos
 * reales seria inventar informacion. Prueba social con el conteo real
 * de cooperativas activas y rutas, sin ningun numero fabricado.
 *
 * Portada nueva (oct-2026): manda el API. Los registros de prueba no se muestran; mientras no haya
 * rutas reales se muestra la tabla de referencia de la terminal (ver lib/portada-datos.ts) y,
 * apenas el API devuelva rutas reales, estas la reemplazan.
 *
 * Server component (async, sin "use client") -- se resuelve en el
 * servidor antes de enviar el HTML, mismo patron que el resto de la
 * portada.
 */
export async function RutasDisponibles() {
  const [todas, estadisticas] = await Promise.all([listarRutasDisponibles(), obtenerEstadisticasPublicas()]);
  const rutas = rutasReales(todas);

  if (rutas.length === 0) {
    return (
      <section id="rutas" className="mx-auto max-w-[1280px] scroll-mt-20 px-5 pt-[30px] md:px-16 md:pt-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="kb-eyebrow-barra">Horarios y precios</span>
            <h2 className="text-[27px] font-bold leading-[1.1] tracking-[-0.025em] md:text-[40px]">
              Rutas desde <em className="kb-marca">{REFERENCIA.terminal.ciudad}</em>
            </h2>
          </div>
          <p className="max-w-[44ch] text-sm text-muted-2">
            Valores de referencia. Elige una ruta y te mostramos todas las salidas del día.
          </p>
        </div>
        <TablaRutasReferencia />
      </section>
    );
  }

  return (
    <section id="rutas" className="mx-auto max-w-[1280px] scroll-mt-20 px-5 pt-[30px] md:px-16 md:pt-14">
      <div className="mb-3.5 flex items-baseline justify-between gap-2.5 md:mb-[18px]">
        <h2 className="text-[21px] font-semibold md:text-2xl">
          Rutas <em className="kb-marca">disponibles</em>
        </h2>
        {estadisticas && (
          <p className="text-xs text-muted-2 md:text-sm">
            {estadisticas.cooperativasActivas} cooperativa{estadisticas.cooperativasActivas === 1 ? "" : "s"} ·{" "}
            {estadisticas.rutasDisponibles} ruta{estadisticas.rutasDisponibles === 1 ? "" : "s"}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-4">
        {rutas.map((r) => (
          <div
            key={r.rutaId}
            className="flex items-center gap-3 rounded-[20px] bg-white p-3.5 shadow-[0_2px_12px_rgba(11,13,18,.04)] md:rounded-card md:p-4 md:shadow-card"
          >
            <span
              className="hidden h-[60px] w-[60px] shrink-0 place-items-center rounded-ctrl bg-[linear-gradient(135deg,#262A35,#0B0D12)] text-[13px] font-bold uppercase text-kbyellow md:grid"
              aria-hidden="true"
            >
              {r.destinoCiudad.slice(0, 3)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                {r.origenCiudad}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA0AE" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                {r.destinoCiudad}
              </p>
              <p className="truncate text-xs text-muted-2">
                {r.origenNombre} a {r.destinoNombre}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <small className="block text-[11px] text-muted-2">desde</small>
              <strong className="text-[17px] font-bold tabular-nums md:text-lg">
                ${Number(r.precioReferencia).toFixed(2)}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
