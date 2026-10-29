"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { interpretarCelda, type Celda, type PisoDistribucionAsientos } from "@/lib/api";

/**
 * Mapa de asientos -- plano del bus (oct-2026, elegido por Adrián): el vehículo visto desde arriba,
 * como un plano real: paredes de doble línea, frente curvo con parabrisas y tablero, espejos, puesto
 * del conductor con su volante, entrada con escalones, pared de la cabina, escalera y baño (WC) en su
 * lugar, y el pasillo con el número de fila. Las sillas son las mismas del diseño oficial.
 *
 * - Un piso a la vez con pestañas (cada una dice cuántos asientos libres tiene).
 * - Vertical (frente arriba) en celular; acostado (frente a la izquierda) cuando el bus completo cabe
 *   a lo ancho. Si no cabe (ej. 15 filas en una pantalla de 1024 px), se queda vertical en vez de
 *   obligar a desplazarse de lado.
 * - La forma cambia un poco según el vehículo (bus, buseta, van, auto).
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
  /** Categoría del vehículo (bus, buseta, van, auto): solo cambia un poco la forma de la carrocería. */
  categoria?: string | null;
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

/* ------------------------------------------------------------------ dibujos */

/** Silla del diseño (la misma de hoy): respaldo, asiento y dos brazos. viewBox 40×40. */
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

/** Espejo retrovisor con su brazo, saliendo de la esquina delantera izquierda (el derecho se refleja). */
function Espejo({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 44" aria-hidden="true" className={`kb-espejo ${className}`} style={style}>
      <path d="M22 34c-6 0-12-4-14-12" fill="none" stroke="#1A1D24" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="2" y="4" width="10" height="20" rx="5" fill="#fff" stroke="#1A1D24" strokeWidth="2.2" />
    </svg>
  );
}

function IconoVolante({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 14.5V21M9.6 11.2L3.5 9.5M14.4 11.2l6.1-1.7" />
    </svg>
  );
}

/* ------------------------------------------------------------------ asiento */

