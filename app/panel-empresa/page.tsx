"use client";

import { useEffect, useState } from "react";
import {
  obtenerDashboardCoop,
  obtenerDashboardPorDiaCoop,
  obtenerConfiguracionFiscal,
  actualizarConfiguracionFiscal,
  obtenerPerfilCoop,
  actualizarPerfilCoop,
  listarViajesCoop,
  type FilaVentaDelDia,
  type FilaVentaPorDia,
  type ViajeCoopResumen,
  subirLogoCoop,
} from "@/lib/api";
import { SelectorImagen } from "@/components/SelectorImagen";
import { obtenerToken, decodificarToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";
import { usePaginacionLocal, ControlesPaginacion } from "@/components/Paginacion";

/** Día calendario de Ecuador, YYYY-MM-DD (mismo criterio que usa el backend). */
function hoyEcuador() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Guayaquil" });
}

/** Suma (o resta) días a un YYYY-MM-DD sin depender de la zona horaria del navegador. */
function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function primerDiaDelMes(fecha: string) {
  return `${fecha.slice(0, 8)}01`;
}

function ultimoDiaDelMes(fecha: string) {
  const d = new Date(`${primerDiaDelMes(fecha)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

function formatearDia(fecha: string) {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-EC", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

/* Rediseño real Fase 1 (25-ago-2026) -- tarjetas de métrica con
   ícono, mismo patrón visual ya usado en /admin (sección 5.63), pero
   con la insignia en ámbar suave en vez de cobalto -- coherente con
   el acento real de este panel. */
function IconoBoletos({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
      <path d="M13 6v12" strokeDasharray="2 2" />
    </svg>
  );
}
function IconoVentas({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}

function TarjetaMetrica({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono: (props: { className?: string }) => React.ReactElement;
  etiqueta: string;
  valor: React.ReactNode;
}) {
  return (
    <div className="kb-card kb-on-white p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-ctrl bg-kbyellow-soft text-ink">
        <Icono className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-2">{etiqueta}</p>
      <p className="mt-1 text-3xl font-extrabold text-brand-dark">{valor}</p>
    </div>
  );
}

export default function PanelEmpresaDashboard() {
  // Hallazgo real del director, probando la cuenta de vendedor
  // (25-ago-2026): esta pantalla pedía las 3 secciones reales
  // exclusivas de admin_cooperativa (dashboard de ventas, logo,
  // configuración fiscal) sin revisar el rol antes -- un vendedor
  // veía "Forbidden resource" 3 veces, el error crudo del backend, en
  // vez de simplemente no ver esas secciones. Mismo patrón real ya
  // corregido antes en el menú lateral y en la pantalla de Soporte
  // del admin: decodificar el rol localmente (page.tsx no tiene
  // acceso al payload que ya decodificó layout.tsx, sin contexto
  // compartido entre ambos).
  const [rolActual, setRolActual] = useState<string | null>(null);

  // "Viajes de hoy" para el vendedor (25-ago-2026, hallazgo real del
  // director: los 4 botones que había antes duplicaban el menú de
  // arriba, sin aportar nada). Reemplazado por contenido real y
  // distinto -- lista de solo lectura, mismo endpoint real ya
  // accesible para vendedor (`GET /coop/viajes`, ya usado por la
  // sección "Viajes" del menú), filtrada por la fecha de hoy.
  // `fechaSalida` es una columna `date` real (sin componente de hora
  // ni huso horario -- a diferencia de `horaSalidaProgramada`, que sí
  // tiene el gotcha real de zona horaria documentado en
  // ENTREGA_TECNICA_EXHAUSTIVA.md sección 3), así que comparar el
  // string tal cual, sin conversión, es seguro aquí.
  const [viajesHoy, setViajesHoy] = useState<ViajeCoopResumen[] | null>(null);
  const [errorViajesHoy, setErrorViajesHoy] = useState<string | null>(null);

  const [filas, setFilas] = useState<FilaVentaDelDia[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Período consultado (23-sep-2026) -- antes solo se veía "hoy". Los
  // campos de fecha son el borrador; `periodo` es lo ya aplicado.
  const [desdeCampo, setDesdeCampo] = useState(hoyEcuador);
  const [hastaCampo, setHastaCampo] = useState(hoyEcuador);
  const [periodo, setPeriodo] = useState(() => ({ desde: hoyEcuador(), hasta: hoyEcuador() }));
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [porDia, setPorDia] = useState<FilaVentaPorDia[] | null>(null);

  // Detalle por ruta y vendedor: buscador y páginas (25-sep-2026). Los totales del período salen de otra consulta, no de esta lista.
  const [busquedaDetalle, setBusquedaDetalle] = useState("");
  const terminoDetalle = busquedaDetalle.trim().toLowerCase();
  const filasFiltradas = (filas ?? []).filter(
    (f) =>
      terminoDetalle === "" ||
      f.rutaNombre.toLowerCase().includes(terminoDetalle) ||
      (f.vendedorNombre ?? "venta en línea").toLowerCase().includes(terminoDetalle),
  );
  const pagDetalle = usePaginacionLocal(filasFiltradas);
  const pagViajesHoy = usePaginacionLocal(viajesHoy ?? []);

  const [ivaPorcentaje, setIvaPorcentaje] = useState("");
  const [ivaVisible, setIvaVisible] = useState(true);
  const [ivaAutomatico, setIvaAutomatico] = useState(true);
  const [cargandoFiscal, setCargandoFiscal] = useState(true);
  const [guardandoFiscal, setGuardandoFiscal] = useState(false);
  const [mensajeFiscal, setMensajeFiscal] = useState<string | null>(null);
  const [errorFiscal, setErrorFiscal] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState("");
  const [cargandoLogo, setCargandoLogo] = useState(true);
  const [guardandoLogo, setGuardandoLogo] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorLogo, setErrorLogo] = useState<string | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return; // el layout ya se encarga de redirigir si no hay token

    const datos = decodificarToken(token);
    const rol = datos?.rol ?? null;
    setRolActual(rol);

    // Las 3 llamadas de abajo (dashboard, configuración fiscal, perfil
    // con el logo) están correctamente restringidas a admin_cooperativa
    // en el backend -- confirmado por el director que no existe ningún
    // endpoint real equivalente para el vendedor (ni de "ventas
    // propias" ni de ningún otro dato de estas 3 secciones). Se evita
    // la petición desde el inicio, en vez de dejar que falle.
    if (rol !== "admin_cooperativa") {
      setCargandoFiscal(false);
      setCargandoLogo(false);
      // formato real YYYY-MM-DD, mismo que fechaSalida
      const hoy = new Date().toLocaleDateString("sv-SE");
      listarViajesCoop(token, { desde: hoy, hasta: hoy, pagina: 1, limite: 100 })
        .then((resultado) => setViajesHoy(resultado.filas))
        .catch((err) => setErrorViajesHoy(err instanceof Error ? err.message : "No se pudieron cargar los viajes de hoy."));
      return;
    }

    obtenerConfiguracionFiscal(token)
      .then((cfg) => {
        setIvaPorcentaje(String(cfg.ivaPorcentaje));
        setIvaVisible(cfg.ivaVisibleEnBoleto);
        setIvaAutomatico(cfg.ivaSigueTasaNacional);
      })
      .catch((err) => setErrorFiscal(err instanceof Error ? err.message : "No se pudo cargar la configuración fiscal."))
      .finally(() => setCargandoFiscal(false));

    obtenerPerfilCoop(token)
      .then((perfil) => setLogoUrl(perfil.logoUrl ?? ""))
      .catch((err) => setErrorLogo(err instanceof Error ? err.message : "No se pudo cargar el logo."))
      .finally(() => setCargandoLogo(false));
  }, []);

  // Ventas del período elegido (solo admin_cooperativa; el resto no ve esta sección).
  useEffect(() => {
    const token = obtenerToken();
    if (!token || rolActual !== "admin_cooperativa") return;
    setCargandoVentas(true);
    setError(null);
    Promise.all([obtenerDashboardCoop(token, periodo), obtenerDashboardPorDiaCoop(token, periodo)])
      .then(([detalle, dias]) => {
        setFilas(detalle);
        setPorDia(dias);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard."))
      .finally(() => setCargandoVentas(false));
  }, [periodo, rolActual]);

  function aplicarPeriodo(desde: string, hasta: string) {
    setDesdeCampo(desde);
    setHastaCampo(hasta);
    setPeriodo({ desde, hasta });
  }

  function aplicarRangoLibre(e: React.FormEvent) {
    e.preventDefault();
    if (!desdeCampo || !hastaCampo) {
      setError("Indica la fecha desde y la fecha hasta.");
      return;
    }
    if (desdeCampo > hastaCampo) {
      setError('La fecha "desde" no puede ser posterior a "hasta".');
      return;
    }
    setPeriodo({ desde: desdeCampo, hasta: hastaCampo });
  }

  async function guardarLogo(e: React.FormEvent) {
    e.preventDefault();
    setErrorLogo(null);
    const token = obtenerToken();
    if (!token) return;
    setGuardandoLogo(true);
    try {
      await actualizarPerfilCoop(token, logoUrl.trim());
      setMensajeExito(logoUrl.trim() ? "Logo actualizado." : "Logo eliminado.");
    } catch (err) {
      setErrorLogo(err instanceof Error ? err.message : "No se pudo guardar el logo.");
    } finally {
      setGuardandoLogo(false);
    }
  }


  async function guardarFiscal(e: React.FormEvent) {
    e.preventDefault();
    setErrorFiscal(null);
    setMensajeFiscal(null);
    const token = obtenerToken();
    const valor = Number(ivaPorcentaje);
    if (!token || Number.isNaN(valor) || valor < 0 || valor > 100) {
      setErrorFiscal("Escribe un porcentaje válido entre 0 y 100.");
      return;
    }
    setGuardandoFiscal(true);
    try {
      await actualizarConfiguracionFiscal(token, {
        ivaPorcentaje: valor,
        ivaVisibleEnBoleto: ivaVisible,
        ivaSigueTasaNacional: ivaAutomatico,
      });
      setMensajeFiscal("Configuración guardada.");
    } catch (err) {
      setErrorFiscal(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoFiscal(false);
    }
  }

  const totalBoletos = filas?.reduce((acc, f) => acc + f.totalBoletos, 0) ?? 0;
  const totalVentas = filas?.reduce((acc, f) => acc + f.totalVentas, 0) ?? 0;

  const hoy = hoyEcuador();
  const ayer = sumarDias(hoy, -1);
  const inicioMesPasado = primerDiaDelMes(sumarDias(primerDiaDelMes(hoy), -1));
  const esUnSoloDia = periodo.desde === periodo.hasta;
  const etiquetaPeriodo = esUnSoloDia
    ? periodo.desde === hoy
      ? "hoy"
      : periodo.desde === ayer
        ? "ayer"
        : `el ${formatearDia(periodo.desde)}`
    : `del ${formatearDia(periodo.desde)} al ${formatearDia(periodo.hasta)}`;
  const claseAtajo = (activo: boolean) =>
    `rounded-lg border px-3 py-2 text-sm font-semibold transition ${
      activo
        ? "border-ink bg-ink text-white"
        : "border-line bg-white text-muted-2 hover:bg-kbbg"
    }`;
  const totalPorDiaBoletos = porDia?.reduce((acc, d) => acc + d.totalBoletos, 0) ?? 0;
  const totalPorDiaVentas = porDia?.reduce((acc, d) => acc + d.totalVentas, 0) ?? 0;

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      {rolActual === "admin_cooperativa" ? (
        <>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Ventas</h1>
            <p className="mt-1 text-sm text-muted-2">
              Boletos vendidos en línea y en ventanilla, por ruta y por vendedor. Elige el día o el período que
              quieres revisar.
            </p>
          </div>

          <div className="space-y-4 kb-card kb-on-white p-5">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => aplicarPeriodo(hoy, hoy)} className={claseAtajo(periodo.desde === hoy && periodo.hasta === hoy)}>
                Hoy
              </button>
              <button type="button" onClick={() => aplicarPeriodo(ayer, ayer)} className={claseAtajo(periodo.desde === ayer && periodo.hasta === ayer)}>
                Ayer
              </button>
              <button
                type="button"
                onClick={() => aplicarPeriodo(primerDiaDelMes(hoy), ultimoDiaDelMes(hoy))}
                className={claseAtajo(periodo.desde === primerDiaDelMes(hoy) && periodo.hasta === ultimoDiaDelMes(hoy))}
              >
                Este mes
              </button>
              <button
                type="button"
                onClick={() => aplicarPeriodo(inicioMesPasado, ultimoDiaDelMes(inicioMesPasado))}
                className={claseAtajo(periodo.desde === inicioMesPasado && periodo.hasta === ultimoDiaDelMes(inicioMesPasado))}
              >
                Mes pasado
              </button>
            </div>
            <form onSubmit={aplicarRangoLibre} className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
              <div>
                <label htmlFor="panel-desde" className="kb-label">
                  Desde
                </label>
                <input
                  id="panel-desde"
                  type="date"
                  value={desdeCampo}
                  max={hoy}
                  onChange={(e) => setDesdeCampo(e.target.value)}
                  className="w-full kb-input !h-11 !text-sm"
                />
              </div>
              <div>
                <label htmlFor="panel-hasta" className="kb-label">
                  Hasta
                </label>
                <input
                  id="panel-hasta"
                  type="date"
                  value={hastaCampo}
                  onChange={(e) => setHastaCampo(e.target.value)}
                  className="w-full kb-input !h-11 !text-sm"
                />
              </div>
              <button type="submit" className="kb-btn kb-btn--dark !h-10 !px-4 !text-sm">
                Ver período
              </button>
            </form>
          </div>

          {error && (
            <div className="kb-alert kb-alert--error">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TarjetaMetrica icono={IconoBoletos} etiqueta={`Boletos vendidos ${etiquetaPeriodo}`} valor={filas === null ? "—" : totalBoletos} />
            <TarjetaMetrica
              icono={IconoVentas}
              etiqueta={`Total vendido ${etiquetaPeriodo}`}
              valor={filas === null ? "—" : formatearDolares(totalVentas)}
            />
          </div>

      <div className="overflow-hidden kb-card kb-on-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
          <h2 className="text-base font-bold text-brand-dark">Detalle por ruta y vendedor</h2>
          {filas !== null && filas.length > 0 && (
            <div className="w-full sm:w-64">
              <label htmlFor="detalle-buscar" className="sr-only">
                Buscar por ruta o vendedor
              </label>
              <input
                id="detalle-buscar"
                value={busquedaDetalle}
                onChange={(e) => {
                  setBusquedaDetalle(e.target.value);
                  pagDetalle.setPagina(1);
                }}
                placeholder="Buscar ruta o vendedor"
                className="w-full kb-input !h-11 !text-sm"
              />
            </div>
          )}
        </div>

        {(filas === null || cargandoVentas) && !error && (
          <p className="px-6 py-8 text-center text-sm text-muted-2">Cargando...</p>
        )}

        {filas !== null && filas.length === 0 && !cargandoVentas && (
          <p className="px-6 py-8 text-center text-sm text-muted-2">
            No hay ventas registradas {etiquetaPeriodo}.
          </p>
        )}

        {filas !== null && filas.length > 0 && filasFiltradas.length === 0 && !cargandoVentas && (
          <p className="px-6 py-8 text-center text-sm text-muted-2">Ninguna fila coincide con la búsqueda.</p>
        )}

        {filasFiltradas.length > 0 && !cargandoVentas && (
          <div className="overflow-x-auto"><table className="kb-table min-w-[640px]">
            <thead>
              <tr>
                <th className="px-6 py-3">Ruta</th>
                <th className="px-6 py-3">Vendedor</th>
                <th className="px-6 py-3 text-right">Boletos</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {pagDetalle.visibles.map((fila, i) => (
                <tr key={i}>
                  <td className="px-6 py-3 font-medium text-brand-dark">{fila.rutaNombre}</td>
                  <td className="px-6 py-3 text-muted-2">
                    {fila.vendedorNombre ?? "Venta en línea"}
                  </td>
                  <td className="px-6 py-3 text-right text-muted-2">{fila.totalBoletos}</td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-dark">
                    {formatearDolares(fila.totalVentas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        {!cargandoVentas && (
          <ControlesPaginacion
            pagina={pagDetalle.pagina}
            totalPaginas={pagDetalle.totalPaginas}
            total={pagDetalle.total}
            etiqueta="fila"
            onCambio={pagDetalle.setPagina}
            className="border-t border-line"
          />
        )}
      </div>

      {!esUnSoloDia && porDia !== null && porDia.length > 0 && !cargandoVentas && (
        <div className="overflow-hidden kb-card kb-on-white">
          <div className="border-b border-line px-6 py-4">
            <h2 className="text-base font-bold text-brand-dark">Consolidado por día</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="kb-table min-w-[480px]">
              <thead>
                <tr>
                  <th className="px-6 py-3">Día</th>
                  <th className="px-6 py-3 text-right">Boletos</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {porDia.map((d) => (
                  <tr key={d.fecha}>
                    <td className="px-6 py-3 font-medium capitalize text-brand-dark">{formatearDia(d.fecha)}</td>
                    <td className="px-6 py-3 text-right text-muted-2">{d.totalBoletos}</td>
                    <td className="px-6 py-3 text-right font-semibold text-brand-dark">{formatearDolares(d.totalVentas)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-line-2 bg-kbbg font-bold text-brand-dark">
                <tr>
                  <td className="px-6 py-3">Total del período</td>
                  <td className="px-6 py-3 text-right">{totalPorDiaBoletos}</td>
                  <td className="px-6 py-3 text-right">{formatearDolares(totalPorDiaVentas)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-hidden kb-card kb-on-white p-6">
        <h2 className="text-base font-bold text-brand-dark">Logo de la cooperativa</h2>
        <p className="mt-1 text-sm text-muted-2">
          Se muestra junto al nombre de tu cooperativa en los resultados de búsqueda del pasajero. Súbelo desde tu
          computador o celular; la imagen se reduce automáticamente para que cargue rápido.
        </p>

        {cargandoLogo ? (
          <p className="mt-4 text-sm text-muted-2">Cargando...</p>
        ) : (
          <form onSubmit={guardarLogo} className="mt-4 space-y-4">
            <SelectorImagen
              id="panel-logo-url"
              valor={logoUrl}
              onCambio={setLogoUrl}
              redonda
              subir={async (archivo) => {
                const token = obtenerToken();
                if (!token) throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");
                const url = await subirLogoCoop(token, archivo);
                setMensajeExito("Logo actualizado.");
                return url;
              }}
              onError={setErrorLogo}
            />
            <button
              type="submit"
              disabled={guardandoLogo}
              className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm disabled:opacity-50"
            >
              {guardandoLogo ? "Guardando..." : "Guardar enlace"}
            </button>
          </form>
        )}
        {errorLogo && <p className="mt-3 text-sm font-medium text-kberror">{errorLogo}</p>}
      </div>

      <div className="overflow-hidden kb-card kb-on-white p-6">
        <h2 className="text-base font-bold text-brand-dark">Configuración de IVA</h2>
        <p className="mt-1 text-sm text-muted-2">
          El precio de cada boleto ya incluye este porcentaje — no se suma aparte al total.
        </p>

        {cargandoFiscal ? (
          <p className="mt-4 text-sm text-muted-2">Cargando...</p>
        ) : (
          <form onSubmit={guardarFiscal} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="panel-iva-porcentaje" className="kb-label">
                Porcentaje de IVA
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="panel-iva-porcentaje"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={ivaPorcentaje}
                  onChange={(e) => setIvaPorcentaje(e.target.value)}
                  className="kb-input"
                />
                <span className="text-muted-2">%</span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-2">
              <input
                type="checkbox"
                checked={ivaVisible}
                onChange={(e) => setIvaVisible(e.target.checked)}
                className="kb-input"
              />
              Mostrar el desglose de IVA en el boleto del pasajero
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-2">
              <input
                type="checkbox"
                checked={ivaAutomatico}
                onChange={(e) => setIvaAutomatico(e.target.checked)}
                className="kb-input"
              />
              Seguir el IVA nacional automáticamente
            </label>
            <button
              type="submit"
              disabled={guardandoFiscal}
              className="kb-btn kb-btn--primary !h-[42px] !px-4 !text-sm"
            >
              {guardandoFiscal ? "Guardando..." : "Guardar"}
            </button>
          </form>
        )}
        {mensajeFiscal && <p className="mt-3 text-sm font-medium text-ok">{mensajeFiscal}</p>}
        {errorFiscal && <p className="mt-3 text-sm font-medium text-kberror">{errorFiscal}</p>}
      </div>
        </>
      ) : (
        // Vendedor real -- hallazgo del director (25-ago-2026): la
        // primera versión de este bloque tenía 4 botones que
        // duplicaban exactamente el menú de arriba, sin aportar nada
        // nuevo. Reemplazado por contenido real y distinto: lista de
        // solo lectura de los viajes que salen hoy, mismo endpoint ya
        // accesible para vendedor -- no un dato inventado.
        <div className="kb-card kb-on-white p-8">
          <h1 className="text-2xl font-bold text-brand-dark">Viajes de hoy</h1>
          <p className="mt-1 text-sm text-muted-2">Salidas programadas para hoy, en un vistazo.</p>

          {errorViajesHoy && (
            <div className="mt-4 kb-alert kb-alert--error">
              {errorViajesHoy}
            </div>
          )}

          {viajesHoy === null && !errorViajesHoy && (
            <p className="mt-4 text-sm text-muted-2">Cargando...</p>
          )}

          {viajesHoy !== null && viajesHoy.length === 0 && (
            <p className="mt-4 text-sm text-muted-2">No hay viajes programados para hoy.</p>
          )}

          {viajesHoy !== null && viajesHoy.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-ctrl ring-1 ring-line">
              <div className="overflow-x-auto"><table className="kb-table min-w-[640px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Ruta</th>
                    <th className="px-4 py-3">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {pagViajesHoy.visibles.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-semibold text-brand-dark">
                        {new Date(v.horaSalidaProgramada).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-ink">{v.rutaNombre}</td>
                      <td className="px-4 py-3 text-muted-2">{v.unidadPlaca}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              <ControlesPaginacion
                pagina={pagViajesHoy.pagina}
                totalPaginas={pagViajesHoy.totalPaginas}
                total={pagViajesHoy.total}
                etiqueta="viaje"
                onCambio={pagViajesHoy.setPagina}
                className="border-t border-line"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
