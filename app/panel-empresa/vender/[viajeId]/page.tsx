"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import {
  obtenerMapaAsientos,
  bloquearAsiento,
  obtenerPisosDeDistribucion,
  cotizarVentanillaCoop,
  venderEnVentanillaCoop,
  subirComprobanteVentanillaCoop,
  type MapaAsientos,
  type Cotizacion,
  type PasajeroCompraInput,
  type BoletoEmitido,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { MapaAsientosBus } from "@/components/MapaAsientosBus";
import { CodigoQr } from "@/components/CodigoQr";

const TARIFAS = [
  { valor: "adulto", etiqueta: "Adulto" },
  { valor: "nino", etiqueta: "Niño" },
  { valor: "tercera_edad", etiqueta: "Tercera edad" },
  { valor: "discapacidad", etiqueta: "Discapacidad" },
] as const;

const METODOS = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "tarjeta_fisica", etiqueta: "Tarjeta física (datáfono)" },
  { valor: "transferencia_bancaria", etiqueta: "Transferencia ya acreditada" },
] as const;

interface DatosPasajeroVentanilla {
  numeroAsiento: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: "cedula" | "pasaporte";
  documento: string;
  tipoTarifa: (typeof TARIFAS)[number]["valor"];
  adultoResponsableNombre: string;
  adultoResponsableDocumento: string;
}

function vacio(numeroAsiento: string): DatosPasajeroVentanilla {
  return {
    numeroAsiento,
    nombres: "",
    apellidos: "",
    tipoDocumento: "cedula",
    documento: "",
    tipoTarifa: "adulto",
    adultoResponsableNombre: "",
    adultoResponsableDocumento: "",
  };
}

