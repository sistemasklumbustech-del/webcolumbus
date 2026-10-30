"use client";

import { useState } from "react";
import Link from "next/link";
import { solicitarResetPassword } from "@/lib/api";
import { AccesoLayout, EstadoAcceso } from "@/components/AccesoLayout";
import { BotonReenviar } from "@/components/BotonReenviar";
import { MARCO_CUENTA } from "@/lib/marco-acceso";

/**
 * Punto de entrada del flujo de recuperación de contraseña -- pide el
 * correo y llama a /auth/solicitar-reset. El backend siempre responde
 * { ok: true } exista o no la cuenta (evita filtrar qué correos están
 * registrados), así que el mensaje de éxito es genérico a propósito,
 * nunca confirma ni desmiente si la cuenta existe.
 *
 * Rediseño 30-oct-2026: mismo marco que Ingresar, "Reenviar enlace" con espera de 60 s y
 * "Usar otro correo". La llamada a la API es la misma de siempre.
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

  if (enviado) {
    return (
      <AccesoLayout {...MARCO_CUENTA}>
        <EstadoAcceso icono="correo" titulo="Revisa tu correo">
          Si <strong className="font-semibold text-white">{correo}</strong> está registrado, te enviamos un enlace para
          restablecer tu contraseña. Revisa también la carpeta de spam.
        </EstadoAcceso>
        <Link href="/ingresar" className="kb-btn kb-btn--primary w-full">
          Volver a iniciar sesión
        </Link>
        <div className="mt-4">
          <BotonReenviar onReenviar={async () => void (await solicitarResetPassword(correo.trim()))} />
        </div>
        <button
          type="button"
          onClick={() => {
            setEnviado(false);
            setError(null);
          }}
          className="mx-auto mt-1 block min-h-11 text-sm font-medium text-ondark hover:text-white"
        >
          Usar otro correo
        </button>
      </AccesoLayout>
    );
  }

  return (
    <AccesoLayout {...MARCO_CUENTA}>
      <EstadoAcceso icono="candado" titulo="¿Olvidaste tu contraseña?">
        Escribe tu correo y te enviamos un enlace para crear una nueva.
      </EstadoAcceso>
      <form onSubmit={enviar} className="flex flex-col gap-3.5">
        <div>
          <label htmlFor="recuperar-correo" className="kb-label">
            Correo
          </label>
          <input
            id="recuperar-correo"
            type="email"
            autoComplete="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="kb-input"
          />
        </div>
        {error && <p className="kb-alert kb-alert--error">{error}</p>}
        <button type="submit" disabled={cargando} className="kb-btn kb-btn--primary w-full">
          {cargando ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ondark">
        ¿Ya la recordaste?{" "}
        <Link href="/ingresar" className="font-semibold text-kbyellow hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AccesoLayout>
  );
}
