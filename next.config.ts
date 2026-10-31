import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad (12-oct-2026). Antes el sitio no enviaba ninguna.
 *
 * La política de contenido (CSP) es la versión "sin nonces" que documenta Next.js: restringe de
 * dónde pueden cargarse scripts, conexiones, formularios y marcos, y prohíbe que otro sitio
 * incruste Klumbus. Todavía permite scripts en línea ('unsafe-inline'); cerrarlo del todo exige
 * nonces y renderizado dinámico de todas las páginas, un cambio mayor que se deja para después.
 */
const esDesarrollo = process.env.NODE_ENV === "development";
const apiOrigen = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").origin;

const politicaContenido = [
  "default-src 'self'",
  // 'unsafe-eval' solo en desarrollo: React lo usa para reconstruir errores.
  `script-src 'self' 'unsafe-inline'${esDesarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Las imágenes de logos y banners vienen de la API (otro origen) y algunas pueden ser enlaces https externos.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigen}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const cabecerasSeguridad = [
  { key: "Content-Security-Policy", value: politicaContenido },
  // 180 días. Sin includeSubDomains: no se conoce el estado de HTTPS de otros subdominios.
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La cámara se usa para escanear el QR del boleto en "Validar boleto"; nada más necesita permisos.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // navegacion-rapida (30-oct-2026): se quita AVIF del optimizador de <Image>. Convertir a AVIF al vuelo
  // tardaba 1,7–4 s por foto la primera vez y ocupaba el procesador del servidor (WebP: 0,13–0,27 s).
  // Las fotos del Hero ya van en AVIF hechas de antemano (public/img/hero), así que no se pierde nada.
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
