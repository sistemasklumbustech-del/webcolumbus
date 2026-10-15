"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { obtenerMiPerfil, subirFotoPerfil, type MiPerfil } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { Toast } from "@/components/Toast";
import { TabDatosPersonales } from "./TabDatosPersonales";
import { TabMisBoletos } from "./TabMisBoletos";
import { TabMisCreditos } from "./TabMisCreditos";
import { TabWallet } from "./TabWallet";
import { TabReferidos } from "./TabReferidos";
import { TabMisReclamos } from "./TabMisReclamos";

/**
 * "Mi cuenta" unificada (29-jul-2026) — antes, datos personales y
 * boletos vivían en dos páginas sueltas (/perfil y /mis-boletos), sin
 * conexión visual entre sí. Ahora es una sola sección con pestañas,
 * el patrón que usan las mejores plataformas (una sola "área de
 * cuenta", no pantallas dispersas).
 *
 * Rediseño 15-ago-2026 -- hallazgo real del director en el recorrido
 * en vivo de producción: la versión anterior se veía como una lista
 * de formularios angosta (max-w-lg, ~512px, igual en celular que en
 * monitor grande), y wallet/referidos ni siquiera existían como
 * pestañas -- el backend de ambos ya funcionaba de punta a punta,
 * pero el pasajero no tenía dónde verlo. Dirección real: la
 * identidad como un pase de abordar de verdad (mismo lenguaje visual
 * que ya usa el boleto PDF), no una tarjeta de gradiente genérica.
 */
const PESTANAS = [
  { valor: "datos", etiqueta: "Mis datos" },
  { valor: "boletos", etiqueta: "Mis boletos" },
  { valor: "reclamos", etiqueta: "Mis reclamos" },
  { valor: "wallet", etiqueta: "Mi saldo" },
  { valor: "referidos", etiqueta: "Invitar y ganar" },
  { valor: "creditos", etiqueta: "Créditos" },
] as const;

type Pestana = (typeof PESTANAS)[number]["valor"];

