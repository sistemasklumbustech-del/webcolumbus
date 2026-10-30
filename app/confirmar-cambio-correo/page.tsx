"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { confirmarCambioCorreo } from "@/lib/api";
import { AccesoLayout, EstadoAcceso } from "@/components/AccesoLayout";
import { MARCO_CUENTA } from "@/lib/marco-acceso";

/**
 * Cambio de correo (29-jul-2026, hallazgo real del usuario) — pantalla
 * a la que llega el usuario al hacer clic en el enlace de su correo
 * nuevo. Sin esta pantalla, el backend ya funcionaba pero no había
 * ningún lugar donde el usuario pudiera de verdad confirmar el cambio.
 */
function ConfirmacionCambioCorreo() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [estado, setEstado] = useState<"cargando" | "exito" | "error">("cargando");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setEstado("error");
      setError("Este enlace no es válido — falta el código de confirmación.");
      return;
    }
    confirmarCambioCorreo(token)
      .then(() => setEstado("exito"))
      .catch((err) => {
        setEstado("error");
        setError(err instanceof Error ? err.message : "No se pudo confirmar el cambio.");
      });
  }, [token]);

  if (estado === "cargando") {
    return (
      <AccesoLayout {...MARCO_CUENTA}>
        <EstadoAcceso icono="cargando" titulo="Confirmando tu correo nuevo…">
          Esto toma solo un momento.
        </EstadoAcceso>
      </AccesoLayout>
    );
  }

  if (estado === "exito") {
    return (
      <AccesoLayout {...MARCO_CUENTA}>
        <EstadoAcceso icono="ok" titulo="¡Listo! Tu correo quedó actualizado">
          Desde ahora, inicia sesión con tu correo nuevo.
        </EstadoAcceso>
        <Link href="/ingresar" className="kb-btn kb-btn--primary w-full">
          Iniciar sesión
        </Link>
      </AccesoLayout>
    );
  }

  return (
    <AccesoLayout {...MARCO_CUENTA}>
      <EstadoAcceso icono="alerta" titulo="No pudimos confirmar tu correo">
        {error && <span className="block text-[#FF9B9B]">{error}</span>}
        <span className="mt-1 block">
          El enlace puede haber expirado (dura 24 horas) o ya haberse usado antes. Vuelve a solicitar el cambio desde tu
          perfil.
        </span>
      </EstadoAcceso>
      <Link href="/perfil?tab=datos" className="kb-btn kb-btn--primary w-full">
        Ir a mi perfil
      </Link>
    </AccesoLayout>
  );
}

export default function ConfirmarCambioCorreoPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmacionCambioCorreo />
    </Suspense>
  );
}
