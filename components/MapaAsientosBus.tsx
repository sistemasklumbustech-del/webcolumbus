"use client";

import { useState } from "react";
import { interpretarCelda, type Celda, type PisoDistribucionAsientos } from "@/lib/api";

/**
 * Mapa de asientos (rediseño final, oct-2026): sillas dibujadas en SVG, un piso a
 * la vez con pestañas. En celular el bus va vertical (frente arriba); en PC va
 * acostado con el frente a la izquierda. Se eliminó la forma redonda del bus.
 * Mismo contrato de siempre: aquí solo se dibuja; qué asientos están libres,
 * ocupados o elegidos lo decide quien lo usa (pasajero en línea, vendedor en
 * ventanilla o el constructor de buses de la cooperativa).
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

function IconoVolante({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 14.5V21M9.6 11.2L3.5 9.5M14.4 11.2l6.1-1.7" />
    </svg>
  );
}

/** Silla del diseño: respaldo, asiento y dos brazos (viewBox 40×40). */
function Silla({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect className="kb-seat__shape" x="7" y="3" width="26" height="11" rx="4" />
      <rect className="kb-seat__shape" x="9" y="15" width="22" height="20" rx="6" />
      <rect className="kb-seat__shape" x="3" y="16" width="5" height="15" rx="2.5" />
      <rect className="kb-seat__shape" x="32" y="16" width="5" height="15" rx="2.5" />
    </svg>
  );
}

function SillaLeyenda({ clase, color }: { clase: string; color: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={`h-[18px] w-[18px] md:h-5 md:w-5 ${clase}`} style={{ color }}>
      <rect className="kb-seat__shape" x="7" y="3" width="26" height="11" rx="4" />
      <rect className="kb-seat__shape" x="9" y="15" width="22" height="20" rx="6" />
      <rect className="kb-seat__shape" x="3" y="16" width="5" height="15" rx="2.5" />
      <rect className="kb-seat__shape" x="32" y="16" width="5" height="15" rx="2.5" />
    </svg>
  );
}

function BloqueServicio({ icono, texto }: { icono?: React.ReactNode; texto: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-2 md:flex-col md:text-center md:text-[11px] md:text-muted-3">
      {icono}
      {texto}
    </span>
  );
}

function AsientoBus({
  numero,
  posicion,
  etiquetas,
  estado,
  seleccionado,
  onAlternar,
  fila,
  columna,
  mostrarVip,
}: {
  numero: string;
  posicion: Posicion;
  etiquetas: string[];
  estado: string | undefined;
  seleccionado: boolean;
  onAlternar: (numero: string) => void;
  fila: number;
  columna: number;
  mostrarVip: boolean;
}) {
  const noDisponible = estado !== undefined && estado !== "disponible";
  const textoEstado = noDisponible
    ? estado === "pendiente_confirmacion_pago"
      ? "reservado (pago pendiente)"
      : "ocupado"
    : seleccionado
      ? "seleccionado"
      : "disponible";
  const esMujeres = etiquetas.includes("mujeres");
  const esVip = etiquetas.includes("vip");
  const notasEtiquetas = [esVip ? "VIP" : null, esMujeres ? "exclusivo mujeres" : null].filter(Boolean) as string[];
  const descripcion = [`Asiento ${numero}`, ETIQUETA_POSICION[posicion], ...notasEtiquetas].join(" · ");
  const clases = [
    "kb-seat",
    noDisponible ? "is-occupied" : seleccionado ? "is-selected" : esMujeres ? "is-women" : "",
    "!h-[56px] !w-[52px] md:!h-[50px] md:!w-12",
  ].join(" ");

  return (
    <div
      className="group relative flex justify-center [grid-column:var(--c)] [grid-row:var(--r)] md:[grid-column:var(--r)] md:[grid-row:var(--c)]"
      style={{ "--r": fila, "--c": columna } as React.CSSProperties}
    >
      <button
        type="button"
        disabled={noDisponible}
        onClick={() => onAlternar(numero)}
        aria-label={`${descripcion}, ${textoEstado}`}
        aria-pressed={seleccionado}
        className={clases}
      >
        <Silla className="h-[46px] w-[46px] md:absolute md:left-0.5 md:top-[3px] md:h-11 md:w-11 md:-rotate-90" />
        <span className="kb-seat__label md:!inset-0 md:!top-0 md:grid md:place-items-center md:pl-[11px] md:!text-[10px]">
          {numero}
        </span>
      </button>
      {mostrarVip && esVip && !noDisponible && (
        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-kbyellow ring-2 ring-ink" aria-hidden="true" />
      )}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-float transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {descripcion}
        {noDisponible ? ` (${textoEstado})` : ""}
      </span>
    </div>
  );
}

