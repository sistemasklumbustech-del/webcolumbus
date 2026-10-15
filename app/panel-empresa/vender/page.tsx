"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listarRutasCoop,
  listarViajesCoop,
  type ResultadoViajesCoop,
  type RutaResumen,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

const LIMITE_PAGINA = 15;

function hoyEcuador(desplazamientoDias = 0) {
  const d = new Date(Date.now() + desplazamientoDias * 86400000);
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Guayaquil" });
}

const claseCampo =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-muted-3 focus:outline-none focus:ring-2 focus:ring-brand-medium";
const claseEtiqueta = "kb-label";

/**
 * Atajos de fecha para el mostrador: lo normal es vender la salida de hoy o
 * de mañana, así que no hace falta recorrer todas las salidas del mes.
 */
const ATAJOS = [
  { id: "hoy", etiqueta: "Hoy", desde: () => hoyEcuador(), hasta: () => hoyEcuador() },
  { id: "manana", etiqueta: "Mañana", desde: () => hoyEcuador(1), hasta: () => hoyEcuador(1) },
  { id: "semana", etiqueta: "Próximos 7 días", desde: () => hoyEcuador(), hasta: () => hoyEcuador(6) },
  { id: "todas", etiqueta: "Todas las futuras", desde: () => hoyEcuador(), hasta: () => "" },
] as const;

export default function VenderVentanillaPage() {
  const [desde, setDesde] = useState(hoyEcuador());
  const [hasta, setHasta] = useState(hoyEcuador());
  const [rutaId, setRutaId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

  const [rutas, setRutas] = useState<RutaResumen[]>([]);
  const [resultado, setResultado] = useState<ResultadoViajesCoop | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    listarRutasCoop(token)
      .then(setRutas)
      .catch(() => setRutas([]));
  }, []);

  // Se aplica al cambiar cualquier filtro, sin botón ni recarga de la página.
  // La pequeña espera evita una consulta por cada letra que se escribe en la búsqueda.
  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    let vigente = true;
    setCargando(true);
    const espera = setTimeout(() => {
      listarViajesCoop(token, {
        desde: desde || hoyEcuador(),
        hasta: hasta || undefined,
        estado: "programado",
        rutaId: rutaId || undefined,
        busqueda: busqueda.trim() || undefined,
        orden: "asc",
        pagina,
        limite: LIMITE_PAGINA,
      })
        .then((r) => {
          if (!vigente) return;
          setResultado(r);
          setError(null);
        })
        .catch((err) => {
          if (vigente) setError(err instanceof Error ? err.message : "No se pudieron cargar los viajes.");
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [desde, hasta, rutaId, busqueda, pagina]);

  function aplicarAtajo(id: (typeof ATAJOS)[number]["id"]) {
    const a = ATAJOS.find((x) => x.id === id)!;
    setDesde(a.desde());
    setHasta(a.hasta());
    setPagina(1);
  }

  function limpiar() {
    setDesde(hoyEcuador());
    setHasta(hoyEcuador());
    setRutaId("");
    setBusqueda("");
    setPagina(1);
  }

  const atajoActivo = ATAJOS.find((a) => a.desde() === desde && a.hasta() === hasta)?.id;
  const totalPaginas = Math.max(1, Math.ceil((resultado?.total ?? 0) / LIMITE_PAGINA));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Vender boleto en ventanilla</h1>
        <p className="mt-1 text-sm text-muted-2">
          Para el pasajero que llega directo al mostrador -- sin celular, sin cuenta. Elige la salida.
        </p>
      </div>

      <div className="space-y-4 kb-card kb-on-white p-4 sm:p-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Atajos de fecha">
          {ATAJOS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={atajoActivo === a.id}
              onClick={() => aplicarAtajo(a.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                atajoActivo === a.id
                  ? "bg-ink text-white"
                  : "border border-line bg-white text-muted-2 hover:bg-kbbg"
              }`}
            >
              {a.etiqueta}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="vender-desde" className={claseEtiqueta}>
              Desde
            </label>
            <input
              id="vender-desde"
              type="date"
              value={desde}
              min={hoyEcuador()}
              onChange={(e) => {
                setDesde(e.target.value);
                setPagina(1);
              }}
              className={claseCampo}
            />
          </div>
          <div>
            <label htmlFor="vender-hasta" className={claseEtiqueta}>
              Hasta
            </label>
            <input
              id="vender-hasta"
              type="date"
              value={hasta}
              min={desde || hoyEcuador()}
              onChange={(e) => {
                setHasta(e.target.value);
                setPagina(1);
              }}
              className={claseCampo}
            />
          </div>
          <div>
            <label htmlFor="vender-ruta" className={claseEtiqueta}>
              Ruta
            </label>
            <select
              id="vender-ruta"
              value={rutaId}
              onChange={(e) => {
                setRutaId(e.target.value);
                setPagina(1);
              }}
              className={claseCampo}
            >
              <option value="">Todas</option>
              {rutas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre ?? `${r.origenCiudad} → ${r.destinoCiudad}`}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="vender-buscar" className={claseEtiqueta}>
              Buscar
            </label>
            <input
              id="vender-buscar"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              placeholder="Ruta, unidad o conductor"
              className={claseCampo}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={limpiar}
              className="w-full kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-kberror">{error}</p>}

      <div className="overflow-hidden kb-card kb-on-white">
        <div className="border-b border-line px-4 py-3 sm:px-6">
          <h2 className="text-base font-bold text-brand-dark">
            {resultado === null
              ? "Cargando salidas..."
              : `${resultado.total} salida${resultado.total === 1 ? "" : "s"} disponible${resultado.total === 1 ? "" : "s"}`}
            {cargando && resultado !== null && (
              <span className="ml-2 text-xs font-normal text-muted-2">actualizando...</span>
            )}
          </h2>
        </div>

        {resultado !== null && resultado.total === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-2">
            No hay salidas programadas con estos filtros. Prueba con otra fecha o ruta.
          </p>
        ) : (
          resultado !== null && (
            <div className={`overflow-x-auto transition-opacity ${cargando ? "opacity-60" : ""}`}>
              <table className="kb-table min-w-[640px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Ruta</th>
                    <th className="px-4 py-3">Fecha y hora</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Tarifa</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {resultado.filas.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-semibold text-brand-dark">
                        {v.origenCiudad} → {v.destinoCiudad}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-2">
                        {new Date(v.horaSalidaProgramada).toLocaleString("es-EC", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "America/Guayaquil",
                        })}
                      </td>
                      <td className="px-4 py-3 text-muted-2">{v.unidadPlaca}</td>
                      <td className="px-4 py-3 text-muted-2">${v.precioBase.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/panel-empresa/vender/${v.id}`}
                          className="rounded-lg bg-kbyellow px-4 py-1.5 text-xs font-semibold text-brand-dark transition hover:brightness-95"
                        >
                          Vender aquí
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {resultado !== null && resultado.total > 0 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted-2 sm:px-6">
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1 || cargando}
                className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas || cargando}
                className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
