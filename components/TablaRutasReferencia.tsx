"use client";

import Link from "next/link";
import { useState } from "react";
import { REFERENCIA, type RegionRuta } from "@/lib/portada-datos";

/**
 * "Rutas desde la terminal" con datos de REFERENCIA (ver lib/portada-datos.ts): una tarjeta por
 * destino (duración, salidas, cooperativas y precio), en 4 columnas en PC y en lista en celular, con
 * filtro por región. Solo se muestra mientras el API
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

/** En celular se muestran solo las primeras rutas y un botón para ver todas (indicación del director). */
const EN_CELULAR = 4;

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

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 md:mt-5 md:gap-4 lg:grid-cols-4">
        {filas.map((d, i) => (
          <li key={d.ciudad} className={i >= EN_CELULAR ? "max-md:hidden" : undefined}>
            <a
              href="#buscar"
              className="kb-card group flex h-full items-center gap-3.5 !p-4 transition-shadow hover:shadow-float sm:flex-col sm:items-stretch sm:gap-4 md:!p-5"
            >
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-2">
                  {REFERENCIA.terminal.ciudad} →
                </span>
                <b className="mt-0.5 block truncate text-lg font-semibold leading-tight tracking-[-0.01em]">{d.ciudad}</b>
                <span className="block truncate text-xs text-muted-2">{d.zona}</span>
                <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs font-medium text-ink">
                  <span className="inline-flex items-center gap-1 rounded-full bg-kbbg px-2.5 py-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    {d.duracion}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-kbbg px-2.5 py-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 4h12a2 2 0 0 1 2 2v9H4V6a2 2 0 0 1 2-2zM4 11h16M7 19v-4M17 19v-4" />
                    </svg>
                    {d.salidas}
                  </span>
                </div>
                <span className="mt-2 hidden truncate text-xs text-muted-2 sm:block">{d.cooperativas}</span>
              </div>
              <div className="flex shrink-0 items-end justify-between gap-3 sm:border-t sm:border-line sm:pt-3.5">
                <div className="text-right leading-[1.1] sm:text-left">
                  <small className="block text-[11px] text-muted-2">desde</small>
                  <b className="text-xl font-bold tabular-nums">${d.precio.toFixed(2)}</b>
                </div>
                <span className="hidden h-10 items-center gap-1.5 rounded-tab bg-ink px-3.5 text-[13px] font-semibold text-white transition-colors group-hover:bg-kbyellow group-hover:text-ink sm:inline-flex">
                  Horarios
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
      {filas.length > EN_CELULAR && (
        <Link href="/rutas" className="kb-btn mt-3 flex w-full items-center justify-center gap-2 bg-white text-[15px] font-semibold text-ink shadow-[inset_0_0_0_1.5px_#E9EBF0] md:hidden">
          Ver todas las rutas ({filas.length})
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      )}
    </>
  );
}
