"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AMENIDADES_CATALOGO, obtenerCooperativasPublicas, type CooperativaPublica } from "@/lib/api";
import { usePaginacionLocal, ControlesPaginacion } from "@/components/Paginacion";

const ETIQUETA_AMENIDAD: Record<string, string> = Object.fromEntries(AMENIDADES_CATALOGO.map((a) => [a.valor, a.etiqueta]));
const ETIQUETA_CATEGORIA: Record<string, string> = { bus: "Bus", buseta: "Buseta", van: "Van", minibus: "Minibús" };

/** Buses que se ven de entrada; el resto se despliega con "Ver N más" (decisión del director). */
const FLOTA_VISIBLE = 3;

function TituloSeccion({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 text-sm font-semibold text-ink">{children}</h3>;
}

function TarjetaCooperativa({ c }: { c: CooperativaPublica }) {
  const [flotaCompleta, setFlotaCompleta] = useState(false);
  const sinPerfil = !c.descripcion && c.servicios.length === 0 && c.beneficios.length === 0;
  const totalUnidades = c.flota.reduce((acc, f) => acc + f.unidades, 0);
  const flotaVisible = flotaCompleta ? c.flota : c.flota.slice(0, FLOTA_VISIBLE);
  const flotaOculta = c.flota.length - FLOTA_VISIBLE;

  return (
    <article className="overflow-hidden rounded-card border border-line bg-white">
      <header className="flex flex-col gap-4 border-b border-line px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-5">
        <div className="flex min-w-0 items-center gap-3">
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo dinámico del almacenamiento
            <img src={c.logoUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-line" />
          ) : (
            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-lg font-bold text-kbyellow">
              {c.nombre.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-snug text-ink md:text-xl">{c.nombre}</h2>
            <p className="mt-0.5 text-[13px] text-muted-2">
              {c.rutas} {c.rutas === 1 ? "ruta" : "rutas"}
              {totalUnidades > 0 && ` · ${totalUnidades} ${totalUnidades === 1 ? "bus" : "buses"}`}
            </p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2.5 md:flex">
          <Link href={`/ayuda?cooperativa=${c.id}`} className="kb-btn kb-btn--outline !h-11 !px-5 !text-sm">
            Contactar
          </Link>
          <Link href={`/rutas?cooperativa=${c.id}`} className="kb-btn kb-btn--primary !h-11 !px-5 !text-sm">
            <span className="md:hidden">Ver rutas</span>
            <span className="hidden md:inline">Ver rutas y horarios</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4 md:px-6 md:py-5">
        {c.descripcion && <p className="text-[15px] leading-relaxed text-ink">{c.descripcion}</p>}

        {c.ciudades.length > 0 && (
          <section>
            <TituloSeccion>Ciudades a las que llega</TituloSeccion>
            <ul className="flex flex-wrap gap-2">
              {c.ciudades.map((ciudad) => (
                <li key={ciudad} className="inline-flex h-8 items-center rounded-full bg-kbbg px-3 text-sm text-ink">
                  {ciudad}
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.servicios.length > 0 && (
          <section>
            <TituloSeccion>Servicios</TituloSeccion>
            <ul className="flex flex-wrap gap-2">
              {c.servicios.map((s) => (
                <li key={s} className="inline-flex h-8 items-center rounded-full bg-kbbg px-3 text-sm text-ink">
                  {s}
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.beneficios.length > 0 && (
          <section>
            <TituloSeccion>Beneficios</TituloSeccion>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {c.beneficios.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-ink">
                  <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-ok" fill="currentColor" aria-hidden="true">
                    <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.flota.length > 0 && (
          <section>
            <TituloSeccion>Flota</TituloSeccion>
            <ul id={`flota-${c.id}`} className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
              {flotaVisible.map((f) => (
                <li key={f.nombre} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      {f.nombre}
                      {f.pisos > 1 && (
                        <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">{f.pisos} pisos</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-2">
                      {f.categoria ? `${ETIQUETA_CATEGORIA[f.categoria] ?? f.categoria} · ` : ""}
                      {f.capacidadTotal} asientos · {f.unidades} {f.unidades === 1 ? "unidad" : "unidades"}
                    </p>
                  </div>
                  {f.amenidades.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {f.amenidades.map((a) => (
                        <li key={a} className="rounded-full bg-kbbg px-2.5 py-0.5 text-xs text-ink">
                          {ETIQUETA_AMENIDAD[a] ?? a}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {flotaOculta > 0 && (
              <button
                type="button"
                aria-expanded={flotaCompleta}
                aria-controls={`flota-${c.id}`}
                onClick={() => setFlotaCompleta((v) => !v)}
                className="mt-2.5 inline-flex min-h-11 items-center gap-1.5 rounded-tab text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {flotaCompleta ? "Ver menos" : `Ver ${flotaOculta} más`}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={flotaCompleta ? "rotate-180" : ""}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
          </section>
        )}

        {sinPerfil && c.flota.length === 0 && <p className="text-sm text-muted-2">Esta cooperativa aún no ha completado su perfil.</p>}
      </div>
    </article>
  );
}

export default function CooperativasPage() {
  const [cooperativas, setCooperativas] = useState<CooperativaPublica[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  useEffect(() => {
    obtenerCooperativasPublicas().then(setCooperativas);
  }, []);

  const ciudades = useMemo(
    () => Array.from(new Set((cooperativas ?? []).flatMap((c) => c.ciudades))).sort((a, b) => a.localeCompare(b, "es")),
    [cooperativas],
  );
  const termino = busqueda.trim().toLowerCase();
  const filtradas = useMemo(
    () =>
      (cooperativas ?? []).filter(
        (c) => (termino === "" || c.nombre.toLowerCase().includes(termino)) && (ciudad === "" || c.ciudades.includes(ciudad)),
      ),
    [cooperativas, termino, ciudad],
  );
  const paginacion = usePaginacionLocal(filtradas, 5);
  const hayFiltros = termino !== "" || ciudad !== "";

  const limpiar = (
    <button
      type="button"
      disabled={!hayFiltros}
      onClick={() => {
        setBusqueda("");
        setCiudad("");
        paginacion.setPagina(1);
      }}
      className="kb-btn kb-btn--outline !h-11 w-full !px-5 !text-sm md:!h-[var(--kb-control-h)] md:w-auto"
    >
      Limpiar
    </button>
  );

  return (
    <main className="flex-1 bg-kbbg">
      <header className="border-b border-line bg-white">
        <div className="kb-container py-7 md:py-10">
          <div className="mx-auto w-full max-w-5xl">
            <h1 className="text-[28px] font-bold leading-tight text-ink md:text-[36px]">Cooperativas</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-2">
              Las cooperativas que viajan con Klumbus: los servicios que prestan, los beneficios para ti, sus buses y las
              ciudades a las que llegan.
            </p>
          </div>
        </div>
      </header>

      <div className="kb-container py-5 md:py-8">
        <div className="mx-auto w-full max-w-5xl">
          {/* Buscador siempre visible; la ciudad, en "Filtrar" en celular y en la misma fila en PC. */}
          <div className="rounded-card border border-line bg-white p-4 md:grid md:grid-cols-[1fr_1fr_auto] md:items-end md:gap-3">
            <div>
              <label htmlFor="coops-buscar" className="kb-label">
                Buscar cooperativa
              </label>
              <div className="flex gap-2.5">
                <input
                  id="coops-buscar"
                  type="search"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    paginacion.setPagina(1);
                  }}
                  placeholder="Nombre"
                  className="kb-input"
                />
                <button
                  type="button"
                  aria-expanded={filtrosAbiertos}
                  aria-controls="coops-filtros"
                  onClick={() => setFiltrosAbiertos((v) => !v)}
                  className="kb-btn kb-btn--outline !h-[var(--kb-control-h)] shrink-0 !px-4 !text-sm md:hidden"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 6h16M7 12h10M10 18h4" />
                  </svg>
                  Filtrar
                  {ciudad !== "" && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-bold text-white">
                      <span className="sr-only">filtros activos: </span>1
                    </span>
                  )}
                </button>
              </div>
            </div>
            <div id="coops-filtros" className={`${filtrosAbiertos ? "flex" : "hidden"} mt-3 flex-col gap-3 md:contents`}>
              <div>
                <label htmlFor="coops-ciudad" className="kb-label">
                  Llega a la ciudad
                </label>
                <select
                  id="coops-ciudad"
                  value={ciudad}
                  onChange={(e) => {
                    setCiudad(e.target.value);
                    paginacion.setPagina(1);
                  }}
                  className="kb-input"
                >
                  <option value="">Todas</option>
                  {ciudades.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {limpiar}
            </div>
          </div>

          {cooperativas === null && <p className="mt-6 text-sm text-muted-2">Cargando cooperativas...</p>}

          {cooperativas !== null && cooperativas.length === 0 && (
            <p className="mt-6 rounded-card border border-line bg-white p-6 text-center text-sm text-muted-2">
              Todavía no hay cooperativas publicadas. Vuelve pronto.
            </p>
          )}

          {cooperativas !== null && cooperativas.length > 0 && filtradas.length === 0 && (
            <p className="mt-6 rounded-card border border-line bg-white p-6 text-center text-sm text-muted-2">
              Ninguna cooperativa coincide con la búsqueda.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-4 md:mt-6">
            {paginacion.visibles.map((c) => (
              <TarjetaCooperativa key={c.id} c={c} />
            ))}
          </div>

          <ControlesPaginacion
            pagina={paginacion.pagina}
            totalPaginas={paginacion.totalPaginas}
            total={paginacion.total}
            etiqueta="cooperativa"
            onCambio={paginacion.setPagina}
            className="mt-4 rounded-card border border-line bg-white"
          />
        </div>
      </div>
    </main>
  );
}
