"use client";

import { useEffect, useRef, useState } from "react";
import { BuscadorForm, type BusquedaInicial } from "@/components/BuscadorForm";

/**
 * "Cambiar búsqueda" en la misma página (etapa 2 de Resultados): abre debajo del título el mismo
 * buscador de la portada, ya lleno con la búsqueda actual. Al buscar, va a la nueva búsqueda como
 * siempre. En celular es un botón redondo con un lápiz al lado del título.
 */
export function CambiarBusqueda({ inicial }: { inicial: BusquedaInicial }) {
  const [abierto, setAbierto] = useState(false);
  const botonPc = useRef<HTMLButtonElement>(null);
  const botonCelular = useRef<HTMLButtonElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!abierto) return;
    titulo.current?.focus();
    const alEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", alEscape);
    return () => window.removeEventListener("keydown", alEscape);
  }, [abierto]);

  function cerrar() {
    setAbierto(false);
    // El foco vuelve al botón que se ve en esta pantalla.
    const visible = botonPc.current?.offsetParent ? botonPc.current : botonCelular.current;
    visible?.focus();
  }

  return (
    <>
      <button
        ref={botonCelular}
        type="button"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        aria-expanded={abierto}
        aria-controls="cambiar-busqueda"
        aria-label="Cambiar búsqueda"
        className="kb-btn-round shrink-0 md:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16v4z" />
          <path d="M13.5 6.5l4 4" />
        </svg>
      </button>
      <button
        ref={botonPc}
        type="button"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        aria-expanded={abierto}
        aria-controls="cambiar-busqueda"
        className="kb-btn kb-btn--outline hidden h-[46px] md:inline-flex"
      >
        {abierto ? "Cerrar" : "Cambiar búsqueda"}
      </button>

      {abierto && (
        <section id="cambiar-busqueda" aria-labelledby="cambiar-busqueda-titulo" className="basis-full pb-1 pt-1">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 id="cambiar-busqueda-titulo" ref={titulo} tabIndex={-1} className="text-sm font-semibold outline-none">
              Cambiar búsqueda
            </h2>
            <button type="button" onClick={cerrar} className="min-h-11 px-2 text-[13px] font-medium text-muted-2 hover:text-ink md:hidden">
              Cerrar
            </button>
          </div>
          <BuscadorForm inicial={inicial} enPagina />
        </section>
      )}
    </>
  );
}
