"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listarMisLiquidaciones,
  type FiltrosLiquidaciones,
  type ResultadoLiquidaciones,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

const LIMITE_PAGINA = 25;

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Historial de liquidaciones propio (30-jul-2026, hallazgo real de la
 * auditoría): antes, la cooperativa no tenía ninguna forma de ver
 * cuánto se le debe o cuándo se le pagó sin pedírselo al admin de
 * plataforma cada vez. Solo lectura -- generar y marcar pagada siguen
 * siendo exclusivos del admin de plataforma.
 *
 * Paginación real (22-sep-2026) -- antes traía todo el historial de
 * una sola vez; ahora filtra por estado y período, con paginación de
 * 25. Mismo patrón que la pantalla espejo del admin.
 */
export default function LiquidacionesCoopPage() {
  const [estadoFiltro, setEstadoFiltro] = useState<"" | "pendiente" | "pagada">("");
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");
  const [aplicados, setAplicados] = useState<Omit<FiltrosLiquidaciones, "cooperativaId">>({
    pagina: 1,
    limite: LIMITE_PAGINA,
  });
  const [pagina, setPagina] = useState(1);

  const [resultado, setResultado] = useState<ResultadoLiquidaciones | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargando(true);
    listarMisLiquidaciones(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar."))
      .finally(() => setCargando(false));
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setAplicados({
      estado: estadoFiltro || undefined,
      desde: desdeFiltro || undefined,
      hasta: hastaFiltro || undefined,
      pagina: 1,
      limite: LIMITE_PAGINA,
    });
  }

  function limpiarFiltros() {
    setEstadoFiltro("");
    setDesdeFiltro("");
    setHastaFiltro("");
    setPagina(1);
    setAplicados({ pagina: 1, limite: LIMITE_PAGINA });
  }

  const liquidaciones = resultado?.filas ?? null;
  const pendientes = liquidaciones?.filter((l) => l.estado === "pendiente") ?? [];
  const pagadas = liquidaciones?.filter((l) => l.estado === "pagada") ?? [];
  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) : 1;
  const claseCampo =
    "w-full kb-btn kb-btn--outline !h-10 !px-4 !text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
  const claseEtiqueta = "kb-label";

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold text-brand-dark">Liquidaciones</h1>
      <p className="mt-1 text-sm text-muted-2">
        Tu historial de liquidaciones — cuánto se te debe y cuándo se te ha pagado. La plataforma
        las genera según su calendario; aquí solo las consultas.
      </p>

      <form
        onSubmit={filtrar}
        className="mt-6 grid grid-cols-1 gap-4 kb-card kb-on-white p-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
      >
        <div>
          <label htmlFor="mis-liq-estado" className={claseEtiqueta}>Estado</label>
          <select
            id="mis-liq-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as "" | "pendiente" | "pagada")}
            className={claseCampo}
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagada">Pagada</option>
          </select>
        </div>
        <div>
          <label htmlFor="mis-liq-desde" className={claseEtiqueta}>Período desde</label>
          <input id="mis-liq-desde" type="date" value={desdeFiltro} onChange={(e) => setDesdeFiltro(e.target.value)} className={claseCampo} />
        </div>
        <div>
          <label htmlFor="mis-liq-hasta" className={claseEtiqueta}>Período hasta</label>
          <input id="mis-liq-hasta" type="date" value={hastaFiltro} onChange={(e) => setHastaFiltro(e.target.value)} className={claseCampo} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="flex-1 kb-btn kb-btn--primary !h-11 !px-5 !text-sm">
            Filtrar
          </button>
          <button type="button" onClick={limpiarFiltros} className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm">
            Limpiar
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 kb-alert kb-alert--error">
          {error}
        </div>
      )}

      {resultado === null && !error && <p className="mt-6 text-sm text-muted-2">Cargando...</p>}

      {resultado !== null && liquidaciones !== null && liquidaciones.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-2">
          No hay liquidaciones que coincidan con estos filtros.
        </p>
      )}

      {pendientes.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-brand-dark">Pendientes de pago</h2>
          <div className="mt-2 space-y-2">
            {pendientes.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-ctrl bg-kbyellow-soft px-4 py-3"
              >
                <p className="text-sm text-brand-dark">
                  {formatearFecha(l.periodoInicio)} — {formatearFecha(l.periodoFin)}
                </p>
                <p className="text-lg font-bold text-brand-dark">
                  ${l.montoLiquidado.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {pagadas.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-muted-2">Ya pagadas</h2>
          <div className="mt-2 space-y-2">
            {pagadas.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-ctrl bg-kbbg px-4 py-3"
              >
                <div>
                  <p className="text-sm text-muted-2">
                    {formatearFecha(l.periodoInicio)} — {formatearFecha(l.periodoFin)}
                  </p>
                  {l.pagadoEn && (
                    <p className="text-xs text-muted-3">Pagada el {formatearFecha(l.pagadoEn)}</p>
                  )}
                </div>
                <p className="text-lg font-bold text-muted-3">
                  ${l.montoLiquidado.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {resultado !== null && resultado.total > 0 && (
        <div className="mt-6 flex items-center justify-between kb-card kb-on-white px-5 py-3 text-sm text-muted-2">
          <span>Página {pagina} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || cargando}
              className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || cargando}
              className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
