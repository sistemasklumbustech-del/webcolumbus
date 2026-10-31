// Mismas fotos, en varios tamaños (public/img/hero/): cada pantalla baja solo el que necesita
// (portada-velocidad, 30-oct-2026). Celular: vertical; PC: horizontal.
export const FOTOS = [
  {
    vertical: "/img/hero/hero-tarde-v",
    horizontal: "/img/hero/hero-tarde-h",
    alt: "Bus de dos pisos de Klumbus en la terminal al atardecer",
  },
  {
    vertical: "/img/hero/hero-noche-v",
    horizontal: "/img/hero/hero-noche-h",
    alt: "Bus de Klumbus de frente, de noche, en el andén",
  },
];
// AVIF (más liviano) para los navegadores que lo entienden; WebP para el resto.
// En celular basta hasta 720 px de ancho: la foto va detrás del texto con un degradado oscuro.
export const srcVertical = (base: string, ext = "webp") => `${base}-480.${ext} 480w, ${base}-720.${ext} 720w`;
export const srcHorizontal = (base: string, ext = "webp") => `${base}-640.${ext} 640w, ${base}-1120.${ext} 1120w`;
