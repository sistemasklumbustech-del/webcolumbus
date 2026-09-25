"use client";

import { useState } from "react";

/**
 * Paginación para listas que ya llegaron completas del servidor (resúmenes,
 * historiales cortos de una persona): se muestran de a pocas filas. Para
 * listas grandes con filtros se pagina en el servidor, como en Viajes o Ventas.
 */
export function usePaginacionLocal<T>(items: T[], tamano = 10) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(items.length / tamano));
  // Si la lista se acorta (por un filtro) y la página quedó fuera de rango, se muestra la última.
  const actual = Math.min(pagina, totalPaginas);
  return {
    pagina: actual,
    setPagina,
    visibles: items.slice((actual - 1) * tamano, actual * tamano),
    total: items.length,
    totalPaginas,
  };
}

export function ControlesPaginacion({
  pagina,
  totalPaginas,
  total,
  etiqueta = "resultado",
  onCambio,
  cargando = false,
  ocultarSiUnaPagina = true,
  className = "",
}: {
  pagina: number;
  totalPaginas: number;
  total: number;
  /** Singular; se agrega "s" para el plural. */
  etiqueta?: string;
  onCambio: (pagina: number) => void;
  cargando?: boolean;
  ocultarSiUnaPagina?: boolean;
  className?: string;
}) {
  if (total === 0 || (ocultarSiUnaPagina && totalPaginas <= 1)) return null;
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 text-sm text-brand-dark/70 sm:px-6 ${className}`}>
      <span>
        {total} {etiqueta}
        {total === 1 ? "" : "s"} · Página {pagina} de {totalPaginas}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onCambio(Math.max(1, pagina - 1))}
          disabled={pagina <= 1 || cargando}
          className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onCambio(Math.min(totalPaginas, pagina + 1))}
          disabled={pagina >= totalPaginas || cargando}
          className="rounded-lg border border-brand-light px-3 py-1.5 font-semibold disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
