import type { ReactNode } from "react";

/**
 * Presentación de los documentos legales (Términos y Privacidad), rediseño aprobado por el director
 * (30-oct-2026, puntos A–E). Solo diseño: los textos llegan tal cual y no se cambian. Lo único que se
 * ajusta al mostrar es el guion doble "--", que se ve como raya "—".
 */
export type BloqueLegal = { tipo: "parrafo"; texto: string } | { tipo: "lista"; items: string[] };

export interface SeccionLegal {
  id: string;
  titulo: string;
  bloques: BloqueLegal[];
}

/** "--" se muestra como "—" (solo presentación). */
export function conRaya(texto: string): string {
  return texto.replace(/\s*--\s*/g, " — ");
}

/** "3. Compra de boletos" → "seccion-3"; si el título no trae número, se usa su posición. */
export function idDeSeccion(titulo: string, posicion: number): string {
  const numero = titulo.match(/^\s*(\d+)[.)]/)?.[1];
  return `seccion-${numero ?? posicion + 1}`;
}

function Flecha({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Indice({ secciones }: { secciones: SeccionLegal[] }) {
  const enlaces = (
    <ol className="flex flex-col gap-0.5">
      {secciones.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="block rounded-[10px] px-3 py-2 text-[15px] leading-snug text-muted-2 transition hover:bg-kbbg hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
          >
            {conRaya(s.titulo)}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <nav aria-label="Secciones del documento">
      {/* Celular: índice plegable. */}
      <details className="group rounded-card border border-line bg-white lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
          Contenido · {secciones.length} secciones
          <Flecha className="shrink-0 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-line p-2">{enlaces}</div>
      </details>
      {/* PC: columna fija a la izquierda. */}
      <div className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto lg:block">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[.08em] text-muted-3">Contenido</p>
        {enlaces}
      </div>
    </nav>
  );
}

function Encabezado({ titulo, subtitulo }: { titulo: string; subtitulo?: ReactNode }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="kb-container py-8 lg:py-12">
        <p className="text-xs font-semibold uppercase tracking-[.08em] text-muted-2">Legal</p>
        <h1 className="mt-2 text-[28px] font-bold leading-tight text-ink lg:text-[36px]">{titulo}</h1>
        {subtitulo && <p className="mt-2 text-[15px] text-muted-2">{subtitulo}</p>}
      </div>
    </header>
  );
}

export function DocumentoLegal({
  titulo,
  subtitulo,
  secciones,
  pie,
}: {
  titulo: string;
  /** "Versión 1.2 · vigente desde octubre de 2026". */
  subtitulo?: ReactNode;
  secciones: SeccionLegal[];
  /** Aviso de borrador (se queda hasta que lo decida la directiva). */
  pie?: ReactNode;
}) {
  return (
    <main id="arriba" className="flex-1 bg-kbbg">
      <Encabezado titulo={titulo} subtitulo={subtitulo} />
      <div className="kb-container grid gap-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14 lg:py-12">
        <Indice secciones={secciones} />
        <article className="min-w-0 max-w-[68ch] text-base leading-[1.7] text-ink">
          {secciones.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className={`scroll-mt-24 ${i > 0 ? "mt-10" : ""}`}>
              <h2 id={`${s.id}-titulo`} className="text-lg font-semibold leading-snug text-ink lg:text-xl">
                {conRaya(s.titulo)}
              </h2>
              {s.bloques.map((b, j) =>
                b.tipo === "lista" ? (
                  <ul key={j} className="mt-3 list-disc space-y-2 pl-5 marker:text-muted-3">
                    {b.items.map((item, k) => (
                      <li key={k}>{conRaya(item)}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={j} className="mt-3">
                    {conRaya(b.texto)}
                  </p>
                ),
              )}
            </section>
          ))}

          {pie && <div className="mt-12 rounded-[14px] border border-line bg-white px-4 py-3 text-sm leading-relaxed text-muted-2">{pie}</div>}

          <a
            href="#arriba"
            className="mt-8 inline-flex min-h-11 items-center gap-1.5 rounded-tab text-[15px] font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Flecha className="rotate-180" />
            Volver arriba
          </a>
        </article>
      </div>
    </main>
  );
}

/** Si la API de Términos no responde: aviso y botón "Reintentar" (punto E). */
export function DocumentoLegalError({ titulo, accion }: { titulo: string; accion: ReactNode }) {
  return (
    <main id="arriba" className="flex-1 bg-kbbg">
      <Encabezado titulo={titulo} />
      <div className="kb-container py-8 lg:py-12">
        <div role="alert" className="flex max-w-[560px] flex-col items-start gap-3 rounded-card border border-line bg-white p-6">
          <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full bg-kberror-bg text-kberror">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5.5M12 16.5v.01" />
            </svg>
          </span>
          <b className="text-lg font-semibold text-ink">No pudimos cargar este documento</b>
          <p className="text-base leading-relaxed text-muted-2">Puede ser un problema de conexión. Inténtalo de nuevo en un momento.</p>
          {accion}
        </div>
      </div>
    </main>
  );
}
