"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Foto que se pide recién cuando su tarjeta está por entrar en pantalla (a ~600 px).
 * Para las fotos de Destinos de la portada (portada-velocidad, 30-oct-2026): el "lazy" del navegador
 * las pedía al cargar, compitiendo con la foto principal. Mientras tanto queda el fondo de la tarjeta.
 */
export function ImagenDiferida(props: ImageProps) {
  const marca = useRef<HTMLSpanElement>(null);
  const [cerca, setCerca] = useState(false);

  useEffect(() => {
    const el = marca.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setCerca(true);
      return;
    }
    const observador = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setCerca(true);
          observador.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // eslint-disable-next-line jsx-a11y/alt-text -- el alt llega en props
  return cerca ? <Image {...props} /> : <span ref={marca} className="absolute inset-0" aria-hidden="true" />;
}
