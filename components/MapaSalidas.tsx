"use client";

import { useState } from "react";
import { MAPA_ALTO, MAPA_ANCHO, SILUETAS } from "@/lib/mapa-ecuador";
import { puntosDelMapa, type DestinoMapa } from "@/lib/mapa-salidas";

export type { DestinoMapa };

interface Props {
  origen: string;
  destinos: DestinoMapa[];
}


/**
 * Mapa de salidas de una terminal -- versión con mapa real (oct-2026, prueba de rediseño).
 *
 * Silueta real de Ecuador continental con Colombia y Perú alrededor (Natural Earth, ver
 * lib/mapa-ecuador.ts). La terminal late en amarillo; de ella salen rutas curvas y un pequeño bus
 * recorre cada una. Al pasar el mouse, enfocar o tocar una ciudad, su ruta se ilumina y debajo
 * aparece la ficha del viaje (duración, salidas y precio "desde", si se conocen) con el botón para
 * buscar pasajes. Las posiciones salen de coordenadas reales; una ciudad sin coordenadas no se dibuja.
 *
 * `hayMapaSalidas` (lib/mapa-salidas.ts) dice de antemano si habrá algo que dibujar.
 */
const ETIQUETA_PAIS = { font: "600 10px Poppins, sans-serif", letterSpacing: "0.22em", fill: "#6B7080" } as const;

export function MapaSalidas({ origen, destinos }: Props) {
  const datos = puntosDelMapa(origen, destinos);
  const [activa, setActiva] = useState<string | null>(datos?.puntos[0]?.clave ?? null);
  if (!datos) return null;
  const { ox, oy, puntos } = datos;
  const elegido = puntos.find((p) => p.clave === activa) ?? puntos[0];

  return (
    <div className="flex flex-col">
      <svg viewBox={`0 0 ${MAPA_ANCHO} ${MAPA_ALTO}`} role="img" aria-label={`Mapa de salidas desde ${origen}`} className="mapa-salidas h-auto w-full">
        <defs>
          <radialGradient id="mapa-brillo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDD514" stopOpacity=".16" />
            <stop offset="100%" stopColor="#FDD514" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Países */}
        <path d={SILUETAS.colombia} fill="#12151C" stroke="#262A35" strokeWidth="1" />
        <path d={SILUETAS.peru} fill="#12151C" stroke="#262A35" strokeWidth="1" />
        <path d={SILUETAS.ecuador} fill="#1D212B" stroke="#4A4F5C" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx={ox} cy={oy} r="90" fill="url(#mapa-brillo)" />

        <text x="300" y="34" style={ETIQUETA_PAIS}>COLOMBIA</text>
        <text x="235" y="190" style={{ ...ETIQUETA_PAIS, fill: "#9AA0AE" }}>ECUADOR</text>
        <text x="250" y="420" style={ETIQUETA_PAIS}>PERÚ</text>
        <text x="22" y="150" transform="rotate(-90 22 150)" textAnchor="middle" style={{ ...ETIQUETA_PAIS, letterSpacing: "0.12em" }}>
          OCÉANO PACÍFICO
        </text>

        {/* Rutas */}
        {puntos.map((p, i) => {
          const on = p.clave === elegido.clave;
          return (
            <g key={`r-${p.clave}`}>
              <path
                id={`ruta-${p.clave}`}
                d={p.curva}
                fill="none"
                stroke="#FDD514"
                strokeWidth={on ? 2.6 : 1.4}
                strokeLinecap="round"
                opacity={on ? 1 : 0.35}
                className={on ? "ruta" : undefined}
                style={{ transition: "opacity .25s, stroke-width .25s" }}
              />
              <circle r={on ? 4.5 : 3} fill="#FDD514" className="mapa-bus" opacity={on ? 1 : 0.7}>
                <animateMotion dur={`${3 + (i % 3) * 0.6}s`} begin={`${(i * 0.45).toFixed(2)}s`} repeatCount="indefinite" rotate="auto">
                  <mpath href={`#ruta-${p.clave}`} />
                </animateMotion>
              </circle>
            </g>
          );
        })}

        {/* Ciudades */}
        {puntos.map((p) => {
          const on = p.clave === elegido.clave;
          return (
            <g
              key={`p-${p.clave}`}
              role="button"
              tabIndex={0}
              aria-label={`Ruta ${origen} a ${p.ciudad}`}
              aria-pressed={on}
              onMouseEnter={() => setActiva(p.clave)}
              onFocus={() => setActiva(p.clave)}
              onClick={() => setActiva(p.clave)}
              className="cursor-pointer outline-none"
            >
              <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
              <circle cx={p.x} cy={p.y} r={on ? 7 : 5.5} fill={on ? "#FDD514" : "#0B0D12"} stroke={on ? "#0B0D12" : "#fff"} strokeWidth="2.5" />
              <text
                x={p.etiqueta.x}
                y={p.etiqueta.y}
                textAnchor={p.etiqueta.ancla}
                paintOrder="stroke"
                stroke="#0B0D12"
                strokeWidth="4"
                strokeLinejoin="round"
                style={{ font: `${on ? 700 : 600} 13px Poppins, sans-serif`, fill: on ? "#FDD514" : "#fff" }}
              >
                {p.ciudad}
              </text>
            </g>
          );
        })}

        {/* Terminal de origen */}
        <circle className="pulso" cx={ox} cy={oy} r="12" fill="#FDD514" opacity=".6" />
        <circle cx={ox} cy={oy} r="9" fill="#FDD514" stroke="#0B0D12" strokeWidth="3" />
        <rect x={ox - 40} y={oy - 42} width="80" height="24" rx="12" fill="#FDD514" />
        <text x={ox} y={oy - 26} textAnchor="middle" style={{ font: "700 12px Poppins, sans-serif", fill: "#0B0D12" }}>
          {origen}
        </text>
      </svg>

      {/* Ficha de la ruta elegida */}
      <div className="mx-3 mb-3 flex items-center justify-between gap-3 rounded-[18px] bg-ink-2 p-3.5 shadow-[inset_0_0_0_1px_#262A35] md:mx-4 md:mb-4 md:p-4">
        <div className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-3">Toca una ciudad</span>
          <b className="block truncate text-base font-semibold text-white">
            {origen} <span className="text-kbyellow">→</span> {elegido.ciudad}
          </b>
          {elegido.detalle && <span className="block truncate text-xs text-ondark">{elegido.detalle}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {elegido.precio !== undefined && (
            <div className="text-right leading-[1.1]">
              <small className="block text-[11px] text-ondark">desde</small>
              <b className="text-lg font-bold tabular-nums text-white">${elegido.precio.toFixed(2)}</b>
            </div>
          )}
          <a href="#buscar" className="grid h-11 w-11 place-items-center rounded-tab bg-kbyellow text-ink" aria-label={`Buscar pasajes de ${origen} a ${elegido.ciudad}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
