import Image from "next/image";

/**
 * "Cómo funciona" -- portada nueva (oct-2026): un recorrido de 4 paradas unidas por una línea
 * punteada, cada una con la pantalla del teléfono que corresponde (resultados, asientos, pago y
 * boleto). En celular se desliza de lado; en PC se ven las 4 en fila.
 *
 * Historia del contenido (se conserva por el criterio): el resumen visual corto de pasos nació en
 * la investigación comparativa de portadas del 19-ago-2026 (redBus/FlixBus), y se verificó contra
 * el sistema real -- solo se menciona lo que la plataforma hace de verdad (métodos de pago reales,
 * boleto QR). Las capturas de los teléfonos vienen de la maqueta de diseño; se pueden reemplazar
 * por capturas reales de la plataforma poniendo otro archivo en public/img/pasos/.
 */
const PARADAS = [
  {
    etiqueta: "Busca",
    titulo: "Compara horarios y precios",
    descripcion: "Todas las cooperativas de tu ruta en una sola lista.",
    imagen: "/img/pasos/paso-1.webp",
    alt: "Pantalla de resultados con horarios y precios de varias cooperativas",
  },
  {
    etiqueta: "Elige",
    titulo: "Escoge tu asiento",
    descripcion: "Ves el bus por dentro y eliges ventana o pasillo.",
    imagen: "/img/pasos/paso-2.webp",
    alt: "Mapa de asientos del bus de dos pisos",
  },
  {
    etiqueta: "Paga",
    titulo: "Paga como prefieras",
    descripcion: "DeUna, PayPhone, tarjeta o transferencia.",
    imagen: "/img/pasos/paso-3.webp",
    alt: "Pantalla de pago con DeUna, tarjeta y PayPhone",
  },
  {
    etiqueta: "Viaja",
    titulo: "Muestra tu QR y sube",
    descripcion: "Tu boleto llega al instante. Nada que imprimir.",
    imagen: "/img/pasos/paso-4.webp",
    alt: "Boleto digital con código QR",
  },
];

export function ComoFunciona() {
  return (
    <section id="como" className="mx-auto max-w-[1280px] scroll-mt-20 px-5 pt-[30px] md:px-16 md:pt-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="kb-eyebrow-barra">Cómo funciona</span>
          <h2 className="text-[27px] font-bold leading-[1.1] tracking-[-0.025em] md:text-[40px]">
            Tu boleto en <em className="kb-marca">minutos</em>,
            <br />
            desde tu celular.
          </h2>
        </div>
        <p className="max-w-[40ch] text-sm text-muted-2">Cuatro paradas y llegas al andén con tu boleto en el bolsillo.</p>
      </div>

      <ol className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 pt-1.5 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:grid md:snap-none md:grid-cols-4 md:gap-7 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
        {PARADAS.map((p, i) => {
          const ultima = i === PARADAS.length - 1;
          return (
            <li key={p.etiqueta} className="flex w-[78%] shrink-0 snap-start flex-col gap-3.5 md:w-auto">
              <div className="relative flex items-center gap-2.5">
                <span
                  className={`relative z-10 grid h-9 w-9 place-items-center rounded-full text-sm font-bold shadow-[0_0_0_6px_#F5F6F8] ${
                    ultima ? "bg-kbyellow text-ink" : "bg-ink text-kbyellow"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="relative z-10 bg-kbbg pr-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-2">
                  {p.etiqueta}
                </span>
                {/* Línea punteada hasta la siguiente parada. */}
                {!ultima && (
                  <span className="absolute left-11 right-[-16px] top-1/2 border-t-[2.5px] border-dashed border-line-2 md:right-[-28px]" aria-hidden="true" />
                )}
              </div>
              <div className="mx-auto aspect-[390/844] max-h-[520px] w-full max-w-[250px] rounded-[34px] bg-ink p-[7px] shadow-[0_24px_50px_rgba(11,13,18,.18)] md:max-w-[240px]">
                <Image
                  src={p.imagen}
                  alt={p.alt}
                  width={390}
                  height={844}
                  loading="lazy"
                  className="h-full w-full rounded-[28px] object-cover object-top"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.01em]">{p.titulo}</h3>
                <p className="mt-1 text-sm text-muted-2">{p.descripcion}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
