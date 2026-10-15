"use client";

import { useCallback, useEffect, useState } from "react";
import {
  crearTipoVehiculoCoop,
  crearUnidadCoop,
  listarTiposVehiculoCoop,
  buscarUnidadesCoop,
  actualizarEstadoUnidadCoop,
  AMENIDADES_CATALOGO,
  type TipoVehiculoResumen,
  type UnidadResumen,
  type FiltrosUnidades,
  type ResultadoUnidades,
  type Amenidad,
  type DistribucionAsientos,
} from "@/lib/api";
import { obtenerToken, decodificarToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";
import { ConstructorBus } from "./ConstructorBus";

function BotonEstadoUnidad({
  unidad,
  onCambiado,
  onError,
}: {
  unidad: UnidadResumen;
  onCambiado: () => void;
  onError: (mensaje: string) => void;
}) {
  const [guardando, setGuardando] = useState(false);

  async function alternar() {
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    try {
      await actualizarEstadoUnidadCoop(token, unidad.id, !unidad.activo);
      onCambiado();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo actualizar la unidad.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <button
      onClick={alternar}
      disabled={guardando}
      className={`kb-status transition disabled:opacity-50 ${unidad.activo ? "kb-status--ok" : "kb-status--off"}`}
    >
      {unidad.activo ? "Activa" : "Inactiva"}
    </button>
  );
}

const LIMITE_UNIDADES_PAGINA = 25;

export default function UnidadesPage() {
  const [tipos, setTipos] = useState<TipoVehiculoResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Paginación real (22-sep-2026) -- ver el comentario del backend.
  const [activoFiltro, setActivoFiltro] = useState<"" | "true" | "false">("");
  const [busquedaFiltroUnidad, setBusquedaFiltroUnidad] = useState("");
  const [aplicadosUnidades, setAplicadosUnidades] = useState<FiltrosUnidades>({
    pagina: 1,
    limite: LIMITE_UNIDADES_PAGINA,
  });
  const [paginaUnidades, setPaginaUnidades] = useState(1);
  const [resultadoUnidades, setResultadoUnidades] = useState<ResultadoUnidades | null>(null);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);

  // Formulario: tipo de vehículo
  const [nombreTipo, setNombreTipo] = useState("");
  const [categoriaTipo, setCategoriaTipo] = useState<"" | "bus" | "buseta" | "van" | "auto">("");
  const [capacidad, setCapacidad] = useState("");
  // Con el constructor de pisos la capacidad sale de sus asientos y no se edita a mano.
  const [capacidadAuto, setCapacidadAuto] = useState(false);
  const [amenidadesTipo, setAmenidadesTipo] = useState<Amenidad[]>([]);
  const [guardandoTipo, setGuardandoTipo] = useState(false);

  // Ítem 14, Fase 2 (05-ago-2026) -- configuración avanzada opcional de
  // distribución de asientos con etiquetas (VIP, mujeres) por asiento
  // individual. JSON editado a mano con vista previa en vivo -- mismo
  // criterio que la carga masiva (ítem 8): frontend provisional, sin
  // construir un editor visual de arrastrar-y-soltar en esta fase.
  const [distribucionAbierta, setDistribucionAbierta] = useState(false);
  const [distribucionJson, setDistribucionJson] = useState("");
  const [distribucionParseada, setDistribucionParseada] = useState<DistribucionAsientos | null>(
    null,
  );
  const [errorDistribucion, setErrorDistribucion] = useState<string | null>(null);
  const [errorTipo, setErrorTipo] = useState<string | null>(null);

  // Formulario: unidad
  const [tipoElegido, setTipoElegido] = useState("");
  const [placa, setPlaca] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [guardandoUnidad, setGuardandoUnidad] = useState(false);
  const [errorUnidad, setErrorUnidad] = useState<string | null>(null);

  function cargarTipos() {
    const token = obtenerToken();
    if (!token) return;
    listarTiposVehiculoCoop(token)
      .then(setTipos)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la información."));
  }

  useEffect(cargarTipos, []);

  const cargarUnidades = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargandoUnidades(true);
    buscarUnidadesCoop(token, { ...aplicadosUnidades, pagina: paginaUnidades, limite: LIMITE_UNIDADES_PAGINA })
      .then(setResultadoUnidades)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las unidades."))
      .finally(() => setCargandoUnidades(false));
  }, [aplicadosUnidades, paginaUnidades]);

  useEffect(cargarUnidades, [cargarUnidades]);

  function filtrarUnidades(e: React.FormEvent) {
    e.preventDefault();
    setPaginaUnidades(1);
    setAplicadosUnidades({
      activo: activoFiltro === "" ? undefined : activoFiltro === "true",
      busqueda: busquedaFiltroUnidad.trim() || undefined,
      pagina: 1,
      limite: LIMITE_UNIDADES_PAGINA,
    });
  }

  function limpiarFiltrosUnidades() {
    setActivoFiltro("");
    setBusquedaFiltroUnidad("");
    setPaginaUnidades(1);
    setAplicadosUnidades({ pagina: 1, limite: LIMITE_UNIDADES_PAGINA });
  }

  // Crear un tipo de vehículo y crear una unidad ambos afectan solo su
  // propia lista -- cargarTipos()/cargarUnidades() se llaman por
  // separado más abajo, no un cargarTodo() combinado.

  function alternarAmenidadTipo(valor: Amenidad) {
    setAmenidadesTipo((actuales) =>
      actuales.includes(valor) ? actuales.filter((a) => a !== valor) : [...actuales, valor],
    );
  }

  /**
   * Ítem 14 (05-ago-2026) -- parseo en vivo, cada vez que la cooperativa
   * escribe. Si el JSON es inválido o está vacío, no bloquea el resto
   * del formulario -- la distribución de asientos siempre fue opcional.
   */
  function actualizarDistribucionJson(texto: string) {
    setDistribucionJson(texto);
    setErrorDistribucion(null);
    if (!texto.trim()) {
      setDistribucionParseada(null);
      return;
    }
    try {
      const parsed = JSON.parse(texto) as DistribucionAsientos;
      if (!Array.isArray(parsed.pisos)) {
        throw new Error('Debe tener un campo "pisos" con una lista.');
      }
      setDistribucionParseada(parsed);
    } catch (err) {
      setDistribucionParseada(null);
      setErrorDistribucion(err instanceof Error ? err.message : "JSON inválido.");
    }
  }

  /**
   * Fase 7-VIP (17-ago-2026, orden real del director): la vista previa
   * deja de ser de solo lectura -- reutiliza EXACTAMENTE el mismo
   * mecanismo real ya existente (piso.categoria === 'vip' se hereda a
   * todos sus asientos, interpretarCelda ya lo maneja) en vez de
   * inventar uno nuevo. Investigado contra plataformas profesionales
   * de venta de asientos (Eventive, Seatmap.pro): separan "construir
   * la estructura" de "categorizar los asientos" -- mismo criterio
   * aquí. Contexto real del director: en Ecuador, un bus VIP casi
   * siempre es de 2 pisos con el primero completo como VIP -- por eso
   * el caso principal es un interruptor POR PISO, no clic por clic.
   */
  function actualizarDistribucionDesdeObjeto(nuevo: DistribucionAsientos) {
    setDistribucionParseada(nuevo);
    setDistribucionJson(JSON.stringify(nuevo, null, 2));
  }

  async function crearTipo(e: React.FormEvent) {
    e.preventDefault();
    setErrorTipo(null);
    const token = obtenerToken();
    if (!token || !nombreTipo.trim() || !capacidad) {
      setErrorTipo("Escribe un nombre y una capacidad.");
      return;
    }
    if (distribucionJson.trim() && !distribucionParseada) {
      setErrorTipo("La distribución de asientos tiene un error -- revisa el JSON o bórralo para omitirla.");
      return;
    }
    setGuardandoTipo(true);
    try {
      await crearTipoVehiculoCoop(token, {
        nombre: nombreTipo.trim(),
        categoria: categoriaTipo || undefined,
        capacidadTotal: Number(capacidad),
        amenidades: amenidadesTipo.length > 0 ? amenidadesTipo : undefined,
        distribucionAsientos: distribucionParseada ?? undefined,
      });
      setMensajeExito(`Tipo de vehículo "${nombreTipo.trim()}" creado correctamente.`);
      setNombreTipo("");
      setCategoriaTipo("");
      setCapacidad("");
      setCapacidadAuto(false);
      setAmenidadesTipo([]);
      setDistribucionJson("");
      setDistribucionParseada(null);
      cargarTipos();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el tipo de vehículo.";
      setErrorTipo(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardandoTipo(false);
    }
  }

  async function crearUnidad(e: React.FormEvent) {
    e.preventDefault();
    setErrorUnidad(null);
    const token = obtenerToken();
    if (!token || !tipoElegido || !placa.trim() || !identificador.trim()) {
      setErrorUnidad("Elige el tipo de vehículo y completa placa e identificador operativo.");
      return;
    }
    setGuardandoUnidad(true);
    try {
      await crearUnidadCoop(token, {
        tipoVehiculoId: tipoElegido,
        placa: placa.trim(),
        identificadorOperativo: identificador.trim(),
      });
      setPlaca("");
      setIdentificador("");
      setMensajeExito(`Unidad "${placa.trim()}" registrada correctamente.`);
      cargarUnidades();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear la unidad.";
      setErrorUnidad(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardandoUnidad(false);
    }
  }

  // Hallazgo real, 18-sep-2026: crear/editar tipos de vehículo y
  // unidades es admin_cooperativa solamente en el backend -- el
  // vendedor solo tiene los GET (listar). Mismo criterio que en
  // Rutas y Viajes.
  const token = obtenerToken();
  const esAdmin = token ? decodificarToken(token)?.rol === "admin_cooperativa" : false;

  return (
    <div className="space-y-8">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Unidades</h1>
        <p className="mt-1 text-sm text-muted-2">
          Primero define los tipos de vehículo que operas (bus estándar, buseta, doble piso...), y luego
          registra cada unidad física con su placa y su identificador operativo.
        </p>
      </div>

      {error && (
        <div className="kb-alert kb-alert--error">
          {error}
        </div>
      )}

      {/* ─── Tipos de vehículo ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-brand-dark">Tipos de vehículo</h2>

        {esAdmin && (
        <form
          onSubmit={crearTipo}
          className="grid grid-cols-1 gap-4 kb-card kb-on-white p-6 sm:grid-cols-4 sm:items-end"
        >
          <div>
            <label htmlFor="tipo-vehiculo-nombre" className="kb-label">
              Nombre
            </label>
            <input
              id="tipo-vehiculo-nombre"
              type="text"
              value={nombreTipo}
              onChange={(e) => setNombreTipo(e.target.value)}
              placeholder="Ej. Bus estándar 2+2"
              className="w-full kb-input"
            />
          </div>
          <div>
            <label htmlFor="tipo-vehiculo-categoria" className="kb-label">
              Categoría
            </label>
            <select
              id="tipo-vehiculo-categoria"
              value={categoriaTipo}
              onChange={(e) => setCategoriaTipo(e.target.value as typeof categoriaTipo)}
              className="w-full kb-input"
            >
              <option value="">Sin categoría</option>
              <option value="bus">Bus</option>
              <option value="buseta">Buseta</option>
              <option value="van">Van</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div>
            <label htmlFor="tipo-vehiculo-capacidad" className="kb-label">
              Capacidad (asientos)
            </label>
            <input
              id="tipo-vehiculo-capacidad"
              type="number"
              min="1"
              value={capacidad}
              readOnly={capacidadAuto}
              title={capacidadAuto ? "Se calcula con los asientos de cada piso" : undefined}
              onChange={(e) => setCapacidad(e.target.value)}
              placeholder="40"
              className="w-full kb-input"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoTipo}
            className="kb-btn kb-btn--primary !h-[42px] !px-4 !text-sm"
          >
            {guardandoTipo ? "Guardando..." : "Crear tipo de vehículo"}
          </button>
          {errorTipo && <p className="sm:col-span-3 text-sm font-medium text-kberror">{errorTipo}</p>}
          <div className="sm:col-span-4">
            <label id="tipo-vehiculo-amenidades-label" className="kb-label">
              Amenidades
            </label>
            <div role="group" aria-labelledby="tipo-vehiculo-amenidades-label" className="flex flex-wrap gap-2">
              {AMENIDADES_CATALOGO.map((a) => (
                <button
                  key={a.valor}
                  type="button"
                  onClick={() => alternarAmenidadTipo(a.valor)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    amenidadesTipo.includes(a.valor)
                      ? "bg-kbyellow text-brand-dark"
                      : "bg-kbbg text-muted-2"
                  }`}
                >
                  {a.etiqueta}
                </button>
              ))}
            </div>
          </div>

          {/* Ítem 14, Fase 2 (05-ago-2026) -- distribución de asientos avanzada, opcional */}
          <div className="sm:col-span-4">
            <button
              type="button"
              onClick={() => setDistribucionAbierta((a) => !a)}
              className="text-xs font-semibold text-brand underline decoration-dotted underline-offset-2"
            >
              {distribucionAbierta ? "Ocultar" : "Avanzado: distribución de asientos (VIP, exclusivo mujeres)"}
            </button>

            {distribucionAbierta && (
              <div className="mt-3 space-y-4 rounded-lg bg-kbbg p-4">
                <p className="text-xs text-muted-2">
                  Opcional -- si no lo configuras, se usa una cuadrícula 2+2 de un solo piso. Aquí puedes armar un bus
                  de uno o dos pisos, marcar asientos VIP o reservar filas del frente para mujeres.
                </p>
                <ConstructorBus
                  tieneBano={amenidadesTipo.includes("bano_a_bordo" as Amenidad)}
                  onCambio={(d, total) => {
                    actualizarDistribucionDesdeObjeto(d);
                    setCapacidad(String(total));
                    setCapacidadAuto(true);
                  }}
                  onLimpiar={() => {
                    actualizarDistribucionJson("");
                    setCapacidadAuto(false);
                  }}
                />
                <details className="text-xs text-muted-2">
                  <summary className="cursor-pointer font-semibold">Modo experto: ver o editar el JSON</summary>
                  <textarea
                    value={distribucionJson}
                    onChange={(e) => actualizarDistribucionJson(e.target.value)}
                    rows={10}
                    spellCheck={false}
                    className="mt-2 w-full kb-input"
                  />
                  {errorDistribucion && <p className="mt-1 text-xs font-medium text-kberror">{errorDistribucion}</p>}
                </details>
              </div>
            )}
          </div>
        </form>
        )}

        <div className="overflow-hidden kb-card kb-on-white">
          {tipos !== null && tipos.length === 0 && (
            <p className="px-6 py-6 text-center text-sm text-muted-2">
              Todavía no has creado ningún tipo de vehículo.
            </p>
          )}
          {tipos !== null && tipos.length > 0 && (
            <div className="overflow-x-auto"><table className="kb-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Categoría</th>
                  <th className="px-6 py-3">Amenidades</th>
                  <th className="px-6 py-3 text-right">Capacidad</th>
                </tr>
              </thead>
              <tbody>
                {tipos.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-3 font-medium text-brand-dark">{t.nombre}</td>
                    <td className="px-6 py-3 text-muted-2">
                      {t.categoria ? (
                        <span className="rounded-full bg-kbbg px-2 py-0.5 text-xs font-semibold capitalize text-brand-dark">
                          {t.categoria}
                        </span>
                      ) : (
                        <span className="text-muted-3">Sin categoría</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {(t.amenidades ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(t.amenidades ?? []).map((a) => (
                            <span
                              key={a}
                              className="rounded-full bg-kbbg px-2 py-0.5 text-xs text-muted-2"
                            >
                              {AMENIDADES_CATALOGO.find((cat) => cat.valor === a)?.etiqueta ?? a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-3">Ninguna</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right text-muted-2">{t.capacidadTotal} asientos</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </section>

      {/* ─── Unidades ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-brand-dark">Unidades</h2>

        {esAdmin && (
        <form
          onSubmit={crearUnidad}
          className="grid grid-cols-1 gap-4 kb-card kb-on-white p-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        >
          <div>
            <label htmlFor="unidad-tipo-vehiculo" className="kb-label">
              Tipo de vehículo
            </label>
            <select
              id="unidad-tipo-vehiculo"
              value={tipoElegido}
              onChange={(e) => setTipoElegido(e.target.value)}
              className="w-full kb-input"
            >
              <option value="">Selecciona...</option>
              {tipos?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="unidad-placa" className="kb-label">
              Placa
            </label>
            <input
              id="unidad-placa"
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
              placeholder="ABC-1234"
              className="w-full kb-input"
            />
          </div>
          <div>
            <label htmlFor="unidad-identificador" className="kb-label">
              Identificador operativo (disco)
            </label>
            <input
              id="unidad-identificador"
              type="text"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="Disco 07"
              className="w-full kb-input"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoUnidad || !tipos?.length}
            className="kb-btn kb-btn--primary !h-[42px] !px-4 !text-sm"
          >
            {guardandoUnidad ? "Guardando..." : "Crear unidad"}
          </button>
          {!tipos?.length && tipos !== null && (
            <p className="sm:col-span-2 lg:col-span-4 text-sm text-muted-2">
              Crea primero al menos un tipo de vehículo arriba.
            </p>
          )}
          {errorUnidad && (
            <p className="sm:col-span-2 lg:col-span-4 text-sm font-medium text-kberror">{errorUnidad}</p>
          )}
        </form>
        )}

        <form
          onSubmit={filtrarUnidades}
          className="flex flex-wrap items-end gap-3 kb-card kb-on-white p-4"
        >
          <div>
            <label htmlFor="unidades-estado-filtro" className="kb-label">
              Estado
            </label>
            <select
              id="unidades-estado-filtro"
              value={activoFiltro}
              onChange={(e) => setActivoFiltro(e.target.value as "" | "true" | "false")}
              className="kb-input !h-11 !text-sm"
            >
              <option value="">Todas</option>
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </div>
          <div className="min-w-[220px] flex-1">
            <label htmlFor="unidades-busqueda-filtro" className="kb-label">
              Buscar
            </label>
            <input
              id="unidades-busqueda-filtro"
              value={busquedaFiltroUnidad}
              onChange={(e) => setBusquedaFiltroUnidad(e.target.value)}
              placeholder="Placa, identificador o tipo de vehículo"
              className="w-full kb-input !h-11 !text-sm"
            />
          </div>
          <button type="submit" className="kb-btn kb-btn--primary !h-11 !px-5 !text-sm">
            Filtrar
          </button>
          <button type="button" onClick={limpiarFiltrosUnidades} className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm">
            Limpiar
          </button>
        </form>

        <div className="overflow-hidden kb-card kb-on-white">
          {resultadoUnidades !== null && resultadoUnidades.filas.length === 0 && !cargandoUnidades && (
            <p className="px-6 py-6 text-center text-sm text-muted-2">
              No hay unidades que coincidan con estos filtros.
            </p>
          )}
          {resultadoUnidades !== null && resultadoUnidades.filas.length > 0 && (
            <div className="overflow-x-auto"><table className="kb-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="px-6 py-3">Placa</th>
                  <th className="px-6 py-3">Identificador operativo</th>
                  <th className="px-6 py-3">Tipo de vehículo</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {resultadoUnidades.filas.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-3 font-medium text-brand-dark">{u.placa}</td>
                    <td className="px-6 py-3 text-muted-2">{u.identificadorOperativo}</td>
                    <td className="px-6 py-3 text-muted-2">{u.tipoVehiculoNombre}</td>
                    <td className="px-6 py-3">
                      {esAdmin ? (
                        <BotonEstadoUnidad
                          unidad={u}
                          onCambiado={() => {
                            setMensajeExito(u.activo ? "Unidad desactivada." : "Unidad activada.");
                            cargarUnidades();
                          }}
                          onError={setMensajeError}
                        />
                      ) : (
                        <span
                          className={`kb-status ${
                            u.activo ? "kb-status--ok" : "kb-status--off"
                          }`}
                        >
                          {u.activo ? "Activa" : "Inactiva"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}

          {resultadoUnidades !== null && resultadoUnidades.total > 0 && (
            <div className="flex items-center justify-between border-t border-line px-6 py-3 text-sm text-muted-2">
              <span>
                Página {paginaUnidades} de {Math.max(1, Math.ceil(resultadoUnidades.total / LIMITE_UNIDADES_PAGINA))}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaUnidades((p) => Math.max(1, p - 1))}
                  disabled={paginaUnidades <= 1 || cargandoUnidades}
                  className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    setPaginaUnidades((p) =>
                      Math.min(Math.max(1, Math.ceil(resultadoUnidades.total / LIMITE_UNIDADES_PAGINA)), p + 1),
                    )
                  }
                  disabled={
                    paginaUnidades >= Math.max(1, Math.ceil(resultadoUnidades.total / LIMITE_UNIDADES_PAGINA)) ||
                    cargandoUnidades
                  }
                  className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
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
