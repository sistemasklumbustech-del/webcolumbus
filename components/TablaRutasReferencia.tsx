"use client";

import { useState } from "react";
import { REFERENCIA, type RegionRuta } from "@/lib/portada-datos";

/**
 * Tabla "Rutas desde la terminal" con datos de REFERENCIA (ver lib/portada-datos.ts): destino,
 * duración, salidas, cooperativas y precio, con filtro por región. Solo se muestra mientras el API
 * no tenga rutas reales; apenas las tenga, RutasDisponibles las muestra en su lugar. El filtro solo
 * oculta o muestra filas, no consulta nada.
 */
const REGIONES: { valor: "todas" | RegionRuta; etiqueta: string }[] = [
  { valor: "todas", etiqueta: "Todas" },
  { valor: "costa", etiqueta: "Costa" },
  { valor: "sierra", etiqueta: "Sierra" },
  { valor: "oriente", etiqueta: "Oriente" },
  { valor: "int", etiqueta: "Perú" },
];

const COLUMNAS = "md:grid-cols-[minmax(0,1.5fr)_110px_140px_minmax(0,1.4fr)_110px_150px]";

export function TablaRutasReferencia() {
  const [region, setRegion] = useState<"todas" | RegionRuta>("todas");
  const filas = REFERENCIA.destinos.filter((d) => region === "todas" || d.region === region);

  return (
    <>
      <div role="tablist" aria-label="Filtrar por región" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {REGIONES.map((r) => (
          <button
            key={r.valor}
            type="button"
            role="tab"
            aria-selected={region === r.valor}
            onClick={() => setRegion(r.valor)}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium ${
              region === r.valor ? "bg-ink text-white" : "bg-white shadow-[inset_0_0_0_1.5px_#E9EBF0]"
            }`}
          >
            {r.etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-[18px] overflow-hidden rounded-[26px] bg-white shadow-[0_2px_20px_rgba(11,13,18,.05)]">
        <div className={`hidden gap-4 border-b border-line bg-[#FBFBFC] px-7 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-3 md:grid ${COLUMNAS}`} aria-hidden="true">
          <span>Destino</span>
          <span>Duración</span>
          <span>Salidas</span>
          <span>Cooperativas</span>
          <span>Desde</span>
          <span />
        </div>
        {filas.map((d, i) => (
          <a
            key={d.ciudad}
            href="#buscar"
            className={`grid grid-cols-[1fr_auto] items-center gap-x-3.5 gap-y-1 px-[18px] py-4 transition-colors md:py-3 hover:bg-[#FBFBFC] md:gap-4 md:px-7 ${COLUMNAS} ${i > 0 ? "border-t border-line" : ""}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-kbbg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
              </span>
              <div>
                <b className="block text-base font-semibold">{d.ciudad}</b>
                <small className="block text-xs text-muted-2">{d.zona}</small>
              </div>
            </div>
            <div className="text-right md:order-5 md:text-left">
              <small className="block text-[11px] text-muted-2 md:hidden">desde</small>
              <b className="text-lg font-bold tabular-nums">${d.precio.toFixed(2)}</b>
            </div>
            <div className="col-span-2 flex flex-wrap gap-x-3.5 gap-y-1.5 pl-14 text-[12.5px] text-muted-2 md:contents md:text-sm md:text-ink">
              <span>{d.duracion}</span>
              <span>{d.salidas}</span>
              <span className="md:text-[13.5px] md:text-muted-2">{d.cooperativas}</span>
            </div>
            <span className="hidden h-11 items-center justify-center gap-2 rounded-[14px] bg-kbbg text-sm font-semibold md:order-6 md:inline-flex">
              Ver horarios
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </a>
        ))}
      </div>
    </>
  );
}
