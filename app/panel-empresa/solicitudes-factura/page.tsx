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
    <div className="kb-card kb-on-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-bold text-brand-dark">{solicitud.pasajeroNombre}</p>
          <p className="text-xs text-muted-3">
            Solicitado {formatearFecha(solicitud.creadoEn)}
          </p>
        </div>
        <span
          className={`kb-status ${
            solicitud.estado === "emitida"
              ? "kb-status--ok"
              : "kb-status--wait"
          }`}
        >
          {solicitud.estado === "emitida" ? "Emitida" : "Pendiente"}
        </span>
      </div>

      <div className="mt-3 kb-on-white rounded-ctrl bg-kbbg p-3 text-sm text-brand-dark">
        {Object.entries(solicitud.datosTributarios).map(([clave, valor]) => (
          <p key={clave} className="break-words">
            <span className="text-muted-2 capitalize">{clave}: </span>
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
            className="w-full kb-input !h-11 !text-sm"
          />
          <button
            onClick={marcarEmitida}
            disabled={guardando}
            className="kb-btn kb-btn--primary !h-11 !px-5 !text-sm"
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

      <h1 className="text-2xl font-bold text-brand-dark">Solicitudes de factura</h1>
      <p className="mt-1 text-sm text-muted-2">
        Pasajeros que pidieron la factura de su pasaje — la emites en tu propio sistema contable y
        la marcas aquí como lista.
      </p>

      {error && (
        <div className="mt-4 kb-alert kb-alert--error">
          {error}
        </div>
      )}

      <form
        onSubmit={filtrar}
        className="mt-6 grid grid-cols-1 gap-4 kb-card kb-on-white p-5 sm:grid-cols-3 sm:items-end"
      >
        <div>
          <label htmlFor="factura-filtro-estado" className="kb-label">
            Estado
          </label>
          <select
            id="factura-filtro-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="w-full kb-input !h-11 !text-sm"
          >
            <option value="">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="emitida">Emitidas</option>
          </select>
        </div>
        <div>
          <label htmlFor="factura-filtro-busqueda" className="kb-label">
            Buscar
          </label>
          <input
            id="factura-filtro-busqueda"
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            placeholder="Pasajero, RUC o razón social"
            className="w-full kb-input !h-11 !text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="flex-1 kb-btn kb-btn--dark !h-10 !px-4 !text-sm">
            Filtrar
          </button>
          <button type="button" onClick={limpiarFiltros} className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm">
            Limpiar
          </button>
        </div>
      </form>

      {resultado === null && !error && <p className="mt-6 text-sm text-muted-2">Cargando...</p>}

      {resultado !== null && resultado.total === 0 && !cargandoLista && (
        <p className="mt-8 text-center text-sm text-muted-2">
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
          <h2 className="text-sm font-bold text-muted-2">Ya emitidas</h2>
          <div className="mt-2 space-y-3">
            {emitidas.map((s) => (
              <TarjetaSolicitud key={s.id} solicitud={s} onEmitida={cargar} onError={setError} />
            ))}
          </div>
        </div>
      )}

      {resultado !== null && resultado.total > 0 && (
        <div className="mt-6 flex items-center justify-between kb-card kb-on-white px-4 py-3 text-sm text-muted-2">
          <span>
            {resultado.total} solicitud(es) · Página {pagina} de {Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA))}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || cargandoLista}
              className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)), p + 1))}
              disabled={pagina >= Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) || cargandoLista}
              className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
