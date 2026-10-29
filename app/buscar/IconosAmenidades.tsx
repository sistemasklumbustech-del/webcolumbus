import { AMENIDADES_CATALOGO } from "@/lib/api";

/**
 * Comodidades del bus como íconos pequeños, con el nombre al pasar el mouse o al enfocarlos con el
 * teclado (etapa 2 de Resultados). El nombre también queda en el texto para lectores de pantalla.
 */
const TRAZOS: Record<string, React.ReactNode> = {
  wifi: (
    <>
      <path d="M5 12.5a10 10 0 0 1 14 0" />
      <path d="M2 9a15 15 0 0 1 20 0" />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  aire_acondicionado: (
    <>
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
      <path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" />
    </>
  ),
  bano_a_bordo: (
    <>
      <path d="M7 12h13a1 1 0 0 1 1 1 5 5 0 0 1-5 5h-.6a.5.5 0 0 0-.4.8l1.5 2.4a.5.5 0 0 1-.4.8H5.4a.5.5 0 0 1-.4-.8L7 18" />
      <path d="M8 18a5 5 0 0 1-5-5V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v7" />
    </>
  ),
  cargadores: (
    <>
      <path d="M12 22v-5M9 8V2M15 8V2" />
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z" />
    </>
  ),
  asientos_reclinables: (
    <>
      <path d="M7 3l2.5 10H17a2 2 0 0 1 2 2v1" />
      <path d="M5 21h14M9.5 13L8 21M17 16l1 5" />
    </>
  ),
  tv: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M17 2l-5 5-5-5" />
    </>
  ),
};

export function nombreAmenidad(valor: string): string {
  return AMENIDADES_CATALOGO.find((a) => a.valor === valor)?.etiqueta ?? valor;
}

export function IconoAmenidad({ valor, className = "h-4 w-4" }: { valor: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {TRAZOS[valor] ?? <circle cx="12" cy="12" r="4" />}
    </svg>
  );
}

export function IconosAmenidades({ amenidades, className = "" }: { amenidades: string[]; className?: string }) {
  if (amenidades.length === 0) return null;
  return (
    <ul aria-label="Comodidades" className={`flex flex-wrap gap-1.5 ${className}`}>
      {amenidades.map((a) => (
        <li key={a} className="group/am relative">
          <span
            tabIndex={0}
            className="grid h-7 w-7 place-items-center rounded-lg bg-kbbg text-muted-2 outline-none transition hover:text-ink focus-visible:ring-2 focus-visible:ring-ink"
          >
            <IconoAmenidad valor={a} />
            <span className="sr-only">{nombreAmenidad(a)}</span>
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-full z-[3] mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-card transition group-hover/am:opacity-100 group-focus-within/am:opacity-100"
          >
            {nombreAmenidad(a)}
          </span>
        </li>
      ))}
    </ul>
  );
}
