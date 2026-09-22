"use client";

import { useCallback, useEffect, useState } from "react";
import {
  generarLiquidacion,
  listarLiquidacionesAdmin,
  marcarLiquidacionPagada,
  listarCooperativasAdmin,
  type FiltrosLiquidaciones,
  type ResultadoLiquidaciones,
  type CooperativaResumen,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

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
 * Panel de Liquidaciones (30-jul-2026) -- el backend ya existía y
 * estaba probado desde el 28-jul, esto es solo la pantalla que
 * faltaba (hallazgo real de la auditoría de estado del proyecto).
 *
 * Paginación real (22-sep-2026) -- antes traía todo el historial de
 * una sola vez; ahora filtra por cooperativa, estado y período, con
 * paginación de 25. De paso, el campo "ID de la cooperativa" (un UUID
 * a mano) se reemplaza por un selector -- mismo patrón ya usado en
 * Conciliación.
 */
export default function LiquidacionesAdminPage() {
  const [cooperativas, setCooperativas] = useState<CooperativaResumen[]>([]);
  const [resultado, setResultado] = useState<ResultadoLiquidaciones | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const [cooperativaGenerar, setCooperativaGenerar] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFin, setPeriodoFin] = useState("");
  const [generando, setGenerando] = useState(false);

  const [cooperativaFiltro, setCooperativaFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"" | "pendiente" | "pagada">("");
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosLiquidaciones>({
    pagina: 1,
    limite: LIMITE_PAGINA,
  });
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    listarCooperativasAdmin(token)
      .then(setCooperativas)
      .catch(() => {
        // silencioso a propósito -- el selector es una comodidad, un
        // fallo cargándolo no debe tapar el historial.
      });
  }, []);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargando(true);
    setError(null);
    listarLiquidacionesAdmin(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar."))
      .finally(() => setCargando(false));
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setAplicados({
      cooperativaId: cooperativaFiltro || undefined,
      estado: estadoFiltro || undefined,
      desde: desdeFiltro || undefined,
      hasta: hastaFiltro || undefined,
      pagina: 1,
      limite: LIMITE_PAGINA,
    });
  }

  function limpiarFiltros() {
    setCooperativaFiltro("");
    setEstadoFiltro("");
    setDesdeFiltro("");
    setHastaFiltro("");
    setPagina(1);
    setAplicados({ pagina: 1, limite: LIMITE_PAGINA });
  }

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token || !cooperativaGenerar || !periodoInicio || !periodoFin) return;
    setGenerando(true);
    setError(null);
    try {
      await generarLiquidacion(token, cooperativaGenerar, periodoInicio, periodoFin);
      setMensajeExito("Liquidación generada.");
      setCooperativaGenerar("");
      setPeriodoInicio("");
      setPeriodoFin("");
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la liquidación.");
    } finally {
      setGenerando(false);
    }
  }

  async function marcarPagada(id: string) {
    const token = obtenerToken();
    if (!token) return;
    try {
      await marcarLiquidacionPagada(token, id);
      setMensajeExito("Liquidación marcada como pagada.");
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo marcar como pagada.");
    }
  }

  function nombreCoop(id: string) {
    return cooperativas.find((c) => c.id === id)?.nombreComercial ?? id;
  }

  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) : 1;
  const claseCampo =
    "w-full rounded-lg border border-brand-light px-3 py-2.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
  const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="font-display text-2xl font-bold text-brand-dark">Liquidaciones</h1>
      <p className="mt-1 text-sm text-brand-dark/70">
        Genera la liquidación de una cooperativa por período, y márcala como pagada cuando
        corresponda.
      </p>

      <form
        onSubmit={generar}
        className="mt-6 grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-4 sm:items-end"
      >
        <div className="sm:col-span-2">
          <label htmlFor="liq-cooperativa-id" className={claseEtiqueta}>Cooperativa</label>
          <select
            id="liq-cooperativa-id"
            value={cooperativaGenerar}
            onChange={(e) => setCooperativaGenerar(e.target.value)}
            className={claseCampo}
          >
            <option value="">Selecciona...</option>
            {cooperativas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombreComercial}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="liq-desde" className={claseEtiqueta}>Desde</label>
          <input id="liq-desde" type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className={claseCampo} />
        </div>
        <div>
          <label htmlFor="liq-hasta" className={claseEtiqueta}>Hasta</label>
          <input id="liq-hasta" type="date" value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)} className={claseCampo} />
        </div>
        <div className="sm:col-span-4">
          {error && <p className="mb-2 text-sm font-medium text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={generando}
            className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {generando ? "Generando..." : "Generar liquidación"}
          </button>
        </div>
      </form>

      <form
        onSubmit={filtrar}
        className="mt-6 grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
      >
        <div>
          <label htmlFor="liq-filtro-coop" className={claseEtiqueta}>Cooperativa</label>
          <select id="liq-filtro-coop" value={cooperativaFiltro} onChange={(e) => setCooperativaFiltro(e.target.value)} className={claseCampo}>
            <option value="">Todas</option>
            {cooperativas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombreComercial}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="liq-filtro-estado" className={claseEtiqueta}>Estado</label>
          <select
            id="liq-filtro-estado"
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
          <label htmlFor="liq-filtro-desde" className={claseEtiqueta}>Período desde</label>
          <input id="liq-filtro-desde" type="date" value={desdeFiltro} onChange={(e) => setDesdeFiltro(e.target.value)} className={claseCampo} />
        </div>
        <div>
          <label htmlFor="liq-filtro-hasta" className={claseEtiqueta}>Período hasta</label>
          <input id="liq-filtro-hasta" type="date" value={hastaFiltro} onChange={(e) => setHastaFiltro(e.target.value)} className={claseCampo} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-lg bg-brand-amber px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-95">
            Filtrar
          </button>
          <button type="button" onClick={limpiarFiltros} className="rounded-lg border border-brand-light px-3 py-2.5 text-sm text-brand-dark/70 hover:bg-brand-light/40">
            Limpiar
          </button>
        </div>
      </form>

      {resultado === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {resultado !== null && resultado.filas.length === 0 && !cargando && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          No hay liquidaciones que coincidan con estos filtros.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {resultado?.filas.map((l) => (
          <div key={l.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-brand-dark/50">{nombreCoop(l.cooperativaId)}</p>
                <p className="text-sm font-semibold text-brand-dark">
                  {formatearFecha(l.periodoInicio)} — {formatearFecha(l.periodoFin)}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  l.estado === "pagada"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {l.estado === "pagada" ? "Pagada" : "Pendiente"}
              </span>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-brand-dark">
              ${l.montoLiquidado.toFixed(2)}
            </p>
            {l.estado === "pendiente" && (
              <button
                onClick={() => marcarPagada(l.id)}
                className="mt-2 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Marcar como pagada
              </button>
            )}
          </div>
        ))}
      </div>

      {resultado !== null && resultado.total > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-5 py-3 text-sm text-brand-dark/70 shadow-sm ring-1 ring-black/5">
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
