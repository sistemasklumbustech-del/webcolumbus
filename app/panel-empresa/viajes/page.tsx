"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  crearViajeCoop,
  listarRutasCoop,
  listarUnidadesCoop,
  listarViajesCoop,
  cancelarViajeCoop,
  cambiarUnidadViajeCoop,
  asignarConductorViajeCoop,
  listarConductoresCoop,
  editarViajeCoop,
  obtenerConfiguracionVip,
  type RutaResumen,
  type UnidadResumen,
  type ViajeCoopResumen,
  type ConductorResumen,
} from "@/lib/api";
import { obtenerToken, decodificarToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const ESTADO_ESTILO: Record<string, string> = {
  programado: "bg-brand-light text-brand",
  en_curso: "bg-amber-100 text-amber-700",
  finalizado: "bg-gray-100 text-gray-600",
  cancelado: "bg-red-100 text-red-700",
};

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

/**
 * Acciones de un viaje en un modal centrado (21-sep-2026). Antes eran
 * formularios diminutos dentro de un menu "···" colgado de la ultima
 * fila de la tabla: en pantalla chica quedaba cortado por abajo y no
 * se podia usar. Cada accion tiene su propia seccion con espacio real.
 */
function ModalAccionesViaje({
  viaje,
  unidadesActivas,
  conductores,
  esAdmin,
  onCerrar,
  onEditado,
  onCambiado,
  onConductor,
  onCancelado,
  onError,
}: {
  viaje: ViajeCoopResumen;
  unidadesActivas: UnidadResumen[];
  conductores: ConductorResumen[];
  esAdmin: boolean;
  onCerrar: () => void;
  onEditado: () => void;
  onCambiado: () => void;
  onConductor: () => void;
  onCancelado: (boletosCancelados: number) => void;
  onError: (mensaje: string) => void;
}) {
  const horaActual = new Date(viaje.horaSalidaProgramada).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Guayaquil",
  });
  const [hora, setHora] = useState(horaActual);
  const [precio, setPrecio] = useState(String(viaje.precioBase));
  const [unidadElegida, setUnidadElegida] = useState("");
  const [conductorElegido, setConductorElegido] = useState(viaje.conductorId ?? "");
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  // Cada seccion guarda SOLO lo suyo y confirma por separado; el modal
  // queda abierto para poder seguir con otra seccion.
  const [confirmacion, setConfirmacion] = useState<{ seccion: string; texto: string } | null>(null);

  const editable = esAdmin && viaje.estado === "programado";

  async function ejecutar(
    seccion: string,
    textoOk: string,
    accion: (token: string) => Promise<void>,
    mensajeError: string,
  ) {
    const token = obtenerToken();
    if (!token) return;
    setOcupado(true);
    setConfirmacion(null);
    try {
      await accion(token);
      setConfirmacion({ seccion, texto: textoOk });
    } catch (err) {
      onError(err instanceof Error ? err.message : mensajeError);
    } finally {
      setOcupado(false);
    }
  }

  const claseCampo =
    "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
  const claseBoton =
    "rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50";
  const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";
  const avisoGuardado = (seccion: string) =>
    confirmacion?.seccion === seccion ? (
      <p className="text-xs font-semibold text-emerald-700">✓ {confirmacion.texto}</p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" onMouseDown={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Acciones del viaje"
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-md space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-brand-dark">{viaje.rutaNombre}</h2>
            <p className="text-sm text-brand-dark/70">
              {viaje.fechaSalida} · {horaActual} · {viaje.unidadPlaca}
            </p>
            <p className="text-sm text-brand-dark/70">
              Conductor: {viaje.conductorNombre ?? <span className="text-brand-dark/40">sin asignar</span>}
            </p>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-brand-dark/50 hover:bg-brand-light hover:text-brand-dark"
          >
            ✕
          </button>
        </div>

        <Link
          href={`/panel-empresa/viajes/${viaje.id}/pasajeros`}
          className="block rounded-lg border border-brand-light px-4 py-2 text-center text-sm font-semibold text-brand hover:bg-brand-light/40"
        >
          Ver pasajeros y boletos
        </Link>

        {editable && (
          <>
            <section className="space-y-3 border-t border-black/5 pt-4">
              <h3 className="text-sm font-bold text-brand-dark">Hora y precio</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-viaje-hora" className={claseEtiqueta}>Hora de salida</label>
                  <input id="modal-viaje-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={claseCampo} />
                </div>
                <div>
                  <label htmlFor="modal-viaje-precio" className={claseEtiqueta}>Precio (USD)</label>
                  <input id="modal-viaje-precio" type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={claseCampo} />
                </div>
              </div>
              <button
                disabled={ocupado}
                className={claseBoton}
                onClick={() =>
                  ejecutar("horaPrecio", "Hora y precio guardados.", async (token) => {
                    await editarViajeCoop(token, viaje.id, {
                      horaSalidaProgramada: `${viaje.fechaSalida}T${hora}:00-05:00`,
                      precioBase: Number(precio),
                    });
                    onEditado();
                  }, "No se pudo editar el viaje.")
                }
              >
                Guardar hora y precio
              </button>
              {avisoGuardado("horaPrecio")}
            </section>

            <section className="space-y-3 border-t border-black/5 pt-4">
              <h3 className="text-sm font-bold text-brand-dark">Unidad</h3>
              <p className="text-xs text-brand-dark/60">Actual: {viaje.unidadPlaca}</p>
              <label htmlFor="modal-viaje-unidad" className={claseEtiqueta}>Cambiar por</label>
              <select id="modal-viaje-unidad" value={unidadElegida} onChange={(e) => setUnidadElegida(e.target.value)} className={claseCampo}>
                <option value="">Elige una unidad...</option>
                {unidadesActivas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.placa} — {u.tipoVehiculoNombre}
                  </option>
                ))}
              </select>
              <button
                disabled={ocupado || !unidadElegida}
                className={claseBoton}
                onClick={() =>
                  ejecutar("unidad", "Unidad cambiada.", async (token) => {
                    await cambiarUnidadViajeCoop(token, viaje.id, unidadElegida);
                    setUnidadElegida("");
                    onCambiado();
                  }, "No se pudo cambiar la unidad.")
                }
              >
                Cambiar unidad
              </button>
              {avisoGuardado("unidad")}
            </section>

            <section className="space-y-3 border-t border-black/5 pt-4">
              <h3 className="text-sm font-bold text-brand-dark">Conductor</h3>
              <p className="text-xs text-brand-dark/60">Actual: {viaje.conductorNombre ?? "sin asignar"}</p>
              <label htmlFor="modal-viaje-conductor" className={claseEtiqueta}>Asignado</label>
              <select id="modal-viaje-conductor" value={conductorElegido} onChange={(e) => setConductorElegido(e.target.value)} className={claseCampo}>
                <option value="">Sin conductor</option>
                {conductores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombreCompleto}
                  </option>
                ))}
              </select>
              <button
                disabled={ocupado || conductorElegido === (viaje.conductorId ?? "")}
                className={claseBoton}
                onClick={() =>
                  ejecutar("conductor", "Conductor guardado.", async (token) => {
                    await asignarConductorViajeCoop(token, viaje.id, conductorElegido || null);
                    onConductor();
                  }, "No se pudo cambiar el conductor.")
                }
              >
                Guardar conductor
              </button>
              {avisoGuardado("conductor")}
            </section>

            <section className="space-y-3 border-t border-black/5 pt-4">
              <h3 className="text-sm font-bold text-red-700">Cancelar viaje</h3>
              {!confirmandoCancelar ? (
                <button
                  onClick={() => setConfirmandoCancelar(true)}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Cancelar este viaje
                </button>
              ) : (
                <div className="rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
                  <p className="text-sm font-semibold text-red-800">
                    Se cancelan también todos los boletos vendidos. ¿Confirmas?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={ocupado}
                      onClick={() =>
                        ejecutar("cancelar", "Viaje cancelado.", async (token) => {
                          const { boletosCancelados } = await cancelarViajeCoop(token, viaje.id);
                          onCancelado(boletosCancelados);
                        }, "No se pudo cancelar el viaje.")
                      }
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Sí, cancelar
                    </button>
                    <button
                      onClick={() => setConfirmandoCancelar(false)}
                      className="rounded-lg border border-brand-light px-4 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40"
                    >
                      No
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/** Boton "Gestionar" de cada fila: abre el modal de acciones del viaje. */
function MenuAccionesViaje({
  viaje,
  unidadesActivas,
  conductores,
  esAdmin,
  onEditado,
  onCambiado,
  onConductor,
  onCancelado,
  onError,
}: {
  viaje: ViajeCoopResumen;
  unidadesActivas: UnidadResumen[];
  conductores: ConductorResumen[];
  esAdmin: boolean;
  onEditado: () => void;
  onCambiado: () => void;
  onConductor: () => void;
  onCancelado: (boletosCancelados: number) => void;
  onError: (mensaje: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrarYAvisar =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      setAbierto(false);
      fn(...args);
    };

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="rounded-lg bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark transition hover:bg-brand-light/70"
      >
        Gestionar
      </button>
      {abierto && (
        <ModalAccionesViaje
          viaje={viaje}
          unidadesActivas={unidadesActivas}
          conductores={conductores}
          esAdmin={esAdmin}
          onCerrar={() => setAbierto(false)}
          onEditado={onEditado}
          onCambiado={onCambiado}
          onConductor={onConductor}
          onCancelado={cerrarYAvisar(onCancelado)}
          onError={onError}
        />
      )}
    </>
  );
}

export default function ViajesPage() {
  const [rutas, setRutas] = useState<RutaResumen[] | null>(null);
  const [unidades, setUnidades] = useState<UnidadResumen[] | null>(null);
  const [viajes, setViajes] = useState<ViajeCoopResumen[] | null>(null);
  const [conductores, setConductores] = useState<ConductorResumen[]>([]);
  const [conductorElegido, setConductorElegido] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [rutaElegida, setRutaElegida] = useState("");
  const [unidadElegida, setUnidadElegida] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [horaLlegada, setHoraLlegada] = useState("");
  const [precio, setPrecio] = useState("");
  const [recargoVip, setRecargoVip] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  function cargarTodo() {
    const token = obtenerToken();
    if (!token) return;
    Promise.all([listarRutasCoop(token), listarUnidadesCoop(token), listarViajesCoop(token)])
      .then(([r, u, v]) => {
        setRutas(r);
        setUnidades(u);
        setViajes(v);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la información."));
    // Correccion real (18-ago-2026): el recargo VIP ahora es politica
    // fija de la cooperativa -- se pre-llena aqui, en vez de pedirlo
    // vacio en cada viaje nuevo. El admin sigue pudiendo cambiarlo
    // puntualmente para un viaje especifico.
    // GET /coop/configuracion-vip es admin_cooperativa solamente: al
    // vendedor ni siquiera se le pide (antes daba 403 en consola, aunque
    // el error se descartaba en silencio) -- y solo el admin ve el
    // formulario donde se usa este valor.
    if (decodificarToken(token)?.rol === "admin_cooperativa") {
      listarConductoresCoop(token).then(setConductores).catch(() => setConductores([]));
      obtenerConfiguracionVip(token)
        .then((cfg) => setRecargoVip(String(cfg.recargoVipDefault)))
        .catch(() => {});
    }
  }

  useEffect(cargarTodo, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    const token = obtenerToken();
    if (!token || !rutaElegida || !unidadElegida || !fecha || !hora || !precio) {
      setErrorForm("Completa ruta, unidad, fecha, hora y precio para continuar.");
      return;
    }
    setGuardando(true);
    try {
      await crearViajeCoop(token, {
        rutaId: rutaElegida,
        unidadId: unidadElegida,
        fechaSalida: fecha,
        horaSalidaProgramada: `${fecha}T${hora}:00-05:00`,
        // Hallazgo real del director (16-ago-2026): este campo nunca
        // se pedía, así que ningún viaje real tenía hora de llegada
        // estimada -- la pantalla de resultados nunca la podía
        // mostrar. Opcional a propósito (no siempre se sabe con
        // precisión al crear el viaje).
        horaLlegadaEstimada: horaLlegada ? `${fecha}T${horaLlegada}:00-05:00` : undefined,
        // Zona VIP de asientos (17-ago-2026, orden real del director):
        // monto fijo adicional sobre precioBase para los asientos con
        // etiqueta 'vip' -- configurable por la cooperativa en CADA
        // viaje, opcional (0 si no se especifica).
        recargoVip: recargoVip ? Number(recargoVip) : undefined,
        precioBase: Number(precio),
        conductorId: conductorElegido || undefined,
      });
      setConductorElegido("");
      setFecha("");
      setHora("");
      setHoraLlegada("");
      setPrecio("");
      setRecargoVip("");
      setMensajeExito("Viaje programado correctamente.");
      cargarTodo();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el viaje.";
      setErrorForm(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  const faltaConfigurar = rutas !== null && unidades !== null && (rutas.length === 0 || unidades.length === 0);
  // Hallazgo real, 18-sep-2026: POST /coop/viajes es admin_cooperativa
  // solamente (el vendedor puede VER viajes para vender, pero no
  // programarlos) -- esta pantalla mostraba el formulario de crear
  // viaje a cualquiera con acceso a la página, y un vendedor se
  // encontraba con un "Forbidden resource" recién al enviar.
  const token = obtenerToken();
  const esAdmin = token ? decodificarToken(token)?.rol === "admin_cooperativa" : false;

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Viajes</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Cada viaje programado aquí es el que un pasajero ve al buscar — con la misma ruta, unidad y precio.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {esAdmin && faltaConfigurar && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-100">
          Antes de crear un viaje necesitas al menos una ruta y una unidad — revisa las pestañas
          &quot;Rutas&quot; y &quot;Unidades&quot;.
        </div>
      )}

      {esAdmin && (
      <form
        onSubmit={crear}
        className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
      >
        <div>
          <label htmlFor="viaje-ruta" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Ruta
          </label>
          <select
id="viaje-ruta"
            value={rutaElegida}
            onChange={(e) => setRutaElegida(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Selecciona...</option>
            {rutas?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre ?? `${r.origenCiudad} → ${r.destinoCiudad}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="viaje-unidad" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Unidad
          </label>
          <select
            value={unidadElegida}
            onChange={(e) => setUnidadElegida(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Selecciona...</option>
            {unidades
              ?.filter((u) => u.activo)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.placa} — {u.tipoVehiculoNombre}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="viaje-fecha" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Fecha
          </label>
          <input
id="viaje-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="viaje-hora" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Hora de salida
          </label>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="viaje-hora-llegada" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Hora de llegada estimada <span className="font-normal normal-case text-brand-dark/40">(opcional)</span>
          </label>
          <input
            id="viaje-hora-llegada"
            type="time"
            value={horaLlegada}
            onChange={(e) => setHoraLlegada(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="viaje-precio" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Precio (USD)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="8.50"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="viaje-recargo-vip" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Recargo asiento VIP (USD) <span className="font-normal normal-case text-brand-dark/40">(precargado con tu valor por defecto -- ajústalo aquí solo si este viaje lo necesita distinto)</span>
          </label>
          <input
            id="viaje-recargo-vip"
            type="number"
            min="0"
            step="0.01"
            value={recargoVip}
            onChange={(e) => setRecargoVip(e.target.value)}
            placeholder="2.00"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="viaje-conductor" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Conductor <span className="font-normal normal-case text-brand-dark/40">(opcional, se puede asignar después)</span>
          </label>
          <select
            id="viaje-conductor"
            value={conductorElegido}
            onChange={(e) => setConductorElegido(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Sin conductor</option>
            {conductores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombreCompleto}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={guardando || faltaConfigurar}
          className="lg:col-span-5 h-[42px] rounded-lg bg-brand-amber px-4 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Crear viaje"}
        </button>
        {errorForm && <p className="lg:col-span-5 text-sm font-medium text-red-600">{errorForm}</p>}
      </form>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">
            {viajes === null ? "Cargando..." : `${viajes.length} viaje${viajes.length === 1 ? "" : "s"}`}
          </h2>
        </div>

        {viajes !== null && viajes.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            Todavía no has programado ningún viaje.
          </p>
        )}

        {viajes !== null && viajes.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              <tr>
                <th className="px-6 py-3">Ruta</th>
                <th className="px-6 py-3">Fecha y hora</th>
                <th className="px-6 py-3">Unidad</th>
                <th className="px-6 py-3">Conductor</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Precio</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {viajes.map((v) => (
                <tr key={v.id}>
                  <td className="px-6 py-3 font-medium text-brand-dark">{v.rutaNombre}</td>
                  <td className="px-6 py-3 text-brand-dark/70">
                    {v.fechaSalida} —{" "}
                    {new Date(v.horaSalidaProgramada).toLocaleTimeString("es-EC", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Guayaquil",
                    })}
                  </td>
                  <td className="px-6 py-3 text-brand-dark/70">
                    {v.unidadPlaca} · {v.tipoVehiculoNombre}
                  </td>
                  <td className="px-6 py-3 text-brand-dark/70">
                    {v.conductorNombre ?? <span className="text-brand-dark/30">Sin asignar</span>}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_ESTILO[v.estado] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {v.estado}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-dark">
                    {formatearDolares(v.precioBase)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <MenuAccionesViaje
                      viaje={v}
                      unidadesActivas={(unidades ?? []).filter((u) => u.activo)}
                      conductores={conductores}
                      esAdmin={esAdmin}
                      onEditado={() => {
                        setMensajeExito("Viaje actualizado.");
                        cargarTodo();
                      }}
                      onCambiado={() => {
                        setMensajeExito("Unidad del viaje actualizada — los boletos ya vendidos no se vieron afectados.");
                        cargarTodo();
                      }}
                      onConductor={() => {
                        setMensajeExito("Conductor del viaje actualizado.");
                        cargarTodo();
                      }}
                      onCancelado={(boletosCancelados) => {
                        setMensajeExito(
                          `Viaje cancelado — ${boletosCancelados} boleto${boletosCancelados === 1 ? "" : "s"} cancelado${boletosCancelados === 1 ? "" : "s"} automáticamente.`,
                        );
                        cargarTodo();
                      }}
                      onError={setMensajeError}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
