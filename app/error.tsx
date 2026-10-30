"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PantallaAviso } from "@/components/PantallaAviso";

/**
 * Error inesperado en una página (antes salía el de Next.js en inglés). "Reintentar" vuelve a pedir
 * los datos y a dibujar la página (retry de Next 16).
 */
export default function ErrorPagina({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PantallaAviso
      icono="error"
      titulo="Algo salió mal"
      texto="No pudimos mostrar esta página. Puede ser un problema de conexión: inténtalo de nuevo en un momento."
    >
      <button type="button" onClick={() => retry()} className="kb-btn kb-btn--primary">
        Reintentar
      </button>
      <Link href="/" className="kb-btn kb-btn--outline">
        Volver al inicio
      </Link>
    </PantallaAviso>
  );
}
