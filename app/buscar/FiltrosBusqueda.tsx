"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AMENIDADES_CATALOGO } from "@/lib/api";
import { FRANJAS_HORARIO } from "@/lib/franjas-horario";
import {
  SIN_FILTROS,
  cuantosFiltrosActivos,
  cumpleFiltros,
  filtrosAUrl,
  leerFiltros,
  type Filtros,
  type SalidaFiltrable,
} from "@/lib/filtrar-resultados";
import { IconoAmenidad } from "./IconosAmenidades";

/**
 * Filtros de Resultados (etapa 2, aprobado por el director, 28-oct-2026; como el diseño oficial y
 * FlixBus/Busbud): precio con barra de dos puntas, hora de salida, cooperativa y comodidades.
 *
 * - Las opciones salen de las salidas reales del día (`salidas`): solo se ofrecen las cooperativas y
 *   comodidades que hay, y una opción que dejaría la lista vacía se ve apagada.
 * - PC (panel al lado): se aplican apenas se tocan.
 * - Celular: hoja que sube desde abajo, con el botón fijo "Ver X salidas" que cuenta en vivo con la
 *   misma función que usa la página (lib/filtrar-resultados.ts), sin pedir nada a la API.
 * - El estado vive en la URL (mismos parámetros de siempre): se puede compartir y volver atrás.
 */

const PASO_PRECIO = 0.5;

function dinero(n: number): string {
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

function igualesFiltros(a: Filtros, b: Filtros): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function FiltrosBusqueda({
  variante = "hoja",
  salidas,
}: {
  variante?: "hoja" | "panel";
  salidas: SalidaFiltrable[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enUrl = useMemo(() => leerFiltros((c) => searchParams.get(c)), [searchParams]);
  const [borrador, setBorrador] = useState<Filtros>(enUrl);
  const [abierto, setAbierto] = useState(false);

  // Si la URL cambia (atrás/adelante, "Limpiar", otra fecha), los filtros se ponen al día.
  const claveUrl = JSON.stringify(enUrl);
  useEffect(() => {
    setBorrador(JSON.parse(claveUrl) as Filtros);
  }, [claveUrl]);

  function irA(f: Filtros) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [clave, valor] of Object.entries(filtrosAUrl(f))) {
      if (valor === null) params.delete(clave);
      else params.set(clave, valor);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // PC: cada cambio se aplica al instante (la barra de precio espera a que se suelte).
  const alInstante = variante === "panel";
  const temporizador = useRef<number | undefined>(undefined);
  function cambiar(f: Filtros, { esperar = false } = {}) {
    setBorrador(f);
    if (!alInstante) return;
    window.clearTimeout(temporizador.current);
    if (esperar) temporizador.current = window.setTimeout(() => irA(f), 450);
    else irA(f);
  }

  const cantidad = salidas.filter((s) => cumpleFiltros(s, borrador)).length;
  const activos = cuantosFiltrosActivos(enUrl);

  const contenido = (
    <ContenidoFiltros salidas={salidas} filtros={borrador} onCambio={cambiar} idBase={variante} />
  );

  if (variante === "panel") {
    return (
      <div className="rounded-card bg-white p-[22px] shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Filtros</h2>
          {activos > 0 && (
            <button type="button" onClick={() => cambiar(SIN_FILTROS)} className="min-h-8 text-[13px] font-medium text-muted-2 underline-offset-2 hover:text-ink hover:underline">
              Limpiar
            </button>
          )}
        </div>
        {contenido}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setBorrador(enUrl);
          setAbierto(true);
        }}
        aria-haspopup="dialog"
        className="mb-4 flex min-h-[52px] w-full items-center justify-between rounded-card bg-white px-4 text-left text-sm font-semibold shadow-card"
      >
        <span className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filtros
          {activos > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-white">
              {activos}
              <span className="sr-only"> activos</span>
            </span>
          )}
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-3" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {abierto && (
        <HojaFiltros
          cantidad={cantidad}
          hayCambiosOFiltros={cuantosFiltrosActivos(borrador) > 0}
          onLimpiar={() => setBorrador(SIN_FILTROS)}
          onCerrar={() => setAbierto(false)}
          onVer={() => {
            if (!igualesFiltros(borrador, enUrl)) irA(borrador);
            setAbierto(false);
          }}
        >
          {contenido}
        </HojaFiltros>
      )}
    </>
  );
}

