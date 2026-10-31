"use client";

import { useEffect, useState } from "react";
import { FOTOS, srcHorizontal, srcVertical } from "@/lib/hero-fotos";

/**
 * Fotos del Hero con su cambio automático (navegacion-rapida, 30-oct-2026): van en su propio
 * componente para que cambiar de foto, o preparar la segunda, no vuelva a dibujar el buscador ni el
 * resto del Hero. Se ven igual que antes.
 */
export function HeroFotos() {
  const [indiceActivo, setIndiceActivo] = useState(0);
  // La segunda foto se pide cuando la página terminó de cargar y el navegador está libre: así no le quita
  // ancho de banda a la primera ni frena un clic. El cambio de foto sigue a los 6 s.
  const [segundaLista, setSegundaLista] = useState(false);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;
    let idle = 0;
    const pedirSegunda = () => setSegundaLista(true);
    const preparar = () => {
      temporizador = setTimeout(() => {
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        if (w.requestIdleCallback) idle = w.requestIdleCallback(pedirSegunda, { timeout: 3000 });
        else pedirSegunda();
      }, 2500);
    };
    if (document.readyState === "complete") preparar();
    else window.addEventListener("load", preparar, { once: true });
    return () => {
      clearTimeout(temporizador);
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (idle && w.cancelIdleCallback) w.cancelIdleCallback(idle);
      window.removeEventListener("load", preparar);
    };
  }, []);

  useEffect(() => {
    // Con "reducir movimiento" activado la foto no cambia sola.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!segundaLista) return;
    const temporizador = setInterval(() => {
      setIndiceActivo((i) => (i + 1) % FOTOS.length);
    }, 6000);
    return () => clearInterval(temporizador);
  }, [segundaLista]);

  return (
    <>
    {FOTOS.map((foto, i) => (
      <div
        key={foto.vertical}
        className={`absolute inset-0 transition-opacity duration-[1200ms] ${
          i === indiceActivo ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={i !== indiceActivo}
      >
        {/* Celular: foto vertical; PC: horizontal. Solo se descarga una de las dos, del tamaño justo. */}
        {(i === 0 || segundaLista) && (
          <picture>
            <source
              media="(min-width: 768px)"
              type="image/avif"
              srcSet={srcHorizontal(foto.horizontal, "avif")}
              sizes="(min-width: 1280px) 560px, 36vw"
            />
            <source
              media="(min-width: 768px)"
              srcSet={srcHorizontal(foto.horizontal)}
              sizes="(min-width: 1280px) 560px, 36vw"
            />
            <source type="image/avif" srcSet={srcVertical(foto.vertical, "avif")} sizes="100vw" />
            <img
              src={`${foto.vertical}-720.webp`}
              srcSet={srcVertical(foto.vertical)}
              sizes="100vw"
              width={720}
              height={1066}
              alt={foto.alt}
              fetchPriority={i === 0 ? "high" : "low"}
              loading={i === 0 ? "eager" : "lazy"}
              decoding={i === 0 ? "sync" : "async"}
              className="h-full w-full object-cover object-[50%_0%] md:object-center"
            />
          </picture>
        )}
      </div>
    ))}
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,18,.8)_0%,rgba(11,13,18,.15)_30%,rgba(11,13,18,.35)_55%,#0B0D12_92%)] md:hidden" />
    <div className="absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(11,13,18,0)_60%,rgba(11,13,18,.55))] md:block" />

    {/* Indicadores del slider -- confirman que hay más de una foto,
        sin depender de flechas de navegación manual. */}
    <div className="absolute right-5 top-[76px] z-10 flex gap-1.5 md:bottom-4 md:right-4 md:top-auto">
      {FOTOS.map((foto, i) => (
        <span
          key={foto.vertical}
          className={`h-[3px] w-6 rounded-full transition-colors ${
            i === indiceActivo ? "bg-kbyellow" : "bg-white/35"
          }`}
        />
      ))}
    </div>
    </>
  );
}
