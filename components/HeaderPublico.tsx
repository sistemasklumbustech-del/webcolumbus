"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogoKlumbus } from "./LogoKlumbus";
import { MenuSitio } from "./MenuSitio";


/**
 * Header público (pasajero, sin sesión o con sesión de pasajero) —
 * pedido explícito del usuario (22-jul-2026): antes, la única forma de
 * llegar a /ingresar era escribiendo la URL a mano, no había ningún
 * enlace visible.
 *
 * Se renderiza desde el layout raíz, pero se desactiva a sí mismo en
 * /panel-empresa y /admin porque esas secciones ya tienen su propio
 * header (con su propia navegación y su botón de Salir) — evita tener
 * dos headers apilados.
 */
export function HeaderPublico() {
  const pathname = usePathname();

  // Se desactiva en el panel de cooperativa y el panel de admin
  // (tienen su propio header con su propia navegación) -- y en la
  // portada (16-ago-2026, hallazgo real del director: el Hero de la
  // Fase 2 ya trae su propio encabezado con el logo real superpuesto
  // sobre la foto, más "Iniciar sesión" -- tenerlos los dos duplicaba
  // el nombre "Columbus" y el botón de sesión en la misma pantalla).
  // Ingresar y Crear cuenta llevan su propio encabezado mínimo (logo + "Volver al inicio").
  if (pathname.startsWith("/panel-empresa") || pathname.startsWith("/admin") || pathname === "/" || pathname === "/ingresar" || pathname === "/registro") {
    return null;
  }


  // En el flujo de compra el encabezado muestra los pasos en vez del menú (diseño final).
  const PASOS_COMPRA = ["Viaje", "Asiento", "Pago", "Boleto"];
  const pasoActual = /^\/viajes\/[^/]+\/asientos/.test(pathname)
    ? 2
    : /^\/viajes\/[^/]+\/checkout/.test(pathname)
      ? 3
      : null;

  return (
    <header className="kb-header sticky top-0 z-50">
      <div className="kb-container">
        <div className="kb-header__in">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Klumbus, ir al inicio">
            <LogoKlumbus className="kb-header__logo" />
          </Link>

          <div className="flex items-center gap-4 lg:gap-[34px]">
            {pasoActual && (
              <ol className="hidden items-center gap-[34px] lg:flex" aria-label="Pasos de la compra">
                {PASOS_COMPRA.map((texto, i) => (
                  <li
                    key={texto}
                    aria-current={i + 1 === pasoActual ? "step" : undefined}
                    className={`whitespace-nowrap text-sm font-medium ${i + 1 === pasoActual ? "text-kbyellow" : "text-ondark"}`}
                  >
                    {i + 1} {texto}
                  </li>
                ))}
              </ol>
            )}
            <MenuSitio
              ocultarEnlaces={pasoActual !== null}
              extraSinSesion={
                <Link
                  href="/registro"
                  className="hidden min-h-11 items-center whitespace-nowrap rounded-tab bg-kbyellow px-3.5 sm:flex text-[13px] font-semibold text-ink transition hover:bg-[#F2C800] md:px-[18px] md:text-sm"
                >
                  Registrarse
                </Link>
              }
            />
          </div>
        </div>
      </div>
    </header>
  );
}
