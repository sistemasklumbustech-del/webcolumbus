"use client";

import { useCallback, useEffect, useState } from "react";
import {
  alertasOperacionAdmin,
  exportarOperacionAdmin,
  listarCooperativasAdmin,
  opcionesRutasOperacionAdmin,
  resumenOperacionAdmin,
  rutasOperacionAdmin,
  viajesOperacionAdmin,
  type AlertasOperacion,
  type CooperativaResumen,
  type EstadoViajeOperacion,
  type FiltrosOperacion,
  type ResultadoViajesOperacion,
  type ResumenOperacion,
  type RutaOperacion,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const LIMITE_PAGINA = 25;

const ETIQUETA_ESTADO: Record<EstadoViajeOperacion, string> = {
  programado: "Programado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const COLOR_ESTADO: Record<EstadoViajeOperacion, string> = {
  programado: "bg-blue-100 text-blue-700",
  en_curso: "bg-amber-100 text-amber-700",
  finalizado: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-slate-100 text-slate-600",
};

function hoyEcuador() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Guayaquil" });
}

function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function primerDiaDelMes(fecha: string) {
  return `${fecha.slice(0, 8)}01`;
}

function ultimoDiaDelMes(fecha: string) {
  const d = new Date(`${primerDiaDelMes(fecha)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

function formatearFechaCorta(fecha: string) {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-EC", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

const claseCampo =
  "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

function Tarjeta({ etiqueta, valor, detalle }: { etiqueta: string; valor: React.ReactNode; detalle?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">{etiqueta}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-brand-dark">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-brand-dark/50">{detalle}</p>}
    </div>
  );
}

function BarraOcupacion({ porcentaje }: { porcentaje: number }) {
  const color = porcentaje >= 70 ? "bg-emerald-500" : porcentaje >= 35 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-brand-light" aria-hidden="true">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, porcentaje)}%` }} />
      </div>
      <span className="text-xs font-semibold text-brand-dark/70">{porcentaje}%</span>
    </div>
  );
}

/**
 * Panel operativo (RF-022): toda la operación de la plataforma de un vistazo
 * -- alertas del momento, resumen del período, rutas destacadas y el
 * listado de viajes -- con filtros de fechas, cooperativa, ruta y estado,
 * y exportación a CSV.
 */
