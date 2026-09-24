import Link from "next/link";
import type { AlternativasBusqueda } from "@/lib/api";

const MAX_HORAS_VISIBLES = 6;

export function formatearFechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatearListaCooperativas(nombres: string[]): string {
  return nombres.length <= 2 ? nombres.join(" y ") : `${nombres.slice(0, 2).join(", ")} y ${nombres.length - 2} más`;
}

function textoViajes(cantidad: number): string {
  return `${cantidad} viaje${cantidad === 1 ? "" : "s"}`;
}

/** Horas de salida disponibles como etiquetas; si son muchas, se resumen. */
export function ChipsHoras({ horas }: { horas?: string[] }) {
  if (!horas || horas.length === 0) return null;
  const visibles = horas.slice(0, MAX_HORAS_VISIBLES);
  const resto = horas.length - visibles.length;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Horas de salida">
      {visibles.map((h) => (
        <span key={h} className="rounded-md bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-dark">
          {h}
        </span>
      ))}
      {resto > 0 && <span className="px-1 py-0.5 text-xs text-brand-dark/50">+{resto} más</span>}
    </div>
  );
}

/**
 * Qué hay disponible cuando la búsqueda no trae viajes (23-sep-2026):
 * otras fechas de la misma ruta (con sus cooperativas, horas y precio),
 * otros destinos que sí salen ese día del mismo origen, y qué
 * cooperativas tienen la ruta publicada. Todo con datos reales de la
 * base -- nada se inventa. Si hay muchas fechas, se muestran las más
 * cercanas y un enlace a la página con todas.
 */
export function SinResultadosAlternativas({
  alternativas,
  origenCiudad,
  destinoCiudad,
  hrefFecha,
  hrefDestino,
  hrefTodas,
  mensajeSinNada,
}: {
  alternativas: AlternativasBusqueda;
  origenCiudad?: string;
  destinoCiudad?: string;
  hrefFecha: (fecha: string) => string;
  /** Si no se pasa, no se ofrecen otros destinos (ej. en el tramo de vuelta, que debe regresar al origen). */
  hrefDestino?: (destinoId: string, destinoCiudad: string) => string;
  hrefTodas?: string;
  mensajeSinNada?: string;
}) {
  const { fechasCercanas, cooperativasEnLaRuta } = alternativas;
  const totalFechas = alternativas.totalFechas ?? fechasCercanas.length;
  const otrosDestinos = hrefDestino ? alternativas.otrosDestinos : [];

  if (fechasCercanas.length === 0 && otrosDestinos.length === 0 && cooperativasEnLaRuta.length === 0) {
    return mensajeSinNada ? <p className="text-sm text-brand-dark/70">{mensajeSinNada}</p> : null;
  }

  return (
    <div className="space-y-6">
      {fechasCercanas.length > 0 && (
        <section>
          <h3 className="font-display text-base font-bold text-brand-dark">
            Fechas con viajes para {origenCiudad ?? "tu origen"} → {destinoCiudad ?? "tu destino"}
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fechasCercanas.map((f) => (
              <Link
                key={f.fecha}
                href={hrefFecha(f.fecha)}
                className="rounded-lg border border-brand-light bg-white p-3 transition hover:bg-brand-light/30"
              >
                <p className="font-semibold capitalize text-brand-dark">{formatearFechaCorta(f.fecha)}</p>
                <p className="text-sm text-brand-dark/70">
                  {textoViajes(f.cantidadViajes)} · desde ${f.precioDesde.toFixed(2)}
                </p>
                <p className="mt-1 break-words text-xs text-brand-dark/50">{formatearListaCooperativas(f.cooperativas)}</p>
                <ChipsHoras horas={f.horas} />
              </Link>
            ))}
          </div>
          {hrefTodas && totalFechas > fechasCercanas.length && (
            <Link href={hrefTodas} className="mt-3 inline-block text-sm font-semibold text-brand-cobalto underline underline-offset-2">
              Ver las {totalFechas} fechas disponibles con todos sus horarios →
            </Link>
          )}
        </section>
      )}

      {otrosDestinos.length > 0 && hrefDestino && (
        <section>
          <h3 className="font-display text-base font-bold text-brand-dark">
            Desde {origenCiudad ?? "tu origen"} sí hay viajes ese día a:
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {otrosDestinos.map((d) => (
              <Link
                key={d.destinoCiudad}
                href={hrefDestino(d.destinoId, d.destinoCiudad)}
                className="rounded-lg border border-brand-light bg-white p-3 transition hover:bg-brand-light/30"
              >
                <p className="font-semibold text-brand-dark">{d.destinoCiudad}</p>
                <p className="text-sm text-brand-dark/70">
                  {textoViajes(d.cantidadViajes)} · desde ${d.precioDesde.toFixed(2)}
                </p>
                <p className="mt-1 break-words text-xs text-brand-dark/50">{formatearListaCooperativas(d.cooperativas)}</p>
                <ChipsHoras horas={d.horas} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {cooperativasEnLaRuta.length > 0 && (
        <p className="text-sm text-brand-dark/70">
          Esta ruta está publicada por <span className="font-semibold">{cooperativasEnLaRuta.join(", ")}</span>
          {fechasCercanas.length === 0 ? ", pero por ahora no tiene viajes con cupo en las próximas semanas." : "."}
        </p>
      )}
    </div>
  );
}
