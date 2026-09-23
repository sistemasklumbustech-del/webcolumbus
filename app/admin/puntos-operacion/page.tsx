"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listarPuntosOperacionAdmin,
  crearPuntoOperacionAdmin,
  actualizarPuntoOperacionAdmin,
  listarCooperativasAdmin,
  listarPuntosOperacionPendientesAdmin,
  resolverPuntoOperacionPendienteAdmin,
  type FiltrosPuntosOperacion,
  type ResultadoPuntosOperacion,
  type PuntoOperacionPendiente,
  type CooperativaResumen,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const LIMITE_PAGINA = 25;

const ETIQUETA_TIPO: Record<string, string> = {
  terminal_terrestre: "Terminal terrestre",
  oficina_agencia: "Oficina / agencia",
  parada_intermedia: "Parada intermedia",
};

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

/** Edición en línea de la tasa — hallazgo cerrado 22-jul-2026: antes solo se podía fijar al crear el punto. */
function TasaEditable({
  puntoId,
  valorActual,
  onGuardado,
}: {
  puntoId: string;
  valorActual: number | null;
  onGuardado: (mensaje: string, esError: boolean) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(valorActual !== null ? String(valorActual) : "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const token = obtenerToken();
    const numero = Number(valor);
    if (!token || Number.isNaN(numero) || numero < 0) {
      onGuardado("Escribe un monto válido, igual o mayor a $0.", true);
      return;
    }
    setGuardando(true);
    try {
      await actualizarPuntoOperacionAdmin(token, puntoId, { tasaMonto: numero });
      onGuardado("Tasa actualizada.", false);
      setEditando(false);
    } catch (err) {
      onGuardado(err instanceof Error ? err.message : "No se pudo actualizar la tasa.", true);
    } finally {
      setGuardando(false);
    }
  }

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        className="font-semibold text-brand-dark underline decoration-dotted underline-offset-2 hover:text-brand"
      >
        {valorActual !== null ? formatearDolares(valorActual) : "— fijar tasa"}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <input
        type="number"
        min="0"
        step="0.01"
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="w-20 rounded border border-brand-light px-2 py-1 text-right text-sm"
      />
      <button
        onClick={guardar}
        disabled={guardando}
        className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        ✓
      </button>
      <button
        onClick={() => setEditando(false)}
        className="rounded border border-brand-light px-2 py-1 text-xs text-brand-dark/70 hover:bg-brand-light/40"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Coordenadas reales (17-ago-2026) -- hallazgo real: la columna ya
 * existía en el esquema, pero nunca se pudo escribir desde ningún
 * formulario -- "Ver trayecto en el mapa" nunca funcionó para
 * ninguna terminal por esto. Campo de conveniencia real: en Google
 * Maps, clic derecho sobre un punto → copia las coordenadas
 * exactamente en formato "lat, long" -- se pega tal cual aquí y se
 * separa solo, sin que el admin tenga que escribir 2 campos a mano.
 */
function CoordenadasEditables({
  puntoId,
  latitudActual,
  longitudActual,
  onGuardado,
}: {
  puntoId: string;
  latitudActual: number | null;
  longitudActual: number | null;
  onGuardado: (mensaje: string, esError: boolean) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [pegado, setPegado] = useState(
    latitudActual !== null && longitudActual !== null ? `${latitudActual}, ${longitudActual}` : "",
  );
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const token = obtenerToken();
    const partes = pegado.split(",").map((p) => p.trim());
    if (partes.length !== 2) {
      onGuardado('Pega las 2 coordenadas separadas por coma, ej. "-3.2649, -79.9612".', true);
      return;
    }
    const latitud = Number(partes[0]);
    const longitud = Number(partes[1]);
    if (Number.isNaN(latitud) || latitud < -90 || latitud > 90) {
      onGuardado("La latitud debe ser un número entre -90 y 90.", true);
      return;
    }
    if (Number.isNaN(longitud) || longitud < -180 || longitud > 180) {
      onGuardado("La longitud debe ser un número entre -180 y 180.", true);
      return;
    }
    if (!token) return;
    setGuardando(true);
    try {
      await actualizarPuntoOperacionAdmin(token, puntoId, { latitud, longitud });
      onGuardado("Coordenadas actualizadas.", false);
      setEditando(false);
    } catch (err) {
      onGuardado(err instanceof Error ? err.message : "No se pudo actualizar las coordenadas.", true);
    } finally {
      setGuardando(false);
    }
  }

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        className="font-semibold text-brand-dark underline decoration-dotted underline-offset-2 hover:text-brand"
      >
        {latitudActual !== null && longitudActual !== null ? "📍 con coordenadas" : "— fijar coordenadas"}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <input
        type="text"
        autoFocus
        value={pegado}
        onChange={(e) => setPegado(e.target.value)}
        placeholder="-3.2649, -79.9612"
        title='Clic derecho sobre el punto real en Google Maps, copia las coordenadas, y pégalas aquí tal cual (formato "lat, long")'
        className="w-40 rounded border border-brand-light px-2 py-1 text-right text-sm"
      />
      <button
        onClick={guardar}
        disabled={guardando}
        className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        ✓
      </button>
      <button
        onClick={() => setEditando(false)}
        className="rounded border border-brand-light px-2 py-1 text-xs text-brand-dark/70 hover:bg-brand-light/40"
      >
        ✕
      </button>
    </div>
  );
}

export default function PuntosOperacionAdminPage() {
  const [resultado, setResultado] = useState<ResultadoPuntosOperacion | null>(null);
  const [cargandoPuntos, setCargandoPuntos] = useState(false);
  // Paginación real (23-sep-2026) -- ver el comentario del backend.
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [busquedaFiltro, setBusquedaFiltro] = useState("");
  const [aplicados, setAplicados] = useState<FiltrosPuntosOperacion>({ pagina: 1, limite: LIMITE_PAGINA });
  const [pagina, setPagina] = useState(1);
  const [pendientes, setPendientes] = useState<PuntoOperacionPendiente[]>([]);
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);
  const [cooperativas, setCooperativas] = useState<CooperativaResumen[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<"terminal_terrestre" | "oficina_agencia" | "parada_intermedia">(
    "terminal_terrestre",
  );
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [cooperativaPropietariaId, setCooperativaPropietariaId] = useState("");
  const [tasaMonto, setTasaMonto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const cargarPuntos = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargandoPuntos(true);
    listarPuntosOperacionAdmin(token, { ...aplicados, pagina, limite: LIMITE_PAGINA })
      .then(setResultado)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los puntos de operación."))
      .finally(() => setCargandoPuntos(false));
  }, [aplicados, pagina]);

  useEffect(cargarPuntos, [cargarPuntos]);

  function cargarPendientes() {
    const token = obtenerToken();
    if (!token) return;
    listarPuntosOperacionPendientesAdmin(token)
      .then(setPendientes)
      .catch(() => setPendientes([]));
  }

  function cargar() {
    cargarPuntos();
    cargarPendientes();
  }

  // El desplegable de cooperativa propietaria es opcional -- si falla, queda vacío.
  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    listarCooperativasAdmin(token)
      .then(setCooperativas)
      .catch(() => {});
    cargarPendientes();
  }, []);

  function filtrar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    setAplicados({
      tipo: tipoFiltro || undefined,
      busqueda: busquedaFiltro.trim() || undefined,
      pagina: 1,
      limite: LIMITE_PAGINA,
    });
  }

  function limpiarFiltros() {
    setTipoFiltro("");
    setBusquedaFiltro("");
    setPagina(1);
    setAplicados({ pagina: 1, limite: LIMITE_PAGINA });
  }

  async function resolverPropuesta(id: string, accion: "aprobar" | "rechazar") {
    const token = obtenerToken();
    if (!token) return;
    setResolviendoId(id);
    try {
      await resolverPuntoOperacionPendienteAdmin(token, id, accion);
      setMensajeExito(accion === "aprobar" ? "Punto aprobado -- ya aparece en las búsquedas." : "Propuesta rechazada.");
      cargar();
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : "No se pudo procesar la propuesta.");
    } finally {
      setResolviendoId(null);
    }
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    const token = obtenerToken();
    if (!token || !nombre || !ciudad || !provincia) {
      setErrorForm("Completa tipo, nombre, ciudad y provincia para continuar.");
      return;
    }
    setGuardando(true);
    try {
      await crearPuntoOperacionAdmin(token, {
        tipo,
        nombre: nombre.trim(),
        ciudad: ciudad.trim(),
        provincia: provincia.trim(),
        cooperativaPropietariaId: cooperativaPropietariaId || undefined,
        tasaMonto: tasaMonto ? Number(tasaMonto) : undefined,
      });
      setNombre("");
      setCiudad("");
      setProvincia("");
      setCooperativaPropietariaId("");
      setTasaMonto("");
      setMensajeExito(`Punto de operación "${nombre}" creado correctamente.`);
      cargar();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el punto de operación.";
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
        <h1 className="font-display text-2xl font-bold text-brand-dark">Puntos de operación</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Terminales, oficinas y paradas — cada terminal puede tener su propia tasa fija por pasajero (RF-FLOTA-003).
        </p>
      </div>

      {pendientes.length > 0 && (
        <div className="rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-200">
          <h2 className="font-display text-base font-bold text-amber-900">
            Propuestas de cooperativas pendientes ({pendientes.length})
          </h2>
          <p className="mt-1 text-xs text-amber-800/80">
            Un punto solo aparece en las búsquedas y en las paradas de las rutas después de aprobarlo.
          </p>
          <ul className="mt-4 divide-y divide-amber-200">
            {pendientes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-brand-dark">{p.nombre}</p>
                  <p className="text-xs text-brand-dark/60">
                    {ETIQUETA_TIPO[p.tipo] ?? p.tipo} · {p.ciudad}, {p.provincia} · propone{" "}
                    {p.cooperativaPropietariaNombre ?? "una cooperativa"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolverPropuesta(p.id, "aprobar")}
                    disabled={resolviendoId === p.id}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => resolverPropuesta(p.id, "rechazar")}
                    disabled={resolviendoId === p.id}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        onSubmit={crear}
        className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <label htmlFor="punto-tipo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Tipo
          </label>
          <select
id="punto-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="terminal_terrestre">Terminal terrestre</option>
            <option value="oficina_agencia">Oficina / agencia</option>
            <option value="parada_intermedia">Parada intermedia</option>
          </select>
        </div>
        <div>
          <label htmlFor="punto-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Nombre
          </label>
          <input
id="punto-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Terminal Terrestre de Machala"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="punto-ciudad" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Ciudad
          </label>
          <input
id="punto-ciudad"
            type="text"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            placeholder="Machala"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="punto-provincia" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Provincia
          </label>
          <input
id="punto-provincia"
            type="text"
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
            placeholder="El Oro"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="punto-cooperativa" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Cooperativa propietaria (opcional)
          </label>
          <select
id="punto-cooperativa"
            value={cooperativaPropietariaId}
            onChange={(e) => setCooperativaPropietariaId(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">— Ninguna (terminal público) —</option>
            {cooperativas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombreComercial}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="punto-tasa" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Tasa por pasajero (USD, opcional)
          </label>
          <input
id="punto-tasa"
            type="number"
            min="0"
            step="0.01"
            value={tasaMonto}
            onChange={(e) => setTasaMonto(e.target.value)}
            placeholder="0.60"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>

        {errorForm && (
          <p className="sm:col-span-2 lg:col-span-3 text-sm font-medium text-red-600">{errorForm}</p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="h-[42px] w-fit rounded-lg bg-brand px-5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50 sm:col-span-2 lg:col-span-3"
        >
          {guardando ? "Creando..." : "Crear punto de operación"}
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
          <label htmlFor="punto-filtro-tipo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Tipo
          </label>
          <select
            id="punto-filtro-tipo"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Todos</option>
            <option value="terminal_terrestre">Terminal terrestre</option>
            <option value="oficina_agencia">Oficina / agencia</option>
            <option value="parada_intermedia">Parada intermedia</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="punto-filtro-busqueda" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Buscar
          </label>
          <input
            id="punto-filtro-busqueda"
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            placeholder="Nombre, ciudad o provincia"
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
              : `${resultado.total} punto${resultado.total === 1 ? "" : "s"} de operación con estos filtros`}
          </h2>
        </div>

        {resultado !== null && resultado.filas.length === 0 && !cargandoPuntos && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            No hay puntos de operación que coincidan con estos filtros.
          </p>
        )}

        {resultado !== null && resultado.filas.length > 0 && (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              <tr>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Ciudad</th>
                <th className="px-6 py-3">Propietaria</th>
                <th className="px-6 py-3 text-right">Coordenadas</th>
                <th className="px-6 py-3 text-right">Tasa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {resultado?.filas.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 font-medium text-brand-dark">{p.nombre}</td>
                  <td className="px-6 py-3 text-brand-dark/70">{ETIQUETA_TIPO[p.tipo] ?? p.tipo}</td>
                  <td className="px-6 py-3 text-brand-dark/70">
                    {p.ciudad}, {p.provincia}
                  </td>
                  <td className="px-6 py-3 text-brand-dark/70">{p.cooperativaPropietariaNombre ?? "—"}</td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-dark">
                    <CoordenadasEditables
                      puntoId={p.id}
                      latitudActual={p.latitud}
                      longitudActual={p.longitud}
                      onGuardado={(mensaje, esError) => {
                        if (esError) setMensajeError(mensaje);
                        else {
                          setMensajeExito(mensaje);
                          cargar();
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-dark">
                    <TasaEditable
                      puntoId={p.id}
                      valorActual={p.tasaMonto}
                      onGuardado={(mensaje, esError) => {
                        if (esError) setMensajeError(mensaje);
                        else {
                          setMensajeExito(mensaje);
                          cargar();
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        {resultado !== null && resultado.total > 0 && (
          <div className="flex items-center justify-between border-t border-black/5 px-6 py-3 text-sm text-brand-dark/70">
            <span>
              Página {pagina} de {Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA))}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1 || cargandoPuntos}
                className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagina((p) => Math.min(Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)), p + 1))}
                disabled={pagina >= Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) || cargandoPuntos}
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
