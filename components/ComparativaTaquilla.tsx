/**
 * "¿Por qué Klumbus?" (portada nueva, oct-2026): en dos columnas, cómo es comprar en la taquilla
 * frente a comprar con Klumbus, sobre fondo amarillo, y los métodos de pago reales.
 * Es solo contenido fijo; el botón lleva al buscador de siempre.
 *
 * Los métodos de pago son los que ofrece el checkout hoy (DeUna, PayPhone, tarjeta Visa /
 * Mastercard / Diners y transferencia bancaria).
 */
const EN_TAQUILLA = [
  "Haces fila y te arriesgas a que se llene el bus.",
  "Vas de ventanilla en ventanilla preguntando horarios.",
  "Te toca el asiento que quede.",
  "Boleto de papel que se moja o se pierde.",
];

const CON_KLUMBUS = [
  "Compras en minutos, desde donde estés.",
  "Ves todas las cooperativas y horarios juntos.",
  "Eliges tu asiento en el mapa del bus.",
  "Boleto con QR en tu celular, siempre a mano.",
];

const METODOS_PAGO = ["DeUna", "PayPhone", "Visa", "Mastercard", "Diners", "Transferencia"];

function Cruz() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B0D12" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
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
    <section id="porque" className="mt-14 scroll-mt-20 bg-kbyellow py-14 text-ink md:mt-[72px] md:py-[88px]">
      <div className="mx-auto max-w-[1280px] px-5 md:px-16">
        <span className="kb-eyebrow-barra !text-ink [&]:before:!bg-ink">¿Por qué Klumbus?</span>
        <h2 className="mt-1.5 text-[27px] font-bold leading-[1.1] tracking-[-0.025em] md:text-[44px]">
          Deja la fila.
          <br />
          Viaja tranquilo.
        </h2>

        <div className="mt-7 grid gap-3.5 md:grid-cols-[1fr_1.15fr] md:items-stretch">
          <div className="rounded-[28px] bg-ink/[0.06] p-[22px] shadow-[inset_0_0_0_1.5px_rgba(11,13,18,.12)] md:p-[34px]">
            <h3 className="mb-3.5 text-lg font-bold">En la taquilla</h3>
            <ul className="grid gap-3">
              {EN_TAQUILLA.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15px] text-[#4A4410]">
                  <i className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink/[0.12]">
                    <Cruz />
                  </i>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] bg-ink p-[22px] text-white shadow-[0_24px_50px_rgba(11,13,18,.25)] md:p-[34px]">
            <h3 className="mb-3.5 text-lg font-bold">Con Klumbus</h3>
            <ul className="grid gap-3">
              {CON_KLUMBUS.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15px]">
                  <i className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-kbyellow">
                    <Palomita />
                  </i>
                  {t}
                </li>
              ))}
            </ul>
            <a
              href="#buscar"
              className="mt-5 flex h-14 items-center justify-center rounded-ctrl bg-kbyellow text-base font-bold text-ink transition hover:bg-[#E9C200]"
            >
              Buscar mi pasaje
            </a>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2">
          <small className="mr-1.5 text-[13px] font-semibold">Paga con</small>
          {METODOS_PAGO.map((m) => (
            <span key={m} className="rounded-xl bg-white px-3.5 py-2 text-[13px] font-bold tracking-[-0.01em]">
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
