"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listarAdministradoresAdmin,
  crearAdministradorAdmin,
  eliminarAdministradorAdmin,
  type FiltrosAdministradores,
  type ResultadoAdministradores,
} from "@/lib/api";
import { obtenerToken, decodificarToken } from "@/lib/auth";

const LIMITE_PAGINA = 25;

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Ítem 9, Fase 2 (04-ago-2026) -- división super_admin/admin_plataforma,
 * matriz de permisos en sección 3.8 del documento maestro. Crear/eliminar
 * son exclusivos de super_admin -- el backend los rechaza con 403 si no
 * lo eres; aquí solo se ocultan los controles por UX, no es la barrera
 * de seguridad real.
 */
export default function AdministradoresPage() {
  const [resultado, setResultado] = useState<ResultadoAdministradores | null>(null);
  const [cargandoLista, setCargandoLista] = useState(false);
  // Paginación real (23-sep-2026) -- ver el comentario del backend.
  const [rolFiltro, setRolFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [busquedaFiltro, setBusquedaFiltro] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosAdministradores>({ pagina: 1, limite: LIMITE_PAGINA });
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [rol, setRol] = useState<"admin_plataforma" | "super_admin">("admin_plataforma");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [idConfirmandoEliminar, setIdConfirmandoEliminar] = useState<string | null>(null);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargandoLista(true);
    listarAdministradoresAdmin(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar."))
      .finally(() => setCargandoLista(false));
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    const payload = decodificarToken(token);
    setEsSuperAdmin(payload?.rol === "super_admin");
  }, []);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setAplicados({
      rol: rolFiltro || undefined,
      activo: estadoFiltro === "" ? undefined : estadoFiltro === "activo",
      busqueda: busquedaFiltro.trim() || undefined,
      pagina: 1,
      limite: LIMITE_PAGINA,
    });
  }

  function limpiarFiltros() {
    setRolFiltro("");
    setEstadoFiltro("");
    setBusquedaFiltro("");
    setPagina(1);
    setAplicados({ pagina: 1, limite: LIMITE_PAGINA });
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    try {
      await crearAdministradorAdmin(token, { correo, password, nombreCompleto, rol });
      setCorreo("");
      setPassword("");
      setNombreCompleto("");
      setRol("admin_plataforma");
      cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "No se pudo crear.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    const token = obtenerToken();
    if (!token) return;
    try {
      await eliminarAdministradorAdmin(token, id);
      setIdConfirmandoEliminar(null);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Administradores</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Solo un super admin puede crear o eliminar otros administradores. Un administrador normal
          puede ver esta lista, pero no modificarla.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {esSuperAdmin && (
        <form
          onSubmit={crear}
          className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
        >
          <div>
            <label htmlFor="admin-usuario-correo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Correo
            </label>
            <input
              id="admin-usuario-correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-usuario-password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Contraseña
            </label>
            <input
              id="admin-usuario-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-usuario-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Nombre completo
            </label>
            <input
              id="admin-usuario-nombre"
              type="text"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-usuario-rol" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Rol
            </label>
            <select
              id="admin-usuario-rol"
              value={rol}
              onChange={(e) => setRol(e.target.value as "admin_plataforma" | "super_admin")}
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            >
              <option value="admin_plataforma">Administrador</option>
              <option value="super_admin">Super admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={guardando}
            className="h-[42px] rounded-lg bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {guardando ? "Creando..." : "Crear"}
          </button>
          {errorForm && (
            <p className="sm:col-span-2 lg:col-span-5 text-sm font-medium text-red-600">{errorForm}</p>
          )}
        </form>
      )}

      <form
        onSubmit={filtrar}
        className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
      >
        <div>
          <label htmlFor="admin-filtro-rol" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Rol
          </label>
          <select
            id="admin-filtro-rol"
            value={rolFiltro}
            onChange={(e) => setRolFiltro(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Todos</option>
            <option value="admin_plataforma">Administrador</option>
            <option value="super_admin">Super admin</option>
          </select>
        </div>
        <div>
          <label htmlFor="admin-filtro-estado" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Estado
          </label>
          <select
            id="admin-filtro-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="admin-filtro-busqueda" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Buscar
          </label>
          <input
            id="admin-filtro-busqueda"
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            placeholder="Nombre o correo"
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
            {resultado === null ? "Cargando..." : `${resultado.total} administrador(es) con estos filtros`}
          </h2>
        </div>

        {resultado !== null && resultado.filas.length === 0 && !cargandoLista && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            No hay administradores que coincidan con estos filtros.
          </p>
        )}

        {resultado !== null && resultado.filas.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              <tr>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Correo</th>
                <th className="px-6 py-3">Rol</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Desde</th>
                {esSuperAdmin && <th className="px-6 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {resultado?.filas.map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-3 font-medium text-brand-dark">{a.nombreCompleto}</td>
                  <td className="px-6 py-3 text-brand-dark/70">{a.correo}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        a.rol === "super_admin"
                          ? "bg-brand-amber/20 text-brand-dark"
                          : "bg-brand-light text-brand-dark/70"
                      }`}
                    >
                      {a.rol === "super_admin" ? "Super admin" : "Administrador"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs font-semibold ${a.activo ? "text-emerald-700" : "text-brand-dark/40"}`}
                    >
                      {a.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-brand-dark/50">{formatearFecha(a.creadoEn)}</td>
                  {esSuperAdmin && (
                    <td className="px-6 py-3 text-right">
                      {a.activo &&
                        (idConfirmandoEliminar === a.id ? (
                          <span className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => eliminar(a.id)}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                            >
                              Sí, eliminar
                            </button>
                            <button
                              type="button"
                              onClick={() => setIdConfirmandoEliminar(null)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-dark/70"
                            >
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIdConfirmandoEliminar(a.id)}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        ))}
                    </td>
                  )}
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
                disabled={pagina <= 1 || cargandoLista}
                className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagina((p) => Math.min(Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)), p + 1))}
                disabled={pagina >= Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) || cargandoLista}
                className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
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
