"use client";

import { useCallback, useEffect, useState } from "react";
import {
  crearEspacioPublicitario,
  listarEspaciosPublicitarios,
  crearPlanComercial,
  listarPlanesComerciales,
  listarLeads,
  actualizarEstadoLead,
  crearCampana,
  listarCampanas,
  aprobarCampana,
  rechazarCampana,
  obtenerMetricasCampana,
  type EspacioPublicitario,
  type PlanComercial,
  type FiltrosLeads,
  type ResultadoLeads,
  type CampanaPublicitaria,
  type MetricaDiaCampana,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

/**
 * Panel de Comercial/Publicidad (30-jul-2026) -- el backend ya existía
 * y estaba probado desde antes de esta sesión, esto es solo la
 * pantalla que faltaba (hallazgo real de la auditoría de estado del
 * proyecto). Construido con vista previa visual antes de aprobar, CTR
 * calculado, y exportar métricas -- los 3 puntos que quedaron
 * comprometidos en el documento maestro, análisis de publicidad.
 */

const PESTANAS = [
  { valor: "espacios", etiqueta: "Espacios" },
  { valor: "planes", etiqueta: "Planes" },
  { valor: "leads", etiqueta: "Leads" },
  { valor: "campanas", etiqueta: "Campañas" },
] as const;

type Pestana = (typeof PESTANAS)[number]["valor"];

function TabEspacios({ onExito, onError }: { onExito: (m: string) => void; onError: (m: string) => void }) {
  const [espacios, setEspacios] = useState<EspacioPublicitario[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [anchoPx, setAnchoPx] = useState("");
  const [altoPx, setAltoPx] = useState("");
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    const token = obtenerToken();
    if (!token) return;
    listarEspaciosPublicitarios(token).then(setEspacios).catch((err) => onError(err.message));
  }
  useEffect(cargar, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token || !nombre.trim() || !ubicacion.trim() || !anchoPx || !altoPx) return;
    setGuardando(true);
    try {
      await crearEspacioPublicitario(token, {
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim(),
        anchoPx: Number(anchoPx),
        altoPx: Number(altoPx),
      });
      onExito(`Espacio "${nombre.trim()}" creado.`);
      setNombre("");
      setUbicacion("");
      setAnchoPx("");
      setAltoPx("");
      cargar();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo crear.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <form
        onSubmit={crear}
        className="grid grid-cols-1 gap-3 kb-card kb-on-white p-5 sm:grid-cols-5 sm:items-end"
      >
        <div className="sm:col-span-2">
          <label htmlFor="comercial-espacio-nombre" className="kb-label">
            Nombre
          </label>
          <input
            id="comercial-espacio-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Banner horizontal"
            className="w-full kb-input"
          />
        </div>
        <div>
          <label htmlFor="comercial-espacio-ubicacion" className="kb-label">
            Ubicación
          </label>
          <input
            id="comercial-espacio-ubicacion"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            placeholder="landing_top"
            className="w-full kb-input"
          />
        </div>
        <div>
          <label htmlFor="comercial-espacio-ancho" className="kb-label">
            Ancho (px)
          </label>
          <input
            id="comercial-espacio-ancho"
            type="number"
            value={anchoPx}
            onChange={(e) => setAnchoPx(e.target.value)}
            placeholder="970"
            className="w-full kb-input"
          />
        </div>
        <div>
          <label htmlFor="comercial-espacio-alto" className="kb-label">
            Alto (px)
          </label>
          <input
            id="comercial-espacio-alto"
            type="number"
            value={altoPx}
            onChange={(e) => setAltoPx(e.target.value)}
            placeholder="250"
            className="w-full kb-input"
          />
        </div>
        <div className="sm:col-span-5">
          <button
            type="submit"
            disabled={guardando}
            className="kb-btn kb-btn--dark !h-11 !px-5 !text-sm disabled:opacity-50"
          >
            {guardando ? "Creando..." : "Crear espacio"}
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-2">
        {espacios?.map((e) => (
          <div key={e.id} className="flex items-center justify-between kb-card kb-on-white p-4">
            <div>
              <p className="font-semibold text-brand-dark">{e.nombre}</p>
              <p className="text-xs text-muted-2">
                {e.ubicacion} · {e.anchoPx}×{e.altoPx}px
              </p>
            </div>
            <span
              className={`kb-status ${
                e.activo ? "kb-status--ok" : "kb-status--off"
              }`}
            >
              {e.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function TabPlanes({ onExito, onError }: { onExito: (m: string) => void; onError: (m: string) => void }) {
  const [planes, setPlanes] = useState<PlanComercial[] | null>(null);
  const [nombre, setNombre] = useState<"basico" | "destacado" | "premium">("basico");
  const [precio, setPrecio] = useState("");
  const [duracion, setDuracion] = useState("");
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    const token = obtenerToken();
    if (!token) return;
    listarPlanesComerciales(token).then(setPlanes).catch((err) => onError(err.message));
  }
  useEffect(cargar, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    try {
      await crearPlanComercial(token, {
        nombre,
        precioMensual: precio ? Number(precio) : undefined,
        duracionDiasDefault: duracion ? Number(duracion) : undefined,
        formatosPermitidos: ["imagen_texto", "imagen_texto_video"],
      });
      onExito(`Plan "${nombre}" creado.`);
      setPrecio("");
      setDuracion("");
      cargar();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo crear.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <form
        onSubmit={crear}
        className="grid grid-cols-1 gap-3 kb-card kb-on-white p-5 sm:grid-cols-4 sm:items-end"
      >
        <div>
          <label htmlFor="comercial-plan-nombre" className="kb-label">
            Plan
          </label>
          <select
            id="comercial-plan-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value as typeof nombre)}
            className="w-full kb-input"
          >
            <option value="basico">Básico</option>
            <option value="destacado">Destacado</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div>
          <label htmlFor="comercial-plan-precio" className="kb-label">
            Precio mensual (opcional)
          </label>
          <input
            id="comercial-plan-precio"
            type="number"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="150"
            className="w-full kb-input"
          />
        </div>
        <div>
          <label htmlFor="comercial-plan-duracion" className="kb-label">
            Duración por defecto (días)
          </label>
          <input
            id="comercial-plan-duracion"
            type="number"
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            placeholder="30"
            className="w-full kb-input"
          />
        </div>
        <button
          type="submit"
          disabled={guardando}
          className="kb-btn kb-btn--dark !h-11 !px-5 !text-sm disabled:opacity-50"
        >
          {guardando ? "Creando..." : "Crear plan"}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {planes?.map((p) => (
          <div key={p.id} className="flex items-center justify-between kb-card kb-on-white p-4">
            <p className="font-semibold capitalize text-brand-dark">{p.nombre}</p>
            <p className="text-sm text-muted-2">
              {p.precioMensual ? `$${p.precioMensual}/mes` : "Sin precio fijo"}
              {p.duracionDiasDefault && ` · ${p.duracionDiasDefault} días`}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

const LIMITE_LEADS_PAGINA = 25;

function TabLeads({ onExito, onError }: { onExito: (m: string) => void; onError: (m: string) => void }) {
  const [estadoFiltro, setEstadoFiltro] = useState<"" | "nuevo" | "contactado" | "cerrado">("");
  const [busquedaFiltro, setBusquedaFiltro] = useState("");
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosLeads>({
    pagina: 1,
    limite: LIMITE_LEADS_PAGINA,
  });
  const [pagina, setPagina] = useState(1);

  const [resultado, setResultado] = useState<ResultadoLeads | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargando(true);
    listarLeads(token, { ...aplicados, pagina, limite: LIMITE_LEADS_PAGINA })
      .then(setResultado)
      .catch((err) => onError(err.message))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aplicados, pagina]);

  useEffect(cargar, [cargar]);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setAplicados({
      estado: estadoFiltro || undefined,
      busqueda: busquedaFiltro.trim() || undefined,
      desde: desdeFiltro || undefined,
      hasta: hastaFiltro || undefined,
      pagina: 1,
      limite: LIMITE_LEADS_PAGINA,
    });
  }

  function limpiarFiltros() {
    setEstadoFiltro("");
    setBusquedaFiltro("");
    setDesdeFiltro("");
    setHastaFiltro("");
    setPagina(1);
    setAplicados({ pagina: 1, limite: LIMITE_LEADS_PAGINA });
  }

  async function cambiarEstado(id: string, estado: "nuevo" | "contactado" | "cerrado") {
    const token = obtenerToken();
    if (!token) return;
    try {
      await actualizarEstadoLead(token, id, { estado });
      onExito("Estado actualizado.");
      cargar();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo actualizar.");
    }
  }

  const colores = {
    nuevo: "kb-status--wait",
    contactado: "kb-status--wait",
    cerrado: "kb-status--ok",
  };
  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / LIMITE_LEADS_PAGINA)) : 1;
  const claseCampo =
    "w-full kb-btn kb-btn--outline !h-10 !px-4 !text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
  const claseEtiqueta = "kb-label";

  return (
    <div className="space-y-4">
      <form
        onSubmit={filtrar}
        className="grid grid-cols-1 gap-4 kb-card kb-on-white p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
      >
        <div>
          <label htmlFor="leads-estado" className={claseEtiqueta}>Estado</label>
          <select
            id="leads-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as "" | "nuevo" | "contactado" | "cerrado")}
            className={claseCampo}
          >
            <option value="">Todos</option>
            <option value="nuevo">Nuevo</option>
            <option value="contactado">Contactado</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </div>
        <div>
          <label htmlFor="leads-desde" className={claseEtiqueta}>Desde</label>
          <input id="leads-desde" type="date" value={desdeFiltro} onChange={(e) => setDesdeFiltro(e.target.value)} className={claseCampo} />
        </div>
        <div>
          <label htmlFor="leads-hasta" className={claseEtiqueta}>Hasta</label>
          <input id="leads-hasta" type="date" value={hastaFiltro} onChange={(e) => setHastaFiltro(e.target.value)} className={claseCampo} />
        </div>
        <div>
          <label htmlFor="leads-busqueda" className={claseEtiqueta}>Buscar</label>
          <input
            id="leads-busqueda"
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            placeholder="Empresa, nombre o correo"
            className={claseCampo}
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

      <div className="space-y-2">
        {resultado !== null && resultado.filas.length === 0 && !cargando && (
          <p className="mt-8 text-center text-sm text-muted-2">No hay leads que coincidan con estos filtros.</p>
        )}
        {resultado?.filas.map((l) => (
          <div key={l.id} className="kb-card kb-on-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-brand-dark">{l.nombreEmpresa}</p>
                <p className="text-xs text-muted-2">
                  {l.contactoNombre ?? "Sin nombre"} · {l.contactoCorreo}
                  {l.contactoTelefono && ` · ${l.contactoTelefono}`}
                </p>
                {l.mensaje && <p className="mt-1 text-sm text-muted-2">{l.mensaje}</p>}
              </div>
              <span className={`kb-status ${colores[l.estado]}`}>
                {l.estado}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              {(["nuevo", "contactado", "cerrado"] as const)
                .filter((e) => e !== l.estado)
                .map((e) => (
                  <button
                    key={e}
                    onClick={() => cambiarEstado(l.id, e)}
                    className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
                  >
                    Marcar {e}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {resultado !== null && resultado.total > 0 && (
        <div className="flex items-center justify-between kb-card kb-on-white px-4 py-3 text-sm text-muted-2">
          <span>Página {pagina} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || cargando}
              className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || cargando}
              className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VistaPrevia({ campana }: { campana: CampanaPublicitaria }) {
  return (
    <div className="mt-2 overflow-hidden rounded-ctrl bg-kbbg">
      <div className="flex items-center justify-between border-b border-line bg-white px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-3">
          Vista previa — así se vería en la landing
        </span>
        <span className="rounded bg-ink px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
          Publicidad
        </span>
      </div>
      {campana.formato === "imagen_texto_video" ? (
        <video src={campana.archivoUrl} controls className="max-h-56 w-full object-contain bg-black" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- creatividad subida por el anunciante, no un asset local
        <img src={campana.archivoUrl} alt={campana.nombreAnunciante} className="max-h-56 w-full object-contain" />
      )}
    </div>
  );
}

function TabCampanas({ onExito, onError }: { onExito: (m: string) => void; onError: (m: string) => void }) {
  const [campanas, setCampanas] = useState<CampanaPublicitaria[] | null>(null);
  const [metricas, setMetricas] = useState<Record<string, MetricaDiaCampana[]>>({});
  const [espacios, setEspacios] = useState<EspacioPublicitario[]>([]);
  const [planes, setPlanes] = useState<PlanComercial[]>([]);
  const [nuevaCampana, setNuevaCampana] = useState({
    espacioPublicitarioId: "",
    planComercialId: "",
    nombreAnunciante: "",
    formato: "imagen_texto" as "imagen_texto" | "imagen_texto_video",
    archivoUrl: "",
    fechaInicio: "",
    fechaFin: "",
  });
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    const token = obtenerToken();
    if (!token) return;
    listarCampanas(token).then(setCampanas).catch((err) => onError(err.message));
    listarEspaciosPublicitarios(token).then(setEspacios).catch(() => {});
    listarPlanesComerciales(token).then(setPlanes).catch(() => {});
  }
  useEffect(cargar, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    const d = nuevaCampana;
    if (!token || !d.espacioPublicitarioId || !d.planComercialId || !d.nombreAnunciante.trim() || !d.archivoUrl.trim() || !d.fechaInicio || !d.fechaFin) {
      onError("Completa todos los campos.");
      return;
    }
    setGuardando(true);
    try {
      await crearCampana(token, d);
      onExito(`Campaña de "${d.nombreAnunciante}" creada — queda pendiente de revisión.`);
      setNuevaCampana({ espacioPublicitarioId: "", planComercialId: "", nombreAnunciante: "", formato: "imagen_texto", archivoUrl: "", fechaInicio: "", fechaFin: "" });
      cargar();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo crear.");
    } finally {
      setGuardando(false);
    }
  }

  async function aprobar(id: string) {
    const token = obtenerToken();
    if (!token) return;
    try {
      await aprobarCampana(token, id);
      onExito("Campaña aprobada — ya está activa en la landing.");
      cargar();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo aprobar.");
    }
  }

  async function rechazar(id: string) {
    const token = obtenerToken();
    if (!token) return;
    try {
      await rechazarCampana(token, id);
      onExito("Campaña rechazada.");
      cargar();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo rechazar.");
    }
  }

  async function verMetricas(id: string) {
    const token = obtenerToken();
    if (!token) return;
    try {
      const datos = await obtenerMetricasCampana(token, id);
      setMetricas((m) => ({ ...m, [id]: datos }));
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudieron cargar las métricas.");
    }
  }

  function exportarCsv(id: string, nombreAnunciante: string) {
    const filas = metricas[id];
    if (!filas || filas.length === 0) return;
    const encabezado = "fecha,impresiones,clics,ctr\n";
    const cuerpo = filas
      .map((f) => {
        const ctr = f.impresiones > 0 ? ((f.clics / f.impresiones) * 100).toFixed(2) : "0.00";
        return `${f.fecha},${f.impresiones},${f.clics},${ctr}%`;
      })
      .join("\n");
    const blob = new Blob([encabezado + cuerpo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metricas-${nombreAnunciante.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pendientes = campanas?.filter((c) => c.estado === "pendiente_revision") ?? [];
  const activas = campanas?.filter((c) => c.estado === "activa") ?? [];
  const rechazadas = campanas?.filter((c) => c.estado === "rechazada") ?? [];

  return (
    <>
      <form
        onSubmit={crear}
        className="grid grid-cols-1 gap-3 kb-card kb-on-white p-5 sm:grid-cols-2"
      >
        <select
          value={nuevaCampana.espacioPublicitarioId}
          onChange={(e) => setNuevaCampana((d) => ({ ...d, espacioPublicitarioId: e.target.value }))}
          className="kb-input"
        >
          <option value="">Elige un espacio...</option>
          {espacios.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre} ({e.anchoPx}×{e.altoPx})
            </option>
          ))}
        </select>
        <select
          value={nuevaCampana.planComercialId}
          onChange={(e) => setNuevaCampana((d) => ({ ...d, planComercialId: e.target.value }))}
          className="kb-input"
        >
          <option value="">Elige un plan...</option>
          {planes.map((p) => (
            <option key={p.id} value={p.id} className="capitalize">
              {p.nombre}
            </option>
          ))}
        </select>
        <input
          value={nuevaCampana.nombreAnunciante}
          onChange={(e) => setNuevaCampana((d) => ({ ...d, nombreAnunciante: e.target.value }))}
          placeholder="Nombre del anunciante"
          className="kb-input"
        />
        <select
          value={nuevaCampana.formato}
          onChange={(e) => setNuevaCampana((d) => ({ ...d, formato: e.target.value as typeof d.formato }))}
          className="kb-input"
        >
          <option value="imagen_texto">Imagen</option>
          <option value="imagen_texto_video">Video</option>
        </select>
        <input
          value={nuevaCampana.archivoUrl}
          onChange={(e) => setNuevaCampana((d) => ({ ...d, archivoUrl: e.target.value }))}
          placeholder="URL de la imagen o video"
          className="kb-input"
        />
        <input
          type="date"
          value={nuevaCampana.fechaInicio}
          onChange={(e) => setNuevaCampana((d) => ({ ...d, fechaInicio: e.target.value }))}
          className="kb-input"
        />
        <input
          type="date"
          value={nuevaCampana.fechaFin}
          onChange={(e) => setNuevaCampana((d) => ({ ...d, fechaFin: e.target.value }))}
          className="kb-input"
        />
        <button
          type="submit"
          disabled={guardando}
          className="kb-btn kb-btn--dark !h-11 !px-5 !text-sm disabled:opacity-50 sm:col-span-2"
        >
          {guardando ? "Creando..." : "Crear campaña"}
        </button>
      </form>

      {pendientes.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-[#7A5D00]">Pendientes de revisión</h2>
          <div className="mt-2 space-y-3">
            {pendientes.map((c) => (
              <div key={c.id} className="kb-card kb-on-white p-4">
                <p className="font-semibold text-brand-dark">
                  {c.nombreAnunciante} <span className="text-xs font-normal text-muted-2">· {c.espacioNombre} · {c.planNombre}</span>
                </p>
                <VistaPrevia campana={c} />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => aprobar(c.id)}
                    className="kb-btn kb-btn--dark !h-10 !px-4 !text-sm"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => rechazar(c.id)}
                    className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm text-kberror"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activas.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-ok">Activas</h2>
          <div className="mt-2 space-y-3">
            {activas.map((c) => {
              const filas = metricas[c.id];
              const totalImpresiones = filas?.reduce((a, f) => a + f.impresiones, 0) ?? 0;
              const totalClics = filas?.reduce((a, f) => a + f.clics, 0) ?? 0;
              const ctr = totalImpresiones > 0 ? ((totalClics / totalImpresiones) * 100).toFixed(2) : null;
              return (
                <div key={c.id} className="kb-card kb-on-white p-4">
                  <p className="font-semibold text-brand-dark">
                    {c.nombreAnunciante} <span className="text-xs font-normal text-muted-2">· {c.espacioNombre}</span>
                  </p>
                  <p className="text-xs text-muted-3">
                    {c.fechaInicio} — {c.fechaFin}
                  </p>
                  {!filas ? (
                    <button
                      onClick={() => verMetricas(c.id)}
                      className="mt-2 text-xs font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-brand-dark"
                    >
                      Ver métricas
                    </button>
                  ) : (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-kbbg px-3 py-2">
                      <p className="text-sm text-brand-dark">
                        {totalImpresiones} impresiones · {totalClics} clics
                        {ctr !== null && <span className="font-semibold"> · CTR {ctr}%</span>}
                      </p>
                      <button
                        onClick={() => exportarCsv(c.id, c.nombreAnunciante)}
                        className="text-xs font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-brand-dark"
                      >
                        Exportar CSV
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rechazadas.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-muted-3">Rechazadas</h2>
          <div className="mt-2 space-y-2">
            {rechazadas.map((c) => (
              <div key={c.id} className="rounded-ctrl bg-kbbg px-4 py-3">
                <p className="text-sm text-muted-2">{c.nombreAnunciante} · {c.espacioNombre}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function ComercialAdminPage() {
  const [pestanaActiva, setPestanaActiva] = useState<Pestana>("campanas");
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="text-2xl font-bold text-brand-dark">Comercial / Publicidad</h1>
      <p className="mt-1 text-sm text-muted-2">
        Espacios, planes, leads de anunciantes, y campañas — con aprobación obligatoria antes de
        que cualquier anuncio salga en vivo.
      </p>

      <div className="mt-4 flex gap-1 border-b border-line">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            onClick={() => setPestanaActiva(p.valor)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
              pestanaActiva === p.valor
                ? "border-b-2 border-brand text-brand-dark"
                : "text-muted-2 hover:text-ink"
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 kb-alert kb-alert--error">
          {error}
        </div>
      )}

      <div className="mt-6">
        {pestanaActiva === "espacios" && <TabEspacios onExito={setMensajeExito} onError={setError} />}
        {pestanaActiva === "planes" && <TabPlanes onExito={setMensajeExito} onError={setError} />}
        {pestanaActiva === "leads" && <TabLeads onExito={setMensajeExito} onError={setError} />}
        {pestanaActiva === "campanas" && <TabCampanas onExito={setMensajeExito} onError={setError} />}
      </div>
    </main>
  );
}
