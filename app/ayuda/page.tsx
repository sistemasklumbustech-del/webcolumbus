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

const PREGUNTAS = [
  {
    p: "¿Cómo recibo mi boleto?",
    r: "Al pagar te llega un correo con tu boleto en PDF y su código QR. Si tienes cuenta, también lo encuentras en Mi cuenta → Mis boletos. Revisa la carpeta de spam si no lo ves.",
  },
  {
    p: "¿Puedo cancelar o reprogramar mi boleto?",
    r: "Depende de la política de cada cooperativa; antes de pagar te avisamos si permite cancelar o reprogramar. Si lo permite, lo haces desde Mi cuenta → Mis boletos.",
  },
  {
    p: "¿Cómo pido mi factura?",
    r: "Desde Mi cuenta → Mis boletos, en el boleto que quieres facturar, pulsa “Solicitar factura” y llena tus datos.",
  },
  {
    p: "Tuve un problema con mi viaje o mi cobro",
    r: "En Mi cuenta → Mis boletos, pulsa “Reportar un problema” en el boleto. La cooperativa recibe tu reclamo y te responde por correo. Sigues el estado en Mis reclamos.",
  },
  {
    p: "Mi pago fue rechazado",
    r: "Revisa que los datos de la tarjeta sean correctos y que tenga saldo o cupo. Si el problema sigue, escríbenos con el formulario de abajo y cuéntanos qué mensaje te apareció.",
  },
];

const claseCampo =
  "w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium";
const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

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
  const [cooperativaId, setCooperativaId] = useState("");

  useEffect(() => {
    obtenerContactoSoporte().then(setContacto);
    obtenerCooperativasPublicas().then(setCooperativas);
    // Desde la tarjeta de una cooperativa en /cooperativas: ?cooperativa=ID abre el formulario ya dirigido a ella.
    const idCoop = new URLSearchParams(window.location.search).get("cooperativa");
    if (idCoop) setCooperativaId(idCoop);
    // Si ya tiene sesión, se adelantan su nombre y su correo.
    const token = tokenValido();
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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-brand-dark">Ayuda</h1>
      <p className="mt-2 max-w-2xl text-sm text-brand-dark/70">
        Encuentra respuesta a lo más común o escríbenos: te respondemos por correo.
      </p>

      <section className="mt-8" aria-labelledby="ayuda-frecuentes">
        <h2 id="ayuda-frecuentes" className="font-display text-lg font-bold text-brand-dark">
          Preguntas frecuentes
        </h2>
        <div className="mt-3 divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {PREGUNTAS.map((q) => (
            <details key={q.p} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-brand-dark">
                {q.p}
                <span aria-hidden="true" className="text-brand-dark/40 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-brand-dark/70">{q.r}</p>
            </details>
          ))}
        </div>
        <p className="mt-2 text-xs text-brand-dark/50">
          ¿Ya tienes cuenta? <Link href="/perfil?tab=boletos" className="font-semibold text-brand hover:underline">Ve a Mis boletos</Link>.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="ayuda-formulario">
        <h2 id="ayuda-formulario" className="font-display text-lg font-bold text-brand-dark">
          ¿No encontraste lo que buscabas? Escríbenos
        </h2>

        {referencia ? (
          <div role="status" className="mt-3 rounded-2xl bg-emerald-50 p-6 ring-1 ring-emerald-200">
            <p className="font-display text-lg font-bold text-emerald-900">¡Recibimos tu consulta!</p>
            <p className="mt-1 text-sm text-emerald-900/80">
              {cooperativaElegida
                ? `Le escribimos directamente a ${cooperativaElegida.nombre}. `
                : ""}
              Te responderemos al correo que indicaste. Tu número de referencia es{" "}
              <strong className="font-mono">{referencia}</strong>; guárdalo por si necesitas dar seguimiento.
            </p>
            <button
              type="button"
              onClick={() => setReferencia(null)}
              className="mt-4 rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              Enviar otra consulta
            </button>
          </div>
        ) : (
          <form
            onSubmit={enviar}
            className="mt-3 grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 sm:p-6"
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
                <option value="">No, es sobre Klumbus en general</option>
                {cooperativas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {cooperativaElegida && (
                <p className="mt-1 text-xs text-brand-dark/50">
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
                className={claseCampo}
              />
              <p className="mt-1 text-xs text-brand-dark/40">{mensaje.length} de 2000</p>
            </div>

            {/* Campo trampa: invisible para las personas. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="ayuda-sitio">Sitio web</label>
              <input id="ayuda-sitio" tabIndex={-1} autoComplete="off" value={sitioWeb} onChange={(e) => setSitioWeb(e.target.value)} />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100 sm:col-span-2">
                {error}
              </p>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={enviando}
                className="rounded-lg bg-brand-amber px-6 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Enviar consulta"}
              </button>
            </div>
          </form>
        )}

        {(contacto.correo || contacto.telefono) && (
          <p className="mt-4 text-sm text-brand-dark/70">
            También puedes contactarnos directamente
            {contacto.correo && (
              <>
                {" "}
                en <a href={`mailto:${contacto.correo}`} className="font-semibold text-brand hover:underline">{contacto.correo}</a>
              </>
            )}
            {contacto.telefono && (
              <>
                {contacto.correo ? " o al " : " al "}
                <a href={`tel:${contacto.telefono}`} className="font-semibold text-brand hover:underline">{contacto.telefono}</a>
              </>
            )}
            .
          </p>
        )}
      </section>
    </main>
  );
}
