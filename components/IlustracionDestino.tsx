/**
 * Ilustraciones de destino (portada nueva, oct-2026): siluetas en la paleta de la marca (negro y
 * amarillo) para los destinos que todavía no tienen foto real, tomadas de la maqueta de diseño.
 * Cuando llegue la foto de un destino, basta con dársela a la tarjeta y la ilustración deja de usarse.
 *
 * Son dibujos fijos (el generador usa una semilla, así que son iguales en servidor y navegador).
 */
export type ClaveIlustracion = "guayaquil" | "cuenca" | "loja" | "huaquillas" | "zaruma" | "quito";

function semilla(inicial: number) {
  let s = inicial;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

function cordillera(r: () => number, y: number, amp: number, paso: number, W = 400, H = 500) {
  let p = `M0 ${H} L0 ${y}`;
  for (let x = 0; x <= W + paso; x += paso) p += ` L${x} ${(y - amp * r()).toFixed(1)}`;
  return `${p} L${W} ${H} Z`;
}

const SOL: Record<ClaveIlustracion, [number, number]> = {
  guayaquil: [200, 300],
  cuenca: [300, 190],
  loja: [110, 180],
  huaquillas: [200, 292],
  zaruma: [90, 170],
  quito: [300, 120],
};

function escena(clave: ClaveIlustracion, r: () => number): string {
  switch (clave) {
    case "guayaquil":
      return `<path d="${cordillera(r, 330, 40, 50)}" fill="#2A2E39"/>
  <path d="M60 330 Q120 236 170 250 Q205 258 230 330Z" fill="#171A22"/><rect x="150" y="196" width="14" height="44" fill="#171A22"/><path d="M146 196h22l-11-14z" fill="#171A22"/><circle cx="157" cy="204" r="4" fill="#FDD514"/>
  ${[60, 90, 120, 175, 205].map((x, i) => `<rect x="${255 + i * 22}" y="${330 - x * 0.6}" width="16" height="${x * 0.6}" fill="#171A22"/>`).join("")}
  <rect x="0" y="330" width="400" height="170" fill="#11141a"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${172 + i * 3 - i * i}" y="${345 + i * 22}" width="${50 - i * 6}" height="3" rx="1.5" fill="#FDD514" opacity="${0.55 - i * 0.07}"/>`).join("")}
  <path d="M330 330 q4-40 0-70" stroke="#0B0D12" stroke-width="5" fill="none"/><path d="M330 262 q-24-6-34 8 M330 262 q22-8 34 6 M330 262 q-10-18-28-18 M330 262 q14-16 30-12" stroke="#0B0D12" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case "cuenca":
      return `<path d="${cordillera(r, 250, 50, 40)}" fill="#3A3F4C"/><path d="${cordillera(r, 300, 30, 30)}" fill="#262A35"/>
  <g fill="#0B0D12"><rect x="90" y="300" width="220" height="200"/><path d="M120 300a34 34 0 0 1 68 0z"/><path d="M212 300a34 34 0 0 1 68 0z"/><path d="M160 280a40 40 0 0 1 80 0z"/><rect x="196" y="250" width="8" height="34"/><rect x="70" y="250" width="30" height="250"/><path d="M70 250l15-30 15 30z"/><rect x="300" y="250" width="30" height="250"/><path d="M300 250l15-30 15 30z"/></g>
  <circle cx="200" cy="246" r="3" fill="#FDD514"/>
  <g fill="#FDD514" opacity=".8">${[0, 1, 2, 3].map((i) => `<rect x="${130 + i * 40}" y="360" width="10" height="18" rx="5"/>`).join("")}</g>`;
    case "loja":
      return `<path d="${cordillera(r, 230, 90, 45)}" fill="#3A3F4C"/><path d="${cordillera(r, 290, 60, 35)}" fill="#262A35"/><path d="${cordillera(r, 350, 30, 30)}" fill="#171A22"/>
  <g fill="#0B0D12"><rect x="140" y="300" width="120" height="200"/><rect x="130" y="270" width="36" height="230"/><rect x="234" y="270" width="36" height="230"/><path d="M130 270h36l-18-24z"/><path d="M234 270h36l-18-24z"/><path d="M176 500v-80a24 24 0 0 1 48 0v80z" fill="#171A22"/></g>
  <rect x="190" y="330" width="20" height="14" rx="3" fill="#FDD514" opacity=".85"/>`;
    case "huaquillas":
      return `<path d="${cordillera(r, 300, 12, 40)}" fill="#2A2E39"/><rect x="0" y="300" width="400" height="200" fill="#171A22"/>
  <path d="M188 300 L212 300 L330 500 L70 500 Z" fill="#0B0D12"/>
  ${[0, 1, 2, 3, 4]
    .map((i) => {
      const y = 310 + i * i * 9 + i * 14;
      const h = 4 + i * 4;
      const w = 2 + i * 1.6;
      return `<rect x="${200 - w / 2}" y="${y}" width="${w}" height="${h}" fill="#FDD514"/>`;
    })
    .join("")}
  <g fill="#0B0D12"><rect x="60" y="240" width="8" height="70"/><rect x="332" y="240" width="8" height="70"/><rect x="56" y="232" width="288" height="14" rx="3"/></g>
  <rect x="150" y="236" width="100" height="6" rx="3" fill="#FDD514" opacity=".9"/>`;
    case "zaruma":
      return `<path d="${cordillera(r, 220, 70, 40)}" fill="#3A3F4C"/><path d="M0 500 L0 330 Q120 250 240 300 Q330 340 400 290 L400 500Z" fill="#262A35"/>
  <g fill="#0B0D12">${[[60, 330], [95, 318], [130, 310], [165, 306], [260, 318], [300, 326], [335, 314]].map(([x, y]) => `<rect x="${x}" y="${y}" width="30" height="40"/><path d="M${x - 3} ${y}h36l-18-14z"/>`).join("")}
  <rect x="200" y="250" width="26" height="80"/><path d="M200 250h26l-13-30z"/></g>
  <path d="M0 500 L0 380 Q160 330 400 370 L400 500Z" fill="#171A22"/>
  <g fill="#FDD514" opacity=".85">${[[70, 340], [140, 320], [270, 330], [312, 338], [208, 270]].map(([x, y]) => `<rect x="${x}" y="${y}" width="8" height="9" rx="1"/>`).join("")}</g>`;
    case "quito":
      return `<path d="M60 330 L210 150 Q220 140 230 150 L380 330Z" fill="#3A3F4C"/><path d="M182 184 L210 150 Q220 140 230 150 L258 184 Q240 196 220 186 Q200 198 182 184Z" fill="#C7CAD3" opacity=".85"/>
  <path d="${cordillera(r, 330, 40, 40)}" fill="#262A35"/>
  <g fill="#0B0D12"><rect x="120" y="300" width="160" height="200"/><rect x="120" y="230" width="34" height="270"/><rect x="246" y="230" width="34" height="270"/><path d="M120 230h34l-17-40z"/><path d="M246 230h34l-17-40z"/><path d="M170 300l30-36 30 36z"/></g>
  <circle cx="200" cy="320" r="14" fill="#FDD514" opacity=".9"/>`;
  }
}

export function IlustracionDestino({ clave, indice }: { clave: ClaveIlustracion; indice: number }) {
  const [sx, sy] = SOL[clave];
  const id = `ild-${indice}`;
  const contenido = `<defs><linearGradient id="${id}-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0D12"/><stop offset=".55" stop-color="#262A35"/><stop offset=".85" stop-color="#5a4a14"/></linearGradient><radialGradient id="${id}-s" cx="${sx / 400}" cy="${sy / 500}" r=".55"><stop offset="0" stop-color="#FDD514" stop-opacity=".55"/><stop offset="1" stop-color="#FDD514" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="500" fill="url(#${id}-c)"/><rect width="400" height="500" fill="url(#${id}-s)"/><circle cx="${sx}" cy="${sy}" r="44" fill="#FDD514"/>${escena(clave, semilla(indice + 3))}`;
  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full transition-transform duration-[800ms] ease-out group-hover:scale-105"
      dangerouslySetInnerHTML={{ __html: contenido }}
    />
  );
}
