"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AMENIDADES_CATALOGO, type Amenidad } from "@/lib/api";
import { FRANJAS_HORARIO } from "@/lib/franjas-horario";

/**
 * Ítem 11, Fase 2 (04-ago-2026) -- filtros de hora y amenidades.
 * Componente cliente aparte a propósito: la página de resultados es un
 * server component (lee searchParams directo, sin useState) -- este es
 * el único trozo que necesita interactividad, y actualiza la URL en
 * vez de mantener su propio estado de resultados.
 *
 * Fase 5-buscador (16-ago-2026) -- prop `variante`: en pantalla
 * grande se muestra como panel fijo, siempre abierto, al lado de los
 * resultados (mismo patrón real investigado en referencias de la
 * industria: redBus, FlixBus). En celular sigue siendo un desplegable
 * -- la lógica de filtrado real no cambió, solo cómo se muestra.
 *
 * Fase 7-buscador (17-ago-2026) -- hallazgo real del director: los 2
 * campos de hora nativos (`<input type="time">`) mostraban cada uno
 * su propio reloj del navegador, uno al lado del otro -- se veía como
 * un error visual (íconos "duplicados"), y un pasajero normal no
 * entendía para qué servían. Reemplazados por franjas de horario de
 * un solo clic (Madrugada/Mañana/Tarde/Noche) -- mismo patrón real de
 * la referencia del director, mucho más claro que escribir una hora
 * exacta. El backend real solo acepta un rango continuo
 * (horaDesde/horaHasta) -- por eso esto funciona como selección
 * única (una franja a la vez), no casillas independientes: así el
 * resultado siempre es predecible, sin necesitar cambios de backend.
 */

function franjaActivaDesdeUrl(horaDesde: string | null, horaHasta: string | null): string | null {
  const encontrada = FRANJAS_HORARIO.find((f) => f.horaDesde === horaDesde && f.horaHasta === horaHasta);
  return encontrada?.valor ?? null;
}

