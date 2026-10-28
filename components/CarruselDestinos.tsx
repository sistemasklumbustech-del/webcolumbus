"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Carrusel de "¿A dónde quieres ir?" (aprobado por el director, 28-oct-2026).
 *
 * - PC: se ven 4 tarjetas y se asoma parte de la siguiente; flechas ← → para avanzar.
 * - Celular: se desliza con el dedo (las flechas no se muestran).
 * - Nunca se mueve solo: solo con las flechas, el teclado o deslizando.
 * - Las flechas son botones reales (se usan con Tab y Enter), tienen etiqueta para lectores de
 *   pantalla y se apagan al llegar al inicio o al final.
 * - Con "reducir movimiento" el desplazamiento es inmediato, sin animación.
 */
export function CarruselDestinos({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  const pista = useRef<HTMLDivElement>(null);
  const idPista = useId();
  const [enInicio, setEnInicio] = useState(true);
  const [enFinal, setEnFinal] = useState(true);

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    setEnInicio(el.scrollLeft <= 2);
    setEnFinal(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      observador.disconnect();
    };
  }, [medir]);

  function mover(sentido: 1 | -1) {
    const el = pista.current;
    if (!el) return;
    const tarjeta = el.querySelector<HTMLElement>("[data-tarjeta]");
    const paso = tarjeta ? tarjeta.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0") : el.clientWidth;
    // Avanza de a una página de 4 tarjetas (o lo que quepa completo).
    const porPagina = Math.max(1, Math.floor((el.clientWidth + 1) / paso));
    const sinAnimacion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: sentido * paso * porPagina, behavior: sinAnimacion ? "auto" : "smooth" });
  }

  const claseFlecha =
    "grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-[inset_0_0_0_1.5px_#E9EBF0] transition hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-ink";

  return (
    <div role="region" aria-roledescription="carrusel" aria-label="Destinos populares">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 md:mb-5">
        {titulo}
        <div className="hidden gap-2 md:flex">
          <button type="button" className={claseFlecha} onClick={() => mover(-1)} disabled={enInicio} aria-controls={idPista} aria-label="Ver destinos anteriores">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
          <button type="button" className={claseFlecha} onClick={() => mover(1)} disabled={enFinal} aria-controls={idPista} aria-label="Ver más destinos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={pista}
        id={idPista}
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:gap-4 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
