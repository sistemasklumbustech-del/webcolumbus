/**
 * "Cómo funciona" -- 19-ago-2026, hallazgo real de la investigación
 * comparativa de portadas (redBus/FlixBus/plataformas de reserva):
 * un resumen visual corto de pasos reduce la duda de un pasajero que
 * nunca ha usado la plataforma.
 *
 * El director compartió un HTML de referencia con este mismo patrón
 * de 4 pasos, pero con datos de una demo genérica ("8 métodos de
 * pago", "Kushki", entrega por WhatsApp). Verificado contra el código
 * real antes de construir: el sistema tiene 5 métodos de pago reales
 * (no 8, Kushki no existe), y WhatsApp sigue simulado (bloqueado por
 * la cuenta gratuita de Twilio) -- corregido para reflejar solo lo
 * que la plataforma hace de verdad hoy.
 *
 * Rediseño final (oct-2026): íconos de trazo negro sobre baldosa amarilla suave.
 */
const ATRIBUTOS_ICONO = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const PASOS = [
  {
    icono: (
      <svg {...ATRIBUTOS_ICONO}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
    ),
    titulo: "Busca tu ruta",
    descripcion: "Escribe tu destino y ve solo las cooperativas que realmente van allí.",
  },
  {
    icono: (
      <svg {...ATRIBUTOS_ICONO}>
        <path d="M7 4h7a2 2 0 012 2v6H9a2 2 0 01-2-2zM5 12h14v3H5zM7 15v5M17 15v5" />
      </svg>
    ),
    titulo: "Elige horario y asiento",
    descripcion: "Selecciona la hora y tu asiento en el mapa visual del bus.",
  },
  {
    icono: (
      <svg {...ATRIBUTOS_ICONO} width={20} height={20}>
        <rect x="2" y="5" width="20" height="14" rx="3" />
        <path d="M2 10h20M6 15h4" />
      </svg>
    ),
    titulo: "Paga seguro",
    descripcion: "De Una, PayPhone, transferencia bancaria o tarjeta -- tú eliges.",
  },
  {
    icono: (
      <svg {...ATRIBUTOS_ICONO}>
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
      </svg>
    ),
    titulo: "Recibe tu boleto QR",
    descripcion: "Código QR único vinculado a tu cédula, al instante en tu correo.",
  },
];

export function ComoFunciona() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 pt-[30px] md:px-16 md:pt-14">
      <span className="kb-eyebrow">Simple y rápido</span>
      <h2 className="mb-3.5 text-[21px] font-semibold md:mb-[18px] md:text-2xl">Tu pasaje en 4 pasos</h2>
      <div className="flex flex-col gap-2.5 md:grid md:grid-cols-4 md:gap-4">
        {PASOS.map(({ icono, titulo, descripcion }, indice) => (
          <div
            key={titulo}
            className="flex items-start gap-3.5 rounded-[20px] bg-white p-3.5 shadow-[0_2px_12px_rgba(11,13,18,.04)] md:flex-col md:gap-2.5 md:rounded-card md:p-[22px] md:shadow-card"
          >
            <span className="relative grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] bg-kbyellow-soft text-ink md:h-[52px] md:w-[52px] md:rounded-ctrl">
              <i className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] font-semibold not-italic text-kbyellow md:-left-[7px] md:-top-[7px] md:h-6 md:w-6 md:text-xs">
                {indice + 1}
              </i>
              {icono}
            </span>
            <div>
              <p className="text-sm font-semibold md:text-base">{titulo}</p>
              <p className="text-xs text-muted-2 md:text-[13px]">{descripcion}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
