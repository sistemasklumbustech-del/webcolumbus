"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buscarCooperativasAdmin,
  crearCooperativaAdmin,
  cambiarEstadoCooperativaAdmin,
  cambiarModoOperacionAdmin,
  type ModoOperacion,
  type CooperativaDetalle,
  type FiltrosCooperativas,
  type ResultadoCooperativas,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";
import { CampoPassword } from "@/components/CampoPassword";

const ETIQUETA_ESTADO: Record<string, string> = {
  aprobada: "Habilitada",
  pendiente_revision: "Pendiente de revisión",
  suspendida: "Suspendida",
  dada_de_baja: "Dada de baja",
};

const COLOR_ESTADO: Record<string, string> = {
  aprobada: "kb-status--ok",
  pendiente_revision: "kb-status--wait",
  suspendida: "kb-status--error",
  dada_de_baja: "kb-status--off",
};

const LIMITE_PAGINA = 25;

const MODOS: { valor: ModoOperacion; titulo: string; detalle: string; disponible: boolean }[] = [
  {
    valor: "plataforma_completa",
    titulo: "Plataforma completa",
    detalle:
      "Klumbus cobra, emite la factura del pasaje y registra la tasa en el SIAT 3000. Para cooperativas sin sistema propio.",
    disponible: true,
  },
  {
    valor: "intermediario_con_cobro",
    titulo: "Intermediario con cobro",
    detalle:
      "Klumbus cobra y liquida. La cooperativa factura y registra la tasa con su sistema, y lo reporta a Klumbus.",
    disponible: true,
  },
  {
    valor: "intermediario_venta",
    titulo: "Intermediario de venta",
    detalle:
      "La cooperativa cobra con su propia pasarela y Klumbus solo vende y cobra su comisión. Aún no está disponible.",
    disponible: false,
  },
];

const ETIQUETA_MODO: Record<ModoOperacion, string> = {
  plataforma_completa: "Plataforma completa",
  intermediario_con_cobro: "Intermediario con cobro",
  intermediario_venta: "Intermediario de venta",
};

