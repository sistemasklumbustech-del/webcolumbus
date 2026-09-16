"use client";

import { useState } from "react";
import Link from "next/link";
import { solicitarResetPassword } from "@/lib/api";

/**
 * Punto de entrada del flujo de recuperación de contraseña -- pide el
 * correo y llama a /auth/solicitar-reset. El backend siempre responde
 * { ok: true } exista o no la cuenta (evita filtrar qué correos están
 * registrados), así que el mensaje de éxito es genérico a propósito,
 * nunca confirma ni desmiente si la cuenta existe.
 */
export default function RecuperarPasswordPage() {
  const [correo, setCorreo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await solicitarResetPassword(correo.trim());
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el correo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
        <h1 className="font-display text-2xl font-bold text-brand-dark">Recuperar contraseña</h1>

        {enviado ? (
          <p className="mt-4 text-sm text-brand-dark/70">
            Si <strong>{correo}</strong> está registrado, te enviamos un enlace para restablecer tu
            contraseña. Revisá tu bandeja de entrada (y la carpeta de spam).
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-brand-dark/70">
              Ingresá tu correo y te mandamos un enlace para restablecer tu contraseña.
            </p>
            <form onSubmit={enviar} className="mt-6 space-y-4">
              <div>
                <label htmlFor="recuperar-correo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                  Correo
                </label>
                <input
                  id="recuperar-correo"
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                />
              </div>
              {error && <p className="text-sm font-medium text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={cargando}
                className="w-full rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
              >
                {cargando ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          </>
        )}

        <p className="mt-4 text-center text-sm text-brand-dark/70">
          <Link href="/ingresar" className="font-semibold text-brand hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
