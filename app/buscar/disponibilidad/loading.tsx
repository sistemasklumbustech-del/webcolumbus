/** Mientras responde la API: esqueleto con la forma de la página (encabezado y tarjetas de fechas). */
export default function CargandoDisponibilidad() {
  return (
    <main className="flex-1" aria-busy="true" aria-label="Cargando fechas disponibles">
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-5 py-3.5 md:px-16 md:py-[18px]">
          <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-kbbg motion-reduce:animate-none" />
          <span className="flex-1 space-y-2">
            <span className="block h-5 w-48 animate-pulse rounded bg-kbbg motion-reduce:animate-none" />
            <span className="block h-3.5 w-32 animate-pulse rounded bg-kbbg motion-reduce:animate-none" />
          </span>
        </div>
      </div>
      <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-16 md:py-8">
        <span className="mb-5 block h-4 w-72 max-w-full animate-pulse rounded bg-line motion-reduce:animate-none" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="kb-card block h-[132px] animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    </main>
  );
}
