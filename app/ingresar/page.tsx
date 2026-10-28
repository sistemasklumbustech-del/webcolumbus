"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  login,
  iniciarConfiguracion2fa,
  confirmarConfiguracion2fa,
  verificar2fa,
  recuperarCon2fa,
} from "@/lib/api";
import { guardarToken, decodificarToken } from "@/lib/auth";
import { CampoPassword } from "@/components/CampoPassword";
import { EntradaCodigoOtp } from "@/components/EntradaCodigoOtp";
import { AccesoLayout, TarjetaAccesoCentrada } from "@/components/AccesoLayout";

type Paso = "login" | "configurar" | "verificar" | "recuperacion" | "codigos-generados";

function FormularioIngreso() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [paso, setPaso] = useState<Paso>("login");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Ítem 19 (06-ago-2026) -- estado del flujo de 2FA.
  const [tokenTemporal, setTokenTemporal] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secreto, setSecreto] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoRecuperacion, setCodigoRecuperacion] = useState("");
  const [codigosGenerados, setCodigosGenerados] = useState<string[]>([]);
  const [codigosCopiados, setCodigosCopiados] = useState(false);
  const [accessTokenPendiente, setAccessTokenPendiente] = useState("");

  /**
   * Ítem 19 -- destino según rol, reutilizado en las 4 formas de
   * terminar el login (directo, tras configurar 2FA, tras verificar
   * 2FA, tras recuperación). Bug real encontrado y corregido de paso:
   * super_admin (ítem 9, 04-ago-2026) nunca se agregó aquí -- antes
   * hubiera terminado en la portada de pasajero en vez de /admin.
   */
  function navegarSegunRol(accessToken: string) {
    guardarToken(accessToken);
    const volverA = searchParams.get("volverA");
    if (volverA) {
      router.push(volverA);
    } else {
      const payload = decodificarToken(accessToken);
      if (payload?.rol === "admin_plataforma" || payload?.rol === "super_admin") {
        router.push("/admin");
      } else if (payload?.rol === "admin_cooperativa" || payload?.rol === "vendedor") {
        router.push("/panel-empresa");
      } else {
        router.push("/");
      }
    }
    router.refresh();
  }

  async function enviarLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const respuesta = await login(correo, password);

      if ("accessToken" in respuesta) {
        navegarSegunRol(respuesta.accessToken);
        return;
      }

      setTokenTemporal(respuesta.tokenTemporal);

      if ("requiereConfigurar2fa" in respuesta) {
        const config = await iniciarConfiguracion2fa(respuesta.tokenTemporal);
        setQrDataUrl(config.qrDataUrl);
        setSecreto(config.secreto);
        setPaso("configurar");
      } else {
        setPaso("verificar");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  async function enviarConfiguracion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resultado = await confirmarConfiguracion2fa(tokenTemporal, codigo);
      setAccessTokenPendiente(resultado.accessToken);
      setCodigosGenerados(resultado.codigosRecuperacion);
      setPaso("codigos-generados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "El código no es válido.");
      setCodigo("");
    } finally {
      setCargando(false);
    }
  }

  async function enviarVerificacion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resultado = await verificar2fa(tokenTemporal, codigo);
      navegarSegunRol(resultado.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "El código no es válido.");
      setCodigo("");
    } finally {
      setCargando(false);
    }
  }

  async function enviarRecuperacion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resultado = await recuperarCon2fa(tokenTemporal, codigoRecuperacion);
      navegarSegunRol(resultado.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ese código de recuperación no es válido.");
    } finally {
      setCargando(false);
    }
  }

  function copiarCodigos() {
    navigator.clipboard.writeText(codigosGenerados.join("\n"));
    setCodigosCopiados(true);
    setTimeout(() => setCodigosCopiados(false), 2000);
  }

  // ── Pantalla: configurar 2FA por primera vez (QR + código) ──
  if (paso === "configurar") {
    return (
      <TarjetaAccesoCentrada>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-kbyellow text-ink">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="mt-4 text-center text-xl font-semibold">Activa la verificación en dos pasos</h1>
        <p className="mt-2 text-center text-sm text-ondark">
          Es obligatoria para cuentas administrativas. Escanea este código con tu app
          autenticadora (Google Authenticator, Authy, etc.).
        </p>

        <div className="mt-6 flex justify-center rounded-ctrl bg-white p-4">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen generada como data URL, no un asset local
            <img src={qrDataUrl} alt="Código QR de configuración" className="h-44 w-44" />
          ) : (
            <div className="flex h-44 w-44 items-center justify-center text-sm text-muted-3">Generando...</div>
          )}
        </div>

        <details className="mt-3 text-center text-xs text-ondark">
          <summary className="cursor-pointer font-semibold text-kbyellow hover:underline">
            ¿No puedes escanear el código?
          </summary>
          <p className="mt-2">Ingresa este código manualmente en tu app:</p>
          <p className="mt-1 break-all rounded-xl bg-ink-2 px-3 py-2 font-mono text-sm text-white">{secreto}</p>
        </details>

        <form onSubmit={enviarConfiguracion} className="mt-6 flex flex-col gap-4">
          <div>
            <label id="config-2fa-codigo-label" className="kb-label text-center">
              Código de 6 dígitos
            </label>
            <div role="group" aria-labelledby="config-2fa-codigo-label">
              <EntradaCodigoOtp valor={codigo} onChange={setCodigo} />
            </div>
          </div>

          {error && <p className="kb-alert kb-alert--error justify-center text-center">{error}</p>}

          <button type="submit" disabled={cargando || codigo.length !== 6} className="kb-btn kb-btn--primary w-full">
            {cargando ? "Activando..." : "Activar 2FA"}
          </button>
        </form>
      </TarjetaAccesoCentrada>
    );
  }

  // ── Pantalla: códigos de recuperación (una sola vez, tras activar) ──
  if (paso === "codigos-generados") {
    return (
      <TarjetaAccesoCentrada>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg text-ok">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-4 text-center text-xl font-semibold">2FA activado</h1>

        <div className="kb-alert kb-alert--info mt-4 flex-col !gap-1">
          <p className="font-semibold text-ink">Guarda estos 10 códigos de recuperación ahora.</p>
          <p className="text-xs">
            Solo se muestran esta vez. Si pierdes tu teléfono, son la única forma de recuperar el
            acceso a tu cuenta.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-ctrl bg-ink-2 p-4 font-mono text-sm text-white">
          {codigosGenerados.map((c) => (
            <span key={c} className="text-center">
              {c}
            </span>
          ))}
        </div>

        <button type="button" onClick={copiarCodigos} className="kb-btn mt-4 w-full bg-ink-2 text-white shadow-[inset_0_0_0_1px_#262A35]">
          {codigosCopiados ? "¡Copiados!" : "Copiar todos los códigos"}
        </button>

        <button type="button" onClick={() => navegarSegunRol(accessTokenPendiente)} className="kb-btn kb-btn--primary mt-3 w-full">
          Ya los guardé, continuar
        </button>
      </TarjetaAccesoCentrada>
    );
  }

  // ── Pantalla: recuperación con código de un solo uso ──
  if (paso === "recuperacion") {
    return (
      <TarjetaAccesoCentrada>
        <h1 className="text-center text-xl font-semibold">Código de recuperación</h1>
        <p className="mt-2 text-center text-sm text-ondark">
          Ingresa uno de los 10 códigos que guardaste al activar la verificación en dos pasos.
        </p>

        <form onSubmit={enviarRecuperacion} className="mt-6 flex flex-col gap-4">
          <input
            type="text"
            required
            maxLength={10}
            autoFocus
            value={codigoRecuperacion}
            onChange={(e) => setCodigoRecuperacion(e.target.value.toUpperCase())}
            placeholder="XXXXXXXXXX"
            aria-label="Código de recuperación"
            className="kb-input text-center font-mono !text-lg tracking-widest"
          />

          {error && <p className="kb-alert kb-alert--error justify-center text-center">{error}</p>}

          <button type="submit" disabled={cargando} className="kb-btn kb-btn--primary w-full">
            {cargando ? "Verificando..." : "Continuar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setCodigo("");
            setPaso("verificar");
          }}
          className="mt-4 w-full text-center text-sm font-semibold text-kbyellow hover:underline"
        >
          Volver a usar el código de mi app
        </button>
      </TarjetaAccesoCentrada>
    );
  }

  // ── Pantalla: verificar 2FA en un login normal (cuenta ya configurada) ──
  if (paso === "verificar") {
    return (
      <TarjetaAccesoCentrada>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-kbyellow text-ink">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="mt-4 text-center text-xl font-semibold">Verificación en dos pasos</h1>
        <p className="mt-2 text-center text-sm text-ondark">Ingresa el código de 6 dígitos de tu app autenticadora.</p>

        <form onSubmit={enviarVerificacion} className="mt-6 flex flex-col gap-4">
          <EntradaCodigoOtp valor={codigo} onChange={setCodigo} />

          {error && <p className="kb-alert kb-alert--error justify-center text-center">{error}</p>}

          <button type="submit" disabled={cargando || codigo.length !== 6} className="kb-btn kb-btn--primary w-full">
            {cargando ? "Verificando..." : "Continuar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setCodigo("");
            setPaso("recuperacion");
          }}
          className="mt-4 w-full text-center text-sm font-semibold text-kbyellow hover:underline"
        >
          ¿Perdiste el acceso a tu app autenticadora?
        </button>
      </TarjetaAccesoCentrada>
    );
  }

  // ── Pantalla: login normal (correo + contraseña) ──
  return (
    <AccesoLayout
      titulo="Tus viajes,"
      destacado="en un solo lugar."
      puntos={["Boletos con QR", "Compra sin filas", "Todas las cooperativas"]}
      pestana="ingresar"
      volverA={searchParams.get("volverA")}
    >
      <h1 className="text-[26px] font-semibold md:text-[30px]">Bienvenido de nuevo</h1>
      <p className="mb-5 mt-1 text-sm text-ondark">Entra para ver tus boletos</p>
      {searchParams.get("sesion") === "vencida" && (
        <p className="kb-alert kb-alert--info mb-3.5">Tu sesión venció. Vuelve a iniciar sesión para continuar.</p>
      )}

      <form onSubmit={enviarLogin} className="flex flex-col gap-3.5">
        <div>
          <label htmlFor="login-correo" className="kb-label">
            Correo
          </label>
          <input
            id="login-correo"
            type="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="kb-input"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="kb-label">
            Contraseña
          </label>
          <CampoPassword id="login-password" value={password} onChange={setPassword} />
        </div>
        <Link href="/recuperar-password" className="self-end text-[13px] text-ondark hover:text-white">
          ¿Olvidaste tu contraseña?
        </Link>

        {error && <p className="kb-alert kb-alert--error">{error}</p>}

        <button type="submit" disabled={cargando} className="kb-btn kb-btn--primary w-full">
          {cargando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ondark">
        ¿No tienes cuenta?{" "}
        <Link
          href={`/registro${searchParams.get("volverA") ? `?volverA=${encodeURIComponent(searchParams.get("volverA")!)}` : ""}`}
          className="font-semibold text-kbyellow hover:underline"
        >
          Regístrate
        </Link>
      </p>
    </AccesoLayout>
  );
}

export default function IngresarPage() {
  return (
    <Suspense fallback={null}>
      <FormularioIngreso />
    </Suspense>
  );
}