export default function VenderVentanillaViajePage({ params }: { params: Promise<{ viajeId: string }> }) {
  const { viajeId } = usePromise(params);
  const [mapa, setMapa] = useState<MapaAsientos | null>(null);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [pasajerosData, setPasajerosData] = useState<DatosPasajeroVentanilla[]>([]);
  const [tipoMetodoPago, setTipoMetodoPago] = useState<(typeof METODOS)[number]["valor"]>("efectivo");
  const [telefonoContacto, setTelefonoContacto] = useState("");
  const [correoContacto, setCorreoContacto] = useState("");
  // Respaldo opcional para transferencia (22-sep-2026) -- nunca bloquea
  // la venta; solo queda guardado para poder auditar después.
  const [referenciaTransferencia, setReferenciaTransferencia] = useState("");
  const [comprobanteArchivo, setComprobanteArchivo] = useState<File | null>(null);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ compraId: string; boletos: BoletoEmitido[] } | null>(null);

  useEffect(() => {
    obtenerMapaAsientos(viajeId)
      .then(setMapa)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el viaje."));
  }, [viajeId]);

  function alternarAsiento(numero: string) {
    setSeleccionados((actual) => {
      if (actual.includes(numero)) {
        setPasajerosData((p) => p.filter((d) => d.numeroAsiento !== numero));
        return actual.filter((n) => n !== numero);
      }
      setPasajerosData((p) => [...p, vacio(numero)]);
      return [...actual, numero];
    });
  }

  function actualizarPasajero(numeroAsiento: string, cambios: Partial<DatosPasajeroVentanilla>) {
    setPasajerosData((actual) =>
      actual.map((p) => (p.numeroAsiento === numeroAsiento ? { ...p, ...cambios } : p)),
    );
  }

  function aPasajerosInput(): PasajeroCompraInput[] {
    return pasajerosData.map((p) => ({
      viajeId,
      numeroAsiento: p.numeroAsiento,
      nombres: p.nombres.trim(),
      apellidos: p.apellidos.trim(),
      tipoDocumento: p.tipoDocumento,
      documento: p.documento.trim(),
      tipoTarifa: p.tipoTarifa,
      autorizacionMenor:
        p.tipoTarifa === "nino"
          ? {
              tipoAcompanamiento: "con_autorizacion" as const,
              adultoResponsableNombre: p.adultoResponsableNombre.trim(),
              adultoResponsableDocumento: p.adultoResponsableDocumento.trim(),
            }
          : undefined,
    }));
  }

  async function revisarVenta(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token || seleccionados.length === 0) return;
    setProcesando(true);
    setError(null);
    try {
      // Bloquear cada asiento bajo la propia cuenta del vendedor -- el
      // backend usa este mismo hold para validar la venta.
      for (const numero of seleccionados) {
        await bloquearAsiento(viajeId, numero, token);
      }
      const cot = await cotizarVentanillaCoop(token, aPasajerosInput());
      setCotizacion(cot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo calcular el total.");
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarVenta() {
    const token = obtenerToken();
    if (!token) return;
    setProcesando(true);
    setError(null);
    try {
      // El comprobante se sube primero (todavía no existe compraId) --
      // si esto falla, se avisa pero no bloquea la venta: el vendedor
      // puede confirmar igual sin el respaldo.
      let comprobanteUrl: string | undefined;
      if (comprobanteArchivo) {
        try {
          const subida = await subirComprobanteVentanillaCoop(token, comprobanteArchivo);
          comprobanteUrl = subida.comprobanteUrl;
        } catch {
          // Silencioso a propósito -- ver comentario arriba.
        }
      }
      const resp = await venderEnVentanillaCoop(
        token,
        aPasajerosInput(),
        tipoMetodoPago,
        telefonoContacto.trim() || undefined,
        correoContacto.trim() || undefined,
        referenciaTransferencia.trim() || undefined,
        comprobanteUrl,
      );
      setResultado(resp);
      setCotizacion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la venta.");
      setCotizacion(null);
    } finally {
      setProcesando(false);
    }
  }

  if (resultado) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 print:shadow-none print:ring-0">
          <p className="font-display text-lg font-bold text-brand-dark">Venta confirmada</p>
          <div className="mt-4 space-y-6">
            {resultado.boletos.map((boleto) => (
              <div key={boleto.codigoQr} className="border-t border-brand-dark/10 pt-4 first:border-t-0 first:pt-0">
                <p className="text-sm font-semibold text-brand-dark">
                  Asiento {boleto.numeroAsiento} — {boleto.compradorNombre}
                </p>
                <p className="text-xs text-brand-dark/50">
                  {boleto.rutaOrigenCiudad} → {boleto.rutaDestinoCiudad} ·{" "}
                  {new Date(boleto.horaSalidaProgramada).toLocaleString("es-EC", {
                    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                    timeZone: "America/Guayaquil",
                  })}
                </p>
                <p className="mt-1 text-sm text-brand-dark/70">Total: ${(boleto.precioPagado + boleto.tasaTerminal + boleto.cargoPlataforma).toFixed(2)}</p>
                <div className="mt-3">
                  <CodigoQr valor={boleto.codigoQr} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95"
            >
              Imprimir boleto
            </button>
            <Link href="/panel-empresa/vender" className="font-semibold text-brand hover:underline">
              Vender otro boleto
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error && !mapa) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/panel-empresa/vender" className="mt-4 inline-block font-semibold text-brand hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  if (!mapa) {
    return <p className="text-sm text-brand-dark/50">Cargando mapa de asientos...</p>;
  }

  const estadoPorNumero = new Map(mapa.asientosNoDisponibles.map((a) => [a.numeroAsiento, a.estado]));
  const pisos = obtenerPisosDeDistribucion(mapa.distribucionAsientos, mapa.capacidadTotal);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Vender boleto en ventanilla</h1>
        <Link href="/panel-empresa/vender" className="text-sm text-brand-dark/60 hover:underline">
          ← Elegir otra salida
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="mb-1 text-sm font-semibold text-brand-dark">1. Elige el/los asiento(s)</p>
        <p className="mb-3 text-xs text-brand-dark/60">
          {mapa.capacidadTotal - mapa.asientosNoDisponibles.length} disponibles · {mapa.asientosNoDisponibles.length} ocupados · {mapa.capacidadTotal} en total
          {pisos.length > 1 ? ` · ${pisos.length} pisos` : ""}
        </p>
        <MapaAsientosBus
          pisos={pisos}
          estadoPorNumero={estadoPorNumero}
          seleccionados={seleccionados}
          onAlternar={alternarAsiento}
          tieneBano={(mapa.tipoVehiculoAmenidades ?? []).includes("bano_a_bordo")}
        />
      </div>

      {pasajerosData.length > 0 && (
        <form onSubmit={revisarVenta} className="space-y-4">
          {pasajerosData.map((p) => (
            <div key={p.numeroAsiento} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <p className="font-display text-sm font-bold text-brand-dark">Asiento {p.numeroAsiento}</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  minLength={2}
                  placeholder="Nombres"
                  value={p.nombres}
                  onChange={(e) => actualizarPasajero(p.numeroAsiento, { nombres: e.target.value })}
                  className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark"
                />
                <input
                  required
                  minLength={2}
                  placeholder="Apellidos"
                  value={p.apellidos}
                  onChange={(e) => actualizarPasajero(p.numeroAsiento, { apellidos: e.target.value })}
                  className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={p.tipoDocumento}
                  onChange={(e) => actualizarPasajero(p.numeroAsiento, { tipoDocumento: e.target.value as "cedula" | "pasaporte" })}
                  className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark"
                >
                  <option value="cedula">Cédula</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
                <input
                  required
                  placeholder="Documento"
                  value={p.documento}
                  onChange={(e) => actualizarPasajero(p.numeroAsiento, { documento: e.target.value })}
                  className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark"
                />
              </div>
              <p className="-mt-1 text-xs text-brand-dark/50">
                Cédula solo para números ecuatorianos. Turistas y extranjeros: elige Pasaporte.
              </p>
              <select
                value={p.tipoTarifa}
                onChange={(e) => actualizarPasajero(p.numeroAsiento, { tipoTarifa: e.target.value as DatosPasajeroVentanilla["tipoTarifa"] })}
                className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark"
              >
                {TARIFAS.map((t) => (
                  <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                ))}
              </select>
              {p.tipoTarifa === "nino" && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    placeholder="Nombre del adulto responsable"
                    value={p.adultoResponsableNombre}
                    onChange={(e) => actualizarPasajero(p.numeroAsiento, { adultoResponsableNombre: e.target.value })}
                    className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark"
                  />
                  <input
                    required
                    placeholder="Documento del adulto responsable"
                    value={p.adultoResponsableDocumento}
                    onChange={(e) => actualizarPasajero(p.numeroAsiento, { adultoResponsableDocumento: e.target.value })}
                    className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark"
                  />
                </div>
              )}
            </div>
          ))}

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="mb-2 text-sm font-semibold text-brand-dark">2. Método de pago</p>
            <select
              value={tipoMetodoPago}
              onChange={(e) => setTipoMetodoPago(e.target.value as (typeof METODOS)[number]["valor"])}
              className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark"
            >
              {METODOS.map((m) => (
                <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
              ))}
            </select>

            {tipoMetodoPago === "transferencia_bancaria" && (
              <div className="mt-3 space-y-2 rounded-lg bg-brand-light/20 p-3">
                <p className="text-xs text-brand-dark/60">
                  Opcional: dejá un respaldo de la transferencia para poder revisarla después.
                </p>
                <input
                  type="text"
                  placeholder="Número de referencia (opcional)"
                  value={referenciaTransferencia}
                  onChange={(e) => setReferenciaTransferencia(e.target.value)}
                  className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark"
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-dark/70">
                  <span className="rounded-lg border border-brand-light bg-white px-3 py-2 font-semibold text-brand-dark hover:bg-brand-light/40">
                    {comprobanteArchivo ? "Cambiar foto" : "Adjuntar foto del comprobante (opcional)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setComprobanteArchivo(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
                {comprobanteArchivo && (
                  <p className="text-xs text-brand-dark/50">
                    {comprobanteArchivo.name}{" "}
                    <button
                      type="button"
                      onClick={() => setComprobanteArchivo(null)}
                      className="font-semibold text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </p>
                )}
              </div>
            )}

            <p className="mt-3 mb-2 text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Contacto del pasajero (opcional, para enviarle su boleto)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="tel"
                placeholder="Teléfono"
                value={telefonoContacto}
                onChange={(e) => setTelefonoContacto(e.target.value.replace(/\D/g, ""))}
                maxLength={10}
                className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark"
              />
              <input
                type="email"
                placeholder="Correo"
                value={correoContacto}
                onChange={(e) => setCorreoContacto(e.target.value)}
                className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark"
              />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={procesando}
            className="w-full rounded-lg bg-brand-amber px-6 py-3 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-60"
          >
            {procesando ? "Calculando..." : "Revisar venta"}
          </button>
        </form>
      )}

      {cotizacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-bold text-brand-dark">Revisa antes de vender</h2>
            <p className="mt-1 text-sm text-brand-dark/70">
              Método: {METODOS.find((m) => m.valor === tipoMetodoPago)?.etiqueta}
            </p>
            <div className="mt-3 space-y-1 rounded-lg bg-brand-light/30 px-4 py-3 text-sm">
              <div className="flex justify-between text-brand-dark/70">
                <span>Tarifas</span>
                <span>${cotizacion.montoTarifasCooperativa.toFixed(2)}</span>
              </div>
              {cotizacion.montoTasaTerminal > 0 && (
                <div className="flex justify-between text-brand-dark/70">
                  <span>Tasa de terminal</span>
                  <span>${cotizacion.montoTasaTerminal.toFixed(2)}</span>
                </div>
              )}
              {cotizacion.montoCargoPlataforma > 0 && (
                <div className="flex justify-between text-brand-dark/70">
                  <span>Cargo de plataforma</span>
                  <span>${cotizacion.montoCargoPlataforma.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-brand-dark/10 pt-1 font-semibold text-brand-dark">
                <span>Total a cobrar</span>
                <span>${cotizacion.montoTotal.toFixed(2)}</span>
              </div>
            </div>
            {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setCotizacion(null)}
                disabled={procesando}
                className="flex-1 rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark/70 transition hover:bg-brand-light/40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarVenta}
                disabled={procesando}
                className="flex-1 rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-60"
              >
                {procesando ? "Vendiendo..." : "Confirmar y vender"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
