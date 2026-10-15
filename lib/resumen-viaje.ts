/**
 * Resumen informativo del viaje que la pantalla de resultados manda por la URL a asientos
 * y checkout (ruta, salida, cooperativa y tarifa de referencia). Solo se muestra: el precio
 * real lo calcula el servidor al cotizar y comprar. Si faltan (enlace directo), simplemente
 * no se muestran.
 */
export interface LectorParametros {
  get(clave: string): string | null;
}

export interface ResumenViaje {
  origen: string | null;
  destino: string | null;
  cooperativa: string | null;
  /** Tarifa de referencia por asiento (adulto), solo informativa. */
  precio: number | null;
  /** Ej.: "vie 16 oct · sale 07:00, llega 13:28". */
  lineaSalida: string | null;
}

const CLAVES = ["rOrigen", "rDestino", "rSalida", "rLlegada", "rCoop", "rPrecio"] as const;
const ZONA = "America/Guayaquil";

function horaCorta(d: Date): string {
  return d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ZONA });
}

function fechaValida(texto: string | null): Date | null {
  if (!texto) return null;
  const d = new Date(texto);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function leerResumenViaje(sp: LectorParametros): ResumenViaje {
  const precioTexto = sp.get("rPrecio");
  const precio = precioTexto && Number.isFinite(Number(precioTexto)) ? Number(precioTexto) : null;
  const salida = fechaValida(sp.get("rSalida"));
  const llegada = fechaValida(sp.get("rLlegada"));
  const dia = salida
    ? salida.toLocaleDateString("es-EC", { weekday: "short", day: "numeric", month: "short", timeZone: ZONA }).replace(".", "")
    : null;
  return {
    origen: sp.get("rOrigen"),
    destino: sp.get("rDestino"),
    cooperativa: sp.get("rCoop"),
    precio,
    lineaSalida: salida ? `${dia} · sale ${horaCorta(salida)}${llegada ? `, llega ${horaCorta(llegada)}` : ""}` : null,
  };
}

/** Los parámetros del resumen presentes en la URL actual, para pasarlos a la pantalla siguiente. */
export function parametrosDeResumen(sp: LectorParametros): URLSearchParams {
  const salida = new URLSearchParams();
  for (const clave of CLAVES) {
    const valor = sp.get(clave);
    if (valor) salida.set(clave, valor);
  }
  return salida;
}
