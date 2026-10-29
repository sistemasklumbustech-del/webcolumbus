"use client";

import { Suspense, useState, useEffect, use as usePromise } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { crearCompra, cotizarCompra, listarMisCreditos, obtenerMapaAsientos, iniciarPagoManual, subirComprobantePago, listarMetodosPagoPorViaje, obtenerInfoPasarela, type InfoPasarela, type ResultadoCompra, type Cotizacion, type MiCredito, type MapaAsientos, type MetodoPagoDisponible, type TipoMetodoPago, type PasajeroCompraInput, type DatosFacturacionInput } from "@/lib/api";
import { tokenValido, obtenerOCrearSesionInvitado } from "@/lib/auth";
import { CodigoQr } from "@/components/CodigoQr";
import { AccesoAnden, useCodigosAnden } from "@/components/AccesoAnden";
import { CampoSexoAsientoMujeres, type SexoPasajero } from "@/components/CampoSexoAsientoMujeres";
import { esAsientoSoloMujeres } from "@/lib/asientos-mujeres";
import { leerResumenViaje } from "@/lib/resumen-viaje";
import { LogoKlumbus } from "@/components/LogoKlumbus";

/**
 * Los datos de factura se capturan ya (06-oct-2026) pero la emisión real de
 * facturas todavía no existe, así que la sección queda oculta y no se envía
 * nada hasta activar NEXT_PUBLIC_FACTURACION_DATOS=1. Así no se promete una
 * factura que aún no se emite. Requiere que el backend ya tenga la migración
 * 0058 y el campo `datosFacturacion`, o la compra sería rechazada.
 */
const FACTURACION_VISIBLE = process.env.NEXT_PUBLIC_FACTURACION_DATOS === "1";

const TARIFAS = [
  { valor: "adulto", etiqueta: "Adulto (tarifa completa)" },
  { valor: "nino", etiqueta: "Niño 3-11 años (50% descuento)" },
  { valor: "tercera_edad", etiqueta: "Tercera edad (50% descuento)" },
  { valor: "discapacidad", etiqueta: "Discapacidad (descuento según carnet CONADIS)" },
] as const;

/**
 * Fase 7-item29 (07-ago-2026) -- datos de UN pasajero dentro de la
 * compra. Antes esto vivia como 6 useState sueltos a nivel de toda la
 * pantalla (un solo pasajero por compra) -- ahora es un arreglo, uno
 * por cada asiento elegido, para soportar varios pasajeros en una sola
 * transaccion.
 *
 * Item 31.1 (13-ago-2026) -- nombreCompleto se separo en nombres y
 * apellidos reales, se agrego tipoDocumento (selector explicito
 * cedula/pasaporte, el backend valida cada uno distinto) y
 * esEmbarazada (atencion preferente, LOTTTSV Art. 48 -- no es un
 * descuento, va aparte de tipoTarifa).
 */
interface DatosPasajero {
  viajeId: string;
  numeroAsiento: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: "cedula" | "pasaporte";
  documento: string;
  tipoTarifa: (typeof TARIFAS)[number]["valor"];
  fechaNacimiento: string;
  esEmbarazada: boolean;
  /** Solo se pide cuando el asiento es exclusivo para mujeres. */
  sexo: SexoPasajero;
  adultoResponsableNombre: string;
  adultoResponsableDocumento: string;
  adultoResponsableTelefono: string;
}

function datosPasajeroVacio(viajeId: string, numeroAsiento: string): DatosPasajero {
  return {
    viajeId,
    numeroAsiento,
    nombres: "",
    apellidos: "",
    tipoDocumento: "cedula",
    documento: "",
    tipoTarifa: "adulto",
    fechaNacimiento: "",
    esEmbarazada: false,
    sexo: "",
    adultoResponsableNombre: "",
    adultoResponsableDocumento: "",
    adultoResponsableTelefono: "",
  };
}

