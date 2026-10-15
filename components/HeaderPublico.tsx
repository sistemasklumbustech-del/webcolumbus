"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogoKlumbus } from "./LogoKlumbus";
import { obtenerToken, decodificarToken, tokenExpirado, borrarToken, type PayloadToken } from "@/lib/auth";

const RUTA_POR_ROL: Record<PayloadToken["rol"], string> = {
  admin_plataforma: "/admin",
  super_admin: "/admin",
  admin_cooperativa: "/panel-empresa",
  vendedor: "/panel-empresa",
  pasajero: "/",
};

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
  const [payload, setPayload] = useState<PayloadToken | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    const datos = decodificarToken(token);
    if (datos && !tokenExpirado(datos)) setPayload(datos);
  }, [pathname]);

  // Se desactiva en el panel de cooperativa y el panel de admin
  // (tienen su propio header con su propia navegación) -- y en la
  // portada (16-ago-2026, hallazgo real del director: el Hero de la
  // Fase 2 ya trae su propio encabezado con el logo real superpuesto
  // sobre la foto, más "Iniciar sesión" -- tenerlos los dos duplicaba
  // el nombre "Columbus" y el botón de sesión en la misma pantalla).
  if (pathname.startsWith("/panel-empresa") || pathname.startsWith("/admin") || pathname === "/") {
    return null;
  }

  function salir() {
    borrarToken();
    setPayload(null);
    window.location.href = "/";
  }

  // En el flujo de compra el encabezado muestra los pasos en vez del menú (diseño final).
  const PASOS_COMPRA = ["Viaje", "Asiento", "Pago", "Boleto"];
  const pasoActual = /^\/viajes\/[^/]+\/asientos/.test(pathname)
    ? 2
    : /^\/viajes\/[^/]+\/checkout/.test(pathname)
      ? 3
      : null;

  const enlace = (href: string, texto: string) => (
    <Link
      href={href}
      className={`hidden whitespace-nowrap text-sm font-medium transition hover:text-white lg:block ${
        pathname === href ? "text-white" : "text-ondark"
      }`}
    >
      {texto}
    </Link>
  );

  return (
    <header className="kb-header sticky top-0 z-50">
      <div className="kb-container">
        <div className="kb-header__in">
          <Link href="/" className="flex items-center" aria-label="Klumbus, ir al inicio">
            <LogoKlumbus className="kb-header__logo" />
          </Link>

          <div className="flex items-center gap-4 lg:gap-[34px]">
            {pasoActual ? (
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
            ) : (
              <>
                {enlace("/", "Inicio")}
                {enlace("/rutas", "Rutas")}
                {enlace("/cooperativas", "Cooperativas")}
                {enlace("/mis-boletos", "Mis boletos")}
                {enlace("/ayuda", "Ayuda")}
              </>
            )}

            {payload ? (
              <nav aria-label="Cuenta" className="flex items-center gap-2.5">
                {payload.rol === "pasajero" ? (
                  <Link href="/perfil" className="px-2 text-sm font-semibold text-ondark transition hover:text-white">
                    Mi cuenta
                  </Link>
                ) : (
                  <Link href={RUTA_POR_ROL[payload.rol]} className="px-2 text-sm font-semibold text-ondark transition hover:text-white">
                    Ir a mi panel
                  </Link>
                )}
                <button
                  onClick={salir}
                  className="rounded-tab px-3.5 py-2.5 text-sm font-semibold text-white shadow-[inset_0_0_0_1.5px_#262A35] transition hover:bg-ink-2 md:h-11"
                >
                  Salir
                </button>
              </nav>
            ) : (
              <nav aria-label="Cuenta" className="flex items-center gap-2.5">
                <Link href="/ingresar" className="whitespace-nowrap px-2 text-sm font-semibold text-white transition hover:text-kbyellow">
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  className="flex items-center whitespace-nowrap rounded-xl bg-kbyellow px-3.5 py-[9px] text-[13px] font-semibold text-ink transition hover:bg-[#F2C800] md:h-11 md:rounded-tab md:px-[18px] md:text-sm"
                >
                  Registrarse
                </Link>
              </nav>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
