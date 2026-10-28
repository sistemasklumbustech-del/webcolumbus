"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SelectorCiudad } from "./SelectorCiudad";
import { CampoFecha } from "./CampoFecha";
import { FRANJAS_HORARIO, franjaPorValor } from "@/lib/franjas-horario";
import type { PuntoOperacion } from "@/lib/api";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const ICONO_FECHA = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
);
const ICONO_HORA = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const PUNTO_ORIGEN = <span className="h-3 w-3 shrink-0 rounded-full border-[3px] border-ink" aria-hidden="true" />;
const PUNTO_DESTINO = <span className="h-3 w-3 shrink-0 rounded-full border-[3px] border-kbyellow bg-kbyellow" aria-hidden="true" />;

/** Casilla de un campo del buscador: fondo gris sin borde, borde negro al escribir (diseño final). */
function Casilla({
  children,
  icono,
  className = "",
}: {
  children: React.ReactNode;
  icono?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-[18px] border-[1.5px] border-transparent bg-kbbg px-4 py-2.5 focus-within:border-ink focus-within:bg-white md:min-h-16 md:px-[18px] md:py-3 ${className}`}
    >
      {icono}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function SelectorHora({
  id,
  valor,
  onCambio,
}: {
  id: string;
  valor: string;
  onCambio: (valor: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] text-muted-2 md:text-xs">
        Hora de salida
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className="w-full bg-transparent p-0 text-sm font-semibold text-ink focus:outline-none md:text-[15px]"
      >
        <option value="">Cualquier hora</option>
        {FRANJAS_HORARIO.map((f) => (
          <option key={f.valor} value={f.valor}>
            {f.etiqueta} ({f.horaDesde}–{f.horaHasta})
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Buscador de la portada. Solo ida: origen, destino, fecha y hora. Con
 * "Ida y vuelta" aparece un segundo bloque idéntico para la vuelta
 * (origen, destino, fecha y hora) -- por defecto con el origen y el
 * destino invertidos, pero se pueden cambiar (ej. volver desde otra
 * terminal o ciudad).
 */
export function BuscadorForm() {
  const router = useRouter();
  const [origen, setOrigen] = useState<PuntoOperacion | null>(null);
  const [destino, setDestino] = useState<PuntoOperacion | null>(null);
  const [fecha, setFecha] = useState(hoyISO());
  const [franja, setFranja] = useState("");
  const [idaYVuelta, setIdaYVuelta] = useState(false);
  // undefined = "sigue automáticamente al destino/origen de la ida";
  // un valor (incluso null) = la persona lo cambió a mano.
  const [vueltaOrigen, setVueltaOrigen] = useState<PuntoOperacion | null | undefined>(undefined);
  const [vueltaDestino, setVueltaDestino] = useState<PuntoOperacion | null | undefined>(undefined);
  const [fechaVuelta, setFechaVuelta] = useState(hoyISO());
  const [franjaVuelta, setFranjaVuelta] = useState("");
  // Solo apariencia: la vuelta muestra únicamente su fecha y hora (la ruta se invierte sola, como en
  // FlixBus o Busbud). Los campos de otra ruta de regreso se abren con "Cambiar ruta de vuelta".
  const [verRutaVuelta, setVerRutaVuelta] = useState(false);
  const [pasajeros, setPasajeros] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const origenDeVuelta = vueltaOrigen === undefined ? destino : vueltaOrigen;
  const destinoDeVuelta = vueltaDestino === undefined ? origen : vueltaDestino;

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!origen || !destino) {
      setError("Elige una ciudad de origen y una de destino de la lista.");
      return;
    }
    if (origen.id === destino.id) {
      setError("El origen y el destino no pueden ser la misma ciudad.");
      return;
    }
    if (idaYVuelta) {
      if (!origenDeVuelta || !destinoDeVuelta) {
        setError("Elige el origen y el destino de la vuelta de la lista.");
        return;
      }
      if (origenDeVuelta.id === destinoDeVuelta.id) {
        setError("El origen y el destino de la vuelta no pueden ser la misma ciudad.");
        return;
      }
      if (fechaVuelta < fecha) {
        setError("La fecha de vuelta no puede ser antes que la fecha de ida.");
        return;
      }
    }
    setError(null);
    const params = new URLSearchParams({
      origenId: origen.id,
      origenCiudad: origen.ciudad,
      destinoId: destino.id,
      destinoCiudad: destino.ciudad,
      fecha,
      pasajeros: String(pasajeros),
    });
    const franjaIda = franjaPorValor(franja);
    if (franjaIda) {
      params.set("horaDesde", franjaIda.horaDesde);
      params.set("horaHasta", franjaIda.horaHasta);
    }
    if (idaYVuelta && origenDeVuelta && destinoDeVuelta) {
      params.set("fechaVuelta", fechaVuelta);
      params.set("vueltaOrigenId", origenDeVuelta.id);
      params.set("vueltaOrigenCiudad", origenDeVuelta.ciudad);
      params.set("vueltaDestinoId", destinoDeVuelta.id);
      params.set("vueltaDestinoCiudad", destinoDeVuelta.ciudad);
      const franjaRetorno = franjaPorValor(franjaVuelta);
      if (franjaRetorno) {
        params.set("horaVueltaDesde", franjaRetorno.horaDesde);
        params.set("horaVueltaHasta", franjaRetorno.horaHasta);
      }
    }
    router.push(`/buscar?${params.toString()}`);
  }

  const claseGrilla = "grid grid-cols-2 gap-2.5 lg:grid-cols-[1fr_1fr_190px_210px]";
  const claseNumeroTramo = "rounded-full bg-kbyellow px-2 py-0.5 text-xs font-bold text-ink";

  return (
    <form
      onSubmit={buscar}
      className="flex w-full flex-col gap-2.5 rounded-[26px] bg-white p-4 shadow-float md:gap-4 md:rounded-[28px] md:p-[22px]"
    >
      <div role="group" aria-label="Tipo de viaje" className="kb-tabs w-full self-start md:w-auto">
        <button type="button" onClick={() => setIdaYVuelta(false)} aria-pressed={!idaYVuelta} className={`whitespace-nowrap ${!idaYVuelta ? "is-active" : ""}`}>
          Solo ida
        </button>
        <button type="button" onClick={() => setIdaYVuelta(true)} aria-pressed={idaYVuelta} className={`whitespace-nowrap ${idaYVuelta ? "is-active" : ""}`}>
          Ida y vuelta
        </button>
      </div>

      <section aria-label={idaYVuelta ? "Viaje de ida" : "Viaje"}>
        <div className={claseGrilla}>
          <Casilla icono={PUNTO_ORIGEN} className="col-span-2 lg:col-span-1">
            <SelectorCiudad etiqueta="Origen" placeholder="¿Desde dónde sales?" valor={origen} onCambio={setOrigen} compacto />
          </Casilla>
          <Casilla icono={PUNTO_DESTINO} className="col-span-2 lg:col-span-1">
            <SelectorCiudad etiqueta="Destino" placeholder="¿A dónde vas?" valor={destino} onCambio={setDestino} compacto />
          </Casilla>
          <Casilla icono={ICONO_FECHA}>
            <CampoFecha
              etiqueta={idaYVuelta ? "Fecha de ida" : "Fecha"}
              valor={fecha}
              minimo={hoyISO()}
              onCambio={(v) => {
                setFecha(v);
                if (fechaVuelta < v) setFechaVuelta(v);
              }}
            />
          </Casilla>
          <Casilla icono={ICONO_HORA}>
            <SelectorHora id="buscador-hora-ida" valor={franja} onCambio={setFranja} />
          </Casilla>
        </div>
      </section>

      {idaYVuelta && (
        <section aria-label="Viaje de vuelta" className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[1fr_190px_210px] lg:items-center">
            <p className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-2 lg:col-span-1">
              <span className={claseNumeroTramo}>Vuelta</span>
              {!verRutaVuelta && (
                <span className="font-medium text-ink">
                  {origenDeVuelta && destinoDeVuelta
                    ? `${origenDeVuelta.ciudad} → ${destinoDeVuelta.ciudad}`
                    : "La misma ruta, al revés"}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (verRutaVuelta) {
                    setVueltaOrigen(undefined);
                    setVueltaDestino(undefined);
                  }
                  setVerRutaVuelta((v) => !v);
                }}
                className="font-semibold text-ink underline underline-offset-2"
              >
                {verRutaVuelta ? "Usar la misma ruta" : "Cambiar ruta de vuelta"}
              </button>
            </p>
            <Casilla icono={ICONO_FECHA}>
              <CampoFecha etiqueta="Fecha de vuelta" valor={fechaVuelta} minimo={fecha} onCambio={(v) => setFechaVuelta(v)} />
            </Casilla>
            <Casilla icono={ICONO_HORA}>
              <SelectorHora id="buscador-hora-vuelta" valor={franjaVuelta} onCambio={setFranjaVuelta} />
            </Casilla>
          </div>
          {verRutaVuelta && (
            <div className="grid grid-cols-2 gap-2.5">
              {/* key: si cambia el destino/origen de la ida y la vuelta lo
                  sigue automáticamente, el selector se vuelve a crear para
                  mostrar la ciudad nueva. */}
              <Casilla icono={PUNTO_ORIGEN} className="col-span-2 lg:col-span-1">
                <SelectorCiudad
                  key={`vuelta-origen-${vueltaOrigen === undefined ? (destino?.id ?? "vacio") : "manual"}`}
                  etiqueta="Origen de la vuelta"
                  placeholder="¿Desde dónde regresas?"
                  valor={origenDeVuelta ?? null}
                  onCambio={setVueltaOrigen}
                  compacto
                />
              </Casilla>
              <Casilla icono={PUNTO_DESTINO} className="col-span-2 lg:col-span-1">
                <SelectorCiudad
                  key={`vuelta-destino-${vueltaDestino === undefined ? (origen?.id ?? "vacio") : "manual"}`}
                  etiqueta="Destino de la vuelta"
                  placeholder="¿A dónde regresas?"
                  valor={destinoDeVuelta ?? null}
                  onCambio={setVueltaDestino}
                  compacto
                />
              </Casilla>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex items-center justify-between gap-6 rounded-ctrl bg-kbbg py-2 pl-4 pr-2.5 md:justify-start md:gap-[22px] md:rounded-[18px] md:pl-[18px]">
          <div>
            <span className="block text-[11px] text-muted-2 md:text-xs">Pasajeros</span>
            <span className="block text-sm font-semibold text-ink md:text-[15px]">Adultos y niños</span>
          </div>
          <div className="flex items-center gap-3 md:gap-3.5">
            <button
              type="button"
              aria-label="Menos pasajeros"
              disabled={pasajeros <= 1}
              onClick={() => setPasajeros((p) => Math.max(1, p - 1))}
              className="h-9 w-9 rounded-xl bg-white text-lg font-semibold text-ink shadow-[0_1px_4px_rgba(11,13,18,.08)] transition disabled:opacity-30 md:h-10 md:w-10"
            >
              −
            </button>
            <span className="min-w-5 text-center text-sm font-semibold tabular-nums text-ink md:text-[15px]" aria-live="polite">
              {pasajeros}
            </span>
            <button
              type="button"
              aria-label="Más pasajeros"
              disabled={pasajeros >= 10}
              onClick={() => setPasajeros((p) => Math.min(10, p + 1))}
              className="h-9 w-9 rounded-xl bg-white text-lg font-semibold text-ink shadow-[0_1px_4px_rgba(11,13,18,.08)] transition disabled:opacity-30 md:h-10 md:w-10"
            >
              +
            </button>
          </div>
        </div>
        <button type="submit" className="kb-btn kb-btn--primary w-full text-base md:h-[60px] md:w-auto md:px-11">
          Buscar pasajes
        </button>
      </div>
      {error && <p className="text-sm font-medium text-kberror">{error}</p>}
    </form>
  );
}
