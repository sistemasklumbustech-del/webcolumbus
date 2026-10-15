"use client";

import { useEffect, useState } from "react";
import { listarMisReferidos, type MiReferido, type MiPerfil } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
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
      <div className="overflow-hidden rounded-card bg-kbyellow px-6 py-6 lg:sticky lg:top-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">
          Invita a un amigo
        </p>
        <p className="mt-1 text-sm text-ink">
          Comparte tu código — tu amigo recibe un descuento en su primer viaje, y tú ganas saldo en tu
          wallet cuando él aborde.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <p className="flex-1 rounded-ctrl bg-white px-4 py-3 text-center text-xl font-bold tracking-wide text-brand-dark">
            {perfil.codigoPasajero}
          </p>
          <button
            onClick={copiarCodigo}
            className="kb-btn kb-btn--dark !h-12 !px-4 !text-sm"
          >
            {copiado ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="mt-6 lg:mt-0">
        {error && (
          <div className="kb-alert kb-alert--error">
            {error}
          </div>
        )}

        {referidos === null && !error && <p className="text-sm text-muted-2">Cargando...</p>}

        {referidos !== null && referidos.length === 0 && (
          <p className="text-center text-sm text-muted-2">
            Todavía no has referido a nadie — comparte tu código para empezar a ganar.
          </p>
        )}

        {referidos !== null && referidos.length > 0 && (
          <>
            <h2 className="text-sm font-bold text-brand-dark">
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
                  className="flex items-center justify-between rounded-ctrl bg-kbbg px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-brand-dark">{r.nombreReferido}</p>
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
