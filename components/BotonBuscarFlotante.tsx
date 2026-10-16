"use client";

import { useEffect, useState } from "react";

/**
 * Botón fijo "Buscar pasajes" para celular (portada nueva, oct-2026): aparece cuando el buscador
 * ya quedó arriba, fuera de la pantalla, y lleva de vuelta a él. No hace ninguna búsqueda por sí
 * mismo: solo desplaza la página hasta el formulario de siempre.
 */
export function BotonBuscarFlotante({ objetivoId }: { objetivoId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const objetivo = document.getElementById(objetivoId);
    if (!objetivo) return;
    const observador = new IntersectionObserver(
      ([entrada]) => setVisible(!entrada.isIntersecting && entrada.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observador.observe(objetivo);
    return () => observador.disconnect();
  }, [objetivoId]);

  return (
    <a
      href={`#${objetivoId}`}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed inset-x-4 bottom-[calc(14px+env(safe-area-inset-bottom))] z-50 flex h-[58px] items-center justify-center gap-2.5 rounded-[18px] bg-kbyellow text-base font-bold text-ink shadow-[0_14px_34px_rgba(11,13,18,.3)] transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-[140%]"
      }`}
    >
      Buscar pasajes
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </a>
  );
}
