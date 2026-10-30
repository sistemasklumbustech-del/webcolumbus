import { interpretarCelda, obtenerPisosDeDistribucion, type MapaAsientos } from "./api";

/**
 * Precio mostrado de un asiento (30-oct-2026, decisión del director): tarifa base + recargo VIP si el
 * asiento es VIP, con los valores que manda la API (Resultados → URL). Solo para mostrar: lo que se
 * cobra lo calcula la API al cotizar. Ningún valor fijo en la web.
 */
export function esAsientoVip(mapa: MapaAsientos | null | undefined, numero: string): boolean {
  if (!mapa) return false;
  const pisos = obtenerPisosDeDistribucion(mapa.distribucionAsientos, mapa.capacidadTotal);
  for (const piso of pisos) {
    for (const fila of piso.filas) {
      for (const celda of fila.celdas) {
        const c = interpretarCelda(celda, piso);
        if (c && c.numero === numero) return c.etiquetas.includes("vip");
      }
    }
  }
  return false;
}

export function precioAsiento(base: number | null, recargoVip: number | null, vip: boolean): number | null {
  if (base === null) return null;
  return base + (vip && recargoVip ? recargoVip : 0);
}
