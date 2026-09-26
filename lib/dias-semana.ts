const NOMBRES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const ORDEN_LUNES_A_DOMINGO = [1, 2, 3, 4, 5, 6, 0];

/**
 * Texto natural para los días de un horario (0 = domingo … 6 = sábado):
 * "Todos los días", "Lunes a viernes", "Lunes, miércoles y viernes"…
 */
export function describirDias(dias: number[]): string {
  const unicos = Array.from(new Set(dias)).filter((d) => d >= 0 && d <= 6);
  if (unicos.length === 0) return "Días por confirmar";
  if (unicos.length === 7) return "Todos los días";
  const ordenados = ORDEN_LUNES_A_DOMINGO.filter((d) => unicos.includes(d));

  // Rango corrido (lunes a viernes, sábado y domingo…): posiciones consecutivas en la semana lunes→domingo.
  const posiciones = ordenados.map((d) => ORDEN_LUNES_A_DOMINGO.indexOf(d));
  const esCorrido = posiciones.every((p, i) => i === 0 || p === posiciones[i - 1] + 1);
  const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  if (esCorrido && ordenados.length >= 3) {
    return `${capitalizar(NOMBRES[ordenados[0]])} a ${NOMBRES[ordenados[ordenados.length - 1]]}`;
  }
  const nombres = ordenados.map((d) => NOMBRES[d]);
  if (nombres.length === 1) return capitalizar(nombres[0]);
  return capitalizar(`${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`);
}
