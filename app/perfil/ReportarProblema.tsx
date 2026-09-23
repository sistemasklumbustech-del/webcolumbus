"use client";

import { useState } from "react";
import { crearReclamo, ETIQUETA_TIPO_RECLAMO, type TipoReclamo } from "@/lib/api";
import { tokenValido } from "@/lib/auth";

/**
 * Reclamo del pasajero sobre un boleto suyo (RF-019, 23-sep-2026). Lo
 * atiende la cooperativa dueña del viaje; el pasajero sigue el estado
 * en la pestaña "Mis reclamos".
 */
export function ReportarProblema({ boletoId, onEnviado }: { boletoId: string; onEnviado: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoReclamo>("servicio_viaje");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-2 block text-xs font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-brand-dark"
      >
        Reportar un problema
      </button>
    );
  }

  async function enviar() {
    const token = tokenValido();
    if (!token) {
      setError("Tu sesión expiró — vuelve a iniciar sesión.");
      return;
    }
    if (descripcion.trim().length < 10) {
      setError("Cuéntanos con un poco más de detalle qué pasó (mínimo 10 caracteres).");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await crearReclamo(token, { boletoId, tipo, descripcion: descripcion.trim() });
      setAbierto(false);
      setDescripcion("");
      onEnviado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el reclamo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg bg-brand-light/30 p-3">
      <label
        htmlFor={`reclamo-tipo-${boletoId}`}
        className="block text-xs font-semibold uppercase tracking-wide text-brand-dark/70"
      >
        ¿Qué pasó?
      </label>
      <select
        id={`reclamo-tipo-${boletoId}`}
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoReclamo)}
        className="mt-1 w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
      >
        {Object.entries(ETIQUETA_TIPO_RECLAMO).map(([valor, etiqueta]) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </select>
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Cuéntanos qué ocurrió con este viaje o este boleto"
        rows={4}
        maxLength={1000}
        aria-label="Descripción del problema"
        className="mt-2 w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
      />
      <p className="mt-1 text-xs text-brand-dark/50">
        La cooperativa recibirá tu reclamo y te responderá por correo. Podrás seguirlo en &quot;Mis reclamos&quot;.
      </p>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={enviar}
          disabled={enviando}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar reclamo"}
        </button>
        <button
          onClick={() => setAbierto(false)}
          disabled={enviando}
          className="rounded-lg border border-brand-light px-4 py-1.5 text-sm text-brand-dark/70 hover:bg-brand-light/40"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
