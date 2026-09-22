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
    "w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
  const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-brand-dark">Liquidaciones</h1>
      <p className="mt-1 text-sm text-brand-dark/70">
        Tu historial de liquidaciones — cuánto se te debe y cuándo se te ha pagado. La plataforma
        las genera según su calendario; aquí solo las consultas.
      </p>

      <form
        onSubmit={filtrar}
        className="mt-6 grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
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
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95">
            Filtrar
          </button>
          <button type="button" onClick={limpiarFiltros} className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40">
            Limpiar
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {resultado === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {resultado !== null && liquidaciones !== null && liquidaciones.length === 0 && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          No hay liquidaciones que coincidan con estos filtros.
        </p>
      )}

      {pendientes.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold text-brand-dark">Pendientes de pago</h2>
          <div className="mt-2 space-y-2">
            {pendientes.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl bg-brand-amber/10 px-4 py-3 ring-1 ring-brand-amber/30"
              >
                <p className="text-sm text-brand-dark">
                  {formatearFecha(l.periodoInicio)} — {formatearFecha(l.periodoFin)}
                </p>
                <p className="font-display text-lg font-bold text-brand-dark">
                  ${l.montoLiquidado.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {pagadas.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold text-brand-dark/50">Ya pagadas</h2>
          <div className="mt-2 space-y-2">
            {pagadas.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl bg-brand-light/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-brand-dark/70">
                    {formatearFecha(l.periodoInicio)} — {formatearFecha(l.periodoFin)}
                  </p>
                  {l.pagadoEn && (
                    <p className="text-xs text-brand-dark/40">Pagada el {formatearFecha(l.pagadoEn)}</p>
                  )}
                </div>
                <p className="font-display text-lg font-bold text-brand-dark/40">
                  ${l.montoLiquidado.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {resultado !== null && resultado.total > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-white px-5 py-3 text-sm text-brand-dark/70 shadow-sm ring-1 ring-black/5">
          <span>Página {pagina} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || cargando}
              className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || cargando}
              className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
