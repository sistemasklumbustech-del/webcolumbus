/**
 * Logo oficial del rediseño (letras blancas, para encabezado y pie negros).
 * SVG propio de /diseno: se sirve tal cual, sin pasar por el optimizador de imágenes.
 */
export function LogoKlumbus({ className = "h-6 md:h-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/img/klumbus-logo-fondo-oscuro.svg" alt="Klumbus" className={`w-auto ${className}`} />
  );
}
