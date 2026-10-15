"use client";

import { useState } from "react";
import { solicitarFacturaCooperativa } from "@/lib/api";
import { tokenValido } from "@/lib/auth";

/**
 * Solicitud de factura del pasaje (29-jul-2026) -- confirmado con el
 * usuario: la cooperativa emite en su propio sistema (fuera de esta
 * plataforma), esto solo avisa y deja registro de la solicitud.
 */
export function SolicitarFactura({ boletoId }: { boletoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<"cedula" | "ruc">("cedula");
  const [numero, setNumero] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [direccion, setDireccion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (enviada) {
    return (
      <p className="mt-2 text-xs font-medium text-ok">
        Factura solicitada — la cooperativa la emitirá en su propio sistema.
      </p>
    );
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-2 text-xs font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-brand-dark"
      >
        Solicitar factura
      </button>
    );
  }

  async function enviar() {
    const token = tokenValido();
    if (!token) return;
    if (!numero.trim() || !razonSocial.trim()) {
      setError("Completa cédula/RUC y razón social.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await solicitarFacturaCooperativa(token, boletoId, {
        tipo,
        numero: numero.trim(),
        razonSocial: razonSocial.trim(),
        direccion: direccion.trim(),
      });
      setEnviada(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo solicitar la factura.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-2 kb-on-white rounded-ctrl bg-kbbg p-3">
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={tipo === "cedula"}
            onChange={() => setTipo("cedula")}
          />
          Cédula
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={tipo === "ruc"} onChange={() => setTipo("ruc")} />
          RUC
        </label>
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={numero}
        onChange={(e) => setNumero(e.target.value.replace(/\D/g, "").slice(0, 13))}
        placeholder={tipo === "cedula" ? "Cédula (10 dígitos)" : "RUC (13 dígitos)"}
        className="mt-2 kb-input"
      />
      <input
        type="text"
        value={razonSocial}
        onChange={(e) => setRazonSocial(e.target.value)}
        placeholder="Nombre completo o razón social"
        className="mt-2 kb-input"
      />
      <input
        type="text"
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
        placeholder="Dirección (opcional)"
        className="mt-2 kb-input"
      />
      {error && <p className="mt-2 text-xs font-medium text-kberror">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={enviar}
          disabled={enviando}
          className="kb-btn kb-btn--dark !h-10 !px-4 !text-sm"
        >
          {enviando ? "Enviando..." : "Enviar solicitud"}
        </button>
        <button
          onClick={() => setAbierto(false)}
          className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
