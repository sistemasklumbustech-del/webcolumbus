"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { interpretarCelda, type Celda, type PisoDistribucionAsientos } from "@/lib/api";

/**
 * Mapa de asientos -- modelos de vehículo (propuesta oct-2026): cada unidad se dibuja como un plano
 * real visto desde arriba, con un modelo estándar por tipo:
 *   - Bus de 1 piso · Bus de 2 pisos (los dos pisos del mismo largo) · Buseta · Microbús/van (con capó).
 * Carrocería con parabrisas y plumillas, espejos, llantas asomando, ventanas a los lados, puesto del
 * conductor a la izquierda con su volante, puerta a la derecha con escalones, escalera y baño en su
 * lugar. Las sillas (las del diseño oficial) miran hacia el frente.
 *
 * Orientación: de pie (frente arriba) en celular; acostado (frente a la izquierda) en PC cuando cabe.
 * Acostado, el lado del conductor (izquierdo del vehículo) queda ABAJO y la puerta ARRIBA, como en la
 * realidad al mirar un bus que va hacia la izquierda.
 *
 * Todo se calcula en un solo sistema de medidas (el vehículo de pie); para acostarlo se gira el dibujo
 * y se recalculan las posiciones de los botones, así el dibujo y las sillas nunca se desalinean.
 *
 * Mismo contrato de siempre: aquí solo se dibuja; qué asientos están libres, ocupados o elegidos lo
 * decide quien lo usa (pasajero en línea, vendedor en ventanilla o el constructor de la cooperativa).
 */
export interface PropiedadesMapaBus {
  pisos: PisoDistribucionAsientos[];
  /** numero de asiento -> estado real (ocupado, bloqueado_temporal, pendiente_confirmacion_pago). Si no aparece, está libre. */
  estadoPorNumero: Map<string, string>;
  seleccionados: string[];
  onAlternar: (numero: string) => void;
  /** El tipo de vehículo declara baño a bordo (amenidad "bano_a_bordo"). */
  tieneBano: boolean;
  /** Marca con un punto los asientos VIP (útil al configurar el bus o vender en ventanilla). */
  mostrarVip?: boolean;
  /** Categoría del vehículo (bus, buseta, van, auto): elige el modelo que se dibuja. */
  categoria?: string | null;
  /** Nombre del tipo de vehículo (ej. "Doble Piso Ejecutivo 60"), para la barra de arriba del plano. */
  nombreVehiculo?: string | null;
}

export type Posicion = "ventana" | "pasillo" | "centro";

const ETIQUETA_POSICION: Record<Posicion, string> = {
  ventana: "Ventana",
  pasillo: "Pasillo",
  centro: "Centro",
};

/**
 * Dónde queda un asiento dentro de su fila: en el extremo = ventana; junto a
 * un pasillo (celda vacía) = pasillo; entre otros asientos sin pasillo = centro.
 */
function posicionDelAsiento(celdas: Celda[], indice: number): Posicion {
  const indicesAsientos = celdas.map((c, i) => (c === null ? -1 : i)).filter((i) => i >= 0);
  const primero = indicesAsientos[0];
  const ultimo = indicesAsientos[indicesAsientos.length - 1];
  if (indice === primero || indice === ultimo) return "ventana";
  const vecinoPasillo = celdas[indice - 1] === null || celdas[indice + 1] === null;
  return vecinoPasillo ? "pasillo" : "centro";
}

/** Ubicación legible de un asiento (para el resumen de la selección): posición y piso. */
export function ubicacionDeAsiento(
  pisos: PisoDistribucionAsientos[],
  numero: string,
): { posicion: string; piso: number } | null {
  for (let p = 0; p < pisos.length; p++) {
    for (const fila of pisos[p].filas) {
      for (let j = 0; j < fila.celdas.length; j++) {
        const c = interpretarCelda(fila.celdas[j], pisos[p]);
        if (c && c.numero === numero) {
          return { posicion: ETIQUETA_POSICION[posicionDelAsiento(fila.celdas, j)], piso: p + 1 };
        }
      }
    }
  }
  return null;
}

/** Número de la fila tal como lo lleva el asiento (ej. el piso 2 empieza en la fila 6); si no se puede leer, la posición. */
function numeroDeFila(celdas: Celda[], piso: PisoDistribucionAsientos, indice: number): number {
  for (const celda of celdas) {
    const it = interpretarCelda(celda, piso);
    const m = it?.numero.match(/^(\d+)/);
    if (m) return Number(m[1]);
  }
  return indice + 1;
}

