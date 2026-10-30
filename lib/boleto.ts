import type { BoletoEmitido, EstadoTasaBoleto, MiBoleto } from "./api";

/**
 * Datos del boleto para mostrar, imprimir y compartir (rediseño del boleto, 29-oct-2026).
 * Solo formatea lo que la compra ya devuelve; no calcula nada de precios.
 */
const ZONA = "America/Guayaquil";

/** Mismo número que imprime el PDF de Mis boletos (API: `KLB-` + 8 primeros caracteres del id). */
export function numeroBoleto(boletoId: string): string {
  return `KLB-${boletoId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/**
 * "Vie 30 oct 2026" (aprobado por el director): día de la semana con mayúscula, mes en minúscula,
 * sin coma ni puntos. Igual en pantalla, impresión y texto compartido.
 */
export function fechaBoleto(iso: string): string {
  const partes = new Intl.DateTimeFormat("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: ZONA,
  }).formatToParts(new Date(iso));
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    (partes.find((p) => p.type === tipo)?.value ?? "").replace(/\./g, "").trim();
  const dia = parte("weekday");
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${parte("day")} ${parte("month").toLowerCase()} ${parte("year")}`;
}

/** "16:00" en hora de Ecuador. */
export function horaBoleto(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ZONA });
}

/**
 * Un boleto listo para mostrar, venga de la compra recién hecha o de "Mis boletos".
 * Los datos opcionales (asiento, pasajero, disco...) se muestran solo si llegan: nunca se rellenan
 * con "—" (decisión del director, 29-oct-2026).
 */
export interface BoletoVista {
  id: string;
  codigoQr: string;
  cooperativa: string;
  origen: string;
  destino: string;
  /** Hora de salida (ISO). */
  salida: string;
  asiento?: string | null;
  esVip?: boolean;
  pasajero?: string | null;
  documento?: string | null;
  disco?: string | null;
  placa?: string | null;
  tarifa?: number | null;
  tasa?: number | null;
}

/** Código de acceso al andén (tasa del terminal) de un boleto. */
export interface AndenBoleto {
  estadoTasa: EstadoTasaBoleto;
  codigoTasa: string | null;
}

export function vistaDeEmitido(b: BoletoEmitido): BoletoVista {
  return {
    id: b.id,
    codigoQr: b.codigoQr,
    cooperativa: b.cooperativaNombre,
    origen: b.rutaOrigenCiudad,
    destino: b.rutaDestinoCiudad,
    salida: b.horaSalidaProgramada,
    asiento: b.numeroAsiento,
    esVip: b.esVip,
    pasajero: b.compradorNombre,
    documento: b.compradorDocumento,
    disco: b.unidadIdentificador,
    placa: b.unidadPlaca,
    tarifa: b.precioPagado,
    tasa: b.tasaTerminal,
  };
}

/** De "Mis boletos": los datos del pasajero y del bus llegan cuando la API los agregue (bloque API). */
export function vistaDeMiBoleto(b: MiBoleto): BoletoVista {
  return {
    id: b.boletoId,
    codigoQr: b.codigoQr,
    cooperativa: b.cooperativaNombre,
    origen: b.origenCiudad,
    destino: b.destinoCiudad,
    salida: b.horaSalidaProgramada,
    asiento: b.numeroAsiento,
    esVip: b.esVip,
    pasajero: b.compradorNombre,
    documento: b.compradorDocumento,
    disco: b.unidadIdentificador,
    placa: b.unidadPlaca,
    tarifa: b.precioPagado,
    tasa: b.tasaTerminal,
  };
}

/** Pares etiqueta/valor del boleto, solo con los datos que hay. */
export function datosDelBoleto(b: BoletoVista, opciones: { conCooperativa?: boolean } = {}): [string, string][] {
  const filas: [string, string | null | undefined][] = [
    ["Pasajero", b.pasajero],
    ["Documento", b.documento],
    ["Asiento", b.asiento ? `${b.asiento}${b.esVip ? " · VIP" : ""}` : null],
    ["Cooperativa", opciones.conCooperativa ? b.cooperativa : null],
    ["Disco", b.disco],
    ["Placa", b.placa],
    ["Tarifa", typeof b.tarifa === "number" ? `$${b.tarifa.toFixed(2)}` : null],
    ["Tasa de terminal", typeof b.tasa === "number" && b.tasa > 0 ? `$${b.tasa.toFixed(2)}` : null],
  ];
  return filas.filter((f): f is [string, string] => typeof f[1] === "string" && f[1].trim() !== "");
}

export interface GrupoBoletos {
  clave: string;
  /** "IDA" / "VUELTA" en compras de ida y vuelta; null en solo ida. */
  tramo: "IDA" | "VUELTA" | null;
  boletos: BoletoVista[];
}

/**
 * Texto para compartir (aprobado por el director): ruta, fecha, hora, asiento, cooperativa y
 * N.º de boleto, sin el QR (quien recibe el QR podría abordar con él).
 */
export function textoParaCompartir(grupos: GrupoBoletos[]): string {
  const bloques = grupos.map((grupo) => {
    const viaje = grupo.boletos[0];
    const lineas = [
      `${grupo.tramo ? `${grupo.tramo === "IDA" ? "Ida" : "Vuelta"}: ` : ""}${viaje.origen} → ${viaje.destino}`,
      `${fechaBoleto(viaje.salida)} · ${horaBoleto(viaje.salida)}`,
      `Cooperativa ${viaje.cooperativa}`,
      ...grupo.boletos.map((b) => `${b.asiento ? `Asiento ${b.asiento} · ` : ""}Boleto N.º ${numeroBoleto(b.id)}`),
    ];
    return lineas.join("\n");
  });
  const titulo = grupos.reduce((n, g) => n + g.boletos.length, 0) > 1 ? "Mis boletos Klumbus" : "Mi boleto Klumbus";
  return [titulo, ...bloques, "Muestra tu QR desde Klumbus al abordar."].join("\n\n");
}
