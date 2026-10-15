import { listarTerminalesAliadas } from "@/lib/api";

/**
 * Terminales aliadas -- Fase 2 de la sesión de frontend (16-ago-2026).
 * Componente de servidor, mismo patrón real que RutasDisponibles.tsx.
 *
 * Machala destacada como la primera/estratégica -- instrucción
 * explícita del director (sesión de exploración de diseño,
 * DOCUMENTO_MAESTRO.md sección 5.8). No está hardcodeada: se busca
 * dentro de la lista REAL que devuelve el backend (por nombre o
 * ciudad, sin distinguir mayúsculas) y se ordena primero si existe --
 * si Machala todavía no está aliada en producción, esta sección
 * simplemente muestra el resto sin ninguna destacada, sin romperse.
 */
export async function TerminalesAliadas() {
  const terminales = await listarTerminalesAliadas();
  if (terminales.length === 0) return null;

  const ordenadas = [...terminales].sort((a, b) => {
    const aEsMachala = /machala/i.test(a.ciudad) || /machala/i.test(a.nombre);
    const bEsMachala = /machala/i.test(b.ciudad) || /machala/i.test(b.nombre);
    if (aEsMachala && !bEsMachala) return -1;
    if (bEsMachala && !aEsMachala) return 1;
    return 0;
  });

  return (
    <section className="mt-[30px] bg-ink py-6 text-white md:mt-16 md:py-10">
      <div className="mx-auto max-w-[1280px] px-5 md:px-16">
        <span className="kb-eyebrow !text-kbyellow">Terminales aliadas</span>
        <h2 className="mb-3.5 text-[21px] font-semibold md:mb-5 md:text-2xl">Sales desde estas terminales</h2>
        <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:gap-2.5 md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {ordenadas.map((terminal) => {
            const destacada = /machala/i.test(terminal.ciudad) || /machala/i.test(terminal.nombre);
            return (
              <span
                key={terminal.id}
                className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-[9px] text-[13px] font-medium md:px-[18px] md:py-[11px] md:text-sm ${
                  destacada ? "bg-kbyellow text-ink" : "bg-ink-2 shadow-[inset_0_0_0_1px_#262A35]"
                }`}
              >
                {destacada && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 21s7-6 7-11a7 7 0 00-14 0c0 5 7 11 7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                )}
                {terminal.nombre}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
