import Link from "next/link";
import { buscarAlternativas } from "@/lib/api";
import { construirQuery } from "@/lib/buscar-url";
import { ChipsHoras, formatearFechaCorta } from "../SinResultadosAlternativas";

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

  if (!origenId || !destinoId || !fecha) {
    return (
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 text-center">
        <p className="text-brand-dark">Faltan datos de búsqueda. Vuelve al inicio e intenta de nuevo.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-brand-cobalto underline">
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

  return (
    <main className="flex-1 bg-brand-light/40">
      <div className="bg-brand-dark px-4 py-4">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              {origenCiudad ?? "Origen"} <span className="text-brand-amber">→</span> {destinoCiudad ?? "Destino"}
            </h1>
            <p className="text-sm text-white/60">
              {esVuelta ? "Vuelta · " : ""}Todas las fechas y horarios disponibles
            </p>
          </div>
          <Link
            href={hrefVolver}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            ← Volver a los resultados
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {resultado === null && (
          <p className="rounded-lg bg-red-50 p-4 text-red-700">
            No pudimos cargar las fechas disponibles. Intenta de nuevo en un momento.
          </p>
        )}

        {resultado !== null && resultado.fechasCercanas.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="font-display text-lg font-bold text-brand-dark">
              Aún no hay viajes programados para esta ruta.
            </p>
            {resultado.cooperativasEnLaRuta.length > 0 && (
              <p className="mt-2 text-sm text-brand-dark/70">
                La ruta está publicada por {resultado.cooperativasEnLaRuta.join(", ")}, pero todavía no tiene viajes con
                cupo en los próximos 45 días.
              </p>
            )}
          </div>
        )}

        {resultado !== null && resultado.fechasCercanas.length > 0 && (
          <>
            <p className="mb-4 text-sm text-brand-dark/70">
              {resultado.totalFechas} fecha{resultado.totalFechas === 1 ? "" : "s"} con viajes en los próximos 45 días.
              Toca una para ver los viajes de ese día.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {resultado.fechasCercanas.map((f) => (
                <Link
                  key={f.fecha}
                  href={hrefFecha(f.fecha)}
                  className="rounded-xl border border-brand-light bg-white p-4 shadow-sm transition hover:bg-brand-light/30"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-display font-bold capitalize text-brand-dark">{formatearFechaCorta(f.fecha)}</p>
                    <p className="text-sm font-semibold text-brand-dark">desde ${f.precioDesde.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-brand-dark/70">
                    {f.cantidadViajes} viaje{f.cantidadViajes === 1 ? "" : "s"} · {f.cooperativas.join(", ")}
                  </p>
                  <ChipsHoras horas={f.horas} />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
