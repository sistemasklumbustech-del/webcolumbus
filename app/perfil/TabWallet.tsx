"use client";

import { useEffect, useState } from "react";
import { obtenerSaldoWallet, listarMovimientosWallet, type MiPerfil, type MovimientoWallet } from "@/lib/api";
import { LogoKlumbus } from "@/components/LogoKlumbus";
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
export function TabWallet({ perfil }: { perfil: MiPerfil }) {
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
    // PC: la tarjeta a la izquierda y el historial a la derecha; celular: uno debajo del otro.
    <div className="lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* Tarjeta con forma y proporción de tarjeta real (85,6 × 54 mm), pedido de Adrián (30-oct-2026):
          logo, saldo grande, titular y código, sobre negro con un brillo sutil. */}
      <div className="w-full max-w-[420px]">
        <div
          className="relative aspect-[1.586] w-full overflow-hidden rounded-[22px] p-5 text-white shadow-[0_18px_40px_-18px_rgba(11,13,18,.55)] sm:p-6"
          style={{
            background:
              "radial-gradient(120% 90% at 100% 0%, rgba(253,213,20,.22) 0%, rgba(253,213,20,0) 55%), linear-gradient(135deg, #1B1F29 0%, #0B0D12 60%, #05070B 100%)",
          }}
        >
          {/* Líneas finas de fondo y borde de luz: dan el acabado de tarjeta física. */}
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-[.07]" viewBox="0 0 400 252" preserveAspectRatio="none">
            {Array.from({ length: 9 }, (_, n) => (
              <path key={n} d={`M${-60 + n * 40} 252 C ${60 + n * 40} 150, ${120 + n * 40} 120, ${300 + n * 40} 0`} stroke="#fff" strokeWidth="1" fill="none" />
            ))}
          </svg>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/10" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <LogoKlumbus className="h-[22px] sm:h-6" />
              {/* Chip decorativo */}
              <span aria-hidden="true" className="grid h-8 w-11 grid-cols-3 gap-px overflow-hidden rounded-md bg-gradient-to-br from-[#F6E27A] via-[#E5C44A] to-[#B8962A] p-[3px] opacity-90">
                {Array.from({ length: 6 }, (_, n) => (
                  <span key={n} className="rounded-[2px] bg-black/15" />
                ))}
              </span>
            </div>

            <div className="mt-auto">
              <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-ondark">Saldo disponible</p>
              <p className="mt-1 text-[38px] font-bold leading-none tabular-nums text-kbyellow sm:text-[44px]">
                {saldo === null ? "—" : `$${saldo.toFixed(2)}`}
              </p>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3 sm:mt-5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[.14em] text-white/55">Titular</p>
                <p className="truncate text-[13px] font-semibold uppercase tracking-[.08em] sm:text-sm">{perfil.nombreCompleto}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-[.14em] text-white/55">Código</p>
                <p className="text-[13px] font-semibold tracking-[.12em] tabular-nums sm:text-sm">{perfil.codigoPasajero}</p>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-2">
          Gana cashback cada vez que viajas, y úsalo para pagar tu próximo pasaje.
        </p>
      </div>

      <div className="mt-6 lg:mt-0">
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
            <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-1">
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
