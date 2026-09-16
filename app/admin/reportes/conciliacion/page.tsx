"use client";

import { useEffect, useMemo, useState } from "react";
import { conciliacionAdmin, type FilaConciliacion } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Pill({ texto, tono }: { texto: string; tono: "verde" | "ambar" | "rojo" | "gris" }) {
  const clases = {
    verde: "bg-emerald-100 text-emerald-700",
    ambar: "bg-amber-100 text-amber-700",
    rojo: "bg-red-100 text-red-700",
    gris: "bg-brand-light text-brand-dark/60",
  }[tono];
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${clases}`}>{texto}</span>;
}

function PillEstadoPago({ estado }: { estado: string | null }) {
  if (!estado) return <Pill texto="Sin pago" tono="gris" />;
  if (estado === "aprobado") return <Pill texto="Aprobado" tono="verde" />;
  if (estado === "pendiente") return <Pill texto="Pendiente" tono="ambar" />;
  return <Pill texto={estado} tono="rojo" />;
}

function PillEstadoTasa({ estado }: { estado: string | null }) {
  if (!estado) return <Pill texto="Sin registrar" tono="gris" />;
  if (estado === "exitosa") return <Pill texto="Exitosa" tono="verde" />;
  if (estado === "pendiente") return <Pill texto="Pendiente" tono="ambar" />;
  return <Pill texto={estado} tono="rojo" />;
}

function PillComprobantes({ estados }: { estados: string[] | null }) {
  if (!estados || estados.length === 0) return <Pill texto="Sin comprobante" tono="gris" />;
  if (estados.some((e) => e === "rechazado")) return <Pill texto="Rechazado" tono="rojo" />;
  if (estados.every((e) => e === "autorizado")) return <Pill texto="Autorizado" tono="verde" />;
  return <Pill texto="Pendiente" tono="ambar" />;
}

/**
 * RF-017 -- una fila por boleto, cruzando pago/tasa SIAT3000/comprobante
 * electrónico. `discrepancias` ya viene calculado del backend
 * (conciliacion.util.ts, dominio puro) -- esta página solo lo muestra.
 */
export default function ConciliacionAdminPage() {
  const [filas, setFilas] = useState<FilaConciliacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [soloDiscrepancias, setSoloDiscrepancias] = useState(false);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    conciliacionAdmin(token)
      .then(setFilas)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el reporte."));
  }, []);

  const filtradas = useMemo(() => {
    if (!filas) return [];
    const termino = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      if (soloDiscrepancias && f.discrepancias.length === 0) return false;
      if (!termino) return true;
      return (
        f.codigoQr.toLowerCase().includes(termino) ||
        f.cooperativaNombre.toLowerCase().includes(termino)
      );
    });
  }, [filas, busqueda, soloDiscrepancias]);

  const totalConDiscrepancias = filas?.filter((f) => f.discrepancias.length > 0).length ?? 0;

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-brand-dark">Conciliación</h1>
      <p className="mt-1 text-sm text-brand-dark/70">
        Cruce de pago, tasa de terminal (SIAT3000) y comprobante electrónico, boleto por boleto.
      </p>

      {filas && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Total boletos</p>
            <p className="mt-1 font-display text-2xl font-bold text-brand-dark">{filas.length}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Con discrepancia</p>
            <p className={`mt-1 font-display text-2xl font-bold ${totalConDiscrepancias > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {totalConDiscrepancias}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código QR o cooperativa..."
          className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium sm:max-w-xs"
        />
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-brand-dark/70">
          <input
            type="checkbox"
            checked={soloDiscrepancias}
            onChange={(e) => setSoloDiscrepancias(e.target.checked)}
            className="h-4 w-4 rounded border-brand-light text-brand-cobalto focus:ring-brand-medium"
          />
          Solo con discrepancias
        </label>
      </div>

      {error && <p className="mt-6 text-sm font-medium text-red-600">{error}</p>}
      {filas === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}
      {filas !== null && filtradas.length === 0 && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">No hay boletos que coincidan.</p>
      )}

      {filtradas.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-brand-dark/50">
                <th className="px-4 py-3">Boleto</th>
                <th className="px-4 py-3">Cooperativa</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Tasa</th>
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3">Discrepancias</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <tr key={f.boletoId} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-brand-dark">{f.codigoQr}</p>
                    <p className="text-xs text-brand-dark/50">{f.estadoBoleto}</p>
                  </td>
                  <td className="px-4 py-3 text-brand-dark">{f.cooperativaNombre}</td>
                  <td className="px-4 py-3 text-brand-dark/70">{formatearFecha(f.creadoEn)}</td>
                  <td className="px-4 py-3">
                    <PillEstadoPago estado={f.estadoPago} />
                  </td>
                  <td className="px-4 py-3">
                    <PillEstadoTasa estado={f.estadoRegistroTasa} />
                  </td>
                  <td className="px-4 py-3">
                    <PillComprobantes estados={f.estadosComprobanteElectronico} />
                  </td>
                  <td className="px-4 py-3">
                    {f.discrepancias.length === 0 ? (
                      <Pill texto="Sin discrepancias" tono="verde" />
                    ) : (
                      <ul className="list-inside list-disc space-y-0.5 text-xs text-red-600">
                        {f.discrepancias.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
