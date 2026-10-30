import Link from "next/link";
import { buscarAlternativas } from "@/lib/api";
import { construirQuery } from "@/lib/buscar-url";
import { ChipsHoras, formatearFechaCorta } from "../SinResultadosAlternativas";
import { CambiarBusqueda } from "../CambiarBusqueda";

export const metadata = { title: "Fechas y horarios disponibles — Klumbus" };

/**
 * "Ver todo" (24-sep-2026): cuando una búsqueda no trae viajes y hay muchas
 * fechas alternativas, esta página lista TODAS las fechas con viajes de
 * esa ruta en los próximos 45 días -- con sus cooperativas, horas de
 * salida y precio desde -- para elegir sin adivinar. Sirve tanto para la
 * ida como para la vuelta de una compra de ida y vuelta.
 */
export default async function DisponibilidadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const esVuelta = sp.tramo === "vuelta";
  const origenId = esVuelta ? (sp.vueltaOrigenId ?? sp.destinoId) : sp.origenId;
  const destinoId = esVuelta ? (sp.vueltaDestinoId ?? sp.origenId) : sp.destinoId;
  const origenCiudad = esVuelta ? (sp.vueltaOrigenCiudad ?? sp.destinoCiudad) : sp.origenCiudad;
  const destinoCiudad = esVuelta ? (sp.vueltaDestinoCiudad ?? sp.origenCiudad) : sp.destinoCiudad;
  const fecha = esVuelta ? sp.fechaVuelta : sp.fecha;

  // Encabezado igual al de Resultados (rediseño 30-oct-2026): volver, ruta con su flecha y "Cambiar búsqueda".
  const encabezado = (hrefVolver: string) => (
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-4 px-5 py-3.5 md:px-16 md:py-[18px]">
        <Link href={hrefVolver} aria-label="Volver a los resultados" className="kb-btn-round shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold md:text-xl">
            {origenCiudad ?? "Origen"} → {destinoCiudad ?? "Destino"}
          </h1>
          <p className="text-xs text-muted-2 md:text-[13px]">{esVuelta ? "Vuelta · " : "Ida · "}Todas las fechas con viajes</p>
        </div>
        {origenId && destinoId && fecha && (
          <CambiarBusqueda
            inicial={{
              origenId,
              origenCiudad: origenCiudad ?? "",
              destinoId,
              destinoCiudad: destinoCiudad ?? "",
              fecha,
              pasajeros: Number(sp.pasajeros ?? 1),
              horaDesde: null,
              horaHasta: null,
            }}
          />
        )}
      </div>
    </div>
  );

  if (!origenId || !destinoId || !fecha) {
    return (
      <main className="mx-auto max-w-3xl flex-1 px-5 py-16 text-center">
        <p>Faltan datos de búsqueda. Vuelve al inicio e intenta de nuevo.</p>
        <Link href="/" className="kb-btn kb-btn--primary mt-5 inline-flex">
          Volver al inicio
        </Link>
      </main>
    );
  }

  const resultado = await buscarAlternativas({
    origenId,
    destinoId,
    fecha,
    pasajeros: Number(sp.pasajeros ?? 1),
    completo: true,
  });

  const { tramo: _tramo, ...sinTramo } = sp;
  void _tramo;
  const hrefVolver = `/buscar?${construirQuery(sinTramo)}`;
  // Cada fecha tiene sus propios horarios: se suelta el filtro de hora
  // para que el viaje elegido no quede oculto por una franja anterior.
  const hrefFecha = (f: string) =>
    `/buscar?${construirQuery(
      sinTramo,
      esVuelta
        ? { fechaVuelta: f, horaVueltaDesde: null, horaVueltaHasta: null }
        : { fecha: f, horaDesde: null, horaHasta: null },
    )}`;

  // Fechas agrupadas por mes ("Noviembre 2026").
  const porMes = new Map<string, NonNullable<typeof resultado>["fechasCercanas"]>();
  for (const f of resultado?.fechasCercanas ?? []) {
    const clave = f.fecha.slice(0, 7);
    porMes.set(clave, [...(porMes.get(clave) ?? []), f]);
  }
  const nombreMes = (clave: string) => {
    const texto = new Date(`${clave}-15T12:00:00Z`).toLocaleDateString("es-EC", { month: "long", year: "numeric", timeZone: "UTC" });
    return texto.charAt(0).toUpperCase() + texto.slice(1).replace(" de ", " ");
  };
  const fechaBuscadaSinViajes = !!resultado && !resultado.fechasCercanas.some((f) => f.fecha === fecha);

  return (
    <main className="flex-1">
      {encabezado(hrefVolver)}

      <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-16 md:py-8">
        {resultado === null && (
          <div className="kb-card flex flex-col items-start gap-3 p-6">
            <p className="kb-alert kb-alert--error">No pudimos cargar las fechas disponibles. Intenta de nuevo en un momento.</p>
            <Link href={`/buscar/disponibilidad?${construirQuery(sp)}`} className="kb-btn kb-btn--primary">
              Reintentar
            </Link>
          </div>
        )}

        {resultado !== null && resultado.fechasCercanas.length === 0 && (
          <div className="kb-card mx-auto flex max-w-xl flex-col items-center p-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-kbbg text-muted-2" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M3 10h18M8 3v4M16 3v4M9.5 14.5l5 5M14.5 14.5l-5 5" />
              </svg>
            </span>
            <p className="mt-4 text-lg font-semibold">Aún no hay viajes programados para esta ruta.</p>
            <p className="mt-1.5 text-sm text-muted-2">
              {resultado.cooperativasEnLaRuta.length > 0
                ? `La ruta está publicada por ${resultado.cooperativasEnLaRuta.join(", ")}, pero todavía no tiene viajes con cupo en los próximos 45 días.`
                : "Prueba con otra ruta o vuelve más adelante."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <Link href="/" className="kb-btn kb-btn--primary">
                Buscar otra ruta
              </Link>
              <Link href="/rutas" className="kb-btn kb-btn--outline">
                Ver rutas
              </Link>
            </div>
          </div>
        )}

        {resultado !== null && resultado.fechasCercanas.length > 0 && (
          <>
            <p className="mb-5 text-sm text-muted-2">
              {fechaBuscadaSinViajes && (
                <>
                  <b className="font-semibold text-ink">{formatearFechaCorta(fecha)} no tiene salidas.</b>{" "}
                </>
              )}
              {resultado.totalFechas} fecha{resultado.totalFechas === 1 ? "" : "s"} con viajes en los próximos 45 días.
            </p>
            <div className="flex flex-col gap-7">
              {[...porMes.entries()].map(([clave, fechas]) => (
                <section key={clave} aria-labelledby={`mes-${clave}`}>
                  <h2 id={`mes-${clave}`} className="mb-3 text-lg font-semibold">
                    {nombreMes(clave)}
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {fechas.map((f) => (
                      <Link
                        key={f.fecha}
                        href={hrefFecha(f.fecha)}
                        className="group kb-card flex flex-col p-4 transition hover:shadow-[inset_0_0_0_1.5px_#0B0D12] md:p-5"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-base font-semibold">{formatearFechaCorta(f.fecha)}</p>
                          <p className="text-sm text-muted-2">
                            desde <b className="text-base font-bold tabular-nums text-ink">${f.precioDesde.toFixed(2)}</b>
                          </p>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-2">
                          {f.cantidadViajes} viaje{f.cantidadViajes === 1 ? "" : "s"} · {f.cooperativas.join(", ")}
                        </p>
                        <ChipsHoras horas={f.horas} />
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink">
                          Ver viajes
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
