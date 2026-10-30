"use client";

import { useEffect, useState } from "react";
import { obtenerSaldoWallet, listarMovimientosWallet, type MovimientoWallet } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { EstadoCargando, EstadoVacio, ICONOS_CUENTA } from "@/components/EstadoCuenta";
import { usePaginacionLocal, ControlesPaginacion } from "@/components/Paginacion";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ETIQUETAS_TIPO: Record<string, { texto: string; positivo: boolean }> = {
  credito_cashback: { texto: "Cashback ganado", positivo: true },
  credito_referido: { texto: "Crédito por referido", positivo: true },
  debito_compra: { texto: "Usado en una compra", positivo: false },
};

/**
 * Hallazgo real del director (15-ago-2026, recorrido en vivo de
 * producción): el wallet ya funcionaba de punta a punta en el backend
 * (ganar cashback, gastarlo en una compra, ganar por referidos) desde
 * hacía días -- el pasajero simplemente nunca tuvo dónde verlo. Este
 * es el primer lugar real donde existe.
 */
export function TabWallet() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoWallet[] | null>(null);
  const pagMovimientos = usePaginacionLocal(movimientos ?? []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    Promise.all([obtenerSaldoWallet(token), listarMovimientosWallet(token)])
      .then(([s, m]) => {
        setSaldo(s);
        setMovimientos(m);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar tu wallet."));
  }, []);

  return (
    <div>
      {/* Rediseño real 19-ago-2026, hallazgo del director: el saldo se
          veía como una caja plana, sin sensación de tarjeta real.
          Nuevo patrón: tarjeta ancha tipo tarjeta de fidelidad/crédito
          real (Apple Wallet, Google Pay), con decoración sutil, no un
          bloque de texto vertical. */}
      <div className="relative overflow-hidden rounded-card bg-ink px-6 py-6 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-kbyellow/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-white/5" />
        {/* Sin la etiqueta "WALLET" (decisión del director, 30-oct-2026): "Saldo disponible" ya lo dice abajo. */}
        <div className="relative flex items-start justify-between">
          <span className="text-sm font-bold tracking-[0.2em] text-ondark">KLUMBUS</span>
        </div>
        <div className="relative mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-ondark">Saldo disponible</p>
          <p className="mt-1 text-4xl font-bold text-kbyellow sm:text-5xl">
            {saldo === null ? "—" : `$${saldo.toFixed(2)}`}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-ondark">
            Gana cashback cada vez que viajas, y úsalo para pagar tu próximo pasaje.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {error && (
          <div className="kb-alert kb-alert--error">
            {error}
          </div>
        )}

        {movimientos === null && !error && <EstadoCargando />}

        {movimientos !== null && movimientos.length === 0 && (
          <EstadoVacio
            icono={ICONOS_CUENTA.saldo}
            titulo="Todavía no tienes movimientos"
            texto="Aparecerán aquí cuando ganes cashback en un viaje, o cuando lo uses para pagar uno."
          />
        )}

        {movimientos !== null && movimientos.length > 0 && (
          <>
            <h2 className="text-base font-semibold text-ink">Historial</h2>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {pagMovimientos.visibles.map((m) => {
                const etiqueta = ETIQUETAS_TIPO[m.tipo] ?? { texto: m.tipo, positivo: m.monto >= 0 };
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-[14px] border border-line bg-white px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-ink">{etiqueta.texto}</p>
                      <p className="text-xs text-muted-2">{formatearFecha(m.creadoEn)}</p>
                    </div>
                    <p
                      className={`text-lg font-bold tabular-nums ${
                        etiqueta.positivo ? "text-ok" : "text-muted-2"
                      }`}
                    >
                      {etiqueta.positivo ? "+" : "-"}${Math.abs(m.monto).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
            <ControlesPaginacion
              pagina={pagMovimientos.pagina}
              totalPaginas={pagMovimientos.totalPaginas}
              total={pagMovimientos.total}
              etiqueta="movimiento"
              onCambio={pagMovimientos.setPagina}
              className="!px-0"
            />
          </>
        )}
      </div>
    </div>
  );
}
