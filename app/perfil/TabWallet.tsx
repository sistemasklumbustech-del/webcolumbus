"use client";

import { useEffect, useState } from "react";
import { obtenerSaldoWallet, listarMovimientosWallet, type MiPerfil, type MovimientoWallet } from "@/lib/api";
import { LogoKlumbus } from "@/components/LogoKlumbus";
import { MAPA_ALTO, MAPA_ANCHO, SILUETAS, proyectarMapa } from "@/lib/mapa-ecuador";
import { COORDENADAS_CIUDADES } from "@/lib/portada-datos";

/** Ciudades y tramos que se dibujan en la tarjeta (solo decoración: no es la red real de rutas). */
const CIUDADES_TARJETA = ["quito", "guayaquil", "cuenca", "machala", "loja", "manta", "esmeraldas", "ambato", "ibarra"];
const RUTAS_TARJETA: [string, string][] = [
  ["ibarra", "quito"],
  ["esmeraldas", "santo domingo"],
  ["quito", "santo domingo"],
  ["santo domingo", "guayaquil"],
  ["quito", "ambato"],
  ["ambato", "riobamba"],
  ["riobamba", "cuenca"],
  ["cuenca", "loja"],
  ["manta", "portoviejo"],
  ["portoviejo", "guayaquil"],
  ["guayaquil", "cuenca"],
  ["guayaquil", "machala"],
  ["machala", "loja"],
];
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
      {/* Tarjeta tipo metal negro con el mapa de Ecuador (modelo elegido por Adrián, hecho con ChatGPT, 30-oct-2026).
          Proporción de tarjeta real (85,6 × 54 mm). Sin chip ni número: es el saldo de la app, no una tarjeta de pago. */}
      <div className="w-full max-w-[420px]">
        <div
          className="relative aspect-[1.586] w-full overflow-hidden rounded-[22px] p-5 text-white shadow-[0_22px_44px_-20px_rgba(11,13,18,.7)] sm:p-6"
          style={{
            background:
              "repeating-linear-gradient(180deg, rgba(255,255,255,.035) 0px, rgba(255,255,255,.035) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px), linear-gradient(160deg, #23262E 0%, #111318 45%, #07080B 100%)",
          }}
        >
          {/* Mapa de Ecuador con una red de rutas y ciudades que brillan (modelo 3, elegido por Adrián:
              "le da territorio e identidad"), un reflejo suave del metal y una curva de luz amarilla. */}
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 252" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="kb-reflejo" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity=".10" />
                <stop offset=".35" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="kb-curva" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#FDD514" stopOpacity="0" />
                <stop offset=".5" stopColor="#FDD514" stopOpacity=".9" />
                <stop offset="1" stopColor="#FDD514" stopOpacity=".2" />
              </linearGradient>
              <radialGradient id="kb-halo">
                <stop offset="0" stopColor="#FDD514" stopOpacity=".55" />
                <stop offset="1" stopColor="#FDD514" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="400" height="252" fill="url(#kb-reflejo)" />
            <svg x="192" y="8" width="214" height="236" viewBox={`0 0 ${MAPA_ANCHO} ${MAPA_ALTO}`}>
              <path d={SILUETAS.ecuador} fill="#FDD514" fillOpacity=".05" stroke="#FDD514" strokeOpacity=".45" strokeWidth="2" strokeLinejoin="round" />
              {RUTAS_TARJETA.map(([a, b]) => {
                const [x1, y1] = proyectarMapa(COORDENADAS_CIUDADES[a]);
                const [x2, y2] = proyectarMapa(COORDENADAS_CIUDADES[b]);
                return <line key={a + b} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FDD514" strokeOpacity=".35" strokeWidth="1.6" />;
              })}
              {CIUDADES_TARJETA.map((c) => {
                const [x, y] = proyectarMapa(COORDENADAS_CIUDADES[c]);
                return (
                  <g key={c}>
                    <circle cx={x} cy={y} r="14" fill="url(#kb-halo)" />
                    <circle cx={x} cy={y} r="4" fill="#FDD514" />
                  </g>
                );
              })}
            </svg>
            <path d="M190 262 C 290 230, 350 190, 410 110" stroke="url(#kb-curva)" strokeWidth="1.6" fill="none" />
            <path d="M232 262 C 320 236, 372 200, 410 160 L 410 262 Z" fill="#FDD514" fillOpacity=".07" />
          </svg>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/10" />

          <div className="relative flex h-full flex-col">
            <LogoKlumbus className="h-[22px] self-start sm:h-[26px]" />
            <span aria-hidden="true" className="mt-3 block h-px w-24 bg-gradient-to-r from-kbyellow to-transparent" />

            <div className="mt-auto">
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-ondark">Saldo disponible</p>
              <p className="mt-1 text-[40px] font-bold leading-none tabular-nums text-kbyellow [text-shadow:0_2px_14px_rgba(253,213,20,.25)] sm:text-[46px]">
                {saldo === null ? "—" : `$${saldo.toFixed(2)}`}
              </p>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3 sm:mt-5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[.16em] text-white/55">Titular</p>
                <p className="truncate text-[13px] font-semibold uppercase tracking-[.08em] sm:text-sm">{perfil.nombreCompleto}</p>
              </div>
              <div className="shrink-0 text-right [text-shadow:0_1px_6px_rgba(0,0,0,.6)]">
                <p className="text-[10px] uppercase tracking-[.16em] text-white/70">Código</p>
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
