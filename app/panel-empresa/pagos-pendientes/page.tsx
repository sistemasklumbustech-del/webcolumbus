"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listarPagosPendientes,
  confirmarPagoManual,
  rechazarPagoManual,
  listarHistorialPagos,
  type PagoManualPendiente,
  type PagoManualHistorialItem,
  type FiltrosHistorialPagos,
  type ResultadoHistorialPagos,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const LIMITE_PAGINA = 25;

const ETIQUETAS_PROVEEDOR: Record<string, string> = {
  transferencia_bancaria: "Transferencia bancaria",
  efectivo: "Efectivo",
  deuna: "DeUna",
  payphone: "PayPhone",
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TarjetaPago({
  pago,
  onProcesado,
  onError,
}: {
  pago: PagoManualPendiente;
  onProcesado: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}) {
  const [procesando, setProcesando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");

  async function confirmar() {
    const token = obtenerToken();
    if (!token) return;
    setProcesando(true);
    try {
      await confirmarPagoManual(token, pago.pagoId);
      onProcesado("Pago confirmado — el boleto ya está vigente.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo confirmar.");
    } finally {
      setProcesando(false);
    }
  }

  async function rechazar() {
    const token = obtenerToken();
    if (!token) return;
    setProcesando(true);
    try {
      await rechazarPagoManual(token, pago.pagoId, motivo.trim() || undefined);
      onProcesado("Pago rechazado — el asiento quedó libre para otro pasajero.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo rechazar.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="break-words font-display font-bold text-brand-dark">{pago.compradorNombre}</p>
          <p className="text-sm text-brand-dark/70">
            {ETIQUETAS_PROVEEDOR[pago.proveedor] ?? pago.proveedor} · ${pago.monto.toFixed(2)}
          </p>
          <p className="text-xs text-brand-dark/40">Subido {formatearFecha(pago.creadoEn)}</p>
        </div>
      </div>

      {pago.comprobanteUrl && (
        <a
          href={pago.comprobanteUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block overflow-hidden rounded-lg ring-1 ring-black/5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- comprobante subido por el usuario, no un asset local */}
          <img src={pago.comprobanteUrl} alt="Comprobante de pago" className="max-h-64 w-full object-contain bg-brand-light/20" />
        </a>
      )}

      {!rechazando ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={confirmar}
            disabled={procesando}
            className="rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
          >
            {procesando ? "Confirmando..." : "Confirmar pago"}
          </button>
          <button
            onClick={() => setRechazando(true)}
            disabled={procesando}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Rechazar
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional) — ej. no coincide con el monto"
            className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={rechazar}
              disabled={procesando}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {procesando ? "Rechazando..." : "Confirmar rechazo"}
            </button>
            <button
              onClick={() => setRechazando(false)}
              className="rounded-lg border border-brand-light px-4 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilaHistorial({ pago }: { pago: PagoManualHistorialItem }) {
  const aprobado = pago.estado === "aprobado";
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="min-w-0">
        <p className="break-words font-semibold text-brand-dark">{pago.compradorNombre}</p>
        <p className="text-xs text-brand-dark/60">
          {ETIQUETAS_PROVEEDOR[pago.proveedor] ?? pago.proveedor} · ${pago.monto.toFixed(2)}
        </p>
        <p className="text-xs text-brand-dark/40">
          {formatearFecha(pago.resueltoEn)}
          {pago.confirmadoPorNombre && ` · por ${pago.confirmadoPorNombre}`}
        </p>
        {pago.referenciaPago && (
          <p className="mt-1 break-words text-xs text-brand-dark/60">Referencia: {pago.referenciaPago}</p>
        )}
        {!aprobado && pago.motivoRechazo && (
          <p className="mt-1 text-xs text-red-600">Motivo: {pago.motivoRechazo}</p>
        )}
        {pago.comprobanteUrl && (
          <a
            href={pago.comprobanteUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs font-semibold text-brand hover:underline"
          >
            Ver comprobante
          </a>
        )}
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          aprobado ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        }`}
      >
        {aprobado ? "Confirmado" : "Rechazado"}
      </span>
    </div>
  );
}

export default function PagosPendientesPage() {
  const [pagos, setPagos] = useState<PagoManualPendiente[] | null>(null);
  const [historial, setHistorial] = useState<ResultadoHistorialPagos | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  // Paginación real (23-sep-2026) -- ver el comentario del backend. La
  // bandeja de pendientes es una cola de trabajo y no se pagina.
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [proveedorFiltro, setProveedorFiltro] = useState("");
  const [busquedaFiltro, setBusquedaFiltro] = useState("");
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosHistorialPagos>({ pagina: 1, limite: LIMITE_PAGINA });
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  function cargarPendientes() {
    const token = obtenerToken();
    if (!token) return;
    listarPagosPendientes(token)
      .then(setPagos)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar."));
  }

  // Independiente de la bandeja -- un fallo cargando el historial no
  // debe tapar los pendientes, que es lo urgente.
  const cargarHistorial = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargandoHistorial(true);
    listarHistorialPagos(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setHistorial)
      .catch(() => setHistorial({ filas: [], total: 0, pagina: 1, limite: LIMITE_PAGINA }))
      .finally(() => setCargandoHistorial(false));
  }, [aplicados, pagina]);

  function cargar() {
    cargarPendientes();
    cargarHistorial();
  }

  useEffect(cargarPendientes, []);
  useEffect(cargarHistorial, [cargarHistorial]);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setAplicados({
      estado: estadoFiltro === "aprobado" || estadoFiltro === "rechazado" ? estadoFiltro : undefined,
      proveedor: proveedorFiltro || undefined,
      busqueda: busquedaFiltro.trim() || undefined,
      desde: desdeFiltro || undefined,
      hasta: hastaFiltro || undefined,
      pagina: 1,
      limite: LIMITE_PAGINA,
    });
  }

  function limpiarFiltros() {
    setEstadoFiltro("");
    setProveedorFiltro("");
    setBusquedaFiltro("");
    setDesdeFiltro("");
    setHastaFiltro("");
    setPagina(1);
    setAplicados({ pagina: 1, limite: LIMITE_PAGINA });
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="font-display text-2xl font-bold text-brand-dark">Pagos pendientes</h1>
      <p className="mt-1 text-sm text-brand-dark/70">
        Boletos pagados por transferencia, efectivo, DeUna o PayPhone, esperando tu confirmación.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {pagos === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {pagos !== null && pagos.length === 0 && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          No hay pagos pendientes de confirmar por ahora.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {pagos?.map((p) => (
          <TarjetaPago
            key={p.pagoId}
            pago={p}
            onProcesado={(mensaje) => {
              setMensajeExito(mensaje);
              cargar();
            }}
            onError={setError}
          />
        ))}
      </div>

      <div className="mt-10">
        <h2 className="font-display text-lg font-bold text-brand-dark">Historial</h2>
        <p className="mt-1 text-sm text-brand-dark/60">
          Los pagos manuales que ya confirmaste o rechazaste.
        </p>

        <form
          onSubmit={filtrar}
          className="mt-4 grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-2"
        >
          <div>
            <label htmlFor="pago-filtro-estado" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">Resultado</label>
            <select id="pago-filtro-estado" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium">
              <option value="">Todos</option>
              <option value="aprobado">Confirmados</option>
              <option value="rechazado">Rechazados</option>
            </select>
          </div>
          <div>
            <label htmlFor="pago-filtro-proveedor" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">Método de pago</label>
            <select id="pago-filtro-proveedor" value={proveedorFiltro} onChange={(e) => setProveedorFiltro(e.target.value)} className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium">
              <option value="">Todos</option>
              {Object.entries(ETIQUETAS_PROVEEDOR).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pago-filtro-desde" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">Desde</label>
            <input id="pago-filtro-desde" type="date" value={desdeFiltro} onChange={(e) => setDesdeFiltro(e.target.value)} className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium" />
          </div>
          <div>
            <label htmlFor="pago-filtro-hasta" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">Hasta</label>
            <input id="pago-filtro-hasta" type="date" value={hastaFiltro} onChange={(e) => setHastaFiltro(e.target.value)} className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="pago-filtro-busqueda" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">Buscar</label>
            <input
              id="pago-filtro-busqueda"
              value={busquedaFiltro}
              onChange={(e) => setBusquedaFiltro(e.target.value)}
              placeholder="Nombre del comprador o referencia"
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark sm:flex-none">
              Filtrar
            </button>
            <button type="button" onClick={limpiarFiltros} className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40">
              Limpiar
            </button>
          </div>
        </form>

        {historial === null && <p className="mt-4 text-sm text-brand-dark/50">Cargando...</p>}

        {historial !== null && historial.filas.length === 0 && !cargandoHistorial && (
          <p className="mt-6 text-center text-sm text-brand-dark/50">
            {aplicados.estado || aplicados.proveedor || aplicados.busqueda || aplicados.desde || aplicados.hasta
              ? "No hay pagos que coincidan con estos filtros."
              : "Todavía no hay pagos manuales resueltos."}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {historial?.filas.map((p) => (
            <FilaHistorial key={p.pagoId} pago={p} />
          ))}
        </div>

        {historial !== null && historial.total > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-brand-dark/70 shadow-sm ring-1 ring-black/5">
            <span>
              {historial.total} pago(s) · Página {pagina} de {Math.max(1, Math.ceil(historial.total / LIMITE_PAGINA))}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1 || cargandoHistorial}
                className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagina((p) => Math.min(Math.max(1, Math.ceil(historial.total / LIMITE_PAGINA)), p + 1))}
                disabled={pagina >= Math.max(1, Math.ceil(historial.total / LIMITE_PAGINA)) || cargandoHistorial}
                className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
