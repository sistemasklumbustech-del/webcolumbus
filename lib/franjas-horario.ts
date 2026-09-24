/**
 * Franjas de horario de salida (Madrugada/Mañana/Tarde/Noche). El
 * backend solo acepta un rango continuo (horaDesde/horaHasta, hora
 * local de Ecuador), por eso la elección es de una franja a la vez.
 * Compartido entre el buscador de la portada, los filtros de la página
 * de resultados y el resto de pantallas que lo necesiten.
 */
export const FRANJAS_HORARIO = [
  { valor: "madrugada", etiqueta: "Madrugada", horaDesde: "00:00", horaHasta: "06:00" },
  { valor: "manana", etiqueta: "Mañana", horaDesde: "06:00", horaHasta: "12:00" },
  { valor: "tarde", etiqueta: "Tarde", horaDesde: "12:00", horaHasta: "18:00" },
  { valor: "noche", etiqueta: "Noche", horaDesde: "18:00", horaHasta: "23:59" },
] as const;

export function franjaPorValor(valor: string) {
  return FRANJAS_HORARIO.find((f) => f.valor === valor) ?? null;
}
