import Link from "next/link";
import {
  buscarViajes,
  buscarAlternativas,
  obtenerBeneficiosReferidos,
  type ResultadoViaje,
} from "@/lib/api";
import { FiltrosBusqueda } from "./FiltrosBusqueda";
import { OrdenarPor } from "./OrdenarPor";
import { CambiarBusqueda } from "./CambiarBusqueda";
import { SIN_FILTROS, aFiltrable, cumpleFiltros, filtrosAUrl, leerFiltros } from "@/lib/filtrar-resultados";
import { TarjetaCooperativaAgrupada } from "./TarjetaCooperativaAgrupada";
import { SinResultadosAlternativas } from "./SinResultadosAlternativas";
import { TiraFechas } from "./TiraFechas";
import { construirQuery } from "@/lib/buscar-url";
import { FRANJAS_HORARIO } from "@/lib/franjas-horario";
import { estimarTrayecto } from "@/lib/trayecto";

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-10-29" -> "Jue 29 oct" (formato corto del encabezado, igual que el buscador). */
function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return `${DIAS_CORTOS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d} ${MESES_CORTOS[m - 1]}`;
}

export default async function ResultadosBusquedaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { origenId, destinoId, origenCiudad, destinoCiudad, fecha, pasajeros, horaDesde, horaHasta } = sp;
  const { vueltaOrigenId, vueltaOrigenCiudad, vueltaDestinoId, vueltaDestinoCiudad, horaVueltaDesde, horaVueltaHasta } = sp;
  // Fase 7-idayvuelta (11-ago-2026) -- fechaVuelta viene del buscador
  // solo si el pasajero activo el interruptor "Ida y vuelta". idaViajeId
  // y idaAsiento llegan cuando ya se eligio el tramo de ida y se esta
  // viendo la busqueda del tramo de vuelta (ver TarjetaResultado, que
  // arma ese link al elegir "Elegir asiento" en el tramo de ida).
  const { fechaVuelta, idaViajeId, idaAsientos, ordenarPor } = sp;
  // Segundo paso de una compra de ida y vuelta: ya se eligió el viaje de
  // ida (idaViajeId) y esta misma página busca el tramo de VUELTA -- la
  // URL trae ya el origen/destino/fecha de la vuelta, no hace falta
  // fechaVuelta. Antes esto dependía de fechaVuelta, que en este paso no
  // viajaba en la URL: el viaje de vuelta elegido se comprobaba como un
  // pasaje suelto y se perdía la ida.
  const esTramoVuelta = !!idaViajeId;
  const esIdaYVuelta = !!fechaVuelta || esTramoVuelta;
  // Origen/destino de la vuelta elegidos en el buscador; si no vienen,
  // se invierte la ida (compatibilidad con enlaces anteriores).
  const vOrigenId = vueltaOrigenId ?? destinoId;
  const vOrigenCiudad = vueltaOrigenCiudad ?? destinoCiudad;
  const vDestinoId = vueltaDestinoId ?? origenId;
  const vDestinoCiudad = vueltaDestinoCiudad ?? origenCiudad;

  if (!origenId || !destinoId || !fecha) {
    return (
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 text-center">
        <p>Faltan datos de búsqueda. Vuelve al inicio e intenta de nuevo.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-ink underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  // Etapa 2 (aprobado por el director, 28-oct-2026): la API trae todas las salidas del día en una
  // sola respuesta; los filtros (hora, comodidades, cooperativa, precio) se aplican sobre esa lista
  // con lib/filtrar-resultados.ts -- la misma función que usa la hoja de filtros del celular para
  // contar "Ver X salidas" en vivo. Mismas reglas que la API.
  const filtros = leerFiltros((clave) => sp[clave]);

  // Fase 5-buscador (16-ago-2026) -- en paralelo con la búsqueda de
  // viajes, no en secuencia (no debe agregar latencia extra). Si
  // falla, el resultado es null -- la franja de beneficio real
  // simplemente no se muestra, sin romper toda la página.
  const promesaBeneficios = obtenerBeneficiosReferidos();
  // Precios por día para la tira de fechas (en paralelo; si falla, la tira muestra "—").
  const promesaFechas = esTramoVuelta
    ? Promise.resolve(null)
    : buscarAlternativas({ origenId, destinoId, fecha, pasajeros: Number(pasajeros ?? 1), completo: true });

  let resultadosIda: ResultadoViaje[] = [];
  let resultadosVuelta: ResultadoViaje[] = [];
  let error: string | null = null;
  try {
    // Fase 7-idayvuelta (11-ago-2026) -- si es ida y vuelta, se buscan
    // los 2 tramos en paralelo (ida: origen->destino; vuelta:
    // destino->origen, invertidos), no uno despues del otro.
    const busquedas = [
      buscarViajes({
        origenId,
        destinoId,
        fecha,
        pasajeros: Number(pasajeros ?? 1),
      }),
    ];
    // Solo en el paso de la ida: se consulta también la vuelta, para
    // avisar desde ya si NO hay viajes de regreso (antes de elegir la
    // ida) en vez de descubrirlo al final.
    if (esIdaYVuelta && !esTramoVuelta && fechaVuelta && vOrigenId && vDestinoId) {
      busquedas.push(
        buscarViajes({
          origenId: vOrigenId,
          destinoId: vDestinoId,
          fecha: fechaVuelta,
          pasajeros: Number(pasajeros ?? 1),
          horaDesde: horaVueltaDesde,
          horaHasta: horaVueltaHasta,
        }),
      );
    }
    const resultados = await Promise.all(busquedas);
    resultadosIda = resultados[0];
    resultadosVuelta = resultados[1] ?? [];
  } catch {
    error = "No se pudo completar la búsqueda. Intenta de nuevo en un momento.";
  }

  // Si la franja de hora elegida deja la lista vacía pero ese día SÍ hay
  // viajes en otros horarios, se muestran directamente (con venta
  // habilitada) y se avisa -- antes la persona veía "no hay viajes" y
  // tenía que adivinar que el filtro de hora era la causa.
  // Todas las salidas del día (sin filtros): de aquí salen las opciones y los conteos de los filtros.
  const todasLasSalidasIda = resultadosIda;
  const filtradasIda = resultadosIda.filter((r) => cumpleFiltros(aFiltrable(r), filtros));
  let ordenFueraDeFranja = false;
  let vueltaFueraDeFranja = false;
  if (!error && filtradasIda.length === 0 && filtros.horaDesde) {
    const sinFiltroHora = resultadosIda.filter((r) => cumpleFiltros(aFiltrable(r), filtros, { hora: true }));
    if (sinFiltroHora.length > 0) {
      resultadosIda = sinFiltroHora;
      ordenFueraDeFranja = true;
    } else {
      resultadosIda = filtradasIda;
    }
  } else {
    resultadosIda = filtradasIda;
  }
  if (
    !error &&
    esIdaYVuelta &&
    !esTramoVuelta &&
    fechaVuelta &&
    resultadosVuelta.length === 0 &&
    horaVueltaDesde &&
    horaVueltaHasta &&
    vOrigenId &&
    vDestinoId
  ) {
    try {
      const sinFiltroHora = await buscarViajes({
        origenId: vOrigenId,
        destinoId: vDestinoId,
        fecha: fechaVuelta,
        pasajeros: Number(pasajeros ?? 1),
      });
      if (sinFiltroHora.length > 0) {
        resultadosVuelta = sinFiltroHora;
        vueltaFueraDeFranja = true;
      }
    } catch {
      /* igual que arriba */
    }
  }
  const franjaElegida = FRANJAS_HORARIO.find((f) => f.horaDesde === horaDesde && f.horaHasta === horaHasta);

  const beneficiosReferidos = await promesaBeneficios;
  const fechasConPrecio = await promesaFechas;
  const preciosPorDia = new Map<string, number>((fechasConPrecio?.fechasCercanas ?? []).map((f) => [f.fecha, Number(f.precioDesde)]));

  // Sin viajes en el tramo de ida (y sin haber fallado la búsqueda):
  // se piden las alternativas reales -- otras fechas, otros destinos
  // desde el mismo origen y qué cooperativas cubren la ruta.
  const alternativas =
    !error && todasLasSalidasIda.length === 0
      ? await buscarAlternativas({ origenId, destinoId, fecha, pasajeros: Number(pasajeros ?? 1) })
      : null;

  // Ida y vuelta sin viajes de regreso ese día: mismas sugerencias, pero
  // para la vuelta (otras fechas, horas y cooperativas de esa ruta).
  const sinViajesDeVuelta = esIdaYVuelta && !esTramoVuelta && !!fechaVuelta && !error && resultadosVuelta.length === 0;
  const alternativasVuelta =
    sinViajesDeVuelta && vOrigenId && vDestinoId && fechaVuelta
      ? await buscarAlternativas({
          origenId: vOrigenId,
          destinoId: vDestinoId,
          fecha: fechaVuelta,
          pasajeros: Number(pasajeros ?? 1),
        })
      : null;

  // Enlaces de las sugerencias: conservan todos los parámetros actuales
  // (pasajeros, filtros, y el estado de una compra de ida y vuelta) y
  // cambian solo lo necesario.
  const paramsActuales: Record<string, string | undefined> = { ...sp };
  const hrefBuscar = (cambios: Record<string, string | null>) => `/buscar?${construirQuery(paramsActuales, cambios)}`;
  const hrefDisponibilidad = (tramo: "principal" | "vuelta") =>
    `/buscar/disponibilidad?${construirQuery(paramsActuales, { tramo })}`;
  const hrefSoloIda = hrefBuscar({
    fechaVuelta: null,
    vueltaOrigenId: null,
    vueltaOrigenCiudad: null,
    vueltaDestinoId: null,
    vueltaDestinoCiudad: null,
    horaVueltaDesde: null,
    horaVueltaHasta: null,
  });

  // Fase 5-buscador (16-ago-2026) -- ordenamiento real, del lado del
  // servidor, sobre los datos reales ya obtenidos -- nunca se inventa
  // ni se reordena en el cliente por separado.
  function ordenar(lista: ResultadoViaje[]): ResultadoViaje[] {
    const copia = [...lista];
    switch (ordenarPor) {
      case "duracion": {
        // "Más rápido": duración del viaje (misma estimación que muestra la tarjeta); sin dato, al final.
        const minutos = (r: ResultadoViaje) => estimarTrayecto(r)?.minutos ?? Number.POSITIVE_INFINITY;
        return copia.sort((a, b) => minutos(a) - minutos(b) || Number(a.precioBase) - Number(b.precioBase));
      }
      case "salida_temprano":
        return copia.sort(
          (a, b) => new Date(a.horaSalidaProgramada).getTime() - new Date(b.horaSalidaProgramada).getTime(),
        );
      case "precio_asc":
      default:
        return copia.sort((a, b) => Number(a.precioBase) - Number(b.precioBase));
    }
  }
  resultadosIda = ordenar(resultadosIda);
  resultadosVuelta = ordenar(resultadosVuelta);

  // Fase 7-idayvuelta (11-ago-2026) -- construye el link de "Elegir
  // asiento" para cada tramo:
  // - Ida, viaje sencillo: va directo a elegir asientos.
  // - Ida, dentro de ida y vuelta: al elegir un viaje de ida, en vez de
  //   ir a elegir asientos, vuelve aqui mismo (a esta pagina de
  //   resultados) pero ahora mostrando el tramo de VUELTA, cargando el
  //   viajeId de ida elegido en la URL para no perderlo.
  // - Vuelta: ya se conoce el viaje de ida (idaViajeId, idaAsiento en
  //   la URL) -- el link de "Elegir asiento" de la vuelta lleva ambos
  //   tramos juntos hacia la pantalla de asientos del tramo de vuelta,
  //   que a su vez debe combinar los 2 en el checkout final.
  // Datos de solo lectura para el resumen de la pantalla de asientos (ruta,
  // salida, cooperativa y tarifa de referencia). Son informativos: el precio
  // real lo calcula el servidor al cotizar y comprar.
  function datosResumen(r: ResultadoViaje): URLSearchParams {
    const p = new URLSearchParams({
      rOrigen: origenCiudad ?? "",
      rDestino: destinoCiudad ?? "",
      rSalida: r.horaSalidaProgramada,
      rCoop: r.cooperativaNombre,
      rPrecio: String(r.precioBase),
    });
    if (r.horaLlegadaEstimada) p.set("rLlegada", r.horaLlegadaEstimada);
    return p;
  }

  function hrefParaIda(r: ResultadoViaje): string {
    const viajeId = r.viajeId;
    if (!esIdaYVuelta) {
      return `/viajes/${viajeId}/asientos?${datosResumen(r).toString()}`;
    }
    // Fase 7-idayvuelta (11-ago-2026) -- hallazgo real corregido: antes
    // esto saltaba directo de vuelta a /buscar, SIN dejar elegir
    // asiento de ida en absoluto. Ahora sí lleva al mapa de asientos
    // real del tramo de ida, cargando los datos del tramo de vuelta en
    // la URL (prefijo "vuelta_") para que esa pantalla sepa que, al
    // terminar de elegir el asiento de ida, debe volver a /buscar por
    // el tramo de vuelta -- no ir directo al checkout.
    const params = new URLSearchParams({
      vuelta_origenId: vOrigenId ?? "",
      vuelta_origenCiudad: vOrigenCiudad ?? "",
      vuelta_destinoId: vDestinoId ?? "",
      vuelta_destinoCiudad: vDestinoCiudad ?? "",
      vuelta_fecha: fechaVuelta ?? "",
      pasajeros: pasajeros ?? "1",
    });
    if (horaVueltaDesde && horaVueltaHasta) {
      params.set("vuelta_horaDesde", horaVueltaDesde);
      params.set("vuelta_horaHasta", horaVueltaHasta);
    }
    datosResumen(r).forEach((valor, clave) => params.set(clave, valor));
    return `/viajes/${viajeId}/asientos?${params.toString()}`;
  }

  function hrefParaVuelta(r: ResultadoViaje): string {
    const viajeId = r.viajeId;
    const params = new URLSearchParams({
      idaViajeId: idaViajeId ?? "",
      idaAsientos: idaAsientos ?? "",
    });
    datosResumen(r).forEach((valor, clave) => params.set(clave, valor));
    // Resumen de la ida (solo informativo), para mostrar las dos rutas en el pago.
    for (const [clave, valor] of Object.entries(sp)) {
      if (valor && /^i(Origen|Destino|Salida|Llegada|Coop|Precio)$/.test(clave)) params.set(clave, valor);
    }
    return `/viajes/${viajeId}/asientos?${params.toString()}`;
  }

  const mostrandoVuelta = esTramoVuelta;
  const resultadosAMostrar = resultadosIda;

  // Corrección real de un bug de producción (17-ago-2026, reportado
  // por el director con evidencia -- "This page couldn't load"):
  // page.tsx es un componente de SERVIDOR, TarjetaCooperativaAgrupada
  // es de CLIENTE -- Next.js no permite pasar una función como prop a
  // través de esa frontera (no es serializable), solo datos.
  // Corregido: en vez de pasar `construirHref` como función, se
  // calcula aquí mismo un mapa real {viajeId: href} con datos ya
  // resueltos (strings), y se le pasa el mapa -- 100% serializable.
  // No se detectó en tsc/next build porque /buscar es una ruta
  // dinámica (no se prerender con datos reales en build) -- solo se
  // manifiesta al navegar de verdad, como hizo el director.
  const hrefsPorViaje: Record<string, string> = {};
  for (const r of resultadosAMostrar) {
    hrefsPorViaje[r.viajeId] = mostrandoVuelta ? hrefParaVuelta(r) : hrefParaIda(r);
  }

  // Filtro rápido por cooperativa (16-ago-2026, orden real de la
  // directora) -- lista de cooperativas ÚNICAS reales presentes en
  // los resultados de ESTA búsqueda (nunca un catálogo fijo -- si una
  // cooperativa no tiene viajes en esta ruta/fecha, no aparece).
  // (El filtro de cooperativa y el de precio ya se aplicaron arriba, junto con los demás.)
  // Datos mínimos de todas las salidas del día para los filtros (opciones, rango de precio, conteo en vivo).
  const salidasParaFiltros = mostrandoVuelta ? [] : todasLasSalidasIda.map(aFiltrable);

  // "Ver horarios" agrupado por cooperativa (17-ago-2026, orden real
  // del director): se agrupan los viajes reales de esta ruta/fecha
  // por cooperativa+tipo de vehículo -- una sola tarjeta por grupo,
  // con todos los horarios reales disponibles dentro. Ordenados por
  // hora de salida ascendente dentro de cada grupo (el primero =
  // salida más próxima, el que se muestra por defecto).
  const gruposMap = new Map<string, ResultadoViaje[]>();
  for (const r of resultadosAMostrar) {
    const clave = `${r.cooperativaId}::${r.tipoVehiculoId}`;
    const grupo = gruposMap.get(clave);
    if (grupo) {
      grupo.push(r);
    } else {
      gruposMap.set(clave, [r]);
    }
  }
  const grupos = Array.from(gruposMap.values()).map((grupo) =>
    [...grupo].sort(
      (a, b) => new Date(a.horaSalidaProgramada).getTime() - new Date(b.horaSalidaProgramada).getTime(),
    ),
  );
  // El orden real elegido (precio/salida más temprano) sigue aplicando
  // a nivel de GRUPO -- se conserva el orden ya calculado arriba en
  // `resultadosAMostrar`, usando el primer viaje de cada grupo (que ya
  // venía ordenado) como representante para ordenar los grupos entre sí.
  grupos.sort(
    (a, b) => resultadosAMostrar.indexOf(a[0]) - resultadosAMostrar.indexOf(b[0]),
  );

  // "Mejor precio" (decisión del director, 28-oct-2026): solo cuando UNA salida es estrictamente más
  // barata que todas las demás. Si el precio más bajo lo comparten dos o más, no se muestra en ninguna.
  const preciosMostrados = resultadosAMostrar.map((r) => Number(r.precioBase));
  const precioMinimo = preciosMostrados.length > 1 ? Math.min(...preciosMostrados) : null;
  const viajeMejorPrecio =
    precioMinimo !== null && preciosMostrados.filter((p) => p === precioMinimo).length === 1
      ? resultadosAMostrar.find((r) => Number(r.precioBase) === precioMinimo)?.viajeId ?? null
      : null;

  // Orden de la directora (16-ago-2026) -- agregado al medir la
  // referencia real con precisión: "Top calificado" también es real,
  // calculado (nunca fijo) -- la calificación más alta entre los
  // resultados, con el mismo umbral mínimo de reseñas que ya usa
  // ResenasCooperativa (5) para no destacar una calificación con muy
  // pocos votos como si fuera representativa.
  const calificacionMaxima =
    resultadosAMostrar
      .filter((r) => r.cooperativaCalificacionPromedio !== null && r.cooperativaCalificacionCantidad >= 5)
      .reduce<number | null>(
        (max, r) => (max === null || r.cooperativaCalificacionPromedio! > max ? r.cooperativaCalificacionPromedio! : max),
        null,
      );

  return (
    <main className="flex-1">
      {/* Barra de resumen de ruta (diseño final): blanca, con el título de la
          ruta y "Cambiar búsqueda". */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-4 px-5 py-3.5 md:px-16 md:py-[18px]">
          <Link href="/" aria-label="Volver" className="kb-btn-round shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold md:text-xl">
              {origenCiudad ?? "Origen"} → {destinoCiudad ?? "Destino"}
            </h1>
            <p className="text-xs text-muted-2 md:text-[13px]">
              {mostrandoVuelta ? "Vuelta · " : ""}
              {formatearFecha(fecha)} · {pasajeros ?? 1} pasajero{Number(pasajeros ?? 1) > 1 ? "s" : ""}
            </p>
            {esIdaYVuelta && !mostrandoVuelta && fechaVuelta && (
              <p className="text-xs text-muted-2 md:text-[13px]">
                Vuelta: {vOrigenCiudad ?? "Origen"} → {vDestinoCiudad ?? "Destino"} · {formatearFecha(fechaVuelta)}
              </p>
            )}
          </div>
          <CambiarBusqueda
            inicial={{
              origenId,
              origenCiudad: origenCiudad ?? "",
              destinoId,
              destinoCiudad: destinoCiudad ?? "",
              fecha,
              pasajeros: Number(pasajeros ?? 1),
              horaDesde: horaDesde ?? null,
              horaHasta: horaHasta ?? null,
              ...(fechaVuelta && !esTramoVuelta && vOrigenId && vDestinoId
                ? {
                    vuelta: {
                      fecha: fechaVuelta,
                      origenId: vOrigenId,
                      origenCiudad: vOrigenCiudad ?? "",
                      destinoId: vDestinoId,
                      destinoCiudad: vDestinoCiudad ?? "",
                      horaDesde: horaVueltaDesde ?? null,
                      horaHasta: horaVueltaHasta ?? null,
                    },
                  }
                : {}),
            }}
          />

          {esIdaYVuelta && (
            <div className="flex basis-full items-center gap-2 text-sm font-semibold">
              <span className={mostrandoVuelta ? "text-muted-3" : "rounded-full bg-kbyellow px-3 py-0.5 text-ink"}>
                1. Ida{idaViajeId && mostrandoVuelta ? " ✓" : ""}
              </span>
              <span className="text-muted-3">→</span>
              <span className={mostrandoVuelta ? "rounded-full bg-kbyellow px-3 py-0.5 text-ink" : "text-muted-3"}>2. Vuelta</span>
            </div>
          )}
        </div>
      </div>

      {!mostrandoVuelta && (
        <TiraFechas
          fecha={fecha}
          precios={preciosPorDia}
          hayDatos={fechasConPrecio !== null}
          hrefFecha={(f) =>
            hrefBuscar({
              fecha: f,
              ...(fechaVuelta && fechaVuelta < f ? { fechaVuelta: f } : {}),
            })
          }
        />
      )}

      <div className="mx-auto max-w-[1280px] px-5 py-5 md:px-16 md:py-6">

        <div className="lg:grid lg:grid-cols-[250px_1fr] lg:items-start lg:gap-6 xl:grid-cols-[290px_1fr]">
          {!mostrandoVuelta && (
            <>
              <div className="lg:hidden">
                <FiltrosBusqueda salidas={salidasParaFiltros} />
              </div>
              <div className="hidden lg:sticky lg:top-24 lg:block">
                <FiltrosBusqueda variante="panel" salidas={salidasParaFiltros} />
              </div>
            </>
          )}

          <div className={mostrandoVuelta ? "lg:col-span-2" : ""}>
            <div className="mb-3.5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-2">
                {resultadosAMostrar.length} {resultadosAMostrar.length === 1 ? "salida disponible" : "salidas disponibles"}
              </p>
              {grupos.length > 0 && <OrdenarPor />}
            </div>

            {ordenFueraDeFranja && (
              <div className="kb-alert kb-alert--info mb-4 flex-col !gap-1">
                <p className="text-sm font-semibold text-ink">
                  No hay viajes en la franja {franjaElegida ? `${franjaElegida.etiqueta.toLowerCase()} (${franjaElegida.horaDesde}–${franjaElegida.horaHasta})` : "de hora que elegiste"}, pero ese día sí hay estos horarios.
                </p>
                <Link
                  href={hrefBuscar({ horaDesde: null, horaHasta: null })}
                  className="inline-block text-sm font-semibold text-ink underline"
                >
                  Quitar el filtro de hora
                </Link>
              </div>
            )}

            {/* Estado de la vuelta, visible desde el paso de la ida. */}
            {esIdaYVuelta && !mostrandoVuelta && fechaVuelta && !error && (
              <div className="mb-4">
                {resultadosVuelta.length > 0 ? (
                  <div className="kb-alert kb-alert--ok flex-col !gap-1">
                    <p className="text-sm font-semibold">
                      ✓ Hay viajes de vuelta: {vOrigenCiudad} → {vDestinoCiudad}, {formatearFecha(fechaVuelta)}
                    </p>
                    <p className="text-xs">
                      {resultadosVuelta.length} viaje{resultadosVuelta.length === 1 ? "" : "s"} desde $
                      {Math.min(...resultadosVuelta.map((r) => Number(r.precioBase))).toFixed(2)} con{" "}
                      {Array.from(new Set(resultadosVuelta.map((r) => r.cooperativaNombre))).join(", ")}.{" "}
                      {vueltaFueraDeFranja ? "Ninguno cae en la franja de hora que elegiste, pero ese día sí hay viajes. " : ""}
                      Elegirás el horario de vuelta después de escoger tu ida.
                    </p>
                  </div>
                ) : (
                  <div className="kb-alert kb-alert--info flex-col !gap-1">
                    <p className="text-base font-semibold text-ink">
                      Aún no hay ruta de vuelta programada: {vOrigenCiudad} → {vDestinoCiudad}, {formatearFecha(fechaVuelta)}
                    </p>
                    <p className="text-sm">
                      Esto es lo que sí hay disponible para la vuelta. También puedes{" "}
                      <Link href={hrefSoloIda} className="font-semibold underline">
                        comprar solo la ida
                      </Link>
                      .
                    </p>
                    {alternativasVuelta && (
                      <div className="mt-4 rounded-card bg-white p-4">
                        <SinResultadosAlternativas
                          alternativas={alternativasVuelta}
                          origenCiudad={vOrigenCiudad}
                          destinoCiudad={vDestinoCiudad}
                          hrefFecha={(f) => hrefBuscar({ fechaVuelta: f, horaVueltaDesde: null, horaVueltaHasta: null })}
                          hrefTodas={hrefDisponibilidad("vuelta")}
                          mensajeSinNada="Todavía ninguna cooperativa tiene programada esta ruta de vuelta."
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3.5">
              {error && <p className="kb-alert kb-alert--error">{error}</p>}

              {/* El día SÍ tiene viajes, pero los filtros no dejan ninguno: no es "no hay viajes". */}
              {!error && grupos.length === 0 && todasLasSalidasIda.length > 0 && (
                <div className="rounded-card bg-white p-8 text-center shadow-card">
                  <p className="text-lg font-semibold">Ninguna salida cumple tus filtros</p>
                  <p className="mt-1 text-sm text-muted-2">
                    Hay {todasLasSalidasIda.length} {todasLasSalidasIda.length === 1 ? "salida" : "salidas"} este día.
                  </p>
                  <Link
                    href={hrefBuscar(filtrosAUrl(SIN_FILTROS))}
                    scroll={false}
                    className="kb-btn kb-btn--dark mt-4 inline-flex h-12 px-6"
                  >
                    Quitar filtros
                  </Link>
                </div>
              )}

              {!error && grupos.length === 0 && todasLasSalidasIda.length === 0 && (
                <div className="rounded-card bg-white p-8 text-center shadow-card">
                  <p className="text-lg font-semibold">
                    {mostrandoVuelta
                      ? "Aún no hay viajes de vuelta programados para esta fecha."
                      : "No encontramos viajes para esta fecha."}
                  </p>
                  <p className="mt-1 text-sm text-muted-2">
                    {mostrandoVuelta
                      ? "Tus asientos de ida siguen reservados unos minutos. Si hay otras fechas con viajes de vuelta, las verás debajo."
                      : "Prueba con otra fecha o cambia tu búsqueda. Si hay otras opciones, las verás debajo."}
                  </p>
                </div>
              )}

              {!error && grupos.length === 0 && alternativas && (
                <div className="rounded-card bg-white p-6 shadow-card">
                  <SinResultadosAlternativas
                    alternativas={alternativas}
                    origenCiudad={origenCiudad}
                    destinoCiudad={destinoCiudad}
                    hrefFecha={(f) =>
                      hrefBuscar({
                        fecha: f,
                        horaDesde: null,
                        horaHasta: null,
                        ...(fechaVuelta && fechaVuelta < f ? { fechaVuelta: f } : {}),
                      })
                    }
                    hrefDestino={
                      mostrandoVuelta
                        ? undefined
                        : (id, ciudad) =>
                            hrefBuscar({
                              destinoId: id,
                              destinoCiudad: ciudad,
                              horaDesde: null,
                              horaHasta: null,
                              vueltaOrigenId: null,
                              vueltaOrigenCiudad: null,
                            })
                    }
                    hrefTodas={hrefDisponibilidad("principal")}
                    mensajeSinNada={
                      mostrandoVuelta
                        ? "Todavía no hay ninguna ruta de vuelta programada por las cooperativas."
                        : "Todavía ninguna cooperativa tiene programada esta ruta."
                    }
                  />
                </div>
              )}

              {grupos.map((grupo) => (
                <TarjetaCooperativaAgrupada
                  key={`${grupo[0].cooperativaId}::${grupo[0].tipoVehiculoId}`}
                  viajes={grupo}
                  hrefsPorViaje={hrefsPorViaje}
                  esMejorPrecio={viajeMejorPrecio !== null && grupo.some((r) => r.viajeId === viajeMejorPrecio)}
                  esTopCalificado={
                    grupos.length > 1 &&
                    calificacionMaxima !== null &&
                    grupo[0].cooperativaCalificacionPromedio === calificacionMaxima
                  }
                  beneficiosReferidos={beneficiosReferidos}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
