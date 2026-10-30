"use client";

import { useEffect, useState } from "react";
import { listarMisCreditos, type MiCredito } from "@/lib/api";
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
 * Vacío real de diseño encontrado el 29-jul-2026: el crédito de
 * reprogramación existía desde el 28-jul, pero el pasajero no tenía
 * ningún lugar dedicado donde ver su historial completo (disponibles
 * y ya usados) — antes solo aparecía como un banner de "disponibles"
 * arriba de Mis boletos.
 */
export function TabMisCreditos() {
  const [creditos, setCreditos] = useState<MiCredito[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    listarMisCreditos(token)
      .then(setCreditos)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar tus créditos."));
  }, []);

  const disponibles = creditos?.filter((c) => !c.usadoEn) ?? [];
  const usados = creditos?.filter((c) => c.usadoEn) ?? [];
  const pagDisponibles = usePaginacionLocal(disponibles);
  const pagUsados = usePaginacionLocal(usados);

  return (
    <>
      <p className="text-[15px] leading-relaxed text-muted-2">
        El saldo que te queda cuando reprogramas un boleto a un pasaje más barato. Se usa eligiéndolo
        al pagar tu próxima compra con esa misma cooperativa.
      </p>

      {error && (
        <div className="mt-4 kb-alert kb-alert--error">
          {error}
        </div>
      )}

      {creditos === null && !error && (
        <div className="mt-6">
          <EstadoCargando />
        </div>
      )}

      {creditos !== null && creditos.length === 0 && (
        <div className="mt-6">
          <EstadoVacio
            icono={ICONOS_CUENTA.credito}
            titulo="Todavía no tienes créditos"
            texto="Aparecerán aquí si reprogramas un boleto a un pasaje más barato."
          />
        </div>
      )}

      {disponibles.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-semibold text-ink">Disponibles</h2>
          <div className="mt-2 space-y-2">
            {pagDisponibles.visibles.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-[14px] border border-line bg-white px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-ink">{c.cooperativaNombre}</p>
                  <p className="text-xs text-muted-2">Desde {formatearFecha(c.creadoEn)}</p>
                </div>
                <p className="text-lg font-bold tabular-nums text-ink">${c.monto.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <ControlesPaginacion
            pagina={pagDisponibles.pagina}
            totalPaginas={pagDisponibles.totalPaginas}
            total={pagDisponibles.total}
            etiqueta="crédito"
            onCambio={pagDisponibles.setPagina}
            className="!px-0"
          />
        </div>
      )}

      {usados.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-semibold text-muted-2">Ya usados</h2>
          <div className="mt-2 space-y-2">
            {pagUsados.visibles.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-[14px] bg-kbbg px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-muted-2">{c.cooperativaNombre}</p>
                  <p className="text-xs text-muted-3">
                    Usado el {formatearFecha(c.usadoEn!)}
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums text-muted-3">
                  ${c.monto.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <ControlesPaginacion
            pagina={pagUsados.pagina}
            totalPaginas={pagUsados.totalPaginas}
            total={pagUsados.total}
            etiqueta="crédito"
            onCambio={pagUsados.setPagina}
            className="!px-0"
          />
        </div>
      )}
    </>
  );
}
