"use client";

import { useEffect, useState } from "react";
import { listarMisReferidos, type MiReferido, type MiPerfil } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { EstadoCargando, EstadoVacio, ICONOS_CUENTA } from "@/components/EstadoCuenta";
import { usePaginacionLocal, ControlesPaginacion } from "@/components/Paginacion";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Hallazgo real del director (15-ago-2026, recorrido en vivo de
 * producción): "Invita y Gana" ya acreditaba correctamente en el
 * backend desde hacía días, pero no existía NINGÚN lugar donde el
 * pasajero viera a quién había referido -- ni siquiera su propio
 * código, más allá de un dato suelto en el perfil.
 */
export function TabReferidos({ perfil }: { perfil: MiPerfil }) {
  const [referidos, setReferidos] = useState<MiReferido[] | null>(null);
  const pagReferidos = usePaginacionLocal(referidos ?? []);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    listarMisReferidos(token)
      .then(setReferidos)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar tus referidos."));
  }, []);

  function copiarCodigo() {
    navigator.clipboard.writeText(perfil.codigoPasajero).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  const yaAcreditados = referidos?.filter((r) => r.creditoDisparado).length ?? 0;

  return (
    <div className="lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-6">
      {/* Tarjeta negra como la de Mi saldo: el amarillo queda solo para la acción (Copiar). */}
      <div className="relative overflow-hidden rounded-card bg-ink px-6 py-6 text-white lg:sticky lg:top-24">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-kbyellow/10" />
        <p className="relative text-xs font-semibold uppercase tracking-wide text-kbyellow">Invita a un amigo</p>
        <p className="relative mt-2 text-[15px] leading-relaxed text-ondark">
          Comparte tu código — tu amigo recibe un descuento en su primer viaje, y tú ganas saldo en tu
          wallet cuando él aborde.
        </p>
        <span className="relative mt-5 block text-xs text-ondark">Tu código</span>
        <div className="relative mt-1.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 rounded-ctrl bg-white px-4 py-3 text-center text-xl font-bold tracking-[.08em] text-ink tabular-nums">
            {perfil.codigoPasajero}
          </p>
          <button type="button" onClick={copiarCodigo} className="kb-btn kb-btn--primary !h-[52px] shrink-0 !px-5 !text-sm">
            {copiado ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
        <span role="status" aria-live="polite" className="sr-only">
          {copiado ? "Código copiado" : ""}
        </span>
      </div>

      <div className="mt-6 lg:mt-0">
        {error && (
          <div className="kb-alert kb-alert--error">
            {error}
          </div>
        )}

        {referidos === null && !error && <EstadoCargando />}

        {referidos !== null && referidos.length === 0 && (
          <EstadoVacio
            icono={ICONOS_CUENTA.invitar}
            titulo="Todavía no has referido a nadie"
            texto="Comparte tu código para empezar a ganar."
          />
        )}

        {referidos !== null && referidos.length > 0 && (
          <>
            <h2 className="text-base font-semibold text-ink">
              {referidos.length} {referidos.length === 1 ? "persona referida" : "personas referidas"}
              {yaAcreditados > 0 && (
                <span className="ml-2 font-normal text-muted-2">
                  · {yaAcreditados} ya te dieron saldo
                </span>
              )}
            </h2>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {pagReferidos.visibles.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{r.nombreReferido}</p>
                    <p className="text-xs text-muted-2">Se unió el {formatearFecha(r.creadoEn)}</p>
                  </div>
                  <span
                    className={`kb-status ${r.creditoDisparado ? "kb-status--ok" : "kb-status--off"}`}
                  >
                    {r.creditoDisparado ? "Ya viajó" : "Aún no viaja"}
                  </span>
                </div>
              ))}
            </div>
            <ControlesPaginacion
              pagina={pagReferidos.pagina}
              totalPaginas={pagReferidos.totalPaginas}
              total={pagReferidos.total}
              etiqueta="persona"
              onCambio={pagReferidos.setPagina}
              className="!px-0"
            />
          </>
        )}
      </div>
    </div>
  );
}
