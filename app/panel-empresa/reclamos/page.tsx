"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listarReclamosCoop,
  resumenReclamosCoop,
  tomarReclamoCoop,
  resolverReclamoCoop,
  ETIQUETA_TIPO_RECLAMO,
  type ReclamoCoop,
  type EstadoReclamo,
  type TipoReclamo,
  type FiltrosReclamosCoop,
  type ResultadoReclamos,
  type ResumenReclamosCoop,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const LIMITE_PAGINA = 25;

const ETIQUETA_ESTADO: Record<EstadoReclamo, string> = {
  abierto: "Abierto",
  en_revision: "En revisión",
  resuelto: "Procede",
  rechazado: "No procede",
};

const COLOR_ESTADO: Record<EstadoReclamo, string> = {
  abierto: "bg-amber-100 text-amber-700",
  en_revision: "bg-blue-100 text-blue-700",
  resuelto: "bg-emerald-100 text-emerald-700",
  rechazado: "bg-slate-100 text-slate-600",
};

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const claseCampo =
  "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

function TarjetaReclamo({
  reclamo,
  onCambio,
  onError,
}: {
  reclamo: ReclamoCoop;
  onCambio: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}) {
  const [respondiendo, setRespondiendo] = useState(false);
  const [decision, setDecision] = useState<"procede" | "no_procede">("procede");
  const [respuesta, setRespuesta] = useState("");
  const [monto, setMonto] = useState("");
  const [procesando, setProcesando] = useState(false);

  const abierto = reclamo.estado === "abierto" || reclamo.estado === "en_revision";
  const admiteMonto = decision === "procede" && reclamo.tipo === "cobro_reembolso";

  async function tomar() {
    const token = obtenerToken();
    if (!token) return;
    setProcesando(true);
    try {
      await tomarReclamoCoop(token, reclamo.id);
      onCambio("Reclamo en revisión.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo tomar el reclamo.");
    } finally {
      setProcesando(false);
    }
  }

  async function enviarRespuesta(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token) return;
    if (respuesta.trim().length < 10) {
      onError("Escribe una respuesta para el pasajero (mínimo 10 caracteres).");
      return;
    }
    const valorMonto = admiteMonto && monto.trim() !== "" ? Number(monto) : undefined;
    if (valorMonto !== undefined && (Number.isNaN(valorMonto) || valorMonto < 0)) {
      onError("El monto a devolver no es válido.");
      return;
    }
    setProcesando(true);
    try {
      await resolverReclamoCoop(token, reclamo.id, {
        decision,
        respuesta: respuesta.trim(),
        montoReconocido: valorMonto,
      });
      onCambio("Respuesta enviada — el pasajero recibirá un aviso por correo.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo enviar la respuesta.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-display font-bold text-brand-dark">
            {ETIQUETA_TIPO_RECLAMO[reclamo.tipo as TipoReclamo] ?? reclamo.tipo}
          </p>
          <p className="text-sm text-brand-dark/70">
            {reclamo.origenCiudad} → {reclamo.destinoCiudad} · {reclamo.fechaSalida}
          </p>
          <p className="text-xs text-brand-dark/40">Recibido {formatearFechaHora(reclamo.creadoEn)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_ESTADO[reclamo.estado]}`}>
          {ETIQUETA_ESTADO[reclamo.estado]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1 text-sm text-brand-dark/80 sm:grid-cols-2">
        <p className="break-words">
          <span className="text-brand-dark/50">Pasajero: </span>
          <span className="font-semibold">{reclamo.pasajeroNombre}</span>
        </p>
        <p className="break-words">
          <span className="text-brand-dark/50">Boleto pagado: </span>
          <span className="font-semibold">{formatearDolares(reclamo.montoBoleto)}</span>
        </p>
        {reclamo.pasajeroCorreo && (
          <p className="break-all">
            <span className="text-brand-dark/50">Correo: </span>
            {reclamo.pasajeroCorreo}
          </p>
        )}
        {reclamo.pasajeroTelefono && (
          <p className="break-words">
            <span className="text-brand-dark/50">Teléfono: </span>
            {reclamo.pasajeroTelefono}
          </p>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-brand-light/30 p-3 text-sm text-brand-dark">
        {reclamo.descripcion}
      </p>

      {!abierto && reclamo.respuesta && (
        <div className="mt-3 rounded-lg bg-emerald-50/60 p-3 text-sm text-brand-dark ring-1 ring-emerald-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">
            Tu respuesta{reclamo.resueltoEn ? ` · ${formatearFechaHora(reclamo.resueltoEn)}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words">{reclamo.respuesta}</p>
          {reclamo.montoReconocido !== null && (
            <p className="mt-1 font-semibold">Monto a devolver: {formatearDolares(reclamo.montoReconocido)}</p>
          )}
        </div>
      )}

      {abierto && !respondiendo && (
        <div className="mt-4 flex flex-wrap gap-2">
          {reclamo.estado === "abierto" && (
            <button
              onClick={tomar}
              disabled={procesando}
              className="rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark/80 transition hover:bg-brand-light/40 disabled:opacity-50"
            >
              {procesando ? "Guardando..." : "Tomar (en revisión)"}
            </button>
          )}
          <button
            onClick={() => setRespondiendo(true)}
            className="rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95"
          >
            Responder
          </button>
        </div>
      )}

      {abierto && respondiendo && (
        <form onSubmit={enviarRespuesta} className="mt-4 space-y-3 rounded-xl bg-brand-light/20 p-4">
          <fieldset>
            <legend className={claseEtiqueta}>Decisión</legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex items-center gap-2 text-sm text-brand-dark">
                <input
                  type="radio"
                  name={`decision-${reclamo.id}`}
                  checked={decision === "procede"}
                  onChange={() => setDecision("procede")}
                />
                Procede (a favor del pasajero)
              </label>
              <label className="flex items-center gap-2 text-sm text-brand-dark">
                <input
                  type="radio"
                  name={`decision-${reclamo.id}`}
                  checked={decision === "no_procede"}
                  onChange={() => setDecision("no_procede")}
                />
                No procede
              </label>
            </div>
          </fieldset>

          <div>
            <label htmlFor={`respuesta-${reclamo.id}`} className={claseEtiqueta}>
              Respuesta para el pasajero
            </label>
            <textarea
              id={`respuesta-${reclamo.id}`}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Explica qué decidiste y por qué"
              className={claseCampo}
            />
          </div>

          {admiteMonto && (
            <div>
              <label htmlFor={`monto-${reclamo.id}`} className={claseEtiqueta}>
                Monto a devolver (USD, opcional — máximo {formatearDolares(reclamo.montoBoleto)})
              </label>
              <input
                id={`monto-${reclamo.id}`}
                type="number"
                min="0"
                max={reclamo.montoBoleto}
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className={claseCampo}
              />
              <p className="mt-1 text-xs text-brand-dark/50">
                Solo queda registrado y se le informa al pasajero. La devolución la coordinas tú fuera de la plataforma.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={procesando}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {procesando ? "Enviando..." : "Enviar respuesta"}
            </button>
            <button
              type="button"
              onClick={() => setRespondiendo(false)}
              disabled={procesando}
              className="rounded-lg border border-brand-light px-4 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ReclamosPage() {
  const [resultado, setResultado] = useState<ResultadoReclamos<ReclamoCoop> | null>(null);
  const [resumen, setResumen] = useState<ResumenReclamosCoop | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");
  const [busquedaFiltro, setBusquedaFiltro] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosReclamosCoop>({ pagina: 1, limite: LIMITE_PAGINA });
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargando(true);
    setError(null);
    listarReclamosCoop(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los reclamos."))
      .finally(() => setCargando(false));
    resumenReclamosCoop(token)
      .then(setResumen)
      .catch(() => setResumen(null));
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  function aplicar(estado: string, tipo: string, desde: string, hasta: string, busqueda: string) {
    setPagina(1);
    setAplicados({
      estado: (estado || undefined) as EstadoReclamo | undefined,
      tipo: (tipo || undefined) as TipoReclamo | undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      busqueda: busqueda.trim() || undefined,
      pagina: 1,
      limite: LIMITE_PAGINA,
    });
  }

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    aplicar(estadoFiltro, tipoFiltro, desdeFiltro, hastaFiltro, busquedaFiltro);
  }

  function limpiarFiltros() {
    setEstadoFiltro("");
    setTipoFiltro("");
    setDesdeFiltro("");
    setHastaFiltro("");
    setBusquedaFiltro("");
    setPagina(1);
    setAplicados({ pagina: 1, limite: LIMITE_PAGINA });
  }

  function filtrarPorEstado(estado: EstadoReclamo) {
    setEstadoFiltro(estado);
    aplicar(estado, tipoFiltro, desdeFiltro, hastaFiltro, busquedaFiltro);
  }

  const totalPaginas = Math.max(1, Math.ceil((resultado?.total ?? 0) / LIMITE_PAGINA));
  const hayFiltros = !!(aplicados.estado || aplicados.tipo || aplicados.desde || aplicados.hasta || aplicados.busqueda);

  const contadores: { estado: EstadoReclamo; valor: number | undefined; color: string }[] = [
    { estado: "abierto", valor: resumen?.abiertos, color: "text-amber-700" },
    { estado: "en_revision", valor: resumen?.enRevision, color: "text-blue-700" },
    { estado: "resuelto", valor: resumen?.resueltos, color: "text-emerald-700" },
    { estado: "rechazado", valor: resumen?.rechazados, color: "text-slate-600" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />

      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Reclamos</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Reclamos de pasajeros sobre boletos de tu cooperativa. Respóndelos aquí: el pasajero recibe tu respuesta por
          correo. Si un reclamo procede, puedes registrar cuánto reconoces devolver (la devolución se coordina fuera de
          la plataforma).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {contadores.map((c) => (
          <button
            key={c.estado}
            type="button"
            onClick={() => filtrarPorEstado(c.estado)}
            className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition hover:bg-brand-light/30 ${
              aplicados.estado === c.estado ? "ring-2 ring-brand" : "ring-black/5"
            }`}
          >
            <p className={`font-display text-2xl font-extrabold ${c.color}`}>{c.valor ?? "—"}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">
              {ETIQUETA_ESTADO[c.estado]}
            </p>
          </button>
        ))}
      </div>

      <form
        onSubmit={filtrar}
        className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="reclamo-filtro-estado" className={claseEtiqueta}>
            Estado
          </label>
          <select
            id="reclamo-filtro-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className={claseCampo}
          >
            <option value="">Todos</option>
            <option value="abierto">Abiertos</option>
            <option value="en_revision">En revisión</option>
            <option value="resuelto">Procede</option>
            <option value="rechazado">No procede</option>
          </select>
        </div>
        <div>
          <label htmlFor="reclamo-filtro-tipo" className={claseEtiqueta}>
            Tipo
          </label>
          <select
            id="reclamo-filtro-tipo"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className={claseCampo}
          >
            <option value="">Todos</option>
            {Object.entries(ETIQUETA_TIPO_RECLAMO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="reclamo-filtro-desde" className={claseEtiqueta}>
            Recibido desde
          </label>
          <input
            id="reclamo-filtro-desde"
            type="date"
            value={desdeFiltro}
            onChange={(e) => setDesdeFiltro(e.target.value)}
            className={claseCampo}
          />
        </div>
        <div>
          <label htmlFor="reclamo-filtro-hasta" className={claseEtiqueta}>
            Recibido hasta
          </label>
          <input
            id="reclamo-filtro-hasta"
            type="date"
            value={hastaFiltro}
            onChange={(e) => setHastaFiltro(e.target.value)}
            className={claseCampo}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reclamo-filtro-busqueda" className={claseEtiqueta}>
            Buscar
          </label>
          <input
            id="reclamo-filtro-busqueda"
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            placeholder="Pasajero, correo, ciudad o texto del reclamo"
            className={claseCampo}
          />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark sm:flex-none"
          >
            Filtrar
          </button>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40"
          >
            Limpiar
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {resultado === null && !error && <p className="text-sm text-brand-dark/50">Cargando...</p>}

      {resultado !== null && resultado.total === 0 && !cargando && (
        <p className="rounded-2xl bg-white px-6 py-8 text-center text-sm text-brand-dark/50 shadow-sm ring-1 ring-black/5">
          {hayFiltros ? "No hay reclamos que coincidan con estos filtros." : "Todavía no has recibido ningún reclamo."}
        </p>
      )}

      <div className="space-y-3">
        {resultado?.filas.map((r) => (
          <TarjetaReclamo
            key={r.id}
            reclamo={r}
            onCambio={(mensaje) => {
              setMensajeExito(mensaje);
              cargar();
            }}
            onError={setMensajeError}
          />
        ))}
      </div>

      {resultado !== null && resultado.total > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-brand-dark/70 shadow-sm ring-1 ring-black/5">
          <span>
            {resultado.total} reclamo(s) · Página {pagina} de {totalPaginas}
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
  );
}