/** Hoja que sube desde abajo (celular), con fondo oscuro, Esc para cerrar y el botón fijo abajo. */
function HojaFiltros({
  children,
  cantidad,
  hayCambiosOFiltros,
  onLimpiar,
  onCerrar,
  onVer,
}: {
  children: React.ReactNode;
  cantidad: number;
  hayCambiosOFiltros: boolean;
  onLimpiar: () => void;
  onCerrar: () => void;
  onVer: () => void;
}) {
  const hoja = useRef<HTMLDivElement>(null);
  const alCerrar = useRef(onCerrar);
  useEffect(() => {
    alCerrar.current = onCerrar;
  });

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    hoja.current?.focus();
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar.current();
      // El foco no sale de la hoja mientras está abierta.
      if (e.key === "Tab" && hoja.current) {
        const enfocables = hoja.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])");
        const primero = enfocables[0];
        const ultimo = enfocables[enfocables.length - 1];
        if (e.shiftKey && (document.activeElement === primero || document.activeElement === hoja.current)) {
          e.preventDefault();
          ultimo?.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero?.focus();
        }
      }
    };
    window.addEventListener("keydown", alTecla);
    return () => {
      window.removeEventListener("keydown", alTecla);
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:hidden">
      <div className="absolute inset-0 bg-ink/50" onClick={onCerrar} aria-hidden="true" />
      <div
        ref={hoja}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hoja-filtros-titulo"
        tabIndex={-1}
        className="relative flex max-h-[88vh] w-full flex-col rounded-t-[28px] bg-white outline-none"
      >
        <div className="flex items-center justify-between border-b border-line px-5 pb-3 pt-2">
          <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" aria-hidden="true" />
          <h2 id="hoja-filtros-titulo" className="pt-3 text-[17px] font-semibold">
            Filtros
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar filtros" className="mt-2 grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-kbbg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        <div className="flex items-center gap-3 border-t border-line px-5 pb-[calc(14px+env(safe-area-inset-bottom,0px))] pt-3.5 shadow-[0_-10px_30px_rgba(11,13,18,.06)]">
          <button
            type="button"
            onClick={onLimpiar}
            disabled={!hayCambiosOFiltros}
            className="min-h-12 px-2 text-sm font-medium text-muted-2 disabled:opacity-40"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={onVer}
            disabled={cantidad === 0}
            aria-live="polite"
            className="kb-btn kb-btn--primary h-12 flex-1 disabled:bg-kbbg disabled:text-muted-3"
          >
            {cantidad === 0 ? "Sin salidas con estos filtros" : `Ver ${cantidad} ${cantidad === 1 ? "salida" : "salidas"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContenidoFiltros({
  salidas,
  filtros,
  onCambio,
  idBase,
}: {
  salidas: SalidaFiltrable[];
  filtros: Filtros;
  onCambio: (f: Filtros, opciones?: { esperar?: boolean }) => void;
  idBase: string;
}) {
  const uid = useId();
  const id = (n: string) => `${idBase}-${n}-${uid}`;
  const cuenta = (f: Filtros) => salidas.filter((s) => cumpleFiltros(s, f)).length;

  // Precio: la barra va del precio más bajo al más alto del día (redondeados), solo si hay al menos 2 precios.
  const precios = salidas.map((s) => s.precio);
  const hayRango = new Set(precios).size > 1;
  const pisoPrecio = hayRango ? Math.floor(Math.min(...precios)) : 0;
  const techoPrecio = hayRango ? Math.ceil(Math.max(...precios)) : 0;
  const desde = Math.max(pisoPrecio, Math.min(filtros.precioMin ?? pisoPrecio, techoPrecio));
  const hasta = Math.min(techoPrecio, Math.max(filtros.precioMax ?? techoPrecio, pisoPrecio));
  const pct = (n: number) => ((n - pisoPrecio) / (techoPrecio - pisoPrecio || 1)) * 100;

  const cooperativas = Array.from(new Map(salidas.map((s) => [s.cooperativaId, s.cooperativaNombre])).entries());
  const amenidadesDelDia = AMENIDADES_CATALOGO.filter((a) => salidas.some((s) => s.amenidades.includes(a.valor)));

  const claseTitulo = "mb-2.5 block text-[13px] font-semibold";

  return (
    <div className="flex flex-col gap-6">
      {hayRango && (
        <fieldset>
          <legend className={claseTitulo}>Precio</legend>
          <p className="mb-2 text-sm font-medium tabular-nums">
            {dinero(desde)} – {dinero(hasta)}
          </p>
          <div className="kb-rango">
            <span className="kb-rango__pista" />
            <span className="kb-rango__activo" style={{ left: `${pct(desde)}%`, right: `${100 - pct(hasta)}%` }} />
            <input
              type="range"
              min={pisoPrecio}
              max={techoPrecio}
              step={PASO_PRECIO}
              value={desde}
              // Si las dos puntas se juntan arriba, la del mínimo queda encima para poder moverla.
              style={{ zIndex: desde > (pisoPrecio + techoPrecio) / 2 ? 3 : 2 }}
              aria-label="Precio mínimo"
              aria-valuetext={dinero(desde)}
              onChange={(e) => {
                const n = Math.min(Number(e.target.value), hasta);
                onCambio({ ...filtros, precioMin: n <= pisoPrecio ? null : n }, { esperar: true });
              }}
            />
            <input
              type="range"
              min={pisoPrecio}
              max={techoPrecio}
              step={PASO_PRECIO}
              value={hasta}
              aria-label="Precio máximo"
              aria-valuetext={dinero(hasta)}
              onChange={(e) => {
                const n = Math.max(Number(e.target.value), desde);
                onCambio({ ...filtros, precioMax: n >= techoPrecio ? null : n }, { esperar: true });
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-3 tabular-nums">
            <span>{dinero(pisoPrecio)}</span>
            <span>{dinero(techoPrecio)}</span>
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className={claseTitulo}>Hora de salida</legend>
        <div className="grid grid-cols-2 gap-2">
          {FRANJAS_HORARIO.map((f) => {
            const elegida = filtros.horaDesde === f.horaDesde && filtros.horaHasta === f.horaHasta;
            const n = cuenta({ ...filtros, horaDesde: f.horaDesde, horaHasta: f.horaHasta });
            return (
              <button
                key={f.valor}
                type="button"
                aria-pressed={elegida}
                disabled={!elegida && n === 0}
                onClick={() =>
                  onCambio({ ...filtros, horaDesde: elegida ? null : f.horaDesde, horaHasta: elegida ? null : f.horaHasta })
                }
                className={`flex min-h-[52px] flex-col items-center justify-center rounded-tab px-1 py-2 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  elegida ? "bg-ink text-white" : "bg-kbbg text-ink hover:shadow-[inset_0_0_0_1.5px_#0B0D12]"
                }`}
              >
                {f.etiqueta}
                <small className={`text-[11px] font-normal ${elegida ? "text-ondark" : "text-muted-2"}`}>
                  {f.horaDesde}–{f.horaHasta}
                </small>
              </button>
            );
          })}
        </div>
      </fieldset>

      {cooperativas.length > 1 && (
        <fieldset>
          <legend className={claseTitulo}>Cooperativa</legend>
          <ul className="flex flex-col gap-0.5">
            {cooperativas.map(([cid, nombre]) => {
              const marcada = filtros.cooperativas.includes(cid);
              const n = cuenta({ ...filtros, cooperativas: [cid] });
              return (
                <li key={cid}>
                  <label
                    htmlFor={id(`coop-${cid}`)}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-[12px] px-1 text-sm ${!marcada && n === 0 ? "opacity-40" : ""}`}
                  >
                    <input
                      id={id(`coop-${cid}`)}
                      type="checkbox"
                      checked={marcada}
                      disabled={!marcada && n === 0}
                      onChange={() =>
                        onCambio({
                          ...filtros,
                          cooperativas: marcada ? filtros.cooperativas.filter((c) => c !== cid) : [...filtros.cooperativas, cid],
                        })
                      }
                      className="h-5 w-5 shrink-0 accent-[#0B0D12]"
                    />
                    <span className="min-w-0 flex-1">{nombre}</span>
                    <span className="text-xs tabular-nums text-muted-3">{n}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {amenidadesDelDia.length > 0 && (
        <fieldset>
          <legend className={claseTitulo}>Comodidades</legend>
          <div className="flex flex-wrap gap-2">
            {amenidadesDelDia.map((a) => {
              const marcada = filtros.amenidades.includes(a.valor);
              const n = cuenta({ ...filtros, amenidades: marcada ? filtros.amenidades : [...filtros.amenidades, a.valor] });
              return (
                <button
                  key={a.valor}
                  type="button"
                  aria-pressed={marcada}
                  disabled={!marcada && n === 0}
                  onClick={() =>
                    onCambio({
                      ...filtros,
                      amenidades: marcada ? filtros.amenidades.filter((x) => x !== a.valor) : [...filtros.amenidades, a.valor],
                    })
                  }
                  className={`kb-chip inline-flex min-h-10 items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40 ${marcada ? "is-active" : ""}`}
                >
                  <IconoAmenidad valor={a.valor} className="h-4 w-4" />
                  {a.etiqueta}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
