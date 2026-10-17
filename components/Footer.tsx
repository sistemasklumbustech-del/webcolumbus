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
/** Columna del pie: en celular es un acordeón (toca el título para abrir); en PC siempre abierta. */
function Columna({
id,
titulo,
abierta,
alAlternar,
children,
}: {
id: string;
titulo: string;
abierta: boolean;
alAlternar: (id: string) => void;
children: React.ReactNode;
}) {
  return (
    <div className="border-t border-ink-3 md:border-t-0">
      <button
        type="button"
        onClick={() => alAlternar(id)}
        aria-expanded={abierta}
        aria-controls={`pie-${id}`}
        className="flex w-full items-center justify-between py-4 text-left text-[15px] font-semibold text-white md:pointer-events-none md:cursor-default md:pb-3 md:pt-0 md:text-sm"
      >
        {titulo}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
          className={`transition-transform md:hidden ${abierta ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div id={`pie-${id}`} className={`${abierta ? "block" : "hidden"} pb-4 md:block md:pb-0`}>
        {children}
      </div>
    </div>
  );
}


export function Footer() {
  const pathname = usePathname();
  const [contacto, setContacto] = useState<ContactoSoporte>({ correo: null, telefono: null });
  // Columnas abiertas en celular (la primera abierta de inicio); en PC siempre se ven todas.
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set(["compania"]));
  function alternar(id: string) {
    setAbiertas((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

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

  const esPortada = pathname === "/";

  return (
    <footer className={`kb-footer ${esPortada ? "mt-0 pb-20 md:pb-0" : "mt-8 md:mt-[72px]"}`}>
      <div className="mx-auto grid max-w-[1280px] gap-2 px-5 pb-[34px] pt-9 md:grid-cols-[1.6fr_1fr_1fr_auto] md:gap-8 md:px-16 md:pb-12 md:pt-12">
        <div className="pb-4 md:pb-0">
          <LogoKlumbus className="mb-3 h-[26px] md:h-[30px]" />
          <p className="max-w-[34ch] text-[13px] md:text-sm">
            Compra tu pasaje de bus en Ecuador de forma simple y segura.
          </p>
        </div>

        <Columna abierta={abiertas.has("compania")} alAlternar={alternar} id="compania" titulo="Compañía">
          <ul className="space-y-2 text-[13px] md:text-sm">
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
        </Columna>

        <Columna abierta={abiertas.has("legal")} alAlternar={alternar} id="legal" titulo="Legal">
          <ul className="space-y-2 text-[13px] md:text-sm">
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
        </Columna>

        <Columna abierta={abiertas.has("ayuda")} alAlternar={alternar} id="ayuda" titulo="Ayuda">
          <ul className="space-y-2 text-[13px] md:text-sm">
            {contacto.correo && (
              <li>
                <a href={`mailto:${contacto.correo}`} className="whitespace-nowrap hover:text-white">
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
        </Columna>

        <div className="border-t border-ink-3 pt-4 text-xs text-muted-3 md:col-span-4 md:pt-[18px] md:text-[13px]">
          © {new Date().getFullYear()} Klumbus. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
