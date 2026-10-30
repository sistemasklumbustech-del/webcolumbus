"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { listarMisBoletos, calificarViaje, cancelarBoleto, descargarBoletoPdf, type MiBoleto, type ResultadoMisBoletos } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { BoletoTarjeta } from "@/components/BoletoTarjeta";
import { BoletoAcciones } from "@/components/BoletoAcciones";
import { fechaBoleto, horaBoleto, numeroBoleto, vistaDeMiBoleto } from "@/lib/boleto";
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
      className="min-h-11 text-left text-sm font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink disabled:opacity-50"
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
      <div className="flex flex-wrap items-center gap-2 rounded-ctrl bg-kberror-bg p-3">
        <span className="w-full text-sm font-medium text-kberror sm:w-auto">¿Seguro que quieres cancelar este boleto?</span>
        <button
          onClick={confirmar}
          disabled={cancelando}
          className="kb-btn !h-10 !px-4 !text-sm bg-kberror text-white disabled:opacity-50"
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
      className="min-h-11 text-left text-sm font-semibold text-kberror underline decoration-kberror/40 underline-offset-4 hover:decoration-kberror"
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
            <span className={n <= (hover || puntuacion) ? "text-kbyellow" : "text-line-2"}>★</span>
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


const ZONA = "America/Guayaquil";
/** Fecha de hoy en Ecuador, "YYYY-MM-DD" (los filtros de la API son sobre la fecha de salida). */
function hoyEcuador(desplazamientoDias = 0): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
  const d = new Date(`${hoy}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + desplazamientoDias);
  return d.toISOString().slice(0, 10);
}
function diaEcuador(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(iso));
}

/**
 * Etiqueta para encontrar rápido el boleto (solo en pantalla: no cambia estados ni datos).
 * "Hoy · sale en 2 h 15 min", "Mañana · 16:00", "Salió 09:00", o la fecha.
 */
function etiquetaSalida(iso: string, ahora: number): { texto: string; tono: "hoy" | "pronto" | "salio" | "normal" } {
  const salida = new Date(iso).getTime();
  const hora = horaBoleto(iso);
  if (salida <= ahora) return { texto: `Salió ${hora}`, tono: "salio" };
  if (diaEcuador(iso) === hoyEcuador()) {
    const minutos = Math.round((salida - ahora) / 60000);
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return { texto: `Hoy · sale en ${h > 0 ? `${h} h ` : ""}${m} min`, tono: "hoy" };
  }
  if (diaEcuador(iso) === hoyEcuador(1)) return { texto: `Mañana · ${hora}`, tono: "pronto" };
  return { texto: fechaBoleto(iso), tono: "normal" };
}

function Etiqueta({ texto, tono }: { texto: string; tono: "hoy" | "pronto" | "salio" | "normal" }) {
  const clase =
    tono === "hoy"
      ? "bg-kbyellow text-ink"
      : tono === "pronto"
        ? "bg-kbyellow-soft text-ink"
        : tono === "salio"
          ? "bg-kbbg text-muted-2"
          : "bg-kbbg text-ink";
  return <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${clase}`}>{texto}</span>;
}

function EstadoBoleto({ estado }: { estado: string }) {
  return (
    <span className={`kb-status shrink-0 ${estado === "cancelado" ? "kb-status--error" : estado === "usado" ? "kb-status--off" : "kb-status--ok"}`}>
      {estado === "cancelado" ? "Cancelado" : estado === "usado" ? "Usado" : "Vigente"}
    </span>
  );
}

