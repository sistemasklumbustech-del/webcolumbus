/**
 * "¿Por qué Klumbus?" (prueba de rediseño, oct-2026): a la izquierda el título, el botón y los métodos
 * de pago; a la derecha una tabla que compara, tema por tema, la taquilla con Klumbus.
 * Es solo contenido fijo; el botón lleva al buscador de siempre.
 *
 * Los métodos de pago son los que ofrece el checkout hoy (DeUna, PayPhone, tarjeta Visa /
 * Mastercard / Diners y transferencia bancaria).
 */
/** Cada fila compara lo mismo: cómo es en la taquilla y cómo es con Klumbus. */
const COMPARACION = [
  { tema: "Compra", taquilla: "Haces fila y te arriesgas a que se llene el bus.", klumbus: "Compras en minutos, desde donde estés." },
  { tema: "Horarios", taquilla: "Vas de ventanilla en ventanilla preguntando.", klumbus: "Ves todas las cooperativas y horarios juntos." },
  { tema: "Asiento", taquilla: "Te toca el asiento que quede.", klumbus: "Eliges tu asiento en el mapa del bus." },
  { tema: "Boleto", taquilla: "Boleto de papel que se moja o se pierde.", klumbus: "Boleto con QR en tu celular, siempre a mano." },
];

const METODOS_PAGO = ["DeUna", "PayPhone", "Visa", "Mastercard", "Diners", "Transferencia"];

function Cruz() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7080" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function Palomita() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0B0D12" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

export function ComparativaTaquilla() {
  return (
    <section id="porque" className="mt-14 scroll-mt-20 bg-kbyellow py-12 text-ink md:py-16">
      <div className="mx-auto grid max-w-[1280px] gap-7 px-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] md:items-center md:gap-14 md:px-16">
        <div>
          <span className="kb-eyebrow-barra !text-ink [&]:before:!bg-ink">¿Por qué Klumbus?</span>
          <h2 className="mt-1.5 text-[27px] font-bold leading-[1.1] tracking-[-0.025em] md:text-[38px]">
            Deja la fila.
            <br />
            Viaja tranquilo.
          </h2>
          <p className="mt-3 max-w-[38ch] text-[15px] text-ink/75">
            Todo lo que antes hacías en la taquilla, ahora lo haces desde tu celular en un par de minutos.
          </p>
          <a
            href="#buscar"
            className="mt-6 inline-flex h-14 items-center gap-2.5 rounded-ctrl bg-ink px-7 text-base font-bold text-white transition hover:bg-ink-3"
          >
            Buscar mi pasaje
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FDD514" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <div className="mt-7">
            <small className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/60">Paga con</small>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {METODOS_PAGO.map((m) => (
                <span key={m} className="rounded-[10px] bg-white/70 px-3 py-1.5 text-[12.5px] font-semibold">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla comparativa: una fila por tema, taquilla a la izquierda y Klumbus a la derecha. */}
        <div className="overflow-hidden rounded-card bg-white shadow-[0_24px_50px_rgba(11,13,18,.16)]">
          <div className="grid grid-cols-2 text-[13px] font-semibold md:text-sm">
            <div className="flex items-center gap-2 px-4 py-3.5 text-muted-2 md:px-6 md:py-4">
              <i className="grid h-6 w-6 place-items-center rounded-full bg-kbbg">
                <Cruz />
              </i>
              En la taquilla
            </div>
            <div className="flex items-center gap-2 bg-ink px-4 py-3.5 text-white md:px-6 md:py-4">
              <i className="grid h-6 w-6 place-items-center rounded-full bg-kbyellow">
                <Palomita />
              </i>
              Con Klumbus
            </div>
          </div>
          <ul>
            {COMPARACION.map((c) => (
              <li key={c.tema} className="grid grid-cols-2">
                <div className="border-t border-line px-4 py-3.5 md:px-6 md:py-4">
                  <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-3">{c.tema}</span>
                  <span className="mt-0.5 block text-[13px] text-muted-2 md:text-sm">{c.taquilla}</span>
                </div>
                <div className="border-t border-ink-3 bg-ink px-4 py-3.5 md:px-6 md:py-4">
                  <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-kbyellow">{c.tema}</span>
                  <span className="mt-0.5 block text-[13px] font-medium text-white md:text-sm">{c.klumbus}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
