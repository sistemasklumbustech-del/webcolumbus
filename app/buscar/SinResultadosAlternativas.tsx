import Link from "next/link";
import type { AlternativasBusqueda } from "@/lib/api";

function formatearFechaCorta(fecha: string): string {
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

/**
 * Qué hay disponible cuando la búsqueda no trae viajes (23-sep-2026):
 * otras fechas de la misma ruta, otros destinos que sí salen ese día del
 * mismo origen, y qué cooperativas tienen la ruta publicada. Todo con
 * datos reales de la base -- nada se inventa; si no hay nada, no se
 * muestra la sección.
 */
export function SinResultadosAlternativas({
  alternativas,
  origenId,
  destinoId,
  origenCiudad,
  destinoCiudad,
  fecha,
  pasajeros,
}: {
  alternativas: AlternativasBusqueda;
  origenId: string;
  destinoId: string;
  origenCiudad?: string;
  destinoCiudad?: string;
  fecha: string;
  pasajeros: string;
}) {
  const { fechasCercanas, otrosDestinos, cooperativasEnLaRuta } = alternativas;
  if (fechasCercanas.length === 0 && otrosDestinos.length === 0 && cooperativasEnLaRuta.length === 0) {
    return null;
  }

  function href(destId: string, destCiudad: string | undefined, fechaBuscada: string): string {
    const params = new URLSearchParams({
      origenId,
      destinoId: destId,
      origenCiudad: origenCiudad ?? "",
      destinoCiudad: destCiudad ?? "",
      fecha: fechaBuscada,
      pasajeros,
    });
    return `/buscar?${params.toString()}`;
  }

  return (
    <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
      {fechasCercanas.length > 0 && (
        <section>
          <h3 className="font-display text-base font-bold text-brand-dark">
            Otras fechas para {origenCiudad ?? "tu origen"} → {destinoCiudad ?? "tu destino"}
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fechasCercanas.map((f) => (
              <Link
                key={f.fecha}
                href={href(destinoId, destinoCiudad, f.fecha)}
                className="rounded-lg border border-brand-light p-3 transition hover:bg-brand-light/30"
              >
                <p className="font-semibold capitalize text-brand-dark">{formatearFechaCorta(f.fecha)}</p>
                <p className="text-sm text-brand-dark/70">
                  {textoViajes(f.cantidadViajes)} · desde ${f.precioDesde.toFixed(2)}
                </p>
                <p className="mt-1 break-words text-xs text-brand-dark/50">{formatearListaCooperativas(f.cooperativas)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {otrosDestinos.length > 0 && (
        <section>
          <h3 className="font-display text-base font-bold text-brand-dark">
            Desde {origenCiudad ?? "tu origen"} sí hay viajes ese día a:
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {otrosDestinos.map((d) => (
              <Link
                key={d.destinoCiudad}
                href={href(d.destinoId, d.destinoCiudad, fecha)}
                className="rounded-lg border border-brand-light p-3 transition hover:bg-brand-light/30"
              >
                <p className="font-semibold text-brand-dark">{d.destinoCiudad}</p>
                <p className="text-sm text-brand-dark/70">
                  {textoViajes(d.cantidadViajes)} · desde ${d.precioDesde.toFixed(2)}
                </p>
                <p className="mt-1 break-words text-xs text-brand-dark/50">{formatearListaCooperativas(d.cooperativas)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {cooperativasEnLaRuta.length > 0 && (
        <p className="text-sm text-brand-dark/70">
          Esta ruta está publicada por <span className="font-semibold">{cooperativasEnLaRuta.join(", ")}</span>, pero por
          ahora no tiene viajes con cupo en las próximas semanas.
        </p>
      )}
    </div>
  );
}
