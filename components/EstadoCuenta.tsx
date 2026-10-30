import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Estados de las pestañas de Mi cuenta (rediseño 30-oct-2026): vacío con ícono, título y una acción
 * opcional, y "cargando" con bloques grises en vez del texto suelto "Cargando...".
 */
export function EstadoVacio({
  icono,
  titulo,
  texto,
  accion,
}: {
  icono: ReactNode;
  titulo: string;
  texto: string;
  accion?: { texto: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-line bg-white px-5 py-8 text-center">
      <span aria-hidden="true" className="mb-1 grid h-12 w-12 place-items-center rounded-full bg-kbbg text-ink">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icono}
        </svg>
      </span>
      <b className="text-base font-semibold text-ink">{titulo}</b>
      <p className="max-w-sm text-sm leading-relaxed text-muted-2">{texto}</p>
      {accion && (
        <Link href={accion.href} className="kb-btn kb-btn--outline mt-2 !h-11 !px-5 !text-sm">
          {accion.texto}
        </Link>
      )}
    </div>
  );
}

export function EstadoCargando({ filas = 2 }: { filas?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-2.5">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="h-[68px] animate-pulse rounded-[14px] bg-line" />
      ))}
    </div>
  );
}

/** Íconos de los estados vacíos (trazos de 24 px). */
export const ICONOS_CUENTA = {
  reclamo: (
    <>
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4M12 17v.01" />
    </>
  ),
  saldo: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M16 12.5h2M3 10h18" />
    </>
  ),
  invitar: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M18 8v6M15 11h6" />
    </>
  ),
  credito: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5v1.5M12 16v1.5" />
    </>
  ),
};
