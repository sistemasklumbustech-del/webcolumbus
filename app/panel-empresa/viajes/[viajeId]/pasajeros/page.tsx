"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { listarPasajerosDeViajeCoop, type PasajeroDeViaje } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { CodigoQr } from "@/components/CodigoQr";

const ETIQUETA_TARIFA: Record<string, string> = {
  adulto: "Adulto",
  nino: "Niño",
  tercera_edad: "Tercera edad",
  discapacidad: "Discapacidad",
};

const ETIQUETA_ESTADO: Record<string, string> = {
  vigente: "Vigente",
  usado: "Abordó",
  cancelado: "Cancelado",
};

const ESTILO_ESTADO: Record<string, string> = {
  vigente: "bg-brand-light text-brand",
  usado: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
};

export default function ManifiestoViajePage() {
  const params = useParams<{ viajeId: string }>();
  const [pasajeros, setPasajeros] = useState<PasajeroDeViaje[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Hallazgo real, 18-sep-2026: no había forma de recuperar el QR de
  // una venta ya hecha (ej. reimprimir para el pasajero, o revisar un
  // reclamo) -- solo se veía una vez, en la pantalla de confirmación
  // del momento de la compra.
  const [pasajeroConQrAbierto, setPasajeroConQrAbierto] = useState<PasajeroDeViaje | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    listarPasajerosDeViajeCoop(token, params.viajeId)
      .then(setPasajeros)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la lista de pasajeros."));
  }, [params.viajeId]);

  // Buscador para ubicar rápido a alguien al abordar (la lista de un viaje es acotada por sus asientos, así que se filtra aquí mismo).
  const [busqueda, setBusqueda] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const termino = busqueda.trim().toLowerCase();
  const pasajerosVisibles = (pasajeros ?? []).filter(
    (p) =>
      (!soloPendientes || p.estadoBoleto === "vigente") &&
      (termino === "" ||
        p.nombreCompleto.toLowerCase().includes(termino) ||
        p.documento.toLowerCase().includes(termino) ||
        p.numeroAsiento.toLowerCase() === termino),
  );

  const vigentes = pasajeros?.filter((p) => p.estadoBoleto !== "cancelado").length ?? 0;
  const abordaron = pasajeros?.filter((p) => p.estadoBoleto === "usado").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/panel-empresa/viajes" className="text-sm font-semibold text-brand hover:underline">
          ← Volver a viajes
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-brand-dark">Lista de pasajeros</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          {pasajeros === null ? "Cargando..." : `${vigentes} pasajero${vigentes === 1 ? "" : "s"} · ${abordaron} ya abordó/aron`}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {pasajeros !== null && pasajeros.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            Todavía no hay boletos vendidos para este viaje.
          </p>
        )}

        {pasajeros !== null && pasajeros.length > 0 && (
          <div className="flex flex-wrap items-end gap-3 border-b border-black/5 px-4 py-3 sm:px-6">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="manifiesto-buscar" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                Buscar pasajero
              </label>
              <input
                id="manifiesto-buscar"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, documento o número de asiento"
                className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-brand-dark/80">
              <input
                type="checkbox"
                checked={soloPendientes}
                onChange={(e) => setSoloPendientes(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              Solo los que faltan por abordar
            </label>
            <p className="pb-2 text-xs text-brand-dark/50">
              {pasajerosVisibles.length} de {pasajeros.length}
            </p>
          </div>
        )}

        {pasajeros !== null && pasajeros.length > 0 && pasajerosVisibles.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">No hay pasajeros con ese filtro.</p>
        )}

        {pasajeros !== null && pasajerosVisibles.length > 0 && (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              <tr>
                <th className="px-6 py-3">Asiento</th>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Documento</th>
                <th className="px-6 py-3">Tarifa</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {pasajerosVisibles.map((p) => (
                <tr key={p.numeroAsiento}>
                  <td className="px-6 py-3 font-semibold text-brand-dark">
                    {p.numeroAsiento}
                    {p.soloMujeres && (
                      <span
                        title="Asiento exclusivo para mujeres"
                        className="ml-2 inline-block h-2.5 w-2.5 rounded-full bg-pink-500 align-middle"
                        aria-label="Asiento exclusivo para mujeres"
                      />
                    )}
                  </td>
                  <td className="px-6 py-3 font-medium text-brand-dark">
                    {p.nombreCompleto}
                    {p.soloMujeres && p.estadoBoleto !== "cancelado" && (
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.sexo === "femenino" ? "bg-pink-100 text-pink-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.sexo === "femenino"
                          ? "Asiento de mujeres"
                          : "Asiento de mujeres — revisar"}
                      </span>
                    )}
                    {p.esMenorEdad && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Menor
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-brand-dark/70">{p.documento}</td>
                  <td className="px-6 py-3 text-brand-dark/70">{ETIQUETA_TARIFA[p.tipoTarifa] ?? p.tipoTarifa}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTILO_ESTADO[p.estadoBoleto] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {ETIQUETA_ESTADO[p.estadoBoleto] ?? p.estadoBoleto}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setPasajeroConQrAbierto(p)}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Ver QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {pasajeroConQrAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <p className="font-display text-sm font-bold text-brand-dark">
              Asiento {pasajeroConQrAbierto.numeroAsiento} — {pasajeroConQrAbierto.nombreCompleto}
            </p>
            <div className="mt-3">
              <CodigoQr valor={pasajeroConQrAbierto.codigoQr} />
            </div>
            <button
              onClick={() => setPasajeroConQrAbierto(null)}
              className="mt-4 w-full rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark/70 transition hover:bg-brand-light/40"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
