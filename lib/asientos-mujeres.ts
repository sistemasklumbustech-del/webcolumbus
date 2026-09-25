import { interpretarCelda, obtenerPisosDeDistribucion, type MapaAsientos } from "@/lib/api";

/**
 * ¿El asiento es exclusivo para mujeres? (25-sep-2026) Usa el mismo mapa y la
 * misma interpretación de etiquetas que dibuja el pasajero; el servidor
 * vuelve a comprobarlo al comprar, esto solo adelanta el aviso en pantalla.
 */
export function esAsientoSoloMujeres(
  mapa: Pick<MapaAsientos, "distribucionAsientos" | "capacidadTotal"> | null | undefined,
  numeroAsiento: string,
): boolean {
  if (!mapa) return false;
  const pisos = obtenerPisosDeDistribucion(mapa.distribucionAsientos, mapa.capacidadTotal);
  for (const piso of pisos) {
    for (const fila of piso.filas) {
      for (const celda of fila.celdas) {
        const interpretada = interpretarCelda(celda, piso);
        if (interpretada?.numero === numeroAsiento && interpretada.etiquetas.includes("mujeres")) return true;
      }
    }
  }
  return false;
}
