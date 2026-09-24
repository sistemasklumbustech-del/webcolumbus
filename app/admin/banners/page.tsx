"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listarBannersPropiosAdmin,
  crearBannerPropioAdmin,
  actualizarBannerPropioAdmin,
  eliminarBannerPropioAdmin,
  type BannerPropio,
  type FiltrosBanners,
  type ResultadoBanners,
  subirImagenBannerAdmin,
} from "@/lib/api";
import { SelectorImagen } from "@/components/SelectorImagen";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const LIMITE_PAGINA = 25;

export default function BannersAdminPage() {
  const [resultado, setResultado] = useState<ResultadoBanners | null>(null);
  const [cargandoLista, setCargandoLista] = useState(false);
  // Paginación real (23-sep-2026) -- ver el comentario del backend.
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [busquedaFiltro, setBusquedaFiltro] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosBanners>({ pagina: 1, limite: LIMITE_PAGINA });
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [enlaceUrl, setEnlaceUrl] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargandoLista(true);
    listarBannersPropiosAdmin(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los banners."))
      .finally(() => setCargandoLista(false));
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setAplicados({
      activo: estadoFiltro === "" ? undefined : estadoFiltro === "activo",
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
    if (!token || !titulo.trim() || !imagenUrl.trim() || !enlaceUrl.trim()) {
      setErrorForm("Completa título, imagen y enlace para continuar.");
      return;
    }
    setGuardando(true);
    try {
      await crearBannerPropioAdmin(token, {
        titulo: titulo.trim(),
        imagenUrl: imagenUrl.trim(),
        enlaceUrl: enlaceUrl.trim(),
      });
      setTitulo("");
      setImagenUrl("");
      setEnlaceUrl("");
      setMensajeExito(`Banner "${titulo.trim()}" creado correctamente.`);
      cargar();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el banner.";
      setErrorForm(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(banner: BannerPropio) {
    const token = obtenerToken();
    if (!token) return;
    try {
      await actualizarBannerPropioAdmin(token, banner.id, { activo: !banner.activo });
      cargar();
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : "No se pudo actualizar el banner.");
    }
  }

  async function eliminar(banner: BannerPropio) {
    const token = obtenerToken();
    if (!token) return;
    try {
      await eliminarBannerPropioAdmin(token, banner.id);
      setMensajeExito(`Banner "${banner.titulo}" eliminado.`);
      cargar();
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : "No se pudo eliminar el banner.");
    }
  }

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />

      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Banners propios</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Promoción de productos propios (DevX, Surebets24/7, el terminal, etc.) en la portada — no es venta a
          terceros, esa parte del sistema comercial llega más adelante.
        </p>
      </div>

      <form onSubmit={crear} className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2">
        <div>
          <label htmlFor="banner-titulo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Título (interno, no se muestra)
          </label>
          <input
id="banner-titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="DevX — servicios de desarrollo"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="banner-enlace" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Enlace al hacer clic
          </label>
          <input
id="banner-enlace"
            type="text"
            value={enlaceUrl}
            onChange={(e) => setEnlaceUrl(e.target.value)}
            placeholder="https://devx.example.com"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">Imagen del banner</span>
          <SelectorImagen
            id="banner-imagen"
            valor={imagenUrl}
            onCambio={setImagenUrl}
            subir={async (archivo) => {
              const token = obtenerToken();
              if (!token) throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");
              return subirImagenBannerAdmin(token, archivo);
            }}
          />
        </div>

        {errorForm && <p className="sm:col-span-2 text-sm font-medium text-red-600">{errorForm}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="h-[42px] w-fit rounded-lg bg-brand px-5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50 sm:col-span-2"
        >
          {guardando ? "Creando..." : "Crear banner"}
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
          <label htmlFor="banner-filtro-estado" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Estado
          </label>
          <select
            id="banner-filtro-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label htmlFor="banner-filtro-busqueda" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Buscar
          </label>
          <input
            id="banner-filtro-busqueda"
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            placeholder="Título del banner"
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

      <div className="space-y-3">
        {resultado === null && <p className="text-sm text-brand-dark/50">Cargando...</p>}
        {resultado !== null && resultado.filas.length === 0 && !cargandoLista && (
          <p className="rounded-2xl bg-white px-6 py-8 text-center text-sm text-brand-dark/50 shadow-sm ring-1 ring-black/5">
            No hay banners que coincidan con estos filtros.
          </p>
        )}
        {resultado?.filas.map((b) => (
          <div
            key={b.id}
            className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:flex-row sm:items-center sm:gap-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica, no un asset local */}
            <img src={b.imagenUrl} alt={b.titulo} className="h-32 w-full rounded-lg object-cover ring-1 ring-black/5 sm:h-16 sm:w-28 sm:shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-dark">{b.titulo}</p>
              <p className="truncate text-xs text-brand-dark/50">{b.enlaceUrl}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  b.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {b.activo ? "Activo" : "Inactivo"}
              </span>
              <button
                onClick={() => alternarActivo(b)}
                className="rounded-lg border border-brand-light px-3 py-1.5 text-sm font-semibold text-brand-dark/70 transition hover:bg-brand-light/40"
              >
                {b.activo ? "Desactivar" : "Activar"}
              </button>
              <button
                onClick={() => eliminar(b)}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {resultado !== null && resultado.total > 0 && (
          <div className="flex items-center justify-between rounded-2xl bg-white px-6 py-3 text-sm text-brand-dark/70 shadow-sm ring-1 ring-black/5">
            <span>
              {resultado.total} banner(s) · Página {pagina} de {Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA))}
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
