"use client";

import { useState } from "react";
import Link from "next/link";
import { enviarLeadPublicidad } from "@/lib/api";
import { enlaceWhatsappSoporte } from "@/lib/contacto";

/**
 * Formulario público de captación de leads -- Fase 3 de la sesión de
 * frontend (16-ago-2026). Conecta POST /publicidad/leads, ya
 * construido y probado desde el 30-jul-2026 (confirmado en la
 * auditoría con una prueba real que devolvió 201) -- el frontend
 * público nunca existió hasta ahora.
 *
 * Rediseño (30-oct-2026, aprobado por el director): encabezado blanco, formulario en tarjeta, razones
 * para anunciarse (sin cifras ni promesas), mensajes propios en español y pantalla de enviado con el
 * correo y WhatsApp. Lo que se envía a la API no cambia.
 */

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Textos cortos, sin cifras ni promesas, solo lo que la plataforma hace hoy (Jorge los revisa).
const RAZONES: { titulo: string; texto: string; icono: React.ReactNode }[] = [
  {
    titulo: "Tu marca donde la gente elige su pasaje",
    texto: "Tu anuncio aparece en la página de inicio de Klumbus, junto a los destinos.",
    icono: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M7 15l3-3 2 2 4-4" />
      </>
    ),
  },
  {
    titulo: "Planes y formatos a tu medida",
    texto: "Te explicamos los planes y formatos disponibles para tu negocio.",
    icono: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="16" height="7" rx="1.5" />
      </>
    ),
  },
  {
    titulo: "Te respondemos por correo o WhatsApp",
    texto: "Déjanos tus datos y nuestro equipo comercial se pone en contacto contigo.",
    icono: <path d="M5 18l-1.5 3 4-1.2A9 9 0 1 0 5 18z" />,
  },
];

type Campo = "empresa" | "correo";

/** ¿El error de la API habla del correo? (la API responde en inglés; no se cambia). */
function errorDeCorreo(err: unknown): boolean {
  const texto = err instanceof Error ? err.message.toLowerCase() : "";
  return texto.includes("correo") || texto.includes("email");
}

