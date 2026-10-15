"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoKlumbus } from "./LogoKlumbus";
import { obtenerContactoSoporte, type ContactoSoporte } from "@/lib/api";

/**
 * Pie de página -- rediseño real (20-ago-2026), investigación
 * comparativa (Expedia, HubSpot, guía de confianza turismo 2026):
 * faltaba contacto de soporte visible (el dato ya existía, solo en
 * el PDF del boleto) y páginas legales. 3 columnas simples, sin
 * sobrecargar -- decisión explícita del director de mantenerlo
 * "completo pero profesional", no un mapa de sitio gigante.
 *
 * Se desactiva a sí mismo en las mismas rutas que HeaderPublico
 * (/panel-empresa, /admin), y dentro del flujo de compra -- mismo
 * criterio real ya documentado (sección 3.9).
 */
export function Footer() {
  const pathname = usePathname();
  const [contacto, setContacto] = useState<ContactoSoporte>({ correo: null, telefono: null });

  useEffect(() => {
    obtenerContactoSoporte().then(setContacto);
  }, []);

  if (
    pathname.startsWith("/panel-empresa") ||
    pathname.startsWith("/admin") ||
    /^\/viajes\/[^/]+\/(asientos|checkout)/.test(pathname)
  ) {
    return null;
  }

  return (
    <footer className="kb-footer mt-8 md:mt-[72px]">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-[22px] px-5 pb-[34px] pt-7 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:gap-8 md:px-16 md:pb-12 md:pt-12">
        <div className="col-span-2 md:col-span-1">
          <LogoKlumbus className="mb-2.5 h-[26px] md:mb-3 md:h-[30px]" />
          <p className="text-[13px] md:text-sm">
            Compara y compra tu boleto de bus en Ecuador, de forma simple y segura.
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.12em] text-white md:mb-3 md:text-sm md:normal-case md:tracking-normal">Compañía</h3>
          <ul className="space-y-1.5 text-[13px] md:space-y-2 md:text-sm">
            <li>
              <a href="/anunciar" className="hover:text-white">
                Anuncia con nosotros
              </a>
            </li>
            <li>
              <a href="/ingresar" className="hover:text-white">
                Iniciar sesión
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.12em] text-white md:mb-3 md:text-sm md:normal-case md:tracking-normal">Legal</h3>
          <ul className="space-y-1.5 text-[13px] md:space-y-2 md:text-sm">
            <li>
              <a href="/terminos" className="hover:text-white">
                Términos de Servicio
              </a>
            </li>
            <li>
              <a href="/privacidad" className="hover:text-white">
                Política de Privacidad
              </a>
            </li>
          </ul>
        </div>

        <div className="col-span-2 md:col-span-1">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.12em] text-white md:mb-3 md:text-sm md:normal-case md:tracking-normal">Ayuda</h3>
          <ul className="space-y-1.5 text-[13px] [overflow-wrap:anywhere] md:space-y-2 md:text-sm">
            {contacto.correo && (
              <li>
                <a href={`mailto:${contacto.correo}`} className="hover:text-white">
                  {contacto.correo}
                </a>
              </li>
            )}
            {contacto.telefono && (
              <li>
                <a href={`tel:${contacto.telefono}`} className="hover:text-white">
                  {contacto.telefono}
                </a>
              </li>
            )}
            {!contacto.correo && !contacto.telefono && (
              <li className="text-muted-3">Próximamente</li>
            )}
          </ul>
        </div>

        <div className="col-span-2 border-t border-ink-3 pt-3.5 text-xs text-muted-3 md:col-span-4 md:pt-[18px] md:text-[13px]">
          © {new Date().getFullYear()} Klumbus. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
