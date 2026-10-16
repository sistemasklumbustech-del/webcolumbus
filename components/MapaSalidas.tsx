import { claveCiudad, COORDENADAS_CIUDADES } from "@/lib/portada-datos";

/**
 * Mapa de salidas de una terminal (portada nueva, oct-2026): el punto amarillo es la terminal y
 * las líneas punteadas llegan a cada destino. Las posiciones salen de coordenadas reales (latitud
 * y longitud) de las ciudades, así que el mapa sirve para cualquier terminal y cualquier lista de
 * destinos; una ciudad sin coordenadas conocidas simplemente no se dibuja.
 *
 * `hayMapaSalidas` dice de antemano si habrá algo que dibujar, para que quien lo usa pueda decidir
 * el diseño de la sección sin renderizar el mapa.
 */
interface Props {
  origen: string;
  destinos: string[];
}

const TAM = 400;

function puntosDelMapa(origen: string, destinos: string[]) {
  const posOrigen = COORDENADAS_CIUDADES[claveCiudad(origen)];
  if (!posOrigen) return null;
  const vistos = new Set<string>();
  const puntos = destinos
    .map((d) => ({ nombre: d, coord: COORDENADAS_CIUDADES[claveCiudad(d)] }))
    .filter((p): p is { nombre: string; coord: [number, number] } => {
      const k = claveCiudad(p.nombre);
      if (!p.coord || k === claveCiudad(origen) || vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  if (puntos.length === 0) return null;
  return { posOrigen, puntos };
}

export function hayMapaSalidas(origen: string, destinos: string[]): boolean {
  return puntosDelMapa(origen, destinos) !== null;
}

export function MapaSalidas({ origen, destinos }: Props) {
  const datos = puntosDelMapa(origen, destinos);
  if (!datos) return null;
  const { posOrigen, puntos } = datos;

  // Proyección simple (equirectangular) ajustada al conjunto de puntos, con margen para las etiquetas.
  const todos = [posOrigen, ...puntos.map((p) => p.coord)];
  const lats = todos.map((c) => c[0]);
  const lons = todos.map((c) => c[1]);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lonMin = Math.min(...lons);
  const lonMax = Math.max(...lons);
  const factorLon = Math.cos((((latMin + latMax) / 2) * Math.PI) / 180);
  const ancho = Math.max((lonMax - lonMin) * factorLon, 0.2);
  const alto = Math.max(latMax - latMin, 0.2);
  const margenX = 78;
  const margenY = 52;
  const escala = Math.min((TAM - 2 * margenX) / ancho, (TAM - 2 * margenY) / alto);
  const offX = (TAM - ancho * escala) / 2;
  const offY = (TAM - alto * escala) / 2;
  const proyectar = ([lat, lon]: [number, number]): [number, number] => [
    offX + (lon - lonMin) * factorLon * escala,
    offY + (latMax - lat) * escala,
  ];

  const [ox, oy] = proyectar(posOrigen);

  return (
    <svg viewBox={`0 0 ${TAM} ${TAM}`} aria-hidden="true" className="h-full w-full">
      <defs>
        <pattern id="mapa-puntos" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#262A35" />
        </pattern>
      </defs>
      <rect width={TAM} height={TAM} fill="url(#mapa-puntos)" />
      <text
        x="26"
        y="200"
        transform="rotate(-90 26 200)"
        textAnchor="middle"
        style={{ font: "500 11px Poppins, sans-serif", fill: "#9AA0AE" }}
      >
        Océano Pacífico
      </text>

      <g className="mapa-salidas">
        {puntos.map(({ nombre, coord }) => {
          const [x, y] = proyectar(coord);
          const cx = (ox + x) / 2 + (y < oy ? 26 : -22);
          const cy = (oy + y) / 2;
          return (
            <path
              key={`r-${nombre}`}
              className="ruta"
              d={`M${ox.toFixed(1)} ${oy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`}
              fill="none"
              stroke="#FDD514"
              strokeWidth="2"
              strokeLinecap="round"
              opacity=".85"
            />
          );
        })}
        {puntos.map(({ nombre, coord }) => {
          const [x, y] = proyectar(coord);
          const derecha = x >= ox;
          return (
            <g key={`p-${nombre}`}>
              <circle cx={x} cy={y} r="6" fill="#0B0D12" stroke="#fff" strokeWidth="2.5" />
              <text
                x={derecha ? x + 12 : x - 12}
                y={y + 4}
                textAnchor={derecha ? "start" : "end"}
                style={{ font: "600 13px Poppins, sans-serif", fill: "#fff" }}
              >
                {nombre}
              </text>
            </g>
          );
        })}
        <circle className="pulso" cx={ox} cy={oy} r="12" fill="#FDD514" opacity=".6" />
        <circle cx={ox} cy={oy} r="11" fill="#FDD514" stroke="#0B0D12" strokeWidth="3" />
      </g>
      <rect x={ox - 44} y={oy - 46} width="88" height="26" rx="13" fill="#FDD514" />
      <text x={ox} y={oy - 29} textAnchor="middle" style={{ font: "700 13px Poppins, sans-serif", fill: "#0B0D12" }}>
        {origen}
      </text>
    </svg>
  );
}
