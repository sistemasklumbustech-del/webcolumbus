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
        <h1 className="text-2xl font-bold text-brand-dark">Carga masiva</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-2">
          Sube tipos de vehículo, conductores, unidades, rutas y horarios de una sola vez, en vez de crear cada uno a
          mano. Descarga la plantilla, llénala con nombres (no hacen falta códigos) y súbela: primero la revisamos y tú
          confirmas antes de guardar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="kb-card kb-on-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-brand-dark">1. Descarga la plantilla</h2>
          <p className="mt-1 text-sm text-muted-2">
            Un Excel con una hoja para cada cosa, instrucciones con ejemplos y la lista de ciudades y terminales
            disponibles.
          </p>
          <button
            type="button"
            onClick={descargar}
            disabled={trabajando !== null}
            className="mt-4 kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
          >
            {trabajando === "plantilla" ? "Descargando..." : "Descargar plantilla (.xlsx)"}
          </button>
        </section>

        <section className="kb-card kb-on-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-brand-dark">2. Sube tu plantilla llena</h2>
          <p className="mt-1 text-sm text-muted-2">
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
            className="mt-4 kb-btn kb-btn--primary !h-11 !px-5 !text-sm"
          >
            {trabajando === "revisar" ? "Revisando..." : archivo ? "Elegir otro archivo" : "Elegir archivo"}
          </button>
          {archivo && <p className="mt-2 break-all text-xs text-muted-2">{archivo.name}</p>}
        </section>
      </div>

      {error && (
        <div role="alert" className="kb-alert kb-alert--error">
          {error}
        </div>
      )}

      {revision && (
        <section className="space-y-4 kb-card kb-on-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-brand-dark">3. Revisión</h2>

          {!hayErrores && (
            <>
              <p className="text-sm font-medium text-ok">
                Todo está en orden. Esto es lo que se va a crear:
              </p>
              <div className="grid grid-cols-2 gap-3 rounded-ctrl bg-ok-bg p-4 sm:grid-cols-3 lg:grid-cols-5">
                {ETIQUETAS_RESUMEN.map(({ clave, etiqueta }) => (
                  <div key={clave}>
                    <p className="text-xs text-ok">{etiqueta}</p>
                    <p className="text-xl font-bold text-ok">
                      {revision.resumen[clave] as number}
                    </p>
                  </div>
                ))}
              </div>
              {revision.resumen.generarViajes && (
                <p className="text-sm text-muted-2">
                  Además se generarán los viajes de tus horarios del {revision.resumen.generarViajes.desde} al{" "}
                  {revision.resumen.generarViajes.hasta}.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={trabajando !== null}
                  className="kb-btn kb-btn--primary !h-11 !px-5 !text-sm"
                >
                  {trabajando === "importar" ? "Importando..." : "Confirmar e importar"}
                </button>
                <button
                  type="button"
                  onClick={reiniciar}
                  disabled={trabajando !== null}
                  className="kb-btn kb-btn--outline !h-11 !px-4 !text-sm"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}

          {hayErrores && (
            <>
              <p className="text-sm font-medium text-kberror">
                Hay {revision.errores.length} {revision.errores.length === 1 ? "error" : "errores"}. Corrígelos en el
                Excel y vuelve a subirlo — no se guardó nada.
              </p>
              <div className="overflow-x-auto rounded-lg ring-1 ring-line">
                <table className="kb-table min-w-[520px]">
                  <thead>
                    <tr>
                      <th className="px-4 py-2">Hoja</th>
                      <th className="px-4 py-2">Fila</th>
                      <th className="px-4 py-2">Qué corregir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revision.errores.map((er, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-brand-dark">{er.hoja || "—"}</td>
                        <td className="px-4 py-2 text-muted-2">{er.fila > 0 ? er.fila : "—"}</td>
                        <td className="px-4 py-2 text-brand-dark">{er.mensaje}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => entrada.current?.click()}
                className="kb-btn kb-btn--primary !h-11 !px-5 !text-sm"
              >
                Subir el archivo corregido
              </button>
            </>
          )}
        </section>
      )}

      {resultado && (
        <section className="space-y-3 kb-card kb-on-white p-5 sm:p-6">
          <p className="text-sm font-semibold text-ok">Importación completada.</p>
          <div className="grid grid-cols-2 gap-3 rounded-ctrl bg-ok-bg p-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Tipos de vehículo", resultado.tiposVehiculoCreados],
              ["Conductores", resultado.conductoresCreados],
              ["Unidades", resultado.unidadesCreadas],
              ["Rutas", resultado.rutasCreadas],
              ["Horarios", resultado.horariosCreados],
              ["Viajes generados", resultado.viajesGenerados],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta as string}>
                <p className="text-xs text-ok">{etiqueta}</p>
                <p className="text-xl font-bold text-ok">{valor}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={reiniciar}
            className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
          >
            Hacer otra carga
          </button>
        </section>
      )}
    </div>
  );
}