/** Silla del diseño oficial: respaldo, asiento y dos brazos. viewBox 40×40 (respaldo arriba). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DibujoSilla(_props: { ocupada?: boolean } = {}) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="kb-silla__svg">
      <rect className="kb-silla__respaldo" x="7" y="3" width="26" height="11" rx="4" />
      <rect className="kb-silla__cojin" x="9" y="15" width="22" height="20" rx="6" />
      <rect className="kb-silla__brazo" x="3" y="16" width="5" height="15" rx="2.5" />
      <rect className="kb-silla__brazo" x="32" y="16" width="5" height="15" rx="2.5" />
    </svg>
  );
}

/* ================================================================ modelos y medidas */

type Modelo = "bus" | "buseta" | "micro";

const NOMBRE_MODELO: Record<Modelo, (pisos: number) => string> = {
  bus: (pisos) => (pisos > 1 ? "Bus de 2 pisos" : "Bus de 1 piso"),
  buseta: () => "Buseta",
  micro: () => "Microbús",
};

function modeloDe(categoria: string | null | undefined): Modelo {
  const c = (categoria ?? "bus").toLowerCase();
  if (c === "van" || c === "auto") return "micro";
  if (c === "buseta") return "buseta";
  return "bus";
}

// Medidas del plano (unidades = px a escala 1, vehículo de pie, frente arriba).
const SILLA = 44; // ancho de una silla
const PASO_FILA = 56; // largo de cada fila
const PASILLO = 30;
const SEPARACION = 4; // entre sillas vecinas
const PARED = 12; // pared lateral con las ventanas
const HOLGURA = 6; // entre la pared y la primera silla
const MARGEN = 26; // espacio alrededor del vehículo (espejos, llantas)

/** Largo del frente según el modelo y el piso: hasta donde empieza la primera fila. */
function largoFrente(modelo: Modelo, piso: number): number {
  if (piso > 0) return 78; // piso de arriba: ventanal panorámico
  if (modelo === "micro") return 196; // capó + parabrisas + cabina
  if (modelo === "buseta") return 164;
  return 172;
}
const LARGO_ATRAS: Record<Modelo, number> = { bus: 46, buseta: 40, micro: 34 };
const LARGO_BLOQUE = PASO_FILA + 14; // escalera o baño

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Geometria {
  modelo: Modelo;
  ancho: number; // W: ancho exterior del vehículo
  largo: number; // L: largo exterior
  columnas: { x: number; w: number; pasillo: boolean; letra: string }[];
  izq: [number, number]; // tramo (x) del grupo de sillas izquierdo
  der: [number, number]; // tramo (x) del grupo derecho
  frente: number;
  filas: { y: number; numero: number; celdas: Celda[] }[];
  escalera: Rect | null;
  bano: Rect | null;
  equipaje: Rect | null;
  puerta: [number, number] | null; // tramo (y) de la puerta en la pared derecha
}

