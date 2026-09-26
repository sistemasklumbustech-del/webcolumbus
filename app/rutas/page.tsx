"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { obtenerCatalogoRutas, type ParRutasCatalogo, type OpcionRutaCatalogo } from "@/lib/api";
import { describirDias } from "@/lib/dias-semana";
import { estimarTrayecto, formatearDuracion } from "@/lib/trayecto";
import { usePaginacionLocal, ControlesPaginacion } from "@/components/Paginacion";

const claseCampo =
  "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

function hoyEcuador() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Guayaquil" });
}

/** Tiempo de viaje de un par de ciudades: el cargado por la cooperativa, o una estimación por distancia. */
function estimarPar(opciones: OpcionRutaCatalogo[]) {
  for (const o of opciones) {
    const e = estimarTrayecto({
      horaSalidaProgramada: "2026-01-01T12:00:00.000Z",
      horaLlegadaEstimada: null,
      duracionEstimadaMinutos: o.duracionEstimadaMinutos,
      distanciaKm: o.distanciaKm,
      origenLatitud: o.origenLatitud,
      origenLongitud: o.origenLongitud,
      destinoLatitud: o.destinoLatitud,
      destinoLongitud: o.destinoLongitud,
      origenNombre: o.origenNombre,
      destinoNombre: o.destinoNombre,
    });
    if (e) return e;
  }
  return null;
}

/** Agrupa los horarios de una opción por días: "Lunes a viernes: 07:00, 21:00". */
function agruparHorarios(o: OpcionRutaCatalogo) {
  const grupos = new Map<string, { hora: string; tipoVehiculo: string | null }[]>();
  for (const h of o.horarios) {
    const clave = describirDias(h.dias);
    grupos.set(clave, [...(grupos.get(clave) ?? []), { hora: h.hora, tipoVehiculo: h.tipoVehiculo }]);
  }
  return [...grupos.entries()];
}

