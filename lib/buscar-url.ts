/**
 * Arma el query string de /buscar a partir de los parámetros actuales,
 * cambiando (o quitando, con null) solo los indicados -- así una
 * sugerencia ("otra fecha", "otro destino") conserva todo lo demás:
 * pasajeros, filtros, y el estado de una compra de ida y vuelta.
 */
export function construirQuery(
  actuales: Record<string, string | undefined>,
  cambios: Record<string, string | null> = {},
): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(actuales)) {
    if (valor !== undefined && valor !== "") params.set(clave, valor);
  }
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === null) params.delete(clave);
    else params.set(clave, valor);
  }
  return params.toString();
}
