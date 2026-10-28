/**
 * Franja "La app de Klumbus llega pronto" (portada nueva, oct-2026), justo antes del pie. Las
 * insignias de tienda son informativas (aún no hay enlaces de descarga): cuando la app esté
 * publicada, se les pone su enlace y el texto "Próximamente en" pasa a "Descárgala en".
 */
export function AppProximamente() {
  return (
    <section aria-label="Aplicación móvil" className="bg-ink px-5 pb-0 pt-10 text-white md:px-16 md:pt-12">
      <div className="relative mx-auto grid max-w-[1280px] gap-[18px] overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#171A22,#11141a)] p-[26px_22px] shadow-[inset_0_0_0_1px_#262A35] md:grid-cols-[1fr_auto] md:items-center md:px-[34px] md:py-[30px]">
        <span aria-hidden="true" className="pointer-events-none absolute -right-[60px] -top-[60px] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,rgba(253,213,20,.22),transparent_70%)]" />
        <div className="relative">
          <h3 className="text-2xl font-bold leading-[1.15] tracking-[-0.02em]">
            La app de Klumbus <em className="not-italic text-kbyellow">llega pronto.</em>
          </h3>
          <p className="mt-1.5 text-sm text-ondark">Tus boletos, tus viajes y avisos de salida, en tu bolsillo.</p>
        </div>
        <div className="relative flex flex-wrap gap-2.5">
          <span className="inline-flex h-[52px] items-center gap-2.5 rounded-[14px] bg-white px-4 text-ink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#0B0D12" aria-hidden="true">
              <path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3.1-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3.1.7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.7zM14.2 5.5c.6-.8 1.1-1.8 1-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z" />
            </svg>
            <span>
              <small className="block text-[10px] leading-none text-muted-2">Próximamente en</small>
              <b className="block text-[15px] leading-[1.2]">App Store</b>
            </span>
          </span>
          <span className="inline-flex h-[52px] items-center gap-2.5 rounded-[14px] bg-white px-4 text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#0B0D12" d="M4 2.8v18.4c0 .5.5.8.9.6L20 13c.5-.3.5-1 0-1.3L4.9 2.2c-.4-.2-.9.1-.9.6z" />
              <path fill="#FDD514" d="M4.3 2.4l9.8 9.6-9.8 9.6" />
            </svg>
            <span>
              <small className="block text-[10px] leading-none text-muted-2">Próximamente en</small>
              <b className="block text-[15px] leading-[1.2]">Google Play</b>
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
