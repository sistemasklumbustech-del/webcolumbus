"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { listarMisBoletos, calificarViaje, cancelarBoleto, descargarBoletoPdf, type MiBoleto, type ResultadoMisBoletos } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { CodigoQr } from "@/components/CodigoQr";
import { AccesoAnden } from "@/components/AccesoAnden";
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
        <div className="mt-2 flex justify-center kb-on-white rounded-ctrl bg-kbbg p-4">
          <CodigoQr valor={codigoQr} />
        </div>
      )}
    </div>
  );
}

/** Código de acceso al andén (tasa del terminal): el QR del torniquete, distinto del QR del boleto. */
function BotonMostrarAnden({ estado, codigo }: { estado: MiBoleto["estadoTasa"]; codigo: string | null }) {
  const [mostrando, setMostrando] = useState(false);
  if (estado === "no_aplica") return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setMostrando((v) => !v)}
        className="block text-xs font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-brand-dark"
      >
        {mostrando ? "Ocultar acceso al andén" : estado === "lista" ? "Ver acceso al andén" : "Acceso al andén (en proceso)"}
      </button>
      {mostrando && <AccesoAnden estado={estado} codigo={codigo} />}
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
        <span className="text-xs text-muted-2">¿Seguro que quieres cancelar este boleto?</span>
        <button
          onClick={confirmar}
          disabled={cancelando}
          className="kb-btn !h-9 !px-3 !text-xs bg-kberror text-white disabled:opacity-50"
        >
          {cancelando ? "Cancelando..." : "Sí, cancelar"}
        </button>
        <button
          onClick={() => setConfirmando(false)}
          className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="mt-2 text-xs font-semibold text-kberror underline decoration-dotted underline-offset-2 hover:text-kberror"
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
        className="kb-btn kb-btn--dark !h-10 !px-4 !text-sm"
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
    <div className="mt-2 kb-on-white rounded-ctrl bg-kbbg p-3">
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
            className="mt-2 kb-input"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="mt-2 kb-btn kb-btn--dark !h-10 !px-4 !text-sm"
          >
            {enviando ? "Enviando..." : "Enviar"}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-xs font-medium text-kberror">{error}</p>}
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
    "kb-input";
  const claseEtiqueta = "kb-label";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-2">
          Tu historial de viajes comprados. Podrás calificar cada uno después de la hora estimada de llegada.
        </p>
        <Link
          href="/"
          className="shrink-0 kb-btn kb-btn--primary !h-11 !px-5 !text-sm"
        >
          Comprar un boleto
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 kb-card kb-on-white p-4 sm:grid-cols-4">
        <div className="col-span-2">
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
        <div className="col-span-2 sm:col-span-1">
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
        <div className="col-span-1 sm:col-span-2 sm:col-start-1 sm:row-start-2">
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
        <div className="col-span-1 sm:col-span-2 sm:row-start-2">
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
        <div className="col-span-2 flex items-end sm:col-span-1 sm:col-start-4 sm:row-start-1">
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
            className="kb-btn kb-btn--outline w-full !h-[54px] !text-sm"
          >
            Limpiar
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 kb-alert kb-alert--error">
          {error}
        </div>
      )}

      {boletos === null && !error && <p className="mt-6 text-sm text-muted-2">Cargando...</p>}

      {boletos !== null && boletos.total === 0 && hayFiltros && (
        <p className="mt-8 text-center text-sm text-muted-2">No encontramos boletos con estos filtros.</p>
      )}

      {boletos !== null && boletos.total === 0 && !hayFiltros && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-2">Todavía no tienes boletos comprados.</p>
          <Link
            href="/"
            className="mt-4 inline-block kb-btn kb-btn--primary !h-11 !px-5 !text-sm"
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
            <div key={b.boletoId} className="kb-card kb-on-white p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-semibold md:text-[17px]">
                    {b.origenCiudad} → {b.destinoCiudad}
                  </p>
                  <p className="text-sm text-muted-2">
                    {b.cooperativaNombre} · Sale {formatearFechaHora(b.horaSalidaProgramada)}
                  </p>
                </div>
                <span
                  className={`kb-status shrink-0 ${
                    b.estado === "cancelado"
                      ? "kb-status--error"
                      : b.estado === "usado"
                        ? "kb-status--off"
                        : "kb-status--ok"
                  }`}
                >
                  {b.estado === "cancelado" ? "Cancelado" : b.estado === "usado" ? "Usado" : "Vigente"}
                </span>
              </div>
              <div className="mt-3 border-t border-dashed border-line pt-1">
              {b.estado === "vigente" && <BotonMostrarQr codigoQr={b.codigoQr} />}
              {b.estado === "vigente" && <BotonMostrarAnden estado={b.estadoTasa} codigo={b.codigoTasa} />}
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
                  <p className="text-sm font-medium text-ok">Ya calificaste este viaje. ¡Gracias!</p>
                ) : b.puedeCalificar ? (
                  <FormularioCalificar
                    boletoId={b.boletoId}
                    onEnviado={() => {
                      onExito("¡Gracias por calificar tu viaje!");
                      cargar();
                    }}
                  />
                ) : (
                  <p className="text-xs text-muted-3">
                    Podrás calificar este viaje después de tu llegada estimada
                    {b.horaLlegadaEstimada && ` (${formatearFechaHora(b.horaLlegadaEstimada)})`}
                    {!yaLlego && !b.horaLlegadaEstimada && ""}.
                  </p>
                )}
              </div>
              </div>
            </div>
          );
        })}
      </div>

      {boletos !== null && boletos.total > 0 && (
        <div className="mt-4 flex items-center justify-between kb-card kb-on-white px-4 py-3 text-sm text-muted-2">
          <span>
            {boletos.total} boleto{boletos.total === 1 ? "" : "s"} · Página {pagina} de {totalPaginas}
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
    </>
  );
}
