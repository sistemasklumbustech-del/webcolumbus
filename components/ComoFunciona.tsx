/**
 * "Cómo funciona" -- versión compacta (oct-2026, prueba de rediseño): 4 pasos con ícono, título y una
 * línea, como en redBus o FlixBus. Antes cada paso llevaba la captura de un teléfono de 505 px de alto,
 * y la sección no cabía en una pantalla de portátil. En celular van en 2 columnas; en PC, en fila.
 *
 * Solo se menciona lo que la compra real hace hoy (los métodos de pago son los del checkout).
 * Las capturas de teléfono siguen en public/img/pasos/ por si se vuelven a usar.
 */
const PARADAS = [
  {
    etiqueta: "Busca",
    titulo: "Compara horarios y precios",
    descripcion: "Todas las cooperativas de tu ruta en una sola lista.",
    icono: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M20 20l-4.2-4.2" />
      </>
    ),
  },
  {
    etiqueta: "Elige",
    titulo: "Escoge tu asiento",
    descripcion: "Ves el bus por dentro y eliges ventana o pasillo.",
    icono: <path d="M6 4h12a2 2 0 0 1 2 2v9H4V6a2 2 0 0 1 2-2zM4 11h16M7 19v-4M17 19v-4" />,
  },
  {
    etiqueta: "Paga",
    titulo: "Paga como prefieras",
    descripcion: "Tarjeta, DeUna, PayPhone o transferencia.",
    icono: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2.5" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
  },
  {
    etiqueta: "Viaja",
    titulo: "Muestra tu QR y sube",
    descripcion: "Tu boleto llega al instante. Nada que imprimir.",
    icono: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h1M18 14h2" />
      </>
    ),
  },
];

export function ComoFunciona() {
  return (
    <section id="como" className="mx-auto max-w-[1280px] scroll-mt-20 px-5 pt-[30px] md:px-16 md:pt-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-6">
        <div>
          <span className="kb-eyebrow-barra">Cómo funciona</span>
          <h2 className="text-[24px] font-bold leading-[1.1] tracking-[-0.025em] md:text-[32px]">
            Tu boleto en <em className="kb-marca">minutos</em>, desde tu celular.
          </h2>
        </div>
        <p className="max-w-[40ch] text-sm text-muted-2">Cuatro pasos y llegas al andén con tu boleto en el bolsillo.</p>
      </div>

      <ol className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {PARADAS.map((p, i) => {
          const ultima = i === PARADAS.length - 1;
          return (
            <li key={p.etiqueta} className="kb-card flex flex-col gap-3 !p-4 md:!p-6">
              <div className="flex items-center justify-between">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-ctrl md:h-12 md:w-12 ${ultima ? "bg-kbyellow text-ink" : "bg-ink text-kbyellow"}`}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {p.icono}
                  </svg>
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-2">
                  {i + 1} · {p.etiqueta}
                </span>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] md:text-lg">{p.titulo}</h3>
                <p className="mt-1 text-[13px] text-muted-2 md:text-sm">{p.descripcion}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
