"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  actualizarMiPerfil,
  actualizarMiIdentidad,
  cambiarPassword,
  subirFotoPerfil,
  solicitarCambioCorreo,
  type MiPerfil,
} from "@/lib/api";
import { tokenValido, borrarToken } from "@/lib/auth";
import { CampoPassword } from "@/components/CampoPassword";

export function TabDatosPersonales({
  perfil,
  onActualizado,
  onExito,
}: {
  perfil: MiPerfil;
  onActualizado: (cambios: Partial<MiPerfil>) => void;
  onExito: (mensaje: string) => void;
}) {
  const router = useRouter();
  const [telefono, setTelefono] = useState(perfil.telefono ?? "");
  const [fotoUrl, setFotoUrl] = useState(perfil.fotoUrl ?? "");
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);

  // Ítem 6, Fase 2 (03-ago-2026) -- separado del formulario libre de
  // arriba a propósito: nombre/cédula llevan el límite de 90 días.
  const [nombreIdentidad, setNombreIdentidad] = useState(perfil.nombreCompleto);
  const [cedulaIdentidad, setCedulaIdentidad] = useState(perfil.cedula ?? "");
  const [guardandoIdentidad, setGuardandoIdentidad] = useState(false);
  const [errorIdentidad, setErrorIdentidad] = useState<string | null>(null);

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);

  const [correoNuevo, setCorreoNuevo] = useState("");
  const [passwordParaCorreo, setPasswordParaCorreo] = useState("");
  const [solicitandoCambioCorreo, setSolicitandoCambioCorreo] = useState(false);
  const [errorCambioCorreo, setErrorCambioCorreo] = useState<string | null>(null);
  const [correoSolicitudEnviada, setCorreoSolicitudEnviada] = useState(false);

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setErrorPerfil(null);
    const token = tokenValido();
    if (!token) return;
    setGuardandoPerfil(true);
    try {
      await actualizarMiPerfil(token, {
        telefono: telefono.trim(),
        fotoUrl: fotoUrl.trim(),
      });
      onActualizado({ telefono, fotoUrl });
      onExito("Perfil actualizado.");
    } catch (err) {
      setErrorPerfil(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoPerfil(false);
    }
  }

  /**
   * Ítem 6, Fase 2 (03-ago-2026) -- separado de guardarPerfil a
   * propósito, mismo límite de 90 días que el backend. El mensaje de
   * error del backend ya trae los días restantes, se muestra tal cual.
   */
  async function guardarIdentidad(e: React.FormEvent) {
    e.preventDefault();
    setErrorIdentidad(null);
    const token = tokenValido();
    if (!token) return;
    setGuardandoIdentidad(true);
    try {
      await actualizarMiIdentidad(token, {
        nombreCompleto: nombreIdentidad.trim(),
        cedula: cedulaIdentidad.trim(),
      });
      onActualizado({
        nombreCompleto: nombreIdentidad,
        cedula: cedulaIdentidad,
        puedeEditarIdentidad: false,
        diasRestantesParaEditarIdentidad: 90,
      });
      onExito("Nombre y cédula actualizados. Podrás volver a cambiarlos en 90 días.");
    } catch (err) {
      setErrorIdentidad(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoIdentidad(false);
    }
  }

  async function guardarPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorPassword(null);
    const token = tokenValido();
    if (!token) return;
    setCambiandoPassword(true);
    try {
      await cambiarPassword(token, passwordActual, passwordNueva);
      setPasswordActual("");
      setPasswordNueva("");
      onExito("Contraseña actualizada.");
    } catch (err) {
      setErrorPassword(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setCambiandoPassword(false);
    }
  }

  /**
   * Cambio de correo (29-jul-2026, hallazgo real del usuario) — sin
   * esto, quien pierde acceso a su correo queda fuera de su cuenta
   * para siempre. El correo no cambia todavía aquí: recién cambia
   * cuando el usuario confirma desde el enlace que le llega al correo
   * nuevo (ver /confirmar-cambio-correo).
   */
  async function solicitarCambio(e: React.FormEvent) {
    e.preventDefault();
    setErrorCambioCorreo(null);
    const token = tokenValido();
    if (!token) return;
    setSolicitandoCambioCorreo(true);
    try {
      await solicitarCambioCorreo(token, correoNuevo, passwordParaCorreo);
      setCorreoSolicitudEnviada(true);
      setPasswordParaCorreo("");
    } catch (err) {
      setErrorCambioCorreo(
        err instanceof Error ? err.message : "No se pudo solicitar el cambio de correo.",
      );
    } finally {
      setSolicitandoCambioCorreo(false);
    }
  }

  function cerrarSesion() {
    borrarToken();
    router.push("/");
  }

  return (
    // En pantalla ancha (1280 px o más) las tarjetas fluyen en dos columnas sin huecos entre ellas;
    // en celular y tablet van una debajo de otra, en el mismo orden.
    <div className="grid gap-4 xl:block xl:columns-2 xl:gap-4">
      {/* Tarjeta de identidad -- movida a la cabecera de page.tsx
          (15-ago-2026, hallazgo real del director): estaba duplicada
          con el resto de "Mi cuenta", y solo aparecía en esta pestaña
          en vez de en todas. */}
      {/* Identidad -- nombre y cédula, límite de 90 días (ítem 6, Fase
          2, 03-ago-2026). Separado del formulario libre de abajo a
          propósito: protege boletos ya comprados a tu nombre. */}
      <form
        onSubmit={guardarIdentidad}
        className="space-y-4 kb-card kb-on-white p-6 xl:mb-4 xl:break-inside-avoid"
      >
        <div>
          <h2 className="text-base font-bold text-brand-dark">Identidad</h2>
          <p className="mt-1 text-xs text-muted-2">
            Nombre y cédula solo se pueden cambiar cada 90 días, para proteger boletos ya
            comprados a tu nombre.
          </p>
        </div>
        {!perfil.puedeEditarIdentidad && (
          <p className="kb-alert kb-alert--info">
            Podrás editar tu nombre y cédula de nuevo en {perfil.diasRestantesParaEditarIdentidad}{" "}
            día(s).
          </p>
        )}
        <div>
          <label htmlFor="perfil-nombre" className="kb-label">
            Nombre completo
          </label>
          <input
id="perfil-nombre"
            autoComplete="name"
            type="text"
            value={nombreIdentidad}
            onChange={(e) => setNombreIdentidad(e.target.value)}
            disabled={!perfil.puedeEditarIdentidad}
            className="kb-input disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="perfil-cedula" className="kb-label">
            Cédula / documento
          </label>
          <input
id="perfil-cedula"
            autoComplete="off"
            type="text"
            value={cedulaIdentidad}
            onChange={(e) => setCedulaIdentidad(e.target.value)}
            disabled={!perfil.puedeEditarIdentidad}
            className="kb-input disabled:opacity-60"
          />
        </div>
        {errorIdentidad && <p className="text-sm font-medium text-kberror">{errorIdentidad}</p>}
        <button
          type="submit"
          disabled={guardandoIdentidad || !perfil.puedeEditarIdentidad}
          className="kb-btn kb-btn--dark !h-12 !px-6 !text-sm"
        >
          {guardandoIdentidad ? "Guardando..." : "Guardar identidad"}
        </button>
      </form>

      {/* Datos editables */}
      <form
        onSubmit={guardarPerfil}
        className="space-y-4 kb-card kb-on-white p-6 xl:mb-4 xl:break-inside-avoid"
      >
        <h2 className="text-base font-bold text-brand-dark">Mis datos</h2>
        <div>
          <label htmlFor="perfil-correo" className="kb-label">
            Correo
          </label>
          <input
id="perfil-correo"
            autoComplete="email"
            type="text"
            value={perfil.correo}
            disabled
            className="kb-input disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="perfil-whatsapp" className="kb-label">
            WhatsApp
          </label>
          <input
id="perfil-whatsapp"
            autoComplete="tel"
            type="text"
            inputMode="numeric"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10 dígitos"
            className="kb-input"
          />
        </div>
        <div>
          <label htmlFor="perfil-foto" className="kb-label">
            Foto de perfil
          </label>
          <input
id="perfil-foto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const archivo = e.target.files?.[0];
              if (!archivo) return;
              const token = tokenValido();
              if (!token) return;
              setErrorPerfil(null);
              setSubiendoFoto(true);
              try {
                const url = await subirFotoPerfil(token, archivo);
                setFotoUrl(url);
                onActualizado({ fotoUrl: url });
                onExito("Foto de perfil actualizada.");
              } catch (err) {
                setErrorPerfil(err instanceof Error ? err.message : "No se pudo subir la foto.");
              } finally {
                setSubiendoFoto(false);
              }
            }}
            disabled={subiendoFoto}
            className="kb-input !h-auto py-3 file:mr-3 file:rounded-xl file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-50"
          />
          {subiendoFoto && <p className="mt-1 text-xs text-muted-2">Subiendo…</p>}
          <p className="mt-1 text-xs text-muted-2">JPG, PNG o WEBP, hasta 5 MB.</p>
        </div>
        {errorPerfil && <p className="text-sm font-medium text-kberror">{errorPerfil}</p>}
        <button
          type="submit"
          disabled={guardandoPerfil}
          className="kb-btn kb-btn--dark !h-12 !px-6 !text-sm"
        >
          {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      {/* Cambiar contraseña */}
      <form
        onSubmit={guardarPassword}
        className="space-y-4 kb-card kb-on-white p-6 xl:mb-4 xl:break-inside-avoid"
      >
        <h2 className="text-base font-bold text-brand-dark">Cambiar contraseña</h2>
        <div>
          <label htmlFor="perfil-password-actual" className="kb-label">
            Contraseña actual
          </label>
          <CampoPassword id="perfil-password-actual" autoComplete="current-password" value={passwordActual} onChange={setPasswordActual} />
        </div>
        <div>
          <label htmlFor="perfil-password-nueva" className="kb-label">
            Nueva contraseña
          </label>
          <CampoPassword id="perfil-password-nueva" autoComplete="new-password" value={passwordNueva} onChange={setPasswordNueva} placeholder="Mínimo 8 caracteres" />
        </div>
        {errorPassword && <p className="text-sm font-medium text-kberror">{errorPassword}</p>}
        <button
          type="submit"
          disabled={cambiandoPassword || !passwordActual || !passwordNueva}
          className="kb-btn kb-btn--dark !h-12 !px-6 !text-sm"
        >
          {cambiandoPassword ? "Cambiando..." : "Cambiar contraseña"}
        </button>
      </form>

      {/* Cambiar correo — hallazgo real del usuario (29-jul-2026): si pierdes acceso a tu correo, quedarías fuera de tu cuenta sin esto. */}
      <form
        onSubmit={solicitarCambio}
        className="space-y-4 kb-card kb-on-white p-6 xl:mb-4 xl:break-inside-avoid"
      >
        <h2 className="text-base font-bold text-brand-dark">Cambiar correo</h2>
        <p className="text-xs text-muted-2">
          Correo actual: <span className="font-semibold">{perfil.correo}</span>
        </p>
        {correoSolicitudEnviada ? (
          <p className="kb-alert kb-alert--ok">
            Te enviamos un enlace de confirmación a tu correo nuevo. Tu correo actual sigue activo
            hasta que confirmes.
          </p>
        ) : (
          <>
            <div>
              <label htmlFor="perfil-correo-nuevo" className="kb-label">
                Correo nuevo
              </label>
              <input
id="perfil-correo-nuevo"
            autoComplete="email"
                type="email"
                value={correoNuevo}
                onChange={(e) => setCorreoNuevo(e.target.value)}
                className="kb-input"
              />
            </div>
            <div>
              <label htmlFor="perfil-password-correo" className="kb-label">
                Tu contraseña actual (para confirmar que eres tú)
              </label>
              <CampoPassword id="perfil-password-correo" autoComplete="current-password" value={passwordParaCorreo} onChange={setPasswordParaCorreo} />
            </div>
            {errorCambioCorreo && (
              <p className="text-sm font-medium text-kberror">{errorCambioCorreo}</p>
            )}
            <button
              type="submit"
              disabled={solicitandoCambioCorreo || !correoNuevo || !passwordParaCorreo}
              className="kb-btn kb-btn--dark !h-12 !px-6 !text-sm"
            >
              {solicitandoCambioCorreo ? "Enviando..." : "Solicitar cambio de correo"}
            </button>
          </>
        )}
      </form>

      <button
        onClick={cerrarSesion}
        className="kb-btn kb-btn--outline w-full xl:[column-span:all]"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
