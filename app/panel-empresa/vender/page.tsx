"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listarViajesCoop, type ViajeCoopResumen } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

export default function VenderVentanillaPage() {
  const [viajes, setViajes] = useState<ViajeCoopResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    const hoy = new Date().toLocaleDateString("sv-SE");
    listarViajesCoop(token, { desde: hoy, estado: "programado", pagina: 1, limite: 200 })
      .then((resultado) => setViajes(resultado.filas))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los viajes."));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Vender boleto en ventanilla</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Para el pasajero que llega directo al mostrador -- sin celular, sin cuenta. Elige la salida.
        </p>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {!viajes ? (
        <p className="text-sm text-brand-dark/50">Cargando salidas...</p>
      ) : viajes.length === 0 ? (
        <p className="text-sm text-brand-dark/50">No hay salidas programadas todavía.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              <tr>
                <th className="px-4 py-3">Ruta</th>
                <th className="px-4 py-3">Fecha y hora</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Tarifa</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {viajes.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3 font-semibold text-brand-dark">
                    {v.origenCiudad} → {v.destinoCiudad}
                  </td>
                  <td className="px-4 py-3 text-brand-dark/70">
                    {new Date(v.horaSalidaProgramada).toLocaleString("es-EC", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "America/Guayaquil",
                    })}
                  </td>
                  <td className="px-4 py-3 text-brand-dark/70">{v.unidadPlaca}</td>
                  <td className="px-4 py-3 text-brand-dark/70">${v.precioBase.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/panel-empresa/vender/${v.id}`}
                      className="rounded-lg bg-brand-amber px-4 py-1.5 text-xs font-semibold text-brand-dark transition hover:brightness-95"
                    >
                      Vender aquí
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
