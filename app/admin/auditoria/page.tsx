"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  listarAuditoriaAdmin,
  listarAccionesAuditoriaAdmin,
  exportarAuditoriaAdmin,
  type FiltrosAuditoria,
  type RegistroAuditoria,
  type ResultadoAuditoria,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const LIMITE_PAGINA = 50;

const ETIQUETA_ACCION: Record<string, string> = {
  aprobacion_cooperativa: "Aprobación de cooperativa",
  baja_cooperativa: "Baja de cooperativa",
  cambio_comision: "Cambio de cargo de plataforma",
  aprobacion_campana: "Aprobación de campaña",
  ajuste_liquidacion: "Ajuste de liquidación",
  actualizacion_iva_nacional: "Cambio del IVA nacional",
  creacion_administrador: "Creación de administrador",
  eliminacion_administrador: "Eliminación de administrador",
  cambio_modo_iva_boleto: "Cambio del modo de IVA en el boleto",
  cambio_cashback_porcentaje: "Cambio del porcentaje de cashback",
  cambio_config_referidos: "Cambio de la configuración de referidos",
  cambio_contacto_soporte: "Cambio del contacto de soporte",
  suspension_cooperativa: "Suspensión de cooperativa",
  reactivacion_cooperativa: "Reactivación de cooperativa",
  inicio_sesion: "Inicio de sesión",
  generacion_viajes: "Generación automática de viajes",
  resolucion_reclamo: "Resolución de reclamo",
  confirmacion_pago_manual: "Confirmación de pago manual",
  rechazo_pago_manual: "Rechazo de pago manual",
  registro_cuenta_cobro: "Registro de cuenta de cobro",
  verificacion_cuenta_cobro: "Verificación de cuenta de cobro",
  rechazo_cuenta_cobro: "Rechazo de cuenta de cobro",
};

function nombreAccion(accion: string) {
  return ETIQUETA_ACCION[accion] ?? accion.replace(/_/g, " ");
}

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const claseCampo =
  "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

/**
 * Auditoría de la plataforma (RF-021): quién hizo qué, desde qué IP, con
 * qué resultado, y qué hizo el propio sistema. Solo lectura -- los
 * registros no se pueden editar ni borrar (ver la migración 003 de roles).
 */
