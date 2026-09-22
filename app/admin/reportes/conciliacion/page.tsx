"use client";

import { useCallback, useEffect, useState } from "react";
import {
  conciliacionAdmin,
  listarCooperativasAdmin,
  type FilaConciliacion,
  type FiltrosConciliacion,
  type ResultadoConciliacion,
  type CooperativaResumen,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

const LIMITE_PAGINA = 50;

function hoyEcuador(desplazamientoDias = 0) {
  const d = new Date(Date.now() + desplazamientoDias * 86400000);
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Guayaquil" });
}

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

function FilaTabla({ f }: { f: FilaConciliacion }) {
  return (
    <tr className="border-b border-black/5 last:border-0">
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
  );
}

/**
 * RF-017 -- una fila por boleto, cruzando pago/tasa SIAT3000/comprobante
 * electrónico. `discrepancias` ya viene calculado del backend
 * (conciliacion.util.ts, dominio puro) -- esta página solo lo muestra.
 *
 * Paginación real (22-sep-2026) -- antes traía TODOS los boletos de la
 * plataforma en una sola llamada y filtraba en el navegador; con miles
 * de boletos eso se vuelve lento o directamente inviable. Mismo patrón
 * que /panel-empresa/ventas: filtros server-side + rango de fechas por
 * defecto (últimos 30 días), para que la consulta nunca sea "todo lo
 * que existe" a menos que el admin lo pida explícitamente.
 */
export default function ConciliacionAdminPage() {
  const [cooperativas, setCooperativas] = useState<CooperativaResumen[]>([]);
  const [desde, setDesde] = useState(hoyEcuador(-30));
  const [hasta, setHasta] = useState(hoyEcuador());
  const [cooperativaId, setCooperativaId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [soloDiscrepancias, setSoloDiscrepancias] = useState(false);
  const [aplicados, setAplicados] = useState<FiltrosConciliacion>({
    desde: hoyEcuador(-30),
    hasta: hoyEcuador(),
    pagina: 1,
    limite: LIMITE_PAGINA,
  });
  const [pagina, setPagina] = useState(1);

  const [resultado, setResultado] = useState<ResultadoConciliacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    listarCooperativasAdmin(token)
      .then(setCooperativas)
      .catch(() => {
        // silencioso a propósito -- el filtro por cooperativa es una
        // comodidad, un fallo cargándolo no debe tapar el reporte.
      });
  }, []);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargando(true);
    setError(null);
    conciliacionAdmin(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el reporte."))
      .finally(() => setCargando(false));
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setAplicados({
      desde: desde || undefined,
      hasta: hasta || undefined,
      cooperativaId: cooperativaId || undefined,
      busqueda: busqueda.trim() || undefined,
      soloDiscrepancias,
      pagina: 1,
      limite: LIMITE_PAGINA,
    });
  }

  function limpiar() {
    setDesde("");
    setHasta("");
    setCooperativaId("");
    setBusqueda("");
    setSoloDiscrepancias(false);
    setPagina(1);
    setAplicados({ pagina: 1, limite: LIMITE_PAGINA });
  }

  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) : 1;
  const claseCampo =
    "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
  const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-brand-dark">Conciliación</h1>
      <p className="mt-1 text-sm text-brand-dark/70">
        Cruce de pago, tasa de terminal (SIAT3000) y comprobante electrónico, boleto por boleto.
      </p>

      <form
        onSubmit={filtrar}
        className="mt-6 grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"
      >
        <div>
          <label htmlFor="conc-desde" className={claseEtiqueta}>Desde</label>
          <input id="conc-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={claseCampo} />
        </div>
        <div>
          <label htmlFor="conc-hasta" className={claseEtiqueta}>Hasta</label>
          <input id="conc-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={claseCampo} />
        </div>
        <div>
          <label htmlFor="conc-coop" className={claseEtiqueta}>Cooperativa</label>
          <select id="conc-coop" value={cooperativaId} onChange={(e) => setCooperativaId(e.target.value)} className={claseCampo}>
            <option value="">Todas</option>
            {cooperativas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombreComercial}</option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="conc-busqueda" className={claseEtiqueta}>Buscar</label>
          <input
            id="conc-busqueda"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Código QR o cooperativa"
            className={claseCampo}
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <input
            id="conc-solo-discrepancias"
            type="checkbox"
            checked={soloDiscrepancias}
            onChange={(e) => setSoloDiscrepancias(e.target.checked)}
            className="h-4 w-4 rounded border-brand-light text-brand-cobalto focus:ring-brand-medium"
          />
          <label htmlFor="conc-solo-discrepancias" className="text-sm font-medium text-brand-dark/70">
            Solo con discrepancias
          </label>
        </div>
        <div className="flex gap-2 lg:col-span-6">
          <button type="submit" className="rounded-lg bg-brand-cobalto px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110">
            Filtrar
          </button>
          <button type="button" onClick={limpiar} className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40">
            Limpiar
          </button>
        </div>
      </form>

      {resultado && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Boletos con estos filtros</p>
            <p className="mt-1 font-display text-2xl font-bold text-brand-dark">{resultado.total}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Con discrepancia</p>
            <p className={`mt-1 font-display text-2xl font-bold ${resultado.totalConDiscrepancias > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {resultado.totalConDiscrepancias}
            </p>
          </div>
        </div>
      )}

      {error && <p className="mt-6 text-sm font-medium text-red-600">{error}</p>}
      {resultado === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}
      {resultado !== null && resultado.filas.length === 0 && !cargando && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">No hay boletos que coincidan con estos filtros.</p>
      )}

      {resultado !== null && resultado.filas.length > 0 && (
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
              {resultado.filas.map((f) => (
                <FilaTabla key={f.boletoId} f={f} />
              ))}
            </tbody>
          </table>

          {resultado.total > 0 && (
            <div className="flex items-center justify-between border-t border-black/5 px-4 py-3 text-sm text-brand-dark/70">
              <span>Página {pagina} de {totalPaginas}</span>
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
      )}
    </main>
  );
}