function PisoBus({
  piso,
  indicePiso,
  totalPisos,
  props,
}: {
  piso: PisoDistribucionAsientos;
  indicePiso: number;
  totalPisos: number;
  props: PropiedadesMapaBus;
}) {
  const esPrimerPiso = indicePiso === 0;
  const tieneEscalera = totalPisos > 1;
  // Baño: al fondo del primer piso si el vehículo lo declara (o si el piso lo indica explícitamente).
  const posBano = piso.bano ?? (props.tieneBano && esPrimerPiso ? "atras" : "ninguno");
  const posEscalera = piso.escalera ?? (tieneEscalera ? "frente" : "ninguno");
  const etiquetaPiso = piso.nombre || `Piso ${indicePiso + 1}`;
  const textoEscalera = esPrimerPiso ? "Escalera al piso 2" : "Escalera al piso 1";

  const numColumnas = Math.max(0, ...piso.filas.map((f) => f.celdas.length));
  const esPasillo = Array.from({ length: numColumnas }, (_, j) => piso.filas.every((f) => f.celdas[j] == null));
  const letras: string[] = [];
  let letra = 0;
  esPasillo.forEach((p) => letras.push(p ? "" : String.fromCharCode(65 + letra++)));

  // Plantillas de la cuadrícula: en celular las filas del bus van hacia abajo; en PC
  // (bus acostado) cada fila pasa a ser una columna y las posiciones A-B-pasillo-C-D van de arriba a abajo.
  const columnasCelular = esPasillo.map((p) => (p ? "26px" : "minmax(0,1fr)")).join(" ");
  const filasPc = esPasillo.map(() => "auto").join(" ");
  const estiloCuadricula = {
    "--cols-m": columnasCelular,
    "--rows-d": filasPc,
    "--cols-d": `repeat(${piso.filas.length}, 48px)`,
  } as React.CSSProperties;

  return (
    <div className="md:overflow-x-auto md:rounded-[26px] md:border-[1.5px] md:border-line md:bg-kbbg md:px-4 md:pb-[18px] md:pt-11">
    <div className="flex flex-col gap-3 md:mx-auto md:w-max md:flex-row md:items-stretch md:gap-0">
      {/* Frente del bus: conductor, puerta, escalera. */}
      <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-dashed border-line pb-3.5 md:w-[62px] md:shrink-0 md:flex-col md:justify-between md:border-b-0 md:border-r-[1.5px] md:border-line-2 md:py-1 md:pb-1 md:pl-0 md:pr-3.5 md:mr-4">
        <span className="flex items-center gap-2 md:flex-col">
          {esPrimerPiso ? (
            <>
              <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-kbbg text-[#555B69] md:h-11 md:w-11 md:rounded-[14px] md:bg-white">
                <IconoVolante className="h-5 w-5" />
              </span>
              <BloqueServicio texto="Conductor" />
            </>
          ) : (
            <BloqueServicio texto="Frente" />
          )}
        </span>
        <span className="flex items-center gap-2 md:flex-col">
          {esPrimerPiso && <BloqueServicio texto="Puerta" />}
          {posEscalera === "frente" && <BloqueServicio texto={textoEscalera} />}
          {posBano === "frente" && <BloqueServicio texto="Baño" />}
        </span>
      </div>

      {/* Asientos. */}
      <div className="min-w-0 md:flex md:shrink-0 md:items-center" role="group" aria-label={`Asientos, ${etiquetaPiso}`}>
        <div>
          <div className="mb-1.5 grid gap-x-2 text-center text-[11px] font-semibold text-muted-3 md:hidden" style={{ gridTemplateColumns: columnasCelular }} aria-hidden="true">
            {letras.map((l, j) => (
              <span key={j}>{l}</span>
            ))}
          </div>
          <div
            className="grid items-center justify-items-center gap-x-2 gap-y-1.5 [grid-template-columns:var(--cols-m)] md:gap-x-1.5 md:gap-y-1 md:[grid-template-columns:var(--cols-d)] md:[grid-template-rows:var(--rows-d)]"
            style={estiloCuadricula}
          >
            {piso.filas.map((fila, i) =>
              Array.from({ length: numColumnas }, (_, j) => {
                if (esPasillo[j]) {
                  return (
                    <span
                      key={`${i}-${j}`}
                      className="py-1 text-[11px] font-medium text-muted-3 [grid-column:var(--c)] [grid-row:var(--r)] md:[grid-column:var(--r)] md:[grid-row:var(--c)]"
                      style={{ "--r": i + 1, "--c": j + 1 } as React.CSSProperties}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                  );
                }
                const interpretada = interpretarCelda(fila.celdas[j] ?? null, piso);
                if (interpretada === null) return null;
                return (
                  <AsientoBus
                    key={interpretada.numero}
                    numero={interpretada.numero}
                    posicion={posicionDelAsiento(fila.celdas, j)}
                    etiquetas={interpretada.etiquetas}
                    estado={props.estadoPorNumero.get(interpretada.numero)}
                    seleccionado={props.seleccionados.includes(interpretada.numero)}
                    onAlternar={props.onAlternar}
                    fila={i + 1}
                    columna={j + 1}
                    mostrarVip={!!props.mostrarVip}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* Fondo: baño / escalera (si van atrás) y la parte trasera. */}
      <div className="flex items-center justify-between gap-3 border-t-[1.5px] border-dashed border-line pt-3 text-xs text-muted-3 md:ml-3 md:min-w-[34px] md:shrink-0 md:flex-col md:justify-center md:gap-4 md:border-l-[1.5px] md:border-t-0 md:border-line-2 md:py-0 md:pl-2.5 md:pt-0">
        <span className="flex items-center gap-2 md:flex-col">
          {posBano === "atras" && <BloqueServicio texto="Baño" />}
          {posEscalera === "atras" && <BloqueServicio texto={textoEscalera} />}
        </span>
        <span className="md:[writing-mode:vertical-rl] md:rotate-180 md:text-[11px]">Parte trasera</span>
      </div>
    </div>
    </div>
  );
}

export function MapaAsientosBus(props: PropiedadesMapaBus) {
  const total = props.pisos.length;
  const [pisoActivo, setPisoActivo] = useState(0);
  const indice = Math.min(pisoActivo, Math.max(0, total - 1));
  const piso = props.pisos[indice];

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
        {total > 1 ? (
          <div role="tablist" aria-label="Piso del bus" className="kb-tabs w-full md:w-auto">
            {props.pisos.map((p, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === indice}
                onClick={() => setPisoActivo(i)}
                className={`flex-1 whitespace-nowrap md:flex-none ${i === indice ? "is-active" : ""}`}
              >
                {p.nombre || `Piso ${i + 1}`} · {i === 0 ? "abajo" : "arriba"}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-[11px] text-muted-2 md:justify-start md:gap-x-[22px] md:text-[13px]">
          <span className="flex items-center gap-1.5">
            <SillaLeyenda clase="" color="#D6D9E0" />
            Libre
          </span>
          <span className="flex items-center gap-1.5">
            <SillaLeyenda clase="[&_.kb-seat__shape]:fill-kbyellow" color="#0B0D12" />
            Tu asiento
          </span>
          <span className="flex items-center gap-1.5">
            <SillaLeyenda clase="[&_.kb-seat__shape]:fill-occupied" color="#DDE0E6" />
            Ocupado
          </span>
          <span className="flex items-center gap-1.5">
            <SillaLeyenda clase="[&_.kb-seat__shape]:fill-women-bg" color="#B8336A" />
            Solo mujeres
          </span>
          {props.mostrarVip && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-kbyellow ring-2 ring-ink" aria-hidden="true" />
              VIP
            </span>
          )}
        </div>
      </div>

      {piso && <PisoBus key={indice} piso={piso} indicePiso={indice} totalPisos={total} props={props} />}

      <p className="text-[13px] text-muted-2">
        Pasa el cursor (o toca) un asiento para ver si es de ventana o de pasillo.
      </p>
    </div>
  );
}
