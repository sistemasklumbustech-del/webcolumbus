"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { borrarToken, decodificarToken, obtenerToken, tokenExpirado, type PayloadToken } from "@/lib/auth";

/**
 * Menú único del sitio (aprobado por el director, 28-oct-2026). Lo usan la portada (Hero) y el
 * encabezado de las demás páginas (HeaderPublico), para que sea igual en todas partes:
 *   Rutas · Cooperativas · Mis boletos · Ayuda  +  "Iniciar sesión" (o "Mi cuenta" con sesión).
 * - El logo lleva al inicio; no hay enlace "Inicio".
 * - El enlace de la página actual se marca en blanco con una línea debajo (sin relleno amarillo).
 * - Celular: los mismos enlaces, en el mismo orden, dentro del menú de las tres rayitas.
 * - "Mis boletos" sin sesión pasa por Iniciar sesión y vuelve (lo hace la propia página).
 * - "Destinos", "Cómo funciona" y "Anuncia con nosotros" viven solo en el pie de página.
 */
export const ENLACES_MENU = [
  { href: "/rutas", texto: "Rutas" },
  { href: "/cooperativas", texto: "Cooperativas" },
  { href: "/mis-boletos", texto: "Mis boletos" },
  { href: "/ayuda", texto: "Ayuda" },
] as const;

const RUTA_CUENTA: Record<PayloadToken["rol"], string> = {
  admin_plataforma: "/admin",
  super_admin: "/admin",
  admin_cooperativa: "/panel-empresa",
  vendedor: "/panel-empresa",
  pasajero: "/perfil",
};

function esActual(pathname: string, href: string, pestana: string | null) {
  // /mis-boletos redirige a /perfil?tab=boletos: ahí también se marca "Mis boletos".
  if (href === "/mis-boletos") return pathname === "/mis-boletos" || (pathname === "/perfil" && pestana === "boletos");
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = { ocultarEnlaces?: boolean; extraSinSesion?: React.ReactNode };

/** useSearchParams exige un Suspense; mientras tanto se pinta el mismo menú sin leer la pestaña. */
export function MenuSitio(props: Props) {
  return (
    <Suspense fallback={<MenuBase {...props} pestana={null} />}>
      <MenuConPestana {...props} />
    </Suspense>
  );
}

function MenuConPestana(props: Props) {
  return <MenuBase {...props} pestana={useSearchParams().get("tab")} />;
}

function MenuBase({ ocultarEnlaces = false, extraSinSesion, pestana }: Props & { pestana: string | null }) {
  const pathname = usePathname();
  const [payload, setPayload] = useState<PayloadToken | null>(null);
  const [abierto, setAbierto] = useState(false);
  const botonMenu = useRef<HTMLButtonElement>(null);
  const panelMenu = useRef<HTMLElement>(null);

  useEffect(() => {
    const token = obtenerToken();
    const datos = token ? decodificarToken(token) : null;
    setPayload(datos && !tokenExpirado(datos) ? datos : null);
    setAbierto(false);
  }, [pathname]);

  // Se cierra con Esc o tocando fuera del menú; al cerrarse, el foco vuelve al botón de las tres rayitas.
  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => {
      setAbierto(false);
      botonMenu.current?.focus();
    };
    const alEscape = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    const alTocarFuera = (e: PointerEvent) => {
      const objetivo = e.target as Node;
      if (panelMenu.current?.contains(objetivo) || botonMenu.current?.contains(objetivo)) return;
      setAbierto(false);
      // El navegador mueve el foco al terminar el toque; se devuelve al botón después de ese paso.
      const devolverFoco = () => botonMenu.current?.focus();
      document.addEventListener("click", devolverFoco, { once: true, capture: false });
      window.setTimeout(() => document.removeEventListener("click", devolverFoco), 1000);
    };
    window.addEventListener("keydown", alEscape);
    document.addEventListener("pointerdown", alTocarFuera);
    return () => {
      window.removeEventListener("keydown", alEscape);
      document.removeEventListener("pointerdown", alTocarFuera);
    };
  }, [abierto]);

  function salir() {
    borrarToken();
    setPayload(null);
    window.location.href = "/";
  }

  const cuenta = payload ? { href: RUTA_CUENTA[payload.rol], texto: "Mi cuenta" } : { href: "/ingresar", texto: "Iniciar sesión" };

  return (
    <div className="flex items-center gap-2.5 md:gap-[34px]">
      {!ocultarEnlaces && (
        <nav aria-label="Menú principal" className="hidden items-center gap-[30px] md:flex">
          {ENLACES_MENU.map((e) => {
            const actual = esActual(pathname, e.href, pestana);
            return (
              <Link
                key={e.href}
                href={e.href}
                aria-current={actual ? "page" : undefined}
                className={`relative whitespace-nowrap py-1 text-sm font-medium transition hover:text-white ${
                  actual ? "text-white after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-white" : "text-ondark"
                }`}
              >
                {e.texto}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="flex items-center gap-2.5">
        <Link href={cuenta.href} className="kb-btn-sesion">
          {cuenta.texto}
        </Link>
        {payload ? (
          <button type="button" onClick={salir} className="hidden whitespace-nowrap px-1 text-sm font-medium text-ondark transition hover:text-white md:block">
            Salir
          </button>
        ) : (
          extraSinSesion
        )}
      </div>

      {!ocultarEnlaces && (
        <>
          <button
            ref={botonMenu}
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
            aria-controls="menu-celular"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
              {abierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>

          {abierto && (
            <nav
              ref={panelMenu}
              id="menu-celular"
              aria-label="Menú principal"
              className="fixed left-4 right-4 top-[68px] z-50 flex flex-col gap-1 rounded-card bg-ink-2 p-3 shadow-float md:hidden"
            >
              {ENLACES_MENU.map((e) => {
                const actual = esActual(pathname, e.href, pestana);
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    aria-current={actual ? "page" : undefined}
                    className={`flex min-h-12 items-center rounded-xl px-3 text-[15px] font-medium transition hover:bg-ink-3 hover:text-white ${
                      actual ? "bg-ink-3 text-white shadow-[inset_3px_0_0_#fff]" : "text-ondark"
                    }`}
                  >
                    {e.texto}
                  </Link>
                );
              })}
              {payload && (
                <button type="button" onClick={salir} className="mt-1 flex min-h-12 items-center rounded-xl border-t border-ink-3 px-3 text-left text-[15px] font-medium text-ondark hover:text-white">
                  Salir
                </button>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
