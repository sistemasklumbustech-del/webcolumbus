"use client";

import { useCallback, useEffect, useState } from "react";
import { listarVentasCoop, type FilaVentaCoop, type FiltrosVentasCoop, type ResultadoVentasCoop } from "@/lib/api";
import { obtenerToken, decodificarToken } from "@/lib/auth";
import { CodigoQr } from "@/components/CodigoQr";

const LIMITE_PAGINA = 25;

const ETIQUETA_CANAL: Record<string, string> = { en_linea: "En línea", ventanilla: "Ventanilla" };
const ETIQUETA_ESTADO: Record<string, string> = { vigente: "Vigente", usado: "Abordó", cancelado: "Cancelado" };
const ESTILO_ESTADO: Record<string, string> = {
  vigente: "bg-brand-light text-brand",
  usado: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
};
const ETIQUETA_METODO: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta_fisica: "Tarjeta (datáfono)",
  transferencia_bancaria: "Transferencia",
  deuna: "DeUna",
  payphone: "PayPhone",
  simulado: "Tarjeta en línea",
};
const ETIQUETA_TARIFA: Record<string, string> = {
  adulto: "Adulto",
  nino: "Niño",
  tercera_edad: "Tercera edad",
  discapacidad: "Discapacidad",
};

function dolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}
function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Guayaquil",
  });
}
function hoyEcuador(desplazamientoDias = 0) {
  const d = new Date(Date.now() + desplazamientoDias * 86400000);
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Guayaquil" });
}

/** Una celda de CSV: comillas dobles escapadas, y sin saltos de línea que rompan la fila. */
function celdaCsv(valor: string | number | boolean | null) {
  const texto = valor === null ? "" : String(valor).replace(/\r?\n/g, " ");
  return `"${texto.replace(/"/g, '""')}"`;
}

function aCsv(filas: FilaVentaCoop[]) {
  const encabezado = [
    "Fecha de venta", "Pasajero", "Tipo de documento", "Documento", "Tarifa", "Teléfono", "Correo",
    "Ruta", "Fecha de salida", "Hora de salida", "Asiento", "VIP", "Canal", "Vendedor",
    "Método de pago", "Estado del pago", "Estado del boleto", "Tarifa (USD)", "Tasa de terminal (USD)",
    "Cargo de plataforma (USD)", "Total (USD)", "Código QR",
  ];
  const lineas = filas.map((f) =>
    [
      fechaHora(f.fechaVenta), f.pasajeroNombre, f.tipoDocumento, f.documento,
      ETIQUETA_TARIFA[f.tipoTarifa] ?? f.tipoTarifa, f.contactoTelefono, f.contactoCorreo,
      f.rutaNombre, f.fechaSalida, fechaHora(f.horaSalida), f.numeroAsiento, f.esVip ? "Sí" : "No",
      ETIQUETA_CANAL[f.canal] ?? f.canal, f.vendedorNombre,
      f.metodoPago ? (ETIQUETA_METODO[f.metodoPago] ?? f.metodoPago) : "", f.estadoPago,
      ETIQUETA_ESTADO[f.estadoBoleto] ?? f.estadoBoleto,
      f.precioPagado.toFixed(2), f.tasaTerminal.toFixed(2), f.cargoPlataforma.toFixed(2), f.total.toFixed(2),
      f.codigoQr,
    ]
      .map(celdaCsv)
      .join(","),
  );
  // BOM para que Excel abra bien las tildes.
  return "﻿" + [encabezado.map(celdaCsv).join(","), ...lineas].join("\r\n");
}

