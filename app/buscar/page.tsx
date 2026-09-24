import Link from "next/link";
import {
  buscarViajes,
  buscarAlternativas,
  obtenerBeneficiosReferidos,
  type Amenidad,
  type ResultadoViaje,
} from "@/lib/api";
import { FiltrosBusqueda } from "./FiltrosBusqueda";
import { OrdenarPor } from "./OrdenarPor";
import { FiltroCooperativaPills } from "./FiltroCooperativaPills";
import { TarjetaCooperativaAgrupada } from "./TarjetaCooperativaAgrupada";
import { SinResultadosAlternativas } from "./SinResultadosAlternativas";
import { construirQuery } from "@/lib/buscar-url";
import { FRANJAS_HORARIO } from "@/lib/franjas-horario";

function formatearFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function ResultadosBusquedaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { origenId, destinoId, origenCiudad, destinoCiudad, fecha, pasajeros, horaDesde, horaHasta, amenidades } = sp;
  const { vueltaOrigenId, vueltaOrigenCiudad, vueltaDestinoId, vueltaDestinoCiudad, horaVueltaDesde, horaVueltaHasta } = sp;
  // Fase 7-idayvuelta (11-ago-2026) -- fechaVuelta viene del buscador
  // solo si el pasajero activo el interruptor "Ida y vuelta". idaViajeId
  // y idaAsiento llegan cuando ya se eligio el tramo de ida y se esta
  // viendo la busqueda del tramo de vuelta (ver TarjetaResultado, que
  // arma ese link al elegir "Elegir asiento" en el tramo de ida).
  const { fechaVuelta, idaViajeId, idaAsientos, ordenarPor, cooperativaId, precioMin, precioMax } = sp;
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
        <p className="text-brand-dark">Faltan datos de búsqueda. Vuelve al inicio e intenta de nuevo.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-brand-cobalto underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  const amenidadesArr = amenidades ? (amenidades.split(",") as Amenidad[]) : undefined;

  // Fase 5-buscador (16-ago-2026) -- en paralelo con la búsqueda de
  // viajes, no en secuencia (no debe agregar latencia extra). Si
  // falla, el resultado es null -- la franja de beneficio real
  // simplemente no se muestra, sin romper toda la página.
  const promesaBeneficios = obtenerBeneficiosReferidos();

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
        horaDesde,
        horaHasta,
        amenidades: amenidadesArr,
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
  let ordenFueraDeFranja = false;
  let vueltaFueraDeFranja = false;
  if (!error && resultadosIda.length === 0 && horaDesde && horaHasta) {
    try {
      const sinFiltroHora = await buscarViajes({
        origenId,
        destinoId,
        fecha,
        pasajeros: Number(pasajeros ?? 1),
        amenidades: amenidadesArr,
      });
      if (sinFiltroHora.length > 0) {
        resultadosIda = sinFiltroHora;
        ordenFueraDeFranja = true;
      }
    } catch {
      /* si falla, se sigue con el aviso normal de "sin viajes" */
    }
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

  // Sin viajes en el tramo de ida (y sin haber fallado la búsqueda):
  // se piden las alternativas reales -- otras fechas, otros destinos
  // desde el mismo origen y qué cooperativas cubren la ruta.
  const alternativas =
    !error && resultadosIda.length === 0
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
      case "precio_desc":
        return copia.sort((a, b) => Number(b.precioBase) - Number(a.precioBase));
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
  function hrefParaIda(viajeId: string): string {
    if (!esIdaYVuelta) {
      return `/viajes/${viajeId}/asientos`;
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
    return `/viajes/${viajeId}/asientos?${params.toString()}`;
  }

  function hrefParaVuelta(viajeId: string): string {
    const params = new URLSearchParams({
      idaViajeId: idaViajeId ?? "",
      idaAsientos: idaAsientos ?? "",
    });
    return `/viajes/${viajeId}/asientos?${params.toString()}`;
  }

  const mostrandoVuelta = esTramoVuelta;
  let resultadosAMostrar = resultadosIda;

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
    hrefsPorViaje[r.viajeId] = mostrandoVuelta ? hrefParaVuelta(r.viajeId) : hrefParaIda(r.viajeId);
  }

  // Filtro rápido por cooperativa (16-ago-2026, orden real de la
  // directora) -- lista de cooperativas ÚNICAS reales presentes en
  // los resultados de ESTA búsqueda (nunca un catálogo fijo -- si una
  // cooperativa no tiene viajes en esta ruta/fecha, no aparece).
  const cooperativasUnicas = Array.from(
    new Map(resultadosAMostrar.map((r) => [r.cooperativaId, { id: r.cooperativaId, nombre: r.cooperativaNombre }])).values(),
  );

  if (cooperativaId) {
    resultadosAMostrar = resultadosAMostrar.filter((r) => r.cooperativaId === cooperativaId);
  }

  // Fase 8-buscador (24-ago-2026) -- filtro de precio real, sobre
  // datos ya obtenidos -- mismo patrón que el filtro de cooperativa de
  // arriba. `Number(precioMin)` con NaN (campo vacío o inválido) no
  // filtra nada en ese extremo, mismo criterio real que ya usa el
  // input HTML de precio (sin mínimo/máximo si no se especifica).
  const precioMinNum = precioMin ? Number(precioMin) : null;
  const precioMaxNum = precioMax ? Number(precioMax) : null;
  if (precioMinNum !== null && !Number.isNaN(precioMinNum)) {
    resultadosAMostrar = resultadosAMostrar.filter((r) => Number(r.precioBase) >= precioMinNum);
  }
  if (precioMaxNum !== null && !Number.isNaN(precioMaxNum)) {
    resultadosAMostrar = resultadosAMostrar.filter((r) => Number(r.precioBase) <= precioMaxNum);
  }

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

  // Fase 5-buscador (16-ago-2026) -- "Mejor precio" real, calculado
  // una sola vez sobre TODOS los GRUPOS que se van a mostrar (el
  // precio más bajo dentro de cada grupo es el representativo), no
  // una insignia fija ni inventada por tarjeta.
  const precioMinimo =
    grupos.length > 0
      ? Math.min(...grupos.map((g) => Math.min(...g.map((r) => Number(r.precioBase)))))
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
    <main className="flex-1 bg-brand-light/40">
      {/* Franja oscura de resumen de ruta -- adaptación real de la
          referencia del director (demo, 24-ago-2026): en el demo esto
          es una franja oscura con el resumen de la ruta + botón
          "Cambiar búsqueda", en vez de un link de texto simple sobre
          fondo claro. Se usa nuestro vidrio oscuro real
          (`bg-brand-dark`), no el rojo del demo -- decisión explícita
          del director: mantener la marca real, no copiar el color.

          Ajuste real (24-ago-2026, mismo día): el director señaló que
          se veía "fúnebre y sin vida" -- negro liso, sin ningún acento
          de color, comparado con el Hero (que sí resalta "sin filas ni
          papeleo" en ámbar). Corregido con el mismo criterio: menos
          padding vertical (py-6 -> py-4, franja más delgada) y la
          flecha entre ciudades en `brand-amber`, mismo acento de marca
          que ya usa el resto del sitio -- no un elemento nuevo
          inventado. */}
      <div className="bg-brand-dark px-4 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">
                {origenCiudad ?? "Origen"} <span className="text-brand-amber">→</span> {destinoCiudad ?? "Destino"}
              </h1>
              <p className="text-sm text-white/60">
                {mostrandoVuelta ? "Vuelta · " : ""}
                {formatearFecha(fecha)} · {pasajeros ?? 1} pasajero{Number(pasajeros ?? 1) > 1 ? "s" : ""}
              </p>
              {esIdaYVuelta && !mostrandoVuelta && fechaVuelta && (
                <p className="text-sm text-white/60">
                  Vuelta: {vOrigenCiudad ?? "Origen"} → {vDestinoCiudad ?? "Destino"} · {formatearFecha(fechaVuelta)}
                </p>
              )}
            </div>
            <Link
              href="/"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              ← Cambiar búsqueda
            </Link>
          </div>

          {esIdaYVuelta && (
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <span className={mostrandoVuelta ? "text-white/40" : "text-brand-medium"}>
                1. Ida{idaViajeId && mostrandoVuelta ? " ✓" : ""}
              </span>
              <span className="text-white/30">→</span>
              <span className={mostrandoVuelta ? "text-brand-medium" : "text-white/40"}>2. Vuelta</span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">

        <div className="mt-6 lg:grid lg:grid-cols-[260px_1fr] lg:items-start lg:gap-6">
          {!mostrandoVuelta && (
            <>
              <div className="lg:hidden">
                <FiltrosBusqueda />
              </div>
              <div className="hidden lg:sticky lg:top-6 lg:block">
                <FiltrosBusqueda variante="panel" />
              </div>
            </>
          )}

          <div className={mostrandoVuelta ? "lg:col-span-2" : ""}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-dark/70">
                {grupos.length} cooperativa{grupos.length !== 1 ? "s" : ""} disponible
                {grupos.length !== 1 ? "s" : ""} para esta ruta
              </p>
              {grupos.length > 1 && <OrdenarPor />}
            </div>

            {!mostrandoVuelta && <FiltroCooperativaPills cooperativas={cooperativasUnicas} />}

            {ordenFueraDeFranja && (
              <div className="mb-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                <p className="text-sm font-semibold text-amber-900">
                  No hay viajes en la franja {franjaElegida ? `${franjaElegida.etiqueta.toLowerCase()} (${franjaElegida.horaDesde}–${franjaElegida.horaHasta})` : "de hora que elegiste"}, pero ese día sí hay estos horarios.
                </p>
                <Link
                  href={hrefBuscar({ horaDesde: null, horaHasta: null })}
                  className="mt-1 inline-block text-sm font-semibold text-amber-900 underline"
                >
                  Quitar el filtro de hora
                </Link>
              </div>
            )}

            {/* Estado de la vuelta, visible desde el paso de la ida. */}
            {esIdaYVuelta && !mostrandoVuelta && fechaVuelta && !error && (
              <div className="mb-4">
                {resultadosVuelta.length > 0 ? (
                  <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                    <p className="text-sm font-semibold text-emerald-900">
                      ✓ Hay viajes de vuelta: {vOrigenCiudad} → {vDestinoCiudad}, {formatearFecha(fechaVuelta)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-800/80">
                      {resultadosVuelta.length} viaje{resultadosVuelta.length === 1 ? "" : "s"} desde $
                      {Math.min(...resultadosVuelta.map((r) => Number(r.precioBase))).toFixed(2)} con{" "}
                      {Array.from(new Set(resultadosVuelta.map((r) => r.cooperativaNombre))).join(", ")}.{" "}
                      {vueltaFueraDeFranja ? "Ninguno cae en la franja de hora que elegiste, pero ese día sí hay viajes. " : ""}
                      Elegirás el horario de vuelta después de escoger tu ida.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                    <p className="font-display text-base font-bold text-amber-900">
                      Aún no hay ruta de vuelta programada: {vOrigenCiudad} → {vDestinoCiudad}, {formatearFecha(fechaVuelta)}
                    </p>
                    <p className="mt-1 text-sm text-amber-900/80">
                      Esto es lo que sí hay disponible para la vuelta. También puedes{" "}
                      <Link href={hrefSoloIda} className="font-semibold underline">
                        comprar solo la ida
                      </Link>
                      .
                    </p>
                    {alternativasVuelta && (
                      <div className="mt-4 rounded-lg bg-white p-4">
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

            <div className="space-y-4">
              {error && <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}

              {!error && grupos.length === 0 && (
                <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                  <p className="font-display text-lg font-bold text-brand-dark">
                    {mostrandoVuelta
                      ? "Aún no hay viajes de vuelta programados para esta fecha."
                      : "No encontramos viajes para esta fecha."}
                  </p>
                  <p className="mt-1 text-sm text-brand-dark/70">
                    {mostrandoVuelta
                      ? "Tus asientos de ida siguen reservados unos minutos. Si hay otras fechas con viajes de vuelta, las verás debajo."
                      : "Prueba con otra fecha o cambia tu búsqueda. Si hay otras opciones, las verás debajo."}
                  </p>
                </div>
              )}

              {!error && grupos.length === 0 && alternativas && (
                <div className="rounded-xl bg-white p-6 shadow-sm">
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
                  esMejorPrecio={
                    precioMinimo !== null && grupo.some((r) => Number(r.precioBase) === precioMinimo)
                  }
                  esTopCalificado={
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
