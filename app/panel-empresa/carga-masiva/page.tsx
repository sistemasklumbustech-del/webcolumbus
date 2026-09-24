"use client";

import { useRef, useState } from "react";
import {
  descargarPlantillaCargaMasiva,
  revisarCargaMasiva,
  importarCargaMasivaExcel,
  type RevisionCargaMasiva,
  type ResultadoImportacion,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

const ETIQUETAS_RESUMEN: Array<{ clave: keyof RevisionCargaMasiva["resumen"]; etiqueta: string }> = [
  { clave: "tiposVehiculo", etiqueta: "Tipos de vehículo" },
  { clave: "conductores", etiqueta: "Conductores" },
  { clave: "unidades", etiqueta: "Unidades" },
  { clave: "rutas", etiqueta: "Rutas" },
  { clave: "horarios", etiqueta: "Horarios" },
];

/**
 * Carga masiva con plantilla Excel (24-sep-2026): se descarga la plantilla,
 * se llena con nombres (ciudades, tipos de vehículo, rutas -- nunca códigos),
 * se sube y se REVISA primero: se ve qué se creará y qué filas tienen
 * errores. No se guarda nada hasta confirmar.
 */
export default function CargaMasivaPage() {
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [revision, setRevision] = useState<RevisionCargaMasiva | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [trabajando, setTrabajando] = useState<"plantilla" | "revisar" | "importar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reiniciar() {
    setArchivo(null);
    setRevision(null);
    setResultado(null);
    setError(null);
  }

  async function descargar() {
    const token = obtenerToken();
    if (!token) return;
    setError(null);
    setTrabajando("plantilla");
    try {
      await descargarPlantillaCargaMasiva(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar la plantilla.");
    } finally {
      setTrabajando(null);
    }
  }

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const elegido = e.target.files?.[0];
    e.target.value = "";
    if (!elegido) return;
    const token = obtenerToken();
    if (!token) return;
    reiniciar();
    setArchivo(elegido);
    setTrabajando("revisar");
    try {
      setRevision(await revisarCargaMasiva(token, elegido));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revisar el archivo.");
    } finally {
      setTrabajando(null);
    }
  }

  async function confirmar() {
    const token = obtenerToken();
    if (!token || !archivo) return;
    setError(null);
    setTrabajando("importar");
    try {
      setResultado(await importarCargaMasivaExcel(token, archivo));
      setRevision(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar el archivo.");
    } finally {
      setTrabajando(null);
    }
  }

  const hayErrores = revision !== null && revision.errores.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Carga masiva</h1>
        <p className="mt-1 max-w-3xl text-sm text-brand-dark/70">
          Sube tipos de vehículo, conductores, unidades, rutas y horarios de una sola vez, en vez de crear cada uno a
          mano. Descarga la plantilla, llénala con nombres (no hacen falta códigos) y súbela: primero la revisamos y tú
          confirmas antes de guardar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
          <h2 className="font-display text-base font-bold text-brand-dark">1. Descarga la plantilla</h2>
          <p className="mt-1 text-sm text-brand-dark/70">
            Un Excel con una hoja para cada cosa, instrucciones con ejemplos y la lista de ciudades y terminales
            disponibles.
          </p>
          <button
            type="button"
            onClick={descargar}
            disabled={trabajando !== null}
            className="mt-4 rounded-lg border border-brand-light bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-light/40 disabled:opacity-50"
          >
            {trabajando === "plantilla" ? "Descargando..." : "Descargar plantilla (.xlsx)"}
          </button>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
          <h2 className="font-display text-base font-bold text-brand-dark">2. Sube tu plantilla llena</h2>
          <p className="mt-1 text-sm text-brand-dark/70">
            La revisamos al instante. No se guarda nada todavía.
          </p>
          <input
            ref={entrada}
            id="carga-masiva-archivo"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={alElegir}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={trabajando !== null}
            className="mt-4 rounded-lg bg-brand-amber px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
          >
            {trabajando === "revisar" ? "Revisando..." : archivo ? "Elegir otro archivo" : "Elegir archivo"}
          </button>
          {archivo && <p className="mt-2 break-all text-xs text-brand-dark/60">{archivo.name}</p>}
        </section>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {revision && (
        <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
          <h2 className="font-display text-base font-bold text-brand-dark">3. Revisión</h2>

          {!hayErrores && (
            <>
              <p className="text-sm font-medium text-emerald-700">
                Todo está en orden. Esto es lo que se va a crear:
              </p>
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-emerald-50 p-4 ring-1 ring-emerald-200 sm:grid-cols-3 lg:grid-cols-5">
                {ETIQUETAS_RESUMEN.map(({ clave, etiqueta }) => (
                  <div key={clave}>
                    <p className="text-xs text-emerald-700">{etiqueta}</p>
                    <p className="font-display text-xl font-bold text-emerald-900">
                      {revision.resumen[clave] as number}
                    </p>
                  </div>
                ))}
              </div>
              {revision.resumen.generarViajes && (
                <p className="text-sm text-brand-dark/70">
                  Además se generarán los viajes de tus horarios del {revision.resumen.generarViajes.desde} al{" "}
                  {revision.resumen.generarViajes.hasta}.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={trabajando !== null}
                  className="rounded-lg bg-brand-amber px-5 py-2.5 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
                >
                  {trabajando === "importar" ? "Importando..." : "Confirmar e importar"}
                </button>
                <button
                  type="button"
                  onClick={reiniciar}
                  disabled={trabajando !== null}
                  className="rounded-lg border border-brand-light px-4 py-2.5 text-sm font-semibold text-brand-dark/70 hover:bg-brand-light/40 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}

          {hayErrores && (
            <>
              <p className="text-sm font-medium text-red-700">
                Hay {revision.errores.length} {revision.errores.length === 1 ? "error" : "errores"}. Corrígelos en el
                Excel y vuelve a subirlo — no se guardó nada.
              </p>
              <div className="overflow-x-auto rounded-lg ring-1 ring-black/5">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                    <tr>
                      <th className="px-4 py-2">Hoja</th>
                      <th className="px-4 py-2">Fila</th>
                      <th className="px-4 py-2">Qué corregir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {revision.errores.map((er, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-brand-dark">{er.hoja || "—"}</td>
                        <td className="px-4 py-2 text-brand-dark/70">{er.fila > 0 ? er.fila : "—"}</td>
                        <td className="px-4 py-2 text-brand-dark">{er.mensaje}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => entrada.current?.click()}
                className="rounded-lg bg-brand-amber px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-95"
              >
                Subir el archivo corregido
              </button>
            </>
          )}
        </section>
      )}

      {resultado && (
        <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
          <p className="text-sm font-semibold text-emerald-700">Importación completada.</p>
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-emerald-50 p-4 ring-1 ring-emerald-200 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Tipos de vehículo", resultado.tiposVehiculoCreados],
              ["Conductores", resultado.conductoresCreados],
              ["Unidades", resultado.unidadesCreadas],
              ["Rutas", resultado.rutasCreadas],
              ["Horarios", resultado.horariosCreados],
              ["Viajes generados", resultado.viajesGenerados],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta as string}>
                <p className="text-xs text-emerald-700">{etiqueta}</p>
                <p className="font-display text-xl font-bold text-emerald-900">{valor}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={reiniciar}
            className="rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-light/40"
          >
            Hacer otra carga
          </button>
        </section>
      )}
    </div>
  );
}
