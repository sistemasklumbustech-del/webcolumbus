import type { BoletoEmitido } from "./api";

/**
 * Datos del boleto para mostrar, imprimir y compartir (rediseño del boleto, 29-oct-2026).
 * Solo formatea lo que la compra ya devuelve; no calcula nada de precios.
 */
const ZONA = "America/Guayaquil";

/** Mismo número que imprime el PDF de Mis boletos (API: `KLB-` + 8 primeros caracteres del id). */
export function numeroBoleto(boletoId: string): string {
  return `KLB-${boletoId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** "Vie, 30 Oct" (o con año: "Vie, 30 Oct 2026"). */
export function fechaBoleto(iso: string, conAnio = false): string {
  const texto = new Date(iso)
    .toLocaleDateString("es-EC", {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(conAnio ? { year: "numeric" as const } : {}),
      timeZone: ZONA,
    })
    .replace(/\./g, "");
  return texto.replace(/(^|\s)(\p{L})/gu, (_, espacio: string, letra: string) => espacio + letra.toUpperCase());
}

/** "16:00" en hora de Ecuador. */
export function horaBoleto(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ZONA });
}

export interface GrupoBoletos {
  clave: string;
  /** "IDA" / "VUELTA" en compras de ida y vuelta; null en solo ida. */
  tramo: "IDA" | "VUELTA" | null;
  boletos: BoletoEmitido[];
}

/**
 * Texto para compartir (aprobado por el director): ruta, fecha, hora, asiento, cooperativa y
 * N.º de boleto, sin el QR (quien recibe el QR podría abordar con él).
 */
export function textoParaCompartir(grupos: GrupoBoletos[]): string {
  const bloques = grupos.map((grupo) => {
    const viaje = grupo.boletos[0];
    const lineas = [
      `${grupo.tramo ? `${grupo.tramo === "IDA" ? "Ida" : "Vuelta"}: ` : ""}${viaje.rutaOrigenCiudad} → ${viaje.rutaDestinoCiudad}`,
      `${fechaBoleto(viaje.horaSalidaProgramada)} · ${horaBoleto(viaje.horaSalidaProgramada)}`,
      `Cooperativa ${viaje.cooperativaNombre}`,
      ...grupo.boletos.map((b) => `Asiento ${b.numeroAsiento} · Boleto N.º ${numeroBoleto(b.id)}`),
    ];
    return lineas.join("\n");
  });
  const titulo = grupos.reduce((n, g) => n + g.boletos.length, 0) > 1 ? "Mis boletos Klumbus" : "Mi boleto Klumbus";
  return [titulo, ...bloques, "Muestra tu QR desde Klumbus al abordar."].join("\n\n");
}