function FormularioCheckout({ viajeId }: { viajeId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fase 7-item29 (07-ago-2026) -- "asientos" (plural, separados por
  // coma) es el formato nuevo, generado por la pantalla de seleccion.
  // "asiento" (singular) se mantiene como respaldo por si queda algun
  // enlace viejo guardado -- se envuelve en un arreglo de 1.
  const asientosParam = searchParams.get("asientos");
  const asientoSingularParam = searchParams.get("asiento");
  const numerosAsiento = asientosParam
    ? asientosParam.split(",").filter(Boolean)
    : asientoSingularParam
      ? [asientoSingularParam]
      : [];

  // Fase 7-idayvuelta (11-ago-2026) -- si vienen idaViajeId +
  // idaAsientos en la URL, esta compra combina 2 viajes distintos (ida
  // y vuelta) -- cada pasajero de la lista lleva su propio viajeId, no
  // se asume que todos son del mismo viaje de la ruta actual.
  const idaViajeIdParam = searchParams.get("idaViajeId");
  const idaAsientosParam = searchParams.get("idaAsientos");
  const esIdaYVuelta = !!idaViajeIdParam && !!idaAsientosParam;

  const paresAsiento: { viajeId: string; numeroAsiento: string; tramo: "ida" | "vuelta" | null }[] = esIdaYVuelta
    ? [
        ...idaAsientosParam!.split(",").filter(Boolean).map((n) => ({
          viajeId: idaViajeIdParam!,
          numeroAsiento: n,
          tramo: "ida" as const,
        })),
        ...numerosAsiento.map((n) => ({ viajeId, numeroAsiento: n, tramo: "vuelta" as const })),
      ]
    : numerosAsiento.map((n) => ({ viajeId, numeroAsiento: n, tramo: null }));

  const [pasajerosData, setPasajerosData] = useState<DatosPasajero[]>(() =>
    paresAsiento.map((p) => datosPasajeroVacio(p.viajeId, p.numeroAsiento)),
  );
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCompra | null>(null);
  // Código de acceso al andén (tasa del terminal): llega después del pago, así que se consulta aparte.
  const codigosAnden = useCodigosAnden(resultado?.estado === "aprobado" ? resultado.compraId : null);
  const [creditos, setCreditos] = useState<MiCredito[]>([]);
  const [creditoElegidoId, setCreditoElegidoId] = useState("");
  const [mapa, setMapa] = useState<MapaAsientos | null>(null);
  // Un mapa por cada viaje de la compra (ida y vuelta), para saber qué asientos son exclusivos para mujeres.
  const [mapasPorViaje, setMapasPorViaje] = useState<Record<string, MapaAsientos>>({});
  const [metodosDisponibles, setMetodosDisponibles] = useState<MetodoPagoDisponible[]>([]);
  // "tarjeta" y "deuna_en_linea" se cobran en línea por la pasarela; los demás son métodos manuales de la cooperativa.
  const [metodoElegido, setMetodoElegido] = useState<TipoMetodoPago | "tarjeta" | "deuna_en_linea">("tarjeta");
  const esEnLinea = metodoElegido === "tarjeta" || metodoElegido === "deuna_en_linea";
  const [infoPasarela, setInfoPasarela] = useState<InfoPasarela | null>(null);
  useEffect(() => {
    obtenerInfoPasarela().then(setInfoPasarela);
  }, []);
  const [pagoManual, setPagoManual] = useState<{ compraId: string } | null>(null);
  const [comprobanteArchivo, setComprobanteArchivo] = useState<File | null>(null);
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [comprobanteSubido, setComprobanteSubido] = useState(false);
  // Item 31, Fase 7 (11-ago-2026) -- compra como invitado (sin cuenta).
  const [telefonoContacto, setTelefonoContacto] = useState("");
  const [correoContacto, setCorreoContacto] = useState("");
  // RF-003 -- revisión con desglose exacto antes de disparar el cobro real.
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [pendiente, setPendiente] = useState<{
    token: string | null;
    sesionInvitadoId?: string;
    idempotencyKey: string;
    pasajeros: PasajeroCompraInput[];
    datosFacturacion?: DatosFacturacionInput;
  } | null>(null);
  // Datos para la factura (06-oct-2026). Por defecto se usan los del primer
  // pasajero; "otros" permite facturar con RUC o a nombre de otra persona.
  const [facturaModo, setFacturaModo] = useState<"pasajero" | "otros">("pasajero");
  const [facturaCorreo, setFacturaCorreo] = useState("");
  const [facturaTipo, setFacturaTipo] = useState<"cedula" | "ruc" | "pasaporte">("ruc");
  const [facturaIdentificacion, setFacturaIdentificacion] = useState("");
  const [facturaRazonSocial, setFacturaRazonSocial] = useState("");
  const [facturaDireccion, setFacturaDireccion] = useState("");
  // RF-024 -- solo se pide a quien compra como invitado; quien ya
  // tiene cuenta aceptó al registrarse.
  const [aceptoTerminos, setAceptoTerminos] = useState(false);

  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    listarMetodosPagoPorViaje(token, viajeId)
      .then(setMetodosDisponibles)
      .catch(() => {
        /* silencioso a propósito: si falla, simplemente no se ofrecen métodos manuales, solo tarjeta */
      });
  }, [viajeId]);

  useEffect(() => {
    obtenerMapaAsientos(viajeId)
      .then(setMapa)
      .catch(() => {
        /* silencioso a propósito: si falla, simplemente no se muestra la alerta de política */
      });
  }, [viajeId]);

  useEffect(() => {
    const ids = Array.from(new Set(paresAsiento.map((p) => p.viajeId)));
    ids.forEach((id) => {
      obtenerMapaAsientos(id)
        .then((m) => setMapasPorViaje((actual) => ({ ...actual, [id]: m })))
        .catch(() => {
          /* silencioso: sin el mapa simplemente no se adelanta el aviso; el servidor igual lo exige al comprar */
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viajeId]);

  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    listarMisCreditos(token)
      .then((lista) => setCreditos(lista.filter((c) => !c.usadoEn)))
      .catch(() => {
        /* silencioso a propósito: si falla, simplemente no se ofrece la opción de usar crédito */
      });
  }, []);

  function actualizarPasajero(indice: number, cambios: Partial<DatosPasajero>) {
    setPasajerosData((actual) =>
      actual.map((p, i) => (i === indice ? { ...p, ...cambios } : p)),
    );
  }

  /**
   * RF-003 (hallazgo real, 17-sep-2026): antes esta función cobraba
   * directo -- un solo clic en "Pagar y confirmar" disparaba el cobro
   * real sin ningún paso intermedio de revisión. Ahora solo COTIZA
   * (misma llamada real que usaría el cobro, sin crear ninguna
   * compra) y abre el modal de revisión -- el cobro real solo ocurre
   * si el usuario confirma explícitamente ahí (ver confirmarPago).
   */
  async function revisarCompra(e: React.FormEvent) {
    e.preventDefault();
    // Item 31, Fase 7 (11-ago-2026) -- compra como invitado: ya NO se
    // exige iniciar sesion para pagar. Sin token, hace falta al menos
    // un telefono o correo de contacto (el backend tambien lo valida,
    // esto solo evita el viaje redondo al servidor para avisarlo antes).
    const token = tokenValido();
    if (!token && !telefonoContacto.trim() && !correoContacto.trim()) {
      setError("Ingresa un telefono o correo de contacto para recibir tu boleto.");
      return;
    }
    const sesionInvitadoId = token ? undefined : obtenerOCrearSesionInvitado();
    if (!token && !esEnLinea) {
      setError("Los metodos de pago manuales todavia requieren una cuenta -- crea una gratis o paga con tarjeta.");
      return;
    }
    if (!token && !aceptoTerminos) {
      setError("Debes aceptar los Términos y Condiciones para continuar.");
      return;
    }
    // Fase 7-item29 (07-ago-2026) -- validacion de menor de edad, ahora
    // por cada pasajero del arreglo, no solo uno.
    for (const p of pasajerosData) {
      if (p.tipoTarifa === "nino" && (!p.adultoResponsableNombre.trim() || !p.adultoResponsableDocumento.trim())) {
        setError(
          `Para el pasajero del asiento ${p.numeroAsiento} (niño), indica el nombre y documento del adulto responsable.`,
        );
        return;
      }
    }
    for (const p of pasajerosData) {
      if (!esAsientoSoloMujeres(mapasPorViaje[p.viajeId], p.numeroAsiento)) continue;
      if (p.sexo === "") {
        setError(`El asiento ${p.numeroAsiento} es exclusivo para mujeres: indica el sexo del pasajero.`);
        return;
      }
      if (p.sexo === "masculino") {
        setError(`El asiento ${p.numeroAsiento} es exclusivo para mujeres. Vuelve atrás y elige otro asiento.`);
        return;
      }
    }
    // Datos de factura: opcionales mientras no exista la emisión real; si el
    // cliente los llena, se validan aquí lo básico (el servidor valida el resto).
    const correoFactura = (facturaCorreo.trim() || (token ? "" : correoContacto.trim())).toLowerCase();
    let datosFacturacion: DatosFacturacionInput | undefined;
    if (!FACTURACION_VISIBLE) {
      datosFacturacion = undefined;
    } else if (facturaModo === "otros") {
      if (!facturaIdentificacion.trim() || facturaRazonSocial.trim().length < 3 || !correoFactura) {
        setError("Para facturar con otros datos, completa la identificación, el nombre o razón social y el correo.");
        return;
      }
      datosFacturacion = {
        tipoIdentificacion: facturaTipo,
        identificacion: facturaIdentificacion.trim(),
        razonSocial: facturaRazonSocial.trim(),
        correo: correoFactura,
        direccion: facturaDireccion.trim() || undefined,
      };
    } else if (correoFactura && pasajerosData[0]) {
      const primero = pasajerosData[0];
      datosFacturacion = {
        tipoIdentificacion: primero.tipoDocumento,
        identificacion: primero.documento.trim(),
        razonSocial: `${primero.nombres.trim()} ${primero.apellidos.trim()}`,
        correo: correoFactura,
      };
    }
    setProcesando(true);
    setError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const pasajeros: PasajeroCompraInput[] = pasajerosData.map((p) => ({
        viajeId: p.viajeId,
        numeroAsiento: p.numeroAsiento,
        nombres: p.nombres.trim(),
        apellidos: p.apellidos.trim(),
        tipoDocumento: p.tipoDocumento,
        documento: p.documento.trim(),
        tipoTarifa: p.tipoTarifa,
        fechaNacimiento: p.fechaNacimiento || undefined,
        esEmbarazada: p.esEmbarazada || undefined,
        sexo: esAsientoSoloMujeres(mapasPorViaje[p.viajeId], p.numeroAsiento) && p.sexo !== "" ? p.sexo : undefined,
        autorizacionMenor:
          p.tipoTarifa === "nino"
            ? {
                tipoAcompanamiento: "con_autorizacion" as const,
                adultoResponsableNombre: p.adultoResponsableNombre.trim(),
                adultoResponsableDocumento: p.adultoResponsableDocumento.trim(),
                adultoResponsableTelefono: p.adultoResponsableTelefono.trim() || undefined,
              }
            : undefined,
      }));
      const cot = await cotizarCompra(pasajeros, token, sesionInvitadoId);
      setCotizacion(cot);
      setPendiente({ token, sesionInvitadoId, idempotencyKey, pasajeros, datosFacturacion });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo calcular el total.");
    } finally {
      setProcesando(false);
    }
  }

  /** Se llama solo desde el modal de revisión, tras confirmación explícita del usuario. */
  async function confirmarPago() {
    if (!pendiente) return;
    const { token, sesionInvitadoId, idempotencyKey, pasajeros, datosFacturacion } = pendiente;
    setProcesando(true);
    setError(null);
    try {
      if (metodoElegido === "tarjeta" || metodoElegido === "deuna_en_linea") {
        const resp = await crearCompra(
          pasajeros,
          token,
          idempotencyKey,
          creditoElegidoId || undefined,
          token ? undefined : telefonoContacto.trim() || undefined,
          token ? undefined : correoContacto.trim() || undefined,
          sesionInvitadoId,
          token ? undefined : aceptoTerminos,
          metodoElegido === "deuna_en_linea" ? "deuna" : "tarjeta",
          datosFacturacion,
        );
        setResultado(resp);
        if (resp.estado === "rechazado") {
          setError(resp.motivo ?? "El pago fue rechazado.");
        }
      } else {
        // Métodos de pago manuales (29-jul-2026) -- el asiento queda
        // reservado esperando el comprobante y la confirmación de la
        // cooperativa, no se emite el boleto todavía.
        // El "!" es seguro: la guardia de arriba ya garantiza que si
        // llegamos a esta rama (metodo distinto de tarjeta), token no
        // puede ser null -- ese caso ya se rechazo antes con setError.
        // Aquí metodoElegido ya no puede ser un medio en línea (arriba se atendieron).
        const resp = await iniciarPagoManual(token!, pasajeros, metodoElegido as TipoMetodoPago, idempotencyKey);
        setPagoManual({ compraId: resp.compraId });
      }
      setCotizacion(null);
      setPendiente(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la compra.");
    } finally {
      setProcesando(false);
    }
  }

  async function subirComprobante() {
    const token = tokenValido();
    if (!token || !pagoManual || !comprobanteArchivo) return;
    setSubiendoComprobante(true);
    setError(null);
    try {
      await subirComprobantePago(token, pagoManual.compraId, comprobanteArchivo);
      setComprobanteSubido(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el comprobante.");
    } finally {
      setSubiendoComprobante(false);
    }
  }

  // Pago manual iniciado -- esperando que el pasajero suba su
  // comprobante (transferencia, efectivo, DeUna, PayPhone).
  if (pagoManual) {
    const metodo = metodosDisponibles.find((m) => m.tipo === metodoElegido);
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-10 md:py-16">
        <div className="kb-card kb-on-white w-full max-w-md p-6 md:p-8">
          {comprobanteSubido ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-ok-bg text-ok">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>
              <h1 className="text-xl font-semibold">¡Comprobante recibido!</h1>
              <p className="text-sm text-muted-2">
                Tu{pasajerosData.length > 1 ? "s asientos quedan" : " asiento queda"} reservado
                {pasajerosData.length > 1 ? "s" : ""} mientras la cooperativa confirma tu pago. Te
                avisaremos cuando esté listo — revisa tu cuenta en &quot;Mis boletos&quot;.
              </p>
              <Link href="/perfil?tab=boletos" className="kb-btn kb-btn--primary mt-2">
                Ir a mis boletos
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h1 className="text-xl font-semibold">Ahora, paga y sube tu comprobante</h1>
              {metodo && (
                <div className="kb-alert kb-alert--info flex-col !gap-1">
                  {Object.entries(metodo.datosCuenta).map(([clave, valor]) => (
                    <p key={clave}>
                      <span className="capitalize text-muted-2">{clave}: </span>
                      <span className="font-semibold text-ink">{valor}</span>
                    </p>
                  ))}
                </div>
              )}
              <div>
                <label htmlFor="checkout-comprobante" className="kb-label">
                  Foto o captura del comprobante
                </label>
                <input
                  id="checkout-comprobante"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setComprobanteArchivo(e.target.files?.[0] ?? null)}
                  className="w-full rounded-ctrl bg-kbbg p-2.5 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
              </div>
              {error && <p className="kb-alert kb-alert--error">{error}</p>}
              <button
                onClick={subirComprobante}
                disabled={!comprobanteArchivo || subiendoComprobante}
                className="kb-btn kb-btn--primary w-full"
              >
                {subiendoComprobante ? "Subiendo..." : "Subir comprobante"}
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Boletos emitidos con éxito -- pantalla de confirmación. Fase
  // 7-item29 (07-ago-2026) -- ahora recorre TODOS los boletos
  // devueltos, no solo el primero.
  if (resultado?.estado === "aprobado" && resultado.boletos && resultado.boletos.length > 0) {
    const gruposPorClave = new Map<string, { clave: string; boletos: typeof resultado.boletos }>();
    for (const b of resultado.boletos) {
      const clave = `${b.rutaOrigenCiudad}>${b.rutaDestinoCiudad}|${b.horaSalidaProgramada}`;
      const grupo = gruposPorClave.get(clave) ?? { clave, boletos: [] };
      grupo.boletos.push(b);
      gruposPorClave.set(clave, grupo);
    }
    const gruposConfirmados = [...gruposPorClave.values()].sort(
      (a, b) =>
        new Date(a.boletos[0].horaSalidaProgramada).getTime() - new Date(b.boletos[0].horaSalidaProgramada).getTime(),
    );
    const esIdaYVueltaConfirmada = gruposConfirmados.length === 2;
    const totalTarifa = resultado.boletos.reduce((suma, b) => suma + b.precioPagado, 0);
    const totalTasa = resultado.boletos.reduce((suma, b) => suma + b.tasaTerminal, 0);
    const totalCargo = resultado.boletos.reduce((suma, b) => suma + b.cargoPlataforma, 0);
    const totalIva = resultado.boletos.reduce((suma, b) => suma + b.ivaMonto, 0);
    const hayVarios = resultado.boletos.length > 1;
    return (
      <main className="flex flex-1 flex-col items-center gap-4 px-5 pb-10 pt-6 md:gap-[18px] md:px-16 md:pt-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-3.5 py-1.5 text-[13px] font-semibold text-ok">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5L20 7" />
          </svg>
          Pago confirmado
        </span>
        <h1 className="text-center text-2xl font-semibold tracking-[-0.02em] md:text-[34px]">
          {hayVarios ? "¡Listo, tus boletos están confirmados!" : "¡Listo, tu boleto está confirmado!"}
        </h1>
        <p className="-mt-2 text-center text-sm text-muted-2 md:mb-1.5">
          {!tokenValido() && telefonoContacto
            ? `Te lo enviamos por WhatsApp al ${telefonoContacto}. `
            : ""}
          Muestra estos códigos al abordar. También puedes tomarles una captura de pantalla.
        </p>

        {/* Cada boleto se agrupa por SU viaje (ruta, fecha y hora): en una compra de
            ida y vuelta los boletos son de viajes distintos, así que los datos del
            viaje no pueden tomarse del primer boleto. Si hay dos viajes, el más
            temprano es la IDA y el otro la VUELTA. */}
        <div className="flex w-full flex-col items-center gap-6">
          {gruposConfirmados.map((grupo, indiceGrupo) => {
            const viaje = grupo.boletos[0];
            const salida = new Date(viaje.horaSalidaProgramada);
            const diaCorto = salida
              .toLocaleDateString("es-EC", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Guayaquil" })
              .replace(".", "");
            const horaSalida = salida.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Guayaquil" });
            return (
              <section key={grupo.clave} className="flex w-full flex-col items-center gap-4 lg:max-w-[980px]">
                {esIdaYVueltaConfirmada && (
                  <span className="kb-tag kb-tag--yellow self-start text-xs tracking-wide">
                    {indiceGrupo === 0 ? "IDA" : "VUELTA"}
                  </span>
                )}
                {grupo.boletos.map((boleto) => {
                  const infoAnden = codigosAnden[boleto.id];
                  const textoCodigo = boleto.codigoQr.length <= 20 ? boleto.codigoQr : null;
                  return (
                    <article key={boleto.codigoQr} className="kb-ticket w-full max-w-[520px] lg:max-w-none lg:grid lg:grid-cols-[1fr_1fr_250px]">
                      <div className="kb-ticket__top flex flex-col gap-4 lg:justify-between lg:gap-5 lg:p-[26px]">
                        <div className="flex items-center justify-between">
                          <LogoKlumbus className="h-[22px] lg:h-6" />
                          <span className="text-xs font-semibold text-kbyellow">
                            {viaje.cooperativaNombre}
                            {viaje.unidadIdentificador ? ` · ${viaje.unidadIdentificador}` : ""}
                          </span>
                        </div>
                        <div className="kb-timeline">
                          <div>
                            <div className="text-[26px] font-semibold tabular-nums lg:text-[30px]">{horaSalida}</div>
                            <div className="kb-timeline__city !text-ondark">{viaje.rutaOrigenCiudad}</div>
                          </div>
                          <div className="flex flex-col items-center gap-[3px] text-[11px] text-ondark lg:text-xs">
                            <span className="capitalize">{diaCorto}</span>
                            <div className="kb-timeline__line w-full [&::after]:!border-[#4A4F5C] [&::before]:!border-[#4A4F5C]">
                              <span className="kb-timeline__bus shrink-0 !bg-kbyellow">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B0D12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <rect x="4" y="3" width="16" height="15" rx="3" />
                                  <path d="M4 11h16M8 21v-3M16 21v-3" />
                                  <circle cx="8" cy="14.5" r=".6" />
                                  <circle cx="16" cy="14.5" r=".6" />
                                </svg>
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold leading-tight lg:text-[22px]">{viaje.rutaDestinoCiudad}</div>
                            <div className="kb-timeline__city !text-ondark">Destino</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-x-2.5 gap-y-3.5 p-5 lg:grid-cols-2 lg:content-center lg:gap-x-3.5 lg:gap-y-4 lg:p-[26px]">
                        <div className="col-span-2 min-w-0 lg:col-span-2">
                          <span className="block text-[11px] text-muted-3">Pasajero</span>
                          <b className="text-sm font-semibold lg:text-[15px]">{boleto.compradorNombre}</b>
                        </div>
                        <div className="min-w-0 lg:order-3">
                          <span className="block text-[11px] text-muted-3">Asiento</span>
                          <b className="text-sm font-semibold lg:text-[15px]">
                            {boleto.numeroAsiento}
                            {boleto.esVip && <span className="kb-tag kb-tag--yellow ml-1.5 align-middle">VIP</span>}
                          </b>
                        </div>
                        <div className="col-span-2 min-w-0 lg:col-span-1 lg:order-2">
                          <span className="block text-[11px] text-muted-3">Documento</span>
                          <b className="text-sm font-semibold tabular-nums lg:text-[15px]">{boleto.compradorDocumento ?? "—"}</b>
                        </div>
                        <div className="min-w-0 lg:order-4">
                          <span className="block text-[11px] text-muted-3">Tarifa</span>
                          <b className="text-sm font-semibold tabular-nums lg:text-[15px]">${boleto.precioPagado.toFixed(2)}</b>
                        </div>
                        {boleto.tasaTerminal > 0 && (
                          <div className="col-span-2 min-w-0 lg:order-5 lg:col-span-1">
                            <span className="block text-[11px] text-muted-3">Tasa de terminal</span>
                            <b className="text-sm font-semibold tabular-nums lg:text-[15px]">${boleto.tasaTerminal.toFixed(2)}</b>
                          </div>
                        )}
                      </div>

                      <div className="kb-ticket__cut lg:hidden" />
                      <div className="relative flex flex-col items-center gap-2 px-5 pb-5 pt-1 lg:justify-center lg:gap-2.5 lg:border-l-2 lg:border-dashed lg:border-line-2 lg:p-[22px]">
                        <span className="absolute -left-[13px] -top-3 hidden h-6 w-6 rounded-full bg-kbbg lg:block" aria-hidden="true" />
                        <span className="absolute -bottom-3 -left-[13px] hidden h-6 w-6 rounded-full bg-kbbg lg:block" aria-hidden="true" />
                        <CodigoQr valor={boleto.codigoQr} />
                        {textoCodigo && <span className="text-[13px] font-semibold tracking-[.18em]">{textoCodigo}</span>}
                        <span className="text-xs text-muted-2">
                          {infoAnden && infoAnden.estadoTasa !== "no_aplica" ? "Tu boleto · se valida al abordar" : "Muéstralo al subir"}
                        </span>
                        {infoAnden && <AccesoAnden estado={infoAnden.estadoTasa} codigo={infoAnden.codigoTasa} />}
                      </div>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>

        <div className="kb-card flex w-full max-w-[520px] flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm md:px-6 md:py-[18px] lg:max-w-[980px]">
          <div className="flex flex-wrap gap-x-7 gap-y-1 text-muted-2">
            <span>Tarifa ${totalTarifa.toFixed(2)}</span>
            {totalTasa > 0 && <span>Tasa de terminal ${totalTasa.toFixed(2)}</span>}
            {totalCargo > 0 && <span>Cargo de plataforma ${totalCargo.toFixed(2)}</span>}
            {resultado.ivaVisible && totalIva > 0 && <span>IVA incluido en la tarifa ${totalIva.toFixed(2)}</span>}
            {!!resultado.creditoAplicado && resultado.creditoAplicado > 0 && (
              <span className="text-ok">Crédito aplicado -${resultado.creditoAplicado.toFixed(2)}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-2">{resultado.creditoAplicado ? "Pagaste" : "Total"}</span>
            <b className="text-[22px] font-bold tabular-nums">${(resultado.montoPagado ?? resultado.montoTotal)?.toFixed(2)}</b>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 md:w-auto md:flex-row md:gap-3">
          <Link href="/perfil?tab=boletos" className="kb-btn kb-btn--outline">
            Ver mis boletos
          </Link>
          <Link href="/" className="kb-btn kb-btn--dark">
            Volver al inicio
          </Link>
        </div>
        <p className="text-center text-sm font-semibold">Gracias por preferirnos 🚌</p>
      </main>
    );
  }

  if (paresAsiento.length === 0) {
    return (
      <main className="mx-auto max-w-2xl flex-1 px-4 py-16 text-center">
        <p>Falta elegir un asiento primero.</p>
        <Link href={`/viajes/${viajeId}/asientos`} className="mt-4 inline-block font-semibold underline">
          Elegir asiento
        </Link>
      </main>
    );
  }

  // Resumen informativo que manda la pantalla de asientos (ruta, salida, cooperativa y
  // tarifa de referencia). El total exacto lo cotiza el servidor en "Revisa antes de pagar".
  const resumen = leerResumenViaje(searchParams);
  // Ida y vuelta: el resumen de la ida llega con el prefijo "i" (solo informativo).
  const resumenIda = esIdaYVuelta ? leerResumenViaje(searchParams, "i") : null;
  const asientosIda = paresAsiento.filter((p) => p.tramo === "ida").map((p) => p.numeroAsiento);
  const asientosVuelta = paresAsiento.filter((p) => p.tramo !== "ida").map((p) => p.numeroAsiento);
  const tramos: { etiqueta: string | null; r: typeof resumen; asientos: string[] }[] = esIdaYVuelta
    ? [
        { etiqueta: "Ida", r: resumenIda!, asientos: asientosIda },
        { etiqueta: "Vuelta", r: resumen, asientos: asientosVuelta },
      ]
    : [{ etiqueta: null, r: resumen, asientos: numerosAsiento }];
  // Tarifa de referencia (solo informativa; el total exacto lo cotiza el servidor al revisar).
  const tarifaEstimada = esIdaYVuelta
    ? resumenIda?.precio != null && resumen.precio !== null
      ? resumenIda.precio * asientosIda.length + resumen.precio * asientosVuelta.length
      : null
    : resumen.precio !== null
      ? resumen.precio * paresAsiento.length
      : null;
  const rutaTitulo = esIdaYVuelta
    ? resumenIda?.origen && resumenIda.destino
      ? `${resumenIda.origen} ⇄ ${resumenIda.destino}`
      : "Ida y vuelta"
    : resumen.origen && resumen.destino
      ? `${resumen.origen} → ${resumen.destino}`
      : null;
  const textoSillas = (lista: string[]) => (lista.length === 1 ? `Asiento ${lista[0]}` : `Asientos ${lista.join(", ")}`);

  /** Resumen de cada tramo (ruta, salida, cooperativa y asientos), para la tarjeta negra, el celular y la revisión. */
  const listaTramos = (oscuro: boolean) => (
    <ul className="flex flex-col gap-3">
      {tramos.map((t) => (
        <li key={t.etiqueta ?? "unico"} className={`flex gap-3 ${tramos.length > 1 ? `rounded-[16px] p-3 ${oscuro ? "bg-ink-2" : "bg-kbbg"}` : ""}`}>
          <span
            aria-hidden="true"
            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${oscuro ? "bg-kbyellow text-ink" : "bg-ink text-kbyellow"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="15" rx="3" />
              <path d="M4 11h16M8 21v-3M16 21v-3" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            {t.etiqueta && (
              <span className={`text-[11px] font-semibold uppercase tracking-[.08em] ${oscuro ? "text-kbyellow" : "text-muted-2"}`}>{t.etiqueta}</span>
            )}
            {t.r.origen && t.r.destino && (
              <b className="block text-[15px] font-semibold leading-snug">
                {t.r.origen} → {t.r.destino}
              </b>
            )}
            <span className={`block text-[13px] ${oscuro ? "text-ondark" : "text-muted-2"}`}>
              {[t.r.lineaSalida, t.r.cooperativa].filter(Boolean).join(" · ")}
            </span>
            <span className={`mt-0.5 block text-[13px] font-medium ${oscuro ? "text-white" : "text-ink"}`}>{textoSillas(t.asientos)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
  const textoAsientos = esIdaYVuelta
    ? `Ida y vuelta · ${paresAsiento.length} asientos en total`
    : numerosAsiento.length === 1
      ? `Asiento ${numerosAsiento[0]}`
      : `${numerosAsiento.length} asientos: ${numerosAsiento.join(", ")}`;
  const hayTercerPaso = !tokenValido();

  const OPCIONES_PAGO = [
    {
      valor: "tarjeta" as const,
      titulo: "Tarjeta de crédito o débito",
      detalle: "Visa, Mastercard, Diners y Discover · pago inmediato",
    },
    {
      valor: "deuna_en_linea" as const,
      titulo: "DeUna",
      detalle: "Paga desde tu app · pago inmediato",
    },
    ...metodosDisponibles
      .filter((m) => m.tipo !== "tarjeta_pasarela")
      .map((m) => ({
        valor: m.tipo as TipoMetodoPago,
        titulo: {
          transferencia_bancaria: "Transferencia bancaria",
          efectivo: "Efectivo",
          deuna: "DeUna (pago directo a la cooperativa)",
          payphone: "PayPhone (billetera)",
          tarjeta_pasarela: "Tarjeta",
        }[m.tipo],
        detalle: "Pagas por fuera y subes tu comprobante · la cooperativa lo confirma",
      })),
  ] as { valor: TipoMetodoPago | "tarjeta" | "deuna_en_linea"; titulo: string; detalle: string }[];

  const ICONO_METODO: Record<string, React.ReactNode> = {
    tarjeta: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="3" />
        <path d="M2 10h20M6 15h4" />
      </svg>
    ),
    transferencia_bancaria: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18" />
      </svg>
    ),
    efectivo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="6" width="20" height="12" rx="3" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
    deuna_en_linea: "DU",
    deuna: "DU",
    payphone: "PP",
  };

  const claseTarjetaPaso = "kb-card kb-on-white flex flex-col gap-4 p-5 md:p-6";
  const claseNumeroPaso = "kb-step-num !h-[34px] !w-[34px] shrink-0 not-italic";

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
            <h1 className="text-base font-semibold md:text-xl">Datos y pago</h1>
            <p className="text-xs text-muted-2 md:text-[13px]">{[rutaTitulo, textoAsientos].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1280px] flex-1 items-start gap-6 px-5 py-5 md:px-16 md:py-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <form id="checkout-form" onSubmit={revisarCompra} className="flex min-w-0 flex-col gap-4">
          {/* Celular: el resumen del viaje arriba (en PC va en la tarjeta negra). */}
          <section aria-label="Tu viaje" className="kb-card kb-on-white flex flex-col gap-3 p-4 md:hidden">
            <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted-2">Tu viaje</span>
            {listaTramos(false)}
          </section>
          {pasajerosData.map((p, indice) => (
            <div key={p.numeroAsiento} className={claseTarjetaPaso}>
              <div className="flex items-center gap-3">
                <i className={claseNumeroPaso}>{indice === 0 ? "1" : "+"}</i>
                <div>
                  <b className="block text-base font-semibold md:text-[17px]">
                    {pasajerosData.length > 1 ? `Pasajero ${indice + 1} — Asiento ${p.numeroAsiento}` : "Pasajero"}
                    {esIdaYVuelta && (
                      <span className="kb-tag kb-tag--yellow ml-2 align-middle">
                        {paresAsiento[indice]?.tramo === "ida" ? "Ida" : "Vuelta"}
                      </span>
                    )}
                  </b>
                  <span className="block text-xs text-muted-2">Como aparece en el documento</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`checkout-nombres-${indice}`} className="kb-label">
                    Nombres
                  </label>
                  <input
                    id={`checkout-nombres-${indice}`}
                    type="text"
                    required
                    minLength={2}
                    value={p.nombres}
                    onChange={(e) => actualizarPasajero(indice, { nombres: e.target.value })}
                    className="kb-input"
                  />
                </div>
                <div>
                  <label htmlFor={`checkout-apellidos-${indice}`} className="kb-label">
                    Apellidos
                  </label>
                  <input
                    id={`checkout-apellidos-${indice}`}
                    type="text"
                    required
                    minLength={2}
                    value={p.apellidos}
                    onChange={(e) => actualizarPasajero(indice, { apellidos: e.target.value })}
                    className="kb-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr]">
                <div>
                  <span id={`checkout-tipo-documento-${indice}`} className="kb-label">
                    Documento
                  </span>
                  <div role="group" aria-labelledby={`checkout-tipo-documento-${indice}`} className="kb-tabs flex w-full">
                    {(["cedula", "pasaporte"] as const).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        aria-pressed={p.tipoDocumento === tipo}
                        onClick={() => actualizarPasajero(indice, { tipoDocumento: tipo })}
                        className={`!px-2 ${p.tipoDocumento === tipo ? "is-active" : ""}`}
                      >
                        {tipo === "cedula" ? "Cédula" : "Pasaporte"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor={`checkout-documento-${indice}`} className="kb-label">
                    {p.tipoDocumento === "cedula" ? "Número de cédula" : "Número de pasaporte"}
                  </label>
                  <input
                    id={`checkout-documento-${indice}`}
                    type="text"
                    required
                    minLength={5}
                    maxLength={p.tipoDocumento === "cedula" ? 10 : 20}
                    value={p.documento}
                    onChange={(e) => {
                      const valorLimpio =
                        p.tipoDocumento === "cedula" ? e.target.value.replace(/\D/g, "") : e.target.value;
                      actualizarPasajero(indice, { documento: valorLimpio });
                    }}
                    className="kb-input tabular-nums"
                  />
                </div>
                <div className="md:col-span-2 xl:col-span-1">
                  <label htmlFor={`checkout-tipo-tarifa-${indice}`} className="kb-label">
                    Tipo de tarifa
                  </label>
                  <select
                    id={`checkout-tipo-tarifa-${indice}`}
                    value={p.tipoTarifa}
                    onChange={(e) => actualizarPasajero(indice, { tipoTarifa: e.target.value as DatosPasajero["tipoTarifa"] })}
                    className="kb-input"
                  >
                    {TARIFAS.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="-mt-1 text-xs text-muted-2">
                Cédula solo para números ecuatorianos. Turistas y extranjeros: elige Pasaporte.
              </p>
              {esAsientoSoloMujeres(mapasPorViaje[p.viajeId], p.numeroAsiento) && (
                <CampoSexoAsientoMujeres
                  id={`checkout-sexo-${indice}`}
                  numeroAsiento={p.numeroAsiento}
                  valor={p.sexo}
                  onCambio={(sexo) => actualizarPasajero(indice, { sexo })}
                />
              )}
              <label htmlFor={`checkout-embarazada-${indice}`} className="flex cursor-pointer items-center gap-2.5 text-[13px]">
                <input
                  id={`checkout-embarazada-${indice}`}
                  type="checkbox"
                  checked={p.esEmbarazada}
                  onChange={(e) => actualizarPasajero(indice, { esEmbarazada: e.target.checked })}
                  className="h-[22px] w-[22px] shrink-0 rounded-[7px]"
                />
                <span>¿Viaja embarazada? — atención preferente, no afecta el precio</span>
              </label>
              {p.tipoTarifa === "nino" && (
                <div>
                  <label htmlFor={`checkout-fecha-nacimiento-${indice}`} className="kb-label">
                    Fecha de nacimiento
                  </label>
                  <input
                    id={`checkout-fecha-nacimiento-${indice}`}
                    type="date"
                    value={p.fechaNacimiento}
                    onChange={(e) => actualizarPasajero(indice, { fechaNacimiento: e.target.value })}
                    className="kb-input"
                  />
                </div>
              )}
              {p.tipoTarifa === "nino" && (
                <div className="kb-alert kb-alert--info flex-col !gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Autorización de viaje (RF-MENOR)</p>
                    <p className="mt-1 text-xs">
                      Por ser un pasajero menor de edad, indica el adulto responsable que autoriza el viaje.
                    </p>
                  </div>
                  <div className="kb-on-white flex flex-col gap-3">
                    <div>
                      <label htmlFor={`checkout-adulto-nombre-${indice}`} className="kb-label">
                        Nombre del adulto responsable
                      </label>
                      <input
                        id={`checkout-adulto-nombre-${indice}`}
                        type="text"
                        value={p.adultoResponsableNombre}
                        onChange={(e) => actualizarPasajero(indice, { adultoResponsableNombre: e.target.value })}
                        className="kb-input"
                      />
                    </div>
                    <div>
                      <label htmlFor={`checkout-adulto-documento-${indice}`} className="kb-label">
                        Documento del adulto responsable
                      </label>
                      <input
                        id={`checkout-adulto-documento-${indice}`}
                        type="text"
                        value={p.adultoResponsableDocumento}
                        onChange={(e) => actualizarPasajero(indice, { adultoResponsableDocumento: e.target.value })}
                        className="kb-input"
                      />
                    </div>
                    <div>
                      <label htmlFor={`checkout-adulto-telefono-${indice}`} className="kb-label">
                        Teléfono del adulto responsable (opcional)
                      </label>
                      <input
                        id={`checkout-adulto-telefono-${indice}`}
                        type="text"
                        value={p.adultoResponsableTelefono}
                        onChange={(e) => actualizarPasajero(indice, { adultoResponsableTelefono: e.target.value })}
                        className="kb-input"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {mapa && (!mapa.permiteCancelacion || !mapa.permiteReprogramacion) && (
            <div className="kb-alert kb-alert--info flex-col !gap-1">
              <p className="font-semibold text-ink">Antes de confirmar el pago, lee esto:</p>
              {!mapa.permiteCancelacion && !mapa.permiteReprogramacion ? (
                <p>
                  Esta cooperativa no permite cambios ni devoluciones — si no viajas, pierdes el
                  boleto completo.
                </p>
              ) : (
                <ul className="list-inside list-disc space-y-0.5">
                  {!mapa.permiteCancelacion && <li>No podrás cancelar este boleto.</li>}
                  {!mapa.permiteReprogramacion && <li>No podrás reprogramar este boleto.</li>}
                </ul>
              )}
            </div>
          )}

          <fieldset className={claseTarjetaPaso}>
            <legend className="sr-only">Cómo quieres pagar</legend>
            <div className="flex items-center gap-3">
              <i className={claseNumeroPaso} aria-hidden="true">2</i>
              <div>
                <b className="block text-base font-semibold md:text-[17px]">Método de pago</b>
                <span className="block text-xs text-muted-2">Elige cómo pagar</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {OPCIONES_PAGO.map((opcion) => (
                <label
                  key={opcion.valor}
                  className="relative flex cursor-pointer items-center gap-3 rounded-[18px] bg-white px-4 py-3.5 shadow-[inset_0_0_0_1.5px_#E9EBF0] has-[:checked]:shadow-[inset_0_0_0_2px_#0B0D12] has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-kbyellow"
                >
                  <input
                    type="radio"
                    name="checkout-metodo-pago"
                    value={opcion.valor}
                    checked={metodoElegido === opcion.valor}
                    onChange={() => setMetodoElegido(opcion.valor)}
                    className="peer sr-only"
                  />
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-kbbg text-xs font-bold peer-checked:bg-kbyellow">
                    {ICONO_METODO[opcion.valor] ?? ICONO_METODO.tarjeta}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{opcion.titulo}</span>
                    <span className="block text-xs text-muted-2">{opcion.detalle}</span>
                  </span>
                  <span
                    className="h-[22px] w-[22px] shrink-0 rounded-full shadow-[inset_0_0_0_2px_#D6D9E0] peer-checked:shadow-[inset_0_0_0_7px_#0B0D12]"
                    aria-hidden="true"
                  />
                </label>
              ))}
            </div>
            {!esEnLinea && (
              <p className="text-xs text-muted-2">
                Pagas por fuera de la plataforma y subes tu comprobante — la cooperativa confirma
                tu{pasajerosData.length > 1 ? "s boletos" : " boleto"} después.
              </p>
            )}
            {creditos.length > 0 && (
              <div>
                <label htmlFor="checkout-credito" className="kb-label">
                  Usar un crédito disponible (opcional)
                </label>
                <select
                  id="checkout-credito"
                  value={creditoElegidoId}
                  onChange={(e) => setCreditoElegidoId(e.target.value)}
                  className="kb-input"
                >
                  <option value="">No usar crédito</option>
                  {creditos.map((c) => (
                    <option key={c.id} value={c.id}>
                      ${c.monto.toFixed(2)} — {c.cooperativaNombre}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-2">
                  Solo se aplica si el crédito es de la misma cooperativa que este viaje.
                </p>
              </div>
            )}
          </fieldset>

          {FACTURACION_VISIBLE && (
            <div className={claseTarjetaPaso}>
              <p className="text-base font-semibold">Datos para tu factura</p>
              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
                <label htmlFor="checkout-factura-modo-pasajero" className="flex items-center gap-2">
                  <input
                    id="checkout-factura-modo-pasajero"
                    type="radio"
                    name="checkout-factura-modo"
                    checked={facturaModo === "pasajero"}
                    onChange={() => setFacturaModo("pasajero")}
                  />
                  Con los datos del primer pasajero
                </label>
                <label htmlFor="checkout-factura-modo-otros" className="flex items-center gap-2">
                  <input
                    id="checkout-factura-modo-otros"
                    type="radio"
                    name="checkout-factura-modo"
                    checked={facturaModo === "otros"}
                    onChange={() => setFacturaModo("otros")}
                  />
                  Con otros datos (por ejemplo, con RUC)
                </label>
              </div>
              {facturaModo === "otros" && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="checkout-factura-tipo" className="kb-label">
                      Tipo de identificación
                    </label>
                    <select
                      id="checkout-factura-tipo"
                      value={facturaTipo}
                      onChange={(e) => setFacturaTipo(e.target.value as "cedula" | "ruc" | "pasaporte")}
                      className="kb-input"
                    >
                      <option value="ruc">RUC</option>
                      <option value="cedula">Cédula</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="checkout-factura-identificacion" className="kb-label">
                      Número de identificación
                    </label>
                    <input
                      id="checkout-factura-identificacion"
                      value={facturaIdentificacion}
                      onChange={(e) => setFacturaIdentificacion(e.target.value)}
                      className="kb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-factura-razon" className="kb-label">
                      Nombre o razón social
                    </label>
                    <input
                      id="checkout-factura-razon"
                      value={facturaRazonSocial}
                      onChange={(e) => setFacturaRazonSocial(e.target.value)}
                      className="kb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-factura-direccion" className="kb-label">
                      Dirección (opcional)
                    </label>
                    <input
                      id="checkout-factura-direccion"
                      value={facturaDireccion}
                      onChange={(e) => setFacturaDireccion(e.target.value)}
                      className="kb-input"
                    />
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="checkout-factura-correo" className="kb-label">
                  Correo para la factura
                </label>
                <input
                  id="checkout-factura-correo"
                  type="email"
                  value={facturaCorreo}
                  onChange={(e) => setFacturaCorreo(e.target.value)}
                  className="kb-input"
                  placeholder={tokenValido() ? "tu@correo.com" : correoContacto || "tu@correo.com"}
                />
              </div>
            </div>
          )}

          {hayTercerPaso && (
            <div className={claseTarjetaPaso}>
              <div className="flex items-center gap-3">
                <i className={claseNumeroPaso} aria-hidden="true">3</i>
                <div>
                  <b className="block text-base font-semibold md:text-[17px]">¿A dónde enviamos tu boleto?</b>
                  <span className="block text-xs text-muted-2">Compras sin crear cuenta: solo necesitamos dónde enviarte tu boleto</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor="checkout-invitado-telefono" className="kb-label">
                    Teléfono (para WhatsApp)
                  </label>
                  <input
                    id="checkout-invitado-telefono"
                    type="tel"
                    maxLength={10}
                    value={telefonoContacto}
                    onChange={(e) => setTelefonoContacto(e.target.value.replace(/\D/g, ""))}
                    className="kb-input tabular-nums"
                    placeholder="0991234567"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-invitado-correo" className="kb-label">
                    Correo (opcional si ya diste teléfono)
                  </label>
                  <input
                    id="checkout-invitado-correo"
                    type="email"
                    value={correoContacto}
                    onChange={(e) => setCorreoContacto(e.target.value)}
                    className="kb-input"
                    placeholder="tu@correo.com"
                  />
                </div>
              </div>
              <label htmlFor="checkout-invitado-terminos" className="flex cursor-pointer items-center gap-2.5 text-[13px]">
                <input
                  id="checkout-invitado-terminos"
                  type="checkbox"
                  checked={aceptoTerminos}
                  onChange={(e) => setAceptoTerminos(e.target.checked)}
                  className="h-[22px] w-[22px] shrink-0 rounded-[7px]"
                />
                <span>
                  Acepto los{" "}
                  <Link href="/terminos" target="_blank" className="font-semibold underline">
                    Términos y Condiciones
                  </Link>
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="kb-alert kb-alert--error flex-col !gap-1">
              <p className="font-medium">{error}</p>
              {error.toLowerCase().includes("bloqueo") && (
                <Link href={`/viajes/${viajeId}/asientos`} className="inline-block font-semibold underline">
                  Volver a elegir asiento
                </Link>
              )}
            </div>
          )}
        </form>

        {/* PC: resumen negro a la derecha, con la acción principal. */}
        <aside className="hidden md:block lg:sticky lg:top-24">
          <div className="flex flex-col gap-3.5 rounded-card bg-ink p-6 text-white">
            <span className="text-xs font-semibold uppercase tracking-[.08em] text-kbyellow">Resumen</span>
            <b className="text-[22px] font-semibold leading-tight">{rutaTitulo ?? "Tu compra"}</b>
            {listaTramos(true)}
            {tarifaEstimada !== null && (
              <>
                <hr className="h-px border-0 bg-ink-3" />
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ondark">{esIdaYVuelta || paresAsiento.length > 1 ? "Tarifa estimada" : "Tarifa"}</span>
                  <b className="text-[26px] font-bold tabular-nums">${tarifaEstimada.toFixed(2)}</b>
                </div>
                <span className="-mt-2 text-xs text-ondark">El total exacto, con tasas y descuentos, lo ves al revisar.</span>
              </>
            )}
            <button type="submit" form="checkout-form" disabled={procesando} className="kb-btn kb-btn--primary w-full">
              {procesando ? "Calculando..." : "Revisar y pagar"}
            </button>
            {infoPasarela?.modoPrueba !== false && (
              <p className="text-center text-xs text-ondark">
                Pago de prueba — todavía no está conectada una pasarela real.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Celular: total y botón fijos abajo. */}
      <div className="kb-sheet z-40 mt-auto">
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs text-muted-2">
            {tarifaEstimada !== null ? "Tarifa estimada" : textoAsientos}
          </span>
          {tarifaEstimada !== null && <b className="text-[22px] font-bold tabular-nums">${tarifaEstimada.toFixed(2)}</b>}
        </div>
        <button type="submit" form="checkout-form" disabled={procesando} className="kb-btn kb-btn--primary shrink-0 px-6">
          {procesando ? "Calculando..." : "Revisar y pagar"}
        </button>
      </div>

      {cotizacion && (
        <div className="kb-modal-bg" role="dialog" aria-modal="true" aria-labelledby="checkout-revision-titulo">
          <div className="kb-modal">
            <h2 id="checkout-revision-titulo" className="text-lg font-semibold">
              Revisa antes de pagar
            </h2>
            <div className="max-h-[38vh] overflow-y-auto">{listaTramos(false)}</div>
            <p className="text-sm text-muted-2">
              Método: {metodoElegido === "tarjeta" ? "Tarjeta de crédito o débito" : metodoElegido === "deuna_en_linea" ? "DeUna" : metodoElegido === "transferencia_bancaria" ? "Transferencia" : metodoElegido === "efectivo" ? "Efectivo" : metodoElegido === "deuna" ? "DeUna (pago directo a la cooperativa)" : "PayPhone"}
            </p>
            <div className="flex flex-col gap-2 rounded-ctrl bg-kbbg px-4 py-3.5 text-sm">
              <div className="flex justify-between text-muted-2">
                <span>Tarifas</span>
                <span className="tabular-nums">${cotizacion.montoTarifasCooperativa.toFixed(2)}</span>
              </div>
              {cotizacion.montoTasaTerminal > 0 && (
                <div className="flex justify-between text-muted-2">
                  <span>Tasa de terminal</span>
                  <span className="tabular-nums">${cotizacion.montoTasaTerminal.toFixed(2)}</span>
                </div>
              )}
              {cotizacion.montoCargoPlataforma > 0 && (
                <div className="flex justify-between text-muted-2">
                  <span>Cargo de plataforma</span>
                  <span className="tabular-nums">${cotizacion.montoCargoPlataforma.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-line-2 pt-2 font-semibold">
                <span>Total a pagar</span>
                <span className="text-xl font-bold tabular-nums">${cotizacion.montoTotal.toFixed(2)}</span>
              </div>
            </div>
            {error && <p className="kb-alert kb-alert--error">{error}</p>}
            <div className="kb-modal__actions">
              <button
                onClick={() => {
                  setCotizacion(null);
                  setPendiente(null);
                }}
                disabled={procesando}
                className="kb-btn kb-btn--outline"
              >
                Cancelar
              </button>
              <button onClick={confirmarPago} disabled={procesando} className="kb-btn kb-btn--primary px-4">
                {procesando ? "Procesando..." : "Confirmar y pagar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: viajeId } = usePromise(params);
  return (
    <Suspense fallback={null}>
      <FormularioCheckout viajeId={viajeId} />
    </Suspense>
  );
}
