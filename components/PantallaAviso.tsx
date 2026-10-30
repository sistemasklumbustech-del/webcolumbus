import type { ReactNode } from "react";

/**
 * Pantalla de aviso a pantalla completa (rediseño 30-oct-2026): 404, error general, viaje que no
 * existe, búsqueda sin datos. Tarjeta centrada con ícono, título, texto y botones.
 */
export function PantallaAviso({
  icono = "buscar",
  codigo,
  titulo,
  texto,
  children,
}: {
  icono?: "buscar" | "error" | "bus";
  /** "404", "Error"… en letras pequeñas sobre el título. */
  codigo?: string;
  titulo: string;
  texto: ReactNode;
  /** Botones (enlaces o acciones). */
  children?: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center bg-kbbg px-4 py-12 md:py-20">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-3 rounded-card border border-line bg-white px-5 py-9 text-center md:px-10">
        <span aria-hidden="true" className={`mb-1 grid h-14 w-14 place-items-center rounded-full ${icono === "error" ? "bg-kberror-bg text-kberror" : "bg-ink text-kbyellow"}`}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icono === "buscar" && (
              <>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5M9 9l4 4M13 9l-4 4" />
              </>
            )}
            {icono === "error" && (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5.5M12 16.5v.01" />
              </>
            )}
            {icono === "bus" && (
              <>
                <rect x="4" y="3" width="16" height="15" rx="3" />
                <path d="M4 11h16M8 21v-3M16 21v-3" />
              </>
            )}
          </svg>
        </span>
        {codigo && <span className="text-xs font-semibold uppercase tracking-[.12em] text-muted-2">{codigo}</span>}
        <h1 className="text-2xl font-bold leading-tight text-ink md:text-[28px]">{titulo}</h1>
        <div className="max-w-sm text-[15px] leading-relaxed text-muted-2">{texto}</div>
        {children && <div className="mt-3 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:justify-center">{children}</div>}
      </div>
    </main>
  );
}
