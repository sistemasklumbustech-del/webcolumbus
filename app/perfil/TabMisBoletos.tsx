"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { listarMisBoletos, calificarViaje, cancelarBoleto, descargarBoletoPdf, type ResultadoMisBoletos } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { CodigoQr } from "@/components/CodigoQr";
import { SolicitarFactura } from "./SolicitarFactura";
import { ReportarProblema } from "./ReportarProblema";

const LIMITE_PAGINA = 10;

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BotonMostrarQr({ codigoQr }: { codigoQr: string }) {
  const [mostrando, setMostrando] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setMostrando((v) => !v)}
        className="block text-xs font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-brand-dark"
      >
        {mostrando ? "Ocultar código QR" : "Ver código QR"}
      </button>
      {mostrando && (
        <div className="mt-2 flex justify-center rounded-lg bg-brand-light/30 p-4">
          <CodigoQr valor={codigoQr} />
        </div>
      )}
    </div>
  );
}

/** Ítem 13, Fase 2 (05-ago-2026) -- descarga de boleto en PDF con logo, datos organizados y QR grande. */
function BotonDescargarPdf({
  boletoId,
  onError,
}: {
  boletoId: string;
  onError: (mensaje: string) => void;
}) {
  const [descargando, setDescargando] = useState(false);

  async function descargar() {
    const token = tokenValido();
    if (!token) return;
    setDescargando(true);
    try {
      await descargarBoletoPdf(token, boletoId);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo descargar el boleto.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <button
      onClick={descargar}
      disabled={descargando}
      className="mt-2 block text-xs font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-brand-dark disabled:opacity-50"
    >
      {descargando ? "Generando PDF..." : "Descargar boleto en PDF"}
    </button>
  );
}

function BotonCancelar({
  boletoId,
  onCancelado,
  onError,
}: {
  boletoId: string;
  onCancelado: () => void;
  onError: (mensaje: string) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  async function confirmar() {
    const token = tokenValido();
    if (!token) return;
    setCancelando(true);
    try {
      await cancelarBoleto(token, boletoId);
      onCancelado();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo cancelar el boleto.");
    } finally {
      setCancelando(false);
      setConfirmando(false);
    }
  }

  if (confirmando) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-brand-dark/70">¿Seguro que quieres cancelar este boleto?</span>
        <button
          onClick={confirmar}
          disabled={cancelando}
          className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {cancelando ? "Cancelando..." : "Sí, cancelar"}
        </button>
        <button
          onClick={() => setConfirmando(false)}
          className="rounded-lg border border-brand-light px-3 py-1 text-xs text-brand-dark/70 hover:bg-brand-light/40"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="mt-2 text-xs font-semibold text-red-600 underline decoration-dotted underline-offset-2 hover:text-red-700"
    >
      Cancelar boleto
    </button>
  );
}

function FormularioCalificar({ boletoId, onEnviado }: { boletoId: string; onEnviado: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [puntuacion, setPuntuacion] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Calificar viaje
      </button>
    );
  }

  async function enviar() {
    const token = tokenValido();
    if (!token) {
      setError("Tu sesión expiró — vuelve a iniciar sesión.");
      return;
    }
    if (puntuacion === 0) return;
    setEnviando(true);
    setError(null);
    try {
      await calificarViaje(token, boletoId, puntuacion, comentario.trim() || undefined);
      onEnviado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la calificación.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg bg-brand-light/30 p-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPuntuacion(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} estrellas`}
            className="text-2xl leading-none"
          >
            <span className={n <= (hover || puntuacion) ? "text-amber-500" : "text-brand-dark/20"}>★</span>
          </button>
        ))}
      </div>
      {puntuacion > 0 && (
        <>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Cuéntanos más (opcional)"
            rows={2}
            maxLength={500}
            className="mt-2 w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="mt-2 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Enviar"}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function TabMisBoletos({ onExito }: { onExito: (mensaje: string) => void }) {
  const [boletos, setBoletos] = useState<ResultadoMisBoletos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<"" | "vigente" | "usado" | "cancelado">("");
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);

  // Recarga la lista actual (después de cancelar o calificar un boleto).
  const cargar = () => setVersion((v) => v + 1);

  // Se aplica al cambiar cualquier filtro, sin recargar la página; la pequeña espera evita una consulta por letra.
  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    let vigente = true;
    setCargando(true);
    const espera = setTimeout(() => {
      listarMisBoletos(token, {
        estado: estado || undefined,
        busqueda: busqueda.trim() || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        pagina,
        limite: LIMITE_PAGINA,
      })
        .then((r) => {
          if (!vigente) return;
          setBoletos(r);
          setError(null);
        })
        .catch((err) => {
          if (vigente) setError(err instanceof Error ? err.message : "No se pudieron cargar tus boletos.");
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [estado, busqueda, desde, hasta, pagina, version]);

  const hayFiltros = estado !== "" || busqueda.trim() !== "" || desde !== "" || hasta !== "";
  const totalPaginas = Math.max(1, Math.ceil((boletos?.total ?? 0) / LIMITE_PAGINA));
  const claseCampo =
    "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium";
  const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-dark/70">
          Tu historial de viajes comprados. Podrás calificar cada uno después de la hora estimada de llegada.
        </p>
        <Link
          href="/"
          className="shrink-0 rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95"
        >
          Comprar un boleto
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="mb-buscar" className={claseEtiqueta}>
            Buscar
          </label>
          <input
            id="mb-buscar"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Ciudad o cooperativa"
            className={claseCampo}
          />
        </div>
        <div>
          <label htmlFor="mb-estado" className={claseEtiqueta}>
            Estado
          </label>
          <select
            id="mb-estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as typeof estado);
              setPagina(1);
            }}
            className={claseCampo}
          >
            <option value="">Todos</option>
            <option value="vigente">Vigentes</option>
            <option value="usado">Usados</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>
        <div>
          <label htmlFor="mb-desde" className={claseEtiqueta}>
            Salida desde
          </label>
          <input
            id="mb-desde"
            type="date"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setPagina(1);
            }}
            className={claseCampo}
          />
        </div>
        <div>
          <label htmlFor="mb-hasta" className={claseEtiqueta}>
            Salida hasta
          </label>
          <input
            id="mb-hasta"
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => {
              setHasta(e.target.value);
              setPagina(1);
            }}
            className={claseCampo}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setEstado("");
              setBusqueda("");
              setDesde("");
              setHasta("");
              setPagina(1);
            }}
            disabled={!hayFiltros}
            className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm font-semibold text-brand-dark/70 hover:bg-brand-light/40 disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {boletos === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {boletos !== null && boletos.total === 0 && hayFiltros && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">No encontramos boletos con estos filtros.</p>
      )}

      {boletos !== null && boletos.total === 0 && !hayFiltros && (
        <div className="mt-8 text-center">
          <p className="text-sm text-brand-dark/50">Todavía no tienes boletos comprados.</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-brand-amber px-5 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-95"
          >
            Buscar pasajes
          </Link>
        </div>
      )}

      <div className={`mt-6 space-y-3 transition-opacity ${cargando && boletos !== null ? "opacity-60" : ""}`}>
        {boletos?.filas.map((b) => {
          const referenciaLlegada = b.horaLlegadaEstimada ?? b.horaSalidaProgramada;
          const yaLlego = new Date() >= new Date(referenciaLlegada);
          return (
            <div key={b.boletoId} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <p className="font-display font-bold text-brand-dark">
                {b.origenCiudad} → {b.destinoCiudad}
              </p>
              <p className="text-sm text-brand-dark/70">
                {b.cooperativaNombre} · Sale {formatearFechaHora(b.horaSalidaProgramada)}
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  b.estado === "cancelado"
                    ? "bg-red-100 text-red-700"
                    : b.estado === "usado"
                      ? "bg-slate-100 text-slate-600"
                      : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {b.estado === "cancelado" ? "Cancelado" : b.estado === "usado" ? "Usado" : "Vigente"}
              </span>

              {b.estado === "vigente" && <BotonMostrarQr codigoQr={b.codigoQr} />}
              {b.estado === "vigente" && (
                <BotonDescargarPdf boletoId={b.boletoId} onError={setError} />
              )}

              {b.estado !== "cancelado" && <SolicitarFactura boletoId={b.boletoId} />}

              <ReportarProblema
                boletoId={b.boletoId}
                onEnviado={() => onExito("Reclamo enviado — la cooperativa te responderá por correo. Sigue el estado en \"Mis reclamos\".")}
              />

              {b.estado === "vigente" && new Date() < new Date(b.horaSalidaProgramada) && (
                <BotonCancelar
                  boletoId={b.boletoId}
                  onCancelado={() => {
                    onExito("Boleto cancelado — el asiento quedó libre para otro pasajero.");
                    cargar();
                  }}
                  onError={setError}
                />
              )}

              <div className="mt-3">
                {b.estado !== "vigente" ? null : b.yaCalificado ? (
                  <p className="text-sm font-medium text-emerald-600">Ya calificaste este viaje. ¡Gracias!</p>
                ) : b.puedeCalificar ? (
                  <FormularioCalificar
                    boletoId={b.boletoId}
                    onEnviado={() => {
                      onExito("¡Gracias por calificar tu viaje!");
                      cargar();
                    }}
                  />
                ) : (
                  <p className="text-xs text-brand-dark/40">
                    Podrás calificar este viaje después de tu llegada estimada
                    {b.horaLlegadaEstimada && ` (${formatearFechaHora(b.horaLlegadaEstimada)})`}
                    {!yaLlego && !b.horaLlegadaEstimada && ""}.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {boletos !== null && boletos.total > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-brand-dark/70 shadow-sm ring-1 ring-black/5">
          <span>
            {boletos.total} boleto{boletos.total === 1 ? "" : "s"} · Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || cargando}
              className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || cargando}
              className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}