export function FiltrosBusqueda({ variante = "dropdown" }: { variante?: "dropdown" | "panel" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [franjaHorario, setFranjaHorario] = useState<string | null>(
    franjaActivaDesdeUrl(searchParams.get("horaDesde"), searchParams.get("horaHasta")),
  );
  const [amenidades, setAmenidades] = useState<Amenidad[]>(
    (searchParams.get("amenidades")?.split(",").filter(Boolean) as Amenidad[]) ?? [],
  );
  // Fase 8-buscador (24-ago-2026) -- filtro de precio real, orden del
  // director tras comparar contra su demo de referencia. Se filtra en
  // el CLIENTE sobre los resultados que el servidor ya obtuvo -- cada
  // resultado ya trae `precioBase`, no hace falta ningún cambio de
  // backend ni un parámetro nuevo en `buscarViajes`. Mismo patrón real
  // que ya usan `horaDesde`/`horaHasta`: solo actualiza la URL,
  // page.tsx (servidor) hace el filtrado real.
  const [precioMin, setPrecioMin] = useState<string>(searchParams.get("precioMin") ?? "");
  const [precioMax, setPrecioMax] = useState<string>(searchParams.get("precioMax") ?? "");
  const [abierto, setAbierto] = useState(false);

  // En PC (panel) los filtros se aplican apenas se tocan, como en FlixBus o redBus; en celular se
  // eligen dentro del desplegable y se aplican con el botón. La lógica de filtrado es la misma.
  const alInstante = variante === "panel";

  function alternarAmenidad(valor: Amenidad) {
    const nuevas = amenidades.includes(valor) ? amenidades.filter((a) => a !== valor) : [...amenidades, valor];
    setAmenidades(nuevas);
    if (alInstante) aplicar({ amenidades: nuevas });
  }

  function alternarFranja(valor: string) {
    const nueva = franjaHorario === valor ? null : valor;
    setFranjaHorario(nueva);
    if (alInstante) aplicar({ franjaHorario: nueva });
  }

  function aplicar(
    cambios: Partial<{ franjaHorario: string | null; amenidades: Amenidad[]; precioMin: string; precioMax: string }> = {},
  ) {
    const v = { franjaHorario, amenidades, precioMin, precioMax, ...cambios };
    const params = new URLSearchParams(searchParams.toString());
    const franja = FRANJAS_HORARIO.find((f) => f.valor === v.franjaHorario);
    if (franja) {
      params.set("horaDesde", franja.horaDesde);
      params.set("horaHasta", franja.horaHasta);
    } else {
      params.delete("horaDesde");
      params.delete("horaHasta");
    }
    if (v.amenidades.length > 0) {
      params.set("amenidades", v.amenidades.join(","));
    } else {
      params.delete("amenidades");
    }
    if (v.precioMin.trim()) {
      params.set("precioMin", v.precioMin.trim());
    } else {
      params.delete("precioMin");
    }
    if (v.precioMax.trim()) {
      params.set("precioMax", v.precioMax.trim());
    } else {
      params.delete("precioMax");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function limpiar() {
    setFranjaHorario(null);
    setAmenidades([]);
    setPrecioMin("");
    setPrecioMax("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("horaDesde");
    params.delete("horaHasta");
    params.delete("amenidades");
    params.delete("precioMin");
    params.delete("precioMax");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hayFiltrosActivos = Boolean(
    searchParams.get("horaDesde") || searchParams.get("amenidades") || searchParams.get("precioMin") || searchParams.get("precioMax"),
  );

  const claseTituloGrupo = "mb-2 block text-[13px] font-semibold";
  const claseCampo =
    "h-12 w-full rounded-ctrl border-[1.5px] border-transparent bg-kbbg px-3.5 text-sm text-ink placeholder:text-muted-3 focus:border-ink focus:bg-white focus:outline-none";

  const contenidoFiltros = (
    <div className="flex flex-col gap-5">
      <div>
        <label id="filtros-precio-label" className={claseTituloGrupo}>
          Precio (USD)
        </label>
        <div role="group" aria-labelledby="filtros-precio-label" className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Mín."
            value={precioMin}
            onChange={(e) => setPrecioMin(e.target.value)}
            onBlur={() => alInstante && aplicar()}
            onKeyDown={(e) => e.key === "Enter" && alInstante && aplicar()}
            aria-label="Precio mínimo"
            className={claseCampo}
          />
          <span className="text-muted-3">—</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Máx."
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
            onBlur={() => alInstante && aplicar()}
            onKeyDown={(e) => e.key === "Enter" && alInstante && aplicar()}
            aria-label="Precio máximo"
            className={claseCampo}
          />
        </div>
      </div>

      <div>
        <label id="filtros-hora-label" className={claseTituloGrupo}>
          Hora de salida
        </label>
        <div role="group" aria-labelledby="filtros-hora-label" className="grid grid-cols-2 gap-2">
          {FRANJAS_HORARIO.map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={franjaHorario === f.valor}
              onClick={() => alternarFranja(f.valor)}
              className={`flex flex-col items-center rounded-tab px-1 py-2.5 text-[13px] font-medium transition ${
                franjaHorario === f.valor ? "bg-ink text-white" : "bg-kbbg text-ink"
              }`}
            >
              {f.etiqueta}
              <small className={`text-[11px] font-normal ${franjaHorario === f.valor ? "text-ondark" : "text-muted-2"}`}>
                {f.horaDesde}–{f.horaHasta}
              </small>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label id="filtros-amenidades-label" className={claseTituloGrupo}>
          Amenidades
        </label>
        <div role="group" aria-labelledby="filtros-amenidades-label" className="flex flex-wrap gap-2">
          {AMENIDADES_CATALOGO.map((a) => (
            <button
              key={a.valor}
              type="button"
              aria-pressed={amenidades.includes(a.valor)}
              onClick={() => alternarAmenidad(a.valor)}
              className={`kb-chip ${amenidades.includes(a.valor) ? "is-active" : ""}`}
            >
              {a.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {!alInstante && (
        <button type="button" onClick={() => aplicar()} className="kb-btn kb-btn--dark w-full">
          Aplicar filtros
        </button>
      )}
      {hayFiltrosActivos && (
        <button type="button" onClick={limpiar} className="text-center text-[13px] font-medium text-muted-2 hover:text-ink">
          Limpiar filtros
        </button>
      )}
    </div>
  );

  if (variante === "panel") {
    return (
      <div className="rounded-card bg-white p-[22px] shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Filtros</h2>
          {hayFiltrosActivos && <span className="kb-tag kb-tag--yellow">Activos</span>}
        </div>
        {contenidoFiltros}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-card bg-white p-4 shadow-card">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between text-left text-sm font-semibold"
      >
        <span className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filtros
          {hayFiltrosActivos && <span className="kb-tag kb-tag--yellow">Activos</span>}
        </span>
        <span className="text-muted-3">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && <div className="mt-4 border-t border-line pt-4">{contenidoFiltros}</div>}
    </div>
  );
}
