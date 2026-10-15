import Image from "next/image";

/**
 * Pantallas de Ingresar y Crear cuenta (diseño final): fondo negro y formulario en tarjeta oscura.
 * En PC, a la izquierda va el título, los beneficios y la foto del bus completa, sin recortar.
 * En celular, la foto va arriba y el formulario sube sobre ella.
 */
export function AccesoLayout({
  titulo,
  destacado,
  puntos,
  children,
}: {
  titulo: string;
  destacado: string;
  puntos: string[];
  children: React.ReactNode;
}) {
  return (
    <main className="-mb-8 flex-1 bg-ink pb-8 text-white md:-mb-[72px] md:pb-[72px] md:bg-[radial-gradient(80%_90%_at_20%_30%,#1D212B_0%,#0B0D12_65%)]">
      <div className="mx-auto max-w-[1280px] md:grid md:min-h-[780px] md:grid-cols-[minmax(0,1fr)_500px] md:items-center md:gap-16 md:px-16 md:py-12">
        <div className="relative h-[330px] md:flex md:h-auto md:flex-col md:gap-[22px]">
          <h2 className="hidden max-w-[16ch] text-[40px] font-semibold leading-[1.12] tracking-[-0.02em] md:block">
            {titulo} <span className="text-kbyellow">{destacado}</span>
          </h2>
          <ul className="hidden flex-wrap gap-x-[22px] gap-y-2 text-sm text-ondark md:flex">
            {puntos.map((punto) => (
              <li key={punto} className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDD514" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
                {punto}
              </li>
            ))}
          </ul>
          {/* Celular: foto a sangre arriba. */}
          <Image
            src="/img/bus-frente.jpg"
            alt="Bus Klumbus de frente en la terminal"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_45%] md:hidden"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,18,.35),rgba(11,13,18,0)_40%,rgba(11,13,18,.6))] md:hidden" />
          {/* PC: bus completo, sin recortar. */}
          <Image
            src="/img/bus-completo.jpg"
            alt="Bus Klumbus completo en la terminal"
            width={1400}
            height={788}
            priority
            sizes="560px"
            className="mt-4 hidden h-auto w-full max-w-[560px] rounded-[28px] shadow-[0_30px_60px_rgba(0,0,0,.45)] md:block"
          />
        </div>

        <div className="kb-dark relative -mt-10 rounded-t-[32px] bg-ink px-6 pb-9 pt-7 md:mt-0 md:rounded-[32px] md:bg-[#12151C] md:p-10 md:shadow-[inset_0_0_0_1px_#262A35,0_30px_60px_rgba(0,0,0,.35)]">
          {children}
        </div>
      </div>
    </main>
  );
}

/** Tarjeta oscura centrada, para los pasos de verificación en dos pasos y recuperación. */
export function TarjetaAccesoCentrada({ children }: { children: React.ReactNode }) {
  return (
    <main className="-mb-8 flex flex-1 items-center justify-center bg-ink px-5 pb-[72px] pt-10 text-white md:-mb-[72px] md:pb-[136px] md:pt-16">
      <div className="kb-dark w-full max-w-md rounded-[32px] bg-[#12151C] p-7 shadow-[inset_0_0_0_1px_#262A35] md:p-10">{children}</div>
    </main>
  );
}
