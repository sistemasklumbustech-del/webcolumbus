"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listarTareasPostpagoAdmin,
  reintentarTareaPostpagoAdmin,
  type EstadoTareaPostpago,
  type ResultadoTareasPostpago,
  type TipoTareaPostpago,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const LIMITE_PAGINA = 25;

const ETIQUETA_TIPO: Record<TipoTareaPostpago, string> = {
  factura_pasaje: "Factura del pasaje",
  registro_tasa: "Registro de la tasa (SIAT 3000)",
  factura_plataforma: "Factura del cargo de servicio",
  confirmacion_cooperativa: "Confirmación de la cooperativa",
};

const ETIQUETA_ESTADO: Record<EstadoTareaPostpago, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  exitosa: "Completada",
  agotada: "Necesita revisión",
};

const COLOR_ESTADO: Record<EstadoTareaPostpago, string> = {
  pendiente: "kb-status--wait",
  en_proceso: "kb-status--wait",
  exitosa: "kb-status--ok",
  agotada: "kb-status--error",
};

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Tareas posteriores al pago (07-oct-2026): la factura del pasaje, el registro de la tasa del
 * terminal, el cargo de servicio y la confirmación que reporta la cooperativa. Las que agotaron
 * sus intentos ("Necesita revisión") quedan frenadas a propósito: reintentarlas a ciegas podría
 * duplicar una factura o cobrar dos veces la tasa, así que primero se revisa qué pasó.
 */
export default function PostpagoAdminPage() {
  const [estado, setEstado] = useState<EstadoTareaPostpago | "">("agotada");
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<ResultadoTareasPostpago | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [idConfirmando, setIdConfirmando] = useState<string | null>(null);
  const [idEnAccion, setIdEnAccion] = useState<string | null>(null);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargando(true);
    listarTareasPostpagoAdmin(token, { estado: estado || undefined, pagina, limite: LIMITE_PAGINA })
      .then((r) => {
        setResultado(r);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las tareas."))
      .finally(() => setCargando(false));
  }, [estado, pagina]);

  useEffect(cargar, [cargar]);

  async function reintentar(id: string) {
    const token = obtenerToken();
    if (!token) return;
    setIdEnAccion(id);
    try {
      await reintentarTareaPostpagoAdmin(token, id);
      setMensajeExito("La tarea volvió a la cola. Se procesará en el siguiente ciclo.");
      setIdConfirmando(null);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reintentar la tarea.");
    } finally {
      setIdEnAccion(null);
    }
  }

  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) : 1;

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Tareas posteriores al pago</h1>
        <p className="mt-1 text-sm text-muted-2">
          Facturas, registro de la tasa del terminal y confirmaciones de las cooperativas. Las que dicen
          &ldquo;Necesita revisión&rdquo; agotaron sus intentos: confirma con el proveedor o la cooperativa qué pasó
          antes de reintentar, para no duplicar una factura ni cobrar dos veces la tasa.
        </p>
      </div>

      {error && (
        <div className="kb-alert kb-alert--error">
          {error}
        </div>
      )}

      <div className="flex items-end gap-3 kb-card kb-on-white p-5">
        <div className="w-full max-w-xs">
          <label htmlFor="postpago-estado" className="kb-label">
            Estado
          </label>
          <select
            id="postpago-estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoTareaPostpago | "");
              setPagina(1);
            }}
            className="w-full kb-input !h-11 !text-sm"
          >
            <option value="agotada">Necesita revisión</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_proceso">En proceso</option>
            <option value="exitosa">Completadas</option>
            <option value="">Todas</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden kb-card kb-on-white">
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-base font-bold text-brand-dark">
            {resultado === null
              ? "Cargando..."
              : `${resultado.total} tarea${resultado.total === 1 ? "" : "s"} con este filtro`}
          </h2>
        </div>

        {resultado !== null && resultado.filas.length === 0 && !cargando && (
          <p className="px-6 py-8 text-center text-sm text-muted-2">
            {estado === "agotada" ? "No hay tareas que necesiten revisión." : "No hay tareas con este filtro."}
          </p>
        )}

        {resultado !== null && resultado.filas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="kb-table min-w-[760px]">
              <thead>
                <tr>
                  <th className="px-6 py-3">Tarea</th>
                  <th className="px-6 py-3">Compra</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Intentos</th>
                  <th className="px-6 py-3">Último error</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {resultado.filas.map((t) => (
                  <tr key={t.id} className="align-top">
                    <td className="px-6 py-3 font-medium text-brand-dark">
                      {ETIQUETA_TIPO[t.tipo] ?? t.tipo}
                      <p className="text-xs font-normal text-muted-3">{formatearFechaHora(t.creadoEn)}</p>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-2" title={t.compraId}>
                      {t.compraId.slice(0, 8)}…
                    </td>
                    <td className="px-6 py-3">
                      <span className={`kb-status ${COLOR_ESTADO[t.estado]}`}>
                        {ETIQUETA_ESTADO[t.estado]}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-2">
                      {t.intentos}/{t.maxIntentos}
                    </td>
                    <td className="max-w-xs px-6 py-3 text-xs text-muted-2">
                      {t.ultimoError ?? <span className="text-muted-3">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {t.estado === "agotada" &&
                        (idConfirmando === t.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => reintentar(t.id)}
                              disabled={idEnAccion === t.id}
                              className="kb-btn kb-btn--dark !h-9 !px-3 !text-xs disabled:opacity-40"
                            >
                              {idEnAccion === t.id ? "Enviando..." : "Sí, reintentar"}
                            </button>
                            <button
                              onClick={() => setIdConfirmando(null)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-2"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIdConfirmando(t.id)}
                            className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
                          >
                            Reintentar
                          </button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {resultado !== null && resultado.total > 0 && (
          <div className="flex items-center justify-between border-t border-line px-6 py-3 text-sm text-muted-2">
            <span>
              Página {pagina} de {totalPaginas}
            </span>
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
      </div>
    </div>
  );
}
