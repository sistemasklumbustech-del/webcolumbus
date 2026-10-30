"use client";

import { useEffect, useState } from "react";

/**
 * "Reenviar enlace" con espera visible de 60 s ("Reenviar en 0:45") entre envíos (aprobado por el
 * director, 30-oct-2026). Es solo una ayuda en pantalla: el límite real tiene que estar en la API.
 */
export function BotonReenviar({
  onReenviar,
  esperaInicial = 60,
  texto = "Reenviar enlace",
}: {
  onReenviar: () => Promise<void>;
  esperaInicial?: number;
  texto?: string;
}) {
  const [faltan, setFaltan] = useState(esperaInicial);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (faltan <= 0) return;
    const t = setTimeout(() => setFaltan((f) => f - 1), 1000);
    return () => clearTimeout(t);
  }, [faltan]);

  async function reenviar() {
    setEnviando(true);
    setAviso(null);
    try {
      await onReenviar();
      setAviso("Listo, te lo enviamos de nuevo.");
      setFaltan(60);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo reenviar. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const reloj = `${Math.floor(faltan / 60)}:${String(faltan % 60).padStart(2, "0")}`;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={reenviar}
        disabled={faltan > 0 || enviando}
        className="min-h-11 text-sm font-semibold text-kbyellow transition hover:underline disabled:cursor-not-allowed disabled:text-ondark disabled:no-underline"
      >
        {enviando ? "Enviando..." : faltan > 0 ? `Reenviar en ${reloj}` : texto}
      </button>
      <span role="status" aria-live="polite" className="text-center text-xs text-ondark">
        {aviso}
      </span>
    </div>
  );
}
