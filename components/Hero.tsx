"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BuscadorForm } from "./BuscadorForm";
import { LogoKlumbus } from "./LogoKlumbus";
import { listarTerminalesAliadas } from "@/lib/api";
import { REFERENCIA, terminalesReales } from "@/lib/portada-datos";
import { BotonBuscarFlotante } from "./BotonBuscarFlotante";
import { MenuSitio } from "./MenuSitio";
import { FOTOS, srcHorizontal, srcVertical } from "@/lib/hero-fotos";


/**
 * Hero de la portada -- rediseño final (oct-2026, /diseno): fondo negro,
 * encabezado negro con el logo de letras blancas, título con la frase
 * resaltada en amarillo y el buscador en tarjeta blanca que se monta
 * sobre el borde inferior del hero. En celular la foto va a sangre
 * detrás del texto; en PC va a la derecha, enmarcada. Se conservan las
 * dos fotos reales con su cambio automático y toda la lógica (sesión,
 * menú móvil y buscador).
 */
export function Hero() {
  const [indiceActivo, setIndiceActivo] = useState(0);
  // La segunda foto se pide recién cuando la página terminó de cargar: así no le quita ancho de banda
  // a la primera (que es lo más grande que se pinta al entrar). El cambio de foto sigue a los 6 s.
  const [segundaLista, setSegundaLista] = useState(false);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;
    const preparar = () => {
      temporizador = setTimeout(() => setSegundaLista(true), 1500);
    };
    if (document.readyState === "complete") preparar();
    else window.addEventListener("load", preparar, { once: true });
    return () => {
      clearTimeout(temporizador);
      window.removeEventListener("load", preparar);
    };
  }, []);
  // El encabezado queda fijo arriba y se vuelve de vidrio oscuro al bajar la página.
  const [conFondo, setConFondo] = useState(false);
  // Nombre real de la terminal aliada (Machala primero), para la insignia del hero.
  const [terminal, setTerminal] = useState<string | null>(null);

  useEffect(() => {
    // Con "reducir movimiento" activado la foto no cambia sola.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!segundaLista) return;
    const temporizador = setInterval(() => {
      setIndiceActivo((i) => (i + 1) % FOTOS.length);
    }, 6000);
    return () => clearInterval(temporizador);
  }, [segundaLista]);

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
                {/* Celular: foto vertical; PC: horizontal. Solo se descarga una de las dos, del tamaño justo. */}
                {(i === 0 || segundaLista) && (
                  <picture>
                    <source
                      media="(min-width: 768px)"
                      type="image/avif"
                      srcSet={srcHorizontal(foto.horizontal, "avif")}
                      sizes="(min-width: 1280px) 560px, 36vw"
                    />
                    <source
                      media="(min-width: 768px)"
                      srcSet={srcHorizontal(foto.horizontal)}
                      sizes="(min-width: 1280px) 560px, 36vw"
                    />
                    <source type="image/avif" srcSet={srcVertical(foto.vertical, "avif")} sizes="100vw" />
                    <img
                      src={`${foto.vertical}-720.webp`}
                      srcSet={srcVertical(foto.vertical)}
                      sizes="100vw"
                      width={720}
                      height={1066}
                      alt={foto.alt}
                      fetchPriority={i === 0 ? "high" : "low"}
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding={i === 0 ? "sync" : "async"}
                      className="h-full w-full object-cover object-[50%_0%] md:object-center"
                    />
                  </picture>
                )}
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
            <Link href="/" aria-label="Klumbus, ir al inicio">
              <LogoKlumbus className="h-6 md:h-8" />
            </Link>
            <MenuSitio />
            </div>
          </header>


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
