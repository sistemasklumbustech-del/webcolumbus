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
    <div className="rounded-ctrl bg-women-bg px-4 py-3.5">
      <p className="flex items-center gap-2 text-sm font-semibold text-women">
        <span className="h-2.5 w-2.5 rounded-full bg-women" aria-hidden="true" />
        El asiento {numeroAsiento} es exclusivo para mujeres
      </p>
      <label htmlFor={id} className="kb-label mt-2">
        Sexo del pasajero
      </label>
      <select id={id} value={valor} required onChange={(e) => onCambio(e.target.value as SexoPasajero)} className="kb-input">
        <option value="">Selecciona...</option>
        <option value="femenino">Mujer</option>
        <option value="masculino">Hombre</option>
      </select>
      {valor === "masculino" && (
        <p role="alert" className="mt-2 text-xs font-medium text-kberror">
          Este asiento es solo para mujeres. Vuelve atrás y elige otro asiento.
        </p>
      )}
    </div>
  );
}