function calcularGeometria(
  piso: PisoDistribucionAsientos,
  indicePiso: number,
  modelo: Modelo,
  posBano: string,
  posEscalera: string,
  largoMinimo: number,
): Geometria {
  const numColumnas = Math.max(1, ...piso.filas.map((f) => f.celdas.length));
  const esPasillo = Array.from({ length: numColumnas }, (_, j) => piso.filas.every((f) => f.celdas[j] == null));
  let x = PARED + HOLGURA;
  let letra = 0;
  const columnas = esPasillo.map((p) => {
    const w = p ? PASILLO : SILLA;
    const col = { x, w, pasillo: p, letra: p ? "" : String.fromCharCode(65 + letra++) };
    x += w + (p ? 0 : SEPARACION);
    return col;
  });
  const ancho = x - (columnas.length && !columnas[columnas.length - 1].pasillo ? SEPARACION : 0) + HOLGURA + PARED;
  const iPas = esPasillo.indexOf(true);
  const uPas = esPasillo.lastIndexOf(true);
  const izq: [number, number] = iPas >= 0 ? [PARED + HOLGURA, columnas[iPas].x] : [PARED + HOLGURA, ancho - PARED - HOLGURA];
  const der: [number, number] = uPas >= 0 ? [columnas[uPas].x + PASILLO, ancho - PARED - HOLGURA] : izq;

  const frente = largoFrente(modelo, indicePiso);
  let y = frente;
  let escalera: Rect | null = null;
  let bano: Rect | null = null;
  // Adelante: escalera (a la derecha) y/o baño (a la izquierda).
  if (posEscalera === "frente" || posBano === "frente") {
    if (posEscalera === "frente") escalera = { x: der[0], y: y + 4, w: der[1] - der[0], h: LARGO_BLOQUE - 10 };
    if (posBano === "frente") bano = { x: izq[0], y: y + 4, w: izq[1] - izq[0] - 4, h: LARGO_BLOQUE - 10 };
    y += LARGO_BLOQUE + 16; // + espacio para las letras de las columnas
  }
  const filas = piso.filas.map((f, i) => {
    const fila = { y: y + i * PASO_FILA, numero: numeroDeFila(f.celdas, piso, i), celdas: f.celdas };
    return fila;
  });
  y += piso.filas.length * PASO_FILA;
  if (posBano === "atras" || posEscalera === "atras") {
    if (posBano === "atras") bano = { x: der[0], y: y + 6, w: der[1] - der[0], h: LARGO_BLOQUE - 10 };
    if (posEscalera === "atras") {
      const lado = posBano === "atras" && iPas >= 0 ? izq : der;
      escalera = { x: lado[0], y: y + 6, w: lado[1] - lado[0], h: LARGO_BLOQUE - 10 };
    }
    y += LARGO_BLOQUE;
  }
  // En un bus de 2 pisos los dos pisos miden lo mismo: lo que sobra abajo es la zona de equipaje.
  let equipaje: Rect | null = null;
  const largoBase = y + LARGO_ATRAS[modelo];
  if (largoMinimo > largoBase + 20) {
    if (indicePiso === 0) equipaje = { x: izq[0], y: y + 6, w: der[1] - izq[0], h: largoMinimo - largoBase - 12 };
    y += largoMinimo - largoBase;
  }
  const largo = Math.max(largoMinimo, y + LARGO_ATRAS[modelo]);
  const puerta: [number, number] | null =
    indicePiso === 0 ? (modelo === "micro" ? [frente - 70, frente - 6] : [frente - 104, frente - 22]) : null;
  return { modelo, ancho, largo, columnas, izq, der, frente, filas, escalera, bano, equipaje, puerta };
}

/** Largo que tendría un piso sin igualar (para que los 2 pisos midan lo mismo). */
function largoNatural(piso: PisoDistribucionAsientos, i: number, modelo: Modelo, posBano: string, posEscalera: string) {
  return calcularGeometria(piso, i, modelo, posBano, posEscalera, 0).largo;
}

/** Dónde termina el parabrisas (de pie, desde el frente). */
function finDelVidrio(m: Modelo, arriba: boolean): number {
  return arriba ? 54 : m === "micro" ? 104 : 46;
}

/* ================================================================ dibujo de la carrocería */

const TINTA = "#1A1D24";

/** Contorno exterior del vehículo de pie (frente arriba). */
function contorno(m: Modelo, W: number, L: number, pisoArriba: boolean): string {
  if (m === "micro" && !pisoArriba) {
    // Capó más angosto que la cabina, como una van vista desde arriba.
    const a = W * 0.1;
    const b = W - a;
    return `M ${a + 16} 0 H ${b - 16} Q ${b} 0 ${b + 2} 14 L ${W - 4} 74 Q ${W} 84 ${W} 98 V ${L - 18} Q ${W} ${L} ${W - 18} ${L} H 18 Q 0 ${L} 0 ${L - 18} V 98 Q 0 84 4 74 L ${a - 2} 14 Q ${a} 0 ${a + 16} 0 Z`;
  }
  const rf = m === "buseta" ? 34 : 26; // frente
  const rt = 14; // atrás
  return `M ${rf} 0 H ${W - rf} Q ${W} 0 ${W} ${rf} V ${L - rt} Q ${W} ${L} ${W - rt} ${L} H ${rt} Q 0 ${L} 0 ${L - rt} V ${rf} Q 0 0 ${rf} 0 Z`;
}