function Icono({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

function Encabezado({ subtitulo }: { subtitulo: string }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="kb-container py-7 md:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-[28px] font-bold leading-tight text-ink md:text-[36px]">Anuncia con Klumbus</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-2">{subtitulo}</p>
        </div>
      </div>
    </header>
  );
}

export default function AnunciarPage() {
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoCorreo, setContactoCorreo] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});

  function validar(): Partial<Record<Campo, string>> {
    const e: Partial<Record<Campo, string>> = {};
    if (nombreEmpresa.trim().length < 2) e.empresa = "Escribe el nombre de tu empresa.";
    if (!CORREO_VALIDO.test(contactoCorreo.trim())) {
      e.correo = contactoCorreo.trim() === "" ? "Escribe tu correo: ahí te respondemos." : "Revisa el correo: parece que falta algo.";
    }
    return e;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const encontrados = validar();
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      document.getElementById(encontrados.empresa ? "lead-empresa" : "lead-correo")?.focus();
      return;
    }
    setEnviando(true);
    try {
      await enviarLeadPublicidad({
        nombreEmpresa,
        contactoNombre: contactoNombre || undefined,
        contactoCorreo,
        contactoTelefono: contactoTelefono || undefined,
        mensaje: mensaje || undefined,
      });
      setEnviado(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (errorDeCorreo(err)) {
        // El correo va marcado en rojo con el mensaje debajo, y la pantalla sube hasta él.
        setErrores({ correo: "Revisa el correo: parece que falta algo." });
        const campo = document.getElementById("lead-correo");
        campo?.scrollIntoView({ behavior: "smooth", block: "center" });
        campo?.focus({ preventScroll: true });
      } else {
        setError("No pudimos enviar tu solicitud. Revisa los datos e inténtalo de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <main className="flex-1 bg-kbbg">
        <Encabezado subtitulo="Llega a quienes compran pasajes de bus en Ecuador." />
        <div className="kb-container py-6 md:py-10">
          <div role="status" className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-card border border-line bg-white px-5 py-8 text-center md:px-8">
            <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-ok-bg text-ok">
              <Icono className="h-7 w-7">
                <path d="M5 12l5 5L20 7" />
              </Icono>
            </span>
            <b className="text-xl font-semibold text-ink">¡Listo! Recibimos tu solicitud</b>
            <p className="text-[15px] leading-relaxed text-muted-2">
              Nuestro equipo comercial te escribirá a <b className="break-all font-semibold text-ink">{contactoCorreo.trim()}</b>.
            </p>
            <div className="mt-3 grid w-full gap-2.5 sm:grid-cols-2">
              <Link href="/" className="kb-btn kb-btn--outline !h-12">
                Volver al inicio
              </Link>
              <a
                href={enlaceWhatsappSoporte("Hola Klumbus, quiero anunciar mi negocio")}
                target="_blank"
                rel="noopener noreferrer"
                className="kb-btn !h-12 bg-[#1FAF38] text-white hover:bg-[#1A9A31]"
              >
                <Icono>
                  <path d="M5 18l-1.5 3 4-1.2A9 9 0 1 0 5 18z" />
                </Icono>
                Escríbenos por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const claseError = "mt-1.5 block text-[13px] font-medium text-kberror";

  return (
    <main className="flex-1 bg-kbbg">
      <Encabezado subtitulo="Llega a quienes compran pasajes de bus en Ecuador. Cuéntanos de tu negocio y te contactamos con las opciones disponibles." />

      <div className="kb-container py-6 md:py-10">
        {/* PC: razones a la izquierda y formulario a la derecha; celular: el formulario primero. */}
        <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-10">
          <form onSubmit={enviar} noValidate className="flex flex-col gap-4 rounded-card border border-line bg-white p-5 md:order-2 md:p-7">
            <b className="text-lg font-semibold text-ink">Cuéntanos de tu negocio</b>
            <div>
              <label htmlFor="lead-empresa" className="kb-label">
                Nombre de tu empresa
              </label>
              <input
                id="lead-empresa"
                autoComplete="organization"
                value={nombreEmpresa}
                onChange={(e) => {
                  setNombreEmpresa(e.target.value);
                  if (errores.empresa) setErrores((x) => ({ ...x, empresa: undefined }));
                }}
                aria-invalid={errores.empresa ? true : undefined}
                aria-describedby={errores.empresa ? "lead-empresa-error" : undefined}
                className={`kb-input ${errores.empresa ? "!border-kberror !bg-kberror-bg" : ""}`}
              />
              {errores.empresa && (
                <span id="lead-empresa-error" className={claseError}>
                  {errores.empresa}
                </span>
              )}
            </div>
            <div>
              <label htmlFor="lead-nombre" className="kb-label">
                Tu nombre (opcional)
              </label>
              <input
                id="lead-nombre"
                autoComplete="name"
                value={contactoNombre}
                onChange={(e) => setContactoNombre(e.target.value)}
                className="kb-input"
              />
            </div>
            <div>
              <label htmlFor="lead-correo" className="kb-label">
                Correo de contacto
              </label>
              <input
                id="lead-correo"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={contactoCorreo}
                onChange={(e) => {
                  setContactoCorreo(e.target.value);
                  if (errores.correo) setErrores((x) => ({ ...x, correo: undefined }));
                }}
                aria-invalid={errores.correo ? true : undefined}
                aria-describedby={errores.correo ? "lead-correo-error" : undefined}
                className={`kb-input ${errores.correo ? "!border-kberror !bg-kberror-bg" : ""}`}
              />
              {errores.correo && (
                <span id="lead-correo-error" className={claseError}>
                  {errores.correo}
                </span>
              )}
            </div>
            <div>
              <label htmlFor="lead-telefono" className="kb-label">
                Teléfono (opcional)
              </label>
              <input
                id="lead-telefono"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                maxLength={10}
                value={contactoTelefono}
                onChange={(e) => setContactoTelefono(e.target.value.replace(/\D/g, ""))}
                placeholder="0991234567"
                className="kb-input tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="lead-mensaje" className="kb-label">
                Cuéntanos de tu negocio (opcional)
              </label>
              <textarea
                id="lead-mensaje"
                rows={5}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                className="kb-input !h-auto min-h-[150px] py-3"
              />
            </div>

            {error && (
              <p role="alert" className="kb-alert kb-alert--error">
                {error}
              </p>
            )}

            <button type="submit" disabled={enviando} className="kb-btn kb-btn--primary w-full">
              {enviando ? "Enviando..." : "Enviar solicitud"}
            </button>
          </form>

          <ul className="flex flex-col gap-5 md:order-1 md:pt-2">
            {RAZONES.map((r) => (
              <li key={r.titulo} className="flex gap-3.5">
                <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-kbyellow">
                  <Icono>{r.icono}</Icono>
                </span>
                <span>
                  <b className="block text-base font-semibold leading-snug text-ink">{r.titulo}</b>
                  <span className="mt-1 block text-[15px] leading-relaxed text-muted-2">{r.texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
