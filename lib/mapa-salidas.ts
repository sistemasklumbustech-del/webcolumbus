import { claveCiudad, COORDENADAS_CIUDADES } from "@/lib/portada-datos";
import { MAPA_ALTO, MAPA_ANCHO, proyectarMapa } from "@/lib/mapa-ecuador";

/**
 * Cálculo del mapa de salidas (posiciones y curvas de cada ruta). Va aparte del componente porque la
 * sección de la portada, que se arma en el servidor, necesita saber de antemano si habrá mapa.
 */
export interface DestinoMapa {
  ciudad: string;
  precio?: number;
  detalle?: string | null;
}

export interface Punto extends DestinoMapa {
  clave: string;
  x: number;
  y: number;
  curva: string;
  /** Dónde va el nombre de la ciudad, elegido para no chocar con otros nombres. */
  etiqueta: { x: number; y: number; ancla: "start" | "end" | "middle" };
}

export function puntosDelMapa(origen: string, destinos: DestinoMapa[]) {
  const coordOrigen = COORDENADAS_CIUDADES[claveCiudad(origen)];
  if (!coordOrigen) return null;
  const [ox, oy] = proyectarMapa(coordOrigen);
  const vistos = new Set<string>([claveCiudad(origen)]);
  const puntos: Punto[] = [];
  for (const d of destinos) {
    const clave = claveCiudad(d.ciudad);
    const coord = COORDENADAS_CIUDADES[clave];
    if (!coord || vistos.has(clave)) continue;
    vistos.add(clave);
    const [x, y] = proyectarMapa(coord);
    // Curva suave: el punto de control se aparta de la recta, siempre hacia el mismo lado.
    const dx = x - ox;
    const dy = y - oy;
    const largo = Math.hypot(dx, dy) || 1;
    const curvatura = Math.min(40, largo * 0.22);
    const cx = (ox + x) / 2 + (dy / largo) * curvatura;
    const cy = (oy + y) / 2 - (dx / largo) * curvatura;
    puntos.push({
      ...d,
      clave,
      x,
      y,
      curva: `M${ox.toFixed(1)} ${oy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`,
      etiqueta: { x: x + 12, y: y + 4, ancla: "start" },
    });
  }
  if (puntos.length === 0) return null;
  ubicarEtiquetas(puntos, ox, oy);
  return { ox, oy, puntos };
}

export function hayMapaSalidas(origen: string, destinos: DestinoMapa[]): boolean {
  return puntosDelMapa(origen, destinos) !== null;
}

type Caja = [number, number, number, number];
const choca = (a: Caja, b: Caja) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * Coloca cada nombre a la derecha, a la izquierda, abajo o arriba de su punto: el primer lugar que no
 * choque con la etiqueta de la terminal, con los puntos ni con otro nombre, y que quede dentro del mapa.
 */
function ubicarEtiquetas(puntos: Punto[], ox: number, oy: number) {
  const ocupadas: Caja[] = [
    [ox - 42, oy - 44, ox + 42, oy - 16], // etiqueta de la terminal
    [ox - 12, oy - 12, ox + 12, oy + 12], // punto de la terminal
    ...puntos.map((p): Caja => [p.x - 7, p.y - 7, p.x + 7, p.y + 7]),
  ];
  // Primero las ciudades más cercanas a la terminal: son las que tienen menos espacio.
  const orden = [...puntos].sort((a, b) => Math.hypot(a.x - ox, a.y - oy) - Math.hypot(b.x - ox, b.y - oy));
  for (const p of orden) {
    const ancho = p.ciudad.length * 7.6;
    const opciones: Array<{ caja: Caja; etiqueta: Punto["etiqueta"] }> = [
      { caja: [p.x + 10, p.y - 9, p.x + 12 + ancho, p.y + 7], etiqueta: { x: p.x + 11, y: p.y + 4, ancla: "start" } },
      { caja: [p.x - 12 - ancho, p.y - 9, p.x - 10, p.y + 7], etiqueta: { x: p.x - 11, y: p.y + 4, ancla: "end" } },
      { caja: [p.x - ancho / 2, p.y + 9, p.x + ancho / 2, p.y + 25], etiqueta: { x: p.x, y: p.y + 21, ancla: "middle" } },
      { caja: [p.x - ancho / 2, p.y - 25, p.x + ancho / 2, p.y - 9], etiqueta: { x: p.x, y: p.y - 13, ancla: "middle" } },
      { caja: [p.x - ancho + 4, p.y + 9, p.x + 4, p.y + 25], etiqueta: { x: p.x + 4, y: p.y + 21, ancla: "end" } },
      { caja: [p.x - 4, p.y + 9, p.x - 4 + ancho, p.y + 25], etiqueta: { x: p.x - 4, y: p.y + 21, ancla: "start" } },
      { caja: [p.x - ancho + 4, p.y - 25, p.x + 4, p.y - 9], etiqueta: { x: p.x + 4, y: p.y - 13, ancla: "end" } },
    ];
    const dentro = (c: Caja) => c[0] >= 4 && c[1] >= 4 && c[2] <= MAPA_ANCHO - 4 && c[3] <= MAPA_ALTO - 4;
    const libre =
      opciones.find((o) => dentro(o.caja) && !ocupadas.some((c) => choca(c, o.caja))) ??
      opciones.find((o) => dentro(o.caja)) ??
      opciones[0];
    p.etiqueta = libre.etiqueta;
    ocupadas.push(libre.caja);
  }
}