function ArteVehiculo({ g, indicePiso }: { g: Geometria; indicePiso: number }) {
  const { modelo: m, ancho: W, largo: L, frente } = g;
  const arriba = indicePiso > 0;
  const inicioVidrio = m === "micro" && !arriba ? 62 : 6;
  const finVidrio = finDelVidrio(m, arriba);
  const yFilas = g.filas.length ? g.filas[0].y : frente;
  const finFilas = g.filas.length ? g.filas[g.filas.length - 1].y + PASO_FILA : frente;
  const ejes =
    m === "micro" ? [74, L - 70] : m === "buseta" ? [frente - 44, L - 82] : [frente - 44, L - 150, L - 92];

  return (
    <g>
      {/* Llantas (asoman a los lados) */}
      {ejes.map((y, i) => (
        <g key={i} fill={TINTA}>
          <rect x={-6} y={y - 20} width={9} height={40} rx={3} />
          <rect x={W - 3} y={y - 20} width={9} height={40} rx={3} />
        </g>
      ))}

      {/* Espejos retrovisores (solo en el piso de abajo) */}
      {!arriba &&
        (m === "micro" ? (
          <g fill="#fff" stroke={TINTA} strokeWidth={2}>
            <path d={`M 4 84 L -12 78`} fill="none" strokeLinecap="round" />
            <rect x={-22} y={68} width={12} height={18} rx={4} />
            <path d={`M ${W - 4} 84 L ${W + 12} 78`} fill="none" strokeLinecap="round" />
            <rect x={W + 10} y={68} width={12} height={18} rx={4} />
          </g>
        ) : (
          <g fill="#fff" stroke={TINTA} strokeWidth={2.2} strokeLinecap="round">
            <path d={`M 3 30 C -12 26 -18 12 -14 -2`} fill="none" />
            <rect x={-20} y={-20} width={12} height={22} rx={6} />
            <path d={`M ${W - 3} 30 C ${W + 12} 26 ${W + 18} 12 ${W + 14} -2`} fill="none" />
            <rect x={W + 8} y={-20} width={12} height={22} rx={6} />
          </g>
        ))}

      {/* Carrocería */}
      <path d={contorno(m, W, L, arriba)} fill="#fff" stroke={TINTA} strokeWidth={3} filter="url(#kbSombra)" />

      {/* Capó del microbús */}
      {m === "micro" && !arriba && (
        <g stroke="#C9CED7" strokeWidth={1.4} fill="none">
          <path d={`M ${W * 0.3} 10 Q ${W / 2} 4 ${W * 0.7} 10`} />
          <path d={`M ${W * 0.22} 30 Q ${W / 2} 22 ${W * 0.78} 30`} />
        </g>
      )}

      {/* Faros (amarillo Klumbus) y luces traseras */}
      {!arriba && (
        <g>
          <rect x={m === "micro" ? W * 0.12 : 10} y={-2} width={20} height={5} rx={2.5} fill="#FDD514" />
          <rect x={(m === "micro" ? W * 0.88 : W - 10) - 20} y={-2} width={20} height={5} rx={2.5} fill="#FDD514" />
        </g>
      )}
      <rect x={12} y={L - 3} width={22} height={5} rx={2.5} fill="#8A909C" />
      <rect x={W - 34} y={L - 3} width={22} height={5} rx={2.5} fill="#8A909C" />

      {/* Parabrisas con su tablero curvo y plumillas */}
      <path
        d={`M ${14} ${inicioVidrio + 10} Q ${W / 2} ${inicioVidrio - 6} ${W - 14} ${inicioVidrio + 10} L ${W - 16} ${finVidrio - 4} Q ${W / 2} ${finVidrio - 14} ${16} ${finVidrio - 4} Z`}
        fill="url(#kbVidrio)"
        stroke={TINTA}
        strokeWidth={2}
      />
      {!arriba && (
        <g stroke={TINTA} strokeWidth={1.6} strokeLinecap="round">
          <path d={`M ${W * 0.3} ${finVidrio - 10} L ${W * 0.46} ${inicioVidrio + 12}`} />
          <path d={`M ${W * 0.62} ${finVidrio - 10} L ${W * 0.78} ${inicioVidrio + 12}`} />
        </g>
      )}

      {/* Paredes interiores (doble línea) */}
      <rect
        x={PARED - 3}
        y={finVidrio + 2}
        width={W - 2 * (PARED - 3)}
        height={L - finVidrio - 12}
        rx={8}
        fill="#FBFBFC"
        stroke={TINTA}
        strokeWidth={1.4}
      />

      {/* Ventanas a cada lado de cada fila */}
      {g.filas.map((f) => (
        <g key={f.y} fill="#4A505C">
          <rect x={3} y={f.y + 8} width={4} height={PASO_FILA - 16} rx={2} />
          <rect x={W - 7} y={f.y + 8} width={4} height={PASO_FILA - 16} rx={2} />
        </g>
      ))}

      {/* Pasillo */}
      {g.columnas
        .filter((c) => c.pasillo)
        .map((c) => (
          <rect key={c.x} x={c.x} y={yFilas - 4} width={c.w} height={finFilas - yFilas + 8} rx={6} fill="#EEF0F3" />
        ))}

      {/* Piso de abajo: puerta (abertura en la pared derecha) con escalones, y pared detrás del conductor */}
      {g.puerta && (
        <g>
          <rect x={W - PARED - 2} y={g.puerta[0]} width={PARED + 6} height={g.puerta[1] - g.puerta[0]} fill="#fff" />
          <g stroke="#9AA0AC" strokeWidth={1.6}>
            {[0.25, 0.5, 0.75].map((t) => (
              <line
                key={t}
                x1={g.der[1] - 34}
                x2={W - 4}
                y1={g.puerta![0] + (g.puerta![1] - g.puerta![0]) * t}
                y2={g.puerta![0] + (g.puerta![1] - g.puerta![0]) * t}
              />
            ))}
          </g>
          <line x1={PARED - 3} x2={g.izq[1]} y1={frente - 26} y2={frente - 26} stroke={TINTA} strokeWidth={3} strokeLinecap="round" />
        </g>
      )}

      {/* Escalera entre pisos */}
      {g.escalera && (
        <g>
          <rect x={g.escalera.x} y={g.escalera.y} width={g.escalera.w} height={g.escalera.h} rx={8} fill="#F4F5F7" stroke="#9AA0AC" strokeWidth={1.5} />
          {Array.from({ length: 5 }, (_, i) => (
            <line
              key={i}
              x1={g.escalera!.x + 6}
              x2={g.escalera!.x + g.escalera!.w - 6}
              y1={g.escalera!.y + 10 + i * ((g.escalera!.h - 20) / 4)}
              y2={g.escalera!.y + 10 + i * ((g.escalera!.h - 20) / 4)}
              stroke="#C9CED7"
              strokeWidth={2}
            />
          ))}
        </g>
      )}

      {/* Baño: cubículo con inodoro y lavamanos */}
      {g.bano && (
        <g>
          <rect x={g.bano.x} y={g.bano.y} width={g.bano.w} height={g.bano.h} rx={8} fill="#fff" stroke={TINTA} strokeWidth={2} />
          <g transform={`translate(${g.bano.x + g.bano.w / 2 - 10} ${g.bano.y + g.bano.h / 2 - 14})`} fill="none" stroke={TINTA} strokeWidth={1.6}>
            <rect x={3} y={0} width={14} height={6} rx={2} />
            <ellipse cx={10} cy={17} rx={7} ry={9} />
            <ellipse cx={10} cy={17.5} rx={3.6} ry={5} />
          </g>
        </g>
      )}

      {/* Equipaje (piso de abajo de un bus de 2 pisos) */}
      {g.equipaje && (
        <rect x={g.equipaje.x} y={g.equipaje.y} width={g.equipaje.w} height={g.equipaje.h} rx={8} fill="url(#kbRayado)" stroke="#C9CED7" strokeWidth={1.4} />
      )}

      {/* Parte trasera: rejilla del motor */}
      {m !== "micro" && (
        <g stroke="#C9CED7" strokeWidth={1.6}>
          {[0, 1, 2].map((i) => (
            <line key={i} x1={W / 2 - 24} x2={W / 2 + 24} y1={L - 26 + i * 6} y2={L - 26 + i * 6} />
          ))}
        </g>
      )}
    </g>
  );
}

