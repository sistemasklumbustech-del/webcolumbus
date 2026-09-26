"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AMENIDADES_CATALOGO, obtenerCooperativasPublicas, type CooperativaPublica } from "@/lib/api";
import { usePaginacionLocal, ControlesPaginacion } from "@/components/Paginacion";

const claseCampo =
  "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium";
const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

const ETIQUETA_AMENIDAD: Record<string, string> = Object.fromEntries(AMENIDADES_CATALOGO.map((a) => [a.valor, a.etiqueta]));
const ETIQUETA_CATEGORIA: Record<string, string> = { bus: "Bus", buseta: "Buseta", van: "Van", minibus: "Minibús" };

function TarjetaCooperativa({ c }: { c: CooperativaPublica }) {
  const sinPerfil = !c.descripcion && c.servicios.length === 0 && c.beneficios.length === 0;
  const totalUnidades = c.flota.reduce((acc, f) => acc + f.unidades, 0);

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 px-5 py-4">
        <div className="flex items-center gap-3">
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo dinámico del almacenamiento
            <img src={c.logoUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-black/10" />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand-dark"
            >
              {c.nombre.charAt(0)}
            </span>
          )}
          <div>
            <h2 className="font-display text-lg font-bold text-brand-dark">{c.nombre}</h2>
            <p className="text-xs text-brand-dark/60">
              {c.rutas} {c.rutas === 1 ? "ruta" : "rutas"}
              {totalUnidades > 0 && ` · ${totalUnidades} ${totalUnidades === 1 ? "bus" : "buses"}`}
            </p>
          </div>
        </div>
        <Link
          href={`/rutas?cooperativa=${c.id}`}
          className="rounded-lg bg-brand-amber px-4 py-2 text-xs font-semibold text-brand-dark transition hover:brightness-95"
        >
          Ver rutas y horarios
        </Link>
      </header>

      <div className="space-y-5 px-5 py-4">
        {c.descripcion && <p className="text-sm leading-relaxed text-brand-dark/80">{c.descripcion}</p>}

        {c.ciudades.length > 0 && (
          <div>
            <h3 className={claseEtiqueta}>Ciudades a las que llega</h3>
            <p className="text-sm text-brand-dark">{c.ciudades.join(" · ")}</p>
          </div>
        )}

        {c.servicios.length > 0 && (
          <div>
            <h3 className={claseEtiqueta}>Servicios</h3>
            <ul className="flex flex-wrap gap-2">
              {c.servicios.map((s) => (
                <li key={s} className="rounded-full bg-brand-light px-3 py-1 text-sm text-brand-dark">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {c.beneficios.length > 0 && (
          <div>
            <h3 className={claseEtiqueta}>Beneficios</h3>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {c.beneficios.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-brand-dark">
                  <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" aria-hidden="true">
                    <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {c.flota.length > 0 && (
          <div>
            <h3 className={claseEtiqueta}>Nuestra flota</h3>
            <ul className="divide-y divide-black/5 rounded-xl ring-1 ring-black/5">
              {c.flota.map((f) => (
                <li key={f.nombre} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-dark">
                      {f.nombre}
                      {f.pisos > 1 && (
                        <span className="ml-2 rounded-full bg-brand-cobalto px-2 py-0.5 text-[11px] font-semibold text-white">
                          {f.pisos} pisos
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-brand-dark/60">
                      {f.categoria ? `${ETIQUETA_CATEGORIA[f.categoria] ?? f.categoria} · ` : ""}
                      {f.capacidadTotal} asientos · {f.unidades} {f.unidades === 1 ? "unidad" : "unidades"}
                    </p>
                  </div>
                  {f.amenidades.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {f.amenidades.map((a) => (
                        <li key={a} className="rounded-md bg-brand-light/60 px-2 py-0.5 text-xs text-brand-dark/80">
                          {ETIQUETA_AMENIDAD[a] ?? a}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sinPerfil && c.flota.length === 0 && (
          <p className="text-sm text-brand-dark/50">Esta cooperativa aún no ha completado su perfil.</p>
        )}
      </div>
    </article>
  );
}

export default function CooperativasPage() {
  const [cooperativas, setCooperativas] = useState<CooperativaPublica[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [ciudad, setCiudad] = useState("");

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

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-brand-dark">Cooperativas</h1>
      <p className="mt-2 max-w-2xl text-sm text-brand-dark/70">
        Las cooperativas que viajan con Klumbus: los servicios que prestan, los beneficios para ti, sus buses y las
        ciudades a las que llegan.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:grid-cols-3">
        <div>
          <label htmlFor="coops-buscar" className={claseEtiqueta}>
            Buscar cooperativa
          </label>
          <input
            id="coops-buscar"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              paginacion.setPagina(1);
            }}
            placeholder="Nombre"
            className={claseCampo}
          />
        </div>
        <div>
          <label htmlFor="coops-ciudad" className={claseEtiqueta}>
            Llega a la ciudad
          </label>
          <select
            id="coops-ciudad"
            value={ciudad}
            onChange={(e) => {
              setCiudad(e.target.value);
              paginacion.setPagina(1);
            }}
            className={claseCampo}
          >
            <option value="">Todas</option>
            {ciudades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            disabled={!hayFiltros}
            onClick={() => {
              setBusqueda("");
              setCiudad("");
              paginacion.setPagina(1);
            }}
            className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm font-semibold text-brand-dark/70 hover:bg-brand-light/40 disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>
      </div>

      {cooperativas === null && <p className="mt-8 text-sm text-brand-dark/50">Cargando cooperativas...</p>}

      {cooperativas !== null && cooperativas.length === 0 && (
        <p className="mt-8 rounded-2xl bg-white p-6 text-center text-sm text-brand-dark/60 shadow-sm ring-1 ring-black/5">
          Todavía no hay cooperativas publicadas. Vuelve pronto.
        </p>
      )}

      {cooperativas !== null && cooperativas.length > 0 && filtradas.length === 0 && (
        <p className="mt-8 rounded-2xl bg-white p-6 text-center text-sm text-brand-dark/60 shadow-sm ring-1 ring-black/5">
          Ninguna cooperativa coincide con la búsqueda.
        </p>
      )}

      <div className="mt-6 space-y-4">
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
        className="mt-4 rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
      />
    </main>
  );
}
