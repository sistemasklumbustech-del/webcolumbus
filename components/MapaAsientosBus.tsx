"use client";

import { interpretarCelda, type Celda, type PisoDistribucionAsientos } from "@/lib/api";

/**
 * Mapa de asientos con forma de bus (24-sep-2026): vista desde arriba con el
 * frente hacia arriba -- parabrisas, conductor a la izquierda, puerta,
 * ruedas, la parte trasera con el baño (si el bus lo tiene) y, en buses de
 * dos pisos, la escalera y cada piso lado a lado. Al pasar el mouse (o
 * tocar/enfocar) un asiento se ve si es ventana, pasillo o centro.
 *
 * Solo dibuja: qué asientos están libres, ocupados o elegidos lo decide
 * quien lo usa (pasajero en línea o vendedor en ventanilla).
 */
export interface PropiedadesMapaBus {
  pisos: PisoDistribucionAsientos[];
  /** numero de asiento -> estado real (ocupado, bloqueado_temporal, pendiente_confirmacion_pago). Si no aparece, está libre. */
  estadoPorNumero: Map<string, string>;
  seleccionados: string[];
  onAlternar: (numero: string) => void;
  /** El tipo de vehículo declara baño a bordo (amenidad "bano_a_bordo"). */
  tieneBano: boolean;
}

type Posicion = "ventana" | "pasillo" | "centro";

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

function IconoVolante({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M3.5 10.5h5.2M15.3 10.5h5.2M12 14.2V21" />
    </svg>
  );
}

function IconoEscalera({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4v-4h4v-4h4V8h4" />
      <path d="M4 20V4M20 8V4" opacity="0.35" />
    </svg>
  );
}

function IconoBano({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="5" r="2" />
      <path d="M6 8h4a1 1 0 0 1 1 1v6h-1.5V21h-3v-6H5V9a1 1 0 0 1 1-1z" />
      <circle cx="17" cy="5" r="2" />
      <path d="M15.2 8h3.6a1 1 0 0 1 1 1.2L18.7 15H17v6h-2v-6h-1.6l1.1-5.8" opacity="0.85" />
    </svg>
  );
}