export default function CooperativasAdminPage() {
  const [error, setError] = useState<string | null>(null);

  const [ruc, setRuc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [modeloIntegracion, setModeloIntegracion] = useState<"modelo_a" | "modelo_b">("modelo_a");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoCorreo, setContactoCorreo] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");

  const [correoUsuario, setCorreoUsuario] = useState("");
  const [passwordUsuario, setPasswordUsuario] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");

  // Suspender / reactivar (RF-035): confirmacion en un modal, con motivo opcional.
  const [cambio, setCambio] = useState<{ cooperativa: CooperativaDetalle; estado: "aprobada" | "suspendida" } | null>(null);
  const [motivoCambio, setMotivoCambio] = useState("");
  const [aplicandoCambio, setAplicandoCambio] = useState(false);

  // Modo de operación: confirmación en un modal, igual que suspender/reactivar.
  const [cambioModo, setCambioModo] = useState<{ cooperativa: CooperativaDetalle; modo: ModoOperacion } | null>(null);
  const [aplicandoModo, setAplicandoModo] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Paginación real (22-sep-2026) -- ver el comentario del backend.
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [busquedaFiltro, setBusquedaFiltro] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosCooperativas>({
    pagina: 1,
    limite: LIMITE_PAGINA,
  });
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<ResultadoCooperativas | null>(null);
  const [cargando, setCargando] = useState(false);

  async function confirmarCambioEstado() {
    const token = obtenerToken();
    if (!token || !cambio) return;
    setAplicandoCambio(true);
    try {
      await cambiarEstadoCooperativaAdmin(token, cambio.cooperativa.id, cambio.estado, motivoCambio);
      setMensajeExito(
        cambio.estado === "suspendida"
          ? `"${cambio.cooperativa.nombreComercial}" quedó suspendida: ya no aparece en búsquedas ni puede vender.`
          : `"${cambio.cooperativa.nombreComercial}" quedó habilitada de nuevo.`,
      );
      setCambio(null);
      setMotivoCambio("");
      cargar();
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
    } finally {
      setAplicandoCambio(false);
    }
  }

  async function confirmarCambioModo() {
    const token = obtenerToken();
    if (!token || !cambioModo) return;
    setAplicandoModo(true);
    try {
      await cambiarModoOperacionAdmin(token, cambioModo.cooperativa.id, cambioModo.modo);
      setMensajeExito(
        `"${cambioModo.cooperativa.nombreComercial}" ahora opera como: ${ETIQUETA_MODO[cambioModo.modo]}.`,
      );
      setCambioModo(null);
      cargar();
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : "No se pudo cambiar el modo de operación.");
    } finally {
      setAplicandoModo(false);
    }
  }

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargando(true);
    buscarCooperativasAdmin(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las cooperativas."))
      .finally(() => setCargando(false));
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setAplicados({
      estado: estadoFiltro || undefined,
      busqueda: busquedaFiltro.trim() || undefined,
      pagina: 1,
      limite: LIMITE_PAGINA,
    });
  }

  function limpiarFiltros() {
    setEstadoFiltro("");
    setBusquedaFiltro("");
    setPagina(1);
    setAplicados({ pagina: 1, limite: LIMITE_PAGINA });
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    const token = obtenerToken();
    if (!token || !ruc || !razonSocial || !nombreComercial || !correoUsuario || !passwordUsuario || !nombreUsuario) {
      setErrorForm("Completa los campos obligatorios: RUC, razón social, nombre comercial, y los datos del primer usuario.");
      return;
    }
    setGuardando(true);
    try {
      await crearCooperativaAdmin(
        token,
        {
          ruc: ruc.trim(),
          razonSocial: razonSocial.trim(),
          nombreComercial: nombreComercial.trim(),
          modeloIntegracion,
          contactoNombre: contactoNombre.trim() || undefined,
          contactoCorreo: contactoCorreo.trim() || undefined,
          contactoTelefono: contactoTelefono.trim() || undefined,
        },
        {
          correo: correoUsuario.trim(),
          password: passwordUsuario,
          nombreCompleto: nombreUsuario.trim(),
        },
      );
      setRuc("");
      setRazonSocial("");
      setNombreComercial("");
      setModeloIntegracion("modelo_a");
      setContactoNombre("");
      setContactoCorreo("");
      setContactoTelefono("");
      setCorreoUsuario("");
      setPasswordUsuario("");
      setNombreUsuario("");
      setMensajeExito(`Cooperativa "${nombreComercial}" creada correctamente.`);
      cargar();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear la cooperativa.";
      setErrorForm(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Cooperativas</h1>
        <p className="mt-1 text-sm text-muted-2">
          Alta de una nueva cooperativa junto con su primer usuario administrador (RF-ADMIN-001).
        </p>
      </div>

      <form onSubmit={crear} className="kb-card kb-on-white p-6">
        <h2 className="text-base font-bold text-brand-dark">Datos de la cooperativa</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="coop-ruc" className="kb-label">
              RUC
            </label>
            <input
              id="coop-ruc"
              type="text"
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              placeholder="0790123456001"
              className="w-full kb-input"
            />
          </div>
          <div>
            <label htmlFor="coop-razon-social" className="kb-label">
              Razón social
            </label>
            <input
              id="coop-razon-social"
              type="text"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Cooperativa de Transportes X S.A."
              className="w-full kb-input"
            />
          </div>
          <div>
            <label htmlFor="coop-nombre-comercial" className="kb-label">
              Nombre comercial
            </label>
            <input
              id="coop-nombre-comercial"
              type="text"
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
              placeholder="Transportes X"
              className="w-full kb-input"
            />
          </div>
          <div>
            <label htmlFor="coop-modelo-integracion" className="kb-label">
              Modelo de integración
            </label>
            <select
              id="coop-modelo-integracion"
              value={modeloIntegracion}
              onChange={(e) => setModeloIntegracion(e.target.value as "modelo_a" | "modelo_b")}
              className="w-full kb-input"
            >
              <option value="modelo_a">Modelo A</option>
              <option value="modelo_b">Modelo B</option>
            </select>
          </div>
          <div>
            <label htmlFor="coop-contacto-nombre" className="kb-label">
              Contacto — nombre (opcional)
            </label>
            <input
              id="coop-contacto-nombre"
              type="text"
              value={contactoNombre}
              onChange={(e) => setContactoNombre(e.target.value)}
              className="w-full kb-input"
            />
          </div>
          <div>
            <label htmlFor="coop-contacto-correo" className="kb-label">
              Contacto — correo (opcional)
            </label>
            <input
              id="coop-contacto-correo"
              type="email"
              value={contactoCorreo}
              onChange={(e) => setContactoCorreo(e.target.value)}
              className="w-full kb-input"
            />
          </div>
        </div>

        <h2 className="mt-6 text-base font-bold text-brand-dark">Primer usuario administrador</h2>
        <p className="mt-1 text-xs text-muted-2">
          Con estas credenciales la cooperativa entra por primera vez a su Panel Empresa.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="coop-usuario-nombre" className="kb-label">
              Nombre completo
            </label>
            <input
              id="coop-usuario-nombre"
              type="text"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              className="w-full kb-input"
            />
          </div>
          <div>
            <label htmlFor="coop-usuario-correo" className="kb-label">
              Correo
            </label>
            <input
              id="coop-usuario-correo"
              type="email"
              value={correoUsuario}
              onChange={(e) => setCorreoUsuario(e.target.value)}
              className="w-full kb-input"
            />
          </div>
          <div>
            <label htmlFor="coop-usuario-password" className="kb-label">
              Contraseña
            </label>
            <CampoPassword
              id="coop-usuario-password"
              value={passwordUsuario}
              onChange={setPasswordUsuario}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
        </div>

        {errorForm && <p className="mt-4 text-sm font-medium text-kberror">{errorForm}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="mt-6 kb-btn kb-btn--dark !h-[42px] !px-5 !text-sm disabled:opacity-50"
        >
          {guardando ? "Creando..." : "Crear cooperativa"}
        </button>
      </form>

      {error && (
        <div className="kb-alert kb-alert--error">
          {error}
        </div>
      )}

      <form
        onSubmit={filtrar}
        className="grid grid-cols-1 gap-4 kb-card kb-on-white p-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
      >
        <div>
          <label htmlFor="coop-filtro-estado" className="kb-label">
            Estado
          </label>
          <select
            id="coop-filtro-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="w-full kb-input !h-11 !text-sm"
          >
            <option value="">Todos</option>
            <option value="pendiente_revision">Pendiente de revisión</option>
            <option value="aprobada">Habilitada</option>
            <option value="suspendida">Suspendida</option>
            <option value="dada_de_baja">Dada de baja</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="coop-filtro-busqueda" className="kb-label">
            Buscar
          </label>
          <input
            id="coop-filtro-busqueda"
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            placeholder="Nombre, razón social, RUC o contacto"
            className="w-full kb-input !h-11 !text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="flex-1 kb-btn kb-btn--dark !h-10 !px-4 !text-sm">
            Filtrar
          </button>
          <button type="button" onClick={limpiarFiltros} className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm">
            Limpiar
          </button>
        </div>
      </form>

      <div className="overflow-hidden kb-card kb-on-white">
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-base font-bold text-brand-dark">
            {resultado === null
              ? "Cargando..."
              : `${resultado.total} cooperativa${resultado.total === 1 ? "" : "s"} con estos filtros`}
          </h2>
        </div>

        {resultado !== null && resultado.filas.length === 0 && !cargando && (
          <p className="px-6 py-8 text-center text-sm text-muted-2">
            No hay cooperativas que coincidan con estos filtros.
          </p>
        )}

        {resultado !== null && resultado.filas.length > 0 && (
          <div className="overflow-x-auto"><table className="kb-table min-w-[640px]">
            <thead>
              <tr>
                <th className="px-4 py-3">Nombre comercial</th>
                <th className="px-4 py-3">RUC</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Modo de operación</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {resultado.filas.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-brand-dark">{c.nombreComercial}</td>
                  <td className="px-4 py-3 text-muted-2">{c.ruc}</td>
                  <td className="px-4 py-3 text-xs text-muted-2">
                    {c.contactoNombre && <p>{c.contactoNombre}</p>}
                    {c.contactoCorreo && <p>{c.contactoCorreo}</p>}
                    {c.contactoTelefono && <p>{c.contactoTelefono}</p>}
                    {!c.contactoNombre && !c.contactoCorreo && !c.contactoTelefono && (
                      <span className="text-muted-3">Sin contacto</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`kb-status ${COLOR_ESTADO[c.estado] ?? "kb-status--off"}`}
                    >
                      {ETIQUETA_ESTADO[c.estado] ?? c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink">
                    <p>{ETIQUETA_MODO[c.modoOperacion] ?? c.modoOperacion}</p>
                    <button
                      onClick={() => setCambioModo({ cooperativa: c, modo: c.modoOperacion })}
                      className="mt-0.5 font-semibold text-brand underline"
                    >
                      Cambiar
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.estado === "aprobada" && (
                      <button
                        onClick={() => setCambio({ cooperativa: c, estado: "suspendida" })}
                        className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm text-kberror"
                      >
                        Suspender
                      </button>
                    )}
                    {(c.estado === "suspendida" || c.estado === "pendiente_revision") && (
                      <button
                        onClick={() => setCambio({ cooperativa: c, estado: "aprobada" })}
                        className="kb-btn !h-9 !px-3 !text-xs bg-ok text-white"
                      >
                        {c.estado === "suspendida" ? "Reactivar" : "Aprobar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        {resultado !== null && resultado.total > 0 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted-2">
            <span>
              Página {pagina} de {Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA))}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1 || cargando}
                className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
              >
                Anterior
              </button>
              <button
                onClick={() =>
                  setPagina((p) =>
                    Math.min(Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)), p + 1),
                  )
                }
                disabled={pagina >= Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) || cargando}
                className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {cambioModo && (
        <div className="kb-modal-bg" onMouseDown={() => setCambioModo(null)}>
          <div
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-lg kb-card kb-on-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold text-brand-dark">Modo de operación</h2>
            <p className="mt-1 text-sm text-muted-2">{cambioModo.cooperativa.nombreComercial}</p>
            <div className="mt-4 space-y-2">
              {MODOS.map((m) => (
                <label
                  key={m.valor}
                  className={`flex gap-3 rounded-ctrl border p-3 text-sm ${
                    cambioModo.modo === m.valor ? "border-brand bg-kbbg" : "border-line"
                  } ${m.disponible ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                >
                  <input
                    type="radio"
                    name="modo-operacion"
                    value={m.valor}
                    checked={cambioModo.modo === m.valor}
                    disabled={!m.disponible}
                    onChange={() => setCambioModo({ ...cambioModo, modo: m.valor })}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-brand-dark">{m.titulo}</span>
                    <span className="block text-xs text-muted-2">{m.detalle}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-2">
              Aplica a las compras nuevas. Las compras ya hechas conservan lo que se les asignó. El cambio queda en la auditoría.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setCambioModo(null)}
                disabled={aplicandoModo}
                className="flex-1 kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambioModo}
                disabled={aplicandoModo || cambioModo.modo === cambioModo.cooperativa.modoOperacion}
                className="flex-1 kb-btn kb-btn--dark !h-10 !px-4 !text-sm disabled:opacity-50"
              >
                {aplicandoModo ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cambio && (
        <div className="kb-modal-bg" onMouseDown={() => setCambio(null)}>
          <div
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-md kb-card kb-on-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold text-brand-dark">
              {cambio.estado === "suspendida" ? "Suspender cooperativa" : "Habilitar cooperativa"}
            </h2>
            <p className="mt-1 text-sm text-muted-2">{cambio.cooperativa.nombreComercial}</p>
            <p className="mt-3 rounded-lg bg-kbbg px-3 py-2 text-sm text-ink">
              {cambio.estado === "suspendida"
                ? "Dejará de aparecer en las búsquedas y no podrá vender boletos (ni en línea ni en ventanilla). Su historial y los boletos ya vendidos no se tocan. Se puede reactivar cuando quieras."
                : "Volverá a aparecer en las búsquedas y podrá vender boletos."}
            </p>
            <label htmlFor="motivo-cambio-estado" className="mt-4 kb-label">
              Motivo (opcional, queda en la auditoría)
            </label>
            <textarea
              id="motivo-cambio-estado"
              value={motivoCambio}
              onChange={(e) => setMotivoCambio(e.target.value)}
              rows={2}
              className="w-full kb-input !h-11 !text-sm"
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setCambio(null)}
                disabled={aplicandoCambio}
                className="flex-1 kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambioEstado}
                disabled={aplicandoCambio}
                className={`kb-btn flex-1 !h-11 !text-sm text-white disabled:opacity-60 ${
                  cambio.estado === "suspendida" ? "bg-kberror" : "bg-ok"
                }`}
              >
                {aplicandoCambio ? "Guardando..." : cambio.estado === "suspendida" ? "Sí, suspender" : "Sí, habilitar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
