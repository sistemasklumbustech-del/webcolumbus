"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verificarCorreo } from "@/lib/api";

type Estado = "verificando" | "listo" | "error";

function VerificacionCorreo() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [estado, setEstado] = useState<Estado>("verificando");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
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
  }, [token]);

  return (
    <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-black/5">
        <h1 className="font-display text-2xl font-bold text-brand-dark">Verificación de correo</h1>

        {estado === "verificando" && <p className="mt-4 text-sm text-brand-dark/70">Verificando...</p>}
        {estado === "listo" && (
          <p className="mt-4 text-sm text-brand-dark/70">
            Tu correo quedó verificado. Ya podés usar todas las funciones de tu cuenta.
          </p>
        )}
        {estado === "error" && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        <p className="mt-6">
          <Link href="/" className="font-semibold text-brand hover:underline">
            Ir al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function VerificarCorreoPage() {
  return (
    <Suspense fallback={null}>
      <VerificacionCorreo />
    </Suspense>
  );
}
