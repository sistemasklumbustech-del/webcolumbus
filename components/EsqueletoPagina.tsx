/**
 * Esqueletos de carga (navegacion-rapida, 30-oct-2026): aparecen AL INSTANTE al hacer clic mientras
 * el servidor prepara la página, para que no parezca que la web "se pegó". Bloques grises con la
 * misma forma de la página que viene.
 */
function Bloque({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[14px] bg-line ${className}`} />;
}

export function EsqueletoPagina({ tipo = "general" }: { tipo?: "general" | "resultados" | "asientos" | "pago" | "texto" }) {
  return (
    <main role="status" aria-label="Cargando" className="flex-1 bg-kbbg">
      <span className="sr-only">Cargando…</span>
      <div className="kb-container py-6 md:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Bloque className="h-8 w-56 md:h-10 md:w-80" />
          <Bloque className="mt-3 h-4 w-72 max-w-full" />

          {tipo === "resultados" && (
            <div className="mt-6 flex flex-col gap-4">
              <Bloque className="h-12" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-3 rounded-card border border-line bg-white p-5">
                  <Bloque className="h-5 w-40" />
                  <Bloque className="h-10" />
                  <Bloque className="h-11 w-full md:w-48 md:self-end" />
                </div>
              ))}
            </div>
          )}

          {(tipo === "asientos" || tipo === "pago") && (
            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="flex flex-col gap-3 rounded-card border border-line bg-white p-5">
                {tipo === "asientos" ? (
                  <div className="grid grid-cols-5 gap-2.5 self-center">
                    {Array.from({ length: 25 }, (_, i) => (
                      <Bloque key={i} className={`h-10 w-10 ${i % 5 === 2 ? "opacity-0" : ""}`} />
                    ))}
                  </div>
                ) : (
                  <>
                    <Bloque className="h-5 w-32" />
                    <Bloque className="h-[54px]" />
                    <Bloque className="h-[54px]" />
                    <Bloque className="h-[54px]" />
                  </>
                )}
              </div>
              <div className="hidden flex-col gap-3 rounded-card bg-ink p-6 lg:flex">
                <div className="h-5 w-24 animate-pulse rounded-[10px] bg-ink-3" />
                <div className="h-7 w-48 animate-pulse rounded-[10px] bg-ink-3" />
                <div className="h-12 animate-pulse rounded-[12px] bg-ink-3" />
              </div>
            </div>
          )}

          {(tipo === "general" || tipo === "texto") && (
            <div className="mt-6 flex flex-col gap-3 rounded-card border border-line bg-white p-5 md:p-8">
              {["w-full", "w-11/12", "w-full", "w-2/3", "w-10/12", "w-1/2"].map((ancho, i) => (
                <Bloque key={i} className={`h-4 ${ancho}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
