"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buscarCooperativasAdmin,
  crearCooperativaAdmin,
  cambiarEstadoCooperativaAdmin,
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
  aprobada: "bg-emerald-100 text-emerald-700",
  pendiente_revision: "bg-amber-100 text-amber-700",
  suspendida: "bg-red-100 text-red-700",
  dada_de_baja: "bg-slate-200 text-slate-600",
};

const LIMITE_PAGINA = 25;

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
        <h1 className="font-display text-2xl font-bold text-brand-dark">Cooperativas</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Alta de una nueva cooperativa junto con su primer usuario administrador (RF-ADMIN-001).
        </p>
      </div>

      <form onSubmit={crear} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-base font-bold text-brand-dark">Datos de la cooperativa</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="coop-ruc" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              RUC
            </label>
            <input
              id="coop-ruc"
              type="text"
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              placeholder="0790123456001"
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="coop-razon-social" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Razón social
            </label>
            <input
              id="coop-razon-social"
              type="text"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Cooperativa de Transportes X S.A."
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="coop-nombre-comercial" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Nombre comercial
            </label>
            <input
              id="coop-nombre-comercial"
              type="text"
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
              placeholder="Transportes X"
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="coop-modelo-integracion" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Modelo de integración
            </label>
            <select
              id="coop-modelo-integracion"
              value={modeloIntegracion}
              onChange={(e) => setModeloIntegracion(e.target.value as "modelo_a" | "modelo_b")}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            >
              <option value="modelo_a">Modelo A</option>
              <option value="modelo_b">Modelo B</option>
            </select>
          </div>
          <div>
            <label htmlFor="coop-contacto-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Contacto — nombre (opcional)
            </label>
            <input
              id="coop-contacto-nombre"
              type="text"
              value={contactoNombre}
              onChange={(e) => setContactoNombre(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="coop-contacto-correo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Contacto — correo (opcional)
            </label>
            <input
              id="coop-contacto-correo"
              type="email"
              value={contactoCorreo}
              onChange={(e) => setContactoCorreo(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
        </div>

        <h2 className="mt-6 font-display text-base font-bold text-brand-dark">Primer usuario administrador</h2>
        <p className="mt-1 text-xs text-brand-dark/50">
          Con estas credenciales la cooperativa entra por primera vez a su Panel Empresa.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="coop-usuario-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Nombre completo
            </label>
            <input
              id="coop-usuario-nombre"
              type="text"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="coop-usuario-correo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Correo
            </label>
            <input
              id="coop-usuario-correo"
              type="email"
              value={correoUsuario}
              onChange={(e) => setCorreoUsuario(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="coop-usuario-password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
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

        {errorForm && <p className="mt-4 text-sm font-medium text-red-600">{errorForm}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="mt-6 h-[42px] rounded-lg bg-brand px-5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {guardando ? "Creando..." : "Crear cooperativa"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      <form
        onSubmit={filtrar}
        className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
      >
        <div>
          <label htmlFor="coop-filtro-estado" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Estado
          </label>
          <select
            id="coop-filtro-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Todos</option>
            <option value="pendiente_revision">Pendiente de revisión</option>
            <option value="aprobada">Habilitada</option>
            <option value="suspendida">Suspendida</option>
            <option value="dada_de_baja">Dada de baja</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="coop-filtro-busqueda" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Buscar
          </label>
          <input
            id="coop-filtro-busqueda"
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            placeholder="Nombre, razón social, RUC o contacto"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
            Filtrar
          </button>
          <button type="button" onClick={limpiarFiltros} className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40">
            Limpiar
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">
            {resultado === null
              ? "Cargando..."
              : `${resultado.total} cooperativa${resultado.total === 1 ? "" : "s"} con estos filtros`}
          </h2>
        </div>

        {resultado !== null && resultado.filas.length === 0 && !cargando && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            No hay cooperativas que coincidan con estos filtros.
          </p>
        )}

        {resultado !== null && resultado.filas.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              <tr>
                <th className="px-6 py-3">Nombre comercial</th>
                <th className="px-6 py-3">RUC</th>
                <th className="px-6 py-3">Contacto</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {resultado.filas.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-3 font-medium text-brand-dark">{c.nombreComercial}</td>
                  <td className="px-6 py-3 text-brand-dark/70">{c.ruc}</td>
                  <td className="px-6 py-3 text-xs text-brand-dark/70">
                    {c.contactoNombre && <p>{c.contactoNombre}</p>}
                    {c.contactoCorreo && <p>{c.contactoCorreo}</p>}
                    {c.contactoTelefono && <p>{c.contactoTelefono}</p>}
                    {!c.contactoNombre && !c.contactoCorreo && !c.contactoTelefono && (
                      <span className="text-brand-dark/30">Sin contacto</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_ESTADO[c.estado] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {ETIQUETA_ESTADO[c.estado] ?? c.estado}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {c.estado === "aprobada" && (
                      <button
                        onClick={() => setCambio({ cooperativa: c, estado: "suspendida" })}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Suspender
                      </button>
                    )}
                    {(c.estado === "suspendida" || c.estado === "pendiente_revision") && (
                      <button
                        onClick={() => setCambio({ cooperativa: c, estado: "aprobada" })}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        {c.estado === "suspendida" ? "Reactivar" : "Aprobar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {resultado !== null && resultado.total > 0 && (
          <div className="flex items-center justify-between border-t border-black/5 px-6 py-3 text-sm text-brand-dark/70">
            <span>
              Página {pagina} de {Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA))}
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
                onClick={() =>
                  setPagina((p) =>
                    Math.min(Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)), p + 1),
                  )
                }
                disabled={pagina >= Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) || cargando}
                className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {cambio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onMouseDown={() => setCambio(null)}>
          <div
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="font-display text-lg font-bold text-brand-dark">
              {cambio.estado === "suspendida" ? "Suspender cooperativa" : "Habilitar cooperativa"}
            </h2>
            <p className="mt-1 text-sm text-brand-dark/70">{cambio.cooperativa.nombreComercial}</p>
            <p className="mt-3 rounded-lg bg-brand-light/30 px-3 py-2 text-sm text-brand-dark/80">
              {cambio.estado === "suspendida"
                ? "Dejará de aparecer en las búsquedas y no podrá vender boletos (ni en línea ni en ventanilla). Su historial y los boletos ya vendidos no se tocan. Se puede reactivar cuando quieras."
                : "Volverá a aparecer en las búsquedas y podrá vender boletos."}
            </p>
            <label htmlFor="motivo-cambio-estado" className="mt-4 mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Motivo (opcional, queda en la auditoría)
            </label>
            <textarea
              id="motivo-cambio-estado"
              value={motivoCambio}
              onChange={(e) => setMotivoCambio(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setCambio(null)}
                disabled={aplicandoCambio}
                className="flex-1 rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark/70 transition hover:bg-brand-light/40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambioEstado}
                disabled={aplicandoCambio}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  cambio.estado === "suspendida" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
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
