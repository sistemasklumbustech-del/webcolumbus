"use client";

import { useCallback, useEffect, useState } from "react";
import {
  confirmarVentaManual,
  listarVentasPorConfirmar,
  type ResultadoVentasPorConfirmar,
  type VentaPorConfirmar,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const LIMITE_PAGINA = 25;

type Vista = "por_confirmar" | "confirmadas";

const ETIQUETA_TARIFA: Record<string, string> = {
  adulto: "Adulto",
  nino: "Niño",
  tercera_edad: "Tercera edad",
  discapacidad: "Discapacidad",
};

const ETIQUETA_IDENTIFICACION: Record<string, string> = {
  cedula: "Cédula",
  ruc: "RUC",
  pasaporte: "Pasaporte",
};

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CLASE_INPUT =
  "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium";
const CLASE_ETIQUETA = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

/**
 * Ventas en línea que Klumbus ya cobró y que la cooperativa debe facturar y registrar en el
 * SIAT 3000 (07-oct-2026). Si el sistema de la cooperativa responde solo, aquí no hace falta
 * hacer nada; si no responde, o no se tiene un sistema conectado, el personal carga a mano el
 * número de factura y el código de tasa y la venta queda completada igual.
 */
export default function VentasPorConfirmarPage() {
  const [vista, setVista] = useState<Vista>("por_confirmar");
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<ResultadoVentasPorConfirmar | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [abierta, setAbierta] = useState<string | null>(null);
  const [numeroFactura, setNumeroFactura] = useState("");
  const [codigoTasa, setCodigoTasa] = useState("");
  const [urlFactura, setUrlFactura] = useState("");
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    setCargando(true);
    listarVentasPorConfirmar(token, vista, pagina, LIMITE_PAGINA)
      .then((r) => {
        setResultado(r);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las ventas."))
      .finally(() => setCargando(false));
  }, [vista, pagina]);

  useEffect(cargar, [cargar]);

  function cambiarVista(v: Vista) {
    setVista(v);
    setPagina(1);
    setAbierta(null);
  }

  function abrirFormulario(compraId: string) {
    setAbierta(compraId);
    setNumeroFactura("");
    setCodigoTasa("");
    setUrlFactura("");
    setErrorForm(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!abierta) return;
    if (!/^\d{9}$/.test(numeroFactura)) {
      setErrorForm("El número de factura son 9 dígitos, por ejemplo 000000789.");
      return;
    }
    if (!/^\d{20}$/.test(codigoTasa)) {
      setErrorForm("El código de tasa son 20 dígitos: es el que sale del SIAT 3000 y va en el QR del torniquete.");
      return;
    }
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    setErrorForm(null);
    try {
      await confirmarVentaManual(token, abierta, { numeroFactura, codigoTasa, urlFactura });
      setMensajeExito("Listo: la venta quedó confirmada con su factura y su código de tasa.");
      setAbierta(null);
      cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "No se pudo guardar la confirmación.");
    } finally {
      setGuardando(false);
    }
  }

  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / LIMITE_PAGINA)) : 1;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="font-display text-2xl font-bold text-brand-dark">Ventas por confirmar</h1>
      <p className="mt-1 text-sm text-brand-dark/70">
        Ventas en línea que Klumbus ya cobró y que tu cooperativa debe facturar y registrar en el SIAT 3000.
        Si tu sistema está conectado, se confirman solas. Si no, o si algo falló, carga aquí el número de
        factura y el código de tasa. Pasados 30 minutos sin confirmar, la venta se marca como vencida: el
        pasajero ya pagó, así que conviene resolverla cuanto antes.
      </p>

      <div className="mt-5 inline-flex rounded-xl bg-brand-light/40 p-1 text-sm font-semibold">
        {(
          [
            ["por_confirmar", "Por confirmar"],
            ["confirmadas", "Confirmadas"],
          ] as [Vista, string][]
        ).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            onClick={() => cambiarVista(valor)}
            className={`rounded-lg px-4 py-1.5 transition ${
              vista === valor ? "bg-white text-brand-dark shadow-sm" : "text-brand-dark/60 hover:text-brand-dark"
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {resultado === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {resultado !== null && resultado.filas.length === 0 && !cargando && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          {vista === "por_confirmar"
            ? "No tienes ventas esperando confirmación. Todo al día."
            : "Todavía no hay ventas confirmadas."}
        </p>
      )}

      <div className="mt-5 space-y-4">
        {resultado?.filas.map((v) => (
          <TarjetaVenta
            key={v.compraId}
            venta={v}
            abierta={abierta === v.compraId}
            onAbrir={() => abrirFormulario(v.compraId)}
          >
            <form onSubmit={guardar} className="mt-4 space-y-3 rounded-xl bg-brand-light/20 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`factura-${v.compraId}`} className={CLASE_ETIQUETA}>
                    Número de factura (9 dígitos)
                  </label>
                  <input
                    id={`factura-${v.compraId}`}
                    inputMode="numeric"
                    maxLength={9}
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000789"
                    className={CLASE_INPUT}
                  />
                </div>
                <div>
                  <label htmlFor={`tasa-${v.compraId}`} className={CLASE_ETIQUETA}>
                    Código de tasa (20 dígitos)
                  </label>
                  <input
                    id={`tasa-${v.compraId}`}
                    inputMode="numeric"
                    maxLength={20}
                    value={codigoTasa}
                    onChange={(e) => setCodigoTasa(e.target.value.replace(/\D/g, ""))}
                    placeholder="12345678901234567890"
                    className={CLASE_INPUT}
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`url-${v.compraId}`} className={CLASE_ETIQUETA}>
                  Enlace a la factura (opcional)
                </label>
                <input
                  id={`url-${v.compraId}`}
                  type="url"
                  value={urlFactura}
                  onChange={(e) => setUrlFactura(e.target.value)}
                  placeholder="https://tu-sistema.com/facturas/000000789.pdf"
                  className={CLASE_INPUT}
                />
              </div>
              {errorForm && <p className="text-sm font-medium text-red-600">{errorForm}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Confirmar venta"}
                </button>
                <button
                  type="button"
                  onClick={() => setAbierta(null)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-brand-dark/70"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </TarjetaVenta>
        ))}
      </div>

      {resultado !== null && resultado.total > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-brand-dark/70 shadow-sm ring-1 ring-black/5">
          <span>
            {resultado.total} venta(s) · Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || cargando}
              className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || cargando}
              className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TarjetaVenta({
  venta,
  abierta,
  onAbrir,
  children,
}: {
  venta: VentaPorConfirmar;
  abierta: boolean;
  onAbrir: () => void;
  children: React.ReactNode;
}) {
  const insignia = venta.confirmada
    ? { texto: "Confirmada", clase: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
    : venta.vencida
      ? { texto: "Vencida", clase: "bg-red-50 text-red-700 ring-red-200" }
      : { texto: "Esperando a tu sistema", clase: "bg-amber-50 text-amber-800 ring-amber-200" };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-brand-dark/50" title={venta.compraId}>
            Compra {venta.compraId.slice(0, 8)}
          </p>
          <p className="text-xs text-brand-dark/50">Vendida el {formatearFechaHora(venta.creadoEn)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${insignia.clase}`}>
          {insignia.texto}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className={CLASE_ETIQUETA}>Facturar a</p>
          {venta.cliente ? (
            <div className="text-sm text-brand-dark">
              <p className="font-semibold">{venta.cliente.razonSocial}</p>
              <p>
                {ETIQUETA_IDENTIFICACION[venta.cliente.tipoIdentificacion] ?? venta.cliente.tipoIdentificacion}{" "}
                {venta.cliente.identificacion}
              </p>
              {venta.cliente.correo && <p className="text-brand-dark/70">{venta.cliente.correo}</p>}
            </div>
          ) : (
            <p className="text-sm text-brand-dark/50">Sin datos de facturación.</p>
          )}
        </div>
        <div>
          <p className={CLASE_ETIQUETA}>Total a facturar</p>
          <p className="font-display text-xl font-bold text-brand-dark">{formatearDolares(venta.totalAFacturar)}</p>
          <p className="text-xs text-brand-dark/50">Pasajes más tasa de terminal. No incluye el cargo de servicio de Klumbus.</p>
        </div>
      </div>

      <div className="mt-4">
        <p className={CLASE_ETIQUETA}>Pasajeros</p>
        <ul className="divide-y divide-black/5 rounded-xl ring-1 ring-black/5">
          {venta.pasajeros.map((p) => (
            <li key={`${p.asientoEtiqueta}-${p.documento}`} className="px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-semibold text-brand-dark">
                  Asiento {p.asientoEtiqueta} · {p.nombres} {p.apellidos}
                </span>
                <span className="text-xs text-brand-dark/60">
                  {ETIQUETA_TARIFA[p.tipoTarifa] ?? p.tipoTarifa} · {formatearDolares(p.precioPagado)} + tasa{" "}
                  {formatearDolares(p.tasaTerminal)}
                </span>
              </div>
              <p className="text-xs text-brand-dark/60">
                {p.documento} · {p.origenCiudad} → {p.destinoCiudad} · {formatearFechaHora(p.horaSalidaProgramada)}
                {p.viajeReferencia && <> · Viaje {p.viajeReferencia}</>}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {venta.confirmada ? (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p>
            Factura <span className="font-mono font-semibold">{venta.numeroFactura}</span>
          </p>
          <p>
            Código de tasa <span className="font-mono font-semibold">{venta.codigoTasa}</span>
          </p>
          {venta.completadoEn && (
            <p className="text-xs text-emerald-800/70">Confirmada el {formatearFechaHora(venta.completadoEn)}</p>
          )}
        </div>
      ) : abierta ? (
        children
      ) : (
        <button
          type="button"
          onClick={onAbrir}
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Cargar factura y tasa
        </button>
      )}
    </div>
  );
}