export default function AuditoriaPage() {
  const [resultado, setResultado] = useState<ResultadoAuditoria | null>(null);
  const [acciones, setAcciones] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  const [accionFiltro, setAccionFiltro] = useState("");
  const [origenFiltro, setOrigenFiltro] = useState("");
  const [resultadoFiltro, setResultadoFiltro] = useState("");
  const [busquedaFiltro, setBusquedaFiltro] = useState("");
  const [ipFiltro, setIpFiltro] = useState("");
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosAuditoria>({ pagina: 1, limite: LIMITE_PAGINA });
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    listarAccionesAuditoriaAdmin(token)
      .then(setAcciones)
      .catch(() => setAcciones([]));
  }, []);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargando(true);
    setError(null);
    listarAuditoriaAdmin(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la auditoría."))
      .finally(() => setCargando(false));
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setExpandido(null);
    setAplicados({
      accion: accionFiltro || undefined,
      origen: (origenFiltro || undefined) as FiltrosAuditoria["origen"],
      resultado: (resultadoFiltro || undefined) as FiltrosAuditoria["resultado"],
      busqueda: busquedaFiltro.trim() || undefined,
      ip: ipFiltro.trim() || undefined,
      desde: desdeFiltro || undefined,
      hasta: hastaFiltro || undefined,
      pagina: 1,
      limite: LIMITE_PAGINA,
    });
  }

  function limpiarFiltros() {
    setAccionFiltro("");
    setOrigenFiltro("");
    setResultadoFiltro("");
    setBusquedaFiltro("");
    setIpFiltro("");
    setDesdeFiltro("");
    setHastaFiltro("");
    setPagina(1);
    setExpandido(null);
    setAplicados({ pagina: 1, limite: LIMITE_PAGINA });
  }

  async function exportar() {
    const token = obtenerToken();
    if (!token) return;
    setExportando(true);
    try {
      const { pagina: _p, limite: _l, ...filtros } = aplicados;
      void _p;
      void _l;
      await exportarAuditoriaAdmin(token, filtros);
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : "No se pudo exportar.");
    } finally {
      setExportando(false);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil((resultado?.total ?? 0) / LIMITE_PAGINA));

  function quien(r: RegistroAuditoria) {
    if (r.origen === "sistema") return "Sistema (automático)";
    if (r.usuarioNombre) return r.usuarioNombre;
    const correo = typeof r.detalle?.correo === "string" ? r.detalle.correo : null;
    return correo ?? "Sin usuario identificado";
  }

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-dark">Auditoría</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-dark/70">
            Registro de lo que se hace en la plataforma: quién, cuándo, desde qué dirección IP y con qué resultado, más
            lo que hace el propio sistema. Los registros no se pueden editar ni borrar.
          </p>
        </div>
        <button
          type="button"
          onClick={exportar}
          disabled={exportando || resultado === null || resultado.total === 0}
          className="rounded-lg border border-brand-light bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light/40 disabled:opacity-40"
        >
          {exportando ? "Exportando..." : "Exportar CSV"}
        </button>
      </div>

      <form
        onSubmit={filtrar}
        className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label htmlFor="aud-accion" className={claseEtiqueta}>
            Acción
          </label>
          <select id="aud-accion" value={accionFiltro} onChange={(e) => setAccionFiltro(e.target.value)} className={claseCampo}>
            <option value="">Todas</option>
            {acciones.map((a) => (
              <option key={a} value={a}>
                {nombreAccion(a)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="aud-origen" className={claseEtiqueta}>
            Origen
          </label>
          <select id="aud-origen" value={origenFiltro} onChange={(e) => setOrigenFiltro(e.target.value)} className={claseCampo}>
            <option value="">Personas y sistema</option>
            <option value="usuario">Personas</option>
            <option value="sistema">Sistema (automático)</option>
          </select>
        </div>
        <div>
          <label htmlFor="aud-resultado" className={claseEtiqueta}>
            Resultado
          </label>
          <select
            id="aud-resultado"
            value={resultadoFiltro}
            onChange={(e) => setResultadoFiltro(e.target.value)}
            className={claseCampo}
          >
            <option value="">Todos</option>
            <option value="exito">Éxito</option>
            <option value="fallo">Fallo</option>
          </select>
        </div>
        <div>
          <label htmlFor="aud-ip" className={claseEtiqueta}>
            Dirección IP
          </label>
          <input id="aud-ip" value={ipFiltro} onChange={(e) => setIpFiltro(e.target.value)} placeholder="190.15…" className={claseCampo} />
        </div>
        <div>
          <label htmlFor="aud-desde" className={claseEtiqueta}>
            Desde
          </label>
          <input id="aud-desde" type="date" value={desdeFiltro} onChange={(e) => setDesdeFiltro(e.target.value)} className={claseCampo} />
        </div>
        <div>
          <label htmlFor="aud-hasta" className={claseEtiqueta}>
            Hasta
          </label>
          <input id="aud-hasta" type="date" value={hastaFiltro} onChange={(e) => setHastaFiltro(e.target.value)} className={claseCampo} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="aud-busqueda" className={claseEtiqueta}>
            Buscar
          </label>
          <input
            id="aud-busqueda"
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            placeholder="Nombre o correo, tipo de entidad o texto del detalle"
            className={claseCampo}
          />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark sm:flex-none"
          >
            Filtrar
          </button>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40"
          >
            Limpiar
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">
            {resultado === null ? "Cargando..." : `${resultado.total} registro(s) con estos filtros`}
          </h2>
        </div>

        {resultado !== null && resultado.filas.length === 0 && !cargando && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">No hay registros que coincidan con estos filtros.</p>
        )}

        {resultado !== null && resultado.filas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Quién</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {resultado.filas.map((r) => (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3 text-brand-dark/70">{formatearFechaHora(r.creadoEn)}</td>
                      <td className="px-4 py-3 font-medium text-brand-dark">{nombreAccion(r.accion)}</td>
                      <td className="px-4 py-3 text-brand-dark/80">
                        <span className="block break-words">{quien(r)}</span>
                        {r.usuarioRol && <span className="block text-xs text-brand-dark/40">{r.usuarioRol}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            r.resultado === "exito" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.resultado === "exito" ? "Éxito" : "Fallo"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-brand-dark/70">
                        {r.direccionIp ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandido((actual) => (actual === r.id ? null : r.id))}
                          className="text-xs font-semibold text-brand-cobalto underline decoration-dotted underline-offset-2"
                        >
                          {expandido === r.id ? "Ocultar" : "Ver"}
                        </button>
                      </td>
                    </tr>
                    {expandido === r.id && (
                      <tr className="bg-brand-light/20">
                        <td colSpan={6} className="px-4 py-3 text-xs text-brand-dark/80">
                          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                            <div>
                              <dt className="inline text-brand-dark/50">Origen: </dt>
                              <dd className="inline">{r.origen === "sistema" ? "Sistema (automático)" : "Persona"}</dd>
                            </div>
                            <div>
                              <dt className="inline text-brand-dark/50">Correo: </dt>
                              <dd className="inline break-all">{r.usuarioCorreo ?? "—"}</dd>
                            </div>
                            <div>
                              <dt className="inline text-brand-dark/50">Entidad: </dt>
                              <dd className="inline">{r.entidadTipo}</dd>
                            </div>
                            <div>
                              <dt className="inline text-brand-dark/50">ID de la entidad: </dt>
                              <dd className="inline break-all font-mono">{r.entidadId ?? "—"}</dd>
                            </div>
                          </dl>
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 font-mono text-[11px] ring-1 ring-black/5">
                            {r.detalle && Object.keys(r.detalle).length > 0 ? JSON.stringify(r.detalle, null, 2) : "Sin detalle adicional."}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {resultado !== null && resultado.total > 0 && (
          <div className="flex items-center justify-between border-t border-black/5 px-6 py-3 text-sm text-brand-dark/70">
            <span>
              Página {pagina} de {totalPaginas}
            </span>
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
      </div>
    </div>
  );
}
