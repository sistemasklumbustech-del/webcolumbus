"use client";

import Image from "next/image";
import { IconoPublicidad } from "./ilustraciones/IconoPublicidad";

interface Props {
  /** Nombre real del anunciante -- mismo campo que ya usa CampanaActiva en lib/api.ts. */
  nombreAnunciante: string;
  /** URL real de la creatividad ya diseñada, subida por el equipo desde el Panel Admin
   * (RF-COMM-009) -- nunca la carga el anunciante directamente. Si no existe, se usa el
   * ícono genérico -- nunca queda un espacio vacío ni roto. */
  archivoUrl?: string | null;
  /** A dónde lleva el clic -- opcional, para cuando la tarjeta es interactiva. */
  href?: string;
  /** Se dispara al hacer clic, antes de navegar -- para registrar la métrica real. */
  onClic?: () => void;
}

/**
 * Publicidad nativa -- decisión real de diseño, investigada y
 * documentada el 07-ago-2026 (DOCUMENTO_MAESTRO.md sección 3.9, con
 * fuentes reales: Booking.com, Skyscanner, "Paid Posts" de NYT):
 * "el resultado patrocinado usa el MISMO formato de tarjeta que un
 * resultado orgánico -- mismo tamaño, tipografía y bordes que el
 * resto de Columbus". Por eso esta tarjeta usa exactamente el mismo
 * estilo visual que una tarjeta de DestinosPopulares.tsx (foto de
 * fondo, degradado, nombre abajo) -- no un formato distinto.
 *
 * Etiqueta "Publicidad" (no "Patrocinado" -- texto exacto ya decidido
 * en esa misma sección), pequeña y discreta, nunca oculta.
 *
 * Componente real reutilizable (Fase 1, 16-ago-2026; ajustado en la
 * Fase 3 al conectar datos reales de campañas -- CampanaActiva no
 * trae descripción, solo nombre + creatividad ya diseñada).
 */
export function TarjetaPublicidadNativa({ nombreAnunciante, archivoUrl, href, onClic }: Props) {
  const contenido = (
    <div className="group overflow-hidden rounded-[22px] bg-white shadow-card transition hover:-translate-y-0.5 md:rounded-card">
      <div className="relative h-[150px] w-full md:h-[180px]">
        {archivoUrl ? (
          <Image
            src={archivoUrl}
            alt={nombreAnunciante}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-kbbg">
            <IconoPublicidad tamano={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-brand-dark/10 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-kbyellow px-2.5 py-0.5 text-[11px] font-semibold text-ink">
          Publicidad
        </span>
        <p className="absolute bottom-3 left-3.5 right-3.5 text-xl font-semibold leading-tight text-white md:text-2xl">
          {nombreAnunciante}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={onClic}
        className="block transition hover:-translate-y-0.5"
      >
        {contenido}
      </a>
    );
  }

  // Sin URL de destino real todavía (hallazgo real: CrearCampanaDto no
  // captura ningún campo de destino/landing del anunciante) -- se
  // registra el clic igual como métrica real, sin fingir un enlace.
  return (
    <button type="button" onClick={onClic} className="block w-full text-left transition hover:-translate-y-0.5">
      {contenido}
    </button>
  );
}
