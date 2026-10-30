"use client";

import "./globals.css";

/**
 * Error en el diseño raíz (casi nunca pasa): reemplaza toda la página, así que trae su propio
 * html y body. Mismo mensaje que app/error.tsx, sin encabezado ni pie.
 */
export default function ErrorGlobal({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-kbbg px-4">
        <title>Algo salió mal | Klumbus</title>
        <div className="flex w-full max-w-[520px] flex-col items-center gap-3 rounded-card border border-line bg-white px-5 py-9 text-center">
          <h1 className="text-2xl font-bold text-ink">Algo salió mal</h1>
          <p className="text-[15px] leading-relaxed text-muted-2">
            No pudimos mostrar esta página. Puede ser un problema de conexión: inténtalo de nuevo en un momento.
          </p>
          <div className="mt-3 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
            <button type="button" onClick={() => retry()} className="kb-btn kb-btn--primary">
              Reintentar
            </button>
            {/* Recarga completa a propósito: el diseño raíz falló. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="kb-btn kb-btn--outline">
              Volver al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
