"use client";

import { useEffect, useState } from "react";
import { BuscadorForm } from "./BuscadorForm";
import { LogoKlumbus } from "./LogoKlumbus";
import { obtenerToken, decodificarToken, tokenExpirado, type PayloadToken } from "@/lib/auth";
import { listarTerminalesAliadas } from "@/lib/api";
import { REFERENCIA, terminalesReales } from "@/lib/portada-datos";
import { BotonBuscarFlotante } from "./BotonBuscarFlotante";

// Mismo mapeo real que ya usa HeaderPublico -- corrige un bug real
// del director (18-ago-2026): el arreglo anterior mandaba a "Mi
// cuenta" siempre a /perfil, sin importar el rol, y eso enviaba a un
// super_admin al perfil de pasajero en vez de a /admin.
const RUTA_POR_ROL: Record<PayloadToken["rol"], string> = {
  admin_plataforma: "/admin",
  super_admin: "/admin",
  admin_cooperativa: "/panel-empresa",
  vendedor: "/panel-empresa",
  pasajero: "/perfil",
};

/**
 * Hero de la portada -- rediseño final (oct-2026, /diseno): fondo negro,
 * encabezado negro con el logo de letras blancas, título con la frase
 * resaltada en amarillo y el buscador en tarjeta blanca que se monta
 * sobre el borde inferior del hero. En celular la foto va a sangre
 * detrás del texto; en PC va a la derecha, enmarcada. Se conservan las
 * dos fotos reales con su cambio automático y toda la lógica (sesión,
 * menú móvil y buscador).
 */
const FOTOS = [
  {
    vertical: "/img/hero-tarde-v.webp",
    horizontal: "/img/hero-tarde-h.webp",
    alt: "Bus de dos pisos de Klumbus en la terminal al atardecer",
  },
  {
    vertical: "/img/hero-noche-v.webp",
    horizontal: "/img/hero-noche-h.webp",
    alt: "Bus de Klumbus de frente, de noche, en el andén",
  },
];

