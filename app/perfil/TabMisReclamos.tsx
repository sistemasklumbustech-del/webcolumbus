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
import { formatearFechaCorta } from "@/app/buscar/SinResultadosAlternativas";
import { EstadoCargando, EstadoVacio, ICONOS_CUENTA } from "@/components/EstadoCuenta";

const LIMITE_PAGINA = 10;

const COLOR_ESTADO: Record<EstadoReclamo, string> = {
  abierto: "kb-status--wait",
  en_revision: "kb-status--wait",
  resuelto: "kb-status--ok",
  rechazado: "kb-status--error",
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
      <p className="text-[15px] leading-relaxed text-muted-2">
        Los reclamos que enviaste sobre tus viajes. Para reportar un problema, ve a &quot;Mis boletos&quot; y elige el
        boleto.
      </p>

      <div className="mt-4 md:max-w-xs">
        <label
          htmlFor="mis-reclamos-estado"
          className="kb-label"
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
          className="kb-input"
        >
          <option value="">Todos</option>
          <option value="abierto">Abiertos</option>
          <option value="en_revision">En revisión</option>
          <option value="resuelto">Resueltos a mi favor</option>
          <option value="rechazado">No procedieron</option>
        </select>
      </div>

      {error && (
        <div className="mt-4 kb-alert kb-alert--error">
          {error}
        </div>
      )}

      {resultado === null && !error && (
        <div className="mt-6">
          <EstadoCargando />
        </div>
      )}

      {resultado !== null && resultado.total === 0 && !cargando && (
        <div className="mt-6">
          {estadoFiltro ? (
            <EstadoVacio icono={ICONOS_CUENTA.reclamo} titulo="Sin reclamos con este estado" texto="Prueba con otro estado o elige “Todos”." />
          ) : (
            <EstadoVacio
              icono={ICONOS_CUENTA.reclamo}
              titulo="Todavía no has enviado ningún reclamo"
              texto="Si algo salió mal en un viaje, repórtalo desde el boleto en Mis boletos."
              accion={{ texto: "Ir a Mis boletos", href: "/perfil?tab=boletos" }}
            />
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {resultado?.filas.map((r) => (
          <article key={r.id} className="rounded-card border border-line bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {r.origenCiudad} → {r.destinoCiudad}
                </p>
                <p className="text-sm text-muted-2">
                  {r.cooperativaNombre} · {/^\d{4}-\d{2}-\d{2}$/.test(r.fechaSalida) ? formatearFechaCorta(r.fechaSalida) : r.fechaSalida}
                </p>
              </div>
              <span className={`kb-status shrink-0 ${COLOR_ESTADO[r.estado]}`}>
                {ETIQUETA_ESTADO_RECLAMO[r.estado]}
              </span>
            </div>

            <p className="mt-3 text-[13px] font-semibold text-ink">
              {ETIQUETA_TIPO_RECLAMO[r.tipo]} <span className="font-normal text-muted-2">· enviado {formatearFechaHora(r.creadoEn)}</span>
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">{r.descripcion}</p>

            {r.respuesta && (
              <div className="mt-3 rounded-[14px] bg-kbbg p-3.5 text-sm text-ink">
                <p className="text-[13px] font-semibold text-muted-2">
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
          </article>
        ))}
      </div>

      {resultado !== null && resultado.total > LIMITE_PAGINA && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-2">
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || cargando}
              className="kb-btn kb-btn--outline !h-11 !px-4 !text-sm"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || cargando}
              className="kb-btn kb-btn--outline !h-11 !px-4 !text-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}
