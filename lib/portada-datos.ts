/**
 * Datos de la portada (oct-2026): terminal, destinos, rutas y cifras que se muestran en las
 * secciones de la portada nueva.
 *
 * REGLA: lo que entrega el API manda. Los registros de prueba (cuyo nombre lleva "PRUEBA") nunca
 * se muestran en la portada pública. Mientras el API no tenga datos reales, se muestran los
 * datos de REFERENCIA de abajo (tomados de fuentes públicas del Terminal Terrestre de Machala,
 * sin convenio todavía) y, apenas el API entregue datos reales, estos los reemplazan solos.
 *
 * Todo lo "de referencia" vive en este único archivo para poder editarlo o quitarlo de un golpe:
 * si se borra `REFERENCIA`, la portada solo muestra datos reales.
 */
import type { RutaDisponible, TerminalAliada } from "@/lib/api";

/** ¿El texto pertenece a un registro de prueba? (ej. "PRUEBA Terminal Machala") */
export function esDePrueba(...textos: (string | null | undefined)[]): boolean {
  return textos.some((t) => !!t && /prueba/i.test(t));
}

export function terminalesReales(lista: TerminalAliada[]): TerminalAliada[] {
  return lista.filter((t) => !esDePrueba(t.nombre, t.ciudad));
}

export function rutasReales(lista: RutaDisponible[]): RutaDisponible[] {
  return lista.filter((r) => !esDePrueba(r.origenNombre, r.destinoNombre, r.origenCiudad, r.destinoCiudad));
}

/** Compara ciudades sin importar mayúsculas ni tildes ("Máncora" = "mancora"). */
export function claveCiudad(ciudad: string): string {
  return ciudad
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export type RegionRuta = "costa" | "sierra" | "oriente" | "int";

export interface DestinoReferencia {
  ciudad: string;
  region: RegionRuta;
  zona: string;
  precio: number;
  duracion: string;
  salidas: string;
  cooperativas: string;
}

export const REFERENCIA = {
  terminal: {
    nombre: "Terminal Terrestre de Machala",
    ciudad: "Machala",
    direccion: "Av. Ferroviaria km 3.5, vía a El Cambio",
  },
  cifras: {
    cooperativas: 32,
    regiones: 4,
    regionesTexto: "Costa, Sierra, Oriente y Perú",
  },
  /** Salidas desde Machala. */
  destinos: [
    { ciudad: "Guayaquil", region: "costa", zona: "Costa · Guayas", precio: 6, duracion: "3 h", salidas: "Cada 30 min", cooperativas: "Rutas Orenses · CIFA · Pullman" },
    { ciudad: "Huaquillas", region: "costa", zona: "Costa · frontera", precio: 2.5, duracion: "1 h 30 min", salidas: "Cada 20 min", cooperativas: "CIFA · Ecuatoriano Pullman" },
    { ciudad: "Cuenca", region: "sierra", zona: "Sierra · Azuay", precio: 6.5, duracion: "3 h 30 min", salidas: "8 al día", cooperativas: "Rutas Orenses · Azuay" },
    { ciudad: "Loja", region: "sierra", zona: "Sierra · Loja", precio: 7.5, duracion: "5 h", salidas: "Cada hora", cooperativas: "TAC · Loja · Santa" },
    { ciudad: "Zaruma", region: "sierra", zona: "Sierra · El Oro", precio: 4, duracion: "3 h", salidas: "10 al día", cooperativas: "TAC · Piñas" },
    { ciudad: "Quito", region: "sierra", zona: "Sierra · Pichincha", precio: 14, duracion: "10 h", salidas: "6 al día", cooperativas: "Panamericana · Occidentales" },
    { ciudad: "Puyo", region: "oriente", zona: "Oriente · Pastaza", precio: 13, duracion: "9 h", salidas: "2 al día", cooperativas: "Transportes Baños" },
    { ciudad: "Máncora", region: "int", zona: "Perú · Piura", precio: 15, duracion: "6 h", salidas: "2 al día", cooperativas: "CIFA Internacional" },
  ] as DestinoReferencia[],
} as const;

/** Coordenadas aproximadas (latitud, longitud) para dibujar el mapa de salidas. */
export const COORDENADAS_CIUDADES: Record<string, [number, number]> = {
  machala: [-3.26, -79.96],
  guayaquil: [-2.19, -79.89],
  quito: [-0.18, -78.47],
  cuenca: [-2.9, -79.0],
  loja: [-3.99, -79.2],
  huaquillas: [-3.48, -80.23],
  zaruma: [-3.69, -79.61],
  mancora: [-4.1, -81.05],
  puyo: [-1.49, -78.0],
  ambato: [-1.24, -78.62],
  riobamba: [-1.67, -78.65],
  manta: [-0.96, -80.71],
  portoviejo: [-1.05, -80.45],
  tena: [-0.99, -77.81],
  esmeraldas: [0.97, -79.65],
  ibarra: [0.35, -78.12],
  tulcan: [0.81, -77.72],
  "santo domingo": [-0.25, -79.17],
  salinas: [-2.21, -80.96],
  montanita: [-1.83, -80.75],
  banos: [-1.4, -78.42],
  latacunga: [-0.93, -78.62],
  azogues: [-2.74, -78.85],
  macas: [-2.31, -78.12],
  zamora: [-4.07, -78.95],
  babahoyo: [-1.8, -79.53],
  milagro: [-2.13, -79.59],
  "lago agrio": [0.09, -76.89],
  pasaje: [-3.33, -79.81],
  "santa rosa": [-3.45, -79.96],
};
