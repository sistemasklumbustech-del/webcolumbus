"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { obtenerCatalogoRutas, type ParRutasCatalogo, type OpcionRutaCatalogo } from "@/lib/api";
import { describirDias } from "@/lib/dias-semana";
import { estimarTrayecto, formatearDuracion } from "@/lib/trayecto";
import { usePaginacionLocal, ControlesPaginacion } from "@/components/Paginacion";

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

function IconoReloj({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

const clasePastilla = "inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold tabular-nums";

function TarjetaPar({ par }: { par: ParRutasCatalogo }) {
  const estimacion = estimarPar(par.opciones);
  const precios = par.opciones.map((o) => o.precioReferencia);
  const desde = Math.min(...precios);
  // "Desde" solo cuando hay varias cooperativas; con una sola, el precio va en su fila (decisión del director).
  const variasOpciones = par.opciones.length > 1;

  return (
    <article className="overflow-hidden rounded-card border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-b border-line px-4 py-4 md:px-6">
        <h2 className="text-lg font-semibold leading-snug text-ink md:text-xl">
          {par.origenCiudad} → {par.destinoCiudad}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {estimacion && (
            <span className={`${clasePastilla} bg-kbbg text-ink`}>
              {estimacion.aproximado ? "≈ " : ""}
              {formatearDuracion(estimacion.minutos)}
            </span>
          )}
          {estimacion?.km ? (
            <span className={`${clasePastilla} bg-kbbg text-ink`}>
              {estimacion.aproximado ? "≈ " : ""}
              {Math.round(estimacion.km)} km
            </span>
          ) : null}
          {variasOpciones && <span className={`${clasePastilla} bg-ink text-white`}>Desde ${desde.toFixed(2)}</span>}
        </div>
      </header>

      <ul className="divide-y divide-line">
        {par.opciones.map((o) => {
          const grupos = agruparHorarios(o);
          const buscarHref =
            `/buscar?origenId=${o.origenId}&destinoId=${o.destinoId}` +
            `&origenCiudad=${encodeURIComponent(par.origenCiudad)}&destinoCiudad=${encodeURIComponent(par.destinoCiudad)}` +
            `&fecha=${hoyEcuador()}&pasajeros=1`;
          return (
            <li key={o.rutaId} className="flex flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
                <div className="flex min-w-0 items-start gap-3">
                  {o.cooperativaLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- logo dinámico del almacenamiento
                    <img src={o.cooperativaLogoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-line" />
                  ) : (
                    <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-kbyellow">
                      {o.cooperativaNombre.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold leading-snug text-ink">{o.cooperativaNombre}</p>
                      <b className="shrink-0 text-base font-bold tabular-nums text-ink md:hidden">${o.precioReferencia.toFixed(2)}</b>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-muted-2">
                      {o.origenNombre} → {o.destinoNombre}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-5">
                  <b className="hidden text-lg font-bold tabular-nums text-ink md:block">${o.precioReferencia.toFixed(2)}</b>
                  <Link href={buscarHref} className="kb-btn kb-btn--primary !h-11 w-full !px-5 !text-sm md:w-auto">
                    Ver salidas de hoy
                  </Link>
                </div>
              </div>

              {grupos.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-2">
                  <IconoReloj className="shrink-0 text-muted-3" />
                  Horarios por confirmar con la cooperativa.
                </p>
              ) : (
                <dl className="flex flex-col gap-3 rounded-[14px] bg-kbbg p-3 md:gap-2.5 md:p-4">
                  {grupos.map(([dias, horas]) => (
                    <div key={dias} className="flex flex-col gap-1.5 md:flex-row md:items-start md:gap-4">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-2 md:w-44 md:shrink-0 md:pt-1.5">
                        <IconoReloj className="shrink-0" />
                        {dias}
                      </dt>
                      <dd className="flex flex-wrap gap-1.5">
                        {horas.map((h, i) => (
                          <span
                            key={`${h.hora}-${i}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-white px-2.5 text-sm font-semibold tabular-nums text-ink ring-1 ring-line"
                          >
                            {h.hora}
                            {h.tipoVehiculo && <span className="text-[11px] font-normal text-muted-2">{h.tipoVehiculo}</span>}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
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
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

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
  const filtrosActivos = [origen, destino, cooperativa].filter((v) => v !== "").length;
  const hayFiltros = filtrosActivos > 0;

  const campos: { id: string; etiqueta: string; valor: string; cambiar: (v: string) => void; todos: string; opciones: [string, string][] }[] = [
    { id: "rutas-origen", etiqueta: "Origen", valor: origen, cambiar: setOrigen, todos: "Todos", opciones: origenes.map((c) => [c, c]) },
    { id: "rutas-destino", etiqueta: "Destino", valor: destino, cambiar: setDestino, todos: "Todos", opciones: destinos.map((c) => [c, c]) },
    { id: "rutas-coop", etiqueta: "Cooperativa", valor: cooperativa, cambiar: setCooperativa, todos: "Todas", opciones: cooperativas },
  ];

  return (
    <main className="flex-1 bg-kbbg">
      <header className="border-b border-line bg-white">
        <div className="kb-container py-7 md:py-10">
          <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-[28px] font-bold leading-tight text-ink md:text-[36px]">Rutas y horarios</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-2">
            Todas las rutas disponibles hoy en Klumbus: qué cooperativas las operan, a qué hora salen, qué días y cuánto
            tarda el viaje. Los tiempos marcados con ≈ son aproximados.
          </p>
          </div>
        </div>
      </header>

      <div className="kb-container py-5 md:py-8">
        <div className="mx-auto w-full max-w-5xl">
          {/* Celular: botón "Filtrar" con el número de filtros activos; en PC los filtros van en una fila. */}
          <div className="flex items-center justify-between gap-3 md:hidden">
            <span className="text-sm text-muted-2">
              {catalogo === null ? "" : `${filtrados.length} ${filtrados.length === 1 ? "ruta" : "rutas"}`}
            </span>
            <button
              type="button"
              aria-expanded={filtrosAbiertos}
              aria-controls="rutas-filtros"
              onClick={() => setFiltrosAbiertos((v) => !v)}
              className="kb-btn kb-btn--outline !h-11 !px-4 !text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Filtrar
              {filtrosActivos > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-bold text-white">
                  <span className="sr-only">filtros activos: </span>
                  {filtrosActivos}
                </span>
              )}
            </button>
          </div>

          <div
            id="rutas-filtros"
            className={`${filtrosAbiertos ? "grid" : "hidden"} mt-3 grid-cols-1 gap-3 rounded-card border border-line bg-white p-4 md:mt-0 md:grid md:grid-cols-[1fr_1fr_1fr_auto] md:items-end`}
          >
            {campos.map((c) => (
              <div key={c.id}>
                <label htmlFor={c.id} className="kb-label">
                  {c.etiqueta}
                </label>
                <select
                  id={c.id}
                  value={c.valor}
                  onChange={(e) => {
                    c.cambiar(e.target.value);
                    paginacion.setPagina(1);
                  }}
                  className="kb-input"
                >
                  <option value="">{c.todos}</option>
                  {c.opciones.map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {texto}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button
              type="button"
              disabled={!hayFiltros}
              onClick={() => {
                setOrigen("");
                setDestino("");
                setCooperativa("");
                paginacion.setPagina(1);
              }}
              className="kb-btn kb-btn--outline !h-11 w-full !px-5 !text-sm md:!h-[var(--kb-control-h)] md:w-auto"
            >
              Limpiar
            </button>
          </div>

          {catalogo === null && <p className="mt-6 text-sm text-muted-2">Cargando rutas...</p>}

          {catalogo !== null && catalogo.length === 0 && (
            <p className="mt-6 rounded-card border border-line bg-white p-6 text-center text-sm text-muted-2">
              Todavía no hay rutas publicadas. Vuelve pronto.
            </p>
          )}

          {catalogo !== null && catalogo.length > 0 && filtrados.length === 0 && (
            <p className="mt-6 rounded-card border border-line bg-white p-6 text-center text-sm text-muted-2">
              No hay rutas con esos filtros. Prueba con otra ciudad o cooperativa.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-4 md:mt-6">
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
            className="mt-4 rounded-card border border-line bg-white"
          />
        </div>
      </div>
    </main>
  );
}