function MiCuenta() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [qrCodigoPasajero, setQrCodigoPasajero] = useState<string | null>(null);
  // Fase perfil-moderno (24-ago-2026) -- botón de cámara sobre el
  // avatar del encabezado, mismo endpoint/función real que ya existía
  // (`subirFotoPerfil`, usada hasta ahora solo en la pestaña "Mis
  // datos"). Estado propio aquí porque el disparador vive en el
  // encabezado, fuera de `TabDatosPersonales`.
  const [subiendoFotoHeader, setSubiendoFotoHeader] = useState(false);
  const [errorFotoHeader, setErrorFotoHeader] = useState<string | null>(null);

  const pestanaParam = searchParams.get("tab");
  const valoresValidos = PESTANAS.map((p) => p.valor);
  const pestanaActiva: Pestana = (
    valoresValidos.includes(pestanaParam as Pestana) ? pestanaParam : "datos"
  ) as Pestana;

  useEffect(() => {
    const token = tokenValido();
    if (!token) {
      router.push(`/ingresar?volverA=${encodeURIComponent("/perfil")}`);
      return;
    }
    obtenerMiPerfil(token)
      .then(setPerfil)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar tu perfil."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!perfil) return;
    QRCode.toDataURL(perfil.codigoPasajero, { margin: 1, width: 160 })
      .then(setQrCodigoPasajero)
      .catch(() => setQrCodigoPasajero(null));
  }, [perfil]);

  async function subirFotoDesdeHeader(archivo: File) {
    const token = tokenValido();
    if (!token) return;
    setErrorFotoHeader(null);
    setSubiendoFotoHeader(true);
    try {
      const url = await subirFotoPerfil(token, archivo);
      setPerfil((p) => (p ? { ...p, fotoUrl: url } : p));
      setMensajeExito("Foto de perfil actualizada.");
    } catch (err) {
      setErrorFotoHeader(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setSubiendoFotoHeader(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-16">
        <div className="kb-alert kb-alert--error">{error}</div>
      </main>
    );
  }

  if (!perfil) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-16 text-center text-sm text-muted-2">
        Cargando...
      </main>
    );
  }

  const iniciales = perfil.nombreCompleto
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <main className="flex-1">
      {/* El ancho vive en un <div> anidado: el <main> es hijo flex directo del body y no debe llevar mx-auto/max-w. */}
      <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-16 md:py-8">
        <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

        <div className="kb-topbar">
          <div>
            <h1>Mi cuenta</h1>
            <p>Tus datos, boletos, saldo y reclamos en un solo lugar.</p>
          </div>
        </div>

        {/* Identidad (rediseño final): tarjeta negra con foto, datos del viajero y el QR de pasajero. */}
        <div className="kb-card kb-card--dark flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-7">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="relative shrink-0">
              <div className="relative h-20 w-20 overflow-hidden rounded-full bg-kbyellow ring-4 ring-ink-3 md:h-24 md:w-24">
                {perfil.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica (almacenamiento configurable), no un asset local
                  <img src={perfil.fotoUrl} alt={perfil.nombreCompleto} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-ink md:text-3xl">
                    {iniciales || "P"}
                  </div>
                )}
              </div>
              <label
                htmlFor="perfil-foto-header"
                aria-label="Cambiar foto de perfil"
                className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-ink shadow-[0_2px_10px_rgba(11,13,18,.25)] transition hover:bg-kbyellow"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </label>
              <input
                id="perfil-foto-header"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={subiendoFotoHeader}
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  if (archivo) subirFotoDesdeHeader(archivo);
                }}
              />
            </div>

            <div className="min-w-0">
              <p className="text-xl font-semibold leading-tight md:text-2xl">{perfil.nombreCompleto}</p>
              {subiendoFotoHeader && <p className="mt-1 text-xs text-ondark">Subiendo foto…</p>}
              {errorFotoHeader && <p className="mt-1 text-xs font-medium text-[#FF8A8A]">{errorFotoHeader}</p>}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="kb-tag bg-ink-2 text-ondark">
                  Viajero desde{" "}
                  {new Date(perfil.creadoEn).toLocaleDateString("es-EC", { month: "long", year: "numeric" })}
                </span>
                <span className="kb-tag bg-ink-2 text-ondark">
                  {perfil.viajesCompletados ?? 0}{" "}
                  {perfil.viajesCompletados === 1 ? "viaje completado" : "viajes completados"}
                </span>
                <span className="kb-tag kb-tag--yellow tracking-wide">{perfil.codigoPasajero}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-ctrl bg-ink-2 p-3.5 md:max-w-sm">
            {qrCodigoPasajero && (
              // eslint-disable-next-line @next/next/no-img-element -- data URL generada en el cliente
              <img
                src={qrCodigoPasajero}
                alt={`Código de pasajero ${perfil.codigoPasajero}`}
                className="h-16 w-16 shrink-0 rounded-xl bg-white p-1"
              />
            )}
            <p className="text-xs text-ondark">
              Muestra este código QR en el terminal para verificar tu identidad, aunque no tengas tu boleto a
              mano.
            </p>
          </div>
        </div>

        <nav className="kb-subnav mt-6" aria-label="Secciones de mi cuenta">
          {PESTANAS.map((p) => (
            <Link
              key={p.valor}
              href={`/perfil?tab=${p.valor}`}
              scroll={false}
              aria-current={pestanaActiva === p.valor ? "page" : undefined}
              className={pestanaActiva === p.valor ? "is-active" : ""}
            >
              {p.etiqueta}
            </Link>
          ))}
        </nav>

        <div className="min-w-0">
          {pestanaActiva === "datos" && (
            <div className="max-w-3xl">
              <TabDatosPersonales
                perfil={perfil}
                onActualizado={(cambios) => setPerfil((p) => (p ? { ...p, ...cambios } : p))}
                onExito={setMensajeExito}
              />
            </div>
          )}
          {pestanaActiva === "boletos" && (
            <div className="max-w-3xl">
              <TabMisBoletos onExito={setMensajeExito} />
            </div>
          )}
          {pestanaActiva === "reclamos" && (
            <div className="max-w-3xl">
              <TabMisReclamos />
            </div>
          )}
          {pestanaActiva === "wallet" && <TabWallet />}
          {pestanaActiva === "referidos" && <TabReferidos perfil={perfil} />}
          {pestanaActiva === "creditos" && (
            <div className="max-w-3xl">
              <TabMisCreditos />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={null}>
      <MiCuenta />
    </Suspense>
  );
}