export function Hero() {
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);
  // El encabezado queda fijo arriba y se vuelve de vidrio oscuro al bajar la página.
  const [conFondo, setConFondo] = useState(false);
  // Nombre real de la terminal aliada (Machala primero), para la insignia del hero.
  const [terminal, setTerminal] = useState<string | null>(null);
  // Bug real encontrado por el director (17-ago-2026): el Hero nunca
  // revisaba la sesion -- mostraba "Iniciar sesion" fijo incluso ya
  // conectado. Mismo patron real que ya usa HeaderPublico.
  const [payload, setPayload] = useState<PayloadToken | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    const datos = decodificarToken(token);
    if (datos && !tokenExpirado(datos)) setPayload(datos);
  }, []);

  useEffect(() => {
    // Con "reducir movimiento" activado la foto no cambia sola.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const temporizador = setInterval(() => {
      setIndiceActivo((i) => (i + 1) % FOTOS.length);
    }, 6000);
    return () => clearInterval(temporizador);
  }, []);

  useEffect(() => {
    function alDesplazar() {
      setConFondo(window.scrollY > 24);
    }
    alDesplazar();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  useEffect(() => {
    // Nombre real de la terminal aliada (Machala primero); si el API aún no tiene una real
    // (sin contar las de prueba), se usa la terminal de referencia de la portada.
    listarTerminalesAliadas().then((lista) => {
      const reales = terminalesReales(lista);
      const machala = reales.find((t) => /machala/i.test(t.ciudad) || /machala/i.test(t.nombre));
      setTerminal((machala ?? reales[0])?.nombre ?? REFERENCIA.terminal.nombre);
    });
  }, []);

  const hrefCuenta = payload ? RUTA_POR_ROL[payload.rol] : "/ingresar";
  const textoCuenta = payload ? "Mi cuenta" : "Iniciar sesión";

  return (
    <section>
      <div className="relative h-[500px] overflow-hidden md:h-[500px] bg-ink text-white md:bg-[radial-gradient(90%_120%_at_80%_30%,#1D212B_0%,#0B0D12_60%)]">
        <div className="relative mx-auto h-full max-w-[1280px]">
          {/* Foto: a sangre en celular, enmarcada a la derecha en PC. */}
          <div className="absolute inset-0 overflow-hidden md:inset-auto md:right-16 md:top-[100px] md:h-[290px] md:w-[36%] xl:w-[560px] md:rounded-[32px] md:shadow-[0_30px_60px_rgba(0,0,0,.45)]">
            {FOTOS.map((foto, i) => (
              <div
                key={foto.vertical}
                className={`absolute inset-0 transition-opacity duration-[1200ms] ${
                  i === indiceActivo ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden={i !== indiceActivo}
              >
                {/* Celular: foto vertical; PC: horizontal. Solo se descarga una de las dos. */}
                <picture>
                  <source media="(min-width: 768px)" srcSet={foto.horizontal} />
                  <img
                    src={foto.vertical}
                    alt={foto.alt}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    loading={i === 0 ? "eager" : "lazy"}
                    className="h-full w-full object-cover object-[50%_0%] md:object-center"
                  />
                </picture>
              </div>
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,18,.8)_0%,rgba(11,13,18,.15)_30%,rgba(11,13,18,.35)_55%,#0B0D12_92%)] md:hidden" />
            <div className="absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(11,13,18,0)_60%,rgba(11,13,18,.55))] md:block" />

            {/* Indicadores del slider -- confirman que hay más de una foto,
                sin depender de flechas de navegación manual. */}
            <div className="absolute right-5 top-[76px] z-10 flex gap-1.5 md:bottom-4 md:right-4 md:top-auto">
              {FOTOS.map((foto, i) => (
                <span
                  key={foto.vertical}
                  className={`h-[3px] w-6 rounded-full transition-colors ${
                    i === indiceActivo ? "bg-kbyellow" : "bg-white/35"
                  }`}
                />
              ))}
            </div>
          </div>

          <header
            className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
              conFondo ? "bg-ink shadow-[0_1px_0_#262A35]" : "bg-transparent"
            }`}
          >
            <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:h-[76px] md:px-16">
            <LogoKlumbus className="h-6 md:h-8" />
            <nav className="flex items-center gap-2 md:gap-[34px]">
              <a href="#destinos" className="hidden text-sm font-medium text-ondark hover:text-white md:block">
                Destinos
              </a>
              <a href="#como" className="hidden text-sm font-medium text-ondark hover:text-white md:block">
                Cómo funciona
              </a>
              <a href="/rutas" className="hidden text-sm font-medium text-ondark hover:text-white md:block">
                Rutas
              </a>
              <a href="/cooperativas" className="hidden text-sm font-medium text-ondark hover:text-white md:block">
                Cooperativas
              </a>
              <a href="/ayuda" className="hidden text-sm font-medium text-ondark hover:text-white md:block">
                Ayuda
              </a>
              <a
                href={hrefCuenta}
                className="kb-btn-sesion"
              >
                {textoCuenta}
              </a>

              {/* Hallazgo real del director (17-ago-2026): en celular el
                  menú completo estaba oculto SIN ningún reemplazo -- no
                  existía ninguna forma de llegar a Rutas, Cooperativas o
                  Ayuda desde la portada en un teléfono real. Botón de
                  hamburguesa, visible solo en celular. */}
              <button
                type="button"
                onClick={() => setMenuAbierto((a) => !a)}
                aria-expanded={menuAbierto}
                aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/12 text-white md:hidden"
              >
                {menuAbierto ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </nav>
            </div>
          </header>

          {menuAbierto && (
            <nav className="fixed left-5 right-5 top-[68px] z-50 flex flex-col gap-1 rounded-card bg-ink-2 p-3 shadow-float md:hidden">
              <a href="#destinos" onClick={() => setMenuAbierto(false)} className="rounded-xl px-3 py-3 text-sm font-medium text-ondark hover:bg-ink-3 hover:text-white">
                Destinos
              </a>
              <a href="#como" onClick={() => setMenuAbierto(false)} className="rounded-xl px-3 py-3 text-sm font-medium text-ondark hover:bg-ink-3 hover:text-white">
                Cómo funciona
              </a>
              <a href="/rutas" className="rounded-xl px-3 py-3 text-sm font-medium text-ondark hover:bg-ink-3 hover:text-white">
                Rutas
              </a>
              <a href="/cooperativas" className="rounded-xl px-3 py-3 text-sm font-medium text-ondark hover:bg-ink-3 hover:text-white">
                Cooperativas
              </a>
              <a href="/ayuda" className="rounded-xl px-3 py-3 text-sm font-medium text-ondark hover:bg-ink-3 hover:text-white">
                Ayuda
              </a>
            </nav>
          )}

          <div className="absolute bottom-[120px] left-5 right-5 z-10 flex flex-col gap-2.5 md:bottom-auto md:left-16 md:right-auto md:top-[104px] md:max-w-[40%] md:gap-3.5 xl:max-w-[640px]">
            <div className="hidden flex-wrap items-center gap-2 md:flex">
              <span className="inline-flex items-center gap-2 rounded-full bg-kbyellow/15 px-3.5 py-1.5 text-[13px] font-semibold text-kbyellow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
                Cooperativas oficiales de Ecuador
              </span>
              {terminal && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-white">
                  <span className="h-[7px] w-[7px] rounded-full bg-kbyellow shadow-[0_0_0_4px_rgba(253,213,20,.25)]" aria-hidden="true" />
                  Terminal aliada · {terminal}
                </span>
              )}
            </div>
            <h1 className="text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] md:text-[34px] md:leading-[1.1] lg:text-[38px] xl:text-[42px] xl:leading-[1.08]">
              Tu pasaje de bus, <span className="text-kbyellow">sin filas ni papeleo</span>
            </h1>
            <p className="text-sm text-ondark md:max-w-[48ch] md:text-base">
              Compara horarios y precios de todas las cooperativas de una ruta, elige tu asiento y recibe tu boleto
              digital con QR al instante.
            </p>
          </div>
        </div>
      </div>

      {/* El buscador se monta sobre el borde inferior del hero (tarjeta blanca flotante). */}
      <div id="buscar" className="relative z-10 mx-auto -mt-24 max-w-[1280px] scroll-mt-24 px-4 md:-mt-[110px] md:px-16">
        <BuscadorForm />
      </div>
      <BotonBuscarFlotante objetivoId="buscar" />
    </section>
  );
}
