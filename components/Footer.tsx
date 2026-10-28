"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set(["explora"]));
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
    pathname === "/ingresar" ||
    pathname === "/registro" ||
    /^\/viajes\/[^/]+\/(asientos|checkout)/.test(pathname)
  ) {
    return null;
  }

  const esPortada = pathname === "/";
  const telefono = formatearTelefono(contacto.telefono);

  return (
    <footer className={`kb-footer ${esPortada ? "mt-0" : "mt-8 md:mt-[72px]"}`}>
      <div className="mx-auto max-w-[1280px] px-5 pt-9 md:px-16 md:pt-14">
        <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-10">
          {/* Marca y contacto */}
          <div className="pb-5 md:pb-0">
            {/* En celular el logo ya está fijo en el encabezado; aquí solo se muestra en PC. */}
            <LogoKlumbus className="mb-3.5 hidden h-[30px] md:block" />
            <p className="max-w-[32ch] text-[13px] leading-relaxed md:text-sm">
              Compra tu pasaje de bus en Ecuador de forma simple y segura.
            </p>
            {(contacto.correo || telefono) && (
              <ul className="mt-5 space-y-2.5 text-[13px] md:text-sm">
                {telefono && (
                  <li>
                    <a href={`tel:${telefono.enlace}`} className="group inline-flex items-center gap-2.5 text-white">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-2 shadow-[inset_0_0_0_1px_#262A35] transition-colors group-hover:bg-kbyellow group-hover:text-ink">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                        </svg>
                      </span>
                      {telefono.texto}
                    </a>
                  </li>
                )}
                {contacto.correo && (
                  <li>
                    <a href={`mailto:${contacto.correo}`} className="group inline-flex items-center gap-2.5 text-white">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-2 shadow-[inset_0_0_0_1px_#262A35] transition-colors group-hover:bg-kbyellow group-hover:text-ink">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="M3 7l9 6 9-6" />
                        </svg>
                      </span>
                      <span className="break-all">{contacto.correo}</span>
                    </a>
                  </li>
                )}
              </ul>
            )}
          </div>

          <Columna abierta={abiertas.has("explora")} alAlternar={alternar} id="explora" titulo="Explora">
            <ul className="space-y-2.5 text-[13px] md:text-sm">
              <li><Link href="/#destinos" className="hover:text-white">Destinos</Link></li>
              <li><a href="/rutas" className="hover:text-white">Rutas y horarios</a></li>
              <li><a href="/cooperativas" className="hover:text-white">Cooperativas</a></li>
              <li><Link href="/#como" className="hover:text-white">Cómo funciona</Link></li>
            </ul>
          </Columna>

          <Columna abierta={abiertas.has("compania")} alAlternar={alternar} id="compania" titulo="Compañía">
            <ul className="space-y-2.5 text-[13px] md:text-sm">
              <li><a href="/ayuda" className="hover:text-white">Ayuda</a></li>
              <li><a href="/anunciar" className="hover:text-white">Anuncia con nosotros</a></li>
              <li><a href="/ingresar" className="hover:text-white">Iniciar sesión</a></li>
              <li><a href="/registro" className="hover:text-white">Crear cuenta</a></li>
            </ul>
          </Columna>

          <Columna abierta={abiertas.has("legal")} alAlternar={alternar} id="legal" titulo="Legal">
            <ul className="space-y-2.5 text-[13px] md:text-sm">
              <li><a href="/terminos" className="hover:text-white">Términos de Servicio</a></li>
              <li><a href="/privacidad" className="hover:text-white">Política de Privacidad</a></li>
            </ul>
          </Columna>
        </div>

        <div className="mt-2 flex flex-col gap-1.5 border-t border-ink-3 py-5 text-xs text-muted-3 md:mt-12 md:flex-row md:items-center md:justify-between md:text-[13px]">
          <span>© {new Date().getFullYear()} Klumbus. Todos los derechos reservados.</span>
          <span>Pasajes de bus en línea · Ecuador</span>
        </div>
      </div>
    </footer>
  );
}

/**
 * Muestra el teléfono de soporte con el prefijo de Ecuador: "0995632587" -> "+593 99 563 2587"
 * (y el enlace "tel:+593995632587"). Si el número ya trae prefijo o tiene otra forma, se deja igual.
 */
function formatearTelefono(telefono: string | null): { texto: string; enlace: string } | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digitos)) {
    const n = digitos.slice(1);
    return { texto: `+593 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`, enlace: `+593${n}` };
  }
  if (/^593\d{9}$/.test(digitos)) {
    const n = digitos.slice(3);
    return { texto: `+593 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`, enlace: `+593${n}` };
  }
  return { texto: telefono, enlace: telefono.replace(/\s/g, "") };
}
