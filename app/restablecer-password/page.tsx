"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { restablecerPassword } from "@/lib/api";
import { CampoPassword } from "@/components/CampoPassword";
import { AccesoLayout, EstadoAcceso } from "@/components/AccesoLayout";
import { MARCO_CUENTA } from "@/lib/marco-acceso";

/** Una regla de la contraseña que se marca en verde al cumplirse (solo ayuda visual). */
function Regla({ cumple, children }: { cumple: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-2 text-[13px] transition-colors ${cumple ? "text-[#5FD39A]" : "text-ondark"}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {cumple ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <circle cx="12" cy="12" r="7" />}
      </svg>
      {children}
      <span className="sr-only">{cumple ? "(cumple)" : "(falta)"}</span>
    </li>
  );
}

function FormularioRestablecer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Mismas validaciones de siempre (mínimo 8 y que coincidan); ahora además se ven mientras se escribe.
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    try {
      await restablecerPassword(token, password);
      setListo(true);
      setTimeout(() => router.replace("/ingresar"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restablecer la contraseña.");
    } finally {
      setCargando(false);
    }
  }

  if (!token) {
    return (
      <AccesoLayout {...MARCO_CUENTA}>
        <EstadoAcceso icono="alerta" titulo="Este enlace no es válido">
          Puede que haya vencido o que ya se haya usado. Pide uno nuevo y te lo enviamos a tu correo.
        </EstadoAcceso>
        <Link href="/recuperar-password" className="kb-btn kb-btn--primary w-full">
          Pedir un enlace nuevo
        </Link>
      </AccesoLayout>
    );
  }

  if (listo) {
    return (
      <AccesoLayout {...MARCO_CUENTA}>
        <EstadoAcceso icono="ok" titulo="Contraseña actualizada">
          Ya puedes entrar con tu nueva contraseña. Te llevamos a iniciar sesión…
        </EstadoAcceso>
        <Link href="/ingresar" className="kb-btn kb-btn--primary w-full">
          Iniciar sesión
        </Link>
      </AccesoLayout>
    );
  }

  return (
    <AccesoLayout {...MARCO_CUENTA}>
      <EstadoAcceso icono="candado" titulo="Crea una nueva contraseña">
        Elige una contraseña que no uses en otros sitios.
      </EstadoAcceso>
      <form onSubmit={enviar} className="flex flex-col gap-3.5">
        <div>
          <label htmlFor="nueva-password" className="kb-label">
            Nueva contraseña
          </label>
          <CampoPassword id="nueva-password" value={password} onChange={setPassword} autoComplete="new-password" />
        </div>
        <div>
          <label htmlFor="confirmar-password" className="kb-label">
            Repite la contraseña
          </label>
          <CampoPassword id="confirmar-password" value={confirmacion} onChange={setConfirmacion} autoComplete="new-password" />
        </div>
        <ul className="flex flex-col gap-1.5" aria-label="Requisitos de la contraseña">
          <Regla cumple={password.length >= 8}>Mínimo 8 caracteres</Regla>
          <Regla cumple={password.length > 0 && password === confirmacion}>Las dos coinciden</Regla>
        </ul>
        {error && (
          <div className="kb-alert kb-alert--error flex-col !items-start !gap-1">
            <span>{error}</span>
            <Link href="/recuperar-password" className="font-semibold underline">
              Pedir un enlace nuevo
            </Link>
          </div>
        )}
        <button type="submit" disabled={cargando} className="kb-btn kb-btn--primary w-full">
          {cargando ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </AccesoLayout>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <Suspense fallback={null}>
      <FormularioRestablecer />
    </Suspense>
  );
}