function TarjetaPar({ par }: { par: ParRutasCatalogo }) {
  const estimacion = estimarPar(par.opciones);
  const desde = Math.min(...par.opciones.map((o) => o.precioReferencia));

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
        <h2 className="font-display text-lg font-bold text-brand-dark">
          {par.origenCiudad} → {par.destinoCiudad}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {estimacion && (
            <span className="rounded-full bg-brand-light px-3 py-1 text-brand-dark">
              {estimacion.aproximado ? "≈ " : ""}
              {formatearDuracion(estimacion.minutos)}
            </span>
          )}
          {estimacion?.km ? (
            <span className="rounded-full bg-brand-light px-3 py-1 text-brand-dark">
              {estimacion.aproximado ? "≈ " : ""}
              {Math.round(estimacion.km)} km
            </span>
          ) : null}
          <span className="rounded-full bg-brand-amber/20 px-3 py-1 text-brand-dark">Desde ${desde.toFixed(2)}</span>
        </div>
      </header>

      <ul className="divide-y divide-black/5">
        {par.opciones.map((o) => {
          const grupos = agruparHorarios(o);
          const buscarHref =
            `/buscar?origenId=${o.origenId}&destinoId=${o.destinoId}` +
            `&origenCiudad=${encodeURIComponent(par.origenCiudad)}&destinoCiudad=${encodeURIComponent(par.destinoCiudad)}` +
            `&fecha=${hoyEcuador()}&pasajeros=1`;
          return (
            <li key={o.rutaId} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {o.cooperativaLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- logo dinámico del almacenamiento
                    <img
                      src={o.cooperativaLogoUrl}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-black/10"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand-dark"
                    >
                      {o.cooperativaNombre.charAt(0)}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-brand-dark">{o.cooperativaNombre}</p>
                    <p className="text-xs text-brand-dark/60">
                      {o.origenNombre} → {o.destinoNombre} · ${o.precioReferencia.toFixed(2)}
                    </p>
                  </div>
                </div>
                <Link
                  href={buscarHref}
                  className="rounded-lg bg-brand-amber px-4 py-2 text-xs font-semibold text-brand-dark transition hover:brightness-95"
                >
                  Ver salidas de hoy
                </Link>
              </div>

              {grupos.length === 0 ? (
                <p className="mt-3 text-sm text-brand-dark/50">Horarios por confirmar con la cooperativa.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {grupos.map(([dias, horas]) => (
                    <div key={dias} className="flex flex-wrap items-center gap-2">
                      <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                        {dias}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {horas.map((h, i) => (
                          <span
                            key={`${h.hora}-${i}`}
                            title={h.tipoVehiculo ?? undefined}
                            className="rounded-md bg-brand-light/60 px-2.5 py-1 text-sm font-semibold text-brand-dark"
                          >
                            {h.hora}
                            {h.tipoVehiculo && (
                              <span className="ml-1.5 text-[11px] font-normal text-brand-dark/55">
                                {h.tipoVehiculo}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default function RutasPage() {
  const [catalogo, setCatalogo] = useState<ParRutasCatalogo[] | null>(null);
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [cooperativa, setCooperativa] = useState("");

  useEffect(() => {
    obtenerCatalogoRutas().then(setCatalogo);
    // Desde la página Cooperativas: /rutas?cooperativa=ID abre ya filtrada por esa cooperativa.
    const idCoop = new URLSearchParams(window.location.search).get("cooperativa");
    if (idCoop) setCooperativa(idCoop);
  }, []);

  const origenes = useMemo(() => Array.from(new Set((catalogo ?? []).map((p) => p.origenCiudad))).sort(), [catalogo]);
  const destinos = useMemo(() => Array.from(new Set((catalogo ?? []).map((p) => p.destinoCiudad))).sort(), [catalogo]);
  const cooperativas = useMemo(() => {
    const mapa = new Map<string, string>();
    (catalogo ?? []).forEach((p) => p.opciones.forEach((o) => mapa.set(o.cooperativaId, o.cooperativaNombre)));
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [catalogo]);

  const filtrados = useMemo(
    () =>
      (catalogo ?? [])
        .filter((p) => (origen === "" || p.origenCiudad === origen) && (destino === "" || p.destinoCiudad === destino))
        .map((p) => ({
          ...p,
          opciones: p.opciones.filter((o) => cooperativa === "" || o.cooperativaId === cooperativa),
        }))
        .filter((p) => p.opciones.length > 0),
    [catalogo, origen, destino, cooperativa],
  );
  const paginacion = usePaginacionLocal(filtrados, 6);
  const hayFiltros = origen !== "" || destino !== "" || cooperativa !== "";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-brand-dark">Rutas y horarios</h1>
      <p className="mt-2 max-w-2xl text-sm text-brand-dark/70">
        Todas las rutas disponibles hoy en Klumbus: qué cooperativas las operan, a qué hora salen, qué días y cuánto
        tarda el viaje. Los tiempos marcados con ≈ son aproximados.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="rutas-origen" className={claseEtiqueta}>
            Origen
          </label>
          <select
            id="rutas-origen"
            value={origen}
            onChange={(e) => {
              setOrigen(e.target.value);
              paginacion.setPagina(1);
            }}
            className={claseCampo}
          >
            <option value="">Todos</option>
            {origenes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rutas-destino" className={claseEtiqueta}>
            Destino
          </label>
          <select
            id="rutas-destino"
            value={destino}
            onChange={(e) => {
              setDestino(e.target.value);
              paginacion.setPagina(1);
            }}
            className={claseCampo}
          >
            <option value="">Todos</option>
            {destinos.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rutas-coop" className={claseEtiqueta}>
            Cooperativa
          </label>
          <select
            id="rutas-coop"
            value={cooperativa}
            onChange={(e) => {
              setCooperativa(e.target.value);
              paginacion.setPagina(1);
            }}
            className={claseCampo}
          >
            <option value="">Todas</option>
            {cooperativas.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            disabled={!hayFiltros}
            onClick={() => {
              setOrigen("");
              setDestino("");
              setCooperativa("");
              paginacion.setPagina(1);
            }}
            className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm font-semibold text-brand-dark/70 hover:bg-brand-light/40 disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>
      </div>

      {catalogo === null && <p className="mt-8 text-sm text-brand-dark/50">Cargando rutas...</p>}

      {catalogo !== null && catalogo.length === 0 && (
        <p className="mt-8 rounded-2xl bg-white p-6 text-center text-sm text-brand-dark/60 shadow-sm ring-1 ring-black/5">
          Todavía no hay rutas publicadas. Vuelve pronto.
        </p>
      )}

      {catalogo !== null && catalogo.length > 0 && filtrados.length === 0 && (
        <p className="mt-8 rounded-2xl bg-white p-6 text-center text-sm text-brand-dark/60 shadow-sm ring-1 ring-black/5">
          No hay rutas con esos filtros. Prueba con otra ciudad o cooperativa.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {paginacion.visibles.map((par) => (
          <TarjetaPar key={`${par.origenCiudad}>${par.destinoCiudad}`} par={par} />
        ))}
      </div>

      <ControlesPaginacion
        pagina={paginacion.pagina}
        totalPaginas={paginacion.totalPaginas}
        total={paginacion.total}
        etiqueta="ruta"
        onCambio={paginacion.setPagina}
        className="mt-4 rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
      />
    </main>
  );
}
