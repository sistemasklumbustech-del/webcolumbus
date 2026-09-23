"use client";

import { useCallback, useEffect, useState } from "react";
import {
  crearUsuarioStaffCoop,
  listarUsuariosStaffCoop,
  crearConductorCoop,
  buscarConductoresCoop,
  type FiltrosUsuariosStaff,
  type ResultadoUsuariosStaff,
  type FiltrosConductores,
  type ResultadoConductores,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";
import { CampoPassword } from "@/components/CampoPassword";

const ETIQUETA_ROL: Record<string, string> = {
  vendedor: "Vendedor",
  admin_cooperativa: "Administrador",
};

const LIMITE_PERSONAL_PAGINA = 25;

export default function PersonalPage() {
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Formulario: personal (staff)
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [nombreStaff, setNombreStaff] = useState("");
  const [rol, setRol] = useState<"vendedor" | "admin_cooperativa">("vendedor");
  const [guardandoStaff, setGuardandoStaff] = useState(false);
  const [errorStaff, setErrorStaff] = useState<string | null>(null);

  // Formulario: conductor
  const [nombreConductor, setNombreConductor] = useState("");
  const [cedula, setCedula] = useState("");
  const [licenciaNumero, setLicenciaNumero] = useState("");
  const [licenciaCategoria, setLicenciaCategoria] = useState("");
  const [telefonoConductor, setTelefonoConductor] = useState("");
  const [guardandoConductor, setGuardandoConductor] = useState(false);
  const [errorConductor, setErrorConductor] = useState<string | null>(null);

  // Paginación real (22-sep-2026) -- ver el comentario del backend.
  const [rolFiltro, setRolFiltro] = useState<"" | "vendedor" | "admin_cooperativa">("");
  const [busquedaFiltroStaff, setBusquedaFiltroStaff] = useState("");
  const [aplicadosStaff, setAplicadosStaff] = useState<FiltrosUsuariosStaff>({
    pagina: 1,
    limite: LIMITE_PERSONAL_PAGINA,
  });
  const [paginaStaff, setPaginaStaff] = useState(1);
  const [resultadoStaff, setResultadoStaff] = useState<ResultadoUsuariosStaff | null>(null);
  const [cargandoStaff, setCargandoStaff] = useState(false);

  const [busquedaFiltroConductor, setBusquedaFiltroConductor] = useState("");
  const [aplicadosConductores, setAplicadosConductores] = useState<FiltrosConductores>({
    pagina: 1,
    limite: LIMITE_PERSONAL_PAGINA,
  });
  const [paginaConductores, setPaginaConductores] = useState(1);
  const [resultadoConductores, setResultadoConductores] = useState<ResultadoConductores | null>(null);
  const [cargandoConductores, setCargandoConductores] = useState(false);

  const cargarStaff = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargandoStaff(true);
    listarUsuariosStaffCoop(token, { ...aplicadosStaff, pagina: paginaStaff, limite: LIMITE_PERSONAL_PAGINA })
      .then(setResultadoStaff)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la información."))
      .finally(() => setCargandoStaff(false));
  }, [aplicadosStaff, paginaStaff]);

  useEffect(cargarStaff, [cargarStaff]);

  function filtrarStaff(e: React.FormEvent) {
    e.preventDefault();
    setPaginaStaff(1);
    setAplicadosStaff({
      rol: rolFiltro || undefined,
      busqueda: busquedaFiltroStaff.trim() || undefined,
      pagina: 1,
      limite: LIMITE_PERSONAL_PAGINA,
    });
  }

  function limpiarFiltrosStaff() {
    setRolFiltro("");
    setBusquedaFiltroStaff("");
    setPaginaStaff(1);
    setAplicadosStaff({ pagina: 1, limite: LIMITE_PERSONAL_PAGINA });
  }

  const cargarConductores = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargandoConductores(true);
    buscarConductoresCoop(token, { ...aplicadosConductores, pagina: paginaConductores, limite: LIMITE_PERSONAL_PAGINA })
      .then(setResultadoConductores)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la información."))
      .finally(() => setCargandoConductores(false));
  }, [aplicadosConductores, paginaConductores]);

  useEffect(cargarConductores, [cargarConductores]);

  function filtrarConductores(e: React.FormEvent) {
    e.preventDefault();
    setPaginaConductores(1);
    setAplicadosConductores({
      busqueda: busquedaFiltroConductor.trim() || undefined,
      pagina: 1,
      limite: LIMITE_PERSONAL_PAGINA,
    });
  }

  function limpiarFiltrosConductores() {
    setBusquedaFiltroConductor("");
    setPaginaConductores(1);
    setAplicadosConductores({ pagina: 1, limite: LIMITE_PERSONAL_PAGINA });
  }

  async function crearStaff(e: React.FormEvent) {
    e.preventDefault();
    setErrorStaff(null);
    const token = obtenerToken();
    if (!token || !correo.trim() || !password || !nombreStaff.trim()) {
      setErrorStaff("Completa correo, contraseña y nombre.");
      return;
    }
    setGuardandoStaff(true);
    try {
      await crearUsuarioStaffCoop(token, {
        correo: correo.trim(),
        password,
        nombreCompleto: nombreStaff.trim(),
        rol,
      });
      setMensajeExito(`Usuario "${nombreStaff.trim()}" creado correctamente.`);
      setCorreo("");
      setPassword("");
      setNombreStaff("");
      setRol("vendedor");
      cargarStaff();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el usuario.";
      setErrorStaff(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardandoStaff(false);
    }
  }

  async function crearConductor(e: React.FormEvent) {
    e.preventDefault();
    setErrorConductor(null);
    const token = obtenerToken();
    if (!token || !nombreConductor.trim() || !cedula.trim()) {
      setErrorConductor("Completa al menos el nombre y la cédula.");
      return;
    }
    setGuardandoConductor(true);
    try {
      await crearConductorCoop(token, {
        nombreCompleto: nombreConductor.trim(),
        cedula: cedula.trim(),
        licenciaNumero: licenciaNumero.trim() || undefined,
        licenciaCategoria: licenciaCategoria.trim() || undefined,
        telefono: telefonoConductor.trim() || undefined,
      });
      setMensajeExito(`Conductor "${nombreConductor.trim()}" registrado correctamente.`);
      setNombreConductor("");
      setCedula("");
      setLicenciaNumero("");
      setLicenciaCategoria("");
      setTelefonoConductor("");
      cargarConductores();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el conductor.";
      setErrorConductor(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardandoConductor(false);
    }
  }

  return (
    <div className="space-y-8">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Personal</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Da de alta a tus vendedores (para que puedan validar boletos en el andén) y a tus conductores.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {/* ─── Usuarios (staff) ─── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-brand-dark">Usuarios del sistema</h2>

        <form
          onSubmit={crearStaff}
          className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        >
          <div>
            <label htmlFor="personal-staff-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Nombre completo
            </label>
            <input
              id="personal-staff-nombre"
              type="text"
              value={nombreStaff}
              onChange={(e) => setNombreStaff(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-staff-correo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Correo
            </label>
            <input
              id="personal-staff-correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-staff-password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Contraseña
            </label>
            <CampoPassword id="personal-staff-password" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />
          </div>
          <div>
            <label htmlFor="personal-staff-rol" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Rol
            </label>
            <select
              id="personal-staff-rol"
              value={rol}
              onChange={(e) => setRol(e.target.value as typeof rol)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            >
              <option value="vendedor">Vendedor</option>
              <option value="admin_cooperativa">Administrador</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={guardandoStaff}
            className="h-[42px] w-fit rounded-lg bg-brand-amber px-5 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50 sm:col-span-2 lg:col-span-4"
          >
            {guardandoStaff ? "Creando..." : "Crear usuario"}
          </button>
          {errorStaff && (
            <p className="sm:col-span-2 lg:col-span-4 text-sm font-medium text-red-600">{errorStaff}</p>
          )}
        </form>

        <form
          onSubmit={filtrarStaff}
          className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
        >
          <div>
            <label htmlFor="personal-staff-rol-filtro" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Rol
            </label>
            <select
              id="personal-staff-rol-filtro"
              value={rolFiltro}
              onChange={(e) => setRolFiltro(e.target.value as "" | "vendedor" | "admin_cooperativa")}
              className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            >
              <option value="">Todos</option>
              <option value="vendedor">Vendedor</option>
              <option value="admin_cooperativa">Administrador</option>
            </select>
          </div>
          <div className="min-w-[220px] flex-1">
            <label htmlFor="personal-staff-busqueda-filtro" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Buscar
            </label>
            <input
              id="personal-staff-busqueda-filtro"
              value={busquedaFiltroStaff}
              onChange={(e) => setBusquedaFiltroStaff(e.target.value)}
              placeholder="Nombre o correo"
              className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <button type="submit" className="rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95">
            Filtrar
          </button>
          <button type="button" onClick={limpiarFiltrosStaff} className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40">
            Limpiar
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {resultadoStaff !== null && resultadoStaff.filas.length === 0 && !cargandoStaff && (
            <p className="px-6 py-6 text-center text-sm text-brand-dark/50">
              No hay usuarios que coincidan con estos filtros.
            </p>
          )}
          {resultadoStaff !== null && resultadoStaff.filas.length > 0 && (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                <tr>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Correo</th>
                  <th className="px-6 py-3">Rol</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {resultadoStaff.filas.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-3 font-medium text-brand-dark">{s.nombreCompleto}</td>
                    <td className="px-6 py-3 text-brand-dark/70">{s.correo}</td>
                    <td className="px-6 py-3 text-brand-dark/70">{ETIQUETA_ROL[s.rol]}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          s.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {s.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}

          {resultadoStaff !== null && resultadoStaff.total > 0 && (
            <div className="flex items-center justify-between border-t border-black/5 px-6 py-3 text-sm text-brand-dark/70">
              <span>
                Página {paginaStaff} de {Math.max(1, Math.ceil(resultadoStaff.total / LIMITE_PERSONAL_PAGINA))}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaStaff((p) => Math.max(1, p - 1))}
                  disabled={paginaStaff <= 1 || cargandoStaff}
                  className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    setPaginaStaff((p) =>
                      Math.min(Math.max(1, Math.ceil(resultadoStaff.total / LIMITE_PERSONAL_PAGINA)), p + 1),
                    )
                  }
                  disabled={
                    paginaStaff >= Math.max(1, Math.ceil(resultadoStaff.total / LIMITE_PERSONAL_PAGINA)) ||
                    cargandoStaff
                  }
                  className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Conductores ─── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-brand-dark">Conductores</h2>

        <form
          onSubmit={crearConductor}
          className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-3 lg:items-end"
        >
          <div>
            <label htmlFor="personal-conductor-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Nombre completo
            </label>
            <input
              id="personal-conductor-nombre"
              type="text"
              value={nombreConductor}
              onChange={(e) => setNombreConductor(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-conductor-cedula" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Cédula
            </label>
            <input
              id="personal-conductor-cedula"
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-conductor-licencia-numero" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Número de licencia (opcional)
            </label>
            <input
              id="personal-conductor-licencia-numero"
              type="text"
              value={licenciaNumero}
              onChange={(e) => setLicenciaNumero(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-conductor-licencia-categoria" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Categoría de licencia (opcional)
            </label>
            <input
              id="personal-conductor-licencia-categoria"
              type="text"
              value={licenciaCategoria}
              onChange={(e) => setLicenciaCategoria(e.target.value)}
              placeholder="Ej. E"
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-conductor-telefono" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Teléfono (opcional)
            </label>
            <input
              id="personal-conductor-telefono"
              type="text"
              value={telefonoConductor}
              onChange={(e) => setTelefonoConductor(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoConductor}
            className="h-[42px] w-fit rounded-lg bg-brand-amber px-5 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
          >
            {guardandoConductor ? "Guardando..." : "Registrar conductor"}
          </button>
          {errorConductor && (
            <p className="sm:col-span-2 lg:col-span-3 text-sm font-medium text-red-600">{errorConductor}</p>
          )}
        </form>

        <form
          onSubmit={filtrarConductores}
          className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
        >
          <div className="min-w-[220px] flex-1">
            <label htmlFor="personal-conductor-busqueda-filtro" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Buscar
            </label>
            <input
              id="personal-conductor-busqueda-filtro"
              value={busquedaFiltroConductor}
              onChange={(e) => setBusquedaFiltroConductor(e.target.value)}
              placeholder="Nombre, cédula o teléfono"
              className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <button type="submit" className="rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95">
            Filtrar
          </button>
          <button type="button" onClick={limpiarFiltrosConductores} className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-light/40">
            Limpiar
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {resultadoConductores !== null && resultadoConductores.filas.length === 0 && !cargandoConductores && (
            <p className="px-6 py-6 text-center text-sm text-brand-dark/50">
              No hay conductores que coincidan con estos filtros.
            </p>
          )}
          {resultadoConductores !== null && resultadoConductores.filas.length > 0 && (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                <tr>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Cédula</th>
                  <th className="px-6 py-3">Licencia</th>
                  <th className="px-6 py-3">Teléfono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {resultadoConductores.filas.map((c) => (
                  <tr key={c.id}>
                    <td className="px-6 py-3 font-medium text-brand-dark">{c.nombreCompleto}</td>
                    <td className="px-6 py-3 text-brand-dark/70">{c.cedula}</td>
                    <td className="px-6 py-3 text-brand-dark/70">
                      {c.licenciaNumero ? `${c.licenciaNumero}${c.licenciaCategoria ? ` (${c.licenciaCategoria})` : ""}` : "—"}
                    </td>
                    <td className="px-6 py-3 text-brand-dark/70">{c.telefono ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}

          {resultadoConductores !== null && resultadoConductores.total > 0 && (
            <div className="flex items-center justify-between border-t border-black/5 px-6 py-3 text-sm text-brand-dark/70">
              <span>
                Página {paginaConductores} de {Math.max(1, Math.ceil(resultadoConductores.total / LIMITE_PERSONAL_PAGINA))}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaConductores((p) => Math.max(1, p - 1))}
                  disabled={paginaConductores <= 1 || cargandoConductores}
                  className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    setPaginaConductores((p) =>
                      Math.min(Math.max(1, Math.ceil(resultadoConductores.total / LIMITE_PERSONAL_PAGINA)), p + 1),
                    )
                  }
                  disabled={
                    paginaConductores >=
                      Math.max(1, Math.ceil(resultadoConductores.total / LIMITE_PERSONAL_PAGINA)) ||
                    cargandoConductores
                  }
                  className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