function Asiento({
  numero,
  posicion,
  etiquetas,
  estado,
  seleccionado,
  onAlternar,
  r,
  c,
  acostado,
  pisoVip,
}: {
  numero: string;
  posicion: Posicion;
  etiquetas: string[];
  estado: string | undefined;
  seleccionado: boolean;
  onAlternar: (numero: string) => void;
  r: number;
  c: number;
  acostado: boolean;
  /** Todo el piso es VIP (ya lo dice la franja "Zona VIP"): no se marca cada asiento. */
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
    <div
      className="group relative flex items-center justify-center px-[3px] py-[3px]"
      style={{ gridRow: acostado ? c : r, gridColumn: acostado ? r : c }}
    >
      <button
        type="button"
        disabled={noDisponible}
        onClick={() => onAlternar(numero)}
        aria-label={`${descripcion}, ${textoEstado}`}
        aria-pressed={seleccionado}
        className={`kb-silla ${estadoClase} ${acostado ? "is-acostada" : ""}`}
      >
        <DibujoSilla />
        <span className="kb-silla__numero">{numero}</span>
        {esVip && !pisoVip && !noDisponible && !seleccionado && (
          <span className="kb-silla__vip" aria-hidden="true" />
        )}
      </button>
      <span role="tooltip" className="kb-silla__tip">
        {descripcion}
        {noDisponible ? ` (${textoEstado})` : ""}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ piso */

const ASIENTO_MIN = 46; // px por fila (mínimo) para acostar el bus
const ASIENTO_MAX = 60; // px por fila (máximo) acostado
const ANCHO_EXTRA_ACOSTADO = 200; // cabina + pared + letras + bordes (la escalera y el baño cuentan como filas)

function Piso({
  piso,
  indicePiso,
  totalPisos,
  acostado,
  tamano,
  props,
}: {
  piso: PisoDistribucionAsientos;
  indicePiso: number;
  totalPisos: number;
  acostado: boolean;
  /** Ancho de cada fila cuando el bus va acostado (px). */
  tamano: number;
  props: PropiedadesMapaBus;
}) {
  const esPrimerPiso = indicePiso === 0;
  const posBano = piso.bano ?? (props.tieneBano && esPrimerPiso ? "atras" : "ninguno");
  const posEscalera = piso.escalera ?? (totalPisos > 1 ? "frente" : "ninguno");
  const textoEscalera = esPrimerPiso ? "Sube al piso 2" : "Baja al piso 1";
  const categoria = (props.categoria ?? "bus").toLowerCase();
  const esVipPiso = piso.categoria?.toLowerCase() === "vip";

  const numColumnas = Math.max(1, ...piso.filas.map((f) => f.celdas.length));
  const esPasillo = Array.from({ length: numColumnas }, (_, j) => piso.filas.every((f) => f.celdas[j] == null));
  const letras: string[] = [];
  let letra = 0;
  esPasillo.forEach((p) => letras.push(p ? "" : String.fromCharCode(65 + letra++)));

  // Grupos de asientos a cada lado del pasillo (para ubicar conductor, entrada, baño y escalera).
  const primerPasillo = esPasillo.indexOf(true);
  const ultimoPasillo = esPasillo.lastIndexOf(true);
  const hayPasillo = primerPasillo >= 0;
  const izq: [number, number] = hayPasillo ? [2, primerPasillo + 2] : [2, numColumnas + 2];
  const der: [number, number] = hayPasillo ? [ultimoPasillo + 3, numColumnas + 2] : [2, numColumnas + 2];
  const todo: [number, number] = [1, numColumnas + 3];

  // Filas de la cuadrícula (en vertical; acostado se intercambian con las columnas):
  // 1 cabina · 2 pared · [3 escalera/baño adelante] · letras · asientos · [baño/escalera atrás].
  const hayAdelante = posEscalera === "frente" || posBano === "frente";
  const filaCabina = 1;
  const filaPared = 2;
  const filaAdelante = 3;
  const filaLetras = hayAdelante ? 4 : 3;
  const filaInicio = filaLetras + 1;
  const hayAtras = posBano === "atras" || posEscalera === "atras";
  const filaAtras = filaInicio + piso.filas.length;

  const alto = acostado ? tamano : 58;
  const pistasFilas = [
    esPrimerPiso ? (acostado ? "96px" : "104px") : acostado ? "64px" : "60px",
    esPrimerPiso ? "14px" : "4px",
    ...(hayAdelante ? [`${alto + 8}px`] : []),
    acostado ? "22px" : "20px",
    ...piso.filas.map(() => (acostado ? `${tamano}px` : "auto")),
    ...(hayAtras ? [`${alto + 14}px`] : []),
  ];
  const pistaCeldas = esPasillo.map((p) => (p ? (acostado ? "30px" : "minmax(26px,34px)") : acostado ? `${tamano + 2}px` : "minmax(0,64px)"));
  const pistasColumnas = ["12px", ...pistaCeldas, "12px"];
  const estilo: React.CSSProperties = acostado
    ? ({ gridTemplateColumns: pistasFilas.join(" "), gridTemplateRows: pistasColumnas.join(" "), "--tam": `${tamano - 4}px` } as React.CSSProperties)
    : { gridTemplateColumns: pistasColumnas.join(" "), gridTemplateRows: pistasFilas.join(" ") };

  /** Ubica un elemento: fila (a lo largo del bus) y columnas [desde, hasta) (a lo ancho). */
  const ubicar = (fila: number, [desde, hasta]: [number, number]): React.CSSProperties =>
    acostado ? { gridColumn: fila, gridRow: `${desde} / ${hasta}` } : { gridRow: fila, gridColumn: `${desde} / ${hasta}` };

  // Forma según el vehículo: el frente más redondeado en van y auto.
  const radioFrente = categoria === "auto" ? 72 : categoria === "van" ? 56 : categoria === "buseta" ? 44 : 34;
  const radioAtras = categoria === "auto" ? 44 : 14;
  const formaCarroceria: React.CSSProperties = acostado
    ? { borderRadius: `${radioFrente}px ${radioAtras}px ${radioAtras}px ${radioFrente}px` }
    : { borderRadius: `${radioFrente}px ${radioFrente}px ${radioAtras}px ${radioAtras}px` };

  const elementos: React.ReactNode[] = [];

  // Cabina: conductor con su volante (izquierda) y la entrada con escalones (derecha). En el piso 2, la vista panorámica.
  if (esPrimerPiso) {
    elementos.push(
      <div key="conductor" className={`kb-plano-conductor ${acostado ? "is-acostado" : ""}`} style={ubicar(filaCabina, izq)}>
        <span className="kb-plano-volante" aria-hidden="true">
          <IconoVolante className="h-full w-full" />
        </span>
        <span className={`kb-silla is-conductor ${acostado ? "is-acostada" : ""}`} aria-hidden="true" style={acostado ? ({ "--tam": "40px" } as React.CSSProperties) : undefined}>
          <DibujoSilla />
        </span>
        <span className="kb-plano-texto">Conductor</span>
      </div>,
      <div key="entrada" className={`kb-plano-entrada ${acostado ? "is-acostado" : ""}`} style={ubicar(filaCabina, der)}>
        <span className="kb-plano-escalones" aria-hidden="true" />
        <span className="kb-plano-texto">Entrada</span>
      </div>,
    );
  } else {
    elementos.push(
      <div key="panoramica" className="kb-plano-panoramica" style={ubicar(filaCabina, [2, numColumnas + 2])}>
        <span className="kb-plano-texto">Frente · vista panorámica</span>
      </div>,
    );
  }

  // Pared que separa la cabina (con el paso libre en el pasillo). El piso de arriba no tiene cabina.
  if (!esPrimerPiso) {
    // sin pared
  } else if (hayPasillo) {
    elementos.push(
      <span key="pared-i" aria-hidden="true" className={`kb-plano-pared ${acostado ? "is-acostado" : ""}`} style={ubicar(filaPared, [1, izq[1]])} />,
      <span key="pared-d" aria-hidden="true" className={`kb-plano-pared ${acostado ? "is-acostado" : ""}`} style={ubicar(filaPared, [der[0], numColumnas + 3])} />,
    );
  } else {
    elementos.push(<span key="pared" aria-hidden="true" className={`kb-plano-pared ${acostado ? "is-acostado" : ""}`} style={ubicar(filaPared, todo)} />);
  }

  const escalera = (fila: number, lado: [number, number]) => (
    <div key="escalera" className={`kb-plano-escalera ${acostado ? "is-acostado" : ""}`} style={ubicar(fila, lado)}>
      <span className="kb-plano-texto">{textoEscalera}</span>
    </div>
  );
  const bano = (fila: number, lado: [number, number]) => (
    <div key="bano" className="kb-plano-bano" style={ubicar(fila, lado)}>
      <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="11" y="3" width="18" height="8" rx="2.5" />
        <path d="M12 11h16v6a8 9 0 0 1-16 0z" />
        <ellipse cx="20" cy="27" rx="7.5" ry="9" />
        <ellipse cx="20" cy="27.5" rx="4" ry="5.5" />
      </svg>
      <span className="text-[13px] font-bold tracking-wide">WC</span>
    </div>
  );
  if (posEscalera === "frente") elementos.push(escalera(filaAdelante, der));
  if (posBano === "frente") elementos.push(bano(filaAdelante, izq));
  if (posBano === "atras") elementos.push(bano(filaAtras, der));
  if (posEscalera === "atras") elementos.push(escalera(filaAtras, posBano === "atras" && hayPasillo ? izq : der));

  // Letras de las columnas.
  letras.forEach((l, j) => {
    if (l)
      elementos.push(
        <span key={`l${j}`} aria-hidden="true" className="grid place-items-center text-[11px] font-semibold text-muted-3" style={ubicar(filaLetras, [j + 2, j + 3])}>
          {l}
        </span>,
      );
  });

  // Asientos, pasillo y ventanas.
  piso.filas.forEach((fila, i) => {
    const r = filaInicio + i;
    for (let j = 0; j < numColumnas; j++) {
      const c = j + 2;
      if (esPasillo[j]) {
        elementos.push(
          <span key={`p${i}-${j}`} aria-hidden="true" className="kb-pasillo" style={ubicar(r, [c, c + 1])}>
            {numeroDeFila(fila.celdas, piso, i)}
          </span>,
        );
        continue;
      }
      const interpretada = interpretarCelda(fila.celdas[j] ?? null, piso);
      if (interpretada === null) continue;
      elementos.push(
        <Asiento
          key={interpretada.numero}
          numero={interpretada.numero}
          posicion={posicionDelAsiento(fila.celdas, j)}
          etiquetas={interpretada.etiquetas}
          estado={props.estadoPorNumero.get(interpretada.numero)}
          seleccionado={props.seleccionados.includes(interpretada.numero)}
          onAlternar={props.onAlternar}
          r={r}
          c={c}
          acostado={acostado}
          pisoVip={esVipPiso}
        />,
      );
    }
  });

  return (
    <div className={`rounded-[24px] bg-kbbg ${acostado ? "overflow-x-auto px-2 py-5" : "px-2 py-6"}`}>
      {esVipPiso && (
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[.08em] text-ink">
          <span className="rounded-full bg-kbyellow px-2.5 py-0.5">Zona VIP · asientos amplios</span>
        </p>
      )}
      <div className={`relative mx-auto ${acostado ? "w-max px-3 py-3" : "max-w-[400px] px-3 pt-3"}`}>
        {/* Espejos retrovisores con su brazo (piso de abajo). */}
        {esPrimerPiso &&
          (acostado ? (
            <>
              <Espejo className="left-[26px] -top-[6px] h-[44px] w-6" style={{ transform: "rotate(-90deg) scaleX(-1)" }} />
              <Espejo className="-bottom-[6px] left-[26px] h-[44px] w-6" style={{ transform: "rotate(-90deg)" }} />
            </>
          ) : (
            <>
              <Espejo className="-left-[8px] top-[18px] h-[44px] w-6" />
              <Espejo className="-right-[8px] top-[18px] h-[44px] w-6" style={{ transform: "scaleX(-1)" }} />
            </>
          ))}
        <div className={`kb-carroceria ${acostado ? "pl-5 pr-3 py-2" : "px-2 pb-3 pt-5"}`} style={formaCarroceria}>
          {/* Parabrisas con el tablero curvo (piso de abajo) o ventanal panorámico (piso de arriba). */}
          <span
            aria-hidden="true"
            className={`kb-parabrisas ${acostado ? "is-acostado inset-y-[7px] left-[7px] w-[24px]" : "inset-x-[7px] top-[7px] h-[24px]"}`}
            style={
              acostado
                ? { borderRadius: `${radioFrente - 6}px 50% 50% ${radioFrente - 6}px / ${radioFrente - 6}px 14px 14px ${radioFrente - 6}px` }
                : { borderRadius: `${radioFrente - 6}px ${radioFrente - 6}px 50% 50% / ${radioFrente - 6}px ${radioFrente - 6}px 14px 14px` }
            }
          />
          {esPrimerPiso && (
            <span aria-hidden="true" className={`kb-puerta-hueco ${acostado ? "-bottom-[4px] left-[38px] h-[12px] w-[60px]" : "-right-[4px] top-[44px] h-[60px] w-[12px]"}`} />
          )}

          <div className="grid justify-center" style={estilo} role="group" aria-label={`Asientos, ${piso.nombre || `Piso ${indicePiso + 1}`}`}>
            {elementos}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ mapa */

function Leyenda({ mostrarVip, hayVip }: { mostrarVip: boolean; hayVip: boolean }) {
  const item = (clase: string, texto: string, ocupada = false) => (
    <span className="flex items-center gap-1.5">
      <span className={`kb-silla is-leyenda ${clase}`} aria-hidden="true">
        <DibujoSilla ocupada={ocupada} />
      </span>
      {texto}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted-2 md:text-[13px]">
      {item("", "Libre")}
      {item("is-elegida", "Tu asiento")}
      {item("is-ocupada", "Ocupado", true)}
      {item("is-mujeres", "Solo mujeres")}
      {(mostrarVip || hayVip) && (
        <span className="flex items-center gap-1.5">
          <span className="relative inline-block h-3 w-3">
            <span className="kb-silla__vip !right-0 !top-0" />
          </span>
          VIP
        </span>
      )}
    </div>
  );
}

export function MapaAsientosBus(props: PropiedadesMapaBus) {
  const total = props.pisos.length;
  const [pisoActivo, setPisoActivo] = useState(0);
  const indice = Math.min(pisoActivo, Math.max(0, total - 1));
  const piso = props.pisos[indice];

  // ¿Cabe el bus acostado? Se mide el ancho disponible; si no cabe, va vertical.
  const contenedor = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const filasMax = Math.max(1, ...props.pisos.map((p) => p.filas.length));
  const tamano = Math.min(ASIENTO_MAX, Math.floor((ancho - ANCHO_EXTRA_ACOSTADO) / (filasMax + 2)));
  const acostado = ancho >= 700 && tamano >= ASIENTO_MIN;

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

      {piso && <Piso key={indice} piso={piso} indicePiso={indice} totalPisos={total} acostado={acostado} tamano={tamano} props={props} />}
    </div>
  );
}
