"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listarSolicitudesFactura,
  marcarFacturaEmitida,
  type SolicitudFactura,
  type FiltrosSolicitudesFactura,
  type ResultadoSolicitudesFactura,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const LIMITE_PAGINA = 25;

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TarjetaSolicitud({
  solicitud,
  onEmitida,
  onError,
}: {
  solicitud: SolicitudFactura;
  onEmitida: () => void;
  onError: (m: string) => void;
}) {
  const [urlFactura, setUrlFactura] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function marcarEmitida() {
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    try {
      await marcarFacturaEmitida(token, solicitud.id, urlFactura.trim() || undefined);
      onEmitida();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo marcar como emitida.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-display font-bold text-brand-dark">{solicitud.pasajeroNombre}</p>
          <p className="text-xs text-brand-dark/40">
            Solicitado {formatearFecha(solicitud.creadoEn)}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            solicitud.estado === "emitida"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {solicitud.estado === "emitida" ? "Emitida" : "Pendiente"}
        </span>
      </div>

      <div className="mt-3 rounded-lg bg-brand-light/30 p-3 text-sm text-brand-dark">
        {Object.entries(solicitud.datosTributarios).map(([clave, valor]) => (
          <p key={clave} className="break-words">
            <span className="text-brand-dark/50 capitalize">{clave}: </span>
            <span className="font-semibold">{valor}</span>
          </p>
        ))}
      </div>

      {solicitud.estado === "pendiente" ? (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={urlFactura}
            onChange={(e) => setUrlFactura(e.target.value)}
            placeholder="Link a la factura (opcional)"
            className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
          <button
            onClick={marcarEmitida}
            disabled={guardando}
            className="rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Marcar como emitida"}
          </button>
        </div>
      ) : (
        solicitud.urlFactura && (
          <a
            href={solicitud.urlFactura}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-brand-dark"
          >
            Ver factura
          </a>
        )
      )}
    </div>
  );
}

export default function SolicitudesFacturaPage() {
  const [resultado, setResultado] = useState<ResultadoSolicitudesFactura | null>(null);
  const [cargandoLista, setCargandoLista] = useState(false);
  // Paginación real (23-sep-2026) -- ver el comentario del backend.
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [busquedaFiltro, setBusquedaFiltro] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosSolicitudesFactura>({ pagina: 1, limite: LIMITE_PAGINA });
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargandoLista(true);
    listarSolicitudesFactura(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar."))
      .finally(() => setCargandoLista(false));
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setAplicados({
      estado: estadoFiltro === "pendiente" || estadoFiltro === "emitida" ? estadoFiltro : undefined,
      busqueda: busquedaFiltro.trim() || undefined,
      pagina: 1,
      limite: LIMITE_PAGINA,
    });
  }

  function limpiarFiltros() {
    setEstadoFiltro("");
    setBusquedaFiltro("");
    setPagina(1);
    setAplicados({ pagina: 1, limite: LIMITE_PAGINA });
  }

  const pendientes = resultado?.filas.filter((s) => s.estado === "pendiente") ?? [];
  const emitidas = resultado?.filas.filter((s) => s.estado === "emitida") ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="font-display text-2xl font-bold text-brand-dark">Solicitudes de factura</h1>
      <p className="mt-1 text-sm text-brand-dark/70">
        Pasajeros que pidieron la factura de su pasaje — la emites en tu propio sistema contable y
        la marcas aquí como lista.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      <form
        onSubmit={filtrar}
        className="mt-6 grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-3 sm:items-end"
      >
        <div>
          <label htmlFor="factura-filtro-estado" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Estado
          </label>
          <select
            id="factura-filtro-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="emitida">Emitidas</option>
          </select>
        </div>
        <div>
          <label htmlFor="factura-filtro-busqueda" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Buscar
          </label>
          <input
            id="factura-filtro-busqueda"
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            placeholder="Pasajero, RUC o razón social"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
            Filtrar
          </button>
          <button type="button" onClick={limpiarFiltros} className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40">
            Limpiar
          </button>
        </div>
      </form>

      {resultado === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {resultado !== null && resultado.total === 0 && !cargandoLista && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          {aplicados.estado || aplicados.busqueda
            ? "No hay solicitudes que coincidan con estos filtros."
            : "Todavía no hay ninguna solicitud de factura."}
        </p>
      )}

      {pendientes.length > 0 && (
        <div className="mt-6 space-y-3">
          {pendientes.map((s) => (
            <TarjetaSolicitud
              key={s.id}
              solicitud={s}
              onEmitida={() => {
                setMensajeExito("Factura marcada como emitida.");
                cargar();
              }}
              onError={setError}
            />
          ))}
        </div>
      )}

      {emitidas.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-sm font-bold text-brand-dark/50">Ya emitidas</h2>
          <div className="mt-2 space-y-3">
            {emitidas.map((s) => (
              <TarjetaSolicitud key={s.id} solicitud={s} onEmitida={cargar} onError={setError} />
            ))}
          </div>
        </div>
      )}

      {resultado !== null && resultado.total > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-brand-dark/70 shadow-sm ring-1 ring-black/5">
          <span>
            {resultado.total} solicitud(es) · Página {pagina} de {Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA))}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || cargandoLista}
              className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)), p + 1))}
              disabled={pagina >= Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) || cargandoLista}
              className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
