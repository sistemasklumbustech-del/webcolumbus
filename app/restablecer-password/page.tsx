"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { restablecerPassword } from "@/lib/api";
import { CampoPassword } from "@/components/CampoPassword";

function FormularioRestablecer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

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

  return (
    <main className="kb-on-white flex flex-1 items-center justify-center bg-kbbg px-4 py-16">
      <div className="w-full max-w-sm kb-card kb-on-white p-8 shadow-lg ring-1 ring-line">
        <h1 className="text-2xl font-bold text-brand-dark">Nueva contraseña</h1>

        {!token ? (
          <p className="mt-4 text-sm font-medium text-kberror">
            Este enlace no es válido. Pedí uno nuevo desde{" "}
            <Link href="/recuperar-password" className="font-semibold text-brand hover:underline">
              recuperar contraseña
            </Link>
            .
          </p>
        ) : listo ? (
          <p className="mt-4 text-sm text-muted-2">
            Tu contraseña fue actualizada. Te llevamos a iniciar sesión...
          </p>
        ) : (
          <form onSubmit={enviar} className="mt-6 space-y-4">
            <div>
              <label htmlFor="nueva-password" className="kb-label">
                Nueva contraseña
              </label>
              <CampoPassword id="nueva-password" value={password} onChange={setPassword} autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="confirmar-password" className="kb-label">
                Confirmar contraseña
              </label>
              <CampoPassword id="confirmar-password" value={confirmacion} onChange={setConfirmacion} autoComplete="new-password" />
            </div>
            {error && <p className="text-sm font-medium text-kberror">{error}</p>}
            <button
              type="submit"
              disabled={cargando}
              className="kb-btn kb-btn--dark w-full disabled:opacity-60"
            >
              {cargando ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <Suspense fallback={null}>
      <FormularioRestablecer />
    </Suspense>
  );
}
