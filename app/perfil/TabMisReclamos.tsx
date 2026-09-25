"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listarMisReclamos,
  ETIQUETA_TIPO_RECLAMO,
  ETIQUETA_ESTADO_RECLAMO,
  type ReclamoPasajero,
  type ResultadoReclamos,
  type EstadoReclamo,
} from "@/lib/api";
import { tokenValido } from "@/lib/auth";

const LIMITE_PAGINA = 10;

const COLOR_ESTADO: Record<EstadoReclamo, string> = {
  abierto: "bg-amber-100 text-amber-700",
  en_revision: "bg-blue-100 text-blue-700",
  resuelto: "bg-emerald-100 text-emerald-700",
  rechazado: "bg-slate-100 text-slate-600",
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

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

/** "Mis reclamos" (RF-019): seguimiento de los reclamos que el pasajero envió sobre sus boletos. */
export function TabMisReclamos() {
  const [resultado, setResultado] = useState<ResultadoReclamos<ReclamoPasajero> | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    const token = tokenValido();
    if (!token) return;
    setCargando(true);
    setError(null);
    listarMisReclamos(token, {
      estado: (estadoFiltro || undefined) as EstadoReclamo | undefined,
      pagina,
      limite: LIMITE_PAGINA,
    })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar tus reclamos."))
      .finally(() => setCargando(false));
  }, [estadoFiltro, pagina]);

  useEffect(cargar, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil((resultado?.total ?? 0) / LIMITE_PAGINA));

  return (
    <>
      <p className="text-sm text-brand-dark/70">
        Los reclamos que enviaste sobre tus viajes. Para reportar un problema, ve a &quot;Mis boletos&quot; y elige el
        boleto.
      </p>

      <div className="mt-4 max-w-xs">
        <label
          htmlFor="mis-reclamos-estado"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70"
        >
          Estado
        </label>
        <select
          id="mis-reclamos-estado"
          value={estadoFiltro}
          onChange={(e) => {
            setEstadoFiltro(e.target.value);
            setPagina(1);
          }}
          className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
        >
          <option value="">Todos</option>
          <option value="abierto">Abiertos</option>
          <option value="en_revision">En revisión</option>
          <option value="resuelto">Resueltos a mi favor</option>
          <option value="rechazado">No procedieron</option>
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {resultado === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {resultado !== null && resultado.total === 0 && !cargando && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          {estadoFiltro ? "No tienes reclamos con este estado." : "Todavía no has enviado ningún reclamo."}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {resultado?.filas.map((r) => (
          <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display font-bold text-brand-dark">
                  {r.origenCiudad} → {r.destinoCiudad}
                </p>
                <p className="text-sm text-brand-dark/70">
                  {r.cooperativaNombre} · {r.fechaSalida}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_ESTADO[r.estado]}`}>
                {ETIQUETA_ESTADO_RECLAMO[r.estado]}
              </span>
            </div>

            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-dark/50">
              {ETIQUETA_TIPO_RECLAMO[r.tipo]} · enviado {formatearFechaHora(r.creadoEn)}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-brand-dark">{r.descripcion}</p>

            {r.respuesta && (
              <div className="mt-3 rounded-lg bg-brand-light/30 p-3 text-sm text-brand-dark">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">
                  Respuesta de {r.cooperativaNombre}
                  {r.resueltoEn ? ` · ${formatearFechaHora(r.resueltoEn)}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words">{r.respuesta}</p>
                {r.montoReconocido !== null && (
                  <p className="mt-1 font-semibold">
                    Monto que la cooperativa reconoce devolverte: {formatearDolares(r.montoReconocido)}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {resultado !== null && resultado.total > LIMITE_PAGINA && (
        <div className="mt-4 flex items-center justify-between text-sm text-brand-dark/70">
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
    </>
  );
}
