import { FranjaBanners } from "./FranjaBanners";

/**
 * Envoltura de servidor para la franja de banners de la portada: al importarla con next/dynamic
 * desde la página, el JavaScript de la franja va en un trozo aparte y no compite con la foto
 * principal al cargar (portada-velocidad, 30-oct-2026). Se ve igual.
 */
export function FranjaBannersPortada() {
  return <FranjaBanners />;
}
