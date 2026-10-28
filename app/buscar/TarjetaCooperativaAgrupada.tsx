"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AMENIDADES_CATALOGO, listarParadasDeViaje, type ResultadoViaje, type ParadaTrayecto } from "@/lib/api";
import { ResenasCooperativa } from "./ResenasCooperativa";
import { estimarTrayecto, formatearDuracion, urlMapaTrayecto } from "@/lib/trayecto";

function formatearHora(iso: string): string {
  // El servidor (Node) y el navegador pueden usar espacios distintos entre la
  // hora y "a. m." (espacio normal vs. espacio fino U+202F); se unifican para
  // que ambos generen exactamente el mismo texto y React no reporte un error
  // de hidratación.
  return new Date(iso)
    .toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "America/Guayaquil",
    })
    .replace(/[  ]/g, " ");
}

/**
 * Nombre corto del terminal para el celular: "Terminal Terrestre Quitumbe" -> "Quitumbe". Se quitan
 * las palabras genéricas y la ciudad; si no queda nada (ej. "Terminal Terrestre de Machala"), no se
 * agrega nada y se ve solo la ciudad.
 */
function nombreCortoTerminal(nombre: string, ciudad?: string): string {
  const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const genericas = new Set(["terminal", "terrestre", "de", "del", "la", "el", ...(ciudad ? sinTildes(ciudad).split(/\s+/) : [])]);
  return nombre
    .split(/\s+/)
    .filter((p) => p && !genericas.has(sinTildes(p)))
    .join(" ");
}

/** Celular: "Quito · Quitumbe" (ciudad + terminal corto). Sin ciudad conocida, el nombre completo. */
function etiquetaTerminalCelular(nombre: string, ciudad?: string): string {
  if (!ciudad) return nombre;
  const corto = nombreCortoTerminal(nombre, ciudad);
  return corto ? `${ciudad} · ${corto}` : ciudad;
}

/** Fecha (Ecuador) de una hora ISO, para saber si la llegada es al día siguiente. */
function diaEcuador(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date(iso));
}