export default function VentasPage() {
  const [esAdmin, setEsAdmin] = useState(false);
  const [desde, setDesde] = useState(hoyEcuador(-30));
  const [hasta, setHasta] = useState(hoyEcuador());
  const [canal, setCanal] = useState("");
  const [estadoBoleto, setEstadoBoleto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosVentasCoop>({ desde: hoyEcuador(-30), hasta: hoyEcuador() });
  const [pagina, setPagina] = useState(1);

  const [resultado, setResultado] = useState<ResultadoVentasCoop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [qrAbierto, setQrAbierto] = useState<FilaVentaCoop | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    setEsAdmin(token ? decodificarToken(token)?.rol === "admin_cooperativa" : false);
  }, []);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargando(true);
    setError(null);
    listarVentasCoop(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el historial."))
      .finally(() => setCargando(false));
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setAplicados({
      desde: desde || undefined,
      hasta: hasta || undefined,
      canal: (canal || undefined) as FiltrosVentasCoop["canal"],
      estadoBoleto: (estadoBoleto || undefined) as FiltrosVentasCoop["estadoBoleto"],
      busqueda: busqueda.trim() || undefined,
    });
  }

  function limpiar() {
    setDesde("");
    setHasta("");
    setCanal("");
    setEstadoBoleto("");
    setBusqueda("");
    setPagina(1);
    setAplicados({});
  }

  async function exportarCsv() {
    const token = obtenerToken();
    if (!token) return;
    setExportando(true);
    setError(null);
    try {
      const todas: FilaVentaCoop[] = [];
      const LIMITE_EXPORT = 500;
      const MAX_PAGINAS = 20; // tope de 10.000 filas por exportación
      for (let p = 1; p <= MAX_PAGINAS; p++) {
        const r = await listarVentasCoop(token, { ...aplicados, pagina: p, limite: LIMITE_EXPORT });
        todas.push(...r.filas);
        if (todas.length >= r.total) break;
      }
      const blob = new Blob([aCsv(todas)], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `ventas-${hoyEcuador()}.csv`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo exportar.");
    } finally {
      setExportando(false);
    }
  }

  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) : 1;
  const claseCampo =
    "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
  const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-dark">Ventas</h1>
          <p className="mt-1 text-sm text-brand-dark/70">
            {esAdmin
              ? "Todos los boletos vendidos de tu cooperativa, con pasajero, QR, canal y forma de pago."
              : "Los boletos que vendiste tú en ventanilla."}
          </p>
        </div>
        <button
          onClick={exportarCsv}
          disabled={exportando || !resultado || resultado.total === 0}
          className="rounded-lg border border-brand-light bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light/40 disabled:opacity-50"
        >
          {exportando ? "Exportando..." : "Exportar a CSV"}
        </button>
      </div>

      <form
        onSubmit={filtrar}
        className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"
      >
        <div>
          <label htmlFor="ventas-desde" className={claseEtiqueta}>Vendido desde</label>
          <input id="ventas-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={claseCampo} />
        </div>
        <div>
          <label htmlFor="ventas-hasta" className={claseEtiqueta}>Hasta</label>
          <input id="ventas-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={claseCampo} />
        </div>
        {esAdmin && (
          <div>
            <label htmlFor="ventas-canal" className={claseEtiqueta}>Canal</label>
            <select id="ventas-canal" value={canal} onChange={(e) => setCanal(e.target.value)} className={claseCampo}>
              <option value="">Todos</option>
              <option value="en_linea">En línea</option>
              <option value="ventanilla">Ventanilla</option>
            </select>
          </div>
        )}
        <div>
          <label htmlFor="ventas-estado" className={claseEtiqueta}>Estado del boleto</label>
          <select id="ventas-estado" value={estadoBoleto} onChange={(e) => setEstadoBoleto(e.target.value)} className={claseCampo}>
            <option value="">Todos</option>
            <option value="vigente">Vigente</option>
            <option value="usado">Abordó</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className={esAdmin ? "" : "lg:col-span-2"}>
          <label htmlFor="ventas-busqueda" className={claseEtiqueta}>Buscar</label>
          <input
            id="ventas-busqueda"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre, documento o código QR"
            className={claseCampo}
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95">
            Filtrar
          </button>
          <button type="button" onClick={limpiar} className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40">
            Limpiar
          </button>
        </div>
      </form>

      {resultado && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Boletos (sin cancelados)</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-brand-dark">{resultado.resumen.boletos}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Total cobrado</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-brand-dark">{dolares(resultado.resumen.totalCobrado)}</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Filas con estos filtros</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-brand-dark">{resultado.total}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              <tr>
                <th className="px-4 py-3">Vendido</th>
                <th className="px-4 py-3">Pasajero</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Viaje</th>
                <th className="px-4 py-3">Asiento</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {resultado?.filas.map((f) => (
                <tr key={f.boletoId} className={f.estadoBoleto === "cancelado" ? "opacity-60" : ""}>
                  <td className="whitespace-nowrap px-4 py-3 text-brand-dark/70">{fechaHora(f.fechaVenta)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-brand-dark">{f.pasajeroNombre}</p>
                    <p className="text-xs text-brand-dark/50">
                      {f.tipoDocumento === "pasaporte" ? "Pasaporte" : "Cédula"} {f.documento} ·{" "}
                      {ETIQUETA_TARIFA[f.tipoTarifa] ?? f.tipoTarifa}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-dark/70">
                    {f.contactoTelefono && <p>{f.contactoTelefono}</p>}
                    {f.contactoCorreo && <p>{f.contactoCorreo}</p>}
                    {!f.contactoTelefono && !f.contactoCorreo && <span className="text-brand-dark/30">Sin contacto</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-dark">{f.rutaNombre}</p>
                    <p className="text-xs text-brand-dark/50">{fechaHora(f.horaSalida)}</p>
                  </td>
                  <td className="px-4 py-3 text-brand-dark/70">
                    {f.numeroAsiento}
                    {f.esVip && (
                      <span className="ml-1 rounded-full bg-brand-amber px-1.5 py-0.5 text-[10px] font-semibold text-brand-dark">VIP</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brand-dark/70">
                    <p>{ETIQUETA_CANAL[f.canal] ?? f.canal}</p>
                    {f.vendedorNombre && <p className="text-xs text-brand-dark/50">{f.vendedorNombre}</p>}
                  </td>
                  <td className="px-4 py-3 text-brand-dark/70">
                    {f.metodoPago ? (ETIQUETA_METODO[f.metodoPago] ?? f.metodoPago) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-brand-dark">{dolares(f.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTILO_ESTADO[f.estadoBoleto] ?? "bg-slate-100 text-slate-600"}`}>
                      {ETIQUETA_ESTADO[f.estadoBoleto] ?? f.estadoBoleto}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setQrAbierto(f)} className="text-xs font-semibold text-brand hover:underline">
                      Ver QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {resultado && resultado.filas.length === 0 && !cargando && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">No hay ventas con estos filtros.</p>
        )}
        {cargando && !resultado && <p className="px-6 py-8 text-center text-sm text-brand-dark/50">Cargando...</p>}

        {resultado && resultado.total > 0 && (
          <div className="flex items-center justify-between border-t border-black/5 px-4 py-3 text-sm text-brand-dark/70">
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1 || cargando}
                className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas || cargando}
                className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {qrAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onMouseDown={() => setQrAbierto(null)}>
          <div
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
          >
            <p className="font-display text-sm font-bold text-brand-dark">
              Asiento {qrAbierto.numeroAsiento} — {qrAbierto.pasajeroNombre}
            </p>
            <p className="text-xs text-brand-dark/50">
              {qrAbierto.rutaNombre} · {fechaHora(qrAbierto.horaSalida)}
            </p>
            <div className="mt-3">
              <CodigoQr valor={qrAbierto.codigoQr} />
            </div>
            <p className="mt-2 break-all text-[10px] text-brand-dark/40">{qrAbierto.codigoQr}</p>
            <button
              onClick={() => setQrAbierto(null)}
              className="mt-4 w-full rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark/70 hover:bg-brand-light/40"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
