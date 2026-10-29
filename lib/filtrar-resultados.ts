import type { ResultadoViaje } from "./api";

/**
 * Filtros de la página de resultados (etapa 2, aprobado por el director, 28-oct-2026).
 *
 * La búsqueda de la API trae TODAS las salidas del día en una sola respuesta (sin paginación), así
 * que los filtros se aplican sobre esa lista con esta misma función, en el servidor (página) y en el
 * navegador (hoja de filtros del celular, que cuenta "Ver X salidas" en vivo sin pedir nada a la API).
 * Mismas reglas que la API: hora de salida en hora de Ecuador con los extremos incluidos, y las
 * comodidades marcadas deben estar TODAS en el bus.
 */

/** Lo mínimo de cada salida que necesitan los filtros (se manda al navegador). */
export interface SalidaFiltrable {
  cooperativaId: string;
  cooperativaNombre: string;
  /** Hora de salida en Ecuador, "HH:MM:SS". */
  hora: string;
  precio: number;
  amenidades: string[];
}

export interface Filtros {
  horaDesde: string | null;
  horaHasta: string | null;
  amenidades: string[];
  cooperativas: string[];
  precioMin: number | null;
  precioMax: number | null;
}

export const SIN_FILTROS: Filtros = {
  horaDesde: null,
  horaHasta: null,
  amenidades: [],
  cooperativas: [],
  precioMin: null,
  precioMax: null,
};

function numero(valor: string | null | undefined): number | null {
  if (!valor || !valor.trim()) return null;
  const n = Number(valor);
  return Number.isNaN(n) ? null : n;
}

function lista(valor: string | null | undefined): string[] {
  return valor ? valor.split(",").filter(Boolean) : [];
}

/** Lee los filtros de la URL (mismos parámetros de siempre; cooperativaId acepta varias, separadas por coma). */
export function leerFiltros(obtener: (clave: string) => string | null | undefined): Filtros {
  const horaDesde = obtener("horaDesde") || null;
  const horaHasta = obtener("horaHasta") || null;
  return {
    horaDesde: horaDesde && horaHasta ? horaDesde : null,
    horaHasta: horaDesde && horaHasta ? horaHasta : null,
    amenidades: lista(obtener("amenidades")),
    cooperativas: lista(obtener("cooperativaId")),
    precioMin: numero(obtener("precioMin")),
    precioMax: numero(obtener("precioMax")),
  };
}

/** Cambios para la URL (null = quitar el parámetro). */
export function filtrosAUrl(f: Filtros): Record<string, string | null> {
  return {
    horaDesde: f.horaDesde && f.horaHasta ? f.horaDesde : null,
    horaHasta: f.horaDesde && f.horaHasta ? f.horaHasta : null,
    amenidades: f.amenidades.length ? f.amenidades.join(",") : null,
    cooperativaId: f.cooperativas.length ? f.cooperativas.join(",") : null,
    precioMin: f.precioMin !== null ? String(f.precioMin) : null,
    precioMax: f.precioMax !== null ? String(f.precioMax) : null,
  };
}

export function cuantosFiltrosActivos(f: Filtros): number {
  return (
    (f.horaDesde ? 1 : 0) +
    f.amenidades.length +
    f.cooperativas.length +
    (f.precioMin !== null || f.precioMax !== null ? 1 : 0)
  );
}

/** "HH:MM:SS" de la hora de salida en Ecuador. */
export function horaEcuador(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Guayaquil",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function aFiltrable(r: ResultadoViaje): SalidaFiltrable {
  return {
    cooperativaId: r.cooperativaId,
    cooperativaNombre: r.cooperativaNombre,
    hora: horaEcuador(r.horaSalidaProgramada),
    precio: Number(r.precioBase),
    amenidades: r.tipoVehiculoAmenidades,
  };
}

/** ¿Esta salida pasa los filtros? `ignorar` deja fuera un filtro (ej. el de hora, para el aviso "fuera de franja"). */
export function cumpleFiltros(s: SalidaFiltrable, f: Filtros, ignorar: { hora?: boolean } = {}): boolean {
  if (!ignorar.hora && f.horaDesde && f.horaHasta) {
    const hora = s.hora;
    if (hora < `${f.horaDesde}:00` || hora > `${f.horaHasta}:00`) return false;
  }
  if (f.amenidades.length && !f.amenidades.every((a) => s.amenidades.includes(a))) return false;
  if (f.cooperativas.length && !f.cooperativas.includes(s.cooperativaId)) return false;
  if (f.precioMin !== null && s.precio < f.precioMin) return false;
  if (f.precioMax !== null && s.precio > f.precioMax) return false;
  return true;
}