/** Cuántos días después de la salida llega el bus (0, 1, 2...). */
function diasDespues(salidaIso: string, llegadaIso: string): number {
  const a = Date.parse(`${diaEcuador(salidaIso)}T00:00:00Z`);
  const b = Date.parse(`${diaEcuador(llegadaIso)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/**
 * Nombre del terminal: en PC el nombre completo en hasta 2 líneas; en celular "ciudad · terminal corto"
 * en hasta 2 líneas (Quito tiene dos terminales: el pasajero debe saber a cuál llega).
 */
function TerminalNombre({ nombre, ciudad, alDerecha = false }: { nombre: string; ciudad?: string; alDerecha?: boolean }) {
  const clase = `kb-timeline__city line-clamp-2 ${alDerecha ? "ml-auto" : ""}`;
  return (
    <>
      <div className={`${clase} max-w-[104px] md:hidden`} title={nombre}>
        {etiquetaTerminalCelular(nombre, ciudad)}
      </div>
      <div className={`${clase} hidden md:[display:-webkit-box] ${alDerecha ? "text-right" : ""}`} title={nombre}>
        {nombre}
      </div>
    </>
  );
}

/**
 * Fase 6-buscador (17-ago-2026) -- "Ver horarios" agrupado por
 * cooperativa, orden real del director: hoy cada horario de una
 * cooperativa aparecía como una tarjeta separada; el pasajero busca
 * una ruta y, apenas la encuentra, debe poder elegir el horario que
 * más le convenga dentro de esa misma tarjeta -- no una tarjeta por
 * cada hora.
 *
 * Componente cliente (necesita estado: qué horario está activo, si el
 * desplegable está abierto) -- recibe TODOS los viajes reales de una
 * misma cooperativa+tipo de vehículo para esta ruta/fecha, ya
 * agrupados en page.tsx (componente de servidor, mismo patrón real
 * de siempre: la agrupación ocurre sobre datos ya obtenidos, sin
 * ningún endpoint nuevo).
 *
 * Rediseño final (oct-2026, /diseno): tarjeta con línea de tiempo.
 * En celular toda la tarjeta es el enlace a "Elegir asiento" (enlace
 * extendido); en PC hay un botón amarillo a la derecha.
 */
export function TarjetaCooperativaAgrupada({
  viajes,
  hrefsPorViaje,
  esMejorPrecio,
  esTopCalificado,
  beneficiosReferidos,
}: {
  viajes: ResultadoViaje[];
  hrefsPorViaje: Record<string, string>;
  esMejorPrecio: boolean;
  esTopCalificado: boolean;
  beneficiosReferidos: { creditoReferidor: number; descuentoReferido: number } | null;
}) {
  const [viajeActivoId, setViajeActivoId] = useState(viajes[0].viajeId);
  const [horariosAbiertos, setHorariosAbiertos] = useState(false);

  const activo = viajes.find((v) => v.viajeId === viajeActivoId) ?? viajes[0];
  const [paradas, setParadas] = useState<ParadaTrayecto[]>([]);
  useEffect(() => {
    listarParadasDeViaje(activo.viajeId).then(setParadas);
  }, [activo.viajeId]);
  const estimacion = estimarTrayecto(activo);
  const hayVariosHorarios = viajes.length > 1;
  const agotado = activo.asientosDisponibles <= 0;

  return (
    <div className={`relative overflow-hidden rounded-card bg-white shadow-card ${agotado ? "opacity-70" : ""}`}>
      {beneficiosReferidos && beneficiosReferidos.creditoReferidor > 0 && (
        <div className="bg-ok-bg px-5 py-2 text-xs font-medium text-ok">
          🎁 Invita a un amigo y gana ${beneficiosReferidos.creditoReferidor.toFixed(2)} de crédito
        </div>
      )}
      <div className="flex flex-col gap-3.5 p-4 md:grid md:grid-cols-[140px_1fr_150px] md:items-center md:gap-5 md:px-6 md:py-5 xl:grid-cols-[200px_1fr_190px] xl:gap-7">
        {/* Cooperativa */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {activo.cooperativaLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica (Cloudinary u otro), no un asset local
              <img
                src={activo.cooperativaLogoUrl}
                alt={activo.cooperativaNombre}
                className="h-10 w-10 shrink-0 rounded-xl object-contain md:h-[46px] md:w-[46px] md:rounded-[14px]"
              />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-xs font-bold text-kbyellow md:h-[46px] md:w-[46px] md:rounded-[14px] md:text-[13px]">
                {activo.cooperativaNombre.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold md:text-[15px]">
                {activo.cooperativaNombre}
                {activo.cooperativaCalificacionPromedio !== null && (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-ink">
                    <svg viewBox="0 0 20 20" fill="#FDD514" stroke="#0B0D12" strokeWidth="1" className="h-3.5 w-3.5">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.538 1.118l-3.367-2.445a1 1 0 00-1.176 0l-3.367 2.445c-.783.57-1.838-.196-1.538-1.118l1.287-3.957a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.285-3.958z" />
                    </svg>
                    {activo.cooperativaCalificacionPromedio.toFixed(1)}
                    <span className="font-normal text-muted-3">({activo.cooperativaCalificacionCantidad})</span>
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-2">{activo.tipoVehiculoNombre}</p>
            </div>
          </div>
          {activo.tipoVehiculoAmenidades.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activo.tipoVehiculoAmenidades.map((a) => (
                <span key={a} className="rounded-[10px] bg-kbbg px-2 py-1 text-[11px] text-muted-2">
                  {AMENIDADES_CATALOGO.find((cat) => cat.valor === a)?.etiqueta ?? a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Línea de tiempo */}
        <div className="min-w-0">
          <div className="kb-timeline !grid-cols-[auto_minmax(72px,1fr)_auto] md:gap-3.5">
            <div>
              <div className="whitespace-nowrap text-lg font-semibold tabular-nums md:text-[22px]">{formatearHora(activo.horaSalidaProgramada)}</div>
              <div className="md:hidden">
                <TerminalNombre nombre={activo.origenNombre} ciudad={activo.origenCiudad} />
              </div>
            </div>
            <div className="flex flex-col items-center gap-[3px] whitespace-nowrap text-[11px] text-muted-2 md:text-xs">
              {estimacion && (
                <span>
                  {estimacion.aproximado ? "Aprox. " : ""}
                  {formatearDuracion(estimacion.minutos)}
                </span>
              )}
              <div className="kb-timeline__line w-full">
                <span className="kb-timeline__bus shrink-0 md:h-8 md:w-8">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B0D12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="3" width="16" height="15" rx="3" />
                    <path d="M4 11h16M8 21v-3M16 21v-3" />
                    <circle cx="8" cy="14.5" r=".6" />
                    <circle cx="16" cy="14.5" r=".6" />
                  </svg>
                </span>
              </div>
              {estimacion?.km ? (
                <span>
                  {activo.distanciaKm ? "" : "≈ "}
                  {estimacion.km} km
                </span>
              ) : null}
            </div>
            {estimacion ? (
              <div className="text-right">
                <div className="whitespace-nowrap text-lg font-semibold tabular-nums md:text-[22px]">
                  {formatearHora(estimacion.llegadaIso)}
                  {diasDespues(activo.horaSalidaProgramada, estimacion.llegadaIso) > 0 && (
                    <sup className="ml-1 rounded-md bg-kbyellow-soft px-1 py-0.5 align-top text-[10px] font-semibold text-ink md:px-1.5 md:text-[11px]">
                      +{diasDespues(activo.horaSalidaProgramada, estimacion.llegadaIso)} día
                    </sup>
                  )}
                </div>
                <div className="md:hidden">
                  <TerminalNombre nombre={activo.destinoNombre} ciudad={activo.destinoCiudad} alDerecha />
                </div>
                {!estimacion.llegadaEsReal && <div className="text-[11px] text-muted-3">hora aprox.</div>}
              </div>
            ) : (
              <div className="text-right">
                <div className="kb-timeline__city">{activo.destinoNombre}</div>
              </div>
            )}
          </div>

          {/* PC: nombres de los terminales en su propia fila (cada uno con la mitad del ancho, hasta 2 líneas). */}
          <div className="mt-1 hidden grid-cols-2 gap-4 md:grid">
            <TerminalNombre nombre={activo.origenNombre} ciudad={activo.origenCiudad} />
            {estimacion ? (
              <TerminalNombre nombre={activo.destinoNombre} ciudad={activo.destinoCiudad} alDerecha />
            ) : (
              <span />
            )}
          </div>

          {/* Por dónde pasa esta ruta -- RF-COOP-002, Fase 1 (20-ago-2026). */}
          <div className="relative z-[2] mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-2">
              <a
                href={urlMapaTrayecto(activo)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ink underline decoration-dotted underline-offset-2"
              >
                Ver trayecto en el mapa
              </a>
              {paradas.length > 0 && <span>Vía {paradas.map((p) => p.ciudad).join(", ")}</span>}
          </div>

          {activo.cooperativaCalificacionPromedio !== null && (
            <div className="relative z-[2]">
              <ResenasCooperativa
                cooperativaId={activo.cooperativaId}
                cantidadTotal={activo.cooperativaCalificacionCantidad}
              />
            </div>
          )}
        </div>

        {/* Precio y acción */}
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-line pt-3 md:flex-col md:items-end md:justify-center md:gap-1.5 md:border-l-[1.5px] md:border-t-0 md:pl-6 md:pt-0">
          <div className="flex flex-col items-start gap-1.5 md:items-end">
            <div className="flex flex-wrap gap-1.5 md:justify-end">
              {esMejorPrecio && <span className="kb-tag kb-tag--yellow">Mejor precio</span>}
              {esTopCalificado && <span className="kb-tag kb-tag--yellow">★ Top calificado</span>}
              <span className={`kb-tag ${agotado ? "kb-tag--error" : "kb-tag--ok"}`}>
                {agotado
                  ? "Agotado"
                  : `${activo.asientosDisponibles} ${activo.asientosDisponibles !== 1 ? "libres" : "libre"}`}
              </span>
            </div>
          </div>
          <div className="text-right md:flex md:flex-col md:items-end md:gap-1.5">
            <p className="text-[19px] font-bold tabular-nums md:text-2xl">${Number(activo.precioBase).toFixed(2)}</p>
            <p className="text-[11px] text-muted-2 md:-mt-1.5 md:text-xs">por persona</p>
            {/* Celular: toda la tarjeta se toca (enlace de abajo); esta señal lo deja claro. */}
            <span aria-hidden="true" className="mt-1.5 inline-flex h-9 items-center gap-1 rounded-[12px] bg-kbyellow px-3.5 text-[13px] font-semibold text-ink md:hidden">
              Elegir
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
            <Link
              href={hrefsPorViaje[activo.viajeId]}
              className="kb-btn kb-btn--primary absolute inset-0 z-[1] h-auto bg-transparent p-0 md:static md:mt-1 md:h-12 md:w-full whitespace-nowrap md:bg-kbyellow md:px-4 xl:px-7"
            >
              <span className="sr-only md:not-sr-only">Elegir asiento</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Todos los horarios de esta cooperativa para la ruta/fecha. */}
      {hayVariosHorarios && (
        <div className="relative z-[2] border-t border-dashed border-line px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => setHorariosAbiertos((a) => !a)}
            aria-expanded={horariosAbiertos}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink"
          >
            Todos los horarios disponibles — {viajes.length} salidas hoy
            <span className="text-muted-3">{horariosAbiertos ? "▲" : "▼"}</span>
          </button>
          {horariosAbiertos && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {viajes.map((v) => (
                <button
                  key={v.viajeId}
                  type="button"
                  onClick={() => setViajeActivoId(v.viajeId)}
                  className={`kb-chip tabular-nums ${v.viajeId === viajeActivoId ? "is-active" : ""}`}
                >
                  {formatearHora(v.horaSalidaProgramada)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
