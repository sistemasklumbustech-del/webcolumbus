import Image from "next/image";
import { listarRutasDisponibles, type RutaDisponible } from "@/lib/api";
import { claveCiudad, REFERENCIA, rutasReales } from "@/lib/portada-datos";
import { IlustracionDestino, type ClaveIlustracion } from "./IlustracionDestino";
import { PublicidadNativa } from "./PublicidadNativa";

/**
 * Destinos populares -- versión compacta (oct-2026, prueba de rediseño): una fila de 4 tarjetas iguales
 * (foto arriba, ciudad, datos y precio abajo), como en FlixBus o Busbud. En celular se deslizan de lado.
 *
 * Solo salen destinos con precio: el real de las rutas del API o, mientras no haya rutas reales, el de
 * referencia (ver lib/portada-datos.ts). Se toman en el orden de la lista hasta llenar 4. Un destino sin
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
  { ciudad: "Guayaquil", foto: "/img/destinos/guayaquil.jpg", zona: "Costa · Guayas" },
  { ciudad: "Quito", foto: "/img/destinos/quito.jpg", zona: "Sierra · Pichincha" },
  { ciudad: "Cuenca", ilustracion: "cuenca", zona: "Sierra · Azuay" },
  { ciudad: "Loja", ilustracion: "loja", zona: "Sierra · Loja" },
  { ciudad: "Baños", foto: "/img/destinos/banos.jpg", zona: "Sierra · Tungurahua" },
  { ciudad: "Salinas", foto: "/img/destinos/salinas.jpg", zona: "Costa · Santa Elena" },
  { ciudad: "Montañita", foto: "/img/destinos/montanita.jpg", zona: "Costa · Santa Elena" },
  { ciudad: "Ibarra", foto: "/img/destinos/ibarra.jpg", zona: "Sierra · Imbabura" },
  { ciudad: "Huaquillas", ilustracion: "huaquillas", zona: "Costa · frontera" },
  { ciudad: "Zaruma", ilustracion: "zaruma", zona: "Sierra · El Oro" },
];

const CANTIDAD = 4;

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
    .filter((d) => d.precio !== undefined)
    .slice(0, CANTIDAD);

  if (destinos.length === 0) return null;

  return (
    <section id="destinos" className="mx-auto max-w-[1280px] scroll-mt-20 px-5 pt-[30px] md:px-16 md:pt-14">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 md:mb-5">
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
        <a href="#rutas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline">
          Ver todas las rutas
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>

      <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:grid md:snap-none md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
        {destinos.map((d, i) => (
          <a
            key={d.ciudad}
            href="#buscar"
            className="kb-card group flex w-[68%] shrink-0 snap-start flex-col overflow-hidden transition-shadow hover:shadow-float md:w-auto"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-ink-2">
              {d.foto ? (
                <Image
                  src={d.foto}
                  alt={`Vista de ${d.ciudad}`}
                  fill
                  sizes="(min-width: 768px) 300px, 68vw"
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

        <div className="w-[68%] shrink-0 snap-start empty:hidden md:w-auto">
          <PublicidadNativa />
        </div>
      </div>
    </section>
  );
}
