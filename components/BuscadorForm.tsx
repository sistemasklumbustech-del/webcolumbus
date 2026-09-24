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

/** Marco de un campo: en pantallas medianas y grandes cada campo es una "casilla" con borde propio. */
function Casilla({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`md:rounded-lg md:bg-white/10 md:px-3 md:py-2 md:ring-1 md:ring-white/20 ${className}`}>{children}</div>
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
      <label htmlFor={id} className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-white/60">
        Hora de salida
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className="w-full rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-medium md:border-0 md:bg-transparent md:p-0 md:focus:ring-0 [&>option]:text-brand-dark"
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

  const claseTitulo = "mb-2 flex items-center gap-2 text-sm font-bold text-white";

  return (
    <form
      onSubmit={buscar}
      className="w-full max-w-5xl rounded-2xl bg-white/5 p-3 shadow-xl shadow-black/30 ring-1 ring-white/15 md:p-5"
    >
      <div
        role="group"
        aria-label="Tipo de viaje"
        className="mb-3 inline-flex overflow-hidden rounded-lg ring-1 ring-white/20"
      >
        <button
          type="button"
          onClick={() => setIdaYVuelta(false)}
          aria-pressed={!idaYVuelta}
          className={`px-4 py-1.5 text-sm font-semibold transition ${
            !idaYVuelta ? "bg-brand text-white" : "bg-transparent text-white/60 hover:bg-white/10"
          }`}
        >
          Solo ida
        </button>
        <button
          type="button"
          onClick={() => setIdaYVuelta(true)}
          aria-pressed={idaYVuelta}
          className={`px-4 py-1.5 text-sm font-semibold transition ${
            idaYVuelta ? "bg-brand text-white" : "bg-transparent text-white/60 hover:bg-white/10"
          }`}
        >
          Ida y vuelta
        </button>
      </div>

      <section aria-label={idaYVuelta ? "Viaje de ida" : "Viaje"}>
        {idaYVuelta && (
          <p className={claseTitulo}>
            <span className="rounded-full bg-brand-amber px-2 py-0.5 text-xs font-bold text-brand-dark">1</span> Ida
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Casilla className="col-span-2 md:col-span-1">
            <SelectorCiudad etiqueta="Origen" placeholder="¿Desde dónde sales?" valor={origen} onCambio={setOrigen} compacto />
          </Casilla>
          <Casilla className="col-span-2 md:col-span-1">
            <SelectorCiudad etiqueta="Destino" placeholder="¿A dónde vas?" valor={destino} onCambio={setDestino} compacto />
          </Casilla>
          <Casilla>
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
          <Casilla>
            <SelectorHora id="buscador-hora-ida" valor={franja} onCambio={setFranja} />
          </Casilla>
        </div>
      </section>

      {idaYVuelta && (
        <section aria-label="Viaje de vuelta" className="mt-4 border-t border-white/10 pt-4">
          <p className={claseTitulo}>
            <span className="rounded-full bg-brand-amber px-2 py-0.5 text-xs font-bold text-brand-dark">2</span> Vuelta
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {/* key: si cambia el destino/origen de la ida y la vuelta lo
                sigue automáticamente, el selector se vuelve a crear para
                mostrar la ciudad nueva. */}
            <Casilla className="col-span-2 md:col-span-1">
              <SelectorCiudad
                key={`vuelta-origen-${vueltaOrigen === undefined ? (destino?.id ?? "vacio") : "manual"}`}
                etiqueta="Origen de la vuelta"
                placeholder="¿Desde dónde regresas?"
                valor={origenDeVuelta ?? null}
                onCambio={setVueltaOrigen}
                compacto
              />
            </Casilla>
            <Casilla className="col-span-2 md:col-span-1">
              <SelectorCiudad
                key={`vuelta-destino-${vueltaDestino === undefined ? (origen?.id ?? "vacio") : "manual"}`}
                etiqueta="Destino de la vuelta"
                placeholder="¿A dónde regresas?"
                valor={destinoDeVuelta ?? null}
                onCambio={setVueltaDestino}
                compacto
              />
            </Casilla>
            <Casilla>
              <CampoFecha etiqueta="Fecha de vuelta" valor={fechaVuelta} minimo={fecha} onCambio={(v) => setFechaVuelta(v)} />
            </Casilla>
            <Casilla>
              <SelectorHora id="buscador-hora-vuelta" valor={franjaVuelta} onCambio={setFranjaVuelta} />
            </Casilla>
          </div>
        </section>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Pasajeros</span>
          <div className="flex items-center gap-3 rounded-lg bg-white/10 px-2 py-1 ring-1 ring-white/20">
            <button
              type="button"
              aria-label="Menos pasajeros"
              disabled={pasajeros <= 1}
              onClick={() => setPasajeros((p) => Math.max(1, p - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg font-bold text-white transition hover:bg-white/15 disabled:opacity-30"
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm font-semibold text-white" aria-live="polite">
              {pasajeros}
            </span>
            <button
              type="button"
              aria-label="Más pasajeros"
              disabled={pasajeros >= 10}
              onClick={() => setPasajeros((p) => Math.min(10, p + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg font-bold text-white transition hover:bg-white/15 disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-amber px-8 py-3 text-sm font-semibold text-brand-dark transition hover:brightness-95"
        >
          Buscar pasajes
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-red-300">{error}</p>}
    </form>
  );
}
