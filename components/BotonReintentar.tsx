"use client";

/** Vuelve a cargar la página (se usa cuando una página del servidor no pudo traer sus datos). */
export function BotonReintentar() {
  return (
    <button type="button" onClick={() => window.location.reload()} className="kb-btn kb-btn--primary mt-1">
      Reintentar
    </button>
  );
}
