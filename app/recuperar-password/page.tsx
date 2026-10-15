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
    <main className="kb-on-white flex flex-1 items-center justify-center bg-kbbg px-4 py-16">
      <div className="w-full max-w-sm kb-card kb-on-white p-8 shadow-lg ring-1 ring-line">
        <h1 className="text-2xl font-bold text-brand-dark">Recuperar contraseña</h1>

        {enviado ? (
          <p className="mt-4 text-sm text-muted-2">
            Si <strong>{correo}</strong> está registrado, te enviamos un enlace para restablecer tu
            contraseña. Revisá tu bandeja de entrada (y la carpeta de spam).
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-2">
              Ingresá tu correo y te mandamos un enlace para restablecer tu contraseña.
            </p>
            <form onSubmit={enviar} className="mt-6 space-y-4">
              <div>
                <label htmlFor="recuperar-correo" className="kb-label">
                  Correo
                </label>
                <input
                  id="recuperar-correo"
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full kb-input"
                />
              </div>
              {error && <p className="text-sm font-medium text-kberror">{error}</p>}
              <button
                type="submit"
                disabled={cargando}
                className="kb-btn kb-btn--dark w-full disabled:opacity-60"
              >
                {cargando ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          </>
        )}

        <p className="mt-4 text-center text-sm text-muted-2">
          <Link href="/ingresar" className="font-semibold text-brand hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
