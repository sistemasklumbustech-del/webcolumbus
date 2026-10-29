"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { registrar } from "@/lib/api";
import { guardarToken } from "@/lib/auth";
import { CampoPassword } from "@/components/CampoPassword";
import { AccesoLayout } from "@/components/AccesoLayout";

/** Solo deja escribir dígitos, y corta en la cantidad exacta que pide cada documento. */
function soloDigitos(valor: string, maximo: number) {
  return valor.replace(/\D/g, "").slice(0, maximo);
}

function FormularioRegistro() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (cedula.length !== 10) {
      setError("La cédula debe tener exactamente 10 dígitos.");
      return;
    }
    if (telefono.length !== 10) {
      setError("El WhatsApp debe tener exactamente 10 dígitos.");
      return;
    }
    if (!aceptoTerminos) {
      setError("Debes aceptar los Términos y Condiciones para continuar.");
      return;
    }
    setCargando(true);
    try {
      const { accessToken } = await registrar({
        correo,
        password,
        nombres,
        apellidos,
        cedula,
        telefono,
        aceptoTerminos,
      });
      guardarToken(accessToken);
      const volverA = searchParams.get("volverA");
      router.push(volverA ?? "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar el registro.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <AccesoLayout
      titulo="Compra más rápido"
      destacado="con tu cuenta."
      puntos={["Datos guardados", "Historial de boletos"]}
      pestana="registro"
      volverA={searchParams.get("volverA")}
    >
      <h1 className="text-[26px] font-semibold md:text-[30px]">Crea tu cuenta</h1>
      <p className="mb-5 mt-1 text-sm text-ondark">Regístrate para comprar tu pasaje.</p>

      <form onSubmit={enviar} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="registro-nombres" className="kb-label">
              Nombres
            </label>
            <input
              id="registro-nombres"
              autoComplete="given-name"
              type="text"
              required
              minLength={2}
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              placeholder="Juan Andrés"
              className="kb-input"
            />
          </div>
          <div>
            <label htmlFor="registro-apellidos" className="kb-label">
              Apellidos
            </label>
            <input
              id="registro-apellidos"
              autoComplete="family-name"
              type="text"
              required
              minLength={2}
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              placeholder="Gómez Pérez"
              className="kb-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="registro-cedula" className="kb-label">
              Cédula
            </label>
            <input
              id="registro-cedula"
              autoComplete="off"
              type="text"
              inputMode="numeric"
              required
              value={cedula}
              onChange={(e) => setCedula(soloDigitos(e.target.value, 10))}
              placeholder="10 dígitos"
              className="kb-input tabular-nums"
            />
            {cedula.length > 0 && cedula.length < 10 && (
              <p className="mt-1 text-xs text-ondark">{cedula.length}/10 dígitos</p>
            )}
          </div>
          <div>
            <label htmlFor="registro-whatsapp" className="kb-label">
              WhatsApp
            </label>
            <input
              id="registro-whatsapp"
              autoComplete="tel"
              type="text"
              inputMode="numeric"
              required
              value={telefono}
              onChange={(e) => setTelefono(soloDigitos(e.target.value, 10))}
              placeholder="0991234567"
              className="kb-input tabular-nums"
            />
            {telefono.length > 0 && telefono.length < 10 && (
              <p className="mt-1 text-xs text-ondark">{telefono.length}/10 dígitos</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="registro-correo" className="kb-label">
            Correo
          </label>
          <input
            id="registro-correo"
            autoComplete="email"
            type="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="kb-input"
          />
        </div>
        <div>
          <label htmlFor="registro-password" className="kb-label">
            Contraseña
          </label>
          <CampoPassword id="registro-password" autoComplete="new-password" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />
        </div>

        <label htmlFor="registro-terminos" className="flex cursor-pointer items-center gap-2.5 text-[13px]">
          <input
            id="registro-terminos"
            type="checkbox"
            checked={aceptoTerminos}
            onChange={(e) => setAceptoTerminos(e.target.checked)}
            className="h-[22px] w-[22px] shrink-0 rounded-[7px]"
          />
          <span>
            Acepto los{" "}
            <Link href="/terminos" target="_blank" className="font-semibold text-kbyellow hover:underline">
              Términos y Condiciones
            </Link>
          </span>
        </label>

        {error && <p className="kb-alert kb-alert--error">{error}</p>}

        <button type="submit" disabled={cargando} className="kb-btn kb-btn--primary w-full">
          {cargando ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ondark">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={`/ingresar${searchParams.get("volverA") ? `?volverA=${encodeURIComponent(searchParams.get("volverA")!)}` : ""}`}
          className="font-semibold text-kbyellow hover:underline"
        >
          Iniciar sesión
        </Link>
      </p>
    </AccesoLayout>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <FormularioRegistro />
    </Suspense>
  );
}
