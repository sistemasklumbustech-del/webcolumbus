import Image from "next/image";
import { listarRutasDisponibles, type RutaDisponible } from "@/lib/api";
import { claveCiudad, REFERENCIA, rutasReales } from "@/lib/portada-datos";
import { IlustracionDestino, type ClaveIlustracion } from "./IlustracionDestino";
import { PublicidadNativa } from "./PublicidadNativa";

/**
 * Destinos populares -- portada nueva (oct-2026): en celular, tarjetas que se deslizan de lado;
 * en PC, un mosaico con una tarjeta grande, dos anchas y una tarjeta amarilla de
 * "¿No ves tu destino?".
 *
 * Solo fotos reales (las de public/img/destinos). Un destino sin foto todavía puede entrar con una
 * ilustración de la misma paleta (`ilustracion`, ver IlustracionDestino): se dibuja con el mismo
 * degradado y el mismo tratamiento de texto. Para sumar un destino, agrega su foto y su entrada.
 *
 * El "desde $X" sale de las rutas reales cuando el destino coincide. Sin rutas reales en el API se
 * muestran los precios de referencia (ver lib/portada-datos.ts) con su aviso; apenas el API tenga
 * rutas reales, estas reemplazan a las de referencia.
 *
 * La publicidad nativa conserva su lugar: una tarjeta más, solo si hay una campaña activa.
 */
interface Tile {
  ciudad: string;
  ilustracion?: ClaveIlustracion;
  foto?: string;
  zona: string;
  etiqueta?: string;
  forma: "grande" | "ancha" | "normal";
}

const TILES: Tile[] = [
  { ciudad: "Quito", foto: "/img/destinos/quito.jpg", zona: "Sierra · Pichincha", forma: "grande" },
  { ciudad: "Baños", foto: "/img/destinos/banos.jpg", zona: "Sierra · Tungurahua", forma: "normal" },
  { ciudad: "Salinas", foto: "/img/destinos/salinas.jpg", zona: "Costa · Santa Elena", forma: "normal" },
  { ciudad: "Montañita", foto: "/img/destinos/montanita.jpg", zona: "Costa · Santa Elena", forma: "normal" },
  { ciudad: "Ibarra", foto: "/img/destinos/ibarra.jpg", zona: "Sierra · Imbabura", forma: "normal" },
  { ciudad: "Guayaquil", foto: "/img/destinos/guayaquil.jpg", zona: "Costa · Guayas", forma: "ancha" },
];

const CLASE_FORMA: Record<Tile["forma"], string> = {
  grande: "md:col-span-2 md:row-span-2",
  ancha: "md:col-span-2",
  normal: "",
};

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

  return (
    <section id="destinos" className="mx-auto max-w-[1280px] scroll-mt-20 px-5 pt-[30px] md:px-16 md:pt-14">
      <div className="mb-3.5 md:mb-6">
        <span className="kb-eyebrow-barra">Destinos populares</span>
        <h2 className="text-[21px] font-semibold md:text-2xl">
          ¿A <em className="kb-marca">dónde</em> quieres ir?
        </h2>
        <p className="mt-1.5 max-w-[52ch] text-[13px] text-muted-2 md:text-sm">
          {modoReferencia
            ? `Precios de referencia por persona, solo ida, desde ${REFERENCIA.terminal.nombre}.`
            : "Precio más bajo por persona, solo ida."}
        </p>
      </div>

      <div className="-mx-5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:grid md:snap-none md:grid-cols-4 md:auto-rows-[170px] md:gap-[18px] md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
        {TILES.map((t, i) => {
          const ref = REFERENCIA.destinos.find((d) => claveCiudad(d.ciudad) === claveCiudad(t.ciudad));
          const precio = modoReferencia ? ref?.precio : reales.get(claveCiudad(t.ciudad));
          const meta = modoReferencia && ref ? `${ref.duracion} · ${ref.salidas.charAt(0).toLowerCase()}${ref.salidas.slice(1)}` : t.zona;
          return (
            <a
              key={t.ciudad}
              href="#buscar"
              className={`group relative isolate block aspect-[4/5] w-[80%] shrink-0 snap-start overflow-hidden rounded-[28px] bg-ink-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)] md:aspect-auto md:w-auto md:rounded-card ${CLASE_FORMA[t.forma]}`}
            >
              {t.foto ? (
                <Image
                  src={t.foto}
                  alt={`Vista de ${t.ciudad}`}
                  fill
                  sizes={t.forma === "normal" ? "(min-width: 768px) 300px, 80vw" : "(min-width: 768px) 620px, 80vw"}
                  className="-z-10 object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105"
                />
              ) : t.ilustracion ? (
                <div className="absolute inset-0 -z-10">
                  <IlustracionDestino clave={t.ilustracion} indice={i} />
                </div>
              ) : null}
              {/* Mismo degradado en fotos e ilustraciones: así el mosaico se ve parejo. */}
              <div className="absolute inset-0 -z-[5] bg-[linear-gradient(180deg,rgba(11,13,18,0)_42%,rgba(11,13,18,.88)_100%)]" />
              {t.etiqueta && (
                <span className="absolute left-4 top-4 rounded-full bg-ink/55 px-[11px] py-[5px] text-[11px] font-semibold backdrop-blur-md">
                  {t.etiqueta}
                </span>
              )}
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h3 className={`font-bold leading-none tracking-[-0.02em] ${t.forma === "grande" ? "text-[30px] md:text-[38px]" : "text-[30px]"}`}>
                    {t.ciudad}
                  </h3>
                  <span className="mt-2 block text-[13px] text-ondark">{meta}</span>
                </div>
                {precio !== undefined && (
                  <div className="shrink-0 rounded-ctrl bg-white px-3 py-2 text-right leading-[1.1] text-ink">
                    <small className="block text-[10.5px] font-medium text-muted-2">desde</small>
                    <b className="text-[19px] font-bold tabular-nums">${precio.toFixed(2)}</b>
                  </div>
                )}
              </div>
            </a>
          );
        })}

        <a
          href="#rutas"
          className="group flex aspect-[4/5] w-[80%] shrink-0 snap-start flex-col justify-between rounded-[28px] bg-kbyellow p-[22px] text-ink md:col-span-2 md:aspect-auto md:w-auto md:rounded-card"
        >
          <div>
            <h3 className="text-[26px] font-bold leading-[1.1]">¿No ves tu destino?</h3>
            <p className="mt-2 text-sm text-[#4A4410]">
              {modoReferencia
                ? "Ambato, Riobamba, Manta, Puyo, Tena y más."
                : "Mira todas las rutas disponibles y sus precios."}
            </p>
          </div>
          <span className="grid h-[52px] w-[52px] self-end place-items-center rounded-full bg-ink transition-transform duration-300 group-hover:translate-x-1.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FDD514" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </a>

        <div className="w-[80%] shrink-0 snap-start empty:hidden md:w-auto">
          <PublicidadNativa />
        </div>
      </div>
    </section>
  );
}
