"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { reenviarVerificacionCorreo, verificarCorreo } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { AccesoLayout, EstadoAcceso } from "@/components/AccesoLayout";
import { BotonReenviar } from "@/components/BotonReenviar";
import { MARCO_CUENTA, esEnlaceVencido } from "@/lib/marco-acceso";

type Estado = "verificando" | "listo" | "error" | "pedir";

/** Después de iniciar sesión, vuelve aquí para pedir el enlace nuevo (no al inicio). */
const VOLVER_PARA_PEDIR = `/ingresar?volverA=${encodeURIComponent("/verificar-correo?reenviar=1")}`;

/**
 * Verificación de correo (RF-AUTH-001). Rediseño 30-oct-2026: mismo marco que Ingresar y, si el
 * enlace no sirve, una salida clara: con sesión se pide uno nuevo ahí mismo
 * (POST /auth/reenviar-verificacion, ya existente); sin sesión, se inicia sesión y se vuelve aquí.
 */
function VerificacionCorreo() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const quiereReenviar = searchParams.get("reenviar") === "1";
  const [estado, setEstado] = useState<Estado>("verificando");
  const [error, setError] = useState<string | null>(null);
  const [conSesion, setConSesion] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setConSesion(!!tokenValido());
    if (!token) {
      if (quiereReenviar) {
        setEstado("pedir");
        return;
      }
      setEstado("error");
      setError("Este enlace no es válido.");
      return;
    }
    verificarCorreo(token)
      .then(() => setEstado("listo"))
      .catch((err) => {
        setEstado("error");
        setError(err instanceof Error ? err.message : "No se pudo verificar el correo.");
      });
  }, [token, quiereReenviar]);

  async function pedirEnlace() {
    const sesion = tokenValido();
    if (!sesion) throw new Error("Tu sesión venció. Inicia sesión de nuevo.");
    await reenviarVerificacionCorreo(sesion);
  }

  async function pedirPrimeraVez() {
    setEnviando(true);
    setError(null);
    try {
      await pedirEnlace();
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el enlace.");
    } finally {
      setEnviando(false);
    }
  }

  if (estado === "verificando") {
    return (
      <AccesoLayout {...MARCO_CUENTA}>
        <EstadoAcceso icono="cargando" titulo="Verificando tu correo…">
          Esto toma solo un momento.
        </EstadoAcceso>
      </AccesoLayout>
    );
  }

  if (estado === "listo") {
    return (
      <AccesoLayout {...MARCO_CUENTA}>
        <EstadoAcceso icono="ok" titulo="¡Correo verificado!">
          Ya puedes usar todas las funciones de tu cuenta.
        </EstadoAcceso>
        <Link href="/perfil" className="kb-btn kb-btn--primary w-full">
          Ir a mi cuenta
        </Link>
      </AccesoLayout>
    );
  }

  // Enlace vencido o sin enlace: pedir uno nuevo.
  const titulo = estado === "pedir" ? "Verifica tu correo" : "No pudimos verificar tu correo";
  return (
    <AccesoLayout {...MARCO_CUENTA}>
      <EstadoAcceso icono={enviado ? "correo" : estado === "pedir" ? "correo" : "alerta"} titulo={enviado ? "Revisa tu correo" : titulo}>
        {enviado ? (
          "Te enviamos un enlace nuevo. Ábrelo desde tu correo para verificar tu cuenta (revisa también la carpeta de spam)."
        ) : estado === "pedir" ? (
          "Te enviaremos un enlace nuevo a tu correo."
        ) : (
          // Enlace vencido o no válido: solo nuestro texto. Otro error: el mensaje de la API.
          esEnlaceVencido(error) || !error ? (
            "Este enlace ya no es válido: puede haber vencido o ya se usó. Pide uno nuevo y te lo enviamos a tu correo."
          ) : (
            <span className="text-[#FF9B9B]">{error}</span>
          )
        )}
      </EstadoAcceso>

      {enviado ? (
        <>
          <Link href="/perfil" className="kb-btn kb-btn--primary w-full">
            Ir a mi cuenta
          </Link>
          <div className="mt-4">
            <BotonReenviar onReenviar={pedirEnlace} />
          </div>
        </>
      ) : conSesion ? (
        <>
          {estado === "pedir" && error && <p className="kb-alert kb-alert--error mb-3.5">{error}</p>}
          <button type="button" onClick={pedirPrimeraVez} disabled={enviando} className="kb-btn kb-btn--primary w-full">
            {enviando ? "Enviando..." : "Enviar un enlace nuevo"}
          </button>
        </>
      ) : (
        <>
          <Link href={VOLVER_PARA_PEDIR} className="kb-btn kb-btn--primary w-full">
            Inicia sesión para pedir uno nuevo
          </Link>
          <p className="mt-3 text-center text-[13px] text-ondark">Después de entrar, vuelves aquí para pedirlo.</p>
        </>
      )}
    </AccesoLayout>
  );
}

export default function VerificarCorreoPage() {
  return (
    <Suspense fallback={null}>
      <VerificacionCorreo />
    </Suspense>
  );
}
