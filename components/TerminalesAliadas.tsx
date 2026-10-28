import {
  listarRutasDisponibles,
  listarTerminalesAliadas,
  obtenerEstadisticasPublicas,
} from "@/lib/api";
import { claveCiudad, REFERENCIA, rutasReales, terminalesReales } from "@/lib/portada-datos";
import { MapaSalidas } from "./MapaSalidas";
import { hayMapaSalidas, type DestinoMapa } from "@/lib/mapa-salidas";

/**
 * Terminal aliada -- portada nueva (oct-2026): mapa de salidas, nombre de la terminal, tres cifras y
 * el botón "Cómo llegar". Machala va primero (terminal estratégica, instrucción del director,
 * DOCUMENTO_MAESTRO.md sección 5.8), buscada dentro de la lista REAL del API sin distinguir
 * mayúsculas.
 *
 * Datos: manda el API. Los registros de prueba no se muestran. Mientras no haya una terminal real,
 * se muestra la terminal de referencia (Terminal Terrestre de Machala, ver lib/portada-datos.ts);
 * en cuanto el API devuelva una terminal real, esta la reemplaza junto con sus rutas y cifras.
 */
export async function TerminalesAliadas() {
  const [listaTerminales, listaRutas, estadisticas] = await Promise.all([
    listarTerminalesAliadas(),
    listarRutasDisponibles(),
    obtenerEstadisticasPublicas(),
  ]);

  const terminales = terminalesReales(listaTerminales).sort((a, b) => {
    const aM = /machala/i.test(a.ciudad) || /machala/i.test(a.nombre);
    const bM = /machala/i.test(b.ciudad) || /machala/i.test(b.nombre);
    return aM === bM ? 0 : aM ? -1 : 1;
  });
  const modoReferencia = terminales.length === 0;

  const principal = modoReferencia
    ? { nombre: REFERENCIA.terminal.nombre, ciudad: REFERENCIA.terminal.ciudad }
    : { nombre: terminales[0].nombre, ciudad: terminales[0].ciudad };
  const direccion = modoReferencia ? REFERENCIA.terminal.direccion : null;

  // Destinos del mapa con su precio "desde" (y, con datos de referencia, duración y frecuencia).
  const destinos: DestinoMapa[] = modoReferencia
    ? REFERENCIA.destinos.map((d) => ({
        ciudad: d.ciudad,
        precio: d.precio,
        detalle: `${d.duracion} · ${d.salidas.charAt(0).toLowerCase()}${d.salidas.slice(1)}`,
      }))
    : Array.from(
        rutasReales(listaRutas)
          .filter((r) => claveCiudad(r.origenCiudad) === claveCiudad(principal.ciudad))
          .reduce((mapa, r) => {
            const precio = Number(r.precioReferencia);
            const previo = mapa.get(claveCiudad(r.destinoCiudad));
            if (!previo || (Number.isFinite(precio) && precio < (previo.precio ?? Infinity))) {
              mapa.set(claveCiudad(r.destinoCiudad), { ciudad: r.destinoCiudad, precio: Number.isFinite(precio) ? precio : undefined });
            }
            return mapa;
          }, new Map<string, DestinoMapa>())
          .values(),
      );

  const cifras = modoReferencia
    ? [
        { valor: String(REFERENCIA.cifras.cooperativas), texto: "cooperativas" },
        { valor: String(REFERENCIA.cifras.regiones), texto: `regiones: ${REFERENCIA.cifras.regionesTexto}` },
        { valor: "24/7", texto: "compras en línea" },
      ]
    : [
        ...(estadisticas
          ? [
              {
                valor: String(estadisticas.cooperativasActivas),
                texto: estadisticas.cooperativasActivas === 1 ? "cooperativa" : "cooperativas",
              },
              {
                valor: String(estadisticas.rutasDisponibles),
                texto: estadisticas.rutasDisponibles === 1 ? "ruta disponible" : "rutas disponibles",
              },
            ]
          : []),
        { valor: "24/7", texto: "compras en línea" },
      ];

  const hayMapa = hayMapaSalidas(principal.ciudad, destinos);
  const otras = terminales.slice(1);

  return (
    <section id="terminal" className="mt-[30px] scroll-mt-20 overflow-hidden bg-ink py-14 text-white md:mt-14 md:py-16">
      <div className={`mx-auto grid max-w-[1280px] items-center gap-8 px-5 md:px-16 ${hayMapa ? "md:grid-cols-[420px_1fr] md:gap-16" : ""}`}>
        {hayMapa && (
          <div
            role="img"
            aria-label={`Mapa de salidas desde ${principal.ciudad} hacia ${destinos.join(", ")}`}
            className="relative w-full max-w-[560px] md:max-w-[420px] overflow-hidden rounded-[28px] bg-ink shadow-[inset_0_0_0_1px_#262A35]"
          >
            <MapaSalidas origen={principal.ciudad} destinos={destinos} />
          </div>
        )}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-kbyellow px-3 py-1.5 text-xs font-bold text-ink">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
            Terminal aliada
          </span>
          <h2 className="mb-2.5 mt-3.5 text-[28px] font-bold leading-[1.08] tracking-[-0.025em] md:text-[36px]">{principal.nombre}</h2>
          <p className="max-w-[46ch] text-ondark">
            Compra en línea y ve directo al andén. Tu boleto ya está en tu celular, sin pasar por la taquilla.
          </p>

          <div className="my-6 grid grid-cols-3 gap-2.5">
            {cifras.map((c) => (
              <div key={c.texto} className="rounded-[18px] bg-ink-2 px-3 py-3.5 shadow-[inset_0_0_0_1px_#262A35] md:px-4 md:py-[18px]">
                <b className="block text-2xl font-bold leading-[1.1] text-kbyellow md:text-[28px]">{c.valor}</b>
                <span className="text-xs text-ondark">{c.texto}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${principal.nombre} ${principal.ciudad}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[46px] items-center gap-2 rounded-tab bg-white px-[18px] text-sm font-semibold text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
              Cómo llegar
            </a>
            {direccion && <span className="text-sm text-ondark">{direccion}</span>}
          </div>

          {otras.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {otras.map((t) => (
                <span key={t.id} className="rounded-full bg-ink-2 px-3.5 py-[9px] text-[13px] font-medium shadow-[inset_0_0_0_1px_#262A35]">
                  {t.nombre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
