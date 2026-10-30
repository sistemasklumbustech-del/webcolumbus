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
  /** Recargo de los asientos VIP de ese viaje (de la API, vía Resultados); null si no hay. */
  recargoVip: number | null;
  /** Ej.: "vie 16 oct · sale 07:00, llega 13:28". */
  lineaSalida: string | null;
}

const CLAVES = ["rOrigen", "rDestino", "rSalida", "rLlegada", "rCoop", "rPrecio", "rVip"] as const;
// Ida y vuelta: el resumen de la IDA viaja con el prefijo "i" (iOrigen, iSalida...) hasta el pago,
// para mostrar las dos rutas. Solo informativo, igual que el resto del resumen.
const CLAVES_IDA = CLAVES.map((c) => `i${c.slice(1)}`);
const ZONA = "America/Guayaquil";

function horaCorta(d: Date): string {
  return d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ZONA });
}

function fechaValida(texto: string | null): Date | null {
  if (!texto) return null;
  const d = new Date(texto);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function leerResumenViaje(sp: LectorParametros, prefijo: "r" | "i" = "r"): ResumenViaje {
  const get = (c: string) => sp.get(`${prefijo}${c}`);
  const precioTexto = get("Precio");
  const precio = precioTexto && Number.isFinite(Number(precioTexto)) ? Number(precioTexto) : null;
  const vipTexto = get("Vip");
  const recargoVip = vipTexto && Number.isFinite(Number(vipTexto)) && Number(vipTexto) > 0 ? Number(vipTexto) : null;
  const salida = fechaValida(get("Salida"));
  const llegada = fechaValida(get("Llegada"));
  const dia = salida
    ? salida.toLocaleDateString("es-EC", { weekday: "short", day: "numeric", month: "short", timeZone: ZONA }).replace(".", "")
    : null;
  return {
    origen: get("Origen"),
    destino: get("Destino"),
    cooperativa: get("Coop"),
    precio,
    recargoVip,
    lineaSalida: salida ? `${dia} · sale ${horaCorta(salida)}${llegada ? `, llega ${horaCorta(llegada)}` : ""}` : null,
  };
}

/** Los parámetros del resumen presentes en la URL actual, para pasarlos a la pantalla siguiente. */
export function parametrosDeResumen(sp: LectorParametros): URLSearchParams {
  const salida = new URLSearchParams();
  for (const clave of [...CLAVES, ...CLAVES_IDA]) {
    const valor = sp.get(clave);
    if (valor) salida.set(clave, valor);
  }
  return salida;
}

/** El resumen actual (r...) convertido en resumen de la IDA (i...), al pasar a buscar la vuelta. */
export function parametrosDeResumenComoIda(sp: LectorParametros): URLSearchParams {
  const salida = new URLSearchParams();
  for (const clave of CLAVES) {
    const valor = sp.get(clave);
    if (valor) salida.set(`i${clave.slice(1)}`, valor);
  }
  return salida;
}