/* ================================================================ sillas y textos sobre el dibujo */

/** Convierte un rectángulo del vehículo de pie a la vista acostada (frente a la izquierda, conductor abajo). */
function girar(r: Rect, W: number, acostado: boolean): Rect {
  if (!acostado) return r;
  return { x: r.y, y: W - (r.x + r.w), w: r.h, h: r.w };
}

function Asiento({
  numero,
  posicion,
  etiquetas,
  estado,
  seleccionado,
  onAlternar,
  caja,
  acostado,
  pisoVip,
}: {
  numero: string;
  posicion: Posicion;
  etiquetas: string[];
  estado: string | undefined;
  seleccionado: boolean;
  onAlternar: (numero: string) => void;
  caja: React.CSSProperties;
  acostado: boolean;
  pisoVip: boolean;
}) {
  const noDisponible = estado !== undefined && estado !== "disponible";
  const textoEstado = noDisponible
    ? estado === "pendiente_confirmacion_pago"
      ? "reservado (pago pendiente)"
      : "ocupado"
    : seleccionado
      ? "elegido"
      : "libre";
  const esMujeres = etiquetas.includes("mujeres");
  const esVip = etiquetas.includes("vip");
  const notas = [esVip ? "VIP" : null, esMujeres ? "solo mujeres" : null].filter(Boolean) as string[];
  const descripcion = [`Asiento ${numero}`, ETIQUETA_POSICION[posicion], ...notas].join(" · ");
  const estadoClase = noDisponible ? "is-ocupada" : seleccionado ? "is-elegida" : esMujeres ? "is-mujeres" : "";

  return (
    <div className="group absolute" style={caja}>
      <button
        type="button"
        disabled={noDisponible}
        onClick={() => onAlternar(numero)}
        aria-label={`${descripcion}, ${textoEstado}`}
        aria-pressed={seleccionado}
        className={`kb-silla kb-silla--plano ${estadoClase} ${acostado ? "mira-izquierda" : "mira-arriba"}`}
      >
        <DibujoSilla />
        <span className="kb-silla__numero">{numero}</span>
        {esVip && !pisoVip && !noDisponible && !seleccionado && <span className="kb-silla__vip" aria-hidden="true" />}
      </button>
      <span role="tooltip" className="kb-silla__tip">
        {descripcion}
        {noDisponible ? ` (${textoEstado})` : ""}
      </span>
    </div>
  );
}

