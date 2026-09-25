"use client";

export type SexoPasajero = "" | "femenino" | "masculino";

/**
 * Se muestra solo cuando el asiento elegido es exclusivo para mujeres: pide
 * confirmar el sexo del pasajero y avisa si no corresponde. El servidor lo
 * vuelve a exigir al comprar.
 */
export function CampoSexoAsientoMujeres({
  id,
  numeroAsiento,
  valor,
  onCambio,
}: {
  id: string;
  numeroAsiento: string;
  valor: SexoPasajero;
  onCambio: (sexo: SexoPasajero) => void;
}) {
  return (
    <div className="rounded-lg border border-pink-200 bg-pink-50 px-3 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-pink-800">
        <span className="h-2.5 w-2.5 rounded-full bg-pink-500" aria-hidden="true" />
        El asiento {numeroAsiento} es exclusivo para mujeres
      </p>
      <label htmlFor={id} className="mb-1 mt-2 block text-xs font-semibold uppercase tracking-wide text-pink-900/70">
        Sexo del pasajero
      </label>
      <select
        id={id}
        value={valor}
        required
        onChange={(e) => onCambio(e.target.value as SexoPasajero)}
        className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-pink-300"
      >
        <option value="">Selecciona...</option>
        <option value="femenino">Mujer</option>
        <option value="masculino">Hombre</option>
      </select>
      {valor === "masculino" && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          Este asiento es solo para mujeres. Vuelve atrás y elige otro asiento.
        </p>
      )}
    </div>
  );
}