function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${abierto ? "rotate-180" : ""}`}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Factura, reclamo y cancelar: a mano pero sin estorbar (cancelar siempre pide confirmación). */
function MasOpciones({
  boleto,
  conPdf,
  onExito,
  onError,
  onCambio,
}: {
  boleto: MiBoleto;
  conPdf: boolean;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onCambio: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const puedeCancelar = boleto.estado === "vigente" && new Date() < new Date(boleto.horaSalidaProgramada);
  return (
    <div className={abierto ? "basis-full" : ""}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted-2 hover:text-ink"
      >
        Más opciones
        <Chevron abierto={abierto} />
      </button>
      {abierto && (
        <div className="mt-1 flex flex-col items-start gap-0.5 rounded-ctrl border border-line px-4 py-2">
          {conPdf && boleto.estado === "vigente" && <BotonDescargarPdf boletoId={boleto.boletoId} onError={onError} />}
          {boleto.estado !== "cancelado" && <SolicitarFactura boletoId={boleto.boletoId} />}
          <ReportarProblema
            boletoId={boleto.boletoId}
            onEnviado={() => onExito('Reclamo enviado — la cooperativa te responderá por correo. Sigue el estado en "Mis reclamos".')}
          />
          {puedeCancelar && (
            <BotonCancelar
              boletoId={boleto.boletoId}
              onCancelado={() => {
                onExito("Boleto cancelado — el asiento quedó libre para otro pasajero.");
                onCambio();
              }}
              onError={onError}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** El boleto completo con Descargar y Compartir (mismo diseño que la confirmación). */
function BoletoCompleto({
  boleto,
  onExito,
  onError,
  onCambio,
}: {
  boleto: MiBoleto;
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onCambio: () => void;
}) {
  const vista = vistaDeMiBoleto(boleto);
  const anden = { estadoTasa: boleto.estadoTasa, codigoTasa: boleto.codigoTasa };
  // Con espacio (PC) y el boleto de pie, los botones van a su derecha en vez de debajo.
  return (
    <div className="@container">
      <div className="flex flex-col gap-3 @[46rem]:flex-row @[46rem]:items-start @[46rem]:gap-6">
        <div className="min-w-0 @[46rem]:w-[440px] @[46rem]:shrink-0">
          <BoletoTarjeta boleto={vista} anden={boleto.estadoTasa === "no_aplica" ? null : anden} alinear="inicio" />
        </div>
        <div className="flex min-w-0 flex-col gap-3 @[46rem]:flex-1 @[46rem]:pt-1">
          <p className="hidden text-sm text-muted-2 @[46rem]:block">
            Muestra el QR al subir al bus. También puedes descargarlo en PDF o compartir los datos del viaje.
          </p>
          <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center">
            <BoletoAcciones grupos={[{ clave: boleto.boletoId, tramo: null, boletos: [vista] }]} codigosAnden={{ [boleto.boletoId]: anden }} hojaImpresion={false} />
          </div>
          <MasOpciones boleto={boleto} conPdf={false} onExito={onExito} onError={onError} onCambio={onCambio} />
        </div>
      </div>
    </div>
  );
}

/** Calificar: solo después de la llegada estimada (lo decide la API con puedeCalificar). */
function Calificacion({ boleto, onExito, onCambio }: { boleto: MiBoleto; onExito: (m: string) => void; onCambio: () => void }) {
  if (boleto.estado !== "vigente") return null;
  if (boleto.yaCalificado) return <p className="text-sm font-medium text-ok">Ya calificaste este viaje. ¡Gracias!</p>;
  if (boleto.puedeCalificar)
    return (
      <FormularioCalificar
        boletoId={boleto.boletoId}
        onEnviado={() => {
          onExito("¡Gracias por calificar tu viaje!");
          onCambio();
        }}
      />
    );
  return (
    <p className="text-xs text-muted-3">
      Podrás calificar este viaje después de tu llegada estimada
      {boleto.horaLlegadaEstimada && ` (${formatearFechaHora(boleto.horaLlegadaEstimada)})`}.
    </p>
  );
}

/** Tarjeta corta: ruta, fecha, hora, cooperativa y N.º; se abre al boleto completo. */
function TarjetaCorta({
  boleto,
  ahora,
  modo,
  onExito,
  onError,
  onCambio,
}: {
  boleto: MiBoleto;
  ahora: number;
  modo: "proximo" | "historial";
  onExito: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onCambio: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const futuro = new Date(boleto.horaSalidaProgramada).getTime() > ahora;
  const puedeAbrir = boleto.estado === "vigente" && (modo === "proximo" || futuro);
  const etiqueta = etiquetaSalida(boleto.horaSalidaProgramada, ahora);
  return (
    <article className="kb-card kb-on-white p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold md:text-[17px]">
            {boleto.origenCiudad} → {boleto.destinoCiudad}
          </p>
          <p className="mt-0.5 text-sm text-muted-2">
            {fechaBoleto(boleto.horaSalidaProgramada)} · {horaBoleto(boleto.horaSalidaProgramada)} · {boleto.cooperativaNombre}
          </p>
          <p className="mt-1 text-xs font-semibold tracking-[.08em] text-muted-3 tabular-nums">
            N.º {numeroBoleto(boleto.boletoId)}
            {boleto.numeroAsiento ? ` · Asiento ${boleto.numeroAsiento}` : ""}
          </p>
        </div>
        {modo === "proximo" ? <Etiqueta {...etiqueta} /> : <EstadoBoleto estado={boleto.estado} />}
      </div>

      {modo === "historial" && (
        <div className="mt-3">
          <Calificacion boleto={boleto} onExito={onExito} onCambio={onCambio} />
        </div>
      )}

      {abierto ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-expanded
            className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink"
          >
            Ocultar boleto
            <Chevron abierto />
          </button>
          <BoletoCompleto boleto={boleto} onExito={onExito} onError={onError} onCambio={onCambio} />
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-start gap-x-5 gap-y-1">
          {puedeAbrir && (
            <button
              type="button"
              onClick={() => setAbierto(true)}
              aria-expanded={false}
              className="kb-btn kb-btn--outline !h-11 !px-4 !text-sm"
            >
              Ver boleto y QR
              <Chevron abierto={false} />
            </button>
          )}
          <MasOpciones boleto={boleto} conPdf onExito={onExito} onError={onError} onCambio={onCambio} />
        </div>
      )}
    </article>
  );
}

type Filtro = "" | "vigente" | "usado" | "cancelado";

export function TabMisBoletos({ onExito }: { onExito: (mensaje: string) => void }) {
  const [proximos, setProximos] = useState<MiBoleto[] | null>(null);
  const [historial, setHistorial] = useState<ResultadoMisBoletos | null>(null);
  // Cancelados y usados con salida de hoy en adelante: no son "próximos" y tampoco entran en el
  // historial por fecha (que llega hasta ayer); se muestran arriba del historial.
  const [recientes, setRecientes] = useState<MiBoleto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<Filtro>("");
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);
  const [ahora, setAhora] = useState(() => Date.now());

  const cargar = () => setVersion((v) => v + 1);
  const hayFiltros = estado !== "" || busqueda.trim() !== "" || desde !== "" || hasta !== "";

  // La etiqueta "sale en…" se actualiza cada minuto.
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Próximos viajes: los vigentes con salida de hoy en adelante (máximo 50, más que suficiente para
  // una persona), ordenados del más cercano al más lejano. Se piden aparte porque la API ordena
  // la lista de la salida más lejana a la más cercana.
  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    let vigente = true;
    const hoy = hoyEcuador();
    Promise.all([
      listarMisBoletos(token, { estado: "vigente", desde: hoy, pagina: 1, limite: 50 }),
      listarMisBoletos(token, { estado: "cancelado", desde: hoy, pagina: 1, limite: 50 }),
      listarMisBoletos(token, { estado: "usado", desde: hoy, pagina: 1, limite: 50 }),
    ])
      .then(([vig, can, usa]) => {
        if (!vigente) return;
        setProximos(vig.filas);
        setRecientes([...can.filas, ...usa.filas]);
      })
      .catch((err) => {
        if (vigente) setError(err instanceof Error ? err.message : "No se pudieron cargar tus boletos.");
      });
    return () => {
      vigente = false;
    };
  }, [version]);

  // Historial (o resultados de búsqueda): paginado como siempre; sin filtros, hasta ayer.
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
        hasta: hayFiltros ? hasta || undefined : hoyEcuador(-1),
        pagina,
        limite: LIMITE_PAGINA,
      })
        .then((r) => {
          if (!vigente) return;
          setHistorial(r);
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
  }, [estado, busqueda, desde, hasta, pagina, version, hayFiltros]);

  // Primero los que aún no salen (del más cercano al más lejano); al final, los de hoy que ya salieron.
  const proximosOrdenados = useMemo(() => {
    if (!proximos) return [];
    const porSalida = (a: MiBoleto, b: MiBoleto) =>
      new Date(a.horaSalidaProgramada).getTime() - new Date(b.horaSalidaProgramada).getTime();
    const porSalir = proximos.filter((b) => new Date(b.horaSalidaProgramada).getTime() > ahora).sort(porSalida);
    const salieron = proximos.filter((b) => new Date(b.horaSalidaProgramada).getTime() <= ahora).sort(porSalida);
    return [...porSalir, ...salieron];
  }, [proximos, ahora]);

  const destacado = proximosOrdenados.find((b) => new Date(b.horaSalidaProgramada).getTime() > ahora) ?? null;
  const restoProximos = proximosOrdenados.filter((b) => b !== destacado);
  const totalPaginas = Math.max(1, Math.ceil((historial?.total ?? 0) / LIMITE_PAGINA));
  const sinNada =
    !hayFiltros && proximos !== null && historial !== null && proximos.length === 0 && recientes.length === 0 && historial.total === 0;
  const comunes = { ahora, onExito, onError: setError, onCambio: cargar };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => setBuscadorAbierto((v) => !v)}
          aria-expanded={buscadorAbierto || hayFiltros}
          aria-controls="mb-buscador"
          className="kb-btn kb-btn--outline !h-11 flex-1 !px-4 !text-sm sm:flex-none"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          Buscar en mis viajes
          {hayFiltros && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-kbyellow px-1.5 text-[11px] font-bold">•</span>}
        </button>
        <Link href="/" className="kb-btn kb-btn--primary !h-11 flex-1 !px-5 !text-sm sm:flex-none">
          Comprar un boleto
        </Link>
      </div>

      {(buscadorAbierto || hayFiltros) && (
        <div id="mb-buscador" className="mt-3 grid grid-cols-2 gap-3 kb-card kb-on-white p-4 sm:grid-cols-4">
          <div className="col-span-2">
            <label htmlFor="mb-buscar" className="kb-label">
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
              className="kb-input"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="mb-estado" className="kb-label">
              Estado
            </label>
            <select
              id="mb-estado"
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value as Filtro);
                setPagina(1);
              }}
              className="kb-input"
            >
              <option value="">Todos</option>
              <option value="vigente">Vigentes</option>
              <option value="usado">Usados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
          <div className="col-span-1 sm:col-span-2 sm:col-start-1 sm:row-start-2">
            <label htmlFor="mb-desde" className="kb-label">
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
              className="kb-input"
            />
          </div>
          <div className="col-span-1 sm:col-span-2 sm:row-start-2">
            <label htmlFor="mb-hasta" className="kb-label">
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
              className="kb-input"
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
      )}

      {error && <div className="mt-4 kb-alert kb-alert--error">{error}</div>}

      {(proximos === null || historial === null) && !error && <p className="mt-6 text-sm text-muted-2">Cargando...</p>}

      {sinNada && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-2">Todavía no tienes boletos comprados.</p>
          <Link href="/" className="mt-4 inline-block kb-btn kb-btn--primary !h-11 !px-5 !text-sm">
            Buscar pasajes
          </Link>
        </div>
      )}

      {/* Sin filtros: primero el próximo viaje, luego los demás próximos y al final el historial. */}
      {!hayFiltros && proximos !== null && historial !== null && !sinNada && (
        <>
          <section aria-labelledby="mb-proximo" className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="mb-proximo" className="text-lg font-semibold">
                Tu próximo viaje
              </h2>
              {destacado && <Etiqueta {...etiquetaSalida(destacado.horaSalidaProgramada, ahora)} />}
            </div>
            {destacado ? (
              <BoletoCompleto boleto={destacado} onExito={onExito} onError={setError} onCambio={cargar} />
            ) : (
              <div className="kb-card kb-on-white flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-2">No tienes viajes próximos.</p>
                <Link href="/" className="kb-btn kb-btn--primary !h-11 !px-5 !text-sm">
                  Buscar pasajes
                </Link>
              </div>
            )}
          </section>

          {restoProximos.length > 0 && (
            <section aria-labelledby="mb-proximos" className="mt-8">
              <h2 id="mb-proximos" className="mb-3 text-lg font-semibold">
                Próximos viajes <span className="text-muted-3">· {restoProximos.length}</span>
              </h2>
              <div className="space-y-3">
                {restoProximos.map((b) => (
                  <TarjetaCorta key={b.boletoId} boleto={b} modo="proximo" {...comunes} />
                ))}
              </div>
            </section>
          )}

          {(recientes.length > 0 || historial.total > 0) && (
            <section aria-labelledby="mb-anteriores" className="mt-8">
              <h2 id="mb-anteriores" className="mb-3 text-lg font-semibold">
                Viajes anteriores
              </h2>
              <div className={`space-y-3 transition-opacity ${cargando ? "opacity-60" : ""}`}>
                {pagina === 1 && recientes.map((b) => <TarjetaCorta key={b.boletoId} boleto={b} modo="historial" {...comunes} />)}
                {historial.filas.map((b) => (
                  <TarjetaCorta key={b.boletoId} boleto={b} modo="historial" {...comunes} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Con filtros: los resultados, como siempre (de la salida más reciente a la más antigua). */}
      {hayFiltros && historial !== null && (
        <section aria-labelledby="mb-resultados" className="mt-6">
          <h2 id="mb-resultados" className="mb-3 text-lg font-semibold">
            Resultados
          </h2>
          {historial.total === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-2">No encontramos boletos con estos filtros.</p>
          ) : (
            <div className={`space-y-3 transition-opacity ${cargando ? "opacity-60" : ""}`}>
              {historial.filas.map((b) => (
                <TarjetaCorta key={b.boletoId} boleto={b} modo="historial" {...comunes} />
              ))}
            </div>
          )}
        </section>
      )}

      {historial !== null && historial.total > LIMITE_PAGINA && (
        <div className="mt-4 flex items-center justify-between kb-card kb-on-white px-4 py-3 text-sm text-muted-2">
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
    </>
  );
}
