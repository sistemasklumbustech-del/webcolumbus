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
    <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
        <h1 className="font-display text-2xl font-bold text-brand-dark">Nueva contraseña</h1>

        {!token ? (
          <p className="mt-4 text-sm font-medium text-red-600">
            Este enlace no es válido. Pedí uno nuevo desde{" "}
            <Link href="/recuperar-password" className="font-semibold text-brand hover:underline">
              recuperar contraseña
            </Link>
            .
          </p>
        ) : listo ? (
          <p className="mt-4 text-sm text-brand-dark/70">
            Tu contraseña fue actualizada. Te llevamos a iniciar sesión...
          </p>
        ) : (
          <form onSubmit={enviar} className="mt-6 space-y-4">
            <div>
              <label htmlFor="nueva-password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                Nueva contraseña
              </label>
              <CampoPassword id="nueva-password" value={password} onChange={setPassword} autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="confirmar-password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                Confirmar contraseña
              </label>
              <CampoPassword id="confirmar-password" value={confirmacion} onChange={setConfirmacion} autoComplete="new-password" />
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
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
