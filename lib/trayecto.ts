/**
 * Duración, distancia y enlace al mapa de un viaje (24-sep-2026).
 *
 * La duración sale, en este orden, de: (1) la hora de llegada del viaje,
 * (2) la duración que la cooperativa cargó en la ruta, (3) la distancia
 * de la ruta a una velocidad media de bus interprovincial, y (4) una
 * estimación por las coordenadas de las dos terminales (distancia en
 * línea recta x 1,3 por lo sinuoso de las carreteras). Los casos 3 y 4
 * son aproximados y se marcan como tal en la pantalla.
 */
const VELOCIDAD_MEDIA_KM_H = 55;
const FACTOR_CARRETERA = 1.3;

export interface DatosTrayecto {
  horaSalidaProgramada: string;
  horaLlegadaEstimada: string | null;
  duracionEstimadaMinutos?: number | null;
  distanciaKm: number | null;
  origenLatitud: string | number | null;
  origenLongitud: string | number | null;
  destinoLatitud: string | number | null;
  destinoLongitud: string | number | null;
  origenNombre: string;
  destinoNombre: string;
  origenCiudad?: string;
  destinoCiudad?: string;
}

export interface EstimacionTrayecto {
  minutos: number;
  /** Distancia en km, si se conoce o se pudo estimar. */
  km: number | null;
  /** true si la duración o la distancia son una estimación y no un dato cargado. */
  aproximado: boolean;
  /** Hora de llegada estimada (ISO); la real si el viaje la trae, si no salida + duración. */
  llegadaIso: string;
  llegadaEsReal: boolean;
}

function aNumero(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function distanciaEnLineaRectaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const aRad = (g: number) => (g * Math.PI) / 180;
  const dLat = aRad(lat2 - lat1);
  const dLon = aRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(aRad(lat1)) * Math.cos(aRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimarTrayecto(v: DatosTrayecto): EstimacionTrayecto | null {
  const salida = new Date(v.horaSalidaProgramada).getTime();
  const distanciaCargada = aNumero(v.distanciaKm);

  const latO = aNumero(v.origenLatitud);
  const lonO = aNumero(v.origenLongitud);
  const latD = aNumero(v.destinoLatitud);
  const lonD = aNumero(v.destinoLongitud);
  const kmPorCoordenadas =
    latO !== null && lonO !== null && latD !== null && lonD !== null
      ? Math.round(distanciaEnLineaRectaKm(latO, lonO, latD, lonD) * FACTOR_CARRETERA)
      : null;

  const km = distanciaCargada ?? kmPorCoordenadas;

  if (v.horaLlegadaEstimada) {
    const minutos = Math.round((new Date(v.horaLlegadaEstimada).getTime() - salida) / 60000);
    if (minutos > 0) {
      return { minutos, km, aproximado: false, llegadaIso: v.horaLlegadaEstimada, llegadaEsReal: true };
    }
  }

  let minutos: number | null = null;
  if (v.duracionEstimadaMinutos && v.duracionEstimadaMinutos > 0) {
    minutos = v.duracionEstimadaMinutos;
  } else if (km !== null && km > 0) {
    minutos = Math.round((km / VELOCIDAD_MEDIA_KM_H) * 60);
  }
  if (minutos === null || minutos <= 0) return null;

  return {
    minutos,
    km,
    aproximado: true,
    llegadaIso: new Date(salida + minutos * 60000).toISOString(),
    llegadaEsReal: false,
  };
}

export function formatearDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins}min`;
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

/**
 * Enlace de "Ver trayecto en el mapa". Con coordenadas de ambas terminales
 * se usan tal cual; si falta alguna, se busca por nombre y ciudad --
 * antes se armaba con "null,null" y Google Maps no encontraba nada.
 */
export function urlMapaTrayecto(v: DatosTrayecto): string {
  function punto(lat: string | number | null, lon: string | number | null, nombre: string, ciudad?: string): string {
    const la = aNumero(lat);
    const lo = aNumero(lon);
    if (la !== null && lo !== null) return `${la},${lo}`;
    return [nombre, ciudad, "Ecuador"].filter(Boolean).join(", ");
  }
  const params = new URLSearchParams({
    api: "1",
    origin: punto(v.origenLatitud, v.origenLongitud, v.origenNombre, v.origenCiudad),
    destination: punto(v.destinoLatitud, v.destinoLongitud, v.destinoNombre, v.destinoCiudad),
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