function Piso({
  piso,
  indicePiso,
  acostado,
  escala,
  largoMinimo,
  posBano,
  posEscalera,
  modelo,
  props,
}: {
  piso: PisoDistribucionAsientos;
  indicePiso: number;
  acostado: boolean;
  escala: number;
  largoMinimo: number;
  posBano: string;
  posEscalera: string;
  modelo: Modelo;
  props: PropiedadesMapaBus;
}) {
  const g = calcularGeometria(piso, indicePiso, modelo, posBano, posEscalera, largoMinimo);
  const totalAsientos = props.pisos.reduce(
    (n, p) => n + p.filas.reduce((m, f) => m + f.celdas.filter((c) => interpretarCelda(c, p)).length, 0),
    0,
  );
  const W = g.ancho;
  const L = g.largo;
  const esVipPiso = piso.categoria?.toLowerCase() === "vip";
  const anchoCaja = (acostado ? L : W) + 2 * MARGEN;
  const altoCaja = (acostado ? W : L) + 2 * MARGEN;

  /** Posición absoluta (px a escala) de un rectángulo del vehículo de pie. */
  const caja = (r: Rect): React.CSSProperties => {
    const q = girar(r, W, acostado);
    return { left: (q.x + MARGEN) * escala, top: (q.y + MARGEN) * escala, width: q.w * escala, height: q.h * escala };
  };
  /** Texto centrado en un punto del vehículo de pie (no se gira ni se parte en renglones). */
  const etiqueta = (texto: string, cx: number, cy: number, clase = "") => {
    const q = girar({ x: cx, y: cy, w: 0, h: 0 }, W, acostado);
    return (
      <span
        key={texto + cx + cy}
        className={`kb-plano-rotulo absolute ${clase}`}
        style={{ left: (q.x + MARGEN) * escala, top: (q.y + MARGEN) * escala }}
      >
        {texto}
      </span>
    );
  };
  /** Punto para el rótulo de un bloque (escalera, baño): de pie, abajo del bloque; acostado, abajo también. */
  const pieDe = (r: Rect): [number, number] => (acostado ? [r.x + 9, r.y + r.h / 2] : [r.x + r.w / 2, r.y + r.h - 10]);

  const sillas: React.ReactNode[] = [];
  g.filas.forEach((fila) => {
    g.columnas.forEach((col, j) => {
      if (col.pasillo) {
        sillas.push(
          <span key={`n${fila.y}-${j}`} aria-hidden="true" className="kb-plano-fila absolute" style={caja({ x: col.x, y: fila.y, w: col.w, h: PASO_FILA })}>
            {fila.numero}
          </span>,
        );
        return;
      }
      const it = interpretarCelda(fila.celdas[j] ?? null, piso);
      if (!it) return;
      sillas.push(
        <Asiento
          key={it.numero}
          numero={it.numero}
          posicion={posicionDelAsiento(fila.celdas, j)}
          etiquetas={it.etiquetas}
          estado={props.estadoPorNumero.get(it.numero)}
          seleccionado={props.seleccionados.includes(it.numero)}
          onAlternar={props.onAlternar}
          caja={caja({ x: col.x, y: fila.y + (PASO_FILA - SILLA) / 2, w: SILLA, h: SILLA })}
          acostado={acostado}
          pisoVip={esVipPiso}
        />,
      );
    });
  });

  // Letras de las columnas, justo antes de la primera fila.
  const yLetras = (g.filas[0]?.y ?? g.frente) - 18;
  const letras = g.columnas
    .filter((c) => c.letra)
    .map((c) => etiqueta(c.letra, c.x + c.w / 2, yLetras + 8, "kb-plano-letra"));

  // Puesto del conductor (piso de abajo): silla gris y volante delante.
  const conductor =
    indicePiso === 0 ? (
      <>
        <span className={`kb-silla kb-silla--plano is-conductor absolute ${acostado ? "mira-izquierda" : "mira-arriba"}`} aria-hidden="true" style={caja({ x: g.izq[0] + 4, y: g.frente - 70, w: SILLA - 4, h: SILLA - 4 })}>
          <DibujoSilla />
        </span>
        <span className="kb-plano-volante absolute" aria-hidden="true" style={caja({ x: g.izq[0] + 9, y: g.frente - 104, w: 30, h: 30 })}>
          <svg viewBox="0 0 24 24" fill="none" stroke={TINTA} strokeWidth={2.2} strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M12 14.5V21M9.6 11.2L3.5 9.5M14.4 11.2l6.1-1.7" />
          </svg>
        </span>
        {acostado
          ? etiqueta("Conductor", g.izq[0] + SILLA + 30, g.frente - 62, "kb-plano-pequeno")
          : etiqueta("Conductor", g.izq[0] + SILLA + 34, Math.max(finDelVidrio(modelo, false) + 30, g.frente - 50))}
      </>
    ) : (
      acostado ? null : etiqueta("Frente · vista panorámica", W / 2, 64, "kb-plano-suave")
    );

  return (
    <div className={`kb-plano-escenario ${acostado ? "overflow-x-auto" : ""}`}>
      <div className="kb-plano-barra">
        <span className="min-w-0">
          <b className="block truncate text-[13px] font-semibold text-ink md:text-sm">{NOMBRE_MODELO[modelo](props.pisos.length)}</b>
          {(props.nombreVehiculo || totalAsientos > 0) && (
            <span className="block truncate text-[11px] text-muted-2 md:text-xs">
              {[props.nombreVehiculo, `${totalAsientos} asientos`].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
        <span className="kb-plano-sentido" aria-label="Sentido de viaje: hacia el frente del vehículo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: acostado ? "rotate(-90deg)" : undefined }}>
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
          Sentido de viaje
        </span>
      </div>
      {esVipPiso && (
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[.08em] text-ink">
          <span className="rounded-full bg-kbyellow px-2.5 py-0.5">Zona VIP · asientos amplios</span>
        </p>
      )}
      <div
        className="relative mx-auto"
        style={{ width: anchoCaja * escala, height: altoCaja * escala, fontSize: Math.max(9, 11 * escala) }}
        role="group"
        aria-label={`Asientos, ${piso.nombre || `Piso ${indicePiso + 1}`}`}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`${-MARGEN} ${-MARGEN} ${anchoCaja} ${altoCaja}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="kbVidrio" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#DDE1E7" />
              <stop offset=".55" stopColor="#F3F4F6" />
              <stop offset="1" stopColor="#E3E6EB" />
            </linearGradient>
            <filter id="kbSombra" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0B0D12" floodOpacity=".14" />
            </filter>
            <pattern id="kbRayado" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#F7F8FA" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#EDEFF2" strokeWidth="2" />
            </pattern>
          </defs>
          <g transform={acostado ? `translate(0 ${W}) rotate(-90)` : undefined}>
            <ArteVehiculo g={g} indicePiso={indicePiso} />
          </g>
        </svg>

        {conductor}
        {g.puerta &&
          (acostado
            ? etiqueta("Puerta", g.der[1] - 50, (g.puerta[0] + g.puerta[1]) / 2, "kb-plano-suave")
            : etiqueta("Puerta", g.der[1] - 18, Math.max(g.puerta[0] - 10, finDelVidrio(modelo, false) + 12), "kb-plano-suave"))}
        {g.escalera && etiqueta(indicePiso === 0 ? "Sube al piso 2" : "Baja al piso 1", ...pieDe(g.escalera), "kb-plano-chip")}
        {g.bano && etiqueta("Baño", ...pieDe(g.bano))}
        {g.equipaje && etiqueta("Equipaje", g.equipaje.x + g.equipaje.w / 2, g.equipaje.y + g.equipaje.h / 2, "kb-plano-suave")}
        {letras}
        {sillas}
      </div>
    </div>
  );
}

/* ================================================================ mapa completo */

function Leyenda({ mostrarVip, hayVip }: { mostrarVip: boolean; hayVip: boolean }) {
  const item = (clase: string, texto: string) => (
    <span className="kb-leyenda-pastilla">
      <span className={`kb-silla is-leyenda ${clase}`} aria-hidden="true">
        <DibujoSilla />
      </span>
      {texto}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-2 md:gap-2 md:text-[13px]">
      {item("", "Libre")}
      {item("is-elegida", "Tu asiento")}
      {item("is-ocupada", "Ocupado")}
      {item("is-mujeres", "Solo mujeres")}
      {(mostrarVip || hayVip) && (
        <span className="kb-leyenda-pastilla">
          <span className="relative inline-block h-3 w-3">
            <span className="kb-silla__vip !right-0 !top-0" />
          </span>
          VIP
        </span>
      )}
    </div>
  );
}

const SILLA_MIN_RATON = 36; // tamaño mínimo de una silla acostada con mouse (px)
const SILLA_MIN_TACTIL = 44; // con pantalla táctil las sillas nunca son más pequeñas
const ESCALA_MAX = 1.25;

export function MapaAsientosBus(props: PropiedadesMapaBus) {
  const total = props.pisos.length;
  const [pisoActivo, setPisoActivo] = useState(0);
  const indice = Math.min(pisoActivo, Math.max(0, total - 1));
  const piso = props.pisos[indice];
  const modelo = modeloDe(props.categoria);

  const contenedor = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [tactil, setTactil] = useState(false);
  useLayoutEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    setTactil(window.matchMedia("(pointer: coarse)").matches);
    const medir = () => setAncho(el.clientWidth);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const posiciones = props.pisos.map((p, i) => ({
    bano: p.bano ?? (props.tieneBano && i === 0 ? "atras" : "ninguno"),
    escalera: p.escalera ?? (total > 1 ? "frente" : "ninguno"),
  }));
  // Los dos pisos miden lo mismo (como un bus real).
  const largoComun = Math.max(
    0,
    ...props.pisos.map((p, i) => largoNatural(p, i, modelo, posiciones[i].bano, posiciones[i].escalera)),
  );
  const g0 = piso ? calcularGeometria(piso, indice, modelo, posiciones[indice].bano, posiciones[indice].escalera, largoComun) : null;

  // Escala: acostado si el vehículo completo cabe a lo ancho con sillas de tamaño suficiente; si no, de pie.
  const disponible = Math.max(0, ancho - 16);
  let acostado = false;
  let escala = 1;
  if (g0) {
    const escalaAcostado = Math.min(ESCALA_MAX, disponible / (g0.largo + 2 * MARGEN));
    const minimo = (tactil ? SILLA_MIN_TACTIL : SILLA_MIN_RATON) / SILLA;
    if (ancho >= 640 && escalaAcostado >= minimo) {
      acostado = true;
      escala = escalaAcostado;
    } else {
      escala = Math.min(1.1, disponible / (g0.ancho + 2 * MARGEN));
    }
  }

  const libresPorPiso = props.pisos.map((p) => {
    let libres = 0;
    for (const f of p.filas)
      for (const celda of f.celdas) {
        const it = interpretarCelda(celda, p);
        if (it) {
          const e = props.estadoPorNumero.get(it.numero);
          if (e === undefined || e === "disponible") libres++;
        }
      }
    return libres;
  });
  // El punto VIP de la leyenda solo hace falta si hay asientos VIP sueltos (un piso VIP completo ya lleva su franja).
  const hayVip = props.pisos.some(
    (p) =>
      p.categoria?.toLowerCase() !== "vip" &&
      p.filas.some((f) => f.celdas.some((c) => interpretarCelda(c, p)?.etiquetas.includes("vip"))),
  );

  return (
    <div ref={contenedor} className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
        {total > 1 ? (
          <div role="tablist" aria-label="Piso del bus" className="kb-tabs w-full md:w-auto">
            {props.pisos.map((p, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === indice}
                onClick={() => setPisoActivo(i)}
                className={`flex min-w-0 flex-1 flex-col items-center !py-2 text-center leading-tight md:flex-none ${i === indice ? "is-active" : ""}`}
              >
                <span>
                  {p.nombre || `Piso ${i + 1}`} · {i === 0 ? "abajo" : "arriba"}
                </span>
                <small className={`text-[11px] font-normal ${i === indice ? "text-ondark" : "text-muted-2"}`}>
                  {libresPorPiso[i]} {libresPorPiso[i] === 1 ? "libre" : "libres"}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <Leyenda mostrarVip={!!props.mostrarVip} hayVip={hayVip} />
      </div>

      {piso && ancho > 0 && (
        <Piso
          key={indice}
          piso={piso}
          indicePiso={indice}
          acostado={acostado}
          escala={escala}
          largoMinimo={largoComun}
          posBano={posiciones[indice].bano}
          posEscalera={posiciones[indice].escalera}
          modelo={modelo}
          props={props}
        />
      )}
    </div>
  );
}
