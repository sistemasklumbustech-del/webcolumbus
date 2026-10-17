"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { listarMisCreditos, obtenerMiPerfil, obtenerSaldoWallet, subirFotoPerfil, type MiPerfil } from "@/lib/api";
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
  { valor: "datos", etiqueta: "Mis datos", titulo: "Mis datos", detalle: "Tu identidad, contacto y seguridad de la cuenta.", icono: "perfil" },
  { valor: "boletos", etiqueta: "Mis boletos", titulo: "Mis boletos", detalle: "Tus viajes comprados, con el QR para abordar.", icono: "boleto" },
  { valor: "reclamos", etiqueta: "Mis reclamos", titulo: "Mis reclamos", detalle: "El seguimiento de lo que reportaste a las cooperativas.", icono: "reclamo" },
  { valor: "wallet", etiqueta: "Mi saldo", titulo: "Mi saldo", detalle: "Cashback por tus viajes y por tus referidos.", icono: "saldo" },
  { valor: "referidos", etiqueta: "Invitar y ganar", titulo: "Invitar y ganar", detalle: "Comparte tu código y gana saldo cuando tus amigos viajen.", icono: "invitar" },
  { valor: "creditos", etiqueta: "Créditos", titulo: "Mis créditos", detalle: "Saldo a favor por boletos reprogramados.", icono: "credito" },
] as const;

type IconoPestana = (typeof PESTANAS)[number]["icono"];

/** Íconos de línea (mismo trazo que el resto del sitio) para el menú lateral. */
function IconoMenu({ nombre }: { nombre: IconoPestana }) {
  const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...trazo}>
      {nombre === "perfil" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1-4.2 4-6 8-6s7 1.8 8 6" />
        </>
      )}
      {nombre === "boleto" && (
        <>
          <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z" />
          <path d="M14 6v12" strokeDasharray="2 2.5" />
        </>
      )}
      {nombre === "reclamo" && (
        <>
          <path d="M21 15a2 2 0 01-2 2H8l-5 4V6a2 2 0 012-2h14a2 2 0 012 2z" />
          <path d="M12 8v4M12 15h.01" />
        </>
      )}
      {nombre === "saldo" && (
        <>
          <rect x="3" y="6" width="18" height="13" rx="2.5" />
          <path d="M3 10h18M16 15h2" />
        </>
      )}
      {nombre === "invitar" && (
        <>
          <circle cx="9" cy="8" r="4" />
          <path d="M2 21c1-4 3.5-6 7-6s6 2 7 6M19 8v6M16 11h6" />
        </>
      )}
      {nombre === "credito" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10M15 9.5c-.6-.9-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.5-.6-3.1-1.5" />
        </>
      )}
    </svg>
  );
}

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
  // Cifras del encabezado (saldo y créditos): son un adorno informativo, así que si fallan
  // simplemente no se muestran -- nunca estorban la página.
  const [saldo, setSaldo] = useState<number | null>(null);
  const [creditoDisponible, setCreditoDisponible] = useState<number | null>(null);

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
    const token = tokenValido();
    if (!token) return;
    obtenerSaldoWallet(token).then(setSaldo).catch(() => setSaldo(null));
    listarMisCreditos(token)
      .then((lista) => setCreditoDisponible(lista.filter((c) => !c.usadoEn).reduce((suma, c) => suma + Number(c.monto), 0)))
      .catch(() => setCreditoDisponible(null));
  }, [perfil]);

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

  const pestanaInfo = PESTANAS.find((p) => p.valor === pestanaActiva) ?? PESTANAS[0];

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

        {/* Rediseño "Mi cuenta" (oct-2026), con las piezas de PÁGINAS INTERNAS del diseño oficial: en PC,
            menú lateral negro (kb-sidebar) + contenido; en celular y tablet, las pestañas de siempre. */}
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:items-start lg:gap-8">
          <nav
            className="kb-sidebar !rounded-card lg:sticky lg:top-24"
            aria-label="Secciones de mi cuenta"
          >
            <span className="kb-sidebar__group !mt-1">Mi cuenta</span>
            {PESTANAS.map((p) => (
              <Link
                key={p.valor}
                href={`/perfil?tab=${p.valor}`}
                scroll={false}
                aria-current={pestanaActiva === p.valor ? "page" : undefined}
                className={pestanaActiva === p.valor ? "is-active" : ""}
              >
                <IconoMenu nombre={p.icono} />
                {p.etiqueta}
              </Link>
            ))}
          </nav>

          <div className="min-w-0">
            <div className="kb-topbar">
              <div>
                <h1>{pestanaInfo.titulo}</h1>
                <p>{pestanaInfo.detalle}</p>
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

            {/* Números de la cuenta: cada uno lleva a su sección. En Mi saldo y Créditos se omiten: esas secciones ya muestran el monto grande. */}
            {pestanaActiva !== "wallet" && pestanaActiva !== "creditos" && (
              <div className="kb-stats mt-4 !grid-cols-3 !gap-2.5 md:!gap-4">
                <div className="kb-stat !p-3.5 md:!p-5">
                  <small className="!text-[11px] md:!text-[13px]">
                    Viajes<span className="hidden md:inline"> completados</span>
                  </small>
                  <b className="!text-[20px] md:!text-[28px]">{perfil.viajesCompletados ?? 0}</b>
                </div>
                <Link href="/perfil?tab=wallet" scroll={false} className="kb-stat kb-stat--dark block !p-3.5 md:!p-5">
                  <small className="!text-[11px] md:!text-[13px]">
                    Saldo<span className="hidden md:inline"> disponible</span>
                  </small>
                  <b className="!text-[20px] text-kbyellow md:!text-[28px]">{saldo === null ? "—" : `$${saldo.toFixed(2)}`}</b>
                </Link>
                <Link href="/perfil?tab=creditos" scroll={false} className="kb-stat block !p-3.5 md:!p-5">
                  <small className="!text-[11px] md:!text-[13px]">
                    Créditos<span className="hidden md:inline"> por reprogramación</span>
                  </small>
                  <b className="!text-[20px] md:!text-[28px]">{creditoDisponible === null ? "—" : `$${creditoDisponible.toFixed(2)}`}</b>
                </Link>
              </div>
            )}

            {/* En celular y tablet no hay menú lateral: las secciones van como pestañas. */}
            <nav className="kb-subnav mt-6 lg:hidden" aria-label="Secciones de mi cuenta">
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

            <div className="min-w-0 lg:mt-6">
              {pestanaActiva === "datos" && (
                <TabDatosPersonales
                  perfil={perfil}
                  onActualizado={(cambios) => setPerfil((p) => (p ? { ...p, ...cambios } : p))}
                  onExito={setMensajeExito}
                />
              )}
              {pestanaActiva === "boletos" && <TabMisBoletos onExito={setMensajeExito} />}
              {pestanaActiva === "reclamos" && <TabMisReclamos />}
              {pestanaActiva === "wallet" && <TabWallet />}
              {pestanaActiva === "referidos" && <TabReferidos perfil={perfil} />}
              {pestanaActiva === "creditos" && <TabMisCreditos />}
            </div>
          </div>
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
