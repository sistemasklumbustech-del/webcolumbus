"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  obtenerMapaAsientos,
  bloquearAsiento,
  obtenerPisosDeDistribucion,
  type MapaAsientos,
} from "@/lib/api";
import { tokenValido, obtenerOCrearSesionInvitado } from "@/lib/auth";
import { DibujoSilla, MapaAsientosBus, ubicacionDeAsiento } from "@/components/MapaAsientosBus";
import { esAsientoSoloMujeres } from "@/lib/asientos-mujeres";
import { leerResumenViaje, parametrosDeResumen } from "@/lib/resumen-viaje";

/**
 * Vacío real de diseño encontrado el 29-jul-2026: hasta ahora esta
 * pantalla ignoraba `distribucionAsientos` (el backend ya la enviaba)
 * y siempre dibujaba una simplificación de 2+2 — un bus real de dos
 * pisos o con sección VIP se veía como una fila plana, sin importar
 * su configuración real.
 *
 * Ahora: si el tipo de vehículo tiene una distribución real
 * configurada (uno o más pisos, cada uno con sus filas), se usa tal
 * cual. Si no la tiene (tipos de vehículo antiguos, o cooperativas que
 * todavía no configuraron la suya), se cae de forma segura al mismo
 * generador simple 2+2 de siempre — nadie se queda sin mapa de
 * asientos mientras se termina de adoptar el nuevo formato.
 *
 * Ítem 14 (05-ago-2026) -- el generador de respaldo y obtenerPisos se
 * movieron de verdad a lib/api.ts, compartidos con el backend (antes
 * vivían duplicados aquí y en asientos.service.ts, dos copias que
 * podían desincronizarse -- ver hallazgo real corregido en
 * distribucion-asientos.util.ts).
 */
