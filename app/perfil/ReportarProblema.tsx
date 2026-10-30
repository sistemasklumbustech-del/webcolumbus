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
        className="min-h-11 text-left text-sm font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink"
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
    <div className="mt-2 kb-on-white rounded-ctrl bg-kbbg p-3">
      <label
        htmlFor={`reclamo-tipo-${boletoId}`}
        className="kb-label"
      >
        ¿Qué pasó?
      </label>
      <select
        id={`reclamo-tipo-${boletoId}`}
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoReclamo)}
        className="mt-1 kb-input"
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
        className="mt-2 kb-input"
      />
      <p className="mt-1 text-xs text-muted-2">
        La cooperativa recibirá tu reclamo y te responderá por correo. Podrás seguirlo en &quot;Mis reclamos&quot;.
      </p>
      {error && <p className="mt-2 text-xs font-medium text-kberror">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={enviar}
          disabled={enviando}
          className="kb-btn kb-btn--dark !h-10 !px-4 !text-sm"
        >
          {enviando ? "Enviando..." : "Enviar reclamo"}
        </button>
        <button
          onClick={() => setAbierto(false)}
          disabled={enviando}
          className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