function BloqueServicio({
  icono,
  texto,
  className = "",
}: {
  icono: React.ReactNode;
  texto: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border border-dashed border-brand-dark/25 bg-brand-light/50 px-2.5 py-1.5 text-[11px] font-semibold text-brand-dark/70 ${className}`}
    >
      {icono}
      {texto}
    </div>
  );
}

function AsientoBus({
  numero,
  posicion,
  etiquetas,
  estado,
  seleccionado,
  onAlternar,
}: {
  numero: string;
  posicion: Posicion;
  etiquetas: string[];
  estado: string | undefined;
  seleccionado: boolean;
  onAlternar: (numero: string) => void;
}) {
  const noDisponible = estado !== undefined && estado !== "disponible";
  const textoEstado = noDisponible
    ? estado === "pendiente_confirmacion_pago"
      ? "reservado (pago pendiente)"
      : "ocupado"
    : seleccionado
      ? "seleccionado"
      : "disponible";
  const notasEtiquetas = [etiquetas.includes("vip") ? "VIP" : null, etiquetas.includes("mujeres") ? "exclusivo mujeres" : null].filter(
    Boolean,
  ) as string[];
  const descripcion = [`Asiento ${numero}`, ETIQUETA_POSICION[posicion], ...notasEtiquetas].join(" · ");

  return (
    <div className="group relative">
      <button
        type="button"
        disabled={noDisponible}
        onClick={() => onAlternar(numero)}
        aria-label={`${descripcion}, ${textoEstado}`}
        aria-pressed={seleccionado}
        className={`flex h-9 w-9 items-center justify-center rounded-t-xl rounded-b-md border-b-[5px] text-[11px] font-bold transition ${
          noDisponible
            ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400"
            : seleccionado
              ? "border-brand-dark bg-brand-amber text-brand-dark ring-2 ring-brand-dark"
              : "border-brand-medium/40 bg-brand-light text-brand-dark hover:border-brand-cobalto hover:bg-brand-cobalto hover:text-white focus-visible:border-brand-cobalto focus-visible:bg-brand-cobalto focus-visible:text-white"
        }`}
      >
        {numero}
      </button>
      {!noDisponible && etiquetas.length > 0 && (
        <span className="absolute -right-1 -top-1 flex gap-0.5" aria-hidden="true">
          {etiquetas.includes("vip") && <span className="h-2.5 w-2.5 rounded-full bg-amber-500 ring-1 ring-white" />}
          {etiquetas.includes("mujeres") && <span className="h-2.5 w-2.5 rounded-full bg-pink-500 ring-1 ring-white" />}
        </span>
      )}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-9 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-brand-dark px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
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

  return (
    <div className="mx-auto w-fit max-w-full">
      {totalPisos > 1 && (
        <div className="mb-2 text-center">
          <h2 className="font-display text-sm font-bold text-brand-dark">{etiquetaPiso}</h2>
          <p className="text-[11px] text-brand-dark/50">{esPrimerPiso ? "Piso de abajo" : "Piso de arriba"}</p>
        </div>
      )}
      <div className="relative">
        {/* Ruedas: sobresalen a los costados, como en una vista de planta. */}
        {[22, 72].map((porcentaje) => (
          <span key={porcentaje}>
            <span
              className="absolute -left-2 h-11 w-2.5 rounded-sm bg-brand-dark/80"
              style={{ top: `${porcentaje}%` }}
              aria-hidden="true"
            />
            <span
              className="absolute -right-2 h-11 w-2.5 rounded-sm bg-brand-dark/80"
              style={{ top: `${porcentaje}%` }}
              aria-hidden="true"
            />
          </span>
        ))}

        <div className="overflow-hidden rounded-t-[46px] rounded-b-2xl border-2 border-brand-dark/30 bg-white shadow-sm">
          {/* Frente: parabrisas + conductor (izquierda) + puerta (derecha). */}
          <div className="bg-gradient-to-b from-sky-100 to-sky-50 px-5 pb-2 pt-4">
            <div className="mx-auto h-1.5 w-2/3 rounded-full bg-sky-200/80" aria-hidden="true" />
            <div className="mt-3 flex items-center justify-between gap-3">
              {esPrimerPiso ? (
                <BloqueServicio icono={<IconoVolante className="h-4 w-4" />} texto="Conductor" />
              ) : (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark/40">Frente</span>
              )}
              {esPrimerPiso && (
                <span className="rounded-md bg-brand-dark/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-dark/60">
                  Puerta
                </span>
              )}
            </div>
            {posEscalera === "frente" && (
              <div className="mt-2 flex justify-end">
                <BloqueServicio
                  icono={<IconoEscalera className="h-4 w-4" />}
                  texto={esPrimerPiso ? "Escalera al piso 2" : "Escalera al piso 1"}
                />
              </div>
            )}
            {posBano === "frente" && (
              <div className="mt-2 flex justify-start">
                <BloqueServicio icono={<IconoBano className="h-4 w-4" />} texto="Baño" />
              </div>
            )}
          </div>

          {/* Asientos. */}
          <div className="space-y-2 px-4 py-3" role="group" aria-label={`Asientos, ${etiquetaPiso}`}>
            {piso.filas.map((fila, i) => (
              <div key={i} className="flex items-center justify-center gap-1.5">
                {fila.celdas.map((celda, j) => {
                  const interpretada = interpretarCelda(celda, piso);
                  if (interpretada === null) return <span key={j} className="w-5" aria-hidden="true" />;
                  return (
                    <AsientoBus
                      key={interpretada.numero}
                      numero={interpretada.numero}
                      posicion={posicionDelAsiento(fila.celdas, j)}
                      etiquetas={interpretada.etiquetas}
                      estado={props.estadoPorNumero.get(interpretada.numero)}
                      seleccionado={props.seleccionados.includes(interpretada.numero)}
                      onAlternar={props.onAlternar}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Fondo: escalera / baño (si van atrás) y la parte trasera. */}
          {(posBano === "atras" || posEscalera === "atras") && (
            <div className="flex items-center justify-between gap-2 px-4 pb-2">
              {posBano === "atras" ? <BloqueServicio icono={<IconoBano className="h-4 w-4" />} texto="Baño" /> : <span />}
              {posEscalera === "atras" && (
                <BloqueServicio
                  icono={<IconoEscalera className="h-4 w-4" />}
                  texto={esPrimerPiso ? "Escalera al piso 2" : "Escalera al piso 1"}
                />
              )}
            </div>
          )}
          <div className="border-t-2 border-brand-dark/10 bg-brand-light/40 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-brand-dark/40">
            Parte trasera
          </div>
        </div>
      </div>
    </div>
  );
}

export function MapaAsientosBus(props: PropiedadesMapaBus) {
  const total = props.pisos.length;
  return (
    <div>
      <div
        className={`grid gap-8 ${total > 1 ? "md:grid-cols-2 md:gap-6" : ""}`}
      >
        {props.pisos.map((piso, i) => (
          <PisoBus key={i} piso={piso} indicePiso={i} totalPisos={total} props={props} />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-brand-dark/70">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border-b-2 border-brand-medium/40 bg-brand-light" aria-hidden="true" /> Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border-b-2 border-brand-dark bg-brand-amber" aria-hidden="true" /> Tu elección
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border-b-2 border-gray-300 bg-gray-200" aria-hidden="true" /> Ocupado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" /> VIP
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-pink-500" aria-hidden="true" /> Exclusivo mujeres
        </span>
      </div>
      <p className="mt-2 text-center text-[11px] text-brand-dark/50">
        Pasa el cursor (o toca) un asiento para ver si es de ventana o de pasillo.
      </p>
    </div>
  );
}