export default function SeleccionAsientosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: viajeId } = usePromise(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mapa, setMapa] = useState<MapaAsientos | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Fase 7-item29 (07-ago-2026) -- multi-pasajero: de un solo asiento a
  // un arreglo. Limite de 10, mismo tope ya usado en el campo
  // "Pasajeros" del buscador (BuscadorForm.tsx, max={10}).
  const MAXIMO_ASIENTOS = 10;
  const preseleccionadoInicial = searchParams.get("preseleccionado");
  const [seleccionados, setSeleccionados] = useState<string[]>(
    () => (preseleccionadoInicial ? preseleccionadoInicial.split(",") : []),
  );
  const [bloqueando, setBloqueando] = useState(false);

  // Fase 7-idayvuelta (11-ago-2026) -- si "vuelta_fecha" viene en la
  // URL, este es el tramo de IDA de un viaje de ida y vuelta -- al
  // terminar de elegir asiento aqui, no se va al checkout, se vuelve a
  // /buscar por el tramo de vuelta. Si en cambio vienen "idaViajeId" +
  // "idaAsientos", este es el tramo de VUELTA -- al terminar, se
  // combinan ambos tramos en un solo checkout.
  const vueltaOrigenId = searchParams.get("vuelta_origenId");
  const vueltaDestinoId = searchParams.get("vuelta_destinoId");
  const vueltaOrigenCiudad = searchParams.get("vuelta_origenCiudad");
  const vueltaDestinoCiudad = searchParams.get("vuelta_destinoCiudad");
  const vueltaFecha = searchParams.get("vuelta_fecha");
  const vueltaHoraDesde = searchParams.get("vuelta_horaDesde");
  const vueltaHoraHasta = searchParams.get("vuelta_horaHasta");
  const pasajerosParam = searchParams.get("pasajeros");
  const esTramoIda = !!vueltaFecha;

  const idaViajeId = searchParams.get("idaViajeId");
  const idaAsientosParam = searchParams.get("idaAsientos");
  const esTramoVuelta = !!idaViajeId && !!idaAsientosParam;

  // Datos informativos que manda la pantalla de resultados para el resumen
  // (ruta, salida, cooperativa y tarifa de referencia). Pueden faltar si se
  // llega a esta pantalla por un enlace directo: entonces el resumen no los muestra.
  const resumen = leerResumenViaje(searchParams);
  const rOrigen = resumen.origen;
  const rDestino = resumen.destino;
  const rCoop = resumen.cooperativa;
  const rPrecio = resumen.precio;
  const lineaSalida = resumen.lineaSalida;

  function alternarAsiento(numero: string) {
    setSeleccionados((actual) => {
      if (actual.includes(numero)) {
        return actual.filter((n) => n !== numero);
      }
      if (actual.length >= MAXIMO_ASIENTOS) {
        return actual;
      }
      return [...actual, numero];
    });
  }
  useEffect(() => {
    obtenerMapaAsientos(viajeId)
      .then(setMapa)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar el viaje."));
  }, [viajeId]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl flex-1 px-4 py-16 text-center">
        <p className="kb-alert kb-alert--error justify-center">{error}</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-ink underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  if (!mapa) {
    return (
      <main className="flex-1 px-4 py-16 text-center text-muted-2">
        Cargando mapa de asientos...
      </main>
    );
  }

  const estadoPorNumero = new Map(mapa.asientosNoDisponibles.map((a) => [a.numeroAsiento, a.estado]));
  const pisos = obtenerPisosDeDistribucion(mapa.distribucionAsientos, mapa.capacidadTotal);

  async function continuar() {
    if (seleccionados.length === 0) return;
    // Item 31, Fase 7 (11-ago-2026) -- compra como invitado: ya NO se
    // exige iniciar sesion para seleccionar asiento. Sin token, se usa
    // la sesionInvitadoId del navegador para identificar el bloqueo.
    const token = tokenValido();
    const sesionInvitadoId = token ? undefined : obtenerOCrearSesionInvitado();
    setBloqueando(true);
    setError(null);
    try {
      // Fase 7-item29 (07-ago-2026) -- se re-bloquean TODOS los asientos
      // elegidos en cada llamada a continuar(), no solo el ultimo -- el
      // backend ya soporta re-bloquear el propio asiento sin fallar,
      // renovando su tiempo de expiracion (ver asiento.repositorio.drizzle.ts,
      // comentario "es el mismo usuario re-seleccionando su propio
      // asiento"). Esto sincroniza el reloj de expiracion de todos los
      // asientos del grupo, para que el primero elegido no expire
      // mientras se llenan los datos de los demas en el checkout.
      for (const numero of seleccionados) {
        await bloquearAsiento(viajeId, numero, token, sesionInvitadoId);
      }

      if (esTramoIda) {
        // Fase 7-idayvuelta (11-ago-2026) -- tramo de ida: se vuelve a
        // /buscar por el tramo de vuelta, llevando consigo el viaje y
        // los asientos de ida ya elegidos y bloqueados.
        const params = new URLSearchParams({
          origenId: vueltaOrigenId ?? "",
          origenCiudad: vueltaOrigenCiudad ?? "",
          destinoId: vueltaDestinoId ?? "",
          destinoCiudad: vueltaDestinoCiudad ?? "",
          fecha: vueltaFecha ?? "",
          pasajeros: pasajerosParam ?? "1",
          idaViajeId: viajeId,
          idaAsientos: seleccionados.join(","),
        });
        if (vueltaHoraDesde && vueltaHoraHasta) {
          params.set("horaDesde", vueltaHoraDesde);
          params.set("horaHasta", vueltaHoraHasta);
        }
        router.push(`/buscar?${params.toString()}`);
        return;
      }

      if (esTramoVuelta && idaViajeId && idaAsientosParam) {
        // Fase 7-idayvuelta (11-ago-2026) -- tramo de vuelta: se
        // re-bloquean TAMBIEN los asientos de ida (renueva su tiempo de
        // expiracion, por si paso rato buscando el tramo de vuelta), y
        // se va a un checkout que combina los 2 viajes.
        for (const numero of idaAsientosParam.split(",")) {
          await bloquearAsiento(idaViajeId, numero, token, sesionInvitadoId);
        }
        const params = new URLSearchParams({
          asientos: seleccionados.join(","),
          idaViajeId,
          idaAsientos: idaAsientosParam,
        });
        parametrosDeResumen(searchParams).forEach((valor, clave) => params.set(clave, valor));
        router.push(`/viajes/${viajeId}/checkout?${params.toString()}`);
        return;
      }

      // Caso normal, sin ida y vuelta.
      const paramsCheckout = new URLSearchParams({ asientos: seleccionados.join(",") });
      parametrosDeResumen(searchParams).forEach((valor, clave) => paramsCheckout.set(clave, valor));
      router.push(`/viajes/${viajeId}/checkout?${paramsCheckout.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo bloquear el asiento.");
      setSeleccionados([]);
      // Refresca el mapa para reflejar el estado real tras el intento fallido.
      obtenerMapaAsientos(viajeId).then(setMapa);
    } finally {
      setBloqueando(false);
    }
  }

  const ocupados = mapa.asientosNoDisponibles.length;
  const disponibles = mapa.capacidadTotal - ocupados;

  const textoBotonCompleto = bloqueando
    ? "Reservando..."
    : seleccionados.length === 0
      ? "Elige un asiento"
      : esTramoIda
        ? "Continuar y buscar la vuelta"
        : seleccionados.length === 1
          ? `Continuar con el asiento ${seleccionados[0]}`
          : `Continuar con ${seleccionados.length} asientos`;
  const textoBotonCorto = bloqueando ? "Reservando..." : seleccionados.length === 0 ? "Elige asiento" : "Continuar";
  const resumenSeleccion = seleccionados.map((n) => {
    const u = ubicacionDeAsiento(pisos, n);
    const fila = n.match(/^(\d+)/)?.[1];
    return {
      numero: n,
      ubicacion: u ? `${u.posicion}${pisos.length > 1 ? ` · piso ${u.piso}` : ""}` : "",
      detalle: [u?.posicion, fila ? `Fila ${fila}` : null, u && pisos.length > 1 ? `Piso ${u.piso}` : null].filter(Boolean).join(" · "),
      mujeres: esAsientoSoloMujeres(mapa, n),
    };
  });
  const hayMujeres = seleccionados.some((n) => esAsientoSoloMujeres(mapa, n));

  return (
    <main className="flex flex-1 flex-col">
      {/* Barra de título (diseño final). */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-5 py-3.5 md:px-16 md:py-[18px]">
          <button type="button" onClick={() => router.back()} aria-label="Volver" className="kb-btn-round shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold md:text-xl">Elige tu asiento</h1>
            <p className="text-xs text-muted-2 md:text-[13px]">
              {[rCoop, lineaSalida, mapa.tipoVehiculoNombre].filter(Boolean).join(" · ")}
              {rCoop || lineaSalida || mapa.tipoVehiculoNombre ? " · " : ""}
              <span className="font-semibold text-ink">{disponibles}</span> disponibles ·{" "}
              <span className="font-semibold text-ink">{ocupados}</span> ocupados · {mapa.capacidadTotal} en total
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1280px] flex-1 items-start gap-6 px-5 py-5 md:px-16 md:py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          {(!mapa.permiteCancelacion || !mapa.permiteReprogramacion) && (
            <div className="kb-alert kb-alert--info flex-col !gap-1">
              <p className="font-semibold text-ink">Antes de comprar, lee esto:</p>
              {!mapa.permiteCancelacion && !mapa.permiteReprogramacion ? (
                <p>
                  Esta cooperativa no permite cambios ni devoluciones — si no viajas, pierdes el
                  boleto completo.
                </p>
              ) : (
                <ul className="list-inside list-disc space-y-0.5">
                  {!mapa.permiteCancelacion && <li>No se puede cancelar este boleto.</li>}
                  {!mapa.permiteReprogramacion && <li>No se puede reprogramar este boleto.</li>}
                </ul>
              )}
            </div>
          )}
          <div className="rounded-[28px] bg-white p-4 shadow-card md:rounded-card md:p-[26px]">
            <MapaAsientosBus
              pisos={pisos}
              estadoPorNumero={estadoPorNumero}
              seleccionados={seleccionados}
              onAlternar={alternarAsiento}
              tieneBano={(mapa.tipoVehiculoAmenidades ?? []).includes("bano_a_bordo")}
              categoria={mapa.tipoVehiculoCategoria}
            />
          </div>
          {hayMujeres && (
            <p className="rounded-ctrl bg-women-bg px-4 py-3 text-[13px] font-medium text-women">
              Elegiste un asiento exclusivo para mujeres. Al comprar te pediremos confirmar el sexo del pasajero.
            </p>
          )}
          {(esTramoIda || esTramoVuelta) && (
            <p className="text-center text-sm font-semibold">
              {esTramoIda ? "Tramo 1 de 2: Ida" : "Tramo 2 de 2: Vuelta"}
            </p>
          )}
          {error && <p className="kb-alert kb-alert--error">{error}</p>}
        </div>

        {/* PC: resumen negro a la derecha. */}
        <aside className="hidden flex-col gap-4 md:flex">
          <div className="flex flex-col gap-3.5 rounded-card bg-ink p-6 text-white">
            <span className="text-xs font-semibold uppercase tracking-[.08em] text-kbyellow">Tu viaje</span>
            <b className="text-[22px] font-semibold leading-tight">
              {rOrigen && rDestino ? `${rOrigen} → ${rDestino}` : (mapa.tipoVehiculoNombre ?? "Tu viaje")}
            </b>
            {(lineaSalida || rCoop || (rOrigen && mapa.tipoVehiculoNombre)) && (
              <span className="text-[13px] text-ondark">
                {lineaSalida}
                {lineaSalida && <br />}
                {[rCoop, mapa.tipoVehiculoNombre].filter(Boolean).join(" · ")}
              </span>
            )}
            <hr className="h-px border-0 bg-ink-3" />
            {resumenSeleccion.length === 0 ? (
              <div className="flex items-center gap-3.5 rounded-[18px] border border-dashed border-ink-3 px-4 py-3.5">
                <span className="kb-silla is-mini !text-[#4A505C] [&_.kb-silla__cojin]:!fill-transparent [&_.kb-silla__respaldo]:!fill-transparent [&_.kb-silla__brazo]:!fill-transparent" aria-hidden="true">
                  <DibujoSilla />
                </span>
                <p className="text-sm text-ondark">Toca un asiento libre en el mapa para elegirlo.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Asientos elegidos">
                {resumenSeleccion.map((r) => (
                  <li key={r.numero} className="flex items-center gap-3.5 rounded-[18px] bg-ink-2 px-3.5 py-3">
                    <span className={`kb-silla is-mini is-elegida ${r.mujeres ? "" : ""}`} aria-hidden="true">
                      <DibujoSilla />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-lg font-semibold leading-tight">Asiento {r.numero}</b>
                      <span className="block text-xs text-ondark">
                        {r.detalle}
                        {r.mujeres ? " · Solo mujeres" : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => alternarAsiento(r.numero)}
                      aria-label={`Quitar asiento ${r.numero}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ondark transition hover:bg-ink-3 hover:text-white"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {rPrecio !== null && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ondark">Tarifa{seleccionados.length > 1 ? " por asiento" : ""}</span>
                <b className="text-[26px] font-bold tabular-nums">${rPrecio.toFixed(2)}</b>
              </div>
            )}
            <button
              type="button"
              disabled={seleccionados.length === 0 || bloqueando}
              onClick={continuar}
              className="kb-btn kb-btn--primary w-full"
            >
              {textoBotonCompleto}
            </button>
          </div>
          <div className="kb-card px-[18px] py-4 text-[13px] text-muted-2">
            Los asientos rosados son solo para pasajeras; se valida con el documento.
          </div>
        </aside>
      </div>

      {/* Celular: barra blanca fija abajo. */}
      <div className="kb-sheet z-40 mt-auto">
        {resumenSeleccion.length > 0 && (
          <span className="relative shrink-0" aria-hidden="true">
            <span className="kb-silla is-mini is-elegida">
              <DibujoSilla />
            </span>
            {resumenSeleccion.length > 1 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-semibold text-white">
                {resumenSeleccion.length}
              </span>
            )}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs text-muted-2">
            {resumenSeleccion.length === 0
              ? "Ningún asiento elegido"
              : resumenSeleccion.length === 1
                ? `Asiento ${resumenSeleccion[0].numero}${resumenSeleccion[0].ubicacion ? ` · ${resumenSeleccion[0].ubicacion.toLowerCase()}` : ""}`
                : `Asientos ${resumenSeleccion.map((r) => r.numero).join(", ")}`}
          </span>
          {rPrecio !== null && (
            <b className="text-[22px] font-bold tabular-nums">
              ${rPrecio.toFixed(2)}
              {seleccionados.length > 1 && <small className="ml-1 text-xs font-normal text-muted-2">por asiento</small>}
            </b>
          )}
        </div>
        <button
          type="button"
          disabled={seleccionados.length === 0 || bloqueando}
          onClick={continuar}
          className="kb-btn kb-btn--primary shrink-0 px-6"
        >
          {textoBotonCorto}
        </button>
      </div>
    </main>
  );
}
