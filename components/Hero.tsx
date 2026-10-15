"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BuscadorForm } from "./BuscadorForm";
import { LogoKlumbus } from "./LogoKlumbus";
import { obtenerToken, decodificarToken, tokenExpirado, type PayloadToken } from "@/lib/auth";

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
const FOTOS = ["/img/hero-1.jpg", "/img/hero-2.jpg"];

export function Hero() {
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);
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
    const temporizador = setInterval(() => {
      setIndiceActivo((i) => (i + 1) % FOTOS.length);
    }, 5000);
    return () => clearInterval(temporizador);
  }, []);

  const hrefCuenta = payload ? RUTA_POR_ROL[payload.rol] : "/ingresar";
  const textoCuenta = payload ? "Mi cuenta" : "Iniciar sesión";

  return (
    <section>
      <div className="relative h-[560px] overflow-hidden bg-ink text-white md:bg-[radial-gradient(90%_120%_at_80%_30%,#1D212B_0%,#0B0D12_60%)]">
        <div className="relative mx-auto h-full max-w-[1280px]">
          {/* Foto: a sangre en celular, enmarcada a la derecha en PC. */}
          <div className="absolute inset-0 overflow-hidden md:inset-auto md:right-16 md:top-[120px] md:h-[400px] md:w-[36%] xl:w-[540px] md:rounded-[32px] md:shadow-[0_30px_60px_rgba(0,0,0,.45)]">
            {FOTOS.map((foto, i) => (
              <div
                key={foto}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  i === indiceActivo ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden={i !== indiceActivo}
              >
                <Image
                  src={foto}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1280px) 540px, (min-width: 768px) 36vw, 100vw"
                  className="object-cover object-[50%_35%] md:object-[50%_40%]"
                />
              </div>
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,18,.8)_0%,rgba(11,13,18,.15)_30%,rgba(11,13,18,.35)_55%,#0B0D12_92%)] md:hidden" />
            <div className="absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(11,13,18,0)_60%,rgba(11,13,18,.55))] md:block" />

            {/* Indicadores del slider -- confirman que hay más de una foto,
                sin depender de flechas de navegación manual. */}
            <div className="absolute right-5 top-[76px] z-10 flex gap-1.5 md:bottom-4 md:right-4 md:top-auto">
              {FOTOS.map((foto, i) => (
                <span
                  key={foto}
                  className={`h-[3px] w-6 rounded-full transition-colors ${
                    i === indiceActivo ? "bg-kbyellow" : "bg-white/35"
                  }`}
                />
              ))}
            </div>
          </div>

          <header className="absolute inset-x-0 top-0 z-20 flex h-16 items-center justify-between px-5 md:h-[76px] md:px-16">
            <LogoKlumbus className="h-6 md:h-8" />
            <nav className="flex items-center gap-2 md:gap-[34px]">
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
                className="rounded-xl bg-kbyellow px-3.5 py-[9px] text-[13px] font-semibold text-ink md:flex md:h-11 md:items-center md:rounded-tab md:px-[18px] md:py-0 md:text-sm"
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
          </header>

          {menuAbierto && (
            <nav className="absolute left-5 right-5 top-[68px] z-30 flex flex-col gap-1 rounded-card bg-ink-2 p-3 shadow-float md:hidden">
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

          <div className="absolute bottom-[120px] left-5 right-5 z-10 flex flex-col gap-2.5 md:bottom-auto md:left-16 md:right-auto md:top-[156px] md:max-w-[40%] md:gap-[18px] xl:max-w-[640px]">
            <span className="hidden items-center gap-2 self-start rounded-full bg-kbyellow/15 px-3.5 py-1.5 text-[13px] font-semibold text-kbyellow md:inline-flex">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
              Cooperativas oficiales de Ecuador
            </span>
            <h1 className="text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] md:text-[34px] md:leading-[1.1] lg:text-[38px] xl:text-[54px] xl:leading-[1.08]">
              Tu pasaje de bus, <span className="text-kbyellow">sin filas ni papeleo</span>
            </h1>
            <p className="text-sm text-ondark md:max-w-[48ch] md:text-[17px]">
              Compara horarios y precios de todas las cooperativas de una ruta, elige tu asiento y recibe tu boleto
              digital con QR al instante.
            </p>
          </div>
        </div>
      </div>

      {/* El buscador se monta sobre el borde inferior del hero (tarjeta blanca flotante). */}
      <div className="relative z-10 mx-auto -mt-24 max-w-[1280px] px-4 md:-mt-[110px] md:px-16">
        <BuscadorForm />
      </div>
    </section>
  );
}
