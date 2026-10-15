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
        <h1 className="text-2xl font-bold text-brand-dark">Banners propios</h1>
        <p className="mt-1 text-sm text-muted-2">
          Promoción de productos propios (DevX, Surebets24/7, el terminal, etc.) en la portada — no es venta a
          terceros, esa parte del sistema comercial llega más adelante.
        </p>
      </div>

      <form onSubmit={crear} className="grid grid-cols-1 gap-4 kb-card kb-on-white p-6 sm:grid-cols-2">
        <div>
          <label htmlFor="banner-titulo" className="kb-label">
            Título (interno, no se muestra)
          </label>
          <input
id="banner-titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="DevX — servicios de desarrollo"
            className="w-full kb-input"
          />
        </div>
        <div>
          <label htmlFor="banner-enlace" className="kb-label">
            Enlace al hacer clic
          </label>
          <input
id="banner-enlace"
            type="text"
            value={enlaceUrl}
            onChange={(e) => setEnlaceUrl(e.target.value)}
            placeholder="https://devx.example.com"
            className="w-full kb-input"
          />
        </div>
        <div className="sm:col-span-2">
          <span className="kb-label">Imagen del banner</span>
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

        {errorForm && <p className="sm:col-span-2 text-sm font-medium text-kberror">{errorForm}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="kb-btn kb-btn--dark !h-[42px] w-fit !px-5 !text-sm disabled:opacity-50 sm:col-span-2"
        >
          {guardando ? "Creando..." : "Crear banner"}
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
          <label htmlFor="banner-filtro-estado" className="kb-label">
            Estado
          </label>
          <select
            id="banner-filtro-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="w-full kb-input !h-11 !text-sm"
          >
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label htmlFor="banner-filtro-busqueda" className="kb-label">
            Buscar
          </label>
          <input
            id="banner-filtro-busqueda"
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            placeholder="Título del banner"
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

      <div className="space-y-3">
        {resultado === null && <p className="text-sm text-muted-2">Cargando...</p>}
        {resultado !== null && resultado.filas.length === 0 && !cargandoLista && (
          <p className="kb-card kb-on-white px-6 py-8 text-center text-sm text-muted-2">
            No hay banners que coincidan con estos filtros.
          </p>
        )}
        {resultado?.filas.map((b) => (
          <div
            key={b.id}
            className="flex flex-col gap-3 kb-card kb-on-white p-4 sm:flex-row sm:items-center sm:gap-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica, no un asset local */}
            <img src={b.imagenUrl} alt={b.titulo} className="h-32 w-full rounded-lg object-cover ring-1 ring-line sm:h-16 sm:w-28 sm:shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-dark">{b.titulo}</p>
              <p className="truncate text-xs text-muted-2">{b.enlaceUrl}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`kb-status ${
                  b.activo ? "kb-status--ok" : "kb-status--off"
                }`}
              >
                {b.activo ? "Activo" : "Inactivo"}
              </span>
              <button
                onClick={() => alternarActivo(b)}
                className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
              >
                {b.activo ? "Desactivar" : "Activar"}
              </button>
              <button
                onClick={() => eliminar(b)}
                className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm text-kberror"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {resultado !== null && resultado.total > 0 && (
          <div className="flex items-center justify-between kb-card kb-on-white px-6 py-3 text-sm text-muted-2">
            <span>
              {resultado.total} banner(s) · Página {pagina} de {Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA))}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1 || cargandoLista}
                className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagina((p) => Math.min(Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)), p + 1))}
                disabled={pagina >= Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) || cargandoLista}
                className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
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
