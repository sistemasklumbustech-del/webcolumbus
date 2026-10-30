import { ImagenDiferida } from "./ImagenDiferida";
import { listarRutasDisponibles, type RutaDisponible } from "@/lib/api";
import { claveCiudad, REFERENCIA, rutasReales } from "@/lib/portada-datos";
import { IlustracionDestino, type ClaveIlustracion } from "./IlustracionDestino";
import { PublicidadNativa } from "./PublicidadNativa";
import { CarruselDestinos } from "./CarruselDestinos";

/** Celular: 68% del ancho. PC: caben 4 completas y se asoma parte de la quinta (4,3 por pantalla). */
const ANCHO_TARJETA = "w-[68%] md:w-[calc((100%-3rem)/4.3)]";

/**
 * Destinos populares -- carrusel (aprobado 28-oct-2026): tarjetas iguales (foto arriba, ciudad, datos y
 * precio abajo). En PC se ven 4 y se asoma la siguiente, con flechas; en celular se deslizan de lado.
 * Ver CarruselDestinos.
 *
 * Solo salen destinos con precio: el real de las rutas del API o, mientras no haya rutas reales, el de
 * referencia (ver lib/portada-datos.ts), en el orden de la lista. Un destino sin
 * foto entra con su ilustración de la misma paleta (ver IlustracionDestino).
 *
 * La publicidad nativa conserva su lugar: una tarjeta más, solo si hay una campaña activa.
 */
interface Destino {
  ciudad: string;
  foto?: string;
  ilustracion?: ClaveIlustracion;
  zona: string;
}

const CANDIDATOS: Destino[] = [
  { ciudad: "Guayaquil", foto: "/img/destinos/guayaquil-v2.jpg", zona: "Costa · Guayas" },
  { ciudad: "Quito", foto: "/img/destinos/quito-v2.jpg", zona: "Sierra · Pichincha" },
  { ciudad: "Cuenca", foto: "/img/destinos/cuenca-v2.jpg", zona: "Sierra · Azuay" },
  { ciudad: "Loja", foto: "/img/destinos/loja-v2.jpg", zona: "Sierra · Loja" },
  { ciudad: "Baños", foto: "/img/destinos/banos-v2.jpg", zona: "Sierra · Tungurahua" },
  { ciudad: "Huaquillas", foto: "/img/destinos/huaquillas-v2.jpg", zona: "Costa · frontera" },
  { ciudad: "Zaruma", foto: "/img/destinos/zaruma-v2.jpg", zona: "Sierra · El Oro" },
  { ciudad: "Puyo", foto: "/img/destinos/puyo-v2.jpg", zona: "Oriente · Pastaza" },
  { ciudad: "Máncora", foto: "/img/destinos/mancora-v2.jpg", zona: "Perú · Piura" },
];

/** Precio más bajo real por ciudad de destino. */
function preciosReales(rutas: RutaDisponible[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const r of rutas) {
    const k = claveCiudad(r.destinoCiudad);
    const p = Number(r.precioReferencia);
    if (!Number.isFinite(p)) continue;
    if (!mapa.has(k) || p < (mapa.get(k) as number)) mapa.set(k, p);
  }
  return mapa;
}

export async function DestinosPopulares() {
  const rutas = rutasReales(await listarRutasDisponibles());
  const modoReferencia = rutas.length === 0;
  const reales = preciosReales(rutas);

  const destinos = CANDIDATOS.map((d) => {
    const ref = REFERENCIA.destinos.find((r) => claveCiudad(r.ciudad) === claveCiudad(d.ciudad));
    const precio = modoReferencia ? ref?.precio : reales.get(claveCiudad(d.ciudad));
    const detalle = modoReferencia && ref ? `${ref.duracion} · ${ref.salidas.charAt(0).toLowerCase()}${ref.salidas.slice(1)}` : null;
    return { ...d, precio, detalle };
  })
    .filter((d) => d.precio !== undefined);

  if (destinos.length === 0) return null;

  return (
    <section id="destinos" className="mx-auto max-w-[1280px] scroll-mt-20 px-5 pt-[30px] md:px-16 md:pt-14">
      <CarruselDestinos
        titulo={
          <div>
            <span className="kb-eyebrow-barra">Destinos populares</span>
            <h2 className="text-[24px] font-bold leading-[1.1] tracking-[-0.025em] md:text-[32px]">
              ¿A <em className="kb-marca">dónde</em> quieres ir?
            </h2>
            <p className="mt-1.5 max-w-[52ch] text-[13px] text-muted-2 md:text-sm">
              {modoReferencia
                ? `Precios de referencia por persona, solo ida, desde ${REFERENCIA.terminal.nombre}.`
                : "Precio más bajo por persona, solo ida."}
            </p>
          </div>
        }
      >
        {destinos.map((d, i) => (
          <a
            key={d.ciudad}
            href="#buscar"
            data-tarjeta
            className={`kb-card group flex shrink-0 snap-start flex-col overflow-hidden transition-shadow hover:shadow-float ${ANCHO_TARJETA}`}
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-ink-2">
              {d.foto ? (
                <ImagenDiferida
                  src={d.foto}
                  alt={`Foto de ${d.ciudad}, destino desde ${modoReferencia ? REFERENCIA.terminal.ciudad : "la terminal"}`}
                  loading="lazy"
                  fill
                  sizes="(min-width: 768px) 280px, 68vw"
                  className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105"
                />
              ) : d.ilustracion ? (
                <div className="absolute inset-0">
                  <IlustracionDestino clave={d.ilustracion} indice={i} />
                </div>
              ) : null}
            </div>
            <div className="flex flex-1 items-end justify-between gap-3 p-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold leading-tight tracking-[-0.01em]">{d.ciudad}</h3>
                <span className="mt-0.5 block truncate text-[13px] text-muted-2">{d.detalle ?? d.zona}</span>
              </div>
              <div className="shrink-0 text-right leading-[1.1]">
                <small className="block text-[11px] font-medium text-muted-2">desde</small>
                <b className="text-lg font-bold tabular-nums">${(d.precio as number).toFixed(2)}</b>
              </div>
            </div>
          </a>
        ))}

        <div className={`shrink-0 snap-start empty:hidden ${ANCHO_TARJETA}`}>
          <PublicidadNativa />
        </div>
      </CarruselDestinos>
    </section>
  );
}
