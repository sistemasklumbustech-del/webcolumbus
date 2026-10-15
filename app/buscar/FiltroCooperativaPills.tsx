"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Filtro rápido por cooperativa -- orden real de la directora
 * (16-ago-2026, protocolo de medición precisa de referencias):
 * píldoras horizontales arriba de los resultados, mismo patrón real
 * que ya usan FiltrosBusqueda y OrdenarPor (actualiza la URL, el
 * filtrado real ocurre en el servidor sobre los resultados ya
 * obtenidos). Usa las cooperativas REALES que aparecen en los
 * resultados de esta búsqueda -- nunca códigos ni nombres de otro
 * conjunto de datos.
 *
 * Rediseño final (oct-2026): chips negros/blancos del diseño; se
 * quitaron los colores cíclicos (incluían azules y violetas).
 */
export function FiltroCooperativaPills({
  cooperativas,
}: {
  cooperativas: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cooperativaActiva = searchParams.get("cooperativaId");

  function alternar(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (cooperativaActiva === id) {
      params.delete("cooperativaId");
    } else {
      params.set("cooperativaId", id);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  if (cooperativas.length < 2) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {cooperativas.map((c) => {
        const seleccionada = cooperativaActiva === c.id;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={seleccionada}
            onClick={() => alternar(c.id)}
            className={`kb-chip ${seleccionada ? "is-active" : ""}`}
          >
            {c.nombre}
          </button>
        );
      })}
    </div>
  );
}