export default function OperacionPage() {
  const hoy = hoyEcuador();
  const [desdeCampo, setDesdeCampo] = useState(hoy);
  const [hastaCampo, setHastaCampo] = useState(hoy);
  const [cooperativaCampo, setCooperativaCampo] = useState("");
  const [rutaCampo, setRutaCampo] = useState("");
  const [estadoCampo, setEstadoCampo] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosOperacion>({ desde: hoy, hasta: hoy });
  const [pagina, setPagina] = useState(1);

  const [cooperativas, setCooperativas] = useState<CooperativaResumen[]>([]);
  const [rutasOpciones, setRutasOpciones] = useState<{ id: string; nombre: string }[]>([]);
  const [resumen, setResumen] = useState<ResumenOperacion | null>(null);
  const [viajes, setViajes] = useState<ResultadoViajesOperacion | null>(null);
  const [rutas, setRutas] = useState<RutaOperacion[] | null>(null);
  const [alertas, setAlertas] = useState<AlertasOperacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    listarCooperativasAdmin(token)
      .then(setCooperativas)
      .catch(() => setCooperativas([]));
    alertasOperacionAdmin(token)
      .then(setAlertas)
      .catch(() => setAlertas(null));
  }, []);

  // Las rutas ofrecidas dependen de la cooperativa elegida.
  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    opcionesRutasOperacionAdmin(token, cooperativaCampo || undefined)
      .then(setRutasOpciones)
      .catch(() => setRutasOpciones([]));
  }, [cooperativaCampo]);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargando(true);
    setError(null);
    Promise.all([
      resumenOperacionAdmin(token, aplicados),
      viajesOperacionAdmin(token, { ...aplicados, pagina, limite: LIMITE_PAGINA }),
      rutasOperacionAdmin(token, aplicados),
    ])
      .then(([r, v, ru]) => {
        setResumen(r);
        setViajes(v);
        setRutas(ru);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el panel."))
      .finally(() => setCargando(false));
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  function aplicarRango(desde: string, hasta: string) {
    setDesdeCampo(desde);
    setHastaCampo(hasta);
    setPagina(1);
    setAplicados((a) => ({ ...a, desde, hasta }));
  }

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    if (!desdeCampo || !hastaCampo) {
      setError("Indica la fecha desde y la fecha hasta.");
      return;
    }
    if (desdeCampo > hastaCampo) {
      setError('La fecha "desde" no puede ser posterior a "hasta".');
      return;
    }
    setPagina(1);
    setAplicados({
      desde: desdeCampo,
      hasta: hastaCampo,
      cooperativaId: cooperativaCampo || undefined,
      rutaId: rutaCampo || undefined,
      estado: (estadoCampo || undefined) as EstadoViajeOperacion | undefined,
    });
  }

  function limpiar() {
    setDesdeCampo(hoy);
    setHastaCampo(hoy);
    setCooperativaCampo("");
    setRutaCampo("");
    setEstadoCampo("");
    setPagina(1);
    setAplicados({ desde: hoy, hasta: hoy });
  }

  async function exportar() {
    const token = obtenerToken();
    if (!token) return;
    setExportando(true);
    try {
      await exportarOperacionAdmin(token, aplicados);
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : "No se pudo exportar.");
    } finally {
      setExportando(false);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil((viajes?.total ?? 0) / LIMITE_PAGINA));
  const esUnDia = aplicados.desde === aplicados.hasta;
  const atajo = (activo: boolean) =>
    `rounded-lg border px-3 py-2 text-sm font-semibold transition ${
      activo ? "border-brand bg-brand text-white" : "border-brand-light bg-white text-brand-dark/70 hover:bg-brand-light/40"
    }`;
  const hayAlertas =
    !!alertas &&
    (alertas.pagosPendientes.cantidad > 0 ||
      alertas.reclamos.abiertos > 0 ||
      alertas.viajesAtrasados.length > 0 ||
      alertas.viajesBajaOcupacion.length > 0);

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-dark">Operación</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-dark/70">
            Cómo va la operación de todas las cooperativas: viajes, ocupación, ventas y lo que necesita atención.
          </p>
        </div>
        <button
          type="button"
          onClick={exportar}
          disabled={exportando || viajes === null || viajes.total === 0}
          className="rounded-lg border border-brand-light bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light/40 disabled:opacity-40"
        >
          {exportando ? "Exportando..." : "Exportar CSV"}
        </button>
      </div>

      {/* Alertas del momento: no dependen del rango de fechas. */}
      <section aria-label="Alertas operativas" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-base font-bold text-brand-dark">Requiere atención ahora</h2>
        {alertas === null && <p className="mt-2 text-sm text-brand-dark/50">Cargando...</p>}
        {alertas !== null && !hayAlertas && (
          <p className="mt-2 text-sm text-emerald-700">✓ Todo en orden: no hay alertas por ahora.</p>
        )}
        {alertas !== null && hayAlertas && (
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              {alertas.pagosPendientes.cantidad > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                  {alertas.pagosPendientes.cantidad} pago(s) manual(es) sin confirmar
                  {alertas.pagosPendientes.masAntiguoHoras !== null
                    ? ` · el más antiguo espera ${alertas.pagosPendientes.masAntiguoHoras} h`
                    : ""}
                </span>
              )}
              {alertas.reclamos.abiertos > 0 && (
                <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">
                  {alertas.reclamos.abiertos} reclamo(s) abierto(s)
                  {alertas.reclamos.enRevision > 0 ? ` · ${alertas.reclamos.enRevision} en revisión` : ""}
                </span>
              )}
            </div>
            {alertas.viajesAtrasados.length > 0 && (
              <div>
                <p className="font-semibold text-brand-dark">Viajes que ya debieron salir y siguen &quot;programados&quot;</p>
                <ul className="mt-1 space-y-1 text-brand-dark/80">
                  {alertas.viajesAtrasados.map((v) => (
                    <li key={v.viajeId} className="break-words">
                      {v.cooperativa} · {v.ruta} · salida {v.horaSalida} ·{" "}
                      <span className="font-semibold text-red-700">{v.minutosAtraso} min de atraso</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {alertas.viajesBajaOcupacion.length > 0 && (
              <div>
                <p className="font-semibold text-brand-dark">Salen en las próximas 12 horas con menos del 20 % ocupado</p>
                <ul className="mt-1 space-y-1 text-brand-dark/80">
                  {alertas.viajesBajaOcupacion.map((v) => (
                    <li key={v.viajeId} className="break-words">
                      {v.cooperativa} · {v.ruta} · salida {v.horaSalida} · {v.ocupacion}% ocupado
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <form
        onSubmit={filtrar}
        className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
      >
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => aplicarRango(hoy, hoy)} className={atajo(aplicados.desde === hoy && aplicados.hasta === hoy)}>
            Hoy
          </button>
          <button
            type="button"
            onClick={() => aplicarRango(sumarDias(hoy, 1), sumarDias(hoy, 1))}
            className={atajo(aplicados.desde === sumarDias(hoy, 1) && aplicados.hasta === sumarDias(hoy, 1))}
          >
            Mañana
          </button>
          <button
            type="button"
            onClick={() => aplicarRango(sumarDias(hoy, -6), hoy)}
            className={atajo(aplicados.desde === sumarDias(hoy, -6) && aplicados.hasta === hoy)}
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => aplicarRango(primerDiaDelMes(hoy), ultimoDiaDelMes(hoy))}
            className={atajo(aplicados.desde === primerDiaDelMes(hoy) && aplicados.hasta === ultimoDiaDelMes(hoy))}
          >
            Este mes
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="op-desde" className={claseEtiqueta}>
              Desde
            </label>
            <input id="op-desde" type="date" value={desdeCampo} onChange={(e) => setDesdeCampo(e.target.value)} className={claseCampo} />
          </div>
          <div>
            <label htmlFor="op-hasta" className={claseEtiqueta}>
              Hasta
            </label>
            <input id="op-hasta" type="date" value={hastaCampo} onChange={(e) => setHastaCampo(e.target.value)} className={claseCampo} />
          </div>
          <div>
            <label htmlFor="op-cooperativa" className={claseEtiqueta}>
              Cooperativa
            </label>
            <select
              id="op-cooperativa"
              value={cooperativaCampo}
              onChange={(e) => {
                setCooperativaCampo(e.target.value);
                setRutaCampo("");
              }}
              className={claseCampo}
            >
              <option value="">Todas</option>
              {cooperativas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreComercial}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="op-ruta" className={claseEtiqueta}>
              Ruta
            </label>
            <select id="op-ruta" value={rutaCampo} onChange={(e) => setRutaCampo(e.target.value)} className={claseCampo}>
              <option value="">Todas</option>
              {rutasOpciones.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="op-estado" className={claseEtiqueta}>
              Estado del viaje
            </label>
            <select id="op-estado" value={estadoCampo} onChange={(e) => setEstadoCampo(e.target.value)} className={claseCampo}>
              <option value="">Todos</option>
              {Object.entries(ETIQUETA_ESTADO).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark sm:flex-none"
          >
            Aplicar filtros
          </button>
          <button
            type="button"
            onClick={limpiar}
            className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40"
          >
            Limpiar
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{error}</div>
      )}

      <p className="text-sm font-semibold text-brand-dark/70">
        {esUnDia ? formatearFechaCorta(aplicados.desde ?? hoy) : `Del ${formatearFechaCorta(aplicados.desde ?? hoy)} al ${formatearFechaCorta(aplicados.hasta ?? hoy)}`}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta
          etiqueta="Viajes"
          valor={resumen?.totalViajes ?? "—"}
          detalle={
            resumen
              ? `${resumen.viajesPorEstado.programado} prog. · ${resumen.viajesPorEstado.en_curso} en curso · ${resumen.viajesPorEstado.finalizado} fin. · ${resumen.viajesPorEstado.cancelado} canc.`
              : undefined
          }
        />
        <Tarjeta
          etiqueta="Boletos vendidos"
          valor={resumen?.boletosVendidos ?? "—"}
          detalle={resumen ? `${resumen.boletosCancelados} cancelado(s)` : undefined}
        />
        <Tarjeta etiqueta="Ingresos" valor={resumen ? formatearDolares(resumen.ingresos) : "—"} detalle="Sin boletos cancelados" />
        <Tarjeta
          etiqueta="Ocupación promedio"
          valor={resumen ? `${resumen.ocupacionPromedio}%` : "—"}
          detalle="Asientos vendidos / capacidad"
        />
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">Rutas con más ventas</h2>
        </div>
        {rutas !== null && rutas.length === 0 && !cargando && (
          <p className="px-6 py-6 text-center text-sm text-brand-dark/50">No hay viajes en este período.</p>
        )}
        {rutas !== null && rutas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                <tr>
                  <th className="px-4 py-3">Ruta</th>
                  <th className="px-4 py-3">Cooperativa</th>
                  <th className="px-4 py-3 text-right">Viajes</th>
                  <th className="px-4 py-3 text-right">Boletos</th>
                  <th className="px-4 py-3">Ocupación</th>
                  <th className="px-4 py-3 text-right">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rutas.map((r) => (
                  <tr key={r.rutaId}>
                    <td className="px-4 py-3 font-medium text-brand-dark">{r.ruta}</td>
                    <td className="px-4 py-3 text-brand-dark/70">{r.cooperativa}</td>
                    <td className="px-4 py-3 text-right text-brand-dark/70">{r.viajes}</td>
                    <td className="px-4 py-3 text-right text-brand-dark/70">
                      {r.vendidos}/{r.capacidad}
                    </td>
                    <td className="px-4 py-3">
                      <BarraOcupacion porcentaje={r.ocupacion} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-dark">{formatearDolares(r.ingresos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">
            {viajes === null ? "Cargando..." : `${viajes.total} viaje(s)`}
          </h2>
        </div>
        {viajes !== null && viajes.filas.length === 0 && !cargando && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">No hay viajes con estos filtros.</p>
        )}
        {viajes !== null && viajes.filas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                <tr>
                  <th className="px-4 py-3">Salida</th>
                  <th className="px-4 py-3">Cooperativa</th>
                  <th className="px-4 py-3">Ruta</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Boletos</th>
                  <th className="px-4 py-3">Ocupación</th>
                  <th className="px-4 py-3 text-right">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {viajes.filas.map((v) => (
                  <tr key={v.viajeId}>
                    <td className="whitespace-nowrap px-4 py-3 text-brand-dark/70">
                      {formatearFechaCorta(v.fechaSalida)} · {v.horaSalida}
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-dark">{v.cooperativa}</td>
                    <td className="px-4 py-3 text-brand-dark/80">{v.ruta}</td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-dark/70">{v.placa}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_ESTADO[v.estado]}`}>
                        {ETIQUETA_ESTADO[v.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-brand-dark/70">
                      {v.vendidos}/{v.capacidad}
                    </td>
                    <td className="px-4 py-3">
                      <BarraOcupacion porcentaje={v.ocupacion} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-dark">{formatearDolares(v.ingresos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {viajes !== null && viajes.total > 0 && (
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
      </section>
    </div>
  );
}
