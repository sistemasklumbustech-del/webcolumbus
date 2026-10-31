import Link from "next/link";
import { LogoKlumbus } from "./LogoKlumbus";

/**
 * Ingresar y Crear cuenta -- pantalla dividida (prueba de rediseño, 28-oct-2026; estándar de
 * Airbnb/Booking/FlixBus):
 * - PC: a la izquierda la foto a todo lo alto (fija al bajar), con el logo y la frase encima; a la
 *   derecha el formulario centrado, con las pestañas "Iniciar sesión | Crear cuenta".
 * - Celular: una franja de foto arriba (la pasajera con su boleto) y el formulario debajo.
 * - Sin el menú ni el pie de página del sitio (ver HeaderPublico y Footer): solo el logo y
 *   "Volver al inicio".
 * Las pestañas son enlaces a /ingresar y /registro (mismas rutas de siempre) y conservan "volverA".
 */
const FOTO = {
  alt: "Pasajera mostrando su boleto digital de Klumbus junto al bus",
};
const srcFoto = (ext: string) =>
  [480, 800, 1200].map((w) => `/img/acceso/acceso-pasajera-${w}.${ext} ${w}w`).join(", ");

function Volver() {
  return (
    <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ondark transition hover:text-white">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </svg>
      Volver al inicio
    </Link>
  );
}

export function AccesoLayout({
  titulo,
  destacado,
  puntos,
  pestana,
  volverA,
  children,
}: {
  titulo: string;
  destacado: string;
  puntos: readonly string[];
  /** Sin pestañas (null) en recuperar/restablecer contraseña y verificar o cambiar correo. */
  pestana: "ingresar" | "registro" | null;
  volverA?: string | null;
  children: React.ReactNode;
}) {
  const sufijo = volverA ? `?volverA=${encodeURIComponent(volverA)}` : "";
  const clasePestana = (activa: boolean) =>
    `flex h-11 flex-1 items-center justify-center rounded-[12px] text-sm font-semibold transition ${
      activa ? "bg-kbyellow text-ink" : "text-ondark hover:text-white"
    }`;

  return (
    <main className="flex-1 bg-ink text-white md:grid md:min-h-screen md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Foto: franja arriba en celular; a todo lo alto y fija en PC. */}
      <div className="relative h-[260px] overflow-hidden md:sticky md:top-0 md:h-screen">
        {/* Foto en tamaños hechos de antemano (navegacion-rapida): no espera a que el servidor la convierta. */}
        <picture>
          <source type="image/avif" srcSet={srcFoto("avif")} sizes="(min-width: 768px) 55vw, 100vw" />
          <img
            src="/img/acceso/acceso-pasajera-800.webp"
            srcSet={srcFoto("webp")}
            sizes="(min-width: 768px) 55vw, 100vw"
            alt={FOTO.alt}
            width={800}
            height={1067}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[30%_42%] md:object-[35%_50%]"
          />
        </picture>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,18,.55)_0%,rgba(11,13,18,0)_30%,rgba(11,13,18,0)_50%,rgba(11,13,18,.92)_100%)]" />
        <Link href="/" className="absolute left-5 top-5 md:left-10 md:top-9" aria-label="Klumbus, ir al inicio">
          <LogoKlumbus className="h-6 md:h-8" />
        </Link>
        <div className="absolute inset-x-10 bottom-10 hidden md:block">
          <p className="max-w-[18ch] text-[34px] font-semibold leading-[1.12] tracking-[-0.02em] xl:text-[40px]">
            {titulo} <span className="text-kbyellow">{destacado}</span>
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-[22px] gap-y-2 text-sm text-white/85">
            {puntos.map((punto) => (
              <li key={punto} className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDD514" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
                {punto}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Formulario */}
      <div className="kb-dark relative -mt-7 flex flex-col rounded-t-[28px] bg-ink px-5 pb-10 pt-6 md:mt-0 md:rounded-none md:px-12 md:py-8 lg:px-16">
        <div className="hidden justify-end md:flex">
          <Volver />
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col md:pt-[6vh]">
          {pestana && (
          <nav aria-label="Iniciar sesión o crear cuenta" className="mb-6 flex gap-1 rounded-[16px] bg-ink-2 p-1 shadow-[inset_0_0_0_1px_#262A35]">
            <Link href={`/ingresar${sufijo}`} aria-current={pestana === "ingresar" ? "page" : undefined} className={clasePestana(pestana === "ingresar")}>
              Iniciar sesión
            </Link>
            <Link href={`/registro${sufijo}`} aria-current={pestana === "registro" ? "page" : undefined} className={clasePestana(pestana === "registro")}>
              Crear cuenta
            </Link>
          </nav>
          )}
          {children}
        </div>
        <div className="mt-6 flex justify-center md:hidden">
          <Volver />
        </div>
      </div>
    </main>
  );
}

/** Tarjeta oscura centrada, para los pasos de verificación en dos pasos y recuperación. */
export function TarjetaAccesoCentrada({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-1 flex-col bg-ink px-5 py-6 text-white md:px-10">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="Klumbus, ir al inicio">
          <LogoKlumbus className="h-6 md:h-8" />
        </Link>
        <Volver />
      </div>
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="kb-dark w-full max-w-md rounded-[32px] bg-[#12151C] p-7 shadow-[inset_0_0_0_1px_#262A35] md:p-10">{children}</div>
      </div>
    </main>
  );
}

type IconoEstado = "correo" | "candado" | "ok" | "alerta" | "cargando";

/**
 * Cabecera de las pantallas de cuenta (rediseño, 30-oct-2026): ícono de estado en un círculo, título
 * y texto corto. Mismo lenguaje que Ingresar.
 */
export function EstadoAcceso({ icono, titulo, children }: { icono: IconoEstado; titulo: string; children?: React.ReactNode }) {
  const tono =
    icono === "ok" ? "bg-ok/15 text-[#5FD39A]" : icono === "alerta" ? "bg-kberror/15 text-[#FF9B9B]" : "bg-kbyellow/15 text-kbyellow";
  return (
    <div className="mb-6">
      <span className={`grid h-14 w-14 place-items-center rounded-full ${tono}`} aria-hidden="true">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={icono === "cargando" ? "animate-spin motion-reduce:animate-none" : ""}
        >
          {icono === "correo" && (
            <>
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="M3.5 7l8.5 6 8.5-6" />
            </>
          )}
          {icono === "candado" && (
            <>
              <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
              <path d="M8 10.5V7.5a4 4 0 018 0v3M12 14.5v2.5" />
            </>
          )}
          {icono === "ok" && <path d="M5 12.5l4.5 4.5L19 7.5" />}
          {icono === "alerta" && (
            <>
              <path d="M12 3.5l9.5 16.5h-19z" />
              <path d="M12 10v4.5M12 17.5h.01" />
            </>
          )}
          {icono === "cargando" && <path d="M12 3a9 9 0 109 9" />}
        </svg>
      </span>
      <h1 className="mt-5 text-[26px] font-semibold leading-tight md:text-[30px]">{titulo}</h1>
      {children && <div className="mt-2 text-sm leading-relaxed text-ondark">{children}</div>}
    </div>
  );
}
