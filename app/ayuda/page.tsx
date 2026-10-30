"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  enviarConsultaAyuda,
  obtenerContactoSoporte,
  obtenerCooperativasPublicas,
  obtenerMiPerfil,
  type ContactoSoporte,
  type CooperativaPublica,
  type TemaAyuda,
} from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { TEMAS_AYUDA } from "@/lib/ayuda-preguntas";
import { enlaceWhatsappSoporte, formatearTelefono } from "@/lib/contacto";

const TEMAS: Array<{ valor: TemaAyuda; etiqueta: string }> = [
  { valor: "compra", etiqueta: "Mi compra o pago" },
  { valor: "boleto", etiqueta: "Mi boleto o código QR" },
  { valor: "cancelacion", etiqueta: "Cancelar o reprogramar" },
  { valor: "factura", etiqueta: "Factura" },
  { valor: "cuenta", etiqueta: "Mi cuenta" },
  { valor: "cooperativa", etiqueta: "Soy una cooperativa" },
  { valor: "sugerencia", etiqueta: "Sugerencia" },
  { valor: "otro", etiqueta: "Otro tema" },
];

const claseCampo = "kb-input";
const claseEtiqueta = "kb-label";

function IconoWhatsapp({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.8 12 12 0 004.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 001.8-1.3 2.3 2.3 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

export default function AyudaPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [tema, setTema] = useState<TemaAyuda>("compra");
  const [codigoReferencia, setCodigoReferencia] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [sitioWeb, setSitioWeb] = useState(""); // campo trampa para robots
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referencia, setReferencia] = useState<string | null>(null);
  const [contacto, setContacto] = useState<ContactoSoporte>({ correo: null, telefono: null });

  // Consulta dirigida a una cooperativa (01-oct-2026): para quien no tiene cuenta ni boleto y
  // no puede usar un reclamo. Llega al correo de contacto de esa cooperativa, no al de soporte.
  const [cooperativas, setCooperativas] = useState<CooperativaPublica[]>([]);
  // La lista vacía después de cargar = no se pudo traer (siempre hay cooperativas publicadas).
  const [cooperativasCargadas, setCooperativasCargadas] = useState(false);
  const [conSesion, setConSesion] = useState(false);
  const [cooperativaId, setCooperativaId] = useState("");

  useEffect(() => {
    obtenerContactoSoporte().then(setContacto);
    obtenerCooperativasPublicas().then((lista) => {
      setCooperativas(lista);
      setCooperativasCargadas(true);
    });
    // Desde la tarjeta de una cooperativa en /cooperativas: ?cooperativa=ID abre el formulario ya dirigido a ella.
    const idCoop = new URLSearchParams(window.location.search).get("cooperativa");
    if (idCoop) setCooperativaId(idCoop);
    // Si ya tiene sesión, se adelantan su nombre y su correo.
    const token = tokenValido();
    setConSesion(!!token);
    if (!token) return;
    obtenerMiPerfil(token)
      .then((p) => {
        setNombre((actual) => actual || p.nombreCompleto);
        setCorreo((actual) => actual || p.correo);
      })
      .catch(() => {
        /* sin sesión válida: el formulario se llena a mano */
      });
  }, []);

  const cooperativaElegida = cooperativas.find((c) => c.id === cooperativaId) ?? null;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const r = await enviarConsultaAyuda({
        nombre,
        correo,
        tema,
        mensaje,
        codigoReferencia: codigoReferencia.trim() || undefined,
        cooperativaId: cooperativaId || undefined,
        sitioWeb,
      });
      setReferencia(r.referencia);
      setMensaje("");
      setCodigoReferencia("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar tu consulta.");
    } finally {
      setEnviando(false);
    }
  }

  const telefono = formatearTelefono(contacto.telefono);
  const whatsapp = enlaceWhatsappSoporte();
  const hrefRespuesta = (href: string) => (href === "whatsapp" ? whatsapp : href);

  return (
    <main className="flex-1">
      {/* Encabezado con los 3 accesos (rediseño 30-oct-2026). */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-16 md:py-12">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] md:text-[40px]">¿En qué te ayudamos?</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-2 md:text-base">
            Encuentra respuesta a lo más común o escríbenos: te respondemos por WhatsApp o por correo.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <div className="kb-card kb-card--dark flex flex-col gap-2 p-5">
              <b className="text-lg font-semibold">Encuentra tu boleto</b>
              <p className="text-sm text-ondark">
                {conSesion
                  ? "Todos tus boletos, con su QR, están en Mis boletos."
                  : "Si compraste sin cuenta, revisa tu correo (y la carpeta de spam). Con cuenta, están en Mis boletos."}
              </p>
              <Link href="/perfil?tab=boletos" className="kb-btn kb-btn--primary mt-auto !h-11 self-start !px-5 !text-sm">
                Ir a Mis boletos
              </Link>
            </div>
            <a href="#cambios" className="kb-card flex flex-col gap-2 p-5 transition hover:shadow-[inset_0_0_0_1.5px_#0B0D12]">
              <b className="text-lg font-semibold">Cambios y cancelaciones</b>
              <p className="text-sm text-muted-2">Qué puedes cancelar o cambiar y cómo hacerlo, con o sin cuenta.</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold">
                Ver respuestas
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </a>
            <div className="kb-card flex flex-col gap-2 p-5">
              <b className="text-lg font-semibold">Escríbenos</b>
              <p className="text-sm text-muted-2">Te atendemos por WhatsApp o con el formulario de abajo.</p>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="kb-btn mt-auto !h-11 self-start bg-[#1FAF38] !px-5 !text-sm text-white hover:brightness-95">
                <IconoWhatsapp />
                Escríbenos por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-16 md:py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="min-w-0">
          <section aria-labelledby="ayuda-frecuentes">
            <h2 id="ayuda-frecuentes" className="text-xl font-semibold">
              Preguntas frecuentes
            </h2>
            <nav aria-label="Temas" className="mt-3 flex flex-wrap gap-2">
              {TEMAS_AYUDA.map((t) => (
                <a key={t.id} href={`#${t.id}`} className="kb-chip inline-flex min-h-10 items-center hover:shadow-[inset_0_0_0_1.5px_#0B0D12]">
                  {t.titulo}
                </a>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-7">
              {TEMAS_AYUDA.map((t) => (
                <section key={t.id} id={t.id} aria-labelledby={`tema-${t.id}`} className="scroll-mt-24">
                  <h3 id={`tema-${t.id}`} className="mb-2.5 text-base font-semibold">
                    {t.titulo}
                  </h3>
                  <div className="kb-card divide-y divide-line overflow-hidden">
                    {t.preguntas.map((q) => (
                      <details key={q.p} className="group px-5 py-1">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                          {q.p}
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-muted-2 transition group-open:rotate-180">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </summary>
                        <p className="pb-4 text-sm leading-relaxed text-muted-2">{q.r}</p>
                        {q.enlace && (
                          <p className="-mt-1 pb-4">
                            <a
                              href={hrefRespuesta(q.enlace.href)}
                              {...(q.enlace.href === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                              className="text-sm font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink"
                            >
                              {q.enlace.texto}
                            </a>
                          </p>
                        )}
                      </details>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <section className="mt-10" aria-labelledby="ayuda-formulario" id="escribenos">
            <h2 id="ayuda-formulario" className="text-xl font-semibold">
              ¿No encontraste lo que buscabas? Escríbenos
            </h2>
        {referencia ? (
          <div role="status" className="mt-3 rounded-card bg-ok-bg p-6">
            <p className="text-lg font-bold text-ok">¡Recibimos tu consulta!</p>
            <p className="mt-1 text-sm text-ink">
              {cooperativaElegida
                ? `Le escribimos directamente a ${cooperativaElegida.nombre}. `
                : ""}
              Te responderemos al correo que indicaste. Tu número de referencia es{" "}
              <strong className="font-mono">{referencia}</strong>; guárdalo por si necesitas dar seguimiento.
            </p>
            <button
              type="button"
              onClick={() => setReferencia(null)}
              className="mt-4 kb-btn kb-btn--outline !h-11 !px-5 !text-sm"
            >
              Enviar otra consulta
            </button>
          </div>
        ) : (
          <form
            onSubmit={enviar}
            className="mt-3 grid grid-cols-1 gap-4 kb-card kb-on-white p-5 sm:grid-cols-2 sm:p-6"
          >
            <div>
              <label htmlFor="ayuda-nombre" className={claseEtiqueta}>
                Tu nombre
              </label>
              <input
                id="ayuda-nombre"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={claseCampo}
              />
            </div>
            <div>
              <label htmlFor="ayuda-correo" className={claseEtiqueta}>
                Tu correo
              </label>
              <input
                id="ayuda-correo"
                type="email"
                required
                maxLength={150}
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className={claseCampo}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ayuda-cooperativa" className={claseEtiqueta}>
                ¿Es sobre una cooperativa en particular? (opcional)
              </label>
              <select
                id="ayuda-cooperativa"
                value={cooperativaId}
                onChange={(e) => setCooperativaId(e.target.value)}
                className={claseCampo}
              >
                <option value="">No, es sobre Klumbus</option>
                {cooperativas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {cooperativasCargadas && cooperativas.length === 0 && (
                <p className="mt-1.5 text-xs text-muted-2">
                  No pudimos cargar la lista de cooperativas. Puedes enviar tu consulta a Klumbus y la hacemos llegar.
                </p>
              )}
              {cooperativaElegida && (
                <p className="mt-1 text-xs text-muted-2">
                  Tu consulta le llegará directo a {cooperativaElegida.nombre}, no a Klumbus.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="ayuda-tema" className={claseEtiqueta}>
                ¿Sobre qué es?
              </label>
              <select id="ayuda-tema" value={tema} onChange={(e) => setTema(e.target.value as TemaAyuda)} className={claseCampo}>
                {TEMAS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ayuda-codigo" className={claseEtiqueta}>
                Número de compra o boleto (opcional)
              </label>
              <input
                id="ayuda-codigo"
                maxLength={60}
                value={codigoReferencia}
                onChange={(e) => setCodigoReferencia(e.target.value)}
                className={claseCampo}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ayuda-mensaje" className={claseEtiqueta}>
                ¿En qué te ayudamos?
              </label>
              <textarea
                id="ayuda-mensaje"
                required
                minLength={10}
                maxLength={2000}
                rows={6}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Cuéntanos qué pasó con el mayor detalle posible."
                className={`${claseCampo} !h-auto min-h-[150px] py-3`}
              />
              <p className="mt-1 text-xs text-muted-3">{mensaje.length} de 2000</p>
            </div>

            {/* Campo trampa: invisible para las personas. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="ayuda-sitio">Sitio web</label>
              <input id="ayuda-sitio" tabIndex={-1} autoComplete="off" value={sitioWeb} onChange={(e) => setSitioWeb(e.target.value)} />
            </div>

            {error && (
              <p role="alert" className="kb-alert kb-alert--error sm:col-span-2">
                {error}
              </p>
            )}

            <div className="sm:col-span-2">
              <button type="submit" disabled={enviando} className="kb-btn kb-btn--primary w-full sm:w-auto">
                {enviando ? "Enviando..." : "Enviar consulta"}
              </button>
            </div>
          </form>
        )}

          </section>
        </div>

        {/* Contacto (mismo formato de teléfono que el pie). */}
        <aside className="mt-10 lg:mt-0">
          <div className="kb-card kb-card--dark flex flex-col gap-4 p-6 lg:sticky lg:top-24">
            <b className="text-lg font-semibold">Contacto de soporte</b>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="kb-btn w-full bg-[#1FAF38] text-white hover:brightness-95">
              <IconoWhatsapp />
              Escríbenos por WhatsApp
            </a>
            <ul className="flex flex-col gap-2.5 text-sm text-ondark">
              {telefono && (
                <li>
                  <span className="block text-xs">WhatsApp y teléfono</span>
                  <a href={`tel:${telefono.enlace}`} className="font-semibold text-white hover:underline">
                    {telefono.texto}
                  </a>
                </li>
              )}
              {contacto.correo && (
                <li>
                  <span className="block text-xs">Correo</span>
                  <a href={`mailto:${contacto.correo}`} className="break-all font-semibold text-white hover:underline">
                    {contacto.correo}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
